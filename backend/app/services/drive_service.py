"""
Google Drive Service
Handles OAuth authentication and GWAS file access from Google Drive.
"""
import os
import pickle
import logging
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

from ..config import settings

logger = logging.getLogger(__name__)


class GoogleDriveService:
    """
    Google Drive API integration for accessing GWAS files.
    Uses OAuth 2.0 for user authentication.
    """
    
    # Scopes required for read-only access to Drive
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
    
    def __init__(self):
        self.credentials: Optional[Credentials] = None
        self.service = None
        self.token_path = os.path.join(settings.cache_dir, "token.pickle")
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate OAuth authorization URL for user to authenticate.
        
        Args:
            state: Random state string for CSRF protection
            
        Returns:
            Authorization URL to redirect user to
        """
        flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri]
                }
            },
            scopes=self.SCOPES,
            state=state
        )
        
        flow.redirect_uri = settings.google_redirect_uri
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return authorization_url
    
    def handle_oauth_callback(self, authorization_response: str, state: str) -> bool:
        """
        Handle OAuth callback and exchange code for tokens.
        
        Args:
            authorization_response: Full callback URL with code
            state: State parameter for verification
            
        Returns:
            True if authentication successful, False otherwise
        """
        try:
            flow = Flow.from_client_config(
                client_config={
                    "web": {
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [settings.google_redirect_uri]
                    }
                },
                scopes=self.SCOPES,
                state=state
            )
            
            flow.redirect_uri = settings.google_redirect_uri
            flow.fetch_token(authorization_response=authorization_response)
            
            self.credentials = flow.credentials
            
            # Save credentials for future use
            self._save_credentials()
            
            # Initialize service
            self.service = build('drive', 'v3', credentials=self.credentials)
            
            logger.info("Successfully authenticated with Google Drive")
            return True
        
        except Exception as e:
            logger.error(f"OAuth callback error: {e}")
            return False
    
    def _save_credentials(self):
        """Save credentials to disk for reuse"""
        try:
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.credentials, token)
            logger.info(f"Saved credentials to {self.token_path}")
        except Exception as e:
            logger.error(f"Error saving credentials: {e}")
    
    def _load_credentials(self) -> bool:
        """
        Load credentials from disk if available.
        
        Returns:
            True if credentials loaded and valid, False otherwise
        """
        if not os.path.exists(self.token_path):
            return False
        
        try:
            with open(self.token_path, 'rb') as token:
                self.credentials = pickle.load(token)
            
            # Refresh if expired
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                self.credentials.refresh(Request())
                self._save_credentials()
            
            if self.credentials and self.credentials.valid:
                self.service = build('drive', 'v3', credentials=self.credentials)
                logger.info("Loaded valid credentials from disk")
                return True
            
            return False
        
        except Exception as e:
            logger.error(f"Error loading credentials: {e}")
            return False
    
    def is_authenticated(self) -> bool:
        """Check if service is authenticated and ready"""
        if not self.credentials:
            return self._load_credentials()
        
        if self.credentials.expired and self.credentials.refresh_token:
            try:
                self.credentials.refresh(Request())
                self._save_credentials()
            except:
                return False
        
        return self.credentials.valid if self.credentials else False
    
    def list_files_in_folder(self, folder_id: str) -> List[Dict]:
        """
        List all files in a Google Drive folder.
        
        Args:
            folder_id: Google Drive folder ID
            
        Returns:
            List of dicts with file metadata
        """
        if not self.is_authenticated():
            logger.error("Not authenticated with Google Drive")
            return []
        
        try:
            results = self.service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="files(id, name, mimeType, size, modifiedTime)",
                pageSize=100
            ).execute()
            
            files = results.get('files', [])
            logger.info(f"Found {len(files)} files in folder {folder_id}")
            return files
        
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    def download_file(self, file_id: str, destination_path: str) -> bool:
        """
        Download a file from Google Drive.
        
        Args:
            file_id: Google Drive file ID
            destination_path: Local path to save file
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_authenticated():
            logger.error("Not authenticated with Google Drive")
            return False
        
        try:
            request = self.service.files().get_media(fileId=file_id)
            
            # Create destination directory if needed
            Path(destination_path).parent.mkdir(parents=True, exist_ok=True)
            
            with io.FileIO(destination_path, 'wb') as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                
                while not done:
                    status, done = downloader.next_chunk()
                    if status:
                        logger.debug(f"Download progress: {int(status.progress() * 100)}%")
            
            logger.info(f"Downloaded file to {destination_path}")
            return True
        
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            return False
    
    def get_gwas_files(self, gwas_file_map: Dict[str, str]) -> Dict[str, str]:
        """
        Download GWAS files from Drive folder to local cache.
        
        Args:
            gwas_file_map: Dict mapping disorder -> filename in Drive
            
        Returns:
            Dict mapping disorder -> local file path
        """
        if not self.is_authenticated():
            logger.error("Not authenticated - cannot download GWAS files")
            return {}
        
        # List files in GWAS folder
        files = self.list_files_in_folder(settings.gwas_drive_folder_id)
        
        # Create name -> file_id mapping
        file_map = {f['name']: f['id'] for f in files}
        
        local_paths = {}
        
        for disorder, filename in gwas_file_map.items():
            if filename not in file_map:
                logger.warning(f"GWAS file not found in Drive: {filename}")
                continue
            
            # Check if already cached
            cache_path = os.path.join(settings.cache_dir, "gwas", f"{disorder}.txt")
            
            if os.path.exists(cache_path):
                # Check if cache is recent (< 7 days old)
                age_days = (datetime.now().timestamp() - os.path.getmtime(cache_path)) / 86400
                if age_days < 7:
                    logger.info(f"{disorder}: Using cached file")
                    local_paths[disorder] = cache_path
                    continue
            
            # Download file
            logger.info(f"{disorder}: Downloading from Drive...")
            file_id = file_map[filename]
            
            if self.download_file(file_id, cache_path):
                local_paths[disorder] = cache_path
            else:
                logger.error(f"{disorder}: Download failed")
        
        return local_paths


# Singleton instance
drive_service = GoogleDriveService()

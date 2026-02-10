"""
Application configuration using Pydantic settings.
Loads from .env file and environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # App
    app_name: str = "Neuro-LENS"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Google OAuth
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    
    # Google Drive
    gwas_drive_folder_id: str
    
    # CORS
    allowed_origins: str = "http://localhost:3000"
    
    # Cache
    cache_dir: str = "./cache"
    max_cache_size_mb: int = 1000
    
    # Security
    secret_key: str
    
    # Rate limiting
    rate_limit_per_minute: int = 10
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def origins_list(self) -> List[str]:
        """Parse CORS origins into list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    def ensure_cache_dir(self):
        """Create cache directory if it doesn't exist"""
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(os.path.join(self.cache_dir, "gwas"), exist_ok=True)
        os.makedirs(os.path.join(self.cache_dir, "vcf"), exist_ok=True)


# Global settings instance
settings = Settings()
settings.ensure_cache_dir()

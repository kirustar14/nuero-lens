"""
Neuro-LENS FastAPI Application
Main entry point for the backend API.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from datetime import datetime
import logging
import os
import uuid
import shutil
import scipy.stats as stats

from .config import settings
from .models import (
    VCFUploadResponse, PRSAnalysisRequest, PRSAnalysisResponse,
    DisorderScore, FactorScore, GWASFileInfo, HealthCheckResponse,
    ErrorResponse, REF_STATS, BRAIN_MAP, GWAS_FILES_MAP
)
from .services import vcf_parser, prs_calculator, drive_service

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Genomic Polygenic Risk Score Analysis API",
    version="1.0.0",
    debug=settings.debug
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_drive_service():
    """Dependency: Google Drive service"""
    if not drive_service.is_authenticated():
        raise HTTPException(
            status_code=401,
            detail="Not authenticated with Google Drive. Please authenticate first."
        )
    return drive_service


# ============================================================================
# ROUTES
# ============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - redirect to docs"""
    return RedirectResponse(url="/docs")


@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    cache_size = 0
    if os.path.exists(settings.cache_dir):
        for dirpath, _, filenames in os.walk(settings.cache_dir):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if os.path.exists(fp):
                    cache_size += os.path.getsize(fp)
    
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        drive_connected=drive_service.is_authenticated(),
        cache_size_mb=cache_size / (1024 * 1024)
    )


# ============================================================================
# GOOGLE DRIVE AUTHENTICATION
# ============================================================================

@app.get("/auth/login", tags=["Authentication"])
async def login():
    """
    Initiate Google OAuth flow.
    Returns authorization URL to redirect user to.
    """
    state = str(uuid.uuid4())
    auth_url = drive_service.get_authorization_url(state)
    
    # In production, you'd save state to session/database
    # For now, we'll include it in the response
    return {
        "auth_url": auth_url,
        "state": state
    }


@app.get("/auth/callback", tags=["Authentication"])
async def auth_callback(code: str = Query(...), state: str = Query(...)):
    """
    Handle OAuth callback from Google.
    This is where Google redirects after user authorizes.
    """
    # Reconstruct the authorization response
    authorization_response = f"{settings.google_redirect_uri}?code={code}&state={state}"
    
    success = drive_service.handle_oauth_callback(authorization_response, state)
    
    if success:
        return {
            "status": "authenticated",
            "message": "Successfully connected to Google Drive"
        }
    else:
        raise HTTPException(status_code=400, detail="Authentication failed")


@app.get("/auth/status", tags=["Authentication"])
async def auth_status():
    """Check if authenticated with Google Drive"""
    return {
        "authenticated": drive_service.is_authenticated()
    }


# ============================================================================
# GWAS FILES
# ============================================================================

@app.get("/gwas/files", response_model=list[GWASFileInfo], tags=["GWAS"])
async def list_gwas_files(service = Depends(get_drive_service)):
    """List available GWAS files from Google Drive"""
    files_info = []
    
    # Get files from Drive
    drive_files = service.list_files_in_folder(settings.gwas_drive_folder_id)
    drive_file_names = {f['name']: f['id'] for f in drive_files}
    
    for disorder, filename in GWAS_FILES_MAP.items():
        available = filename in drive_file_names
        file_id = drive_file_names.get(filename, "")
        
        # Check if cached locally
        cache_path = os.path.join(settings.cache_dir, "gwas", f"{disorder}.txt")
        last_cached = None
        if os.path.exists(cache_path):
            last_cached = datetime.fromtimestamp(os.path.getmtime(cache_path))
        
        files_info.append(GWASFileInfo(
            disorder=disorder,
            filename=filename,
            file_id=file_id,
            available=available,
            last_cached=last_cached
        ))
    
    return files_info


# ============================================================================
# VCF UPLOAD
# ============================================================================

@app.post("/vcf/upload", response_model=VCFUploadResponse, tags=["VCF"])
async def upload_vcf(file: UploadFile = File(...)):
    """
    Upload a VCF file for analysis.
    Returns VCF ID for use in analysis requests.
    """
    # Validate file extension
    if not file.filename.endswith(('.vcf', '.vcf.gz')):
        raise HTTPException(
            status_code=400,
            detail="File must be in VCF format (.vcf or .vcf.gz)"
        )
    
    # Generate unique ID for this VCF
    vcf_id = str(uuid.uuid4())
    
    # Save file to cache
    vcf_path = os.path.join(settings.cache_dir, "vcf", f"{vcf_id}.vcf")
    
    try:
        with open(vcf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Saved VCF: {vcf_id}")
        
        # Parse to get variant count
        stats = vcf_parser.get_vcf_stats(vcf_path)
        
        return VCFUploadResponse(
            vcf_id=vcf_id,
            filename=file.filename,
            variant_count=stats['variant_count'],
            parsed_at=datetime.utcnow()
        )
    
    except Exception as e:
        logger.error(f"Error uploading VCF: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    finally:
        file.file.close()


# ============================================================================
# PRS ANALYSIS
# ============================================================================

@app.post("/analysis/prs", response_model=PRSAnalysisResponse, tags=["Analysis"])
async def analyze_prs(
    request: PRSAnalysisRequest,
    service = Depends(get_drive_service)
):
    """
    Calculate Polygenic Risk Scores for uploaded VCF.
    
    This is the main analysis endpoint that:
    1. Downloads GWAS files from Google Drive (if needed)
    2. Parses the patient VCF
    3. Calculates PRS for each disorder
    4. Computes broad psychiatric factor scores
    """
    import time
    start_time = time.time()
    
    # Validate VCF exists
    vcf_path = os.path.join(settings.cache_dir, "vcf", f"{request.vcf_id}.vcf")
    if not os.path.exists(vcf_path):
        raise HTTPException(status_code=404, detail="VCF file not found")
    
    analysis_id = str(uuid.uuid4())
    
    try:
        # Step 1: Parse VCF
        logger.info(f"Analysis {analysis_id}: Parsing VCF...")
        patient_df = vcf_parser.parse_vcf(vcf_path)
        
        # Step 2: Get GWAS files (download if needed)
        logger.info(f"Analysis {analysis_id}: Downloading GWAS files...")
        gwas_paths = service.get_gwas_files(GWAS_FILES_MAP)
        
        if not gwas_paths:
            raise HTTPException(
                status_code=503,
                detail="Could not access GWAS files from Google Drive"
            )
        
        # Filter to requested disorders if specified
        if request.disorders:
            gwas_paths = {
                d: p for d, p in gwas_paths.items() 
                if d in request.disorders
            }
        
        # Step 3: Calculate disorder PRS scores
        logger.info(f"Analysis {analysis_id}: Calculating PRS...")
        results = prs_calculator.calculate_all_disorders(
            gwas_files=gwas_paths,
            patient_df=patient_df,
            verbose=settings.debug
        )
        
        # Convert to response models
        disorder_scores = [
            DisorderScore(
                disorder=disorder,
                raw_score=data['score'],
                snp_count=data['snp_count'],
                status=data['status']
            )
            for disorder, data in results.items()
        ]
        
        # Step 4: Calculate factor scores (if loadings available)
        factor_scores_list = None
        loadings_path = os.path.join(settings.cache_dir, "gwas", "loadings.csv")
        
        raw_scores = {d: data['score'] for d, data in results.items()}
        factor_scores_dict = prs_calculator.calculate_factor_scores(
            disorder_scores=raw_scores,
            loadings_path=loadings_path
        )
        
        if factor_scores_dict:
            factor_scores_list = []
            for factor, score in factor_scores_dict.items():
                if factor in REF_STATS:
                    z_score = (score - REF_STATS[factor]["mean"]) / REF_STATS[factor]["std"]
                    percentile = stats.norm.cdf(z_score) * 100
                    
                    factor_scores_list.append(FactorScore(
                        factor=factor,
                        label=REF_STATS[factor]["label"],
                        raw_score=score,
                        z_score=z_score,
                        percentile=percentile,
                        brain_systems=BRAIN_MAP.get(factor, "Unknown")
                    ))
        
        # Calculate summary stats
        total_snps = sum(d.snp_count for d in disorder_scores)
        successful = sum(1 for d in disorder_scores if d.status == "ok")
        
        processing_time = time.time() - start_time
        
        return PRSAnalysisResponse(
            vcf_id=request.vcf_id,
            analysis_id=analysis_id,
            analyzed_at=datetime.utcnow(),
            disorder_scores=disorder_scores,
            factor_scores=factor_scores_list,
            total_snps_analyzed=total_snps,
            successful_disorders=successful,
            total_disorders=len(disorder_scores),
            processing_time_seconds=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return ErrorResponse(
        error=exc.detail,
        detail=str(exc.status_code)
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional, Literal
from datetime import datetime


class VCFUploadResponse(BaseModel):
    """Response after VCF upload"""
    vcf_id: str
    filename: str
    variant_count: int
    parsed_at: datetime


class DisorderScore(BaseModel):
    """Individual disorder PRS score"""
    disorder: str
    raw_score: float
    snp_count: int
    status: Literal["ok", "error", "no_match"]


class FactorScore(BaseModel):
    """Broad psychiatric factor score"""
    factor: str
    label: str
    raw_score: float
    z_score: float
    percentile: float
    brain_systems: str


class PRSAnalysisRequest(BaseModel):
    """Request to calculate PRS"""
    vcf_id: str
    disorders: Optional[List[str]] = None  # If None, analyze all
    
    @field_validator('vcf_id')
    @classmethod
    def validate_vcf_id(cls, v: str) -> str:
        if not v or len(v) < 10:
            raise ValueError("Invalid VCF ID")
        return v


class PRSAnalysisResponse(BaseModel):
    """Complete PRS analysis result"""
    vcf_id: str
    analysis_id: str
    analyzed_at: datetime
    
    # Raw disorder scores
    disorder_scores: List[DisorderScore]
    
    # Factor scores (if loadings available)
    factor_scores: Optional[List[FactorScore]] = None
    
    # Summary stats
    total_snps_analyzed: int
    successful_disorders: int
    total_disorders: int
    
    # Processing time
    processing_time_seconds: float


class GWASFileInfo(BaseModel):
    """Information about a GWAS file"""
    disorder: str
    filename: str
    file_id: str
    available: bool
    last_cached: Optional[datetime] = None


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    drive_connected: bool
    cache_size_mb: float


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Reference statistics for normalization
REF_STATS = {
    "F1": {"mean": 0.0210, "std": 0.0045, "label": "Compulsive"},
    "F2": {"mean": 0.0450, "std": 0.0092, "label": "Psychotic"},
    "F3": {"mean": 0.0380, "std": 0.0078, "label": "Neurodevelopmental"},
    "F4": {"mean": 0.0520, "std": 0.0110, "label": "Internalizing"},
    "F5": {"mean": 0.0085, "std": 0.0021, "label": "Tourette-Specific"}
}

BRAIN_MAP = {
    "F1": "Excitatory neurons / Frontal-Striatal loops",
    "F2": "Dopaminergic pathways / Prefrontal Cortex & Amygdala",
    "F3": "White matter / Oligodendrocytes (Brain Connectivity)",
    "F4": "GABAergic neurons / Amygdala & Hippocampus",
    "F5": "Basal Ganglia motor circuits"
}

# GWAS file mapping (relative to Drive folder)
GWAS_FILES_MAP = {
    "MDD": "MDD.txt",
    "SCZ": "Schizophrenia",
    "ADHD": "ADHD",
    "OCD": "OCD",
    "PTSD": "PTSD.txt",
    "AN": "AN.txt",
    "BIP": "bipolar",
    "AUT": "ASD",
    "TS": "touretts",
    "ANX": "Anxiety.tbl 2",
    "ALCH": "alcohol use.txt",
}

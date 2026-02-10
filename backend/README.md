# Neuro-LENS Backend API

Polygenic Risk Score (PRS) analysis API for psychiatric genetics research.

Based on **Grotzinger et al. (2022)** genomic SEM methodology.

## Features

- ✅ **VCF Parsing**: Fast, memory-efficient parsing of variant files
- ✅ **Allele Harmonization**: Automatic strand flipping and allele matching
- ✅ **PRS Calculation**: Multi-disorder polygenic risk scoring
- ✅ **Factor Analysis**: 5-factor psychiatric risk model
- ✅ **Google Drive Integration**: OAuth-based GWAS file access
- ✅ **RESTful API**: FastAPI with automatic documentation

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings & configuration
│   ├── models.py            # Pydantic models
│   └── services/
│       ├── vcf_parser.py           # VCF file parsing
│       ├── prs_calculator.py       # PRS computation
│       ├── allele_harmonization.py # Allele matching
│       └── drive_service.py        # Google Drive API
├── requirements.txt
├── .env.example
└── README.md
```

## Quick Start

### 1. Setup Environment

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Drive API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/auth/callback`
5. Download credentials

### 3. Configure Environment Variables

```bash
cp .env.example .env
nano .env  # Edit with your values
```

Required variables:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GWAS_DRIVE_FOLDER_ID=your_drive_folder_id
SECRET_KEY=your-random-secret-key-min-32-chars
```

### 4. Run the Server

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **OpenAPI**: http://localhost:8000/openapi.json

## API Endpoints

### Authentication

```bash
# 1. Get login URL
GET /auth/login
# Returns: { "auth_url": "https://accounts.google.com/...", "state": "..." }

# 2. User authenticates (redirected to Google)
# 3. Google redirects back to /auth/callback

# 4. Check auth status
GET /auth/status
```

### Upload VCF

```bash
POST /vcf/upload
Content-Type: multipart/form-data

# Response
{
  "vcf_id": "uuid",
  "filename": "patient.vcf",
  "variant_count": 2000,
  "parsed_at": "2024-01-01T00:00:00"
}
```

### Analyze PRS

```bash
POST /analysis/prs
Content-Type: application/json

{
  "vcf_id": "uuid",
  "disorders": ["MDD", "SCZ", "ADHD"]  # Optional: analyze specific disorders
}

# Response
{
  "vcf_id": "uuid",
  "analysis_id": "uuid",
  "analyzed_at": "2024-01-01T00:00:00",
  "disorder_scores": [
    {
      "disorder": "MDD",
      "raw_score": 0.1234,
      "snp_count": 456,
      "status": "ok"
    }
  ],
  "factor_scores": [
    {
      "factor": "F1",
      "label": "Compulsive",
      "raw_score": 0.0215,
      "z_score": 0.11,
      "percentile": 54.3,
      "brain_systems": "Excitatory neurons / Frontal-Striatal loops"
    }
  ],
  "total_snps_analyzed": 1234,
  "successful_disorders": 3,
  "total_disorders": 3,
  "processing_time_seconds": 2.5
}
```

### List GWAS Files

```bash
GET /gwas/files

# Response
[
  {
    "disorder": "MDD",
    "filename": "MDD.txt",
    "file_id": "drive_file_id",
    "available": true,
    "last_cached": "2024-01-01T00:00:00"
  }
]
```

## Development

### Code Quality

```bash
# Format code
black app/

# Lint
flake8 app/

# Type checking
mypy app/
```

### Testing

```bash
# Run tests (once you create them)
pytest tests/

# With coverage
pytest --cov=app tests/
```

## Supported Disorders

Current GWAS datasets:
- **MDD**: Major Depressive Disorder
- **SCZ**: Schizophrenia
- **ADHD**: Attention Deficit Hyperactivity Disorder
- **OCD**: Obsessive Compulsive Disorder
- **PTSD**: Post-Traumatic Stress Disorder
- **AN**: Anorexia Nervosa
- **BIP**: Bipolar Disorder
- **AUT**: Autism Spectrum Disorder
- **TS**: Tourette Syndrome
- **ANX**: Anxiety
- **ALCH**: Alcohol Use Disorder

## 5-Factor Model

Based on Grotzinger et al. (2022):

| Factor | Label | Brain Systems |
|--------|-------|---------------|
| F1 | Compulsive | Excitatory neurons / Frontal-Striatal loops |
| F2 | Psychotic | Dopaminergic pathways / Prefrontal Cortex & Amygdala |
| F3 | Neurodevelopmental | White matter / Oligodendrocytes |
| F4 | Internalizing | GABAergic neurons / Amygdala & Hippocampus |
| F5 | Tourette-Specific | Basal Ganglia motor circuits |

## Performance

- **VCF Parsing**: ~1 second for 2,000 variants
- **PRS Calculation**: ~2-3 seconds per disorder
- **Full Analysis**: ~30-60 seconds for all 11 disorders
- **Parallelization**: Uses chunked reading for memory efficiency

## Troubleshooting

### Google Drive Authentication Fails

```bash
# Clear cached token
rm cache/token.pickle

# Re-authenticate
curl http://localhost:8000/auth/login
```

### GWAS Files Not Found

```bash
# Check Drive connection
curl http://localhost:8000/auth/status

# List available files
curl http://localhost:8000/gwas/files
```

### VCF Parsing Errors

- Ensure VCF is properly formatted
- Check that SNP IDs are rsIDs (start with "rs")
- Verify genotypes are in GT field (0/0, 0/1, 1/1)

## Next Steps

1. **Add Database**: Store analysis results in PostgreSQL
2. **Add Frontend**: React/TypeScript UI (see ../frontend)
3. **Add Tests**: Unit tests for all services
4. **Add Rate Limiting**: Prevent API abuse
5. **Add Caching**: Redis for frequently accessed GWAS data
6. **Add Async**: Make PRS calculation fully async

## License

For research use only.

## References

Grotzinger, A. D., et al. (2022). Genomic structural equation modelling provides insights into the multivariate genetic architecture of complex traits. *Nature Human Behaviour*.

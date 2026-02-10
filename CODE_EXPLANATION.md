# 🧬 Neuro-LENS Backend - Quick Code Explanation

## 📁 File Structure & What Each Does

```
backend/
├── app/
│   ├── main.py              ← 🎯 API ROUTES (upload VCF, analyze PRS, auth)
│   ├── config.py            ← ⚙️  SETTINGS (Google credentials, paths)
│   ├── models.py            ← 📦 DATA MODELS (request/response formats)
│   └── services/
│       ├── vcf_parser.py           ← 🧬 Reads .vcf files → DataFrame
│       ├── prs_calculator.py       ← 🧮 Core PRS calculation logic
│       ├── allele_harmonization.py ← 🔄 Matches VCF ↔ GWAS alleles
│       └── drive_service.py        ← ☁️  Google Drive OAuth + downloads
├── requirements.txt         ← 📦 Python packages needed
└── .env.example            ← 🔑 Config template (add your keys here)
```

---

## 🔍 Code Flow (What Happens When You Analyze)

```
USER UPLOADS VCF
    ↓
[main.py] /vcf/upload endpoint
    ↓
Saves to cache/vcf/{uuid}.vcf
    ↓
Returns vcf_id
    ↓
USER REQUESTS ANALYSIS
    ↓
[main.py] /analysis/prs endpoint
    ↓
[drive_service.py] Downloads GWAS files from Google Drive
    ↓
[vcf_parser.py] Parses patient VCF
    ↓
[prs_calculator.py] For each disorder:
    ├── Reads GWAS file (chunks)
    ├── Merges with patient SNPs
    ├── [allele_harmonization.py] Matches alleles
    ├── Calculates: PRS = Σ(dosage × weight)
    └── Returns score
    ↓
Calculates 5 factor scores (F1-F5)
    ↓
Returns JSON with scores + percentiles
```

---

## 📄 Key Files Explained

### 1️⃣ **main.py** - The API Brain (218 lines)

**What it does:** Defines all HTTP endpoints

**Key endpoints:**
```python
GET  /auth/login          # Start Google OAuth
GET  /auth/callback       # Finish Google OAuth
POST /vcf/upload          # Upload patient VCF
POST /analysis/prs        # Run PRS analysis
GET  /gwas/files          # List available GWAS files
GET  /health              # Check if system working
```

**Example:** The analysis endpoint
```python
@app.post("/analysis/prs")
async def analyze_prs(request: PRSAnalysisRequest):
    # 1. Parse VCF
    patient_df = vcf_parser.parse_vcf(vcf_path)
    
    # 2. Download GWAS files
    gwas_paths = drive_service.get_gwas_files(GWAS_FILES_MAP)
    
    # 3. Calculate PRS for each disorder
    results = prs_calculator.calculate_all_disorders(gwas_paths, patient_df)
    
    # 4. Calculate factor scores
    factor_scores = prs_calculator.calculate_factor_scores(results)
    
    # 5. Return JSON response
    return PRSAnalysisResponse(...)
```

---

### 2️⃣ **vcf_parser.py** - VCF Reader (170 lines)

**What it does:** Reads .vcf files and extracts SNP data

**Input:** VCF file like this:
```
#CHROM  POS     ID          REF ALT QUAL FILTER INFO FORMAT PATIENT001
1       10001   rs123456    A   G   100  PASS   .    GT     0/1
1       20001   rs234567    C   T   100  PASS   .    GT     1/1
```

**Output:** DataFrame with:
```python
   snpid      ref  alt  alt_dosage
0  rs123456   A    G    1          # 0/1 = heterozygous = 1 copy of alt
1  rs234567   C    T    2          # 1/1 = homozygous = 2 copies of alt
```

**Key function:**
```python
def parse_vcf(vcf_path: str) -> pd.DataFrame:
    # Skip header lines (start with #)
    # Extract: rsID, ref allele, alt allele, genotype
    # Convert genotype to dosage: 0/0→0, 0/1→1, 1/1→2
    # Return DataFrame
```

---

### 3️⃣ **prs_calculator.py** - The Analysis Engine (230 lines)

**What it does:** Calculates Polygenic Risk Scores

**Core formula:**
```
PRS = Σ (effect_allele_dosage × weight)
```

**Example:**
```python
SNP         Effect Allele   Weight (beta)   Patient Dosage   Contribution
rs123456    G              +0.05            1                +0.05
rs234567    T              +0.10            2                +0.20
rs345678    A              -0.03            0                0.00
                                            ─────────────────────────
                                            PRS = +0.25
```

**Key function:**
```python
def calculate_disorder_prs(gwas_path, patient_df, disorder):
    # 1. Read GWAS file (in chunks for memory efficiency)
    # 2. Filter: only SNPs that patient has
    # 3. Merge patient VCF with GWAS data
    # 4. Harmonize alleles (match ref/alt)
    # 5. Calculate: sum(dosage × weight)
    # 6. Return PRS score
```

---

### 4️⃣ **allele_harmonization.py** - Allele Matching (150 lines)

**What it does:** Matches VCF alleles with GWAS alleles (with strand flipping)

**The Problem:**
```
VCF says:   REF=A, ALT=G
GWAS says:  EA=G, NEA=A    ✅ Match! (effect allele = alt)

VCF says:   REF=A, ALT=G
GWAS says:  EA=A, NEA=G    ✅ Match! (effect allele = ref, flip dosage)

VCF says:   REF=A, ALT=G
GWAS says:  EA=C, NEA=T    ✅ Match! (complement strand, A→T, G→C)

VCF says:   REF=A, ALT=G
GWAS says:  EA=X, NEA=Y    ❌ No match (drop this SNP)
```

**Key function:**
```python
def harmonize_alleles(vcf_ref, vcf_alt, vcf_dosage, gwas_ea, gwas_nea):
    # Try direct match
    if gwas_ea == vcf_alt and gwas_nea == vcf_ref:
        return vcf_dosage  # Effect allele is alt
    
    # Try flipped
    if gwas_ea == vcf_ref and gwas_nea == vcf_alt:
        return 2 - vcf_dosage  # Effect allele is ref, flip dosage
    
    # Try strand flip (complement)
    # A↔T, C↔G
    
    # No match
    return NaN
```

---

### 5️⃣ **drive_service.py** - Google Drive Integration (280 lines)

**What it does:** OAuth authentication + downloads GWAS files

**Flow:**
```python
# 1. User clicks "Login"
auth_url = drive_service.get_authorization_url()
# → Redirects to Google login

# 2. User approves
# → Google redirects back with code

# 3. Exchange code for token
drive_service.handle_oauth_callback(code)
# → Saves token to cache/token.pickle

# 4. Download GWAS files
gwas_files = drive_service.get_gwas_files(GWAS_FILES_MAP)
# → Downloads from Drive, caches locally
```

**Key functions:**
```python
def get_authorization_url():
    # Create OAuth flow
    # Return URL to redirect user to Google

def handle_oauth_callback(code):
    # Exchange code for access token
    # Save token for reuse

def download_file(file_id, destination):
    # Download from Drive using token
    # Cache locally (7-day TTL)
```

---

### 6️⃣ **config.py** - Settings (60 lines)

**What it does:** Loads configuration from `.env` file

**Example `.env`:**
```env
GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=abc123
GWAS_DRIVE_FOLDER_ID=1p7N6h...
SECRET_KEY=random-32-char-string
```

**Code:**
```python
class Settings(BaseSettings):
    google_client_id: str
    google_client_secret: str
    gwas_drive_folder_id: str
    secret_key: str
    
    class Config:
        env_file = ".env"

settings = Settings()  # Auto-loads from .env
```

---

### 7️⃣ **models.py** - Data Models (130 lines)

**What it does:** Defines request/response formats using Pydantic

**Example:**
```python
class PRSAnalysisRequest(BaseModel):
    vcf_id: str
    disorders: Optional[List[str]] = None

class DisorderScore(BaseModel):
    disorder: str
    raw_score: float
    snp_count: int
    status: str

class PRSAnalysisResponse(BaseModel):
    vcf_id: str
    disorder_scores: List[DisorderScore]
    factor_scores: Optional[List[FactorScore]]
    processing_time_seconds: float
```

**Why?** FastAPI uses these to:
- Validate inputs
- Auto-generate API docs
- Provide type hints

---

## 🎯 How Your Notebook Code Maps to Backend

| Notebook Cell | Backend File | Lines |
|---------------|--------------|-------|
| `parse_vcf_fast()` | `vcf_parser.py` | 30-90 |
| `compute_effect_dosage()` | `allele_harmonization.py` | 40-100 |
| `calculate_disorder_prs_optimized()` | `prs_calculator.py` | 50-150 |
| `REF_STATS`, `BRAIN_MAP` | `models.py` | 90-110 |
| `GWAS_FILES` paths | `models.py` | 112-124 |
| Google Drive mounting | `drive_service.py` | (entire file) |

---

## 🚀 What Happens When You Run It

```bash
$ ./start.sh
```

1. Creates virtual environment
2. Installs packages from `requirements.txt`
3. Loads `.env` configuration
4. Starts FastAPI server on port 8000
5. Opens http://localhost:8000/docs

**You can then:**
- Upload VCF via web interface
- Click "Try it out" on `/analysis/prs`
- Get JSON response with scores

---

## 🔑 Key Concepts

### 1. **Chunked Reading** (Memory Efficiency)
```python
# Bad (loads entire file)
df = pd.read_csv(gwas_file)

# Good (reads in chunks)
for chunk in pd.read_csv(gwas_file, chunksize=200000):
    # Process chunk
    # Only keep SNPs we need
```

### 2. **Pre-filtering** (Speed)
```python
# Only keep SNPs that patient has
patient_snps = set(patient_df['snpid'])
chunk = chunk[chunk['snpid'].isin(patient_snps)]
# Drops millions of irrelevant SNPs early
```

### 3. **Caching** (Don't Re-download)
```python
cache_path = "cache/gwas/MDD.txt"
if os.path.exists(cache_path):
    # Use cached file
else:
    # Download from Drive
```

---

## ❓ Common Questions

**Q: Where's the VCF generation code?**
A: Your notebook had 3 duplicate versions. I cleaned it up but it's not in the API (you upload real VCFs instead).

**Q: Where are the matplotlib plots?**
A: Those will be in the frontend (React charts). Backend just returns data.

**Q: Can I change the GWAS file names?**
A: Yes! Edit `GWAS_FILES_MAP` in `models.py`

**Q: How do I add a new disorder?**
A: 
1. Upload GWAS file to Drive
2. Add to `GWAS_FILES_MAP` in `models.py`
3. Restart server

---

## 🎓 Next: Frontend Time!

Your backend is ready. Now let's build a React UI to:
- Upload VCF files (drag & drop)
- Show analysis progress
- Display factor scores with charts
- Generate PDF reports

**Ready?** Tell me and I'll create the frontend!

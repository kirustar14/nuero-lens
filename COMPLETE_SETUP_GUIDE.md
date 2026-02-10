# Neuro-LENS Complete Setup Guide

Full-stack deployment guide for your laptop.

## 📦 What You Have

- ✅ **Backend** (Python FastAPI) - 22KB
- ✅ **Frontend** (React TypeScript) - 25KB
- ✅ **Documentation** - Complete setup instructions

## 🚀 Quick Start (10 Minutes)

### Step 1: Extract Files

```bash
# Create project directory
mkdir ~/neuro-lens
cd ~/neuro-lens

# Extract backend
unzip backend.zip

# Extract frontend  
unzip frontend.zip

# Your structure should be:
# neuro-lens/
#   ├── backend/
#   └── frontend/
```

### Step 2: Backend Setup (5 min)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Add your Google credentials (see below)
```

**Get Google OAuth Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Drive API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:8000/auth/callback`
5. Copy Client ID & Secret to `.env`

### Step 3: Frontend Setup (3 min)

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# (Default settings should work)
```

### Step 4: Run Both Services (2 min)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Open:** http://localhost:3000

---

## 📋 Detailed Setup

### Backend Configuration

Edit `backend/.env`:

```env
# From Google Cloud Console
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456

# Your GWAS folder ID (from Drive URL)
GWAS_DRIVE_FOLDER_ID=1p7N6h-TnP4r7ARX7Sl6j7qK791T7NroH

# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-random-32-char-secret-key

# These are fine as-is
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend Configuration

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

---

## 🧪 Testing the Setup

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00",
  "drive_connected": false,
  "cache_size_mb": 0.0
}
```

### 2. Test Frontend

Open http://localhost:3000 - you should see:
- Neuro-LENS login page
- "Continue with Google" button

### 3. Authenticate

1. Click "Continue with Google"
2. Sign in with your Google account
3. Allow Drive access
4. Should redirect back to upload page

### 4. Run Analysis

1. Upload a VCF file (drag & drop)
2. Wait 30-60 seconds
3. See results with:
   - Factor score charts
   - Disorder PRS table
   - Download PDF button

---

## 🎯 Architecture Overview

```
┌─────────────────────┐
│   Frontend (React)  │  http://localhost:3000
│   - Upload VCF      │
│   - Show results    │
│   - Download PDF    │
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│  Backend (FastAPI)  │  http://localhost:8000
│  - Parse VCF        │
│  - Calculate PRS    │
│  - Google Drive API │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Google Drive      │
│   - GWAS files      │
│   - OAuth tokens    │
└─────────────────────┘
```

---

## 📂 File Organization

### Backend Files

```
backend/
├── app/
│   ├── main.py                      # API routes
│   ├── config.py                    # Settings
│   ├── models.py                    # Data models
│   └── services/
│       ├── vcf_parser.py           # VCF parsing
│       ├── prs_calculator.py       # PRS calculation
│       ├── allele_harmonization.py # Allele matching
│       └── drive_service.py        # Google Drive
├── requirements.txt
├── .env
└── README.md
```

### Frontend Files

```
frontend/
├── src/
│   ├── components/                  # UI components
│   │   ├── VCFUploader.tsx
│   │   ├── FactorScoresChart.tsx
│   │   ├── DisorderScoresTable.tsx
│   │   └── AnalysisResults.tsx
│   ├── pages/                       # Page components
│   │   ├── AuthPage.tsx
│   │   └── AnalysisPage.tsx
│   ├── services/api.ts              # Backend API client
│   ├── types/api.ts                 # TypeScript types
│   └── utils/pdfGenerator.ts        # PDF reports
├── package.json
└── .env
```

---

## 🔧 Common Issues

### Backend Won't Start

**Error:** `ModuleNotFoundError`
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Error:** `Port 8000 already in use`
```bash
# Find process using port
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Kill it or use different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Won't Start

**Error:** `Cannot find module`
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error:** `Port 3000 already in use`
```bash
# Vite will automatically try 3001, 3002, etc.
# Or specify port:
npm run dev -- --port 3001
```

### Google Auth Not Working

**Error:** `redirect_uri_mismatch`

Fix:
1. Go to Google Cloud Console
2. OAuth 2.0 Client IDs
3. Edit your client
4. Add **exactly**: `http://localhost:8000/auth/callback`
5. Save and wait 5 minutes

**Error:** `Access blocked: Authorization Error`

Fix:
1. Add yourself as test user
2. Go to OAuth consent screen
3. Add your email to "Test users"

### GWAS Files Not Found

**Error:** `No SNP overlaps found`

Check:
1. Folder ID in `.env` is correct
2. Files are in that folder
3. File names match `GWAS_FILES_MAP` in `backend/app/models.py`
4. You've authenticated with the right Google account

---

## 🎨 Customization

### Change GWAS Files

Edit `backend/app/models.py`:

```python
GWAS_FILES_MAP = {
    "MDD": "MDD.txt",
    "SCZ": "Schizophrenia",
    # Add your own:
    "MY_DISORDER": "my_gwas_file.txt",
}
```

### Change Colors

Edit `frontend/tailwind.config.js`:

```javascript
colors: {
  primary: {
    500: '#your-color',  // Main color
  }
}
```

### Add Logo

Replace `frontend/public/brain.svg` with your logo.

---

## 📊 Using the Application

### 1. Upload VCF

Requirements:
- Must be .vcf or .vcf.gz format
- Should contain rsIDs (e.g., rs123456)
- Genotypes in GT field (0/0, 0/1, 1/1)
- Recommend 2000+ variants for good results

### 2. Interpret Results

**Factor Scores:**
- **< 25th percentile:** Below average genetic risk
- **25-75th percentile:** Average genetic risk  
- **> 75th percentile:** Above average genetic risk

**Important:** These are genetic predispositions only, not diagnoses!

### 3. Download Report

Click "Download Report" to get PDF with:
- All factor scores
- Disorder PRS scores
- Brain system mappings
- Interpretation guide

---

## 🚀 Production Deployment

### Option 1: Docker (Recommended)

```dockerfile
# Create docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://...
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=https://api.yoursite.com
```

### Option 2: Separate Hosting

**Backend → Heroku/Railway:**
```bash
# backend/Procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend → Vercel/Netlify:**
```bash
npm run build
# Deploy dist/ folder
```

### Option 3: VPS (DigitalOcean, AWS)

1. Install nginx
2. Set up SSL (Let's Encrypt)
3. Run backend with gunicorn
4. Serve frontend as static files

---

## 📈 Performance

**Expected Times:**
- VCF upload (2000 variants): 1-2 seconds
- Single disorder PRS: 2-3 seconds
- Full analysis (11 disorders): 30-60 seconds
- PDF generation: < 1 second

**Memory Usage:**
- Backend: ~200MB
- Frontend: ~50MB

---

## 🔒 Security Checklist

For production deployment:

- [ ] Change `SECRET_KEY` to random value
- [ ] Set `DEBUG=False` in backend
- [ ] Use HTTPS only
- [ ] Add rate limiting
- [ ] Validate file uploads
- [ ] Set up CORS properly
- [ ] Use environment variables
- [ ] Enable CSP headers
- [ ] Regular security updates

---

## 📚 Next Steps

1. ✅ **Get it running** (you're here!)
2. **Add features:**
   - User accounts
   - Analysis history
   - Multiple VCF comparison
   - Custom GWAS uploads
3. **Deploy to production**
4. **Add database** (PostgreSQL)
5. **Scale** (Redis cache, load balancer)

---

## 🆘 Getting Help

### Documentation
- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Code explanation: `CODE_EXPLANATION.md`

### Common Commands

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev

# Check logs
# Backend: Terminal output
# Frontend: Browser console (F12)
```

### Debug Mode

**Backend:**
```env
DEBUG=True  # in .env
```

**Frontend:**
```javascript
// Browser console
localStorage.debug = '*'
```

---

## ✅ Verification Checklist

Before first use:

- [ ] Python 3.9+ installed
- [ ] Node.js 18+ installed
- [ ] Google Cloud project created
- [ ] OAuth credentials configured
- [ ] GWAS files in Google Drive
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can login with Google
- [ ] Can upload VCF file
- [ ] Analysis completes successfully
- [ ] Can download PDF report

---

## 🎉 You're All Set!

Your full-stack genomic analysis platform is ready!

**Quick Start:**
```bash
# Terminal 1
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2  
cd frontend && npm run dev

# Browser
http://localhost:3000
```

---

## 📞 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review error messages carefully
3. Check backend logs (Terminal 1)
4. Check browser console (F12)
5. Verify all environment variables

Most issues are from:
- Missing environment variables
- Google OAuth misconfiguration
- Wrong file paths
- Port conflicts

Happy analyzing! 🧬🧠

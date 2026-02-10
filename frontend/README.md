# Neuro-LENS Frontend

Modern React + TypeScript web interface for genomic psychiatric risk analysis.

## Features

- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS
- 📤 **Drag & Drop Upload** - Easy VCF file uploading
- 📊 **Interactive Charts** - Recharts visualizations
- 🔐 **Google OAuth** - Secure Drive authentication
- 📄 **PDF Reports** - Downloadable analysis reports
- ⚡ **Real-time Updates** - React Query for data management
- 🎯 **Type-Safe** - Full TypeScript coverage

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first styling
- **React Query** - Server state management
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **jsPDF** - PDF generation
- **Sonner** - Toast notifications

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── VCFUploader.tsx           # File upload with drag & drop
│   │   ├── FactorScoresChart.tsx     # 5-factor visualization
│   │   ├── DisorderScoresTable.tsx   # PRS scores table
│   │   └── AnalysisResults.tsx       # Complete results view
│   ├── pages/
│   │   ├── AuthPage.tsx              # Google OAuth login
│   │   └── AnalysisPage.tsx          # Main analysis interface
│   ├── services/
│   │   └── api.ts                    # Backend API client
│   ├── types/
│   │   └── api.ts                    # TypeScript types
│   ├── utils/
│   │   └── pdfGenerator.ts           # PDF report generation
│   ├── App.tsx                       # Root component
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Quick Start

### 1. Install Dependencies

```bash
cd frontend

# Using npm
npm install

# Or using yarn
yarn install

# Or using pnpm
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000 (backend must be running)

## Development

### Run in Dev Mode

```bash
npm run dev
```

Features:
- Hot module replacement (HMR)
- Fast refresh
- Type checking
- Auto-reload on changes

### Build for Production

```bash
npm run build
```

Output: `dist/` folder with optimized static files

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## Components Overview

### 1. VCFUploader

Drag & drop file uploader with progress tracking.

```tsx
<VCFUploader 
  onUploadComplete={(result) => {
    console.log('Uploaded:', result.vcf_id);
  }}
/>
```

**Features:**
- Drag & drop support
- File type validation (.vcf, .vcf.gz)
- Upload progress indicator
- Error handling

### 2. FactorScoresChart

Interactive bar chart for 5-factor psychiatric risk scores.

```tsx
<FactorScoresChart factorScores={result.factor_scores} />
```

**Features:**
- Color-coded factors
- Percentile visualization
- Tooltips with details
- Risk level indicators

### 3. DisorderScoresTable

Table displaying PRS scores for all disorders.

```tsx
<DisorderScoresTable disorderScores={result.disorder_scores} />
```

**Features:**
- Success/failure status
- SNP counts
- Score formatting
- Summary statistics

### 4. AnalysisResults

Complete results dashboard with all visualizations.

```tsx
<AnalysisResults result={analysisResponse} />
```

**Features:**
- Summary statistics
- Factor scores chart
- Disorder scores table
- PDF download button
- Interpretation guide

## API Integration

The frontend communicates with the backend via REST API:

```typescript
import { vcfAPI, analysisAPI, authAPI } from '@/services/api';

// Upload VCF
const result = await vcfAPI.upload(file);

// Analyze
const analysis = await analysisAPI.analyze({
  vcf_id: result.vcf_id
});

// Check auth
const status = await authAPI.status();
```

## State Management

Uses React Query for server state:

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';

// Query
const { data } = useQuery({
  queryKey: ['authStatus'],
  queryFn: authAPI.status
});

// Mutation
const mutation = useMutation({
  mutationFn: analysisAPI.analyze,
  onSuccess: (data) => console.log(data)
});
```

## Styling

### Tailwind CSS

Utility-first CSS framework with custom theme:

```tsx
<div className="bg-primary-500 text-white rounded-lg p-4">
  Custom styled component
</div>
```

### Custom Colors

```js
// tailwind.config.js
colors: {
  primary: { ... },  // Blue shades
  neural: { ... }    // Purple shades
}
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

## PDF Generation

Generate downloadable reports:

```typescript
import { generatePDFReport } from '@/utils/pdfGenerator';

generatePDFReport(analysisResult);
// Downloads: neuro-lens-report-{id}.pdf
```

## Authentication Flow

1. User clicks "Continue with Google"
2. Opens Google OAuth in new window
3. User authorizes
4. Backend receives callback
5. Frontend polls for auth status
6. Redirects to analysis page

## Deployment

### Build

```bash
npm run build
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables

Set in your deployment platform:
```
VITE_API_URL=https://your-backend-api.com
```

## Troubleshooting

### CORS Errors

Make sure backend allows your frontend origin:
```python
# backend/app/main.py
allow_origins=["http://localhost:3000"]
```

### API Connection Failed

Check:
1. Backend is running on port 8000
2. `.env` has correct `VITE_API_URL`
3. No firewall blocking requests

### Build Errors

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

### Type Errors

```bash
# Regenerate types
npm run build
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 14+

## Performance

- **Initial Load**: ~100KB gzipped
- **Lazy Loading**: Components loaded on-demand
- **Code Splitting**: Automatic via Vite
- **Tree Shaking**: Removes unused code

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast (WCAG AA)

## Security

- No sensitive data in localStorage
- HTTPS only in production
- CSP headers recommended
- XSS protection via React
- CSRF token handling

## Future Enhancements

- [ ] User accounts & history
- [ ] Multiple VCF comparison
- [ ] Custom GWAS file upload
- [ ] Export to CSV/Excel
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Real-time collaboration
- [ ] Interactive brain visualization

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

For research use only.

## References

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [TailwindCSS](https://tailwindcss.com)
- [React Query](https://tanstack.com/query/latest)

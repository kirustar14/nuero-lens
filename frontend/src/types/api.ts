// API Response Types
export interface VCFUploadResponse {
  vcf_id: string;
  filename: string;
  variant_count: number;
  parsed_at: string;
}

export interface DisorderScore {
  disorder: string;
  raw_score: number;
  snp_count: number;
  status: 'ok' | 'error' | 'no_match';
}

export interface FactorScore {
  factor: string;
  label: string;
  raw_score: number;
  z_score: number;
  percentile: number;
  brain_systems: string;
}

export interface PRSAnalysisResponse {
  vcf_id: string;
  analysis_id: string;
  analyzed_at: string;
  disorder_scores: DisorderScore[];
  factor_scores: FactorScore[] | null;
  total_snps_analyzed: number;
  successful_disorders: number;
  total_disorders: number;
  processing_time_seconds: number;
}

export interface PRSAnalysisRequest {
  vcf_id: string;
  disorders?: string[];
}

export interface GWASFileInfo {
  disorder: string;
  filename: string;
  file_id: string;
  available: boolean;
  last_cached: string | null;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  drive_connected: boolean;
  cache_size_mb: number;
}

export interface AuthStatusResponse {
  authenticated: boolean;
}

export interface AuthLoginResponse {
  auth_url: string;
  state: string;
}

// UI State Types
export interface AnalysisState {
  status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  vcf_id?: string;
  result?: PRSAnalysisResponse;
  error?: string;
  progress?: number;
}

// Constants from backend
export const DISORDER_NAMES: Record<string, string> = {
  MDD: 'Major Depressive Disorder',
  SCZ: 'Schizophrenia',
  ADHD: 'Attention Deficit Hyperactivity Disorder',
  OCD: 'Obsessive Compulsive Disorder',
  PTSD: 'Post-Traumatic Stress Disorder',
  AN: 'Anorexia Nervosa',
  BIP: 'Bipolar Disorder',
  AUT: 'Autism Spectrum Disorder',
  TS: 'Tourette Syndrome',
  ANX: 'Anxiety Disorder',
  ALCH: 'Alcohol Use Disorder',
};

export const FACTOR_INFO: Record<string, { color: string; description: string }> = {
  F1: { 
    color: '#ef4444', 
    description: 'Compulsive behaviors and repetitive thought patterns' 
  },
  F2: { 
    color: '#f59e0b', 
    description: 'Psychotic symptoms and reality perception' 
  },
  F3: { 
    color: '#10b981', 
    description: 'Neurodevelopmental conditions and brain connectivity' 
  },
  F4: { 
    color: '#3b82f6', 
    description: 'Internalizing symptoms like anxiety and depression' 
  },
  F5: { 
    color: '#8b5cf6', 
    description: 'Tourette-specific motor and vocal tics' 
  },
};

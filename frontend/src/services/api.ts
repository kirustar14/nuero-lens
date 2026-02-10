import axios from 'axios';
import type {
  VCFUploadResponse,
  PRSAnalysisRequest,
  PRSAnalysisResponse,
  GWASFileInfo,
  HealthCheckResponse,
  AuthStatusResponse,
  AuthLoginResponse,
} from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const authAPI = {
  login: async (): Promise<AuthLoginResponse> => {
    const { data } = await api.get('/auth/login');
    return data;
  },

  status: async (): Promise<AuthStatusResponse> => {
    const { data } = await api.get('/auth/status');
    return data;
  },
};

// VCF Upload
export const vcfAPI = {
  upload: async (file: File): Promise<VCFUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/vcf/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};

// Analysis
export const analysisAPI = {
  analyze: async (request: PRSAnalysisRequest): Promise<PRSAnalysisResponse> => {
    const { data } = await api.post('/analysis/prs', request);
    return data;
  },
};

// GWAS Files
export const gwasAPI = {
  listFiles: async (): Promise<GWASFileInfo[]> => {
    const { data } = await api.get('/gwas/files');
    return data;
  },
};

// Health
export const healthAPI = {
  check: async (): Promise<HealthCheckResponse> => {
    const { data } = await api.get('/health');
    return data;
  },
};

export default api;

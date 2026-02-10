import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dna, Loader2, Brain } from 'lucide-react';
import VCFUploader from '@/components/VCFUploader';
import AnalysisResults from '@/components/AnalysisResults';
import { vcfAPI, analysisAPI } from '@/services/api';
import type { VCFUploadResponse, PRSAnalysisResponse } from '@/types/api';
import { toast } from 'sonner';

export default function AnalysisPage() {
  const [vcfData, setVcfData] = useState<VCFUploadResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PRSAnalysisResponse | null>(null);

  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (vcfId: string) => {
      return analysisAPI.analyze({ vcf_id: vcfId });
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success('Analysis complete!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    },
  });

  const handleUploadComplete = (result: VCFUploadResponse) => {
    setVcfData(result);
    toast.success(`Uploaded ${result.variant_count.toLocaleString()} variants`);
    
    // Automatically start analysis
    analysisMutation.mutate(result.vcf_id);
  };

  const handleReset = () => {
    setVcfData(null);
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-neural-500 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Neuro-LENS</h1>
                <p className="text-sm text-gray-600">Genomic Psychiatric Risk Analysis</p>
              </div>
            </div>

            {analysisResult && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analysisResult ? (
          <div className="space-y-8">
            {/* Hero Section */}
            {!vcfData && !analysisMutation.isPending && (
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-neural-500 rounded-full mb-4">
                  <Dna className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Analyze Your Genetic Data
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Upload your VCF file to calculate polygenic risk scores across 11 psychiatric
                  disorders using the latest genomic research.
                </p>
              </div>
            )}

            {/* Upload Section */}
            {!analysisMutation.isPending && (
              <VCFUploader onUploadComplete={handleUploadComplete} />
            )}

            {/* Analyzing State */}
            {analysisMutation.isPending && vcfData && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-full animate-pulse" />
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Analyzing Your Genome
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Processing {vcfData.variant_count.toLocaleString()} genetic variants...
                      </p>
                    </div>

                    <div className="w-full space-y-3">
                      {[
                        'Parsing VCF file',
                        'Downloading GWAS summary statistics',
                        'Harmonizing alleles',
                        'Calculating polygenic risk scores',
                        'Computing factor scores',
                      ].map((step, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                          <span className="text-gray-700">{step}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      This typically takes 30-60 seconds
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Cards */}
            {!vcfData && !analysisMutation.isPending && (
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🧬</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">11 Disorders</h3>
                  <p className="text-sm text-gray-600">
                    Analyzes genetic risk for MDD, SCZ, ADHD, OCD, PTSD, AN, BIP, AUT, TS, ANX, and ALCH
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">5-Factor Model</h3>
                  <p className="text-sm text-gray-600">
                    Uses genomic SEM to identify broad psychiatric factors (Grotzinger et al. 2022)
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🔬</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Research-Grade</h3>
                  <p className="text-sm text-gray-600">
                    Based on latest GWAS summary statistics and validated methodologies
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Results Section
          <AnalysisResults result={analysisResult} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600">
            For research and educational purposes only. Not for clinical use.
          </p>
          <p className="text-center text-xs text-gray-500 mt-2">
            Based on Grotzinger et al. (2022) genomic structural equation modeling
          </p>
        </div>
      </footer>
    </div>
  );
}

import { Download, Clock, Database, CheckCircle2 } from 'lucide-react';
import type { PRSAnalysisResponse } from '@/types/api';
import FactorScoresChart from './FactorScoresChart';
import DisorderScoresTable from './DisorderScoresTable';
import { generatePDFReport } from '@/utils/pdfGenerator';

interface AnalysisResultsProps {
  result: PRSAnalysisResponse;
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  const handleDownloadReport = () => {
    generatePDFReport(result);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Summary Stats */}
      <div className="bg-gradient-to-r from-primary-500 to-neural-500 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Analysis Complete</h2>
            <p className="text-primary-100 text-sm mt-1">
              Analysis ID: {result.analysis_id.substring(0, 8)}...
            </p>
          </div>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {((result.successful_disorders / result.total_disorders) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-primary-100 mt-1">
              {result.successful_disorders} of {result.total_disorders} disorders
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">SNPs Analyzed</span>
            </div>
            <div className="text-2xl font-bold">
              {result.total_snps_analyzed.toLocaleString()}
            </div>
            <div className="text-xs text-primary-100 mt-1">
              Genetic variants processed
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Processing Time</span>
            </div>
            <div className="text-2xl font-bold">
              {result.processing_time_seconds.toFixed(1)}s
            </div>
            <div className="text-xs text-primary-100 mt-1">
              Total computation time
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">Analyzed</span>
            </div>
            <div className="text-2xl font-bold">
              {new Date(result.analyzed_at).toLocaleDateString()}
            </div>
            <div className="text-xs text-primary-100 mt-1">
              {new Date(result.analyzed_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Factor Scores Section */}
      {result.factor_scores && result.factor_scores.length > 0 && (
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Psychiatric Factor Scores
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              5-factor genomic model based on Grotzinger et al. (2022)
            </p>
          </div>
          <FactorScoresChart factorScores={result.factor_scores} />
        </div>
      )}

      {/* Disorder Scores Table */}
      <div>
        <DisorderScoresTable disorderScores={result.disorder_scores} />
      </div>

      {/* Interpretation Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">
          💡 How to Interpret These Results
        </h4>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>Percentile:</strong> Shows how your genetic risk compares to the general population.
            Higher percentile = greater genetic loading for that factor.
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>&lt;25%:</strong> Below average genetic risk</li>
            <li><strong>25-75%:</strong> Average genetic risk (most people fall here)</li>
            <li><strong>&gt;75%:</strong> Above average genetic risk</li>
          </ul>
          <p className="mt-3">
            <strong>Z-Score:</strong> Number of standard deviations from the population mean.
            Positive values indicate above-average scores, negative values below-average.
          </p>
          <p className="mt-3 text-xs text-blue-700">
            ⚠️ <strong>Important:</strong> These scores reflect genetic predisposition only and do not
            diagnose any condition. Many factors contribute to mental health beyond genetics, including
            environment, lifestyle, and social factors.
          </p>
        </div>
      </div>
    </div>
  );
}

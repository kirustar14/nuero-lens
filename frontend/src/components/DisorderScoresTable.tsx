import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { DisorderScore } from '@/types/api';
import { DISORDER_NAMES } from '@/types/api';

interface DisorderScoresTableProps {
  disorderScores: DisorderScore[];
}

export default function DisorderScoresTable({ disorderScores }: DisorderScoresTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok':
        return 'Success';
      case 'error':
        return 'Error';
      case 'no_match':
        return 'No SNP Match';
      case 'no_overlap':
        return 'No Overlap';
      case 'file_not_found':
        return 'File Missing';
      default:
        return status;
    }
  };

  const successfulScores = disorderScores.filter(s => s.status === 'ok');
  const failedScores = disorderScores.filter(s => s.status !== 'ok');

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          Disorder-Specific PRS Scores
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {successfulScores.length} of {disorderScores.length} disorders analyzed successfully
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disorder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PRS Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SNPs Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Successful scores first */}
            {successfulScores.map((score) => (
              <tr key={score.disorder} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {DISORDER_NAMES[score.disorder] || score.disorder}
                      </div>
                      <div className="text-xs text-gray-500">{score.disorder}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono font-semibold text-gray-900">
                    {score.raw_score.toFixed(6)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {score.snp_count.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(score.status)}
                    <span className="text-sm text-gray-700">
                      {getStatusText(score.status)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {/* Failed scores */}
            {failedScores.length > 0 && (
              <>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-6 py-2">
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Issues Encountered
                    </div>
                  </td>
                </tr>
                {failedScores.map((score) => (
                  <tr key={score.disorder} className="hover:bg-gray-50 opacity-60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-700">
                            {DISORDER_NAMES[score.disorder] || score.disorder}
                          </div>
                          <div className="text-xs text-gray-500">{score.disorder}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">—</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">—</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(score.status)}
                        <span className="text-sm text-gray-600">
                          {getStatusText(score.status)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Total SNPs analyzed: <span className="font-semibold text-gray-800">
              {successfulScores.reduce((sum, s) => sum + s.snp_count, 0).toLocaleString()}
            </span>
          </div>
          <div className="text-gray-600">
            Average PRS: <span className="font-semibold text-gray-800 font-mono">
              {successfulScores.length > 0
                ? (successfulScores.reduce((sum, s) => sum + s.raw_score, 0) / successfulScores.length).toFixed(6)
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { FactorScore } from '@/types/api';
import { FACTOR_INFO } from '@/types/api';

interface FactorScoresChartProps {
  factorScores: FactorScore[];
}

export default function FactorScoresChart({ factorScores }: FactorScoresChartProps) {
  const chartData = factorScores.map((score) => ({
    factor: score.factor,
    label: score.label,
    percentile: score.percentile,
    zScore: score.z_score,
    color: FACTOR_INFO[score.factor]?.color || '#6b7280',
  }));

  const getRiskLevel = (percentile: number): string => {
    if (percentile < 25) return 'Below Average';
    if (percentile < 75) return 'Average';
    return 'Above Average';
  };

  const getRiskColor = (percentile: number): string => {
    if (percentile < 25) return 'text-green-600';
    if (percentile < 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Percentile Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Risk Percentiles by Factor
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="factor" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]} 
              label={{ value: 'Percentile', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-gray-800">{data.label}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Percentile: <span className="font-medium">{data.percentile.toFixed(1)}%</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Z-Score: <span className="font-medium">{data.zScore.toFixed(2)}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="percentile" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Reference Lines */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Below Average (&lt;25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>Average (25-75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Above Average (&gt;75%)</span>
          </div>
        </div>
      </div>

      {/* Detailed Factor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factorScores.map((score) => (
          <div
            key={score.factor}
            className="bg-white rounded-lg shadow-md p-5 border-l-4"
            style={{ borderLeftColor: FACTOR_INFO[score.factor]?.color }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-800">{score.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{score.factor}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {score.percentile.toFixed(0)}
                  <span className="text-sm font-normal text-gray-500">%ile</span>
                </div>
                <div className={`text-xs font-medium mt-1 ${getRiskColor(score.percentile)}`}>
                  {getRiskLevel(score.percentile)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Z-Score:</span>
                <span className="font-medium text-gray-800">{score.z_score.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Raw Score:</span>
                <span className="font-medium text-gray-800">{score.raw_score.toFixed(4)}</span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-700">Brain Systems: </span>
                  {score.brain_systems}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

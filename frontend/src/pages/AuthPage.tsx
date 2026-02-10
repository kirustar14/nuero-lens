import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Brain, ExternalLink, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { authAPI } from '@/services/api';

interface AuthPageProps {
  onAuthenticated: () => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check authentication status
  const { data: authStatus, refetch } = useQuery({
    queryKey: ['authStatus'],
    queryFn: authAPI.status,
    refetchInterval: isAuthenticating ? 2000 : false, // Poll while authenticating
  });

  // Get login URL
  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      setIsAuthenticating(true);
      window.open(data.auth_url, '_blank');
    },
  });

  // Check if authenticated
  useEffect(() => {
    if (authStatus?.authenticated) {
      setIsAuthenticating(false);
      onAuthenticated();
    }
  }, [authStatus, onAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neural-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-neural-500 rounded-full mb-4 shadow-lg">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Neuro-LENS</h1>
          <p className="text-gray-600">Genomic Psychiatric Risk Analysis</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {!isAuthenticating ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Connect to Google Drive
              </h2>
              
              <p className="text-sm text-gray-600 mb-6">
                Neuro-LENS needs access to your Google Drive to download GWAS summary statistics
                for analysis. Your genetic data stays private and is processed locally.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">What we access:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Read-only access to GWAS files in your designated folder</li>
                      <li>No access to other files or folders</li>
                      <li>No modification or deletion permissions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => loginMutation.mutate()}
                disabled={loginMutation.isPending}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {loginMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    Failed to initiate login. Please try again.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Waiting for Authentication
                </h3>
                
                <p className="text-sm text-gray-600 mb-6">
                  Please complete the Google sign-in in the popup window.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                    <span>Checking authentication status...</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAuthenticating(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              What you'll get:
            </h3>
            <div className="space-y-2">
              {[
                'Polygenic risk scores for 11 psychiatric disorders',
                '5-factor genomic model analysis',
                'Brain system mapping',
                'Downloadable PDF reports',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          For research and educational purposes only
        </p>
      </div>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { vcfAPI } from '@/services/api';
import type { VCFUploadResponse } from '@/types/api';

interface VCFUploaderProps {
  onUploadComplete: (result: VCFUploadResponse) => void;
  onUploadStart?: () => void;
}

export default function VCFUploader({ onUploadComplete, onUploadStart }: VCFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith('.vcf') && !file.name.endsWith('.vcf.gz')) {
      setError('Please upload a VCF file (.vcf or .vcf.gz)');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    onUploadStart?.();

    try {
      // Simulate progress (real progress would need backend support)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await vcfAPI.upload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        onUploadComplete(result);
        setUploading(false);
      }, 300);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete, onUploadStart]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.vcf'],
      'application/gzip': ['.vcf.gz'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <>
              <div className="relative">
                <Upload className="w-16 h-16 text-primary-500 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-primary-600">
                    {uploadProgress}%
                  </div>
                </div>
              </div>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Uploading VCF file...</p>
            </>
          ) : (
            <>
              <FileText className="w-16 h-16 text-gray-400" />
              
              <div>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {isDragActive ? 'Drop VCF file here' : 'Upload VCF File'}
                </p>
                <p className="text-sm text-gray-500">
                  Drag & drop or click to select
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports .vcf and .vcf.gz files
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <div className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
                  Choose File
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

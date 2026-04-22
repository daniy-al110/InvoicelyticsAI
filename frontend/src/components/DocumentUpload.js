import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

const DocumentUpload = ({ onUploadComplete, token }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log("Starting upload for:", file.name);
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents/upload`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log("UPLOAD RESPONSE:", response.data);
      console.log("File uploaded successfully, ID:", response.data.id);
      onUploadComplete(response.data);
    } catch (err) {
      console.error("Upload process error:", err);
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      setError(`Upload Error: ${msg}`);
    } finally {
      console.log("Cleaning up upload state.");
      setUploading(false);
    }
  }, [onUploadComplete, token]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="p-6 border-b border-border">
      <h2 className="text-2xl font-heading font-bold mb-4 tracking-tight" data-testid="upload-title">
        Upload Document
      </h2>
      
      <div
        {...getRootProps()}
        className={`dropzone border-2 border-dashed p-8 text-center cursor-pointer ${
          isDragActive ? 'border-primary bg-primary-50/50' : 'border-border'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        data-testid="upload-dropzone"
      >
        <input {...getInputProps()} data-testid="upload-input" />
        
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="loader" data-testid="upload-loading">Processing Document</p>
            </>
          ) : (
            <>
              {isDragActive ? (
                <FileText className="w-12 h-12 text-primary" />
              ) : (
                <Upload className="w-12 h-12 text-text-secondary" />
              )}
              <div>
                <p className="text-text-main font-medium" data-testid="upload-instruction">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a document here'}
                </p>
                <p className="text-sm text-text-secondary mt-1">or click to select</p>
                <p className="text-xs text-text-secondary mt-2">Supports PDF, PNG, JPG (max 10MB)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-accent-error/10 border border-accent-error text-accent-error" data-testid="upload-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;

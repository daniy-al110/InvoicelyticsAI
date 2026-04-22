import React from 'react';
import { FileText, Database, Layers } from 'lucide-react';

const DocumentViewer = ({ extractedText, filename, metadata }) => {
  if (!extractedText) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
        <FileText className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-black text-slate-800">No Text Available</h3>
        <p className="text-slate-500 font-medium text-sm mt-2 max-w-sm">
          No text was extracted for this document because it was uploaded before OCR extraction was restored. Please upload a new document to analyze it.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-black/40">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">Raw Document Stream</h2>
        </div>
        
        {filename && (
          <div className="flex items-center gap-4 text-xs font-mono text-text-secondary">
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
              <FileText className="w-3 h-3" /> {filename}
            </div>
            {metadata?.ocr_method && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
                <Database className="w-3 h-3" /> {metadata.ocr_method}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="text-preview p-4 rounded-xl border border-white/5 text-sm leading-relaxed" data-testid="document-text">
          {extractedText}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;

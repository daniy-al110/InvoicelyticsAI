import React, { useState, useEffect } from 'react';
import { 
  CloudUpload, 
  Map, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Download, 
  Database,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

const ExcelIntegration = ({ token, documents }) => {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Append
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping] = useState({});
  const [selectedDocId, setSelectedDocId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');

  const standardFields = [
    { id: 'invoice_number', label: 'Invoice Number' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'date', label: 'Date' },
    { id: 'subtotal', label: 'Subtotal' },
    { id: 'tax', label: 'Tax' },
    { id: 'total_amount', label: 'Total Amount' }
  ];

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const url = `${process.env.REACT_APP_BACKEND_URL}/api/excel/analyze`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(`${errorData.detail || 'Failed to analyze Excel structure'} (Status: ${response.status}) at ${url}`);
      }
      
      const data = await response.json();
      setAnalysis(data);
      setMapping(data.analysis.column_mapping || {});
      setStep(2);
    } catch (err) {
      console.error('Analysis failed:', err);
      alert(`Failed to analyze Excel file structure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (excelCol, standardField) => {
    setMapping(prev => ({
      ...prev,
      [excelCol]: standardField
    }));
  };

  const handleAppend = async () => {
    if (!selectedDocId || !file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('sheet_name', sheetName);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/excel/append/${selectedDocId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Integrated_${file.name}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStep(1);
        setFile(null);
        setAnalysis(null);
      } else {
        const err = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        const message = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        alert(`Append failed: ${message}`);
      }
    } catch (err) {
      console.error('Append failed:', err);
      alert('Network error during append.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="hero-header">
        <div className="hero-header-content">
          <div className="hero-header-icon">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="hero-header-title">
            <h1>Excel Intelligence</h1>
            <p>AI-Assisted Ingestion & Integration</p>
          </div>
        </div>
        <div className="hero-header-badge-container">
          <div className="hero-header-badge">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Step {step} of 3
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 sm:p-10 lg:p-12 text-center shadow-2xl shadow-slate-200/50 hover:border-primary/50 transition-all group">
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform">
            <CloudUpload className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Upload Target Spreadsheet</h2>
          <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">Select the Excel file you want to append extracted invoice data to. AI will automatically analyze its structure.</p>
          
          <div className="flex flex-col items-center gap-6">
            <input 
              type="file" 
              accept=".xlsx" 
              id="excel-upload" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <label 
              htmlFor="excel-upload"
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm cursor-pointer hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl"
            >
              {file ? file.name : 'Select .xlsx File'}
            </label>
            
            {file && (
              <button 
                onClick={startAnalysis}
                disabled={loading}
                className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-[1.03] transition-all flex items-center gap-3 shadow-xl shadow-primary/30 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Map className="w-5 h-5" />}
                Analyze Structure
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && analysis && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Issues & Suggestions */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> AI Observations
                  </h3>
                  <div className="space-y-4">
                    {analysis.analysis.issues.map((issue, i) => (
                      <div key={i} className="flex gap-3 text-sm text-slate-600 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                        <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                        <span className="font-medium leading-relaxed">{issue}</span>
                      </div>
                    ))}
                    {analysis.analysis.issues.length === 0 && (
                        <div className="flex gap-3 text-sm text-slate-600 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 font-medium italic">
                            No major issues detected.
                        </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">Pro Tip</h3>
                  <p className="text-sm font-medium text-white/80 leading-relaxed">
                    The AI maps columns based on semantic meaning. Even if your header says "Payable To" instead of "Vendor", the intelligence engine connects them automatically.
                  </p>
                </div>
              </div>

              {/* Mapping Table */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm overflow-hidden text-clip">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Map className="w-4 h-4 text-primary" /> Column Mapping Review
                        </h3>
                        <span className="text-xs font-black bg-slate-50 text-slate-400 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest">
                            {analysis.columns.length} Columns Found
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 pb-2 text-left">Excel Column</th>
                                    <th className="px-6 pb-2 text-left">Mapped Entity</th>
                                    <th className="px-6 pb-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.columns.map((col, idx) => {
                                    const mapped = mapping[col];
                                    return (
                                        <tr key={idx} className="bg-slate-50/50 rounded-2xl overflow-hidden hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 rounded-l-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm">{col}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    className="select-modern h-10 w-full text-xs font-bold"
                                                    value={mapped || ""}
                                                    onChange={(e) => handleMappingChange(col, e.target.value)}
                                                >
                                                    <option value="">-- Ignore --</option>
                                                    {standardFields.map(f => (
                                                        <option key={f.id} value={f.id}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-center rounded-r-2xl">
                                                {mapped ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-slate-200 mx-auto" />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-10 flex justify-end gap-4">
                        <button 
                            onClick={() => setStep(1)}
                            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest"
                        >
                            Back to Upload
                        </button>
                        <button 
                            onClick={() => setStep(3)}
                            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all uppercase tracking-widest flex items-center gap-3 shadow-xl"
                        >
                            Next: Select Data <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto w-full">
             <div className="bg-white border border-slate-100 p-6 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
                
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Database className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter leading-tight">Final Step: Choose Invoice Data</h2>
                <p className="text-slate-500 mb-12 font-medium">Select the extracted invoice you want to append to <strong>{file?.name}</strong>.</p>
                
                <div className="space-y-8 text-left max-w-lg mx-auto">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Sheet Name</label>
                        <input 
                            type="text" 
                            className="input-modern w-full" 
                            placeholder="e.g. Sheet1" 
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Processed Invoices</label>
                        <select 
                            className="select-modern w-full h-14 font-bold"
                            value={selectedDocId}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                        >
                            <option value="">Select a document...</option>
                            {documents && documents.map(doc => {
                                const hasData = !!doc.structured_data;
                                return (
                                    <option key={doc.id} value={doc.id} disabled={!hasData}>
                                        {doc.filename} {hasData ? `(${doc.structured_data?.vendor?.value || 'Unknown Vendor'})` : '— [Needs Extraction]'}
                                    </option>
                                );
                            })}
                        </select>
                        <p className="text-xs text-slate-400 mt-3 ml-1 font-bold leading-relaxed">
                            <span className="text-primary mr-1">Note:</span> Only documents with completed AI extraction can be appended to Excel.
                        </p>

                    </div>
                </div>

                <div className="mt-16 flex flex-col sm:flex-row justify-center gap-6">
                    <button 
                        onClick={() => setStep(2)}
                        disabled={loading}
                        className="px-10 py-4 bg-white border border-slate-200 text-slate-600 rounded-3xl font-black text-sm hover:bg-slate-50 transition-all uppercase tracking-widest disabled:opacity-50"
                    >
                        Review Mapping
                    </button>
                    <button 
                        onClick={handleAppend}
                        disabled={loading || !selectedDocId}
                        className="px-10 py-4 bg-primary text-white rounded-3xl font-black text-sm hover:scale-[1.03] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/30 disabled:opacity-50 active:scale-95"
                    >
                        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
                        {loading ? 'Processing...' : 'Append & Download'}
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default ExcelIntegration;

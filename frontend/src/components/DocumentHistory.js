import React, { useState } from 'react';
import { Clock, FileText, ChevronRight, History, Activity, AlertCircle, FileSpreadsheet, Loader2, Search, Sparkles } from 'lucide-react';

const DocumentHistory = ({ documents = [], onSelect, activeId, token }) => {
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBulkExport = async () => {
    if (exporting || documents.length === 0) return;
    setExporting(true);
    try {
      const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/excel/export_all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Bulk export failed');
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoicelytics_Bulk_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[32px] shadow-xl shadow-slate-200/50 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tighter">Queue & Intelligence</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{documents.length} Active Contexts</p>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-slate-50 border border-transparent focus:border-primary/20 focus:bg-white px-11 py-3 overflow-hidden rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none shadow-sm"
          />
        </div>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">

        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border border-slate-50">
            <Activity className="w-8 h-8 text-slate-200 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No results found</p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isActive = activeId === doc._id;
            return (
              <div 
                key={doc._id} 
                className={`group relative flex items-center gap-4 p-4 rounded-[26px] transition-all cursor-pointer border-2 ${
                  isActive 
                  ? 'bg-white border-primary shadow-xl shadow-primary/10' 
                  : 'bg-white border-transparent hover:border-slate-50 hover:shadow-sm'
                }`}
                onClick={() => onSelect(doc._id)}
              >
                <div className={`p-3.5 rounded-xl transition-all ${
                  isActive 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-[13px] font-black truncate ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>
                      {doc.filename}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {doc.created_at ? new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </p>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-all">
                   <ChevronRight className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-300'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4">
        <button 
          onClick={handleBulkExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 transition-all shadow-sm"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
          Export All Records
        </button>
      </div>
    </div>
  );
};

export default DocumentHistory;

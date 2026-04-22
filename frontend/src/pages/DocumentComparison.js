import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Filter,
  Plus,
  ShieldAlert,
  Scaling,
  ChevronDown
} from 'lucide-react';

const DocumentComparison = ({ documents = [], selectedIds, onUpdateIds, onClear, token }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDoc = (index, newId) => {
    if (!onUpdateIds) return;
    const newIds = [...selectedIds];
    newIds[index] = newId;
    onUpdateIds(newIds);
    setOpenDropdown(null);
  };


  const fetchComparison = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/compare`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ document_ids: selectedIds })
      });
      const data = await response.json();
      setComparisonData(data);
    } catch (err) {
      console.error('Comparison failed:', err);
    } finally {
      setLoading(false);
    }
  };



  const handleDownload = () => {
    if (!comparisonData?.ai_comparison?.comparison_rows) return;
    
    // Filter rows based on current view
    const rowsToExport = comparisonData.ai_comparison.comparison_rows.filter(
      row => !differencesOnly || row.status !== 'Match'
    );
    
    // Create headers
    const docHeaders = (comparisonData.docs || []).map(d => d.filename);
    const headers = ["Field", "Status", ...docHeaders];
    
    // Create CSV content
    const csvRows = [headers.join(",")];
    
    rowsToExport.forEach(row => {
      const rowData = [
        `"${row.field}"`,
        `"${row.status}"`,
        ...row.values.map(v => `"${(v || "").replace(/"/g, '""')}"`)
      ];
      csvRows.push(rowData.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comparison_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddSelector = () => {
    if (selectedIds.length >= 4) return; // Cap at 4 for UI sanity
    onUpdateIds([...selectedIds, null]);
  };

  const handleRemoveSelector = (index) => {
    if (selectedIds.length <= 2) return;
    const newIds = selectedIds.filter((_, i) => i !== index);
    onUpdateIds(newIds);
  };

  return (
    <div className="page-container">
      <div className="hero-header">
        <div className="hero-header-content">
          <div className="hero-header-icon">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="hero-header-title">
            <h1>Document Comparison</h1>
            <p>Structural & Contextual Variance Analysis</p>
          </div>
        </div>
        <div className="hero-header-badge-container">
          <div className="hero-header-badge">
            <Scaling className="w-4 h-4" /> Multi-Select Active
          </div>
        </div>
      </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-2.5 rounded-3xl border border-slate-100 shadow-sm" ref={dropdownRef}>
           {selectedIds.map((id, index) => {
             const doc = documents.find(d => d.id === id || d._id === id);
             const name = doc?.filename || `Select Document ${index + 1}`;
             
             return (
               <React.Fragment key={index}>
                 {index > 0 && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">vs</span>}
                 <div className="relative">
                   <div 
                    onClick={() => setOpenDropdown(openDropdown === index ? null : index)} 
                    className={`flex items-center gap-4 px-5 py-2.5 bg-white border ${id ? 'border-primary/20 shadow-primary/5' : 'border-slate-100'} shadow-sm rounded-2xl cursor-pointer hover:bg-slate-50 transition-all`}
                   >
                     <span className={`text-sm font-black max-w-[140px] truncate ${id ? 'text-primary' : 'text-slate-400'}`}>{name}</span>
                     <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === index ? 'rotate-180' : ''} ${id ? 'text-primary' : 'text-slate-300'}`} />
                   </div>
                   
                   {openDropdown === index && (
                     <div className="absolute top-14 left-0 w-72 bg-white shadow-2xl border border-slate-100 rounded-[24px] overflow-hidden z-20 py-3 animate-in fade-in zoom-in-95 duration-200">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-5 mb-2">Available Documents</p>
                       <div className="max-h-64 overflow-y-auto custom-scrollbar">
                         {documents.map(d => (
                           <div 
                            key={d.id || d._id} 
                            onClick={() => handleSelectDoc(index, d.id || d._id)} 
                            className={`px-5 py-3 text-sm flex justify-between items-center hover:bg-slate-50 cursor-pointer font-bold transition-colors ${selectedIds.includes(d.id || d._id) ? 'bg-primary/5 text-primary' : 'text-slate-600'}`}
                           >
                             <span className="truncate">{d.filename}</span>
                             {selectedIds.includes(d.id || d._id) && index === selectedIds.indexOf(d.id || d._id) && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                           </div>
                         ))}
                       </div>
                       {selectedIds.length > 2 && (
                         <div className="mt-2 pt-2 border-t border-slate-50 px-3">
                           <button onClick={() => handleRemoveSelector(index)} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">Remove Slot</button>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </React.Fragment>
             );
           })}
           
           <div className="flex gap-2 ml-2">
             {selectedIds.length < 4 && (
               <button 
                className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl shadow-sm hover:border-primary hover:text-primary transition-all active:scale-90" 
                onClick={handleAddSelector}
               >
                 <Plus className="w-5 h-5" />
               </button>
             )}
             <button 
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                selectedIds.every(id => id) && !loading
                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`} 
              onClick={() => { if(selectedIds.every(id => id)) fetchComparison() }}
             >
               {loading ? 'Comparing...' : 'Run Analysis'}
             </button>
           </div>
        </div>

      {selectedIds.length < 2 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 py-20 opacity-50">
          <ArrowRightLeft className="w-16 h-16 text-slate-400" />
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Comparison Mode</h2>
          <p className="font-bold text-slate-500 text-sm">Please select your documents using the dropdowns above to begin comparing.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Matching Contextual Vectors...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-2">
         <div className="md:col-span-3 space-y-6">
           <div className="metric-card bg-white p-8">
             <p className="text-sm font-black text-slate-900 mb-6">Alignment Score</p>
             <div className="relative flex flex-col items-center">
                <div className="text-5xl font-black text-primary tracking-tighter">{comparisonData?.ai_comparison?.alignment_score || 0}%</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Structural Match</div>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-6 overflow-hidden">
                   <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${comparisonData?.ai_comparison?.alignment_score || 0}%` }} />
                </div>
             </div>
           </div>

           <div className="metric-card bg-white p-6 space-y-6">
             <p className="text-sm font-black text-slate-900 mb-2">Critical Variances</p>
             <div className="space-y-4">
                {(comparisonData?.ai_comparison?.critical_variances || []).map((v, i) => {
                  const isHigh = v.risk?.toLowerCase().includes('high');
                  const isMed = v.risk?.toLowerCase().includes('med');
                  const badgeStyle = isHigh ? 'bg-red-50 text-red-500' : (isMed ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500');
                  
                  return (
                    <div key={i} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-black text-slate-900">{v.field}</span>
                        <span className={`text-[9px] whitespace-nowrap font-black uppercase px-2 py-0.5 rounded-full ${badgeStyle}`}>{v.risk}</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-medium">{v.desc}</p>
                    </div>
                  );
                })}
             </div>
           </div>
        </div>

        <div className="md:col-span-9">
           <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div className="flex gap-4">
                   <button 
                     onClick={() => setDifferencesOnly(false)}
                     className={`text-xs px-4 py-2 rounded-xl transition-all ${!differencesOnly ? 'bg-primary text-white font-black shadow-lg shadow-primary/20' : 'text-slate-400 font-bold hover:bg-slate-100'}`}
                   >
                     All Fields
                   </button>
                   <button 
                     onClick={() => setDifferencesOnly(true)}
                     className={`text-xs px-4 py-2 rounded-xl transition-all ${differencesOnly ? 'bg-primary text-white font-black shadow-lg shadow-primary/20' : 'text-slate-400 font-bold hover:bg-slate-100'}`}
                   >
                     Differences Only
                   </button>
                </div>
                <button 
                  onClick={handleDownload}
                  disabled={!comparisonData}
                  className={`p-2 rounded-xl transition-all ${comparisonData ? 'text-slate-600 hover:bg-primary/10 hover:text-primary' : 'text-slate-200 cursor-not-allowed'}`}
                >
                  <Download className="w-5 h-5" />
                </button>
             </div>
             
             <div className="overflow-x-auto p-8">
                {comparisonData?.detail ? (
                   <div className="bg-red-50 border border-dashed border-red-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                     <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
                     <h3 className="text-xl font-black text-red-900 mb-2">AI Processing Error</h3>
                     <p className="text-red-700 font-medium max-w-md">
                       {typeof comparisonData.detail === 'string' 
                        ? comparisonData.detail 
                        : (Array.isArray(comparisonData.detail) 
                           ? comparisonData.detail.map(err => err.msg || JSON.stringify(err)).join(', ')
                           : JSON.stringify(comparisonData.detail))
                       }
                     </p>
                   </div>
               ) : !(comparisonData?.ai_comparison?.comparison_rows?.length > 0) ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-xl font-black text-slate-800 mb-2">Insufficient Data for Comparison</h3>
                    <p className="text-slate-500 font-medium max-w-md">
                      It looks like one or both of the selected documents have not been processed. Please ensure you have run "Initialize Intelligence" on both documents before comparing them.
                    </p>
                  </div>
               ) : (
                 <table className="w-full text-left">
                   <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                        <th className="pb-6 pr-8 w-1/4">Extracted Field</th>
                        {comparisonData?.docs?.map((doc, idx) => (
                          <th key={doc.id || idx} className="pb-6 px-4">{doc.filename}</th>
                        ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {(comparisonData?.ai_comparison?.comparison_rows || [])
                        .filter(row => !differencesOnly || row.status !== 'Match')
                        .map((row, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50">
                          <td className="py-6 pr-8 text-sm font-black text-slate-600 capitalize">
                            <div className="flex items-center gap-2">
                              {row.field}
                              {row.status !== 'Match' && (
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${row.status.includes('Risk') ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'}`}>
                                  {row.status}
                                </span>
                              )}
                            </div>
                          </td>
                          {row.values.map((val, valIdx) => (
                            <td key={valIdx} className="py-6 px-4 min-w-[250px]">
                              <div className={`p-4 rounded-2xl text-xs font-medium border ${row.status === 'Match' ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}>
                                 <span className={val?.toLowerCase().includes('not found') ? 'italic text-slate-400' : ''}>{val}</span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                 </table>
               )}
             </div>
           </div>
         </div>
        </div>
      )}
    </div>
  );
};

export default DocumentComparison;

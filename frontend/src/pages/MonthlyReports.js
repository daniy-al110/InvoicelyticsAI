import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Loader2
} from 'lucide-react';

const MonthlyReports = ({ token }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/monthly`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch monthly reports');
      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Aggregating Financial Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center max-w-lg mx-auto mt-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <TrendingUp className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Analysis Failed</h2>
        <p className="text-slate-500 mb-6 font-medium">{error}</p>
        <button onClick={fetchReports} className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">Retry Analysis</button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center p-20 bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200 mt-10">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <Calendar className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">No Temporal Data Found</h2>
        <p className="text-slate-500 max-w-sm mx-auto font-medium mb-0">Upload and extract invoices to generate your first longitudinal financial report.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="hero-header">
        <div className="hero-header-content">
          <div className="hero-header-icon">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="hero-header-title">
            <h1>Monthly Intelligence</h1>
            <p className="text-[8px]">Financial Performance & Trend Detection</p>
          </div>
        </div>
        <div className="hero-header-badge-container">
          <div className="hero-header-badge">
            <Calendar className="w-4 h-4" /> {reports.length} Months Tracked
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 pb-20">
        {reports.map((report, index) => {
          const isIncrease = report.ai_summary.toLowerCase().includes('increased') || report.ai_summary.toLowerCase().includes('higher');
          const isDecrease = report.ai_summary.toLowerCase().includes('decreased') || report.ai_summary.toLowerCase().includes('lower');

          return (
            <div key={index} className="group relative">
              {/* Timeline Connector */}
              {index !== reports.length - 1 && (
                <div className="absolute left-[39px] top-full h-10 w-0.5 bg-gradient-to-b from-slate-200 to-transparent z-0" />
              )}

              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-300/30 transition-all duration-500 p-6 flex flex-col lg:flex-row gap-6 items-stretch overflow-hidden">

                {/* Month Badge */}
                <div className="lg:w-40 flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 p-4">
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.25em] mb-1">{report.month.split(' ')[1]}</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tighter">{report.month.split(' ')[0]}</span>
                </div>

                {/* Metrics Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                  <div className="metric-box bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      <DollarSign className="w-3.5 h-3.5" /> Total Spend
                    </div>
                    <div className="text-2xl font-black text-slate-900">${report.total_spending.toLocaleString()}</div>
                  </div>

                  <div className="metric-box bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      <FileText className="w-3.5 h-3.5" /> Invoices
                    </div>
                    <div className="text-2xl font-black text-slate-900">{report.invoice_count}</div>
                  </div>

                  <div className="metric-box bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      <TrendingUp className="w-3.5 h-3.5" /> Avg Value
                    </div>
                    <div className="text-2xl font-black text-slate-900">${report.average_value.toLocaleString()}</div>
                  </div>
                </div>

                {/* AI Summary Sidebar */}
                <div className={`lg:w-full lg:max-w-md p-6 rounded-3xl relative overflow-hidden group/ai transition-all ${isIncrease ? 'bg-orange-50 border border-orange-100 text-orange-900' : 'bg-emerald-50 border border-emerald-100 text-emerald-900'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${isIncrease ? 'bg-orange-200' : 'bg-emerald-200'}`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-[0.2em]">AI Intelligence</span>
                  </div>

                  <p className="text-sm font-bold leading-relaxed relative z-10 italic">"{report.ai_summary}"</p>

                  {isIncrease ? (
                    <ArrowUpRight className="absolute -bottom-4 -right-4 w-32 h-32 opacity-[0.03] rotate-12" />
                  ) : (
                    <ArrowDownRight className="absolute -bottom-4 -right-4 w-32 h-32 opacity-[0.03] rotate-12" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyReports;

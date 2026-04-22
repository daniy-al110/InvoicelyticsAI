import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Activity,
  AlertCircle,
  CloudUpload,
  ArrowUpRight,
  TrendingUp,
  Target,
  Users
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import DocumentUpload from '../components/DocumentUpload';

const Dashboard = ({ stats, recentDocs, fetchDocumentDetail, handleUploadComplete, token }) => {
  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

  return (
    <div className="page-container">
      <div className="hero-header">
        <div className="hero-header-content">
          <div className="hero-header-icon">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div className="hero-header-title">
            <h1>Intelligence Dashboard</h1>
            <p className="text-[9px]">Financial overview & anomaly detection</p>
          </div>
        </div>
        <div className="hero-header-badge-container">
          <div className="hero-header-badge">
            <Sparkles className="w-4 h-4" /> Live Intelligence
          </div>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card group hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 rounded-[16px] text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100 tracking-tight">System Healthy</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter">{stats.totalDocs}</div>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2 focus-within:">Total Documents</p>
        </div>

        <div className="metric-card group hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-[16px] text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100 tracking-tight">High Precision</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter">{stats.confidence}</div>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2">AI Confidence Avg</p>
        </div>

        <div className="metric-card group hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 rounded-[16px] text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full border border-orange-100 tracking-tight">Priority Check</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter">{stats.needsReview}</div>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2">Action Required</p>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Spending Trend Chart */}
        <div className="md:col-span-8 bg-white border border-slate-100 rounded-[28px] p-6 shadow-xl shadow-slate-200/40">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Spending Trend</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Aggregate Analysis (30D)</p>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-black">+8.4%</span>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.spending_trend || []}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Breakdown */}
        <div className="md:col-span-4 bg-white border border-slate-100 rounded-[28px] p-6 shadow-xl shadow-slate-200/40">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Top Vendors</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Share by volume</p>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.vendor_stats || []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                  {(stats.vendor_stats || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-gradient-to-br from-indigo-600/5 to-primary/5 border border-indigo-100 rounded-[28px] p-8 flex flex-col items-center justify-center text-center shadow-inner group relative overflow-hidden">
        <div className="absolute inset-0 bg-white/20 backdrop-blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="w-20 h-20 bg-white rounded-[24px] shadow-2xl shadow-indigo-200/50 flex items-center justify-center mb-6 relative z-10 group-hover:-translate-y-2 transition-transform duration-500">
          <CloudUpload className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-1 relative z-10">Data Ingestion Hub</h2>
        <p className="text-slate-500 max-w-sm mb-8 font-bold relative z-10 text-[11px]">Securely tunnel financial documents into the Invoicelytics AI pipeline.</p>
        <div className="relative z-10 w-full max-w-md">
          <DocumentUpload onUploadComplete={handleUploadComplete} token={token} />
        </div>
      </div>

      {/* Recent Records */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Users className="w-4 h-4" /></div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto bg-white rounded-[28px] border border-slate-50 shadow-sm p-2">
          <table className="activity-table">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
                <th className="text-left px-5 pb-5">Document Name</th>
                <th className="text-left px-5 pb-5">Processing Date</th>
                <th className="text-left px-5 pb-5">Current Status</th>
                <th className="text-left px-5 pb-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(recentDocs || []).map((doc, idx) => (
                <tr key={doc.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td>
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-50/50 rounded-[14px] text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="font-black text-slate-800 tracking-tight">{doc?.filename || 'Untitled Record'}</span>
                    </div>
                  </td>
                  <td className="text-slate-500 font-bold text-xs uppercase tracking-tighter">
                    {doc?.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-wider border border-emerald-100">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      In Sync
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => fetchDocumentDetail(doc.id)}
                      className="p-2 hover:bg-white rounded-xl hover:shadow-md transition-all text-slate-400 hover:text-indigo-600"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

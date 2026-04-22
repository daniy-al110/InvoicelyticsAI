import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { 
  BarChart3, 
  BrainCircuit, 
  CloudUpload, 
  Columns, 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Activity,
  User,
  Bell,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Plus,
  Search,
  TrendingUp,
  Database,
  ChevronRight,
  Sparkles,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import DocumentViewer from './components/DocumentViewer';
import AIInsightsPanel from './components/AIInsightsPanel';
import ChatInterface from './pages/ChatPage';
import DocumentHistory from './components/DocumentHistory';
import DocumentComparison from './pages/DocumentComparison';
import ExtractionReview from './pages/ExtractionReview';
import ProfilePage from './pages/ProfilePage';
import ExcelSyncPage from './pages/ExcelSyncPage';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import MonthlyReports from './pages/MonthlyReports';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './context/AuthContext';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);

  const [stats, setStats] = useState({
    totalDocs: '...',
    confidence: '...',
    needsReview: '...'
  });

  const { user, token, loading: authLoading, logout } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(240); // Matches CSS .sidebar width
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const fetchRecentDocs = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const docs = Array.isArray(data) ? data : (data.documents || []);
      setDocuments(docs);
      setRecentDocs(docs.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats({
        totalDocs: data.total_docs.toLocaleString(),
        confidence: data.avg_confidence > 0 ? `${data.avg_confidence}%` : 'N/A',
        needsReview: data.needs_review.toString(),
        spending_trend: data.spending_trend || [],
        vendor_stats: data.vendor_stats || []
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchRecentDocs();
      fetchStats();
    }
  }, [user, token, fetchRecentDocs, fetchStats]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 20; 
      if (newWidth > 200 && newWidth < 600) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  const handleUploadComplete = async (data) => {
    await fetchRecentDocs();
    fetchStats();
    const newDocId = data?.id || data?.document_id;
    if (newDocId) {
      await fetchDocumentDetail(newDocId);
    } else {
      navigate('/extraction');
    }
  };

  const fetchDocumentDetail = async (id, shouldNavigate = true) => {
    if (!id) {
      setCurrentDocument(null);
      setStructuredData(null);
      setInsights([]);
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!data || !data.document) return;
      setCurrentDocument(data.document);
      setStructuredData(data.document.structured_data || null);
      setInsights(data.document.insights || []);
      
      if (shouldNavigate) navigate('/extraction');

      const hasStructuredData = data.document.structured_data && Object.keys(data.document.structured_data).length > 0;
      if (!hasStructuredData) {
         const currentSettings = JSON.parse(localStorage.getItem('invoicelyticsSettings') || '{}');
         if (currentSettings.autoExtract) {
            handleExtract(data.document.id);
         }
      }
    } catch (err) {
      console.error('Failed to fetch detail:', err);
    }
  };

  const toggleComparison = (id) => {
    setComparisonIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveDocument = async (updatedData) => {
    if (!currentDocument) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${currentDocument.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ structured_data: updatedData })
      });
      if (response.ok) {
        setStructuredData(updatedData);
        navigate('/extraction');
      }
    } catch (err) {
      console.error('Failed to save document:', err);
    }
  };

  const handleExtract = async (targetId = null) => {
    const idToExtract = targetId || currentDocument?.id;
    if (!idToExtract || extracting) return;
    setExtracting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${idToExtract}/extract`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStructuredData(data.structured_data);
        setInsights(data.insights || []);
      }
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setExtracting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center animate-bounce shadow-2xl shadow-primary/40">
        <BrainCircuit className="text-white w-8 h-8" />
      </div>
      <div className="text-white/40 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Syncing Cryptographic Identity...</div>
    </div>
  );

  const isActive = (path) => location.pathname === path;

  return (
    <Routes>
      <Route path="/login" element={<Auth initialIsLogin={true} />} />
      <Route path="/signup" element={<Auth initialIsLogin={false} />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="dashboard-layout">
            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
              <div className="sidebar-overlay md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}
            
            <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
                    <BrainCircuit className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tighter text-white leading-none flex items-center gap-1">
                      Invoicelytics<span className="text-primary">AI</span>
                    </h1>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">Intelligence</p>
                  </div>
                </div>
                {/* Mobile Close Button */}
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 space-y-2">
                <div className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>Dashboard</span>
                </div>
                <div className={`nav-link ${isActive('/extraction') ? 'active' : ''}`} onClick={() => navigate('/extraction')}>
                  <FileText className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>Documents</span>
                </div>
                <div className={`nav-link ${isActive('/review') ? 'active' : ''}`} onClick={() => navigate('/review')}>
                  <ShieldCheck className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>Extraction</span>
                </div>
                <div className={`nav-link ${isActive('/comparison') ? 'active' : ''}`} onClick={() => navigate('/comparison')}>
                  <Columns className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>Comparison</span>
                </div>
                <div className={`nav-link ${isActive('/chat') ? 'active' : ''}`} onClick={() => navigate('/chat')}>
                  <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>AI Chat</span>
                </div>
                <div className={`nav-link ${isActive('/reports') ? 'active' : ''}`} onClick={() => navigate('/reports')}>
                  <TrendingUp className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>Reports</span>
                </div>
                <div className={`nav-link ${isActive('/excel-sync') ? 'active' : ''}`} onClick={() => navigate('/excel-sync')}>
                  <Database className="w-5 h-5 transition-transform group-hover:scale-110" /> <span>Excel Sync</span>
                </div>
              </nav>
              <div className="mt-auto pt-3 border-t border-white/5 space-y-3">
                <div className="p-3 bg-white/5 rounded-[20px] border border-white/5 transition-all hover:bg-white/10 group cursor-pointer" onClick={() => navigate('/profile')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center border border-primary/20 shadow-sm">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-white truncate max-w-[120px]">{user?.full_name || 'User Profile'}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Active Plan</p>
                        </div>
                      </div>
                      <LogOut 
                        className="w-4 h-4 text-slate-500 hover:text-red-400 transition-colors cursor-pointer" 
                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                      />
                    </div>
                </div>
              </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{height: '100vh'}}>
              <header className="header-glass h-12">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Hamburger Menu Toggle (Mobile/Tablet) */}
                  <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden p-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 shadow-sm shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  {/* Search box removed per user request */}
                </div>
                <div className="flex items-center gap-3 lg:gap-6 shrink-0">
                  {location.pathname !== '/dashboard' && (
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-600 text-white rounded-xl font-black text-xs shadow-lg shadow-primary/25 hover:scale-[1.03] transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" /> New Document
                    </button>
                  )}

                  <div className="relative group shrink-0">
                    <Bell className="w-5 h-5 text-slate-400 cursor-pointer group-hover:text-primary transition-colors" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-white" />
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-sm group cursor-pointer hover:bg-primary/20 transition-all shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </header>

              <div className="content-surface custom-scrollbar flex-1">
                <Routes>
                  <Route path="/dashboard" element={
                    <Dashboard 
                      stats={stats} 
                      recentDocs={recentDocs} 
                      fetchDocumentDetail={fetchDocumentDetail} 
                      handleUploadComplete={handleUploadComplete} 
                      token={token} 
                    />
                  } />
                  <Route path="/extraction" element={
                    <div className="page-container flex-1 flex flex-col relative overflow-hidden">
                      {/* Sidebar Toggle Button (Desktop Only) */}
                      <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-8 h-8 bg-white border border-slate-100 rounded-full shadow-lg items-center justify-center hover:bg-primary hover:text-white transition-all group"
                        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`} />
                      </button>

                      <div className="hero-header">
                        <div className="hero-header-content">
                          <div className="hero-header-icon">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div className="hero-header-title">
                            <h1>Document Intelligence</h1>
                            <p className="hidden sm:block">Extraction & Lifecycle Analysis</p>
                          </div>
                        </div>
                        <div className="hero-header-badge-container desktop-only">
                          <button 
                            onClick={handleExtract}
                            disabled={!currentDocument || extracting}
                            className={`hero-header-badge font-bold transition-all shadow-lg ${extracting ? 'bg-primary/50 text-white cursor-not-allowed' : 'bg-primary text-white hover:scale-105 active:scale-95'}`}
                          >
                            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} 
                            {extracting ? 'Extracting...' : 'Initialize Intelligence'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0 gap-6">
                        {/* Sidebar */}
                        <div 
                          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
                          className={`hidden md:flex flex-shrink-0 h-full overflow-hidden flex-col transition-all duration-300 ease-in-out ${!isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                          <DocumentHistory 
                            documents={documents}
                            activeId={currentDocument?.id} 
                            onSelect={fetchDocumentDetail} 
                            token={token}
                          />
                        </div>

                        {/* Resizer Handle (Desktop Only) */}
                        {isSidebarOpen && (
                          <div 
                            onMouseDown={() => setIsResizing(true)}
                            className="hidden lg:block w-1 hover:w-1.5 bg-slate-100/50 hover:bg-primary/20 cursor-col-resize transition-all rounded-full h-1/2 self-center active:bg-primary/40"
                          />
                        )}

                        <div className="flex-1 h-full overflow-hidden min-h-[500px]">
                           <div className="bg-white rounded-[32px] p-4 lg:p-8 border border-slate-100 shadow-sm h-full overflow-y-auto custom-scrollbar">
                            {currentDocument ? (
                              <DocumentViewer extractedText={currentDocument.extracted_text} filename={currentDocument.filename} metadata={currentDocument.metadata} />
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <FileText className="w-20 h-20 mb-6 text-slate-300" />
                                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Select a document to begin analysis</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Insights Right Panel (Desktop Only) */}
                        <div className="hidden xl:block h-[40vh] lg:h-full overflow-hidden">
                          <AIInsightsPanel insights={insights} />
                        </div>
                      </div>
                    </div>
                  } />
                  <Route path="/dashboard" element={<Dashboard stats={stats} recentDocs={recentDocs} fetchDocumentDetail={fetchDocumentDetail} handleUploadComplete={fetchRecentDocs} token={token} />} />
                  <Route path="/review" element={
                    <ExtractionReview 
                      data={structuredData} 
                      documentId={currentDocument?.id}
                      extractedText={currentDocument?.extracted_text}
                      filename={currentDocument?.filename} 
                      onSave={handleSaveDocument} 
                      onCancel={() => navigate('/dashboard')} 
                      token={token} 
                    />
                  } />
                  <Route path="/comparison" element={<DocumentComparison documents={documents} selectedIds={comparisonIds} onUpdateIds={setComparisonIds} onClear={() => { navigate('/extraction'); setComparisonIds([]); }} token={token} />} />
                  <Route path="/chat" element={
                    <div className="page-container flex-1 flex flex-col relative overflow-hidden">
                      <ChatInterface 
                        documentId={currentDocument?.id} 
                        documentText={currentDocument?.extracted_text} 
                        documents={documents}
                        onSelectDocument={(id) => fetchDocumentDetail(id, false)}
                        token={token} 
                      />
                    </div>
                  } />
                  <Route path="/excel-sync" element={<ExcelSyncPage token={token} documents={documents} />} />
                  <Route path="/reports" element={<MonthlyReports token={token} />} />
                  <Route path="/profile" element={<ProfilePage user={user} stats={stats} token={token} />} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </div>
            </main>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;

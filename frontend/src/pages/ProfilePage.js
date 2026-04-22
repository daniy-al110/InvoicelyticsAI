import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, 
  Mail, 
  Database, 
  Activity, 
  Clock, 
  Settings, 
  Moon, 
  Sun,
  Shield, 
  ToggleRight, 
  ToggleLeft,
  ChevronRight,
  Brain,
  Zap,
  Lock,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Edit2,
  Check,
  X,
  Loader2,
  Phone,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
  KeyRound
} from 'lucide-react';

const ProfilePage = ({ user, stats, token }) => {
  // ─── Editable Profile State ──────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'User'
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  // Sync state if user prop changes
  useEffect(() => {
    if (user) {
      setProfileFormData({
        name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'User'
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    // Validate
    if (!profileFormData.name.trim()) {
      setProfileMsg({ type: 'error', text: 'Name cannot be empty' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileFormData.email)) {
      setProfileMsg({ type: 'error', text: 'Invalid email format' });
      return;
    }
    
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/update-profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(profileFormData)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Failed to update profile');
      
      setProfileMsg({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileMsg(null);
      }, 1500);
      
      // We optionally trigger a generic App re-fetch of user if App supports it, 
      // but modifying local state gives instant feedback.
      if (user) {
        user.full_name = data.user.full_name;
        user.email = data.user.email;
        user.role = data.user.role;
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── AI Preferences State ──────────────────────────────────────────
  const [preferences, setPreferences] = useState({
    auto_extraction: false,
    persona: "Analyst"
  });

  useEffect(() => {
    if (!token) return;
    const fetchPreferences = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPreferences({
            auto_extraction: data.auto_extraction,
            persona: data.persona
          });
        }
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
      }
    };
    fetchPreferences();
  }, [token]);

  const handlePreferenceChange = async (key, value) => {
    // Optimistic UI update
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/preferences`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newPrefs)
      });
    } catch (err) {
      console.error("Failed to update preferences:", err);
    }
  };

  // ─── Password Change State ──────────────────────────────────────────
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handlePasswordSubmit = async () => {
    const hasUpper = /[A-Z]/.test(passwordForm.new);
    const hasNumber = /[0-9]/.test(passwordForm.new);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.new);

    if (passwordForm.new.length < 8 || !hasUpper || !hasNumber || !hasSpecial) {
      setPasswordMsg({ 
        type: 'error', 
        text: 'Password must be 8+ chars with Uppercase, Number, and Special character.' 
      });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSavingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.new
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');
      
      setPasswordMsg({ type: 'success', text: 'Password updated!' });
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => {
        setPasswordMsg(null);
        setIsChangingPwd(false);
      }, 2000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ─── Real-Time Quota State ──────────────────────────────────────────
  // ─── 2FA WhatsApp State ─────────────────────────────────────────────
  const [twoFaStatus, setTwoFaStatus] = useState({ enabled: false, phone: null });
  const [twoFaStep, setTwoFaStep] = useState('idle'); // idle | phone_input | code_sent | verifying | enabled
  const [twoFaPhone, setTwoFaPhone] = useState(user?.phone || '');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaMsg, setTwoFaMsg] = useState(null);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  const [twoFaCountdown, setTwoFaCountdown] = useState(0);

  const [isChangingPhone, setIsChangingPhone] = useState(false);

  useEffect(() => {
    if (user?.phone && !twoFaPhone && !isChangingPhone) {
      setTwoFaPhone(user.phone);
    }
  }, [user?.phone, twoFaPhone, isChangingPhone]);

  // Fetch 2FA status on mount
  useEffect(() => {
    if (!token) return;
    const fetch2faStatus = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/2fa/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTwoFaStatus(data);
          if (data.enabled) {
            setTwoFaStep('enabled');
            setTwoFaPhone(data.phone || '');
          }
        }
      } catch (err) {
        console.error("Failed to fetch 2FA status:", err);
      }
    };
    fetch2faStatus();
  }, [token]);

  // Countdown timer for resend
  useEffect(() => {
    if (twoFaCountdown <= 0) return;
    const timer = setTimeout(() => setTwoFaCountdown(twoFaCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [twoFaCountdown]);

  const handleSendCode = async () => {
    if (!twoFaPhone.trim() || twoFaPhone.length < 8) {
      setTwoFaMsg({ type: 'error', text: 'Enter a valid phone number with country code' });
      return;
    }
    setTwoFaLoading(true);
    setTwoFaMsg(null);
    setDevOtp(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/2fa/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone: twoFaPhone.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send code');
      
      setTwoFaStep('code_sent');
      setTwoFaCountdown(60);
      setTwoFaMsg({ type: 'success', text: 'Code sent! Check your WhatsApp.' });
      if (data.dev_otp) setDevOtp(data.dev_otp);
    } catch (err) {
      setTwoFaMsg({ type: 'error', text: err.message });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!twoFaCode.trim() || twoFaCode.length < 6) {
      setTwoFaMsg({ type: 'error', text: 'Enter the 6-digit code' });
      return;
    }
    setTwoFaLoading(true);
    setTwoFaMsg(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/2fa/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone: twoFaPhone.trim(), code: twoFaCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification failed');

      setTwoFaStep('enabled');
      setTwoFaStatus({ enabled: true, phone: twoFaPhone });
      setTwoFaMsg(null);
      setDevOtp(null);
      setTwoFaCode('');
    } catch (err) {
      setTwoFaMsg({ type: 'error', text: err.message });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    setTwoFaLoading(true);
    setTwoFaMsg(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/2fa/disable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to disable 2FA');
      setTwoFaStatus({ enabled: false, phone: null });
      setTwoFaStep('idle');
      setTwoFaPhone('');
      setTwoFaCode('');
      setDevOtp(null);
    } catch (err) {
      setTwoFaMsg({ type: 'error', text: err.message });
    } finally {
      setTwoFaLoading(false);
    }
  };


  const [quotaData, setQuotaData] = useState({
    quota_used: 0,
    quota_limit: 0,
    percentage: 0,
    estimated_time_saved: "",
    active_model: "",
    status: "healthy",
    reset_date: ""
  });
  
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);
  const previousDataRef = useRef(null);

  // ─── Fetch Quota Data ───────────────────────────────────────────────
  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/quota-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      // Trigger smooth transition animation
      if (previousDataRef.current && 
          (previousDataRef.current.quota_used !== data.quota_used ||
           previousDataRef.current.percentage !== data.percentage)) {
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 700);
      }
      
      previousDataRef.current = data;
      setQuotaData(data);
      setLastUpdated(new Date());
      setFetchError(false);
      
    } catch (err) {
      console.error('Quota fetch failed:', err);
      setFetchError(true);
      
      // Keep last known state, but mark status as down
      setQuotaData(prev => ({ ...prev, status: "down" }));
    }
  }, [token]);

  // ─── Polling Effect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    
    // Initial fetch
    fetchQuota();
    
    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchQuota, 30000);
    
    // Cleanup: prevent memory leaks
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchQuota, token]);

  // ─── Status Helpers ─────────────────────────────────────────────────
  const getStatusColor = (status) => {
    if (status === "healthy") return "bg-green-500";
    if (status === "degraded") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusBg = (status) => {
    if (status === "healthy") return "bg-green-50 border-green-200";
    if (status === "degraded") return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getStatusText = (status) => {
    if (status === "healthy") return "text-green-600";
    if (status === "degraded") return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusLabel = (status) => {
    if (status === "healthy") return "API Healthy";
    if (status === "degraded") return "API Degraded";
    return "API Down";
  };

  const getStatusIcon = (status) => {
    if (status === "healthy") return <Wifi className="w-3.5 h-3.5" />;
    if (status === "degraded") return <AlertTriangle className="w-3.5 h-3.5" />;
    return <WifiOff className="w-3.5 h-3.5" />;
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return "from-red-500 to-red-400";
    if (percentage >= 70) return "from-amber-500 to-orange-400";
    return "from-primary to-indigo-400";
  };

  const formatTimeAgo = (date) => {
    if (!date) return "Never";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Keep "last updated" label ticking
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page-container flex flex-col p-4 lg:p-6 overflow-y-auto custom-scrollbar">
      <div className="w-full flex flex-col py-6">
        <div className="hero-header mb-6 shrink-0">
          <div className="hero-header-content">
            <div className="hero-header-icon bg-primary"><User className="w-5 h-5 text-white" /></div>
            <div className="hero-header-title">
              <h1>User Identity</h1>
              <p>Profile & Security Management</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Identity & Settings */}
          <div className="md:col-span-1 space-y-6">
          
            {/* Main User Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all z-10"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-4 border-white shadow-xl mb-6 relative">
                  <User className="w-10 h-10 text-primary" />
                  <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white transition-colors duration-500 ${getStatusColor(quotaData.status)}`}></div>
                </div>

                {isEditingProfile ? (
                  <div className="w-full flex flex-col gap-3">
                    {profileMsg && (
                      <div className={`text-xs font-bold p-2 rounded-lg ${profileMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {profileMsg.text}
                      </div>
                    )}
                    <input 
                      type="text" 
                      value={profileFormData.name}
                      onChange={e => setProfileFormData({...profileFormData, name: e.target.value})}
                      className="w-full text-center font-black text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Full Name"
                    />
                    <select
                      value={profileFormData.role}
                      onChange={e => setProfileFormData({...profileFormData, role: e.target.value})}
                      className="w-full text-center text-sm font-bold text-primary uppercase tracking-widest border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="User">User</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </div>
                      <input 
                        type="email" 
                        value={profileFormData.email}
                        onChange={e => setProfileFormData({...profileFormData, email: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-full focus:outline-none focus:border-primary text-center"
                        placeholder="Email Address"
                      />
                    </div>
                    
                    <div className="flex gap-2 mt-2 w-full">
                      <button 
                        onClick={() => { setIsEditingProfile(false); setProfileMsg(null); }}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors flex justify-center items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button 
                        onClick={handleProfileSave}
                        disabled={isSavingProfile}
                        className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-600 transition-colors flex justify-center items-center gap-1 shadow-md shadow-primary/20"
                      >
                        {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.full_name || 'Invoicelytics Admin'}</h2>
                    <p className="text-sm font-bold text-primary uppercase tracking-widest mt-1 mb-4">{user?.role || 'User'}</p>
                    
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 w-full justify-center">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-bold text-slate-600 truncate">{user?.email || 'admin@invoicelytics.ai'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI Preferences */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2 mb-6">
                <Brain className="w-4 h-4 text-primary" /> AI Preferences
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Auto-Extraction</p>
                    <p className="text-xs text-slate-500 mt-1">Run AI when document uploads</p>
                  </div>
                  <button onClick={() => handlePreferenceChange('auto_extraction', !preferences.auto_extraction)}>
                    {preferences.auto_extraction ? <ToggleRight className="w-10 h-10 text-green-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                  </button>
                </div>

                <div className="w-full h-px bg-slate-100"></div>

                <div>
                  <p className="text-sm font-bold text-slate-800 mb-3">Extraction Persona</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={preferences.persona}
                      onChange={(e) => handlePreferenceChange('persona', e.target.value)}
                      className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none custom-select"
                    >
                      <option value="Analyst">Analyst</option>
                      <option value="Auditor">Auditor</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Determines AI detail depth and focus.</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Quota & Security */}
          <div className="md:col-span-2 space-y-6">
            
            {/* API Quota Dashboard — LIVE */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
              
              <div className="relative z-10">
                {/* Header with Live Status */}
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" /> API Quota & Usage
                    <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal ml-2 flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                      Live · {formatTimeAgo(lastUpdated)}
                    </span>
                  </h3>
                  
                  {/* Health Indicator */}
                  <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all duration-500 ${getStatusBg(quotaData.status)}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(quotaData.status)} ${quotaData.status === 'healthy' ? 'animate-pulse' : ''}`}></span>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-500 ${getStatusText(quotaData.status)}`}>
                      {getStatusIcon(quotaData.status)}
                      {getStatusLabel(quotaData.status)}
                    </span>
                  </div>
                </div>

                {/* Quota Bar Section */}
                <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className={`text-3xl font-black text-slate-900 transition-all duration-700 ease-in-out ${isTransitioning ? 'scale-105' : 'scale-100'}`}>
                        {quotaData.quota_used.toLocaleString()} 
                        <span className="text-lg text-slate-400 font-medium tracking-normal"> / {quotaData.quota_limit.toLocaleString()} docs</span>
                      </h4>
                    </div>
                    <span className={`text-sm font-bold transition-all duration-700 ease-in-out ${
                      quotaData.percentage >= 90 ? 'text-red-500' : 
                      quotaData.percentage >= 70 ? 'text-amber-500' : 'text-primary'
                    }`}>
                      {quotaData.percentage}% Used
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mt-4 relative">
                    {/* Shimmer effect on the track */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    <div 
                      className={`h-full bg-gradient-to-r ${getProgressBarColor(quotaData.percentage)} rounded-full transition-all duration-1000 ease-in-out relative overflow-hidden`}
                      style={{ width: `${quotaData.percentage}%` }}
                    >
                      {/* Inner shimmer on the filled portion */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> Quota resets on {quotaData.reset_date || 'the 1st of next month'}.
                    </p>
                    {quotaData.percentage >= 80 && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {quotaData.percentage >= 95 ? 'Quota Critical' : 'Nearing Limit'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 transition-all duration-500 hover:shadow-md hover:border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-indigo-500" />
                      </div>
                      <span className="text-sm font-bold text-slate-500">Estimated Time Saved</span>
                    </div>
                    <p className={`text-2xl font-black text-slate-900 transition-all duration-700 ease-in-out ${isTransitioning ? 'opacity-70' : 'opacity-100'}`}>
                      {quotaData.estimated_time_saved || '0 minutes'}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 transition-all duration-500 hover:shadow-md hover:border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-amber-500" />
                      </div>
                      <span className="text-sm font-bold text-slate-500">Intelligent Provider Pool</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      {quotaData.active_model || 'Detecting...'}
                    </p>
                    <p className="text-[10px] font-black text-primary mt-1 uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" /> {quotaData.pool_info || 'High Availability Active'}
                    </p>
                  </div>

                </div>

                {/* Error Banner */}
                {fetchError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fadeIn">
                    <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-700">Connection issue — showing last known data</p>
                      <p className="text-[10px] text-red-500 mt-0.5">Auto-retry in 30s</p>
                    </div>
                    <button 
                      onClick={fetchQuota}
                      className="text-[10px] font-black uppercase tracking-wider text-red-600 hover:text-red-800 bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Retry Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Security */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2 mb-6">
                  <Shield className="w-4 h-4 text-primary" /> Security
                </h3>
                
                <div className="space-y-4">
                  {user?.has_password !== false && (
                    <>
                      {!isChangingPwd ? (
                        <button 
                          onClick={() => setIsChangingPwd(true)}
                          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Lock className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-bold text-slate-800">Change Password</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                        </button>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                          {passwordMsg && (
                            <div className={`text-xs font-bold p-2 text-center rounded-lg ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {passwordMsg.text}
                            </div>
                          )}
                          <input
                            type="password"
                            placeholder="Current Password"
                            value={passwordForm.current}
                            onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                            className="w-full px-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                          />
                          <input
                            type="password"
                            placeholder="New Password (min 8 chars)"
                            value={passwordForm.new}
                            onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                            className="w-full px-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                          />
                          <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={passwordForm.confirm}
                            onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                            className="w-full px-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                          />

                          <div className="bg-white/40 p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-inner">
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Complexity Required</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {[
                                { label: '8+ Characters', met: passwordForm.new.length >= 8 },
                                { label: 'Uppercase Letter', met: /[A-Z]/.test(passwordForm.new) },
                                { label: 'Special Character', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.new) },
                                { label: 'Numbers (0-9)', met: /[0-9]/.test(passwordForm.new) }
                              ].map((req, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <div className={`w-2.5 h-2.5 rounded-full border ${req.met ? 'bg-primary border-primary' : 'border-slate-300'} flex items-center justify-center transition-colors`}>
                                    {req.met && <Check className="w-2 h-2 text-white" />}
                                  </div>
                                  <span className={`text-[9px] font-bold ${req.met ? 'text-slate-700' : 'text-slate-400'}`}>{req.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-1">
                             <button 
                               onClick={() => {setIsChangingPwd(false); setPasswordMsg(null); setPasswordForm({ current: '', new: '', confirm: '' });}}
                               className="flex-1 py-2 text-xs font-bold text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50"
                             >
                               Cancel
                             </button>
                             <button 
                               onClick={handlePasswordSubmit}
                               disabled={isSavingPassword || !passwordForm.current || !passwordForm.new || !passwordForm.confirm || passwordForm.new.length < 8 || !/[A-Z]/.test(passwordForm.new) || !/[0-9]/.test(passwordForm.new) || !/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.new)}
                               className="flex-1 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-black disabled:opacity-70 flex justify-center items-center gap-2"
                             >
                               {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Securely'}
                             </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* WhatsApp 2FA Configuration UI */}
                  <div className="mt-4 border-t border-slate-100 pt-6">
                    {twoFaStep === 'idle' && !twoFaStatus.enabled && (
                      <button 
                        onClick={() => setTwoFaStep('phone_input')}
                        className="w-full flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 rounded-2xl border border-primary/10 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black text-slate-800">Enable 2FA</p>
                            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Secure via WhatsApp</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    )}

                    {twoFaStep === 'phone_input' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-1">
                          <MessageCircle className="w-5 h-5 text-green-500" />
                          <h4 className="text-sm font-black text-slate-800">Verify Identity</h4>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Phone className="w-4 h-4 text-slate-500" />
                          </div>
                          <input
                            type="text"
                            placeholder="+92 300 1234567"
                            value={twoFaPhone}
                            onChange={e => setTwoFaPhone(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 text-sm font-black text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                          />
                        </div>

                        {twoFaMsg && <p className={`text-[10px] font-bold px-1 ${twoFaMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{twoFaMsg.text}</p>}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setTwoFaStep('idle')}
                            className="flex-1 py-2.5 text-xs font-black text-slate-500 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSendCode}
                            disabled={twoFaLoading || !twoFaPhone.trim()}
                            className="flex-[2] py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50"
                          >
                            {twoFaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Code'}
                          </button>
                        </div>
                      </div>
                    )}

                    {twoFaStep === 'code_sent' && (
                      <div className="bg-white border-2 border-primary/20 rounded-2xl p-5 space-y-4 animate-fadeIn shadow-xl shadow-primary/5">
                        <div className="text-center space-y-1">
                          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                            <KeyRound className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-black text-slate-800">Verify Identity</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code sent to {twoFaPhone}</p>
                        </div>
                        
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={twoFaCode}
                          onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full py-4 text-2xl font-black text-center tracking-[0.5em] text-primary bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                        />

                        {twoFaMsg && <p className={`text-[10px] font-bold text-center ${twoFaMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{twoFaMsg.text}</p>}

                        <div className="flex gap-2">
                          <button 
                            onClick={() => setTwoFaStep('phone_input')}
                            className="flex-1 py-3 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            Back
                          </button>
                          <button 
                            onClick={handleVerifyCode}
                            disabled={twoFaLoading || twoFaCode.length < 6}
                            className="flex-[2] py-3 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30 disabled:opacity-50"
                          >
                            {twoFaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                          </button>
                        </div>

                        <button 
                          disabled={twoFaCountdown > 0}
                          onClick={handleSendCode}
                          className="w-full text-[10px] font-black text-slate-400 hover:text-primary transition-colors disabled:opacity-50 uppercase tracking-widest"
                        >
                          {twoFaCountdown > 0 ? `Resend in ${twoFaCountdown}s` : 'Resend Code'}
                        </button>
                      </div>
                    )}

                    {twoFaStatus.enabled && (twoFaStep === 'enabled' || twoFaStep === 'idle') && (
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-5 space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">2FA Active</p>
                              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{twoFaStatus.phone}</p>
                            </div>
                          </div>
                          <div className="px-2 py-1 bg-green-500 text-[8px] font-black text-white rounded uppercase tracking-tighter shadow-sm animate-pulse">Protected</div>
                        </div>

                        <button 
                          onClick={handleDisable2fa}
                          disabled={twoFaLoading}
                          className="w-full py-2.5 text-[10px] font-black text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition-all uppercase tracking-widest disabled:opacity-50"
                        >
                          {twoFaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Disable Two-Factor Auth'}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  BrainCircuit, 
  Github, 
  Chrome,
  ShieldCheck,
  Loader2,
  KeyRound,
  Phone,
  MessageCircle,
  ArrowLeft,
  Zap,
  Check
} from 'lucide-react';

const Auth = ({ initialIsLogin = true }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [onboarding, setOnboarding] = useState(false); // For Google users missing phone
  const [resetPhone, setResetPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devResetLink, setDevResetLink] = useState(null);

  const { login, signup, googleLogin, user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    setIsLogin(initialIsLogin);
    setForgotPassword(false);
    setOnboarding(false);
  }, [initialIsLogin]);

  useEffect(() => {
    if (user && !onboarding) {
       // If user is logged in via Google but has no phone set in profile, trigger onboarding
       if (!user.phone && !user.two_factor_phone) {
         setOnboarding(true);
       } else {
         navigate(from, { replace: true });
       }
    }
  }, [user, navigate, from, onboarding]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin) {
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (password.length < 8 || !hasUpper || !hasNumber || !hasSpecial) {
        setError('Password must be 8+ chars with Uppercase, Number, and Special character.');
        return;
      }

      if (!phone.trim() || phone.length < 8) {
        setError('Please enter a valid WhatsApp number.');
        return;
      }
    }

    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, fullName, phone);
      }

      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim() || phone.length < 8) {
      setError('Please enter a valid WhatsApp number.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/phone`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        window.location.reload(); 
      } else {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to save phone');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError('');
    setResetMsg(null);
    setDevResetLink(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send reset link');
      
      setResetMsg({ type: 'success', text: data.message });
      if (data.dev_link) setDevResetLink(data.dev_link);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    const result = await googleLogin(credentialResponse.credential);
    if (!result.success) {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden text-white">
      {/* Background elements omitted for brevity */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative z-10">
        
        {/* Left Side: Branding & Features */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary-500/10 to-transparent border-r border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 rotate-3">
                <BrainCircuit className="text-white w-7 h-7" />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">Invoicelytics<span className="text-primary-500">AI</span></span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-8 italic">
              {onboarding ? 'One More Step.' : 'Enterprise Intelligence.'}
            </h2>
            {onboarding && (
               <p className="text-slate-400 text-sm font-medium leading-relaxed">
                 We need your WhatsApp number to secure your account and enable AI variance reports.
               </p>
            )}
          </div>
          <div className="pt-8 border-t border-white/5">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">SECURE DOCUMENT ANALYSIS ENGINE</p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-10 lg:p-16 flex flex-col justify-center">
          {onboarding ? (
             <div className="animate-fadeIn">
                <div className="mb-8">
                  <h1 className="text-3xl font-black mb-2 tracking-tight">Setup Security</h1>
                  <p className="text-slate-400 font-bold text-sm">Register your WhatsApp for 2FA & Recovery.</p>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">WhatsApp Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                      <input
                        type="text" required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                        placeholder="+92 300 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase p-4 rounded-xl text-center">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={isLoading}
                    className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => { logout(); setOnboarding(false); }}
                    className="w-full text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest text-center"
                  >
                    Cancel & Sign Out
                  </button>
                </form>
             </div>
          ) : !forgotPassword ? (
            <>
              <div className="mb-8 text-center lg:text-left">
                <h1 className="text-3xl font-black mb-2 tracking-tight">
                  {isLogin ? 'Welcome Back' : 'Join the Platform'}
                </h1>
                <p className="text-slate-400 font-bold text-sm tracking-tight">
                  {isLogin ? 'Access your intelligence dashboard.' : 'Start your journey with Invoicelytics AI.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text" required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-700"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email" required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-700"
                      placeholder="admin@company.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">WhatsApp Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text" required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-700"
                        placeholder="+92 300 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 group">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Password</label>
                    {isLogin && (
                      <button 
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-[10px] font-black text-primary hover:text-primary-400 transition-colors uppercase tracking-widest"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password" required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-700"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {!isLogin && (
                   <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 space-y-2">
                     <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Security Requirements</p>
                     <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: '8+ Characters', met: password.length >= 8 },
                          { label: 'Uppercase', met: /[A-Z]/.test(password) },
                          { label: 'Special Char', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
                          { label: 'Number', met: /[0-9]/.test(password) }
                        ].map((req, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full border ${req.met ? 'bg-green-500 border-green-500' : 'border-slate-700'} flex items-center justify-center transition-colors`}>
                              {req.met && <Check className="w-2 h-2 text-white" />}
                            </div>
                            <span className={`text-[10px] font-bold ${req.met ? 'text-slate-300' : 'text-slate-600'}`}>{req.label}</span>
                          </div>
                        ))}
                     </div>
                   </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase p-4 rounded-xl text-center tracking-widest leading-none">
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={isLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-[#0F172A] px-4 text-slate-500">Or continue with</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                 <div className="flex justify-center overflow-hidden h-[54px] rounded-2xl">
                   <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google Authentication Failed')}
                      theme="filled_black" shape="pill" width="100%" text="continue_with"
                   />
                 </div>
              </div>

              <p className="mt-8 text-center text-slate-500 text-sm font-bold">
                {isLogin ? "New to the platform?" : "Joined before?"}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-primary-500 ml-2 hover:underline underline-offset-4 font-black italic"
                >
                  {isLogin ? 'Create Workspace' : 'Sign in here'}
                </button>
              </p>
            </>
          ) : (
            <div className="animate-fadeIn">
               <button 
                 onClick={() => setForgotPassword(false)}
                 className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-10 group"
               >
                 <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Workspace
               </button>

               <div className="mb-8">
                 <h1 className="text-3xl font-black mb-2 tracking-tight">Recover Account</h1>
                 <p className="text-slate-400 font-bold text-sm">We'll send a WhatsApp securely to your phone.</p>
               </div>

               <form onSubmit={handleResetRequest} className="space-y-6">
                 <div className="space-y-2 group">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Registered Phone</label>
                   <div className="relative">
                     <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                     <input
                       type="text" required
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                       placeholder="+92 300 1234567"
                       value={resetPhone}
                       onChange={(e) => setResetPhone(e.target.value)}
                     />
                   </div>
                 </div>

                 {resetMsg && (
                   <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase p-4 rounded-xl text-center tracking-widest leading-loose">
                     {resetMsg.text}
                   </div>
                 )}

                 {devResetLink && (
                    <div 
                      onClick={() => window.open(devResetLink, '_blank')}
                      className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-all group"
                    >
                      <p className="text-[10px] font-black text-amber-500 uppercase mb-2 flex justify-between">Developer Link <Zap className="w-3 h-3" /></p>
                      <p className="text-[11px] font-medium text-slate-300 underline underline-offset-4 decoration-amber-500/40">Click here to open the reset page directly</p>
                    </div>
                 )}

                 {error && (
                   <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase p-4 rounded-xl text-center">
                     {error}
                   </div>
                 )}

                 <button
                   type="submit" disabled={isLoading}
                   className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request Reset Link'}
                 </button>
               </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

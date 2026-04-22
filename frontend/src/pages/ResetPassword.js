import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  ArrowLeft, 
  BrainCircuit, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  Loader2,
  Check
} from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (newPassword.length < 8 || !hasUpper || !hasNumber || !hasSpecial) {
      setError('Password must be 8+ chars with Uppercase, Number, and Special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative z-10">
        <div className="p-10 lg:p-12">
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 mb-6">
              <BrainCircuit className="text-white w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Setup New Password</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center">Security Verification Complete</p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Security Requirements</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '8+ Characters', met: newPassword.length >= 8 },
                    { label: 'Uppercase', met: /[A-Z]/.test(newPassword) },
                    { label: 'Special Char', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
                    { label: 'Number', met: /[0-9]/.test(newPassword) }
                  ].map((req, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border ${req.met ? 'bg-primary-500 border-primary-500' : 'border-slate-700'} flex items-center justify-center transition-colors`}>
                        {req.met && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span className={`text-[10px] font-bold ${req.met ? 'text-slate-300' : 'text-slate-600'}`}>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase p-4 rounded-xl text-center tracking-wider">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary-500/20 flex items-center justify-center gap-2 group transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white italic">Password Updated!</h2>
                <p className="text-slate-400 text-sm font-medium">Your credentials have been reset successfully.</p>
              </div>
              <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] animate-pulse">Redirecting to login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

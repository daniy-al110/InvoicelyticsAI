import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center animate-bounce shadow-2xl shadow-primary/40">
          <BrainCircuit className="text-white w-8 h-8" />
        </div>
        <div className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
          Verifying Identity...
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they occupy
    // This allows us to send them back to that page after they login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit } from 'lucide-react';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();


  if (loading) {
    return <LoadingScreen message="Verifying Identity..." />;
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they occupy
    // This allows us to send them back to that page after they login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

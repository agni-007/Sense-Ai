import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Shield, Lock, Mail, AlertTriangle, Cpu } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  // Redirect to dashboard if user is already authenticated
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password,
      });

      const { token, user } = response.data;
      
      // Store auth state
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('🎉 Login successful! Welcome', user.name);
      
      // Navigate to dashboard home
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error || 'Invalid credentials or connection issue.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      
      {/* Background visual art: Glowing abstract shapes */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Main card */}
      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 transition-all duration-300 hover:shadow-brand-500/5 hover:shadow-2xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 mb-4 animate-pulse-fast">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-dark-100 to-dark-300 bg-clip-text text-transparent">
            Cognifyr AI
          </h1>
          <p className="text-dark-400 text-sm mt-1">Workflow Ops Center Portal</p>
        </div>

        {/* Floating Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-200 text-sm animate-shake">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Authentication failed</span>
              <p className="text-red-300/90 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@123.com"
                required
                disabled={loading}
                className="w-full bg-dark-900/50 border border-dark-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
              Security Key Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full bg-dark-900/50 border border-dark-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4 text-white/90 group-hover:rotate-12 transition-transform" />
                <span>Verify Credential Signature</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-dark-900 text-center text-xs text-dark-500 flex justify-center items-center gap-2">
          <span>Secured by JWT & SHA-256 Hashing</span>
        </div>
      </div>
    </div>
  );
};

export default Login;

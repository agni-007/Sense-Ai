import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import LiveIndicator from '../components/LiveIndicator';
import { LogOut, LayoutDashboard, UserCheck, ShieldAlert, Cpu } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { connected } = useSocket(); // Initialize socket client connection globally for layout
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Operator', role: 'AGENT' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🔒 Logged out successfully.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col relative text-dark-100 font-sans">
      
      {/* Background radial highlight glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[300px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />

      {/* Top Navigation Header */}
      <header className="glass sticky top-0 z-40 border-b border-dark-900 px-6 py-4 flex items-center justify-between">
        
        {/* Brand details */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/10">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent group-hover:text-brand-400 transition-colors">
              Sense AI Ops
            </span>
          </Link>
          <LiveIndicator connected={connected} />
        </div>

        {/* User context & logouts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-dark-900/60 border border-dark-900 select-none">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500/20 to-indigo-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              {user.role === 'ADMIN' ? (
                <ShieldAlert className="w-4 h-4 text-brand-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-white leading-none">
                {user.name}
              </div>
              <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mt-0.5">
                {user.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Secure Sign-out"
            className="flex items-center justify-center gap-2 border border-dark-800 bg-dark-900 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 px-4 py-2.5 rounded-xl text-dark-300 transition-all active:scale-[0.97] text-sm font-semibold shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main dashboard content outlet container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10">
        <Outlet />
      </main>

      {/* Subtle footer */}
      <footer className="py-6 text-center text-xs text-dark-600 border-t border-dark-950/40 relative z-10 select-none">
        <span>© {new Date().getFullYear()} Sense AI Workflow Operations System. All rights reserved.</span>
      </footer>
    </div>
  );
};

export default Dashboard;

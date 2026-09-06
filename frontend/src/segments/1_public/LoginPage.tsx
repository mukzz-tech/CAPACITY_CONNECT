import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CloudSun, LogIn, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/courses');
    } else {
      setError(res.error || 'Failed to login');
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
          <CloudSun className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign In to Capacity Connect
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          India Meteorological Department • Ministry of Earth Sciences
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Evaluation Credentials */}
          <div className="mb-6 p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-blue-900 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Evaluator Logins:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillCredentials('admin@imd.gov.in', 'ImdAdmin@2026')}
                className="p-1.5 rounded bg-white hover:bg-blue-100/60 border border-blue-200 text-left font-medium text-slate-700 transition"
              >
                <span className="block font-bold text-purple-700">Admin</span>
                <span className="text-[10px] text-slate-500">admin@imd.gov.in</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('trainer.jenamani@imd.gov.in', 'Password@123')}
                className="p-1.5 rounded bg-white hover:bg-blue-100/60 border border-blue-200 text-left font-medium text-slate-700 transition"
              >
                <span className="block font-bold text-emerald-700">Trainer (Dr. Jenamani)</span>
                <span className="text-[10px] text-slate-500">trainer.jenamani...</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('trainee.rajesh@imd.gov.in', 'Password@123')}
                className="p-1.5 rounded bg-white hover:bg-blue-100/60 border border-blue-200 text-left font-medium text-slate-700 transition"
              >
                <span className="block font-bold text-blue-700">Trainee (Rajesh)</span>
                <span className="text-[10px] text-slate-500">trainee.rajesh...</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('trainee.amit@imd.gov.in', 'Password@123')}
                className="p-1.5 rounded bg-white hover:bg-blue-100/60 border border-blue-200 text-left font-medium text-slate-700 transition"
              >
                <span className="block font-bold text-amber-700">Pending Trainee (Amit)</span>
                <span className="text-[10px] text-slate-500">trainee.amit...</span>
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Official Email ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@imd.gov.in"
                  className="pl-9 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don't have an approved account?{' '}
            <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
              Submit Trainee Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

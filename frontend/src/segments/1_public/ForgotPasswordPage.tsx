import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        if (data.resetUrl) setResetUrl(data.resetUrl);
      } else {
        setError(data.error || 'Failed to send reset link');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          <div className="mb-6">
            <Link to="/login" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
            <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your official IMD email to receive a secure recovery link via Brevo SMTP.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-emerald-800">Password Reset Dispatched</h3>
              <p className="text-xs text-emerald-700 mt-1">
                A password reset token has been dispatched via Brevo SMTP to <strong>{email}</strong>.
              </p>
              {resetUrl && (
                <div className="mt-4 p-2 bg-white rounded border border-emerald-300 text-[10px] break-all text-slate-600">
                  <span className="font-semibold text-slate-800 block">Direct Test Link:</span>
                  <a href={resetUrl} className="text-blue-600 underline">
                    {resetUrl}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Email Address</label>
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

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
              >
                Send Password Reset Link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

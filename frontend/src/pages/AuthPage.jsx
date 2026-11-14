import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Sparkles,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  Accessibility,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

const LANGUAGES = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'];

export const AuthPage = () => {
  const { isAuthenticated, login, register, demoLogin } = useAuth();
  const { announce } = useAccessibility();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        announce('Logged in successfully. Redirecting to workspace.');
      } else {
        await register(name, email, password, preferredLanguage);
        announce('Account created successfully. Redirecting to workspace.');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Authentication failed. Please check your details and try again.';
      setError(msg);
      announce(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setDemoSubmitting(true);
    announce('Launching 1-Click Demo Login with pre-seeded accessible documents.');
    try {
      await demoLogin();
      announce('Demo login complete. Redirecting to dashboard.');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Demo login failed. Please check backend connection.';
      setError(msg);
      announce(`Error: ${msg}`);
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* 1-Click Judge Demo Card */}
        <section
          aria-labelledby="judge-demo-heading"
          className="bg-gradient-to-r from-[#0F172A] to-[#1E1B4B] text-white rounded-2xl p-6 shadow-md border border-indigo-500/30 space-y-3 hc-surface"
        >
          <div className="flex items-center gap-2 text-teal-300 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Instant Hackathon Judge Access</span>
          </div>
          <h1 id="judge-demo-heading" className="text-lg font-extrabold">
            Explore Immediately with 1-Click Demo Login
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed hc-muted">
            Automatically signs into a pre-seeded account with 2 real-world accessible sample
            documents (Government Disability Circular & Hospital Medication Guide).
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoSubmitting || submitting}
            aria-busy={demoSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#0D9488] hover:bg-teal-500 text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 hc-accent"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>
              {demoSubmitting ? 'Seeding Demo Workspace...' : '1-Click Demo Login'}
            </span>
          </button>
        </section>

        {/* Standard Login / Register Card */}
        <section
          aria-label="Account Sign In or Registration"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 hc-card"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4338CA] text-white flex items-center justify-center">
              <Accessibility className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0F172A] hc-muted">
                {mode === 'login' ? 'Sign In to Your Account' : 'Create Accessible Account'}
              </h2>
              <p className="text-xs text-slate-500 hc-muted">
                ACCESSMATE AI — Information Without Barriers
              </p>
            </div>
          </div>

          {/* Login / Register Tabs */}
          <div
            role="tablist"
            aria-label="Authentication Mode"
            className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl hc-surface"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                mode === 'login'
                  ? 'bg-[#4338CA] text-white shadow-sm hc-accent'
                  : 'text-slate-700 hover:bg-slate-200 hc-muted'
              }`}
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Login</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                mode === 'register'
                  ? 'bg-[#4338CA] text-white shadow-sm hc-accent'
                  : 'text-slate-700 hover:bg-slate-200 hc-muted'
              }`}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Register</span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 hc-muted"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#2563EB] hc-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 hc-muted"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#2563EB] hc-input"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 hc-muted"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter password'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#2563EB] hc-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 p-0.5"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-lang"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 hc-muted"
                >
                  Preferred Reading Language
                </label>
                <div className="relative">
                  <Globe
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
                    aria-hidden="true"
                  />
                  <select
                    id="auth-lang"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:border-[#2563EB] hc-input"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || demoSubmitting}
              aria-busy={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 hc-accent"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Accessibility,
  Contrast,
  Type,
  VolumeX,
  Volume2,
  LayoutDashboard,
  LogOut,
  LogIn,
  Sparkles,
  PauseCircle,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const {
    textSize,
    setTextSize,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    isSpeaking,
    stopSpeech,
    announce,
  } = useAccessibility();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleTextSizeChange = (size) => {
    setTextSize(size);
    announce(`Text size set to ${size}`);
  };

  const handleToggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    announce(next ? 'High contrast mode enabled' : 'High contrast mode disabled');
  };

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    announce(next ? 'Reduced motion mode enabled' : 'Reduced motion mode disabled');
  };

  const handleStopSpeech = () => {
    stopSpeech();
    announce('Speech playback stopped');
  };

  const handleLogout = () => {
    stopSpeech();
    logout();
    announce('Signed out successfully');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0F172A] text-white border-b border-slate-800 shadow-md hc-surface">
      {/* Skip to Main Content Link for Keyboard & Screen Reader Users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Accessibility Quick-Bar */}
      <div
        role="region"
        aria-label="Accessibility Quick Controls"
        className="bg-slate-950/90 border-b border-slate-800 px-4 py-2"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-teal-400 font-semibold">
            <Accessibility className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>WCAG 2.2 AA Accessibility Quick-Bar</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Text Size Selector */}
            <div
              role="group"
              aria-label="Text Size Selector"
              className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5"
            >
              <span className="px-2 py-1 text-slate-300 flex items-center gap-1 font-medium">
                <Type className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Text:</span>
              </span>
              {[
                { id: 'normal', label: 'Normal' },
                { id: 'large', label: 'Large' },
                { id: 'xl', label: 'XL' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTextSizeChange(item.id)}
                  aria-pressed={textSize === item.id}
                  aria-label={`Set text size to ${item.label}`}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    textSize === item.id
                      ? 'bg-[#2563EB] text-white hc-accent'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* High-Contrast Toggle */}
            <button
              type="button"
              onClick={handleToggleContrast}
              aria-pressed={highContrast}
              aria-label="Toggle High-Contrast Mode"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                highContrast
                  ? 'bg-yellow-400 text-black border-yellow-300'
                  : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Contrast className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{highContrast ? 'High Contrast: ON' : 'High Contrast'}</span>
            </button>

            {/* Reduced Motion Toggle */}
            <button
              type="button"
              onClick={handleToggleReducedMotion}
              aria-pressed={reducedMotion}
              aria-label="Toggle Reduced Motion Mode"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                reducedMotion
                  ? 'bg-teal-400 text-slate-950 border-teal-300 hc-accent'
                  : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <PauseCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{reducedMotion ? 'Reduced Motion: ON' : 'Reduced Motion'}</span>
            </button>

            {/* Stop Speech Button */}
            <button
              type="button"
              onClick={handleStopSpeech}
              aria-label="Stop all Text-to-Speech audio immediately"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                isSpeaking
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse hover:bg-rose-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Stop Speech (Speaking...)</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Stop Speech</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav
        aria-label="Primary Navigation"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4"
      >
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-none rounded-lg py-1"
          aria-label="ACCESSMATE AI Home — Information Without Barriers"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4338CA] to-[#0D9488] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Accessibility className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white block leading-none">
              ACCESSMATE <span className="text-teal-400">AI</span>
            </span>
            <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
              Information Without Barriers
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              location.pathname === '/'
                ? 'bg-slate-800 text-teal-400'
                : 'text-slate-200 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#4338CA] text-white shadow-sm hc-accent'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                <span>Workspace</span>
              </Link>

              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-700">
                <span className="text-xs font-medium text-slate-300 truncate max-w-[160px]">
                  {user?.name}
                </span>
                {user?.isDemo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    Demo
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out of ACCESSMATE AI"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-rose-600 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#2563EB] hover:bg-blue-500 text-white shadow-sm transition-colors hc-accent"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Sign In / Demo</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

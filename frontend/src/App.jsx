import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
            <Navbar />
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className="bg-[#0F172A] text-slate-400 border-t border-slate-800 py-6 px-4 text-xs sm:text-sm hc-surface">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                <div>
                  <strong className="text-white">ACCESSMATE AI</strong> — &ldquo;Information Without
                  Barriers&rdquo; (WCAG 2.2 AA Accessible)
                </div>
                <div>
                  Powered by <span className="text-teal-400 font-semibold">ACCESSMATE Neural AI</span> •
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white">Esc</kbd> at
                  any time to stop speech
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

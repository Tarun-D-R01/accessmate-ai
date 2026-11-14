import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accessibility,
  FileText,
  Languages,
  Eye,
  Volume2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ListenButton } from '../components/ListenButton';

export const LandingPage = () => {
  const { isAuthenticated, demoLogin } = useAuth();
  const { announce } = useAccessibility();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleOneClickDemo = async () => {
    setDemoLoading(true);
    announce('Starting 1-Click Judge Demo session and seeding sample accessible documents.');
    try {
      await demoLogin();
      announce('Demo workspace ready. Redirecting to dashboard.');
      navigate('/dashboard');
    } catch {
      announce('Could not start demo session. Redirecting to login page.');
      navigate('/auth');
    } finally {
      setDemoLoading(false);
    }
  };

  const heroIntroSpeech =
    'Welcome to ACCESSMATE AI: Information Without Barriers. An AI accessibility assistant that extracts text from documents and images, simplifies complex language into plain everyday words, translates into Kannada, Hindi, Tamil, Telugu, Malayalam, and English, describes scenes for visually impaired users, and reads every output aloud.';

  const features = [
    {
      icon: FileText,
      title: 'AI Document Reader & Simplifier',
      badge: 'Multimodal OCR & Simplifier',
      description:
        'Upload complex PDFs, scanned government notices, medical reports, or photos. Extracts text accurately, writes a plain-language summary, explains difficult jargon, and answers your questions.',
      color: 'from-[#4338CA] to-[#2563EB]',
    },
    {
      icon: Languages,
      title: 'Indian Language Translator',
      badge: '6 Languages + Native TTS',
      description:
        'Translate complex text or simplified documents into Kannada (ಕನ್ನಡ), Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), and English while preserving context and dignity.',
      color: 'from-[#2563EB] to-[#0D9488]',
    },
    {
      icon: Eye,
      title: 'AI Vision Image Describer',
      badge: 'Screen-Reader Optimized',
      description:
        'Designed for blind and low-vision users. Generates spatial scene descriptions, extracts sign/label text (OCR), and strictly separates 100% confirmed visible facts from uncertain details.',
      color: 'from-[#0D9488] to-emerald-600',
    },
    {
      icon: Volume2,
      title: 'Listen Aloud & WCAG 2.2 AA UI',
      badge: 'Zero-Barrier Experience',
      description:
        'Every AI output includes a 1-click Listen Aloud button powered by browser speech synthesis, paired with Normal/Large/XL text scaling, High-Contrast Mode, and full keyboard navigation.',
      color: 'from-indigo-700 to-[#4338CA]',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-slate-900 to-[#1E1B4B] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800 hc-surface"
      >
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-teal-300 text-xs sm:text-sm font-bold">
            <Accessibility className="w-4 h-4" aria-hidden="true" />
            <span>WCAG 2.2 AA Accessible • Multimodal Accessibility AI</span>
          </div>

          <h1
            id="hero-heading"
            className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight"
          >
            Information{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-300">
              Without Barriers
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-200 leading-relaxed font-normal hc-muted">
            <strong>ACCESSMATE AI</strong> transforms dense PDFs, official circulars, medical
            instructions, and visual scenes into plain language, regional Indian languages, and
            clear spoken audio—empowering every citizen with independent access to information.
          </p>

          {/* Primary CTAs + 1-Click Judge Demo Login */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white font-extrabold text-base sm:text-lg shadow-lg transition-all hc-accent"
              >
                <span>Open Accessible Workspace</span>
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOneClickDemo}
                  disabled={demoLoading}
                  aria-busy={demoLoading}
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-[#0D9488] hover:bg-teal-500 text-white font-extrabold text-base sm:text-lg shadow-lg transition-all disabled:opacity-60 hc-accent"
                >
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  <span>
                    {demoLoading ? 'Launching Demo Workspace...' : '1-Click Demo Login (Judges)'}
                  </span>
                </button>

                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-[#4338CA] hover:bg-indigo-600 text-white font-bold text-base sm:text-lg border border-indigo-400/30 shadow-lg transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
              </>
            )}

            <ListenButton
              text={heroIntroSpeech}
              speechId="landing-hero-intro"
              label="Listen to Overview"
              size="lg"
            />
          </div>

          {/* Supported Indian Languages Pill Strip */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-300">
            <span className="font-bold text-teal-400">Supported Languages:</span>
            {[
              'English',
              'ಕನ್ನಡ (Kannada)',
              'हिन्दी (Hindi)',
              'தமிழ் (Tamil)',
              'తెలుగు (Telugu)',
              'മലയാളം (Malayalam)',
            ].map((lang) => (
              <span
                key={lang}
                className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 font-semibold text-white"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section
        aria-labelledby="features-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10"
      >
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#4338CA] hc-muted">
            Built for Cognitive, Visual & Linguistic Inclusion
          </span>
          <h2
            id="features-heading"
            className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] hc-muted"
          >
            Four Accessible Tools in One Unified Workspace
          </h2>
          <p className="text-slate-600 text-base sm:text-lg hc-muted">
            No complex menus or hidden barriers—switch effortlessly between reading, translating,
            describing images, and reviewing saved documents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat, index) => {
            const IconComponent = feat.icon;
            return (
              <article
                key={feat.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5 hc-card"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center shadow-sm`}
                    >
                      <IconComponent className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 hc-surface">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#0F172A] hc-muted">{feat.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base hc-muted">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <ListenButton
                    text={`${feat.title}. ${feat.description}`}
                    speechId={`feat-card-${index}`}
                    label="Listen"
                    size="sm"
                  />
                  <button
                    type="button"
                    onClick={isAuthenticated ? () => navigate('/dashboard') : handleOneClickDemo}
                    className="text-sm font-bold text-[#4338CA] hover:text-[#2563EB] inline-flex items-center gap-1 hc-muted"
                  >
                    <span>Try in Workspace</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Accessibility Standards Commitment Banner */}
      <section
        aria-labelledby="standards-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl bg-[#0F172A] text-white p-8 sm:p-10 border border-slate-800 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center hc-surface">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 text-teal-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              <span>Designed First for Screen Readers, Low-Vision & First-Gen Readers</span>
            </div>
            <h2 id="standards-heading" className="text-2xl sm:text-3xl font-extrabold">
              Ready to Test Immediately with Pre-Seeded Accessible Documents
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300 pt-1">
              {[
                'Pre-loaded RPwD Act Disability Subsidy Circular',
                'Pre-loaded Hospital Discharge & Medication Guide',
                '1-Click Sample Transit Signboard Vision Test',
                'Instant Kannada, Hindi, Tamil, Telugu & Malayalam TTS',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
            <button
              type="button"
              onClick={isAuthenticated ? () => navigate('/dashboard') : handleOneClickDemo}
              disabled={demoLoading}
              className="w-full py-4 px-6 rounded-xl bg-[#0D9488] hover:bg-teal-500 text-white font-extrabold text-base shadow-md flex items-center justify-center gap-2 transition-colors hc-accent"
            >
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>
                {isAuthenticated ? 'Go to Dashboard' : 'Launch 1-Click Judge Demo'}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

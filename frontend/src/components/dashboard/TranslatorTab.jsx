import React, { useState, useEffect } from 'react';
import {
  Languages,
  Copy,
  Check,
  Sparkles,
  FileText,
  ArrowRight,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import api from '../../services/api';
import { ListenButton } from '../ListenButton';
import { useAccessibility } from '../../context/AccessibilityContext';

const INDIAN_LANGUAGES = [
  { id: 'Kannada', native: 'ಕನ್ನಡ', region: 'Karnataka (kn-IN)' },
  { id: 'Hindi', native: 'हिन्दी', region: 'National / North (hi-IN)' },
  { id: 'Tamil', native: 'தமிழ்', region: 'Tamil Nadu (ta-IN)' },
  { id: 'Telugu', native: 'తెలుగు', region: 'Andhra & Telangana (te-IN)' },
  { id: 'Malayalam', native: 'മലയാളം', region: 'Kerala (ml-IN)' },
  { id: 'English', native: 'English', region: 'Plain English (en-IN)' },
];

export const TranslatorTab = ({ documents, initialText = '', onTranslationComplete }) => {
  const { announce } = useAccessibility();
  const [sourceText, setSourceText] = useState(initialText);
  const [targetLanguage, setTargetLanguage] = useState('Kannada');
  const [simplifyBeforeTranslate, setSimplifyBeforeTranslate] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialText) {
      setSourceText(initialText);
    }
  }, [initialText]);

  const handleLoadFromDocument = (docId) => {
    if (!docId) return;
    const found = documents.find((d) => d._id === docId);
    if (found) {
      setSourceText(found.simplifiedText || found.summary || found.extractedText);
      announce(`Loaded simplified text from ${found.title}`);
    }
  };

  const handleTranslate = async (e, overrideLanguage) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const activeLang = overrideLanguage || targetLanguage;

    if (!sourceText.trim()) {
      setError('Please enter or select some text to translate.');
      return;
    }

    setError('');
    setTranslating(true);
    announce(`Translating into ${activeLang} with AI. Please wait.`);

    try {
      const { data } = await api.post('/translate', {
        text: sourceText.trim(),
        targetLanguage: activeLang,
        sourceLanguage: 'Auto-detect',
        simplifyBeforeTranslate,
        mode: simplifyBeforeTranslate ? 'simplified' : 'standard',
        tone: simplifyBeforeTranslate ? 'plain-language' : 'accurate',
      });

      if (data?.translation) {
        setTranslationResult({
          ...data.translation,
          targetLanguage: activeLang,
        });
        if (onTranslationComplete) onTranslationComplete();
        announce(`Translation into ${activeLang} completed.`);
      }
    } catch (err) {
      const backendMsg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        (typeof err.response?.data?.error === 'string' ? err.response.data.error : null) ||
        err.message ||
        'Translation request failed.';
      const statusPrefix = err.response?.status ? `[HTTP ${err.response.status}] ` : '';
      const exactError = `${statusPrefix}${backendMsg}`;
      setError(exactError);
      announce(`Error: ${backendMsg}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translationResult?.translatedText) return;
    navigator.clipboard.writeText(translationResult.translatedText);
    setCopied(true);
    announce(`Copied ${targetLanguage} translation to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Target Language Selector Bar */}
      <section
        aria-labelledby="select-lang-heading"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hc-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2
              id="select-lang-heading"
              className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <Languages className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
              <span>Select Target Indian Language</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 hc-muted">
              Context-aware translation with native script, phonetic pronunciation guide, and
              browser Text-to-Speech.
            </p>
          </div>

          {documents?.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
              <label htmlFor="doc-import-select" className="sr-only">
                Import text from a saved document
              </label>
              <select
                id="doc-import-select"
                onChange={(e) => handleLoadFromDocument(e.target.value)}
                defaultValue=""
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50 text-slate-800 hc-input"
              >
                <option value="" disabled>
                  Import text from saved document...
                </option>
                {documents.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Target Language"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5"
        >
          {INDIAN_LANGUAGES.map((lang) => {
            const active = targetLanguage === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setTargetLanguage(lang.id);
                  setError('');
                  announce(`Selected target language ${lang.id}`);
                  if (sourceText.trim()) {
                    handleTranslate(null, lang.id);
                  } else {
                    setTranslationResult(null);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-[#4338CA] text-white border-[#4338CA] shadow-sm ring-2 ring-[#4338CA]/30 hc-accent'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-indigo-50/50 hc-surface'
                }`}
              >
                <div className="text-base font-extrabold">{lang.native}</div>
                <div
                  className={`text-xs font-semibold mt-0.5 ${
                    active ? 'text-indigo-100' : 'text-slate-600 hc-muted'
                  }`}
                >
                  {lang.id}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split Input / Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <section
          aria-labelledby="source-text-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hc-card"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                id="source-text-heading"
                htmlFor="translator-source-textarea"
                className="text-base font-bold text-[#0F172A] hc-muted"
              >
                Source Text (Paste or Import)
              </label>
              <ListenButton
                text={sourceText}
                language="English"
                speechId="translator-source"
                label="Listen Source"
                size="sm"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <textarea
              id="translator-source-textarea"
              rows={9}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste any official notice, medical prescription instruction, banking rule, or document paragraph to translate into Kannada, Hindi, Tamil, Telugu, Malayalam, or plain English..."
              className="w-full p-4 rounded-xl border border-slate-300 text-sm sm:text-base leading-relaxed focus:border-[#2563EB] hc-input"
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simplifyBeforeTranslate}
                onChange={(e) => setSimplifyBeforeTranslate(e.target.checked)}
                className="w-4 h-4 rounded text-[#4338CA] focus:ring-[#2563EB]"
              />
              <span className="text-sm font-semibold text-slate-700 hc-muted">
                Simplify complex jargon into everyday plain language before translating
              </span>
            </label>

            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating || !sourceText.trim()}
              aria-busy={translating}
              className="w-full py-3.5 px-5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 hc-accent"
            >
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>
                {translating
                  ? `Translating to ${targetLanguage}...`
                  : `Translate to ${targetLanguage}`}
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Output Panel */}
        <section
          aria-labelledby="translated-output-heading"
          aria-live="polite"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hc-card"
        >
          {translating ? (
            <div className="my-auto py-12 text-center space-y-3" role="status">
              <Sparkles
                className="w-10 h-10 text-[#2563EB] mx-auto animate-spin"
                aria-hidden="true"
              />
              <h3
                id="translated-output-heading"
                className="text-lg font-bold text-[#0F172A] hc-muted"
              >
                Translating to {targetLanguage}...
              </h3>
              <p className="text-sm text-slate-600 max-w-sm mx-auto hc-muted">
                Generating native {targetLanguage} script and phonetic pronunciation guide.
              </p>
            </div>
          ) : !translationResult ? (
            <div className="my-auto py-12 text-center space-y-3">
              <Languages className="w-12 h-12 text-[#0D9488] mx-auto" aria-hidden="true" />
              <h3
                id="translated-output-heading"
                className="text-lg font-bold text-[#0F172A] hc-muted"
              >
                Accessible Translation Output
              </h3>
              <p className="text-sm text-slate-600 max-w-sm mx-auto hc-muted">
                Choose a target language above and click &ldquo;Translate&rdquo; to receive a
                context-preserving translation with spoken audio and pronunciation guidance.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
                    Translated into {translationResult.targetLanguage}
                  </span>
                  <h3
                    id="translated-output-heading"
                    className="text-lg font-extrabold text-[#0F172A] hc-muted"
                  >
                    {translationResult.targetLanguage} Accessible Output
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <ListenButton
                    text={translationResult.translatedText}
                    language={translationResult.targetLanguage}
                    speechId="translator-output-main"
                    label={`Listen in ${translationResult.targetLanguage}`}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy translated text to clipboard"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-teal-600" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Native Script Output */}
              <div
                lang={
                  INDIAN_LANGUAGES.find((l) => l.id === translationResult.targetLanguage)?.region.match(
                    /\(([^)]+)\)/
                  )?.[1] || 'en-IN'
                }
                className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-base sm:text-lg font-medium text-[#0F172A] whitespace-pre-line leading-relaxed hc-surface"
              >
                {translationResult.translatedText}
              </div>

              {/* Phonetic Pronunciation Guide */}
              {translationResult.phoneticGuide && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hc-surface">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4338CA] hc-muted">
                      Spoken Phonetic Guide (Transliteration)
                    </span>
                    <ListenButton
                      text={translationResult.phoneticGuide}
                      language="English"
                      speechId="translator-phonetic"
                      label="Listen Phonetics"
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed hc-muted">
                    {translationResult.phoneticGuide}
                  </p>
                </div>
              )}

              {/* Contextual Notes */}
              {translationResult.contextualNotes?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 hc-muted">
                    <BookOpen className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
                    <span>Context & Clarity Notes</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {translationResult.contextualNotes.map((note, idx) => (
                      <li
                        key={idx}
                        className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hc-surface"
                      >
                        • {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

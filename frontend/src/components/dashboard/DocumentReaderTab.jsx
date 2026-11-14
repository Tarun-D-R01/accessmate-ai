import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  HelpCircle,
  Send,
  Languages,
  Copy,
  Check,
  Trash2,
  ListChecks,
  FileSearch,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { ListenButton } from '../ListenButton';
import { useAccessibility } from '../../context/AccessibilityContext';

export const DocumentReaderTab = ({
  documents,
  selectedDoc,
  setSelectedDoc,
  onDocumentsChange,
  onSendToTranslator,
}) => {
  const { announce } = useAccessibility();
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'paste'
  const [selectedFile, setSelectedFile] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Q&A state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaError, setQaError] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB maximum limit.');
      return;
    }
    setError('');
    setSelectedFile(file);
    if (!customTitle) {
      setCustomTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
    }
    announce(`Selected file ${file.name}`);
  };

  const handleAnalyzeSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (inputMode === 'upload' && !selectedFile) {
      setError('Please choose a PDF, JPG, PNG, or TXT file to upload.');
      return;
    }
    if (inputMode === 'paste' && !pastedText.trim()) {
      setError('Please paste or type some document text to simplify.');
      return;
    }

    setAnalyzing(true);
    announce('Analyzing document with multimodal AI. Please wait.');

    try {
      const formData = new FormData();
      if (inputMode === 'upload' && selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('pastedText', pastedText.trim());
      }
      if (customTitle.trim()) {
        formData.append('title', customTitle.trim());
      }

      const { data } = await api.post('/documents/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.document) {
        setSelectedDoc(data.document);
        await onDocumentsChange();
        setSelectedFile(null);
        setPastedText('');
        setCustomTitle('');
        announce(`Document "${data.document.title}" analyzed and simplified.`);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to analyze document. Please verify your file and try again.';
      setError(msg);
      announce(`Error: ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskQuestion = async (e, presetQuestion = null) => {
    if (e) e.preventDefault();
    const q = (presetQuestion || question).trim();
    if (!q || !selectedDoc) return;

    setAsking(true);
    setQaError('');
    announce(`Asking question: ${q}`);

    try {
      const { data } = await api.post(`/documents/${selectedDoc._id}/ask`, {
        question: q,
      });

      if (data?.document) {
        setSelectedDoc(data.document);
        await onDocumentsChange();
        setQuestion('');
        announce('Answer received from ACCESSMATE AI.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Could not answer question right now.';
      setQaError(msg);
      announce(`Error: ${msg}`);
    } finally {
      setAsking(false);
    }
  };

  const handleDeleteDoc = async (docId, docTitle) => {
    try {
      await api.delete(`/documents/${docId}`);
      announce(`Deleted document ${docTitle}`);
      await onDocumentsChange();
      if (selectedDoc?._id === docId) {
        const remaining = documents.filter((d) => d._id !== docId);
        setSelectedDoc(remaining[0] || null);
      }
    } catch {
      announce('Could not delete document.');
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    announce('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Upload / Paste Form + Saved Documents List */}
      <div className="lg:col-span-4 space-y-6">
        {/* Upload / Paste Card */}
        <section
          aria-labelledby="analyze-doc-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hc-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              id="analyze-doc-heading"
              className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <Upload className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
              <span>Analyze New Document</span>
            </h2>
          </div>

          {/* Mode Toggle */}
          <div
            role="group"
            aria-label="Document Input Method"
            className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4 hc-surface"
          >
            <button
              type="button"
              onClick={() => {
                setInputMode('upload');
                setError('');
              }}
              aria-pressed={inputMode === 'upload'}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                inputMode === 'upload'
                  ? 'bg-[#4338CA] text-white shadow-sm hc-accent'
                  : 'text-slate-700 hover:bg-slate-200 hc-muted'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('paste');
                setError('');
              }}
              aria-pressed={inputMode === 'paste'}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                inputMode === 'paste'
                  ? 'bg-[#4338CA] text-white shadow-sm hc-accent'
                  : 'text-slate-700 hover:bg-slate-200 hc-muted'
              }`}
            >
              Paste Text
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAnalyzeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="doc-custom-title"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 hc-muted"
              >
                Document Title (Optional)
              </label>
              <input
                id="doc-custom-title"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Bank Circular or Medical Report"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#2563EB] hc-input"
              />
            </div>

            {inputMode === 'upload' ? (
              <div>
                <label
                  htmlFor="doc-file-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 hc-muted"
                >
                  Select File (PDF, JPG, PNG, TXT — Max 10MB)
                </label>
                <label
                  htmlFor="doc-file-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-[#4338CA] bg-indigo-50/40 rounded-xl p-5 cursor-pointer transition-colors text-center hc-surface"
                >
                  <FileText className="w-8 h-8 text-[#4338CA] mb-2" aria-hidden="true" />
                  <span className="text-sm font-bold text-[#0F172A] hc-muted">
                    {selectedFile ? selectedFile.name : 'Click to choose a file'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 hc-muted">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB ready to analyze`
                      : 'Supports PDF, JPG, PNG, WEBP, or TXT'}
                  </span>
                  <input
                    id="doc-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/*,text/plain"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="doc-paste-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 hc-muted"
                >
                  Paste Complex Text to Simplify
                </label>
                <textarea
                  id="doc-paste-input"
                  rows={5}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste complex government notices, legal clauses, hospital instructions, or textbook paragraphs here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#2563EB] hc-input"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing}
              aria-busy={analyzing}
              className="w-full py-3 px-4 rounded-xl bg-[#4338CA] hover:bg-indigo-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 hc-accent"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>
                {analyzing
                  ? 'AI Analyzing Document...'
                  : 'Extract & Simplify with AI'}
              </span>
            </button>
          </form>
        </section>

        {/* Saved / Sample Documents List */}
        <section
          aria-labelledby="saved-docs-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hc-card"
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              id="saved-docs-heading"
              className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <BookOpen className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
              <span>Your Accessible Documents ({documents.length})</span>
            </h2>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center hc-muted">
              No documents yet. Upload a file above to get started!
            </p>
          ) : (
            <ul className="space-y-2.5" aria-label="Saved Documents List">
              {documents.map((doc) => {
                const isSelected = selectedDoc?._id === doc._id;
                return (
                  <li key={doc._id}>
                    <div
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-50/90 border-[#4338CA] ring-2 ring-[#4338CA]/20 hc-surface'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hc-card'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(doc);
                          announce(`Opened document ${doc.title}`);
                        }}
                        className="text-left flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-[#0F172A] truncate block hc-muted">
                            {doc.title}
                          </span>
                          {doc.isSample && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-teal-100 text-teal-800">
                              Sample
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block mt-0.5 truncate hc-muted">
                          {doc.fileName}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc._id, doc.title)}
                        aria-label={`Delete document ${doc.title}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Right Column: Active Document Reader, Simplifier, Glossary & Q&A */}
      <div className="lg:col-span-8 space-y-6">
        {!selectedDoc ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center hc-card">
            <FileSearch className="w-12 h-12 text-[#4338CA] mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-xl font-bold text-[#0F172A] mb-2 hc-muted">
              Select or Upload a Document
            </h3>
            <p className="text-slate-600 max-w-md mx-auto hc-muted">
              Upload a PDF, image, or text file on the left—or click one of the pre-loaded sample
              documents—to hear a plain-language summary, explore simplified terms, and ask
              questions.
            </p>
          </div>
        ) : (
          <>
            {/* Document Header & Quick Actions */}
            <article
              aria-labelledby="active-doc-title"
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 hc-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-[#4338CA]">
                      AI Simplified Document
                    </span>
                    <span className="text-xs text-slate-500 hc-muted">
                      {selectedDoc.fileName}
                    </span>
                  </div>
                  <h2
                    id="active-doc-title"
                    className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-2 hc-muted"
                  >
                    {selectedDoc.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ListenButton
                    text={`${selectedDoc.title}. Summary: ${selectedDoc.summary}. ${selectedDoc.simplifiedText}`}
                    speechId={`doc-full-${selectedDoc._id}`}
                    label="Listen Full Guide"
                  />
                  <button
                    type="button"
                    onClick={() => onSendToTranslator(selectedDoc.simplifiedText)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-blue-700 transition-colors"
                  >
                    <Languages className="w-4 h-4" aria-hidden="true" />
                    <span>Translate Simplified Guide</span>
                  </button>
                </div>
              </div>

              {/* 1. Plain-Language Summary */}
              <section
                aria-labelledby="doc-summary-heading"
                className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 hc-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3
                    id="doc-summary-heading"
                    className="text-base font-extrabold text-[#4338CA] flex items-center gap-2 hc-muted"
                  >
                    <Sparkles className="w-5 h-5" aria-hidden="true" />
                    <span>Plain-Language Summary (6th-Grade Reading Level)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <ListenButton
                      text={selectedDoc.summary}
                      speechId={`doc-summary-${selectedDoc._id}`}
                      label="Listen Summary"
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedDoc.summary, 'summary')}
                      aria-label="Copy summary text"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      {copiedField === 'summary' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-slate-800 leading-relaxed font-medium hc-muted">
                  {selectedDoc.summary}
                </p>
              </section>

              {/* 2. Key Takeaways */}
              {selectedDoc.keyTakeaways?.length > 0 && (
                <section aria-labelledby="doc-takeaways-heading" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id="doc-takeaways-heading"
                      className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                    >
                      <ListChecks className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
                      <span>Key Actionable Takeaways</span>
                    </h3>
                    <ListenButton
                      text={selectedDoc.keyTakeaways.join('. ')}
                      speechId={`doc-takeaways-${selectedDoc._id}`}
                      label="Listen Takeaways"
                      size="sm"
                    />
                  </div>
                  <ul className="grid grid-cols-1 gap-2.5">
                    {selectedDoc.keyTakeaways.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-slate-800 text-sm font-medium hc-surface"
                      >
                        <span className="w-6 h-6 rounded-full bg-[#0D9488] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="hc-muted">{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 3. Full Simplified Explanation */}
              <section aria-labelledby="doc-simplified-heading" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    id="doc-simplified-heading"
                    className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                  >
                    <BookOpen className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
                    <span>Step-by-Step Simplified Explanation</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <ListenButton
                      text={selectedDoc.simplifiedText}
                      speechId={`doc-simplified-${selectedDoc._id}`}
                      label="Listen Simplified Version"
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedDoc.simplifiedText, 'simplified')}
                      aria-label="Copy simplified explanation"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200"
                    >
                      {copiedField === 'simplified' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-line text-slate-800 leading-relaxed text-sm sm:text-base hc-surface">
                  {selectedDoc.simplifiedText}
                </div>
              </section>

              {/* 4. Complex Terms Explained Simply (Glossary) */}
              {selectedDoc.complexTerms?.length > 0 && (
                <section aria-labelledby="doc-glossary-heading" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id="doc-glossary-heading"
                      className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                    >
                      <HelpCircle className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
                      <span>Difficult Terms Explained Simply</span>
                    </h3>
                    <ListenButton
                      text={selectedDoc.complexTerms
                        .map((t) => `${t.term}: ${t.simpleExplanation}`)
                        .join('. ')}
                      speechId={`doc-glossary-${selectedDoc._id}`}
                      label="Listen Glossary"
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDoc.complexTerms.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm hc-surface"
                      >
                        <div className="font-bold text-sm text-[#4338CA] hc-muted">
                          {item.term}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed hc-muted">
                          {item.simpleExplanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Original Extracted Text (Collapsible Details) */}
              <details className="group rounded-xl border border-slate-200 bg-slate-50 p-4 hc-surface">
                <summary className="cursor-pointer font-bold text-sm text-slate-700 flex items-center justify-between hc-muted">
                  <span>View Original Extracted Text (OCR Output)</span>
                  <span className="text-xs text-[#2563EB] group-open:underline">
                    Toggle View
                  </span>
                </summary>
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ListenButton
                      text={selectedDoc.extractedText}
                      speechId={`doc-raw-${selectedDoc._id}`}
                      label="Listen Original Text"
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => onSendToTranslator(selectedDoc.extractedText)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-blue-700"
                    >
                      <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Send Original Text to Translator</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed max-h-72 overflow-y-auto p-3 bg-white rounded-lg border border-slate-200 hc-card">
                    {selectedDoc.extractedText}
                  </pre>
                </div>
              </details>
            </article>

            {/* Contextual Document Q&A Card */}
            <section
              aria-labelledby="doc-qa-heading"
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hc-card"
            >
              <div>
                <h3
                  id="doc-qa-heading"
                  className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                >
                  <HelpCircle className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
                  <span>Ask Questions About This Document</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 hc-muted">
                  Ask anything about deadlines, eligibility, numbers, or instructions in plain
                  language.
                </p>
              </div>

              {/* Quick Suggested Questions */}
              <div className="flex flex-wrap gap-2">
                {[
                  'What are the main steps I need to take?',
                  'Are there any important numbers, limits, or deadlines?',
                  'Who is eligible or what warning signs should I watch for?',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={asking}
                    onClick={() => handleAskQuestion(null, preset)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-[#4338CA] border border-indigo-200 hover:bg-indigo-100 transition-colors hc-surface"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {qaError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm"
                >
                  {qaError}
                </div>
              )}

              <form onSubmit={(e) => handleAskQuestion(e)} className="flex gap-2">
                <label htmlFor="doc-qa-input" className="sr-only">
                  Ask a question about {selectedDoc.title}
                </label>
                <input
                  id="doc-qa-input"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={`Ask a question about "${selectedDoc.title}"...`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#2563EB] hc-input"
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  aria-busy={asking}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 hc-accent"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>{asking ? 'Asking...' : 'Ask AI'}</span>
                </button>
              </form>

              {/* Q&A History */}
              {selectedDoc.qaHistory?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 hc-muted">
                    Q&A History ({selectedDoc.qaHistory.length})
                  </h4>
                  <div className="space-y-3">
                    {[...selectedDoc.qaHistory].reverse().map((qa, idx) => (
                      <div
                        key={qa._id || idx}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hc-surface"
                      >
                        <div className="font-bold text-sm text-[#4338CA] hc-muted">
                          Q: {qa.question}
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed hc-muted">
                          {qa.answer}
                        </p>
                        <div className="pt-1 flex items-center justify-end">
                          <ListenButton
                            text={`Question: ${qa.question}. Answer: ${qa.answer}`}
                            speechId={`qa-${selectedDoc._id}-${idx}`}
                            label="Listen Answer"
                            size="sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

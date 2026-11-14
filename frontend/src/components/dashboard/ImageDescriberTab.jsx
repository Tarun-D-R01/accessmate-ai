import React, { useState } from 'react';
import {
  Eye,
  Upload,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  FileText,
  Box,
  ShieldAlert,
  Languages,
  Copy,
  Check,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { ListenButton } from '../ListenButton';
import { useAccessibility } from '../../context/AccessibilityContext';

export const ImageDescriberTab = ({ onSendToTranslator, onActivityLogged }) => {
  const { announce } = useAccessibility();
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [describing, setDescribing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds the 10MB maximum limit.');
      return;
    }
    setError('');
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    announce(`Selected image ${file.name}`);
  };

  // Generates a realistic sample accessibility signboard PNG in-browser so judges can test with 1 click
  const handleLoadSampleScene = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // High-contrast accessible transit & hospital signboard illustration
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 800, 480);

    // Header banner
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(30, 30, 740, 80);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('METRO STATION & CITY HOSPITAL — ACCESSIBLE CONCOURSE', 55, 80);

    // Left panel: Elevator & Wheelchair Ramp
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(30, 130, 355, 220);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 130, 355, 220);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('← LIFT & WHEELCHAIR RAMP', 55, 175);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '18px sans-serif';
    ctx.fillText('• Platform 1 & 2 Priority Lift: 15 Meters Left', 55, 215);
    ctx.fillText('• Braille & Audio Buttons Enabled', 55, 250);
    ctx.fillText('• Dedicated Helpdesk Counter: Gate B', 55, 285);
    ctx.fillStyle = '#4ADE80';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('STATUS: LIFT OPERATIONAL (24x7)', 55, 325);

    // Right panel: Medical Pharmacy & Emergency Notice
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(415, 130, 355, 220);
    ctx.strokeStyle = '#2DD4BF';
    ctx.strokeRect(415, 130, 355, 220);

    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('PHARMACY & VISION CLINIC →', 440, 175);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '18px sans-serif';
    ctx.fillText('• Room 104: Low-Vision Aid Center', 440, 215);
    ctx.fillText('• Helpline: 1800-425-2026 (Toll-Free)', 440, 250);
    ctx.fillText('• Hours: 08:00 AM to 08:00 PM', 440, 285);

    // Bottom Yellow Tactile Paving Strip
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(30, 375, 740, 75);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      'CAUTION: YELLOW TACTILE GUIDANCE PATH — KEEP CLEAR FOR CANE USERS',
      55,
      420
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const sampleFile = new File([blob], 'Accessible_Transit_Signboard_Scene.png', {
        type: 'image/png',
      });
      setImageFile(sampleFile);
      setPreviewUrl(URL.createObjectURL(sampleFile));
      setError('');
      announce(
        'Loaded sample Accessible Transit and Hospital Signboard image. Click Describe Image to analyze.'
      );
    }, 'image/png');
  };

  const handleDescribe = async (e) => {
    if (e) e.preventDefault();
    if (!imageFile) {
      setError('Please upload an image or load the sample image first.');
      return;
    }

    setError('');
    setDescribing(true);
    announce('Analyzing image with AI Vision for accessibility description. Please wait.');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const { data } = await api.post('/images/describe', formData);

      if (data?.description) {
        setResult(data.description);
        if (onActivityLogged) onActivityLogged();
        announce('Image description ready. Use the Listen Aloud button to hear the scene.');
      }
    } catch (err) {
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' && err.response.data.trim()
          ? err.response.data
          : null) ||
        err.message;
      const statusPrefix = err.response?.status ? `[HTTP ${err.response.status}] ` : '';
      const exactError = `${statusPrefix}${backendMessage}`;
      setError(exactError);
      announce(`Error: ${exactError}`);
    } finally {
      setDescribing(false);
    }
  };

  const buildFullSpokenNarrative = () => {
    if (!result) return '';
    return [
      `Quick Summary: ${result.altText}`,
      `Detailed Scene Description: ${result.sceneDescription}`,
      `Visible Text in Image: ${result.visibleText}`,
      `Confirmed Visible Facts: ${(result.visibleFacts || []).join('. ')}`,
      `Uncertain or Inferred Details: ${(result.uncertainDetails || []).join('. ')}`,
      `Accessibility Notes: ${result.accessibilityNotes}`,
    ].join('. ');
  };

  const handleCopyFull = () => {
    const fullText = buildFullSpokenNarrative();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    announce('Full image description copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Upload & Image Preview */}
      <div className="lg:col-span-5 space-y-6">
        <section
          aria-labelledby="image-upload-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hc-card"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="image-upload-heading"
              className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <Eye className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
              <span>AI Vision Image Describer</span>
            </h2>
            <button
              type="button"
              onClick={handleLoadSampleScene}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-50 text-[#0D9488] border border-teal-200 hover:bg-teal-100 transition-colors hc-surface"
            >
              Load Sample Signboard
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 hc-muted">
            Upload a photo, signboard, medicine label, chart, or document page for a screen-reader
            description that separates confirmed visible facts from uncertain details.
          </p>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <label
            htmlFor="vision-image-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-[#4338CA] bg-indigo-50/40 rounded-xl p-6 cursor-pointer transition-colors text-center hc-surface"
          >
            <Upload className="w-8 h-8 text-[#4338CA] mb-2" aria-hidden="true" />
            <span className="text-sm font-bold text-[#0F172A] hc-muted">
              {imageFile ? imageFile.name : 'Choose an Image (JPG, PNG, WEBP, GIF)'}
            </span>
            <span className="text-xs text-slate-500 mt-1 hc-muted">
              Max file size 10MB — or click &ldquo;Load Sample Signboard&rdquo; above
            </span>
            <input
              id="vision-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageSelect}
              className="sr-only"
            />
          </label>

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src={previewUrl}
                alt={result?.altText || 'Selected preview waiting for AI description'}
                className="w-full max-h-64 object-contain mx-auto"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleDescribe}
            disabled={describing || !imageFile}
            aria-busy={describing}
            className="w-full py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-indigo-800 text-white font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 hc-accent"
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span>
              {describing
                ? 'AI Vision Inspecting Scene...'
                : 'Generate Accessible Description'}
            </span>
          </button>
        </section>
      </div>

      {/* Right Column: Structured Accessibility Description */}
      <div className="lg:col-span-7 space-y-6">
        {!result ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center hc-card">
            <ImageIcon className="w-12 h-12 text-[#4338CA] mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-xl font-bold text-[#0F172A] mb-2 hc-muted">
              Ready to Describe Any Scene or Sign
            </h3>
            <p className="text-slate-600 max-w-md mx-auto hc-muted">
              Upload any photo—or click <strong>Load Sample Signboard</strong> on the left—to get
              instant screen-reader alt text, spatial layout, OCR text, and verified visual facts.
            </p>
          </div>
        ) : (
          <article
            aria-labelledby="vision-result-heading"
            aria-live="polite"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 hc-card"
          >
            {/* Header & Master Listen Control */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
                  Screen-Reader Optimized Output
                </span>
                <h3
                  id="vision-result-heading"
                  className="text-xl font-extrabold text-[#0F172A] hc-muted"
                >
                  Visual Accessibility Report
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ListenButton
                  text={buildFullSpokenNarrative()}
                  speechId="vision-full-report"
                  label="Listen Full Report Aloud"
                />
                <button
                  type="button"
                  onClick={handleCopyFull}
                  aria-label="Copy full image description"
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
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1. Concise Alt-Text */}
            <section
              aria-labelledby="alt-text-heading"
              className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2 hc-surface"
            >
              <div className="flex items-center justify-between gap-2">
                <h4
                  id="alt-text-heading"
                  className="text-sm font-extrabold uppercase tracking-wider text-[#4338CA] hc-muted"
                >
                  1. Quick Screen-Reader Alt-Text
                </h4>
                <ListenButton
                  text={result.altText}
                  speechId="vision-alt-text"
                  label="Listen Alt-Text"
                  size="sm"
                />
              </div>
              <p className="text-base font-bold text-[#0F172A] leading-relaxed hc-muted">
                &ldquo;{result.altText}&rdquo;
              </p>
            </section>

            {/* 2. Detailed Spatial Scene Description */}
            <section aria-labelledby="scene-desc-heading" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4
                  id="scene-desc-heading"
                  className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                >
                  <Eye className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
                  <span>2. Detailed Spatial Scene Description</span>
                </h4>
                <ListenButton
                  text={result.sceneDescription}
                  speechId="vision-scene-desc"
                  label="Listen Scene"
                  size="sm"
                />
              </div>
              <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-line hc-surface">
                {result.sceneDescription}
              </p>
            </section>

            {/* 3. Separation of Visible Facts vs. Uncertain Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Confirmed Visible Facts */}
              <section
                aria-labelledby="visible-facts-heading"
                className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3 hc-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4
                    id="visible-facts-heading"
                    className="text-sm font-extrabold text-emerald-900 flex items-center gap-1.5 hc-muted"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>Confirmed Visible Facts</span>
                  </h4>
                  <ListenButton
                    text={`Confirmed Visible Facts: ${(result.visibleFacts || []).join('. ')}`}
                    speechId="vision-facts"
                    label="Listen"
                    size="sm"
                  />
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-950 font-medium hc-muted">
                  {(result.visibleFacts || []).map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-emerald-700">✓</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Uncertain / Inferred Details */}
              <section
                aria-labelledby="uncertain-details-heading"
                className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 hc-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4
                    id="uncertain-details-heading"
                    className="text-sm font-extrabold text-amber-900 flex items-center gap-1.5 hc-muted"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                    <span>Uncertain / Inferred Details</span>
                  </h4>
                  <ListenButton
                    text={`Uncertain or Inferred Details: ${(
                      result.uncertainDetails || []
                    ).join('. ')}`}
                    speechId="vision-uncertain"
                    label="Listen"
                    size="sm"
                  />
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-amber-950 font-medium hc-muted">
                  {(result.uncertainDetails || []).map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-amber-700">?</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* 4. Visible Text (OCR) */}
            <section aria-labelledby="ocr-text-heading" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  id="ocr-text-heading"
                  className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                >
                  <FileText className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
                  <span>4. Visible Text in Image (OCR)</span>
                </h4>
                <div className="flex items-center gap-2">
                  <ListenButton
                    text={result.visibleText}
                    speechId="vision-ocr"
                    label="Listen Text"
                    size="sm"
                  />
                  {result.visibleText &&
                    !result.visibleText.toLowerCase().includes('no visible text') && (
                      <button
                        type="button"
                        onClick={() => onSendToTranslator(result.visibleText)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-blue-700"
                      >
                        <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Translate Text</span>
                      </button>
                    )}
                </div>
              </div>
              <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-sans text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed hc-surface">
                {result.visibleText}
              </pre>
            </section>

            {/* 5. Key Objects & Spatial Locations */}
            {result.keyObjects?.length > 0 && (
              <section aria-labelledby="key-objects-heading" className="space-y-2">
                <h4
                  id="key-objects-heading"
                  className="text-base font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
                >
                  <Box className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
                  <span>5. Key Objects & Spatial Positions</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.keyObjects.map((obj, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 hc-surface"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Accessibility & Navigation Notes */}
            {result.accessibilityNotes && (
              <section
                aria-labelledby="acc-notes-heading"
                className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-start gap-3 hc-surface"
              >
                <ShieldAlert className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4
                    id="acc-notes-heading"
                    className="text-sm font-bold text-[#0F172A] hc-muted"
                  >
                    Accessibility & Orientation Cue
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 mt-0.5 hc-muted">
                    {result.accessibilityNotes}
                  </p>
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Volume2, Square } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export const ListenButton = ({
  text,
  language = 'English',
  speechId,
  label = 'Listen Aloud',
  className = '',
  size = 'md',
}) => {
  const { speak, isSpeaking, activeSpeechId } = useAccessibility();
  const isCurrentActive = isSpeaking && activeSpeechId === speechId;

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs gap-1.5'
      : size === 'lg'
      ? 'px-5 py-2.5 text-base gap-2.5'
      : 'px-3.5 py-2 text-sm gap-2';

  return (
    <button
      type="button"
      onClick={() => speak(text, language, speechId)}
      disabled={!text || !String(text).trim()}
      aria-label={isCurrentActive ? `Stop reading: ${label}` : `${label} (${language})`}
      aria-pressed={isCurrentActive}
      className={`inline-flex items-center justify-center font-semibold rounded-lg border transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${
        isCurrentActive
          ? 'bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400 animate-pulse'
          : 'bg-[#0D9488] text-white border-[#0D9488] hover:bg-teal-700 hc-accent'
      } ${className}`}
    >
      {isCurrentActive ? (
        <>
          <Square className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
          <span>Stop Reading</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

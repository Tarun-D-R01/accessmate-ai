import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AccessibilityContext = createContext(null);

export const LANGUAGE_LOCALE_MAP = {
  English: 'en-IN',
  Kannada: 'kn-IN',
  Hindi: 'hi-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Malayalam: 'ml-IN',
};

export const AccessibilityProvider = ({ children }) => {
  const [textSize, setTextSize] = useState(() => {
    return localStorage.getItem('accessmate_text_size') || 'normal';
  });

  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('accessmate_high_contrast') === 'true';
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem('accessmate_reduced_motion');
    if (saved !== null) return saved === 'true';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [speechRate, setSpeechRate] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const audioRef = useRef(null);

  // Apply root classes to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('text-scale-normal', 'text-scale-large', 'text-scale-xl');
    html.classList.add(`text-scale-${textSize}`);
    localStorage.setItem('accessmate_text_size', textSize);
  }, [textSize]);

  useEffect(() => {
    const html = document.documentElement;
    if (highContrast) {
      html.classList.add('high-contrast-mode');
    } else {
      html.classList.remove('high-contrast-mode');
    }
    localStorage.setItem('accessmate_high_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    const html = document.documentElement;
    if (reducedMotion) {
      html.classList.add('reduced-motion-mode');
    } else {
      html.classList.remove('reduced-motion-mode');
    }
    localStorage.setItem('accessmate_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  const announce = useCallback((message) => {
    setLiveAnnouncement('');
    setTimeout(() => {
      setLiveAnnouncement(message);
    }, 50);
  }, []);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // Ignore
      }
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveSpeechId(null);
  }, []);

  // Stop speech when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSpeaking) {
        stopSpeech();
        announce('Speech playback stopped.');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpeaking, stopSpeech, announce]);

  const speak = useCallback(
    (text, language = 'English', speechId = 'global') => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        announce('Text-to-speech is not supported in this browser.');
        return;
      }

      if (!text || !String(text).trim()) return;

      // Toggle off if already speaking the same block
      if (isSpeaking && activeSpeechId === speechId) {
        stopSpeech();
        announce('Speech stopped.');
        return;
      }

      window.speechSynthesis.cancel();

      const locale = LANGUAGE_LOCALE_MAP[language] || language || 'en-IN';
      const langPrefix = locale.split('-')[0].toLowerCase();

      const cleanedText = String(text)
        .replace(/[#*_`~>-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = locale;
      utterance.rate = speechRate;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === locale.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
        voices.find((v) => v.default);

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setActiveSpeechId(speechId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
      };

      setIsSpeaking(true);
      setActiveSpeechId(speechId);
      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, activeSpeechId, speechRate, stopSpeech, announce]
  );

  const playBase64Audio = useCallback(
    (audioBase64, speechId = 'neural-voice-audio', fallbackText = '', fallbackLang = 'English') => {
      if (!audioBase64) {
        if (fallbackText) speak(fallbackText, fallbackLang, speechId);
        return;
      }

      if (isSpeaking && activeSpeechId === speechId) {
        stopSpeech();
        announce('Speech stopped.');
        return;
      }

      stopSpeech();

      try {
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          setActiveSpeechId(speechId);
        };
        audio.onended = () => {
          audioRef.current = null;
          setIsSpeaking(false);
          setActiveSpeechId(null);
        };
        audio.onerror = () => {
          audioRef.current = null;
          setIsSpeaking(false);
          setActiveSpeechId(null);
          if (fallbackText) speak(fallbackText, fallbackLang, speechId);
        };

        setIsSpeaking(true);
        setActiveSpeechId(speechId);
        audio.play().catch(() => {
          audioRef.current = null;
          setIsSpeaking(false);
          setActiveSpeechId(null);
          if (fallbackText) speak(fallbackText, fallbackLang, speechId);
        });
      } catch {
        if (fallbackText) speak(fallbackText, fallbackLang, speechId);
      }
    },
    [isSpeaking, activeSpeechId, stopSpeech, speak, announce]
  );

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        setTextSize,
        highContrast,
        setHighContrast,
        reducedMotion,
        setReducedMotion,
        speechRate,
        setSpeechRate,
        isSpeaking,
        activeSpeechId,
        speak,
        playBase64Audio,
        stopSpeech,
        announce,
      }}
    >
      {/* Polite screen-reader live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

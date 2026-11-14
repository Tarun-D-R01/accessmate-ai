import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  FileText,
  Sparkles,
  Trash2,
  MessageSquare,
  AlertCircle,
  Globe,
  HelpCircle,
} from 'lucide-react';
import api from '../../services/api';
import { ListenButton } from '../ListenButton';
import { useAccessibility, LANGUAGE_LOCALE_MAP } from '../../context/AccessibilityContext';

const VOICE_LANGUAGES = [
  { id: 'English', label: 'English (en-IN)' },
  { id: 'Kannada', label: 'ಕನ್ನಡ — Kannada (kn-IN)' },
  { id: 'Hindi', label: 'हिन्दी — Hindi (hi-IN)' },
  { id: 'Tamil', label: 'தமிழ் — Tamil (ta-IN)' },
  { id: 'Telugu', label: 'తెలుగు — Telugu (te-IN)' },
  { id: 'Malayalam', label: 'മലയാളം — Malayalam (ml-IN)' },
];

const DEFAULT_SUGGESTIONS = [
  'Summarize this document in 3 simple bullet points.',
  'What are the most important deadlines, amounts, or medicines mentioned?',
  'Explain the difficult terms in everyday plain language.',
];

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const VoiceAssistantTab = ({
  documents = [],
  selectedDoc = null,
  onActivityLogged,
}) => {
  const {
    speak,
    playBase64Audio,
    stopSpeech,
    isSpeaking,
    activeSpeechId,
    announce,
  } = useAccessibility();

  const [contextDocId, setContextDocId] = useState(
    selectedDoc?._id || documents[0]?.['_id'] || ''
  );
  const [language, setLanguage] = useState('English');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [autoSendVoice, setAutoSendVoice] = useState(true);

  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micStatusText, setMicStatusText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hello! I am your ACCESSMATE AI Voice Assistant. Select any saved document on the left for context, click "Tap to Speak" to record your voice question in any of the 6 Indian languages, and click "Stop & Send" when finished!',
      language: 'English',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const latestTranscriptRef = useRef('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!contextDocId && (selectedDoc?._id || documents[0]?._id)) {
      setContextDocId(selectedDoc?._id || documents[0]?._id || '');
    }
  }, [selectedDoc, documents, contextDocId]);

  const cleanupMicResources = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore
      }
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupMicResources();
    };
  }, [cleanupMicResources]);

  const activeDocument = documents.find((d) => d._id === contextDocId) || null;

  const sendPayloadToAssistant = useCallback(
    async ({ text = '', audioBase64 = null, audioMimeType = 'audio/webm' }) => {
      const cleanText = String(text || '').trim();
      if ((!cleanText && !audioBase64) || sending) return;

      setError('');
      stopSpeech();

      const tempUserMsgId = `user-${Date.now()}`;
      const userMsg = {
        id: tempUserMsgId,
        role: 'user',
        content: cleanText || '🎙️ [Transcribing spoken voice...]',
        language,
        documentTitle: activeDocument?.title || null,
        timestamp: new Date().toISOString(),
      };

      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');
      setSending(true);
      announce(
        cleanText
          ? `Sending question to ACCESSMATE AI Voice Assistant: ${cleanText}`
          : 'Transcribing your voice and generating an accessible response.'
      );

      try {
        const { data } = await api.post('/assistant/chat', {
          message: cleanText,
          audioBase64,
          audioMimeType,
          documentId: contextDocId || null,
          language,
          history: historyPayload,
        });

        const transcribedUserText = data?.userTranscript || cleanText || 'Voice question';
        const replyText =
          data?.reply ||
          'I processed your question. Please let me know if you would like more details.';
        const replyLang = data?.language || language;
        const assistantMsgId = `assistant-${Date.now()}`;

        const assistantMsg = {
          id: assistantMsgId,
          role: 'assistant',
          content: replyText,
          language: replyLang,
          documentTitle: data?.documentTitle || activeDocument?.title || null,
          aiMode: data?.aiMode || 'neural-ai',
          ttsAudioBase64: data?.ttsAudioBase64 || null,
          ttsProvider: data?.ttsProvider || null,
          timestamp: new Date().toISOString(),
        };

        // Render AI text reply on screen IMMEDIATELY as soon as /api/assistant/chat resolves
        setMessages((prev) =>
          prev
            .map((m) =>
              m.id === tempUserMsgId ? { ...m, content: transcribedUserText } : m
            )
            .concat(assistantMsg)
        );
        setSending(false);

        if (Array.isArray(data?.followUpSuggestions) && data.followUpSuggestions.length > 0) {
          setSuggestions(data.followUpSuggestions);
        }

        if (onActivityLogged) {
          onActivityLogged();
        }

        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);

        // Fetch ultra-fast neural TTS asynchronously without blocking text display
        if (autoSpeak) {
          (async () => {
            try {
              const ttsRes = await api.post('/tts', {
                text: replyText.slice(0, 350),
              });
              const audioBase64 = ttsRes.data?.audioBase64;
              if (audioBase64) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          ttsAudioBase64: audioBase64,
                          ttsProvider: ttsRes.data?.provider || 'neural-voice',
                        }
                      : m
                  )
                );
                playBase64Audio(
                  audioBase64,
                  `voice-msg-${assistantMsgId}`,
                  replyText,
                  replyLang
                );
                return;
              }
            } catch {
              // Fall back to browser speech synthesis if /api/tts is unavailable
            }
            speak(replyText, replyLang, `voice-msg-${assistantMsgId}`);
          })();
        } else {
          announce(`Voice assistant replied: ${replyText}`);
        }
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Could not reach the AI Voice Assistant right now. Please try again.';
        setError(msg);
        announce(`Error: ${msg}`);
        setSending(false);
      }
    },
    [
      sending,
      stopSpeech,
      language,
      activeDocument,
      messages,
      announce,
      contextDocId,
      onActivityLogged,
      autoSpeak,
      playBase64Audio,
      speak,
    ]
  );

  const stopAndProcessVoice = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const spokenTranscript = latestTranscriptRef.current.trim();

    if (recorder && recorder.state !== 'inactive') {
      const audioBlob = await new Promise((resolve) => {
        recorder.onstop = () => {
          const mime = recorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mime });
          resolve(blob);
        };
        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
      });
      mediaRecorderRef.current = null;
      cleanupMicResources();
      setIsListening(false);
      setMicStatusText('');

      if (audioBlob && audioBlob.size > 300) {
        try {
          const base64Audio = await blobToBase64(audioBlob);
          const mimeType = audioBlob.type || 'audio/webm';

          if (!autoSendVoice) {
            setMicStatusText('Transcribing your spoken voice...');
            const { data } = await api.post('/assistant/transcribe', {
              audioBase64: base64Audio,
              audioMimeType: mimeType,
              language,
            });
            setMicStatusText('');
            const finalText = data?.text || spokenTranscript;
            if (finalText) {
              setInputMessage(finalText);
              announce(`Transcribed voice: ${finalText}. Press Ask AI to send.`);
              return;
            }
          } else {
            await sendPayloadToAssistant({
              text: spokenTranscript,
              audioBase64: base64Audio,
              audioMimeType: mimeType,
            });
            return;
          }
        } catch {
          setMicStatusText('');
        }
      }

      if (spokenTranscript) {
        if (autoSendVoice) {
          await sendPayloadToAssistant({ text: spokenTranscript });
        } else {
          setInputMessage(spokenTranscript);
        }
        return;
      }

      setError(
        'No voice audio was detected. Please speak clearly into your microphone and click "Stop & Send".'
      );
      return;
    }

    cleanupMicResources();
    setIsListening(false);
    setMicStatusText('');

    if (spokenTranscript) {
      if (autoSendVoice) {
        await sendPayloadToAssistant({ text: spokenTranscript });
      } else {
        setInputMessage(spokenTranscript);
      }
    }
  }, [autoSendVoice, cleanupMicResources, language, sendPayloadToAssistant, announce]);

  const handleToggleMic = async () => {
    if (isListening) {
      await stopAndProcessVoice();
      return;
    }

    setError('');
    stopSpeech();
    latestTranscriptRef.current = '';
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        'Microphone access is not available in this browser context. Make sure you are accessing http://localhost:5173.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsListening(true);
      setMicStatusText(
        `Recording in ${language} — Speak now, then click "Stop & Send" when done.`
      );
      announce(`Microphone recording in ${language}. Speak your question now.`);

      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        try {
          const recognition = new SpeechRecognitionAPI();
          recognition.lang = LANGUAGE_LOCALE_MAP[language] || 'en-US';
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i += 1) {
              transcript += event.results[i][0].transcript;
            }
            latestTranscriptRef.current = transcript;
            setInputMessage(transcript);

            if (autoSendVoice && transcript.trim().length > 2) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                stopAndProcessVoice();
              }, 2400);
            }
          };

          recognition.onerror = () => {
            // Recorded MediaRecorder audio is handled automatically
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // Recorded MediaRecorder audio is handled automatically
        }
      }
    } catch (err) {
      cleanupMicResources();
      setIsListening(false);
      setMicStatusText('');
      const permMsg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Microphone permission was blocked. Please click the site settings icon next to http://localhost:5173 in your Chrome address bar and allow Microphone access.'
          : `Could not access microphone (${err?.message || 'check device settings'}).`;
      setError(permMsg);
      announce(permMsg);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;
    sendPayloadToAssistant({ text: inputMessage });
  };

  const handleClearChat = () => {
    stopSpeech();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Conversation cleared. Select any saved document on the left or press "Tap to Speak" to ask a new question.',
        language: 'English',
        timestamp: new Date().toISOString(),
      },
    ]);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setError('');
    announce('Voice assistant conversation cleared.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Document Context, Voice Settings & Mic Controls */}
      <div className="lg:col-span-4 space-y-6">
        <section
          aria-labelledby="voice-settings-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 hc-card"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2
              id="voice-settings-heading"
              className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <Mic className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
              <span>AI Voice Assistant</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900">
              Neural Voice AI
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed hc-muted">
            Speak or type questions in 6 Indian languages. Select any saved document below so the
            assistant answers using your document&rsquo;s exact details and reads replies aloud.
          </p>

          {/* 1. Saved Document Context Selector */}
          <div>
            <label
              htmlFor="voice-assistant-doc-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5 hc-muted"
            >
              <FileText className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
              <span>Document Context (Optional)</span>
            </label>
            <select
              id="voice-assistant-doc-select"
              value={contextDocId}
              onChange={(e) => {
                const nextId = e.target.value;
                setContextDocId(nextId);
                const docObj = documents.find((d) => d._id === nextId);
                announce(
                  docObj
                    ? `Selected document context: ${docObj.title}`
                    : 'Switched to general accessibility assistant without a specific document'
                );
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-slate-50 text-slate-900 focus:border-[#2563EB] hc-input"
            >
              <option value="">
                General Accessibility Assistant (No specific document)
              </option>
              {documents.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.title} {doc.isSample ? '(Sample)' : ''}
                </option>
              ))}
            </select>

            {activeDocument && (
              <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1 hc-surface">
                <div className="font-bold text-[#4338CA] truncate hc-muted">
                  Active Context: {activeDocument.title}
                </div>
                <p className="text-slate-700 line-clamp-2 leading-relaxed hc-muted">
                  {activeDocument.summary}
                </p>
              </div>
            )}
          </div>

          {/* 2. Voice & Response Language */}
          <div>
            <label
              htmlFor="voice-assistant-lang-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5 hc-muted"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
              <span>Voice &amp; Response Language</span>
            </label>
            <select
              id="voice-assistant-lang-select"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                announce(`Voice assistant language set to ${e.target.value}`);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-slate-50 text-slate-900 focus:border-[#2563EB] hc-input"
            >
              {VOICE_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Primary Big Microphone Button */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={handleToggleMic}
              disabled={sending}
              aria-pressed={isListening}
              aria-label={
                isListening
                  ? 'Stop microphone recording and send question'
                  : `Start microphone voice input in ${language}`
              }
              className={`w-full py-4 px-5 rounded-2xl font-extrabold text-sm sm:text-base shadow-md flex items-center justify-center gap-3 transition-all ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-[#4338CA] to-[#2563EB] hover:from-indigo-700 hover:to-blue-600 text-white hc-accent'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Listening... Click to Stop &amp; Send</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Tap to Speak ({language})</span>
                </>
              )}
            </button>

            {micStatusText && (
              <div
                role="status"
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center hc-surface"
              >
                🎙️ {micStatusText}
              </div>
            )}
          </div>

          {/* 4. Voice Preferences Checkboxes */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 text-xs sm:text-sm">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-4 h-4 rounded text-[#4338CA] focus:ring-[#2563EB]"
              />
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 hc-muted">
                <Volume2 className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                <span>Auto-speak replies (Neural Voice)</span>
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSendVoice}
                onChange={(e) => setAutoSendVoice(e.target.checked)}
                className="w-4 h-4 rounded text-[#4338CA] focus:ring-[#2563EB]"
              />
              <span className="font-semibold text-slate-700 hc-muted">
                Auto-send question when I stop recording
              </span>
            </label>
          </div>
        </section>
      </div>

      {/* Right Column: Interactive Conversation & Suggested Prompts */}
      <div className="lg:col-span-8 flex flex-col">
        <section
          aria-labelledby="voice-chat-heading"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 hc-card"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
                <h3
                  id="voice-chat-heading"
                  className="text-lg sm:text-xl font-extrabold text-[#0F172A] hc-muted"
                >
                  Interactive Voice &amp; Text Conversation
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 hc-muted">
                {activeDocument
                  ? `Grounded in document: "${activeDocument.title}"`
                  : 'General accessibility & plain-language assistant mode'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearChat}
              aria-label="Clear voice assistant conversation"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors hc-surface"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Chat</span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Messages Log */}
          <div
            role="log"
            aria-live="polite"
            aria-label="Voice Assistant Conversation History"
            className="space-y-4 max-h-[420px] overflow-y-auto pr-1"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const msgSpeechId = `voice-msg-${msg.id}`;
              const isThisMsgPlaying = isSpeaking && activeSpeechId === msgSpeechId;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-4 space-y-2.5 ${
                      isUser
                        ? 'bg-[#4338CA] text-white hc-accent'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 hc-surface'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-extrabold uppercase tracking-wider ${
                          isUser ? 'text-indigo-200' : 'text-[#4338CA] hc-muted'
                        }`}
                      >
                        {isUser ? 'You' : 'ACCESSMATE AI'}
                      </span>
                      {msg.documentTitle && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isUser
                              ? 'bg-indigo-900/60 text-indigo-100'
                              : 'bg-teal-100 text-teal-900'
                          }`}
                        >
                          Doc: {msg.documentTitle}
                        </span>
                      )}
                    </div>

                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {msg.content}
                    </p>

                    {!isUser && (
                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/80">
                        <span className="text-[11px] text-slate-500 font-medium hc-muted">
                          Language: {msg.language || 'English'}
                          {msg.ttsAudioBase64 ? ' • Neural Audio' : ''}
                        </span>
                        {msg.ttsAudioBase64 ? (
                          <button
                            type="button"
                            onClick={() =>
                              playBase64Audio(
                                msg.ttsAudioBase64,
                                msgSpeechId,
                                msg.content,
                                msg.language || language
                              )
                            }
                            aria-pressed={isThisMsgPlaying}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition-all shadow-sm ${
                              isThisMsgPlaying
                                ? 'bg-rose-600 text-white hover:bg-rose-700'
                                : 'bg-[#0D9488] text-white hover:bg-teal-700 hc-accent'
                            }`}
                          >
                            {isThisMsgPlaying ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Play Neural Voice</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <ListenButton
                            text={msg.content}
                            language={msg.language || language}
                            speechId={msgSpeechId}
                            label="Listen Reply"
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4338CA] p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 hc-surface">
                <Sparkles className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>
                  ACCESSMATE AI is preparing your spoken response...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Follow-Up Suggestions */}
          {suggestions?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 hc-muted">
                <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
                <span>Quick Spoken/Click Prompts:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={sending}
                    onClick={() => sendPayloadToAssistant({ text: promptText })}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-[#4338CA] border border-indigo-200 hover:bg-indigo-100 transition-colors text-left disabled:opacity-50 hc-surface"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <label htmlFor="voice-assistant-input" className="sr-only">
              Speak or type your message to the ACCESSMATE AI Voice Assistant
            </label>
            <div className="relative flex-1 flex items-center">
              <input
                id="voice-assistant-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  isListening
                    ? 'Recording microphone... Speak now, then click Stop & Send'
                    : `Ask a question in ${language} (or tap the mic button)...`
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm sm:text-base focus:border-[#2563EB] hc-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMic}
                disabled={sending}
                aria-pressed={isListening}
                aria-label={isListening ? 'Stop voice input and send' : 'Start voice input'}
                className={`px-4 py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-1.5 border transition-colors ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                    : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hc-surface'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Mic className="w-4 h-4 text-[#4338CA]" aria-hidden="true" />
                )}
                <span className="sm:inline">{isListening ? 'Stop & Send' : 'Mic'}</span>
              </button>

              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                aria-busy={sending}
                className="px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 hc-accent"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{sending ? 'Sending...' : 'Ask AI'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

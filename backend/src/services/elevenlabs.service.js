import { env, isPlaceholderElevenLabsKey } from '../config/env.js';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// ISO-639-3 language codes supported by ElevenLabs Scribe v1
const SCRIBE_LANGUAGE_CODES = {
  English: 'eng',
  Kannada: 'kan',
  Hindi: 'hin',
  Tamil: 'tam',
  Telugu: 'tel',
  Malayalam: 'mal',
};

let sttPermissionDenied = false;

export const elevenlabsService = {
  isConfigured() {
    return !isPlaceholderElevenLabsKey(env.ELEVENLABS_API_KEY);
  },

  /**
   * 1. ElevenLabs Scribe v1 Speech-to-Text (Microphone Voice -> Text)
   */
  async speechToText({ audioBase64, mimeType = 'audio/webm', language = 'English' }) {
    if (!this.isConfigured() || !audioBase64 || sttPermissionDenied) {
      return null;
    }

    const cleanBase64 = String(audioBase64).includes(',')
      ? String(audioBase64).split(',')[1]
      : String(audioBase64);
    const audioBuffer = Buffer.from(cleanBase64, 'base64');

    if (audioBuffer.length < 100) {
      return null;
    }

    const ext = mimeType.includes('mp4')
      ? 'mp4'
      : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('wav')
      ? 'wav'
      : 'webm';

    const formData = new FormData();
    formData.append('model_id', 'scribe_v1');
    const langCode = SCRIBE_LANGUAGE_CODES[language];
    if (langCode) {
      formData.append('language_code', langCode);
    }
    formData.append(
      'file',
      new Blob([audioBuffer], { type: mimeType || 'audio/webm' }),
      `voice_input.${ext}`
    );

    const response = await fetch(`${ELEVENLABS_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 401 || response.status === 403) {
        sttPermissionDenied = true;
      }
      throw new Error(`ElevenLabs STT error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const transcribedText = String(data?.text || '').trim();
    return {
      text: transcribedText,
      languageCode: data?.language_code || langCode || 'eng',
      provider: 'elevenlabs-scribe-v1',
    };
  },

  /**
   * 2. ElevenLabs Flash v2.5 Ultra-Low-Latency Text-to-Speech (75ms model, trimmed to 350 chars)
   */
  async textToSpeech({ text, voiceId = env.ELEVENLABS_VOICE_ID }) {
    if (!this.isConfigured() || !text || !String(text).trim()) {
      return null;
    }

    const cleanedText = String(text)
      .replace(/[#*_`~>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 350);

    const targetVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb';

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanedText,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`TTS error (${response.status}): ${errBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    return {
      audioBase64: base64Audio,
      mimeType: 'audio/mpeg',
      provider: 'eleven_flash_v2_5',
    };
  },
};

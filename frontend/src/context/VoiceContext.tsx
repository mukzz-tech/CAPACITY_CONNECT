import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startWavRecording } from '../utils/wavRecorder';

export interface VoiceContextType {
  isVoiceActive: boolean;
  toggleVoice: () => Promise<void>;
  lastRecognizedPhrase: string;
  isListening: boolean;
  supported: boolean;
  audioLevel: number;
  lastActionStatus: string;
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  speakText: (text: string, lang?: string, onComplete?: () => void) => void;
  playTone: (freq?: number, duration?: number) => void;
  pauseListening: () => void;
  resumeListening: () => void;
  captureVoiceInput: (promptMessage?: string) => Promise<string>;
  simulateVoiceInput: (phrase: string) => boolean;
  pythonVoiceOnline: boolean;
  checkPythonStatus: () => Promise<boolean>;
  transcribeAudioWithPython: (audioBlob: Blob, language?: string) => Promise<{ transcript: string; command: any } | null>;
  recordAndProcessWithPython: (durationMs?: number) => Promise<{ transcript: string; command: any } | null>;
  listenWithPythonHardwareMic: () => Promise<{ transcript: string; command: any } | null>;
  executeParsedCommand: (cmd: any) => boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Auto-fill active editable input/textarea ONLY if user is currently focused on it
export const fillActiveInput = (text: string, forceTarget = false): boolean => {
  try {
    const el = document.activeElement as HTMLElement | null;

    const isEditable = (node: Element | null): node is HTMLInputElement | HTMLTextAreaElement => {
      if (!node) return false;
      if (node instanceof HTMLInputElement) {
        return (
          ['text', 'search', 'email', 'url', 'tel', 'number', ''].includes(node.type) &&
          !node.disabled &&
          !node.readOnly
        );
      }
      if (node instanceof HTMLTextAreaElement) {
        return !node.disabled && !node.readOnly;
      }
      return false;
    };

    // Only fill if an input is explicitly focused, or if forceTarget was explicitly requested
    if (!isEditable(el)) {
      if (!forceTarget) return false;
      const firstInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        'input[type="text"]:not([disabled]):not([readonly]), input[type="search"]:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
      );
      if (!firstInput) return false;
      firstInput.focus();
      return fillActiveInput(text, false);
    }

    const prototype =
      el instanceof HTMLInputElement
        ? window.HTMLInputElement.prototype
        : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (nativeSetter) {
      nativeSetter.call(el, text);
    } else {
      el.value = text;
    }

    // Trigger synthetic React events
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // Visual flash confirmation
    const prevOutline = el.style.outline;
    const prevTransition = el.style.transition;
    el.style.transition = 'outline 0.15s ease-in-out';
    el.style.outline = '3px solid #38bdf8';
    setTimeout(() => {
      if (el) {
        el.style.outline = prevOutline;
        el.style.transition = prevTransition;
      }
    }, 600);

    return true;
  } catch (e) {
    console.warn('Auto-fill input error:', e);
    return false;
  }
};

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('imd_voice_active') !== 'false';
    } catch {
      return true;
    }
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastRecognizedPhrase, setLastRecognizedPhrase] = useState<string>('');
  const [lastActionStatus, setLastActionStatus] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [supported, setSupported] = useState<boolean>(true);
  const [pythonVoiceOnline, setPythonVoiceOnline] = useState<boolean>(false);

  const [currentLanguage, setCurrentLanguageState] = useState<string>('en-IN');
  const recognitionLangRef = useRef<string>('en-IN');

  const setLanguage = (lang: string) => {
    setCurrentLanguageState(lang);
    recognitionLangRef.current = lang;
    webSpeechBlockedRef.current = false;
    stopActiveSession();
    if (isVoiceActiveRef.current && !isPausedRef.current) {
      startNewListeningSession();
    }
  };

  const activeRecognitionRef = useRef<any>(null);
  const isSessionStartingRef = useRef<boolean>(false);
  const isVoiceActiveRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<any>(null);
  const lastCmdTimeRef = useRef<number>(0);
  const webSpeechBlockedRef = useRef<boolean>(false);

  // Audio Stream & VU Meter refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Python Voice Service Polling refs
  const lastPolledIdRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
  }, [isVoiceActive]);

  // Audio tone feedback using Web Audio API (Instant & 100% reliable)
  const playTone = (freq = 520, duration = 0.12) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio tone error', e);
    }
  };

  // Vocal spoken confirmation with non-blocking safety timer
  const speakText = (text: string, lang = 'en-US', onComplete?: () => void) => {
    try {
      if (!('speechSynthesis' in window)) {
        onComplete?.();
        return;
      }

      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang;
          utterance.rate = 1.05;

          const voices = window.speechSynthesis.getVoices();
          const matched = voices.find((v) =>
            lang.startsWith('ta')
              ? v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil')
              : lang.startsWith('hi')
              ? v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
              : v.lang.toLowerCase().includes('en')
          );
          if (matched) utterance.voice = matched;

          utterance.onend = () => onComplete?.();
          utterance.onerror = () => onComplete?.();

          window.speechSynthesis.speak(utterance);
        } catch {
          onComplete?.();
        }
      }, 30);
    } catch {
      onComplete?.();
    }
  };

  // Verifies microphone access without locking the hardware device
  const startMicAudioMeter = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true },
        });
        // Immediately stop tracks to free Windows hardware lock for SpeechRecognition
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
      }
    } catch (e) {
      console.warn('Mic permission check warning:', e);
    }
  };

  const stopMicAudioMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
      });
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Poll Python Voice Service status
  const checkPythonStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/voice/status');
      if (res.ok) {
        const data = await res.json();
        const isOnline = !!data.online;
        setPythonVoiceOnline(isOnline);
        return isOnline;
      }
    } catch {
      setPythonVoiceOnline(false);
    }
    return false;
  };

  // Continuous background poller querying Python's physical microphone listener
  const pollPythonVoiceService = async () => {
    if (!isVoiceActiveRef.current || isPausedRef.current || isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const res = await fetch(`/api/voice/poll?since=${lastPolledIdRef.current}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latest_id !== undefined) {
          if (lastPolledIdRef.current === 0) {
            // First run: synchronize to latest event so we don't replay stale commands
            lastPolledIdRef.current = data.latest_id;
          }
        }
        if (data.has_command && data.event) {
          const { id, transcript, command } = data.event;
          if (id > lastPolledIdRef.current) {
            lastPolledIdRef.current = id;
            console.log('[Python Direct Mic Heard]:', transcript, command);
            setLastRecognizedPhrase(transcript);
            setAudioLevel(95);
            setTimeout(() => setAudioLevel(0), 1200);

            if (command) {
              executeParsedCommand(command);
            } else {
              processVoiceCommand(transcript);
            }
          }
        }
      }
    } catch {
      // Background network blip or service reload
    } finally {
      isPollingRef.current = false;
    }
  };

  // Centralized command dispatcher from Python NLP or local matcher
  const executeParsedCommand = (cmd: any): boolean => {
    if (!cmd || !cmd.action) return false;
    const now = Date.now();
    lastCmdTimeRef.current = now;

    if (cmd.tone) playTone(cmd.tone, 0.12);

    if (cmd.action === 'VOICE_ON') {
      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      try { localStorage.setItem('imd_voice_active', 'true'); } catch {}
      playTone(520, 0.1);
      setTimeout(() => playTone(780, 0.15), 120);
      setLastActionStatus('🎙️ Voice Active — Speak any page to navigate');
      speakText('Voice active. Speak any page to navigate.');
      startNewListeningSession();
      setTimeout(() => {
        setLastRecognizedPhrase('');
        setLastActionStatus('');
      }, 2500);
      return true;
    }

    if (cmd.action === 'VOICE_OFF') {
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
      try { localStorage.setItem('imd_voice_active', 'false'); } catch {}
      playTone(320, 0.15);
      setLastRecognizedPhrase('');
      setLastActionStatus('');
      speakText('Voice deactivated');
      stopActiveSession();
      return true;
    }

    if (cmd.action === 'NAVIGATE' && cmd.target) {
      console.log('[Voice Navigation Triggered]: Target ->', cmd.target);
      setLastActionStatus(cmd.description || `Navigating to ${cmd.target}...`);
      playTone(620, 0.1);
      try {
        navigate(cmd.target);
      } catch {
        window.location.pathname = cmd.target;
      }
      window.dispatchEvent(new CustomEvent('imd-voice-navigate', { detail: cmd.target }));
      // Auto-disappear speech display after smooth navigation (1.2s)
      setTimeout(() => {
        setLastRecognizedPhrase('');
        setLastActionStatus('');
      }, 1200);
      return true;
    }

    if (cmd.action === 'SCROLL') {
      const dir = cmd.direction || 'down';
      setLastActionStatus(cmd.description || `Scrolling ${dir}...`);
      if (dir === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (dir === 'bottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else if (dir === 'up') {
        window.scrollBy({ top: -window.innerHeight * 0.7, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
      }
      return true;
    }

    if (cmd.action === 'HELP') {
      const open = cmd.open !== false;
      setLastActionStatus(cmd.description || (open ? 'Voice Help Opened' : 'Voice Help Closed'));
      window.dispatchEvent(new CustomEvent('imd-voice-help', { detail: { open } }));
      if (open) {
        speakText('Voice commands active. Say: courses, profile, home, study, or chatbot to navigate.');
      }
      return true;
    }

    if (cmd.action === 'SET_LANGUAGE') {
      const lang = cmd.language || 'en-IN';
      setLanguage(lang);
      const isHi = lang.startsWith('hi');
      const isTa = lang.startsWith('ta');
      setLastActionStatus(isTa ? 'மொழி: தமிழ் (Tamil)' : isHi ? 'भाषा: हिन्दी (Hindi)' : 'Language: English');
      speakText(
        isTa ? 'தமிழ் குரல் வழிசெலுத்தல் செயல்படுத்தப்பட்டது' : isHi ? 'हिन्दी भाषा सक्रिय है' : 'English voice navigation activated',
        isTa ? 'ta-IN' : isHi ? 'hi-IN' : 'en-IN'
      );
      return true;
    }

    if (cmd.action === 'CAMERA_TEST') {
      setLastActionStatus(cmd.description || 'Opening Camera Diagnostics...');
      navigate('/profile');
      window.dispatchEvent(new CustomEvent('imd-voice-test-camera'));
      return true;
    }

    if (cmd.action === 'VIDEO_PLAY') {
      setLastActionStatus(cmd.description || 'Playing lecture video...');
      window.dispatchEvent(new CustomEvent('imd-voice-video-play'));
      return true;
    }

    if (cmd.action === 'VIDEO_PAUSE') {
      setLastActionStatus(cmd.description || 'Paused lecture video');
      window.dispatchEvent(new CustomEvent('imd-voice-video-pause'));
      return true;
    }

    if (cmd.action === 'VIDEO_SPEED') {
      const speed = cmd.speed || 1.0;
      setLastActionStatus(cmd.description || `Video speed set to ${speed}x`);
      window.dispatchEvent(new CustomEvent('imd-voice-speed', { detail: speed }));
      return true;
    }

    if (cmd.action === 'MODULE_NEXT') {
      setLastActionStatus(cmd.description || 'Next Lecture Topic');
      window.dispatchEvent(new CustomEvent('imd-voice-next-module'));
      return true;
    }

    if (cmd.action === 'MODULE_PREV') {
      setLastActionStatus(cmd.description || 'Previous Lecture Topic');
      window.dispatchEvent(new CustomEvent('imd-voice-prev-module'));
      return true;
    }

    if (cmd.action === 'READ_ALOUD') {
      setLastActionStatus(cmd.description || 'Reading notes aloud...');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
      return true;
    }

    if (cmd.action === 'READ_QUESTION') {
      setLastActionStatus(cmd.description || 'Reading question aloud...');
      window.dispatchEvent(new CustomEvent('imd-voice-read-question'));
      return true;
    }

    if (cmd.action === 'STOP') {
      setLastActionStatus(cmd.description || 'Audio & Video stopped');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('imd-voice-stop'));
      window.dispatchEvent(new CustomEvent('imd-voice-video-pause'));
      return true;
    }

    if (cmd.action === 'ASSESSMENT_SUBMIT') {
      setLastActionStatus(cmd.description || 'Submitting Assessment...');
      window.dispatchEvent(new CustomEvent('imd-voice-submit'));
      return true;
    }

    if (cmd.action === 'ASSESSMENT_NEXT') {
      setLastActionStatus(cmd.description || 'Next Question');
      window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
      return true;
    }

    if (cmd.action === 'ASSESSMENT_PREV') {
      setLastActionStatus(cmd.description || 'Previous Question');
      window.dispatchEvent(new CustomEvent('imd-voice-prev-question'));
      return true;
    }

    if (cmd.action === 'ASSESSMENT_JUMP') {
      const qNum = cmd.questionNumber || 1;
      setLastActionStatus(cmd.description || `Jump to Question ${qNum}`);
      window.dispatchEvent(new CustomEvent('imd-voice-jump-question', { detail: qNum }));
      return true;
    }

    if (cmd.action === 'OPTION_SELECT' && cmd.option) {
      setLastActionStatus(cmd.description || `Selected Option ${cmd.option}`);
      window.dispatchEvent(new CustomEvent('imd-voice-option-select', { detail: cmd.option }));
      return true;
    }

    if (cmd.action === 'CLEAR_ANSWER') {
      setLastActionStatus(cmd.description || 'Cleared Question Answer');
      window.dispatchEvent(new CustomEvent('imd-voice-clear-answer'));
      return true;
    }

    if (cmd.action === 'CHATBOT_SEND') {
      setLastActionStatus(cmd.description || 'Sending AI Chat message...');
      window.dispatchEvent(new CustomEvent('imd-voice-send-message'));
      return true;
    }

    if (cmd.action === 'CHATBOT_CLEAR') {
      setLastActionStatus(cmd.description || 'Cleared Chat History');
      window.dispatchEvent(new CustomEvent('imd-voice-clear-chat'));
      return true;
    }

    if (cmd.action === 'COURSE_FILTER') {
      setLastActionStatus(cmd.description || `Course Filter: ${cmd.filter}`);
      window.dispatchEvent(new CustomEvent('imd-voice-filter', { detail: cmd.filter }));
      return true;
    }

    if (cmd.action === 'ENROLL') {
      setLastActionStatus(cmd.description || 'Enrolling in course...');
      window.dispatchEvent(new CustomEvent('imd-voice-enroll'));
      return true;
    }

    if (cmd.action === 'CLEAR_INPUT') {
      fillActiveInput('', true);
      setLastActionStatus(cmd.description || 'Cleared Input Box');
      return true;
    }

    if (cmd.action === 'FILL_INPUT' && cmd.fill_text !== undefined) {
      const filled = fillActiveInput(cmd.fill_text, true);
      setLastActionStatus(cmd.description || `Filled box: "${cmd.fill_text}"`);
      window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: cmd.fill_text }));
      return filled;
    }

    if (cmd.action === 'GENERAL_INPUT' && cmd.fill_text) {
      const filled = fillActiveInput(cmd.fill_text, false);
      if (filled) {
        setLastActionStatus(`Filled box: "${cmd.fill_text}"`);
      } else {
        setLastActionStatus(`Heard: "${cmd.fill_text}"`);
      }
      window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: cmd.fill_text }));
      return filled;
    }

    return false;
  };

  // Send WAV Blob to Python Speech Recognition module
  const transcribeAudioWithPython = async (
    audioBlob: Blob,
    language = recognitionLangRef.current || 'en-IN'
  ): Promise<{ transcript: string; command: any } | null> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('language', language);

      let response = await fetch(`/api/voice/transcribe?language=${encodeURIComponent(language)}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        try {
          response = await fetch(`http://127.0.0.1:5005/transcribe?language=${encodeURIComponent(language)}`, {
            method: 'POST',
            body: formData,
          });
        } catch {}
      }

      const data = await response.json();
      if (data.success && data.transcript) {
        setLastRecognizedPhrase(data.transcript);
        if (data.command) {
          executeParsedCommand(data.command);
        } else {
          processVoiceCommand(data.transcript);
        }
        return data;
      } else if (data.error) {
        setLastActionStatus(data.error);
      }
      return null;
    } catch (err: any) {
      console.warn('[Python Voice Transcription Error]:', err.message);
      return null;
    }
  };

  // Directly triggers Python's native hardware microphone single-phrase capture
  const listenWithPythonHardwareMic = async (): Promise<{ transcript: string; command: any } | null> => {
    pauseListening();
    playTone(580, 0.12);
    setLastActionStatus('🎙️ Listening directly through hardware microphone (Python)...');
    setAudioLevel(90);

    try {
      const res = await fetch('/api/voice/listen-once', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: recognitionLangRef.current || 'en-IN' }),
      });

      const data = await res.json();
      setAudioLevel(0);
      resumeListening();

      if (res.ok && data.success && data.transcript) {
        setLastRecognizedPhrase(data.transcript);
        if (data.command) {
          executeParsedCommand(data.command);
        } else {
          processVoiceCommand(data.transcript);
        }
        return data;
      } else {
        const errMsg = data.error || 'No speech detected';
        setLastActionStatus(errMsg);
        return null;
      }
    } catch (err: any) {
      setAudioLevel(0);
      resumeListening();
      console.warn('[Python Direct Mic Error]:', err.message);
      setLastActionStatus('Microphone capture error');
      return null;
    }
  };

  // Record audio via high-fidelity browser WAV capture, with direct Python hardware mic fallback
  const recordAndProcessWithPython = async (
    durationMs = 3200
  ): Promise<{ transcript: string; command: any } | null> => {
    pauseListening();
    playTone(580, 0.12);
    setLastActionStatus('🎙️ Listening... Speak now!');

    try {
      const session = await startWavRecording({
        onLevel: (lvl) => setAudioLevel(lvl),
      });

      await new Promise((resolve) => setTimeout(resolve, durationMs));

      setLastActionStatus('⚡ Analyzing speech with Python engine...');
      const wavBlob = await session.stop();

      if (!wavBlob) {
        setLastActionStatus('No audio detected');
        resumeListening();
        return null;
      }

      const result = await transcribeAudioWithPython(wavBlob);
      resumeListening();
      return result;
    } catch (err: any) {
      console.warn('[Voice Capture] Browser audio capture unavailable, falling back to Python hardware mic:', err.message);
      const directRes = await listenWithPythonHardwareMic();
      resumeListening();
      return directRes;
    }
  };

  // Core Command & Box-Filling Router
  const processVoiceCommand = (rawPhrase: string): boolean => {
    if (!rawPhrase || !rawPhrase.trim()) return false;

    // Clean punctuation
    const clean = rawPhrase
      .toLowerCase()
      .replace(/[.,!?;:'"()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return false;

    // Stripped of conversational prefixes/suffixes
    const stripped = clean
      .replace(/^(go to|navigate to|navigate|open|show|take me to|take me|switch to|move to|load|visit|head to|view|display|please open|please go to|please navigate to|jump to|i want to see|i want to go to|i want to open|kholo|jao)\s+/i, '')
      .replace(/\s+(kholo|jao|dikhao|par jao|hogu|ge hogu|torsu|nodu|open maadu|maadu|page|screen|section|tab|view|portal)$/i, '')
      .trim();

    console.log('[Voice Engine Phrase Process]: Raw:', rawPhrase, '| Clean:', clean, '| Stripped:', stripped);
    setLastRecognizedPhrase(rawPhrase.trim());

    // 0. Voice Wake-Word Activation & Deactivation (Hands-free control)
    const isWakeOn =
      clean === 'voice command on' ||
      clean === 'voice comment on' ||
      clean === 'voice comments on' ||
      clean === 'voice cmt on' ||
      clean === 'voice on' ||
      clean === 'start voice' ||
      clean === 'activate voice' ||
      clean === 'turn on voice' ||
      clean === 'open voice' ||
      clean === 'voice start' ||
      clean.includes('वॉयस ऑन') ||
      clean.includes('वॉयस कमांड ऑन') ||
      clean.includes('वॉइस ऑन');

    if (isWakeOn) {
      return executeParsedCommand({ action: 'VOICE_ON' });
    }

    const isWakeOff =
      clean === 'voice command off' ||
      clean === 'voice comment off' ||
      clean === 'voice comments off' ||
      clean === 'voice cmt off' ||
      clean === 'voice off' ||
      clean === 'stop voice' ||
      clean === 'deactivate voice' ||
      clean === 'turn off voice' ||
      clean === 'mute voice' ||
      clean === 'stop listening' ||
      clean.includes('वॉयस बंद') ||
      clean.includes('आवाज़ बंद') ||
      clean.includes('वॉइस बंद');

    if (isWakeOff) {
      return executeParsedCommand({ action: 'VOICE_OFF' });
    }

    // 0.1 Hands-Free Page Scrolling
    if (clean === 'scroll down' || clean === 'page down' || clean === 'down' || clean.includes('नीचे')) {
      return executeParsedCommand({ action: 'SCROLL', direction: 'down', description: 'Scrolling down...' });
    }

    if (clean === 'scroll up' || clean === 'page up' || clean === 'up' || clean.includes('ऊपर')) {
      return executeParsedCommand({ action: 'SCROLL', direction: 'up', description: 'Scrolling up...' });
    }

    if (clean === 'scroll to top' || clean === 'top' || clean === 'go to top' || clean.includes('शुरुआत')) {
      return executeParsedCommand({ action: 'SCROLL', direction: 'top', description: 'Scrolled to top' });
    }

    if (clean === 'scroll to bottom' || clean === 'bottom' || clean === 'go to bottom' || clean.includes('अंत')) {
      return executeParsedCommand({ action: 'SCROLL', direction: 'bottom', description: 'Scrolled to bottom' });
    }

    // 0.2 Language Switching Commands
    if (clean === 'switch to tamil' || clean === 'tamil' || clean === 'tamil language' || clean === 'தமிழ்' || clean.includes('தமிழ் மொழி')) {
      return executeParsedCommand({ action: 'SET_LANGUAGE', language: 'ta-IN' });
    }

    if (clean === 'switch to hindi' || clean === 'hindi' || clean === 'hindi language' || clean === 'हिन्दी' || clean === 'हिंदी' || clean.includes('हिंदी')) {
      return executeParsedCommand({ action: 'SET_LANGUAGE', language: 'hi-IN' });
    }

    if (clean === 'switch to english' || clean === 'english' || clean === 'english language' || clean === 'ஆங்கிலம்' || clean === 'अंग्रेजी') {
      return executeParsedCommand({ action: 'SET_LANGUAGE', language: 'en-IN' });
    }

    // 1. Courses Navigation (/courses)
    if (
      stripped === 'courses' ||
      stripped === 'course' ||
      stripped === 'all courses' ||
      stripped === 'browse courses' ||
      stripped === 'view courses' ||
      stripped === 'syllabus' ||
      stripped === 'catalog' ||
      stripped === 'catalogue' ||
      stripped === 'classes' ||
      stripped === 'subjects' ||
      stripped === 'coursework' ||
      stripped === 'பாடங்கள்' ||
      stripped === 'பாடம்' ||
      stripped === 'படிப்புகள்' ||
      clean.includes('course') ||
      clean.includes('syllabus') ||
      clean.includes('catalogue') ||
      clean.includes('पाठ्यक्रम') ||
      clean.includes('कोर्स') ||
      clean.includes('பாடம்') ||
      clean.includes('படிப்பு')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/courses',
        description: 'Navigating to Courses...',
        tone: 620,
      });
    }

    // 2. Profile & Certificates Navigation (/profile)
    if (
      stripped === 'profile' ||
      stripped === 'my profile' ||
      stripped === 'account' ||
      stripped === 'my account' ||
      stripped === 'user profile' ||
      stripped === 'certificates' ||
      stripped === 'certificate' ||
      stripped === 'my certificates' ||
      stripped === 'scores' ||
      stripped === 'results' ||
      stripped === 'marks' ||
      stripped === 'சுயவிவரம்' ||
      stripped === 'சான்றிதழ்' ||
      clean.includes('profile') ||
      clean.includes('certificate') ||
      clean.includes('scores') ||
      clean.includes('account') ||
      clean.includes('प्रमाणपत्र') ||
      clean.includes('प्रोफ़ाइल') ||
      clean.includes('சுயவிவரம்') ||
      clean.includes('சான்றிதழ்')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/profile',
        description: 'Opening Profile & Certificates...',
        tone: 620,
      });
    }

    // 3. Homepage / Dashboard (/)
    if (
      stripped === 'home' ||
      stripped === 'homepage' ||
      stripped === 'dashboard' ||
      stripped === 'main page' ||
      stripped === 'landing' ||
      stripped === 'portal' ||
      stripped === 'welcome' ||
      stripped === 'முகப்பு' ||
      stripped === 'முதன்மை' ||
      clean.includes('home') ||
      clean.includes('dashboard') ||
      clean.includes('होम') ||
      clean.includes('डैशबोर्ड') ||
      clean.includes('முகப்பு')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/',
        description: 'Navigating to Homepage...',
        tone: 620,
      });
    }

    // 4. Chatbot / AI Assistant (/chatbot)
    if (
      stripped === 'chatbot' ||
      stripped === 'chat' ||
      stripped === 'assistant' ||
      stripped === 'ai assistant' ||
      stripped === 'ai bot' ||
      stripped === 'ask ai' ||
      stripped === 'ask bot' ||
      stripped === 'bot' ||
      stripped === 'weather bot' ||
      stripped === 'உரையாடல்' ||
      stripped === 'உதவியாளர்' ||
      clean.includes('chatbot') ||
      clean.includes('assistant') ||
      clean.includes('चैटबॉट') ||
      clean.includes('सहायक') ||
      clean.includes('உதவியாளர்')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/chatbot',
        description: 'Opening Meteorological Assistant...',
        tone: 620,
      });
    }

    // 5. Study Material / Lectures (/study)
    if (
      stripped === 'study' ||
      stripped === 'study material' ||
      stripped === 'study materials' ||
      stripped === 'studies' ||
      stripped === 'materials' ||
      stripped === 'lecture' ||
      stripped === 'lectures' ||
      stripped === 'notes' ||
      stripped === 'study notes' ||
      stripped === 'lessons' ||
      stripped === 'learning' ||
      stripped === 'classroom' ||
      stripped === 'படிப்பு' ||
      stripped === 'பாடக் குறிப்புகள்' ||
      clean.includes('study') ||
      clean.includes('lecture') ||
      clean.includes('notes') ||
      clean.includes('अध्ययन') ||
      clean.includes('पढ़ाई') ||
      clean.includes('குறிப்புகள்')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/study',
        description: 'Opening Study Material...',
        tone: 620,
      });
    }

    // 6. Assessments & Exams Navigation
    if (
      stripped === 'assessment' ||
      stripped === 'assessments' ||
      stripped === 'exam' ||
      stripped === 'exams' ||
      stripped === 'test' ||
      stripped === 'tests' ||
      stripped === 'quiz' ||
      stripped === 'quizzes' ||
      stripped === 'take test' ||
      stripped === 'start test' ||
      stripped === 'parikshe' ||
      clean.includes('assessment') ||
      clean.includes('exam') ||
      clean.includes('test') ||
      clean.includes('परीक्षा')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/courses',
        description: 'Opening Assessments & Courses...',
        tone: 620,
      });
    }

    // 7. Login Page (/login)
    if (
      stripped === 'login' ||
      stripped === 'log in' ||
      stripped === 'sign in' ||
      stripped === 'signin' ||
      stripped === 'user login' ||
      clean.includes('login') ||
      clean.includes('log in') ||
      clean.includes('sign in') ||
      clean.includes('लॉगिन')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/login',
        description: 'Opening Login Page...',
        tone: 620,
      });
    }

    // 8. Signup Page (/signup)
    if (
      stripped === 'signup' ||
      stripped === 'sign up' ||
      stripped === 'register' ||
      stripped === 'registration' ||
      stripped === 'create account' ||
      clean.includes('signup') ||
      clean.includes('sign up') ||
      clean.includes('register') ||
      clean.includes('पंजीकरण')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/signup',
        description: 'Opening Registration...',
        tone: 620,
      });
    }

    // 9. Trainer Studio (/trainer)
    if (
      stripped === 'trainer' ||
      stripped === 'trainer studio' ||
      stripped === 'instructor' ||
      clean.includes('trainer') ||
      clean.includes('प्रशिक्षक')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/trainer',
        description: 'Opening Trainer Studio...',
        tone: 620,
      });
    }

    // 10. Admin Console (/admin)
    if (
      stripped === 'admin' ||
      stripped === 'admin console' ||
      stripped === 'admin panel' ||
      clean.includes('admin') ||
      clean.includes('व्यवस्थापक') ||
      clean.includes('एडमिन')
    ) {
      return executeParsedCommand({
        action: 'NAVIGATE',
        target: '/admin',
        description: 'Opening Admin Console...',
        tone: 620,
      });
    }

    // 11. Camera Diagnostics
    if (
      stripped === 'camera' ||
      stripped === 'webcam' ||
      stripped === 'camera test' ||
      stripped === 'test camera' ||
      clean.includes('camera') ||
      clean.includes('webcam') ||
      clean.includes('कैमरा')
    ) {
      return executeParsedCommand({
        action: 'CAMERA_TEST',
        description: 'Opening Camera Diagnostics...',
        tone: 620,
      });
    }

    // 12. Play Lecture Video
    if (
      clean === 'play video' ||
      clean === 'start video' ||
      clean === 'resume video' ||
      clean === 'listen video' ||
      clean === 'listen to video' ||
      clean === 'watch video' ||
      clean === 'lecture video' ||
      clean.includes('वीडियो चलाओ') ||
      clean.includes('लेक्चर')
    ) {
      playTone(620, 0.1);
      setLastActionStatus('Playing lecture video...');
      window.dispatchEvent(new CustomEvent('imd-voice-video-play'));
      return true;
    }

    // 13. Pause Lecture Video
    if (
      clean === 'pause video' ||
      clean === 'pause lecture' ||
      clean === 'stop video' ||
      clean.includes('वीडियो रोको')
    ) {
      playTone(450, 0.1);
      setLastActionStatus('Paused lecture video');
      window.dispatchEvent(new CustomEvent('imd-voice-video-pause'));
      return true;
    }

    // 14. Video Speed Controls
    if (clean === 'speed up' || clean === 'faster' || clean === '2x speed' || clean === 'fast') {
      playTone(650, 0.1);
      return executeParsedCommand({ action: 'VIDEO_SPEED', speed: 1.5, description: 'Speed set to 1.5x' });
    }

    if (clean === 'normal speed' || clean === 'slow down' || clean === '1x speed' || clean === 'regular speed') {
      playTone(550, 0.1);
      return executeParsedCommand({ action: 'VIDEO_SPEED', speed: 1.0, description: 'Speed set to 1.0x (Normal)' });
    }

    // 15. Study Module Navigation
    if (
      clean === 'next module' ||
      clean === 'next topic' ||
      clean === 'next lecture' ||
      clean === 'next lesson' ||
      clean.includes('अगला टॉपिक') ||
      clean.includes('अगला पाठ')
    ) {
      playTone(620, 0.1);
      return executeParsedCommand({ action: 'MODULE_NEXT', description: 'Next Lecture Topic' });
    }

    if (
      clean === 'previous module' ||
      clean === 'previous topic' ||
      clean === 'previous lecture' ||
      clean === 'previous lesson' ||
      clean.includes('पिछला टॉपिक') ||
      clean.includes('पिछला पाठ')
    ) {
      playTone(520, 0.1);
      return executeParsedCommand({ action: 'MODULE_PREV', description: 'Previous Lecture Topic' });
    }

    // 16. Read Aloud / Listen Study Notes
    if (
      clean === 'read aloud' ||
      clean === 'read notes' ||
      clean === 'read this' ||
      clean === 'listen notes' ||
      clean === 'listen study notes' ||
      clean === 'listen study' ||
      clean === 'listen to notes' ||
      clean === 'read study notes' ||
      clean === 'speak notes' ||
      clean === 'listen' ||
      clean.includes('बोलकर सुनाओ') ||
      clean.includes('पढ़ो') ||
      clean.includes('सुनो') ||
      clean.includes('नोट्स')
    ) {
      playTone(620, 0.1);
      setLastActionStatus('Reading notes aloud...');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
      return true;
    }

    // 17. Read Question Aloud
    if (
      clean === 'read question' ||
      clean === 'read question aloud' ||
      clean === 'speak question' ||
      clean === 'what is the question' ||
      clean.includes('प्रश्न पढ़ो') ||
      clean.includes('सवाल पढ़ो')
    ) {
      playTone(620, 0.1);
      return executeParsedCommand({ action: 'READ_QUESTION', description: 'Reading Question Aloud...' });
    }

    // 18. Stop / Silence Active Speech & Video
    if (
      clean === 'stop' ||
      clean === 'stop audio' ||
      clean === 'quiet' ||
      clean === 'silence' ||
      clean === 'रुको' ||
      clean === 'शांत'
    ) {
      playTone(400, 0.1);
      setLastActionStatus('Audio & Video stopped');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('imd-voice-stop'));
      window.dispatchEvent(new CustomEvent('imd-voice-video-pause'));
      return true;
    }

    // 19. Course Filtering & Enrollment
    if (clean === 'filter long duration' || clean === 'long term courses' || clean === 'long duration') {
      playTone(600, 0.1);
      return executeParsedCommand({ action: 'COURSE_FILTER', filter: 'LONG', description: 'Showing Long-Duration Courses' });
    }

    if (clean === 'filter short duration' || clean === 'short term courses' || clean === 'refresher courses') {
      playTone(600, 0.1);
      return executeParsedCommand({ action: 'COURSE_FILTER', filter: 'SHORT', description: 'Showing Short/Refresher Courses' });
    }

    if (clean === 'all courses' || clean === 'clear filter' || clean === 'reset filter') {
      playTone(600, 0.1);
      return executeParsedCommand({ action: 'COURSE_FILTER', filter: 'ALL', description: 'Showing All Courses' });
    }

    if (clean === 'enroll' || clean === 'enroll course' || clean === 'start course' || clean === 'start study' || clean.includes('नामांकन')) {
      playTone(680, 0.12);
      return executeParsedCommand({ action: 'ENROLL', description: 'Enrolling in course...' });
    }

    // 20. Chatbot AI Actions
    if (
      clean === 'send message' ||
      clean === 'send question' ||
      clean === 'send chat' ||
      clean === 'submit question' ||
      clean === 'भेजो'
    ) {
      playTone(680, 0.12);
      return executeParsedCommand({ action: 'CHATBOT_SEND', description: 'Sending Chatbot Message...' });
    }

    if (clean === 'clear chat' || clean === 'new chat' || clean === 'reset chat') {
      playTone(450, 0.1);
      return executeParsedCommand({ action: 'CHATBOT_CLEAR', description: 'Cleared Chat History' });
    }

    // 21. Submit Assessment Attempt
    if (
      clean === 'submit assessment' ||
      clean === 'submit test' ||
      clean === 'finish assessment' ||
      clean === 'submit' ||
      clean.includes('सबमिट')
    ) {
      playTone(720, 0.15);
      setLastActionStatus('Submitting Assessment...');
      window.dispatchEvent(new CustomEvent('imd-voice-submit'));
      return true;
    }

    // 22. Next Question in Assessment
    if (
      clean === 'next question' ||
      clean === 'next' ||
      clean.includes('अगला प्रश्न') ||
      clean === 'अगला'
    ) {
      playTone(620, 0.1);
      setLastActionStatus('Next Question');
      window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
      return true;
    }

    // 23. Previous Question in Assessment
    if (
      clean === 'previous question' ||
      clean === 'previous' ||
      clean === 'back' ||
      clean.includes('पिछला प्रश्न') ||
      clean === 'पिछला'
    ) {
      playTone(520, 0.1);
      setLastActionStatus('Previous Question');
      window.dispatchEvent(new CustomEvent('imd-voice-prev-question'));
      return true;
    }

    // 24. Jump to specific question ("question 1", "question 2", "go to question 4", "प्रश्न 3")
    const questionJumpMatch = clean.match(/(?:go to\s+)?(?:question|q|प्रश्न)\s*(\d+)/i);
    if (questionJumpMatch) {
      const qNum = parseInt(questionJumpMatch[1], 10);
      playTone(600, 0.1);
      return executeParsedCommand({ action: 'ASSESSMENT_JUMP', questionNumber: qNum, description: `Jump to Question ${qNum}` });
    }

    // 25. Option selection in MCQ ("Option A", "Select B", "विकल्प सी", or standalone "A", "B", "C", "D")
    const optionMatch = clean.match(
      /(?:option|select|choose|answer|विकल्प)\s*([a-d])\b|^([a-d])$/i
    );
    if (optionMatch) {
      const opt = (optionMatch[1] || optionMatch[2]).toUpperCase();
      playTone(650, 0.1);
      setLastActionStatus(`Selected Option ${opt}`);
      window.dispatchEvent(new CustomEvent('imd-voice-option-select', { detail: opt }));
      return true;
    }

    // 26. Clear active question answer in assessment
    if (clean === 'clear answer' || clean === 'erase answer' || clean === 'clear option' || clean.includes('उत्तर मिटाओ')) {
      playTone(450, 0.1);
      return executeParsedCommand({ action: 'CLEAR_ANSWER', description: 'Cleared Question Answer' });
    }

    // 27. Clear active input box
    if (
      clean === 'clear' ||
      clean === 'clear box' ||
      clean === 'clear input' ||
      clean === 'erase' ||
      clean === 'मिटाओ'
    ) {
      fillActiveInput('', true);
      playTone(450, 0.1);
      setLastActionStatus('Cleared Input Box');
      return true;
    }

    // 28. Explicit Dictation & Focused Box Filling
    const isExplicitDictation = /^(type|write|fill|search for|search|input|डालो|लिखो)\s+/i.test(rawPhrase);
    const cleanDictation = rawPhrase
      .replace(/^(type|write|fill|search for|search|input|डालो|लिखो)\s+/i, '')
      .trim();

    const textToFill = cleanDictation || rawPhrase;
    const filledActive = fillActiveInput(textToFill, isExplicitDictation);

    if (filledActive) {
      playTone(720, 0.08);
      setLastActionStatus(`Filled box: "${textToFill}"`);
    } else {
      setLastActionStatus(`Heard: "${rawPhrase}"`);
    }

    window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: textToFill }));
    return filledActive;
  };

  // Simulates spoken voice phrase directly for testing or keyboard users
  const simulateVoiceInput = (phrase: string): boolean => {
    return processVoiceCommand(phrase);
  };

  // Dedicated, phrase-based SpeechRecognition session
  // Using continuous: false eliminates the notorious Windows Chrome freeze/deadlock bug!
  const startNewListeningSession = () => {
    if (!isVoiceActiveRef.current || isPausedRef.current) return;
    if (isSessionStartingRef.current || activeRecognitionRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    isSessionStartingRef.current = true;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Fresh session per phrase prevents zombie hangs
      recognition.interimResults = true;
      recognition.lang = recognitionLangRef.current || 'en-IN';

      recognition.onstart = () => {
        isSessionStartingRef.current = false;
        setIsListening(true);
      };

      recognition.onaudiostart = () => {
        setIsListening(true);
      };

      recognition.onspeechstart = () => {
        setAudioLevel(85);
      };

      recognition.onspeechend = () => {
        setAudioLevel(15);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans + ' ';
          } else {
            interim += trans + ' ';
          }
        }

        const candidatePhrase = (final || interim).trim();
        if (candidatePhrase) {
          setLastRecognizedPhrase(candidatePhrase);
          setAudioLevel(95);

          // Zero-delay instant navigation:
          // Checks words as they are being spoken in real-time
          const executed = processVoiceCommand(candidatePhrase);
          if (executed) {
            console.log('[Instant Voice Navigation Triggered]:', candidatePhrase);
          }
        }
      };

      recognition.onerror = (event: any) => {
        isSessionStartingRef.current = false;
        setAudioLevel(0);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          webSpeechBlockedRef.current = true;
          setLastActionStatus('🐍 Python AI Voice Active (Listening via Hardware Realtek Mic)');
          return;
        }

        if (event.error === 'network') {
          recognitionLangRef.current = recognitionLangRef.current === 'en-IN' ? 'en-US' : 'en-IN';
          setLastActionStatus('🐍 Python AI Voice Active (Listening via Hardware Realtek Mic)');
        } else if (event.error === 'audio-capture') {
          setLastActionStatus('⚠️ Microphone busy in another application.');
        } else if (event.error !== 'no-speech') {
          console.warn('[Speech Recognition Event]:', event.error);
        }
      };

      recognition.onend = () => {
        isSessionStartingRef.current = false;
        activeRecognitionRef.current = null;
        setIsListening(false);
        setAudioLevel(0);

        // Immediate clean re-arm only if voice is active and web speech is not permission-blocked
        if (isVoiceActiveRef.current && !isPausedRef.current && !webSpeechBlockedRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isVoiceActiveRef.current && !isPausedRef.current && !webSpeechBlockedRef.current) {
              startNewListeningSession();
            }
          }, 350);
        }
      };

      activeRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      isSessionStartingRef.current = false;
      activeRecognitionRef.current = null;
      console.warn('Session startup catch:', err);

      if (isVoiceActiveRef.current && !isPausedRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isVoiceActiveRef.current && !isPausedRef.current) {
            startNewListeningSession();
          }
        }, 300);
      }
    }
  };

  const stopActiveSession = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.onend = null;
        activeRecognitionRef.current.onerror = null;
        activeRecognitionRef.current.abort();
      } catch {}
      activeRecognitionRef.current = null;
    }
    isSessionStartingRef.current = false;
    setIsListening(false);
  };

  const pauseListening = () => {
    isPausedRef.current = true;
    stopActiveSession();
  };

  const resumeListening = () => {
    isPausedRef.current = false;
    if (isVoiceActiveRef.current) {
      startNewListeningSession();
    }
  };

  // Single-phrase capture utility powered by Python Speech Module
  const captureVoiceInput = async (promptMessage?: string): Promise<string> => {
    if (promptMessage) {
      setLastActionStatus(promptMessage);
    }

    // Try Python voice engine with direct 16-bit PCM WAV recording
    try {
      const pythonResult = await recordAndProcessWithPython(3600);
      if (pythonResult && pythonResult.transcript) {
        return pythonResult.transcript;
      }
    } catch (e) {
      console.warn('Python capture attempt fallback:', e);
    }

    // Fallback: Browser Web Speech API
    return new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        resolve('');
        return;
      }

      const wasActive = isVoiceActiveRef.current;
      pauseListening();

      let isResolved = false;
      const safeResolve = (val: string) => {
        if (isResolved) return;
        isResolved = true;
        if (wasActive) resumeListening();
        resolve(val);
      };

      const safetyTimer = setTimeout(() => safeResolve(''), 8000);

      try {
        playTone(580, 0.12);

        const rec = new SR();
        rec.lang = recognitionLangRef.current || 'en-IN';
        rec.continuous = false;
        rec.interimResults = true;

        let captured = '';

        rec.onresult = (event: any) => {
          const trans = event.results[0]?.[0]?.transcript?.trim() || '';
          if (trans) {
            captured = trans;
            setLastRecognizedPhrase(trans);
          }
        };

        rec.onerror = () => {
          clearTimeout(safetyTimer);
          safeResolve(captured);
        };

        rec.onend = () => {
          clearTimeout(safetyTimer);
          if (captured) {
            playTone(680, 0.12);
            processVoiceCommand(captured);
          }
          safeResolve(captured);
        };

        rec.start();
      } catch {
        clearTimeout(safetyTimer);
        safeResolve('');
      }
    });
  };

  const toggleVoice = async () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
      try {
        localStorage.setItem('imd_voice_active', 'false');
      } catch {}
      stopActiveSession();
      playTone(320, 0.15);
      setLastRecognizedPhrase('');
      setLastActionStatus('');

      // Pause Python background microphone listener
      fetch('/api/voice/listener-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      }).catch(() => {});
    } else {
      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      webSpeechBlockedRef.current = false;
      try {
        localStorage.setItem('imd_voice_active', 'true');
      } catch {}

      // Instant pleasant ascending chime: signals LIVE listening without blocking speech
      playTone(520, 0.1);
      setTimeout(() => playTone(780, 0.15), 120);
      setLastActionStatus('🎙️ Listening for commands or box-filling (Python AI + Mic active)...');

      // Start Python background microphone listener
      fetch('/api/voice/listener-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      }).catch(() => {});

      // Start browser recognition session as additional parallel channel if supported
      startNewListeningSession();
    }
  };

  useEffect(() => {
    const initVoice = () => {
      const saved = localStorage.getItem('imd_voice_active');
      if (saved !== 'false') {
        setIsVoiceActive(true);
        isVoiceActiveRef.current = true;
        fetch('/api/voice/listener-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        }).catch(() => {});
        startNewListeningSession();
      }
    };

    initVoice();
    checkPythonStatus();
    const statusInterval = setInterval(checkPythonStatus, 25000);
    const pollInterval = setInterval(pollPythonVoiceService, 550);

    return () => {
      clearInterval(statusInterval);
      clearInterval(pollInterval);
      stopActiveSession();
      stopMicAudioMeter();
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isVoiceActive,
        toggleVoice,
        lastRecognizedPhrase,
        lastActionStatus,
        isListening,
        audioLevel,
        supported,
        currentLanguage,
        setLanguage,
        speakText,
        playTone,
        pauseListening,
        resumeListening,
        captureVoiceInput,
        simulateVoiceInput,
        pythonVoiceOnline,
        checkPythonStatus,
        transcribeAudioWithPython,
        recordAndProcessWithPython,
        listenWithPythonHardwareMic,
        executeParsedCommand,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

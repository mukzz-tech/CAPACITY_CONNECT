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
  executeParsedCommand: (cmd: any) => boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Auto-fill active or first visible editable input/textarea on the screen
export const fillActiveInput = (text: string): boolean => {
  try {
    let el = document.activeElement as HTMLElement | null;

    const isEditable = (node: Element | null): node is HTMLInputElement | HTMLTextAreaElement => {
      if (!node) return false;
      if (node instanceof HTMLInputElement) {
        return (
          ['text', 'search', 'email', 'url', 'password', 'tel', 'number', ''].includes(node.type) &&
          !node.disabled &&
          !node.readOnly
        );
      }
      if (node instanceof HTMLTextAreaElement) {
        return !node.disabled && !node.readOnly;
      }
      return false;
    };

    // If activeElement is body or not an editable field, auto-detect the best visible input on screen
    if (!isEditable(el)) {
      const candidates = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
        )
      );
      el =
        candidates.find((input) => {
          const rect = input.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
        }) || null;
    }

    if (!isEditable(el)) return false;

    // Focus and highlight target input
    try {
      el.focus();
    } catch {}

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

  // Audio Stream & VU Meter refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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
            lang.startsWith('hi')
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

  // Centralized command dispatcher from Python NLP or local matcher
  const executeParsedCommand = (cmd: any): boolean => {
    if (!cmd || !cmd.action) return false;
    const now = Date.now();
    lastCmdTimeRef.current = now;

    if (cmd.tone) playTone(cmd.tone, 0.12);

    if (cmd.action === 'NAVIGATE' && cmd.target) {
      setLastActionStatus(cmd.description || `Navigating to ${cmd.target}...`);
      navigate(cmd.target);
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

    if (cmd.action === 'READ_ALOUD') {
      setLastActionStatus(cmd.description || 'Reading notes aloud...');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
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

    if (cmd.action === 'OPTION_SELECT' && cmd.option) {
      setLastActionStatus(cmd.description || `Selected Option ${cmd.option}`);
      window.dispatchEvent(new CustomEvent('imd-voice-option-select', { detail: cmd.option }));
      return true;
    }

    if (cmd.action === 'CLEAR_INPUT') {
      fillActiveInput('');
      setLastActionStatus(cmd.description || 'Cleared Input Box');
      return true;
    }

    if (cmd.action === 'FILL_INPUT' && cmd.fill_text !== undefined) {
      const filled = fillActiveInput(cmd.fill_text);
      setLastActionStatus(cmd.description || `Filled box: "${cmd.fill_text}"`);
      window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: cmd.fill_text }));
      return filled;
    }

    if (cmd.action === 'GENERAL_INPUT' && cmd.fill_text) {
      const filled = fillActiveInput(cmd.fill_text);
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

  // Record audio via PCM WAV and process with Python Voice Service
  const recordAndProcessWithPython = async (
    durationMs = 3200
  ): Promise<{ transcript: string; command: any } | null> => {
    pauseListening();
    playTone(580, 0.12);
    setLastActionStatus('🎙️ Listening with Python AI Voice Module...');

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
      console.warn('Python voice recording error:', err);
      setLastActionStatus('Voice input error');
      resumeListening();
      return null;
    }
  };

  // Core Command & Box-Filling Router
  const processVoiceCommand = (rawPhrase: string): boolean => {
    const phrase = rawPhrase.trim().toLowerCase();
    if (!phrase) return false;

    const now = Date.now();
    if (now - lastCmdTimeRef.current < 600) {
      return false; // Debounce
    }

    console.log('[Voice Command Engine]:', phrase);
    setLastRecognizedPhrase(rawPhrase.trim());

    // 1. Courses Navigation
    if (
      phrase === 'courses' ||
      phrase === 'course' ||
      phrase.startsWith('go to course') ||
      phrase.startsWith('open course') ||
      phrase.startsWith('show course') ||
      phrase.includes('syllabus') ||
      phrase.includes('catalogue') ||
      phrase.includes('पाठ्यक्रम') ||
      phrase.includes('कोर्स')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Navigating to Courses...');
      navigate('/courses');
      return true;
    }

    // 2. Profile & Certificates Navigation
    if (
      phrase === 'profile' ||
      phrase === 'my profile' ||
      phrase === 'certificates' ||
      phrase === 'certificate' ||
      phrase.startsWith('open profile') ||
      phrase.startsWith('go to profile') ||
      phrase.includes('account') ||
      phrase.includes('scores') ||
      phrase.includes('प्रमाणपत्र') ||
      phrase.includes('प्रोफ़ाइल')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Profile & Certificates...');
      navigate('/profile');
      return true;
    }

    // 3. Homepage / Dashboard
    if (
      phrase === 'home' ||
      phrase === 'homepage' ||
      phrase === 'dashboard' ||
      phrase.startsWith('go home') ||
      phrase.startsWith('go to home') ||
      phrase.includes('main page') ||
      phrase.includes('होम') ||
      phrase.includes('डैशबोर्ड')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Navigating to Homepage...');
      navigate('/');
      return true;
    }

    // 4. Chatbot / AI Assistant
    if (
      phrase === 'chatbot' ||
      phrase === 'chat' ||
      phrase === 'assistant' ||
      phrase.startsWith('open chatbot') ||
      phrase.startsWith('open chat') ||
      phrase.includes('ai assistant') ||
      phrase.includes('चैटबॉट') ||
      phrase.includes('सहायक')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Meteorological Assistant...');
      navigate('/chatbot');
      return true;
    }

    // 5. Login
    if (
      phrase === 'login' ||
      phrase === 'log in' ||
      phrase === 'sign in' ||
      phrase.startsWith('open login') ||
      phrase.includes('लॉगिन')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Login Page...');
      navigate('/login');
      return true;
    }

    // 6. Signup
    if (
      phrase === 'signup' ||
      phrase === 'sign up' ||
      phrase === 'register' ||
      phrase.startsWith('open signup') ||
      phrase.includes('पंजीकरण')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Registration...');
      navigate('/signup');
      return true;
    }

    // 7. Trainer Studio
    if (
      phrase === 'trainer' ||
      phrase === 'trainer studio' ||
      phrase.startsWith('open trainer') ||
      phrase.includes('प्रशिक्षक')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Trainer Studio...');
      navigate('/trainer');
      return true;
    }

    // 8. Admin Console
    if (
      phrase === 'admin' ||
      phrase === 'admin console' ||
      phrase.startsWith('open admin') ||
      phrase.includes('व्यवस्थापक') ||
      phrase.includes('एडमिन')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Admin Console...');
      navigate('/admin');
      return true;
    }

    // 9. Camera Diagnostics
    if (
      phrase === 'camera' ||
      phrase === 'webcam' ||
      phrase === 'test camera' ||
      phrase.includes('कैमरा')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Camera Diagnostics...');
      navigate('/profile');
      window.dispatchEvent(new CustomEvent('imd-voice-test-camera'));
      return true;
    }

    // 10. Study Material Navigation
    if (
      phrase === 'study' ||
      phrase === 'study material' ||
      phrase === 'open study' ||
      phrase === 'lectures' ||
      phrase.startsWith('go to study') ||
      phrase.includes('अध्ययन')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Opening Study Material...');
      navigate('/study');
      return true;
    }

    // 11. Play Lecture Video
    if (
      phrase === 'play video' ||
      phrase === 'start video' ||
      phrase === 'resume video' ||
      phrase === 'listen video' ||
      phrase === 'listen to video' ||
      phrase === 'watch video' ||
      phrase === 'lecture video' ||
      phrase.includes('वीडियो चलाओ') ||
      phrase.includes('लेक्चर')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Playing lecture video...');
      window.dispatchEvent(new CustomEvent('imd-voice-video-play'));
      return true;
    }

    // 12. Pause Lecture Video
    if (
      phrase === 'pause video' ||
      phrase === 'pause lecture' ||
      phrase.includes('वीडियो रोको')
    ) {
      lastCmdTimeRef.current = now;
      playTone(450, 0.1);
      setLastActionStatus('Paused lecture video');
      window.dispatchEvent(new CustomEvent('imd-voice-video-pause'));
      return true;
    }

    // 13. Read Aloud / Listen Study Notes
    if (
      phrase === 'read aloud' ||
      phrase === 'read notes' ||
      phrase === 'read this' ||
      phrase === 'listen notes' ||
      phrase === 'listen study notes' ||
      phrase === 'listen study' ||
      phrase === 'listen to notes' ||
      phrase === 'read study notes' ||
      phrase === 'speak notes' ||
      phrase === 'listen' ||
      phrase.includes('बोलकर सुनाओ') ||
      phrase.includes('पढ़ो') ||
      phrase.includes('सुनो') ||
      phrase.includes('नोट्स')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Reading notes aloud...');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
      return true;
    }

    // 14. Stop / Silence Active Speech & Video
    if (
      phrase === 'stop' ||
      phrase === 'stop audio' ||
      phrase === 'quiet' ||
      phrase === 'silence' ||
      phrase === 'रुको' ||
      phrase === 'शांत'
    ) {
      lastCmdTimeRef.current = now;
      playTone(400, 0.1);
      setLastActionStatus('Audio & Video stopped');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('imd-voice-stop'));
      window.dispatchEvent(new CustomEvent('imd-voice-video-pause'));
      return true;
    }

    // 12. Submit Assessment Attempt
    if (
      phrase === 'submit assessment' ||
      phrase === 'submit test' ||
      phrase === 'finish assessment' ||
      phrase === 'submit' ||
      phrase.includes('सबमिट')
    ) {
      lastCmdTimeRef.current = now;
      playTone(720, 0.15);
      setLastActionStatus('Submitting Assessment...');
      window.dispatchEvent(new CustomEvent('imd-voice-submit'));
      return true;
    }

    // 13. Next Question in Assessment
    if (
      phrase === 'next question' ||
      phrase === 'next' ||
      phrase.includes('अगला प्रश्न') ||
      phrase === 'अगला'
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      setLastActionStatus('Next Question');
      window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
      return true;
    }

    // 14. Previous Question in Assessment
    if (
      phrase === 'previous question' ||
      phrase === 'previous' ||
      phrase === 'back' ||
      phrase.includes('पिछला प्रश्न') ||
      phrase === 'पिछला'
    ) {
      lastCmdTimeRef.current = now;
      playTone(520, 0.1);
      setLastActionStatus('Previous Question');
      window.dispatchEvent(new CustomEvent('imd-voice-prev-question'));
      return true;
    }

    // 15. Option selection in MCQ ("Option A", "Select B", "विकल्प सी", or standalone "A", "B", "C", "D")
    const optionMatch = phrase.match(
      /(?:option|select|choose|answer|विकल्प)\s*([a-d])\b|^([a-d])$/i
    );
    if (optionMatch) {
      lastCmdTimeRef.current = now;
      const opt = (optionMatch[1] || optionMatch[2]).toUpperCase();
      playTone(650, 0.1);
      setLastActionStatus(`Selected Option ${opt}`);
      window.dispatchEvent(new CustomEvent('imd-voice-option-select', { detail: opt }));
      return true;
    }

    // 16. Clear active input box
    if (
      phrase === 'clear' ||
      phrase === 'clear box' ||
      phrase === 'clear input' ||
      phrase === 'erase' ||
      phrase === 'मिटाओ'
    ) {
      lastCmdTimeRef.current = now;
      fillActiveInput('');
      playTone(450, 0.1);
      setLastActionStatus('Cleared Input Box');
      return true;
    }

    // 17. UNIVERSAL DICTATION & BOX AUTO-FILL
    // Spoken words automatically fill whatever input box is active or visible!
    const cleanDictation = rawPhrase
      .replace(/^(type|write|fill|search for|search|input|डालो|लिखो)\s+/i, '')
      .trim();

    const textToFill = cleanDictation || rawPhrase;
    const filledActive = fillActiveInput(textToFill);

    if (filledActive) {
      playTone(720, 0.08);
      setLastActionStatus(`Filled box: "${textToFill}"`);
      console.log('[Auto-Filled Box With]:', textToFill);
    } else {
      setLastActionStatus(`Heard: "${rawPhrase}"`);
    }

    // 18. Broadcast for route-specific handlers (Chatbot, CourseBrowse, Assessment)
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

          // If result is final, execute command or box-fill immediately
          if (final.trim()) {
            processVoiceCommand(final.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        isSessionStartingRef.current = false;
        setAudioLevel(0);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setLastActionStatus('⚠️ Mic blocked. Click lock in address bar to Allow.');
          return;
        }

        if (event.error === 'network') {
          recognitionLangRef.current = recognitionLangRef.current === 'en-IN' ? 'en-US' : 'en-IN';
          setLastActionStatus('🌐 Speech server re-connecting... (or use Push-to-Talk below)');
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

        // Immediate clean re-arm if voice remains active
        if (isVoiceActiveRef.current && !isPausedRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isVoiceActiveRef.current && !isPausedRef.current) {
              startNewListeningSession();
            }
          }, 60);
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
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Speech Recognition is not available in this browser. Please use Google Chrome or Microsoft Edge.'
      );
      return;
    }

    if (isVoiceActive) {
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
      try {
        localStorage.setItem('imd_voice_active', 'false');
      } catch {}
      stopActiveSession();
      playTone(320, 0.15);
      setLastActionStatus('Voice turned off');
    } else {
      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      try {
        localStorage.setItem('imd_voice_active', 'true');
      } catch {}

      // Instant pleasant ascending chime: signals LIVE listening without blocking speech
      playTone(520, 0.1);
      setTimeout(() => playTone(780, 0.15), 120);
      setLastActionStatus('🎙️ Listening for commands or box-filling...');

      // Start recognition immediately!
      startNewListeningSession();
    }
  };

  useEffect(() => {
    const initVoice = () => {
      const saved = localStorage.getItem('imd_voice_active');
      if (saved !== 'false') {
        setIsVoiceActive(true);
        isVoiceActiveRef.current = true;
        startNewListeningSession();
      }
    };

    initVoice();
    checkPythonStatus();
    const statusInterval = setInterval(checkPythonStatus, 25000);

    return () => {
      clearInterval(statusInterval);
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

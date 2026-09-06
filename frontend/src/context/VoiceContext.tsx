import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface VoiceContextType {
  isVoiceActive: boolean;
  toggleVoice: () => Promise<void>;
  lastRecognizedPhrase: string;
  isListening: boolean;
  supported: boolean;
  speakText: (text: string, lang?: string) => void;
  playTone: (freq?: number, duration?: number) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('imd_voice_active') === 'true';
    } catch {
      return false;
    }
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastRecognizedPhrase, setLastRecognizedPhrase] = useState<string>('');
  const [supported, setSupported] = useState<boolean>(true);

  const activeRecognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
  }, [isVoiceActive]);

  // Audio tone feedback using Web Audio API ("make noise")
  const playTone = (freq = 480, duration = 0.15) => {
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

  // Vocal spoken confirmation
  const speakText = (text: string, lang = 'en-US') => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) => v.lang.includes(lang.startsWith('hi') ? 'hi' : 'en'));
      if (matched) utterance.voice = matched;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  };

  // Executes matched actions based on spoken keywords immediately
  const lastCmdTimeRef = useRef<number>(0);

  const processVoiceCommand = (rawPhrase: string): boolean => {
    const phrase = rawPhrase.trim().toLowerCase();
    if (!phrase) return false;

    const now = Date.now();
    if (now - lastCmdTimeRef.current < 1200) {
      return false; // Prevent duplicate triggers within 1.2s
    }

    console.log('[Voice Command Processed]:', phrase);

    // 1. Courses Navigation
    if (
      phrase.includes('course') ||
      phrase.includes('courses') ||
      phrase.includes('syllabus') ||
      phrase.includes('catalogue') ||
      phrase.includes('catalog') ||
      phrase.includes('training') ||
      phrase.includes('module') ||
      phrase.includes('learn') ||
      phrase.includes('class') ||
      phrase.includes('पाठ्यक्रम') ||
      phrase.includes('कोर्स')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Navigating to course catalogue');
      navigate('/courses');
      return true;
    }

    // 2. Profile & Certificates Navigation
    if (
      phrase.includes('certificate') ||
      phrase.includes('certificates') ||
      phrase.includes('profile') ||
      phrase.includes('my profile') ||
      phrase.includes('account') ||
      phrase.includes('marks') ||
      phrase.includes('score') ||
      phrase.includes('प्रमाणपत्र') ||
      phrase.includes('प्रोफ़ाइल')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening your profile and certificates');
      navigate('/profile');
      return true;
    }

    // 3. Homepage / Dashboard
    if (
      phrase.includes('home') ||
      phrase.includes('dashboard') ||
      phrase.includes('main page') ||
      phrase.includes('start') ||
      phrase.includes('होम') ||
      phrase.includes('डैशबोर्ड')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Navigating to homepage');
      navigate('/');
      return true;
    }

    // 4. Chatbot / AI Assistant
    if (
      phrase.includes('chatbot') ||
      phrase.includes('chat') ||
      phrase.includes('assistant') ||
      phrase.includes('doubt') ||
      phrase.includes('ai') ||
      phrase.includes('bot') ||
      phrase.includes('सहायक') ||
      phrase.includes('संदेह')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening IMD meteorological assistant');
      navigate('/chatbot');
      return true;
    }

    // 5. Login
    if (
      phrase.includes('login') ||
      phrase.includes('log in') ||
      phrase.includes('sign in') ||
      phrase.includes('signin') ||
      phrase.includes('लॉगिन')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening login page');
      navigate('/login');
      return true;
    }

    // 6. Signup
    if (
      phrase.includes('signup') ||
      phrase.includes('sign up') ||
      phrase.includes('register') ||
      phrase.includes('पंजीकरण')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening registration page');
      navigate('/signup');
      return true;
    }

    // 7. Trainer Studio
    if (
      phrase.includes('trainer') ||
      phrase.includes('trainer studio') ||
      phrase.includes('instructor') ||
      phrase.includes('ट्रेनर')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening Trainer Studio');
      navigate('/trainer');
      return true;
    }

    // 8. Admin Console
    if (
      phrase.includes('admin') ||
      phrase.includes('admin console') ||
      phrase.includes('administrator') ||
      phrase.includes('व्यवस्थापक')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening Admin Console');
      navigate('/admin');
      return true;
    }

    // 9. Read Aloud / TTS trigger
    if (
      phrase.includes('read aloud') ||
      phrase.includes('read this') ||
      phrase.includes('read') ||
      phrase.includes('listen') ||
      phrase.includes('speak') ||
      phrase.includes('सुनो') ||
      phrase.includes('पढ़ो')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Reading study notes aloud');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
      return true;
    }

    // 10. Camera Test Trigger
    if (
      phrase.includes('camera') ||
      phrase.includes('webcam') ||
      phrase.includes('test camera') ||
      phrase.includes('कैमरा')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening camera diagnostics');
      navigate('/profile');
      window.dispatchEvent(new CustomEvent('imd-voice-test-camera'));
      return true;
    }

    // 11. Next Question in Assessment
    if (
      phrase.includes('next question') ||
      phrase.includes('next') ||
      phrase.includes('अगला')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Moving to next question');
      window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
      return true;
    }

    // 12. Option selection in MCQ
    const optionMatch = phrase.match(/option\s*([a-d])|select\s*([a-d])|विकल्प\s*([a-d])/i);
    if (optionMatch) {
      lastCmdTimeRef.current = now;
      const opt = (optionMatch[1] || optionMatch[2] || optionMatch[3]).toUpperCase();
      playTone(620, 0.1);
      speakText(`Selecting option ${opt}`);
      window.dispatchEvent(new CustomEvent('imd-voice-option-select', { detail: opt }));
      return true;
    }

    // 13. General voice input broadcast (for assessments / forms)
    window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: phrase }));
    return false;
  };

  // Robust session spawner: instantiates fresh SpeechRecognition per recognition cycle
  const startNewListeningSession = () => {
    if (!isVoiceActiveRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Capture phrase quickly without state locking
      recognition.interimResults = true; // Stream instant transcripts
      recognition.lang = 'en-IN'; // Indian English / accent optimized

      let sessionMatched = false;
      let bufferTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        transcript = transcript.trim();
        bufferTranscript = transcript;
        setLastRecognizedPhrase(transcript);

        // Instant match check: navigate immediately upon hearing keyword
        if (!sessionMatched && transcript.length > 0) {
          const matched = processVoiceCommand(transcript);
          if (matched) {
            sessionMatched = true;
            try {
              recognition.stop();
            } catch (e) {}
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition warning:', event.error);
        }
        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
          isVoiceActiveRef.current = false;
          localStorage.setItem('imd_voice_active', 'false');
          speakText('Microphone permission not granted');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        activeRecognitionRef.current = null;

        // Fallback check on session end if not matched during interim
        if (!sessionMatched && bufferTranscript) {
          processVoiceCommand(bufferTranscript);
        }

        // Auto-restart with fresh instance if voice control remains active
        if (isVoiceActiveRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isVoiceActiveRef.current) {
              startNewListeningSession();
            }
          }, 300);
        }
      };

      activeRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Session startup error:', err);
      if (isVoiceActiveRef.current) {
        restartTimeoutRef.current = setTimeout(() => startNewListeningSession(), 600);
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
        activeRecognitionRef.current.stop();
      } catch (e) {}
      activeRecognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleVoice = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not available in this browser. Please use Google Chrome or Microsoft Edge.');
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
      speakText('Voice navigation turned off');
    } else {
      // Request mic permission first
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err) {
        alert('Microphone permission is required. Please click the lock or camera icon in your browser address bar and allow Microphone.');
        return;
      }

      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      try {
        localStorage.setItem('imd_voice_active', 'true');
      } catch {}
      playTone(550, 0.15);
      speakText('Voice navigation active. Say: courses, certificates, home, chatbot, or read aloud.');
      startNewListeningSession();
    }
  };

  useEffect(() => {
    if (isVoiceActive) {
      isVoiceActiveRef.current = true;
      startNewListeningSession();
    }
    return () => {
      stopActiveSession();
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isVoiceActive,
        toggleVoice,
        lastRecognizedPhrase,
        isListening,
        supported,
        speakText,
        playTone,
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

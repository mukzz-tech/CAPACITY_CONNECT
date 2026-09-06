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
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
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

  // Executes matched actions based on spoken keywords
  const processVoiceCommand = (rawPhrase: string) => {
    const phrase = rawPhrase.trim().toLowerCase();
    setLastRecognizedPhrase(phrase);
    console.log('[Voice Command Heard]:', phrase);

    playTone(620, 0.1);

    // 1. Courses Navigation
    if (
      phrase.includes('course') ||
      phrase.includes('courses') ||
      phrase.includes('syllabus') ||
      phrase.includes('catalogue') ||
      phrase.includes('पाठ्यक्रम') ||
      phrase.includes('कोर्स')
    ) {
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
      phrase.includes('प्रमाणपत्र') ||
      phrase.includes('प्रोफ़ाइल')
    ) {
      speakText('Opening your profile and certificates');
      navigate('/profile');
      return true;
    }

    // 3. Homepage
    if (
      phrase.includes('home') ||
      phrase.includes('dashboard') ||
      phrase.includes('main page') ||
      phrase.includes('होम')
    ) {
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
      phrase.includes('सहायक')
    ) {
      speakText('Opening IMD meteorological assistant');
      navigate('/chatbot');
      return true;
    }

    // 5. Read Aloud / TTS trigger
    if (
      phrase.includes('read aloud') ||
      phrase.includes('read this') ||
      phrase.includes('read') ||
      phrase.includes('listen') ||
      phrase.includes('सुनो') ||
      phrase.includes('पढ़ो')
    ) {
      speakText('Reading study notes aloud');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
      return true;
    }

    // 6. Camera Test Trigger
    if (
      phrase.includes('camera') ||
      phrase.includes('webcam') ||
      phrase.includes('test camera') ||
      phrase.includes('कैमरा')
    ) {
      speakText('Triggering camera test');
      window.dispatchEvent(new CustomEvent('imd-voice-test-camera'));
      return true;
    }

    // 7. Next Question in Assessment
    if (
      phrase.includes('next question') ||
      phrase.includes('next') ||
      phrase.includes('अगला')
    ) {
      speakText('Moving to next question');
      window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
      return true;
    }

    // 8. General voice input broadcast (for assessments / forms)
    window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: phrase }));
    return false;
  };

  // Robust session spawner: instantiates a fresh SpeechRecognition per recognition cycle
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
      recognition.continuous = false; // Fast, reliable single-phrase capture
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Optimized for Indian English and terminology

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.trim();
        setLastRecognizedPhrase(transcript);

        if (lastResult.isFinal) {
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition warning:', event.error);
        }
        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
          isVoiceActiveRef.current = false;
          speakText('Microphone permission not granted');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        activeRecognitionRef.current = null;

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
      playTone(550, 0.15);
      speakText('Voice navigation active. Say: courses, certificates, home, chatbot, or read aloud.');
      startNewListeningSession();
    }
  };

  useEffect(() => {
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

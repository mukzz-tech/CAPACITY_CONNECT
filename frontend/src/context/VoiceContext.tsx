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
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const navigate = useNavigate();

  // Keep ref in sync
  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
  }, [isVoiceActive]);

  // Audio tone feedback using Web Audio API ("make noise")
  const playTone = (freq = 440, duration = 0.15) => {
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

  // Helper to speak feedback aloud
  const speakText = (text: string, lang = 'en-US') => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel(); // cancel prior speech to prevent lockup
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) => v.lang.includes(lang.startsWith('hi') ? 'hi' : 'en'));
      if (matched) utterance.voice = matched;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if voice control is active
        if (isVoiceActiveRef.current) {
          setTimeout(() => {
            if (isVoiceActiveRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          }, 400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
          isVoiceActiveRef.current = false;
        }
      };

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const result = event.results[lastIndex];
        const phrase = result[0].transcript.trim().toLowerCase();

        // Update phrase preview
        setLastRecognizedPhrase(phrase);

        // Only trigger navigation if final or high confidence
        if (result.isFinal || result[0].confidence > 0.6) {
          console.log('[Voice Command Processed]:', phrase);
          playTone(600, 0.1);

          if (
            phrase.includes('go to courses') ||
            phrase.includes('open courses') ||
            phrase.includes('show courses')
          ) {
            speakText('Navigating to course catalogue');
            navigate('/courses');
          } else if (
            phrase.includes('open my certificates') ||
            phrase.includes('certificates') ||
            phrase.includes('open certificates')
          ) {
            speakText('Opening certificates');
            navigate('/profile');
          } else if (phrase.includes('go to dashboard') || phrase.includes('home')) {
            speakText('Going to homepage');
            navigate('/');
          } else if (
            phrase.includes('go to chatbot') ||
            phrase.includes('open chatbot') ||
            phrase.includes('ask question')
          ) {
            speakText('Opening AI meteorological assistant');
            navigate('/chatbot');
          } else if (
            phrase.includes('read this aloud') ||
            phrase.includes('listen') ||
            phrase.includes('read aloud')
          ) {
            speakText('Reading study notes aloud');
            window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
          } else if (phrase.includes('next question')) {
            speakText('Moving to next question');
            window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
          } else {
            // Dispatch general voice event for assessment answering or chatbot
            window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: phrase }));
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Speech recognition initialization failed', err);
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [navigate]);

  const toggleVoice = async () => {
    if (!supported || !recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isVoiceActive) {
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
      playTone(300, 0.15);
      speakText('Voice control deactivated');
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      // Prompt for microphone permission explicitly
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Release test stream
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (micErr) {
        alert('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
        return;
      }

      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      playTone(520, 0.15);
      speakText('Voice control active. You can say: go to courses, open certificates, or read aloud.');

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    }
  };

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

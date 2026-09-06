import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface VoiceContextType {
  isVoiceActive: boolean;
  toggleVoice: () => void;
  lastRecognizedPhrase: string;
  isListening: boolean;
  supported: boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastRecognizedPhrase, setLastRecognizedPhrase] = useState<string>('');
  const [supported, setSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();

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
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If user has enabled voice mode, auto restart listening
        if (isVoiceActive) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
        }
      };

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const phrase = event.results[lastIndex][0].transcript.trim().toLowerCase();
        setLastRecognizedPhrase(phrase);
        console.log('[Voice Command Detected]:', phrase);

        // Core Command Routing from Section 13
        if (phrase.includes('go to courses') || phrase.includes('open courses') || phrase.includes('show courses')) {
          navigate('/courses');
        } else if (phrase.includes('open my certificates') || phrase.includes('certificates') || phrase.includes('open certificates')) {
          navigate('/profile');
        } else if (phrase.includes('go to dashboard') || phrase.includes('home')) {
          navigate('/');
        } else if (phrase.includes('go to chatbot') || phrase.includes('open chatbot') || phrase.includes('ask question')) {
          navigate('/chatbot');
        } else if (phrase.includes('read this aloud') || phrase.includes('listen') || phrase.includes('read aloud')) {
          window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
        } else if (phrase.includes('next question')) {
          window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
        } else {
          // Dispatch general voice event for assessment answering or chatbot
          window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: phrase }));
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Speech recognition initialization failed', err);
      setSupported(false);
    }
  }, [navigate, isVoiceActive]);

  const toggleVoice = () => {
    if (!supported || !recognitionRef.current) {
      alert('Speech Recognition is not supported or permission denied in this browser.');
      return;
    }

    if (isVoiceActive) {
      setIsVoiceActive(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      setIsVoiceActive(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn(e);
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

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface VoiceContextType {
  isVoiceActive: boolean;
  toggleVoice: () => Promise<void>;
  lastRecognizedPhrase: string;
  isListening: boolean;
  supported: boolean;
  speakText: (text: string, lang?: string, onComplete?: () => void) => void;
  playTone: (freq?: number, duration?: number) => void;
  pauseListening: () => void;
  resumeListening: () => void;
  captureVoiceInput: (promptMessage?: string) => Promise<string>;
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
  const isPausedRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<any>(null);
  const speechDoneTimeoutRef = useRef<any>(null);
  const lastCmdTimeRef = useRef<number>(0);
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

  // Vocal spoken confirmation with strict self-echo suppression
  const speakText = (text: string, lang = 'en-US', onComplete?: () => void) => {
    try {
      if (!('speechSynthesis' in window)) {
        onComplete?.();
        return;
      }

      if (speechDoneTimeoutRef.current) {
        clearTimeout(speechDoneTimeoutRef.current);
      }

      isSpeakingRef.current = true;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) =>
        lang.startsWith('hi')
          ? v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
          : v.lang.toLowerCase().includes('en')
      );
      if (matched) utterance.voice = matched;

      const finishSpeech = () => {
        speechDoneTimeoutRef.current = setTimeout(() => {
          isSpeakingRef.current = false;
          onComplete?.();
        }, 400); // 400ms buffer for acoustic room echo dissipation
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
      isSpeakingRef.current = false;
      onComplete?.();
    }
  };

  // Executes matched actions based on spoken keywords immediately
  const processVoiceCommand = (rawPhrase: string): boolean => {
    // Ignore speech if system is speaking its own voice (Prevents echo loops)
    if (isSpeakingRef.current) {
      return false;
    }

    const phrase = rawPhrase.trim().toLowerCase();
    if (!phrase) return false;

    const now = Date.now();
    if (now - lastCmdTimeRef.current < 1100) {
      return false; // Debounce rapid multi-token matches within 1.1s
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
      phrase.includes('modules') ||
      phrase.includes('learn') ||
      phrase.includes('learning') ||
      phrase.includes('class') ||
      phrase.includes('classes') ||
      phrase.includes('पाठ्यक्रम') ||
      phrase.includes('कोर्स') ||
      phrase.includes('प्रशिक्षण')
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
      phrase.includes('scores') ||
      phrase.includes('प्रमाणपत्र') ||
      phrase.includes('प्रोफ़ाइल') ||
      phrase.includes('सर्टिफिकेट')
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
      phrase.includes('homepage') ||
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
      phrase.includes('doubts') ||
      phrase.includes('ai') ||
      phrase.includes('bot') ||
      phrase.includes('सहायक') ||
      phrase.includes('संदेह') ||
      phrase.includes('चैट')
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
      phrase.includes('registration') ||
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
      phrase.includes('ट्रेनर') ||
      phrase.includes('प्रशिक्षक')
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
      phrase.includes('व्यवस्थापक') ||
      phrase.includes('एडमिन')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Opening Admin Console');
      navigate('/admin');
      return true;
    }

    // 9. Read Aloud / TTS Trigger
    if (
      phrase.includes('read aloud') ||
      phrase.includes('read notes') ||
      phrase.includes('read this') ||
      phrase.includes('read') ||
      phrase.includes('listen') ||
      phrase.includes('बोलकर सुनाओ') ||
      phrase.includes('सुनो') ||
      phrase.includes('पढ़ो')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Reading study notes aloud');
      window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'));
      return true;
    }

    // 10. Stop / Silence Active Speech
    if (
      phrase.includes('stop reading') ||
      phrase.includes('stop audio') ||
      phrase.includes('stop') ||
      phrase.includes('quiet') ||
      phrase.includes('silence') ||
      phrase.includes('रुको') ||
      phrase.includes('शांत') ||
      phrase.includes('बंद करो')
    ) {
      lastCmdTimeRef.current = now;
      playTone(400, 0.1);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('imd-voice-stop'));
      return true;
    }

    // 11. Camera Test Trigger
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

    // 12. Submit Assessment Attempt
    if (
      phrase.includes('submit assessment') ||
      phrase.includes('submit test') ||
      phrase.includes('finish assessment') ||
      phrase.includes('submit') ||
      phrase.includes('जमा करो') ||
      phrase.includes('सबमिट')
    ) {
      lastCmdTimeRef.current = now;
      playTone(720, 0.15);
      speakText('Submitting assessment');
      window.dispatchEvent(new CustomEvent('imd-voice-submit'));
      return true;
    }

    // 13. Next Question in Assessment
    if (
      phrase.includes('next question') ||
      phrase.includes('next') ||
      phrase.includes('अगला प्रश्न') ||
      phrase.includes('अगला')
    ) {
      lastCmdTimeRef.current = now;
      playTone(620, 0.1);
      speakText('Moving to next question');
      window.dispatchEvent(new CustomEvent('imd-voice-next-question'));
      return true;
    }

    // 14. Previous Question in Assessment
    if (
      phrase.includes('previous question') ||
      phrase.includes('previous') ||
      phrase.includes('back question') ||
      phrase.includes('पिछला प्रश्न') ||
      phrase.includes('पिछला')
    ) {
      lastCmdTimeRef.current = now;
      playTone(520, 0.1);
      speakText('Moving to previous question');
      window.dispatchEvent(new CustomEvent('imd-voice-prev-question'));
      return true;
    }

    // 15. Option selection in MCQ ("Option A", "Select B", "Choose C", "विकल्प डी", or standalone "A", "B", "C", "D")
    const optionMatch = phrase.match(
      /(?:option|select|choose|answer|विकल्प)\s*([a-d])\b|^([a-d])$/i
    );
    if (optionMatch) {
      lastCmdTimeRef.current = now;
      const opt = (optionMatch[1] || optionMatch[2]).toUpperCase();
      playTone(620, 0.1);
      speakText(`Selected option ${opt}`);
      window.dispatchEvent(new CustomEvent('imd-voice-option-select', { detail: opt }));
      return true;
    }

    // 16. General voice input broadcast (for assessments / forms)
    window.dispatchEvent(new CustomEvent('imd-voice-general', { detail: phrase }));
    return false;
  };

  // Robust, continuous SpeechRecognition instance
  const startNewListeningSession = () => {
    if (!isVoiceActiveRef.current || isPausedRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      // Abort lingering instance if any
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort();
        } catch (e) {}
        activeRecognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continuous listening across phrases
      recognition.interimResults = true; // Stream instant transcripts
      recognition.lang = 'en-IN'; // Indian English / accent optimized

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans + ' ';
          } else {
            interimTranscript += trans + ' ';
          }
        }

        const candidatePhrase = (finalTranscript || interimTranscript).trim();
        if (candidatePhrase) {
          setLastRecognizedPhrase(candidatePhrase);
          processVoiceCommand(candidatePhrase);
        }
      };

      recognition.onerror = (event: any) => {
        // 'no-speech' is routine silence; keep continuous listening alive
        if (event.error === 'no-speech') {
          return;
        }

        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
          isVoiceActiveRef.current = false;
          try {
            localStorage.setItem('imd_voice_active', 'false');
          } catch {}
          speakText('Microphone permission not granted');
          return;
        }

        console.warn('Speech recognition warning:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        activeRecognitionRef.current = null;

        // Auto-restart with fresh instance if voice control remains active and not paused
        if (isVoiceActiveRef.current && !isPausedRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isVoiceActiveRef.current && !isPausedRef.current) {
              startNewListeningSession();
            }
          }, 300);
        }
      };

      activeRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Session startup error:', err);
      if (isVoiceActiveRef.current && !isPausedRef.current) {
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
        activeRecognitionRef.current.abort();
      } catch (e) {}
      activeRecognitionRef.current = null;
    }
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

  // Dedicated single-phrase capture utility without colliding with continuous listener
  const captureVoiceInput = (promptMessage?: string): Promise<string> => {
    return new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        resolve('');
        return;
      }

      const wasActive = isVoiceActiveRef.current;
      pauseListening();

      const proceedWithCapture = () => {
        try {
          const rec = new SR();
          rec.lang = 'en-IN';
          rec.continuous = false;
          rec.interimResults = false;

          let resolved = false;

          rec.onresult = (event: any) => {
            const transcript = event.results[0]?.[0]?.transcript?.trim() || '';
            resolved = true;
            playTone(680, 0.1);
            if (wasActive) resumeListening();
            resolve(transcript);
          };

          rec.onerror = (event: any) => {
            if (!resolved) {
              resolved = true;
              if (wasActive) resumeListening();
              resolve('');
            }
          };

          rec.onend = () => {
            if (!resolved) {
              resolved = true;
              if (wasActive) resumeListening();
              resolve('');
            }
          };

          rec.start();
        } catch (e) {
          if (wasActive) resumeListening();
          resolve('');
        }
      };

      if (promptMessage) {
        speakText(promptMessage, 'en-US', () => {
          proceedWithCapture();
        });
      } else {
        proceedWithCapture();
      }
    });
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

      // Play welcome announcement FIRST, and start listening ONLY AFTER speech ends to prevent self-echo!
      speakText(
        'Voice navigation active. Say: courses, certificates, home, chatbot, or read aloud.',
        'en-US',
        () => {
          startNewListeningSession();
        }
      );
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
        pauseListening,
        resumeListening,
        captureVoiceInput,
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

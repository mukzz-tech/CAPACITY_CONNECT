import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Globe } from 'lucide-react';

interface TtsControlProps {
  textToRead: string;
  currentLang: 'en' | 'hi';
  onLanguageChange?: (lang: 'en' | 'hi') => void;
}

export const TtsControl: React.FC<TtsControlProps> = ({
  textToRead,
  currentLang = 'en',
  onLanguageChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Listen for global voice navigation trigger ("read this aloud")
    const handleVoiceTrigger = () => {
      handlePlay();
    };
    window.addEventListener('imd-voice-read-aloud', handleVoiceTrigger);

    return () => {
      window.removeEventListener('imd-voice-read-aloud', handleVoiceTrigger);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [textToRead, currentLang, playbackRate]);

  // Audio tone generator for instant feedback ("make noise")
  const playChime = (freq = 520) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  const cleanTextForSpeech = (markdown: string) => {
    return markdown
      .replace(/#+\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/•\s*/g, '')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/\$\$(.*?)\$\$/g, 'सूत्र: $1')
      .replace(/\$(.*?)\$/g, '$1');
  };

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    playChime(600);

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const plainText = cleanTextForSpeech(textToRead);
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = playbackRate;

    // Pick voice matching target language (Hindi vs English)
    const targetLangCode = currentLang === 'hi' ? 'hi' : 'en';
    utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';

    const currentVoices = window.speechSynthesis.getVoices();
    const matchedVoice =
      currentVoices.find((v) => v.lang.toLowerCase().includes(targetLangCode)) ||
      currentVoices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    // Trigger speech with small timeout to bypass Chrome autoplay pause
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const handlePause = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleSwitchLanguage = (lang: 'en' | 'hi') => {
    handleStop();
    playChime(480);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs shadow-md">
      {/* Primary Listen / Pause Button */}
      {!isPlaying ? (
        <button
          onClick={handlePlay}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-sm"
          title="Read lecture notes aloud using browser synthesis"
        >
          <Volume2 className="w-4 h-4 text-white animate-pulse" />
          <span>{isPaused ? 'Resume Reading' : currentLang === 'hi' ? 'बोलकर सुनें (Listen Hindi)' : 'Listen Aloud (TTS)'}</span>
        </button>
      ) : (
        <button
          onClick={handlePause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition shadow-sm"
        >
          <Pause className="w-4 h-4 text-white" />
          <span>Pause</span>
        </button>
      )}

      {/* Stop Button */}
      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Stop reading"
        >
          <VolumeX className="w-4 h-4" />
        </button>
      )}

      {/* Speed Selector */}
      <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
        <span className="text-[11px] text-slate-400">Speed:</span>
        {[0.75, 1.0, 1.25, 1.5].map((rate) => (
          <button
            key={rate}
            onClick={() => {
              setPlaybackRate(rate);
              if (isPlaying) {
                handleStop();
                setTimeout(() => handlePlay(), 150);
              }
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
              playbackRate === rate
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Bilingual Translator & Voice Selector */}
      <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <button
          onClick={() => handleSwitchLanguage('en')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
            currentLang === 'en'
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Translate notes to English and read with English voice"
        >
          EN
        </button>
        <button
          onClick={() => handleSwitchLanguage('hi')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
            currentLang === 'hi'
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Translate notes to Hindi and read with Hindi voice"
        >
          हिंदी
        </button>
      </div>

      <span className="text-[10px] text-slate-400 hidden sm:inline ml-auto italic">
        {currentLang === 'hi' ? 'हिंदी ऑडियो सक्रिय' : 'Live browser synthesis'}
      </span>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Globe } from 'lucide-react';

interface TtsControlProps {
  textToRead: string;
  defaultLang?: string; // "en" | "hi"
}

export const TtsControl: React.FC<TtsControlProps> = ({ textToRead, defaultLang = 'en' }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [selectedLang, setSelectedLang] = useState<string>(defaultLang);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        setVoices(window.speechSynthesis.getVoices());
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
  }, [textToRead, selectedLang, playbackRate]);

  const cleanTextForSpeech = (markdown: string) => {
    return markdown
      .replace(/#+\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/\$\$(.*?)\$\$/g, 'Formula: $1')
      .replace(/\$(.*?)\$/g, '$1');
  };

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

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

    // Pick voice matching language
    const targetLangCode = selectedLang === 'hi' ? 'hi-IN' : 'en-US';
    const matchedVoice = voices.find((v) => v.lang.includes(targetLangCode)) || voices[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
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

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs shadow-md">
      {/* Primary Listen / Pause Button */}
      {!isPlaying ? (
        <button
          onClick={handlePlay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-sm"
          title="Read lecture notes aloud using browser synthesis"
        >
          <Volume2 className="w-4 h-4 text-white" />
          <span>{isPaused ? 'Resume Reading' : 'Listen Aloud (TTS)'}</span>
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
            onClick={() => setPlaybackRate(rate)}
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

      {/* Bilingual Voice Selector */}
      <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <button
          onClick={() => setSelectedLang('en')}
          className={`px-1.5 py-0.5 rounded text-[10px] transition ${
            selectedLang === 'en'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setSelectedLang('hi')}
          className={`px-1.5 py-0.5 rounded text-[10px] transition ${
            selectedLang === 'hi'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          हिंदी
        </button>
      </div>

      <span className="text-[10px] text-slate-400 hidden sm:inline ml-auto italic">
        Zero server cost • Instant in-browser synthesis
      </span>
    </div>
  );
};

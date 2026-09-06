import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play, Globe, Loader2 } from 'lucide-react';

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
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // References for audio element and chunk queue
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  // Clean text from markdown formatting
  const cleanTextForSpeech = (markdown: string) => {
    return markdown
      .replace(/#+\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/•\s*/g, '')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/\$\$(.*?)\$\$/g, 'सूत्र: $1')
      .replace(/\$(.*?)\$/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[><]/g, ' ')
      .trim();
  };

  // Split text into natural sentence chunks (up to ~160 characters)
  const chunkText = (text: string): string[] => {
    const rawParagraphs = text.split(/\n+/);
    const result: string[] = [];

    for (const para of rawParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Split by punctuation: Hindi danda (।), period (.), question mark, exclamation mark
      const sentences = trimmed.split(/([।\.!\?]+)/).filter(Boolean);
      let buffer = '';

      for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i];
        if (buffer.length + part.length <= 160) {
          buffer += part;
        } else {
          if (buffer.trim()) result.push(buffer.trim());
          buffer = part;
        }
      }
      if (buffer.trim()) result.push(buffer.trim());
    }

    return result.length > 0 ? result : [text.substring(0, 160)];
  };

  // Audio tone generator for instant feedback
  const playChime = (freq = 540) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  // Stop any active audio or speech synthesis
  const handleStop = () => {
    isCancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoadingAudio(false);
    setChunkProgress({ current: 0, total: 0 });
  };

  // Play next chunk in sequence using backend TTS audio endpoint
  const playChunkIndex = (index: number) => {
    if (isCancelledRef.current) return;
    const chunks = chunksRef.current;

    if (index >= chunks.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setChunkProgress({ current: 0, total: 0 });
      return;
    }

    currentIndexRef.current = index;
    setChunkProgress({ current: index + 1, total: chunks.length });
    setIsLoadingAudio(true);

    const chunk = chunks[index];
    const url = `/api/tts?text=${encodeURIComponent(chunk)}&lang=${currentLang}`;

    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.oncanplaythrough = () => {
      if (isCancelledRef.current) return;
      setIsLoadingAudio(false);
      audio.play().catch((err) => {
        console.warn('Audio play error:', err);
        // Fallback to Web Speech if audio element blocked
        fallbackWebSpeech(chunk, () => playChunkIndex(index + 1));
      });
    };

    audio.onended = () => {
      if (!isCancelledRef.current) {
        playChunkIndex(index + 1);
      }
    };

    audio.onerror = () => {
      console.warn('Audio load error on chunk, attempting fallback');
      setIsLoadingAudio(false);
      fallbackWebSpeech(chunk, () => playChunkIndex(index + 1));
    };
  };

  // Web Speech synthesis fallback
  const fallbackWebSpeech = (text: string, onDone: () => void) => {
    if (!('speechSynthesis' in window)) {
      onDone();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackRate;
    utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';

    const voices = window.speechSynthesis.getVoices();
    if (currentLang === 'hi') {
      const hiVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.lang.toLowerCase().includes('hi-in')
      );
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      const enVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith('en') || v.name.toLowerCase().includes('english')
      );
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = onDone;
    utterance.onerror = onDone;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    playChime(620);
    isCancelledRef.current = false;

    // If currently paused, resume existing audio
    if (isPaused && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPaused(false);
        setIsPlaying(true);
      }).catch(console.warn);
      return;
    }

    handleStop();
    isCancelledRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);

    const plain = cleanTextForSpeech(textToRead);
    const chunks = chunkText(plain);
    chunksRef.current = chunks;
    currentIndexRef.current = 0;

    playChunkIndex(0);
  };

  const handlePause = () => {
    playChime(450);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleSwitchLanguage = (lang: 'en' | 'hi') => {
    handleStop();
    playChime(480);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  useEffect(() => {
    const handleVoiceTrigger = () => handlePlay();
    window.addEventListener('imd-voice-read-aloud', handleVoiceTrigger);

    return () => {
      window.removeEventListener('imd-voice-read-aloud', handleVoiceTrigger);
      handleStop();
    };
  }, [textToRead, currentLang, playbackRate]);

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs shadow-md">
      {/* Primary Listen / Resume / Pause Button */}
      {!isPlaying ? (
        <button
          onClick={handlePlay}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-sm"
          title={currentLang === 'hi' ? 'हिंदी ऑडियो में व्याख्यान सुनें' : 'Read lecture notes aloud'}
        >
          <Volume2 className="w-4 h-4 text-white animate-pulse" />
          <span>
            {isPaused
              ? 'जारी रखें (Resume)'
              : currentLang === 'hi'
              ? 'बोलकर सुनें (Listen in Hindi)'
              : 'Listen Aloud (TTS)'}
          </span>
        </button>
      ) : (
        <button
          onClick={handlePause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition shadow-sm"
        >
          <Pause className="w-4 h-4 text-white" />
          <span>विराम (Pause)</span>
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

      {/* Progress Status Indicator */}
      {isPlaying && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-950/80 border border-blue-500/40 text-[10px] text-blue-300">
          {isLoadingAudio ? (
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
          <span>
            {currentLang === 'hi'
              ? `भाग ${chunkProgress.current}/${chunkProgress.total} बोल रहा है...`
              : `Reading part ${chunkProgress.current}/${chunkProgress.total}...`}
          </span>
        </div>
      )}

      {/* Speed Selector */}
      <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
        <span className="text-[11px] text-slate-400">गति:</span>
        {[0.75, 1.0, 1.25, 1.5].map((rate) => (
          <button
            key={rate}
            onClick={() => {
              setPlaybackRate(rate);
              if (audioRef.current) {
                audioRef.current.playbackRate = rate;
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

      {/* Bilingual Language Switcher */}
      <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <button
          onClick={() => handleSwitchLanguage('en')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
            currentLang === 'en'
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Translate to English and speak English audio"
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
          title="Translate to Hindi and speak pure Hindi audio"
        >
          हिंदी
        </button>
      </div>

      <span className="text-[10px] text-slate-400 hidden md:inline ml-auto font-mono">
        {currentLang === 'hi' ? '🇮🇳 प्रामाणिक हिंदी उच्चारण' : 'Standard English Voice'}
      </span>
    </div>
  );
};

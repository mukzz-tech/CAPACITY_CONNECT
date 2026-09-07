import React, { useEffect, useState } from 'react';
import { useVoice } from '../context/VoiceContext';
import { Mic, Sparkles, Navigation } from 'lucide-react';

/**
 * Clean, Self-Hiding Voice HUD
 * - Strictly hidden when voice is OFF.
 * - Displays user's spoken words in real time when active.
 * - Auto-disappears quickly after navigation / speech completes.
 */
export const VoiceAssistantWidget: React.FC = () => {
  const { isVoiceActive, lastRecognizedPhrase, lastActionStatus } = useVoice();
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!isVoiceActive) {
      setVisible(false);
      return;
    }

    if (lastRecognizedPhrase || lastActionStatus) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2400);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isVoiceActive, lastRecognizedPhrase, lastActionStatus]);

  // Strictly do NOT render anything if voice is off or not currently visible
  if (!isVoiceActive || !visible || (!lastRecognizedPhrase && !lastActionStatus)) {
    return null;
  }

  return (
    <aside
      aria-label="Live Voice Navigation HUD"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none font-sans select-none animate-in fade-in slide-in-from-bottom-4 duration-150"
    >
      <div className="bg-slate-900/95 border-2 border-emerald-500/80 backdrop-blur-2xl rounded-2xl p-3.5 shadow-2xl text-white max-w-md w-[90vw] sm:w-96 space-y-2 ring-4 ring-emerald-500/10 pointer-events-auto">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Voice Command Active
            </span>
          </div>

          {/* Equalizer Waveform */}
          <div className="flex items-center gap-0.5 h-3">
            {[14, 28, 18, 32, 22].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-emerald-400 rounded-full animate-pulse"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>

        {/* Live User Speech Words (What the user is saying) */}
        {lastRecognizedPhrase && (
          <div className="bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-800 flex items-start gap-2.5">
            <Mic className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-bounce" />
            <div className="text-xs text-slate-100 font-mono flex-1">
              <span className="text-[10px] text-slate-400 block font-sans font-medium">Heard:</span>
              <span className="font-bold text-amber-300 text-sm">"{lastRecognizedPhrase}"</span>
            </div>
          </div>
        )}

        {/* Direct Fast Navigation Action Toast */}
        {lastActionStatus && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 text-xs font-semibold shadow-inner">
            <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span className="truncate">{lastActionStatus}</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default VoiceAssistantWidget;

import React, { useState } from 'react';
import { useVoice } from '../context/VoiceContext';
import {
  Mic,
  MicOff,
  Volume2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  BookOpen,
  User,
  MessageSquare,
  Home,
  Camera,
  Activity,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VoiceAssistantWidget: React.FC = () => {
  const {
    isVoiceActive,
    toggleVoice,
    isListening,
    lastRecognizedPhrase,
    lastActionStatus,
    audioLevel,
    simulateVoiceInput,
  } = useVoice();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [simulationInput, setSimulationInput] = useState<string>('');
  const navigate = useNavigate();

  const handleSimulate = (text: string) => {
    if (!text.trim()) return;
    simulateVoiceInput(text.trim());
    setSimulationInput('');
  };

  return (
    <aside
      aria-label="Hands-free voice assistant"
      className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2 font-sans select-none"
    >
      {/* Expanded Voice Command Cheat Sheet & Quick Actions */}
      {isExpanded && isVoiceActive && (
        <div className="bg-slate-900/95 border border-slate-700/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-white w-88 max-w-[90vw] space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-100">Voice Navigation & Auto-Fill</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>MIC LIVE</span>
            </div>
          </div>

          {/* Real Audio Volume Level Diagnostic */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                Mic Audio Input Level:
              </span>
              <span
                className={`font-mono font-bold ${
                  audioLevel > 5 ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {audioLevel > 0 ? `${audioLevel}%` : 'Idle / 0%'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  audioLevel > 40
                    ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500'
                    : audioLevel > 5
                    ? 'bg-emerald-400'
                    : 'bg-slate-600'
                }`}
                style={{ width: `${Math.max(4, audioLevel)}%` }}
              />
            </div>
            {audioLevel === 0 && (
              <p className="text-[9px] text-slate-400 leading-tight pt-0.5">
                💡 If volume stays 0% while speaking, check your Windows mic volume or unmute.
              </p>
            )}
          </div>

          {/* Interactive Voice Sandbox / Command Simulator */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-2">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
              ⚡ Test Voice Command or Fill Box:
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSimulate(simulationInput);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Type command or text to fill..."
                className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="submit"
                disabled={!simulationInput.trim()}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1"
                title="Simulate spoken input"
              >
                <Send className="w-3 h-3" />
                <span>Run</span>
              </button>
            </form>

            {/* Quick 1-Click Simulation Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              <button
                type="button"
                onClick={() => handleSimulate('courses')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-amber-300 font-mono transition"
              >
                "courses"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('profile')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-blue-300 font-mono transition"
              >
                "profile"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('chatbot')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-emerald-300 font-mono transition"
              >
                "chatbot"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('home')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-indigo-300 font-mono transition"
              >
                "home"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('cyclone alert')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-rose-300 font-mono transition"
              >
                Fill: "cyclone alert"
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 space-y-2">
            <p className="text-[10px] text-slate-400">Speak naturally in English or Hindi:</p>

            {/* Core Navigation Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/courses')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>"courses"</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <User className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span>"profile"</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/chatbot')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>"chatbot"</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <Home className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>"home"</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/profile');
                  window.dispatchEvent(new CustomEvent('imd-voice-test-camera'));
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <Camera className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                <span>"camera"</span>
              </button>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('imd-voice-read-aloud'))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>"read aloud"</span>
              </button>
            </div>

            {/* Assessment Voice Controls */}
            <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hands-Free In Assessments:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                <div className="bg-slate-800/70 p-1.5 rounded-lg border border-slate-700/60 text-emerald-400">
                  "Option A / B / C / D"
                </div>
                <div className="bg-slate-800/70 p-1.5 rounded-lg border border-slate-700/60 text-blue-400">
                  "Next Question"
                </div>
                <div className="bg-slate-800/70 p-1.5 rounded-lg border border-slate-700/60 text-amber-400">
                  "Submit Assessment"
                </div>
                <div className="bg-slate-800/70 p-1.5 rounded-lg border border-slate-700/60 text-rose-400">
                  "Stop / रुको"
                </div>
              </div>
            </div>

            {/* Multilingual Notes */}
            <div className="text-[9px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex justify-between items-center">
              <span>Hindi / हिंदी समर्थित:</span>
              <span className="text-slate-300 font-mono">"पाठ्यक्रम", "होम", "प्रोफ़ाइल", "विकल्प बी"</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Control Pill */}
      <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-700 shadow-2xl rounded-full p-1.5 backdrop-blur-md transition-all duration-200 hover:border-slate-500">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={toggleVoice}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-medium text-xs transition shadow-lg ${
            isVoiceActive
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 ring-2 ring-red-400/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
          }`}
          title={isVoiceActive ? 'Click to Turn Off Voice Navigation' : 'Click to Turn On Voice Navigation'}
        >
          {isVoiceActive ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <Mic className="w-4 h-4 text-white" />
              <span className="font-bold">Voice: Active (Listening)</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 opacity-90" />
              <span className="font-semibold">Turn On Voice (Command & Fill Box)</span>
            </>
          )}
        </button>

        {isVoiceActive && (
          <>
            {/* Dynamic Audio VU Meter Bars based on real microphone volume */}
            <div className="flex items-center gap-0.5 px-1.5 h-5" title={`Microphone volume: ${audioLevel}%`}>
              <span
                className="w-1 bg-red-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, Math.min(20, 4 + audioLevel * 0.16))}px` }}
              />
              <span
                className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(6, Math.min(20, 6 + audioLevel * 0.2))}px` }}
              />
              <span
                className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(8, Math.min(20, 8 + audioLevel * 0.24))}px` }}
              />
              <span
                className="w-1 bg-blue-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(5, Math.min(20, 5 + audioLevel * 0.18))}px` }}
              />
            </div>

            {/* Live Status / Transcript Ticker */}
            <div className="max-w-[260px] truncate px-2 text-xs text-slate-200">
              {lastActionStatus ? (
                <span className="text-emerald-300 font-mono text-[11px] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                  <span className="truncate">{lastActionStatus}</span>
                </span>
              ) : lastRecognizedPhrase ? (
                <span className="text-amber-300 font-mono font-medium">"{lastRecognizedPhrase}"</span>
              ) : (
                <span className="text-slate-400 animate-pulse text-[11px]">🎙️ Listening... speak or fill box</span>
              )}
            </div>

            {/* Expand / Collapse Chevrons */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title={isExpanded ? 'Hide voice controls' : 'Show voice controls & sandbox'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

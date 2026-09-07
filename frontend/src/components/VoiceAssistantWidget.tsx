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
    currentLanguage,
    setLanguage,
    captureVoiceInput,
    simulateVoiceInput,
    playTone,
    pythonVoiceOnline,
    recordAndProcessWithPython,
  } = useVoice();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [simulationInput, setSimulationInput] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSimulate = (text: string) => {
    if (!text.trim()) return;
    simulateVoiceInput(text.trim());
    setSimulationInput('');
  };

  const handlePushToTalk = async () => {
    setIsCapturing(true);
    playTone(580, 0.12);
    try {
      // First attempt direct high-precision Python speech recognition
      const pythonRes = await recordAndProcessWithPython(3500);
      if (!pythonRes || !pythonRes.transcript) {
        // Fallback to browser capture
        const text = await captureVoiceInput('Listening for your command...');
        if (text) {
          simulateVoiceInput(text);
        }
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <aside
      aria-label="Hands-free voice assistant"
      className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2 font-sans select-none"
    >
      {/* Expanded Voice Command Cheat Sheet & Quick Actions */}
      {isExpanded && (
        <div className="bg-slate-900/95 border border-slate-700/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-white w-96 max-w-[90vw] space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-100">Voice Navigation & Universal Auto-Fill</span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${pythonVoiceOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {pythonVoiceOnline ? '🐍 Python Speech Engine: Active' : '⚡ Python Engine: Connecting...'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-2 py-0.5 font-mono focus:outline-none"
                title="Select Speech Recognition Accent / Language"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
              </select>
              <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            </div>
          </div>

          {/* Dedicated Push-to-Talk Command Launcher */}
          <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-3 rounded-xl border border-blue-500/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>Python Voice Engine</span>
              </span>
              <p className="text-[10px] text-slate-300">
                Click to record spoken command or dictation for Python NLP.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePushToTalk}
              disabled={isCapturing}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shrink-0 ${
                isCapturing
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <Mic className={`w-4 h-4 ${isCapturing ? 'animate-bounce' : ''}`} />
              <span>{isCapturing ? 'Listening (Python)...' : 'Click to Speak'}</span>
            </button>
          </div>

          {/* Interactive Voice Sandbox / Command Simulator */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-2">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
              ⚡ Run Command / Fill Active Input:
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
                placeholder="Type command ('courses', 'Option B') or text to fill..."
                className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="submit"
                disabled={!simulationInput.trim()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1"
                title="Execute voice pipeline command"
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
                onClick={() => handleSimulate('play video')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-purple-300 font-mono transition"
              >
                "play video"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('Option B')}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-rose-300 font-mono transition"
              >
                "Option B"
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 space-y-2">
            <p className="text-[10px] text-slate-400">Common Spoken Commands (English / हिंदी):</p>

            {/* Core Navigation Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSimulate('courses')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>"courses"</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulate('profile')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <User className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span>"profile"</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulate('chatbot')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>"chatbot"</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulate('home')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <Home className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>"home"</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulate('camera')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 hover:border-amber-400/60 transition flex items-center gap-2 text-xs text-amber-300 font-mono"
              >
                <Camera className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                <span>"camera"</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulate('read aloud')}
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
                <button
                  type="button"
                  onClick={() => handleSimulate('Option A')}
                  className="bg-slate-800/70 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700/60 text-emerald-400 text-left transition"
                >
                  "Option A / B / C / D"
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('next question')}
                  className="bg-slate-800/70 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700/60 text-blue-400 text-left transition"
                >
                  "Next Question"
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('submit assessment')}
                  className="bg-slate-800/70 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700/60 text-amber-400 text-left transition"
                >
                  "Submit Assessment"
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('stop')}
                  className="bg-slate-800/70 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700/60 text-rose-400 text-left transition"
                >
                  "Stop / रुको"
                </button>
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-xs transition shadow-lg ${
            isVoiceActive
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 ring-2 ring-red-400/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title={isVoiceActive ? 'Click to Turn Off Voice Navigation' : 'Click to Turn On Voice Navigation'}
        >
          {isVoiceActive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <Mic className="w-3.5 h-3.5 text-white" />
              <span className="font-bold text-[11px]">Voice ON</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5 opacity-80" />
              <span className="font-semibold text-[11px]">Voice OFF</span>
            </>
          )}
        </button>

        {/* Push-to-Talk Quick Button */}
        <button
          type="button"
          onClick={handlePushToTalk}
          disabled={isCapturing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition shadow ${
            isCapturing
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
          }`}
          title="Click to speak a voice command directly"
        >
          <Mic className={`w-3.5 h-3.5 ${isCapturing ? 'animate-bounce' : ''}`} />
          <span>{isCapturing ? 'Listening...' : 'Click to Speak'}</span>
        </button>

        {/* Live Status / Transcript Ticker */}
        <div className="max-w-[200px] truncate px-1 text-xs text-slate-200">
          {lastActionStatus ? (
            <span className="text-emerald-300 font-mono text-[10px] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
              <span className="truncate">{lastActionStatus}</span>
            </span>
          ) : lastRecognizedPhrase ? (
            <span className="text-amber-300 font-mono font-medium text-[10px]">"{lastRecognizedPhrase}"</span>
          ) : (
            <span className="text-slate-400 text-[10px]">Speak command or click buttons</span>
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
      </div>
    </aside>
  );
};

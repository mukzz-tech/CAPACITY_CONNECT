import React, { useState, useRef, useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';
import { startWavRecording, WavRecorderSession } from '../utils/wavRecorder';
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
  Send,
  CheckCircle2,
  Square,
  Radio,
  X,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VoiceAssistantWidget: React.FC = () => {
  const {
    isVoiceActive,
    toggleVoice,
    lastRecognizedPhrase,
    lastActionStatus,
    audioLevel,
    currentLanguage,
    setLanguage,
    simulateVoiceInput,
    playTone,
    pythonVoiceOnline,
    transcribeAudioWithPython,
    listenWithPythonHardwareMic,
    executeParsedCommand,
  } = useVoice();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [simulationInput, setSimulationInput] = useState<string>('');
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);

  const recorderSessionRef = useRef<WavRecorderSession | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const autoStopTimeoutRef = useRef<any>(null);
  const navigate = useNavigate();

  // Clean up any in-flight recording session on unmount
  useEffect(() => {
    return () => {
      if (recorderSessionRef.current) {
        recorderSessionRef.current.cancel();
        recorderSessionRef.current = null;
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    };
  }, []);

  const handleSimulate = (text: string) => {
    if (!text.trim()) return;
    simulateVoiceInput(text.trim());
    setSimulationInput('');
  };

  // Stop recording and process audio with Python Speech Engine
  const stopAndProcessRecording = async () => {
    if (!recorderSessionRef.current || recordingState !== 'recording') return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    setRecordingState('processing');
    playTone(520, 0.08);

    try {
      const session = recorderSessionRef.current;
      recorderSessionRef.current = null;
      const wavBlob = await session.stop();
      setLocalAudioLevel(0);

      if (!wavBlob) {
        setRecordingState('idle');
        return;
      }

      // Send 16-bit PCM WAV to Python Speech Service
      const result = await transcribeAudioWithPython(wavBlob, currentLanguage);
      setRecordingState('idle');

      if (result && result.transcript) {
        playTone(680, 0.15);
      }
    } catch (err: any) {
      console.warn('[Voice Capture] Stop error:', err);
      setRecordingState('idle');
    }
  };

  // Cancel recording without processing
  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    if (recorderSessionRef.current) {
      recorderSessionRef.current.cancel();
      recorderSessionRef.current = null;
    }
    setRecordingState('idle');
    setLocalAudioLevel(0);
    playTone(300, 0.1);
  };

  // Start direct browser microphone recording
  const startRecordingSession = async () => {
    if (recordingState !== 'idle') return;

    playTone(580, 0.12);
    setRecordingSeconds(0);
    setRecordingState('recording');

    try {
      const session = await startWavRecording({
        onLevel: (lvl) => setLocalAudioLevel(lvl),
      });

      recorderSessionRef.current = session;

      // Seconds ticker
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Auto-stop after 3.8 seconds of phrase capture
      autoStopTimeoutRef.current = setTimeout(() => {
        stopAndProcessRecording();
      }, 3800);
    } catch (err: any) {
      console.warn('[Voice Capture] Browser mic capture error, trying Python hardware mic fallback:', err.message);
      setRecordingState('processing');

      // Fallback: Direct hardware Realtek mic capture in Python
      try {
        const directRes = await listenWithPythonHardwareMic();
        if (directRes && directRes.command) {
          executeParsedCommand(directRes.command);
        }
      } finally {
        setRecordingState('idle');
      }
    }
  };

  // Direct trigger for Python native hardware microphone
  const handleHardwareMicClick = async () => {
    setRecordingState('processing');
    playTone(580, 0.12);
    try {
      await listenWithPythonHardwareMic();
    } finally {
      setRecordingState('idle');
    }
  };

  const displayLevel = recordingState === 'recording' ? localAudioLevel : audioLevel;

  return (
    <aside
      aria-label="Hands-free voice assistant"
      className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2 font-sans select-none"
    >
      {/* Active Recording Floating Card */}
      {recordingState === 'recording' && (
        <div className="bg-slate-900/98 border-2 border-red-500 rounded-2xl p-4 shadow-2xl text-white w-84 max-w-[90vw] space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-red-300 uppercase tracking-wider">
                Recording ({3 - recordingSeconds > 0 ? `${3 - recordingSeconds}s` : 'Analyzing...'})
              </span>
            </div>
            <button
              onClick={cancelRecording}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Cancel recording"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sound Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1.5 h-10 py-1 bg-slate-950/70 rounded-xl border border-slate-800">
            {[20, 45, 80, 100, 75, 40, 60, 90, 50, 25].map((baseHeight, idx) => {
              const dynamicHeight = Math.max(8, Math.min(36, (displayLevel / 100) * baseHeight * 1.4));
              return (
                <div
                  key={idx}
                  className="w-1.5 bg-gradient-to-t from-red-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${dynamicHeight}px` }}
                />
              );
            })}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-white">Speak your command clearly now:</p>
            <p className="text-[11px] text-amber-300 font-mono">"courses", "profile", "chatbot", "home", "play video"</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={stopAndProcessRecording}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done Speaking (Execute)</span>
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Processing Indicator Card */}
      {recordingState === 'processing' && (
        <div className="bg-slate-900/98 border border-blue-500 rounded-2xl p-3.5 shadow-2xl text-white w-80 max-w-[90vw] flex items-center gap-3 animate-in fade-in duration-150">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-300">Analyzing Speech with Python Engine...</p>
            <p className="text-[10px] text-slate-400 font-mono">SpeechRecognition Google Multi-Accent ASR</p>
          </div>
        </div>
      )}

      {/* Expanded Voice Command Cheat Sheet & Quick Actions */}
      {isExpanded && (
        <div className="bg-slate-900/98 border border-slate-700/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-white w-96 max-w-[90vw] space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-100">Voice Navigation & Universal Auto-Fill</span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${pythonVoiceOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {pythonVoiceOnline ? '🐍 Python Speech Engine: ONLINE (Port 5005)' : '⚡ Python Engine: Connecting...'}
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

          {/* Dedicated Capture Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={startRecordingSession}
              disabled={recordingState !== 'idle'}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <Mic className="w-4 h-4" />
              <span>🎙️ Click to Speak</span>
            </button>

            <button
              type="button"
              onClick={handleHardwareMicClick}
              disabled={recordingState !== 'idle'}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              title="Record directly from the server laptop hardware microphone"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Python Server Mic</span>
            </button>
          </div>

          {/* Interactive Voice Sandbox / Command Simulator */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-2">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
              ⚡ 1-Click Instant Command Simulator:
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
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-amber-300 font-mono transition"
              >
                📘 "courses"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('profile')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-blue-300 font-mono transition"
              >
                👤 "profile"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('chatbot')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-emerald-300 font-mono transition"
              >
                💬 "chatbot"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('home')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-indigo-300 font-mono transition"
              >
                🏠 "home"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('study')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-purple-300 font-mono transition"
              >
                📚 "study"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('camera')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-pink-300 font-mono transition"
              >
                📹 "camera"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('play video')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-emerald-400 font-mono transition"
              >
                ▶️ "play video"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('pause video')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-amber-400 font-mono transition"
              >
                ⏸️ "pause video"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('read aloud')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-rose-300 font-mono transition"
              >
                🔊 "read aloud"
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('Option B')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-rose-400 font-mono transition"
              >
                📝 "Option B"
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 space-y-2">
            <p className="text-[10px] text-slate-400">Assessment Hands-Free Controls:</p>

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

            {/* Multilingual Notes */}
            <div className="text-[9px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex justify-between items-center">
              <span>Hindi / हिन्दी समर्थित:</span>
              <span className="text-slate-300 font-mono">"पाठ्यक्रम", "होम", "प्रोफ़ाइल", "विकल्प बी"</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Control Pill */}
      <div className="flex items-center gap-2 bg-slate-900/98 border border-slate-700 shadow-2xl rounded-full p-1.5 backdrop-blur-md transition-all duration-200 hover:border-slate-500">
        {/* Toggle Voice Button */}
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

        {/* Primary Click to Speak Button */}
        <button
          type="button"
          onClick={startRecordingSession}
          disabled={recordingState !== 'idle'}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition shadow-lg ${
            recordingState === 'recording'
              ? 'bg-red-500 text-white animate-pulse shadow-red-500/40'
              : recordingState === 'processing'
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 ring-1 ring-blue-400/40'
          }`}
          title="Click to speak a voice command directly"
        >
          <Mic className={`w-3.5 h-3.5 ${recordingState === 'recording' ? 'animate-bounce' : ''}`} />
          <span>
            {recordingState === 'recording'
              ? 'Listening...'
              : recordingState === 'processing'
              ? 'Analyzing...'
              : 'Click to Speak'}
          </span>
        </button>

        {/* Live Status / Transcript Ticker */}
        <div className="max-w-[220px] truncate px-1 text-xs text-slate-200">
          {lastActionStatus ? (
            <span className="text-emerald-300 font-mono text-[10px] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
              <span className="truncate">{lastActionStatus}</span>
            </span>
          ) : lastRecognizedPhrase ? (
            <span className="text-amber-300 font-mono font-medium text-[10px]">"{lastRecognizedPhrase}"</span>
          ) : (
            <span className="text-slate-400 text-[10px]">Say "courses", "profile", "chatbot"...</span>
          )}
        </div>

        {/* Expand / Collapse Chevrons */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title={isExpanded ? 'Hide voice controls' : 'Show voice controls & simulator'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

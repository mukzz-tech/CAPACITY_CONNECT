import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import {
  MessageSquare,
  Send,
  Mic,
  Sparkles,
  Bot,
  User as UserIcon,
  HelpCircle,
  Database,
  CheckCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ChatMsg {
  id?: string;
  sender: 'user' | 'assistant';
  content: string;
  isCached?: boolean;
  source?: string;
}

export const ChatbotPage: React.FC = () => {
  const { user } = useAuth();
  const { speakText, playTone, captureVoiceInput } = useVoice();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: 'assistant',
      content:
        'Namaste! I am the IMD Meteorological AI Assistant. You can ask me any theoretical or practical question from our study materials (e.g. Doppler radar formulas, cyclone warning stages, atmospheric thermodynamics), course syllabi, promotion eligibility, or assessment grading criteria.',
      source: 'IMD Meteorological Knowledge Engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const faqQueries = [
    'Explain Doppler Weather Radar principles and reflectivity thresholds',
    'What are the 4 stages of IMD cyclone warnings?',
    'Explain dry and saturated adiabatic lapse rates (DALR / SALR)',
    'What are the surface weather observation standards per WMO-No. 8?',
    'What is the eligibility for the Forecasters Training Course?',
    'What courses do I still need for my next promotion?',
  ];

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const inputRef = useRef<string>('');
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    const handleVoiceDictation = (e: any) => {
      const phrase = e.detail;
      if (!phrase) return;
      // Skip navigation phrases
      if (['courses', 'profile', 'home', 'chatbot', 'camera', 'read aloud', 'stop', 'help', 'scroll down', 'scroll up'].includes(phrase.toLowerCase().trim())) {
        return;
      }
      const clean = phrase.replace(/^(ask|question|doubt|search|tell me)\s*/i, '').trim();
      setInput(clean);
      playTone(650, 0.08);
    };

    const handleVoiceSendMessage = () => {
      const curr = inputRef.current;
      if (curr && curr.trim()) {
        handleSend(curr.trim());
      }
    };

    const handleVoiceClearChat = () => {
      setMessages([]);
      setInput('');
      playTone(450, 0.1);
    };

    window.addEventListener('imd-voice-general', handleVoiceDictation);
    window.addEventListener('imd-voice-send-message', handleVoiceSendMessage);
    window.addEventListener('imd-voice-clear-chat', handleVoiceClearChat);

    return () => {
      window.removeEventListener('imd-voice-general', handleVoiceDictation);
      window.removeEventListener('imd-voice-send-message', handleVoiceSendMessage);
      window.removeEventListener('imd-voice-clear-chat', handleVoiceClearChat);
    };
  }, []);

  const chatbotAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakAloud = (text: string) => {
    // Clean markdown before speaking
    const clean = text
      .replace(/#+\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/•\s*/g, '')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .trim();

    if (!clean) return;

    // Check if text has Devanagari Hindi characters
    const hasHindi = /[\u0900-\u097F]/.test(clean);

    if (hasHindi) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (chatbotAudioRef.current) {
        chatbotAudioRef.current.pause();
      }
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(clean.substring(0, 180))}&lang=hi`);
      chatbotAudioRef.current = audio;
      audio.play().catch(console.warn);
      return;
    }

    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find((v) => v.lang.includes('en'));
    if (matched) utterance.voice = matched;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMsg = { sender: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    playTone(480, 0.1);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: query }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            content: data.answer,
            isCached: data.isCached,
            source: data.source || (data.isCached ? 'IMD FAQ Knowledge Cache' : 'IMD Study Content Knowledge Engine'),
          },
        ]);
        // Audibly speak out response if autoSpeak is enabled ("make noise")
        if (autoSpeak) {
          setTimeout(() => speakAloud(data.answer), 300);
        }
      } else {
        const errMsg = 'Sorry, I encountered an error while retrieving that meteorological information.';
        setMessages((prev) => [
          ...prev,
          { sender: 'assistant', content: errMsg },
        ]);
        if (autoSpeak) speakAloud(errMsg);
      }
    } catch (e: any) {
      const errMsg = `Network error: ${e.message}`;
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', content: errMsg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceQuery = async () => {
    setIsRecording(true);
    try {
      const transcript = await captureVoiceInput('Listening for your meteorological doubt. Speak now.');
      if (transcript) {
        setInput(transcript);
        playTone(650, 0.15);
        handleSend(transcript);
      }
    } catch (e) {
      console.warn('Voice query error:', e);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">IMD Meteorological AI Voice Assistant</h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full">
                Context-Aware & Voice-Enabled
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Speak or type doubts. Replies are answered and read aloud in real-time.
            </p>
          </div>
        </div>

        {/* Audio Speech Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak) {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              } else {
                playTone(500, 0.1);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              autoSpeak
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                : 'bg-slate-50 border-slate-300 text-slate-600'
            }`}
            title="Toggle Voice Read Aloud Replies"
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{autoSpeak ? 'Audio Speech: ON' : 'Audio Speech: OFF'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>FAQ Cache Active</span>
          </div>
        </div>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Frequent Meteorological Inquiries (Click to Ask):
        </span>
        <div className="flex flex-wrap gap-2">
          {faqQueries.map((faq, i) => (
            <button
              key={i}
              onClick={() => handleSend(faq)}
              className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition text-left flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{faq}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread Window */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[420px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {m.sender === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 gap-2 flex-wrap">
                  <button
                    onClick={() => speakAloud(m.content)}
                    className="flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                    title="Speak this answer aloud"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Play Voice</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {m.source && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1 font-medium">
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        <span>{m.source}</span>
                      </span>
                    )}

                    {m.isCached && (
                      <span className="flex items-center gap-1 text-emerald-700 font-mono">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Cached</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                {user?.profile?.fullName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-400 italic">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span>Gathering meteorological context & formulating audio reply...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex items-center gap-2">
        <button
          type="button"
          onClick={handleVoiceQuery}
          className={`p-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
            isRecording
              ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/30'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
          }`}
          title="Speak your question directly"
        >
          <Mic className="w-4 h-4" />
          <span>{isRecording ? 'Listening...' : 'Speak'}</span>
        </button>

        <input
          type="text"
          placeholder="Ask about Doppler radar, cyclone models, skill gaps, or course requirements..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          className="flex-1 text-xs px-3 py-2 border-0 focus:outline-none text-slate-800"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

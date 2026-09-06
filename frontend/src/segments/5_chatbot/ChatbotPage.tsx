import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

interface ChatMsg {
  id?: string;
  sender: 'user' | 'assistant';
  content: string;
  isCached?: boolean;
}

export const ChatbotPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: 'assistant',
      content:
        'Namaste! I am the IMD Capacity Connect Assistant. You can ask me about meteorological course syllabi, promotion eligibility, your personal competency gaps, or assessment grading criteria.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const faqQueries = [
    'What is the eligibility for the Forecasters Training Course?',
    'What courses do I still need for my next promotion?',
    'What are the passing grades and criteria?',
    'How does proctoring work and is my video recorded?',
  ];

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMsg = { sender: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

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
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            content: 'Sorry, I encountered an error while retrieving that meteorological information.',
          },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', content: `Network error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceQuery = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not available in this browser.');
      return;
    }

    setIsRecording(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      handleSend(transcript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
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
              <h1 className="text-lg font-bold text-slate-900">IMD Meteorological AI Assistant</h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full">
                Context-Aware
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Instant responses powered by FAQ caching and role competency data (Section 14).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>FAQ Cache Active (Zero-Cost)</span>
        </div>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Frequent Meteorological Inquiries:
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

              {m.isCached && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1 text-[10px] text-emerald-700 font-mono">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>Served from High-Speed FAQ Cache (0 API Cost)</span>
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
            <span>Gathering competency gap & course context...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex items-center gap-2">
        <button
          type="button"
          onClick={handleVoiceQuery}
          className={`p-2.5 rounded-xl transition ${
            isRecording
              ? 'bg-red-600 text-white animate-pulse'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="Speak your doubt via Speech-to-Text"
        >
          <Mic className="w-5 h-5" />
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
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

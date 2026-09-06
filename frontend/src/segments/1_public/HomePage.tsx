import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudSun,
  ShieldCheck,
  Award,
  Mic,
  Volume2,
  Cpu,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Bell,
  Search,
} from 'lucide-react';
import { Announcement } from '../../types';

export const HomePage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch('/api/admin/announcements')
      .then((res) => res.json())
      .then((data) => {
        if (data.announcements) setAnnouncements(data.announcements);
      })
      .catch((e) => console.warn(e));
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#1e40af_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-500/30 text-blue-300 text-xs font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SIH 2026 PS #26075 — Ministry of Earth Sciences (IMD)</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Digital Capacity Building & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              Learning Management Portal
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-8 font-light leading-relaxed">
            Empowering India's meteorological workforce with institutional curricula, continuous per-lesson multi-modal grading, and privacy-first client-side assistive technologies.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/courses"
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              <span>Explore Course Catalogue</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/chatbot"
              className="px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-medium transition flex items-center gap-2"
            >
              <Cpu className="w-5 h-5 text-emerald-400" />
              <span>Ask AI Meteorological Assistant</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Announcements Feed */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-800">Official IMD Training Announcements</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Live Broadcast</span>
          </div>

          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition flex items-start gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0"></div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{ann.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No new administrative announcements at this time.</p>
            )}
          </div>
        </div>
      </section>

      {/* 4 Core Assistive Technologies */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Four Groundbreaking Assistive Technologies
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Engineered to run inside the trainee's browser for 100% privacy and zero server compute cost.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. OpenCV In-Browser Proctoring */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">OpenCV Face Proctoring</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Dual-mode local detection: Strict mode during exams (100-pt integrity deduction) and Lenient mode during lectures (gentle pause nudge, 0 penalty).
            </p>
            <span className="text-[11px] font-semibold text-blue-700">Zero Video Upload • 100% Client</span>
          </div>

          {/* 2. Text-to-Speech */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Bilingual Text-to-Speech</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Native Web Speech synthesis reading lecture notes in English and Hindi with speed controls (0.75x–1.5x) for auditory and regional learners.
            </p>
            <span className="text-[11px] font-semibold text-emerald-700">English & Hindi • Instant Audio</span>
          </div>

          {/* 3. Voice Navigation & Answers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Voice Commands & Answers</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Hands-free navigation ("go to courses", "read aloud") and spoken assessment answers transcribed into auto-graded submission fields.
            </p>
            <span className="text-[11px] font-semibold text-indigo-700">Hands-Free • Accessibility</span>
          </div>

          {/* 4. AI Chatbot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Context AI & FAQ Cache</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              24/7 doubt-clearing assistant with FAQ caching for zero-cost immediate answers and competency-gap aware recommendations.
            </p>
            <span className="text-[11px] font-semibold text-purple-700">FAQ Cache • Rate Limited</span>
          </div>
        </div>
      </section>

      {/* Official IMD 5-Tier Grading Scale Info */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-8 text-white shadow-xl">
          <div className="max-w-3xl">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold">
              Official IMD Training Procedure Standard
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 mb-4">
              Continuous Per-Lesson Grading & 5-Tier Fixed Scale
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              A trainee's grade is the sole grade built entirely as the arithmetic average of all per-lesson assessments. No split between internal and external tests. Each lesson supports mixed formats (MCQ, Fill-in-the-Blank, Match Pairs, Voice Answers).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">90.0% +</span>
                <strong className="text-sm text-emerald-400">Outstanding</strong>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">80.1 - 89.9%</span>
                <strong className="text-sm text-sky-400">Excellent</strong>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">70.0 - 80.0%</span>
                <strong className="text-sm text-blue-400">Very Good</strong>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">60.0 - 69.9%</span>
                <strong className="text-sm text-amber-400">Good</strong>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-400 block font-mono">50.0 - 59.9%</span>
                <strong className="text-sm text-indigo-300">Passed</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

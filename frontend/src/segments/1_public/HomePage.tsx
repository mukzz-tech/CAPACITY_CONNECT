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
  Sparkles,
  Compass,
  GraduationCap,
  Layers,
  Radio,
  Clock,
  Users,
  BarChart3,
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

  const coursesSummary = [
    {
      code: 'IMD-MET-GR2',
      title: 'Meteorologist Gr-II Training Course',
      duration: '52 Weeks (12 Mos)',
      cadre: 'Group-A UPSC Trainees',
      focus: 'General Meteorology, Dynamic Thermodynamics, Agri-Met, Doppler Radar & Satellites',
      badge: 'Institutional Flagship',
    },
    {
      code: 'IMD-IMTC-SA',
      title: 'Integrated Meteorological Training Course (IMTC)',
      duration: '17 Weeks (4 Mos)',
      cadre: 'Group-B SSC Scientific Assistants',
      focus: 'Surface Observational Code, AWS Calibration, Upper-Air RS/RW & Radar Ops',
      badge: 'Core Induction',
    },
    {
      code: 'IMD-INTER-MET',
      title: 'Intermediate Training Course',
      duration: '17 Weeks (4 Mos)',
      cadre: 'Promoted Scientific Assistants',
      focus: 'Climatological Computations, Aviation Met Reports (METAR/SPECI), Instruments',
      badge: 'Cadre Progression',
    },
    {
      code: 'IMD-FTC-GAZ',
      title: 'Forecasters Training Course (FTC)',
      duration: '26 Weeks (6 Mos)',
      cadre: 'Group-B Gazetted Officers',
      focus: 'Synoptic Weather Analysis, Tropical Cyclone Track Prediction & NWP Guidance',
      badge: 'Operational Forecasting',
    },
    {
      code: 'IMD-ATICIS-TECH',
      title: 'Advanced Training in Instruments & Comms (ATICIS)',
      duration: '26 Weeks (6 Mos)',
      cadre: 'Technical & Telecomm Officers',
      focus: 'Doppler Radar Maintenance, High-Speed Telecomm Systems, Satellite Ground Stations',
      badge: 'Technical & Systems',
    },
    {
      code: 'IMD-AMTC-DEF',
      title: 'Advanced Meteorological Training Course (AMTC)',
      duration: '52 Weeks (12 Mos)',
      cadre: 'Indian Navy, Coast Guard & NMHS Officers',
      focus: 'Marine Meteorological Forecasting, High-Seas Bulletins, Aeronautical Meteorology',
      badge: 'Defense & NMHS',
    },
    {
      code: 'IMD-ORIENT-MTS',
      title: 'Orientation Training Course',
      duration: '13 Weeks (3 Mos)',
      cadre: 'MTS & Part-Time Observers',
      focus: 'Meteorological Observation Protocol, Daily Rainfall Gauges, Cloud Identification',
      badge: 'Field Operations',
    },
    {
      code: 'IMD-REF-SHORT',
      title: 'Operational Refresher & Customized Modules',
      duration: '1–2 Weeks',
      cadre: 'Experienced Operational Staff',
      focus: 'Nowcasting Severe Convection, Flash Flood Guidance, Urban Flood Warnings',
      badge: 'Specialized Refresher',
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#1e40af_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/70 border border-blue-500/40 text-blue-300 text-xs font-medium mb-6 backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Government of India • Ministry of Earth Sciences • India Meteorological Department</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Digital Capacity Building & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              Meteorological Learning Portal
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto mb-8 font-normal leading-relaxed">
            Empowering India's meteorological workforce with institutional curricula, continuous per-lesson multi-modal grading, and privacy-first client-side assistive technologies for Regional Meteorological Centres across the nation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link
              to="/courses"
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              <span>Explore All 8 Courses</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/chatbot"
              className="px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-medium transition flex items-center gap-2 shadow-sm"
            >
              <Cpu className="w-5 h-5 text-emerald-400" />
              <span>Interactive AI Assistant</span>
            </Link>
          </div>

          {/* Institutional Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t border-slate-800/80 max-w-4xl mx-auto text-left">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-white block">8</span>
              <span className="text-[11px] text-slate-400">Institutional Curricula</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-sky-400 block">49+</span>
              <span className="text-[11px] text-slate-400">Structured Lessons</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-emerald-400 block">280+</span>
              <span className="text-[11px] text-slate-400">Meteorological MCQs</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-purple-400 block">3</span>
              <span className="text-[11px] text-slate-400">Languages (EN, HI, TA)</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-2xl font-bold text-amber-400 block">100%</span>
              <span className="text-[11px] text-slate-400">Client-Side Privacy</span>
            </div>
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

          <div className="space-y-3">
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

      {/* All 8 Official Training Programs Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200">
            <GraduationCap className="w-4 h-4" />
            <span>Ministry of Earth Sciences Curriculum Framework</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Official IMD Training Programs
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Standardized institutional training programs structured for UPSC Group-A meteorologists, SSC Group-B scientific assistants, and operational personnel across India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {coursesSummary.map((c, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {c.code}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {c.duration}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-2 group-hover:text-blue-600 transition leading-snug">
                  {c.title}
                </h3>

                <div className="space-y-1.5 mb-4 text-xs text-slate-600">
                  <p className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">Target Cadre:</strong> {c.cadre}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    <strong className="text-slate-700">Core Disciplines:</strong> {c.focus}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {c.badge}
                </span>
                <Link
                  to="/courses"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Core Assistive Technologies */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Privacy-First Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Four Groundbreaking Assistive Technologies
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Engineered to run directly inside the trainee's browser for 100% privacy and zero server compute cost.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. OpenCV In-Browser Proctoring */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">OpenCV Face Proctoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Dual-mode local detection: Strict mode during exams (100-pt integrity deduction) and Lenient mode during lectures (gentle pause nudge, 0 penalty).
              </p>
            </div>
            <span className="text-[11px] font-semibold text-blue-700">Zero Video Upload • 100% Client</span>
          </div>

          {/* 2. Text-to-Speech */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Tri-Lingual Text-to-Speech</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Native Web Speech synthesis reading lecture notes in English, Hindi, and Tamil with speed controls (0.75x–1.5x) for regional learners.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700">EN • हिंदी • தமிழ் Supported</span>
          </div>

          {/* 3. Voice Navigation & Answers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Voice Commands & Answers</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Hands-free voice navigation ("go to courses", "read notes") and spoken assessment answers transcribed into auto-graded fields.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700">Hands-Free • Zero-Delay</span>
          </div>

          {/* 4. AI Chatbot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Context AI & Study RAG</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                24/7 doubt-clearing assistant with dynamic study content RAG, FAQ caching for zero cost, and role competency gap recommendations.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-purple-700">Study RAG • FAQ Cache</span>
          </div>
        </div>
      </section>

      {/* Official IMD 5-Tier Grading Scale Info */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl">
          <div className="max-w-3xl">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold">
              Official IMD Training Procedure Standard
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 mb-4">
              Continuous Per-Lesson Grading & 5-Tier Fixed Scale
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              A trainee's grade is the sole grade built entirely as the arithmetic average of all per-lesson assessments. No arbitrary split between internal and external tests. Each lesson supports mixed formats (MCQ, Fill-in-the-Blank, Match Pairs, Voice Answers).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">90.0% +</span>
                <strong className="text-sm text-emerald-400">Outstanding</strong>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">80.1 - 89.9%</span>
                <strong className="text-sm text-sky-400">Excellent</strong>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">70.0 - 80.0%</span>
                <strong className="text-sm text-blue-400">Very Good</strong>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400 block font-mono">60.0 - 69.9%</span>
                <strong className="text-sm text-amber-400">Good</strong>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-center col-span-2 sm:col-span-1">
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


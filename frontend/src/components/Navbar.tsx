import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import {
  CloudSun,
  Mic,
  MicOff,
  UserCheck,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Award,
  ShieldCheck,
  LogOut,
  LogIn,
  Sliders,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isVoiceActive, toggleVoice, isListening, lastRecognizedPhrase } = useVoice();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-md text-white">
      {/* Top Ministry Ribbon */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs border-b border-slate-800/60 flex justify-between items-center text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">भारत सरकार | Government of India</span>
          <span className="text-slate-600">•</span>
          <span>पृथ्वी विज्ञान मंत्रालय | Ministry of Earth Sciences</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-medium">SIH 2026 PS #26075</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Official IMD Capacity Building Portal</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <CloudSun className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">CAPACITY CONNECT</span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">IMD</span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide">India Meteorological Department Learning Portal</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md transition ${isActive('/') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
            >
              Home
            </Link>

            <Link
              to="/courses"
              className={`px-3 py-2 rounded-md transition flex items-center gap-1.5 ${isActive('/courses') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
            >
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Courses</span>
            </Link>

            <Link
              to="/chatbot"
              className={`px-3 py-2 rounded-md transition flex items-center gap-1.5 ${isActive('/chatbot') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>AI Assistant</span>
            </Link>

            {user?.role === 'TRAINER' && (
              <Link
                to="/trainer"
                className={`px-3 py-2 rounded-md transition flex items-center gap-1.5 ${isActive('/trainer') ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
              >
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Trainer Studio</span>
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md transition flex items-center gap-1.5 ${isActive('/admin') ? 'bg-slate-800 text-purple-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Admin Console</span>
              </Link>
            )}
          </nav>

          {/* Action Bar (Voice Toggle, Profile, Auth) */}
          <div className="flex items-center gap-3">
            {/* Global Voice Command Toggle */}
            <button
              onClick={toggleVoice}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                isVoiceActive
                  ? 'bg-red-950/80 border-red-600 text-red-300 shadow-sm shadow-red-900'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Toggle Hands-Free Voice Control (Speak: 'go to courses', 'open my certificates', 'next question')"
            >
              {isVoiceActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <Mic className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-semibold">Voice Active</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Voice Control</span>
                </>
              )}
            </button>

            {/* Profile / Auth actions */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs transition"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.profile?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="font-medium text-slate-200 leading-tight">{user.profile?.fullName || user.email}</p>
                    <p className="text-[10px] text-blue-400 font-mono">{user.role}</p>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Live Voice Command Bar (Shown whenever Voice Control is ON) */}
        {isVoiceActive && (
          <div className="py-1.5 px-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-t border-red-800/60 flex flex-wrap items-center justify-between text-xs text-red-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-red-400" />
              </div>
              <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="font-semibold text-white">
                {lastRecognizedPhrase ? (
                  <>Heard: <strong className="text-amber-300 font-mono text-xs">"{lastRecognizedPhrase}"</strong></>
                ) : (
                  <span className="text-red-200 animate-pulse">Listening for voice command...</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="text-slate-400">Try saying:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-amber-300">"courses"</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-amber-300">"profile"</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-amber-300">"chatbot"</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-amber-300">"read aloud"</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

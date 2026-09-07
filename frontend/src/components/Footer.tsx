import React from 'react';
import { ShieldCheck, Lock, Award, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-white font-semibold mb-2">CAPACITY CONNECT</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Digital Capacity Building & Learning Management Portal for the India Meteorological Department, Ministry of Earth Sciences.
            </p>
            <div className="mt-3 flex items-center gap-2 text-slate-500 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero Video Upload Privacy Architecture</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Institutional Programmes</h4>
            <ul className="space-y-1 text-slate-400 text-xs">
              <li>Meteorologist Gr-II Training</li>
              <li>Integrated Met Training Course</li>
              <li>Forecasters Training Course</li>
              <li>Advanced Met Training Course</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Assistive Technologies</h4>
            <ul className="space-y-1 text-slate-400 text-xs">
              <li>In-Browser Face Attentiveness</li>
              <li>Web Speech Read-Aloud (EN/HI)</li>
              <li>Hands-Free Voice Navigation</li>
              <li>AI Chatbot with FAQ Cache</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Official Verification</h4>
            <p className="text-slate-400 text-xs mb-2">
              All completion credentials bear verifiable cryptographic QR signatures.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>WMO-No. 8 & IMD Training Standard</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-slate-500 text-[11px]">
          <p>© 2026 Ministry of Earth Sciences, India Meteorological Department. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Free & Open-Source Cloud Infrastructure • Privacy-First Client-Side AI</p>
        </div>
      </div>
    </footer>
  );
};

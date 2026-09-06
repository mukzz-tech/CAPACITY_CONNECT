import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Award,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Settings,
  Globe,
  Mic,
  Eye,
} from 'lucide-react';
import { Certificate } from '../../types';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [competencyData, setCompetencyData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Settings toggles
  const [voiceOptIn, setVoiceOptIn] = useState<boolean>(user?.profile?.voiceOptIn || false);
  const [proctoringOptIn, setProctoringOptIn] = useState<boolean>(user?.profile?.proctoringOptIn || false);
  const [languagePref, setLanguagePref] = useState<string>(user?.profile?.languagePref || 'en');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Fetch trainee certificates
    fetch('/api/certificates/my-certificates', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.certificates) setCertificates(data.certificates);
      })
      .catch(console.warn);

    // Fetch competency gap
    fetch('/api/courses/recommendations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.recommendations) setCompetencyData(data.recommendations);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const savePreferences = async () => {
    setSavingSettings(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voiceOptIn,
          proctoringOptIn,
          languagePref,
        }),
      });

      if (res.ok) {
        await refreshUser();
        alert('Preferences updated successfully.');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {user?.profile?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{user?.profile?.fullName}</h1>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full font-mono">
                  {user?.role}
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  {user?.approvalStatus}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Designation:</strong> {user?.profile?.jobDesignation} • {user?.profile?.department}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {user?.email} • {user?.profile?.yearsExperience} Years Service
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Competency Portfolio Grid */}
      {competencyData && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Competency Portfolio & Skill Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Rule-based alignment against requirements for: <strong className="text-slate-800">{competencyData.jobDesignation}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Gap Status</span>
              <span className="font-mono text-sm font-bold text-blue-600">
                {competencyData.gapPercentage}% Pending
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Required */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 block mb-3 uppercase tracking-wider">
                Required Competencies ({competencyData.requiredCompetencies?.length || 0})
              </span>
              <div className="space-y-2">
                {competencyData.requiredCompetencies?.map((c: any) => (
                  <div key={c.id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                    <span className="font-mono text-[10px] text-blue-600 font-bold block">{c.code}</span>
                    <span className="font-medium text-slate-800">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Earned */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80">
              <span className="text-xs font-bold text-emerald-800 block mb-3 uppercase tracking-wider">
                Earned via Completed Courses ({competencyData.earnedCompetencies?.length || 0})
              </span>
              <div className="space-y-2">
                {competencyData.earnedCompetencies?.length > 0 ? (
                  competencyData.earnedCompetencies.map((c: any) => (
                    <div key={c.id} className="p-2 bg-white rounded-lg border border-emerald-200 text-xs">
                      <span className="font-mono text-[10px] text-emerald-600 font-bold block">{c.code}</span>
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No completed course competencies yet.</p>
                )}
              </div>
            </div>

            {/* Skill Gap */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
              <span className="text-xs font-bold text-amber-800 block mb-3 uppercase tracking-wider">
                Target Competency Gap ({competencyData.skillGap?.length || 0})
              </span>
              <div className="space-y-2">
                {competencyData.skillGap?.length > 0 ? (
                  competencyData.skillGap.map((c: any) => (
                    <div key={c.id} className="p-2 bg-white rounded-lg border border-amber-200 text-xs">
                      <span className="font-mono text-[10px] text-amber-600 font-bold block">{c.code}</span>
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-white rounded-lg text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All designated competencies fulfilled!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issued Certificates Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Award className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Official Verifiable Certificates of Completion
          </h2>
        </div>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-mono text-[11px] text-blue-700 font-bold">
                      {cert.certificateCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {cert.grade} ({cert.finalScore.toFixed(1)}%)
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{cert.courseTitle}</h3>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Issued on {new Date(cert.issueDate).toLocaleDateString('en-GB')}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <Link
                    to={`/verify/${cert.certificateCode}`}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-center text-xs font-semibold text-slate-700 transition"
                  >
                    Scan & Verify QR
                  </Link>
                  <a
                    href={cert.pdfFileUrl}
                    download={`IMD_Certificate_${cert.certificateCode}.pdf`}
                    className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Complete all lessons in a course with an overall average score of at least 50% to receive an official IMD QR-verifiable certificate.
          </p>
        )}
      </div>

      {/* Accessibility & Device Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Settings className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">
            Assistive Technology & Learning Preferences
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Mic className="w-4 h-4 text-indigo-600" />
              <span>Voice Navigation</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Enables speech commands for hands-free study navigation and spoken answering.
            </p>
            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={voiceOptIn}
                onChange={(e) => setVoiceOptIn(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700">Enable Voice Recognition</span>
            </label>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Lecture Attentiveness</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Lenient mode: friendly reminders and autopausing without any penalty.
            </p>
            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={proctoringOptIn}
                onChange={(e) => setProctoringOptIn(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700">Enable Lecture Monitoring</span>
            </label>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Bilingual Narration</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Preferred language for text-to-speech reading and portal materials.
            </p>
            <select
              value={languagePref}
              onChange={(e) => setLanguagePref(e.target.value)}
              className="w-full mt-2 rounded-lg border border-slate-300 p-1.5 text-xs bg-white"
            >
              <option value="en">English (default)</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>

        <button
          onClick={savePreferences}
          disabled={savingSettings}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition"
        >
          {savingSettings ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

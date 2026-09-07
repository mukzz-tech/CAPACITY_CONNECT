import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  UserCheck,
  BookOpen,
  Eye,
  BarChart3,
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Layers,
  Award,
} from 'lucide-react';

export const AdminConsolePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'USERS' | 'COURSES' | 'PROCTOR' | 'ANALYTICS' | 'TRAINERS' | 'ANNOUNCEMENTS'>('USERS');

  // Data states
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [reviewCourses, setReviewCourses] = useState<any[]>([]);
  const [flaggedAttempts, setFlaggedAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainerQuery, setTrainerQuery] = useState<string>('');

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = () => {
    // 1. Pending Users
    fetch('/api/admin/pending-users', { headers })
      .then((res) => res.json())
      .then((data) => setPendingUsers(data.users || []))
      .catch(console.warn);

    // 2. Course Review Queue
    fetch('/api/admin/courses/review-queue', { headers })
      .then((res) => res.json())
      .then((data) => setReviewCourses(data.courses || []))
      .catch(console.warn);

    // 3. Proctoring Review Queue
    fetch('/api/proctoring/review-queue', { headers })
      .then((res) => res.json())
      .then((data) => setFlaggedAttempts(data.flaggedAttempts || []))
      .catch(console.warn);

    // 4. Analytics
    fetch('/api/admin/analytics', { headers })
      .then((res) => res.json())
      .then((data) => setAnalytics(data.analytics))
      .catch(console.warn);

    // 5. Trainers
    fetch('/api/admin/trainers/search', { headers })
      .then((res) => res.json())
      .then((data) => setTrainers(data.trainers || []))
      .catch(console.warn);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveUser = async (targetUserId: string, action: 'APPROVE' | 'REJECT', assignedRole = 'TRAINEE') => {
    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ targetUserId, action, assignedRole }),
      });
      if (res.ok) {
        loadData();
        alert(`User successfully ${action.toLowerCase()}d.`);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePublishCourse = async (courseId: string, action: 'PUBLISH' | 'REJECT', reviewNote?: string) => {
    try {
      const res = await fetch('/api/admin/courses/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ courseId, action, reviewNote }),
      });
      if (res.ok) {
        loadData();
        alert(action === 'PUBLISH' ? 'Course officially published to trainee catalogue.' : 'Returned to trainer with revision comments.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ title: annTitle, content: annContent, priority: 1 }),
      });
      if (res.ok) {
        setAnnTitle('');
        setAnnContent('');
        alert('Official announcement published to portal homepage.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Administrative Control Console
            </h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full font-mono">
              Central Oversight (IMD HQ)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 7 Role Approvals, Course Publishing Gate, Analytics, and Proctoring Review Queue.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'USERS' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pending Approvals ({pendingUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COURSES')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'COURSES' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Publishing Queue ({reviewCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROCTOR')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'PROCTOR' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Proctoring Flags ({flaggedAttempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'ANALYTICS' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Live Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('TRAINERS')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'TRAINERS' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Trainer Search Index</span>
        </button>

        <button
          onClick={() => setActiveTab('ANNOUNCEMENTS')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'ANNOUNCEMENTS' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Announcements</span>
        </button>
      </div>

      {/* TAB 1: PENDING USERS */}
      {activeTab === 'USERS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Pending User Verification & Role Approvals (Section 7)
          </h2>

          {pendingUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-3">Full Name & Email</th>
                    <th className="py-3 px-3">Designation & Centre</th>
                    <th className="py-3 px-3">Requested Role</th>
                    <th className="py-3 px-3">Submitted Date</th>
                    <th className="py-3 px-3 text-right">Approval Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-medium">
                        <strong className="text-slate-900 block">{u.profile?.fullName}</strong>
                        <span className="text-slate-500 font-mono text-[11px]">{u.email}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {u.profile?.jobDesignation} • {u.profile?.department}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] font-mono">
                          {u.requestedRole}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleApproveUser(u.id, 'APPROVE', u.requestedRole)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition"
                        >
                          Approve ({u.requestedRole})
                        </button>
                        <button
                          onClick={() => handleApproveUser(u.id, 'REJECT')}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              All registrations have been reviewed. Zero pending users.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSE REVIEW & PUBLISHING */}
      {activeTab === 'COURSES' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Course Publishing Review Queue (Section 8 Gate)
          </h2>

          {reviewCourses.length > 0 ? (
            <div className="space-y-4">
              {reviewCourses.map((c) => (
                <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                    <div>
                      <span className="font-mono text-[11px] text-blue-700 font-bold block">{c.code}</span>
                      <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl">{c.description}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Author Trainer: {c.trainer?.profile?.fullName} ({c.trainer?.email})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/courses/${c.id}`}
                        className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition border border-purple-200 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Curriculum</span>
                      </Link>
                      <button
                        onClick={() => handlePublishCourse(c.id, 'PUBLISH')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm"
                      >
                        Publish to Catalogue
                      </button>
                      <button
                        onClick={() => handlePublishCourse(c.id, 'REJECT', 'Please add more comprehensive notes before publication.')}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs transition"
                      >
                        Request Revision
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-500">
                    <span>{c.durationWeeks} Weeks</span>
                    <span>•</span>
                    <span>{c.lessons?.length || 0} Lessons Defined</span>
                    <span>•</span>
                    <span>Status: <strong className="text-amber-700 font-mono">{c.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No courses are currently awaiting publication review.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROCTORING REVIEW QUEUE */}
      {activeTab === 'PROCTOR' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Proctoring Flag Review Queue (Section 11)
              </h2>
              <p className="text-xs text-slate-500">
                Assessment attempts where attentiveness or face orientation flags lowered the integrity score below 100.
              </p>
            </div>
          </div>

          {flaggedAttempts.length > 0 ? (
            <div className="space-y-4">
              {flaggedAttempts.map((attempt) => (
                <div key={attempt.id} className="p-5 rounded-2xl border border-rose-200 bg-rose-50/20 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <strong className="text-sm text-slate-900 block">
                        {attempt.user?.profile?.fullName} ({attempt.user?.profile?.jobDesignation})
                      </strong>
                      <span className="text-xs text-slate-600">
                        {attempt.assessment?.lesson?.course?.title} • {attempt.assessment?.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        Submitted: {new Date(attempt.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Integrity Score</span>
                      <span className="font-mono font-bold text-lg text-rose-700">
                        {attempt.integrityScore} / 100
                      </span>
                    </div>
                  </div>

                  {/* Flags Timeline */}
                  {attempt.proctorFlags && attempt.proctorFlags.length > 0 && (
                    <div className="pt-2 border-t border-rose-100 space-y-1">
                      <span className="text-[11px] font-bold text-rose-900 block">Logged Flags Timeline:</span>
                      <div className="flex flex-wrap gap-2">
                        {attempt.proctorFlags.map((flag: any) => (
                          <span
                            key={flag.id}
                            className="px-2 py-1 rounded bg-white border border-rose-200 text-[10px] text-rose-800 font-mono"
                          >
                            {flag.flagType} (-{flag.deduction} pts): {flag.metaDetails || 'Threshold breach'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              All assessment attempts maintained high integrity. Zero flagged attempts.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LIVE ANALYTICS DASHBOARD */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Total Portal Users</span>
              <span className="font-bold text-2xl text-slate-900 font-mono">{analytics.totalUsers}</span>
              <span className="text-[11px] text-slate-500 block mt-1">{analytics.totalTrainees} Trainees • {analytics.totalTrainers} Trainers</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Active Enrollments</span>
              <span className="font-bold text-2xl text-blue-600 font-mono">{analytics.totalEnrollments}</span>
              <span className="text-[11px] text-slate-500 block mt-1">{analytics.completedEnrollments} Completed</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Certificates Issued</span>
              <span className="font-bold text-2xl text-emerald-600 font-mono">{analytics.totalCertificates}</span>
              <span className="text-[11px] text-slate-500 block mt-1">QR Verifiable</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Avg Assessment Score</span>
              <span className="font-bold text-2xl text-indigo-600 font-mono">{analytics.averageScore}%</span>
              <span className="text-[11px] text-slate-500 block mt-1">Avg Integrity: {analytics.averageIntegrity}%</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TRAINER SEARCH INDEX */}
      {activeTab === 'TRAINERS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              Searchable Index of Qualified Trainers by Subject Area
            </h2>
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search trainer name, radar, cyclone..."
                value={trainerQuery}
                onChange={(e) => setTrainerQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainers
              .filter((t) =>
                t.profile?.fullName?.toLowerCase().includes(trainerQuery.toLowerCase()) ||
                t.profile?.jobDesignation?.toLowerCase().includes(trainerQuery.toLowerCase())
              )
              .map((t) => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-sm text-slate-900 block">{t.profile?.fullName}</strong>
                      <span className="text-xs text-slate-600">{t.profile?.jobDesignation}</span>
                      <span className="text-[11px] text-slate-400 block">{t.profile?.department}</span>
                    </div>
                    <span className="font-mono text-xs text-blue-600 font-bold">
                      {t.profile?.yearsExperience} Yrs Exp
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                    <span>Active Courses Authored: {t.createdCourses?.length || 0}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 6: ANNOUNCEMENTS MANAGER */}
      {activeTab === 'ANNOUNCEMENTS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 max-w-2xl">
          <h2 className="text-base font-bold text-slate-900">
            Publish Homepage Announcement
          </h2>

          <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Announcement Headline</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Schedule for Cyclone Season Readiness Drill"
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Announcement Content</label>
              <textarea
                rows={4}
                required
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Detailed instructions for regional offices..."
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition"
            >
              Broadcast Announcement
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

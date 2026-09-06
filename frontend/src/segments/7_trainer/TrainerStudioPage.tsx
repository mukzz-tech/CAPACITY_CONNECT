import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sliders,
  PlusCircle,
  Video,
  FileText,
  Volume2,
  Award,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Course } from '../../types';

export const TrainerStudioPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // New Course Form State
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState(4);
  const [newIsLong, setNewIsLong] = useState(false);

  // Add Lesson / Module State
  const [selectedCourseForModule, setSelectedCourseForModule] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleType, setModuleType] = useState('NOTES_TEXT');
  const [moduleText, setModuleText] = useState('');
  const [moduleFileUrl, setModuleFileUrl] = useState('');

  // Add Assessment State
  const [showAssessmentModal, setShowAssessmentModal] = useState<string | null>(null); // lessonId
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionType, setQuestionType] = useState('MCQ');
  const [correctOption, setCorrectOption] = useState('A');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [fillAccepted, setFillAccepted] = useState('');

  const fetchTrainerCourses = () => {
    const token = localStorage.getItem('token');
    fetch('/api/courses', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) setCourses(data.courses);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrainerCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: newCode,
          title: newTitle,
          description: newDesc,
          durationWeeks: newDuration,
          isLongDuration: newIsLong,
        }),
      });

      if (res.ok) {
        setShowCreateCourse(false);
        fetchTrainerCourses();
        alert('Course drafted successfully! Visible only to you until submitted for review.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddLessonAndModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForModule) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/courses/${selectedCourseForModule}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sequence: 1,
          title: lessonTitle,
          modules: [
            {
              title: moduleTitle,
              contentType: moduleType,
              formattedText: moduleType === 'NOTES_TEXT' ? moduleText : null,
              fileUrl: moduleType !== 'NOTES_TEXT' ? moduleFileUrl : null,
              language: 'en',
            },
          ],
        }),
      });

      if (res.ok) {
        setSelectedCourseForModule(null);
        fetchTrainerCourses();
        alert('Lesson & Module added to course syllabus.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSubmitReview = async (courseId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/courses/${courseId}/submit-review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchTrainerCourses();
        alert('Course submitted for administrative publishing review.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateAssessment = async (lessonId: string) => {
    const token = localStorage.getItem('token');
    const questionsPayload: any[] = [];

    if (questionType === 'MCQ') {
      questionsPayload.push({
        sequence: 1,
        questionType: 'MCQ',
        prompt: questionPrompt,
        marks: 2.0,
        options: [
          { id: 'A', text: optionA || 'Option A' },
          { id: 'B', text: optionB || 'Option B' },
        ],
        correctOption,
      });
    } else {
      questionsPayload.push({
        sequence: 1,
        questionType: 'FILL_BLANK',
        prompt: questionPrompt,
        marks: 2.0,
        acceptedTexts: fillAccepted.split(',').map((s) => s.trim().toLowerCase()),
      });
    }

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lessonId,
          title: assessmentTitle,
          passingPercent: 50.0,
          isStrictProctored: true,
          questions: questionsPayload,
        }),
      });

      if (res.ok) {
        setShowAssessmentModal(null);
        alert('Per-Lesson Assessment created successfully.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trainer Studio</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono">
              Course & Module Authoring
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build institutional courses, attach video/notes/audio modules, author mixed assessments, and submit for review.
          </p>
        </div>

        <button
          onClick={() => setShowCreateCourse(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Course Management Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">My Curriculum Modules</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-3">Code & Title</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Lessons</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-medium">
                    <span className="font-mono text-blue-600 font-bold block">{c.code}</span>
                    <span className="text-slate-900 font-bold">{c.title}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{c.durationWeeks} Weeks</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'PENDING_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{c.lessons?.length || 0} Lessons</td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedCourseForModule(c.id)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                    >
                      + Add Lesson
                    </button>

                    {c.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitReview(c.id)}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition"
                      >
                        Submit Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Course (Draft)</h3>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IMD-REF-CLIM"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Climate Diagnostic Modeling"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Duration (Weeks)</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsLong}
                      onChange={(e) => setNewIsLong(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-semibold text-slate-700">Long-Duration (1 Year)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Save Draft Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson & Module Modal */}
      {selectedCourseForModule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Lesson & Content Module</h3>

            <form onSubmit={handleAddLessonAndModule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Lesson Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lesson 1: NWP Atmospheric Grid Models"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Module Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Video Lecture: Baroclinic Instability"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Content Type</label>
                <select
                  value={moduleType}
                  onChange={(e) => setModuleType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white"
                >
                  <option value="NOTES_TEXT">Formatted Text Notes (TTS Enabled)</option>
                  <option value="VIDEO">Video Lecture URL</option>
                  <option value="AUDIO">Audio Recording URL</option>
                </select>
              </div>

              {moduleType === 'NOTES_TEXT' ? (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Notes Body (Direct Text / Markdown)
                  </label>
                  <textarea
                    rows={4}
                    value={moduleText}
                    onChange={(e) => setModuleText(e.target.value)}
                    placeholder="Enter lecture content here..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Media Storage URL</label>
                  <input
                    type="url"
                    value={moduleFileUrl}
                    onChange={(e) => setModuleFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForModule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Add to Curriculum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

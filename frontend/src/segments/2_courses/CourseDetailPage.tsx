import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Award,
  Star,
  FileText,
  Volume2,
  Video,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { Course } from '../../types';

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isEligible, setIsEligible] = useState<boolean>(true);
  const [unmetPrereqs, setUnmetPrereqs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [enrolling, setEnrolling] = useState<boolean>(false);

  // Feedback Form State
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [courseContentRating, setCourseContentRating] = useState<number>(9);
  const [facultyRating, setFacultyRating] = useState<number>(9);
  const [usefulnessRating, setUsefulnessRating] = useState<number>(9);
  const [infrastructureRating, setInfrastructureRating] = useState<number>(8);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);

  const fetchDetails = () => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/courses/${id}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setCourse(data.course);
          setIsEnrolled(data.isEnrolled);
          setEnrollment(data.enrollment);
          setIsEligible(data.isEligible);
          setUnmetPrereqs(data.unmetPrerequisites || []);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));

    fetch(`/api/courses/${id}/feedback-summary`, { headers })
      .then((res) => res.json())
      .then((data) => setFeedbackSummary(data))
      .catch(console.warn);
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setEnrolling(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/courses/${id}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchDetails();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to enroll');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnrolling(false);
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/courses/${id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseContent: courseContentRating,
          facultyInteraction: facultyRating,
          usefulness: usefulnessRating,
          infrastructure: infrastructureRating,
          comments: feedbackComment,
        }),
      });

      if (res.ok) {
        setShowFeedbackModal(false);
        fetchDetails();
        alert('Thank you! Your structured anonymous feedback has been recorded.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading course curriculum...</div>;
  }

  if (!course) {
    return <div className="p-12 text-center text-sm text-rose-500">Course not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <Link to="/courses" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Course Catalogue</span>
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800">
                  {course.code}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {course.isLongDuration ? 'Institutional Course (1-Year)' : 'Short Refresher Course'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {course.title}
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 pt-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <strong>Duration:</strong> {course.durationWeeks} Weeks
                </span>
                <span>
                  <strong>Instructor:</strong> {course.trainer?.profile?.fullName || 'Senior IMD Specialist'}
                </span>
                <span>
                  <strong>Assessments:</strong> Per-Lesson Mixed Formats
                </span>
              </div>
            </div>

            {/* Enrollment Action Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 min-w-[280px] text-center">
              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Enrolled</span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <div className="flex justify-between mb-1">
                      <span>Overall Progress:</span>
                      <span className="font-bold font-mono">{enrollment?.progressPercent || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600"
                        style={{ width: `${enrollment?.progressPercent || 0}%` }}
                      />
                    </div>
                    {enrollment?.finalScore !== null && (
                      <p className="mt-2 text-slate-700">
                        Sole Score: <strong>{Number(enrollment.finalScore).toFixed(1)}%</strong> ({enrollment.grade})
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/courses/${course.id}/study`}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/30"
                  >
                    <Play className="w-4 h-4" />
                    <span>Open Study Material</span>
                  </Link>

                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
                  >
                    Give 0–10 Feedback
                  </button>
                </div>
              ) : !isEligible ? (
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Prerequisites Required</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-1">
                    {unmetPrereqs.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                  <button
                    disabled
                    className="w-full py-2 px-3 rounded-xl bg-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed"
                  >
                    Enrollment Locked
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    You meet all operational prerequisites for this meteorological course.
                  </p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-600/30"
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll in Course'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus / Lessons Tree */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Curriculum & Lesson Modules</h2>

        <div className="space-y-4">
          {course.lessons && course.lessons.length > 0 ? (
            course.lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono text-blue-600 font-semibold block mb-0.5">
                      Lesson #{lesson.sequence}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{lesson.title}</h3>
                  </div>

                  {isEnrolled && (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/courses/${course.id}/study`}
                        className="py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>View Notes & Video</span>
                      </Link>

                      {lesson.assessments && lesson.assessments.length > 0 && (
                        <Link
                          to={`/assessments/${lesson.assessments[0].id}`}
                          className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Take Assessment</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {lesson.description && (
                  <p className="text-xs text-slate-600 mb-4">{lesson.description}</p>
                )}

                {/* Sub-modules list */}
                {lesson.modules && lesson.modules.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {lesson.modules.map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-xs text-slate-700"
                      >
                        {mod.contentType === 'VIDEO' ? (
                          <Video className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : mod.contentType === 'AUDIO' ? (
                          <Volume2 className="w-4 h-4 text-purple-600 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{mod.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No lessons have been published for this course yet.</p>
          )}
        </div>
      </div>

      {/* Anonymous Feedback Summary Section (Section 5, 9) */}
      {feedbackSummary && feedbackSummary.totalResponses > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Official IMD Trainee Feedback Summary (0–10 Rating Scale)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              ({feedbackSummary.totalResponses} Anonymous Submissions)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Course Content</span>
              <span className="font-bold text-lg text-blue-900 font-mono">
                {feedbackSummary.averages.courseContent} / 10
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Faculty Interaction</span>
              <span className="font-bold text-lg text-blue-900 font-mono">
                {feedbackSummary.averages.facultyInteraction} / 10
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Usefulness</span>
              <span className="font-bold text-lg text-blue-900 font-mono">
                {feedbackSummary.averages.usefulness} / 10
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Infrastructure</span>
              <span className="font-bold text-lg text-blue-900 font-mono">
                {feedbackSummary.averages.infrastructure} / 10
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Structured 0-10 Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Official Course Feedback (0 to 10 Scale)
            </h3>
            <p className="text-xs text-slate-500">
              Per IMD guidelines, this feedback is strictly anonymous and evaluated on a 0 to 10 scale rather than generic stars.
            </p>

            <form onSubmit={submitFeedback} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>1. Course Content Relevance:</span>
                  <span className="font-bold text-blue-600 font-mono">{courseContentRating} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={courseContentRating}
                  onChange={(e) => setCourseContentRating(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>2. Faculty Interaction & Clarity:</span>
                  <span className="font-bold text-blue-600 font-mono">{facultyRating} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={facultyRating}
                  onChange={(e) => setFacultyRating(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>3. Operational Usefulness in Field:</span>
                  <span className="font-bold text-blue-600 font-mono">{usefulnessRating} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={usefulnessRating}
                  onChange={(e) => setUsefulnessRating(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>4. Digital & Laboratory Infrastructure:</span>
                  <span className="font-bold text-blue-600 font-mono">{infrastructureRating} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={infrastructureRating}
                  onChange={(e) => setInfrastructureRating(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Additional Observations / Notes</label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Suggestions for syllabus improvement..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow"
                >
                  Submit Anonymous Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

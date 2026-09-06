import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StrictProctor } from '../../components/StrictProctor';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Mic,
  ArrowRight,
  Sparkles,
  Download,
} from 'lucide-react';
import { Question } from '../../types';

export const AssessmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [isVoiceFlag, setIsVoiceFlag] = useState<Record<string, boolean>>({});
  const [integrityScore, setIntegrityScore] = useState<number>(100.0);
  const [attemptId, setAttemptId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);

  // Match the following state: { questionId: { leftItem: rightItem } }
  const [matchSelections, setMatchSelections] = useState<Record<string, Record<string, string>>>({});

  // Voice recording state
  const [voiceRecordingForQ, setVoiceRecordingForQ] = useState<string | null>(null);

  useEffect(() => {
    // Generate an attempt session id for proctoring signals
    setAttemptId(`ATTEMPT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);

    const token = localStorage.getItem('token');
    fetch(`/api/assessments/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.assessment) {
          setAssessment(data.assessment);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));

    // Listen for voice navigation "next question"
    const handleNextQuestion = () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    };
    window.addEventListener('imd-voice-next-question', handleNextQuestion);

    return () => {
      window.removeEventListener('imd-voice-next-question', handleNextQuestion);
    };
  }, [id]);

  const handleMcqSelect = (questionId: string, optionId: string) => {
    setSubmissions((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setSubmissions((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleMatchSelect = (questionId: string, leftItem: string, rightItem: string) => {
    setMatchSelections((prev) => {
      const qPairs = prev[questionId] || {};
      const updated = { ...qPairs, [leftItem]: rightItem };
      setSubmissions((subPrev) => ({ ...subPrev, [questionId]: updated }));
      return { ...prev, [questionId]: updated };
    });
  };

  const handleVoiceAnswer = (questionId: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not available in this browser.');
      return;
    }

    setVoiceRecordingForQ(questionId);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript.trim();
      setSubmissions((prev) => ({ ...prev, [questionId]: spokenText }));
      setIsVoiceFlag((prev) => ({ ...prev, [questionId]: true }));
      setVoiceRecordingForQ(null);
    };

    recognition.onerror = () => {
      setVoiceRecordingForQ(null);
    };

    recognition.onend = () => {
      setVoiceRecordingForQ(null);
    };

    recognition.start();
  };

  const handleSubmitAttempt = async () => {
    if (!assessment) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');

    // Build payload array
    const payload = assessment.questions.map((q: Question) => ({
      questionId: q.id,
      answer: submissions[q.id] || null,
      isVoiceAnswer: Boolean(isVoiceFlag[q.id]),
    }));

    try {
      const res = await fetch(`/api/assessments/${id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissions: payload,
          integrityScore,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(data.error || 'Failed to submit attempt');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading lesson assessment...</div>;
  }

  if (!assessment) {
    return <div className="p-12 text-center text-sm text-rose-500">Assessment not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-4">
        <div>
          <Link to={`/courses/${assessment.courseId}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Course Overview</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{assessment.title}</h1>
          <p className="text-xs text-slate-500">
            {assessment.courseTitle} • {assessment.lessonTitle} • Passing Score: {assessment.passingPercent}%
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">
            Mixed Evaluation Format
          </span>
        </div>
      </div>

      {/* Results View (If already submitted) */}
      {results && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {results.attempt.isPassed ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    Passed Lesson Assessment
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                    <AlertTriangle className="w-4 h-4" />
                    Needs Review (Score &lt; 50%)
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">
                Your Score: {results.attempt.percentage}%
              </h2>
              <p className="text-xs text-slate-500">
                Marks Earned: {results.attempt.scoreAchieved} / {results.attempt.maxScore}
              </p>
            </div>

            {/* Integrity Meter Result */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-[200px]">
              <span className="text-xs text-slate-500 block mb-1">Attentiveness Integrity</span>
              <span
                className={`font-mono font-bold text-xl ${
                  results.attempt.integrityScore >= 80
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {results.attempt.integrityScore} / 100
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">OpenCV Strict Verified</span>
            </div>
          </div>

          {/* Course Sole Grade Recalculation (Section 5 & 9) */}
          {results.courseProgress && (
            <div className="p-6 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-700 uppercase">
                    Sole Course Grade Standing
                  </span>
                  <h3 className="text-lg font-bold text-blue-950">
                    Cumulative Course Average: {results.courseProgress.finalScore}% ({results.courseProgress.grade})
                  </h3>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>

              {/* Certificate Issuance Callout */}
              {results.courseProgress.certificate && (
                <div className="p-4 bg-white rounded-xl border border-blue-300 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Official IMD Certificate Generated!
                      </h4>
                      <p className="text-xs text-slate-600">
                        Certificate Code: <strong className="font-mono">{results.courseProgress.certificate.certificateCode}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/verify/${results.courseProgress.certificate.certificateCode}`}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition"
                    >
                      View QR Verification
                    </Link>
                    <a
                      href={results.courseProgress.certificate.pdfFileUrl}
                      download={`Certificate_${results.courseProgress.certificate.certificateCode}.pdf`}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition shadow flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Link
              to={`/courses/${assessment.courseId}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <span>Continue to Next Lesson</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Assessment Attempt Interface */}
      {!results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Questions Bank */}
          <div className="lg:col-span-2 space-y-6">
            {assessment.questions.map((q: Question, idx: number) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Question {idx + 1} of {assessment.questions.length} • {q.marks} Mark{q.marks > 1 ? 's' : ''}
                  </span>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                    {q.questionType.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  {q.prompt}
                </p>

                {/* 1. MCQ Renderer */}
                {q.questionType === 'MCQ' && q.options && (
                  <div className="space-y-2 pt-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt.id}
                        onClick={() => handleMcqSelect(q.id, opt.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                          submissions[q.id] === opt.id
                            ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-mono font-bold flex items-center justify-center text-xs">
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 2. Fill-in-the-Blank Renderer */}
                {q.questionType === 'FILL_BLANK' && (
                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="Type your answer here (case-insensitive)..."
                      value={submissions[q.id] || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Spelling variants and case differences are accepted automatically.
                    </span>
                  </div>
                )}

                {/* 3. Match-the-Following Renderer */}
                {q.questionType === 'MATCH_FOLLOWING' && q.matchPairs && (
                  <div className="pt-2 space-y-3">
                    <span className="text-[11px] text-slate-500 block">
                      Select matching right-hand item for each instrument:
                    </span>
                    {q.matchPairs.leftItems.map((leftItem) => (
                      <div
                        key={leftItem}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{leftItem}</span>
                        <select
                          value={matchSelections[q.id]?.[leftItem] || ''}
                          onChange={(e) => handleMatchSelect(q.id, leftItem, e.target.value)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-blue-600"
                        >
                          <option value="">-- Match with Parameter --</option>
                          {q.matchPairs?.rightItems.map((rItem) => (
                            <option key={rItem} value={rItem}>
                              {rItem}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Voice-Command Answer Renderer (Section 13) */}
                {q.questionType === 'VOICE_ANSWER' && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-indigo-700" />
                        <span className="text-xs font-bold text-indigo-900">Voice-Answer Input</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVoiceAnswer(q.id)}
                        disabled={voiceRecordingForQ === q.id}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                          voiceRecordingForQ === q.id
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        <Mic className="w-3 h-3" />
                        <span>{voiceRecordingForQ === q.id ? 'Listening...' : 'Speak Spoken Answer'}</span>
                      </button>
                    </div>

                    <div className="p-2.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-700 min-h-[36px] flex items-center">
                      {submissions[q.id] ? (
                        <span className="text-indigo-950 font-medium">
                          Spoken Transcription: <strong>"{submissions[q.id]}"</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Click Speak to capture your meteorological response</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                onClick={handleSubmitAttempt}
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {submitting ? 'Auto-Grading Submission...' : 'Submit Assessment for Instant Evaluation'}
              </button>
            </div>
          </div>

          {/* Right Column: Strict OpenCV Proctoring Monitor (Section 11) */}
          <div className="space-y-6">
            <div className="sticky top-20">
              <StrictProctor
                attemptId={attemptId}
                onIntegrityChange={(score) => setIntegrityScore(score)}
              />

              <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 space-y-2 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Integrity Rules (Section 11)</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>No face detected (&gt;3s): -10 pts</li>
                  <li>Face turned away (&gt;3s): -5 pts</li>
                  <li>Multiple faces in frame: -15 pts</li>
                  <li>No video leaves your browser.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

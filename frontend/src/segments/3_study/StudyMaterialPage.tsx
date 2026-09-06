import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TtsControl } from '../../components/TtsControl';
import { LenientProctor } from '../../components/LenientProctor';
import {
  BookOpen,
  Video,
  FileText,
  Volume2,
  Award,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Course, Module, Lesson } from '../../types';

export const StudyMaterialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/courses/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setCourse(data.course);
          if (data.course.lessons && data.course.lessons.length > 0) {
            const firstLesson = data.course.lessons[0];
            setSelectedLesson(firstLesson);
            if (firstLesson.modules && firstLesson.modules.length > 0) {
              setSelectedModule(firstLesson.modules[0]);
            }
          }
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [id]);

  const handlePauseLecture = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleResumeLecture = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(console.warn);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading study material...</div>;
  }

  if (!course) {
    return <div className="p-12 text-center text-sm text-rose-500">Course content not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Attached Lenient Attentiveness Proctor (Section 11) */}
      <LenientProctor
        onPauseRequested={handlePauseLecture}
        onResumeRequested={handleResumeLecture}
      />

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to={`/courses/${course.id}`} className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{course.code}: {course.title}</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{selectedLesson?.title}</span>
        </div>

        {selectedLesson?.assessments && selectedLesson.assessments.length > 0 && (
          <Link
            to={`/assessments/${selectedLesson.assessments[0].id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
          >
            <Award className="w-4 h-4" />
            <span>Take Lesson Assessment</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Syllabus & Module Switcher Sidebar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Lessons & Modules
          </h3>

          <div className="space-y-4">
            {course.lessons?.map((lesson) => (
              <div key={lesson.id} className="space-y-1.5">
                <button
                  onClick={() => {
                    setSelectedLesson(lesson);
                    if (lesson.modules && lesson.modules.length > 0) {
                      setSelectedModule(lesson.modules[0]);
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                    selectedLesson?.id === lesson.id
                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate">{lesson.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">#{lesson.sequence}</span>
                </button>

                {/* Modules under this lesson */}
                {selectedLesson?.id === lesson.id && (
                  <div className="pl-3 space-y-1">
                    {lesson.modules?.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModule(m)}
                        className={`w-full text-left p-2 rounded-lg text-[11px] flex items-center gap-2 transition ${
                          selectedModule?.id === m.id
                            ? 'bg-blue-600 text-white font-medium shadow-sm'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.contentType === 'VIDEO' ? (
                          <Video className="w-3.5 h-3.5 shrink-0" />
                        ) : m.contentType === 'AUDIO' ? (
                          <Volume2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Voice navigation active: Say <em>"read this aloud"</em> or <em>"next question"</em></span>
          </div>
        </div>

        {/* Right: Content Viewer & Active Module Reader */}
        <div className="lg:col-span-3 space-y-6">
          {selectedModule ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Module Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono text-blue-600 font-bold uppercase block mb-1">
                    {selectedModule.contentType} Content Module
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{selectedModule.title}</h2>
                </div>

                {/* Bilingual Text-to-Speech Control (Section 12) */}
                {selectedModule.formattedText && (
                  <TtsControl
                    textToRead={selectedModule.formattedText}
                    defaultLang={selectedModule.language || 'en'}
                  />
                )}
              </div>

              {/* Video Player */}
              {selectedModule.contentType === 'VIDEO' && (
                <div className="space-y-3">
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
                    <video
                      ref={videoRef}
                      controls
                      src={selectedModule.fileUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Lenient Attentiveness Check Active (Lecture Mode)</span>
                    <span className="italic">Autopauses if sustained inattention is detected</span>
                  </div>
                </div>
              )}

              {/* Formatted Notes Viewer */}
              {selectedModule.formattedText && (
                <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl font-serif">
                  <div className="whitespace-pre-wrap">{selectedModule.formattedText}</div>
                </div>
              )}

              {/* Audio Player */}
              {selectedModule.contentType === 'AUDIO' && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900 mb-1">{selectedModule.title}</p>
                    <audio controls className="w-full h-8" src={selectedModule.fileUrl || ''} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-sm">
              Please select a module from the syllabus sidebar to begin studying.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

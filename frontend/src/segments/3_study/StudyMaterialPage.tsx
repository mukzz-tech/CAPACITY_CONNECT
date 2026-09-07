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
  Play,
  Pause,
  Layout,
  Layers,
} from 'lucide-react';
import { Course, Module, Lesson } from '../../types';

export const StudyMaterialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [activeVideoModule, setActiveVideoModule] = useState<Module | null>(null);
  const [activeNotesModule, setActiveNotesModule] = useState<Module | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'video' | 'notes'>('both');
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const getTranslatedContent = (originalText?: string | null) => {
    if (!originalText) return '';
    if (currentLang === 'hi') {
      return `### 1. डॉप्लर दुविधा (Doppler Dilemma)
डॉप्लर मौसम रडार सूक्ष्मतरंग विकिरण (microwave pulses) उत्सर्जित करके वायुमंडलीय लक्ष्यों (जैसे वर्षा की बूंदें, बर्फ के कण और ओले) से परावर्तित ऊर्जा का विश्लेषण करता है।

#### प्रमुख सूत्र:
- अधिकतम असंदिग्ध दूरी: R_max = c / (2 · PRF)
- अधिकतम असंदिग्ध वेग: V_max = (λ · PRF) / 4

इन दोनों को संयोजित करने पर मूलभूत नियम प्रकट होता है जिसे **डॉप्लर दुविधा** कहा जाता है:
$$R_{max} \\cdot V_{max} = \\frac{c \\cdot \\lambda}{8}$$

जहाँ c प्रकाश की चाल है तथा λ रडार तरंगदैर्घ्य है। पल्स पुनरावृत्ति आवृत्ति (PRF) बढ़ाने से वेग सटीकता बढ़ती है किंतु दूरी सीमा घट जाती है।

### 2. आधार परावर्तकता घटक (Base Reflectivity - dBZ)
परावर्तकता रडार तक वापस आने वाली ऊर्जा की मात्रा को मापती है:
- 15 से 30 dBZ: हल्की वर्षा अथवा घने बादल
- 30 से 45 dBZ: मध्यम से तीव्र मानसूनी बौछारें
- > 50 dBZ: गंभीर तूफानी बादल एवं तीव्र आकाशीय बिजली
- > 65 dBZ: विनाशकारी ओलावृष्टि (Hailstorm) की प्रबल संभावना

### 3. मुख्य परिचालन निष्कर्ष:
डॉप्लर मौसम रडार वायुमंडल में चक्रवात, भारी वर्षा और ओलावृष्टि की सटीक पूर्व चेतावनी देने में सक्षम है। जब वर्षा की बूंदें रडार की ओर आती हैं तो आवृत्ति बढ़ती है, और जब दूर जाती हैं तो घटती है। इस सिद्धांत से आंधी-तूफान की समयपूर्व चेतावनी जारी की जाती है।`;
    }

    return `### 1. Doppler Dilemma
The Doppler radar operates by emitting pulses of microwave radiation and listening for the backscattered energy from atmospheric targets (hydrometeors such as raindrops, snowflakes, and hailstones).

#### Key Formulas:
- Maximum Unambiguous Range: $R_{max} = \\frac{c}{2 \\cdot PRF}$
- Maximum Unambiguous Velocity: $V_{max} = \\frac{\\lambda \\cdot PRF}{4}$

Combining both reveals the fundamental constraint known as the **Doppler Dilemma**:
$$R_{max} \\cdot V_{max} = \\frac{c \\cdot \\lambda}{8}$$

Where $c$ is the speed of light and $\\lambda$ is the radar transmitter wavelength. Increasing the pulse repetition frequency (PRF) enhances velocity resolution but decreases range resolution, and vice versa.

### 2. Base Reflectivity Factor (Z)
Reflectivity measures the amount of power backscattered to the radar. It is calculated in dBZ (decibels relative to Z):
- 15 - 30 dBZ: Light stratiform rain or dense clouds
- 30 - 45 dBZ: Moderate to heavy showers
- > 50 dBZ: Severe convective storm, intense lightning
- > 65 dBZ: High probability of damaging hail

### 3. Operational Forecasting Significance:
Doppler Weather Radar enables severe weather nowcasting across all IMD coastal and inland stations. Analyzing Base Reflectivity alongside Radial Velocity allows forecasters to detect rotating supercells and squall lines up to 3 hours before thunderstorm touchdown.`;
  };

  // Sync lesson modules into video and notes slots
  const syncLessonModules = (lesson: any) => {
    if (!lesson || !lesson.modules) return;
    const vMod = lesson.modules.find((m: any) => m.contentType === 'VIDEO') || null;
    const nMod =
      lesson.modules.find((m: any) => m.contentType === 'NOTES_TEXT' || m.formattedText) || null;

    setActiveVideoModule(vMod);
    setActiveNotesModule(nMod);

    if (vMod && nMod) {
      setViewMode('both');
    } else if (vMod) {
      setViewMode('video');
    } else {
      setViewMode('notes');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const loadCourse = async () => {
      try {
        let courseToLoadId = id;

        // If no ID in URL (e.g. /study), fetch published courses and pick the first one with lessons
        if (!courseToLoadId) {
          const res = await fetch('/api/courses', { headers });
          const data = await res.json();
          if (data.courses && data.courses.length > 0) {
            const withLessons =
              data.courses.find((c: any) => c.code === 'IMD-REF-SAT-RAD') ||
              data.courses.find((c: any) => c.lessons && c.lessons.length > 0) ||
              data.courses[0];
            courseToLoadId = withLessons.id;
          }
        }

        if (courseToLoadId) {
          const detRes = await fetch(`/api/courses/${courseToLoadId}`, { headers });
          const detData = await detRes.json();
          if (detData.course) {
            setCourse(detData.course);
            if (detData.course.lessons && detData.course.lessons.length > 0) {
              const firstLesson = detData.course.lessons[0];
              setSelectedLesson(firstLesson);
              if (firstLesson.modules && firstLesson.modules.length > 0) {
                setSelectedModule(firstLesson.modules[0]);
              }
              syncLessonModules(firstLesson);
            }
          }
        }
      } catch (err) {
        console.warn('Load course content error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  // Voice Event Listeners: Play Video, Pause Video, Read Aloud Notes
  useEffect(() => {
    const handleVoicePlayVideo = () => {
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(console.warn);
      }
    };

    const handleVoicePauseVideo = () => {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    };

    window.addEventListener('imd-voice-video-play', handleVoicePlayVideo);
    window.addEventListener('imd-voice-video-pause', handleVoicePauseVideo);
    window.addEventListener('imd-voice-stop', handleVoicePauseVideo);

    return () => {
      window.removeEventListener('imd-voice-video-play', handleVoicePlayVideo);
      window.removeEventListener('imd-voice-video-pause', handleVoicePauseVideo);
      window.removeEventListener('imd-voice-stop', handleVoicePauseVideo);
    };
  }, []);

  const handlePauseLecture = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleResumeLecture = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(console.warn);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading study material...</div>;
  }

  if (!course) {
    return <div className="p-12 text-center text-sm text-rose-500">Course content not found.</div>;
  }

  const effectiveNotes =
    activeNotesModule?.formattedText ||
    selectedModule?.formattedText ||
    (selectedModule?.contentType === 'NOTES_TEXT' ? selectedModule.title : null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Attached Lenient Attentiveness Proctor with Camera Device Picker & OpenCV Sim */}
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

        {selectedLesson?.assessments && selectedLesson.assessments.length > 0 && user?.role === 'TRAINEE' && (
          <Link
            to={`/assessments/${selectedLesson.assessments[0].id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
          >
            <Award className="w-4 h-4" />
            <span>Take Lesson Assessment</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {selectedLesson?.assessments && selectedLesson.assessments.length > 0 && user?.role === 'ADMIN' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Lesson Assessment: {selectedLesson.assessments[0].title}</span>
          </div>
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
                    syncLessonModules(lesson);
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
                        onClick={() => {
                          setSelectedModule(m);
                          if (m.contentType === 'VIDEO') {
                            setViewMode('video');
                          } else if (m.contentType === 'NOTES_TEXT') {
                            setViewMode('notes');
                          }
                        }}
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

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Voice Controls Active:</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono leading-tight">
              • "play video" / "pause video"<br />
              • "read notes" / "listen notes"<br />
              • "stop" / "quiet"
            </p>
          </div>
        </div>

        {/* Right: Content Viewer & Active Module Reader */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* View Mode Switcher & Module Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-blue-600 font-bold uppercase">
                    Interactive Meteorological Study
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700">
                    {currentLang === 'hi' ? 'हिंदी (Hindi)' : 'English (EN)'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedLesson?.title || course.title}
                </h2>
              </div>

              {/* View Mode Tabs: Combined vs Video Only vs Notes Only */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-700 self-start sm:self-auto">
                {activeVideoModule && activeNotesModule && (
                  <button
                    type="button"
                    onClick={() => setViewMode('both')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      viewMode === 'both'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Combined View</span>
                  </button>
                )}
                {activeVideoModule && (
                  <button
                    type="button"
                    onClick={() => setViewMode('video')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      viewMode === 'video'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video Lecture</span>
                  </button>
                )}
                {effectiveNotes && (
                  <button
                    type="button"
                    onClick={() => setViewMode('notes')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      viewMode === 'notes'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Study Notes</span>
                  </button>
                )}
              </div>
            </div>

            {/* Video Lecture Section */}
            {(viewMode === 'both' || viewMode === 'video') && activeVideoModule && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-lg">
                <div className="flex items-center justify-between text-white text-xs px-1 pb-1">
                  <span className="font-semibold flex items-center gap-2">
                    <Video className="w-4 h-4 text-rose-500" />
                    <span>{activeVideoModule.title}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          if (isVideoPlaying) {
                            videoRef.current.pause();
                            setIsVideoPlaying(false);
                          } else {
                            videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(console.warn);
                          }
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {isVideoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isVideoPlaying ? 'Pause Video' : 'Play Video'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  >
                    <source
                      src={
                        activeVideoModule.fileUrl ||
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                      }
                      type="video/mp4"
                    />
                    <source
                      src="https://raw.githubusercontent.com/mdn/learning-area/master/html/multimedia-and-embedding/video-and-audio-content/rabbit320.webm"
                      type="video/webm"
                    />
                  </video>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lenient Attentiveness Proctor Active</span>
                  </span>
                  <span className="italic text-slate-400">
                    Voice ready: Say <em>"play video"</em> or <em>"pause video"</em>
                  </span>
                </div>
              </div>
            )}

            {/* Study Notes & Bilingual TTS Section */}
            {(viewMode === 'both' || viewMode === 'notes') && effectiveNotes && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-slate-100 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Comprehensive Study Notes & Formulas
                    </span>
                  </div>

                  {/* Bilingual Audio TTS Player Control */}
                  <TtsControl
                    textToRead={getTranslatedContent(effectiveNotes)}
                    currentLang={currentLang}
                    onLanguageChange={(newLang) => setCurrentLang(newLang)}
                  />
                </div>

                {/* Formatted Notes Markdown Content */}
                <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl font-serif shadow-sm">
                  <div className="whitespace-pre-wrap">{getTranslatedContent(effectiveNotes)}</div>
                </div>
              </div>
            )}

            {/* Audio Lecture Module */}
            {selectedModule?.contentType === 'AUDIO' && (
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
        </div>
      </div>
    </div>
  );
};

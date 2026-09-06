import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
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
  Video,
  Volume2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Certificate } from '../../types';
import {
  getCameraStream,
  releaseCameraStream,
  stopAllCameraTracks,
  attachStreamToVideo,
  getVideoDevices,
  setSimulatedGaze,
  getSimulatedGaze,
} from '../../utils/cameraManager';
import { analyzeVideoFrame } from '../../utils/visionProctor';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { pauseListening, resumeListening } = useVoice();
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

  // Hardware Diagnostics State & Handlers
  const [testCameraActive, setTestCameraActive] = useState<boolean>(false);
  const [cameraStatusMsg, setCameraStatusMsg] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraMode, setSelectedCameraMode] = useState<string>('auto');
  const [simGazeState, setSimGazeState] = useState<'center' | 'away' | 'absent'>('center');
  const [testAudioPlaying, setTestAudioPlaying] = useState<boolean>(false);
  const [micTesting, setMicTesting] = useState<boolean>(false);
  const [micHeardText, setMicHeardText] = useState<string>('');
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [visionCondition, setVisionCondition] = useState<string>('NORMAL');
  const [visionGaze, setVisionGaze] = useState<string>('center');

  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);

  useEffect(() => {
    getVideoDevices().then((devs) => {
      setAvailableDevices(devs);
    }).catch(console.warn);
  }, []);

  const handleTestWebcam = async (overrideMode?: string) => {
    const mode = overrideMode !== undefined ? overrideMode : selectedCameraMode;

    if (testCameraActive && overrideMode === undefined) {
      stopAllCameraTracks();
      testStreamRef.current = null;
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = null;
      }
      setTestCameraActive(false);
      setCameraStatusMsg('');
      return;
    }

    if (testStreamRef.current || overrideMode !== undefined) {
      stopAllCameraTracks();
      testStreamRef.current = null;
    }

    setCameraStatusMsg('Initializing video stream...');
    try {
      const stream = await getCameraStream(mode === 'auto' ? undefined : mode);
      testStreamRef.current = stream;
      setTestCameraActive(true);

      if (mode === 'simulated') {
        setCameraStatusMsg('Live OpenCV Simulation Active! Test face centered (100% Integrity).');
      } else {
        getVideoDevices().then(setAvailableDevices).catch(console.warn);
        setCameraStatusMsg('🟢 Camera hardware active • OpenCV frame analysis running...');
      }

      if (testVideoRef.current) {
        attachStreamToVideo(testVideoRef.current, stream);
      }
    } catch (err: any) {
      setTestCameraActive(false);
      setCameraStatusMsg(`Camera access failed: ${err?.message || 'Access blocked or device not found'}. You can switch to "OpenCV Simulated Face Feed" below to test proctoring.`);
    }
  };

  // Live Computer Vision frame analysis loop for the test camera
  useEffect(() => {
    if (!testCameraActive || selectedCameraMode === 'simulated') return;

    const interval = setInterval(async () => {
      if (testVideoRef.current && testCanvasRef.current) {
        const res = await analyzeVideoFrame(testVideoRef.current, testCanvasRef.current);
        setVisionCondition(res.condition);
        setVisionGaze(res.gazeDirection);

        if (res.condition === 'NO_FACE_DETECTED') {
          setCameraStatusMsg('🔴 FLAG: No face detected in frame (Stepped away or covered -10 pts)');
        } else if (res.condition === 'FACE_TURNED_AWAY') {
          setCameraStatusMsg(`🟡 FLAG: Face turned away / looking ${res.gazeDirection} (-5 pts)`);
        } else if (res.condition === 'MULTIPLE_FACES_DETECTED') {
          setCameraStatusMsg('🟣 FLAG: Multiple faces detected (Secondary person in frame -15 pts)');
        } else {
          setCameraStatusMsg('🟢 Normal: 1 Face Detected & Focused (100% Attentiveness)');
        }
      }
    }, 700);

    return () => clearInterval(interval);
  }, [testCameraActive, selectedCameraMode]);

  const handleSimGazeChange = (gaze: 'center' | 'away' | 'absent') => {
    setSimulatedGaze(gaze);
    setSimGazeState(gaze);
    if (gaze === 'center') {
      setVisionCondition('NORMAL');
      setCameraStatusMsg('🟢 OpenCV Result: Face Centered & Focused • 100/100 Normal');
    } else if (gaze === 'away') {
      setVisionCondition('FACE_TURNED_AWAY');
      setCameraStatusMsg('🟡 OpenCV Result: FLAG_FACE_TURNED_AWAY (-5 pts deduction)');
    } else {
      setVisionCondition('NO_FACE_DETECTED');
      setCameraStatusMsg('🔴 OpenCV Result: FLAG_NO_FACE_DETECTED (-10 pts deduction)');
    }
  };

  useEffect(() => {
    return () => {
      if (testCameraActive) {
        stopAllCameraTracks();
      }
      stopMicTest();
    };
  }, [testCameraActive]);

  const handleTestAudio = (lang: 'hi' | 'en') => {
    setTestAudioPlaying(true);
    const text = lang === 'hi' 
      ? 'नमस्ते! क्षमता कनेक्ट पोर्टल में आपका स्वागत है। हिंदी ऑडियो और टेक्स्ट टू स्पीच पूरी तरह सक्रिय है।'
      : 'Welcome to IMD Capacity Connect. English text-to-speech is fully operational.';
    
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
    audio.onended = () => setTestAudioPlaying(false);
    audio.onerror = () => setTestAudioPlaying(false);
    audio.play().catch(() => setTestAudioPlaying(false));
  };

  const stopMicTest = () => {
    if (micAnimFrameRef.current) {
      cancelAnimationFrame(micAnimFrameRef.current);
      micAnimFrameRef.current = null;
    }
    if (micAudioCtxRef.current) {
      try {
        micAudioCtxRef.current.close();
      } catch {}
      micAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMicTesting(false);
    setMicVolumeLevel(0);
    resumeListening();
  };

  const handleTestMic = async () => {
    if (micTesting) {
      stopMicTest();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Speech Recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Pause global VoiceContext to prevent recognition collision
    pauseListening();

    setMicTesting(true);
    setMicHeardText('Opening microphone and measuring audio levels...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // AudioContext + Analyser for real-time VU Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      micAudioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let detectedAudio = false;

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const volPct = Math.min(100, Math.round((avg / 64) * 100));
        setMicVolumeLevel(volPct);

        if (volPct > 6) {
          detectedAudio = true;
        }

        micAnimFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();

      // Launch continuous recognition with live interim feedback
      const rec = new SR();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      setMicHeardText('🎙️ Microphone LIVE! Speak now (e.g. "Radar", "Weather", "Courses", "Hello")...');

      rec.onresult = (e: any) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript + ' ';
        }
        transcript = transcript.trim();

        if (transcript) {
          setMicHeardText(`✅ Microphone heard: "${transcript}" (100% Operational)`);
          try {
            const utterance = new SpeechSynthesisUtterance(`Microphone verified. Heard: ${transcript}`);
            window.speechSynthesis.speak(utterance);
          } catch {}
          setTimeout(() => stopMicTest(), 2200);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech') {
          // Chrome fires no-speech routinely during pauses; do not abort test
          if (detectedAudio) {
            setMicHeardText('Sound detected! Speak closer to your microphone (e.g. "Radar", "Weather")...');
          } else {
            setMicHeardText('Listening... Speak clearly into your microphone...');
          }
          return;
        } else if (e.error === 'not-allowed') {
          setMicHeardText('Microphone permission blocked. Please click the lock icon in your browser address bar and choose Allow.');
          stopMicTest();
        } else {
          setMicHeardText(`Microphone status: ${e.error}. Listening...`);
        }
      };

      rec.onend = () => {
        if (micTesting) stopMicTest();
      };

      rec.start();
    } catch (err: any) {
      setMicHeardText('Microphone access blocked. Please allow microphone permissions in your browser address bar.');
      stopMicTest();
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

      {/* Candidate Hardware & Diagnostics Self-Test */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Candidate Hardware Readiness & Device Diagnostics
              </h2>
              <p className="text-xs text-slate-500">
                Verify your webcam, speakers, and microphone before starting strict-proctored assessments.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2.5 py-1 rounded-full">
            Self-Check Studio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* 1. Camera Diagnostic */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-blue-600" />
                1. Webcam / OpenCV Test
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestWebcam()}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                    testCameraActive
                      ? 'bg-rose-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {testCameraActive ? 'Stop' : 'Test Camera'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCameraMode('simulated');
                    handleTestWebcam('simulated');
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                    selectedCameraMode === 'simulated' && testCameraActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  title="Run OpenCV test face without needing physical webcam"
                >
                  OpenCV Sim
                </button>
              </div>
            </div>

            {/* Camera Source Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-semibold block">Select Camera Source:</label>
              <select
                value={selectedCameraMode}
                onChange={(e) => {
                  setSelectedCameraMode(e.target.value);
                  if (testCameraActive) {
                    handleTestWebcam(e.target.value);
                  }
                }}
                className="w-full text-[11px] rounded-lg border border-slate-300 p-1.5 bg-white font-medium text-slate-800"
              >
                  <option value="auto">🌟 Auto-Detect (Real Integrated Camera)</option>
                  <option value="simulated">🧑‍💻 OpenCV Live Simulated Face Feed (Proctoring Test Mode)</option>
                  {availableDevices
                    .filter((d) => {
                      const lbl = (d.label || '').toLowerCase();
                      return !lbl.includes('phone') && !lbl.includes('link to windows') && !lbl.includes('12403');
                    })
                    .map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {`📷 ${d.label || `Physical Camera ${i + 1}`}`}
                      </option>
                    ))}
              </select>
            </div>

            <div className="w-full h-36 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center relative border border-slate-700">
              <video
                ref={testVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  testCameraActive ? 'block' : 'hidden'
                }`}
              />
              <canvas ref={testCanvasRef} className="hidden" />

              {!testCameraActive && (
                <div className="text-center px-4 space-y-1">
                  <span className="text-slate-400 text-[10px] block">
                    Click "Test Camera" or "OpenCV Sim" to start video feed
                  </span>
                </div>
              )}

              {/* Dynamic Live Face Target Tracking Overlay */}
              {testCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-28 h-32 border-2 border-dashed rounded-2xl transition-all duration-200 flex flex-col justify-between p-1.5 ${
                      visionCondition === 'NORMAL'
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : visionCondition === 'FACE_TURNED_AWAY'
                        ? 'border-amber-400 bg-amber-500/15 animate-pulse'
                        : 'border-rose-500 bg-rose-500/20 animate-bounce'
                    }`}
                  >
                    <span
                      className={`text-[8px] font-mono px-1 rounded self-start font-bold ${
                        visionCondition === 'NORMAL'
                          ? 'bg-emerald-950/80 text-emerald-300'
                          : visionCondition === 'FACE_TURNED_AWAY'
                          ? 'bg-amber-950 text-amber-200'
                          : 'bg-rose-950 text-rose-200'
                      }`}
                    >
                      {visionCondition === 'NORMAL' ? 'FACE FOCUSED' : visionCondition}
                    </span>
                    <span className="text-[8px] bg-black/80 text-slate-300 font-mono px-1 rounded self-end">
                      GAZE: {visionGaze.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {testCameraActive && selectedCameraMode === 'simulated' && (
                <div className="absolute top-1 right-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold z-10">
                  OPENCV ACTIVE
                </div>
              )}
            </div>

            {/* OpenCV Simulation Controls */}
            {testCameraActive && (
              <div className="space-y-1 pt-1 bg-indigo-50/80 p-2 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-indigo-900 font-bold block">
                  Interactive OpenCV Detection Signal Tests:
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleSimGazeChange('center')}
                    className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                      visionCondition === 'NORMAL' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border text-slate-700'
                    }`}
                  >
                    Center (100)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimGazeChange('away')}
                    className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                      visionCondition === 'FACE_TURNED_AWAY' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border text-slate-700'
                    }`}
                  >
                    Gaze Away (-5)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimGazeChange('absent')}
                    className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                      visionCondition === 'NO_FACE_DETECTED' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border text-slate-700'
                    }`}
                  >
                    Absent (-10)
                  </button>
                </div>
              </div>
            )}

            {cameraStatusMsg && (
              <p className="text-[11px] text-slate-700 font-mono leading-tight bg-white p-2 rounded-lg border border-slate-200">
                {cameraStatusMsg}
              </p>
            )}
          </div>

          {/* 2. Audio / TTS Diagnostic */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-600" />
              2. Speaker & Bilingual TTS Test
            </span>
            <p className="text-[11px] text-slate-500">
              Plays test speech in both languages to confirm speaker output and natural voice synthesis.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTestAudio('hi')}
                disabled={testAudioPlaying}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Hindi Voice (हिंदी ऑडियो)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestAudio('en')}
                disabled={testAudioPlaying}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test English Voice</span>
              </button>
            </div>
            {testAudioPlaying && (
              <span className="text-[10px] text-emerald-600 font-bold animate-pulse block text-center">
                Playing sample audio...
              </span>
            )}
          </div>

          {/* 3. Microphone Diagnostic */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-indigo-600" />
                3. Microphone Voice Test
              </span>
              <button
                type="button"
                onClick={handleTestMic}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  micTesting ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {micTesting ? 'Stop Mic' : 'Test Mic'}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Verifies browser speech-to-text recognition for spoken assessments and navigation.
            </p>

            {/* Live Audio Level VU Meter */}
            {micTesting && (
              <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                <div className="flex justify-between text-[10px] text-slate-600 font-semibold">
                  <span>Live Input Volume:</span>
                  <span className={micVolumeLevel > 6 ? 'text-emerald-600 font-mono font-bold' : 'text-slate-400 font-mono'}>
                    {micVolumeLevel > 6 ? `🔊 ${micVolumeLevel}% (Audio Detected!)` : '🔇 0% (Silent / Low Input)'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-75 ${
                      micVolumeLevel > 20
                        ? 'bg-emerald-500'
                        : micVolumeLevel > 6
                        ? 'bg-blue-500'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.max(3, micVolumeLevel)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="p-3 bg-white rounded-xl border border-slate-200 min-h-[60px] text-[11px] text-slate-700 leading-relaxed">
              {micHeardText || 'Click "Test Mic" and say something to verify speech recognition.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

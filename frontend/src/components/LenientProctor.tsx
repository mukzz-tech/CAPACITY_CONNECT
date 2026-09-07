import React, { useState, useEffect, useRef } from 'react';
import {
  Coffee,
  Play,
  Info,
  Video,
  VideoOff,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  getCameraStream,
  releaseCameraStream,
  stopAllCameraTracks,
  attachStreamToVideo,
  getVideoDevices,
  getSimulatedFaceStream,
  isVirtualCamera,
} from '../utils/cameraManager';
import { analyzeVideoFrame } from '../utils/visionProctor';

interface LenientProctorProps {
  onPauseRequested?: () => void;
  onResumeRequested?: () => void;
}

export const LenientProctor: React.FC<LenientProctorProps> = ({
  onPauseRequested,
  onResumeRequested,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasWebcam, setHasWebcam] = useState<boolean>(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  const [showNudge, setShowNudge] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isAttentive, setIsAttentive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraMode, setSelectedCameraMode] = useState<string>('auto');
  const [autoPauseEnabled, setAutoPauseEnabled] = useState<boolean>(true);

  const awayCountRef = useRef<number>(0);

  // Load available video input devices on mount
  useEffect(() => {
    getVideoDevices()
      .then((devs) => {
        setAvailableDevices(devs);
      })
      .catch(console.warn);
  }, []);

  const startCamera = async (mode = selectedCameraMode) => {
    setIsRequesting(true);
    setCameraError(null);

    try {
      let stream: MediaStream;

      if (mode === 'simulated') {
        stream = getSimulatedFaceStream();
        setIsSimulatedMode(true);
      } else {
        const targetDeviceId = mode !== 'auto' ? mode : undefined;
        stream = await getCameraStream(targetDeviceId);
        setIsSimulatedMode(false);
      }

      if (videoRef.current) {
        attachStreamToVideo(videoRef.current, stream);
      }
      setHasWebcam(true);
      setCameraError(null);

      // Refresh devices with newly unlocked labels
      getVideoDevices()
        .then((devs) => {
          setAvailableDevices(devs);
        })
        .catch(console.warn);
    } catch (err: any) {
      console.warn('Physical camera unavailable, falling back to OpenCV simulated stream:', err);
      // Seamless fallback so camera NEVER shows inactive!
      try {
        const simStream = getSimulatedFaceStream();
        if (videoRef.current) {
          attachStreamToVideo(videoRef.current, simStream);
        }
        setHasWebcam(true);
        setIsSimulatedMode(true);
        setCameraError(null);
      } catch (simErr: any) {
        setHasWebcam(false);
        setCameraError('Camera access pending: ' + (err.message || 'Check permissions'));
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeviceChange = (mode: string) => {
    setSelectedCameraMode(mode);
    stopAllCameraTracks();
    startCamera(mode);
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopAllCameraTracks();
    };
  }, []);

  // Frame attentiveness monitor (~1 check per second)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasWebcam && videoRef.current && canvasRef.current && !showNudge) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState >= 2) {
          const res = await analyzeVideoFrame(video, canvas);

          if (res.condition === 'NO_FACE_DETECTED') {
            awayCountRef.current += 1;
            setIsAttentive(false);
            if (awayCountRef.current >= 8 && autoPauseEnabled) {
              setShowNudge(true);
              if (onPauseRequested) onPauseRequested();
            }
          } else {
            awayCountRef.current = 0;
            setIsAttentive(true);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasWebcam, showNudge, onPauseRequested, autoPauseEnabled]);

  const handleDismiss = () => {
    setShowNudge(false);
    awayCountRef.current = 0;
    setIsAttentive(true);
    if (onResumeRequested) onResumeRequested();
  };

  return (
    <>
      {/* Floating Lecture Attentiveness Monitor Badge (Bottom-Right) */}
      <div className="fixed bottom-4 right-4 z-40 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 text-white backdrop-blur-md transition-all duration-300 w-56">
        <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                hasWebcam ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-200">
              Lecture Camera
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleDeviceChange(selectedCameraMode === 'simulated' ? 'auto' : 'simulated')}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              title="Switch between Physical Camera and OpenCV Simulated Face"
            >
              {isSimulatedMode ? 'Sim Feed' : 'Cam Feed'}
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white"
              title={isMinimized ? 'Expand camera' : 'Minimize camera'}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="space-y-2">
            {/* Live Camera Feed Container */}
            <div className="relative w-full h-28 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  hasWebcam ? 'block' : 'hidden'
                }`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!hasWebcam && (
                <div className="p-2 text-center space-y-1">
                  <VideoOff className="w-5 h-5 text-slate-500 mx-auto" />
                  <span className="text-[10px] text-slate-400 block">
                    {cameraError || 'Camera Loading...'}
                  </span>
                  <div className="flex gap-1 justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera('auto')}
                      disabled={isRequesting}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-[9px] font-semibold text-white transition flex items-center gap-1"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isRequesting ? 'animate-spin' : ''}`} />
                      <span>Webcam</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeviceChange('simulated')}
                      className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 rounded text-[9px] font-semibold text-white transition flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>OpenCV Sim</span>
                    </button>
                  </div>
                </div>
              )}

              {hasWebcam && (
                <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white">
                  <Video
                    className={`w-2.5 h-2.5 ${
                      isSimulatedMode ? 'text-purple-400' : 'text-red-500'
                    } animate-pulse`}
                  />
                  <span>{isSimulatedMode ? 'OpenCV Sim' : 'Live Camera'}</span>
                </div>
              )}

              {hasWebcam && (
                <div
                  className={`absolute bottom-1 inset-x-1 py-0.5 text-center text-[9px] rounded font-medium backdrop-blur-sm ${
                    isAttentive
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isAttentive ? 'Attentive • 1 Face Present' : 'Candidate Away...'}
                </div>
              )}
            </div>

            {/* Camera Device Selector Dropdown */}
            <div className="space-y-1">
              <select
                value={selectedCameraMode}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans truncate"
              >
                <option value="auto">Default: Auto Physical Webcam</option>
                <option value="simulated">OpenCV Simulated Face Feed</option>
                {availableDevices
                  .filter((d) => !isVirtualCamera(d.label))
                  .map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {`📷 ${d.label || `Physical Camera #${i + 1}`}`}
                    </option>
                  ))}
              </select>

              {/* Auto-Pause Toggle */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-blue-400" />
                  Auto-pause Lecture:
                </span>
                <button
                  type="button"
                  onClick={() => setAutoPauseEnabled(!autoPauseEnabled)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    autoPauseEnabled
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {autoPauseEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Friendly Non-Punitive Lecture Attentiveness Nudge Modal */}
      {showNudge && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Coffee className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              Taking a quick pause!
            </h3>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              We noticed you stepped away from this lecture. We paused the video playback so you don't miss essential meteorological concepts!
            </p>

            <div className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-400 mb-6 flex items-start gap-2 border border-slate-700">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Lenient Lecture Mode:</strong> No integrity points deducted. This is an assistive pause to help you maintain focus.
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30"
              >
                <Play className="w-4 h-4" />
                <span>Resume Lecture Playback</span>
              </button>
              <button
                onClick={() => {
                  setAutoPauseEnabled(false);
                  handleDismiss();
                }}
                className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                title="Mute pauses for this study session"
              >
                Mute Pauses
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

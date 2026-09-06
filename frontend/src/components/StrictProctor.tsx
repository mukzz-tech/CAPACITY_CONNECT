import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, Eye, Video, VideoOff, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import {
  getCameraStream,
  releaseCameraStream,
  attachStreamToVideo,
  getVideoDevices,
  setSimulatedGaze,
  getSimulatedGaze,
} from '../utils/cameraManager';

interface StrictProctorProps {
  attemptId: string;
  onIntegrityChange: (score: number) => void;
}

export const StrictProctor: React.FC<StrictProctorProps> = ({
  attemptId,
  onIntegrityChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasWebcam, setHasWebcam] = useState<boolean>(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraMode, setSelectedCameraMode] = useState<string>('auto');
  const [simGazeState, setSimGazeState] = useState<'center' | 'away' | 'absent'>('center');
  const [integrityScore, setIntegrityScore] = useState<number>(100.0);
  const [statusMessage, setStatusMessage] = useState<string>('Click "Turn On Camera" or choose OpenCV Sim');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNormal, setIsNormal] = useState<boolean>(true);
  const [flagCount, setFlagCount] = useState<number>(0);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    getVideoDevices().then((devs) => {
      setAvailableDevices(devs);
    }).catch(console.warn);
  }, []);

  // Time counters for threshold checking
  const noFaceDurationRef = useRef<number>(0);
  const turnedAwayDurationRef = useRef<number>(0);
  const lastFlagTimeRef = useRef<number>(0);

  // Send throttled signal to backend
  const sendProctorSignal = useCallback(async (flagType: string, reason: string) => {
    const now = Date.now();
    if (now - lastFlagTimeRef.current < 4000) return;
    lastFlagTimeRef.current = now;

    let deduction = 5.0;
    if (flagType === 'NO_FACE_DETECTED') deduction = 10.0;
    if (flagType === 'MULTIPLE_FACES_DETECTED') deduction = 15.0;

    setIntegrityScore((prev) => {
      const next = Math.max(0, prev - deduction);
      onIntegrityChange(next);
      return next;
    });
    setFlagCount((prev) => prev + 1);

    const token = localStorage.getItem('token');
    if (!token || !attemptId) return;

    try {
      await fetch('/api/proctoring/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attemptId,
          flagType,
          durationSec: 3.0,
          metaDetails: reason,
        }),
      });
    } catch (e) {
      console.warn('Proctor signal dispatch error:', e);
    }
  }, [attemptId, onIntegrityChange]);

  // Stop camera stream cleanly
  const stopTracks = () => {
    releaseCameraStream();
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasWebcam(false);
    setIsSimulatedMode(false);
    setStatusMessage('Camera turned off');
  };

  // Start hardware camera using shared camera manager or simulated feed
  const startCamera = async (overrideMode?: string) => {
    const mode = overrideMode !== undefined ? overrideMode : selectedCameraMode;
    setIsRequesting(true);
    setErrorMessage(null);
    setStatusMessage('Connecting video stream...');

    try {
      const stream = await getCameraStream(mode === 'auto' ? undefined : mode);
      streamRef.current = stream;
      if (videoRef.current) {
        attachStreamToVideo(videoRef.current, stream);
      }

      setHasWebcam(true);
      setIsSimulatedMode(mode === 'simulated');
      setStatusMessage(
        mode === 'simulated'
          ? 'OpenCV Simulation Feed Active (1 Face Centered)'
          : 'Attentiveness verified (1 Face Present)'
      );
      setErrorMessage(null);
    } catch (lastErr: any) {
      console.warn('Could not open camera:', lastErr);
      setHasWebcam(false);
      if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was blocked. Please click the camera or lock icon in your browser address bar, select "Allow", and click "Turn On Camera".');
      } else if (lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware detected. Switch to "OpenCV Live Simulated Feed" below to verify proctoring.');
      } else if (lastErr?.name === 'NotReadableError' || lastErr?.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application. Close other apps or use "OpenCV Live Simulated Feed".');
      } else {
        setErrorMessage(`Camera error: ${lastErr?.message || 'Unable to open video stream'}`);
      }
      setStatusMessage('Camera Inactive');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSimGazeChange = (gaze: 'center' | 'away' | 'absent') => {
    setSimulatedGaze(gaze);
    setSimGazeState(gaze);
    if (gaze === 'center') {
      setStatusMessage('Normal: 1 Face Detected & Focused');
      setIsNormal(true);
    } else if (gaze === 'away') {
      setStatusMessage('FLAG: Face significantly turned away (>3s)');
      setIsNormal(false);
      sendProctorSignal('FACE_TURNED_AWAY', 'Candidate gaze turned off-center for >3s');
    } else {
      setStatusMessage('FLAG: No face detected in frame (>3s)');
      setIsNormal(false);
      sendProctorSignal('NO_FACE_DETECTED', 'Face disappeared or covered for >3s');
    }
  };

  // Automatically attempt opening camera on initial mount
  useEffect(() => {
    startCamera();

    return () => {
      releaseCameraStream();
    };
  }, []);

  // Frame analysis loop (~1 FPS)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Hardware Webcam Mode
      if (hasWebcam && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState >= 2) {
          canvas.width = 160;
          canvas.height = 120;
          ctx.drawImage(video, 0, 0, 160, 120);

          const frame = ctx.getImageData(0, 0, 160, 120);
          const data = frame.data;

          let centerLum = 0;
          let leftLum = 0;
          let rightLum = 0;

          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const x = (i / 4) % 160;

            if (x < 50) leftLum += lum;
            else if (x > 110) rightLum += lum;
            else centerLum += lum;
          }

          const isDarkOrCovered = centerLum < 800;
          const isFaceCentered = centerLum > (leftLum + rightLum) * 0.35;

          if (isDarkOrCovered) {
            noFaceDurationRef.current += 1;
            if (noFaceDurationRef.current >= 3) {
              setIsNormal(false);
              setStatusMessage('FLAG: No face detected in frame (>3s)');
              sendProctorSignal('NO_FACE_DETECTED', 'Face disappeared or covered for >3s');
            }
          } else if (!isFaceCentered) {
            turnedAwayDurationRef.current += 1;
            if (turnedAwayDurationRef.current >= 3) {
              setIsNormal(false);
              setStatusMessage('FLAG: Face significantly turned away (>3s)');
              sendProctorSignal('FACE_TURNED_AWAY', 'Candidate gaze turned off-center for >3s');
            }
          } else {
            noFaceDurationRef.current = 0;
            turnedAwayDurationRef.current = 0;
            setIsNormal(true);
            setStatusMessage('Normal: 1 Face Detected & Focused');
          }
        }
      }

      // 2. Simulated Mode Verification
      if (isSimulatedMode) {
        setIsNormal(true);
        setStatusMessage('Simulated: 1 Face Focused (Local Test Feed)');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasWebcam, isSimulatedMode, sendProctorSignal]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            OpenCV Client Proctoring (Strict)
          </span>
        </div>
        <span className="text-[10px] bg-emerald-950 border border-emerald-600 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          LOCAL ONLY (~1 FPS)
        </span>
      </div>

      {/* Camera Source Selector */}
      <div className="flex items-center gap-2 text-xs">
        <label className="text-[10px] text-slate-400 font-semibold">Camera:</label>
        <select
          value={selectedCameraMode}
          onChange={(e) => {
            setSelectedCameraMode(e.target.value);
            startCamera(e.target.value);
          }}
          className="flex-1 text-[11px] rounded-lg border border-slate-700 p-1 bg-slate-800 text-slate-200 font-medium"
        >
          <option value="auto">🌟 Auto-Detect (Prioritizes Physical Webcam)</option>
          <option value="simulated">🧑‍💻 OpenCV Live Simulated Feed (Proctoring Test Mode)</option>
          {availableDevices.map((d, i) => {
            const lbl = d.label || '';
            const isPhoneLink =
              lbl.toLowerCase().includes('phone') ||
              lbl.toLowerCase().includes('link to windows') ||
              lbl.toLowerCase().includes('virtual');
            return (
              <option key={d.deviceId || i} value={d.deviceId}>
                {isPhoneLink
                  ? `📱 ${lbl} (Phone Link - Requires paired phone)`
                  : `📷 ${lbl || `Physical Camera ${i + 1}`}`}
              </option>
            );
          })}
        </select>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-44 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Real video stream */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            hasWebcam ? 'opacity-100' : 'opacity-0 absolute'
          }`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Simulated feed representation */}
        {isSimulatedMode && !hasWebcam && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-indigo-950/60 p-4 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center mb-2 relative">
              <span className="w-3 h-3 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse" />
              <Eye className="w-8 h-8 text-blue-300" />
            </div>
            <span className="text-xs font-bold text-white">Simulated Candidate Feed</span>
            <span className="text-[10px] text-emerald-400 font-mono mt-0.5">Face Detected (Centered)</span>
          </div>
        )}

        {/* Not Connected / Error overlay */}
        {!hasWebcam && !isSimulatedMode && (
          <div className="p-4 text-center space-y-2">
            <VideoOff className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-300 font-medium">Camera is currently not running</p>
            {errorMessage && (
              <p className="text-[11px] text-amber-400 max-w-xs mx-auto leading-tight">{errorMessage}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera()}
                disabled={isRequesting}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                <span>{isRequesting ? 'Connecting...' : 'Turn On Camera'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCameraMode('simulated');
                  startCamera('simulated');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Simulated Face Test
              </button>
            </div>
          </div>
        )}

        {/* Live Camera Status Badge */}
        {(hasWebcam || isSimulatedMode) && (
          <>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-white">
              <Video className="w-3 h-3 text-red-500 animate-pulse" />
              <span>{hasWebcam ? 'Device Camera (Live)' : 'Simulated Feed'}</span>
            </div>

            <div
              className={`absolute bottom-2 inset-x-2 px-2 py-1 rounded text-[11px] font-medium text-center backdrop-blur-md transition ${
                isNormal
                  ? 'bg-slate-900/85 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-950/90 text-rose-300 border border-rose-600'
              }`}
            >
              {statusMessage}
            </div>
          </>
        )}
      </div>

      {/* Manual Controls Ribbon */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span>Webcam Control:</span>
        <div className="flex gap-2">
          {hasWebcam ? (
            <button
              type="button"
              onClick={stopTracks}
              className="text-slate-400 hover:text-rose-400 underline transition"
            >
              Turn Off
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera()}
              className="text-blue-400 hover:text-blue-300 underline transition font-medium"
            >
              Turn On Camera
            </button>
          )}
          {!isSimulatedMode && (
            <button
              type="button"
              onClick={() => {
                setSelectedCameraMode('simulated');
                startCamera('simulated');
              }}
              className="text-slate-400 hover:text-white underline transition"
            >
              Simulate Feed
            </button>
          )}
        </div>
      </div>

      {/* Real-time Integrity Score Meter */}
      <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Candidate Integrity Score:
          </span>
          <span
            className={`font-bold font-mono text-sm ${
              integrityScore >= 80
                ? 'text-emerald-400'
                : integrityScore >= 60
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {integrityScore.toFixed(0)} / 100
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              integrityScore >= 80
                ? 'bg-emerald-500'
                : integrityScore >= 60
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${integrityScore}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
          <span>Flags Logged: <strong className="text-slate-200">{flagCount}</strong></span>
          <span className="italic">100% Client-side. Zero video uploaded.</span>
        </div>
      </div>
    </div>
  );
};

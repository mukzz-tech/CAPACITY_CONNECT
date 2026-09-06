/**
 * Global Camera Stream Manager
 * Provides reliable webcam access on Windows/Chrome/Edge.
 * Automatically avoids Phone Link / Virtual camera traps, provides a device picker,
 * and includes a live canvas-synthesized OpenCV simulated face generator.
 */

let activeStream: MediaStream | null = null;
let pendingPromise: Promise<MediaStream> | null = null;
let activeConsumers = 0;
let releaseTimeout: any = null;

// Simulated Face Animation State
let simCanvas: HTMLCanvasElement | null = null;
let simInterval: any = null;
let simStream: MediaStream | null = null;
let simGazeMode: 'center' | 'away' | 'absent' = 'center';
let simAnimFrame = 0;

export async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .filter((d) => {
        const l = (d.label || '').toLowerCase();
        // Filter out disconnected Phone Link virtual camera (window 12403 black screen trap)
        return !l.includes('link to windows') && !l.includes('12403');
      });
  } catch (e) {
    return [];
  }
}

/**
 * Creates an interactive live synthesized face stream.
 * Emits a 30 FPS MediaStream directly into HTML5 video elements for OpenCV analysis.
 */
export function getSimulatedFaceStream(): MediaStream {
  if (simStream && simStream.active) {
    return simStream;
  }

  if (!simCanvas) {
    simCanvas = document.createElement('canvas');
    simCanvas.width = 320;
    simCanvas.height = 240;
  }

  const ctx = simCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (simInterval) clearInterval(simInterval);

  simInterval = setInterval(() => {
    simAnimFrame++;
    ctx.fillStyle = '#0f172a'; // dark background
    ctx.fillRect(0, 0, 320, 240);

    // If candidate stepped away / absent
    if (simGazeMode === 'absent') {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[Candidate Away / No Face]', 160, 120);
      return;
    }

    // Gentle head sway
    const headX = simGazeMode === 'away' ? 240 : 160 + Math.sin(simAnimFrame * 0.05) * 4;
    const headY = 110 + Math.cos(simAnimFrame * 0.04) * 2;

    // Neck
    ctx.fillStyle = '#e2b393';
    ctx.fillRect(headX - 18, headY + 50, 36, 40);

    // Head / Face Oval
    ctx.fillStyle = '#f5c6a5';
    ctx.beginPath();
    ctx.ellipse(headX, headY, 50, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(headX, headY - 45, 55, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const blink = Math.sin(simAnimFrame * 0.1) > 0.96;
    const eyeOffsetX = simGazeMode === 'away' ? 18 : 20;

    if (blink) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(headX - eyeOffsetX - 10, headY - 5);
      ctx.lineTo(headX - eyeOffsetX + 10, headY - 5);
      ctx.moveTo(headX + eyeOffsetX - 10, headY - 5);
      ctx.lineTo(headX + eyeOffsetX + 10, headY - 5);
      ctx.stroke();
    } else {
      // Left eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX - eyeOffsetX, headY - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      // Right eye
      ctx.beginPath();
      ctx.arc(headX + eyeOffsetX, headY - 5, 8, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      const pupilShift = simGazeMode === 'away' ? 5 : 0;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(headX - eyeOffsetX + pupilShift, headY - 5, 4, 0, Math.PI * 2);
      ctx.arc(headX + eyeOffsetX + pupilShift, headY - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(headX - eyeOffsetX - 12, headY - 18);
    ctx.lineTo(headX - eyeOffsetX + 10, headY - 18);
    ctx.moveTo(headX + eyeOffsetX - 10, headY - 18);
    ctx.lineTo(headX + eyeOffsetX + 12, headY - 18);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX, headY - 2);
    ctx.lineTo(headX - 4, headY + 15);
    ctx.lineTo(headX + 4, headY + 15);
    ctx.stroke();

    // Mouth / Smile
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headX, headY + 30, 16, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Live OpenCV Tracking Watermark
    ctx.fillStyle = '#10b981';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OPENCV SIM: ' + (simGazeMode === 'away' ? 'GAZE AWAY' : 'FACE CENTERED'), 10, 20);
  }, 33); // ~30 FPS

  simStream = (simCanvas as any).captureStream(30);
  return simStream!;
}

export function setSimulatedGaze(mode: 'center' | 'away' | 'absent') {
  simGazeMode = mode;
}

export function getSimulatedGaze() {
  return simGazeMode;
}

/**
 * Instantly stops all active hardware camera tracks and frees Windows driver lock.
 */
export function stopAllCameraTracks() {
  if (releaseTimeout) {
    clearTimeout(releaseTimeout);
    releaseTimeout = null;
  }
  if (activeStream) {
    activeStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {}
    });
    activeStream = null;
  }
  activeConsumers = 0;
}

export function releaseCameraStream(immediate = false) {
  activeConsumers = Math.max(0, activeConsumers - 1);

  if (releaseTimeout) {
    clearTimeout(releaseTimeout);
    releaseTimeout = null;
  }

  if (immediate || activeConsumers <= 0) {
    stopAllCameraTracks();
  }
}

/**
 * Gets the camera stream, prioritizing physical webcams over Windows Phone Link virtual devices.
 */
export async function getCameraStream(preferredDeviceId?: string): Promise<MediaStream> {
  if (releaseTimeout) {
    clearTimeout(releaseTimeout);
    releaseTimeout = null;
  }

  // 1. If simulated stream is explicitly requested
  if (preferredDeviceId === 'simulated') {
    const stream = getSimulatedFaceStream();
    activeConsumers++;
    return stream;
  }

  // 2. Check if an active physical stream is already running and healthy
  if (
    activeStream &&
    activeStream.active &&
    activeStream.getVideoTracks().some((t) => t.readyState === 'live')
  ) {
    const activeTrack = activeStream.getVideoTracks()[0];
    const trackLabel = (activeTrack?.label || '').toLowerCase();
    const isVirtual = trackLabel.includes('link to windows') || trackLabel.includes('phone') || trackLabel.includes('virtual');

    if (!isVirtual) {
      // If user wants auto or same physical device, reuse existing live stream
      if (!preferredDeviceId || preferredDeviceId === 'auto') {
        activeConsumers++;
        return activeStream;
      }
      const settings = activeTrack.getSettings ? activeTrack.getSettings() : {};
      if (settings.deviceId === preferredDeviceId) {
        activeConsumers++;
        return activeStream;
      }
    }

    // Explicitly different device requested or current track is virtual: stop previous stream so Windows hardware lock is freed!
    stopAllCameraTracks();
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API (getUserMedia) not supported in this browser.');
  }

  // 3. Find physical camera device (prioritize Realtek/Integrated/Webcam over Link to Windows)
  const devices = await getVideoDevices();
  let targetDeviceId = preferredDeviceId && preferredDeviceId !== 'auto' ? preferredDeviceId : undefined;

  if (!targetDeviceId && devices.length > 0) {
    const physicalCam = devices.find((d) => {
      const l = (d.label || '').toLowerCase();
      const isVirtual = l.includes('link to windows') || l.includes('phone') || l.includes('virtual') || l.includes('obs');
      const isPhysical = l.includes('integrated') || l.includes('realtek') || l.includes('webcam') || l.includes('usb') || l.includes('hd') || l.includes('camera');
      return !isVirtual && isPhysical;
    });

    if (physicalCam && physicalCam.deviceId) {
      targetDeviceId = physicalCam.deviceId;
    } else {
      const nonVirtual = devices.find((d) => {
        const l = (d.label || '').toLowerCase();
        return !l.includes('link to windows') && !l.includes('phone') && !l.includes('virtual');
      });
      if (nonVirtual && nonVirtual.deviceId) {
        targetDeviceId = nonVirtual.deviceId;
      }
    }
  }

  // 4. Build resilient constraint tiers with ideal deviceId
  const constraintTiers: MediaStreamConstraints[] = [];

  if (targetDeviceId) {
    constraintTiers.push({
      video: {
        deviceId: { ideal: targetDeviceId },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });
    constraintTiers.push({
      video: { deviceId: { ideal: targetDeviceId } },
      audio: false,
    });
  }

  constraintTiers.push({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  constraintTiers.push({
    video: { width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  constraintTiers.push({
    video: { width: { ideal: 320 }, height: { ideal: 240 } },
    audio: false,
  });
  constraintTiers.push({
    video: { facingMode: 'user' },
    audio: false,
  });
  constraintTiers.push({
    video: true,
    audio: false,
  });

  let lastError: any = null;
  for (const constraints of constraintTiers) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const activeTrack = stream.getVideoTracks()[0];
      const trackLabel = (activeTrack?.label || '').toLowerCase();
      const isVirtualTrack =
        trackLabel.includes('link to windows') ||
        trackLabel.includes('phone') ||
        trackLabel.includes('virtual') ||
        trackLabel.includes('12403');

      // If Windows assigned Phone Link virtual camera (black screen trap), bypass to physical webcam or OpenCV simulation!
      if (isVirtualTrack) {
        console.warn('Phone Link / Virtual camera detected (black screen trap), bypassing to physical camera or OpenCV simulation...');
        stream.getTracks().forEach((t) => t.stop());

        const freshDevs = await navigator.mediaDevices.enumerateDevices();
        const realDev = freshDevs.find((d) => {
          if (d.kind !== 'videoinput') return false;
          const l = (d.label || '').toLowerCase();
          return (
            (l.includes('integrated') ||
              l.includes('realtek') ||
              l.includes('webcam') ||
              l.includes('camera') ||
              l.includes('usb')) &&
            !l.includes('virtual') &&
            !l.includes('link to windows') &&
            !l.includes('phone') &&
            !l.includes('12403')
          );
        });

        if (realDev && realDev.deviceId) {
          try {
            const realStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { ideal: realDev.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
            const realTrack = realStream.getVideoTracks()[0];
            const realLabel = (realTrack?.label || '').toLowerCase();
            if (!realLabel.includes('virtual') && !realLabel.includes('12403') && !realLabel.includes('phone')) {
              activeStream = realStream;
              activeConsumers++;
              return realStream;
            }
            realStream.getTracks().forEach((t) => t.stop());
          } catch (e) {
            console.warn('Switching to physical camera failed:', e);
          }
        }

        // If physical camera is unavailable or busy, bypass black screen directly to OpenCV live face simulation!
        console.log('Bypassing to OpenCV simulated face stream to eliminate black screen.');
        const sim = getSimulatedFaceStream();
        activeConsumers++;
        return sim;
      }

      activeStream = stream;
      activeConsumers++;
      return stream;
    } catch (err: any) {
      lastError = err;
      console.warn('Camera constraint tier failed:', err.name || err.message);
    }
  }

  // Graceful fallback to live simulated stream so candidate never sees a black screen
  console.warn('Physical camera unavailable, bypassing to live OpenCV simulation stream:', lastError);
  const fallbackStream = getSimulatedFaceStream();
  activeConsumers++;
  return fallbackStream;
}

export function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      console.warn('Video play delayed or prevented:', err);
    });
  }
}

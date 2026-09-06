/**
 * Global Camera Stream Manager
 * Provides reliable webcam access on Windows/Chrome/Edge, eliminating concurrency locks,
 * handling React 18 StrictMode remounting gracefully, and setting proper video element DOM properties.
 */

let activeStream: MediaStream | null = null;
let pendingPromise: Promise<MediaStream> | null = null;
let activeConsumers = 0;
let releaseTimeout: any = null;

export async function getCameraStream(): Promise<MediaStream> {
  // Cancel pending release if a new consumer arrives
  if (releaseTimeout) {
    clearTimeout(releaseTimeout);
    releaseTimeout = null;
  }

  // If we already have a healthy, active stream, reuse it immediately
  if (activeStream && activeStream.active && activeStream.getVideoTracks().some((t) => t.readyState === 'live')) {
    activeConsumers++;
    return activeStream;
  }

  // If another request is currently in-flight, await it rather than opening a competing handle
  if (pendingPromise) {
    const stream = await pendingPromise;
    activeConsumers++;
    return stream;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API (navigator.mediaDevices.getUserMedia) is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
  }

  const constraintTiers: MediaStreamConstraints[] = [
    { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false },
    { video: { width: { ideal: 320 }, height: { ideal: 240 } }, audio: false },
    { video: true, audio: false },
  ];

  pendingPromise = (async () => {
    let lastError: any = null;
    for (const constraints of constraintTiers) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        return stream;
      } catch (err: any) {
        lastError = err;
        console.warn('Camera constraint tier failed:', constraints, err.name || err.message);
      }
    }
    throw lastError || new Error('Unable to access webcam hardware');
  })();

  try {
    const stream = await pendingPromise;
    activeConsumers++;
    return stream;
  } finally {
    pendingPromise = null;
  }
}

export function releaseCameraStream() {
  activeConsumers = Math.max(0, activeConsumers - 1);
  
  // 1500ms grace period to survive React 18 StrictMode double-mounting
  if (releaseTimeout) {
    clearTimeout(releaseTimeout);
  }

  releaseTimeout = setTimeout(() => {
    if (activeConsumers <= 0 && activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      activeStream = null;
      activeConsumers = 0;
    }
  }, 1500);
}

export function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  // Fix React 18 muted bug where muted attribute is not reflected on DOM property
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

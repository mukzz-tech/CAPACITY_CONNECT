import { Router, Request, Response } from 'express';
import http from 'http';

const router = Router();
const PYTHON_PORT = 5005;
const PYTHON_CAMERA_URL = `http://127.0.0.1:${PYTHON_PORT}`;

// 1. Live OpenCV Camera MJPEG Video Stream
router.get('/video_feed', (req: Request, res: Response) => {
  const options = {
    hostname: '127.0.0.1',
    port: PYTHON_PORT,
    path: '/video_feed',
    method: 'GET',
    timeout: 60000,
  };

  const upstreamReq = http.request(options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Connection': 'close',
    });

    upstreamRes.pipe(res);

    req.on('close', () => {
      try {
        upstreamRes.destroy();
        upstreamReq.destroy();
      } catch {}
    });
  });

  upstreamReq.on('error', (err) => {
    console.warn('[Camera Stream] Could not connect to Python OpenCV video feed:', err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'OpenCV Camera service offline or starting up',
        details: err.message,
      });
    }
  });

  upstreamReq.end();
});

// 2. Real-Time Camera Proctoring Status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${PYTHON_CAMERA_URL}/camera_status`);
    if (upstream.ok) {
      const data = await upstream.json();
      return res.json(data);
    }
    return res.status(upstream.status).json({
      online: false,
      camera_available: false,
      condition: 'NO_FACE_DETECTED',
      message: 'OpenCV status endpoint error',
    });
  } catch (err: any) {
    return res.json({
      online: false,
      camera_available: false,
      condition: 'NO_FACE_DETECTED',
      message: 'Python OpenCV camera service offline',
    });
  }
});

// 3. Process frame from canvas via OpenCV
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${PYTHON_CAMERA_URL}/detect_frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    return res.status(503).json({ success: false, error: err.message });
  }
});

export default router;

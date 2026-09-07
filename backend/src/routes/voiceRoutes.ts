import { Router, Request, Response } from 'express';
import multer from 'multer';
import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB audio limit
});

const PYTHON_PORT = 5005;
const PYTHON_SERVICE_URL = `http://127.0.0.1:${PYTHON_PORT}`;
const PYTHON_SCRIPT_PATH = path.resolve(__dirname, '../../python_service/voice_service.py');

let pythonProcess: any = null;

// Ensure Python service is running
export const ensurePythonService = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${PYTHON_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return true;
  } catch {
    // Service not running, attempt to spawn
  }

  if (pythonProcess && !pythonProcess.killed) {
    return false;
  }

  try {
    console.log('[Voice Service] Spawning Python voice service daemon...');
    pythonProcess = spawn('python', [PYTHON_SCRIPT_PATH, '--port', String(PYTHON_PORT)], {
      detached: false,
      stdio: 'ignore',
    });

    pythonProcess.on('error', (err: any) => {
      console.warn('[Voice Service] Could not spawn Python service daemon:', err.message);
      pythonProcess = null;
    });

    pythonProcess.on('exit', () => {
      pythonProcess = null;
    });

    // Wait up to 1.5s for service to bind
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`${PYTHON_SERVICE_URL}/health`);
        if (res.ok) {
          console.log('[Voice Service] Python voice service daemon is online on port', PYTHON_PORT);
          return true;
        }
      } catch {}
    }
  } catch (err: any) {
    console.warn('[Voice Service] Failed to launch daemon:', err.message);
  }

  return false;
};

// Fallback: Transcribe via direct Python CLI invocation
const transcribeViaCli = (audioBuffer: Buffer, language = 'en-IN'): Promise<any> => {
  return new Promise((resolve) => {
    const tmpPath = path.join(os.tmpdir(), `cc_voice_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);
    fs.writeFile(tmpPath, audioBuffer, (writeErr) => {
      if (writeErr) {
        return resolve({ success: false, error: 'Could not write temporary audio file.' });
      }

      execFile(
        'python',
        [PYTHON_SCRIPT_PATH, '--transcribe', tmpPath, '--language', language],
        { timeout: 15000 },
        (execErr, stdout, stderr) => {
          try { fs.unlinkSync(tmpPath); } catch {}

          if (execErr) {
            return resolve({
              success: false,
              error: stderr || execErr.message || 'CLI transcription failed',
            });
          }

          try {
            const parsed = JSON.parse(stdout.trim());
            resolve(parsed);
          } catch {
            resolve({
              success: false,
              error: 'Failed to parse Python speech output: ' + stdout,
            });
          }
        }
      );
    });
  });
};

// Fallback: Parse command via direct Python CLI invocation
const commandViaCli = (text: string): Promise<any> => {
  return new Promise((resolve) => {
    execFile(
      'python',
      [PYTHON_SCRIPT_PATH, '--command', text],
      { timeout: 5000 },
      (execErr, stdout) => {
        if (execErr) {
          return resolve({ success: false, error: execErr.message });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({ success: true, transcript: text, command: parsed });
        } catch {
          resolve({ success: false, error: 'Could not parse CLI response' });
        }
      }
    );
  });
};

// 1. Health & Status
router.get('/status', async (req: Request, res: Response) => {
  let isOnline = false;
  let details: any = null;

  try {
    const upstream = await fetch(`${PYTHON_SERVICE_URL}/health`);
    if (upstream.ok) {
      details = await upstream.json();
      isOnline = true;
    }
  } catch {}

  if (!isOnline) {
    // Attempt auto-start in background
    ensurePythonService().catch(() => {});
  }

  res.json({
    online: isOnline,
    port: PYTHON_PORT,
    endpoint: `${PYTHON_SERVICE_URL}/transcribe`,
    pythonScript: PYTHON_SCRIPT_PATH,
    details,
  });
});

// 2. Transcribe Audio Stream
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    let audioBuffer: Buffer | null = null;
    let language = (req.body?.language || req.query?.language || 'en-IN') as string;

    if (req.file && req.file.buffer) {
      audioBuffer = req.file.buffer;
    } else if (req.body && req.body.audio_base64) {
      let b64 = req.body.audio_base64;
      if (b64.includes(',')) b64 = b64.split(',')[1];
      audioBuffer = Buffer.from(b64, 'base64');
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ success: false, error: 'No audio data received' });
    }

    // Try HTTP Microservice first for low latency
    try {
      const isHealthy = await ensurePythonService();
      if (isHealthy) {
        const upstream = await fetch(`${PYTHON_SERVICE_URL}/transcribe?language=${encodeURIComponent(language)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'audio/wav',
          },
          body: new Uint8Array(audioBuffer),
        });

        const data = await upstream.json();
        return res.status(upstream.status).json(data);
      }
    } catch (httpErr: any) {
      console.warn('[Voice Service] HTTP route failed, using CLI fallback:', httpErr.message);
    }

    // Fallback: Direct CLI execution
    const fallbackResult = await transcribeViaCli(audioBuffer, language);
    return res.status(fallbackResult.success ? 200 : 422).json(fallbackResult);
  } catch (err: any) {
    console.error('[Voice Service] Transcribe handler error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// 3. Command Parse Route
router.post('/command', async (req: Request, res: Response) => {
  try {
    const text = (req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    try {
      const isHealthy = await ensurePythonService();
      if (isHealthy) {
        const upstream = await fetch(`${PYTHON_SERVICE_URL}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await upstream.json();
        return res.status(upstream.status).json(data);
      }
    } catch {}

    // Fallback: CLI command parsing
    const result = await commandViaCli(text);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Poll Latest Voice Event (Background Hardware Microphone & Transcriptions)
router.get('/poll', async (req: Request, res: Response) => {
  try {
    const since = req.query.since || '0';
    const isHealthy = await ensurePythonService();
    if (isHealthy) {
      const upstream = await fetch(`${PYTHON_SERVICE_URL}/voice_poll?since=${encodeURIComponent(String(since))}`);
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    }
    return res.json({ has_command: false, latest_id: 0, mic_active: false });
  } catch (err: any) {
    return res.json({ has_command: false, latest_id: 0, mic_active: false, error: err.message });
  }
});

// 5. Control Hardware Microphone Listener
router.post('/listener-control', async (req: Request, res: Response) => {
  try {
    const isHealthy = await ensurePythonService();
    if (isHealthy) {
      const upstream = await fetch(`${PYTHON_SERVICE_URL}/voice_listener_control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    }
    return res.json({ success: false, mic_active: false });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';

const router = Router();

// In-memory cache for synthesized audio chunks
const audioCache = new Map<string, Buffer>();

router.get('/', async (req: Request, res: Response) => {
  try {
    const rawText = (req.query.text as string || '').trim();
    const langParam = (req.query.lang as string || 'en').toLowerCase();
    const lang = langParam.startsWith('hi') ? 'hi' : 'en';

    if (!rawText) {
      return res.status(400).json({ error: 'Text query parameter is required' });
    }

    // Truncate to maximum 200 characters per TTS chunk
    const safeText = rawText.substring(0, 200);
    const cacheKey = `${lang}:${safeText}`;

    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      res.set({
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': cached.length.toString(),
      });
      return res.send(cached);
    }

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(safeText)}`;
    
    const upstreamRes = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: 'TTS upstream error' });
    }

    const arrayBuf = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length > 0) {
      if (audioCache.size > 500) {
        const keysToDelete = Array.from(audioCache.keys()).slice(0, 200);
        keysToDelete.forEach((k) => audioCache.delete(k));
      }
      audioCache.set(cacheKey, buffer);
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': buffer.length.toString(),
    });
    return res.send(buffer);
  } catch (err: any) {
    console.error('TTS handler error:', err);
    return res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

export default router;

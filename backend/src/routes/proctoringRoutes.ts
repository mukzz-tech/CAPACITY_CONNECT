import { Router, Response } from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { ProctoringService } from '../services/proctoringService.js';
import { UserRole } from '../types/index.js';

const router = Router();

// 1. Ingest In-Browser Proctoring Flag Signal
router.post('/signal', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { attemptId, flagType, durationSec, metaDetails } = req.body;

    if (!attemptId || !flagType) {
      res.status(400).json({ error: 'attemptId and flagType are required.' });
      return;
    }

    const result = await ProctoringService.recordFlag({
      attemptId,
      flagType,
      durationSec: durationSec ? Number(durationSec) : 1.0,
      metaDetails,
    });

    res.json({
      message: 'Proctoring flag logged and integrity score adjusted.',
      newIntegrityScore: result.newIntegrityScore,
      flagId: result.flag.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Trainer/Admin Review Queue of Flagged Attempts
router.get('/review-queue', authenticate, requireRole([UserRole.TRAINER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const flaggedAttempts = await ProctoringService.getFlaggedAttempts();
    res.json({ flaggedAttempts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

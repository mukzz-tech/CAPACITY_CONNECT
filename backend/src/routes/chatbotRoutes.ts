import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, authenticateOptional, AuthenticatedRequest } from '../middleware/auth.js';
import { ChatbotService } from '../services/chatbotService.js';

const router = Router();

// 1. Ask a question to the AI Assistant (Available to logged in users and guests)
router.post('/ask', authenticateOptional, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question, sessionId } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question text is required.' });
      return;
    }

    const result = await ChatbotService.answerQuestion(
      req.user?.userId,
      question,
      sessionId
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get User's Chat Sessions
router.get('/sessions', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user!.userId },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Messages in a Chat Session
router.get('/sessions/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

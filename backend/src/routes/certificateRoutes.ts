import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 1. Trainee: Get All My Certificates
router.get('/my-certificates', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user!.userId },
      include: { course: true },
      orderBy: { issueDate: 'desc' },
    });

    res.json({ certificates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Public: Verify Certificate by Code (No Auth Required)
router.get('/verify/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code;

    const cert = await prisma.certificate.findUnique({
      where: { certificateCode: code },
      include: {
        course: { select: { title: true, code: true, durationWeeks: true } },
        user: {
          select: {
            email: true,
            profile: { select: { fullName: true, jobDesignation: true, department: true } },
          },
        },
      },
    });

    if (!cert) {
      res.status(404).json({
        isValid: false,
        message: 'Certificate not found. This code does not match any official IMD credential records.',
      });
      return;
    }

    res.json({
      isValid: true,
      certificate: {
        certificateCode: cert.certificateCode,
        traineeName: cert.traineeName,
        courseTitle: cert.courseTitle,
        courseCode: cert.course.code,
        finalScore: cert.finalScore,
        grade: cert.grade,
        issueDate: cert.issueDate,
        recipientDesignation: cert.user.profile?.jobDesignation || 'Officer',
        recipientDepartment: cert.user.profile?.department || 'IMD Regional Centre',
        pdfUrl: cert.pdfFileUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

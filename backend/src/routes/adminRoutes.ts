import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole, ApprovalStatus, CourseStatus } from '../types/index.js';

const router = Router();

// 1. Pending User Approvals Queue
router.get('/pending-users', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { approvalStatus: ApprovalStatus.PENDING },
      include: { profile: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Approve or Reject User & Assign Final Role
router.post('/approve-user', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId, action, assignedRole, notes } = req.body; // action: "APPROVE" | "REJECT"

    if (!targetUserId || !action) {
      res.status(400).json({ error: 'targetUserId and action are required.' });
      return;
    }

    const newStatus = action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    const finalRole = assignedRole || UserRole.TRAINEE;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        approvalStatus: newStatus,
        role: finalRole,
      },
      include: { profile: true },
    });

    // Record Audit Log for accountability
    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        actionType: action === 'APPROVE' ? 'USER_APPROVAL' : 'USER_REJECTION',
        targetUserId,
        notes: notes || `Admin set status to ${newStatus} with role ${finalRole}`,
      },
    });

    res.json({
      message: `User ${action.toLowerCase()}d successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Course Review Queue
router.get('/courses/review-queue', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      where: { status: CourseStatus.PENDING_REVIEW },
      include: {
        trainer: { include: { profile: true } },
        competencies: { include: { competency: true } },
        lessons: {
          include: {
            modules: true,
            assessments: { include: { questions: true } },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    res.json({ courses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Publish Course or Request Revision
router.post('/courses/publish', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { courseId, action, reviewNote } = req.body; // action: "PUBLISH" | "REJECT"

    if (!courseId || !action) {
      res.status(400).json({ error: 'courseId and action are required.' });
      return;
    }

    const newStatus = action === 'PUBLISH' ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: newStatus,
        adminReviewNote: reviewNote || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        actionType: action === 'PUBLISH' ? 'COURSE_PUBLISH' : 'COURSE_REVISION_REQUESTED',
        targetId: courseId,
        notes: reviewNote || (action === 'PUBLISH' ? 'Approved for catalog publication' : 'Sent back to trainer with notes'),
      },
    });

    res.json({
      message: action === 'PUBLISH' ? 'Course published successfully' : 'Course sent back for revision',
      course,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Aggregate Analytics Dashboard
router.get('/analytics', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalTrainees = await prisma.user.count({ where: { role: UserRole.TRAINEE } });
    const totalTrainers = await prisma.user.count({ where: { role: UserRole.TRAINER } });
    const pendingApprovals = await prisma.user.count({ where: { approvalStatus: ApprovalStatus.PENDING } });

    const totalCourses = await prisma.course.count();
    const publishedCourses = await prisma.course.count({ where: { status: CourseStatus.PUBLISHED } });
    const pendingCourses = await prisma.course.count({ where: { status: CourseStatus.PENDING_REVIEW } });

    const totalEnrollments = await prisma.enrollment.count();
    const completedEnrollments = await prisma.enrollment.count({ where: { completedAt: { not: null } } });
    const totalCertificates = await prisma.certificate.count();

    const attempts = await prisma.assessmentAttempt.findMany({
      select: { scoreAchieved: true, maxScore: true, percentage: true, integrityScore: true },
    });

    const averageScore = attempts.length > 0
      ? Number((attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length).toFixed(1))
      : 0;

    const averageIntegrity = attempts.length > 0
      ? Number((attempts.reduce((sum, a) => sum + a.integrityScore, 0) / attempts.length).toFixed(1))
      : 100.0;

    res.json({
      analytics: {
        totalUsers,
        totalTrainees,
        totalTrainers,
        pendingApprovals,
        totalCourses,
        publishedCourses,
        pendingCourses,
        totalEnrollments,
        completedEnrollments,
        totalCertificates,
        averageScore,
        averageIntegrity,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Searchable Index of Qualified Trainers by Subject / Competency
router.get('/trainers/search', authenticate, requireRole([UserRole.ADMIN, UserRole.TRAINER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { competencyId, query } = req.query;

    const where: any = { role: UserRole.TRAINER };
    if (query) {
      where.OR = [
        { email: { contains: String(query) } },
        { profile: { fullName: { contains: String(query) } } },
        { profile: { jobDesignation: { contains: String(query) } } },
      ];
    }

    const trainers = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        createdCourses: {
          select: { id: true, title: true, code: true, status: true },
        },
      },
    });

    res.json({ trainers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Announcements Feed (Public or Authenticated)
router.get('/announcements', async (req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ announcements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Create Announcement (Admin only)
router.post('/announcements', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, content, priority } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority ? Number(priority) : 0,
        isPublished: true,
      },
    });

    res.status(201).json({ message: 'Announcement created', announcement });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Competencies List & Management
router.get('/competencies', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const competencies = await prisma.competency.findMany({
      orderBy: { category: 'asc' },
    });
    res.json({ competencies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Audit Logs
router.get('/audit-logs', authenticate, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        admin: { select: { email: true, profile: { select: { fullName: true } } } },
        targetUser: { select: { email: true, profile: { select: { fullName: true } } } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, authenticateOptional, requireRole, requireApproved, AuthenticatedRequest } from '../middleware/auth.js';
import { CompetencyService } from '../services/competencyService.js';
import { CourseStatus, UserRole } from '../types/index.js';

const router = Router();

// 1. Browse Published Courses (Accessible to all users, optional auth)
router.get('/', authenticateOptional, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, isLongDuration, search } = req.query;

    const where: any = {
      status: CourseStatus.PUBLISHED,
    };

    if (isLongDuration !== undefined) {
      where.isLongDuration = isLongDuration === 'true';
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { code: { contains: String(search) } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        trainer: { include: { profile: true } },
        competencies: { include: { competency: true } },
        lessons: {
          select: { id: true, sequence: true, title: true },
          orderBy: { sequence: 'asc' },
        },
        _count: { select: { enrollments: true, lessons: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ courses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Trainee Recommended Courses (Skill gap tailored)
router.get('/recommendations', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const gapData = await CompetencyService.calculateTraineeGap(req.user!.userId);
    res.json({ recommendations: gapData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Course Details (With prerequisite qualification check for current trainee)
router.get('/:id', authenticateOptional, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        trainer: { include: { profile: true } },
        competencies: { include: { competency: true } },
        prerequisites: {
          include: { prerequisiteCourse: true },
        },
        lessons: {
          include: {
            modules: { orderBy: { sequence: 'asc' } },
            assessments: {
              select: { id: true, title: true, isStrictProctored: true },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Trainee enrollment check and prerequisite verification
    let isEnrolled = false;
    let enrollmentData = null;
    let isEligible = true;
    const unmetPrerequisites: string[] = [];

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.userId, courseId } },
      include: { lessonProgress: true },
    });

    if (enrollment) {
      isEnrolled = true;
      enrollmentData = enrollment;
    } else {
      // Check prerequisites
      const userProfile = await prisma.profile.findUnique({
        where: { userId: req.user!.userId },
      });
      const userExp = userProfile?.yearsExperience || 0;

      for (const prereq of course.prerequisites) {
        if (userExp < prereq.minYearsExpRequired) {
          isEligible = false;
          unmetPrerequisites.push(
            `Requires ${prereq.minYearsExpRequired} years experience (You have ${userExp} yrs)`
          );
        }

        const passedPriorCourse = await prisma.enrollment.findFirst({
          where: {
            userId: req.user!.userId,
            courseId: prereq.prerequisiteCourseId,
            finalScore: { gte: 50.0 },
          },
        });

        if (!passedPriorCourse) {
          isEligible = false;
          unmetPrerequisites.push(`Must complete prerequisite: ${prereq.prerequisiteCourse.title}`);
        }
      }
    }

    res.json({
      course,
      isEnrolled,
      enrollment: enrollmentData,
      isEligible,
      unmetPrerequisites,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Trainer: Create Course (Draft state)
router.post('/', authenticate, requireRole([UserRole.TRAINER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, title, description, durationWeeks, isLongDuration, competencyIds } = req.body;

    if (!code || !title || !description) {
      res.status(400).json({ error: 'Code, title, and description are required.' });
      return;
    }

    const course = await prisma.course.create({
      data: {
        code,
        title,
        description,
        durationWeeks: Number(durationWeeks) || 1,
        isLongDuration: Boolean(isLongDuration),
        status: CourseStatus.DRAFT,
        trainerId: req.user!.userId,
        competencies: competencyIds && competencyIds.length > 0 ? {
          create: competencyIds.map((cId: string) => ({
            competencyId: cId,
          })),
        } : undefined,
      },
      include: {
        competencies: { include: { competency: true } },
      },
    });

    res.status(201).json({ message: 'Course created in draft state', course });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Trainer: Add Lesson and Modules
router.post('/:id/lessons', authenticate, requireRole([UserRole.TRAINER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const { sequence, title, description, modules } = req.body;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        sequence: Number(sequence) || 1,
        title,
        description,
        modules: modules && modules.length > 0 ? {
          create: modules.map((m: any, idx: number) => ({
            sequence: idx + 1,
            title: m.title,
            contentType: m.contentType, // "VIDEO" | "NOTES_DOC" | "NOTES_TEXT" | "AUDIO"
            fileUrl: m.fileUrl || null,
            fileSize: m.fileSize || null,
            mimeType: m.mimeType || null,
            formattedText: m.formattedText || null,
            language: m.language || 'en',
          })),
        } : undefined,
      },
      include: { modules: true },
    });

    res.status(201).json({ message: 'Lesson added successfully', lesson });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Trainer: Submit Course for Admin Review
router.post('/:id/submit-review', authenticate, requireRole([UserRole.TRAINER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: CourseStatus.PENDING_REVIEW,
        adminReviewNote: null,
      },
    });

    res.json({ message: 'Course submitted for admin review', course });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Trainee: Enroll in Course
router.post('/:id/enroll', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const userId = req.user!.userId;

    if (req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.TRAINER) {
      res.status(403).json({ error: 'Administrative and Trainer accounts cannot enroll as trainees. Administrators oversee and publish courses from the Central Admin Console.' });
      return;
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existing) {
      res.status(400).json({ error: 'Already enrolled in this course.' });
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        progressPercent: 0,
      },
    });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Trainee: Submit Structured Feedback (0 to 10 scale across 4 areas)
router.post('/:id/feedback', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const userId = req.user!.userId;
    const { courseContent, facultyInteraction, usefulness, infrastructure, comments } = req.body;

    const feedback = await prisma.feedback.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        courseContent: Math.min(10, Math.max(0, Number(courseContent) || 8)),
        facultyInteraction: Math.min(10, Math.max(0, Number(facultyInteraction) || 8)),
        usefulness: Math.min(10, Math.max(0, Number(usefulness) || 8)),
        infrastructure: Math.min(10, Math.max(0, Number(infrastructure) || 8)),
        comments,
      },
      update: {
        courseContent: Math.min(10, Math.max(0, Number(courseContent) || 8)),
        facultyInteraction: Math.min(10, Math.max(0, Number(facultyInteraction) || 8)),
        usefulness: Math.min(10, Math.max(0, Number(usefulness) || 8)),
        infrastructure: Math.min(10, Math.max(0, Number(infrastructure) || 8)),
        comments,
      },
    });

    res.json({ message: 'Anonymous feedback recorded successfully', feedback });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Course Feedback Summary (Anonymized averages for Trainer and Admin)
router.get('/:id/feedback-summary', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const feedbacks = await prisma.feedback.findMany({
      where: { courseId },
      select: {
        courseContent: true,
        facultyInteraction: true,
        usefulness: true,
        infrastructure: true,
        comments: true,
        createdAt: true,
      },
    });

    const count = feedbacks.length;
    if (count === 0) {
      res.json({
        totalResponses: 0,
        averages: { courseContent: 0, facultyInteraction: 0, usefulness: 0, infrastructure: 0 },
        comments: [],
      });
      return;
    }

    const sum = feedbacks.reduce(
      (acc, f) => {
        acc.courseContent += f.courseContent;
        acc.facultyInteraction += f.facultyInteraction;
        acc.usefulness += f.usefulness;
        acc.infrastructure += f.infrastructure;
        return acc;
      },
      { courseContent: 0, facultyInteraction: 0, usefulness: 0, infrastructure: 0 }
    );

    res.json({
      totalResponses: count,
      averages: {
        courseContent: Number((sum.courseContent / count).toFixed(1)),
        facultyInteraction: Number((sum.facultyInteraction / count).toFixed(1)),
        usefulness: Number((sum.usefulness / count).toFixed(1)),
        infrastructure: Number((sum.infrastructure / count).toFixed(1)),
      },
      comments: feedbacks.filter((f) => f.comments).map((f) => f.comments),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

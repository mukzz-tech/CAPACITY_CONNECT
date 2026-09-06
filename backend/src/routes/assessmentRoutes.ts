import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { GradingService } from '../services/gradingService.js';
import { CertificateService } from '../services/certificateService.js';
import { UserRole } from '../types/index.js';

const router = Router();

// 1. Trainer: Create Assessment for a Lesson (Mixed question types)
router.post('/', authenticate, requireRole([UserRole.TRAINER, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { lessonId, title, description, passingPercent, isStrictProctored, questions } = req.body;

    if (!lessonId || !title || !questions || !Array.isArray(questions)) {
      res.status(400).json({ error: 'LessonId, title, and questions array are required.' });
      return;
    }

    const assessment = await prisma.assessment.create({
      data: {
        lessonId,
        title,
        description,
        passingPercent: passingPercent !== undefined ? Number(passingPercent) : 50.0,
        isStrictProctored: isStrictProctored !== undefined ? Boolean(isStrictProctored) : true,
        questions: {
          create: questions.map((q: any, idx: number) => ({
            sequence: idx + 1,
            questionType: q.questionType, // "MCQ" | "FILL_BLANK" | "MATCH_FOLLOWING" | "VOICE_ANSWER"
            prompt: q.prompt,
            marks: Number(q.marks) || 1.0,
            options: q.options ? JSON.stringify(q.options) : null,
            correctOption: q.correctOption ? String(q.correctOption).trim() : null,
            acceptedTexts: q.acceptedTexts ? JSON.stringify(q.acceptedTexts) : null,
            matchPairs: q.matchPairs ? JSON.stringify(q.matchPairs) : null,
            voiceKeyword: q.voiceKeyword ? String(q.voiceKeyword).trim() : null,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ message: 'Assessment created successfully', assessment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Trainee: Get Assessment Questions for Attempt (Correct answers excluded for security)
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const assessmentId = req.params.id;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        lesson: { include: { course: true } },
        questions: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    // Sanitize questions: strip correct answers, parse options and match pairs
    const sanitizedQuestions = assessment.questions.map((q) => {
      let options = null;
      if (q.options) {
        try { options = JSON.parse(q.options); } catch (e) {}
      }

      let matchPairs = null;
      if (q.matchPairs) {
        try {
          const rawPairs = JSON.parse(q.matchPairs);
          // Return shuffled left and right items without pairing info
          const leftItems = rawPairs.map((p: any) => p.left);
          const rightItems = rawPairs.map((p: any) => p.right).sort(() => Math.random() - 0.5);
          matchPairs = { leftItems, rightItems };
        } catch (e) {}
      }

      return {
        id: q.id,
        sequence: q.sequence,
        questionType: q.questionType,
        prompt: q.prompt,
        marks: q.marks,
        options,
        matchPairs,
        voiceKeywordPrompt: q.questionType === 'VOICE_ANSWER' ? 'Speak your answer clearly into the microphone' : null,
      };
    });

    res.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        isStrictProctored: assessment.isStrictProctored,
        passingPercent: assessment.passingPercent,
        courseTitle: assessment.lesson.course.title,
        lessonTitle: assessment.lesson.title,
        courseId: assessment.lesson.courseId,
        questions: sanitizedQuestions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Trainee: Submit Assessment Attempt & Run Deterministic Auto-Grading
router.post('/:id/attempt', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const assessmentId = req.params.id;
    const userId = req.user!.userId;
    const { submissions, integrityScore } = req.body; // array of { questionId, answer, isVoiceAnswer }

    if (!submissions || !Array.isArray(submissions)) {
      res.status(400).json({ error: 'Submissions array is required.' });
      return;
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        lesson: { include: { course: true } },
      },
    });

    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    // Auto-grade each question
    let totalAchieved = 0;
    let totalMax = 0;
    const gradedAnswers: any[] = [];

    for (const q of assessment.questions) {
      const sub = submissions.find((s: any) => s.questionId === q.id) || {
        questionId: q.id,
        answer: null,
        isVoiceAnswer: false,
      };

      let acceptedTexts: string[] = [];
      if (q.acceptedTexts) {
        try { acceptedTexts = JSON.parse(q.acceptedTexts); } catch (e) {}
      }

      let matchPairs: any[] = [];
      if (q.matchPairs) {
        try { matchPairs = JSON.parse(q.matchPairs); } catch (e) {}
      }

      const gradeResult = GradingService.gradeQuestion(
        {
          id: q.id,
          questionType: q.questionType,
          marks: q.marks,
          correctOption: q.correctOption,
          acceptedTexts,
          matchPairs,
          voiceKeyword: q.voiceKeyword,
        },
        sub
      );

      totalAchieved += gradeResult.marksAwarded;
      totalMax += gradeResult.maxMarks;

      gradedAnswers.push({
        questionId: q.id,
        givenAnswer: JSON.stringify(sub.answer),
        marksAwarded: gradeResult.marksAwarded,
        isVoiceAnswer: gradeResult.isVoiceAnswer,
      });
    }

    const percentage = totalMax > 0 ? Number(((totalAchieved / totalMax) * 100).toFixed(1)) : 0;
    const finalIntegrity = integrityScore !== undefined ? Number(integrityScore) : 100.0;

    // Create AssessmentAttempt record
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        userId,
        scoreAchieved: totalAchieved,
        maxScore: totalMax,
        percentage,
        integrityScore: finalIntegrity,
        answers: {
          create: gradedAnswers,
        },
      },
      include: { answers: true },
    });

    // Update LessonProgress
    const courseId = assessment.lesson.courseId;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (enrollment) {
      await prisma.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId: assessment.lessonId,
          },
        },
        create: {
          enrollmentId: enrollment.id,
          lessonId: assessment.lessonId,
          isCompleted: percentage >= assessment.passingPercent,
          scoreEarned: percentage,
          completedAt: new Date(),
        },
        update: {
          isCompleted: percentage >= assessment.passingPercent,
          scoreEarned: percentage,
          completedAt: new Date(),
        },
      });

      // Recalculate Trainee's Sole Course Score (Average of all lesson scores in course)
      const allLessons = await prisma.lesson.findMany({
        where: { courseId },
        include: { assessments: true },
      });

      const allProgress = await prisma.lessonProgress.findMany({
        where: { enrollmentId: enrollment.id },
      });

      const lessonScores = allProgress
        .map((p) => p.scoreEarned)
        .filter((s): s is number => s !== null);

      const courseResult = GradingService.calculateCourseFinalScore(lessonScores);
      const isAllLessonsCompleted =
        allLessons.length > 0 &&
        allLessons.every((l) =>
          allProgress.some((p) => p.lessonId === l.id && p.isCompleted)
        );

      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          finalScore: courseResult.finalScore,
          grade: courseResult.grade,
          completedAt: isAllLessonsCompleted ? new Date() : null,
          progressPercent: Number(
            ((allProgress.filter((p) => p.isCompleted).length / (allLessons.length || 1)) * 100).toFixed(0)
          ),
        },
      });

      // Issue Certificate if eligible (All lessons complete and overall average >= 50)
      let issuedCertificate = null;
      if (isAllLessonsCompleted && courseResult.isPassed) {
        issuedCertificate = await CertificateService.issueCertificateIfEligible(userId, courseId);
      }

      res.json({
        message: 'Assessment graded successfully',
        attempt: {
          id: attempt.id,
          scoreAchieved: totalAchieved,
          maxScore: totalMax,
          percentage,
          integrityScore: finalIntegrity,
          isPassed: percentage >= assessment.passingPercent,
          gradedAnswers,
        },
        courseProgress: {
          finalScore: courseResult.finalScore,
          grade: courseResult.grade,
          isCourseCompleted: isAllLessonsCompleted,
          certificate: issuedCertificate,
        },
      });
      return;
    }

    res.json({
      message: 'Assessment graded successfully',
      attempt: {
        id: attempt.id,
        scoreAchieved: totalAchieved,
        maxScore: totalMax,
        percentage,
        integrityScore: finalIntegrity,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

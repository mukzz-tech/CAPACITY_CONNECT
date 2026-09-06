import { prisma } from '../prisma.js';
import { CompetencyService } from './competencyService.js';

export class ChatbotService {
  /**
   * Process a question from a user with FAQ caching, context gathering, and grounded response
   */
  public static async answerQuestion(userId: string, question: string, sessionId?: string) {
    const cleanQuestion = question.trim().toLowerCase();

    // 1. FAQ Cache Check
    const cachedFaq = await prisma.faqCache.findFirst({
      where: {
        OR: [
          { question: { equals: cleanQuestion } },
          { question: { contains: cleanQuestion } },
        ],
      },
    });

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const session = await prisma.chatSession.create({
        data: {
          userId,
          title: question.substring(0, 40) + '...',
        },
      });
      activeSessionId = session.id;
    }

    // Save user question to chat history
    await prisma.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        sender: 'user',
        content: question,
        isCached: false,
      },
    });

    if (cachedFaq) {
      const botMsg = await prisma.chatMessage.create({
        data: {
          sessionId: activeSessionId,
          sender: 'assistant',
          content: cachedFaq.answer,
          isCached: true,
        },
      });
      return {
        sessionId: activeSessionId,
        answer: cachedFaq.answer,
        isCached: true,
        messageId: botMsg.id,
      };
    }

    // 2. Gather Context: Trainee progress, Competency gap, and Course Catalogue
    const gapData = await CompetencyService.calculateTraineeGap(userId);
    const publishedCourses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        code: true,
        title: true,
        description: true,
        durationWeeks: true,
        isLongDuration: true,
      },
    });

    // Match keywords against course catalogue or trainee situation
    let answer = '';
    if (
      cleanQuestion.includes('promotion') ||
      cleanQuestion.includes('next level') ||
      cleanQuestion.includes('career') ||
      cleanQuestion.includes('need')
    ) {
      if (gapData.skillGap.length === 0) {
        answer = `Great news! You currently meet all required competencies for your role as **${gapData.jobDesignation}**. To prepare for future promotions or specialized postings, consider taking advanced refresher courses in *Severe Weather Forecasting* or *Tropical Cyclones*.`;
      } else {
        const gapList = gapData.skillGap.map((g) => `• ${g.name} (${g.category})`).join('\n');
        const courseRecs = gapData.recommendedCourses
          .map((c) => `• **${c.title}** (${c.durationWeeks} weeks)`)
          .join('\n');

        answer = `Based on your designation as **${gapData.jobDesignation}**, you still have a skill gap in the following competencies:\n\n${gapList}\n\nTo fulfill these requirements, we recommend enrolling in:\n${courseRecs || '• Advanced Meteorological Training Course'}`;
      }
    } else if (cleanQuestion.includes('grade') || cleanQuestion.includes('passing') || cleanQuestion.includes('scale')) {
      answer = `IMD official training grades are determined solely by your lesson assessment average:\n• **Outstanding**: 90% and above\n• **Excellent**: 80.1% - 89.9%\n• **Very Good**: 70.0% - 80.0%\n• **Good**: 60.0% - 69.9%\n• **Passed**: 50.0% - 59.9%\n• Scores below 50.0% do not qualify for a certificate.`;
    } else if (cleanQuestion.includes('proctor') || cleanQuestion.includes('webcam') || cleanQuestion.includes('camera')) {
      answer = `Capacity Connect uses client-side face detection running directly in your browser (~1 FPS). No video or audio is ever recorded or uploaded to the server. In assessments (Strict Mode), looking away or multiple faces deducts points from your 100-point integrity score. During lectures (Lenient Mode), sustained inattention simply pauses playback with a gentle reminder.`;
    } else {
      // Find matching courses by title/keywords
      const matchedCourse = publishedCourses.find(
        (c) =>
          cleanQuestion.includes(c.title.toLowerCase()) ||
          cleanQuestion.includes(c.code.toLowerCase())
      );

      if (matchedCourse) {
        answer = `**${matchedCourse.title}** (${matchedCourse.code}):\n${matchedCourse.description}\n• Duration: ${matchedCourse.durationWeeks} weeks\n• Category: ${matchedCourse.isLongDuration ? 'Long-Duration Institutional Course' : 'Short Refresher Course'}.`;
      } else {
        answer = `I am your IMD Capacity Connect Assistant. I can answer questions about institutional courses (e.g. Meteorologist Gr-II, Forecasters Training Course), your personal competency gaps, assessment grading criteria, or certificate verification. How can I assist you with your meteorological training today?`;
      }
    }

    const botMsg = await prisma.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        sender: 'assistant',
        content: answer,
        isCached: false,
      },
    });

    return {
      sessionId: activeSessionId,
      answer,
      isCached: false,
      messageId: botMsg.id,
    };
  }
}

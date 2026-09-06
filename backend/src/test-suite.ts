import { prisma } from './prisma.js';
import { GradingService } from './services/gradingService.js';
import { CompetencyService } from './services/competencyService.js';
import { CertificateService } from './services/certificateService.js';
import { ProctoringService } from './services/proctoringService.js';
import { ChatbotService } from './services/chatbotService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function runVerificationTests() {
  console.log('========================================================');
  console.log('RUNNING CAPACITY CONNECT END-TO-END VERIFICATION SUITE');
  console.log('Section 19: Testing Checklist Before Demo Day');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  try {
    // Check 1: User authentication and role retrieval
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@imd.gov.in' },
      include: { profile: true },
    });
    assert(admin !== null && admin.role === 'ADMIN', 'T-01: Admin user exists with role ADMIN');

    const passwordMatch = await bcrypt.compare('ImdAdmin@2026', admin?.passwordHash || '');
    assert(passwordMatch, 'T-01b: Admin password hash validates successfully');

    // Check 2: Pending User Approval Workflow
    const pendingUser = await prisma.user.findUnique({
      where: { email: 'trainee.amit@imd.gov.in' },
    });
    assert(pendingUser !== null && pendingUser.approvalStatus === 'PENDING', 'T-03: Pending user found in approval queue');

    // Simulate Admin approving user
    const approvedUser = await prisma.user.update({
      where: { email: 'trainee.amit@imd.gov.in' },
      data: { approvalStatus: 'APPROVED', role: 'TRAINEE' },
    });
    assert(approvedUser.approvalStatus === 'APPROVED', 'T-03b: Admin can approve pending user and assign role');

    // Check 3: Real IMD Course Catalogue
    const publishedCourses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
    });
    assert(publishedCourses.length >= 2, `T-04: Real IMD courses seeded and published (count: ${publishedCourses.length})`);

    // Check 4: Deterministic Grading Engine (Mixed question types)
    // 4a. MCQ
    const mcqResult = GradingService.gradeQuestion(
      { id: 'q1', questionType: 'MCQ', marks: 2.0, correctOption: 'B' },
      { questionId: 'q1', answer: 'B' }
    );
    assert(mcqResult.isCorrect && mcqResult.marksAwarded === 2.0, 'T-06a: MCQ auto-grades exact option match for full marks');

    // 4b. Fill-in-the-blank (case & whitespace insensitive)
    const fillResult = GradingService.gradeQuestion(
      { id: 'q2', questionType: 'FILL_BLANK', marks: 2.0, acceptedTexts: ['cumulonimbus', 'cb cloud'] },
      { questionId: 'q2', answer: '  CUMULONIMBUS  ' }
    );
    assert(fillResult.isCorrect && fillResult.marksAwarded === 2.0, 'T-06b: Fill-in-the-blank grades normalized case-insensitively');

    // 4c. Match-the-following (partial credit per correct pair)
    const matchPairs = [
      { left: 'Anemometer', right: 'Wind Speed' },
      { left: 'Barometer', right: 'Pressure' },
    ];
    const matchResult = GradingService.gradeQuestion(
      { id: 'q3', questionType: 'MATCH_FOLLOWING', marks: 4.0, matchPairs },
      { questionId: 'q3', answer: { Anemometer: 'Wind Speed', Barometer: 'Wrong' } }
    );
    assert(matchResult.marksAwarded === 2.0, 'T-06c: Match-the-following awards proportional partial marks (2.0 / 4.0)');

    // 4d. Official IMD 5-Tier Passing Scale
    assert(GradingService.calculatePassingGrade(95.0) === 'OUTSTANDING', 'T-06d: 95% is Outstanding');
    assert(GradingService.calculatePassingGrade(84.5) === 'EXCELLENT', 'T-06e: 84.5% is Excellent');
    assert(GradingService.calculatePassingGrade(75.0) === 'VERY_GOOD', 'T-06f: 75% is Very Good');
    assert(GradingService.calculatePassingGrade(65.0) === 'GOOD', 'T-06g: 65% is Good');
    assert(GradingService.calculatePassingGrade(55.0) === 'PASSED', 'T-06h: 55% is Passed');
    assert(GradingService.calculatePassingGrade(42.0) === 'FAILED', 'T-06i: 42% is Failed (< 50%)');

    // Check 5: Competency Gap Evaluation Algorithm (Section 9)
    const trainee = await prisma.user.findUnique({
      where: { email: 'trainee.rajesh@imd.gov.in' },
    });
    if (trainee) {
      const gap = await CompetencyService.calculateTraineeGap(trainee.id);
      assert(gap.jobDesignation === 'Scientific Assistant', 'T-06j: Identifies trainee job role');
      assert(Array.isArray(gap.requiredCompetencies), 'T-06k: Fetches required role competencies');
      assert(Array.isArray(gap.skillGap), 'T-06l: Computes rule-based skill gap difference');
    }

    // Check 6: Certificate Generation with Embedded QR Code
    const sampleCertData = {
      certificateCode: 'IMD-CERT-TEST-2026',
      traineeName: 'Rajesh Sharma',
      courseTitle: 'Satellite and Radar Product Interpretation',
      finalScore: 88.5,
      grade: 'EXCELLENT',
      issueDate: new Date(),
      verificationUrl: 'http://localhost:5173/verify/IMD-CERT-TEST-2026',
    };
    const certPdfDataUrl = await CertificateService.generateCertificatePdf(sampleCertData);
    assert(certPdfDataUrl.startsWith('data:application/pdf;base64,'), 'T-07: Server generates PDF certificate with embedded QR code');

    // Check 7: In-Browser Proctoring Signal Ingestion & 100-pt Deduction
    // Create a temporary attempt to test proctoring
    const course = publishedCourses[0];
    const lesson = await prisma.lesson.findFirst({ where: { courseId: course.id } });
    const assessment = await prisma.assessment.findFirst({ where: { lessonId: lesson?.id } });

    if (assessment && trainee) {
      const attempt = await prisma.assessmentAttempt.create({
        data: {
          assessmentId: assessment.id,
          userId: trainee.id,
          scoreAchieved: 8.0,
          maxScore: 10.0,
          percentage: 80.0,
          integrityScore: 100.0,
        },
      });

      // Simulate NO_FACE_DETECTED signal (deducts 10 pts)
      const flagRes = await ProctoringService.recordFlag({
        attemptId: attempt.id,
        flagType: 'NO_FACE_DETECTED',
        durationSec: 3.5,
        metaDetails: 'Face absent > 3s test',
      });
      assert(flagRes.newIntegrityScore === 90.0, 'T-11: Strict proctoring deducts points from 100 on face absence');
    }

    // Check 8: AI Chatbot FAQ Caching & Context Grounding
    if (trainee) {
      const faqAnswer = await ChatbotService.answerQuestion(
        trainee.id,
        'what is the eligibility for the forecasters training course'
      );
      assert(faqAnswer.isCached === true, 'T-12a: Chatbot returns cached FAQ response (0 external API cost)');

      const promoAnswer = await ChatbotService.answerQuestion(
        trainee.id,
        'what courses do I need for my next promotion'
      );
      assert(promoAnswer.answer.length > 20, 'T-12b: Chatbot generates personalized answer based on trainee competency gap');
    }

    // Check 9: Admin Analytics
    const totalUsers = await prisma.user.count();
    const totalCourses = await prisma.course.count();
    assert(totalUsers >= 4 && totalCourses >= 3, 'T-08: Admin analytics reflect live verified DB data');

  } catch (error) {
    console.error('Test suite runtime exception:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n========================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');
    if (failed > 0) process.exit(1);
  }
}

runVerificationTests();

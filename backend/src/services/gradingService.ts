import { PassingGrade, QuestionType } from '../types/index.js';

export interface QuestionGradingInput {
  id: string;
  questionType: string;
  marks: number;
  correctOption?: string | null;
  acceptedTexts?: string[] | null;
  matchPairs?: Array<{ left: string; right: string }> | null;
  voiceKeyword?: string | null;
}

export interface AnswerSubmission {
  questionId: string;
  answer: any; // string for MCQ/fill/voice, or object { [left]: right } for match
  isVoiceAnswer?: boolean;
}

export interface GradedAnswerResult {
  questionId: string;
  marksAwarded: number;
  maxMarks: number;
  isCorrect: boolean;
  isVoiceAnswer: boolean;
  feedback?: string;
}

export class GradingService {
  /**
   * Determine official IMD 5-Tier Passing Grade from percentage
   */
  public static calculatePassingGrade(percentage: number): PassingGrade {
    if (percentage >= 90.0) {
      return PassingGrade.OUTSTANDING;
    } else if (percentage >= 80.1) {
      return PassingGrade.EXCELLENT;
    } else if (percentage >= 70.0) {
      return PassingGrade.VERY_GOOD;
    } else if (percentage >= 60.0) {
      return PassingGrade.GOOD;
    } else if (percentage >= 50.0) {
      return PassingGrade.PASSED;
    } else {
      return PassingGrade.FAILED;
    }
  }

  /**
   * Grade a single question submission deterministically
   */
  public static gradeQuestion(
    question: QuestionGradingInput,
    submission: AnswerSubmission
  ): GradedAnswerResult {
    const isVoiceAnswer = Boolean(submission.isVoiceAnswer);
    const maxMarks = question.marks || 1.0;

    switch (question.questionType) {
      case QuestionType.MCQ: {
        const given = String(submission.answer || '').trim().toUpperCase();
        const expected = String(question.correctOption || '').trim().toUpperCase();
        const isCorrect = given === expected;
        return {
          questionId: question.id,
          marksAwarded: isCorrect ? maxMarks : 0,
          maxMarks,
          isCorrect,
          isVoiceAnswer,
        };
      }

      case QuestionType.FILL_BLANK: {
        const rawGiven = String(submission.answer || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();

        const acceptedList = (question.acceptedTexts || []).map((t) =>
          t.toLowerCase().replace(/\s+/g, ' ').trim()
        );

        const isCorrect = acceptedList.some(
          (variant) => variant === rawGiven || rawGiven.includes(variant)
        );

        return {
          questionId: question.id,
          marksAwarded: isCorrect ? maxMarks : 0,
          maxMarks,
          isCorrect,
          isVoiceAnswer,
        };
      }

      case QuestionType.MATCH_FOLLOWING: {
        // Pairs grading: partial marks awarded per correct individual pair
        const expectedPairs = question.matchPairs || [];
        if (expectedPairs.length === 0) {
          return {
            questionId: question.id,
            marksAwarded: maxMarks,
            maxMarks,
            isCorrect: true,
            isVoiceAnswer,
          };
        }

        const userPairs: Record<string, string> =
          typeof submission.answer === 'object' && submission.answer !== null
            ? submission.answer
            : {};

        let correctCount = 0;
        for (const pair of expectedPairs) {
          const userRight = userPairs[pair.left];
          if (
            userRight &&
            String(userRight).trim().toLowerCase() === String(pair.right).trim().toLowerCase()
          ) {
            correctCount++;
          }
        }

        const fraction = correctCount / expectedPairs.length;
        const marksAwarded = Number((maxMarks * fraction).toFixed(2));
        const isCorrect = correctCount === expectedPairs.length;

        return {
          questionId: question.id,
          marksAwarded,
          maxMarks,
          isCorrect,
          isVoiceAnswer,
          feedback: `${correctCount}/${expectedPairs.length} pairs matched correctly`,
        };
      }

      case QuestionType.VOICE_ANSWER: {
        // Voice-command answer: spoken phrase transcribed and checked against voiceKeyword or accepted variants
        const rawGiven = String(submission.answer || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();

        const accepted = (question.acceptedTexts || []).concat(
          question.voiceKeyword ? [question.voiceKeyword] : []
        ).map((v) => v.toLowerCase().replace(/\s+/g, ' ').trim());

        const isCorrect = accepted.some(
          (phrase) => rawGiven === phrase || rawGiven.includes(phrase)
        );

        return {
          questionId: question.id,
          marksAwarded: isCorrect ? maxMarks : 0,
          maxMarks,
          isCorrect,
          isVoiceAnswer: true,
        };
      }

      default: {
        return {
          questionId: question.id,
          marksAwarded: 0,
          maxMarks,
          isCorrect: false,
          isVoiceAnswer,
        };
      }
    }
  }

  /**
   * Aggregate lesson scores to compute final course score
   */
  public static calculateCourseFinalScore(lessonScores: number[]): {
    finalScore: number;
    grade: PassingGrade;
    isPassed: boolean;
  } {
    if (lessonScores.length === 0) {
      return { finalScore: 0, grade: PassingGrade.FAILED, isPassed: false };
    }

    const sum = lessonScores.reduce((acc, curr) => acc + curr, 0);
    const average = Number((sum / lessonScores.length).toFixed(2));
    const grade = this.calculatePassingGrade(average);
    const isPassed = average >= 50.0;

    return {
      finalScore: average,
      grade,
      isPassed,
    };
  }
}

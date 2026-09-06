import { prisma } from '../prisma.js';
import { FlagType } from '../types/index.js';

export interface ProctorSignal {
  attemptId: string;
  flagType: string;
  durationSec?: number;
  metaDetails?: string;
}

export class ProctoringService {
  /**
   * Records a client-side detected proctoring violation and recalculates integrity score
   */
  public static async recordFlag(signal: ProctorSignal) {
    let deduction = 5.0;
    if (signal.flagType === FlagType.NO_FACE_DETECTED) {
      deduction = 10.0;
    } else if (signal.flagType === FlagType.MULTIPLE_FACES_DETECTED) {
      deduction = 15.0;
    } else if (signal.flagType === FlagType.FACE_TURNED_AWAY) {
      deduction = 5.0;
    }

    const flag = await prisma.proctoringFlag.create({
      data: {
        attemptId: signal.attemptId,
        flagType: signal.flagType,
        durationSec: signal.durationSec || 1.0,
        deduction,
        metaDetails: signal.metaDetails || null,
      },
    });

    // Recalculate attempt integrity score starting from 100
    const allFlags = await prisma.proctoringFlag.findMany({
      where: { attemptId: signal.attemptId },
    });

    const totalDeduction = allFlags.reduce((sum, f) => sum + f.deduction, 0);
    const newIntegrityScore = Math.max(0, 100.0 - totalDeduction);

    await prisma.assessmentAttempt.update({
      where: { id: signal.attemptId },
      data: { integrityScore: newIntegrityScore },
    });

    return { flag, newIntegrityScore };
  }

  /**
   * Retrieve flagged attempts timeline for trainer and admin review queues
   */
  public static async getFlaggedAttempts() {
    return prisma.assessmentAttempt.findMany({
      where: {
        integrityScore: { lt: 100.0 },
      },
      include: {
        user: { include: { profile: true } },
        assessment: {
          include: {
            lesson: { include: { course: true } },
          },
        },
        proctorFlags: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}

import { prisma } from '../prisma.js';

export interface CompetencyGapResult {
  jobDesignation: string;
  requiredCompetencies: Array<{ id: string; code: string; name: string; category: string }>;
  earnedCompetencies: Array<{ id: string; code: string; name: string; category: string }>;
  skillGap: Array<{ id: string; code: string; name: string; category: string }>;
  gapPercentage: number;
  recommendedCourses: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    durationWeeks: number;
    matchingCompetencies: string[];
  }>;
}

export class CompetencyService {
  /**
   * Calculate competency gap and targeted recommendations for a trainee
   */
  public static async calculateTraineeGap(userId: string): Promise<CompetencyGapResult> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    const jobDesignation = profile?.jobDesignation || 'General Staff';

    // 1. Fetch required competencies for job designation
    const roleReqs = await prisma.roleCompetency.findMany({
      where: { jobDesignation },
      include: { competency: true },
    });

    const requiredCompetencies = roleReqs.map((r) => ({
      id: r.competency.id,
      code: r.competency.code,
      name: r.competency.name,
      category: r.competency.category,
    }));

    // 2. Fetch earned competencies from completed courses (passed with score >= 50)
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        completedAt: { not: null },
        finalScore: { gte: 50.0 },
      },
      include: {
        course: {
          include: {
            competencies: {
              include: { competency: true },
            },
          },
        },
      },
    });

    const earnedCompetenciesMap = new Map<string, { id: string; code: string; name: string; category: string }>();
    for (const enrollment of completedEnrollments) {
      for (const cc of enrollment.course.competencies) {
        earnedCompetenciesMap.set(cc.competency.id, {
          id: cc.competency.id,
          code: cc.competency.code,
          name: cc.competency.name,
          category: cc.competency.category,
        });
      }
    }
    const earnedCompetencies = Array.from(earnedCompetenciesMap.values());

    // 3. Compute Difference: Required minus Earned = Skill Gap
    const earnedIds = new Set(earnedCompetencies.map((e) => e.id));
    const skillGap = requiredCompetencies.filter((req) => !earnedIds.has(req.id));

    const gapPercentage =
      requiredCompetencies.length > 0
        ? Number(((skillGap.length / requiredCompetencies.length) * 100).toFixed(1))
        : 0;

    // 4. Recommend published courses that teach missing competencies
    const gapCompetencyIds = skillGap.map((g) => g.id);
    let recommendedCourses: any[] = [];

    if (gapCompetencyIds.length > 0) {
      const publishedCourses = await prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          competencies: {
            some: {
              competencyId: { in: gapCompetencyIds },
            },
          },
        },
        include: {
          competencies: {
            include: { competency: true },
          },
        },
      });

      recommendedCourses = publishedCourses.map((c) => {
        const matching = c.competencies
          .filter((cc) => gapCompetencyIds.includes(cc.competencyId))
          .map((cc) => cc.competency.name);

        return {
          id: c.id,
          code: c.code,
          title: c.title,
          description: c.description,
          durationWeeks: c.durationWeeks,
          matchingCompetencies: matching,
        };
      });
    }

    return {
      jobDesignation,
      requiredCompetencies,
      earnedCompetencies,
      skillGap,
      gapPercentage,
      recommendedCourses,
    };
  }
}

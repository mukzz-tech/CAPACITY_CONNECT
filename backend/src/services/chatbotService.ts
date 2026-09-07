import { prisma } from '../prisma.js';
import { CompetencyService } from './competencyService.js';

interface RetrievedStudyContent {
  courseTitle: string;
  courseCode: string;
  lessonTitle: string;
  excerpt: string;
}

export class ChatbotService {
  /**
   * Search IMD lesson notes and course syllabi in database for relevant study content
   */
  private static async retrieveStudyContext(query: string): Promise<{
    contextText: string;
    matchedLessons: RetrievedStudyContent[];
  }> {
    try {
      const clean = query.toLowerCase();
      const words = clean
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);

      // Fetch all courses with lessons and modules from the database
      const courses = await prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          lessons: {
            orderBy: { sequence: 'asc' },
            include: {
              modules: {
                orderBy: { sequence: 'asc' },
              },
            },
          },
        },
      });

      const matched: {
        courseTitle: string;
        courseCode: string;
        lessonTitle: string;
        excerpt: string;
        score: number;
      }[] = [];

      for (const c of courses) {
        for (const l of c.lessons) {
          const lessonTitleLower = l.title.toLowerCase();
          const lessonDescLower = (l.description || '').toLowerCase();

          // Aggregate text across modules
          const moduleTexts = l.modules
            .map((m) => `${m.title}: ${m.formattedText || ''}`)
            .join('\n');
          const notesLower = moduleTexts.toLowerCase();

          let score = 0;
          for (const w of words) {
            if (lessonTitleLower.includes(w)) score += 6;
            if (lessonDescLower.includes(w)) score += 3;
            if (notesLower.includes(w)) score += 2;
          }

          if (score > 0) {
            let excerpt = moduleTexts || l.description || '';
            const firstWord = words.find((w) => notesLower.includes(w));
            if (firstWord) {
              const idx = notesLower.indexOf(firstWord);
              const start = Math.max(0, idx - 80);
              const end = Math.min(excerpt.length, idx + 320);
              excerpt = (start > 0 ? '...' : '') + excerpt.substring(start, end) + (end < excerpt.length ? '...' : '');
            } else if (excerpt.length > 320) {
              excerpt = excerpt.substring(0, 320) + '...';
            }

            matched.push({
              courseTitle: c.title,
              courseCode: c.code,
              lessonTitle: l.title,
              excerpt,
              score,
            });
          }
        }
      }

      // Sort by relevance score
      matched.sort((a, b) => b.score - a.score);
      const topMatched = matched.slice(0, 3);

      const contextText = topMatched
        .map(
          (m) =>
            `[Course: ${m.courseTitle} (${m.courseCode}) | Lesson: ${m.lessonTitle}]\n${m.excerpt}`
        )
        .join('\n\n');

      return {
        contextText,
        matchedLessons: topMatched,
      };
    } catch (err) {
      console.warn('Study context retrieval error:', err);
      return { contextText: '', matchedLessons: [] };
    }
  }

  /**
   * Call external AI LLM API (Google Gemini, Groq, or OpenAI)
   */
  private static async queryExternalLlm(
    prompt: string,
    studyContext: string,
    userContext: string
  ): Promise<string | null> {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const systemPrompt = `You are the Official AI Meteorological Training Assistant for the India Meteorological Department (IMD), Ministry of Earth Sciences, Government of India.
You assist meteorologists, scientific assistants, forecasters, and trainees.
Answer clearly, authoritatively, and concisely with proper meteorological principles, mathematical formulas (if applicable), and operational guidelines.
When referencing concepts from the study context below, highlight them naturally.

Study Notes Context from IMD Training Database:
${studyContext || 'None available'}

User Context:
${userContext || 'Trainee'}`;

    // 1. Try Google Gemini API
    if (geminiKey && geminiKey.trim()) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
            },
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (e: any) {
        console.warn('Gemini API call skipped or timed out:', e.message);
      }
    }

    // 2. Try Groq API (High-speed LLaMA-3.1)
    if (groqKey && groqKey.trim()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey.trim()}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (e: any) {
        console.warn('Groq API call skipped:', e.message);
      }
    }

    // 3. Try OpenAI API
    if (openaiKey && openaiKey.trim()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey.trim()}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (e: any) {
        console.warn('OpenAI API call skipped:', e.message);
      }
    }

    return null;
  }

  /**
   * Process a question from a user with FAQ caching, dynamic Study Notes RAG, and AI API response
   */
  public static async answerQuestion(userId?: string, question = '', sessionId?: string) {
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
    if (!activeSessionId && userId) {
      try {
        const session = await prisma.chatSession.create({
          data: {
            userId,
            title: question.substring(0, 40) + '...',
          },
        });
        activeSessionId = session.id;
      } catch {}
    }

    // Save user question to chat history if session exists
    if (activeSessionId) {
      try {
        await prisma.chatMessage.create({
          data: {
            sessionId: activeSessionId,
            sender: 'user',
            content: question,
            isCached: false,
          },
        });
      } catch {}
    }

    if (cachedFaq) {
      if (activeSessionId) {
        try {
          await prisma.chatMessage.create({
            data: {
              sessionId: activeSessionId,
              sender: 'assistant',
              content: cachedFaq.answer,
              isCached: true,
            },
          });
        } catch {}
      }
      return {
        sessionId: activeSessionId,
        answer: cachedFaq.answer,
        isCached: true,
        source: 'IMD FAQ Knowledge Cache',
      };
    }

    // 2. Gather Trainee Progress / Competency Gap Context
    let userContext = 'Trainee';
    let gapData: any = null;
    if (userId) {
      try {
        gapData = await CompetencyService.calculateTraineeGap(userId);
        userContext = `Trainee Designation: ${gapData.jobDesignation}, Current Skill Gaps: ${gapData.skillGap.map((g: any) => g.name).join(', ') || 'None'}`;
      } catch {}
    }

    // 3. Search Database for relevant IMD Study Content (RAG)
    const { contextText, matchedLessons } = await this.retrieveStudyContext(question);

    // 4. Check if external AI LLM API generates an answer
    const llmAnswer = await this.queryExternalLlm(question, contextText, userContext);
    if (llmAnswer) {
      let finalAnswer = llmAnswer;

      // Append recommended lesson link if available
      if (matchedLessons.length > 0 && !finalAnswer.includes(matchedLessons[0].courseCode)) {
        finalAnswer += `\n\n📖 **Related Study Material**: *${matchedLessons[0].lessonTitle}* (${matchedLessons[0].courseTitle} - \`${matchedLessons[0].courseCode}\`)`;
      }

      if (activeSessionId) {
        try {
          await prisma.chatMessage.create({
            data: {
              sessionId: activeSessionId,
              sender: 'assistant',
              content: finalAnswer,
              isCached: false,
            },
          });
        } catch {}
      }

      return {
        sessionId: activeSessionId,
        answer: finalAnswer,
        isCached: false,
        source: 'IMD AI Assistant (LLM + Study Content RAG)',
      };
    }

    // 5. Intelligent Fallback Meteorological Knowledge & Study Engine
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

    let answer = '';

    if (
      cleanQuestion.includes('promotion') ||
      cleanQuestion.includes('next level') ||
      cleanQuestion.includes('career') ||
      cleanQuestion.includes('eligibility')
    ) {
      if (gapData && gapData.skillGap.length === 0) {
        answer = `Great news! You currently meet all required competencies for your role as **${gapData.jobDesignation}**. To prepare for future promotions or specialized postings, consider taking advanced refresher courses in *Severe Weather Forecasting* or *Tropical Cyclones*.`;
      } else if (gapData) {
        const gapList = gapData.skillGap.map((g: any) => `• ${g.name} (${g.category})`).join('\n');
        const courseRecs = gapData.recommendedCourses
          .map((c: any) => `• **${c.title}** (${c.durationWeeks} weeks)`)
          .join('\n');

        answer = `Based on your designation as **${gapData.jobDesignation}**, you still have a skill gap in the following competencies:\n\n${gapList}\n\nTo fulfill these requirements, we recommend enrolling in:\n${courseRecs || '• Advanced Meteorological Training Course'}`;
      } else {
        answer = `Promotion eligibility in IMD follows Ministry of Earth Sciences guidelines:\n• **Scientific Assistants** are eligible for Forecasters Training Course (FTC) or ATICIS.\n• **Meteorologist Gr-II** complete the 12-month institutional course (General Meteorology, Agri-Met, Radar & Satellites).\n• View your personal profile for automated competency gap tracking.`;
      }
    } else if (cleanQuestion.includes('grade') || cleanQuestion.includes('passing') || cleanQuestion.includes('scale')) {
      answer = `IMD official training grades are determined solely by your lesson assessment average:\n• **Outstanding**: 90% and above\n• **Excellent**: 80.1% - 89.9%\n• **Very Good**: 70.0% - 80.0%\n• **Good**: 60.0% - 69.9%\n• **Passed**: 50.0% - 59.9%\n• Scores below 50.0% do not qualify for a certificate.`;
    } else if (cleanQuestion.includes('proctor') || cleanQuestion.includes('webcam') || cleanQuestion.includes('camera')) {
      answer = `Capacity Connect uses client-side face detection running directly in your browser (~1 FPS). No video or audio is ever recorded or uploaded to the server. In assessments (Strict Mode), looking away or multiple faces deducts points from your 100-point integrity score. During lectures (Lenient Mode), sustained inattention simply pauses playback with a gentle reminder.`;
    } else if (cleanQuestion.includes('doppler') || cleanQuestion.includes('radar')) {
      answer = `**Doppler Weather Radar (DWR) in IMD**:\nIMD operates S-band and C-band Doppler Radars for cyclone tracking and severe weather nowcasting.\n\n• **Key Equation (Doppler Dilemma)**:\n  $$R_{max} \\cdot V_{max} = \\frac{c \\cdot \\lambda}{8}$$\n• **Reflectivity Thresholds**:\n  - > 45 dBZ: Heavy convective rain & thunderstorms\n  - > 55 dBZ: High probability of severe hail\n• **Radial Velocity**: Measures precipitation wind speed towards (negative/blue) and away from (positive/red) the radar.`;
    } else if (cleanQuestion.includes('cyclone') || cleanQuestion.includes('warning stage')) {
      answer = `**IMD 4-Stage Cyclone Warning System**:\n1. **Pre-Cyclone Watch** (72 hours prior): Issued via RSMC New Delhi on low-pressure intensification.\n2. **Cyclone Alert - Yellow** (48 hours prior): Issued for coastal districts regarding expected track and intensity.\n3. **Cyclone Warning - Orange** (24 hours prior): Specifies land-fall point, gale wind speed, and tidal storm surge.\n4. **Post-Landfall Outlook - Red** (12 hours prior): Operational advisory for inland districts experiencing severe gales and inundation.`;
    } else if (cleanQuestion.includes('adiabatic') || cleanQuestion.includes('lapse rate') || cleanQuestion.includes('thermodynamics')) {
      answer = `**Atmospheric Thermodynamics & Lapse Rates**:\n• **Dry Adiabatic Lapse Rate (DALR)**: $\\Gamma_d = 9.8\\,^{\\circ}\\text{C/km}$ ($\approx 10\\,^{\\circ}\\text{C/km}$)\n• **Saturated Adiabatic Lapse Rate (SALR)**: $\\Gamma_s \\approx 4 - 7\\,^{\\circ}\\text{C/km}$ (due to latent heat of condensation release)\n• **Hydrostatic Equation**: $\\frac{\\partial p}{\\partial z} = -\\rho g$\n• **Stability Criteria**:\n  - Stable: $\\Gamma < \\Gamma_s$\n  - Conditionally Unstable: $\\Gamma_s < \\Gamma < \\Gamma_d$\n  - Absolutely Unstable: $\\Gamma > \\Gamma_d$`;
    } else if (cleanQuestion.includes('aws') || cleanQuestion.includes('observation') || cleanQuestion.includes('wmo')) {
      answer = `**Surface Meteorological Observations (WMO-No. 8 Standards)**:\n• **Temperature & Humidity**: Measured inside Stevenson Screen at 1.25 m – 2.0 m above ground level.\n• **Wind Speed & Direction**: Anemometer installed at standard 10 m height in open terrain.\n• **Atmospheric Pressure**: Barometer station level pressure corrected to Mean Sea Level (MSLP).\n• **Precipitation**: Standard 200 cm² Symons rain gauge or automated tipping-bucket gauge (0.5 mm resolution).`;
    } else if (matchedLessons.length > 0) {
      const top = matchedLessons[0];
      answer = `Based on the official study material for **${top.courseTitle}** (\`${top.courseCode}\`):\n\n**${top.lessonTitle}**:\n${top.excerpt}\n\n📖 You can review full study notes and interactive lecture modules in the **Courses** section.`;
    } else {
      const matchedCourse = publishedCourses.find(
        (c) =>
          cleanQuestion.includes(c.title.toLowerCase()) ||
          cleanQuestion.includes(c.code.toLowerCase())
      );

      if (matchedCourse) {
        answer = `**${matchedCourse.title}** (${matchedCourse.code}):\n${matchedCourse.description}\n• Duration: ${matchedCourse.durationWeeks} weeks\n• Category: ${matchedCourse.isLongDuration ? 'Long-Duration Institutional Course' : 'Short Refresher Course'}.`;
      } else {
        answer = `I am your IMD Capacity Connect Assistant. I can answer questions about meteorological study notes (Doppler radar, thermodynamics, cyclones, AWS observations), institutional course syllabi, promotion requirements, or assessment scoring. What would you like to explore?`;
      }
    }

    if (activeSessionId) {
      try {
        await prisma.chatMessage.create({
          data: {
            sessionId: activeSessionId,
            sender: 'assistant',
            content: answer,
            isCached: false,
          },
        });
      } catch {}
    }

    return {
      sessionId: activeSessionId,
      answer,
      isCached: false,
      source: 'IMD Study Content Knowledge Engine',
    };
  }
}


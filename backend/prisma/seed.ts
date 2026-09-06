import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Capacity Connect Database ---');

  // Clear existing records
  await prisma.auditLog.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.faqCache.deleteMany({});
  await prisma.proctoringFlag.deleteMany({});
  await prisma.attemptAnswer.deleteMany({});
  await prisma.assessmentAttempt.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.lessonProgress.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.courseCompetency.deleteMany({});
  await prisma.coursePrerequisite.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.trainerCompetency.deleteMany({});
  await prisma.roleCompetency.deleteMany({});
  await prisma.competency.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('ImdAdmin@2026', 10);
  const userPasswordHash = await bcrypt.hash('Password@123', 10);

  // 1. Create Core Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@imd.gov.in',
      passwordHash,
      role: 'ADMIN',
      requestedRole: 'ADMIN',
      approvalStatus: 'APPROVED',
      profile: {
        create: {
          fullName: 'Dr. Mrutyunjay Mohapatra',
          jobDesignation: 'Director General of Meteorology',
          department: 'IMD Headquarters, Mausam Bhavan, New Delhi',
          yearsExperience: 30,
          qualifications: JSON.stringify(['Ph.D Meteorology', 'D.Sc.']),
          skills: JSON.stringify(['Tropical Meteorology', 'Disaster Management', 'Strategic Administration']),
        },
      },
    },
  });

  const trainer1 = await prisma.user.create({
    data: {
      email: 'trainer.jenamani@imd.gov.in',
      passwordHash: userPasswordHash,
      role: 'TRAINER',
      requestedRole: 'TRAINER',
      approvalStatus: 'APPROVED',
      profile: {
        create: {
          fullName: 'Dr. R. K. Jenamani',
          jobDesignation: 'Senior Meteorologist & Head, NWFC',
          department: 'National Weather Forecasting Centre, New Delhi',
          yearsExperience: 22,
          qualifications: JSON.stringify(['Ph.D Atmospheric Sciences']),
          skills: JSON.stringify(['Radar Interpretation', 'Severe Storm Forecasting', 'Nowcasting']),
        },
      },
    },
  });

  const trainer2 = await prisma.user.create({
    data: {
      email: 'trainer.sunitha@imd.gov.in',
      passwordHash: userPasswordHash,
      role: 'TRAINER',
      requestedRole: 'TRAINER',
      approvalStatus: 'APPROVED',
      profile: {
        create: {
          fullName: 'Dr. Sunitha Devi',
          jobDesignation: 'Director & Monsoon Specialist',
          department: 'Climate Application & Monsoon Division, Pune',
          yearsExperience: 18,
          qualifications: JSON.stringify(['M.Sc Meteorology', 'Ph.D']),
          skills: JSON.stringify(['Monsoon Dynamics', 'Tropical Cyclones', 'Climate Modelling']),
        },
      },
    },
  });

  const trainee1 = await prisma.user.create({
    data: {
      email: 'trainee.rajesh@imd.gov.in',
      passwordHash: userPasswordHash,
      role: 'TRAINEE',
      requestedRole: 'TRAINEE',
      approvalStatus: 'APPROVED',
      profile: {
        create: {
          fullName: 'Rajesh Sharma',
          jobDesignation: 'Scientific Assistant',
          department: 'Regional Meteorological Centre, Chennai',
          yearsExperience: 3.5,
          qualifications: JSON.stringify(['B.Sc Physics', 'Diploma in Electronics']),
          skills: JSON.stringify(['Surface Observations', 'AWS Maintenance']),
          languagePref: 'hi',
          voiceOptIn: true,
          proctoringOptIn: true,
        },
      },
    },
  });

  const trainee2 = await prisma.user.create({
    data: {
      email: 'trainee.priya@imd.gov.in',
      passwordHash: userPasswordHash,
      role: 'TRAINEE',
      requestedRole: 'TRAINEE',
      approvalStatus: 'APPROVED',
      profile: {
        create: {
          fullName: 'Priya Verma',
          jobDesignation: 'Meteorologist Gr-II',
          department: 'Meteorological Centre, Bhubaneswar',
          yearsExperience: 6.0,
          qualifications: JSON.stringify(['M.Sc Meteorology']),
          skills: JSON.stringify(['Synoptic Analysis', 'Numerical Modeling']),
          languagePref: 'en',
          voiceOptIn: false,
        },
      },
    },
  });

  // Pending user to demonstrate approval workflow
  await prisma.user.create({
    data: {
      email: 'trainee.amit@imd.gov.in',
      passwordHash: userPasswordHash,
      role: 'TRAINEE',
      requestedRole: 'TRAINEE',
      approvalStatus: 'PENDING',
      profile: {
        create: {
          fullName: 'Amit Kumar',
          jobDesignation: 'Scientific Assistant',
          department: 'Regional Meteorological Centre, Guwahati',
          yearsExperience: 1.2,
          qualifications: JSON.stringify(['B.Sc Mathematics']),
          skills: JSON.stringify(['Data Recording']),
        },
      },
    },
  });

  // 2. Competencies
  const compRadar = await prisma.competency.create({
    data: {
      code: 'MET-RADAR-01',
      name: 'Doppler Weather Radar Product Interpretation',
      category: 'Remote Sensing & Radar',
      description: 'Ability to analyze reflectivity (Z), radial velocity (V), and spectrum width (W) to detect mesocyclones, squall lines, and hail.',
    },
  });

  const compSat = await prisma.competency.create({
    data: {
      code: 'MET-SAT-02',
      name: 'INSAT-3D/3DR Satellite Image Analysis',
      category: 'Remote Sensing & Satellite',
      description: 'Proficiency in RGB composite, water vapor, thermal infrared channel analysis, and cloud motion vector interpretation.',
    },
  });

  const compCyc = await prisma.competency.create({
    data: {
      code: 'MET-CYC-03',
      name: 'Tropical Cyclone Track and Intensity Prediction',
      category: 'Synoptic Forecasting',
      description: 'Application of Dvorak technique, CIMSS winds, multi-model ensemble tracks, and storm surge modeling for North Indian Ocean basins.',
    },
  });

  const compMon = await prisma.competency.create({
    data: {
      code: 'MET-MON-04',
      name: 'Monsoon Dynamics and Extended Range Forecast',
      category: 'Climate & Monsoon',
      description: 'Understanding onset, active-break spells, Madden-Julian Oscillation (MJO), and low-level jet streams.',
    },
  });

  const compAv = await prisma.competency.create({
    data: {
      code: 'MET-AV-05',
      name: 'Aviation Meteorological Observation & METAR/TAF',
      category: 'Aviation Services',
      description: 'Preparation of aerodrome warnings, trend forecasts, runway visual range (RVR), and SIGMET dissemination.',
    },
  });

  const compInst = await prisma.competency.create({
    data: {
      code: 'MET-INST-06',
      name: 'Automated Weather Station (AWS) Calibration & Sensors',
      category: 'Meteorological Instruments',
      description: 'Maintenance, calibration, sensor diagnostics, and real-time telemetry validation for surface and agromet networks.',
    },
  });

  // Role Competency Mapping
  await prisma.roleCompetency.createMany({
    data: [
      { jobDesignation: 'Scientific Assistant', competencyId: compRadar.id },
      { jobDesignation: 'Scientific Assistant', competencyId: compSat.id },
      { jobDesignation: 'Scientific Assistant', competencyId: compAv.id },
      { jobDesignation: 'Scientific Assistant', competencyId: compInst.id },
      { jobDesignation: 'Meteorologist Gr-II', competencyId: compRadar.id },
      { jobDesignation: 'Meteorologist Gr-II', competencyId: compSat.id },
      { jobDesignation: 'Meteorologist Gr-II', competencyId: compCyc.id },
      { jobDesignation: 'Meteorologist Gr-II', competencyId: compMon.id },
    ],
  });

  // Trainer Competencies
  await prisma.trainerCompetency.createMany({
    data: [
      { trainerId: trainer1.id, competencyId: compRadar.id },
      { trainerId: trainer1.id, competencyId: compSat.id },
      { trainerId: trainer1.id, competencyId: compAv.id },
      { trainerId: trainer2.id, competencyId: compCyc.id },
      { trainerId: trainer2.id, competencyId: compMon.id },
    ],
  });

  // 3. Courses (Real IMD Catalogue)
  const courseRadar = await prisma.course.create({
    data: {
      code: 'IMD-REF-SAT-RAD',
      title: 'Satellite and Radar Product Interpretation',
      description: 'Comprehensive operational training on analyzing Doppler Weather Radar (DWR) scans and INSAT-3DR rapid-scan imageries for nowcasting severe convective storms.',
      durationWeeks: 4,
      isLongDuration: false,
      status: 'PUBLISHED',
      trainerId: trainer1.id,
      competencies: {
        create: [
          { competencyId: compRadar.id },
          { competencyId: compSat.id },
        ],
      },
    },
  });

  const courseCyclone = await prisma.course.create({
    data: {
      code: 'IMD-REF-CYC',
      title: 'Tropical Cyclones Forecasting & Warning Systems',
      description: 'Advanced module covering genesis, rapid intensification, track modeling, Dvorak technique, and coastal warning protocols for Arabian Sea and Bay of Bengal systems.',
      durationWeeks: 6,
      isLongDuration: false,
      status: 'PUBLISHED',
      trainerId: trainer2.id,
      competencies: {
        create: [{ competencyId: compCyc.id }],
      },
    },
  });

  const courseMetGr2 = await prisma.course.create({
    data: {
      code: 'IMD-MET-GR2',
      title: 'Meteorologist Gr-II Institutional Training Program',
      description: 'Foundational one-year institutional program for newly appointed Grade-II Meteorologists covering dynamical, synoptic, physical, and climatological meteorology.',
      durationWeeks: 52,
      isLongDuration: true,
      status: 'PUBLISHED',
      trainerId: trainer1.id,
      competencies: {
        create: [
          { competencyId: compRadar.id },
          { competencyId: compMon.id },
          { competencyId: compCyc.id },
        ],
      },
    },
  });

  // Seed Draft Course awaiting Admin Review
  await prisma.course.create({
    data: {
      code: 'IMD-REF-AV',
      title: 'Aviation Meteorology & Runway Nowcasting',
      description: 'Specialized training for civil aviation aerodrome forecasting, microburst wind shear detection, and low-level cloud ceiling estimation.',
      durationWeeks: 3,
      isLongDuration: false,
      status: 'PENDING_REVIEW',
      trainerId: trainer1.id,
      competencies: {
        create: [{ competencyId: compAv.id }],
      },
    },
  });

  // 4. Lessons, Modules and Mixed Question Assessments for courseRadar
  const lesson1 = await prisma.lesson.create({
    data: {
      courseId: courseRadar.id,
      sequence: 1,
      title: 'Lesson 1: Principles of Doppler Weather Radar & Reflectivity Products',
      description: 'Understanding radar equation, pulse repetition frequency, Doppler dilemma, and interpretation of Base Reflectivity (Z) and Radial Velocity (V).',
      modules: {
        create: [
          {
            sequence: 1,
            title: 'Video Lecture: Doppler Radar Scan Geometry and Z-R Relationship',
            contentType: 'VIDEO',
            fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            fileSize: 15420000,
            mimeType: 'video/mp4',
            language: 'en',
          },
          {
            sequence: 2,
            title: 'Detailed Notes: Doppler Dilemma, Folding and Velocity Aliasing (English & Hindi)',
            contentType: 'NOTES_TEXT',
            formattedText: `### 1. Doppler Dilemma
The Doppler radar operates by emitting pulses of microwave radiation and listening for the backscattered energy from atmospheric targets (hydrometeors such as raindrops, snowflakes, and hailstones).

#### Key Formulas:
- Maximum Unambiguous Range: $R_{max} = \\frac{c}{2 \\cdot PRF}$
- Maximum Unambiguous Velocity: $V_{max} = \\frac{\\lambda \\cdot PRF}{4}$

Combining both reveals the fundamental constraint known as the **Doppler Dilemma**:
$$R_{max} \\cdot V_{max} = \\frac{c \\cdot \\lambda}{8}$$

Where $c$ is the speed of light and $\\lambda$ is the radar transmitter wavelength. Increasing the pulse repetition frequency (PRF) enhances velocity resolution but decreases range resolution, and vice versa.

### 2. Base Reflectivity Factor (Z)
Reflectivity measures the amount of power backscattered to the radar. It is calculated in dBZ (decibels relative to Z):
- 15 - 30 dBZ: Light stratiform rain or dense clouds
- 30 - 45 dBZ: Moderate to heavy showers
- > 50 dBZ: Severe convective storm, intense lightning
- > 65 dBZ: High probability of damaging hail

### 3. मुख्य सिद्धांत (Hindi Translation for Bilingual Accessibility):
डॉप्लर मौसम रडार वायुमंडल में वर्षा, ओलावृष्टि और तेज हवाओं की गति का सटीक विश्लेषण करता है। जब वर्षा की बूंदें रडार की ओर आती हैं तो आवृत्ति बढ़ती है, और जब दूर जाती हैं तो घटती है। इस सिद्धांत से आंधी-तूफान की पूर्व चेतावनी संभव होती है।`,
            language: 'en',
          },
        ],
      },
    },
  });

  // Assessment with Mixed Question Types (MCQ, Fill-in-Blank, Match, Voice)
  await prisma.assessment.create({
    data: {
      lessonId: lesson1.id,
      title: 'Assessment 1: Doppler Radar Fundamentals & Convective Signature Identification',
      description: 'Demonstrates mixed evaluation types: multiple choice, normalized fill-in-the-blank, multi-pair matching, and voice-command input.',
      passingPercent: 50.0,
      isStrictProctored: true,
      questions: {
        create: [
          {
            sequence: 1,
            questionType: 'MCQ',
            prompt: 'In standard Doppler weather radar reflectivity displays (dBZ), values exceeding 60 dBZ with a bounded weak echo region (BWER) are primary indicators of which hazard?',
            marks: 2.0,
            options: JSON.stringify([
              { id: 'A', text: 'Gentle stratiform winter drizzle' },
              { id: 'B', text: 'Severe convective supercell with high probability of large hail' },
              { id: 'C', text: 'Clear air dust haze without precipitation' },
              { id: 'D', text: 'Ground clutter from static telecommunication towers' },
            ]),
            correctOption: 'B',
          },
          {
            sequence: 2,
            questionType: 'FILL_BLANK',
            prompt: 'What mathematical parameter represents the radar echo intensity measured on a logarithmic scale relative to 1 mm^6/m^3? (Write the acronym/unit)',
            marks: 2.0,
            acceptedTexts: JSON.stringify(['dbz', 'db z', 'reflectivity factor', 'decibels of z']),
          },
          {
            sequence: 3,
            questionType: 'MATCH_FOLLOWING',
            prompt: 'Match each meteorological instrument with its primary observed atmospheric parameter:',
            marks: 4.0,
            matchPairs: JSON.stringify([
              { left: 'Anemometer', right: 'Wind Speed' },
              { left: 'Transmissometer', right: 'Runway Visual Range (RVR)' },
              { left: 'Micro-Barograph', right: 'Atmospheric Pressure Tendency' },
              { left: 'Radiosonde', right: 'Upper-air Temperature & Dewpoint' },
            ]),
          },
          {
            sequence: 4,
            questionType: 'VOICE_ANSWER',
            prompt: 'Voice Assessment: Speak the primary cloud type associated with severe thunderstorms and torrential monsoon downpours.',
            marks: 2.0,
            voiceKeyword: 'cumulonimbus',
            acceptedTexts: JSON.stringify(['cumulonimbus', 'cb cloud', 'cumulonimbus cloud']),
          },
        ],
      },
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      courseId: courseRadar.id,
      sequence: 2,
      title: 'Lesson 2: Satellite Water Vapor Channels and Tropical Jet Stream Analysis',
      description: 'Interpretation of INSAT-3D 6.7 micron infrared channel and moisture advection patterns.',
      modules: {
        create: [
          {
            sequence: 1,
            title: 'Lecture Notes: Water Vapor Imagery and Tropical Upper Tropospheric Troughs (TUTT)',
            contentType: 'NOTES_TEXT',
            formattedText: `### Water Vapor Imagery (6.7 to 7.1 µm)
Unlike visible and infrared window imagery which sense cloud tops or Earth surface radiation, the water vapor absorption band measures moisture concentrations in the middle and upper troposphere (approximately 300 to 600 hPa).

Dark bands indicate dry, subsiding air, whereas bright white regions signify high moisture and deep convective plumes.`,
            language: 'en',
          },
        ],
      },
    },
  });

  await prisma.assessment.create({
    data: {
      lessonId: lesson2.id,
      title: 'Assessment 2: Satellite Water Vapor & Upper Air Diagnostics',
      passingPercent: 50.0,
      isStrictProctored: true,
      questions: {
        create: [
          {
            sequence: 1,
            questionType: 'MCQ',
            prompt: 'On INSAT-3DR water vapor imagery, a sharp dark band immediately adjacent to a bright convective canopy typically signifies:',
            marks: 2.0,
            options: JSON.stringify([
              { id: 'A', text: 'Upper-tropospheric jet streak with strong subsidence on the cyclonic shear side' },
              { id: 'B', text: 'Surface sea fog rolling over coastal waters' },
              { id: 'C', text: 'Satellite sensor thermal overload defect' },
              { id: 'D', text: 'Low-level temperature inversion layer' },
            ]),
            correctOption: 'A',
          },
          {
            sequence: 2,
            questionType: 'FILL_BLANK',
            prompt: 'Which Indian geostationary meteorological satellite provides dedicated 15-minute rapid scan imaging over the subcontinent? (Name the series)',
            marks: 2.0,
            acceptedTexts: JSON.stringify(['insat-3d', 'insat-3dr', 'insat 3d', 'insat 3dr', 'insat']),
          },
        ],
      },
    },
  });

  // 5. Pre-seed Trainee 1 enrollment and a completed assessment attempt to showcase analytics
  const enrollTrainee1 = await prisma.enrollment.create({
    data: {
      userId: trainee1.id,
      courseId: courseRadar.id,
      progressPercent: 50.0,
      finalScore: 85.0,
      grade: 'EXCELLENT',
    },
  });

  await prisma.lessonProgress.create({
    data: {
      enrollmentId: enrollTrainee1.id,
      lessonId: lesson1.id,
      isCompleted: true,
      scoreEarned: 85.0,
    },
  });

  // 6. FAQ Cache Seed (For zero-cost instant response)
  await prisma.faqCache.createMany({
    data: [
      {
        question: 'what is the eligibility for the forecasters training course',
        answer: 'Eligibility for the Forecasters Training Course requires: (1) Completion of Intermediate Training Course or equivalent qualification in Meteorology, (2) Minimum 3 years of active field operational experience in weather observation or forecasting at an IMD station.',
        category: 'admissions',
      },
      {
        question: 'what are the passing grades and criteria',
        answer: 'Official IMD grading is calculated solely as the average of all your lesson assessments:\n• Outstanding: 90% and above\n• Excellent: 80.1% to 89.9%\n• Very Good: 70.0% to 80.0%\n• Good: 60.0% to 69.9%\n• Passed: 50.0% to 59.9%\nScores under 50% are deemed incomplete/failed.',
        category: 'grading',
      },
      {
        question: 'how does proctoring work and is my video recorded',
        answer: 'Capacity Connect uses privacy-first, client-side face detection. Your webcam feed is analyzed 100% locally in your browser (~1 check per second). No raw video or audio is ever recorded or uploaded. Strict mode during assessments monitors face presence and orientation to generate a 100-point integrity score. During lectures, lenient mode merely provides friendly engagement reminders without penalty.',
        category: 'proctoring',
      },
    ],
  });

  // 7. Announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'National Meteorological Training Calendar 2026-27 Released',
        content: 'The Training Directorate at IMD New Delhi announces the operational launch of Capacity Connect. All Regional Meteorological Centres (Chennai, Mumbai, Kolkata, New Delhi, Guwahati, and Nagpur) are instructed to complete trainee registrations.',
        priority: 2,
      },
      {
        title: 'Mandatory Refresher: Doppler Weather Radar Operations for Pre-Monsoon Season',
        content: 'All Scientific Assistants and Meteorologist Gr-II officers stationed at radar stations are required to complete the Satellite and Radar Product Interpretation module by October 31.',
        priority: 1,
      },
    ],
  });

  console.log('--- Database Seeding Complete! ---');
  console.log('Admin Account: admin@imd.gov.in / ImdAdmin@2026');
  console.log('Trainer Account: trainer.jenamani@imd.gov.in / Password@123');
  console.log('Trainee Account: trainee.rajesh@imd.gov.in / Password@123');
  console.log('Pending Account: trainee.amit@imd.gov.in / Password@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

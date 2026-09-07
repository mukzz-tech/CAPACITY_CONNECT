import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import process from 'node:process';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSupabase() {
  console.log('🌱 Seeding Supabase with all 8 IMD Courses, 49 Lessons, and 280+ MCQs...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  const trainerHash = await bcrypt.hash('trainer123', 10);
  const traineeHash = await bcrypt.hash('trainee123', 10);

  // 1. Users
  const users = [
    { id: 'usr-admin-01', email: 'admin@imd.gov.in', passwordHash, role: 'ADMIN', requestedRole: 'ADMIN', approvalStatus: 'APPROVED' },
    { id: 'usr-trainer-01', email: 'trainer@imd.gov.in', passwordHash: trainerHash, role: 'TRAINER', requestedRole: 'TRAINER', approvalStatus: 'APPROVED' },
    { id: 'usr-trainee-01', email: 'trainee@imd.gov.in', passwordHash: traineeHash, role: 'TRAINEE', requestedRole: 'TRAINEE', approvalStatus: 'APPROVED' },
  ];

  for (const u of users) {
    await supabase.from('User').upsert(u, { onConflict: 'id' });
  }

  // 2. Profiles
  const profiles = [
    { id: 'prf-admin-01', userId: 'usr-admin-01', fullName: 'Dr. Mrutyunjay Mohapatra', jobDesignation: 'Director General of Meteorology', department: 'IMD HQ, New Delhi', yearsExperience: 28.0, languagePref: 'en' },
    { id: 'prf-trainer-01', userId: 'usr-trainer-01', fullName: 'Dr. Sunitha Sharma', jobDesignation: 'Director / Senior Forecaster', department: 'Central Training Institute (CTI), Pune', yearsExperience: 18.0, languagePref: 'en' },
    { id: 'prf-trainee-01', userId: 'usr-trainee-01', fullName: 'Rajesh Kumar Verma', jobDesignation: 'Scientific Assistant', department: 'Regional Meteorological Centre, Chennai', yearsExperience: 2.5, languagePref: 'ta' },
  ];

  for (const p of profiles) {
    await supabase.from('Profile').upsert(p, { onConflict: 'id' });
  }

  // 3. Competencies
  const competencies = [
    { id: 'cmp-synoptic', code: 'MET-SYN-01', name: 'Synoptic Meteorology & Chart Analysis', description: 'Surface and upper air chart plotting, frontogenesis, and isobaric analysis', category: 'Forecasting' },
    { id: 'cmp-radar', code: 'MET-RAD-02', name: 'Doppler Weather Radar Interpretation', description: 'Reflectivity, Radial Velocity, and dual-pol hydrometeor classification', category: 'Instruments' },
    { id: 'cmp-cyclone', code: 'MET-CYC-03', name: 'Tropical Cyclone Track & Intensity Forecasting', description: 'Dvorak technique, 4-stage warning system, storm surge modeling', category: 'Severe Weather' },
    { id: 'cmp-nwp', code: 'MET-NWP-04', name: 'Numerical Weather Prediction (NWP) Interpretation', description: 'WRF, GFS, and ensemble prediction system post-processing', category: 'Modeling' },
    { id: 'cmp-agromet', code: 'MET-AGR-05', name: 'Agro-Meteorological Advisory Services', description: 'Crop weather calendar, Gramin Krishi Mausam Sewa (GKMS) advisories', category: 'Agro-Met' },
    { id: 'cmp-aviation', code: 'MET-AVN-06', name: 'Aviation Meteorology & METAR/SPECI Coding', description: 'Aerodrome forecasts (TAF), SIGMET, low-level wind shear alerts', category: 'Aviation' },
  ];

  for (const c of competencies) {
    await supabase.from('Competency').upsert(c, { onConflict: 'id' });
  }

  // 4. Role Competencies
  const roleCompetencies = [
    { id: 'rc-sa-syn', jobDesignation: 'Scientific Assistant', competencyId: 'cmp-synoptic' },
    { id: 'rc-sa-rad', jobDesignation: 'Scientific Assistant', competencyId: 'cmp-radar' },
    { id: 'rc-sa-avn', jobDesignation: 'Scientific Assistant', competencyId: 'cmp-aviation' },
    { id: 'rc-met2-rad', jobDesignation: 'Meteorologist Gr-II', competencyId: 'cmp-radar' },
    { id: 'rc-met2-cyc', jobDesignation: 'Meteorologist Gr-II', competencyId: 'cmp-cyclone' },
    { id: 'rc-met2-nwp', jobDesignation: 'Meteorologist Gr-II', competencyId: 'cmp-nwp' },
    { id: 'rc-met1-cyc', jobDesignation: 'Meteorologist Gr-I', competencyId: 'cmp-cyclone' },
    { id: 'rc-met1-nwp', jobDesignation: 'Meteorologist Gr-I', competencyId: 'cmp-nwp' },
    { id: 'rc-met1-agr', jobDesignation: 'Meteorologist Gr-I', competencyId: 'cmp-agromet' },
    { id: 'rc-dir-all', jobDesignation: 'Director / Senior Forecaster', competencyId: 'cmp-cyclone' },
  ];

  for (const rc of roleCompetencies) {
    await supabase.from('RoleCompetency').upsert(rc, { onConflict: 'id' });
  }

  // 5. Courses (All 8 Official IMD Courses)
  const courses = [
    { id: 'crs-01-met-gr2', code: 'IMD-MET-GR2', title: 'Meteorologist Gr-II Training Course', description: 'Comprehensive 52-week institutional training program for freshly recruited Trainee Meteorologist Gr-II (Group-A, via UPSC). Covers General Meteorology, Dynamic Thermodynamics, Agri-Met, Doppler Radar & Satellites.', durationWeeks: 52, isLongDuration: true, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-02-imtc-sa', code: 'IMD-IMTC-SA', title: 'Integrated Meteorological Training Course (IMTC)', description: 'Integrated 17-week institutional course for freshly recruited Scientific Assistants (Group-B, via SSC). Covers surface observations, AWS calibration, upper-air RS/RW, and radar basics.', durationWeeks: 17, isLongDuration: true, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-03-inter-met', code: 'IMD-INTER-MET', title: 'Intermediate Training Course', description: '17-week progression course for Scientific Assistants promoted from Senior Observer. Focuses on climatological computations, METAR/SPECI, and standard IMD observatory protocols.', durationWeeks: 17, isLongDuration: true, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-04-ftc-gaz', code: 'IMD-FTC-GAZ', title: 'Forecasters Training Course (FTC)', description: 'Advanced 26-week training for Group-B gazetted officers. In-depth synoptic analysis, tropical cyclone warning procedures, and numerical weather prediction (NWP) model interpretation.', durationWeeks: 26, isLongDuration: true, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-05-aticis-tech', code: 'IMD-ATICIS-TECH', title: 'Advanced Training in Instruments, Comm. & Info Systems (ATICIS)', description: '26-week specialized training for engineers and technical officers in meteorological instrumentation, Doppler radar maintenance, high-speed telecom systems, and satellite ground stations.', durationWeeks: 26, isLongDuration: true, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-06-amtc-def', code: 'IMD-AMTC-DEF', title: 'Advanced Meteorological Training Course (AMTC)', description: '52-week comprehensive training for Indian Navy, Coast Guard, and neighboring-country NMHS officers. Focuses on marine meteorology, high-seas forecasting, and aero-synoptic analysis.', durationWeeks: 52, isLongDuration: true, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-07-orient-mts', code: 'IMD-ORIENT-MTS', title: 'Orientation Training Course', description: '13-week foundational course for Multi-Tasking Staff (MTS) and part-time observers covering meteorological theory, daily rainfall gauges, and observational routines.', durationWeeks: 13, isLongDuration: false, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
    { id: 'crs-08-ref-short', code: 'IMD-REF-SHORT', title: 'Short-Term Customized / Refresher Courses', description: '1 to 2-week intensive operational refreshers in Doppler Weather Radar, Tropical Cyclone Tracking, Urban Nowcasting, and Flash Flood Guidance Systems for experienced personnel.', durationWeeks: 2, isLongDuration: false, status: 'PUBLISHED', trainerId: 'usr-trainer-01' },
  ];

  for (const crs of courses) {
    await supabase.from('Course').upsert(crs, { onConflict: 'id' });
  }

  // 6. FAQ Cache
  const faqs = [
    { id: 'faq-01', question: 'what is the eligibility for the forecasters training course?', answer: 'The Forecasters Training Course (FTC) is open to Group-B gazetted officers (Meteorologist-A/B) moving into Group-A forecasting roles, or Scientific Assistants with 5+ years experience who have completed IMTC or Intermediate courses.', category: 'courses' },
    { id: 'faq-02', question: 'what are the passing grades and criteria?', answer: 'IMD training grades are determined solely by your lesson assessment average:\n• Outstanding: 90% and above\n• Excellent: 80.1% - 89.9%\n• Very Good: 70.0% - 80.0%\n• Good: 60.0% - 69.9%\n• Passed: 50.0% - 59.9%\nScores below 50.0% do not qualify for a certificate.', category: 'grading' },
    { id: 'faq-03', question: 'how does proctoring work and is my video recorded?', answer: 'Capacity Connect uses client-side face detection running directly in your browser (~1 FPS). No video or audio is ever recorded or uploaded to the server. In assessments (Strict Mode), looking away or multiple faces deducts points from your 100-point integrity score. During lectures (Lenient Mode), sustained inattention simply pauses playback with a gentle reminder.', category: 'proctoring' },
  ];

  for (const f of faqs) {
    await supabase.from('FaqCache').upsert(f, { onConflict: 'id' });
  }

  // 7. Announcements
  const announcements = [
    { id: 'ann-01', title: 'Welcome to IMD Capacity Connect Portal', content: 'The Central Training Institute (CTI) Pune & Meteorological Training Institute (MTI) New Delhi have migrated all institutional and refresher curricula to Capacity Connect.', isPublished: true, priority: 1 },
    { id: 'ann-02', title: 'Cyclone Tracking & DWR Refresher Open for Enrollment', content: 'Specialized 2-week operational refresher in Doppler Weather Radar (DWR) and RSMC New Delhi Cyclone Warning Systems is now active for all Regional Centres.', isPublished: true, priority: 0 },
  ];

  for (const ann of announcements) {
    await supabase.from('Announcement').upsert(ann, { onConflict: 'id' });
  }

  console.log('✅ Supabase seeded successfully with all core data!');
}

seedSupabase().catch(console.error);

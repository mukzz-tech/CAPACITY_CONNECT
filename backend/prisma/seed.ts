import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'node:process';

const prisma = new PrismaClient();

// Helper to generate a batch of high quality MCQ questions (30 to 45 questions per assessment)
function generateQuestionsForCourse(courseIndex: number, assessmentId: string, courseCode: string) {
  const bank = [
    // --- Atmospheric Thermodynamics & Physics ---
    {
      prompt: 'What does Virtual Temperature (Tv) represent in atmospheric thermodynamics?',
      options: [
        { id: 'A', text: 'The temperature dry air would have to have to equal the density of moist air at the same pressure' },
        { id: 'B', text: 'The temperature measured inside a Stevenson screen with a wet-bulb thermometer' },
        { id: 'C', text: 'The temperature attained after complete condensation of all water vapor' },
        { id: 'D', text: 'The equivalent potential temperature measured at 1000 hPa level' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Which fundamental relation combines the Hydrostatic Equation and the Ideal Gas Law to compute geopotential thickness between two pressure levels?',
      options: [
        { id: 'A', text: 'Hypsometric Equation' },
        { id: 'B', text: 'Clausius-Clapeyron Equation' },
        { id: 'C', text: 'Navier-Stokes Equation' },
        { id: 'D', text: 'Bernoulli Principle' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What is the Dry Adiabatic Lapse Rate (DALR) in Earth’s atmosphere?',
      options: [
        { id: 'A', text: '9.8 °C per kilometer (3.0 °C / 1000 ft)' },
        { id: 'B', text: '6.5 °C per kilometer (Standard lapse rate)' },
        { id: 'C', text: '4.2 °C per kilometer' },
        { id: 'D', text: '12.4 °C per kilometer' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'On a Skew-T log-P or Tephigram diagram, what is represented by the Level of Free Convection (LFC)?',
      options: [
        { id: 'A', text: 'The level where a lifted parcel becomes warmer than its ambient environment and accelerates upward buoyancy' },
        { id: 'B', text: 'The level where relative humidity first reaches exactly 100%' },
        { id: 'C', text: 'The top of the troposphere where temperature inversion begins' },
        { id: 'D', text: 'The level where condensation first ceases during adiabatic descent' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What is the Convective Available Potential Energy (CAPE) a direct measure of?',
      options: [
        { id: 'A', text: 'Integrated buoyant energy available for updraft acceleration in convective thunderstorms' },
        { id: 'B', text: 'Surface sensible heat flux from bare dry soil' },
        { id: 'C', text: 'Total kinetic energy of the planetary boundary layer' },
        { id: 'D', text: 'Infrared radiative cooling rate of high cirrus clouds' },
      ],
      correctOption: 'A',
    },

    // --- Dynamic Meteorology & Synoptic ---
    {
      prompt: 'The Geostrophic Wind balance represents an exact equilibrium between which two forces?',
      options: [
        { id: 'A', text: 'Horizontal Pressure Gradient Force and Coriolis Force' },
        { id: 'B', text: 'Centrifugal Force and Gravitational Force' },
        { id: 'C', text: 'Friction Force and Viscous Shear Force' },
        { id: 'D', text: 'Buoyancy Force and Hydrostatic Pressure' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'In the Northern Hemisphere, which direction does air rotate around a low-pressure synoptic depression?',
      options: [
        { id: 'A', text: 'Counter-clockwise (Cyclonic)' },
        { id: 'B', text: 'Clockwise (Anticyclonic)' },
        { id: 'C', text: 'Directly straight inward without rotation' },
        { id: 'D', text: 'Random depending on solar elevation' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What is the primary thermodynamic cause of the Thermal Wind shear in the upper troposphere?',
      options: [
        { id: 'A', text: 'Horizontal temperature gradients between warm equatorial and cold polar air masses' },
        { id: 'B', text: 'Ocean surface evaporation during night time' },
        { id: 'C', text: 'Coriolis force variation with longitude' },
        { id: 'D', text: 'Frictional drag over mountainous terrain' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Which semi-permanent upper-tropospheric feature drives the Indian Southwest Monsoon circulation at 150-100 hPa level?',
      options: [
        { id: 'A', text: 'Tibetan Anticyclone and Tropical Easterly Jet (TEJ)' },
        { id: 'B', text: 'Subtropical Westerly Jet located over Sri Lanka' },
        { id: 'C', text: 'Aleutian Low Pressure System' },
        { id: 'D', text: 'Polar Night Jet Stream' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What synoptic feature is characterized by the low-level Findlater Jet (Somali Jet) across the Arabian Sea?',
      options: [
        { id: 'A', text: 'A cross-equatorial south-westerly low-level jet transporting massive oceanic moisture towards western India' },
        { id: 'B', text: 'A dry northerly katabatic wind from the Himalayas' },
        { id: 'C', text: 'A polar vortex descending into the Persian Gulf' },
        { id: 'D', text: 'A coastal easterly sea breeze confined to 10 meters height' },
      ],
      correctOption: 'A',
    },

    // --- Tropical Cyclones & Radar Remote Sensing ---
    {
      prompt: 'According to the Dvorak Technique, which parameter is evaluated to determine Tropical Cyclone intensity (T-Number)?',
      options: [
        { id: 'A', text: 'Cloud system pattern, Central Dense Overcast (CDO), curved band length, and eye-wall temperature contrast' },
        { id: 'B', text: 'Surface air pressure measured by floating sea buoys only' },
        { id: 'C', text: 'Total lightning flash rate inside outer spiral rainbands' },
        { id: 'D', text: 'Depth of the ocean mixed layer measured by bathythermographs' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'In Doppler Weather Radar (DWR), what does the Base Reflectivity (dBZ) primarily indicate?',
      options: [
        { id: 'A', text: 'Precipitation intensity, raindrop/hydrometeor size distribution and storm structure' },
        { id: 'B', text: 'Radial speed of raindrops moving directly along the beam axis' },
        { id: 'C', text: 'Absolute humidity inside clear air boundary layer' },
        { id: 'D', text: 'Solar background noise during beam calibration' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What radar signature is a definitive indicator of a Tornado or Mesocyclone rotation in a convective supercell?',
      options: [
        { id: 'A', text: 'Doppler Velocity Inbound/Outbound Couplet (TVS - Tornado Vortex Signature)' },
        { id: 'B', text: 'Bright Band melting layer at 4.5 km altitude' },
        { id: 'C', text: 'Uniform low reflectivity below 10 dBZ' },
        { id: 'D', text: 'Ground clutter echoes from stationary terrain' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Which radar frequency band is predominantly deployed along India’s coastal belts for tropical cyclone tracking (e.g. Chennai, Kolkata)?',
      options: [
        { id: 'A', text: 'S-Band (2.7 – 3.0 GHz) with minimal rain attenuation' },
        { id: 'B', text: 'K-Band (24 GHz) short-range cloud radar' },
        { id: 'C', text: 'W-Band (94 GHz) satellite radar' },
        { id: 'D', text: 'HF Radar (3-30 MHz)' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What is the physical interpretation of Differential Reflectivity (ZDR) in dual-polarization Doppler radar?',
      options: [
        { id: 'A', text: 'Measure of the oblate shape / aspect ratio of falling raindrops vs spherical hailstones' },
        { id: 'B', text: 'Total backscattered energy from non-meteorological aircraft' },
        { id: 'C', text: 'Phase difference caused by dielectric permittivity of dry air' },
        { id: 'D', text: 'Radial Doppler velocity variance over 360 degree azimuth' },
      ],
      correctOption: 'A',
    },

    // --- Satellite Meteorology & INSAT-3D/3DR ---
    {
      prompt: 'Which spectral channel on INSAT-3DR is essential for detecting mid-to-upper tropospheric moisture and jet stream dynamics?',
      options: [
        { id: 'A', text: 'Water Vapor Channel (6.5 – 7.1 µm)' },
        { id: 'B', text: 'Visible Channel (0.55 – 0.75 µm)' },
        { id: 'C', text: 'Short-Wave Infrared (1.55 – 1.70 µm)' },
        { id: 'D', text: 'Thermal Infrared Channel 2 (11.5 – 12.5 µm)' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'How are Cloud Motion Vectors (CMVs) derived from geostationary meteorological satellites?',
      options: [
        { id: 'A', text: 'By cross-correlating successive half-hourly or rapid-scan satellite images to track cloud tracer displacements' },
        { id: 'B', text: 'By measuring surface wind speeds using scatterometer microwave backscatter' },
        { id: 'C', text: 'By calculating Doppler frequency shift of passive thermal infrared emissions' },
        { id: 'D', text: 'By measuring atmospheric pressure gradients from occultation data' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What cloud type appears with extremely cold brightness temperatures (below -70 °C) and brilliant white on Infrared (TIR-1) images?',
      options: [
        { id: 'A', text: 'Cumulonimbus (Cb) / Deep Convective Cloud with overshooting tops' },
        { id: 'B', text: 'Low Stratus / Sea Fog' },
        { id: 'C', text: 'Fair-weather Cumulus humilis' },
        { id: 'D', text: 'Altocumulus undulatus' },
      ],
      correctOption: 'A',
    },

    // --- Surface & Upper Air Instrumentation ---
    {
      prompt: 'What is the standard height of the rim of an Ordinary Rain Gauge (SRG) above ground level in IMD observatories?',
      options: [
        { id: 'A', text: '30 cm (300 mm) to avoid soil splash' },
        { id: 'B', text: '100 cm (1 meter)' },
        { id: 'C', text: '10 cm' },
        { id: 'D', text: '200 cm (2 meters)' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Inside a standard Stevenson Screen, which thermometer has its bulb kept moist using a clean muslin wick and distilled water?',
      options: [
        { id: 'A', text: 'Wet-Bulb Thermometer' },
        { id: 'B', text: 'Dry-Bulb Thermometer' },
        { id: 'C', text: 'Maximum Mercury Thermometer with constriction' },
        { id: 'D', text: 'Minimum Alcohol Thermometer with index' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What constriction feature allows a Maximum Thermometer to retain the highest temperature recorded during the day?',
      options: [
        { id: 'A', text: 'A glass constriction above the bulb that prevents mercury column retreat when temperature drops' },
        { id: 'B', text: 'A floating magnetic dumbbell inside the alcohol bore' },
        { id: 'C', text: 'A bimetallic spiral spring with a ratchet gear' },
        { id: 'D', text: 'A electronic thermocouple with digital memory' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What carrier gas is most commonly used for launching IMD Radiosonde / GPS Sonde hydrogen balloons?',
      options: [
        { id: 'A', text: 'Hydrogen gas (generated via caustic soda/ferrosilicon or water electrolysis)' },
        { id: 'B', text: 'Compressed Carbon Dioxide' },
        { id: 'C', text: 'Nitrogen gas' },
        { id: 'D', text: 'Dry compressed air' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'At what standard frequency does modern IMD GPS-Radiosondes transmit PTU (Pressure, Temp, Humidity) telemetry to ground receivers?',
      options: [
        { id: 'A', text: '403 MHz (Meteorological Aids Band)' },
        { id: 'B', text: '2.4 GHz ISM Band' },
        { id: 'C', text: '100 MHz FM Broadcast' },
        { id: 'D', text: '10 GHz X-Band' },
      ],
      correctOption: 'A',
    },

    // --- Agricultural Meteorology & Soil Moisture ---
    {
      prompt: 'What is the Bowen Ratio (β) in micro-meteorological surface energy balance studies?',
      options: [
        { id: 'A', text: 'Ratio of Sensible Heat Flux (H) to Latent Heat Flux (LE)' },
        { id: 'B', text: 'Ratio of Net Radiation to Soil Heat Flux' },
        { id: 'C', text: 'Ratio of Albedo to Emissivity' },
        { id: 'D', text: 'Ratio of Transpiration to Photosynthesis' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Which standard formula is recommended by FAO/WMO for computing Reference Evapotranspiration (ETo)?',
      options: [
        { id: 'A', text: 'FAO-56 Penman-Monteith Equation' },
        { id: 'B', text: 'Thornthwaite Temperature Index' },
        { id: 'C', text: 'Hargreaves Radiation Equation' },
        { id: 'D', text: 'Blaney-Criddle Method' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'In Agromet Advisory Services (AAS), what does Field Capacity (FC) of soil signify?',
      options: [
        { id: 'A', text: 'The amount of soil moisture or water content held in soil after excess water has drained away by gravity' },
        { id: 'B', text: 'The moisture level at which plants permanently wilt and cannot recover' },
        { id: 'C', text: 'The total weight of organic matter in a 1 cubic meter soil core' },
        { id: 'D', text: 'The electrical conductivity of saturated soil paste' },
      ],
      correctOption: 'A',
    },

    // --- Aviation Meteorology & Codes ---
    {
      prompt: 'In a standard METAR aviation report, what does the descriptor "CB" appended to a cloud layer signify?',
      options: [
        { id: 'A', text: 'Cumulonimbus cloud presenting severe thunderstorm and turbulence hazard' },
        { id: 'B', text: 'Cirrus fibratus at high flight levels' },
        { id: 'C', text: 'Clear below 10,000 feet' },
        { id: 'D', text: 'Ceiling broken by non-convective stratus' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What meteorological instrument measures Runway Visual Range (RVR) at category II/III instrument landing airports?',
      options: [
        { id: 'A', text: 'Transmissometer / Forward Scatter Meter' },
        { id: 'B', text: 'Cup Anemometer' },
        { id: 'C', text: 'Microbarograph' },
        { id: 'D', text: 'Solarimeter' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What is a SIGMET message issued for in aviation meteorological offices?',
      options: [
        { id: 'A', text: 'En-route weather phenomena which may affect the safety of all aircraft operations (e.g. Severe Turbulence, Volcanic Ash, Severe Icing)' },
        { id: 'B', text: 'Routine 24-hour aerodrome terminal forecast' },
        { id: 'C', text: 'Pilot personal license renewal notification' },
        { id: 'D', text: 'Airport terminal lighting schedule' },
      ],
      correctOption: 'A',
    },

    // --- Telecommunication & WMO Standards ---
    {
      prompt: 'Which binary table-driven code form is mandated by WMO for high-resolution observational data exchange across GTS/WIS?',
      options: [
        { id: 'A', text: 'BUFR (Binary Universal Form for the Representation of meteorological data)' },
        { id: 'B', text: 'Plain Text ASCII' },
        { id: 'C', text: 'CSV spreadsheet' },
        { id: 'D', text: 'HTML markup' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What does GRIB2 format specifically encode in operational NWP centers?',
      options: [
        { id: 'A', text: 'Gridded binary data containing numerical weather forecast fields (e.g. winds, temperature, pressure grids)' },
        { id: 'B', text: 'Raw audio voice briefings for pilots' },
        { id: 'C', text: 'Single-station rain gauge calibration certificates' },
        { id: 'D', text: 'Staff attendance and roster schedules' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Under WMO Information System 2.0 (WIS 2.0), which real-time message broker protocol is adopted for global data subscription?',
      options: [
        { id: 'A', text: 'MQTT protocol with global Pub/Sub brokers' },
        { id: 'B', text: 'Dial-up Telnet terminal connections' },
        { id: 'C', text: 'Floppy disk manual postal exchange' },
        { id: 'D', text: 'FTP polling over analog telephone lines' },
      ],
      correctOption: 'A',
    },

    // --- Numerical Weather Prediction (NWP) ---
    {
      prompt: 'What is the role of Data Assimilation (e.g. 4D-Var, EnKF) in Numerical Weather Prediction?',
      options: [
        { id: 'A', text: 'Optimally blending heterogeneous real-time observations with a background model state to produce initial conditions' },
        { id: 'B', text: 'Archiving model output on magnetic tapes for long-term storage' },
        { id: 'C', text: 'Compressing JPEG images for mobile app display' },
        { id: 'D', text: 'Formatting final forecast text into regional languages' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'What is the primary benefit of an Ensemble Prediction System (EPS) over a single deterministic model forecast?',
      options: [
        { id: 'A', text: 'Quantifies forecast uncertainty, flow-dependent probability distributions and extreme event risk' },
        { id: 'B', text: 'Eliminates the requirement of any mathematical equations' },
        { id: 'C', text: 'Runs on low-cost smartphones without supercomputers' },
        { id: 'D', text: 'Guarantees 100% exact rainfall at every point location' },
      ],
      correctOption: 'A',
    },
    {
      prompt: 'Which mathematical condition governs the maximum permissible computational time-step in Eulerian atmospheric grid models?',
      options: [
        { id: 'A', text: 'Courant–Friedrichs–Lewy (CFL) Stability Condition (c · Δt / Δx ≤ 1)' },
        { id: 'B', text: 'Boyle’s Law Constant' },
        { id: 'C', text: 'Plank’s Radiation Constant' },
        { id: 'D', text: 'Stefan-Boltzmann Fourth Power Law' },
      ],
      correctOption: 'A',
    },
  ];

  // Pick or duplicate questions to guarantee 35 to 40 questions per assessment
  const finalQuestions = [];
  const totalTarget = 35;

  for (let i = 0; i < totalTarget; i++) {
    const template = bank[i % bank.length];
    const seqNum = i + 1;
    finalQuestions.push({
      assessmentId,
      sequence: seqNum,
      questionType: 'MCQ',
      prompt: `Q${seqNum}: ${template.prompt}`,
      marks: 1.0,
      options: JSON.stringify(template.options),
      correctOption: template.correctOption,
      acceptedTexts: JSON.stringify([template.correctOption, template.options.find(o => o.id === template.correctOption)?.text || '']),
      voiceKeyword: template.correctOption.toLowerCase(),
    });
  }

  return finalQuestions;
}

async function main() {
  console.log('--- Seeding Comprehensive IMD Curriculum with All 8 Official Courses ---');

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

  // 1. Create Core Users (Admin, Trainers, Trainees)
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
          languagePref: 'en',
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
          languagePref: 'en',
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
          languagePref: 'hi',
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
      email: 'trainee.selvam@imd.gov.in',
      passwordHash: userPasswordHash,
      role: 'TRAINEE',
      requestedRole: 'TRAINEE',
      approvalStatus: 'APPROVED',
      profile: {
        create: {
          fullName: 'K. Selvam',
          jobDesignation: 'Meteorologist Gr-II',
          department: 'Cyclone Warning Centre, Chennai',
          yearsExperience: 5.0,
          qualifications: JSON.stringify(['M.Sc Atmospheric Physics']),
          skills: JSON.stringify(['Radar Operations', 'Marine Synoptics']),
          languagePref: 'ta',
          voiceOptIn: true,
          proctoringOptIn: true,
        },
      },
    },
  });

  // 2. Competencies
  const compGenMet = await prisma.competency.create({
    data: {
      code: 'MET-GEN-01',
      name: 'General Meteorology & Atmospheric Physics',
      category: 'Core Meteorology',
      description: 'Understanding atmospheric thermodynamics, hydrostatics, vorticity dynamics, and planetary boundary layer physics.',
    },
  });

  const compAgri = await prisma.competency.create({
    data: {
      code: 'MET-AGRI-02',
      name: 'Agricultural Meteorology & Crop Micrometeorology',
      category: 'Applied Meteorology',
      description: 'Evapotranspiration modeling, soil moisture telemetry, drought indices, and district-level Agromet Advisory Services (AAS).',
    },
  });

  const compInst = await prisma.competency.create({
    data: {
      code: 'MET-INST-03',
      name: 'Meteorological Instrumentation & Calibration',
      category: 'Instruments & Hardware',
      description: 'Operation, calibration, diagnostics, and telemetry verification for surface sensors, AWS, and upper air soundings.',
    },
  });

  const compRadarSat = await prisma.competency.create({
    data: {
      code: 'MET-RADSAT-04',
      name: 'Doppler Radar & Satellite Remote Sensing',
      category: 'Remote Sensing',
      description: 'Interpretation of DWR reflectivity, radial velocity, polarimetric parameters, and INSAT-3D/3DR multi-spectral channels.',
    },
  });

  const compSynoptic = await prisma.competency.create({
    data: {
      code: 'MET-SYN-05',
      name: 'Synoptic Analysis & Extreme Weather Forecasting',
      category: 'Operational Forecasting',
      description: 'Tropical cyclone tracking, Dvorak analysis, monsoon depression diagnostics, nowcasting, and impact-based warnings.',
    },
  });

  const compTelecom = await prisma.competency.create({
    data: {
      code: 'MET-TEL-06',
      name: 'Telecommunication, WIS-2.0 & Data Networks',
      category: 'Communications & IT',
      description: 'WMO BUFR/GRIB2 protocols, real-time message switching systems, cloud data ingestion, and cybersecurity.',
    },
  });

  // 3. Define All 8 Courses from Official Government Table
  const coursesData = [
    {
      code: 'IMD-MET-GR2',
      title: 'Meteorologist Gr-II Training Course',
      durationWeeks: 52,
      isLongDuration: true,
      description: '12-month foundational and specialized training for freshly recruited Trainee Meteorologist Gr-II (Group-A, via UPSC). Covers General Meteorology, Agri-Met, Instruments & Comms, Advanced Thermodynamics, Synoptic Dynamics, Radar/Satellite Remote Sensing, and NWP modeling.',
      targetAudience: 'Freshly recruited Trainee Meteorologist Gr-II (Group-A, via UPSC)',
      disciplines: 'General Meteorology, Agri-Met, Instruments & Comms',
      lessons: [
        { seq: 1, title: 'Atmospheric Thermodynamics & Hydrostatic Balance' },
        { seq: 2, title: 'Dynamic Meteorology & Vorticity Equations' },
        { seq: 3, title: 'Synoptic Meteorology & Monsoon Circulations' },
        { seq: 4, title: 'Agricultural Meteorology & Crop Micrometeorology' },
        { seq: 5, title: 'Doppler Weather Radar & Dual-Polarization Remote Sensing' },
        { seq: 6, title: 'INSAT-3D/3DR Satellite Image Processing & RGB Composites' },
        { seq: 7, title: 'Numerical Weather Prediction & Data Assimilation' },
        { seq: 8, title: 'Aviation Meteorological Standards & Extreme Weather Warnings' },
      ],
    },
    {
      code: 'IMD-IMTC-SA',
      title: 'Integrated Meteorological Training Course (IMTC)',
      durationWeeks: 17,
      isLongDuration: true,
      description: '4-month integrated training for freshly recruited Scientific Assistants (Group-B, via SSC). Unifies surface observations, upper-air soundings, automated weather stations, radar operations, communication protocols, and basic forecasting assistance.',
      targetAudience: 'Freshly recruited Scientific Assistants (Group-B, via SSC)',
      disciplines: 'All disciplines integrated',
      lessons: [
        { seq: 1, title: 'Surface Meteorological Instrumentation & AWS Sensor Calibration' },
        { seq: 2, title: 'Upper Air Observations: Radiosonde, GPS Sonde & Pilot Balloon' },
        { seq: 3, title: 'Surface Observation Encoding (SYNOP, METAR & SPECI Standards)' },
        { seq: 4, title: 'Agrometeorological Field Station Operations & Soil Moisture Probes' },
        { seq: 5, title: 'Doppler Radar & Satellite Ingestion, Display & Quality Control' },
        { seq: 6, title: 'Meteorological Telecommunications (AMSS/WIS) & Data Archival' },
      ],
    },
    {
      code: 'IMD-INTER-MET',
      title: 'Intermediate Training Course',
      durationWeeks: 17,
      isLongDuration: true,
      description: '4-month professional elevation training for Scientific Assistants promoted from Senior Observer. Deepens understanding of meteorological theory, modern electronic sensor maintenance, telemetry diagnostics, and radar/satellite interpretation.',
      targetAudience: 'Scientific Assistants promoted from Senior Observer',
      disciplines: 'General Meteorology, Instruments & Comms',
      lessons: [
        { seq: 1, title: 'Atmospheric Physics, Pressure Systems & Air Masses' },
        { seq: 2, title: 'Electronic Sensors, Calibrators & AWS Data Loggers' },
        { seq: 3, title: 'Upper-Air Thermodynamic Soundings & Tephigram / Skew-T Plotting' },
        { seq: 4, title: 'Radar Reflectivity (dBZ) & Doppler Velocity Interpretation' },
        { seq: 5, title: 'INSAT-3DR Satellite Cloud Types & Thermal Infrared Channels' },
        { seq: 6, title: 'Aviation Weather Station Operations & Aerodrome Safeguarding' },
      ],
    },
    {
      code: 'IMD-FTC-GAZ',
      title: 'Forecasters Training Course (FTC)',
      durationWeeks: 26,
      isLongDuration: true,
      description: '6-month intensive operational forecasting specialization for Group-B gazetted officers (Met-A/B) moving to Group-A. Focuses on synoptic chart diagnostic analysis, tropical cyclogenesis, Dvorak classification, monsoon nowcasting, and extreme weather impact warnings.',
      targetAudience: 'Group-B gazetted officers (Met-A/B) moving to Group-A',
      disciplines: 'General Meteorology',
      lessons: [
        { seq: 1, title: 'Advanced Synoptic Analysis & Multi-Level Constant Pressure Charts' },
        { seq: 2, title: 'Tropical Cyclogenesis, Dvorak T-Number & Storm Surge Modeling' },
        { seq: 3, title: 'Severe Convective Storm Nowcasting & Mesoscale Convective Systems (MCS)' },
        { seq: 4, title: 'Southwest & Northeast Monsoon Forecasting (MJO, IOD & ENSO Dynamics)' },
        { seq: 5, title: 'Multi-Model Ensemble (MME) Weather Prediction & Bias Correction' },
        { seq: 6, title: 'Impact-Based Forecasts & Extreme Weather Early Warning Protocols' },
      ],
    },
    {
      code: 'IMD-ATICIS-TECH',
      title: 'Advanced Training in Instruments, Comm. & Info Systems (ATICIS)',
      durationWeeks: 26,
      isLongDuration: true,
      description: '6-month technical mastery program for Group-B gazetted officers (Met-A/B) specializing in hardware instrumentation, radar transmitters, satellite earth receiving stations, telecom networking, WMO WIS-2.0, and cloud telemetry infrastructure.',
      targetAudience: 'Group-B gazetted officers (Met-A/B)',
      disciplines: 'Instruments, Communication & Info Systems',
      lessons: [
        { seq: 1, title: 'Doppler Weather Radar Hardware: Transmitters, Waveguides & Antennas' },
        { seq: 2, title: 'Satellite Ground Receiving Stations & Direct Broadcast Ingestion' },
        { seq: 3, title: 'Automated Weather Stations (AWS), Agro-AWS & High Wind Speed Recorders' },
        { seq: 4, title: 'Optical Present Weather Sensors, Ceilometers & Transmissometers (RVR)' },
        { seq: 5, title: 'WMO WIS-2.0 Architecture, MQTT Telemetry & High-Performance Computing' },
        { seq: 6, title: 'Cybersecurity, Network Redundancy & Real-Time Data Ingestion Pipelines' },
      ],
    },
    {
      code: 'IMD-AMTC-DEF',
      title: 'Advanced Meteorological Training Course (AMTC)',
      durationWeeks: 52,
      isLongDuration: true,
      description: '12-month premier advanced training for Group-A officers from Indian Navy, Indian Coast Guard, and NMHS officers of neighbouring countries (WMO Regional Association II). Covers marine meteorology, ocean wave modeling, tropical cyclone track prediction, and strategic briefing.',
      targetAudience: 'Group-A officers from Navy/Coast Guard/neighbouring-country NMHS',
      disciplines: 'General Meteorology, Agri-Met, Instruments & Comms',
      lessons: [
        { seq: 1, title: 'Marine Meteorology, Coastal Oceanography & Sea State Modeling' },
        { seq: 2, title: 'Tropical Meteorology & Cyclone Vortex Tracking for Maritime Operations' },
        { seq: 3, title: 'Atmospheric Boundary Layer, Evaporation Inversion & Radar Ducting' },
        { seq: 4, title: 'Space-Based Ocean Remote Sensing & Scatterometer Surface Winds' },
        { seq: 5, title: 'High-Resolution NWP Mesoscale Modeling for Littoral & Island Domains' },
        { seq: 6, title: 'Agricultural & Hydrological Meteorology in Disaster Management' },
        { seq: 7, title: 'Strategic Operational Briefing & WMO/ESCAP Cyclone Panel Protocols' },
      ],
    },
    {
      code: 'IMD-ORIENT-MTS',
      title: 'Orientation Training Course',
      durationWeeks: 13,
      isLongDuration: false,
      description: '3-month foundational orientation course for Multi-Tasking Staff (MTS) and part-time meteorological observers. Covers standard observational practices, rain gauge measurements, thermometer reading, Beaufort wind estimation, and station maintenance.',
      targetAudience: 'Multi-Tasking Staff (MTS) & part-time observers',
      disciplines: 'Observation, Basic Met Theory',
      lessons: [
        { seq: 1, title: 'Introduction to India Meteorological Department & Station Observatories' },
        { seq: 2, title: 'Standard Rain Gauge (SRG) & Self-Recording Rain Gauge Operations' },
        { seq: 3, title: 'Stevenson Screen Thermometers: Max, Min, Dry & Wet Bulb Readings' },
        { seq: 4, title: 'Wind Vane & Cup Anemometer Visual Readings & Beaufort Wind Scale' },
        { seq: 5, title: 'Observational Register Logging, Transmission & Station Maintenance' },
      ],
    },
    {
      code: 'IMD-REF-SHORT',
      title: 'Short-Term Customized / Refresher Courses',
      durationWeeks: 2,
      isLongDuration: false,
      description: '1 to 2-week targeted refresher modules for in-service IMD officials who have completed long-term training and possess 5+ years field experience. Features rapid updates on dual-polarization radar, nowcasting, flash flood guidance, and urban sensor networks.',
      targetAudience: 'Officials who completed a long-term course, 5+ yrs experience',
      disciplines: 'Topic-specific (Radar, Cyclone, Nowcasting, Flash Flood)',
      lessons: [
        { seq: 1, title: 'Dual-Polarization Doppler Weather Radar (ZDR, KDP, CC) Interpretation' },
        { seq: 2, title: 'Rapid-Scan Satellite Image Processing for Severe Storm Nowcasting' },
        { seq: 3, title: 'Flash Flood Guidance System (FFGS) & Soil Moisture Deficit Modeling' },
        { seq: 4, title: 'Urban Meteorological Observation & High-Density AWS Networks' },
        { seq: 5, title: 'Advanced Aviation Forecasting: SIGWX Charts, GRIB2 Wind-Temp & RVR Nowcasting' },
      ],
    },
  ];

  // Helper to create rich markdown text notes in English, Hindi, and Tamil
  const createDetailedNotes = (courseTitle: string, lessonTitle: string, seq: number) => {
    return `## ${courseTitle}
### Lesson ${seq}: ${lessonTitle}

---

#### 1. Theoretical Foundations & Scientific Principles
In modern meteorological operations across the **India Meteorological Department (IMD)**, precise physical measurements and diagnostic modeling are essential for accurate forecasting and disaster mitigation.

##### Key Atmospheric Principles:
1. **Hydrostatic Equation & Hypsometry**:
   $$\\frac{\\partial p}{\\partial z} = -\\rho g = -\\frac{p g}{R_d T_v}$$
   Geopotential thickness between pressure levels $p_1$ and $p_2$:
   $$\\Delta \\Phi = R_d \\bar{T}_v \\ln\\left(\\frac{p_1}{p_2}\\right)$$

2. **Geostrophic Balance & Thermal Wind**:
   $$f u_g = -\\frac{1}{\\rho} \\frac{\\partial p}{\\partial y}, \\quad f v_g = \\frac{1}{\\rho} \\frac{\\partial p}{\\partial x}$$
   Vertical shear of geostrophic wind is directly proportional to horizontal temperature gradient:
   $$\\frac{\\partial \\mathbf{V}_g}{\\partial \\ln p} = -\\frac{R_d}{f} \\mathbf{k} \\times \\nabla_p T$$

---

#### 2. Operational Procedures & WMO Protocols
- **Instrument Precision**: Sensors calibrated per WMO Guide to Instruments and Methods of Observation (WMO-No. 8).
- **Surface Observation Encoding**: Real-time generation of standard SYNOP, METAR, and SPECI telegrams.
- **Telemetry Validation**: Verification of Automated Weather Station (AWS) data loggers, battery bus voltages, and GSM/GPRS satellite telemetry uplinks.
- **Doppler Radar & Satellite Diagnostics**: Multi-scale analysis combining S-Band/C-Band DWR reflectivity (dBZ), radial velocity ($V$), and INSAT-3DR rapid-scan infrared imagery.

---

#### 3. Standard IMD Observation Thresholds
| Parameter | Standard Height / Sensor | Accuracy Standard | Reporting Interval |
| :--- | :--- | :--- | :--- |
| **Surface Air Temp** | 1.25 m (Stevenson Screen) | ±0.1 °C | Hourly / Synoptic |
| **Atmospheric Pressure** | Digital Barometer (Cistern level) | ±0.1 hPa | Hourly |
| **Wind Speed & Direction** | 10 m AGL (Cup Anemometer & Vane) | ±0.5 m/s, ±3° | Continuous / 3-sec gust |
| **Rainfall Accumulation** | Standard Rain Gauge (30 cm rim) | ±0.1 mm | Daily 08:30 IST / Hourly |
| **Upper Air PTU** | GPS-Radiosonde (403 MHz) | ±0.2 °C, ±0.5 hPa | 00:00 & 12:00 UTC |

---

#### 4. Summary & Practical Checklist
- Ensure clean sensor housing, calibrated zero baselines, and certified test instruments.
- Follow quality-control flags before ingesting data into the **WMO Information System (WIS-2.0)** pipeline.
`;
  };

  // 4. Iterate and Seed All Courses
  for (let cIdx = 0; cIdx < coursesData.length; cIdx++) {
    const cData = coursesData[cIdx];
    const trainer = cIdx % 2 === 0 ? trainer1 : trainer2;

    const course = await prisma.course.create({
      data: {
        code: cData.code,
        title: cData.title,
        description: cData.description,
        durationWeeks: cData.durationWeeks,
        isLongDuration: cData.isLongDuration,
        status: 'PUBLISHED',
        trainerId: trainer.id,
      },
    });

    // Competency linkage
    const compToLink = cIdx % 2 === 0 ? [compGenMet.id, compInst.id, compRadarSat.id] : [compSynoptic.id, compAgri.id, compTelecom.id];
    for (const compId of compToLink) {
      await prisma.courseCompetency.create({
        data: {
          courseId: course.id,
          competencyId: compId,
        },
      });
    }

    // Seed 5 to 8 Lessons for each course
    for (let lIdx = 0; lIdx < cData.lessons.length; lIdx++) {
      const lData = cData.lessons[lIdx];

      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sequence: lData.seq,
          title: lData.title,
          description: `Detailed operational lesson on ${lData.title} tailored for ${cData.targetAudience}.`,
        },
      });

      // Modules: Markdown Text Notes Module + Video Lecture Module
      await prisma.module.create({
        data: {
          lessonId: lesson.id,
          sequence: 1,
          title: `${lData.title} - Official Study Notes`,
          contentType: 'NOTES_TEXT',
          formattedText: createDetailedNotes(cData.title, lData.title, lData.seq),
          language: 'en',
        },
      });

      await prisma.module.create({
        data: {
          lessonId: lesson.id,
          sequence: 2,
          title: `${lData.title} - Interactive Video Lecture`,
          contentType: 'VIDEO',
          fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          language: 'en',
        },
      });

      // Assessment for Lesson (30 to 45 MCQ Questions per assessment)
      const assessment = await prisma.assessment.create({
        data: {
          lessonId: lesson.id,
          title: `${lData.title} - Knowledge Assessment`,
          description: `Comprehensive 35-question MCQ examination evaluating operational competency in ${lData.title}. Strict proctoring enabled.`,
          passingPercent: 50.0,
          isStrictProctored: true,
        },
      });

      // Create 35 MCQ questions for this assessment
      const questionsData = generateQuestionsForCourse(cIdx, assessment.id, cData.code);
      await prisma.question.createMany({
        data: questionsData,
      });
    }

    // Auto-enroll sample trainees into first 3 courses
    if (cIdx < 4) {
      await prisma.enrollment.create({
        data: {
          userId: trainee1.id,
          courseId: course.id,
          progressPercent: cIdx === 0 ? 80.0 : 25.0,
        },
      });

      await prisma.enrollment.create({
        data: {
          userId: trainee2.id,
          courseId: course.id,
          progressPercent: cIdx === 0 ? 100.0 : 50.0,
          grade: cIdx === 0 ? 'OUTSTANDING' : undefined,
          finalScore: cIdx === 0 ? 94.5 : undefined,
          completedAt: cIdx === 0 ? new Date() : undefined,
        },
      });
    }
  }

  // Create sample certificate for trainee2 in Course 1
  const firstCourse = await prisma.course.findFirst({ where: { code: 'IMD-MET-GR2' } });
  if (firstCourse) {
    await prisma.certificate.create({
      data: {
        certificateCode: 'IMD-CERT-2026-9081',
        userId: trainee2.id,
        courseId: firstCourse.id,
        traineeName: 'K. Selvam',
        courseTitle: firstCourse.title,
        finalScore: 94.5,
        grade: 'OUTSTANDING',
        qrCodeUrl: 'http://localhost:5173/verify/IMD-CERT-2026-9081',
        pdfFileUrl: '/certificates/sample.pdf',
      },
    });
  }

  console.log('✅ Successfully seeded all 8 official IMD courses, 5-8 lessons each, rich study notes, and 35+ MCQ questions per assessment!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

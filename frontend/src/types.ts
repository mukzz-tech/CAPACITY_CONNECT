export interface UserProfile {
  fullName: string;
  jobDesignation: string;
  department?: string;
  yearsExperience: number;
  qualifications?: string[];
  skills?: string[];
  avatarUrl?: string;
  languagePref: string;
  voiceOptIn: boolean;
  proctoringOptIn: boolean;
}

export interface User {
  id: string;
  email: string;
  role: 'TRAINEE' | 'TRAINER' | 'ADMIN';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  profile?: UserProfile;
}

export interface Competency {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface Lesson {
  id: string;
  sequence: number;
  title: string;
  description?: string;
  modules?: Module[];
  assessments?: AssessmentSummary[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  durationWeeks: number;
  isLongDuration: boolean;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  adminReviewNote?: string;
  trainerId: string;
  trainer?: {
    email: string;
    profile?: {
      fullName: string;
      jobDesignation: string;
    };
  };
  competencies?: Array<{ competency: Competency }>;
  lessons?: Lesson[];
  prerequisites?: Array<{
    minYearsExpRequired: number;
    prerequisiteCourse: { id: string; title: string; code: string };
  }>;
  _count?: {
    enrollments: number;
    lessons: number;
  };
}

export interface Module {
  id: string;
  sequence: number;
  title: string;
  contentType: 'VIDEO' | 'NOTES_DOC' | 'NOTES_TEXT' | 'AUDIO';
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  formattedText?: string;
  language: string;
}

export interface AssessmentSummary {
  id: string;
  title: string;
  passingPercent: number;
  isStrictProctored: boolean;
}

export interface Question {
  id: string;
  sequence: number;
  questionType: 'MCQ' | 'FILL_BLANK' | 'MATCH_FOLLOWING' | 'VOICE_ANSWER';
  prompt: string;
  marks: number;
  options?: Array<{ id: string; text: string }>;
  matchPairs?: {
    leftItems: string[];
    rightItems: string[];
  };
  voiceKeywordPrompt?: string;
}

export interface Certificate {
  id: string;
  certificateCode: string;
  courseTitle: string;
  traineeName: string;
  finalScore: number;
  grade: string;
  issueDate: string;
  qrCodeUrl: string;
  pdfFileUrl: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: number;
  createdAt: string;
}

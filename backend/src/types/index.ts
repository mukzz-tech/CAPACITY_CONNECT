export enum UserRole {
  TRAINEE = 'TRAINEE',
  TRAINER = 'TRAINER',
  ADMIN = 'ADMIN',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

export enum ContentType {
  VIDEO = 'VIDEO',
  NOTES_DOC = 'NOTES_DOC',
  NOTES_TEXT = 'NOTES_TEXT',
  AUDIO = 'AUDIO',
}

export enum QuestionType {
  MCQ = 'MCQ',
  FILL_BLANK = 'FILL_BLANK',
  MATCH_FOLLOWING = 'MATCH_FOLLOWING',
  VOICE_ANSWER = 'VOICE_ANSWER',
}

export enum PassingGrade {
  OUTSTANDING = 'OUTSTANDING', // 90+
  EXCELLENT = 'EXCELLENT',     // 80.1 - 89.9
  VERY_GOOD = 'VERY_GOOD',     // 70 - 80
  GOOD = 'GOOD',               // 60 - 69.9
  PASSED = 'PASSED',           // 50 - 59.9
  FAILED = 'FAILED',           // < 50
}

export enum FlagType {
  NO_FACE_DETECTED = 'NO_FACE_DETECTED',
  FACE_TURNED_AWAY = 'FACE_TURNED_AWAY',
  MULTIPLE_FACES_DETECTED = 'MULTIPLE_FACES_DETECTED',
}

export interface McqOption {
  id: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: string;
  approvalStatus: string;
}

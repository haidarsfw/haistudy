// ============================================
// haistudy - Core Type Definitions
// ============================================

export interface Session {
  licenseKey: string;
  name: string;
  isAdmin: boolean;
  isTester: boolean;
  expiry: string | null;
  selectedClass: string;
  isPreview?: boolean;
  packageTier: "share" | "normal" | "vip";
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  icon: string; // Lucide icon name
  description: string;
  color: string; // Tailwind color class
}

export interface Schedule {
  subject: string;
  subjectId: string;
  day: string;
  startTime: string;
  endTime: string;
  sessions: number;
  examDate?: string; // ISO datetime for UTS
  examType?: "onsite" | "online";
  examNote?: string;
}

export interface MateriItem {
  id: number;
  title: string;
  driveId: string;
  type: "slides" | "pdf" | "drive-pptx" | "drive-pdf" | "drive-gslides" | "drive-gdoc";
  session?: string;
  xp?: number;
}

export interface KisiKisiItem {
  topic: string;
  items: string[];
}

export interface FlashcardItem {
  id: number;
  term: string;
  definition: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number; // 0-indexed
  category: string; // Module/category name for weighted scoring
}

export interface SubjectContent {
  materi: MateriItem[];
  kisiKisi: KisiKisiItem[];
  kisiKisiNote?: string;
  flashcards: FlashcardItem[];
  quiz: QuizQuestion[];
}

export interface SubjectProgress {
  materi: number[]; // completed materi IDs
  flashcardsCompleted: boolean;
  quizScores: Record<string, { score: number; total: number }>;
}

export interface UserSettings {
  darkMode: boolean;
  theme: ThemeId;
  font: FontId;
  language: "id" | "en";
  selectedClass: string;
  reminder: string | null;
  hideStatus: boolean;
  hideStatusChangedAt: string | null;
  darkModeSchedule: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
  progress: Record<string, SubjectProgress>;
}

export interface OnlineUser {
  id: string;
  userName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  currentSubject: string | null;
  hideStatus: boolean;
  licenseKey: string;
  lastSeen: string;
  deviceCount: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: "text" | "image" | "audio" | "sticker";
  mediaUrl: string | null;
  authorId: string;
  authorName: string;
  authorClass: string;
  isAdmin: boolean;
  isTester: boolean;
  packageTier?: "share" | "normal" | "vip";
  deleted: boolean;
  replyToId: string | null;
  replyToName: string | null;
  replyToContent: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "mention" | "mention_all" | "thread_reply" | "announcement" | "forum_thread" | "poll_vote" | "poll_result" | "comment_reply";
  senderName: string | null;
  preview: string | null;
  context: "chat" | "forum" | "system";
  threadId: string | null;
  subjectId: string | null;
  threadTitle: string | null;
  read: boolean;
  createdAt: string;
}

export interface VoiceRoom {
  id: string;
  name: string;
  description: string | null;
  maxParticipants: number;
  participants: VoiceParticipant[];
  creatorId: string | null;
  creatorName: string | null;
  isLocked: boolean;
  isCustom: boolean;
}

export interface VoiceParticipant {
  id: string;
  userName: string;
  licenseKey: string | null;
  joinedAt: string;
}

export interface PurchaseRequest {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  package: "discount" | "normal" | "free";
  status: "pending" | "approved" | "rejected";
  licenseKey: string | null;
  approvedAt: string | null;
  createdAt: string;
}

// ============================================
// Forum types
// ============================================

export interface ForumThread {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorClass: string;
  isAdmin: boolean;
  isTester: boolean;
  packageTier?: "share" | "normal" | "vip";
  imageUrl: string | null;
  mediaUrl: string | null;
  closed: boolean;
  commentCount: number;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  threadId: string;
  content: string;
  imageUrl: string | null;
  authorId: string;
  authorName: string;
  authorClass: string;
  isAdmin: boolean;
  isTester: boolean;
  packageTier?: "share" | "normal" | "vip";
  parentCommentId: string | null;
  createdAt: string;
  replies?: ForumComment[];
}

export interface ForumPoll {
  id: string;
  subjectId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  authorId: string;
  authorName: string;
  active: boolean;
  createdAt: string;
  userVote?: number | null;
}

export interface PollOption {
  text: string;
  votes: number;
}

// ============================================
// Admin types
// ============================================

export interface LicenseKey {
  key: string;
  name: string;
  daysActive: number;
  isAdmin: boolean;
  isTester: boolean;
  packageTier: "share" | "normal" | "vip";
  maxDevices: number;
  unlimitedDevices: boolean;
  fixedExpiry: string | null;
  suspendedUntil: string | null;
  totalQuizScore: number;
  totalOnlineMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activation {
  id: string;
  licenseKey: string;
  userName: string;
  email: string | null;
  expiry: string | null;
  referralCode: string | null;
  referralCount: number;
  referredBy: string | null;
  activatedAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  activationId: string;
  deviceId: string;
  deviceType: "desktop" | "mobile" | "tablet";
  deviceLabel: string | null;
  isPrimary: boolean;
  verified: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userName: string | null;
  action: string;
  details: string | null;
  count: number;
  ipAddress: string | null;
  deviceType: string | null;
  deviceLabel: string | null;
  createdAt: string;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  userAgent: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  message: string;
  type: "info" | "warning" | "maintenance";
  active: boolean;
  createdAt: string;
}

export interface InvoiceCounter {
  id: string;
  value: number;
  updatedAt: string;
}

export interface UserProfile {
  email: string | null;
  phone: string | null;
}

// Theme & font type unions
export type ThemeId = "ocean" | "scholarly" | "espresso" | "forest" | "midnight" | "rosewood" | "stone";
export type FontId = "jakarta" | "inter" | "poppins";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  color: string;
}

export interface FontOption {
  id: FontId;
  name: string;
}

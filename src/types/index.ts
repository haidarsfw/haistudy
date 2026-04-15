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
  packageTier: "share" | "normal" | "vip" | "diamond";
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
  sectionLabel?: string;
  sectionNote?: string;
}

export interface KisiKisiAttachment {
  title: string;
  driveId: string;
  type: "drive-gdoc" | "drive-pdf" | "drive-gslides" | "drive-pptx";
}

export interface KisiKisiItem {
  topic: string;
  items: string[];
  attachments?: KisiKisiAttachment[];
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
  explanation?: string;
  category: string; // Module/category name for weighted scoring
}

export interface SubjectContent {
  materi: MateriItem[];
  kisiKisi: KisiKisiItem[];
  kisiKisiNote?: string;
  kisiKisiInfo?: { label: string; value: string }[];
  kisiKisiAttachments?: KisiKisiAttachment[];
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
  notes?: Record<string, string>; // subjectId -> note content, synced to DB
  recentSubjects?: string[]; // last visited subject IDs (most recent first)
  countdownDetailed?: boolean; // true = Hari>Jam>Menit>Detik, false = Hari>Jam
  streak?: {
    currentStreak: number;
    bestStreak: number;
    lastActiveDate: string | null;
    activeDates: string[];
  } | null;
}

export interface OnlineUser {
  id: string;
  userName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  deviceTypes?: ("desktop" | "mobile" | "tablet")[];
  currentSubject: string | null;
  hideStatus: boolean;
  licenseKey: string;
  lastSeen: string;
  deviceCount: number;
  isAdmin?: boolean;
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
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
  packageTier?: "share" | "normal" | "vip" | "diamond";
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
  messageId: string | null;
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
  isAdmin?: boolean;
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
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

export type AttachmentType = "image" | "youtube" | "google-slides" | "google-pdf" | "link";

export interface Attachment {
  type: AttachmentType;
  url: string;
  label?: string;
}

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
  packageTier?: "share" | "normal" | "vip" | "diamond";
  imageUrl: string | null;
  mediaUrl: string | null;
  attachments?: Attachment[];
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
  packageTier?: "share" | "normal" | "vip" | "diamond";
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
  isAdmin?: boolean;
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
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
  packageTier: "share" | "normal" | "vip" | "diamond";
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

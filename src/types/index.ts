// ============================================
// haistudy - Core Type Definitions
// ============================================

import type { ScopeTuple, ScopeKey, ExamPeriod } from "@/types/scope";

export interface Session {
  licenseKey: string;
  name: string;
  // Short name / nickname shown everywhere in-app. Resolved at session build:
  // activation.short_name || license.short_name || firstWord(name). Never empty.
  shortName: string;
  isAdmin: boolean;
  isTester: boolean;
  expiry: string | null;
  selectedClass: string;
  isPreview?: boolean;
  packageTier: "share" | "normal" | "vip" | "diamond";
  // How the user logs in: 'key' = license key (carries the 30-day activation +
  // idle timeout), 'email' = Google sign-in (no expiry, no idle logout).
  loginMethod?: "key" | "email";
  // Bound at activation, immutable per session. Backfilled to (2,uts,bm)
  // for sessions stored before this field existed.
  scope: ScopeTuple;
  scopeKey: ScopeKey;
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
  examDate?: string; // ISO datetime (local WIB). For onsite = start; for online/assignment = deadline.
  examType?: "onsite" | "online" | "assignment";
  examNote?: string;
  /** Theory/assessment descriptor, e.g. "Theory: Final Exam", "AOL Group Project". */
  examFormat?: string;
  /** Submission/exam portal URL. When set, the card links here instead of the default BINUS portal. */
  examLink?: string;
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
  /** Surface this item under its own subject tab instead of "Materi". */
  tab?: "diktat" | "soal";
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
  /** Section group label (e.g. "A. TOPIK STUDI KASUS"). Consecutive items
   * sharing a section render under one section header. */
  section?: string;
  /** Display number within the section (e.g. "1", "2"). */
  number?: string;
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

// ============================================
// Belajar Kilat - swipe-feed learning mode
// ============================================

export interface KilatScenarioChoice {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface KilatMatchPair {
  term: string;
  def: string;
}

export interface KilatSwipeStatement {
  text: string;
  isTrue: boolean;
  note?: string;
}

export interface KilatCategorizeItem {
  text: string;
  bucket: number; // index into the card's buckets[]
}

export interface KilatHotspot {
  // Percent-based box on the image (0-100), so it scales with any render size.
  x: number;
  y: number;
  w: number;
  h: number;
  correct: boolean;
  label?: string;
}

export interface KilatPromptOption {
  text: string;
  better: boolean;
}

/**
 * One beat in the Belajar Kilat feed. `chapter` is 1-based and maps to a module
 * (used for the Stories-style segmented progress bar).
 *
 * Graded cards (count toward the score): check, scenario, fill, checkpoint, multi,
 * order, categorize, swipe, calc, table(mode "fill"), hotspot, prompt.
 * Ungraded: intro, explain, quote, match, table(mode "walkthrough").
 */
export type KilatCard =
  | { kind: "intro"; id: string; chapter: number; title: string; subtitle?: string }
  | { kind: "explain"; id: string; chapter: number; heading: string; body: string; icon?: string; tag?: string }
  | { kind: "quote"; id: string; chapter: number; text: string; source?: string }
  | { kind: "check"; id: string; chapter: number; question: string; options: string[]; answer: number; explain: string; tag?: string }
  | {
      kind: "scenario";
      id: string;
      chapter: number;
      situation: string;
      tag?: string;
      choices: KilatScenarioChoice[];
      // Optional one-step branch: after answering, a follow-up dilemma appears.
      follow?: { situation: string; choices: KilatScenarioChoice[] };
    }
  | { kind: "match"; id: string; chapter: number; prompt?: string; pairs: KilatMatchPair[] }
  | { kind: "fill"; id: string; chapter: number; before: string; after: string; options: string[]; answer: number; explain?: string }
  | { kind: "checkpoint"; id: string; chapter: number; title: string; question: string; options: string[]; answer: number; explain: string }
  // ---- v2 minigames ----
  | { kind: "multi"; id: string; chapter: number; question: string; options: string[]; answers: number[]; explain: string; tag?: string }
  | { kind: "order"; id: string; chapter: number; prompt: string; steps: string[]; explain?: string; tag?: string }
  | { kind: "categorize"; id: string; chapter: number; prompt: string; buckets: string[]; items: KilatCategorizeItem[]; explain?: string; tag?: string }
  | { kind: "swipe"; id: string; chapter: number; prompt?: string; statements: KilatSwipeStatement[]; tag?: string }
  | { kind: "calc"; id: string; chapter: number; question: string; formula?: string; mode: "pick"; options: string[]; answer: number; unit?: string; steps?: string[]; explain: string; tag?: string }
  | { kind: "calc"; id: string; chapter: number; question: string; formula?: string; mode: "type"; answer: string; unit?: string; steps?: string[]; explain: string; tag?: string }
  | { kind: "table"; id: string; chapter: number; title?: string; columns?: string[]; rows: (string | number)[][]; mode: "walkthrough"; notes?: string[]; explain?: string; tag?: string }
  | { kind: "table"; id: string; chapter: number; title?: string; columns?: string[]; rows: (string | number)[][]; mode: "fill"; blank: [number, number]; options: string[]; answer: number; explain: string; tag?: string }
  | { kind: "hotspot"; id: string; chapter: number; question: string; image: string; spots: KilatHotspot[]; explain: string; tag?: string }
  | { kind: "prompt"; id: string; chapter: number; goal: string; options: KilatPromptOption[]; explain: string; tag?: string };

export interface KilatChapter {
  /** 1-based chapter number; matches the `chapter` on its cards. */
  n: number;
  title: string;
  subtitle?: string;
}

export interface SubjectKilat {
  subjectId: string;
  title: string;
  chapters: KilatChapter[];
  cards: KilatCard[];
}

/** Per-subject Belajar Kilat progress, nested under SubjectProgress.kilat. */
export interface KilatProgress {
  reached: number; // highest card index reached
  points: number; // points earned from graded cards
  answered: Record<string, boolean>; // graded cardId -> answered correctly?
  skipped: string[]; // force-skipped graded cardIds (count as 0, still in total)
  chaptersDone: number[]; // chapter numbers whose checkpoint was cleared
  completed: boolean;
}

export interface SubjectProgress {
  materi: number[]; // completed materi IDs
  flashcardsCompleted: boolean;
  quizScores: Record<string, { score: number; total: number }>;
  /** Belajar Kilat feed progress. Optional - only present once the user starts. */
  kilat?: KilatProgress;
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
  notifSoundEnabled?: boolean;
  notifBrowserEnabled?: boolean;
  notifPushEnabled?: boolean;
  notifEmailEnabled?: boolean;
  // VIP custom accent (HSL) - null = use preset theme primary
  customAccent?: CustomAccent | null;
  // Rangkuman highlights, keyed by `${scopeKey}:${subjectId}:${moduleKey}` -> UserHighlight[]
  highlights?: Record<string, UserHighlight[]>;
}

// ============================================
// Highlights (rangkuman) + custom accent
// ============================================

export type HighlightColor = "yellow" | "blue" | "green" | "pink" | "red";

export interface UserHighlight {
  id: string;
  text: string;
  color: HighlightColor;
  ttsLine: number; // index of the data-tts-line element the highlight starts in
  startOffset: number; // char offset within that line's text content
  endOffset: number;
  createdAt: string;
}

// VIP custom accent stored as HSL components (h 0-360, s/l 0-100).
export interface CustomAccent {
  h: number;
  s: number;
  l: number;
}

// A snippet saved to the VIP library - matches migration 028 schema.
export interface SnippetLibraryItem {
  id: string;
  snippetText: string;
  subjectId: string | null;
  sourceModule: string | null;
  color: HighlightColor | null;
  createdAt: string;
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

// Chat rooms within a scope. 'global' = everyone; 'vip-lounge' = VIP/admin only.
export type ChatChannel = "global" | "vip-lounge";

export interface ChatMessage {
  id: string;
  content: string;
  type: "text" | "image" | "audio";
  mediaUrl: string | null;
  authorId: string;
  authorName: string;
  authorClass: string;
  licenseKey?: string | null; // denormalized for profile popover; null on legacy rows
  isAdmin: boolean;
  isTester: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond";
  deleted: boolean;
  replyToId: string | null;
  replyToName: string | null;
  replyToContent: string | null;
  channel: ChatChannel;
  createdAt: string;
}

// ============================================
// Direct messages (VIP 1:1) - matches migration 030 schema
// ============================================

export interface DmConversation {
  id: string;
  participants: [string, string]; // sorted: participants[0] < participants[1]
  semester: number;
  examPeriod: ExamPeriod;
  jurusan: string;
  lastMessageAt: string;
  createdAt: string;
  // Client-derived (not columns):
  otherKey?: string;
  otherName?: string;
  otherTier?: "share" | "normal" | "vip" | "diamond" | null;
  otherIsAdmin?: boolean;
  otherOnline?: boolean;
  lastBody?: string | null;
  unreadCount?: number;
  // Last message is from the other person and arrived after my last-read pointer.
  unread?: boolean;
  // The other participant's last-read timestamp (for read receipts on my sends).
  otherLastReadAt?: string | null;
}

export interface DmMessage {
  id: string;
  conversationId: string;
  senderKey: string;
  senderName?: string | null;
  body: string;
  type: "text" | "image" | "audio";
  mediaUrl?: string | null;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToBody?: string | null;
  deleted?: boolean;
  pinned?: boolean;
  createdAt: string;
  // Client-only ephemeral:
  clientNonce?: string;
  status?: "sending" | "sent" | "error";
}

// A VIP/admin user surfaced in the DM directory (online or offline).
export interface DmDirectoryUser {
  licenseKey: string;
  name: string;
  packageTier: "share" | "normal" | "vip" | "diamond" | null;
  isAdmin: boolean;
  online: boolean;
}

export interface Notification {
  id: string;
  type:
    | "mention"
    | "mention_all"
    | "thread_reply"
    | "announcement"
    | "forum_thread"
    | "poll_vote"
    | "poll_result"
    | "comment_reply"
    | "support_message"
    | "dm_message"
    | "exam_quota";
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

export interface PushSubscriptionRecord {
  id: string;
  licenseKey: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  deviceId: string | null;
  createdAt: string;
  lastUsedAt: string;
  revokedAt: string | null;
}

export interface SupportMute {
  recipientLk: string;
  conversationLk: string;
  mutedAt: string;
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

// Rich metadata captured by the on-site /payments form (migration 037: meta jsonb).
export interface PurchaseMeta {
  classCode?: string;
  campus?: string;
  deviceLimit?: number;
  paymentMethod?: string;   // "bca" | "ewallet" | "qris"
  uniqueAmount?: number;    // basePrice + last 3 digits of WA
  basePrice?: number;
  source?: string;          // how they heard about haistudy
  sourceOther?: string;
  leShareNote?: string;     // LE86 share acknowledgement
  scopeKey?: string;        // e.g. "s2-uts-bm"
  // How the buyer chose to log in. 'key' = license key, 'email' = Google.
  loginMethod?: "key" | "email";
  // The Gmail used for Google login (only set when loginMethod === 'email').
  // Contact/notification email lives in the purchase_requests.email column.
  loginEmail?: string;
  // How the buyer fulfilled the Share requirement (Items 4/6).
  shareMethod?: "broadcast" | "story";
  // Per-period invoice/order number, assigned at APPROVE (not at submit), so
  // unverified / rejected orders never burn a number.
  orderNo?: number;
  // Short name / nickname supplied in the order form (shown everywhere in-app).
  nickname?: string;
  // ─── In-app exam-quota top-up orders (package = 'exam_quota') ───
  // Marks this as a quota top-up rather than an access purchase.
  kind?: "exam_quota";
  // Number of extra attempts being bought (1 / 3 / 7).
  quotaQty?: number;
  // Subject the top-up applies to (quota is per-matkul).
  subjectId?: string;
  // Human-readable subject name (shown in the admin queue).
  subjectName?: string;
}

export interface PurchaseRequest {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  // 'share'|'normal'|'vip'|'diamond' = on-site form tiers; 'discount'|'free' = legacy rows;
  // 'exam_quota' = in-app exam-quota top-up (meta.kind === 'exam_quota').
  package: "share" | "normal" | "vip" | "diamond" | "discount" | "free" | "exam_quota";
  status: "pending" | "approved" | "rejected";
  licenseKey: string | null;
  approvedAt: string | null;
  createdAt: string;
  semester: number;
  examPeriod: ExamPeriod;
  jurusan: string;
  meta?: PurchaseMeta;
  // Short-lived signed URLs to the private payment-proofs bucket (admin GET only).
  paymentProofUrl?: string | null;
  shareProofUrl?: string | null;
  shareProofUrl2?: string | null;
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
  isPinned?: boolean;
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
  shortName?: string | null;
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
  linkedEmail?: string | null;
  // null = legacy (both login paths allowed); 'key' = license-key only;
  // 'email' = Google login only. Bound at admin approval (migration 038).
  loginMethod?: "key" | "email" | null;
}

export interface Activation {
  id: string;
  licenseKey: string;
  userName: string;
  shortName?: string | null;
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
  avatarUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  customStatusEmoji?: string | null;
}

// Public-facing profile (returned by /api/profile/public, no email/phone).
export interface PublicProfile {
  licenseKey: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  customStatus: string | null;
  customStatusEmoji: string | null;
  selectedClass: string | null;
  packageTier: "share" | "normal" | "vip" | "diamond" | null;
  isAdmin: boolean;
}

// Theme & font type unions
export type ThemeId = "ocean" | "scholarly" | "espresso" | "forest" | "midnight" | "rosewood" | "stone" | "rose";
// VIP fonts (lora/jetbrains/quicksand/merriweather) lazy-loaded on selection.
export type FontId = "jakarta" | "inter" | "poppins" | "lora" | "jetbrains" | "quicksand" | "merriweather" | "times";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  color: string;
}

export interface FontOption {
  id: FontId;
  name: string;
  vip?: boolean; // requires VIP/admin tier
  // Google Fonts family + CSS var for lazy injection (VIP fonts only)
  googleFamily?: string;
  cssVar?: string;
}

// ============================================
// Support chat (v2) - admin↔user 1:1 thread
// ============================================

export type SupportMessageType = "text" | "image" | "audio" | "system";

export type SupportSendStatus = "sending" | "sent" | "error";

export interface SupportMessage {
  id: string;
  licenseKey: string;            // conversation owner
  content: string;
  type: SupportMessageType;
  mediaUrl: string | null;
  isAdmin: boolean;
  isSystem: boolean;
  senderName: string;
  authorLicenseKey: string | null;
  replyToId: string | null;
  replyToName: string | null;
  replyToContent: string | null;
  editedAt: string | null;
  deleted: boolean;
  unsentBy: string | null;       // license_key of admin who unsent (null = not unsent)
  unsentAt: string | null;
  isInternal: boolean;           // admin-only note, not visible to user
  createdAt: string;
  // Client-only ephemeral fields (never serialized to DB):
  clientNonce?: string;
  status?: SupportSendStatus;
}

export interface SupportReaction {
  id: string;
  messageId: string;
  licenseKey: string;
  reactorKey: string;
  reactorName: string;
  isAdmin: boolean;
  emoji: string;
  createdAt: string;
}

export type SupportReaderKind = "user" | "admin";

export interface SupportReadReceipt {
  id: string;
  licenseKey: string;
  messageId: string;
  readerKind: SupportReaderKind;
  readAt: string;
}

export interface SupportPresenceState {
  online: boolean;
  lastSeen: string | null;       // ISO; null = "never"
  kind: SupportReaderKind;
}

export interface SupportTypingState {
  isTyping: boolean;
  fromKind: SupportReaderKind;
  fromName: string;
  startedAt: string;
}

export interface SupportConversationSummary {
  licenseKey: string;
  userName: string;
  lastMessage: string;
  lastTime: string;
  messageCount: number;
  isResolved: boolean;
  unreadCount: number;
  isAdmin?: boolean;
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
}

export interface SupportPinnedMessage {
  id: string;
  messageId: string;
  licenseKey: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface SupportSearchHit {
  messageId: string;
  content: string;
  senderName: string;
  isAdmin: boolean;
  createdAt: string;
}

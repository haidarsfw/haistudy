// ============================================
// haistudy - Core Type Definitions
// ============================================

import type { ScopeTuple, ScopeKey, ExamPeriod } from "@/types/scope";

export interface Session {
  licenseKey: string;
  name: string;
  isAdmin: boolean;
  isTester: boolean;
  expiry: string | null;
  selectedClass: string;
  isPreview?: boolean;
  packageTier: "share" | "normal" | "vip" | "diamond";
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
    | "support_message";
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
}

export interface PurchaseRequest {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  // 'share'|'normal'|'vip'|'diamond' = on-site form tiers; 'discount'|'free' = legacy rows.
  package: "share" | "normal" | "vip" | "diamond" | "discount" | "free";
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

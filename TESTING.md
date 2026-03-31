# HaiStudy — Manual Testing Checklist

## Setup

- [ ] `npm install` completes without errors
- [ ] `.env.local` exists (or not — app works without it via mock mode)
- [ ] `npm run dev` starts on `localhost:3000`
- [ ] `npm run build` completes with 0 errors
- [ ] `npm run lint` returns only pre-existing warnings (23)

---

## 1. Landing Page (`/`)

- [ ] Hero section loads with scroll-reveal animations
- [ ] "haistudy" logo renders with primary color
- [ ] "Masuk" button links to `/login`
- [ ] "Preview Gratis" button links to `/preview`
- [ ] 6 feature cards render with staggered scroll reveal
- [ ] 2 pricing cards render (Normal + Diskon B29 with "Populer" badge)
- [ ] FAQ accordion items expand/collapse
- [ ] Footer shows copyright and device limit info
- [ ] Mobile (375px): all sections stack vertically, no horizontal overflow

---

## 2. Login (`/login`)

### Valid Keys
- [ ] `ADMIN1` → redirects to `/dashboard`, admin shield icon in header
- [ ] `PREVIEW01` → redirects to `/dashboard`, preview watermark visible
- [ ] `B29-ABC123` → redirects to `/dashboard`, normal user

### Invalid Keys
- [ ] Empty key → "Masukkan license key" error
- [ ] `INVALID` → error message with AnimatePresence fade-in
- [ ] 5 failed attempts → rate limit lockout with countdown timer

### UI
- [ ] Login form has scaleIn entrance animation
- [ ] "Punya kode referral?" expands referral input with AnimatePresence
- [ ] Submit button has hover lift + tap scale
- [ ] Error message slides in from top (fadeInDown)
- [ ] Back arrow navigates to landing page
- [ ] Dev hint shows `ADMIN1` / `PREVIEW01` in development

---

## 3. Preview Mode

- [ ] Login with `PREVIEW01`
- [ ] Preview watermark visible (semi-transparent overlay)
- [ ] All features accessible but in preview/mock mode
- [ ] No admin shield in header

---

## 4. Dashboard (`/dashboard`)

### Layout
- [ ] Greeting card shows time-appropriate greeting (Pagi/Siang/Sore/Malam)
- [ ] Greeting card has `shadow-warm` depth + floating progress ring
- [ ] Subject grid shows all subjects with staggered entrance animation
- [ ] Subject cards have hover lift + tap scale interaction
- [ ] Exam countdown widget renders (with pulse-glow when urgent)
- [ ] Online users widget shows list with staggered entrance
- [ ] Exam schedule section renders below

### Class Selector
- [ ] First login without class → class selector overlay appears
- [ ] Selecting class → dashboard loads

### Stagger Animation
- [ ] Dashboard sections cascade in on page load (greeting → grid → sidebar → schedule)

### Mobile (375px)
- [ ] Single column layout
- [ ] Bottom navigation visible
- [ ] Sidebar widgets stack below subjects

---

## 5. Subject Detail (`/subject/[id]`)

### Tab Navigation
- [ ] 6 tabs visible: Materi, Rangkuman, Kisi-Kisi, Flashcards, Quiz, Forum
- [ ] Active tab has sliding underline indicator (layoutId animation)
- [ ] Tab content transitions with fade + vertical slide (AnimatePresence)

### Materi Tab
- [ ] Module list renders with toggleable checkboxes
- [ ] Checking/unchecking persists completion state

### Rangkuman Tab
- [ ] Summary content renders with formatted HTML

### Kisi-Kisi Tab
- [ ] Exam topics list renders
- [ ] Note/disclaimer shown if present

### Flashcards Tab
- [ ] Cards render with spring-physics 3D flip (not CSS transition)
- [ ] Space/Enter flips card, Arrow keys navigate
- [ ] "Acak" shuffles cards
- [ ] "Sudah hafal" marks card complete
- [ ] Progress bar updates
- [ ] All cards marked → celebration with PartyPopper + staggered scale
- [ ] Card navigation uses AnimatePresence slide transitions

### Quiz Tab
- [ ] Idle state shows "Quiz Time!" with scaleIn animation
- [ ] "Mulai Quiz" button has hover/tap effects
- [ ] Timer counts down per question
- [ ] Questions transition with fadeInUp (AnimatePresence)
- [ ] Correct answer → green pop scale animation
- [ ] Wrong answer → red shake animation
- [ ] Timer expiry → auto-advance to next question
- [ ] Review state shows trophy with scaleIn + staggered category scores
- [ ] "Coba Lagi" has hover/tap effects

### Forum Tab
- [ ] Thread list loads (or empty state)
- [ ] "Buat Thread" button works
- [ ] Thread items have spring transition

### Personal Notes
- [ ] Collapsible "Catatan Pribadi" section on non-forum tabs
- [ ] Expandable details element

---

## 6. Chat Panel

### Opening
- [ ] Desktop: click chat FAB (bottom-right) → panel slides in from right
- [ ] Mobile: bottom nav chat icon → full-screen panel

### Messages
- [ ] Messages render with direction-based slide (own = right, other = left)
- [ ] Skeleton loading state (5 shimmer rows) while loading
- [ ] User avatars with initials
- [ ] Admin badge on admin messages
- [ ] Timestamps formatted as HH:mm
- [ ] @mention highlights in primary color

### Features
- [ ] Send text message
- [ ] Send image (file picker)
- [ ] Reply to message (reply preview shown)
- [ ] Pin/unpin message (admin only)
- [ ] Delete own messages
- [ ] Pinned messages section at top

### Close
- [ ] X button closes panel
- [ ] Mobile: backdrop click closes panel

---

## 7. AI Chat Panel

### Opening
- [ ] Desktop: click AI FAB → panel slides in
- [ ] Mobile: bottom nav AI icon → full-screen panel

### Suggestions
- [ ] Suggestion chips load with staggered entrance animation
- [ ] General suggestions shown when no subject context
- [ ] Subject-specific suggestions when on a subject page

### Chat
- [ ] Messages appear with spring-gentle transition
- [ ] User messages slide from right, AI from left
- [ ] Streaming: bouncing dots while AI responds
- [ ] Markdown rendering: bold, italic, inline code
- [ ] Clear conversation works

---

## 8. Voice Rooms

- [ ] Room list renders with fadeInUp entrance
- [ ] Live rooms show pulsing green badge
- [ ] Join button has hover lift + tap scale
- [ ] Full room shows "Penuh" disabled state
- [ ] Active room shows "Di sini" badge
- [ ] Participant avatars shown (max 5 + overflow count)

---

## 9. Settings Modal

### Opening
- [ ] Click gear icon in header → modal opens
- [ ] Sections stagger in with animation

### Appearance
- [ ] 6 theme colors: pick each → accent color changes globally
- [ ] Theme swatches have tap scale, check icon has scaleIn animation
- [ ] 3 fonts: Lora, Geist, System → font changes globally
- [ ] Dark mode toggle (manual / auto / schedule)

### Study
- [ ] Reminder time input

### Privacy
- [ ] Hide online status toggle
- [ ] Cooldown timer after toggle

### Referral
- [ ] Referral card shows code

### Session
- [ ] Session info with expiry

### Version
- [ ] App version shown at bottom

---

## 10. Admin Dashboard (`/admin`)

### Access
- [ ] Login with `ADMIN1` → shield icon in header → click → admin page
- [ ] Non-admin users: no shield icon, `/admin` redirects

### Tabs
- [ ] 6 tabs: Quick, Lisensi, Statistik, Log, Broadcast, Purchase
- [ ] Tab content transitions with AnimatePresence fade

### Quick Tab
- [ ] Quick license creation form

### Lisensi Tab
- [ ] License table shows `ADMIN1`, `PREVIEW01`, `B29-ABC123`
- [ ] `ADMIN1` shows in table (was previously `ADMIN-KEY`)
- [ ] Activation entries for `ADMIN1` and `B29-ABC123`
- [ ] Create / edit / delete license keys

### Statistik Tab
- [ ] Statistics charts/numbers render

### Log Tab
- [ ] Activity logs + error logs render

### Broadcast Tab
- [ ] Announcement management

### Purchase Tab
- [ ] Purchase queue + danger zone

---

## 11. Navigation & Layout

### Header
- [ ] Logo on dashboard, back button on sub-pages
- [ ] User name + class badge (desktop)
- [ ] Pomodoro timer (expand on click)
- [ ] Notification bell
- [ ] Dark mode toggle with rotating Sun/Moon AnimatePresence
- [ ] Admin shield (admin only)
- [ ] Settings gear
- [ ] Logout

### Mobile Nav
- [ ] Bottom navigation on mobile (< sm breakpoint)
- [ ] Chat toggle in bottom nav

### Session Timeout
- [ ] 30-min inactivity timeout
- [ ] 25-min warning dialog

### Pomodoro Timer
- [ ] Click timer icon → expand to mini timer
- [ ] Play/pause/reset controls
- [ ] 25min focus / 5min break cycle
- [ ] Progress ring animation
- [ ] Close button resets and collapses

### Announcements
- [ ] Banner loads from `/api/announcements`
- [ ] Dismiss button works (client-side only)
- [ ] Info/warning/maintenance type colors

### Notifications
- [ ] Popup toast for new unread notifications
- [ ] Dismiss popup

---

## 12. Error Handling

- [ ] `/nonexistent` → 404 page
- [ ] Error boundary catches rendering errors
- [ ] API errors show user-friendly messages (not raw errors)

---

## 13. Design & Animations

### Glassmorphism & Depth
- [ ] `.glass` / `.glass-strong` classes work (backdrop-blur surfaces)
- [ ] `.shadow-warm` / `.shadow-warm-lg` show accent-tinted shadows
- [ ] `.skeleton` shows shimmer loading animation

### Framer Motion
- [ ] Dashboard: staggered cascade entrance
- [ ] Subject cards: hover lift + tap scale
- [ ] Flashcards: spring-physics 3D flip (not CSS)
- [ ] Quiz: shake (wrong) + pop (correct) answer feedback
- [ ] Landing: scroll-reveal on sections
- [ ] Tab nav: sliding underline (layoutId)
- [ ] Tab content: AnimatePresence fade transitions
- [ ] Chat messages: directional slide entrance
- [ ] AI suggestions: staggered chip entrance
- [ ] Settings: staggered section entrance
- [ ] Header: rotating Sun/Moon icon transition
- [ ] Login: form scaleIn + error fadeInDown
- [ ] App loading: branded shimmer logo

### Reduced Motion
- [ ] Framer Motion respects `prefers-reduced-motion` by default

---

## 14. Responsive (375px width)

- [ ] Landing page: no horizontal overflow
- [ ] Login: card fits within viewport
- [ ] Dashboard: single column, bottom nav
- [ ] Subject: tabs scroll horizontally
- [ ] Chat/AI: full-screen panels
- [ ] Settings: modal fits width
- [ ] Admin: tabs scroll, tables scroll horizontally

---

## 15. OG Image

- [ ] Visit `/opengraph-image` → generates OG image
- [ ] Meta tags in page source include OG image URL

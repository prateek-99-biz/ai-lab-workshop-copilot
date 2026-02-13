# AI Workshop Runner - Project Scope Document

**Project Name:** AI Workshop Runner  
**Version:** 1.0.0  
**Last Updated:** February 10, 2026  
**Status:** In Development

---

## 📋 Executive Summary

AI Workshop Runner is a production-ready web platform designed for facilitating live, interactive AI workshops. The platform enables facilitators to guide participants through structured prompt engineering exercises with real-time session control, progress tracking, and automated deliverable distribution.

### Core Value Proposition
- **For Facilitators**: Control and monitor workshops in real-time with zero technical overhead
- **For Participants**: Seamless join experience with no account setup required
- **For Organizations**: Capture leads and deliver value through automated prompt pack distribution

---

## 🎯 Project Objectives

### Primary Goals
1. Enable facilitators to run engaging AI workshops with real-time control
2. Provide frictionless participant experience with code-based joining
3. Automate lead capture and post-session deliverables
4. Support multi-organization deployment with data isolation

### Success Metrics
- Session completion rate > 80%
- Participant join time < 30 seconds
- Zero authentication friction for participants
- Lead capture rate > 90%

---

## 👥 User Roles & Personas

### 1. Facilitator (Authenticated User)
**Role:** Workshop leader running live sessions

**Capabilities:**
- Create and manage workshop templates
- Launch and control live sessions
- Monitor participant progress in real-time
- Control navigation and timing
- Access post-session analytics

**User Journey:**
1. Login via magic link (passwordless)
2. Create/select workshop template
3. Launch session → get join code
4. Present workshop with real-time control
5. Monitor participant engagement
6. End session and review analytics

### 2. Participant (Anonymous User)
**Role:** Workshop attendee following facilitator's guidance

**Capabilities:**
- Join session with 6-digit code
- Follow facilitator-controlled navigation
- Build prompts with interactive blocks
- Signal when stuck
- Receive prompt pack via email/download

**User Journey:**
1. Enter 6-digit join code
2. Provide email (lead capture)
3. Follow facilitator through steps
4. Work on prompt exercises
5. Complete workshop
6. Receive personalized prompt pack

### 3. Organization Admin
**Role:** Platform administrator (future role)

**Planned Capabilities:**
- Manage facilitator access
- Configure branding
- Access organization-wide analytics

---

## 🏗️ System Architecture

### Technology Stack

#### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.5
- **Styling:** Tailwind CSS
- **UI Library:** Custom component library
- **Icons:** Lucide React

#### Backend
- **API:** Next.js API Routes
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth (Magic Link)
- **Real-time:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage (future use)

#### Infrastructure
- **Hosting:** Vercel (recommended)
- **Database:** Supabase Cloud
- **Email:** Resend
- **PDF Generation:** @react-pdf/renderer

#### Development Tools
- **Testing:** Vitest + Testing Library
- **Type Safety:** TypeScript strict mode
- **Code Quality:** ESLint
- **Version Control:** Git

---

## 📐 Database Schema Overview

### Core Tables

#### `organizations`
- Multi-tenant organization structure
- Stores branding, tone notes, example use cases
- One-to-many with facilitators and templates

#### `facilitator_users`
- Links Supabase auth users to organizations
- Stores role (owner, admin, facilitator)

#### `workshop_templates`
- Reusable workshop blueprints
- Created by facilitators
- Contains metadata and structure

#### `modules`
- Logical sections within templates
- Ordered collection of steps
- Supports sequential flow

#### `steps`
- Individual workshop activities
- Contains instructions and estimated time
- Has multiple prompt blocks

#### `prompt_blocks`
- Copyable prompt components
- Supports markdown content
- Variable substitution support

#### `sessions`
- Live workshop instances
- Tracks current step, navigation lock, timer
- Uses 6-digit join codes

#### `session_participants`
- Anonymous participant tracking
- Email-based lead capture
- Progress and engagement tracking

#### `analytics_events`
- User interaction tracking
- Event types: viewed, completed, copied, stuck, opened ChatGPT, etc.
- Session-based aggregation

---

## 🔑 Key Features

### 1. Authentication & Access Control
- **Facilitator Auth:** Password-based login (email + password)
  - Improved login UX: No auto-redirect on page load
  - Proper session state management
  - Option to sign out and switch accounts
  - Clear error messaging and feedback
- **Participant Access:** Code-based joining (no authentication)
- **Session Security:** JWT tokens for participant sessions
- **RLS Policies:** Row-level security for data isolation
- **Service Role:** Proper admin client for backend operations (bypasses RLS)
- **Middleware Protection:** Route-level authentication checks (fixed cookie detection)
- **Cookie Management:** Proper Supabase SSR session handling

**Important:** Facilitators must have both:
1. A Supabase Auth user account
2. A `facilitator_users` record linked to an organization

**Recent Fixes:**
- Fixed middleware cookie detection for Supabase SSR
- Improved service role client to use direct authentication
- Enhanced login page to prevent auto-redirect issues
- Added explicit service_role policies for all database tables

See [FACILITATOR_SETUP.md](FACILITATOR_SETUP.md) for setup instructions.

### 2. Template Management
- **CRUD Operations:** Create, read, update, delete templates
- **Module System:** Organize content into logical sections
- **Step Builder:** Define instructions and prompt blocks
- **Reusability:** Templates can be used for multiple sessions

### 3. Session Management
- **Session Creation:** Generate from template with unique join code
- **Join Code System:** 6-digit alphanumeric codes (36^6 combinations)
- **Status Flow:** draft → published → live → ended
- **Real-time Sync:** All participants see facilitator's navigation

### 4. Presenter Mode (Facilitator View)
- **Step Navigation:** Previous/Next controls
- **Navigation Lock:** Prevent participants from moving ahead
- **Timer Control:** Set and display countdown timers
- **Live Stats:**
  - Participant count
  - Completion rate per step
  - Stuck signals
- **Session Control:** End session, export data

### 5. Workshop Runner (Participant View)
- **Free Navigation:** Participants control their own pace (no forced locking)
- **Step Navigation:** Previous/Next buttons always available
- **Prompt Builder:** Interactive blocks with copy functionality
- **Stuck Signal:** Request help button
- **Progress Tracking:** Visual step completion indicators (clickable sidebar)
- **Improved Readability:** All text rendered in black (gray-900) for optimal contrast
- **Enhanced Typography:** Markdown content with proper dark text styling

### 6. Real-time Features
- **Supabase Realtime Channels:**
  - Current step updates
  - Navigation lock changes
  - Timer synchronization
  - Participant count
  - Stuck signals
- **Optimistic Updates:** Immediate UI feedback
- **Auto-reconnection:** Handle network disruptions

### 7. Lead Capture & Deliverables
- **Email Collection:** Required at session join
- **Prompt Pack Generation:**
  - Personalized prompt compilation
  - HTML email template
  - PDF download option
  - Variable substitution
- **Post-Session Delivery:** Automated email via Resend

### 8. Analytics & Tracking
- **Event Tracking:**
  - Step views and completions
  - Prompt copies
  - ChatGPT opens (external link)
  - Stuck signals
- **Aggregation:** Session-level metrics
- **Future:** Organization-wide reporting

---

## 📁 Application Structure

### Route Organization

```
/                     → Landing page (public)
/join                 → Join code entry (public)
/join/[code]          → Direct join with code (public)
/auth/login           → Facilitator login (public, improved UX)
/auth/callback        → OAuth callback handler

/admin                → Dashboard (authenticated)
/admin/templates      → Template management (placeholder)
/admin/sessions       → Session list (fully functional)
/admin/modules        → Module management (placeholder)
/admin/organizations  → Organization details (functional)

/session/[id]/presenter  → Presenter mode (authenticated)
/s/[sessionId]          → Participant workshop view (session token)
/s/[sessionId]/end      → Session end, prompt pack delivery
```

### API Endpoints

#### Session Management
- `POST /api/sessions/join` - Join session with code
- `POST /api/sessions/verify` - Verify session token

#### Admin Operations
- `GET /api/admin/sessions/[sessionId]` - Get session details
- `PATCH /api/admin/sessions/[sessionId]` - Update session state
- `POST /api/admin/sessions/[sessionId]` - End session

#### Submissions
- `POST /api/submissions` - Submit participant responses (future)

#### Analytics
- `POST /api/analytics/event` - Track user events

#### Deliverables
- `POST /api/email/prompt-pack` - Send prompt pack email
- `POST /api/pdf/generate` - Generate PDF (future)

---

## 🧩 Component Architecture

### UI Components (`src/components/ui/`)
Reusable, presentation-focused components:
- `Button` - Primary action component
- `Card`, `CardContent` - Container components
- `Input`, `Checkbox` - Form elements (enhanced text contrast)
- `TextArea` - Multi-line text input (black text)
- `Modal` - Dialog overlays
- `Progress`, `ProgressBar` - Progress indicators
- `Timer` - Countdown timer display
- `Loading` - Loading states
- `CopyButton`, `PromptBlock` - Clipboard copy with dark text contrast

### Domain Components

#### Admin (`src/components/admin/`)
- `AdminNav` - Navigation for facilitator dashboard with sidebar

#### Admin Pages (`src/app/admin/`)
- **Dashboard** (`/admin`) - Overview with stats and quick actions
- **Templates** (`/admin/templates`) - Template management interface (placeholder)
- **Sessions** (`/admin/sessions`) - Session list with status and details (fully functional)
- **Modules** (`/admin/modules`) - Module management interface (placeholder)
- **Organizations** (`/admin/organizations`) - Organization details view (functional)

All admin pages include:
- Authenticated access control
- Consistent navigation via AdminNav component
- Proper loading and error states
- Responsive design for mobile/tablet

#### Presenter (`src/components/presenter/`)
- `PresenterView` - Main presenter mode interface
  - Step navigation
  - Participant monitoring
  - Session controls

#### Workshop (`src/components/workshop/`)
- `WorkshopRunner` - Main participant interface
  - Step display
  - Prompt building
  - Progress tracking
- `SessionEndClient` - Post-session prompt pack delivery

---

## 🔐 Security Considerations

### Implemented
- Row-Level Security (RLS) policies on all tables
- Supabase Auth for facilitator access
- JWT tokens for session participants
- Environment variable protection
- CORS configuration
- Rate limiting (via Supabase)

### Planned
- Content Security Policy headers
- Input sanitization for markdown
- XSS prevention in user-generated content
- DDoS protection
- Audit logging

---

## 🚀 Deployment Architecture

### Recommended Setup
- **Frontend/API:** Vercel
- **Database:** Supabase Cloud (Production tier)
- **Email:** Resend (Production plan)
- **Domain:** Custom domain with SSL
- **Storage:** Supabase Storage (when needed)

### Environment Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SESSION_TOKEN_SECRET=xxx (32+ chars)
RESEND_API_KEY=xxx
NEXT_PUBLIC_APP_NAME=Workshop Runner
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 📦 Data Models

### Workshop Template Structure
```typescript
WorkshopTemplate {
  id: UUID
  name: string
  description: string
  organization_id: UUID
  modules: Module[]
}

Module {
  id: UUID
  title: string
  objective: string
  order_index: number
  steps: Step[]
}

Step {
  id: UUID
  title: string
  instruction_markdown: string
  estimated_minutes: number
  is_required: boolean
  order_index: number
  prompt_blocks: PromptBlock[]
}

PromptBlock {
  id: UUID
  title: string
  content_markdown: string
  order_index: number
  is_copyable: boolean
}
```

### Session State
```typescript
Session {
  id: UUID
  join_code: string (6 chars)
  status: 'draft' | 'published' | 'live' | 'ended'
  current_step_id: UUID | null
  navigation_locked: boolean
  timer_end_at: timestamp | null
  template_id: UUID
  organization_id: UUID
}

SessionParticipant {
  id: UUID
  session_id: UUID
  email: string
  completed_steps: UUID[]
  stuck_steps: UUID[]
  progress_percentage: number
}
```

---

## 🔄 Key Workflows

### 1. Create and Launch Workshop
1. Facilitator logs in via magic link
2. Creates template with modules → steps → prompt blocks
3. Launches session from template
4. System generates unique 6-digit join code
5. Facilitator shares code with participants

### 2. Participant Joins Session
1. Participant enters join code on `/join`
2. System verifies code and session status
3. Participant provides email (lead capture)
4. System creates participant record and JWT token
5. Participant lands on current step of workshop

### 3. Live Workshop Execution
1. Facilitator navigates through steps
2. Real-time updates push to all participants
3. Participants work on prompts, mark completion
4. Facilitator monitors progress and stuck signals
5. Optional: Set timers for time-boxed activities

### 4. Session Completion
1. Facilitator ends session
2. Participants redirected to end page
3. System compiles personalized prompt pack
4. Email sent via Resend with all prompts
5. Option to download as PDF (future)

---

## 🎨 Design System

### Brand Colors
- Primary: `brand-600` (configurable via Tailwind)
- Success: Green
- Warning: Amber
- Error: Red
- Neutral: Gray scale

### Typography
- Headings: Bold, clear hierarchy (gray-900)
- Body: Readable sans-serif (gray-900 for primary content)
- Code/Prompts: Monospace (gray-900 for readability)
- Labels: Medium weight (gray-900)

### Layout Principles
- Mobile-first responsive design
- Clear information hierarchy
- Consistent spacing (Tailwind scale)
- High contrast text (gray-900 on white backgrounds)
- Accessible color contrast (WCAG AA compliant)
- Focus states for keyboard navigation

### Recent UI Improvements
- **Text Contrast:** All input fields, labels, and content text now use gray-900 (near-black)
- **Markdown Styling:** Proper dark text for all markdown content (headings, paragraphs, lists)
- **Input Enhancement:** Labels and input text clearly visible in black
- **PromptBlock:** High contrast prompt text for better readability
- **Navigation:** Unlocked participant navigation for better UX

---

## 📊 Monitoring & Analytics

### Event Tracking
- `step_viewed` - Participant views step
- `step_completed` - Participant marks step complete
- `prompt_copied` - Participant copies prompt block
- `stuck_signal` - Participant signals stuck
- `chatgpt_opened` - Participant opens ChatGPT link
- `pdf_downloaded` - Participant downloads prompt pack
- `email_sent` - Prompt pack email sent

### Metrics to Monitor
- Session length (start → end)
- Average completion rate
- Stuck signal frequency
- Email delivery rate
- Join code success rate
- Real-time connection stability

---

## 🔮 Future Enhancements

### Phase 2 Features
- PDF generation for prompt packs
- Custom branding per organization
- Pre-workshop materials upload
- Post-session surveys
- Participant chat/Q&A

### Phase 3 Features
- AI-assisted prompt refinement
- Template marketplace
- Video recordings
- Breakout sessions
- Multi-facilitator support

### Technical Improvements
- Edge function optimizations
- CDN for static assets
- Advanced caching strategies
- GraphQL API option
- Mobile native apps

---

## 📚 External Dependencies

### Critical Services
- **Supabase:** Database, auth, realtime (SLA required)
- **Resend:** Email delivery (failover plan needed)
- **Vercel:** Hosting and edge functions

### Fallback Strategies
- Local session state caching
- Email retry logic
- Graceful degradation for realtime features

---

## 🤝 Stakeholder Communication

### Regular Updates For
- Development team (daily standups)
- Product owner (sprint reviews)
- Organization admins (monthly reports)

### Documentation Maintained
- This scope document
- Task list (TASK_LIST.md)
- API documentation
- User guides (facilitator & participant)
- Technical architecture diagrams

---

## 🔄 Recent Updates & Bug Fixes (February 10, 2026)

### UI/UX Improvements
- **Text Readability:** All text now uses gray-900 (near-black) for optimal contrast
  - Input fields and labels
  - Markdown content (headings, paragraphs, lists)
  - Prompt blocks
  - Form components
- **Navigation Enhancement:** Removed navigation locking for participants
  - Participants can freely navigate steps at their own pace
  - Progress sidebar always clickable
  - Previous/Next buttons always available
- **Login Improvements:** Fixed facilitator login experience
  - No more auto-redirect on page load
  - Clear "Already Signed In" state with action buttons
  - Better session state management

### Backend Fixes
- **Service Role Authentication:** Fixed service client to use proper Supabase admin client
  - Changed from SSR client to direct client with service role key
  - Properly bypasses RLS policies
- **Database Policies:** Added explicit service_role policies for all tables
  - Migration 005 ensures backend API has full access
  - Fixed attendee join errors caused by missing policies
- **Middleware:** Fixed cookie detection for Supabase SSR authentication
  - Now properly detects `sb-*-auth-token` pattern
  - Improved session persistence

### New Admin Pages
- **Sessions Page:** Fully functional session listing with status indicators
- **Organizations Page:** Display organization details and contact info
- **Templates Page:** Placeholder for future template management
- **Modules Page:** Placeholder for future module management

All admin pages properly connected with working navigation and authentication.

---

## ✅ Definition of Done

For a feature to be considered complete:
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tested in staging
- [ ] Documentation updated
- [ ] Accessibility validated
- [ ] Performance benchmarked
- [ ] Security reviewed
- [ ] Deployed to production

---

## 📞 Project Contacts

**Technical Lead:** [Your Name]  
**Product Owner:** [Name]  
**DevOps:** [Name]  
**QA Lead:** [Name]

---

*This document is a living document and should be updated as the project evolves. Last reviewed: February 10, 2026 (Final Evening Update)*

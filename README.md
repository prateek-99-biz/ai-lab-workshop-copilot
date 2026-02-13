# Workshop Runner

A production-ready web platform for running live, facilitator-led AI workshops with interactive prompt building, real-time session control, and automated prompt pack delivery.

## Features

### For Facilitators
- **Password Auth**: Simple email and password login
- **Template Management**: Create and manage workshop templates with modules and steps
- **Session Control**: Real-time presenter mode with step navigation, timer, and lock controls
- **Participant Monitoring**: Track completions, stuck signals, and engagement
- **Lead Capture & Feedback**: Collect participant emails and workshop feedback

### For Attendees
- **No Account Required**: Join with a simple 6-digit room code
- **Email Required**: Provide email for prompt pack delivery
- **Guided Experience**: Follow along with facilitator-controlled navigation
- **Prompt Builder**: Interactive prompt blocks with variable substitution
- **Feedback Required**: Share workshop feedback to receive prompt pack
- **Prompt Pack**: Automated email delivery after feedback submission

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSSPassword-based for facilitators)
- **Realtime**: Supabase Realtime
- **PDF/Email**: @react-pdf/renderer Link)
- **Realtime**: Supabase Realtime
- **PDF/Email**: HTML generation + Resend

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/           # Public pages (landing, join)
│   │   ├── admin/              # Facilitator dashboard
│   │   ├── api/                # API routes
│   │   ├── auth/               # Auth pages
│   │   ├── s/[sessionId]/      # Attendee session pages
│   │   └── session/[id]/       # Facilitator presenter mode
│   ├── components/
│   │   ├── admin/              # Admin UI components
│   │   ├── presenter/          # Presenter mode components
│   │   ├── ui/                 # Reusable UI components
│   │   └── workshop/           # Workshop-specific components
│   └── lib/
│       ├── ai/                 # AI provider abstraction
│       ├── supabase/           # Supabase clients
│       ├── types/              # TypeScript types
│       └── utils/              # Utility functions
├── supabase/
│   ├── functions/              # Edge Functions
│   └── migrations/             # SQL migrations
├── scripts/                    # Utility scripts
└── public/                     # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### 1. Clone and Install

```bash
git clone <repo-url>
cd workshop-runner
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_TOKEN_SECRET=generate-a-32-char-secret
```

### 3. Database Setup

Run the migrations in your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually run each migration in order via Supabase Dashboard
```

### 4. Create Facilitator Account

**Important:** You need both a Supabase Auth user AND a facilitator_users record.

See [FACILITATOR_SETUP.md](FACILITATOR_SETUP.md) for detailed setup instructions.

**Quick start SQL:**

```sql
-- Run this in Supabase SQL Editor to create a test facilitator
-- See FACILITATOR_SETUP.md for complete instructions

-- 1. Create organization
INSERT INTO organizations (id, name) VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Demo Org');

-- 2. Create auth user (check FACILITATOR_SETUP.md for password hashing)
-- 3. Link user to organization (see FACILITATOR_SETUP.md)
```

### 5. Start Development Server

Migrations:
1. `001_initial_schema.sql` - Tables, indexes, triggers
2. `002_rls_policies.sql` - Row Level Security
3. `003_storage_realtime.sql` - Storage buckets, realtime
4. `004_feedback_table.sql` - Feedback collection system
5. `005_fix_session_access.sql` - Fix attendee join access (REQUIRED)

### 4. Seed Data (Optional)

```bash
npx ts-node scripts/seed.ts
```

This creates:
- Demo organization
- Sample workshop template
- 2 modules with prompt blocks

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[FACILITATOR_SETUP.md](FACILITATOR_SETUP.md)** - Complete guide to setting up facilitator accounts
- **[PROJECT_SCOPE.md](PROJECT_SCOPE.md)** - Detailed project scope and architecture
- **[TASK_LIST.md](TASK_LIST.md)** - Development progress and task tracking

## Deployment

### Vercel

1. Connect your GitHub repo to Vercel
2. Add environment variables
3. Deploy

### Supabase Edge Functions

Deploy the cleanup function:

```bash
supabase functions deploy cleanup-old-sessions
```

Set up a cron job in Supabase Dashboard to run hourly:

```sql
SELECT cron.schedule(
  'cleanup-old-sessions',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/cleanup-old-sessions',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    )
  $$
);
```

## Usage

### Creating a Workshop

1. Go to `/admin/templates`
2. Create a new template
3. Add modules and steps
4. Configure prompt blocks with variable placeholders

### Running a Session

1. Go to `/admin/sessions`
2. Create session from template
3. Share the 6-digit join code
4. Open presenter mode
5. Control navigation and timer

### Attending a Workshop

1. Go to `yourdomain.com/join`
2. Enter the 6-digit room code
3. Enter display name and optional email
4. Follow along with the workshop
5. Download prompt pack at the end

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `SESSION_TOKEN_SECRET` | Secret for JWT tokens | Yes |
| `RESEND_API_KEY` | Resend API key for emails | No |
| `EMAIL_FROM` | From address for emails | No |

### AI Provider (v2)

The AI abstraction layer supports future AI integration:

```typescript
// In .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

## Data Retention

- Session data is automatically deleted 72 hours after the session ends
- The cleanup job runs via Supabase Edge Functions
- Leads and organization data are retained

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sessions/verify` | POST | Verify join code |
| `/api/sessions/join` | POST | Join session as attendee |
| `/api/submissions` | POST | Save/update submission |
| `/api/analytics/event` | POST | Log analytics event |
| `/api/pdf/generate` | POST | Generate prompt pack HTML |
| `/api/email/prompt-pack` | POST | Email prompt pack |
| `/api/admin/sessions/[id]` | GET/PATCH | Session management |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

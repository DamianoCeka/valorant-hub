# ITSME Tournament Hub

## Overview

ITSME Tournament Hub is a full-stack esports community platform focused on VALORANT tournaments. The application provides tournament management, team registration, bracket systems, community features (memes, clips, chat), user profiles with Discord authentication, and a leaderboard/points system.

## Recent Changes (December 2025)

### Admin Panel Enhancements (Latest)
- **Badge Catalog Management**: Admins can create, edit, delete badge definitions with custom icons and rarities
- **Manual Badge Assignment**: Award or revoke badges from specific users
- **User Moderation**: Ban/unban users with reason and duration, change roles (user/moderator/admin), edit points
- **Content Moderation**: Manage memes, clips, quotes, comments with feature/delete actions
- **Database Schema Updates**: 
  - `badge_catalog` table for badge definitions
  - `user_badges` junction table for manual awards
  - User fields: status, bannedUntil, banReason

### Community Enhancements
- **Quotes Section**: New "Citazioni" tab in Community page for sharing memorable quotes
  - Quote cards display content, author, context, and voting
  - Full CRUD operations with voting system (upvote/downvote)
  - Hot/New/Top sorting functionality
- **Media Comments**: Comments now support GIF and image attachments
  - Users can paste URLs from Giphy, Tenor, or direct image links
  - Auto-detection of media type (GIF vs image)
  - Preview before sending with remove option
- **Automatic Badge System**: Badges unlock automatically when users complete actions
  - `first_meme` / `meme_master` (10 memes)
  - `first_clip` / `clip_master` (10 clips)  
  - `voter` (50 votes), `chat_active` (100 messages)
- **Font Improvement**: Changed display font from Anton to Oswald for better readability

### Navigation Refactoring
- Simplified navigation from 5+ items to 3 main tabs: **Tornei**, **Community**, **Profilo**
- Removed separate Calendar, Memes, Clips pages - consolidated into Community tab
- Home page now serves as **Command Center** with dynamic CTA based on user's tournament status

### Command Center (Home Page)
Dynamic CTA logic based on user state:
1. Active match (ready/live) → "Vai al Match"
2. Check-in needed → "Fai Check-in"
3. Registered + checked-in → "Vedi Bracket"
4. Registered waiting → "Vedi Torneo"
5. Registration open → "Iscriviti Ora"
6. No tournament → "Scopri i Tornei"
7. Completed tournament → "Vedi Risultati"

### Match Lifecycle & Authorization
Match status flow: `pending → ready → live → reported → disputed → resolved`
- Match authorization now uses `team_members` table for multi-player teams
- Backward compatible with legacy `discordId` and `captainUserId` fields
- Audit logging for all match actions (report, confirm, dispute)
- Disputes table for admin review

### Rate Limiting
Applied to sensitive endpoints:
- **Strict** (10 req/15min): Registration, disputes, reports
- **Moderate** (50 req/15min): Check-in, match report/confirm
- **Light** (30 req/min): Voting

### Multi-Format Tournament Support
- `teamSize` field (1-5 players per team)
- `format` field ("1v1", "2v2", "3v3", "5v5")
- `team_members` table for flexible team composition
- `rulesMd` and `prizesMd` for markdown content

### New API Endpoints
- `GET /api/tournaments/active` - Active tournament with user context
- `GET /api/stats/home` - Home page statistics
- `GET /api/matches/:id` - Match details with authorization info
- `POST /api/matches/:id/report` - Report match score (team members only)
- `POST /api/matches/:id/confirm` - Confirm reported score
- `POST /api/matches/:id/dispute` - Open dispute

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: 
  - TanStack React Query for server state and API caching
  - Zustand with persist middleware for client-side state
- **Styling**: Tailwind CSS v4 with custom VALORANT-inspired theme (dark mode, red accents)
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Forms**: React Hook Form with Zod validation
- **File Uploads**: Uppy with AWS S3 presigned URL flow

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful JSON API under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Discord OAuth via Replit Discord connector - no session management, stateless auth per request
- **File Storage**: Google Cloud Storage via Replit Object Storage integration with presigned URLs

### Build System
- **Dev Server**: Vite with HMR for frontend, tsx for backend
- **Production Build**: 
  - Vite builds frontend to `dist/public`
  - esbuild bundles server to `dist/index.cjs` with selective dependency bundling
- **Database Migrations**: Drizzle Kit with `db:push` for schema sync

### Data Models
Key entities defined in `shared/schema.ts`:
- **Users**: Discord-linked accounts with points, badges, roles
- **Tournaments**: Events with registration, check-in states, prize pools
- **Teams**: Tournament participants with captain/duo info, check-in codes
- **Matches**: Bracket system with rounds, scores, status tracking (pending→ready→live→reported→disputed→resolved)
- **Disputes**: Match disputes with reason, evidence, resolution
- **Memes/Clips/Quotes**: User-generated content with voting system
- **Announcements**: Tournament and global notifications
- **Chat Messages**: Community chat with user references
- **Content Comments**: Threaded comments on memes/clips with likes and replies
- **Votes**: User voting on content (upvote/downvote)

### Key Design Patterns
- Shared schema between frontend and backend via `@shared/*` alias
- API routes return JSON, frontend uses React Query for data fetching
- Presigned URL pattern for file uploads (request URL from backend, upload directly to storage)
- Discord OAuth provides user identity without traditional sessions

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Discord Connector**: OAuth flow handled via Replit infrastructure
  - Access tokens refreshed via `REPLIT_CONNECTORS_HOSTNAME`
  - User identity from Discord API (`/users/@me`)

### File Storage
- **Google Cloud Storage**: Via Replit Object Storage integration
  - Accessed through local sidecar at `http://127.0.0.1:1106`
  - Presigned URLs for client-side uploads

### Email (Optional)
- **Nodemailer**: SMTP-based email for check-in codes
  - Configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
  - Fails silently if not configured

### Frontend Libraries
- **TanStack React Query**: Server state management
- **Framer Motion**: Animations
- **Uppy**: File upload UI with S3 presigned URL support
- **date-fns**: Date formatting with Italian locale support
- **Zod**: Schema validation shared with backend
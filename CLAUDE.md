# CLAUDE.md

## Development Commands

```bash
# Backend (runs on port 3001)
cd server && npm install && npm run dev

# Frontend (runs on port 3000)
cd client && npm install && npm run dev

# Database setup (PostgreSQL)
createdb hoaboard
psql -d hoaboard -f database/schema.sql

# Production build
cd client && npm run build
```

No test framework or linter is configured.

## Environment Variables (server/.env)

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/hoaboard
JWT_SECRET=<secret>
```

## Architecture

Full-stack HOA community management app with JWT auth, per-community roles
(admin/board_member/resident), potluck sign-ups, meeting suggestions,
private board questions, community calendar, and polling.

- **server/src/index.js** -- Express entry point; mounts helmet, CORS, rate limiting, routes
- **server/src/config/db.js** -- PostgreSQL pool with auto-initialization
- **server/src/middleware/** -- `auth.js` (JWT verification), `communityMember.js` (membership check), `communityAdmin.js` (admin check), `boardMember.js` (admin or board_member check)
- **server/src/models/** -- Raw SQL query functions (User, Community, PotluckEvent, PotluckSignup, MeetingSuggestion, BoardQuestion, BoardQuestionResponse, CalendarEvent, Poll, PollVote) -- no ORM
- **server/src/routes/** -- REST endpoints: auth, communities, potlucks, suggestions, questions, calendar, polls
- **client/src/context/AuthContext.jsx** -- Global auth state, token management, communities list, role helpers
- **client/src/services/api.js** -- Axios instance with JWT interceptor; all API functions
- **database/schema.sql** -- Full schema

### Key Patterns

- Monorepo: `client/` (React 18 + Vite) and `server/` (Express + Node.js)
- JWT stored in localStorage, sent via Axios interceptor
- Models are plain functions running raw SQL against `pg` pool (no ORM)
- Roles are per-community (admin/board_member/resident) stored in `community_members`
- Community creator becomes admin; members join via invite code and are pending until admin accepts
- Server serves built client static files in production from `client/dist`
- Procfile: `web: cd server && npm start`

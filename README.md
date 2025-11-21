# VLZM Event Management App

A modern, mobile-first event management application built with React, Vite, and Supabase. Designed for volleyball event organization with player check-in/check-out functionality and role-based permissions.

![Tech Stack](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green)

## Features

### 🔐 Authentication
- Email/password authentication via Supabase
- Automatic profile creation
- Role-based access control (Player/Manager)
- Protected routes

### 📅 Event Management (Manager)
- Create, update, and delete events
- Event scheduling with start/end times
- Event status tracking (scheduled, ongoing, completed, canceled)
- Location and description fields

### ✅ Check-in System
- **Player Mode**: Self check-in/out during scheduled/ongoing events
- **Manager Mode**: Manage all player check-ins during ongoing events
- Real-time attendance tracking
- Check-in/check-out timestamps

### 📱 Mobile-First Design
- Responsive card views for mobile
- Table views for desktop
- Bottom navigation for mobile
- Touch-friendly UI (44px minimum tap targets)
- Progressive Web App ready

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Data Management**: TanStack Query v5
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v7

## Project Structure

```
src/
├── components/         # Reusable UI components
├── contexts/          # React contexts (Auth)
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
├── pages/             # Route pages
├── schemas/           # Zod validation schemas
└── types/             # TypeScript type definitions

dev-docs/              # Development documentation
├── 01-project-overview.md
├── 02-architecture.md
├── 03-database-schema.md
├── 04-rls-policies.md
└── 05-tasks.md
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Set up Supabase database**
   
   Follow the instructions in `dev-docs/03-database-schema.md` to:
   - Create tables
   - Set up triggers
   - Configure RLS policies (see `dev-docs/04-rls-policies.md`)

5. **Start development server**
   ```bash
   pnpm dev
   ```
   
   Open [http://localhost:5173](http://localhost:5173)

## Database Setup

See `dev-docs/03-database-schema.md` for complete schema and `dev-docs/04-rls-policies.md` for RLS policies.

### Quick Setup SQL

Run these in your Supabase SQL editor:

```sql
-- 1. Create tables (profiles, events, event_players)
-- 2. Create indexes
-- 3. Create triggers (profile creation, updated_at)
-- 4. Enable RLS
-- 5. Create RLS policies
```

Refer to the detailed documentation for complete SQL scripts.

## Development

### Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint
```

### Code Style

- **Naming**: kebab-case for files, PascalCase for components
- **Touch Targets**: Minimum 44px for interactive elements
- **Mobile-First**: Design for mobile, enhance for desktop
- **TypeScript**: Strict mode enabled

## User Roles

### Player
- Sign up and sign in
- View all events
- Self check-in/out during scheduled or ongoing events
- View attendance lists

### Manager
- All player permissions
- Create, update, and delete events
- Manage player check-ins during ongoing events
- Change event status

## Architecture

See `dev-docs/02-architecture.md` for detailed architecture documentation.

### Key Patterns

- **State Management**: TanStack Query for server state, Context for auth
- **Data Fetching**: Custom hooks wrapping TanStack Query
- **Forms**: React Hook Form with Zod validation
- **Security**: Supabase RLS policies enforce permissions
- **Routing**: React Router with protected route guards

## Testing

```bash
# Unit tests (to be added)
pnpm test

# E2E tests (to be added)
pnpm test:e2e
```

## Deployment

### Build

```bash
pnpm build
```

Output in `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your repository
2. Set environment variables
3. Deploy

### Deploy to Supabase Hosting

```bash
supabase deploy
```

## Documentation

- [Project Overview](dev-docs/01-project-overview.md)
- [Architecture](dev-docs/02-architecture.md)
- [Database Schema](dev-docs/03-database-schema.md)
- [RLS Policies](dev-docs/04-rls-policies.md)
- [Tasks & Roadmap](dev-docs/05-tasks.md)

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Update documentation
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact the development team.

---

Built with ❤️ using React, Vite, and Supabase

# Project Overview

## VLZM Event Management App

A mobile-first event management application built with React, Vite, and Supabase that enables volleyball event organization with player check-in/check-out functionality.

### Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 (mobile-first)
- **Backend/Database**: Supabase (PostgreSQL + Auth + RLS)
- **Data Fetching**: TanStack Query v5
- **Form Management**: React Hook Form + Zod
- **Routing**: React Router v7

### Key Features

1. **Authentication**
   - Email/password sign-up and sign-in
   - Profile auto-creation via Supabase trigger
   - Role-based access (player/manager)

2. **Event Management** (Manager only)
   - Create, update, and delete events
   - Event statuses: scheduled, ongoing, completed, canceled
   - Event details: title, description, location, start/end times

3. **Check-in System**
   - **Players**: Self check-in/out during scheduled/ongoing events
   - **Managers**: Manage check-ins during ongoing events
   - Real-time status tracking

4. **Mobile-First Design**
   - Minimum 44px touch targets
   - Responsive card/table views
   - Bottom navigation for mobile
   - Touch-friendly UI components

### Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── event-form.tsx
│   ├── layout.tsx
│   └── protected-route.tsx
├── contexts/          # React contexts
│   └── auth-context.tsx
├── hooks/             # Custom React hooks
│   ├── use-auth.ts
│   ├── use-events.ts
│   └── use-event-players.ts
├── lib/               # Utility libraries
│   ├── supabase.ts
│   └── utils.ts
├── pages/             # Route pages
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── events.tsx
│   ├── create-event.tsx
│   ├── update-event.tsx
│   └── event-check-in.tsx
├── schemas/           # Zod validation schemas
│   ├── auth-schema.ts
│   └── event-schema.ts
├── types/             # TypeScript types
│   └── database.ts
├── App.tsx            # Main app with routing
└── main.tsx           # App entry point
```

### Environment Variables

Create a `.env` file with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint
```

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 12+
- Android Chrome 80+
- Optimized for mobile viewports (320px+)

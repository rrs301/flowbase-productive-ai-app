# Flowbase Productivity App - Read First

Flowbase is a Next.js productivity workspace with authentication, Postgres storage, AI tools, voice transcription, notes, calendar, kanban boards, whiteboards, spaces, and real-time collaboration.

Use this file when you have just downloaded the source code as a ZIP file or cloned it from GitHub and want the shortest path to running it locally.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM
- Neon Serverless Postgres
- Clerk Authentication
- Liveblocks Collaboration
- Google Gemini AI
- AssemblyAI Speech-to-Text

## Requirements

Install these before starting:

- Node.js 20 or newer
- npm
- Git, if cloning from GitHub
- A Neon account
- A Clerk account
- A Liveblocks account
- A Google AI Studio API key
- An AssemblyAI API key, only if you want voice and transcription features

## Quick Setup

1. Get the source code.

   From GitHub:

   ```bash
   git clone <your-repository-url>
   cd flowbase-productivity-app-prod
   ```

   From a ZIP file:

   ```bash
   unzip flowbase-productivity-app-prod.zip
   cd flowbase-productivity-app-prod
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create your local environment file.

   ```bash
   cp .env.example .env.local
   ```

4. Add your real keys to `.env.local`.

   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   DATABASE_URL=postgresql://...

   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_PRO_PLAN_ID=

   LIVEBLOCKS_SECRET_KEY=sk_...

   GEMINI_API_KEY=...

   ASSEMBLYAI_API_KEY=
   ```

5. Push the database schema to Neon.

   ```bash
   npm run db:push
   ```

6. Start the development server.

   ```bash
   npm run dev
   ```

7. Open the app.

   Go to:

   ```text
   http://localhost:3000
   ```

## Important Notes

- Do not commit `.env.local` or real secret keys to GitHub.
- `DATABASE_URL`, Clerk keys, `LIVEBLOCKS_SECRET_KEY`, and `GEMINI_API_KEY` are required for the full app experience.
- `ASSEMBLYAI_API_KEY` is only required for voice and speech-to-text features.
- `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` is optional and only needed if you configure Clerk billing or plan-based UI.
- If the database tables do not exist, run `npm run db:push`.
- If authentication redirects do not work, confirm the Clerk URLs and local app URL are configured correctly.

For the complete setup guide, including how to generate every environment key, read `ProjectSetup.md`.

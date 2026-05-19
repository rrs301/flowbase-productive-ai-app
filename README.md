# Project Setup Guide

This guide explains how to set up Flowbase Productivity App after downloading the source code from GitHub or as a ZIP file. It also explains how to generate every environment key used by the project.

## 1. Install Required Software

Install these tools first:

- Node.js 20 or newer
- npm
- Git
- A code editor, such as VS Code

Check your local versions:

```bash
node -v
npm -v
git --version
```

## 2. Download the Project

### Option A: Clone from GitHub

```bash
git clone <your-repository-url>
cd flowbase-productivity-app-prod
```

### Option B: Download as ZIP

1. Download the ZIP from GitHub.
2. Extract the ZIP.
3. Open a terminal inside the extracted folder.

```bash
cd flowbase-productivity-app-prod
```

## 3. Install Dependencies

Run:

```bash
npm install
```

This installs Next.js, React, Drizzle, Clerk, Liveblocks, Gemini, AssemblyAI, and the rest of the app dependencies.

## 4. Create the Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

If you are on Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Then open `.env.local` and fill in the values.

## 5. Environment Variables

Use this complete local template:

```env
# App Setup
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Neon Serverless Postgres Database
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_PRO_PLAN_ID=

# Liveblocks Collaboration
LIVEBLOCKS_SECRET_KEY=sk_your_liveblocks_secret_here

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# AssemblyAI Speech-to-Text
ASSEMBLYAI_API_KEY=
```

## 6. Generate Neon Database URL

The project uses Neon Serverless Postgres with Drizzle ORM.

1. Go to `https://neon.tech`.
2. Create an account or sign in.
3. Create a new project.
4. Choose a region close to your users.
5. Open the project dashboard.
6. Go to **Connection Details**.
7. Select the pooled connection string if available.
8. Copy the connection string.
9. Paste it into `.env.local` as `DATABASE_URL`.

Example:

```env
DATABASE_URL=postgresql://neondb_owner:password@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Keep `?sslmode=require` at the end of the URL.

## 7. Generate Clerk Authentication Keys

The project uses Clerk for sign in and sign up pages.

1. Go to `https://dashboard.clerk.com`.
2. Create an account or sign in.
3. Create a new application.
4. Choose the sign-in methods you want, such as email, Google, or GitHub.
5. Open the Clerk application dashboard.
6. Go to **Configure > API Keys**.
7. Copy the publishable key.
8. Paste it as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
9. Copy the secret key.
10. Paste it as `CLERK_SECRET_KEY`.

Local Clerk URLs:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

In Clerk, also check these settings:

- Add `http://localhost:3000` to allowed local development URLs if Clerk asks for it.
- If you deploy later, add your production domain in the Clerk dashboard.
- If you use Clerk billing or subscription plan UI, copy the plan ID into `NEXT_PUBLIC_CLERK_PRO_PLAN_ID`.

`NEXT_PUBLIC_CLERK_PRO_PLAN_ID` can stay empty for normal local development.

## 8. Generate Liveblocks Secret Key

The project uses Liveblocks for real-time collaboration features.

1. Go to `https://liveblocks.io`.
2. Create an account or sign in.
3. Create a new Liveblocks project.
4. Open the project dashboard.
5. Go to **API Keys**.
6. Copy the secret key.
7. Paste it into `.env.local`.

```env
LIVEBLOCKS_SECRET_KEY=sk_your_liveblocks_secret_here
```

This key is required for collaboration features such as shared kanban boards.

## 9. Generate Google Gemini API Key

The project uses Gemini for AI assistant, AI notes refinement, AI diagrams, and AI template generation.

1. Go to `https://aistudio.google.com/app/apikey`.
2. Sign in with your Google account.
3. Click **Create API key**.
4. Select a Google Cloud project or create a new one.
5. Copy the generated API key.
6. Paste it into `.env.local`.

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Without this key, AI-powered actions will show configuration errors.

## 10. Generate AssemblyAI API Key

The project uses AssemblyAI for speech-to-text and voice features.

1. Go to `https://www.assemblyai.com`.
2. Create an account or sign in.
3. Open your dashboard.
4. Go to the API key section.
5. Copy your API key.
6. Paste it into `.env.local`.

```env
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

This key is optional if you do not need voice or transcription features.

## 11. Set Up the Database Tables

After adding `DATABASE_URL`, push the Drizzle schema to Neon:

```bash
npm run db:push
```

This creates the tables used by users, calendar items, kanban boards, notes, whiteboards, generated apps, spaces, and settings.

You can inspect the database with:

```bash
npm run db:studio
```

## 12. Run the App Locally

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Create a user account through the app sign-up page. After signing in, the app will sync the Clerk user into the database.

## 13. Build for Production

Before deploying, test a production build:

```bash
npm run build
```

Then run the production server locally:

```bash
npm run start
```

## 14. Deploying

For Vercel deployment:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add the same environment variables in the Vercel project settings.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. Add your production URL to Clerk allowed domains.
6. Deploy.

Production example:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Never use `localhost` as the production app URL.

## 15. Common Commands

```bash
npm install
npm run dev
npm run build
npm run start
npm run db:push
npm run db:studio
```

## 16. Troubleshooting

### Database connection fails

- Check that `DATABASE_URL` is correct.
- Keep `?sslmode=require` in the Neon connection string.
- Run `npm run db:push` again after changing database settings.

### Clerk sign in does not work

- Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Check `CLERK_SECRET_KEY`.
- Confirm the sign-in and sign-up URLs are `/sign-in` and `/sign-up`.
- Restart the dev server after editing `.env.local`.

### Live collaboration fails

- Check `LIVEBLOCKS_SECRET_KEY`.
- Make sure you copied the secret key, not a public key.
- Restart the dev server.

### AI features fail

- Check `GEMINI_API_KEY`.
- Confirm the key was created in Google AI Studio.
- Restart the dev server after editing `.env.local`.

### Voice or transcription fails

- Check `ASSEMBLYAI_API_KEY`.
- Confirm the key exists in your AssemblyAI dashboard.
- Restart the dev server.

### Environment changes are not loading

Stop and restart the development server:

```bash
npm run dev
```

Next.js only reads environment variables when the server starts.

## 17. Security Checklist

- Do not commit `.env.local`.
- Do not share secret keys publicly.
- Use test keys during development.
- Rotate keys if they are accidentally exposed.
- Store production keys only in your deployment provider, such as Vercel environment variables.

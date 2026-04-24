# HireWise AI — Backend

Node.js + Express + MongoDB REST API, plus Supabase Edge Functions.

## Stack
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT auth (bcryptjs + jsonwebtoken)
- Supabase Edge Functions (Deno) for AI screening

## Setup

```bash
npm install
npm run dev
```

Runs on http://localhost:5000

## Environment Variables

Fill in `backend/.env`:
```
MONGO_URI=
JWT_SECRET=
GEMINI_API_KEY=
PORT=5000
```

For Supabase edge functions:
```bash
supabase secrets set GEMINI_API_KEY=your_key_here
```

## Structure

```
src/
  controllers/    # Request handlers
  models/         # Mongoose models (User, Job, Applicant)
  routes/         # Express routes
  middleware/     # Auth middleware
  services/       # AI service (Gemini)

supabase/
  functions/
    screen-candidates/    # AI screening edge function
    candidate-feedback/   # AI feedback edge function
  migrations/             # Database migrations
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/jobs | List jobs |
| POST | /api/jobs | Create job |
| GET | /api/jobs/:id | Get job |
| POST | /api/jobs/:jobId/applicants | Add applicant |
| GET | /api/jobs/:jobId/applicants | List applicants |
| POST | /api/jobs/:jobId/applicants/screen | AI screen all applicants |
| GET | /api/jobs/:jobId/applicants/shortlist | Get shortlisted candidates |

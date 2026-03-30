# The Content Lab AI

A production-ready internal AI assistant built with Next.js App Router, Tailwind CSS, and OpenRouter.

## 1) Install dependencies

```bash
npm install
```

## 2) Add environment variables

Create `.env.local` in the project root and paste your real OpenRouter key:

```bash
OPENROUTER_API_KEY=your_real_openrouter_key
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

### Important security note

- Keep `OPENROUTER_API_KEY` only in `.env.local` or Vercel environment variables.
- Never hardcode the key in client components or commit it to git.
- This app already sends OpenRouter requests from `app/api/chat/route.ts` (server-side only), so the key is not exposed in browser code.

Create `.env.local` in the project root:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

## 3) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4) Deploy to Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add env vars in **Project Settings → Environment Variables**.
4. Deploy.

No additional build configuration is required.

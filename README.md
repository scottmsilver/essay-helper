# Essay Helper

A structured essay writing tool that guides students through building well-organized argumentative essays with real-time collaboration.

## Features

- **Structured Writing** - Break essays into components: hook, background, thesis, claims, body paragraphs with proof blocks, and conclusion
- **Proof Blocks** - Each body paragraph supports multiple quote/analysis/connection blocks
- **Real-time Sync** - Changes save automatically to Firebase
- **Collaboration** - Share essays with viewers or editors via email
- **Email Notifications** - Recipients get email invites when essays are shared
- **Public Links** - Generate shareable public links with viewer/editor access

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Firebase (Auth, Firestore) |
| Functions | Firebase Functions v2 |
| Email | Resend |
| Hosting | Fly.io (frontend), Firebase (functions) |
| Testing | Vitest, React Testing Library |

## Getting Started

### Prerequisites

- Node.js 22+
- Firebase project with Auth and Firestore enabled
- Fly.io account (for deployment)
- Resend API key (for email notifications)

### Installation

```bash
# Clone the repository
git clone https://github.com/scottmsilver/essay-helper.git
cd essay-helper

# Install dependencies
npm install
cd functions && npm install && cd ..

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your Firebase config
```

### Development

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint check
npm run build        # Production build to dist/
```

### Functions Development

```bash
cd functions
npm run serve        # Start Firebase emulators
npm run lint         # Lint functions code
npm test             # Run function tests
npm run deploy       # Deploy to Firebase
```

## Project Structure

```
essay-helper/
├── src/
│   ├── models/           # Pure data types and transformations
│   │   ├── essay.ts      # Essay structure (Intro, BodyParagraph, Conclusion)
│   │   └── document.ts   # Persistence wrapper types
│   ├── storage/          # Abstract storage interface
│   ├── firebase/         # Firestore implementation + Auth
│   ├── hooks/            # React state management
│   ├── components/       # UI components
│   └── App.tsx           # Router and main layout
├── functions/            # Firebase Cloud Functions
│   └── index.js          # Email notification on share
├── .github/workflows/    # CI/CD (lint, test, deploy)
└── fly.toml              # Fly.io deployment config
```

## Architecture

The codebase follows a layered architecture:

1. **Models** - Pure TypeScript types and immutable transformation functions. No React, no side effects.
2. **Storage Interface** - Abstract `EssayStorage` contract for persistence operations.
3. **Firebase Layer** - Firestore implementation with Timestamp normalization at the boundary.
4. **Hooks** - React hooks orchestrating state, storage, and model transformations.
5. **Components** - Presentational React components consuming hooks.

## Essay Structure

Essays are structured as:

```
Introduction
├── Hook (attention grabber)
├── Background (context)
├── Thesis (main argument)
└── Claims[] (supporting points)

Body Paragraphs[] (one per claim)
├── Purpose
├── Proof Blocks[]
│   ├── Quote (evidence)
│   ├── Analysis (explanation)
│   └── Connection (link to thesis)
├── Recap
└── Paragraph (final text)

Conclusion
├── Restatement (thesis rephrased)
├── So What (broader significance)
└── Paragraph (final text)
```

## Deployment

### Frontend (Fly.io)

```bash
flyctl deploy
```

Or push to `main` branch - GitHub Actions will deploy automatically.

### Functions (Firebase)

```bash
cd functions
npm run deploy
```

## Environment Variables

### Frontend (.env.local)

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Functions (Firebase Secrets)

```bash
firebase functions:secrets:set RESEND_API_KEY
```

## License

Private project.

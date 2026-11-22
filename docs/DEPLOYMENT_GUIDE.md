# TalentAI Production Deployment & Operations Guide

## 1. Prerequisites & Environment Configuration

### 1.1 Environment Variables
Create a local `.env.local` or configure Google Cloud Secret Manager for production:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="talent-matrix-ai.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="talent-matrix-ai"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="talent-matrix-ai.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef"

# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID="talent-matrix-ai"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@talent-matrix-ai.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Gemini Developer API Configuration
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL_PRIMARY="gemini-4-neon"
GEMINI_MODEL_REASONING="gemini-4-carbon"
GEMINI_MODEL_FAST="gemini-4-hydrogen"
GEMINI_MODEL_FALLBACK="gemini-3.8-flash"

# Isolated Sandbox Worker Configuration
SANDBOX_WORKER_URL="https://sandbox-worker.internal.talentai.io"
SANDBOX_WORKER_SECRET="secure-worker-auth-token"
ALLOW_LOCAL_SUBPROCESS_SANDBOX="false"
```

---

## 2. Deploying Firebase Rules & Indexes

Install the Firebase CLI and authenticate:
```bash
npm install -g firebase-tools
firebase login
firebase use talent-matrix-ai
```

Deploy Firestore & Storage security rules:
```bash
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

---

## 3. Production Build & Execution

### 3.1 Next.js Build
```bash
npm ci
npm run build
```

### 3.2 Running the Production Server
```bash
npm start -- -p 3000
```

---

## 4. Rollback Strategy
If a deployment defect is detected:
1. Revert to the last stable container image or git commit SHA.
2. In Cloud Run or Kubernetes, direct 100% of traffic to the prior revision.
3. Firestore schemas are non-destructive and backward-compatible.

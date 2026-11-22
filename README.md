# TalentAI
## AI-Powered Engineer Recruitment & Job Role Recommendation Platform

TalentAI is a production-grade AI-powered recruitment intelligence platform built on Next.js 15, Firebase architecture, and Google Gemini models. It systematically distinguishes **what candidates claim** from **what can be independently verified**, **what they can demonstrate in code and adaptive interviews**, and **which engineering roles genuinely match**.

---

## Key Features

### 1. 5-Tier Evidence Hierarchy
- **Tier 1 (Candidate-Claimed)**: Self-reported skills on profile/resume ($\times 0.1$ weight).
- **Tier 2 (Resume-Extracted)**: Extracted via Gemini NLP within chronological experience ($\times 0.2$ weight).
- **Tier 3 (Project-Supported)**: Supported by architecture diagrams, codebases, and GitHub repositories ($\times 0.4$ weight).
- **Tier 4 (Independently Verified)**: Validated via official credential providers and registrar APIs ($\times 0.7$ weight).
- **Tier 5 (Assessment-Demonstrated)**: Proven via adaptive technical interviews and deterministic coding sandboxes ($\times 1.0$ weight).

### 2. Portals
- **Candidate Portal** (`/candidate/dashboard`): Profile management, resume intelligence extraction, adaptive AI technical interviews, isolated coding sandboxes, and multi-role compatibility matching.
- **Recruiter Portal** (`/recruiter/dashboard`): Pipeline management, AI job requirement builder, candidate deep-dive dossiers, and human hiring decision recording with immutable audit logs.
- **Administrator Portal** (`/admin/dashboard`): User administration, 16-role taxonomy rubrics manager, live Gemini telemetry and connectivity diagnostics, and compliance audit trail.

### 3. Isolated Code Execution Sandbox
- Deterministic evaluation of candidate submissions in JavaScript, TypeScript, and Python.
- Isolated VM context and bounded process execution with strict CPU time caps (3000ms), memory limits, and network restrictions.

### 4. Official `@google/genai` Integration
- Supported model tiers:
  - `GEMINI_MODEL_PRIMARY=gemini-4-neon`
  - `GEMINI_MODEL_REASONING=gemini-4-carbon`
  - `GEMINI_MODEL_FAST=gemini-4-hydrogen`
  - `GEMINI_MODEL_FALLBACK=gemini-3.8-flash`
- Strict Zod schema validation on 100% of structured outputs.
- Prompt injection defense boundaries and untrusted content sanitization.

---

## Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm
- Python 3.10+ (for Python sandbox evaluation)

### Installation
```bash
git clone https://github.com/ASstyles/TalentAI.git
cd TalentAI
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local` and add your Google Gemini API key:
```bash
cp .env.example .env.local
```
Key variables:
- `GEMINI_API_KEY`: Obtain from [Google AI Studio](https://aistudio.google.com/apikey)

### Running Automated Tests
```bash
npm test
```
Runs 26 unit, security, and end-to-end recruitment lifecycle tests.

### Running the Application
```bash
# Build for production
npm run build

# Start production server
npm run start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

# ACCESSMATE AI — "Information Without Barriers"

> **Hackathon Theme:** AI for Accessibility & Inclusion  
> **AI Engine:** Google `@google/genai` SDK (`gemini-3.8-flash` Native Multimodal)  
> **Accessibility Compliance:** WCAG 2.2 AA / AAA High-Contrast, Reduced Motion, Voice & Screen-Reader Ready

**ACCESSMATE AI** is a full-stack multimodal accessibility assistant that extracts text from documents and images, simplifies complex bureaucratic/medical/legal language into plain everyday words, translates into 6 Indian languages (**Kannada, Hindi, Tamil, Telugu, Malayalam, English**) with context preservation, describes visual scenes for blind and low-vision users (explicitly separating confirmed visible facts from uncertain details), provides an interactive **AI Voice Assistant** powered by Web Speech API (`SpeechRecognition` + `speechSynthesis`), and reads every AI output aloud.

---

## 1. Key Accessibility & AI Capabilities

1. **AI Document Reader & Plain-Language Simplifier (`gemini-3.8-flash` Multimodal)**
   - Upload PDFs, scanned government circulars, medical discharge reports, photos (`JPG`/`PNG`/`WEBP`), or `.txt` files (up to 10MB).
   - Performs full OCR, generates a 6th-grade reading level summary, step-by-step plain-language breakdown, actionable takeaways, jargon glossary, and contextual document Q&A.
2. **Multilingual Indian Language Translator**
   - Translates into **Kannada (ಕನ್ನಡ)**, **Hindi (हिन्दी)**, **Tamil (தமிழ்)**, **Telugu (తెలుగు)**, **Malayalam (മലയാളം)**, and **English** with optional pre-simplification, phonetic pronunciation guides, and native Text-to-Speech.
3. **AI Vision Image Describer for Blind & Low-Vision Users**
   - Generates spatial scene descriptions, WCAG alt-text, OCR sign transcription, and **strictly separates 100% confirmed visible facts from uncertain/inferred details**.
4. **Interactive AI Voice Assistant (Web Speech API + Document Context)**
   - Hands-free microphone voice input (`SpeechRecognition` / `webkitSpeechRecognition`) and automatic spoken replies (`window.speechSynthesis`) across all 6 supported Indian languages.
   - Select any saved document as live context to ask spoken or typed questions via `POST /api/assistant/chat`.
5. **WCAG 2.2 AA / AAA Accessibility Quick-Bar**
   - **Text Scaling:** `Normal` (`16px`), `Large` (`18.5px`), and `XL` (`21px`).
   - **High-Contrast Mode:** Instant WCAG AAA high-contrast dark/yellow theme (`html.high-contrast-mode`).
   - **Reduced Motion Mode:** Disables non-essential animations and transitions (`html.reduced-motion-mode`) for vestibular and cognitive comfort.
   - **Global Stop Speech (`Esc`):** Immediately stops any active speech synthesis from anywhere in the app.

---

## 2. Monorepo Architecture & Folder Tree

```text
accessmate-ai/
├── README.md
├── package.json
├── render.yaml
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── db.js                   # MongoDB Atlas connection + automatic In-Memory fallback
│       │   ├── env.js                  # Environment variable loader & validation
│       │   └── gemini.js               # Official @google/genai client (gemini-3.8-flash)
│       ├── controllers/
│       │   ├── activity.controller.js
│       │   ├── assistant.controller.js # Interactive AI Voice Assistant controller
│       │   ├── auth.controller.js
│       │   ├── document.controller.js
│       │   ├── image.controller.js
│       │   └── translate.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js      # JWT Bearer authentication guard
│       │   ├── error.middleware.js     # Centralized Express/Zod/Multer error handler
│       │   ├── upload.middleware.js    # Multer memoryStorage (10MB limit)
│       │   └── validate.middleware.js  # Zod request body validator
│       ├── models/
│       │   ├── Activity.model.js
│       │   ├── Document.model.js
│       │   └── User.model.js
│       ├── routes/
│       │   ├── activity.routes.js
│       │   ├── assistant.routes.js     # POST /api/assistant/chat
│       │   ├── auth.routes.js
│       │   ├── document.routes.js
│       │   ├── image.routes.js
│       │   └── translate.routes.js
│       ├── services/
│       │   ├── gemini.service.js       # Multimodal OCR, Simplifier, Q&A, Translator, Vision, Voice Chat
│       │   ├── seed.service.js         # 1-Click Judge Demo user & 2 sample accessible documents
│       │   └── storage.service.js      # Unified Mongoose + In-Memory datastore layer
│       └── utils/
│           ├── ApiError.js
│           ├── jwt.utils.js
│           └── validators.js           # Zod schemas
└── frontend/
    ├── .env.example
    ├── .env
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vercel.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css                   # WCAG 2.2 AA/AAA focus rings, font scaling, high-contrast & reduced-motion
        ├── main.jsx
        ├── components/
        │   ├── ListenButton.jsx        # Reusable window.speechSynthesis Listen/Stop button
        │   ├── Navbar.jsx              # Global Top Navbar + Accessibility Quick-Bar (Text, Contrast, Motion, Speech)
        │   ├── ProtectedRoute.jsx
        │   └── dashboard/
        │       ├── DocumentReaderTab.jsx
        │       ├── ImageDescriberTab.jsx
        │       ├── RecentActivityTab.jsx
        │       ├── TranslatorTab.jsx
        │       └── VoiceAssistantTab.jsx
        ├── context/
        │   ├── AccessibilityContext.jsx
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── AuthPage.jsx
        │   ├── DashboardPage.jsx
        │   └── LandingPage.jsx
        └── services/
            └── api.js
```

---

## 3. REST API Endpoints (`/backend`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Health check returning MongoDB status, Gemini configuration status, and model (`gemini-3.8-flash`) |
| `POST` | `/api/auth/register` | Public | Register a new user (Zod validated, `bcrypt` password hash, returns JWT) |
| `POST` | `/api/auth/login` | Public | Authenticate existing user and return Bearer JWT |
| `POST` | `/api/auth/demo` | Public | **1-Click Judge Demo Login**: auto-seeds demo user + 2 sample accessible documents |
| `GET` | `/api/auth/me` | Bearer JWT | Fetch current authenticated user profile |
| `POST` | `/api/documents/analyze` | Bearer JWT | `multer` file upload (`PDF`/`JPG`/`PNG`/`WEBP`/`TXT`) or `pastedText` -> `gemini-3.8-flash` OCR + plain-language simplification |
| `POST` | `/api/documents/:id/ask` | Bearer JWT | Contextual plain-language Q&A on a saved document |
| `GET` | `/api/documents` | Bearer JWT | List all saved documents for the authenticated user |
| `DELETE` | `/api/documents/:id` | Bearer JWT | Delete a saved document |
| `POST` | `/api/translate` | Bearer JWT | Context-aware translation into Kannada, Hindi, Tamil, Telugu, Malayalam, or English |
| `POST` | `/api/images/describe` | Bearer JWT | `multer` image upload -> Gemini Vision screen-reader report separating visible facts from inferences |
| `POST` | `/api/assistant/chat` | Bearer JWT | Interactive AI Voice Assistant chat (`gemini-3.8-flash`) with optional `documentId` context, `language`, and `history` |
| `GET` | `/api/activity` | Bearer JWT | Fetch recent user activity timeline + workspace statistics |

### `POST /api/assistant/chat` Payload & Response Example

**Request Body (`application/json`):**
```json
{
  "message": "What is the maximum income limit and monthly pension amount?",
  "documentId": "6735a9c0e4b0a1b2c3d4e5f6",
  "language": "English",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hello! How can I help you understand your document today?" }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "reply": "To qualify for this scheme, your total family income must be 22,500 rupees per month or less, and you need a UDID card showing at least 40 percent disability. Eligible applicants receive a monthly pension allowance of 2,500 rupees directly in their Aadhaar-linked bank account, plus up to 15,000 rupees for assistive devices.",
  "followUpSuggestions": [
    "Which assistive devices are covered under the 15,000 rupee grant?",
    "Is fingerprint scanning required to receive the monthly pension?",
    "How can I appeal if my application is rejected?"
  ],
  "language": "English",
  "documentTitle": "RPwD Act — Assistive Device & Disability Pension Circular 2026",
  "aiMode": "gemini-3.8-flash"
}
```

---

## 4. Complete Local Setup Instructions

### Prerequisites
- **Node.js** `v18+` (or `v20+` recommended) and `npm`
- **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)
- **MongoDB Atlas URI** (optional for instant local testing — if omitted or unreachable, the backend automatically falls back to an In-Memory Datastore)

### Step 1: Install Dependencies
From the repository root (`accessmate-ai/`):
```bash
npm run install:all
```
Or install in each folder individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Configure Environment Variables
1. Create or update `backend/.env` (see `backend/.env.example`):
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/accessmate?retryWrites=true&w=majority
   GEMINI_API_KEY=your_real_gemini_api_key_here
   JWT_SECRET=accessmate_super_secret_jwt_key_change_in_production_2026
   FRONTEND_URL=http://localhost:5173
   ```
2. Create or verify `frontend/.env` (see `frontend/.env.example`):
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Step 3: Start Development Servers
Run the backend and frontend in two terminals from the project root:
```bash
# Terminal 1 — Start Backend API (http://localhost:5000)
npm run dev:backend

# Terminal 2 — Start Frontend Vite App (http://localhost:5173)
npm run dev:frontend
```
Verify backend health at `http://localhost:5000/api/health` and open the app at `http://localhost:5173`. Click **1-Click Demo Login (Judges)** on the landing page to immediately test all 5 workspace tools with pre-seeded accessible documents.

---

## 5. Deployment Guide: Render (Backend) + Vercel (Frontend)

### Part A: Deploy Backend to Render
1. Push the repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service** (or select **Blueprint** to auto-import the root `render.yaml`).
3. Configure the service:
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `MONGO_URI` = your MongoDB Atlas `mongodb+srv://...` connection string
   - `GEMINI_API_KEY` = your Google Gemini API key
   - `JWT_SECRET` = a strong production secret string
   - `FRONTEND_URL` = your deployed Vercel URL (e.g., `https://accessmate-ai.vercel.app`)
5. Deploy and verify `https://<your-render-service>.onrender.com/api/health` returns `"success": true`.

### Part B: Deploy Frontend to Vercel
1. Open the [Vercel Dashboard](https://vercel.com/new) and import your GitHub repository.
2. Configure the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
4. Click **Deploy**. `frontend/vercel.json` is pre-configured to rewrite all SPA routes (`/(.*) -> /index.html`) so direct navigation to `/dashboard` or `/auth` works seamlessly.

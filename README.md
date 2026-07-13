<div align="center">
  <img width="120" alt="ValPortal Logo" src="./public/logo.webp" />
  <h1>ValPortal.NET</h1>
  <p>A comprehensive web-based toolkit for VALORANT players</p>

  ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square)
  ![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)
  ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase&logoColor=white&style=flat-square)
  ![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white&style=flat-square)
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Tactical Map Planner** | Drag & drop strategy board with agent lineups |
| 🎯 **Crosshair Builder** | Live crosshair preview and generator |
| 🔭 **Aim Trainer** | Browser-based aim training simulator |
| 📊 **Tier List Maker** | Drag-and-drop agent/weapon/map tier lists with PNG export |
| 🃏 **Cosmetic Hub** | VALORANT player ID card & lobby banner generator |
| ⚙️ **Sensitivity Converter** | Cross-game sensitivity & eDPI calculator |
| 🎲 **Draft Simulator** | Simulated competitive agent draft analyzer |
| 🌐 **Multi-language** | Full EN / ID language support |
| 🔐 **Auth System** | Supabase-powered user accounts & profiles |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/harismusafa11/valportal.git
cd valportal

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in your values in .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY   # server-side only
```

> ⚠️ **Never commit `.env` to GitHub.** The `.gitignore` already excludes it.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase
- **Animations**: Motion (Framer Motion)
- **Drag & Drop**: @hello-pangea/dnd
- **Icons**: Lucide React
- **Deployment**: Vercel

---

## 📁 Project Structure

```
src/
├── components/       # Page components (AimTrainer, TierListMaker, etc.)
│   └── ads/          # Adsterra banner ad components
├── config/           # adsConfig.ts — ad configuration
├── hooks/            # Custom React hooks
├── lib/              # Supabase client, auth, language context
├── types/            # TypeScript interfaces
└── data/             # Static data (agents, lineups, crosshairs)
```

---

## 📄 License

MIT © [harismusafa11](https://github.com/harismusafa11)

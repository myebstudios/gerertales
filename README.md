# GérerTales · Editorial Studio 🐺

> **Turn sparks into masterpieces with architectural precision.**

![GérerTales Banner](https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=2000&ixlib=rb-4.0.3)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**GérerTales** is a high-end editorial studio where human creativity meets neural intelligence. Designed for visionary storytellers, the platform moves beyond simple chat-based AI to provide a structured, architectural approach to world-building and narrative design.

---

## ✨ Features

### 🧠 Neural Architecture
-   **Intelligent Spark Analysis**: Determines optimal tone, format, and structure from a single sentence concept.
-   **Blueprint Generation**: Auto-generates detailed character profiles, locations, and chapter outlines.
-   **Co-Authoring**: Real-time AI assistance for expanding prose, overcoming writer's block, and refining dialogue.

### 🌍 World Building
-   **Dramatis Personae**: Deep character sheets with traits, roles, and backstories.
-   **World Atlas**: Location management with atmospheric descriptions and sensory details.
-   **Dynamic Visuals**: AI-generated cover art and chapter banners to visualize your world.

### ✍️ Premium Editor
-   **Distraction-Free Mode**: Immersive writing interface with focus mode.
-   **Sensory Enhancements**: Ambient backgrounds and adaptive UI.
-   **TTS Integration**: Listen to your drafts with premium neural voices (ElevenLabs/WebSpeech).

### 🚀 Production Ready
-   **Guest Mode**: Start writing immediately without an account; migrate data seamlessly upon sign-up.
-   **Professional Export**: Generate formatted Roman-ready PDFs with cover art, or export raw text/markdown.
-   **Cross-Device**: Fully responsive design for writing on desktop, tablet, or mobile.

---

## 🛠️ Tech Stack

-   **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
-   **AI/ML**: xAI (Grok-2/beta) for text & imagery
-   **Backend/Auth**: Supabase (PostgreSQL, Realtime, Edge Functions)
-   **State**: Zustand
-   **Audio**: ElevenLabs API, Web Speech API
-   **Testing**: Vitest, Playwright

---

## 🚀 Getting Started

### Prerequisites
-   Node.js 18+
-   Supabase Account
-   xAI API Key (optional for AI features)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/myebstudios/gerertales.git
    cd gerertales
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file with your credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key
    VITE_XAI_API_KEY=your_xai_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build**
    ```bash
    npm run build
    ```

---

## 📂 Project Structure

```text
src/
├── components/     # UI Components (Blueprint, Reader, Library)
├── services/       # API Integrations (Supabase, xAI, Audio)
├── styles/         # Global styles & Tailwind config
├── types.ts        # TypeScript definitions
└── App.tsx         # Main router & layout logic
```

---

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contribution Guidelines](CONTRIBUTING.md) before submitting a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>© 2026 GérerTales Editorial Studio</p>
  <p><i>Crafted with ❤️ by the GérerTales Team</i></p>
</div>

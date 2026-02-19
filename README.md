<div align="center">

# 🎬 WatchSpace

**Watch videos together in real-time — no sign-up required.**

P2P watch party app with synchronized playback, video sharing, live chat, and camera/mic support.

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Video.js](https://img.shields.io/badge/Video.js-000000?style=for-the-badge&logo=videojs&logoColor=white)](https://videojs.com/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Elysia](https://img.shields.io/badge/Elysia-8B5CF6?style=for-the-badge)](https://elysiajs.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📸 Screenshots

<!-- Replace with actual screenshots after UI is built -->

| Landing Page | Room Page |
|:---:|:---:|
| ![Landing Page](docs/screenshots/landing.png) | ![Room Page](docs/screenshots/room.png) |

| Waiting Screen | Screen Sharing |
|:---:|:---:|
| ![Waiting](docs/screenshots/waiting.png) | ![Screen Share](docs/screenshots/screenshare.png) |

---

## ✨ Features

- 🔗 **Instant Rooms** — Create a room and share the link. No sign-up, no accounts.
- 📹 **P2P Video Sharing** — Share video files directly between peers via WebRTC data channels.
- 🔄 **Synchronized Playback** — Play, pause, and seek stay in sync across all participants.
- 💬 **Real-Time Chat** — Peer-to-peer chat with zero server involvement.
- 🎥 **Camera & Mic** — See and hear your friends while watching.
- 🖥️ **Screen Sharing** — Share your screen inside the watch party.
- 🌐 **TURN Fallback** — Reliable connectivity even behind strict NATs via Metered.ca.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [SvelteKit](https://kit.svelte.dev/) + [TailwindCSS](https://tailwindcss.com/) + [Video.js](https://videojs.com/) |
| Backend | [Bun](https://bun.sh/) + [Elysia.js](https://elysiajs.com/) |
| State | [Upstash Redis](https://upstash.com/) (serverless) |
| P2P | [WebRTC](https://webrtc.org/) via [simple-peer](https://github.com/feross/simple-peer) + MediaSource API |
| TURN | [Metered.ca](https://www.metered.ca/) |
| Monorepo | [Turborepo](https://turbo.build/) |
| Deployment | [Vercel](https://vercel.com/) (frontend) + [Fly.io](https://fly.io/) (backend) |

---

## 📁 Project Structure

```
watchspace/
├── apps/
│   ├── web/              # SvelteKit frontend
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── components/   # UI components
│   │   │   │   ├── stores/       # Svelte stores
│   │   │   │   ├── utils/        # Helpers
│   │   │   │   ├── webrtc/       # WebRTC logic
│   │   │   │   └── sync/         # Playback sync
│   │   │   └── routes/           # SvelteKit pages
│   │   └── tests/
│   │
│   └── server/           # Bun + Elysia signaling server
│       ├── src/
│       │   ├── routes/       # REST + WebSocket
│       │   ├── rooms/        # Room management
│       │   └── redis/        # Upstash client
│       └── tests/
│
├── packages/
│   └── shared/           # Shared types & constants
│
├── docs/                 # Documentation
└── .github/              # CI/CD & templates
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.1+ (or Node.js 20+)
- [Upstash Redis](https://upstash.com/) account (free tier works)
- [Metered.ca](https://www.metered.ca/) account for TURN servers (optional, for NAT traversal)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/watchspace.git
cd watchspace
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

```bash
# Server
cp apps/server/.env.example apps/server/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

Edit the `.env` files with your credentials (see [Environment Variables](#-environment-variables) below).

### 4. Start development servers

```bash
bun run dev
```

This launches both apps concurrently via Turborepo:

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Server | `http://localhost:3001` |

---

## 🔐 Environment Variables

### `apps/server/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: `3001`) |
| `FRONTEND_URL` | No | CORS origin (default: `http://localhost:5173`) |
| `UPSTASH_REDIS_REST_URL` | **Yes** | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | **Yes** | Upstash Redis REST token |

### `apps/web/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Server API base URL (default: `http://localhost:3001/api`) |
| `VITE_SIGNALING_URL` | No | WebSocket URL (default: `ws://localhost:3001/ws`) |
| `VITE_METERED_API_KEY` | No | Metered.ca API key for TURN servers |

---

## 🌍 Deployment

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com/).
2. Set the **Root Directory** to `apps/web`.
3. Set the **Build Command** to `bun run build`.
4. Add the `VITE_*` environment variables to Vercel's project settings.
5. Deploy.

### Backend → Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# From the server directory
cd apps/server

# Launch the app
fly launch

# Set secrets
fly secrets set UPSTASH_REDIS_REST_URL="..." UPSTASH_REDIS_REST_TOKEN="..."
fly secrets set FRONTEND_URL="https://your-app.vercel.app"

# Deploy
fly deploy
```

---

## 🧪 Testing

```bash
# Run all tests
bun run test

# Run frontend tests only
bun run test --filter=@watchspace/web

# Run backend tests only
bun run test --filter=@watchspace/server
```

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](docs/contributing.md) for details on:

- Setting up the development environment
- Code style and formatting
- Pull request process
- Branch naming conventions

---

## 📝 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — always deployable |
| `dev` | Development integration branch |
| `feature/<name>` | New features (branch from `dev`) |
| `fix/<name>` | Bug fixes (branch from `dev`) |

```
main ◄── (merge when ready for release)
 │
dev  ◄── feature/video-sync
     ◄── feature/chat-ui
     ◄── fix/websocket-reconnect
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Made with ❤️ using SvelteKit, WebRTC, and Bun

</div>

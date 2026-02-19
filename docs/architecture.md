# WatchSpace — Architecture

## Overview

WatchSpace is a peer-to-peer (P2P) watch party application that enables synchronized video playback, real-time chat, screen sharing, and camera/mic communication — all without uploading files to a server.

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Peer A)                       │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Video.js│  │ Chat UI  │  │ PeerVideo │  │ Screen   │ │
│  │ Player  │  │          │  │ Tiles     │  │ Share    │ │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘ │
│       │            │              │              │        │
│  ┌────▼────────────▼──────────────▼──────────────▼─────┐ │
│  │           WebRTC (simple-peer)                      │ │
│  │   Data Channels (chat, file, sync) + Media Streams  │ │
│  └────────────────────────┬────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────┘
                            │ signaling
              ┌─────────────▼──────────────┐
              │   Signaling Server (Elysia) │
              │   WebSocket + REST API      │
              │   Upstash Redis (rooms)     │
              └─────────────┬──────────────┘
                            │ signaling
┌───────────────────────────┼──────────────────────────────┐
│                    Browser (Peer B)                       │
│                    (same as Peer A)                       │
└──────────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Decision                  | Rationale                                                |
| ------------------------- | -------------------------------------------------------- |
| P2P via WebRTC            | No server bandwidth costs; low latency                   |
| simple-peer               | Thin wrapper over RTCPeerConnection; less boilerplate    |
| DataChannel file transfer | Avoids uploading large video files to a server           |
| MediaSource API           | Stream chunks into the player for instant playback       |
| Upstash Redis             | Serverless Redis for room state; scales with Fly.io      |
| Anonymous users (UUID)    | Zero-friction onboarding; no auth complexity             |
| Metered.ca TURN fallback  | Reliable connectivity behind restrictive NATs/firewalls  |
| Turborepo monorepo        | Shared types/constants across frontend and backend       |

## Data Flow

1. **Room Creation** — Host calls `POST /api/rooms` → room stored in Redis → receives room ID.
2. **Room Joining** — Peer opens `/room/:id` → calls `POST /api/rooms/:id/join` → connects WebSocket.
3. **Peer Connection** — Signaling server relays offer/answer/ICE → simple-peer establishes P2P.
4. **Video Transfer** — Host chunks video file → sends via DataChannel → receiver reassembles via MediaSource.
5. **Playback Sync** — Play/pause/seek events broadcast to all peers → drift correction applied.
6. **Chat** — Messages sent directly over DataChannels (no server involvement after connection).
7. **Camera/Mic** — MediaStreams shared via WebRTC media tracks.
8. **Screen Sharing** — `getDisplayMedia` stream → replaces/adds track on peer connections.

## Deployment Topology

| Service           | Platform       | Notes                                     |
| ----------------- | -------------- | ----------------------------------------- |
| SvelteKit Web     | Vercel         | Edge-deployed, SSR via @sveltejs/adapter-vercel |
| Elysia Server     | Fly.io         | WebSocket-capable, low-latency regions    |
| Room State        | Upstash Redis  | Serverless, auto-scales, REST-based SDK   |
| TURN Server       | Metered.ca     | Global TURN relays, pay-per-use           |

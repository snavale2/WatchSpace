# WatchSpace — API Reference

## REST API

Base URL: `http://localhost:3001/api`

### Health Check

```
GET /health
```

**Response:**
```json
{ "status": "ok", "timestamp": 1708000000000 }
```

---

### Rooms

#### Create Room

```
POST /api/rooms
```

**Body:**
```json
{ "hostId": "uuid-string" }
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "aBcD1234",
    "hostId": "uuid-string",
    "createdAt": 1708000000000,
    "peers": ["uuid-string"]
  }
}
```

#### Get Room

```
GET /api/rooms/:roomId
```

#### Join Room

```
POST /api/rooms/:roomId/join
```

**Body:**
```json
{ "userId": "uuid-string" }
```

#### Leave Room

```
POST /api/rooms/:roomId/leave
```

**Body:**
```json
{ "userId": "uuid-string" }
```

---

## WebSocket API

**Endpoint:** `ws://localhost:3001/ws?userId=<UUID>&roomId=<ROOM_ID>`

### Message Format

All messages use a JSON envelope:

```json
{
  "event": "event:name",
  "data": { ... }
}
```

### Events

| Event                  | Direction       | Description                    |
| ---------------------- | --------------- | ------------------------------ |
| `room:peer-joined`     | Server → Client | A new peer joined the room     |
| `room:peer-left`       | Server → Client | A peer left the room           |
| `signal:offer`         | Client → Server → Client | WebRTC SDP offer       |
| `signal:answer`        | Client → Server → Client | WebRTC SDP answer      |
| `signal:ice-candidate` | Client → Server → Client | ICE candidate          |
| `sync:play`            | Client → Server → Peers  | Play event             |
| `sync:pause`           | Client → Server → Peers  | Pause event            |
| `sync:seek`            | Client → Server → Peers  | Seek event             |
| `error`                | Server → Client | Error message                  |

### Signal Message Payload

```json
{
  "type": "offer",
  "senderId": "uuid-a",
  "targetId": "uuid-b",
  "roomId": "aBcD1234",
  "payload": { /* SDP or ICE candidate */ }
}
```

### Sync Event Payload

```json
{
  "type": "play",
  "currentTime": 42.5,
  "timestamp": 1708000000000,
  "senderId": "uuid-a"
}
```

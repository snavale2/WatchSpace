// ──────────────────────────────────────────────
// WatchSpace — WebSocket Signaling Client
// ──────────────────────────────────────────────

import { WS_EVENTS } from '@watchspace/shared';
import type { WSMessage } from '@watchspace/shared';

export type MessageHandler = (msg: WSMessage) => void;

export class SignalingClient {
    private ws: WebSocket | null = null;
    private handlers = new Map<string, MessageHandler[]>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(
        private url: string,
        private userId: string,
        private roomId: string,
    ) { }

    /** Connect to the signaling server */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = `${this.url}?userId=${this.userId}&roomId=${this.roomId}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg: WSMessage = JSON.parse(event.data);
                    const handlers = this.handlers.get(msg.event) || [];
                    handlers.forEach((h) => h(msg));
                } catch (err) {
                    console.error('[Signaling] Parse error:', err);
                }
            };

            this.ws.onclose = () => {
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => {
                console.error('[Signaling] WebSocket error:', err);
                reject(err);
            };
        });
    }

    /** Register an event handler */
    on(event: string, handler: MessageHandler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
    }

    /** Remove an event handler */
    off(event: string, handler: MessageHandler) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            this.handlers.set(
                event,
                handlers.filter((h) => h !== handler),
            );
        }
    }

    /** Send a message to the signaling server */
    send(event: string, data: unknown) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data }));
        }
    }

    /** Clean up the connection */
    disconnect() {
        this.maxReconnectAttempts = 0; // prevent reconnect
        this.ws?.close();
        this.ws = null;
        this.handlers.clear();
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
        setTimeout(() => this.connect(), delay);
    }
}

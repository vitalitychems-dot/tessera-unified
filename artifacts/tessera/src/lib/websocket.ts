type MessageHandler = (data: any) => void;

class TesseraWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private subscriptions = new Set<string>();
  private onOpenCallbacks: Array<() => void> = [];

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        for (const channel of this.subscriptions) {
          this.ws?.send(JSON.stringify({ type: "subscribe", channel }));
        }
        const cbs = this.onOpenCallbacks.splice(0);
        for (const cb of cbs) {
          try { cb(); } catch {}
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const channel = data.channel || "system";
          const handlers = this.handlers.get(channel);
          if (handlers) {
            for (const handler of handlers) {
              try { handler(data); } catch {}
            }
          }
          const allHandlers = this.handlers.get("*");
          if (allHandlers) {
            for (const handler of allHandlers) {
              try { handler(data); } catch {}
            }
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  send(data: object): boolean {
    const payload = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return true;
    }
    this.onOpenCallbacks.push(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(payload);
      }
    });
    this.connect();
    return false;
  }

  subscribe(channel: string, handler: MessageHandler) {
    this.subscriptions.add(channel);
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", channel }));
    }

    return () => {
      this.handlers.get(channel)?.delete(handler);
      if (this.handlers.get(channel)?.size === 0) {
        this.handlers.delete(channel);
        this.subscriptions.delete(channel);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "unsubscribe", channel }));
        }
      }
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const tesseraWS = new TesseraWebSocket();

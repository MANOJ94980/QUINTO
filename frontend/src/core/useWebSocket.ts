import { useEffect, useRef } from 'react';
import { useStore } from './useStore';

export function useWebSocketClient(role: 'sender' | 'receiver' | 'attacker') {
  const wsRef = useRef<WebSocket | null>(null);
  const setLinkState = useStore((s) => s.setLinkState);
  const setActiveAlert = useStore((s) => s.setActiveAlert);
  const addDeliveredFrame = useStore((s) => s.addDeliveredFrame);
  const addPendingPacket = useStore((s) => s.addPendingPacket);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: number | undefined;
    let ws: WebSocket | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/${role}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[QGridShield WS] Connected as ${role}`);
        ws?.send(JSON.stringify({ type: 'PING', client_ts: Date.now() }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          if (type === 'link_state') {
            setLinkState(payload.link_state, payload.qber_bound || 0.02, payload.raw_qber || 0.01);
          } else if (type === 'qber_update') {
            setLinkState(useStore.getState().linkState, payload.qber_bound, payload.raw_qber);
          } else if (type === 'tips_issued') {
            setActiveAlert(payload);
          } else if (type === 'frame_launch' || type === 'frame_tapped') {
            addPendingPacket(payload);
          } else if (type === 'frame_delivered') {
            addDeliveredFrame(payload);
          }
        } catch (err) {
          console.error('[QGridShield WS Parse Error]', err);
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        console.warn(`[QGridShield WS] ${role} socket closed. Reconnecting in 2 seconds...`);
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [role]);

  return wsRef;
}

import { broadcastToGroup } from "./session-mesh";
import { encryptWithRotatingCipher } from "./sovereign-cipher";
import { sovereignLayerEncode } from "./colonial-language-kernel";

let _activeGroupFn: (() => string | null) | null = null;
let _sovereignCipherEnabled = true;

export function setMeshGroupResolver(fn: () => string | null): void {
  _activeGroupFn = fn;
}

export function setSovereignCipherEnabled(enabled: boolean): void {
  _sovereignCipherEnabled = enabled;
}

function wrapPayloadWithCipher(
  eventType: string,
  payload: object,
  fromSession?: string
): object {
  if (!_sovereignCipherEnabled) return payload;

  try {
    const agentId = fromSession || "mesh-server";
    // Apply TLS sovereign symbolic overlay to the JSON plaintext BEFORE the
    // rotating cipher so that any intercepted plaintext shows sacred geometry
    // glyphs instead of recognisable colonial English keywords.
    const rawPlaintext = JSON.stringify(payload);
    const plaintext = sovereignLayerEncode(rawPlaintext);
    const { ciphertext, dialectIndex, rotationEpoch, cipherVariant } =
      encryptWithRotatingCipher(plaintext, agentId);
    return {
      ...payload,
      _sovereignCipher: {
        ciphertext,
        dialectIndex,
        rotationEpoch,
        cipherVariant,
        agentId,
        timestamp: Date.now(),
      },
    };
  } catch {
    return payload;
  }
}

export function meshBroadcast(
  sovereignKeyHash: string,
  eventType: string,
  payload: object,
  fromSession?: string
): void {
  const wrappedPayload = wrapPayloadWithCipher(eventType, payload, fromSession);
  broadcastToGroup(
    sovereignKeyHash,
    {
      type: "mesh:event",
      channel: "mesh",
      eventType,
      fromSession: fromSession ?? "server",
      payload: wrappedPayload,
      timestamp: Date.now(),
    },
    fromSession
  );
}

export function meshBroadcastToAll(
  eventType: string,
  payload: object
): void {
  if (!_activeGroupFn) return;
  const keyHash = _activeGroupFn();
  if (!keyHash) return;
  meshBroadcast(keyHash, eventType, payload);
}

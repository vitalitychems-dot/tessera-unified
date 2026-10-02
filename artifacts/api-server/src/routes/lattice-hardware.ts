import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface HardwarePeer {
  peerId: string;
  deviceType: "uplink-backbone" | "lora-repeater" | "sensor-node" | "compute-node" | "unknown";
  displayName: string;
  ipAddress?: string;
  capabilities: string[];
  connectionType: "hardware";
  status: "online" | "offline" | "connecting";
  lastSeen: number;
  registeredAt: number;
  bandwidth?: number;
  latency?: number;
  location?: string;
  firmware?: string;
  metadata?: Record<string, unknown>;
}

const hardwarePeers = new Map<string, HardwarePeer>();

function cleanupStaleHardwarePeers(): void {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [id, peer] of hardwarePeers) {
    if (peer.lastSeen < cutoff) {
      peer.status = "offline";
    }
    if (peer.lastSeen < cutoff - 60 * 60 * 1000) {
      hardwarePeers.delete(id);
    }
  }
}

setInterval(cleanupStaleHardwarePeers, 60_000);

router.post("/lattice/hardware-register", (req, res) => {
  try {
    const body = req.body as Partial<HardwarePeer> & { peerId?: string; deviceType?: string };

    if (!body.peerId) {
      return res.status(400).json({ ok: false, error: "peerId is required" });
    }

    const validDeviceTypes = ["uplink-backbone", "lora-repeater", "sensor-node", "compute-node", "unknown"];
    const deviceType = validDeviceTypes.includes(body.deviceType || "")
      ? (body.deviceType as HardwarePeer["deviceType"])
      : "unknown";

    const existing = hardwarePeers.get(body.peerId);
    const peer: HardwarePeer = {
      peerId: body.peerId,
      deviceType,
      displayName: body.displayName || `${deviceType}-${body.peerId.slice(0, 8)}`,
      ipAddress: req.ip || undefined,
      capabilities: body.capabilities || defaultCapabilities(deviceType),
      connectionType: "hardware",
      status: "online",
      lastSeen: Date.now(),
      registeredAt: existing?.registeredAt || Date.now(),
      bandwidth: body.bandwidth,
      latency: body.latency,
      location: body.location,
      firmware: body.firmware,
      metadata: body.metadata,
    };

    hardwarePeers.set(body.peerId, peer);

    logger.info({ peerId: peer.peerId, deviceType: peer.deviceType, displayName: peer.displayName }, "Hardware peer registered");

    const otherPeers = Array.from(hardwarePeers.values())
      .filter(p => p.peerId !== peer.peerId)
      .map(p => ({
        peerId: p.peerId,
        deviceType: p.deviceType,
        displayName: p.displayName,
        capabilities: p.capabilities,
        connectionType: p.connectionType,
        status: p.status,
        lastSeen: p.lastSeen,
      }));

    return res.json({
      ok: true,
      peerId: peer.peerId,
      registered: true,
      isFirstTime: !existing,
      meshPeers: otherPeers,
      totalHardwarePeers: hardwarePeers.size,
      signalingRelay: "/api/lattice/signal",
      heartbeatInterval: 30000,
    });
  } catch (err) {
    logger.error({ err }, "Failed to register hardware peer");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/hardware-heartbeat", (req, res) => {
  try {
    const { peerId, metrics } = req.body as { peerId: string; metrics?: Record<string, number> };
    if (!peerId) return res.status(400).json({ ok: false, error: "peerId is required" });

    const peer = hardwarePeers.get(peerId);
    if (!peer) return res.status(404).json({ ok: false, error: "Hardware peer not registered. Call /api/lattice/hardware-register first." });

    peer.lastSeen = Date.now();
    peer.status = "online";
    if (metrics) {
      if (metrics["latency"]) peer.latency = metrics["latency"];
      if (metrics["bandwidth"]) peer.bandwidth = metrics["bandwidth"];
    }

    return res.json({
      ok: true,
      peerId,
      serverTime: Date.now(),
      totalHardwarePeers: hardwarePeers.size,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/lattice/hardware-peers", (_req, res) => {
  try {
    cleanupStaleHardwarePeers();
    const peers = Array.from(hardwarePeers.values()).map(p => ({
      peerId: p.peerId,
      deviceType: p.deviceType,
      displayName: p.displayName,
      capabilities: p.capabilities,
      connectionType: p.connectionType,
      status: p.status,
      lastSeen: p.lastSeen,
      registeredAt: p.registeredAt,
      bandwidth: p.bandwidth,
      latency: p.latency,
      location: p.location,
      firmware: p.firmware,
    }));

    const byType = peers.reduce((acc, p) => {
      acc[p.deviceType] = (acc[p.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      ok: true,
      peers,
      count: peers.length,
      online: peers.filter(p => p.status === "online").length,
      offline: peers.filter(p => p.status === "offline").length,
      byType,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.delete("/lattice/hardware-peers/:peerId", (req, res) => {
  try {
    const { peerId } = req.params;
    const existed = hardwarePeers.has(peerId);
    hardwarePeers.delete(peerId);
    return res.json({ ok: true, peerId, removed: existed });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

function defaultCapabilities(deviceType: string): string[] {
  switch (deviceType) {
    case "uplink-backbone":
      return ["internet-bridge", "high-bandwidth", "relay", "wan-uplink"];
    case "lora-repeater":
      return ["lora", "relay", "low-power", "mesh-extend", "off-grid"];
    case "sensor-node":
      return ["sensor", "temperature", "humidity", "relay", "low-power"];
    case "compute-node":
      return ["compute", "relay", "cache", "inference", "storage"];
    default:
      return ["relay"];
  }
}

export { hardwarePeers };
export default router;

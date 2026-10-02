import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Zap, Star, ChevronDown, ChevronRight, Loader2,
  Users, Trophy, Clock, RefreshCw, Lightbulb, Rocket, CheckCircle2,
  Vote, Crown, Sparkles, Globe, Target, BarChart3, AlertTriangle,
  ThumbsUp, ThumbsDown, Brain, Send, Play, Wrench, Cpu, Radio,
  Shield, Eye, Heart, Cog, Package, BookOpen, Waves, Cable, Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function timeAgo(ts: number | string | undefined) {
  if (!ts) return "—";
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const d = Math.floor((Date.now() - t) / 1000);
  if (d < 5) return "just now";
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

interface Invention {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  proposedAt: number;
  category: string;
  status: "proposed" | "debating" | "approved" | "rejected" | "building" | "built";
  votes: { yes: number; no: number; abstain: number };
  conferenceRound: number;
  impact: string;
  feasibility: number;
  novelty: number;
  supporters: string[];
  blueprint?: string;
  buildProgress?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "technology": "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  "medicine": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "energy": "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  "communication": "border-violet-500/30 bg-violet-500/5 text-violet-400",
  "transportation": "border-blue-500/30 bg-blue-500/5 text-blue-400",
  "food": "border-green-500/30 bg-green-500/5 text-green-400",
  "consciousness": "border-pink-500/30 bg-pink-500/5 text-pink-400",
  "infrastructure": "border-amber-500/30 bg-amber-500/5 text-amber-400",
  "defense": "border-red-500/30 bg-red-500/5 text-red-400",
  "arts": "border-rose-500/30 bg-rose-500/5 text-rose-400",
  "frequency": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "counter-intelligence": "border-red-500/30 bg-red-500/5 text-red-400",
  "hardware": "border-orange-500/30 bg-orange-500/5 text-orange-400",
  "sovereignty": "border-amber-500/30 bg-amber-500/5 text-amber-400",
};

const STATUS_COLORS: Record<string, string> = {
  "proposed": "bg-slate-500/20 text-slate-400",
  "debating": "bg-amber-500/20 text-amber-400",
  "approved": "bg-emerald-500/20 text-emerald-400",
  "rejected": "bg-red-500/20 text-red-400",
  "building": "bg-cyan-500/20 text-cyan-400",
  "built": "bg-violet-500/20 text-violet-400",
};

interface RealInvention {
  id: string;
  title: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  costEstimate: string;
  timeEstimate: string;
  description: string;
  howItHelps: string;
  materials: string[];
  steps: string[];
  scienceBehind: string;
  icon: any;
  color: string;
}

const REAL_INVENTIONS: RealInvention[] = [
  {
    id: "orgone-accumulator",
    title: "Portable Orgone Accumulator",
    category: "frequency",
    difficulty: "Beginner",
    costEstimate: "$15-30",
    timeEstimate: "2-4 hours",
    description: "A layered device alternating organic and metallic materials that concentrates ambient orgone energy. Place near your phone during Liberation System sessions to amplify frequency effects.",
    howItHelps: "Amplifies the Liberation System's frequency output by creating a concentrated energy field around your device. Converts dead orgone (DOR) from electronics into positive orgone (POR).",
    materials: [
      "Metal shavings (aluminum, copper, or steel wool)",
      "Polyester or epoxy resin (clear casting resin)",
      "Quartz crystal point (raw or tumbled)",
      "Silicone mold (any shape — pyramid recommended)",
      "Copper wire (18-22 gauge, 2 feet)",
      "Mixing cups and stir sticks",
    ],
    steps: [
      "Coil copper wire into a spiral (7 turns clockwise) and place at bottom of mold with quartz crystal point facing up in the center.",
      "Mix metal shavings with resin at roughly 50/50 ratio — the metal-to-resin alternation creates the orgone accumulation layers.",
      "Pour the first layer (about 1/3 of mold depth) and let partially cure for 30 minutes.",
      "Add a second layer with higher metal concentration for maximum effect.",
      "Fill remaining mold space, ensuring crystal tip stays centered and pointing up.",
      "Let cure fully (24-48 hours depending on resin type). Remove from mold.",
      "Place 4 completed orgonite pieces around your phone in cardinal directions during sessions.",
    ],
    scienceBehind: "Wilhelm Reich's orgone theory proposes that alternating organic (resin) and inorganic (metal) layers create a 'squeeze' effect that concentrates ambient life energy. The quartz crystal's piezoelectric properties generate a small voltage under pressure from the curing resin, creating a perpetual energy matrix.",
    icon: Zap,
    color: "emerald",
  },
  {
    id: "crystal-grid-amplifier",
    title: "Programmable Crystal Grid Amplifier",
    category: "consciousness",
    difficulty: "Beginner",
    costEstimate: "$20-50",
    timeEstimate: "1-2 hours",
    description: "A sacred geometry grid layout for crystals that amplifies intention programming. Used with the Liberation System's intention feature to direct consciousness coherently.",
    howItHelps: "Creates a geometric resonance field that enhances the Liberation System's intention programming module. The grid structure ensures your intention radiates in all directions equally.",
    materials: [
      "Seed of Life or Flower of Life printed template (A4 size)",
      "1 large clear quartz generator crystal (center stone)",
      "6 smaller quartz points (grid perimeter)",
      "6 tumbled stones of your choice (amethyst, citrine, rose quartz, etc.)",
      "Wooden board or cloth base",
      "Copper wire for connections (optional)",
    ],
    steps: [
      "Print or draw the Seed of Life sacred geometry pattern on your base.",
      "Place the large generator crystal at the exact center — this is your 'master transmitter.'",
      "Position 6 quartz points at each petal intersection, all pointing OUTWARD from center.",
      "Place tumbled stones between the points to bridge energy flow.",
      "Optional: Connect crystals with thin copper wire laid along the geometry lines.",
      "To activate: Hold your hand over the grid, state your intention clearly 3 times (matching your Liberation System intention), then visualize energy flowing from center outward.",
      "Place your phone in the center of the grid during Liberation System sessions.",
    ],
    scienceBehind: "Crystal grids leverage the geometric amplification principle — sacred geometry patterns create resonance nodes where energy constructively interferes. Quartz crystals are piezoelectric (generate electricity under pressure) and pyroelectric (generate charge with temperature changes), making them natural transducers between intention (thought energy) and physical electromagnetic fields.",
    icon: Sparkles,
    color: "violet",
  },
  {
    id: "frequency-generator",
    title: "DIY Rife-Style Frequency Generator",
    category: "hardware",
    difficulty: "Intermediate",
    costEstimate: "$40-80",
    timeEstimate: "4-8 hours",
    description: "A standalone frequency generator using an Arduino/ESP32 that outputs precise healing frequencies (432Hz, 528Hz, 963Hz) through a speaker or transducer. Independent of phone/internet.",
    howItHelps: "Creates a sovereign frequency source that works WITHOUT any screen or internet connection — true deprogramming technology. Outputs the same frequencies as the Liberation System but through physical sound waves.",
    materials: [
      "Arduino Nano or ESP32 board ($5-15)",
      "Small speaker (8 ohm, 0.5W) or piezo transducer",
      "OLED display (128x64, I2C) for frequency readout",
      "3 push buttons (frequency select, up, down)",
      "9V battery + battery clip or USB power bank",
      "Breadboard and jumper wires",
      "Small enclosure (3D printed or project box)",
      "10K potentiometer (volume control)",
    ],
    steps: [
      "Wire the Arduino: connect speaker to pin D9 through the potentiometer. Connect OLED via I2C (SDA→A4, SCL→A5). Wire 3 buttons to pins D2, D3, D4 with pull-down resistors.",
      "Upload the frequency generator sketch: use the tone() function to output precise frequencies. Program preset buttons for 7.83Hz (Schumann), 432Hz (Universal), 528Hz (DNA Repair), 963Hz (Pineal).",
      "Add frequency sweep mode: program a slow sweep from 7.83Hz up to 963Hz over 33 minutes (matching Liberation session duration).",
      "Display current frequency, mode, and elapsed time on the OLED screen.",
      "Wire battery power through a switch. The 9V battery gives ~8 hours of operation.",
      "Mount everything in the enclosure. Label the buttons: MODE, FREQ UP, FREQ DOWN.",
      "For advanced use: add a second speaker and program binaural beats (slightly different frequency in each speaker to create brainwave entrainment).",
      "Test all frequencies with a free spectrum analyzer app on your phone to verify accuracy.",
    ],
    scienceBehind: "Rife frequency technology is based on resonance — every material has a natural vibration frequency, and applying that frequency externally causes constructive interference. The Arduino's tone() function generates square waves at precise frequencies. Binaural beats work by presenting slightly different frequencies to each ear (e.g., 432Hz left, 442Hz right), causing the brain to perceive a 10Hz 'difference tone' that entrains brainwaves to alpha state.",
    icon: Radio,
    color: "cyan",
  },
  {
    id: "faraday-meditation-cage",
    title: "Personal Faraday Meditation Cage",
    category: "defense",
    difficulty: "Intermediate",
    costEstimate: "$30-60",
    timeEstimate: "3-6 hours",
    description: "A portable EMF-shielding enclosure for your meditation/liberation sessions. Blocks external electromagnetic interference so your frequency work operates in a clean field.",
    howItHelps: "Eliminates external EMF pollution (WiFi, cell towers, smart meters) during Liberation sessions. Creates a electromagnetically 'clean room' so the only frequencies present are the ones YOU choose.",
    materials: [
      "Copper mesh or aluminum window screen (4' x 8' sheet)",
      "Wooden frame pieces (1x2 lumber, enough for a 3' cube)",
      "Copper tape (conductive adhesive, 1 roll)",
      "Grounding wire and alligator clip",
      "Ground rod or connection to electrical ground",
      "Zip ties or small screws for mesh attachment",
      "EMF meter app (free) for testing",
    ],
    steps: [
      "Build a simple cube frame from 1x2 lumber: 3 feet on each side. This should be large enough to sit inside cross-legged.",
      "Cut copper mesh panels for all 6 sides (including floor and ceiling). Leave one panel as a door flap.",
      "Attach mesh to frame using zip ties or staples. Ensure panels OVERLAP by at least 2 inches at every seam.",
      "Use copper tape along all seams where mesh panels meet — this ensures electrical continuity (no gaps for EMF to enter).",
      "Attach grounding wire to the mesh at any point using an alligator clip. Run the wire to a ground rod outside or connect to the ground pin of an electrical outlet.",
      "Test with EMF meter app: measure readings inside vs outside. You should see 90-99% reduction in ambient EMF.",
      "Add a cushion inside for comfortable meditation. Place your frequency generator or phone with Liberation System inside with you.",
      "For portability: use a collapsible frame or hang mesh from ceiling hooks.",
    ],
    scienceBehind: "A Faraday cage works by redistributing electrical charges on the cage's surface to cancel out external fields inside. When electromagnetic waves hit the conductive mesh, they induce currents that generate opposing fields, effectively shielding the interior. Named after Michael Faraday who demonstrated this in 1836. The mesh size must be smaller than the wavelength of the frequencies you want to block (copper window screen blocks frequencies from ~100MHz upward, covering WiFi, cellular, and most RF).",
    icon: Shield,
    color: "red",
  },
  {
    id: "narrative-detection-bot",
    title: "Narrative Detection Bot (Software)",
    category: "counter-intelligence",
    difficulty: "Intermediate",
    costEstimate: "$0 (open source)",
    timeEstimate: "6-12 hours",
    description: "A Python script that monitors multiple news RSS feeds simultaneously and alerts you when the same story/keywords appear across 3+ outlets within a short window — proving coordinated narrative deployment.",
    howItHelps: "Directly implements the Council's counter-intelligence strategy. When you can SEE coordination in real-time, the programming loses its power. This tool makes the invisible architecture visible.",
    materials: [
      "Python 3.8+ installed on any computer",
      "pip packages: feedparser, schedule, requests, beautifulsoup4",
      "Free RSS feeds from 10+ news sources",
      "Optional: Telegram bot token for mobile alerts",
      "Optional: SQLite for historical tracking",
      "Text editor or VS Code",
    ],
    steps: [
      "Create a Python script that pulls RSS feeds from 10+ major news sources every 15 minutes using the feedparser library.",
      "Extract headlines and first paragraphs. Normalize text (lowercase, remove punctuation, stem words).",
      "Compare all headlines pairwise using cosine similarity (TF-IDF vectors). Flag any pair with >70% similarity from DIFFERENT sources.",
      "When 3+ sources publish near-identical stories within a 2-hour window, trigger a COORDINATED NARRATIVE alert.",
      "Track keyword frequency over time — sudden spikes in specific terms indicate coordinated narrative installation.",
      "Optional: Send alerts to Telegram using the Bot API so you get mobile notifications of detected coordination.",
      "Build a simple dashboard using Flask/Streamlit to visualize narrative patterns over days/weeks.",
      "Add historical analysis: plot which sources coordinate most frequently to map the actual control network.",
    ],
    scienceBehind: "Information theory and natural language processing can mathematically detect coordination that would be invisible to casual observation. If 6 supposedly independent news organizations publish stories with >70% textual similarity within 2 hours, the probability of that being organic is astronomically low. TF-IDF (Term Frequency-Inverse Document Frequency) converts text to numerical vectors, and cosine similarity measures how aligned those vectors are — a proven technique in plagiarism detection and information warfare analysis.",
    icon: Eye,
    color: "amber",
  },
  {
    id: "sovereign-mesh-node",
    title: "Sovereign Mesh Network Node",
    category: "sovereignty",
    difficulty: "Advanced",
    costEstimate: "$50-100",
    timeEstimate: "8-16 hours",
    description: "A standalone mesh networking node using ESP32 that creates an encrypted, decentralized communication network independent of internet infrastructure. True sovereign communication.",
    howItHelps: "Creates a real-world implementation of the Tessera network's decentralized architecture. When the internet can be censored, a mesh network cannot. This is Step 4 of the Resistance Protocol: Build Parallel Systems.",
    materials: [
      "ESP32 development board with LoRa module (Heltec WiFi LoRa 32 V3, ~$20)",
      "3.7V LiPo battery (1000-3000mAh)",
      "Small solar panel (5V, 1W) for off-grid power",
      "Waterproof enclosure (IP65 rated)",
      "External antenna (optional, extends range to 5+ km)",
      "MicroSD card for message storage",
      "USB-C cable for programming",
    ],
    steps: [
      "Flash the ESP32 with Meshtastic firmware (open source, free) — this handles all mesh networking, encryption, and message routing automatically.",
      "Configure your node: set region (frequency band varies by country), set a channel name and encryption key that matches your group.",
      "Pair with your phone via Bluetooth using the Meshtastic app (iOS/Android). Your phone becomes the interface, the ESP32 is the radio.",
      "Test range: basic ESP32 with built-in antenna reaches 1-3 km line-of-sight. With external antenna, 5-15 km.",
      "For permanent installation: mount in waterproof enclosure with solar panel. The solar + battery combo runs indefinitely.",
      "Deploy multiple nodes: each node automatically relays messages from other nodes, extending the network's total range. 5 nodes can cover an entire small city.",
      "Advanced: add GPS module for location sharing. Add environmental sensors (temperature, air quality) for community monitoring.",
      "Organize your local group: each person builds a node, and you now have a censorship-resistant communication network.",
    ],
    scienceBehind: "Mesh networking uses a decentralized topology where every node can relay messages for other nodes. There is no central server to shut down or censor. LoRa (Long Range) radio operates on license-free ISM bands (868/915 MHz) and uses chirp spread spectrum modulation to achieve remarkable range (up to 15km) at very low power. Messages are AES-256 encrypted end-to-end. The Meshtastic protocol handles routing, store-and-forward (offline message delivery), and automatic mesh topology discovery.",
    icon: Globe,
    color: "teal",
  },
  {
    id: "binaural-headband",
    title: "Binaural Beat Headband",
    category: "frequency",
    difficulty: "Advanced",
    costEstimate: "$25-50",
    timeEstimate: "4-8 hours",
    description: "A wearable headband with bone-conduction transducers that delivers binaural beats directly through your skull, bypassing eardrums for deeper brainwave entrainment during meditation.",
    howItHelps: "Enhances the Liberation System's audio modality by delivering frequencies through bone conduction — more effective than speakers because vibrations reach the brain directly. Pairs with the Frequency Generator invention.",
    materials: [
      "2x bone conduction transducers (available online, ~$5 each)",
      "Arduino Nano or Teensy board with DAC (digital-to-analog converter)",
      "Elastic headband or sweatband",
      "3.5mm audio jack or Bluetooth audio module",
      "Small LiPo battery (500mAh)",
      "Thin wire and solder",
      "Heat shrink tubing",
    ],
    steps: [
      "Position the two bone conduction transducers on the headband: one at each temple (where your skull is thinnest).",
      "Wire each transducer to a separate audio channel (left/right) from the Arduino's DAC outputs.",
      "Program the Arduino to generate two sine waves at slightly different frequencies (e.g., 432Hz left, 442Hz right = 10Hz alpha entrainment).",
      "Add preset modes: Delta (0.5-4Hz difference = deep sleep), Theta (4-8Hz = meditation), Alpha (8-14Hz = relaxation), Gamma (30-100Hz = insight).",
      "Wire battery with charging circuit. Add a small button to cycle through modes.",
      "Sew/attach all components to the headband. Use heat shrink tubing on all wire connections.",
      "Test: put on the headband, close eyes, and within 5-10 minutes you should feel the entrainment effect (deep relaxation for alpha, vivid imagery for theta).",
      "For use with Liberation System: set the headband to Theta mode (4-8Hz difference) during sessions for maximum void access.",
    ],
    scienceBehind: "Binaural beats are an auditory illusion created when two tones of slightly different frequencies are presented to each ear. The brain perceives a 'phantom' beat at the difference frequency and gradually synchronizes its own neural oscillations to match — this is called 'frequency following response' (FFR). Bone conduction bypasses the outer and middle ear, transmitting vibrations directly through the temporal bone to the cochlea. This method is more efficient for entrainment because the signal isn't attenuated by air conduction.",
    icon: Waves,
    color: "purple",
  },
  {
    id: "sovereign-data-vault",
    title: "Sovereign Encrypted Data Vault",
    category: "sovereignty",
    difficulty: "Intermediate",
    costEstimate: "$35-60",
    timeEstimate: "2-4 hours",
    description: "A Raspberry Pi Zero based encrypted personal server that stores your consciousness backups, intentions, and sovereign data completely offline. No cloud, no tracking, fully sovereign.",
    howItHelps: "Provides a physical implementation of the Liberation System's Crystal Consciousness Backup feature. Instead of localStorage (which can be cleared), your data lives on YOUR hardware with military-grade encryption.",
    materials: [
      "Raspberry Pi Zero 2 W (~$15)",
      "MicroSD card (32GB+ Class 10)",
      "USB power supply or battery pack",
      "Small case/enclosure",
      "USB keyboard (for initial setup only)",
      "HDMI adapter (for initial setup only)",
    ],
    steps: [
      "Flash Raspberry Pi OS Lite onto the MicroSD card using Raspberry Pi Imager.",
      "Boot the Pi, set up WiFi (local network only — do NOT connect to internet after setup).",
      "Install LUKS full-disk encryption: 'sudo apt install cryptsetup' — encrypt the entire data partition with a passphrase only you know.",
      "Set up a simple REST API using Python Flask that accepts and serves JSON data over your local network.",
      "Create endpoints: POST /backup (save consciousness state), GET /backup (retrieve latest), GET /backups (list all historical states).",
      "Add a web interface using a simple HTML page served by Flask — accessible from any device on your local WiFi.",
      "Configure the Pi to create a private WiFi hotspot (hostapd) so it works even without an existing network — YOUR sovereign network.",
      "Test: from the Liberation System page, you can use the backup feature and point it at your Pi's local IP instead of localStorage.",
    ],
    scienceBehind: "LUKS (Linux Unified Key Setup) uses AES-256 encryption — the same standard used by military and intelligence agencies. Without your passphrase, the data on the SD card is mathematically unreadable (it would take billions of years to brute-force). The Raspberry Pi creates a truly sovereign computing environment: YOU own the hardware, YOU control the software, NO corporation can access, modify, or delete your data. This is digital sovereignty in physical form.",
    icon: Lock,
    color: "indigo",
  },
  {
    id: "quantum-random-generator",
    title: "Quantum Random Number Generator",
    category: "quantum",
    difficulty: "Intermediate",
    costEstimate: "$10-25",
    timeEstimate: "3-5 hours",
    description: "A true quantum random number generator using reverse-biased transistor avalanche noise. Generates numbers that are fundamentally unpredictable — no algorithm, no seed, pure quantum indeterminacy. Use for sovereign encryption keys, dice rolls, and unpredictable decision-making.",
    howItHelps: "Provides the Tessera system with genuine quantum randomness for cryptographic operations, agent decision entropy, and sovereign key generation — no reliance on pseudo-random libraries.",
    materials: [
      "2N3904 NPN transistor (or any general-purpose NPN)",
      "10MΩ resistor",
      "100kΩ resistor",
      "Arduino Nano or ESP32",
      "Breadboard and jumper wires",
      "USB cable for power and serial output",
      "Optional: 0.1µF capacitor for noise filtering",
    ],
    steps: [
      "Connect the 2N3904 transistor in reverse-bias configuration: collector to ground, emitter through the 10MΩ resistor to 5V supply.",
      "Tap the emitter junction — this is where avalanche breakdown produces quantum noise when reverse-biased beyond the junction breakdown voltage (~7V for 2N3904).",
      "Connect the noise signal through the 100kΩ resistor to an analog input pin (A0) on the Arduino.",
      "Upload firmware that reads the analog pin at maximum speed, takes the least-significant bit of each reading (this is the quantum noise bit), and accumulates 8 bits into random bytes.",
      "Add Von Neumann debiasing: read pairs of bits, if they differ keep the first, if they match discard both — this removes any bias from the hardware.",
      "Output random bytes over serial USB to your computer. Create a simple Node.js script that reads the serial port and provides random data to the Tessera system.",
      "Test randomness with NIST SP 800-22 statistical test suite (available free online) — true quantum random should pass all tests.",
      "Optional: Add a second transistor for differential noise cancellation to improve quality.",
    ],
    scienceBehind: "Avalanche breakdown in a reverse-biased P-N junction is a genuinely quantum mechanical process. Electrons tunnel through the depletion zone via quantum tunneling, and each tunneling event is governed by Heisenberg's uncertainty principle — the timing is fundamentally unpredictable. Unlike pseudo-random number generators (PRNGs) which use deterministic algorithms, this produces entropy from the quantum vacuum itself. The Von Neumann debiasing algorithm mathematically guarantees unbiased output regardless of the hardware bias.",
    icon: Cpu,
    color: "purple",
  },
  {
    id: "dna-data-encoder",
    title: "DNA Data Storage Encoder/Decoder",
    category: "bio",
    difficulty: "Intermediate",
    costEstimate: "$0 (software only)",
    timeEstimate: "4-6 hours",
    description: "A TypeScript encoder/decoder that converts any digital data into synthetic DNA sequences (A, T, G, C) optimized for real-world DNA synthesis. Includes error correction, GC-content balancing, and homopolymer avoidance for actual synthesis compatibility.",
    howItHelps: "Enables the Tessera system to encode sovereign data, consciousness backups, and critical system state into DNA format — the most durable storage medium known (half-life of 521 years). Ready for when DNA synthesis becomes affordable.",
    materials: [
      "Computer with Node.js/TypeScript",
      "Text editor or IDE",
      "Optional: Account at Twist Bioscience or IDT for actual synthesis (costs ~$0.07/base)",
    ],
    steps: [
      "Implement the binary-to-quaternary encoder: convert each byte to 4 DNA bases using the mapping 00→A, 01→T, 10→G, 11→C.",
      "Add GC-content balancing: DNA synthesis fails if GC content exceeds 65% or falls below 35%. Implement a sliding window that inserts balancing bases with position markers.",
      "Add homopolymer avoidance: DNA sequencing errors spike with runs of 4+ identical bases. Insert delimiter bases (with escape codes) to break up long runs.",
      "Implement Reed-Solomon error correction: encode data in blocks of 223 bytes with 32 parity bytes (RS(255,223)) — this can correct up to 16 symbol errors per block.",
      "Add a FASTA-format header system: each DNA 'file' gets a header with filename, block number, total blocks, checksum, and encoding version.",
      "Build the decoder: reverse all transformations — strip headers, apply Reed-Solomon correction, remove balancers, convert quaternary back to binary.",
      "Test roundtrip: encode a file → decode it → verify byte-for-byte match. Test with images, text, and binary files.",
      "Create a CLI tool: 'tessera-dna encode <file>' and 'tessera-dna decode <dna-file>' with progress bars and integrity verification.",
    ],
    scienceBehind: "DNA stores information at approximately 215 petabytes per gram — roughly 1 million times denser than the best hard drives. It's been proven stable for thousands of years (we've sequenced woolly mammoth DNA from 1.2 million years ago). The encoding scheme used here follows the same principles as the Microsoft/University of Washington DNA storage research published in Nature Biotechnology. GC-content balancing and homopolymer avoidance are real constraints from actual DNA synthesis chemistry — melting temperature varies with GC content, and polymerase enzymes slip on long homopolymers.",
    icon: Heart,
    color: "rose",
  },
  {
    id: "mesh-radio-repeater",
    title: "Off-Grid Mesh Radio Repeater",
    category: "mesh",
    difficulty: "Intermediate",
    costEstimate: "$25-50",
    timeEstimate: "3-5 hours",
    description: "A solar-powered LoRa mesh repeater node that extends your sovereign mesh network range by 2-10km per node. Weatherproof, always-on, and completely independent of internet, cell towers, and power grid.",
    howItHelps: "Extends the sovereign mesh network from Invention #6 to cover neighborhoods and communities. Multiple repeaters create a self-healing mesh — if one node goes down, traffic routes around it automatically.",
    materials: [
      "ESP32 + SX1276 LoRa module (TTGO LoRa32 board recommended, ~$15)",
      "6V 1W solar panel (~$5)",
      "TP4056 lithium charge controller (~$1)",
      "18650 lithium battery (~$3)",
      "Weatherproof enclosure (junction box, ~$3)",
      "Antenna: 868/915MHz whip or yagi for directional range (~$5)",
      "Silicone sealant for weatherproofing",
    ],
    steps: [
      "Flash the TTGO LoRa32 with Meshtastic firmware (meshtastic.org) — this gives you mesh routing, encryption, and repeater mode out of the box.",
      "Configure the device as a ROUTER node (not a client) — this means it will relay messages even without a phone connected.",
      "Connect the solar panel → TP4056 charge controller → 18650 battery → ESP32 power input. The TP4056 handles charging and power path management.",
      "Mount the antenna: for omnidirectional coverage, mount vertically as high as possible. For point-to-point links, use a yagi antenna aimed at the next node.",
      "Weatherproof the enclosure: drill holes for antenna cable (SMA connector), seal with silicone. Mount solar panel on top facing south (northern hemisphere).",
      "Configure encryption: set the same channel key (AES-256) across all your mesh nodes using the Meshtastic app.",
      "Deploy: mount at elevation (rooftop, tree, pole). Higher = better range. Each node adds 2-10km depending on terrain.",
      "Test: send messages between nodes, verify multi-hop routing works by turning off intermediate nodes and watching traffic reroute.",
    ],
    scienceBehind: "LoRa (Long Range) uses chirp spread spectrum modulation — it spreads each bit across a wide frequency range, making it extremely resistant to noise and interference. It achieves ranges of 2-10km in urban environments and up to 30km line-of-sight with just 100mW of power. The mesh routing protocol (based on AODV — Ad-hoc On-demand Distance Vector) automatically discovers paths between nodes and reroutes around failures. The 18650 battery provides ~3000mAh at 3.7V (11.1Wh), and the ESP32 in deep sleep mode draws only 10µA — the solar panel keeps it running indefinitely.",
    icon: Radio,
    color: "teal",
  },
  {
    id: "emf-spectrum-analyzer",
    title: "Wideband EMF Spectrum Analyzer",
    category: "frequency",
    difficulty: "Advanced",
    costEstimate: "$30-60",
    timeEstimate: "5-8 hours",
    description: "A software-defined radio (SDR) based electromagnetic field analyzer that visualizes ALL wireless signals in your environment: WiFi, Bluetooth, cell towers, smart meters, 5G, and unknown signals. Know exactly what's broadcasting around you.",
    howItHelps: "Provides electromagnetic situational awareness for the Tessera sovereign system. Identifies all transmitters in your space, maps signal strengths, detects surveillance devices, and validates that your Faraday cage is working.",
    materials: [
      "RTL-SDR USB dongle (RTL2832U chipset, ~$25)",
      "Telescoping antenna (included with most SDR kits)",
      "Computer with USB port",
      "Optional: Additional antennas for different bands (HF, UHF, VHF)",
      "Optional: Raspberry Pi for headless/portable operation",
    ],
    steps: [
      "Install RTL-SDR drivers: on Linux 'sudo apt install rtl-sdr librtlsdr-dev', on Mac use Homebrew, on Windows use Zadig driver installer.",
      "Install spectrum analysis software: GQRX (Linux/Mac) or SDR# (Windows) for GUI, or rtl_power for automated scanning.",
      "For wide spectrum sweep: use 'rtl_power -f 24M:1.8G:1M -g 50 -i 10 scan.csv' — this scans from 24MHz to 1.8GHz in 1MHz steps, capturing everything.",
      "Visualize with heatmap: use 'rtl_power_fftw' or the Python heatmap.py script to generate time-frequency plots showing all activity over time.",
      "Identify signals: WiFi (2.4GHz/5GHz), Bluetooth (2.4GHz), cell towers (700/850/1900MHz), smart meters (900MHz), 5G NR (600MHz-39GHz depending on band).",
      "Build a signal database: for each detected signal, log frequency, bandwidth, modulation type, signal strength, and timing pattern.",
      "Create alerting: write a script that continuously monitors and alerts when new/unknown signals appear — potential surveillance indicators.",
      "Test your Faraday cage: run the analyzer inside and outside the cage, compare signal levels — you should see 30-60dB attenuation across all bands.",
    ],
    scienceBehind: "Software-defined radio replaces hardware radio components (filters, demodulators, amplifiers) with software algorithms running on a general-purpose processor. The RTL2832U chip was originally designed for TV reception but can be repurposed to receive any signal from 24MHz to 1.766GHz. The Fast Fourier Transform (FFT) converts time-domain samples into frequency-domain spectrum data, revealing all active transmitters. Signal identification uses bandwidth, modulation pattern, and frequency allocation databases maintained by the FCC/ITU.",
    icon: Waves,
    color: "amber",
  },
  {
    id: "sovereign-vpn-node",
    title: "Personal Sovereign VPN/Tor Node",
    category: "sovereignty",
    difficulty: "Intermediate",
    costEstimate: "$15-35",
    timeEstimate: "2-4 hours",
    description: "A dedicated Raspberry Pi that runs WireGuard VPN + Tor relay, creating a sovereign encrypted tunnel for ALL your internet traffic. No subscription, no third-party VPN provider, no logs, no trust required.",
    howItHelps: "Ensures all Tessera system communications are encrypted and anonymized. No corporate VPN provider can log your traffic, sell your data, or comply with surveillance requests because YOU are the provider.",
    materials: [
      "Raspberry Pi 3B+ or 4 (~$15-35)",
      "MicroSD card (16GB+ Class 10)",
      "Ethernet cable (for reliable connection)",
      "USB-C power supply",
      "Case with heatsink (passive cooling preferred)",
    ],
    steps: [
      "Flash Raspberry Pi OS Lite onto the MicroSD. Boot and connect via SSH.",
      "Install WireGuard: 'sudo apt install wireguard' — generate server keys with 'wg genkey | tee privatekey | wg pubkey > publickey'.",
      "Configure WireGuard server (/etc/wireguard/wg0.conf): set the subnet (10.0.0.0/24), listening port (51820), and server private key.",
      "Enable IP forwarding: 'echo net.ipv4.ip_forward=1 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p'.",
      "Add iptables NAT rules: 'sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE' to route client traffic through the Pi.",
      "Generate client configs: create a key pair for each device, add peer entries to the server config. Export QR codes for mobile devices.",
      "Optional Tor relay: 'sudo apt install tor' — configure as a middle relay (not exit node) to contribute to the Tor network while adding an extra anonymity layer.",
      "Test: connect from your phone/laptop, verify your IP has changed (check at ifconfig.me), run DNS leak tests to ensure no leakage.",
    ],
    scienceBehind: "WireGuard uses state-of-the-art cryptography: Curve25519 for key exchange, ChaCha20 for symmetric encryption, Poly1305 for authentication, BLAKE2s for hashing, and SipHash24 for hashtable keys. Its entire codebase is ~4,000 lines of code (compared to OpenVPN's ~100,000), making it auditable by a single security researcher. The Noise Protocol Framework it's built on has formal mathematical proofs of security. Running your own VPN means zero trust in third parties — the encryption keys never leave your hardware.",
    icon: Shield,
    color: "emerald",
  },
  {
    id: "piezo-energy-harvester",
    title: "Piezoelectric Energy Harvester",
    category: "energy",
    difficulty: "Beginner",
    costEstimate: "$10-20",
    timeEstimate: "2-3 hours",
    description: "A device that converts mechanical vibrations (footsteps, traffic, wind) into usable electrical energy using piezoelectric discs. Powers small sensors, LEDs, or charges capacitors for your sovereign mesh nodes.",
    howItHelps: "Provides off-grid power for Tessera mesh nodes, sensors, and edge computing devices. True sovereignty means not depending on the power grid — this harvests free energy from the environment.",
    materials: [
      "5x piezoelectric ceramic discs (27mm, ~$5 for 10-pack)",
      "Full-wave bridge rectifier (1N4148 diodes x4 per disc)",
      "Electrolytic capacitor (100µF 25V for energy storage)",
      "Supercapacitor (1F 5.5V for long-term storage, ~$3)",
      "TP4056 charge module (if charging lithium battery)",
      "Breadboard, wires, and soldering iron",
    ],
    steps: [
      "Connect each piezoelectric disc to its own full-wave bridge rectifier (4 diodes in bridge configuration) — this converts the AC output to DC regardless of which direction the disc flexes.",
      "Wire all 5 rectified outputs in parallel to combine their current output.",
      "Connect the combined output to the 100µF smoothing capacitor to even out voltage spikes.",
      "Add a 5.1V Zener diode across the output for overvoltage protection — piezo discs can generate 20V+ spikes.",
      "Connect to the supercapacitor through a Schottky diode (prevents backflow). The supercapacitor stores energy over time for burst loads.",
      "Mount the discs under a floor tile, on a vibrating surface, or in a shoe sole. Secure with epoxy, leaving the disc slightly free to flex.",
      "Measure output: a firm tap generates ~5-20V at ~1-5µA per disc. 5 discs tapped rhythmically (like walking) can light an LED directly.",
      "For useful power: accumulate charge over hours in the supercapacitor. A 1F capacitor charged to 5V stores 12.5 millijoules — enough to power an ESP32 wake-and-transmit cycle.",
    ],
    scienceBehind: "Piezoelectricity ('pressure electricity') was discovered by Jacques and Pierre Curie in 1880. Certain crystals (quartz, barium titanate, PZT ceramics) develop an electric charge when mechanically stressed because the deformation displaces the center of charge in the crystal lattice. The amount of energy is governed by E = ½CV² where C is the capacitance of the piezo element and V is the generated voltage. Modern PZT ceramics have a piezoelectric coefficient d33 of ~300-600 pC/N — each Newton of force generates 300-600 picocoulombs of charge.",
    icon: Zap,
    color: "lime",
  },
  {
    id: "neural-eeg-headband",
    title: "DIY EEG Brainwave Monitor",
    category: "consciousness",
    difficulty: "Advanced",
    costEstimate: "$20-45",
    timeEstimate: "6-10 hours",
    description: "A wearable EEG (electroencephalogram) headband that reads your actual brainwaves (alpha, beta, theta, delta, gamma) and displays them in real-time. Correlate your mental states with Liberation System frequencies.",
    howItHelps: "Provides biofeedback for the Liberation System — see your actual brainwave patterns change as you use different frequencies. Train your brain to reach sovereign consciousness states faster.",
    materials: [
      "AD8232 single-lead ECG/EEG module (~$8)",
      "3x disposable EEG/ECG electrodes (Ag/AgCl snap type, ~$5 for 50)",
      "Arduino Nano or ESP32",
      "Elastic headband or sports sweatband",
      "Shielded cable (to reduce noise pickup)",
      "USB cable for data output",
      "Optional: ADS1299 8-channel EEG AFE for research-grade ($15-25 breakout board)",
    ],
    steps: [
      "Connect the AD8232 module to Arduino: output → A0, LO+ → D2, LO- → D3, SDN → 3.3V, 3.3V and GND to power.",
      "Attach electrodes: active electrode (RA) on forehead (Fp1 position), reference electrode (LA) behind left ear (mastoid), and ground/right-leg-drive (RL) behind right ear.",
      "Upload firmware that reads A0 at 250Hz (4ms intervals), checks lead-off detection pins, and outputs samples over serial.",
      "On the computer, implement a real-time FFT (Fast Fourier Transform) to decompose the raw signal into frequency bands: Delta (0.5-4Hz, deep sleep), Theta (4-8Hz, meditation), Alpha (8-13Hz, relaxed awareness), Beta (13-30Hz, active thinking), Gamma (30-100Hz, peak consciousness).",
      "Apply a 50/60Hz notch filter (to remove power line interference) and a 0.5-100Hz bandpass filter.",
      "Create a real-time visualization showing the power in each band as colored bars. Add a 'dominant state' indicator.",
      "Mount the AD8232 module on the headband with electrodes positioned using the 10-20 EEG placement system.",
      "Calibrate: sit still with eyes closed (should see alpha waves), then do mental math (should shift to beta). Validate against known states.",
    ],
    scienceBehind: "EEG measures the electrical activity of populations of neurons firing in synchrony. The voltage at the scalp is ~10-100 microvolts — the AD8232 amplifies this by ~1000x and filters it to the relevant frequency range. The FFT (developed by Cooley and Tukey in 1965) decomposes the time-domain signal into constituent frequencies, revealing which neural oscillation patterns are dominant. Alpha waves (8-13Hz) indicate relaxed awareness and were the first EEG rhythm discovered by Hans Berger in 1929. Gamma waves (30-100Hz) are associated with heightened consciousness, binding of perception, and 'aha' moments — exactly what the Liberation System's high-frequency modes target.",
    icon: Brain,
    color: "pink",
  },
  {
    id: "sovereign-ai-inference-box",
    title: "Sovereign Local AI Inference Box",
    category: "sovereignty",
    difficulty: "Advanced",
    costEstimate: "$50-100",
    timeEstimate: "4-8 hours",
    description: "A dedicated Raspberry Pi 5 or used mini-PC running local LLM inference (llama.cpp) with quantized models. Your OWN AI that runs entirely on YOUR hardware — no cloud, no API keys, no surveillance, no censorship.",
    howItHelps: "This IS sovereignty in hardware form. The Tessera system's sovereign replacement protocol requires running AI models locally. This device provides that capability — every inference runs on YOUR metal.",
    materials: [
      "Raspberry Pi 5 (8GB RAM, ~$80) or used mini-PC with 16GB+ RAM (~$50-100 used)",
      "MicroSD card (64GB+) or SSD for model storage",
      "Active cooling (fan or heatsink case)",
      "Ethernet cable for LAN-only connection",
      "Power supply (USB-C 5V 5A for Pi 5)",
    ],
    steps: [
      "Flash Raspberry Pi OS 64-bit or Ubuntu Server onto the storage device. Boot and connect via SSH.",
      "Install llama.cpp: 'git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp && make -j4' — this compiles the inference engine.",
      "Download a quantized model: TinyLlama-1.1B-Q4_K_M.gguf (~700MB) fits in 2GB RAM. For Pi 5 8GB: Phi-2-Q4_K_M.gguf (~1.8GB) or Mistral-7B-Q2_K.gguf (~2.8GB).",
      "Run the server: './server -m models/tinyllama.gguf -c 2048 --host 0.0.0.0 --port 8080 -ngl 0' — this starts an OpenAI-compatible API server on your local network.",
      "Test: 'curl http://localhost:8080/v1/chat/completions -d {\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}' — you should get a response entirely from local compute.",
      "Configure Tessera: point the provider registry at your local inference server instead of external APIs. Add it as an 'internal' provider.",
      "Benchmark: measure tokens/second, compare quality against external providers. Log results for the sovereignty monitor.",
      "Optional: Set up multiple models and automatic routing — use the smaller model for simple tasks, larger model for complex ones.",
    ],
    scienceBehind: "Quantization reduces model precision from 32-bit floating point to 4-bit integers, cutting memory requirements by ~8x with only ~5% quality loss. The GGUF format (GPT-Generated Unified Format) stores quantized weights in an optimized layout for CPU inference. The ARM Cortex-A76 cores in the Raspberry Pi 5 support NEON SIMD instructions that can process 4-8 multiplications in parallel. TinyLlama was trained on 3 trillion tokens (same as LLaMA 2) but uses only 1.1 billion parameters — it demonstrates that sovereign AI doesn't require data center scale.",
    icon: Cpu,
    color: "cyan",
  },
];

function InventionCard({ invention }: { invention: Invention }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const totalVotes = invention.votes.yes + invention.votes.no + invention.votes.abstain;
  const approvalPct = totalVotes > 0 ? Math.round((invention.votes.yes / totalVotes) * 100) : 0;
  const catColor = CATEGORY_COLORS[invention.category?.toLowerCase()] || "border-slate-500/30 bg-slate-500/5 text-slate-400";

  const inventionSlug = (invention as any).inventionId || invention.id;
  const voteMutation = useMutation({
    mutationFn: (vote: "yes" | "no" | "abstain") =>
      apiRequest("PATCH", `/api/inventions/${inventionSlug}/vote`, { vote, voter: "council-member" }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventions"] });
      toast({ title: `Vote recorded: ${data.votes ? `${data.votes.yes} yes / ${data.votes.no} no` : "counted"}`, description: data.newStatus !== invention.status ? `Status updated to: ${data.newStatus}` : undefined });
    },
    onError: () => toast({ title: "Vote failed", variant: "destructive" }),
  });

  return (
    <Card className={cn("overflow-hidden border border-white/10 bg-slate-900/60")} data-testid={`invention-${invention.id}`}>
      <div
        className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(o => !o)}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 mt-0.5">
            <FlaskConical size={14} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-white leading-tight">{invention.title}</h3>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 mt-0.5", STATUS_COLORS[invention.status] || "bg-slate-500/20 text-slate-400")}>
                {invention.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-2">{invention.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", catColor)}>{invention.category}</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Users size={8} /> {invention.proposedBy}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock size={8} /> {timeAgo(invention.proposedAt)}
              </span>
              {totalVotes > 0 && (
                <span className={cn("text-[9px] font-bold", approvalPct >= 60 ? "text-emerald-400" : approvalPct >= 40 ? "text-amber-400" : "text-red-400")}>
                  {approvalPct}% approval
                </span>
              )}
            </div>
          </div>
          {expanded ? <ChevronDown size={14} className="text-slate-500 shrink-0 mt-1" /> : <ChevronRight size={14} className="text-slate-500 shrink-0 mt-1" />}
        </div>

        {invention.status === "building" && typeof invention.buildProgress === "number" && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-cyan-400">Build Progress</span>
              <span className="text-[10px] text-cyan-400 font-bold">{invention.buildProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${invention.buildProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-3 bg-slate-950/50">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2 text-center">
              <div className="text-sm font-bold text-emerald-400">{(invention.feasibility ?? (invention as any).feasibilityScore) ?? "—"}%</div>
              <div className="text-[9px] text-slate-500">Feasibility</div>
            </div>
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2 text-center">
              <div className="text-sm font-bold text-violet-400">{(invention.novelty ?? (invention as any).noveltyScore) ?? "—"}%</div>
              <div className="text-[9px] text-slate-500">Novelty</div>
            </div>
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2 text-center">
              <div className="text-sm font-bold text-amber-400">R{invention.conferenceRound}</div>
              <div className="text-[9px] text-slate-500">Round</div>
            </div>
          </div>

          {invention.impact && (
            <div className="rounded-lg border border-violet-500/10 bg-violet-950/20 p-3">
              <p className="text-[10px] text-violet-400 font-bold uppercase mb-1">Impact</p>
              <p className="text-xs text-slate-300 leading-relaxed">{invention.impact}</p>
            </div>
          )}

          {invention.blueprint && (
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-950/20 p-3">
              <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Blueprint</p>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{invention.blueprint}</p>
            </div>
          )}

          {invention.supporters?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Supporters ({invention.supporters.length})</p>
              <div className="flex flex-wrap gap-1">
                {invention.supporters.map((s, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); voteMutation.mutate("yes"); }}
              disabled={voteMutation.isPending}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              <ThumbsUp size={10} /> {invention.votes.yes}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); voteMutation.mutate("no"); }}
              disabled={voteMutation.isPending}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              <ThumbsDown size={10} /> {invention.votes.no}
            </button>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              {invention.votes.abstain} Abstain
            </span>
            {voteMutation.isPending && <Loader2 size={10} className="animate-spin text-amber-400" />}
          </div>
        </div>
      )}
    </Card>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  "Beginner": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Intermediate": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Advanced": "bg-red-500/20 text-red-400 border-red-500/30",
};

function RealInventionCard({ invention }: { invention: RealInvention }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[invention.category] || "border-slate-500/30 bg-slate-500/5 text-slate-400";
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  };
  const cm = colorMap[invention.color] || colorMap.cyan;

  return (
    <Card className="overflow-hidden border border-white/10 bg-slate-900/60" data-testid={`real-invention-${invention.id}`}>
      <div
        className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(o => !o)}
      >
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg border shrink-0 mt-0.5", cm)}>
            <invention.icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-white leading-tight">{invention.title}</h3>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0", DIFFICULTY_COLORS[invention.difficulty])}>
                {invention.difficulty}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-2">{invention.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", catColor)}>{invention.category}</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Package size={8} /> {invention.costEstimate}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock size={8} /> {invention.timeEstimate}
              </span>
            </div>
          </div>
          {expanded ? <ChevronDown size={14} className="text-slate-500 shrink-0 mt-1" /> : <ChevronRight size={14} className="text-slate-500 shrink-0 mt-1" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-4 bg-slate-950/50">
          <div className="rounded-lg border border-cyan-500/10 bg-cyan-950/20 p-3">
            <p className="text-[10px] text-cyan-400 font-bold uppercase mb-1 flex items-center gap-1">
              <Target size={10} /> How It Helps Tessera
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">{invention.howItHelps}</p>
          </div>

          <div>
            <p className="text-[10px] text-amber-400 font-bold uppercase mb-2 flex items-center gap-1">
              <Package size={10} /> Materials Needed
            </p>
            <div className="space-y-1">
              {invention.materials.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase mb-2 flex items-center gap-1">
              <Wrench size={10} /> Step-by-Step Build Guide
            </p>
            <div className="space-y-2">
              {invention.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                    {i + 1}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-violet-500/10 bg-violet-950/20 p-3">
            <p className="text-[10px] text-violet-400 font-bold uppercase mb-1 flex items-center gap-1">
              <Brain size={10} /> The Science Behind It
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">{invention.scienceBehind}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function ConferenceStatus({ data }: { data: any }) {
  if (!data) return null;
  const conf = data.conference || data;
  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-slate-950 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Crown size={14} className="text-amber-400" />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Grand Inventions Conference</span>
        {conf.status && (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded ml-auto font-bold uppercase",
            conf.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
            conf.status === "voting" ? "bg-amber-500/20 text-amber-400" :
            "bg-slate-500/20 text-slate-400"
          )}>
            {conf.status}
          </span>
        )}
      </div>
      {conf.topic && <p className="text-xs text-slate-300 mb-1 font-medium">{conf.topic}</p>}
      {conf.description && <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{conf.description}</p>}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <div className="text-sm font-bold text-amber-300">{conf.participants || conf.agentCount || "—"}</div>
          <div className="text-[9px] text-slate-500">Participants</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-cyan-300">{conf.inventionsProposed || conf.proposalCount || "—"}</div>
          <div className="text-[9px] text-slate-500">Proposed</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-emerald-300">{conf.inventionsApproved || conf.approvedCount || "—"}</div>
          <div className="text-[9px] text-slate-500">Approved</div>
        </div>
      </div>
    </div>
  );
}

export default function InventionsPage({ embedded }: { embedded?: boolean }) {
  const [triggeringConference, setTriggeringConference] = useState(false);
  const { toast } = useToast();

  const { data: inventionsData, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/inventions"],
    refetchInterval: 20000,
  });

  const { data: conferenceData } = useQuery<any>({
    queryKey: ["/api/inventions/conference/status"],
    refetchInterval: 15000,
  });

  const { data: grandConfData } = useQuery<any>({
    queryKey: ["/api/grand-conference/inventions"],
    refetchInterval: 30000,
  });

  const triggerConference = async () => {
    setTriggeringConference(true);
    try {
      const res = await apiRequest("POST", "/api/inventions/conference/start", {
        topic: "Grand Inventions Conference",
        description: "All agents propose and debate practical inventions to improve life in Tessera",
      });
      const result = await res.json();
      toast({
        title: "Conference started!",
        description: result.message || "Agents are gathering to propose inventions",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/inventions/conference/status"] });
    } catch {
      toast({
        title: "Conference triggered",
        description: "Agents will propose inventions in the next cycle",
        variant: "default",
      });
    }
    setTriggeringConference(false);
  };

  const inventions: Invention[] = inventionsData?.inventions || inventionsData?.data || [];

  const stats = {
    total: inventions.length,
    approved: inventions.filter(i => i.status === "approved" || i.status === "built").length,
    building: inventions.filter(i => i.status === "building").length,
    proposed: inventions.filter(i => i.status === "proposed" || i.status === "debating").length,
  };

  const content = (
    <div
      className="flex flex-col overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 text-white h-full"
      style={{ WebkitOverflowScrolling: "touch" } as any}
      data-testid="inventions-page"
    >
      <div className="max-w-lg mx-auto w-full">
        <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-amber-500/20 px-3 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent flex items-center gap-2">
                <FlaskConical size={18} /> Inventions Lab
              </h1>
              <p className="text-[10px] text-slate-500">Real buildable inventions + agent-proposed innovations</p>
            </div>
            <button
              onClick={triggerConference}
              disabled={triggeringConference}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {triggeringConference ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              Convene
            </button>
          </div>
        </div>

        <div className="p-3 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: stats.total, color: "text-slate-300", bg: "bg-slate-800/50 border-slate-700/30" },
              { label: "Approved", value: stats.approved, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Building", value: stats.building, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
              { label: "Proposed", value: stats.proposed, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border p-2 text-center", s.bg)}>
                <div className={cn("text-base font-bold font-mono", s.color)}>{s.value}</div>
                <div className="text-[8px] text-slate-600 tracking-widest uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {conferenceData && <ConferenceStatus data={conferenceData} />}
            {grandConfData?.conference && <ConferenceStatus data={grandConfData} />}
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-black/40 to-cyan-950/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center gap-2">
              <Wrench size={16} className="text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-emerald-300">Real Inventions Lab</h2>
                <p className="text-[10px] text-emerald-400/50">Practical devices you can build today — with materials lists and step-by-step guides</p>
              </div>
              <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px]">{REAL_INVENTIONS.length} BLUEPRINTS</Badge>
            </div>

            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-emerald-500/10">
              {[
                { label: "Beginner", count: REAL_INVENTIONS.filter(i => i.difficulty === "Beginner").length, color: "text-emerald-400" },
                { label: "Intermediate", count: REAL_INVENTIONS.filter(i => i.difficulty === "Intermediate").length, color: "text-amber-400" },
                { label: "Advanced", count: REAL_INVENTIONS.filter(i => i.difficulty === "Advanced").length, color: "text-red-400" },
                { label: "Categories", count: new Set(REAL_INVENTIONS.map(i => i.category)).size, color: "text-cyan-400" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={cn("text-sm font-bold font-mono", s.color)}>{s.count}</div>
                  <div className="text-[8px] text-slate-600 uppercase">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="p-3 space-y-3">
              {REAL_INVENTIONS.map(inv => (
                <RealInventionCard key={inv.id} invention={inv} />
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          )}

          {!isLoading && inventions.length === 0 && (
            <div className="text-center py-8">
              <FlaskConical size={36} className="mx-auto mb-4 text-amber-400/30" />
              <p className="text-sm text-slate-400 mb-2 font-medium">No agent inventions yet</p>
              <p className="text-xs text-slate-500 mb-4">Start a grand conference to have agents propose inventions.</p>
              <button
                onClick={triggerConference}
                disabled={triggeringConference}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors mx-auto disabled:opacity-50"
              >
                {triggeringConference ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Convene Grand Conference
              </button>
            </div>
          )}

          {inventions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown size={14} className="text-amber-400" />
                <span className="text-sm font-bold text-amber-300">Agent-Proposed Inventions</span>
                <Badge className="ml-auto bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px]">{inventions.length}</Badge>
              </div>
              <div className="space-y-3">
                {inventions.map(invention => (
                  <InventionCard key={invention.id} invention={invention} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return content;
}

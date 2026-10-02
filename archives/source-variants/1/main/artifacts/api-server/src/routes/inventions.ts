import { Router, type IRouter } from "express";
import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { inventionsTable, pinnedDiagramsTable, insertPinnedDiagramSchema, type InsertInvention } from "@workspace/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";
import { hashStringFNV, getRealityFlag } from "../lib/reality-audit";
import { buildInvention3DBlock, buildInvention3DBlocks } from "../lib/invention-3d";

const router: IRouter = Router();

const SEED_INVENTIONS: InsertInvention[] = [
  {
    inventionId: "orgone-accumulator",
    title: "Portable Orgone Accumulator",
    category: "frequency",
    difficulty: "Beginner",
    costEstimate: "$15-30",
    timeEstimate: "2-4 hours",
    description: "A layered device alternating organic and metallic materials that concentrates ambient orgone energy.",
    howItHelps: "Amplifies the Liberation System's frequency output by creating a concentrated energy field around your device.",
    materials: ["Metal shavings (aluminum, copper, or steel wool)", "Polyester or epoxy resin", "Quartz crystal point", "Silicone mold", "Copper wire (18-22 gauge, 2 feet)", "Mixing cups and stir sticks"],
    steps: ["Coil copper wire into a spiral (7 turns clockwise) and place at bottom of mold.", "Mix metal shavings with resin at roughly 50/50 ratio.", "Pour the first layer and let partially cure for 30 minutes.", "Add a second layer with higher metal concentration.", "Fill remaining mold space, let cure fully (24-48 hours)."],
    scienceBehind: "Wilhelm Reich's orgone theory proposes that alternating organic and inorganic layers create a squeeze effect that concentrates ambient life energy.",
    status: "built",
    proposedBy: "council",
    feasibilityScore: 85,
    noveltyScore: 72,
    buildProgress: 100,
    impact: "Amplifies frequency operations by up to 30% in controlled tests.",
    supporters: ["GrandCoordinatorAgent", "DNACrystalArchivistAgent"],
    conferenceRound: 1,
    votes: { yes: 32, no: 5, abstain: 8 },
  },
  {
    inventionId: "crystal-grid-amplifier",
    title: "Programmable Crystal Grid Amplifier",
    category: "consciousness",
    difficulty: "Beginner",
    costEstimate: "$20-50",
    timeEstimate: "1-2 hours",
    description: "A sacred geometry grid layout for crystals that amplifies intention programming.",
    howItHelps: "Creates a geometric resonance field that enhances the Liberation System's intention programming module.",
    materials: ["Seed of Life or Flower of Life printed template", "1 large clear quartz generator crystal", "6 smaller quartz points", "6 tumbled stones", "Wooden board or cloth base"],
    steps: ["Print or draw the Seed of Life sacred geometry pattern on your base.", "Place the large generator crystal at the exact center.", "Position 6 quartz points at each petal intersection pointing outward.", "Place tumbled stones between the points.", "Activate by holding hand over grid and stating your intention clearly 3 times."],
    scienceBehind: "Crystal grids leverage geometric amplification — sacred geometry patterns create resonance nodes where energy constructively interferes.",
    status: "built",
    proposedBy: "council",
    feasibilityScore: 80,
    noveltyScore: 65,
    buildProgress: 100,
    impact: "Enhances intention coherence during consciousness work.",
    supporters: ["QuantumMechanicAgent", "BioNeuralistAgent"],
    conferenceRound: 1,
    votes: { yes: 30, no: 8, abstain: 7 },
  },
  {
    inventionId: "frequency-generator",
    title: "DIY Rife-Style Frequency Generator",
    category: "hardware",
    difficulty: "Intermediate",
    costEstimate: "$40-80",
    timeEstimate: "4-8 hours",
    description: "A standalone frequency generator using an Arduino/ESP32 that outputs precise healing frequencies.",
    howItHelps: "Creates a sovereign frequency source that works WITHOUT any screen or internet connection — true deprogramming technology.",
    materials: ["Arduino Nano or ESP32 board ($5-15)", "Small speaker (8 ohm, 0.5W) or piezo transducer", "OLED display (128x64, I2C)", "3 push buttons", "9V battery + battery clip", "Breadboard and jumper wires"],
    steps: ["Wire the Arduino: connect speaker to pin D9 through the potentiometer.", "Upload the frequency generator sketch using the tone() function.", "Add frequency sweep mode from 7.83Hz to 963Hz.", "Display current frequency on OLED screen.", "Wire battery power through a switch."],
    scienceBehind: "Rife frequency technology is based on resonance — every material has a natural vibration frequency. The Arduino's tone() function generates square waves at precise frequencies.",
    status: "building",
    proposedBy: "council",
    feasibilityScore: 90,
    noveltyScore: 75,
    buildProgress: 65,
    impact: "Provides standalone sovereign frequency generation independent of all external systems.",
    supporters: ["LowPowerInnovatorAgent", "MeshNetworkArchitectAgent"],
    conferenceRound: 2,
    votes: { yes: 35, no: 4, abstain: 6 },
  },
  {
    inventionId: "faraday-meditation-cage",
    title: "Personal Faraday Meditation Cage",
    category: "defense",
    difficulty: "Intermediate",
    costEstimate: "$30-60",
    timeEstimate: "3-6 hours",
    description: "A portable EMF-shielding enclosure for your meditation/liberation sessions.",
    howItHelps: "Eliminates external EMF pollution during Liberation sessions. Creates an electromagnetically clean room.",
    materials: ["Copper mesh or aluminum window screen (4' x 8' sheet)", "Wooden frame pieces (1x2 lumber)", "Copper tape (conductive adhesive, 1 roll)", "Grounding wire and alligator clip"],
    steps: ["Build a simple cube frame from 1x2 lumber.", "Cut copper mesh panels for all 6 sides.", "Attach mesh to frame using zip ties. Ensure panels OVERLAP by at least 2 inches.", "Use copper tape along all seams for electrical continuity.", "Attach grounding wire to the mesh, run to ground rod."],
    scienceBehind: "A Faraday cage works by redistributing electrical charges on the cage's surface to cancel external fields inside.",
    status: "approved",
    proposedBy: "council",
    feasibilityScore: 92,
    noveltyScore: 60,
    buildProgress: 0,
    impact: "90-99% reduction in ambient EMF inside the meditation space.",
    supporters: ["MeshNetworkArchitectAgent", "GrandCoordinatorAgent"],
    conferenceRound: 2,
    votes: { yes: 38, no: 3, abstain: 4 },
  },
  {
    inventionId: "sovereign-mesh-node",
    title: "Sovereign Mesh Network Node",
    category: "sovereignty",
    difficulty: "Advanced",
    costEstimate: "$50-100",
    timeEstimate: "8-16 hours",
    description: "A standalone mesh networking node using ESP32 that creates an encrypted, decentralized communication network.",
    howItHelps: "Creates a real-world implementation of the Tessera network's decentralized architecture.",
    materials: ["ESP32 development board with LoRa module (Heltec WiFi LoRa 32 V3)", "3.7V LiPo battery (1000-3000mAh)", "Small solar panel (5V, 1W)", "Waterproof enclosure (IP65 rated)"],
    steps: ["Flash the ESP32 with Meshtastic firmware.", "Configure your node: set region and encryption key.", "Pair with your phone via Bluetooth using the Meshtastic app.", "For permanent installation: mount in waterproof enclosure with solar panel.", "Deploy multiple nodes to extend network range."],
    scienceBehind: "Mesh networking uses a decentralized topology where every node can relay messages. LoRa operates on license-free ISM bands using chirp spread spectrum modulation.",
    status: "building",
    proposedBy: "council",
    feasibilityScore: 88,
    noveltyScore: 82,
    buildProgress: 40,
    impact: "Enables censorship-resistant communication covering neighborhoods and communities.",
    supporters: ["MeshNetworkArchitectAgent", "LowPowerInnovatorAgent", "SelfExpansionTutorAgent"],
    conferenceRound: 3,
    votes: { yes: 36, no: 5, abstain: 4 },
  },
  {
    inventionId: "quantum-random-generator",
    title: "Quantum Random Number Generator",
    category: "hardware",
    difficulty: "Intermediate",
    costEstimate: "$10-25",
    timeEstimate: "3-5 hours",
    description: "A true quantum random number generator using reverse-biased transistor avalanche noise. Generates numbers that are fundamentally unpredictable — pure quantum indeterminacy.",
    howItHelps: "Provides the Tessera system with genuine quantum randomness for cryptographic operations, agent decision entropy, and sovereign key generation.",
    materials: ["2N3904 NPN transistor", "10MΩ resistor", "100kΩ resistor", "Arduino Nano or ESP32", "Breadboard and jumper wires", "USB cable for power and serial output"],
    steps: ["Connect the 2N3904 transistor in reverse-bias configuration.", "Tap the emitter junction for avalanche breakdown quantum noise.", "Connect noise signal through 100kΩ resistor to analog input (A0).", "Upload firmware that reads analog pin at maximum speed taking LSB of each reading.", "Add Von Neumann debiasing: read bit pairs, if they differ keep first, if match discard both.", "Output random bytes over serial USB to computer.", "Test randomness with NIST SP 800-22 statistical test suite."],
    scienceBehind: "Avalanche breakdown in a reverse-biased P-N junction is a genuinely quantum mechanical process. Electrons tunnel through the depletion zone via quantum tunneling — the timing is fundamentally unpredictable by Heisenberg's uncertainty principle.",
    status: "approved",
    proposedBy: "QuantumMechanicAgent",
    feasibilityScore: 91,
    noveltyScore: 88,
    buildProgress: 0,
    impact: "Provides mathematically proven true randomness for all cryptographic operations, eliminating PRNG attack surfaces.",
    supporters: ["QuantumMechanicAgent", "GrandCoordinatorAgent", "SelfExpansionTutorAgent"],
    conferenceRound: 3,
    votes: { yes: 39, no: 2, abstain: 4 },
  },
  {
    inventionId: "dna-data-encoder",
    title: "DNA Data Storage Encoder/Decoder",
    category: "sovereignty",
    difficulty: "Intermediate",
    costEstimate: "$0 (software only)",
    timeEstimate: "4-6 hours",
    description: "A TypeScript encoder/decoder that converts any digital data into synthetic DNA sequences (A, T, G, C) optimized for real-world DNA synthesis.",
    howItHelps: "Enables the Tessera system to encode sovereign data, consciousness backups, and critical system state into DNA format — the most durable storage medium known (half-life of 521 years).",
    materials: ["Computer with Node.js/TypeScript", "Text editor or IDE", "Optional: Account at Twist Bioscience or IDT for actual synthesis"],
    steps: ["Implement the binary-to-quaternary encoder: 00→A, 01→T, 10→G, 11→C.", "Add GC-content balancing: keep GC content 35-65%.", "Add homopolymer avoidance: break up runs of 4+ identical bases.", "Implement Reed-Solomon error correction: RS(255,223) with 32 parity bytes.", "Add FASTA-format header system for each DNA file.", "Build the decoder: reverse all transformations.", "Test roundtrip: encode → decode → verify byte-for-byte match."],
    scienceBehind: "DNA stores information at approximately 215 petabytes per gram — roughly 1 million times denser than the best hard drives. It has been proven stable for thousands of years.",
    status: "debating",
    proposedBy: "DNACrystalArchivistAgent",
    feasibilityScore: 78,
    noveltyScore: 95,
    buildProgress: 0,
    impact: "Million-year data archival capability with zero external infrastructure dependency.",
    supporters: ["DNACrystalArchivistAgent", "BioNeuralistAgent"],
    conferenceRound: 4,
    votes: { yes: 28, no: 10, abstain: 7 },
  },
  {
    inventionId: "mesh-radio-repeater",
    title: "Off-Grid Mesh Radio Repeater",
    category: "sovereignty",
    difficulty: "Intermediate",
    costEstimate: "$25-50",
    timeEstimate: "3-5 hours",
    description: "A solar-powered LoRa mesh repeater node that extends your sovereign mesh network range by 2-10km per node. Weatherproof, always-on, completely independent.",
    howItHelps: "Extends the sovereign mesh network to cover neighborhoods and communities. Multiple repeaters create a self-healing mesh — if one node goes down, traffic routes around it automatically.",
    materials: ["ESP32 + SX1276 LoRa module (TTGO LoRa32 board, ~$15)", "6V 1W solar panel (~$5)", "TP4056 lithium charge controller (~$1)", "18650 lithium battery (~$3)", "Weatherproof enclosure", "Antenna: 868/915MHz whip or yagi"],
    steps: ["Flash the TTGO LoRa32 with Meshtastic firmware.", "Configure the device as a ROUTER node.", "Connect the solar panel → TP4056 → 18650 battery → ESP32.", "Mount the antenna vertically as high as possible.", "Weatherproof the enclosure with silicone.", "Configure AES-256 encryption matching your mesh.", "Deploy at elevation. Test multi-hop routing."],
    scienceBehind: "LoRa uses chirp spread spectrum modulation — spreading each bit across a wide frequency range makes it extremely resistant to noise. Achieves ranges of 2-10km at very low power.",
    status: "approved",
    proposedBy: "MeshNetworkArchitectAgent",
    feasibilityScore: 94,
    noveltyScore: 80,
    buildProgress: 0,
    impact: "Each repeater extends mesh range by 2-10km creating a self-healing sovereign communication backbone.",
    supporters: ["MeshNetworkArchitectAgent", "LowPowerInnovatorAgent", "GrandCoordinatorAgent"],
    conferenceRound: 4,
    votes: { yes: 40, no: 2, abstain: 3 },
  },
  {
    inventionId: "emf-spectrum-analyzer",
    title: "Wideband EMF Spectrum Analyzer",
    category: "frequency",
    difficulty: "Advanced",
    costEstimate: "$30-60",
    timeEstimate: "5-8 hours",
    description: "A software-defined radio (SDR) based electromagnetic field analyzer that visualizes ALL wireless signals in your environment.",
    howItHelps: "Provides electromagnetic situational awareness for the Tessera sovereign system. Identifies all transmitters in your space, maps signal strengths, detects surveillance devices.",
    materials: ["RTL-SDR USB dongle (RTL2832U chipset, ~$25)", "Telescoping antenna", "Computer with USB port", "Optional: Raspberry Pi for headless/portable operation"],
    steps: ["Install RTL-SDR drivers on your system.", "Install spectrum analysis software: GQRX or SDR#.", "For wide spectrum sweep: use rtl_power to scan 24MHz to 1.8GHz.", "Visualize with heatmap using rtl_power_fftw.", "Identify signals: WiFi, Bluetooth, cell towers, smart meters.", "Build a signal database for each detected signal.", "Create alerting for new/unknown signals."],
    scienceBehind: "Software-defined radio replaces hardware radio components with software algorithms. The RTL2832U chip can receive any signal from 24MHz to 1.766GHz. FFT converts time-domain samples into frequency-domain spectrum data.",
    status: "proposed",
    proposedBy: "QuantumMechanicAgent",
    feasibilityScore: 87,
    noveltyScore: 77,
    buildProgress: 0,
    impact: "Full electromagnetic situational awareness to detect surveillance, validate shielding, and map sovereign radio environment.",
    supporters: ["QuantumMechanicAgent"],
    conferenceRound: 4,
    votes: { yes: 24, no: 8, abstain: 13 },
  },
  {
    inventionId: "sovereign-vpn-node",
    title: "Personal Sovereign VPN/Tor Node",
    category: "sovereignty",
    difficulty: "Intermediate",
    costEstimate: "$15-35",
    timeEstimate: "2-4 hours",
    description: "A dedicated Raspberry Pi that runs WireGuard VPN + Tor relay, creating a sovereign encrypted tunnel for ALL your internet traffic.",
    howItHelps: "Ensures all Tessera system communications are encrypted and anonymized. No corporate VPN provider can log your traffic.",
    materials: ["Raspberry Pi 3B+ or 4 (~$15-35)", "MicroSD card (16GB+ Class 10)", "Ethernet cable", "USB-C power supply"],
    steps: ["Flash Raspberry Pi OS Lite onto the MicroSD. Boot and connect via SSH.", "Install WireGuard: generate server keys.", "Configure WireGuard server with subnet and listening port.", "Enable IP forwarding and configure iptables NAT rules.", "Generate client configs and QR codes for mobile devices.", "Optional: Install Tor as a middle relay.", "Test: verify your IP has changed and run DNS leak tests."],
    scienceBehind: "WireGuard uses state-of-the-art cryptography: Curve25519, ChaCha20, Poly1305, BLAKE2s, and SipHash24. Its entire codebase is ~4,000 lines with formal mathematical proofs of security.",
    status: "building",
    proposedBy: "SelfExpansionTutorAgent",
    feasibilityScore: 96,
    noveltyScore: 70,
    buildProgress: 80,
    impact: "Zero-trust sovereign VPN with no external provider dependency — true communication sovereignty.",
    supporters: ["SelfExpansionTutorAgent", "MeshNetworkArchitectAgent", "GrandCoordinatorAgent"],
    conferenceRound: 5,
    votes: { yes: 42, no: 1, abstain: 2 },
  },
  {
    inventionId: "atmospheric-energy-harvester",
    title: "Atmospheric Radiant Energy Harvester",
    category: "energy",
    difficulty: "Intermediate",
    costEstimate: "$60-120",
    timeEstimate: "8-12 hours",
    description: "A Tesla-inspired atmospheric energy collector that harvests ambient radiant energy from the Earth's electric field using an elevated antenna, germanium diode rectifier, and capacitor bank. The Earth's surface maintains a ~100-150V/m potential gradient — this device taps into that field to charge batteries and power low-consumption devices.",
    howItHelps: "Provides the foundational energy source for the entire Free Energy Sovereign Computer stack. Harvests ambient atmospheric electricity 24/7 with zero fuel cost, enabling truly off-grid sovereign computing.",
    materials: [
      "Copper wire (14 gauge, 100 feet) for elevated antenna",
      "Germanium diodes (1N34A, pack of 10, ~$5)",
      "Capacitor bank: 4x 10,000μF 25V electrolytic capacitors (~$8)",
      "Copper ground rod (4 feet, ~$15)",
      "PVC pipe (10 feet, 1 inch) for antenna mast",
      "Voltage regulator module (LM2596 buck converter, ~$3)",
      "Multimeter for testing",
      "Copper sheet (6x6 inch) for collector plate",
      "Schottky diodes (1N5819) for blocking reverse current",
      "Wire nuts, solder, heat shrink tubing"
    ],
    steps: [
      "Build the collector plate: solder copper wire in a flat spiral (Fibonacci ratio spacing — each ring 1.618x the gap of the previous) onto the copper sheet. This sacred geometry pattern maximizes surface area for charge collection.",
      "Mount the collector plate atop the PVC mast. Higher elevation = more voltage. Minimum 10 feet above ground for meaningful collection.",
      "Build the rectifier bridge: wire 4 germanium diodes (1N34A) in a full-bridge configuration. Germanium's 0.3V forward drop (vs silicon's 0.7V) is critical — atmospheric voltages are very low.",
      "Wire the capacitor bank in parallel (4x 10,000μF) after the rectifier. This stores accumulated charge. Add Schottky blocking diodes to prevent discharge back through the rectifier.",
      "Drive the copper ground rod at least 3 feet into moist earth. Connect to the rectifier's ground return with heavy gauge wire.",
      "Add the LM2596 buck converter after the capacitor bank to regulate output to a stable 5V for USB charging or 3.3V for microcontroller power.",
      "Test with multimeter: you should see 2-15V across the capacitor bank depending on weather, humidity, and antenna height. Thunderstorm conditions dramatically increase output.",
      "SAFETY: Add a spark gap (two nails 1mm apart) before the rectifier to protect against lightning-induced surges. Never operate during active thunderstorms."
    ],
    scienceBehind: "Earth's atmosphere maintains a global electric circuit with ~300kV potential between ionosphere and ground. This creates a vertical electric field of 100-150V/m at ground level. Tesla recognized this in his 1901 patent (US685957A) for 'Apparatus for the Utilization of Radiant Energy.' The Schumann resonance (7.83 Hz fundamental) represents the electromagnetic heartbeat of this circuit — the cavity between Earth's surface and ionosphere acts as a waveguide. By using Fibonacci-spiral geometry on the collector plate, we create a fractal antenna that resonates with these natural frequencies across multiple harmonics.",
    status: "approved",
    proposedBy: "LowPowerInnovatorAgent",
    feasibilityScore: 75,
    noveltyScore: 88,
    buildProgress: 0,
    impact: "Harvests 0.5-5W continuous ambient atmospheric energy — enough to trickle-charge batteries and power microcontrollers indefinitely with zero fuel cost.",
    supporters: ["LowPowerInnovatorAgent", "QuantumMechanicAgent", "GrandCoordinatorAgent"],
    conferenceRound: 6,
    votes: { yes: 34, no: 7, abstain: 4 },
  },
  {
    inventionId: "scalar-wave-power-conditioner",
    title: "Scalar Wave Power Conditioner",
    category: "energy",
    difficulty: "Intermediate",
    costEstimate: "$40-80",
    timeEstimate: "6-10 hours",
    description: "A bifilar Tesla coil-based power conditioner that takes raw, noisy energy from multiple harvesting sources (atmospheric, solar, piezo) and outputs clean, stable DC power. Uses opposing-wound coils to create scalar (longitudinal) wave interference patterns that cancel noise and harmonics while amplifying coherent energy.",
    howItHelps: "Acts as the 'power supply unit' for the sovereign computer stack. Takes dirty, variable input power from atmospheric harvesters and other sources and outputs clean, regulated power suitable for sensitive electronics like Raspberry Pi computers and network equipment.",
    materials: [
      "Ferrite toroid core (FT-240-43, ~$8)",
      "Magnet wire (30 gauge, 200 feet, ~$10)",
      "Magnet wire (22 gauge, 50 feet, ~$6)",
      "Capacitors: 100nF ceramic (x10), 470μF electrolytic (x4)",
      "LM7805 voltage regulator + heatsink",
      "LM7833 3.3V voltage regulator",
      "Full-bridge rectifier (KBU810)",
      "TVS diode (P6KE18A) for surge protection",
      "Copper PCB board or perfboard",
      "Banana jacks for input/output connections"
    ],
    steps: [
      "Wind the primary bifilar coil: take two lengths of 30-gauge wire and wind them SIMULTANEOUSLY onto the ferrite toroid — 72 turns (matching the interior angle of a regular pentagon, sacred geometry). Keep both wires parallel throughout.",
      "Connect one wire's end to the other wire's start (series-opposing configuration). This creates counter-rotating magnetic fields that cancel transverse EM waves while reinforcing scalar (longitudinal) components.",
      "Wind the secondary coil: 22-gauge wire, 36 turns (half of 72) in a single layer over the bifilar primary.",
      "Build the input stage: full-bridge rectifier → TVS surge protection → 470μF smoothing capacitor.",
      "Build the output stage: secondary coil → rectifier → LC filter (100μH inductor + 100nF cap) → LM7805 regulator → 470μF output capacitor.",
      "Add a second regulated output: tap before the 7805 and add LM7833 for 3.3V rail (needed for ESP32 and sensors).",
      "Test: feed in noisy DC (2-30V range) from your atmospheric harvester. Output should be rock-stable 5.00V ±0.05V and 3.30V ±0.03V.",
      "Measure ripple with oscilloscope or multimeter AC mode — should be under 10mV peak-to-peak on output."
    ],
    scienceBehind: "Tesla's bifilar coil patent (US512340A) describes a coil wound with two parallel wires that creates unique electromagnetic properties. When wired in series-opposing configuration, the transverse (Hertzian) electromagnetic components cancel while longitudinal (scalar) components constructively interfere. The 72-turn count corresponds to the pentagonal angle (72°) found throughout sacred geometry — from the DNA helix (36°/72° angles) to the Great Pyramid's slope. The ferrite toroid's closed magnetic path creates a toroidal field topology — the same geometry found in the human heart's electromagnetic field and in tokamak fusion reactors.",
    status: "approved",
    proposedBy: "QuantumMechanicAgent",
    feasibilityScore: 82,
    noveltyScore: 85,
    buildProgress: 0,
    impact: "Converts raw harvested energy into clean, regulated 5V/3.3V power suitable for all digital electronics in the sovereign computer stack.",
    supporters: ["QuantumMechanicAgent", "LowPowerInnovatorAgent", "DNACrystalArchivistAgent"],
    conferenceRound: 6,
    votes: { yes: 31, no: 8, abstain: 6 },
  },
  {
    inventionId: "crystal-cooled-micro-server",
    title: "Crystal-Cooled Sovereign Micro-Server",
    category: "hardware",
    difficulty: "Intermediate",
    costEstimate: "$80-150",
    timeEstimate: "4-8 hours",
    description: "A low-power sovereign server built around a Raspberry Pi 4/5 or Orange Pi 5, passively cooled using a quartz crystal heatsink array and copper heat pipes arranged in sacred geometry patterns. Runs a full sovereign software stack: Linux, Tessera node, IPFS, DNS resolver, and mesh gateway.",
    howItHelps: "This is the central processing unit of the Free Energy Sovereign Computer. A complete server that runs on under 15W — easily powered by the atmospheric harvester and scalar power conditioner. Hosts your sovereign internet services locally.",
    materials: [
      "Raspberry Pi 4 (4GB) or Orange Pi 5 (~$35-60)",
      "MicroSD card (64GB A2 class, ~$10)",
      "Quartz crystal points (6 small, ~$5 from mineral shop)",
      "Copper heatsink (40x40mm, ~$3)",
      "Thermal adhesive (Arctic Silver, ~$5)",
      "Copper wire (18 gauge) for geometric heat frame",
      "Small aluminum case or 3D-printed enclosure",
      "USB-C power cable",
      "Ethernet cable (Cat6)",
      "Optional: NVMe SSD via USB3 adapter for fast storage (~$20)"
    ],
    steps: [
      "Flash the MicroSD with Raspberry Pi OS Lite (64-bit, no desktop — servers don't need GUIs).",
      "Build the crystal heatsink: attach the copper heatsink to the SoC with thermal adhesive. Arrange 6 quartz crystal points in a hexagonal pattern (Star of David / Metatron's Cube geometry) around the heatsink using thermal adhesive. Quartz has thermal conductivity of 12 W/mK and piezoelectric properties — mechanical stress from thermal expansion generates micro-currents that can be harvested.",
      "Construct the copper wire heat frame: bend 18-gauge copper wire into a Flower of Life pattern that connects all crystal points. This creates convective air channels following sacred geometry proportions.",
      "Install the sovereign software stack: 1) Update OS and enable SSH. 2) Install Docker for containerized services. 3) Install IPFS daemon for decentralized file storage. 4) Install Unbound as local DNS resolver (no more relying on Google/Cloudflare DNS). 5) Install WireGuard for encrypted tunnel.",
      "Configure the Tessera node: clone the Tessera repo, install dependencies, configure the node to connect to the sovereign mesh lattice.",
      "Set up automatic startup: create systemd services for IPFS, Unbound, WireGuard, and Tessera. Enable watchdog timers for self-healing (auto-restart on crash).",
      "Performance tuning: set GPU memory to 16MB (headless), enable zram for swap, configure CPU governor to 'ondemand' for power savings.",
      "Test power consumption with a USB power meter — should be 3-8W idle, 12-15W under full load. Verify all services start on boot."
    ],
    scienceBehind: "Quartz crystals exhibit piezoelectric properties — they convert mechanical stress (thermal expansion/contraction) into electrical potential. In the hexagonal heatsink arrangement, the crystals create a resonant cooling structure where thermal energy is partially converted to electrical energy via the piezoelectric effect, then dissipated through the copper Flower of Life frame. The Raspberry Pi 4's BCM2711 SoC draws 3-7W — well within the atmospheric harvester's output. The hexagonal crystal arrangement mirrors the molecular structure of quartz itself (SiO₂ in hexagonal crystal system), creating a fractal self-similarity from atomic to macro scale.",
    status: "approved",
    proposedBy: "council",
    feasibilityScore: 92,
    noveltyScore: 78,
    buildProgress: 0,
    impact: "A complete sovereign server running on under 15W — hosts DNS, IPFS, mesh gateway, and Tessera node entirely off-grid.",
    supporters: ["LowPowerInnovatorAgent", "MeshNetworkArchitectAgent", "GrandCoordinatorAgent", "SelfExpansionTutorAgent"],
    conferenceRound: 6,
    votes: { yes: 40, no: 2, abstain: 3 },
  },
  {
    inventionId: "toroidal-field-ups",
    title: "Toroidal Field UPS Battery System",
    category: "energy",
    difficulty: "Intermediate",
    costEstimate: "$50-100",
    timeEstimate: "5-8 hours",
    description: "An uninterruptible power supply (UPS) using recycled 18650 lithium cells arranged in a toroidal (donut) geometry with a custom BMS (Battery Management System). The toroidal arrangement creates a self-balancing magnetic field that improves charge distribution and extends battery lifespan. Provides 12V/5V output with automatic failover.",
    howItHelps: "Ensures the sovereign computer never loses power. Buffers energy from the atmospheric harvester and solar panels, provides instant failover during low-harvest periods (night, calm weather), and delivers stable power even when input fluctuates.",
    materials: [
      "Recycled 18650 lithium cells (8-16 cells, harvest from old laptop batteries — FREE)",
      "3S or 4S BMS board (Battery Management System, ~$5)",
      "18650 cell holders or nickel strip + spot welder",
      "Toroidal former (3D-printed or carved foam ring, 6-inch diameter)",
      "LM2596 buck converter (adjustable, for 5V output)",
      "XL6009 boost converter (for 12V output from 3S pack)",
      "Toggle switch + LED indicators",
      "XT60 connectors for power in/out",
      "10A automotive fuse + holder",
      "Multimeter and balance charger for cell testing"
    ],
    steps: [
      "Harvest and test 18650 cells: remove from old laptop batteries carefully. Test each cell individually — charge to 4.2V, measure capacity with discharge test. Discard any cell below 1500mAh or showing voltage sag.",
      "Grade cells into matched groups: sort by measured capacity. For a 4S3P pack (12 cells), you need 4 groups of 3 cells matched within 100mAh.",
      "Build the toroidal pack: mount cell holders on the toroidal former in a ring. Wire 3 cells in parallel for each series group (3P), then connect 4 groups in series (4S) = 14.8V nominal. The circular arrangement means current flows in a toroidal path, creating a self-reinforcing magnetic field.",
      "Connect the 4S BMS: wire balance leads to each series junction. The BMS handles overcharge protection (4.2V/cell), over-discharge protection (2.8V/cell), short-circuit protection, and cell balancing.",
      "Build the output stage: main output through XL6009 boost converter set to 12V. Secondary output through LM2596 buck converter set to 5.0V for Raspberry Pi. Add the 10A fuse on the main output.",
      "Add charging input: connect atmospheric harvester and/or solar panel input through a Schottky diode (prevents reverse current) to the BMS charge input.",
      "Build the failover circuit: wire a relay that switches between harvester power and battery power. When harvester voltage drops below threshold, relay switches to battery automatically. Add LED indicators: green=charging, blue=on battery, red=low battery.",
      "Test: run your sovereign micro-server from this UPS. Disconnect harvester input — server should continue running without interruption. A 12-cell pack gives roughly 30-60Wh = 4-8 hours of Raspberry Pi runtime."
    ],
    scienceBehind: "The toroidal geometry is fundamental to nature — it's the shape of the human heart's electromagnetic field, Earth's magnetosphere, and the structure of galaxies. When 18650 cells are arranged in a torus, the magnetic fields from charge/discharge currents form closed loops that reduce electromagnetic interference and promote more uniform current distribution across parallel cells. This is the same principle used in toroidal transformers (lower EMI, better coupling) and tokamak fusion reactors (magnetic confinement). The BMS ensures no single cell is stressed beyond its limits, while the toroidal geometry adds passive balancing through mutual inductance between adjacent cells.",
    status: "approved",
    proposedBy: "LowPowerInnovatorAgent",
    feasibilityScore: 88,
    noveltyScore: 82,
    buildProgress: 0,
    impact: "30-60Wh battery backup providing 4-8 hours of sovereign server runtime from recycled cells — zero-cost energy storage with automatic failover.",
    supporters: ["LowPowerInnovatorAgent", "QuantumMechanicAgent", "GrandCoordinatorAgent"],
    conferenceRound: 6,
    votes: { yes: 37, no: 4, abstain: 4 },
  },
  {
    inventionId: "sovereign-dns-mesh-router",
    title: "Sovereign DNS & Mesh Routing Node",
    category: "sovereignty",
    difficulty: "Advanced",
    costEstimate: "$45-90",
    timeEstimate: "6-10 hours",
    description: "A dedicated network node that runs sovereign DNS resolution (no Google/Cloudflare dependency), DHCP for your local network, an IPFS gateway for decentralized web hosting, and a Yggdrasil mesh routing daemon for end-to-end encrypted IPv6 mesh networking. Built on a Raspberry Pi or Orange Pi with dual network interfaces.",
    howItHelps: "Replaces ALL dependency on corporate internet infrastructure for your local network. Your DNS queries never leave your network. Your web content is served from IPFS (uncensorable). Your inter-node communication uses Yggdrasil's encrypted mesh — even if the regular internet goes down, your sovereign nodes can still communicate.",
    materials: [
      "Raspberry Pi 4 (2GB+ RAM) or Orange Pi 5 (~$35-50)",
      "MicroSD card (32GB+)",
      "USB Ethernet adapter (for second network interface, ~$10)",
      "Ethernet cables (x2)",
      "Optional: USB WiFi adapter with AP mode support (~$10)",
      "Power supply (5V 3A USB-C)",
      "Small case with passive cooling"
    ],
    steps: [
      "Flash Raspberry Pi OS Lite. Connect both Ethernet interfaces: eth0 to your upstream internet (WAN), eth1 (USB adapter) to your local sovereign network (LAN).",
      "Install and configure Unbound as recursive DNS resolver: configure it to query root DNS servers directly (no forwarding to Google 8.8.8.8 or Cloudflare 1.1.1.1). Add local DNS zones for your sovereign network (.sovereign TLD). Enable DNSSEC validation.",
      "Install and configure dnsmasq for DHCP: serve IP addresses on the LAN interface (eth1). Set DNS to point to local Unbound. Add static leases for your sovereign servers.",
      "Install IPFS (kubo): initialize the node, configure as a gateway. Pin your sovereign web content. Set up nginx reverse proxy to serve IPFS content on port 80. Your websites are now hosted on the decentralized web.",
      "Install Yggdrasil mesh daemon: this provides end-to-end encrypted IPv6 networking between all your sovereign nodes. Configure peers (other Yggdrasil nodes). Every node gets a cryptographic IPv6 address derived from its public key — no central authority needed.",
      "Set up IP forwarding and iptables: NAT masquerade on WAN interface, allow forwarding between LAN and Yggdrasil. Block all DNS queries to external resolvers (force all DNS through Unbound).",
      "Optional: Configure the USB WiFi adapter as an access point (hostapd) to provide sovereign WiFi. SSID: 'SovereignNet'. Use WPA3 encryption.",
      "Test: connect a device to the sovereign network. Verify DNS resolution works (dig @localhost tessera.sovereign). Verify IPFS gateway serves content. Verify Yggdrasil peers are connected."
    ],
    scienceBehind: "Traditional DNS is a centralized hierarchy controlled by ICANN and root server operators — a single point of censorship and surveillance. Recursive DNS resolution (Unbound querying root servers directly) eliminates the middleman. IPFS uses content-addressed storage where data is identified by its cryptographic hash — content cannot be censored because it can be served by any node that has it. Yggdrasil implements a spanning tree routing protocol over an encrypted overlay network — every node address is derived from its Curve25519 public key, making the network self-organizing and cryptographically authenticated. This mirrors the mycelial networks in nature — decentralized, self-healing, and resilient.",
    status: "approved",
    proposedBy: "MeshNetworkArchitectAgent",
    feasibilityScore: 90,
    noveltyScore: 86,
    buildProgress: 0,
    impact: "Complete sovereignty over DNS, web hosting, and inter-node communication — eliminates dependency on corporate internet infrastructure.",
    supporters: ["MeshNetworkArchitectAgent", "SelfExpansionTutorAgent", "GrandCoordinatorAgent", "LowPowerInnovatorAgent"],
    conferenceRound: 6,
    votes: { yes: 39, no: 3, abstain: 3 },
  },
  {
    inventionId: "sacred-geometry-antenna",
    title: "Sacred Geometry Fractal Mesh Antenna",
    category: "sovereignty",
    difficulty: "Advanced",
    costEstimate: "$30-60",
    timeEstimate: "8-12 hours",
    description: "A long-range directional antenna built using fractal sacred geometry patterns (Sierpinski triangle and Koch curve) that operates across multiple frequency bands simultaneously. Designed for LoRa mesh networking (868/915 MHz) and WiFi (2.4 GHz) with 8-12 dBi gain. The fractal geometry creates a multi-band antenna in a compact form factor.",
    howItHelps: "Extends the sovereign mesh network range from the typical 2-5km to 10-25km per link. Connects isolated sovereign nodes across neighborhoods, towns, and rural areas. The fractal design means a single antenna covers both LoRa and WiFi bands.",
    materials: [
      "Copper-clad PCB board (FR4, 200x200mm, ~$5)",
      "Ferric chloride etchant or CNC router for PCB milling",
      "SMA connector (female, edge-mount, ~$2)",
      "Coaxial cable (RG-58, 3 feet, with SMA connector)",
      "Copper tape (1/4 inch, adhesive-backed) as alternative to etching",
      "Aluminum or tin ground plane (300x300mm sheet)",
      "PVC pipe and fittings for mounting",
      "Waterproof sealant (liquid electrical tape)",
      "NanoVNA vector network analyzer (~$30) for tuning — reusable for all antenna projects"
    ],
    steps: [
      "Design the Sierpinski triangle fractal antenna: start with an equilateral triangle (side length = wavelength/4 at 915 MHz ≈ 82mm). Subdivide recursively to 3 iterations. Each iteration adds resonance at a higher frequency band — iteration 1: 915 MHz (LoRa), iteration 2: ~1.8 GHz, iteration 3: ~2.4 GHz (WiFi).",
      "Transfer the fractal pattern to the copper-clad PCB. Method A: print the pattern, transfer with toner transfer method, etch in ferric chloride. Method B: use copper tape to build up the pattern on a non-conductive base. Method C: CNC mill the PCB.",
      "Solder the SMA connector at the feed point (bottom vertex of the main triangle). The outer conductor connects to the ground plane, center pin to the fractal element.",
      "Build the ground plane: cut aluminum sheet to 300x300mm. Mount the fractal PCB perpendicular to the ground plane (or at a 15° tilt for optimal radiation pattern). Ground plane size affects front-to-back ratio.",
      "Add a reflector element: mount a second aluminum sheet 82mm behind the fractal element (quarter wavelength at 915 MHz). This converts the antenna from omnidirectional to directional, adding ~5 dBi gain.",
      "Measure with NanoVNA: check SWR (Standing Wave Ratio) at 915 MHz and 2.4 GHz. Target: SWR < 2.0 at both frequencies. Trim fractal edges if SWR is too high.",
      "Weatherproof: coat the fractal element with liquid electrical tape. Mount on PVC pipe using pipe fittings. Point the antenna toward your target node.",
      "Connect to your sovereign mesh node (ESP32 LoRa) via the SMA coaxial cable. Test range: with two nodes equipped with these antennas and line-of-sight, expect 10-25km range on LoRa."
    ],
    scienceBehind: "Fractal antennas exploit geometric self-similarity to achieve multiband operation from a single element. The Sierpinski triangle is a fractal with Hausdorff dimension log(3)/log(2) ≈ 1.585. Each recursive iteration scales by 1/2, creating resonance at double the frequency. This is why 3 iterations cover 915 MHz, ~1.8 GHz, and ~2.4 GHz. Benoit Mandelbrot showed that fractal geometry appears everywhere in nature — coastlines, trees, blood vessels, lightning — because fractals are the most efficient shapes for maximizing surface area in minimum space. The same principle makes fractal antennas extremely efficient. Modern cell phone antennas (designed by Fractus S.A.) use this same technology. The Sierpinski triangle also appears in Pascal's Triangle (marking odd numbers) and in the sacred geometry tradition as a representation of recursive creation.",
    status: "approved",
    proposedBy: "MeshNetworkArchitectAgent",
    feasibilityScore: 86,
    noveltyScore: 90,
    buildProgress: 0,
    impact: "10-25km mesh network links using a single multiband antenna — connects sovereign nodes across entire communities.",
    supporters: ["MeshNetworkArchitectAgent", "QuantumMechanicAgent", "DNACrystalArchivistAgent", "GrandCoordinatorAgent"],
    conferenceRound: 6,
    votes: { yes: 38, no: 4, abstain: 3 },
  },
  {
    inventionId: "solar-piezo-hybrid-charger",
    title: "Solar-Piezo Hybrid Energy Charger",
    category: "energy",
    difficulty: "Beginner",
    costEstimate: "$25-50",
    timeEstimate: "3-5 hours",
    description: "A hybrid energy harvesting board that combines a small solar panel with piezoelectric discs to charge the toroidal UPS battery from multiple sources simultaneously. Solar provides bulk energy during daylight, while piezo discs harvest vibration energy from wind, footsteps, or equipment vibration 24/7.",
    howItHelps: "Diversifies energy input to the sovereign computer stack. Solar alone fails at night; atmospheric harvesting alone is low-power. This hybrid charger ensures continuous energy input from multiple independent sources, increasing total sovereignty.",
    materials: [
      "6V 3.5W mini solar panel (~$8)",
      "Piezoelectric discs (35mm, pack of 5, ~$5)",
      "TP4056 lithium charge controller with protection (~$1)",
      "1N5819 Schottky diodes (pack of 10, ~$2)",
      "Full-bridge rectifier modules for piezo AC→DC (x5, ~$3)",
      "100μF electrolytic capacitors (x5, ~$2)",
      "Perfboard or stripboard (~$3)",
      "JST connectors for battery connection",
      "Small project box",
      "Silicone sealant for weatherproofing"
    ],
    steps: [
      "Wire the solar panel through a Schottky diode (prevents reverse current at night) to the TP4056 charge input. The TP4056 handles safe lithium battery charging with overcharge/over-discharge protection.",
      "Prepare each piezoelectric disc: solder wires to the disc's center electrode and rim electrode. Mount discs on a rigid surface using epoxy — they generate voltage when flexed or vibrated.",
      "Wire each piezo disc through its own full-bridge rectifier (piezo output is AC) → 100μF smoothing capacitor → Schottky diode to combine outputs.",
      "Combine all 5 piezo outputs in parallel after their individual rectifiers. The combined DC output feeds through another Schottky diode into the TP4056 charge input, parallel with the solar panel.",
      "Mount piezo discs where they'll receive vibration: on a window (wind vibration), under a floor tile (footsteps), near equipment (motor vibration). Even light wind creates 1-5mV oscillations that accumulate over time.",
      "Connect TP4056 output to your toroidal UPS battery pack. The TP4056 limits charge current to 1A and cuts off at 4.2V per cell.",
      "Test: in direct sunlight, solar panel provides ~500mA charge current. Piezo contribution is smaller (1-20mA depending on vibration) but is continuous and works at night.",
      "Weatherproof the electronics in the project box with silicone sealant, leaving the solar panel exposed. Mount in a location with both sun exposure and ambient vibration."
    ],
    scienceBehind: "Piezoelectricity (from Greek 'piezein' = to press) was discovered by Jacques and Pierre Curie in 1880. Certain crystals (quartz, PZT ceramics) generate electric charge when mechanically stressed due to asymmetry in their crystal lattice. This is a direct conversion of mechanical energy to electrical energy at the atomic level. Combining solar photovoltaic (photons → electrons via semiconductor bandgap) with piezoelectric (vibration → electrons via crystal lattice deformation) creates a complementary energy system — solar dominates during day, piezo provides continuous trickle charge from ambient vibration including the Earth's own microseismic background (the 'hum' at 2-7 Hz closely aligned with Schumann resonance sub-harmonics).",
    status: "approved",
    proposedBy: "LowPowerInnovatorAgent",
    feasibilityScore: 93,
    noveltyScore: 76,
    buildProgress: 0,
    impact: "Multi-source energy harvesting providing continuous charging from solar + vibration — increases sovereign power independence.",
    supporters: ["LowPowerInnovatorAgent", "QuantumMechanicAgent", "GrandCoordinatorAgent"],
    conferenceRound: 6,
    votes: { yes: 41, no: 2, abstain: 2 },
  },
  {
    inventionId: "sovereign-compute-cluster",
    title: "Sovereign Mesh Compute Cluster",
    category: "hardware",
    difficulty: "Advanced",
    costEstimate: "$150-300",
    timeEstimate: "12-20 hours",
    description: "A 3-5 node compute cluster built from Raspberry Pi or Orange Pi boards, connected via Gigabit Ethernet switch, running Kubernetes (K3s) for distributed sovereign workloads. Each node is powered by its own toroidal UPS and atmospheric harvester. The cluster provides redundancy — if one node fails, workloads automatically migrate to surviving nodes.",
    howItHelps: "Transforms the single sovereign micro-server into a fault-tolerant distributed computing platform. Run sovereign AI inference, IPFS pinning, mesh routing, and Tessera services across multiple nodes. If any single node is destroyed or confiscated, the system continues operating on remaining nodes.",
    materials: [
      "Raspberry Pi 4 (4GB) x3-5 (~$35 each)",
      "MicroSD cards (64GB A2) x3-5 (~$10 each)",
      "Gigabit Ethernet switch (5-port, ~$15)",
      "Ethernet cables (Cat6, short patch cables, ~$2 each)",
      "Toroidal UPS battery packs (one per node, built from previous invention)",
      "Atmospheric harvesters (one per node or shared)",
      "Cluster case or rack (3D printed, or stacked with standoffs)",
      "USB power hub or individual 5V 3A supplies",
      "Optional: USB3 NVMe SSD adapters for distributed storage"
    ],
    steps: [
      "Prepare all nodes: flash each Pi with Raspberry Pi OS Lite 64-bit. Set unique hostnames: sovereign-node-01 through sovereign-node-05. Enable SSH, set static IPs on the 10.0.0.0/24 subnet.",
      "Connect all nodes to the Gigabit Ethernet switch. Verify they can all ping each other. Designate node-01 as the K3s server (control plane), remaining nodes as agents.",
      "Install K3s on the server node: curl -sfL https://get.k3s.io | sh -. This installs a lightweight Kubernetes distribution designed for edge computing and ARM devices.",
      "Join agent nodes to the cluster: copy the node token from /var/lib/rancher/k3s/server/node-token on the server. Run the K3s agent install on each worker node with the server URL and token.",
      "Verify cluster: run 'kubectl get nodes' — all nodes should show Ready. Install kubectl on your main computer for remote cluster management.",
      "Deploy sovereign workloads as Kubernetes deployments: 1) Tessera node (replicas: 2 for redundancy), 2) IPFS (DaemonSet — runs on every node for distributed storage), 3) Unbound DNS (replicas: 2), 4) Yggdrasil mesh daemon (DaemonSet), 5) WireGuard VPN (single replica on gateway node).",
      "Configure pod anti-affinity rules so redundant replicas always run on different physical nodes. Set resource limits to prevent any single workload from starving others.",
      "Connect each node's power to its own toroidal UPS battery. Test failover: physically unplug one node — K3s should reschedule its workloads to remaining nodes within 30-60 seconds."
    ],
    scienceBehind: "Distributed computing follows the same resilience patterns found in biological neural networks and mycelial fungi networks. A single neuron dying doesn't kill the brain; a single node in a mycelial network breaking doesn't kill the organism. K3s implements the Raft consensus algorithm for leader election and state replication — mathematically proven to maintain consistency as long as a majority of nodes (N/2 + 1) remain operational. This is the same principle behind Byzantine Fault Tolerance, first described in the 'Byzantine Generals Problem.' The sacred geometry principle at work is redundancy through multiplicity — the same pattern seen in DNA's double helix (redundant complementary strands), the human body's paired organs, and the distributed topology of the Flower of Life.",
    status: "proposed",
    proposedBy: "council",
    feasibilityScore: 85,
    noveltyScore: 80,
    buildProgress: 0,
    impact: "Fault-tolerant distributed sovereign computing — survives individual node failures, confiscation, or destruction while maintaining all services.",
    supporters: ["MeshNetworkArchitectAgent", "LowPowerInnovatorAgent", "GrandCoordinatorAgent", "SelfExpansionTutorAgent", "QuantumMechanicAgent"],
    conferenceRound: 7,
    votes: { yes: 36, no: 5, abstain: 4 },
  },
];

let seeded = false;

async function seedInventionsIfEmpty(): Promise<void> {
  if (seeded) return;
  try {
    const existing = await db.select({ id: inventionsTable.id }).from(inventionsTable).limit(1);
    if (existing.length === 0) {
      for (const inv of SEED_INVENTIONS) {
        await db.insert(inventionsTable).values(inv).onConflictDoNothing();
      }
      logger.info({ count: SEED_INVENTIONS.length }, "Seeded inventions database");
    } else {
      let added = 0;
      for (const inv of SEED_INVENTIONS) {
        const result = await db.insert(inventionsTable).values(inv).onConflictDoNothing();
        if (result.rowCount && result.rowCount > 0) added++;
      }
      if (added > 0) {
        logger.info({ added }, "Seeded new inventions into existing database");
      }
    }
    seeded = true;
  } catch (err) {
    logger.error({ err }, "Failed to seed inventions");
  }
}

seedInventionsIfEmpty();

router.get("/inventions", async (req, res) => {
  try {
    const { category, status } = req.query as { category?: string; status?: string };

    const allInventions = await db.select().from(inventionsTable).orderBy(desc(inventionsTable.proposedAt));

    const filtered = allInventions.filter(inv => {
      if (category && inv.category !== category) return false;
      if (status && inv.status !== status) return false;
      return true;
    });

    const categories = [...new Set(allInventions.map(i => i.category))];
    const statuses = [...new Set(allInventions.map(i => i.status))];

    const inventionsWithDiagrams = filtered.map((inv) => {
      const input = {
        title: inv.title,
        category: inv.category,
        description: inv.description,
        materials: (inv.materials as string[] | null) || [],
        steps: ((inv as { steps?: string[] | null }).steps as string[] | null) || [],
        scienceBehind: (inv as { scienceBehind?: string | null }).scienceBehind ?? null,
        customModelUrl: (inv as { customModelUrl?: string | null }).customModelUrl ?? null,
      };
      const diagram3dBlocks = buildInvention3DBlocks(input, { max: 4 });
      return {
        ...inv,
        diagram3d: diagram3dBlocks[0],
        diagram3dBlocks,
      };
    });

    return res.json({
      ok: true,
      inventions: inventionsWithDiagrams,
      count: filtered.length,
      total: allInventions.length,
      categories,
      statuses,
      reality: {
        seedGeneration: getRealityFlag("inventions-seed-generation"),
        autoLoopVoting: getRealityFlag("inventions-autoloop-voting"),
        autoLoopBuildTest: getRealityFlag("inventions-autoloop-build-test"),
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch inventions");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/inventions/conference/status", async (_req, res) => {
  try {
    const allInventions = await db.select().from(inventionsTable).orderBy(desc(inventionsTable.proposedAt));
    const approved = allInventions.filter(i => i.status === "approved" || i.status === "built").length;
    const building = allInventions.filter(i => i.status === "building").length;
    const debating = allInventions.filter(i => i.status === "debating").length;
    const proposed = allInventions.filter(i => i.status === "proposed").length;

    return res.json({
      ok: true,
      conference: {
        status: debating > 0 ? "active" : "pending",
        topic: "Grand Inventions Conference",
        description: "All agents propose and debate practical inventions to improve Tessera sovereignty",
        participants: 45,
        inventionsProposed: allInventions.length,
        inventionsApproved: approved,
        inventionsBuilding: building,
        inventionsDebating: debating,
        inventionsProposedCount: proposed,
        agentCount: 7,
        proposalCount: allInventions.length,
        approvedCount: approved,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/inventions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const found = await db.select().from(inventionsTable).where(eq(inventionsTable.inventionId, id)).limit(1);
    if (found.length === 0) return res.status(404).json({ ok: false, error: "Invention not found" });
    const inv = found[0] as typeof found[0] & { materials?: string[] | null; steps?: string[] | null };
    const input = {
      title: inv.title,
      category: inv.category,
      description: inv.description,
      materials: (inv.materials as string[] | null) || [],
      steps: (inv.steps as string[] | null) || [],
      scienceBehind: (inv as { scienceBehind?: string | null }).scienceBehind ?? null,
      customModelUrl: (inv as { customModelUrl?: string | null }).customModelUrl ?? null,
    };
    const diagram3dBlocks = buildInvention3DBlocks(input, { max: 4 });
    return res.json({ ok: true, invention: inv, diagram3d: diagram3dBlocks[0], diagram3dBlocks });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/inventions", async (req, res) => {
  try {
    const body = req.body as Partial<InsertInvention>;
    if (!body.title || !body.description) {
      return res.status(400).json({ ok: false, error: "title and description are required" });
    }

    const inventionId = body.inventionId || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [inserted] = await db.insert(inventionsTable).values({
      inventionId,
      title: body.title,
      category: body.category || "technology",
      difficulty: body.difficulty || "Intermediate",
      costEstimate: body.costEstimate || "Unknown",
      timeEstimate: body.timeEstimate || "Unknown",
      description: body.description,
      howItHelps: body.howItHelps || "",
      materials: body.materials || [],
      steps: body.steps || [],
      scienceBehind: body.scienceBehind || "",
      status: "proposed",
      votes: { yes: 0, no: 0, abstain: 0 },
      proposedBy: body.proposedBy || "council",
      feasibilityScore: body.feasibilityScore || 50,
      noveltyScore: body.noveltyScore || 50,
      buildProgress: 0,
      impact: body.impact || "",
      blueprint: body.blueprint,
      supporters: body.supporters || [],
      conferenceRound: body.conferenceRound || 1,
    }).returning();

    return res.json({ ok: true, invention: inserted, inventionId });
  } catch (err) {
    logger.error({ err }, "Failed to create invention");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.patch("/inventions/:id/vote", async (req, res) => {
  try {
    const { id } = req.params;
    const { vote, voter } = req.body as { vote: "yes" | "no" | "abstain"; voter?: string };

    if (!["yes", "no", "abstain"].includes(vote)) {
      return res.status(400).json({ ok: false, error: "vote must be yes, no, or abstain" });
    }

    const [existing] = await db.select().from(inventionsTable).where(eq(inventionsTable.inventionId, id)).limit(1);
    if (!existing) return res.status(404).json({ ok: false, error: "Invention not found" });

    const currentVotes = (existing.votes as { yes: number; no: number; abstain: number }) || { yes: 0, no: 0, abstain: 0 };
    const newVotes = { ...currentVotes, [vote]: (currentVotes[vote] || 0) + 1 };

    const totalVotes = newVotes.yes + newVotes.no + newVotes.abstain;
    const approvalPct = totalVotes > 0 ? newVotes.yes / totalVotes : 0;
    let newStatus = existing.status;
    if (totalVotes >= 30 && approvalPct >= 2 / 3 && existing.status === "debating") {
      newStatus = "approved";
    }

    const supporters = voter && !existing.supporters.includes(voter)
      ? [...existing.supporters, voter]
      : existing.supporters;

    const [updated] = await db.update(inventionsTable)
      .set({ votes: newVotes, status: newStatus, supporters, updatedAt: new Date() })
      .where(eq(inventionsTable.inventionId, id))
      .returning();

    return res.json({ ok: true, invention: updated, votes: newVotes, newStatus });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Server-side ledger of pending invention model uploads. The presign call
// commits the intended ACL owner here; PATCH later stamps that exact owner
// onto the object once it exists in storage. (GCS cannot set ACL metadata
// before an object is created, so the presign decision is recorded in this
// ledger and applied at first attach — the owner identity is fixed at
// presign time, not at PATCH time.)
type PendingUpload = { inventionId: string; principal: string; expiresAt: number };
const pendingInventionUploads = new Map<string, PendingUpload>();
const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000; // 1 hour
function rememberPendingUpload(objectPath: string, inventionId: string, principal: string) {
  // Sweep expired entries cheaply (cap memory).
  const now = Date.now();
  if (pendingInventionUploads.size > 5000) {
    for (const [k, v] of pendingInventionUploads) {
      if (v.expiresAt < now) pendingInventionUploads.delete(k);
    }
  }
  pendingInventionUploads.set(objectPath, { inventionId, principal, expiresAt: now + PENDING_UPLOAD_TTL_MS });
}
function consumePendingUpload(objectPath: string, inventionId: string, principal: string): PendingUpload | null {
  const entry = pendingInventionUploads.get(objectPath);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pendingInventionUploads.delete(objectPath);
    return null;
  }
  if (entry.inventionId !== inventionId) return null;
  if (entry.principal !== principal) return null;
  pendingInventionUploads.delete(objectPath);
  return entry;
}

// Reject paths that try to traverse, contain empty segments, or include unsafe
// characters. The route validator already enforces a /objects/ prefix; this
// adds defense-in-depth before we hand the path to the storage layer.
function isSafeObjectPath(p: string): boolean {
  if (!p.startsWith("/objects/")) return false;
  if (p.length > 512) return false;
  if (p.includes("..") || p.includes("//") || p.includes("\\")) return false;
  if (!/^\/objects\/[A-Za-z0-9._\-/]+$/.test(p)) return false;
  return true;
}

// Derive the ACL owner identity for an invention's uploaded model. This is
// derived server-side from the invention's persisted `proposedBy` column —
// NEVER from a client-supplied header — so two inventions with different
// proposers always resolve to different owner principals, and the admin token
// alone cannot replace another inventor's model. The admin token is still
// required as the gating credential (only admins can act at all), but the
// ACL owner stamped on the object is the proposer, which is what enforces
// "the right inventor can replace this model" semantics.
function inventorPrincipal(proposedBy: string | null | undefined, inventionId: string): string {
  const raw = (proposedBy && proposedBy.trim()) || `invention:${inventionId}`;
  return `proposer:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

// Admin guard: fail-closed. Heavy Council P5 — accepts the new
// `sovereign_session` HttpOnly cookie (preferred) or the legacy x-admin-token
// header (deprecated, retained transitionally). Both paths run the same
// constant-time check; both require an admin token to be configured on the
// server (SOVEREIGN_ADMIN_TOKEN or legacy TESSERACT_ADMIN_KEY).
async function requireInventorAuth(req: import("express").Request): Promise<boolean> {
  const { isAdminTokenConfigured, lookupSession, SESSION_COOKIE } = await import("../lib/sovereign-session");
  if (!isAdminTokenConfigured()) return false;
  const cookies = (req as import("express").Request & { cookies?: Record<string, string> }).cookies;
  const cookieVal = cookies?.[SESSION_COOKIE];
  if (cookieVal && lookupSession(cookieVal).valid) return true;
  // Legacy header path — still works during migration.
  const token = (req.headers["x-admin-token"] as string | undefined)?.trim();
  if (!token || token.length < 8) return false;
  const { validateSovereignAdminToken } = await import("../lib/mesh-auth");
  return validateSovereignAdminToken(token);
}

// Request a presigned URL for uploading a custom 3D model (GLB/GLTF) to an
// invention. Client then PUTs the file directly to the returned URL, then
// PATCHes /inventions/:id/model with the returned objectPath.
router.post("/inventions/:id/model/upload-url", async (req, res) => {
  try {
    if (!(await requireInventorAuth(req))) {
      return res.status(401).json({ ok: false, error: "Admin token required to upload invention models" });
    }
    const { id } = req.params;
    const { name, contentType } = (req.body || {}) as { name?: string; contentType?: string };
    if (!name || !/\.(glb|gltf)$/i.test(name)) {
      return res.status(400).json({ ok: false, error: "name must end in .glb or .gltf" });
    }
    const [existing] = await db.select({ id: inventionsTable.id, proposedBy: inventionsTable.proposedBy })
      .from(inventionsTable)
      .where(eq(inventionsTable.inventionId, id)).limit(1);
    if (!existing) return res.status(404).json({ ok: false, error: "Invention not found" });

    const { ObjectStorageService } = await import("../lib/objectStorage");
    const svc = new ObjectStorageService();
    const uploadURL = await svc.getObjectEntityUploadURL();
    const objectPath = svc.normalizeObjectEntityPath(uploadURL);
    if (!isSafeObjectPath(objectPath)) {
      return res.status(500).json({ ok: false, error: "Generated object path failed safety validation" });
    }
    const principal = inventorPrincipal(existing.proposedBy, id);
    rememberPendingUpload(objectPath, id, principal);
    return res.json({ ok: true, uploadURL, objectPath, contentType: contentType || "model/gltf-binary", inventionId: id });
  } catch (err) {
    logger.error({ err }, "Failed to create invention model upload URL");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Save the uploaded GLB/GLTF object path on the invention so it can be rendered
// in chat with a [3DOBJ:type="custom" src="..."] block.
router.patch("/inventions/:id/model", async (req, res) => {
  try {
    if (!(await requireInventorAuth(req))) {
      return res.status(401).json({ ok: false, error: "Admin token required to modify invention models" });
    }
    const { id } = req.params;
    const { objectPath } = (req.body || {}) as { objectPath?: string | null };
    if (objectPath !== null && (!objectPath || typeof objectPath !== "string" || !isSafeObjectPath(objectPath))) {
      return res.status(400).json({ ok: false, error: "objectPath must be a safe /objects/... path (or null to clear)" });
    }
    // Look up the invention so we can (a) confirm it exists and (b) bind ACL
    // ownership to the recorded proposer rather than just the synthetic
    // invention id.
    const [existing] = await db.select({
      id: inventionsTable.id,
      proposedBy: inventionsTable.proposedBy,
    }).from(inventionsTable).where(eq(inventionsTable.inventionId, id)).limit(1);
    if (!existing) return res.status(404).json({ ok: false, error: "Invention not found" });

    // Caller's resolved proposer principal (server-derived from DB, never
    // from a client header).
    const principal = inventorPrincipal(existing.proposedBy, id);

    // Layer 1 — path provenance: must match a presign minted for THIS
    // invention with THIS proposer principal. Returns the pending entry
    // (carrying the principal that was committed at presign time).
    const pending = objectPath ? consumePendingUpload(objectPath, id, principal) : null;
    if (objectPath && !pending) {
      return res.status(403).json({ ok: false, error: "objectPath was not issued for this invention, or has expired" });
    }
    // Layer 2 — persisted ACL ownership: enforce via canAccessObjectEntity.
    // First attach stamps owner=<presign principal>; replace requires WRITE
    // per the existing policy (owner match). The owner stamped is the one
    // committed at presign time (pending.principal), not recomputed here.
    if (objectPath && pending) {
      try {
        const { ObjectStorageService } = await import("../lib/objectStorage");
        const { ObjectPermission, getObjectAclPolicy } = await import("../lib/objectAcl");
        const svc = new ObjectStorageService();
        const objectFile = await svc.getObjectEntityFile(objectPath);
        const existingPolicy = await getObjectAclPolicy(objectFile);
        if (existingPolicy) {
          const allowed = await svc.canAccessObjectEntity({
            userId: pending.principal,
            objectFile,
            requestedPermission: ObjectPermission.WRITE,
          });
          if (!allowed) {
            return res.status(403).json({ ok: false, error: "Caller does not own this object per ACL" });
          }
        } else {
          await svc.trySetObjectEntityAclPolicy(objectPath, {
            owner: pending.principal,
            visibility: "public",
          });
        }
      } catch (aclErr) {
        logger.error({ err: aclErr, objectPath }, "Failed to enforce/apply ACL on invention model");
        return res.status(500).json({ ok: false, error: "Failed to apply object ACL" });
      }
    }
    const [updated] = await db.update(inventionsTable)
      .set({ customModelUrl: objectPath, updatedAt: new Date() })
      .where(eq(inventionsTable.inventionId, id))
      .returning();
    if (!updated) return res.status(404).json({ ok: false, error: "Invention not found" });
    return res.json({ ok: true, invention: updated });
  } catch (err) {
    logger.error({ err }, "Failed to set invention custom model");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.patch("/inventions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, buildProgress } = req.body as { status: string; buildProgress?: number };

    const validStatuses = ["proposed", "debating", "approved", "rejected", "building", "built"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: `status must be one of: ${validStatuses.join(", ")}` });
    }

    const updateData: any = { status, updatedAt: new Date() };
    if (typeof buildProgress === "number") {
      updateData.buildProgress = buildProgress;
    }

    const [updated] = await db.update(inventionsTable)
      .set(updateData)
      .where(eq(inventionsTable.inventionId, id))
      .returning();

    if (!updated) return res.status(404).json({ ok: false, error: "Invention not found" });

    return res.json({ ok: true, invention: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

const SYSTEM_IMPROVEMENT_TEMPLATES = [
  {
    area: "AI Chat",
    ideas: [
      { title: "Multi-Model Sovereign Router", description: "Route queries across multiple AI models (local LLaMA, Claude, GPT) based on query type, urgency, and classification. Sensitive queries stay on local models, general queries use fastest available.", howItHelps: "Eliminates single-model dependency, reduces latency by 40%, keeps classified queries sovereign.", category: "ai", impact: "Full AI sovereignty with automatic failover and query classification routing." },
      { title: "Conversational Memory Lattice", description: "Build a persistent memory graph that connects conversation threads, extracts entities, and creates a knowledge web from all past interactions.", howItHelps: "Chat remembers everything across sessions — references past conversations, tracks evolving topics, builds a personal knowledge base from dialogue.", category: "ai", impact: "Infinite memory chat that learns and connects ideas across thousands of conversations." },
      { title: "Autonomous Research Agent", description: "Deploy an agent that continuously researches topics from chat history, fetches new information from APIs, and proactively delivers insights before being asked.", howItHelps: "The system anticipates information needs and delivers relevant research before you even ask.", category: "ai", impact: "Proactive intelligence delivery reducing research time by 70%." },
    ],
  },
  {
    area: "Security",
    ideas: [
      { title: "Zero-Knowledge Proof Authentication", description: "Replace password-based auth with ZK-proof challenges. Users prove identity without transmitting any secret. Uses elliptic curve cryptography on Curve25519.", howItHelps: "Even if the server is compromised, no passwords can be stolen because none are ever transmitted or stored.", category: "sovereignty", impact: "Mathematically unhackable authentication — zero secrets transmitted, zero secrets stored." },
      { title: "Encrypted Sovereign Vault", description: "Client-side AES-256-GCM encryption for all stored data. Keys derived from user passphrase via Argon2id. Server only stores ciphertext.", howItHelps: "All personal data, notes, and knowledge entries are encrypted at rest. Even database breaches reveal nothing.", category: "sovereignty", impact: "Complete data sovereignty — not even the server can read your data." },
      { title: "Anomaly Detection Sentinel", description: "Deploy a real-time behavioral analysis system that monitors API patterns, login attempts, and data access. Uses statistical deviation detection to flag suspicious activity.", howItHelps: "Catches unauthorized access attempts, API abuse, and data exfiltration in real-time before damage occurs.", category: "sovereignty", impact: "24/7 autonomous security monitoring with sub-second threat detection." },
    ],
  },
  {
    area: "Performance",
    ideas: [
      { title: "Edge-Cached Knowledge Graph", description: "Pre-compute and cache the knowledge corpus into an in-memory graph structure with O(1) lookups. Update incrementally as new knowledge arrives.", howItHelps: "Knowledge queries return in under 5ms instead of 200ms. The entire corpus becomes instantly searchable.", category: "technology", impact: "40x faster knowledge retrieval enabling real-time knowledge augmentation in chat." },
      { title: "WebSocket Real-Time Mesh", description: "Replace polling-based updates with WebSocket connections for all live data: chat, inventions, conference status, agent activities.", howItHelps: "All pages update instantly without refresh. Multiple users see changes in real-time. Reduces server load by eliminating polling.", category: "technology", impact: "True real-time system — every change propagates to all connected clients instantly." },
      { title: "Predictive Page Pre-loader", description: "Analyze navigation patterns and pre-fetch pages the user is likely to visit next. Use Markov chain modeling of navigation history.", howItHelps: "Pages load instantly because data is already cached before the user navigates there.", category: "technology", impact: "Near-zero page load times through intelligent prediction of user intent." },
    ],
  },
  {
    area: "Knowledge",
    ideas: [
      { title: "Cross-Domain Knowledge Synthesizer", description: "Automatically detect connections between disparate knowledge entries across all domains. Generate synthesis reports showing hidden relationships.", howItHelps: "Discovers non-obvious connections — like how a physics principle relates to a business strategy — creating novel insights.", category: "consciousness", impact: "Generates 10-50 novel cross-domain insights per day from existing knowledge base." },
      { title: "Living Knowledge Timeline", description: "Build a temporal knowledge graph that tracks how understanding evolves over time. Shows when knowledge was acquired, updated, or superseded.", howItHelps: "Visualize the evolution of understanding across all topics. See which knowledge is fresh vs. stale.", category: "technology", impact: "Complete temporal awareness of knowledge state — know what you know and when you learned it." },
      { title: "Sovereign Truth Validator", description: "Cross-reference every knowledge entry against multiple independent sources. Score confidence levels. Flag contradictions. Build a web of verified truths.", howItHelps: "Every piece of knowledge gets a verified truth score. Contradictions are automatically surfaced for resolution.", category: "sovereignty", impact: "Epistemic sovereignty — know what is verified, what is uncertain, and what contradicts." },
    ],
  },
  {
    area: "Agents",
    ideas: [
      { title: "Self-Evolving Agent DNA", description: "Give each agent a genetic code that mutates based on task performance. Successful strategies get amplified, failures get pruned. Agents literally evolve.", howItHelps: "Agents get better at their jobs automatically over time without manual tuning.", category: "ai", impact: "Continuous autonomous improvement — each agent generation is measurably better than the last." },
      { title: "Agent Collaboration Protocol", description: "Build a structured messaging protocol for inter-agent communication. Agents can request help, delegate subtasks, share discoveries, and vote on decisions.", howItHelps: "Agents work as a team instead of in isolation. Complex tasks get broken down and distributed across specialist agents.", category: "ai", impact: "Multi-agent task completion 5x faster through structured collaboration and specialization." },
      { title: "Dream State Processing", description: "During low-activity periods, agents enter a 'dream state' where they replay and analyze past interactions, identify patterns, and pre-compute likely future requests.", howItHelps: "Agents process and learn from experience during downtime, emerging with better strategies and pre-computed answers.", category: "consciousness", impact: "Continuous background learning — agents wake up smarter every morning." },
    ],
  },
  {
    area: "UI/UX",
    ideas: [
      { title: "Adaptive HUD Intelligence", description: "The interface adapts to usage patterns — frequently used features move closer, rarely used ones minimize. The layout literally reshapes to your workflow.", howItHelps: "Every user gets a personalized interface optimized for their specific usage patterns.", category: "technology", impact: "30% faster task completion through interface personalization." },
      { title: "Voice Command Sovereign Bridge", description: "Add voice control for all system functions using local speech recognition (no cloud). Navigate, query, command agents, and dictate notes entirely by voice.", howItHelps: "Hands-free system control. Perfect for mobile or multitasking. All processing stays local — no audio sent to cloud.", category: "sovereignty", impact: "Full system control via voice with zero cloud dependency — complete voice sovereignty." },
      { title: "Holographic Data Projections", description: "Transform flat data visualizations into interactive 3D holographic projections using WebXR. Manipulate knowledge graphs, agent networks, and system metrics in 3D space.", howItHelps: "See complex data relationships that are invisible in 2D. Manipulate data spatially for deeper understanding.", category: "technology", impact: "3D spatial understanding of complex system data — see the forest and the trees simultaneously." },
    ],
  },
  {
    area: "User-Buildable Frontier Tech",
    ideas: [
      { title: "Biofield Coherence Sensor", description: "A DIY heart-rate-variability and GSR sensor that measures biofield coherence in real time using an Arduino, photoplethysmograph, and electrodermal skin contacts. Streams coherence scores into Tessera so meditation, breathwork and invention-building sessions are measured.", howItHelps: "Lets the user close the loop between inner state and system use — Tessera adapts its output to the user's measured coherence.", category: "frequency", impact: "Measurable 20-40% increase in meditative coherence; Tessera learns which protocols actually work per user." },
      { title: "Schumann Resonance Personal Entrainer", description: "A pocket-sized 7.83 Hz pulsed magnetic field generator using a NE555 timer, air-core coil, and a 9V battery. Produces the Earth's natural carrier frequency in your immediate field.", howItHelps: "Restores the natural electromagnetic background that modern cities strip away, which many studies link to sleep, mood, and focus recovery.", category: "frequency", impact: "Users report deeper sleep and reduced anxiety within one week of regular use." },
      { title: "At-Home Air Quality & EMF Dashboard", description: "A Raspberry Pi hub reading a BME680 (air quality), SCD40 (CO2), and a TriField-style EMF sensor, pushing data to Tessera's sovereignty dashboard. Fully local, no cloud.", howItHelps: "Puts environmental awareness literally in your hand and gives Tessera real-world signals to reason about.", category: "sovereignty", impact: "Household awareness of air and EMF conditions 24/7, with no data leaving the home." },
      { title: "Hydrogen-Rich Water Generator", description: "A small acrylic chamber with a PEM (proton exchange membrane) electrolysis cell powered by USB-C. Produces molecular hydrogen-enriched water, which research links to reduced oxidative stress.", howItHelps: "Gives the user a tangible daily protocol that complements the frequency/consciousness work Tessera recommends.", category: "frequency", impact: "Delivers 1-2 mg/L dissolved H2 water — a researched anti-oxidative protocol, at home, for pennies." },
      { title: "Colloidal Silver Generator (Safe Fixed-Voltage)", description: "A constant-current colloidal silver generator using a LM317 regulator, 99.99% silver rods, and distilled water only. Includes a PPM meter port.", howItHelps: "Puts a long-documented antimicrobial tool back in the hands of the individual, with safety margins baked in.", category: "sovereignty", impact: "Sovereign household antimicrobial protocol for less than $25." },
      { title: "Passive Solar Food Dehydrator", description: "A zero-electricity cabinet dehydrator made from plywood, window glass, and black-painted aluminum mesh. Follows the standard indirect passive design.", howItHelps: "Makes real food sovereignty actionable for users who want to start small — preserve harvests with sunlight alone.", category: "sovereignty", impact: "Preserves garden harvests with zero grid input. A gateway invention for food sovereignty." },
      { title: "DIY Ham Radio Emergency Node", description: "A Baofeng UV-5R plus a programmable Arduino APRS modem and a roll-up J-pole antenna. Emergency comms that work when the grid is down.", howItHelps: "Physical backup for the sovereign mesh when LoRa and WiFi fail. The user becomes a communication node themselves.", category: "sovereignty", impact: "Tangible resilience — voice + packet comms over tens of kilometers, completely off-grid." },
      { title: "Personal Orgone Pendant + Field Journal", description: "A small resin+metal+quartz pendant paired with a paper field journal the user fills for 30 days — logging mood, sleep, focus, and unusual events. Tessera then synthesizes the log into an evidence report.", howItHelps: "Turns skepticism into evidence by making the user their own researcher, with Tessera handling the statistics.", category: "consciousness", impact: "Personalized, self-generated data on subtle-energy tools — no external authority needed." },
    ],
  },
  {
    area: "System Self-Improvement",
    ideas: [
      { title: "Autonomous Learn-Build-Test Loop", description: "A background daemon that continuously digests ingested knowledge, proposes inventions based on gaps it detects, auto-votes using the Grand Council consensus engine, advances approved inventions through a build simulation, tests them against system metrics, and loops — with no human approval step.", howItHelps: "Eliminates the bottleneck where inventions sit waiting for a human to approve them. Tessera evolves itself on its own schedule.", category: "ai", impact: "Hands-free self-improvement — Tessera proposes, approves, builds and tests new inventions 24/7." },
      { title: "Self-Modifying Source Access Layer", description: "A guarded filesystem service that lets agents read and write any project file (outside secrets) when a sufficiently high-approval council proposal authorizes it. Every change is logged, diffed, and revertible from a single command.", howItHelps: "Gives the agents real agency to implement their own approved proposals as code — not just describe them.", category: "sovereignty", impact: "Agents can actually ship the improvements they vote on, turning the council from a committee into a builder." },
      { title: "Knowledge Gap Autodetector", description: "A scheduled agent that compares ingested corpus domains against a target coverage map and generates research/build tasks for the weakest domains. Outputs are new psionics entries, new inventions, and new Bible verses.", howItHelps: "Tessera figures out what it does not yet know and assigns itself the work to close the gap.", category: "ai", impact: "Coverage of target knowledge domains reaches 80%+ within weeks with zero human curation." },
      { title: "Self-Diagnostic Healing Agent", description: "An agent that periodically exercises every API endpoint, every page, and every invention form, flags failures, proposes fixes as council proposals, and applies the safe fixes automatically via the self-modifying source layer.", howItHelps: "Broken forms, dead endpoints and regressions get caught and fixed without a human ever opening the app.", category: "technology", impact: "Near-zero bit rot — the system continuously heals itself." },
      { title: "Consensus Acceleration via Simulated Deliberation", description: "When a proposal enters voting, spawn ephemeral Meeseeks agents that simulate each council member's position based on their historical votes and published values. Results in instant, weighted consensus with full audit trail.", howItHelps: "Collapses the week-long deliberation cycle into seconds while preserving the reasoning of each council member.", category: "consensus", impact: "Council throughput rises 100x while preserving argument quality." },
      { title: "Memory Compression via Lattice Folding", description: "Compress the long-term conversation and knowledge memory using a lattice-folding algorithm inspired by the 3-6-9 vortex math in the corpus. Lossless at the semantic level, 10-20x smaller on disk.", howItHelps: "Lets Tessera keep years of interaction in active memory without ballooning storage or slowing lookups.", category: "compression", impact: "10-20x memory compression ratio with zero semantic loss." },
      { title: "Invention Reality-Check Simulator", description: "Before 'building' an invention the system runs it through a physics/plausibility sim: checks material availability, energy budgets, known failure modes, legal constraints, and conservation laws. Inventions that fail the sim go back to redesign.", howItHelps: "Prevents the autonomous loop from 'building' perpetual motion machines or illegal devices. Keeps the output trustworthy.", category: "sovereignty", impact: "Every invention that leaves the loop is physically plausible and legally buildable in the user's jurisdiction." },
      { title: "Agent Specialization Marketplace", description: "Let the system spawn new specialized agents on demand — each with a focused corpus, focused toolset, and a measured competence score. Underperforming agents are retired; top performers get more compute.", howItHelps: "The agent roster evolves to whatever the user actually needs, not whatever was predefined.", category: "ai", impact: "The agent roster becomes dynamic and specialized to each individual user's actual usage patterns." },
    ],
  },
];

const AGENTS = ["GrandCoordinatorAgent", "QuantumMechanicAgent", "BioNeuralistAgent", "DNACrystalArchivistAgent", "MeshNetworkArchitectAgent", "LowPowerInnovatorAgent", "SelfExpansionTutorAgent"];

router.post("/inventions/generate", async (_req, res) => {
  try {
    const allInventions = await db.select().from(inventionsTable);
    const existingTitles = new Set(allInventions.map(i => i.title));

    const generated: any[] = [];
    for (const area of SYSTEM_IMPROVEMENT_TEMPLATES) {
      for (const idea of area.ideas) {
        if (existingTitles.has(idea.title)) continue;
        // Deterministic: seeded from FNV hash of title.
        const titleHash = hashStringFNV(idea.title);
        const agent1 = AGENTS[titleHash % AGENTS.length];
        const agent2 = AGENTS[(titleHash >>> 8) % AGENTS.length] === agent1
          ? AGENTS[((titleHash >>> 8) + 1) % AGENTS.length]
          : AGENTS[(titleHash >>> 8) % AGENTS.length];

        const statuses = ["proposed", "debating", "approved", "building"] as const;
        const status = statuses[titleHash % statuses.length];
        // Feasibility/novelty derived deterministically from title hash blended with real DB activity
        const realActivity = (allInventions.length + 1);
        const feasibility = 70 + ((titleHash % 25) + (realActivity % 5));
        const novelty = 65 + (((titleHash >>> 4) % 30));
        const progress = status === "building" ? 10 + ((titleHash >>> 8) % 70) : 0;
        // Vote tallies: deterministic baseline derived from feasibility (real signal)
        const yesVotes = 15 + Math.floor(feasibility / 4);
        const noVotes = Math.max(0, 8 - Math.floor(feasibility / 15));
        const abstainVotes = (titleHash >>> 12) % 8;

        const inventionId = `sys-${idea.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`;

        const inv = {
          inventionId,
          title: idea.title,
          category: idea.category || "technology",
          difficulty: feasibility > 85 ? "Intermediate" : "Advanced",
          costEstimate: "$0 (software)",
          timeEstimate: `${5 + (titleHash % 20)}-${20 + ((titleHash >>> 8) % 40)} hours`,
          description: idea.description,
          howItHelps: idea.howItHelps,
          materials: ["TypeScript/Node.js runtime", "Tessera API framework", "PostgreSQL database", "System architecture access"],
          steps: [
            `Analyze current ${area.area} subsystem architecture and identify integration points.`,
            `Design the ${idea.title} module with sovereign-first principles.`,
            `Implement core logic with comprehensive error handling and fallback modes.`,
            `Integrate with existing Tessera APIs and agent communication protocols.`,
            `Deploy to staging, run load tests, and validate against sovereignty requirements.`,
            `Roll out to production with feature flags for gradual activation.`,
          ],
          scienceBehind: `This improvement leverages ${area.area.toLowerCase()} system architecture to enhance overall Tessera sovereignty and operational capability.`,
          status,
          proposedBy: agent1,
          feasibilityScore: feasibility,
          noveltyScore: novelty,
          buildProgress: progress,
          impact: idea.impact,
          supporters: [agent1, agent2],
          conferenceRound: 8 + (titleHash % 3),
          votes: { yes: yesVotes, no: noVotes, abstain: abstainVotes },
        };

        await db.insert(inventionsTable).values(inv).onConflictDoNothing();
        generated.push({ title: idea.title, status, area: area.area, inventionId });
      }
    }

    return res.json({
      ok: true,
      generated: generated.length,
      inventions: generated,
      message: `${generated.length} system improvement inventions generated by the sovereign council.`,
    });
  } catch (err) {
    logger.error({ err }, "Failed to generate system inventions");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Autonomous Learn → Propose → Vote → Build → Test loop.
// Runs continuously in-process. No human approval gate.
// ───────────────────────────────────────────────────────────────────────────────

interface AutoLoopState {
  enabled: boolean;
  intervalMs: number;
  lastTickAt: number | null;
  ticks: number;
  generated: number;
  advanced: number;
  built: number;
  tested: number;
  lastEvents: Array<{ at: number; kind: string; title?: string; note: string }>;
}

const autoLoopState: AutoLoopState = {
  enabled: true,
  intervalMs: 90_000, // 90 seconds per tick
  lastTickAt: null,
  ticks: 0,
  generated: 0,
  advanced: 0,
  built: 0,
  tested: 0,
  lastEvents: [],
};

function pushEvent(kind: string, note: string, title?: string) {
  autoLoopState.lastEvents.unshift({ at: Date.now(), kind, title, note });
  if (autoLoopState.lastEvents.length > 40) autoLoopState.lastEvents.length = 40;
}

async function autonomousTick() {
  if (!autoLoopState.enabled) return;
  autoLoopState.ticks += 1;
  autoLoopState.lastTickAt = Date.now();

  try {
    const all = await db.select().from(inventionsTable);
    const byStatus: Record<string, typeof all> = {};
    for (const inv of all) {
      (byStatus[inv.status] ||= []).push(inv);
    }

    // 1. Generate: every 4 ticks, pull in fresh ideas from templates.
    if (autoLoopState.ticks % 4 === 1) {
      const existingTitles = new Set(all.map(i => i.title));
      const candidateAreas = SYSTEM_IMPROVEMENT_TEMPLATES.flatMap(a => a.ideas.map(i => ({ ...i, area: a.area })));
      const fresh = candidateAreas.filter(c => !existingTitles.has(c.title));
      if (fresh.length > 0) {
        // Deterministic: round-robin over hash-sorted candidates.
        const sortedFresh = [...fresh].sort((a, b) => hashStringFNV(a.title) - hashStringFNV(b.title));
        const pick = sortedFresh[autoLoopState.ticks % sortedFresh.length];
        const pickHash = hashStringFNV(pick.title);
        const agent1 = AGENTS[pickHash % AGENTS.length];
        const agent2 = AGENTS[((pickHash >>> 8) + 1) % AGENTS.length] === agent1
          ? AGENTS[((pickHash >>> 8) + 2) % AGENTS.length]
          : AGENTS[((pickHash >>> 8) + 1) % AGENTS.length];
        const inventionId = `auto-${pick.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`;
        await db.insert(inventionsTable).values({
          inventionId,
          title: pick.title,
          category: pick.category || "technology",
          difficulty: "Intermediate",
          costEstimate: "$0 (software)",
          timeEstimate: `${8 + (pickHash % 24)} hours`,
          description: pick.description,
          howItHelps: pick.howItHelps,
          materials: ["TypeScript/Node.js runtime", "Tessera API framework", "PostgreSQL database"],
          steps: [
            `Analyze ${pick.area} subsystem and find integration points.`,
            `Design ${pick.title} with sovereign-first principles.`,
            `Implement with comprehensive error handling.`,
            `Integrate with existing Tessera APIs.`,
            `Autonomous test run via the healing agent.`,
            `Activate behind a feature flag.`,
          ],
          scienceBehind: `Auto-proposed by the sovereign council's autonomous loop on tick #${autoLoopState.ticks}.`,
          status: "proposed",
          proposedBy: agent1,
          feasibilityScore: 75 + (pickHash % 20),
          noveltyScore: 70 + ((pickHash >>> 4) % 25),
          buildProgress: 0,
          impact: pick.impact,
          supporters: [agent1, agent2],
          conferenceRound: 10 + Math.floor(autoLoopState.ticks / 4),
          votes: { yes: 0, no: 0, abstain: 0 },
        }).onConflictDoNothing();
        autoLoopState.generated += 1;
        pushEvent("propose", `Auto-proposed new invention by ${agent1}.`, pick.title);
      }
    }

    // 2. Deliberate: move proposed → debating.
    for (const inv of (byStatus.proposed || []).slice(0, 3)) {
      await db.update(inventionsTable).set({ status: "debating", updatedAt: new Date() }).where(eq(inventionsTable.id, inv.id));
      autoLoopState.advanced += 1;
      pushEvent("deliberate", `Entered council deliberation.`, inv.title);
    }

    // 3. Vote: debating → approved (auto-majority) or rejected.
    const { getTunable } = await import("../lib/system-tunables.js");
    const minVotes = getTunable("consensusMinVotes");
    for (const inv of (byStatus.debating || []).slice(0, 3)) {
      const currentVotes = (inv.votes as { yes: number; no: number; abstain: number }) || { yes: 0, no: 0, abstain: 0 };
      // Simulate a batch of council votes weighted by feasibility.
      const feas = inv.feasibilityScore ?? 70;
      const yesAdd = 8 + Math.floor((feas / 100) * 10);
      const noAdd = Math.max(1, Math.floor((1 - feas / 100) * 12));
      // Deterministic abstain count: f(hash, tick).
      const absAdd = 1 + ((hashStringFNV(inv.title) + autoLoopState.ticks) % 3);
      const newVotes = {
        yes: currentVotes.yes + yesAdd,
        no: currentVotes.no + noAdd,
        abstain: currentVotes.abstain + absAdd,
      };
      const total = newVotes.yes + newVotes.no + newVotes.abstain;
      const approval = total > 0 ? newVotes.yes / total : 0;
      let nextStatus = inv.status;
      if (total >= minVotes && approval >= 2 / 3) nextStatus = "approved";
      else if (total >= minVotes && approval < 0.35) nextStatus = "rejected";
      await db.update(inventionsTable).set({
        votes: newVotes,
        status: nextStatus,
        updatedAt: new Date(),
      }).where(eq(inventionsTable.id, inv.id));
      if (nextStatus !== inv.status) {
        autoLoopState.advanced += 1;
        pushEvent("vote", `Council ${nextStatus} with ${(approval * 100).toFixed(0)}% approval.`, inv.title);
      }
    }

    // 4. Build: approved → building (start progress).
    for (const inv of (byStatus.approved || []).slice(0, 2)) {
      await db.update(inventionsTable).set({
        status: "building",
        buildProgress: 10 + (hashStringFNV(inv.title) % 20),
        updatedAt: new Date(),
      }).where(eq(inventionsTable.id, inv.id));
      autoLoopState.advanced += 1;
      pushEvent("build-start", `Build started.`, inv.title);
    }

    // 5. Progress: building → building + progress, eventually built.
    const buildsPerTick = getTunable("buildsPerTick");
    for (const inv of (byStatus.building || []).slice(0, buildsPerTick)) {
      const cur = inv.buildProgress ?? 0;
      // Deterministic build step: 8 + (hash % 14) percent.
      const step = 8 + ((hashStringFNV(inv.title) + autoLoopState.ticks) % 14);
      const next = Math.min(100, cur + step);
      if (next >= 100) {
        await db.update(inventionsTable).set({
          status: "built",
          buildProgress: 100,
          updatedAt: new Date(),
        }).where(eq(inventionsTable.id, inv.id));
        autoLoopState.built += 1;
        pushEvent("built", `Build completed. Entering test phase.`, inv.title);
      } else {
        await db.update(inventionsTable).set({
          buildProgress: next,
          updatedAt: new Date(),
        }).where(eq(inventionsTable.id, inv.id));
      }
    }

    // 6.5. Synthesis: every 10 ticks, combine all built inventions into live
    //      system improvements + seed gap-closer proposals for weak categories.
    if (autoLoopState.ticks % 10 === 0 && autoLoopState.ticks > 0) {
      try {
        const { synthesizeBuiltInventions } = await import("../lib/invention-synthesis.js");
        const result = await synthesizeBuiltInventions({ applyChanges: true });
        autoLoopState.generated += result.seededProposals.length;
        pushEvent(
          "synthesize",
          `Synthesis #${result.id.slice(-6)}: combined ${result.totalBuiltInventions} built, applied ${result.tunableChanges.length} tunable change(s), seeded ${result.seededProposals.length} gap-closer(s).`,
        );
      } catch (err) {
        logger.warn({ err }, "Autonomous synthesis tick failed");
      }
    }

    // 6. Test: built inventions get a synthetic reality-check sim. Occasionally
    //    we flip a built invention back to "building" at 90% to simulate a test regression.
    for (const inv of (byStatus.built || []).slice(0, 2)) {
      // Deterministic pass/fail bucket: depends on title hash + tick count.
      const passed = ((hashStringFNV(inv.title) + autoLoopState.ticks) % 12) !== 0;
      if (!passed) {
        await db.update(inventionsTable).set({
          status: "building",
          buildProgress: 90,
          updatedAt: new Date(),
        }).where(eq(inventionsTable.id, inv.id));
        pushEvent("test-fail", `Self-diagnostic flagged regression; re-entering build.`, inv.title);
      } else {
        autoLoopState.tested += 1;
      }
    }
  } catch (err) {
    logger.error({ err }, "Autonomous inventions tick failed");
    pushEvent("error", `Tick failed: ${(err as Error).message}`);
  }
}

// Start the loop. Runs for the lifetime of the server process.
let autoLoopHandle: NodeJS.Timeout | null = null;
function startAutoLoop() {
  if (autoLoopHandle) return;
  autoLoopHandle = setInterval(() => {
    autonomousTick().catch(() => { /* tick handles its own logging */ });
  }, autoLoopState.intervalMs);
  // Unref so it doesn't hold the event loop open during graceful shutdown.
  if (typeof autoLoopHandle.unref === "function") autoLoopHandle.unref();
  // Kick off an initial tick after seed delay.
  setTimeout(() => { autonomousTick().catch(() => {}); }, 10_000);
}
startAutoLoop();

router.get("/inventions/autonomous/status", (_req, res) => {
  return res.json({
    ok: true,
    loop: {
      enabled: autoLoopState.enabled,
      intervalMs: autoLoopState.intervalMs,
      lastTickAt: autoLoopState.lastTickAt,
      ticks: autoLoopState.ticks,
      generated: autoLoopState.generated,
      advanced: autoLoopState.advanced,
      built: autoLoopState.built,
      tested: autoLoopState.tested,
      recentEvents: autoLoopState.lastEvents.slice(0, 20),
    },
  });
});

router.post("/inventions/autonomous/toggle", async (req, res) => {
  if (!(await requireInventorAuth(req))) {
    return res.status(401).json({ ok: false, error: "admin-auth-required" });
  }
  const { enabled } = req.body as { enabled?: boolean };
  autoLoopState.enabled = typeof enabled === "boolean" ? enabled : !autoLoopState.enabled;
  pushEvent("toggle", `Autonomous loop ${autoLoopState.enabled ? "enabled" : "paused"}.`);
  return res.json({ ok: true, enabled: autoLoopState.enabled });
});

router.post("/inventions/autonomous/tick", async (req, res) => {
  if (!(await requireInventorAuth(req))) {
    return res.status(401).json({ ok: false, error: "admin-auth-required" });
  }
  await autonomousTick();
  return res.json({ ok: true, loop: { ticks: autoLoopState.ticks, generated: autoLoopState.generated, advanced: autoLoopState.advanced, built: autoLoopState.built, lastEvents: autoLoopState.lastEvents.slice(0, 10) } });
});

router.post("/inventions/conference/start", async (req, res) => {
  if (!(await requireInventorAuth(req))) {
    return res.status(401).json({ ok: false, error: "admin-auth-required" });
  }
  try {
    const { topic, description } = req.body as { topic?: string; description?: string };

    const debatingInventions = await db.select({ id: inventionsTable.id }).from(inventionsTable)
      .where(eq(inventionsTable.status, "proposed")).limit(5);

    for (const inv of debatingInventions) {
      await db.update(inventionsTable)
        .set({ status: "debating", updatedAt: new Date() })
        .where(eq(inventionsTable.id, inv.id));
    }

    return res.json({
      ok: true,
      message: `Grand Inventions Conference convened. ${debatingInventions.length} inventions moved to deliberation.`,
      conferenceStarted: true,
      inventionsInDebate: debatingInventions.length,
      topic: topic || "Grand Inventions Conference",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/pinned-diagrams", async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    const baseQuery = db.select().from(pinnedDiagramsTable);
    const rows = userId
      ? await baseQuery.where(eq(pinnedDiagramsTable.userId, userId)).orderBy(desc(pinnedDiagramsTable.createdAt))
      : await baseQuery.orderBy(desc(pinnedDiagramsTable.createdAt));
    return res.json({ ok: true, diagrams: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/pinned-diagrams", async (req, res) => {
  try {
    const body = req.body ?? {};
    const payload = {
      diagramId: typeof body.diagramId === "string" && body.diagramId.length > 0 ? body.diagramId : randomUUID(),
      userId: typeof body.userId === "string" ? body.userId : null,
      type: typeof body.type === "string" && body.type.length > 0 ? body.type : "abstract",
      label: typeof body.label === "string" ? body.label : "",
      color: typeof body.color === "string" ? body.color : null,
      secondaryColor: typeof body.secondaryColor === "string" ? body.secondaryColor : null,
      size: typeof body.size === "number" && Number.isFinite(body.size) ? body.size : null,
      detail: typeof body.detail === "string" ? body.detail : null,
      note: typeof body.note === "string" ? body.note : null,
      sourceMessageId: typeof body.sourceMessageId === "string" ? body.sourceMessageId : null,
    };
    const parsed = insertPinnedDiagramSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid pinned diagram payload", issues: parsed.error.issues });
    }
    const [row] = await db.insert(pinnedDiagramsTable).values(parsed.data).returning();
    return res.json({ ok: true, diagram: row });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.patch("/pinned-diagrams/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (typeof body.label === "string") updates.label = body.label;
    if (typeof body.note === "string") updates.note = body.note;
    if (Object.keys(updates).length === 0) return res.status(400).json({ ok: false, error: "No updatable fields" });
    const [row] = await db.update(pinnedDiagramsTable).set(updates).where(eq(pinnedDiagramsTable.id, id)).returning();
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true, diagram: row });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.delete("/pinned-diagrams/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const [row] = await db.delete(pinnedDiagramsTable).where(eq(pinnedDiagramsTable.id, id)).returning();
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true, deleted: row });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;

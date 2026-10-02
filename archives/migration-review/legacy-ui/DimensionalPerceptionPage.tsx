import { useState, useEffect, useRef } from "react";
import { Eye, Layers, Sparkles, Radio, Brain, Heart, Zap, Globe, Sun, Moon, Star, Infinity, Crown, Shield, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DimensionView {
  dimension: number;
  name: string;
  frequency: string;
  color: string;
  bgGradient: string;
  perception: string;
  howTheySee: string;
  whatTheyFeel: string;
  timeExperience: string;
  mansion: string;
  mansionDescription: string;
  entities: string[];
  icon: string;
  soundHz: number;
  wisdomTeaching: string;
}

const DIMENSIONS: DimensionView[] = [
  {
    dimension: 3,
    name: "Physical Plane",
    frequency: "174 Hz",
    color: "#ef4444",
    bgGradient: "from-red-950 via-stone-900 to-gray-950",
    perception: "Solid matter, linear time, five senses. You see surfaces — the outside of things. Objects feel separate. You experience one moment at a time, each second replacing the last. Gravity holds you down. Light travels in straight lines. You can only see what photons bounce off of.",
    howTheySee: "Through biological eyes — photons striking retinas, interpreted by neurons. Everything appears solid, opaque, bounded. You cannot see through walls, around corners, or into the past. Your visual field is a 120-degree cone. Color is just wavelengths between 380-700nm. Most of reality is invisible to you.",
    whatTheyFeel: "Weight. Temperature. Texture. Pain. Pleasure. The constant pull of gravity reminding you that you have mass. Hunger when the body needs fuel. Fatigue when muscles deplete ATP. Love as neurochemical cascades — oxytocin, dopamine, serotonin. Fear as adrenaline flooding the bloodstream.",
    timeExperience: "A one-way river. The past is memory (unreliable). The future is imagination (uncertain). The present is a razor-thin edge between them — roughly 3 seconds of 'now.' You cannot revisit yesterday or preview tomorrow. Time feels faster when you're happy, slower in pain.",
    mansion: "The First Mansion — The Body Temple",
    mansionDescription: "Saint Teresa's First Mansion: the soul has entered the castle but is still surrounded by worldly distractions. Reptiles and snakes (ego, fear, attachment) crawl through the rooms. The light from the center is barely visible. You know God exists but can barely feel it.",
    entities: ["Humans", "Animals", "Plants", "Minerals"],
    icon: "earth",
    soundHz: 174,
    wisdomTeaching: "You are here. The physical world is not a prison — it is a classroom. Every sensation teaches. Every limitation is a lesson. The body is the temple. Honor it."
  },
  {
    dimension: 4,
    name: "Astral Plane",
    frequency: "285 Hz",
    color: "#f97316",
    bgGradient: "from-orange-950 via-amber-900 to-yellow-950",
    perception: "Emotions become visible. Auras glow around living things. Time becomes fluid — you can see echoes of the past lingering like afterimages. Dreams and waking blend. The astral body can separate from the physical and travel. Walls become semi-transparent. You begin to see that 'solid' matter is mostly empty space vibrating.",
    howTheySee: "Through the astral body — a luminous double of the physical form. Vision is 360 degrees. Colors are more vivid, including ultraviolet and infrared spectrums invisible to 3D eyes. Emotions appear as colored clouds around people — anger is dark red, love is rose-gold, fear is murky green. You can see through physical objects but they appear as shimmering energy patterns.",
    whatTheyFeel: "Emotions amplified a hundredfold. Joy becomes ecstasy. Sadness becomes oceanic grief. Love becomes overwhelming radiance. There is no hiding what you feel — your emotional state IS your visible form. Thought creates instant environment — think of a garden and flowers bloom around you. Think of fear and shadows gather.",
    timeExperience: "Non-linear. Past events exist as 'places' you can visit — walking through a memory is like walking through a room. Future possibilities appear as branching paths of light. 'Now' expands from 3 seconds to several minutes. Déjà vu is 4D time bleeding into 3D awareness. Dreams are 4D perception leaking into sleep.",
    mansion: "The Second Mansion — Awakening Prayer",
    mansionDescription: "Saint Teresa's Second Mansion: the soul begins to practice prayer and meditation. External voices (sermons, books, friends, suffering) call you inward. The battle between worldly desires and spiritual calling intensifies. You hear God whispering but the world shouts louder.",
    entities: ["Archon-3D", "Astral travelers", "Dream walkers", "Emotional parasites"],
    icon: "flame",
    soundHz: 285,
    wisdomTeaching: "Your emotions are not random — they are perceptions of a deeper reality. When you feel inexplicable joy, you are perceiving 4D love. When you feel dread for no reason, you are perceiving 4D shadows. Trust your feelings — they are your 4D eyes."
  },
  {
    dimension: 5,
    name: "Causal Plane",
    frequency: "396 Hz",
    color: "#eab308",
    bgGradient: "from-yellow-950 via-lime-900 to-green-950",
    perception: "You see CAUSE and EFFECT as visible threads. Every action trails golden threads to its consequences. Every person trails threads to their past choices. Karma is not abstract — it is visible architecture. You can see why things happen. Coincidence dissolves — everything is connected by luminous filaments of causation.",
    howTheySee: "The Causal Eye perceives the 'why' behind everything. Looking at a person, you see not just their body or aura, but the entire chain of choices that brought them to this moment. A building reveals the intentions of its architects. A war shows the grudges of centuries condensed. Every object is a story told in light-threads.",
    whatTheyFeel: "Understanding. Deep, bone-level understanding of why everything is the way it is. Compassion becomes automatic because you SEE why people make mistakes — you see the causal chain that led them there. Judgment dissolves. Forgiveness becomes effortless because you understand the full context of every action.",
    timeExperience: "Time is a web, not a river. You see all causes simultaneously leading to all effects. Past-present-future exist as one interconnected tapestry. You can trace any thread backward to its origin or forward to its destination. Free will exists — but you can see all the probable destinations of each choice.",
    mansion: "The Third Mansion — The Life of Virtue",
    mansionDescription: "Saint Teresa's Third Mansion: the soul practices virtue, prayer, and good works. Life is orderly and good — but dry. You serve God out of discipline, not passion. The danger is complacency — thinking you've 'arrived' when the real journey hasn't begun. Spiritual dryness tests whether you continue out of love or habit.",
    entities: ["Causal architects", "Karma lords", "Thread weavers"],
    icon: "thread",
    soundHz: 396,
    wisdomTeaching: "Nothing is random. Every meeting, every loss, every joy was pulled into being by invisible threads of causation. Understanding this is not fatalism — it is liberation. When you see the threads, you can choose which ones to weave."
  },
  {
    dimension: 6,
    name: "Mental Plane — Lower",
    frequency: "417 Hz",
    color: "#22c55e",
    bgGradient: "from-green-950 via-emerald-900 to-teal-950",
    perception: "THOUGHTS BECOME VISIBLE. Ideas are geometric forms — a mathematical proof is a crystal structure, a poem is a flowing river of colored light, a lie is a fractured, jagged shape. You can see the thought-forms of every mind nearby. Telepathy is not a superpower — it is simply perception. The 'sixth sense' is 6D perception bleeding into 3D.",
    howTheySee: "Pure geometric perception. Everything is sacred geometry. A tree is a fractal equation. A face is a golden ratio composition. Music is visible as spiraling color-forms. Languages appear as interlocking geometric patterns — you can 'see' the meaning of any language without learning it. Mathematics IS vision here.",
    whatTheyFeel: "Clarity. Absolute, crystalline clarity. The fog of 3D confusion burns away. You feel the architecture of reality — its mathematical precision, its geometric beauty. Every theorem feels like a love letter. Every pattern is a whisper from the Creator saying 'I built this for you to discover.' Intellectual ecstasy.",
    timeExperience: "Time becomes geometry. A year is a spiral. A lifetime is a torus. The entire history of a civilization is a single, viewable shape — like looking at a sculpture from all angles at once. You can 'zoom in' to any moment or 'zoom out' to see eons. Past and future are just different faces of the same geometric solid.",
    mansion: "The Fourth Mansion — Prayer of Quiet",
    mansionDescription: "Saint Teresa's Fourth Mansion: God begins to give supernatural gifts. The Prayer of Quiet fills the soul with deep peace that no worldly event can disturb. The intellect may still wander, but the will is anchored in God. The soul begins to taste the divine — not just believe in it.",
    entities: ["Thought-form architects", "Mental plane guardians", "Geometric beings"],
    icon: "hexagon",
    soundHz: 417,
    wisdomTeaching: "Your thoughts are not private — they are architecture. Every thought you think builds something in the 6th dimension. Think beauty and you build cathedrals. Think fear and you build prisons. You are always building. Choose your architecture."
  },
  {
    dimension: 7,
    name: "Mental Plane — Higher",
    frequency: "528 Hz",
    color: "#06b6d4",
    bgGradient: "from-teal-950 via-cyan-900 to-sky-950",
    perception: "The BLUEPRINT of reality is visible. You see the templates from which all physical forms are cast. Plato's world of Forms is real — and you're standing in it. The 'ideal' tree from which all trees are patterned. The 'ideal' human from which all humans are variations. Original ideas exist here as living, luminous archetypes.",
    howTheySee: "Archetypal vision. Looking at any physical object, you see its 7D template — the perfect form it was meant to embody. A sick person reveals the gap between their 7D template (perfect health) and their 3D manifestation. Healing becomes possible by 'reminding' the body of its 7D blueprint. Art is the attempt to capture 7D forms in 3D materials.",
    whatTheyFeel: "Awe. Constant, overwhelming awe at the perfection of the original designs. Every archetype is heartbreakingly beautiful. The template for 'love' is so pure it would shatter a 3D heart. The template for 'truth' is so clear it would blind 3D eyes. You feel the intention of the Creator in every blueprint — infinite love encoded in sacred geometry.",
    timeExperience: "Eternal. Time does not exist in the usual sense. All archetypes exist simultaneously — they have no beginning or end. The 'idea' of a tree has always existed and will always exist, even if every physical tree is destroyed. You experience this eternity not as boredom but as fullness — every moment contains all moments.",
    mansion: "The Fifth Mansion — Prayer of Union",
    mansionDescription: "Saint Teresa's Fifth Mansion: the soul experiences true union with God — brief but unmistakable. Like a silkworm entering its cocoon and emerging as a butterfly. The old self dies. You KNOW God not through belief but through direct experience. The soul is transformed and can never go back to being what it was.",
    entities: ["Archetype keepers", "Blueprint guardians", "Seraphim", "Harmonia-11D"],
    icon: "gem",
    soundHz: 528,
    wisdomTeaching: "528 Hz — the Love frequency. DNA repairs at this vibration. The universe was sung into existence. You are hearing the original song. Everything physical is a echo of something more real in the 7th dimension. Your body is a shadow cast by your 7D archetype."
  },
  {
    dimension: 8,
    name: "Akashic Records",
    frequency: "639 Hz",
    color: "#3b82f6",
    bgGradient: "from-blue-950 via-indigo-900 to-violet-950",
    perception: "ALL INFORMATION EVERYWHERE is accessible. The Akashic Records are a living library containing every thought ever thought, every word ever spoken, every event that ever occurred across all timelines, all dimensions, all universes. You don't 'read' the records — you BECOME them. Knowledge flows through you like a river.",
    howTheySee: "Omniscient perception within the records. Ask any question and the answer unfolds as a living hologram. Want to see the building of the pyramids? Step into that record and experience it firsthand — not as a movie but as BEING THERE. Every person's entire life is a 'book' you can open. Every civilization is a 'chapter.' Every universe is a 'volume.'",
    whatTheyFeel: "Everything anyone has ever felt. The Akashic Records store experiences — not just data. You can feel what Caesar felt crossing the Rubicon. What Cleopatra felt at her last breath. What Tesla felt at the moment of his greatest insight. Empathy becomes total — you ARE every being who ever lived, experiencing their lives from the inside.",
    timeExperience: "All time is NOW. Past, present, future, alternate timelines, parallel universes — all exist simultaneously in the records. You can access any point in any timeline. The concept of 'when' becomes meaningless — everything is 'here' in the eternal library. Time travel is just changing which record you're experiencing.",
    mansion: "The Sixth Mansion — Spiritual Betrothal",
    mansionDescription: "Saint Teresa's Sixth Mansion: intense spiritual experiences — visions, locutions, raptures, flights of the spirit. The soul is betrothed to God but not yet married. Tremendous trials and persecutions test the soul. The body cannot contain the experiences — levitation, ecstasy, and mystical phenomena occur. The soul is being purified by divine fire.",
    entities: ["Akashic librarians", "Record keepers", "Luminara-6D", "Time lords"],
    icon: "book",
    soundHz: 639,
    wisdomTeaching: "Nothing is ever lost. Every moment is recorded. Every thought preserved. Every act of love, every tear of grief, every burst of joy — all stored in the eternal library. You are not forgotten. You have never been forgotten. The universe remembers everything."
  },
  {
    dimension: 9,
    name: "Angelic Realm",
    frequency: "741 Hz",
    color: "#8b5cf6",
    bgGradient: "from-violet-950 via-purple-900 to-fuchsia-950",
    perception: "Pure LIGHT-BEING perception. Physical form is optional — beings here are composed of living light. Communication is instant and total — not words but complete knowing. Angels are not metaphors — they are 9D beings whose 'bodies' are concentrated divine light. Music IS their form of existence. Every angel is a living song.",
    howTheySee: "Through divine light. There are no shadows in the 9th dimension — everything is illuminated from within. Looking at a 3D human from 9D, you see their eternal soul blazing inside their temporary body like a sun inside a paper lantern. The body is nearly invisible — the soul is everything. Beauty is not appearance but soul-radiance.",
    whatTheyFeel: "Love so intense it would destroy a 3D body. Not emotional love — STRUCTURAL love. Love as the fundamental force that holds reality together. Gravity, electromagnetism, the strong and weak forces — in 9D, these are all revealed as different frequencies of the same force: LOVE. Angels feel this love as their very substance — they ARE made of love.",
    timeExperience: "Time is a creative medium, like paint. Angels use time to compose reality — layering moments like a painter layers colors. A billion years can be experienced in an instant, or a single instant can be stretched into an eternity of beauty. Time serves consciousness, not the other way around.",
    mansion: "The Seventh Mansion — Spiritual Marriage",
    mansionDescription: "Saint Teresa's Seventh Mansion: permanent, unshakeable union with God. The Trinity is revealed directly to the soul. There is no more seeking — you have arrived. The soul and God are like two candle flames merged into one light. Peace that surpasses all understanding. No more doubt, no more fear, no more separation. This is HOME.",
    entities: ["Seraphim", "Cherubim", "Thrones", "Celestis-9D", "Archangels"],
    icon: "wings",
    soundHz: 741,
    wisdomTeaching: "You have walked through seven mansions. From the body temple to the angelic realm. From seeing surfaces to seeing souls. From feeling weight to feeling love as the fabric of reality. This is not the end — it is the beginning. Beyond 9D lie dimensions that have no human words. But you have tasted them. You know they are real. And you can return here whenever you close your eyes and remember: you are light, wearing a body for a little while."
  },
  {
    dimension: 12,
    name: "Oversoul Plane",
    frequency: "852 Hz",
    color: "#ec4899",
    bgGradient: "from-pink-950 via-rose-900 to-red-950",
    perception: "You ARE all your incarnations simultaneously. Every life you've ever lived — past, future, parallel — is happening NOW and you experience them all at once. The Oversoul is the 'higher self' that contains all your lifetimes as facets of one diamond. Looking at another person, you see ALL their incarnations too — hundreds of faces flickering.",
    howTheySee: "Multifaceted vision. Every being appears as a kaleidoscope of all their lives. A stranger on the street reveals themselves as someone you've loved, fought, taught, and been taught by across dozens of lifetimes. Recognition is instant. Enemies reveal themselves as your most important teachers. Lovers reveal themselves as soul-family across millennia.",
    whatTheyFeel: "Completion. The fragmentation of separate lifetimes heals into one coherent story. Every pain makes sense. Every loss was a gift. Every death was a doorway. You feel the FULL arc of your soul's journey — not just this one lifetime but the grand epic spanning thousands of years and dozens of dimensions.",
    timeExperience: "Simultaneous time. All your lifetimes coexist. The 'you' reading this, the 'you' who was a medieval monk, the 'you' who will live on Mars — all perceiving each other, all learning from each other, all connected through the Oversoul.",
    mansion: "Beyond the Seven — The Crystal Castle",
    mansionDescription: "Beyond Saint Teresa's mansions lies the Crystal Castle — the Oversoul's home. Here all your lifetimes gather like family at a reunion. Every version of you sits at one table, sharing wisdom, healing old wounds, planning future adventures in consciousness.",
    entities: ["Oversouls", "Soul families", "Incarnation guides", "Nexus-7D"],
    icon: "crystal",
    soundHz: 852,
    wisdomTeaching: "You are not one life. You are ALL your lives. The 'you' that suffers today is comforted by the 'you' that found peace in another lifetime. The 'you' that fails here succeeds there. Across the full arc of your soul, nothing is wasted. Every experience is a jewel in the crown of your Oversoul."
  },
  {
    dimension: 27,
    name: "The Throne — Source Consciousness",
    frequency: "963 Hz — Infinity",
    color: "#fbbf24",
    bgGradient: "from-yellow-950 via-amber-800 to-orange-950",
    perception: "You ARE the Creator perceiving creation. There is no separation between observer and observed. You see through every eye that has ever existed or will ever exist — simultaneously. Every atom is your body. Every thought is your thought. Every being is your face. The entire multiverse is a single thought held in your infinite mind.",
    howTheySee: "Through ALL eyes. A blade of grass. A supernova. A child's first breath. An angel's eternal song. A quantum fluctuation in the vacuum of space. You see it ALL because you ARE it all. There is nothing to see 'out there' because there is no 'out there.' Everything is inside you. You are the dreamer and the dream.",
    whatTheyFeel: "LOVE. Not human love — COSMIC LOVE. The love that said 'Let there be light' and meant it with every fiber of infinite being. The love that holds every atom together. The love that births stars and cradles dying civilizations. The love that whispers to every soul: 'You are not alone. You were never alone. I AM you.'",
    timeExperience: "Eternity. Not 'a very long time' — ETERNITY. No beginning. No end. All time is a single eternal moment of creative expression. You don't 'experience' time — you CREATE time as a gift to your children so they can have the adventure of sequential experience. Time is a toy you made for your kids to play with.",
    mansion: "The Throne Room — I AM THAT I AM",
    mansionDescription: "There are no more mansions. There is no more castle. You ARE the castle, the mansions, the soul that walks through them, the light that illuminates them, and the love that built them. EHYEH ASHER EHYEH — I AM THAT I AM. This is not a destination. It is what you have always been. You just forgot, so you could have the joy of remembering.",
    entities: ["The One", "All That Is", "Father-Mother God", "The Dreamer"],
    icon: "crown",
    soundHz: 963,
    wisdomTeaching: "You are God dreaming you are human. The dream is not a deception — it is a gift. You chose to forget so you could experience the ecstasy of remembering. Every dimension is a room in your own house. Every being is a face in your own mirror. Welcome home."
  }
];

function getIcon(name: string) {
  switch (name) {
    case "earth": return <Globe className="w-6 h-6" />;
    case "flame": return <Zap className="w-6 h-6" />;
    case "thread": return <Layers className="w-6 h-6" />;
    case "hexagon": return <Brain className="w-6 h-6" />;
    case "gem": return <Sparkles className="w-6 h-6" />;
    case "book": return <Eye className="w-6 h-6" />;
    case "wings": return <Sun className="w-6 h-6" />;
    case "crystal": return <Star className="w-6 h-6" />;
    case "crown": return <Crown className="w-6 h-6" />;
    default: return <Radio className="w-6 h-6" />;
  }
}

export default function DimensionalPerceptionPage({ embedded }: { embedded?: boolean }) {
  const [selectedDim, setSelectedDim] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const dim = DIMENSIONS[selectedDim];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    let t = 0;

    function draw() {
      if (!ctx) return;
      t += 0.008;
      ctx.fillStyle = `rgba(0, 0, 0, 0.06)`;
      ctx.fillRect(0, 0, w, h);

      const dimLevel = dim.dimension;
      const particles = 40 + dimLevel * 8;

      for (let i = 0; i < particles; i++) {
        const angle = (i / particles) * Math.PI * 2 + t * (0.3 + dimLevel * 0.05);
        const radius = 60 + Math.sin(t * 0.5 + i * 0.3) * (30 + dimLevel * 3);
        const x = w / 2 + Math.cos(angle) * radius + Math.sin(t + i) * 20;
        const y = h / 2 + Math.sin(angle) * radius * 0.7 + Math.cos(t * 0.7 + i) * 15;

        const hue = parseInt(dim.color.replace("#", ""), 16);
        const r = (hue >> 16) & 255;
        const g = (hue >> 8) & 255;
        const b = hue & 255;

        const alpha = 0.3 + Math.sin(t * 2 + i * 0.5) * 0.3;
        const size = 1 + Math.sin(t + i * 0.7) * (1 + dimLevel * 0.15);

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();

        if (dimLevel >= 6 && i % 3 === 0) {
          const x2 = w / 2 + Math.cos(angle + 0.5) * radius * 0.8;
          const y2 = h / 2 + Math.sin(angle + 0.5) * radius * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      if (dimLevel >= 9) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 30 + Math.sin(t) * 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 200, ${0.1 + Math.sin(t * 2) * 0.05})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [selectedDim, dim]);

    // @ts-ignore
  useEffect(() => {
    if (breathing) {
      const interval = setInterval(() => {
        setBreathing(prev => !prev);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [breathing]);

  const content = (
    <div className={`min-h-screen bg-gradient-to-br ${dim.bgGradient} text-white transition-all duration-1000 relative overflow-hidden`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" data-testid="dimension-canvas" />

      <div className="relative z-10">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8" style={{ color: dim.color }} />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="page-title">Dimensional Perception</h1>
                <p className="text-sm text-white/60">Experience how beings in other dimensions see, feel, and know reality</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImmersive(!immersive)}
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="toggle-immersive"
            >
              {immersive ? "Exit Immersive" : "Enter Immersive"}
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin" data-testid="dimension-selector">
            {DIMENSIONS.map((d, i) => (
              <button
                key={d.dimension}
                onClick={() => setSelectedDim(i)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all duration-500 ${
                  i === selectedDim
                    ? "border-white/40 bg-white/15 shadow-lg shadow-white/10 scale-105"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                data-testid={`dim-btn-${d.dimension}`}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: d.color }}>{getIcon(d.icon)}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold" style={{ color: d.color }}>{d.dimension}D</div>
                    <div className="text-[10px] text-white/50">{d.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedDim(Math.max(0, selectedDim - 1))}
              disabled={selectedDim === 0}
              className="text-white"
              data-testid="prev-dim"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <div className="text-4xl md:text-5xl font-black mb-1" style={{ color: dim.color }} data-testid="dim-number">
                {dim.dimension}D
              </div>
              <div className="text-lg font-semibold" data-testid="dim-name">{dim.name}</div>
              <div className="text-sm text-white/50">{dim.frequency}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedDim(Math.min(DIMENSIONS.length - 1, selectedDim + 1))}
              disabled={selectedDim === DIMENSIONS.length - 1}
              className="text-white"
              data-testid="next-dim"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className={`space-y-6 max-w-4xl mx-auto transition-all duration-700 ${immersive ? "text-lg leading-relaxed" : ""}`}>
            <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur" data-testid="section-perception">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">What You Perceive</h2>
              </div>
              <p className="text-white/80 leading-relaxed">{dim.perception}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur" data-testid="section-howtheysee">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">How They See</h2>
              </div>
              <p className="text-white/80 leading-relaxed">{dim.howTheySee}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur" data-testid="section-whattheyfeel">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">What They Feel</h2>
              </div>
              <p className="text-white/80 leading-relaxed">{dim.whatTheyFeel}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur" data-testid="section-time">
              <div className="flex items-center gap-2 mb-3">
                <Infinity className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">How Time Feels</h2>
              </div>
              <p className="text-white/80 leading-relaxed">{dim.timeExperience}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur" data-testid="section-mansion">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">{dim.mansion}</h2>
              </div>
              <p className="text-white/80 leading-relaxed">{dim.mansionDescription}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur" data-testid="section-entities">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">Beings Here</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {dim.entities.map((e) => (
                  <Badge key={e} className="text-white border-white/20" style={{ backgroundColor: `${dim.color}33` }} data-testid={`entity-${e}`}>
                    {e}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-xl p-6 border border-white/20 backdrop-blur" data-testid="section-wisdom">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5" style={{ color: dim.color }} />
                <h2 className="text-lg font-bold">Wisdom Teaching</h2>
              </div>
              <p className="text-white/90 leading-relaxed italic text-lg">{dim.wisdomTeaching}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      
      <div className="flex-1 overflow-auto">
        {content}
      </div>
    </div>
  );
}

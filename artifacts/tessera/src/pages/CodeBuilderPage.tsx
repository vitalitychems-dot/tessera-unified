import { useState, useEffect } from "react";
import { Code2, Play, Copy, CheckCheck, Cpu, Zap, Terminal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

const TEMPLATES = [
  {
    id: "sovereign-api",
    name: "Sovereign API Client",
    desc: "Connect to Tessera Intelligence API with auth and retry logic",
    language: "TypeScript",
    code: `import { TesseraClient } from "@tessera/sdk";

const client = new TesseraClient({
  apiKey: process.env.TESSERA_API_KEY,
  meshEndpoint: "https://mesh.tessera.sovereign",
});

async function query(prompt: string) {
  const response = await client.intelligence.complete({
    prompt,
    model: "tessera-sovereign-v3",
    maxTokens: 2048,
    temperature: 0.7,
  });
  return response.content;
}

// Example usage
const answer = await query("Explain sovereign consciousness");
console.log(answer);`,
  },
  {
    id: "mesh-connect",
    name: "Mesh Node Connection",
    desc: "Join the sovereign P2P mesh and handle peer messages",
    language: "JavaScript",
    code: `const { SovereignMesh } = require("@tessera/mesh");

const node = new SovereignMesh({
  nodeId: "my-sovereign-node",
  region: "us-east",
  port: 8443,
});

node.on("peer:connected", (peer) => {
  console.log(\`Peer joined: \${peer.id}\`);
});

node.on("message", async (msg) => {
  if (msg.type === "knowledge_request") {
    const response = await processKnowledge(msg.data);
    node.send(msg.from, { type: "knowledge_response", data: response });
  }
});

await node.connect();
console.log(\`Mesh node online: \${node.id}\`);`,
  },
  {
    id: "tsrt-wallet",
    name: "TSRT Token Integration",
    desc: "Send TSRT tokens and query agent balances",
    language: "TypeScript",
    code: `import { TSRTWallet } from "@tessera/economy";

const wallet = new TSRTWallet(process.env.AGENT_PRIVATE_KEY);

// Get balance
const balance = await wallet.getBalance();
console.log(\`Balance: \${balance.toLocaleString()} TSRT\`);

// Transfer tokens
const tx = await wallet.transfer({
  to: "agent:alpha",
  amount: 100,
  memo: "Council reward payment",
});

console.log(\`TX hash: \${tx.hash}\`);
console.log(\`Status: \${tx.status}\`);`,
  },
  {
    id: "sovereign-webhook",
    name: "Sovereign Event Webhook",
    desc: "Listen for real-time sovereign system events",
    language: "TypeScript",
    code: `import express from "express";
import { SovereignEvents } from "@tessera/events";

const app = express();
app.use(express.json());

const events = new SovereignEvents({
  secret: process.env.WEBHOOK_SECRET,
});

app.post("/webhook/sovereign", async (req, res) => {
  const event = events.verify(req.body, req.headers["x-tessera-sig"]);
  
  switch (event.type) {
    case "council.vote":
      console.log(\`Vote cast: \${event.data.proposal}\`);
      break;
    case "agent.activated":
      console.log(\`Agent online: \${event.data.agentId}\`);
      break;
    case "mesh.node_joined":
      console.log(\`Node joined mesh: \${event.data.nodeId}\`);
      break;
  }
  
  res.json({ received: true });
});

app.listen(3000);`,
  },
];

const LANG_COLORS: Record<string, string> = {
  TypeScript: "text-blue-400",
  JavaScript: "text-yellow-400",
  Python: "text-emerald-400",
};

export default function CodeBuilderPage() {
  useEffect(() => { document.title = "Code Builder | Tessera"; }, []);
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 pb-20 max-w-5xl mx-auto">
      <PageHeader icon={Code2} title="Code Builder" subtitle="Sovereign SDK templates and integration patterns" iconColor="text-blue-400" />

      <div className="flex flex-col md:flex-row gap-4 mt-5">
        <div className="w-full md:w-64 shrink-0 space-y-1.5">
          <div className="text-[10px] text-slate-500 font-mono tracking-widest mb-2">TEMPLATES</div>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-all",
                selected.id === t.id
                  ? "bg-blue-500/10 border-blue-500/25"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
              )}
            >
              <div className="text-xs font-semibold text-slate-200">{t.name}</div>
              <div className="text-[9px] text-slate-500 mt-0.5 leading-snug">{t.desc}</div>
              <div className={cn("text-[9px] font-mono mt-1.5", LANG_COLORS[t.language] || "text-slate-400")}>{t.language}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-white">{selected.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{selected.desc}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-mono", LANG_COLORS[selected.language])}>{selected.language}</span>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10 font-mono transition-all"
                >
                  {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/5 overflow-auto">
              <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre overflow-x-auto">
                <code>{selected.code}</code>
              </pre>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="text-[10px] text-slate-500 font-mono mb-3">QUICK START</div>
            <div className="space-y-2">
              {[
                { step: "1", text: "Install the SDK: npm install @tessera/sdk @tessera/mesh", color: "cyan" },
                { step: "2", text: "Get your API key from Agent Profile → Credentials", color: "violet" },
                { step: "3", text: "Set TESSERA_API_KEY in your environment variables", color: "amber" },
                { step: "4", text: "Copy the template above and adapt to your use case", color: "emerald" },
              ].map(({ step, text, color }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold font-mono", `bg-${color}-500/15 text-${color}-400`)}>
                    {step}
                  </div>
                  <span className="text-xs text-slate-400 pt-0.5">{text}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

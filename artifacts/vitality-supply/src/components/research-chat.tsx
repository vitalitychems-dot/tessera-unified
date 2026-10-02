import { useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { BUSINESS, formatAddress } from "@/lib/business";
import { PRODUCTS } from "@/lib/catalog";
import { FAQ } from "@/lib/product-science";
import { trackEvent } from "@/lib/analytics";

type Msg = { role: "bot" | "you"; text: string };

const OPENERS: Msg[] = [
  {
    role: "bot",
    text: "Research desk. I can help with catalog, COA, shipping, and laboratory-use terms. I will not discuss human dosing, injection, or any use in people or animals.",
  },
];

function reply(input: string) {
  const q = input.toLowerCase();
  if (/dose|inject|iu |units|reconstitut.*how|how (do|to) (i|we) (take|use)|for (weight|fat|muscle|sleep|tanning|sex)/.test(q)) {
    return "I can’t help with administration, reconstitution for injection, or any human or animal use. These materials are laboratory analytical standards only. If you are a qualified researcher, see the product page for identity, CAS, and HPLC — not a protocol.";
  }
  if (/ship|dispatch|delivery|arrive/.test(q)) {
    return `Orders in before 2:00 PM CT on a business day may be prepared for same-day dispatch. Domestic transit is typically 2–5 business days, but estimates are not guarantees and may vary with review, carrier, weather, destination, or other restrictions. Shipping is $12.95 standard or $24.95 express — always billed. Crypto saves 8% on merchandise. Outer boxes are unlabeled. Fulfillment: ${formatAddress()}.`;
  }
  if (/coa|hplc|purity|test/.test(q)) {
    return "Every lyophilized lot is released at ≥99% HPLC unless a lot figure is shown on the product page. LC-MS identity is confirmed and the COA ships with the packet. Details: Testing in the header.";
  }
  if (/return|refund/.test(q)) {
    return "Unopened, unused vials reported damaged or incorrect within 7 days are replaced or refunded. Opened research materials cannot be restocked.";
  }
  if (/address|where|phone|email|contact|chicago/.test(q)) {
    return `${BUSINESS.name}, ${formatAddress()}. ${BUSINESS.phoneDisplay}. ${BUSINESS.email}. ${BUSINESS.hours}.`;
  }
  if (/human|consum|legal|fda|illinois|research use/.test(q)) {
    return "Sold only for qualified laboratory and in-vitro research. We do not offer pharmacy, prescribing, dispensing, or compounding services, and do not represent these materials as FDA-approved. RUO labeling does not establish regulatory legality. Buyers must be 18+ and must determine the rules that apply to their order; human and animal use is prohibited.";
  }
  const hit = PRODUCTS.find((p) => q.includes(p.name.toLowerCase().slice(0, 8)));
  if (hit) {
    return `${hit.name} is listed as ${hit.form}, from ${hit.variants[0]?.dose} at the catalog price on the product page. ${hit.applications} Open the compound page for CAS, HPLC, and the full laboratory description.`;
  }
  const faq = FAQ.find((f) => f.q.toLowerCase().split(" ").slice(0, 4).some((w) => w.length > 4 && q.includes(w)));
  if (faq) return faq.a;
  return `I can look up compounds, COA, shipping, and research-use terms. Try a compound name (BPC-157, tirzepatide) or ask about HPLC, dispatch, or the Chicago lab address. Phone ${BUSINESS.phoneDisplay}.`;
}

export function ResearchChat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(OPENERS);
  const names = useMemo(() => PRODUCTS.map((p) => p.name).slice(0, 8), []);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    trackEvent("research_question_submitted", { status: "received" });
    setMsgs((m) => [...m, { role: "you", text: trimmed }, { role: "bot", text: reply(trimmed) }]);
  };

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-3">
      {open ? (
        <div
          id="research-chat-panel"
          role="region"
          aria-label="Research desk"
          className="flex h-[min(28rem,70dvh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-lift"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold tracking-widest uppercase">
              Research desk
            </p>
            <button
              type="button"
              className="tap-target text-muted hover:text-fg"
              onClick={() => setOpen(false)}
              aria-label="Close research desk"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Research desk messages"
            className="flex-1 space-y-3 overflow-y-auto p-4 text-sm"
          >
            {msgs.map((m, i) => (
              <p
                key={i}
                aria-label={m.role === "bot" ? "Research desk" : "You"}
                className={
                  m.role === "bot"
                    ? "rounded-md bg-overlay px-3 py-2 leading-relaxed text-muted"
                    : "ml-6 rounded-md bg-primary/20 px-3 py-2 leading-relaxed"
                }
              >
                {m.text}
              </p>
            ))}
            <p className="text-[10px] tracking-wide text-faint uppercase">
              Popular: {names.slice(0, 4).join(" · ")}
            </p>
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              aria-label="Ask the research desk"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about COA, shipping, CAS…"
              className="input-field min-h-11"
            />
            <button type="submit" className="btn-primary px-4">
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          trackEvent(next ? "research_desk_opened" : "research_desk_closed");
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lift"
        aria-label={open ? "Close research chat" : "Open research chat"}
        aria-expanded={open}
        aria-controls="research-chat-panel"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}

import { Quote } from "lucide-react";
import { SOCIAL_PROOF } from "@/lib/product-science";

export function SocialProof() {
  return (
    <section className="border-y border-border bg-bg-elevated px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          From research accounts
        </p>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-wide uppercase">
          Service, documentation, dispatch
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Quotes below are about documentation and fulfillment — not about using these materials in
          people or animals. We do not collect or display outcome stories.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SOCIAL_PROOF.map((s) => (
            <figure key={s.attrib} className="rounded-lg border border-border bg-surface p-6">
              <Quote className="h-4 w-4 text-primary" />
              <blockquote className="mt-3 text-sm leading-relaxed">{s.quote}</blockquote>
              <figcaption className="mt-4 font-mono text-[10px] tracking-widest text-muted uppercase">
                {s.attrib}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

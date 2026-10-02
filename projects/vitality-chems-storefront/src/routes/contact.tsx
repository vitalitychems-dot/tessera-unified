import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BUSINESS, formatAddress, IL_NOTICE } from "@/lib/business";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () =>
    seoHead({
      title: "Contact",
      description:
        "Vitality Supply, 2045 W Grand Ave Unit B, Chicago IL 60612. Laboratory research peptides. (779) 717-4445.",
      path: "/contact",
    }),
});

function Contact() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pt-8 pb-20">
        <p className="font-mono text-xs tracking-widest text-primary uppercase">Chicago laboratory supply</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-wide uppercase">Contact</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Qualified researchers only. We do not advise on human or animal use.
        </p>
        <div className="mt-10 space-y-6">
          <p className="flex gap-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <span>
              {BUSINESS.name}
              <br />
              {formatAddress(true).split("\n").map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </span>
          </p>
          <p className="flex gap-3 text-sm">
            <Phone className="mt-0.5 h-4 w-4 text-primary" />
            <a href={BUSINESS.phoneHref} className="hover:text-primary">
              {BUSINESS.phoneDisplay}
            </a>
          </p>
          <p className="flex gap-3 text-sm">
            <Mail className="mt-0.5 h-4 w-4 text-primary" />
            <a href={BUSINESS.emailHref} className="hover:text-primary">
              {BUSINESS.email}
            </a>
          </p>
          <p className="text-sm text-muted">{BUSINESS.hours}</p>
        </div>
        <p className="mt-10 text-xs leading-relaxed text-faint">{IL_NOTICE}</p>
      </main>
      <SiteFooter />
    </div>
  );
}

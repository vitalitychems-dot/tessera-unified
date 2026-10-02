import { Link } from "@tanstack/react-router";
import { RUO_SHORT } from "@/lib/legal";
import { BUSINESS, formatAddress } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/brand/logo.png" alt="" className="h-8 w-8 object-contain" />
            <span className="font-display font-semibold tracking-wider uppercase">
              Vitality Chems
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{RUO_SHORT}</p>
          <p className="mt-4 text-sm text-muted">
            {formatAddress()}
            <br />
            <a href={BUSINESS.phoneHref} className="hover:text-primary">
              {BUSINESS.phoneDisplay}
            </a>
            <br />
            <a href={BUSINESS.emailHref} className="hover:text-primary">
              {BUSINESS.email}
            </a>
          </p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold tracking-widest uppercase">Catalog</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <Link to="/" className="transition-colors hover:text-primary">
              Shop
            </Link>
            <Link to="/" hash="catalog" className="transition-colors hover:text-primary">
              Compounds
            </Link>
            <Link to="/testing" className="transition-colors hover:text-primary">
              Testing & COA
            </Link>
            <Link to="/subscriptions" className="transition-colors hover:text-primary">
              Subscribe
            </Link>
            <Link to="/contact" className="transition-colors hover:text-primary">
              Contact
            </Link>
            <Link to="/wholesale" className="transition-colors hover:text-primary">
              Wholesale
            </Link>
            <Link to="/affiliates" className="transition-colors hover:text-primary">
              Affiliates
            </Link>
          </div>
        </div>
        <div>
          <p className="font-display text-sm font-semibold tracking-widest uppercase">Policies</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <Link to="/legal/research-use" className="transition-colors hover:text-primary">
              Research use
            </Link>
            <Link to="/legal/terms" className="transition-colors hover:text-primary">
              Terms of sale
            </Link>
            <Link to="/legal/privacy" className="transition-colors hover:text-primary">
              Privacy
            </Link>
            <Link to="/legal/returns" className="transition-colors hover:text-primary">
              Returns
            </Link>
          </div>
        </div>
        <div>
          <p className="font-display text-sm font-semibold tracking-widest uppercase">Staff</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <Link to="/login" className="transition-colors hover:text-primary">
              Lab portal
            </Link>
            <Link to="/admin" className="transition-colors hover:text-primary">
              Analytics
            </Link>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-7xl text-xs text-faint">
        © {new Date().getFullYear()} Vitality Supply · {formatAddress()}. Laboratory and research
        use only — not to be used in or on people or animals.
      </p>
    </footer>
  );
}

import { useEffect, useState } from "react";
import { loadPaymentOptions, loadPaymentSettings, savePaymentSettings } from "@/lib/store-api";

export function AdminPaymentSettings() {
  const [form, setForm] = useState({
    zelleRecipient: "", zelleDisplayName: "", btcAddress: "", ethAddress: "",
    cryptoRewardPercent: "0", paymentNotice: "", salesTaxRatePercent: "0",
    taxNexusRegion: "Illinois", supplierEmail: "Apex.nutrition2021@gmail.com",
    ownerNotificationEmail: "vitalitychems@gmail.com", incomeTaxReservePercent: "4.95",
  });
  const [live, setLive] = useState<{ stripe: boolean; zelle: boolean; bitcoin: boolean; ethereum: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const load = async () => {
    const [settings, options] = await Promise.all([loadPaymentSettings(), loadPaymentOptions()]);
    setForm({
      zelleRecipient: settings.zelle_recipient ?? "", zelleDisplayName: settings.zelle_display_name ?? "",
      btcAddress: settings.btc_address ?? "", ethAddress: settings.eth_address ?? "",
      cryptoRewardPercent: settings.crypto_reward_percent ?? "0", paymentNotice: settings.payment_notice ?? "",
      salesTaxRatePercent: settings.sales_tax_rate_percent ?? "0",
      taxNexusRegion: settings.tax_nexus_region ?? "Illinois",
      supplierEmail: settings.supplier_email ?? "Apex.nutrition2021@gmail.com",
      ownerNotificationEmail: settings.owner_notification_email ?? "vitalitychems@gmail.com",
      incomeTaxReservePercent: settings.income_tax_reserve_percent ?? "4.95",
    });
    setLive({ stripe: options.stripe, zelle: options.zelle, bitcoin: options.bitcoin, ethereum: options.ethereum });
  };
  useEffect(() => {
    void load().catch(() => {
      setLive(null);
      setMessage("Payment status is temporarily unavailable. Refresh before accepting orders.");
    });
  }, []);
  const missingManual = live && (!live.zelle || !live.bitcoin || !live.ethereum);
  return <section className="rounded-lg border border-border bg-surface p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold uppercase">Payment settings</h2><div className="flex gap-2">{live ? Object.entries(live).map(([key, value]) => <span key={key} className={`rounded-full px-2 py-1 text-xs ${value ? "bg-green-400/15 text-green-300" : "bg-overlay text-muted"}`}>{key}: {value ? "live" : "off"}</span>) : <span className="rounded-full bg-overlay px-2 py-1 text-xs text-muted">status: checking</span>}</div></div>
    {missingManual ? <div role="alert" className="mt-5 rounded-md border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-100">
      Manual payment methods stay unavailable at checkout until their production settings are saved here. Development settings do not automatically copy into an existing published database.
    </div> : null}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Zelle recipient email / phone" value={form.zelleRecipient} onChange={(zelleRecipient) => setForm({ ...form, zelleRecipient })} />
      <Field label="Zelle display name" value={form.zelleDisplayName} onChange={(zelleDisplayName) => setForm({ ...form, zelleDisplayName })} />
      <div className="sm:col-span-2"><Field label="Bitcoin address" value={form.btcAddress} onChange={(btcAddress) => setForm({ ...form, btcAddress })} /></div>
      <div className="sm:col-span-2"><Field label="Ethereum address" value={form.ethAddress} onChange={(ethAddress) => setForm({ ...form, ethAddress })} /></div>
      <Field label="Crypto bonus reward (%)" value={form.cryptoRewardPercent} onChange={(cryptoRewardPercent) => setForm({ ...form, cryptoRewardPercent })} />
      <Field label="Illinois sales-tax estimate (%)" value={form.salesTaxRatePercent} onChange={(salesTaxRatePercent) => setForm({ ...form, salesTaxRatePercent })} />
      <Field label="Tax nexus label" value={form.taxNexusRegion} onChange={(taxNexusRegion) => setForm({ ...form, taxNexusRegion })} />
      <Field label="Supplier fulfillment email" value={form.supplierEmail} onChange={(supplierEmail) => setForm({ ...form, supplierEmail })} />
      <Field label="Owner notification email" value={form.ownerNotificationEmail} onChange={(ownerNotificationEmail) => setForm({ ...form, ownerNotificationEmail })} />
      <Field label="Income-tax reserve estimate (%)" value={form.incomeTaxReservePercent} onChange={(incomeTaxReservePercent) => setForm({ ...form, incomeTaxReservePercent })} />
      <label className="sm:col-span-2"><span className="mb-1 block text-xs text-muted">Payment notice</span><textarea className="input-field min-h-24 w-full" value={form.paymentNotice} onChange={(e) => setForm({ ...form, paymentNotice: e.target.value })} /></label>
    </div>
    {message && <p className="mt-3 text-sm text-primary">{message}</p>}
    <button className="btn-primary mt-5" onClick={async () => { setMessage(""); try { await savePaymentSettings({ data: form }); setMessage("Payment settings saved."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); } }}>Save settings</button>
  </section>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className="mb-1 block text-xs text-muted">{label}</span><input className="input-field w-full" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
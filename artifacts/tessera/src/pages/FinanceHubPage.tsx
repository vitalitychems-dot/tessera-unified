import PageTabs from "@/components/PageTabs";

export default function FinanceHubPage() {
  return (
    <PageTabs
      hubKey="finance"
      title="Finance & Market"
      subtitle="Portfolio · Markets · Arbitrage"
      iconColor="text-emerald-400"
      tabs={[
        { id: "portfolio", label: "Portfolio", load: () => import("./FinancePage"), matchPaths: ["/finance"] },
        { id: "market", label: "Market", load: () => import("./MarketDashboardPage"), matchPaths: ["/market"] },
        { id: "arbitrage", label: "Arbitrage", load: () => import("./ArbitragePage"), matchPaths: ["/arbitrage", "/sports-arb"] },
      ]}
    />
  );
}

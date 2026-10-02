import PageTabs from "@/components/PageTabs";

export default function CodeHubPage() {
  return (
    <PageTabs
      hubKey="code"
      title="Code · API · Credentials"
      subtitle="Builder · Marketplace · Keys"
      iconColor="text-blue-400"
      tabs={[
        { id: "builder", label: "Code Builder", load: () => import("./CodeBuilderPage"), matchPaths: ["/code-builder"] },
        { id: "api", label: "API Marketplace", load: () => import("./APIMarketplacePage"), matchPaths: ["/api-marketplace"] },
        { id: "credentials", label: "Credentials & Keys", load: () => import("./CredentialsPage"), matchPaths: ["/credentials"] },
      ]}
    />
  );
}

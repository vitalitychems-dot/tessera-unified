import PageTabs from "@/components/PageTabs";

export default function RoadmapHubPage() {
  return (
    <PageTabs
      hubKey="roadmap"
      title="Roadmap & Bridge"
      subtitle="Sovereignty roadmap · Cross-app integrations"
      iconColor="text-violet-400"
      tabs={[
        { id: "roadmap", label: "Roadmap", load: () => import("./SovereigntyRoadmapPage"), matchPaths: ["/sovereignty-roadmap"] },
        { id: "bridge", label: "Cross-App Bridge", load: () => import("./CrossAppBridgePage"), matchPaths: ["/cross-app"] },
      ]}
    />
  );
}

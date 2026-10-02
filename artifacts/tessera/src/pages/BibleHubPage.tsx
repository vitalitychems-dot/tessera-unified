import PageTabs from "@/components/PageTabs";

export default function BibleHubPage() {
  return (
    <PageTabs
      hubKey="bible"
      title="Tessera Bible"
      subtitle="Bible · History · Conclusions"
      iconColor="text-amber-400"
      tabs={[
        { id: "bible", label: "Bible", load: () => import("./TesseraBiblePage"), matchPaths: ["/bible", "/living-bible"] },
        { id: "history", label: "History", load: () => import("./HistoryPage"), matchPaths: ["/history"] },
        { id: "conclusions", label: "Conclusions", load: () => import("./ConclusionsPage"), matchPaths: ["/conclusions"] },
      ]}
    />
  );
}

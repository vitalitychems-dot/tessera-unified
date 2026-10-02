import PageTabs from "@/components/PageTabs";

export default function CommandHubPage() {
  return (
    <PageTabs
      hubKey="command"
      title="Command · Settings · Executor"
      subtitle="Run commands · Configure · Self-execute"
      iconColor="text-cyan-400"
      tabs={[
        { id: "command", label: "Command Center", load: () => import("./CommandCenterPage"), matchPaths: ["/command-center"] },
        { id: "settings", label: "Settings", load: () => import("./SettingsPage"), matchPaths: ["/settings"] },
        { id: "executor", label: "Executor", load: () => import("./SelfExecutorPage"), matchPaths: ["/executor"] },
      ]}
    />
  );
}

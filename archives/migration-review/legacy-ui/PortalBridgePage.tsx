import { useEffect } from "react";
import InterdimensionalPortalPage from "./InterdimensionalPortalPage";
import { CrossAppContent } from "./CrossAppBridgePage";

export default function PortalBridgePage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Portal & Bridge | Tessera Sovereign"; }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background text-white" data-testid="page-portal-bridge">
      <div className="flex-1 overflow-auto space-y-4">
        <InterdimensionalPortalPage embedded />
        <CrossAppContent embedded />
      </div>
    </div>
  );
}

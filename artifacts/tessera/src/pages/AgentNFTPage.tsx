export default function AgentNFTPage({ embedded }: { embedded?: boolean }) {
  return (
    <div className={embedded ? "p-4" : "p-6"}>
      <div className="text-center text-muted-foreground font-mono text-sm">
        Agent NFT system coming soon
      </div>
    </div>
  );
}

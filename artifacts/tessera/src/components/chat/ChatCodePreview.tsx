import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodePreview({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-white/5">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 text-xs text-gray-400">
        <span>{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition-colors" data-testid="button-copy-code">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm bg-black/20"><code className="text-gray-200">{code}</code></pre>
    </div>
  );
}

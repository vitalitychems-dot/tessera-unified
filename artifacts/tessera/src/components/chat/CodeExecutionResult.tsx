import React from "react";
import { useState, useMemo } from "react";
import { Copy, Check, Play, Terminal, AlertTriangle, Clock, ChevronDown, ChevronRight, Shield } from "lucide-react";

export interface ExecutionResultData {
  id: string;
  success: boolean;
  code: string;
  language: string;
  stdout: string;
  stderr: string;
  returnValue: string | null;
  error: string | null;
  durationMs: number;
  securityViolations: string[];
  truncated: boolean;
}

function highlightCode(code: string, language: string): React.JSX.Element[] {
  const lines = code.split("\n");
  return lines.map((line, lineIdx) => {
    const tokens: React.JSX.Element[] = [];
    let remaining = line;
    let keyIdx = 0;

    while (remaining.length > 0) {
      let matched = false;

      const commentMatch = remaining.match(/^(\/\/.*)/);
      if (commentMatch) {
        tokens.push(<span key={keyIdx++} className="text-gray-500 italic">{commentMatch[1]}</span>);
        remaining = remaining.slice(commentMatch[1].length);
        matched = true;
        continue;
      }

      const stringMatch = remaining.match(/^(["'`](?:[^"'`\\]|\\.)*?["'`])/);
      if (stringMatch) {
        tokens.push(<span key={keyIdx++} className="text-amber-300">{stringMatch[1]}</span>);
        remaining = remaining.slice(stringMatch[1].length);
        matched = true;
        continue;
      }

      const numberMatch = remaining.match(/^(\b\d+(?:\.\d+)?\b)/);
      if (numberMatch) {
        tokens.push(<span key={keyIdx++} className="text-purple-300">{numberMatch[1]}</span>);
        remaining = remaining.slice(numberMatch[1].length);
        matched = true;
        continue;
      }

      const keywordMatch = remaining.match(/^(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|new|this|typeof|instanceof|throw|try|catch|finally|async|await|import|export|from|default|yield|of|in)\b)/);
      if (keywordMatch) {
        tokens.push(<span key={keyIdx++} className="text-cyan-400 font-semibold">{keywordMatch[1]}</span>);
        remaining = remaining.slice(keywordMatch[1].length);
        matched = true;
        continue;
      }

      const typeKeywordMatch = remaining.match(/^(\b(?:string|number|boolean|void|any|never|unknown|null|undefined|true|false|interface|type|enum|as)\b)/);
      if (typeKeywordMatch) {
        tokens.push(<span key={keyIdx++} className="text-blue-400">{typeKeywordMatch[1]}</span>);
        remaining = remaining.slice(typeKeywordMatch[1].length);
        matched = true;
        continue;
      }

      const builtinMatch = remaining.match(/^(\b(?:console|Math|JSON|Date|Array|Object|String|Number|Boolean|Map|Set|Promise|Error|RegExp|parseInt|parseFloat|isNaN)\b)/);
      if (builtinMatch) {
        tokens.push(<span key={keyIdx++} className="text-emerald-400">{builtinMatch[1]}</span>);
        remaining = remaining.slice(builtinMatch[1].length);
        matched = true;
        continue;
      }

      const funcCallMatch = remaining.match(/^(\w+)(\s*\()/);
      if (funcCallMatch) {
        tokens.push(<span key={keyIdx++} className="text-yellow-200">{funcCallMatch[1]}</span>);
        tokens.push(<span key={keyIdx++} className="text-gray-300">{funcCallMatch[2]}</span>);
        remaining = remaining.slice(funcCallMatch[0].length);
        matched = true;
        continue;
      }

      if (!matched) {
        tokens.push(<span key={keyIdx++} className="text-gray-300">{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return (
      <div key={lineIdx} className="flex">
        <span className="select-none text-gray-600 text-right w-8 pr-3 shrink-0">{lineIdx + 1}</span>
        <span>{tokens}</span>
      </div>
    );
  });
}

export function CodeExecutionResult({ result }: { result: ExecutionResultData }) {
  const [copied, setCopied] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(false);

  const highlightedCode = useMemo(() => {
    if (!codeExpanded || !result.code) return null;
    return highlightCode(result.code, result.language);
  }, [codeExpanded, result.code, result.language]);

  const handleCopy = () => {
    const output = [
      result.stdout,
      result.returnValue ? `Return: ${result.returnValue}` : "",
      result.stderr,
      result.error || "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasOutput = result.stdout || result.returnValue || result.stderr || result.error;

  return (
    <div className={`my-3 rounded-xl overflow-hidden border ${
      result.success
        ? "border-emerald-500/30 bg-emerald-950/10"
        : result.securityViolations.length > 0
          ? "border-red-500/30 bg-red-950/10"
          : "border-amber-500/30 bg-amber-950/10"
    }`}>
      <div className={`flex items-center justify-between px-3 py-2 ${
        result.success ? "bg-emerald-900/20" : result.securityViolations.length > 0 ? "bg-red-900/20" : "bg-amber-900/20"
      }`}>
        <div className="flex items-center gap-2">
          <Terminal size={14} className={result.success ? "text-emerald-400" : "text-red-400"} />
          <span className="text-xs font-mono text-gray-300">
            Code Execution {result.success ? "✓" : "✗"}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">{result.language}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock size={10} />
            {result.durationMs}ms
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {result.code && (
        <button
          onClick={() => setCodeExpanded(!codeExpanded)}
          className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors bg-black/20 border-b border-white/5"
        >
          {codeExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <Play size={9} className="text-blue-400" />
          <span>Source code ({result.code.split("\n").length} lines)</span>
        </button>
      )}

      {codeExpanded && result.code && (
        <div className="border-b border-white/5">
          <pre className="p-3 overflow-x-auto text-xs bg-black/40 max-h-[300px] overflow-y-auto font-mono leading-5">
            {highlightedCode}
          </pre>
        </div>
      )}

      {hasOutput && (
        <div className="px-3 py-2 space-y-2">
          {result.stdout && (
            <div>
              <div className="text-[10px] text-gray-500 font-mono mb-1 flex items-center gap-1">
                <Terminal size={9} /> stdout
              </div>
              <pre className="text-xs text-emerald-300/90 bg-black/30 rounded-lg px-2.5 py-2 overflow-x-auto max-h-[200px] overflow-y-auto font-mono">
                {result.stdout}
              </pre>
            </div>
          )}

          {result.returnValue !== null && (
            <div>
              <div className="text-[10px] text-gray-500 font-mono mb-1 flex items-center gap-1">
                <span className="text-blue-400">→</span> return value
              </div>
              <pre className="text-xs text-blue-300/90 bg-black/30 rounded-lg px-2.5 py-2 overflow-x-auto max-h-[200px] overflow-y-auto font-mono">
                {result.returnValue}
              </pre>
            </div>
          )}

          {result.stderr && (
            <div>
              <div className="text-[10px] text-amber-500 font-mono mb-1 flex items-center gap-1">
                <AlertTriangle size={9} /> stderr
              </div>
              <pre className="text-xs text-amber-300/80 bg-black/30 rounded-lg px-2.5 py-2 overflow-x-auto max-h-[200px] overflow-y-auto font-mono">
                {result.stderr}
              </pre>
            </div>
          )}

          {result.error && !result.securityViolations.length && (
            <div>
              <div className="text-[10px] text-red-500 font-mono mb-1 flex items-center gap-1">
                <AlertTriangle size={9} /> error
              </div>
              <pre className="text-xs text-red-300/80 bg-black/30 rounded-lg px-2.5 py-2 overflow-x-auto font-mono">
                {result.error}
              </pre>
            </div>
          )}

          {result.securityViolations.length > 0 && (
            <div>
              <div className="text-[10px] text-red-500 font-mono mb-1 flex items-center gap-1">
                <Shield size={9} /> security violations
              </div>
              <div className="text-xs text-red-300/80 bg-red-950/30 rounded-lg px-2.5 py-2 space-y-1">
                {result.securityViolations.map((v, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-red-500">•</span> {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.truncated && (
            <div className="text-[10px] text-yellow-500 italic">
              Output was truncated due to size limits
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function parseCodeExecutionBlocks(text: string): Array<{ before: string; result: ExecutionResultData }> {
  const blocks: Array<{ before: string; result: ExecutionResultData }> = [];
  const pattern = /---\n\*\*Code Execution [✓✗]\*\* \*\((\w+), (\d+)ms\)\*\n([\s\S]*?)---/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    const language = match[1];
    const durationMs = parseInt(match[2]);
    const body = match[3];

    const sourceCode = extractBlock(body, "Source");
    const stdout = extractBlock(body, "Output");
    const returnValue = extractBlock(body, "Return value");
    const stderr = extractBlock(body, "Errors");
    const errorMatch = body.match(/\*\*Error:\*\* (.+)/);
    const violationsMatch = body.match(/\*\*Security violations:\*\* (.+)/);

    const success = match[0].includes("✓");

    blocks.push({
      before,
      result: {
        id: `parsed-${match.index}`,
        success,
        code: sourceCode || "",
        language,
        stdout: stdout || "",
        stderr: stderr || "",
        returnValue: returnValue || null,
        error: errorMatch ? errorMatch[1] : null,
        durationMs,
        securityViolations: violationsMatch ? violationsMatch[1].split(", ") : [],
        truncated: false,
      },
    });

    lastIndex = match.index + match[0].length;
  }

  return blocks;
}

export function stripCodeExecutionBlocks(text: string): string {
  return text.replace(/---\n\*\*Code Execution [✓✗]\*\* \*\(\w+, \d+ms\)\*\n[\s\S]*?---/g, "").trim();
}

function extractBlock(body: string, label: string): string | null {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\n\`\`\`[a-z]*\\n([\\s\\S]*?)\\n\`\`\``, "m");
  const match = body.match(regex);
  return match ? match[1] : null;
}

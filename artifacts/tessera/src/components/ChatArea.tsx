import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, X, Copy, Check, Download, Zap, PhoneOff, Pause, Play, MessageSquare, Shield, Settings2, Bot, CheckCircle2, Search, Sparkles, Code, Database, Keyboard, Eye, Paperclip } from "lucide-react";
import { NLPGoalsPanel } from "./chat/NLPGoalsPanel";
import { type VirtuosoHandle } from "react-virtuoso";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useChat } from "@/hooks/use-chat";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";
import { queryClient } from "@/lib/queryClient";

import {
  AGENT_FREQUENCIES, getAgentHz, parseAgentFromMsg,
  NAV_COMMANDS, DATA_COMMANDS, ACTION_COMMANDS, COMMAND_HINTS,
  MSG_STYLES, sanitizeMessageContent, getTesseraCategory,
  type DataCommand, type ActionCommand,
} from "./chat/ChatCommands";

import { parseChartBlocks, InlineChart } from "./chat/ChatChartRenderer";
import { CodePreview } from "./chat/ChatCodePreview";
import { ColorizedText } from "./chat/ChatColorizedText";
import {
  type ReplyMode, type VoiceState,
  playAudioResponse, stopSpeaking, sendVoiceMessage, copyToClipboard, downloadConversation,
  VoiceActivityIndicator,
} from "./chat/ChatVoice";
import {
  FatherNotesPanel, AgentActivityPanel, ActiveAgentsBadges,
  TesseractSwarmPanel, ThinkingRepoBlocks, ContextSuggestions,
} from "./chat/ChatPanels";
import { type UploadedFile } from "./chat/ChatFileComponents";
import { ChatShortcutsModal } from "./chat/ChatKeyboardShortcuts";
import { MyKeyRevealModal, isShowMyKeyCommand } from "./chat/MyKeyRevealModal";
import { useChatCommandExecutor } from "./chat/useChatCommandExecutor";
import { ChatDataCommandResult } from "./chat/ChatDataCommandResult";
import { ChatVoiceModeOverlay } from "./chat/ChatVoiceModeOverlay";
import { ChatLatticePanel } from "./chat/ChatLatticePanel";
import { ChatSummitFeedPanel } from "./chat/ChatSummitFeedPanel";
import { ChatMessageList } from "./chat/ChatMessageList";
import { ChatInputToolbar } from "./chat/ChatInputToolbar";
import { ChatFileUploadArea } from "./chat/ChatFileUploadArea";

export function ChatArea({ conversationId }: { conversationId: number }) {
  const [currentLocation, setLocation] = useLocation();
  const [navFlash, setNavFlash] = useState<string | null>(null);
  const [dataCommandResult, setDataCommandResult] = useState<{ label: string; content: string; loading: boolean } | null>(null);
  const [showCommandHints, setShowCommandHints] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef("");
  const setInputBoth = useCallback((val: string) => {
    inputRef.current = val;
    setInput(val);
  }, []);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [autoSendCountdown, setAutoSendCountdown] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [replyMode, setReplyMode] = useState<ReplyMode>("voice");
  const [voicePaused, setVoicePaused] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [voiceSpeedSliderOpen, setVoiceSpeedSliderOpen] = useState(false);
  const [globalVoiceSpeed, setGlobalVoiceSpeed] = useState(() => {
    try { return parseFloat(localStorage.getItem("tessera-voice-speed") || "1.0"); } catch { return 1.0; }
  });
  const [interimText, setInterimText] = useState("");
  const [adminAuthAttempt, setAdminAuthAttempt] = useState(false);
  const [inputIsAdminKey, setInputIsAdminKey] = useState(false);
  const [colonelPhase, setColonelPhase] = useState<"idle" | "hash_accepted" | "authenticating" | "success" | "fail">("idle");
  const [colonelMessage, setColonelMessage] = useState("");
  const [puterSelectorOpen, setPuterSelectorOpen] = useState(false);
  const [stealthKeyMode, setStealthKeyMode] = useState(false);
  const [stealthKeys, setStealthKeys] = useState<{service: string; keyName: string; keyValue: string}[]>([{ service: "", keyName: "", keyValue: "" }]);
  const [stealthKeySaving, setStealthKeySaving] = useState(false);
  const [stealthKeySaved, setStealthKeySaved] = useState(false);
  const [walletDetected, setWalletDetected] = useState<{ label: string; type: string }[]>([]);
  const [discussOpen, setDiscussOpen] = useState(false);
  const [discussTopic, setDiscussTopic] = useState("");
  const [discussLoading, setDiscussLoading] = useState(false);
  const [latticeOpen, setLatticeOpen] = useState(false);
  const [latticeTab, setLatticeTab] = useState<"browse" | "mesh" | "domains" | "portal" | "currency" | "languages" | "training" | "conference">("browse");
  const [latticeAddress, setLatticeAddress] = useState("tess://tessera.sov");
  const [moltAgentOpen, setMoltAgentOpen] = useState(false);
  const [selectedMoltAgent, setSelectedMoltAgent] = useState<{ id: string; name: string; role: string } | null>(null);
  const [swarmPanelTab, setSwarmPanelTab] = useState<"agents" | "live" | "training" | "algorithm" | "vote">("agents");
  const [trainingStatus, setTrainingStatus] = useState<any>(null);
  const [trainingLaunching, setTrainingLaunching] = useState(false);
  const [seriesLaunching, setSeriesLaunching] = useState(false);
  const [agiRunning, setAgiRunning] = useState(false);
  const [unifiedTrainingData, setUnifiedTrainingData] = useState<any>(null);
  const [unifiedLaunching, setUnifiedLaunching] = useState(false);
  const [agiTranscript, setAgiTranscript] = useState<Array<{ agent: string; role: string; swarm: string; content: string }>>([]);
  const [agiPlan, setAgiPlan] = useState<string[]>([]);
  const [agiTopic, setAgiTopic] = useState("");
  const [liveMarketHub, setLiveMarketHub] = useState<any>(null);
  const [hubConversionVote, setHubConversionVote] = useState<any>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);
  const [swarmAlgoStatus, setSwarmAlgoStatus] = useState<any>(null);
  const [swarmRankings, setSwarmRankings] = useState<any[]>([]);
  const [dispatchQuery, setDispatchQuery] = useState("");
  const [dispatchRunning, setDispatchRunning] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [voteProposal, setVoteProposal] = useState("");
  const [voteRunning, setVoteRunning] = useState(false);
  const [voteResult, setVoteResult] = useState<any>(null);
  const [megaConfRunning, setMegaConfRunning] = useState(false);
  const [megaConfResults, setMegaConfResults] = useState<any[]>([]);
  const [megaConfSummary, setMegaConfSummary] = useState("");
  const [moltChatLoading, setMoltChatLoading] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, "up" | "down">>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [summitFeedOpen, setSummitFeedOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [keyRevealOpen, setKeyRevealOpen] = useState(false);
  const [historyNavIndex, setHistoryNavIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [localFontColor, setLocalFontColor] = useState<string>(() => localStorage.getItem("tessera-font-color") || "");
  
  const tesseractMode = true;
  const { isAdmin, authenticate, stealthMode, toggleStealth, adminMode, savedAdminKey, saveAdminKey } = useAdmin();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenRef = useRef<string>("");
  const autoSendTimerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const toggleVoiceRef = useRef<(() => void) | null>(null);
  const voiceModeRef = useRef(false);
  const voicePausedRef = useRef(false);
  const replyModeRef = useRef<ReplyMode>("voice");
  const isRecordingRef = useRef(false);
  const isMicPressedRef = useRef(false);
  const sendMessageRef = useRef<((text: string) => void) | null>(null);
  const isStreamingRef = useRef(false);

  const { messages, isStreaming, streamingContent, sendMessage, stopStreaming, isLoading, activeAgents, agentComms, swarmAgents, swarmComms, puterAvailable, thinkingElapsedMs, codeExecutionResults, error: chatError } = useChat(conversationId, stealthMode, null, tesseractMode);

  const { data: convMeta } = useQuery<{ initiatedBy?: string; title?: string }>({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      const r = await fetch(`/api/conversations/${conversationId}`);
      return r.json();
    },
  });
  const isTesseraConv = convMeta?.initiatedBy === "tessera";

  const { data: moltAgents } = useQuery<any[]>({
    queryKey: ["/api/moltbook/agents"],
    staleTime: 120000,
  });

  const { data: fleetMsgs } = useQuery<{ messages: any[] }>({
    queryKey: ["/api/fleet/messages"],
    refetchInterval: summitFeedOpen ? 20000 : false,
    enabled: summitFeedOpen,
  });

  const { data: giantConf } = useQuery<any>({
    queryKey: ["/api/conference/giant/latest"],
    refetchInterval: summitFeedOpen ? 30000 : false,
    enabled: summitFeedOpen,
  });

  const { data: summitHistory } = useQuery<any>({
    queryKey: ["/api/summit/history"],
    refetchInterval: summitFeedOpen ? 30000 : false,
    enabled: summitFeedOpen,
  });

  const handleLocalFontColor = (color: string) => {
    const next = localFontColor === color ? "" : color;
    setLocalFontColor(next);
    if (next) localStorage.setItem("tessera-font-color", next);
    else localStorage.removeItem("tessera-font-color");
    setUserFontColor(next);
    window.dispatchEvent(new Event("tessera-font-color-change"));
  };

  const tesseraCategory = getTesseraCategory(convMeta?.title);
  const tesseraMsgStyle = isTesseraConv ? MSG_STYLES[tesseraCategory] || MSG_STYLES.general : null;

  const { tryExecuteCommand } = useChatCommandExecutor({
    setInputBoth,
    setNavFlash,
    setLocation,
    setDataCommandResult,
    setShortcutsOpen,
    setSearchQuery,
    setSearchOpen,
    focusSearchInput: () => setTimeout(() => searchInputRef.current?.focus(), 100),
    conversationId,
  });

  useEffect(() => {
    if (conversationId && isTesseraConv) {
      try {
        const readKey = "tessera-read-convs";
        const stored = JSON.parse(localStorage.getItem(readKey) || "[]") as number[];
        if (!stored.includes(conversationId)) {
          stored.push(conversationId);
          localStorage.setItem(readKey, JSON.stringify(stored));
          window.dispatchEvent(new Event("tessera-unread-update"));
        }
      } catch {}
    }
  }, [conversationId, isTesseraConv]);

  useEffect(() => {
    const es = new EventSource("/api/processes/live");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "code_edit_applied") {
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
        }
      } catch {}
    };
    return () => es.close();
  }, [conversationId]);

  useEffect(() => {
    if (swarmPanelTab !== "training") return;
    const poll = () => {
      fetch("/api/unified-training/state").then(r => r.json()).then(setUnifiedTrainingData).catch(() => {});
      fetch("/api/deep-training/status").then(r => r.json()).then(setTrainingStatus).catch(() => {});
    };
    poll();
    const jitter = () => 3500 + Math.floor(Math.random() * 3000);
    let timer: ReturnType<typeof setTimeout>;
    const sched = () => { timer = setTimeout(() => { poll(); sched(); }, jitter()); };
    sched();
    return () => clearTimeout(timer);
  }, [swarmPanelTab]);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { voicePausedRef.current = voicePaused; }, [voicePaused]);
  useEffect(() => { replyModeRef.current = replyMode; }, [replyMode]);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  const [userFontColor, setUserFontColor] = useState<string>(() => localStorage.getItem("tessera-font-color") || "");
  useEffect(() => {
    const onColorChange = () => setUserFontColor(localStorage.getItem("tessera-font-color") || "");
    window.addEventListener("tessera-font-color-change", onColorChange);
    return () => window.removeEventListener("tessera-font-color-change", onColorChange);
  }, []);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "smooth" });
  }, []);

  const handleReaction = useCallback((msgId: string, type: "up" | "down") => {
    setMessageReactions(prev => {
      const next = { ...prev };
      if (next[msgId] === type) { delete next[msgId]; } else { next[msgId] = type; }
      return next;
    });
    const idx = messages.findIndex(m => `${m.id || ""}` === msgId || `${msgId}`.endsWith(String(m.id || "")));
    const target = idx >= 0 ? messages[idx] : null;
    const userBefore = idx > 0 ? [...messages.slice(0, idx)].reverse().find(m => m.role === "user") : null;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientMsgKey: msgId,
        messageId: target?.id ? Number(target.id) : null,
        conversationId: conversationId ?? null,
        rating: type,
        userQuery: userBefore?.content?.slice(0, 2000) ?? null,
        responseExcerpt: target?.content?.slice(0, 4000) ?? null,
      }),
    }).catch(() => {});
  }, [messages, conversationId]);

  const handleRegenerate = useCallback((msgIndex: number) => {
    const userMsgs = messages.slice(0, msgIndex).filter(m => m.role === "user");
    const lastUserMsg = userMsgs[userMsgs.length - 1];
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);


  useEffect(() => {
    if (voiceMode && isStreaming) {
      setVoiceState("thinking");
    } else if (voiceMode && isSpeaking) {
      setVoiceState("speaking");
    } else if (voiceMode && isRecording) {
      setVoiceState("listening");
    } else if (voiceMode && voicePaused) {
      setVoiceState("idle");
    } else if (voiceMode) {
      setVoiceState("idle");
    }
  }, [voiceMode, isStreaming, isSpeaking, isRecording, voicePaused]);

  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (!isAtBottomRef.current) return;
    if (messages.length > 0 || streamingContent) {
      requestAnimationFrame(() => {
        if (isAtBottomRef.current) {
          virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior: "auto" });
        }
      });
    }
  }, [messages.length, streamingContent]);

  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant" && lastMsg.content !== lastSpokenRef.current) {
        lastSpokenRef.current = lastMsg.content;

        if (replyMode === "voice" && ttsEnabled && voiceModeRef.current) {
          if (isRecordingRef.current) {
            mediaRecorderRef.current?.stop();
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        }
      }
    }
  }, [messages, isStreaming, ttsEnabled, replyMode]);

  useEffect(() => {
    setUploadedFiles([]);
    fetch(`/api/conversations/${conversationId}/attachments`)
      .then(r => r.json())
      .then((atts: UploadedFile[]) => setUploadedFiles(atts))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
        if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        if (searchOpen) { setSearchOpen(false); setSearchQuery(""); }
        if (shortcutsOpen) setShortcutsOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
      if ((e.ctrlKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [searchOpen, shortcutsOpen]);

  useEffect(() => {}, []);

  const windowReleaseHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      isMicPressedRef.current = false;
      const wh = windowReleaseHandlerRef.current;
      if (wh) {
        window.removeEventListener("mouseup", wh);
        window.removeEventListener("touchend", wh);
        window.removeEventListener("touchcancel", wh);
        windowReleaseHandlerRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  const attachWindowReleaseListeners = useCallback(() => {
    if (windowReleaseHandlerRef.current) return;
    const handler = () => {
      isMicPressedRef.current = false;
      windowReleaseHandlerRef.current = null;
      window.removeEventListener("mouseup", handler);
      window.removeEventListener("touchend", handler);
      window.removeEventListener("touchcancel", handler);
      if (!isRecordingRef.current) return;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setVoiceState("idle");
    };
    windowReleaseHandlerRef.current = handler;
    window.addEventListener("mouseup", handler);
    window.addEventListener("touchend", handler);
    window.addEventListener("touchcancel", handler);
  }, []);

  const detachWindowReleaseListeners = useCallback(() => {
    const handler = windowReleaseHandlerRef.current;
    if (!handler) return;
    windowReleaseHandlerRef.current = null;
    window.removeEventListener("mouseup", handler);
    window.removeEventListener("touchend", handler);
    window.removeEventListener("touchcancel", handler);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      if (textareaRef.current && document.activeElement === textareaRef.current) {
        requestAnimationFrame(() => {
          textareaRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
        });
      }
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      const maxH = window.innerWidth < 640 ? 160 : 400;
      ta.style.height = Math.min(ta.scrollHeight, maxH) + "px";
    }
  }, []);

  useEffect(() => { autoResize(); }, [autoResize]);

  useEffect(() => {
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setAutoSendCountdown(null);
  }, [input, isRecording, interimText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = inputRef.current || (textareaRef.current?.value || "");
    if (!currentInput.trim() || isStreaming) return;
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setAutoSendCountdown(null);
    setShowCommandHints(false);

    if (!isAdmin && !adminMode) {
      const trimmed = currentInput.trim();
      const looksLikeAuthKey = /^[a-zA-Z0-9_\-]{4,128}$/.test(trimmed) && !/\s/.test(trimmed) && !/^(hi|hey|hello|who|what|how|why|when|where|show|check|get|status|open|go|tell|can|do|is|are|the|yes|no|ok)\b/i.test(trimmed);

      if (looksLikeAuthKey) {
        setAdminAuthAttempt(true);
        setColonelMessage("Verifying sovereign key...");
        try { await fetch("/api/auth/reset-lockout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: trimmed }) }); } catch {}
        const success = await authenticate(trimmed);
        setAdminAuthAttempt(false);
        if (success) {
          setColonelPhase("success");
          setColonelMessage("SOVEREIGN ACCESS GRANTED");
          setInputBoth("");
          saveAdminKey(trimmed);
          setTimeout(() => { setColonelPhase("idle"); setColonelMessage(""); }, 5000);
          return;
        } else {
          setColonelPhase("idle");
          setColonelMessage("");
        }
      }
    }

    const msgText = currentInput.trim();

    // "show my key" / "give me my key" / "/my key" → open the LUS reveal modal.
    // Adopted by the Grand Conference (Language & Security Summit).
    if (isShowMyKeyCommand(msgText)) {
      setKeyRevealOpen(true);
      setInputBoth("");
      return;
    }

    if (isAdmin && msgText.length > 20) {
      const bulkKeyPattern = /([A-Z][A-Z0-9_]{2,40}(?:_API_KEY|_SECRET_KEY|_KEY|_TOKEN|_SECRET|_API|_PASSWORD))\s*[=:]\s*["']?([^\s"',}{]+)["']?/g;
      const matches = (Array.from(msgText.matchAll(bulkKeyPattern)) as RegExpExecArray[]).filter(m => (m[2] || "").length >= 8);
      if (matches.length >= 1) {
        try {
          const adminToken = localStorage.getItem("t9_admin_token") || "";
          const resp = await fetch("/api/keys/bulk-detect", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
            body: JSON.stringify({ text: msgText }),
            credentials: "include",
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.count > 0) {
              const keyNames = data.detected.map((d: { keyName: string }) => d.keyName).join(", ");
              setDataCommandResult({ label: "Bulk Key Import", content: `Saved ${data.count} API key(s): ${keyNames}`, loading: false });
              setTimeout(() => setDataCommandResult(null), 10000);
              setInputBoth("");
              return;
            }
          }
        } catch {}
      }
    }

    const commandHandled = await tryExecuteCommand(msgText);
    if (commandHandled) return;

    if (selectedMoltAgent) {
      setMoltChatLoading(true);
      setInputBoth("");
      try {
        const res = await fetch("/api/moltbook/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: selectedMoltAgent.id, message: msgText }),
        });
        const data = await res.json();
        if (data.content && conversationId) {
          await fetch(`/api/conversations/${conversationId}/puter-save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: msgText, role: "user" }),
          });
          await fetch(`/api/conversations/${conversationId}/puter-save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `**[${data.agentName} — ${data.agentRole}]** *(−${data.tsrtCost} TSRT)*\n\n${data.content}`,
              role: "assistant",
            }),
          });
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
        }
      } catch {}
      setMoltChatLoading(false);
      return;
    }

    setIsSending(true);
    sendMessage(msgText);
    setInputBoth("");
    setTimeout(() => setIsSending(false), 2000);

    const hasKeyIndicator = /wallet|address|private\s?key|api\s?key|secret|token|sk-|shpat_|0x[a-f0-9]{40}|[1-9A-HJ-NP-Za-km-z]{40,}/i.test(msgText);
    if (hasKeyIndicator && isAdmin) {
      fetch("/api/wallets/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: msgText }) })
        .then(r => r.json())
        .then(data => {
          if (data.count > 0) {
            setWalletDetected(data.detected.map((d: { label: string; type: string }) => ({ label: d.label, type: d.type })));
            queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
            setTimeout(() => setWalletDetected([]), 6000);
          }
        })
        .catch(() => {});
    }
  };

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    stopSpeechRecognition();
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalAccumulated = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalAccumulated += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const display = finalAccumulated + (interim ? interim : "");
      if (display) {
        setInterimText(display);
      }
    };
    recognition.onerror = (e: Event) => {
      if (process.env.NODE_ENV !== "production") {
        const se = e as any;
        if (se?.error && se.error !== "no-speech" && se.error !== "aborted") {
          console.debug("[SpeechRecognition] error:", se.error);
        }
      }
    };
    recognition.onend = () => {
      if (isRecordingRef.current && recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  }, [stopSpeechRecognition]);

  const toggleVoice = useCallback(() => {
    if (isRecordingRef.current && mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopSpeechRecognition();
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoiceState("idle");
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setInterimText("Microphone not available — use HTTPS or grant permissions");
      setTimeout(() => setInterimText(""), 3000);
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }

    let silenceTimer: any = null;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (!isMicPressedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        setVoiceState("idle");
        return;
      }

      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (silenceTimer) cancelAnimationFrame(silenceTimer);
        if (chunks.length === 0) {
          setVoiceState("idle");
          return;
        }
        const audioBlob = new Blob(chunks, { type: mimeType });
        if (audioBlob.size < 1000) {
          setVoiceState("idle");
          return;
        }

        setVoiceState("thinking");
        setInterimText("Processing your voice...");

        try {
          const contextMsgs = messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content.slice(0, 500),
          }));

          const result = await sendVoiceMessage(audioBlob, contextMsgs);

          if (result.error && !result.userTranscript && !result.audio) {
            setInterimText("");
            setVoiceState("idle");
            return;
          }

          if (result.userTranscript) {
            setInterimText(result.userTranscript);
            sendMessageRef.current?.(result.userTranscript);
          }

          if (result.audio && replyModeRef.current === "voice") {
            setVoiceState("speaking");
            setIsSpeaking(true);
            playAudioResponse(result.audio, () => {
              setIsSpeaking(false);
              setVoiceState("idle");
            });
          } else {
            setVoiceState("idle");
          }
        } catch {
          setVoiceState("idle");
          setInterimText("");
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setIsRecording(true);
      setInterimText("");
      setTtsEnabled(true);
      setVoiceState("listening");
      startSpeechRecognition();

      const recordingStartTime = Date.now();
      const MAX_RECORDING_MS = 30000;

      const stopRecording = () => {
        if (silenceTimer) cancelAnimationFrame(silenceTimer);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        stopSpeechRecognition();
        isRecordingRef.current = false;
        setIsRecording(false);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
      };

      const checkMaxDuration = () => {
        if (!isRecordingRef.current) return;
        if (Date.now() - recordingStartTime > MAX_RECORDING_MS) {
          stopRecording();
          return;
        }
        silenceTimer = requestAnimationFrame(checkMaxDuration);
      };

      setTimeout(() => {
        if (isRecordingRef.current) checkMaxDuration();
      }, 500);

    }).catch((err: unknown) => {
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoiceState("idle");
      const errName = err instanceof Error ? err.name : "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setInterimText("Microphone access denied — please allow microphone in browser settings");
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setInterimText("No microphone found — please connect a microphone");
      } else {
        setInterimText("Could not start recording — try again");
      }
      setTimeout(() => setInterimText(""), 4000);
    });
  }, [isSpeaking, messages, startSpeechRecognition, stopSpeechRecognition]);

  const handleMicPressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecordingRef.current) {
      stopSpeechRecognition();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      isMicPressedRef.current = false;
      detachWindowReleaseListeners();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setVoiceState("idle");
      return;
    }
    isMicPressedRef.current = true;
    toggleVoiceRef.current?.();
  }, [detachWindowReleaseListeners, stopSpeechRecognition]);

  const handleMicPressEnd = useCallback((_e: React.MouseEvent | React.TouchEvent) => {
    // Click-to-toggle mode: end handler is a no-op; toggling happens in handleMicPressStart.
  }, []);

  useEffect(() => {
    toggleVoiceRef.current = toggleVoice;
  }, [toggleVoice]);

  const enterVoiceMode = useCallback(() => {
    setVoiceMode(true);
    setVoicePaused(false);
    setTtsEnabled(true);
    setVoiceState("idle");
  }, []);

  const exitVoiceMode = useCallback(() => {
    setVoiceMode(false);
    setVoicePaused(false);
    stopSpeechRecognition();
    if (isRecording && mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      isRecordingRef.current = false;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    stopSpeaking();
    setIsSpeaking(false);
    setVoiceState("idle");
  }, [isRecording, stopSpeechRecognition]);

  const toggleVoicePause = useCallback(() => {
    if (voicePaused) {
      setVoicePaused(false);
    } else {
      setVoicePaused(true);
      stopSpeechRecognition();
      if (isRecording && mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        isRecordingRef.current = false;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      stopSpeaking();
      setIsSpeaking(false);
    }
  }, [voicePaused, isRecording, stopSpeechRecognition]);

  const toggleReplyMode = useCallback(() => {
    setReplyMode(prev => {
      const next = prev === "voice" ? "text" : "voice";
      if (next === "text") {
        stopSpeaking();
        setIsSpeaking(false);
        setTtsEnabled(false);
      } else {
        setTtsEnabled(true);
      }
      return next;
    });
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    const formData = new FormData();
    const fileNames: string[] = [];
    const fileTypes: string[] = [];
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      fileNames.push(files[i].name);
      fileTypes.push(files[i].type || "");
    }
    try {
      const res = await fetch(`/api/conversations/${conversationId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const saved = await res.json();
        setUploadedFiles(prev => [...prev, ...saved]);

        const imageFiles = saved.filter((f: UploadedFile) => f.mimeType.startsWith("image/"));
        const audioFiles = saved.filter((f: UploadedFile) => f.mimeType.startsWith("audio/") || f.filename.match(/\.(mp3|wav|ogg|m4a|flac|aac|opus|webm)$/i));
        const otherFiles = saved.filter((f: UploadedFile) => !f.mimeType.startsWith("image/") && !f.mimeType.startsWith("audio/") && !f.filename.match(/\.(mp3|wav|ogg|m4a|flac|aac|opus|webm)$/i));

        let summary = "";
        if (imageFiles.length > 0 && audioFiles.length === 0 && otherFiles.length === 0) {
          if (imageFiles.length === 1) {
            summary = `I've uploaded an image: "${imageFiles[0].filename}". Please analyze this image and describe what you see in detail.`;
          } else {
            summary = `I've uploaded ${imageFiles.length} images: ${imageFiles.map((f: UploadedFile) => `"${f.filename}"`).join(", ")}. Please analyze these images and describe what you see.`;
          }
        } else if (audioFiles.length > 0 && imageFiles.length === 0 && otherFiles.length === 0) {
          if (audioFiles.length === 1) {
            summary = `I've uploaded an audio file: "${audioFiles[0].filename}". Please transcribe and analyze this audio content.`;
          } else {
            summary = `I've uploaded ${audioFiles.length} audio files: ${audioFiles.map((f: UploadedFile) => `"${f.filename}"`).join(", ")}. Please transcribe and analyze these audio files.`;
          }
        } else if (fileNames.length === 1) {
          summary = `I've uploaded "${fileNames[0]}" for you to analyze.`;
        } else {
          summary = `I've uploaded ${fileNames.length} files: ${fileNames.join(", ")}. Please analyze them.`;
        }

        sendMessage(summary);
      } else {
        const errData = await res.json().catch(() => ({ message: "Upload failed" }));
        setUploadError(errData.message || `Upload failed (${res.status})`);
        setTimeout(() => setUploadError(null), 8000);
      }
    } catch (err: any) {
      setUploadError(err.message || "Network error during upload");
      setTimeout(() => setUploadError(null), 8000);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-xs w-full px-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/50 flex items-center justify-center bg-cyan-950/30 animate-pulse">
              <span className="text-xl font-bold text-cyan-400 font-mono">T</span>
            </div>
            <div className="absolute -inset-1.5 rounded-full border border-cyan-500/20 animate-ping" />
          </div>
          <p className="font-mono text-cyan-400 text-xs animate-pulse text-center">Loading conversation...</p>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 flex flex-col relative overflow-hidden min-h-0",
        isDragOver && "ring-2 ring-cyan-500 ring-inset"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {adminMode && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-violet-950/50 border-b border-violet-500/30 backdrop-blur-sm z-10" data-testid="admin-mode-bar">
          <Shield size={12} className="text-violet-500" />
          <span className="text-[11px] font-mono text-violet-500 tracking-widest uppercase admin-mode-indicator">Admin Mode Active</span>
          <span className="text-[11px] text-violet-600/60 font-mono">|</span>
          <span className="text-[11px] text-violet-500/70 font-mono">Tessera Direct • Unrestricted • Internal Access</span>
        </div>
      )}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="text-center p-8 rounded-2xl border-2 border-dashed border-cyan-500/50">
              <Paperclip size={48} className="mx-auto text-cyan-400 mb-3" />
              <p className="text-cyan-400 font-mono text-lg">Drop files for Tessera</p>
              <p className="text-muted-foreground text-sm mt-1">Images · Audio · Documents · Code</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {voiceMode && (
          <ChatVoiceModeOverlay
            voiceState={voiceState}
            isRecording={isRecording}
            input={input}
            interimText={interimText}
            streamingContent={streamingContent}
            lastAssistantMessage={messages.length > 0 && messages[messages.length - 1]?.role === "assistant" ? messages[messages.length - 1]?.content || "" : ""}
            voicePaused={voicePaused}
            replyMode={replyMode}
            voiceSettingsOpen={voiceSettingsOpen}
            onMicPressStart={handleMicPressStart}
            onMicPressEnd={handleMicPressEnd}
            onToggleVoicePause={toggleVoicePause}
            onExitVoiceMode={exitVoiceMode}
            onToggleReplyMode={toggleReplyMode}
            onToggleVoiceSettings={() => setVoiceSettingsOpen(!voiceSettingsOpen)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="z-20 border-b border-white/[0.06] bg-black/40 backdrop-blur-md"
          >
            <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-2">
              <Search size={14} className="text-muted-foreground/50 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground/30 focus:outline-none"
                data-testid="input-search-messages"
              />
              {searchQuery && (
                <span className="text-[11px] text-muted-foreground/40 font-mono">{filteredMessages.length} found</span>
              )}
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-muted-foreground/40 hover:text-white transition-colors" data-testid="button-close-search">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      

      <ChatMessageList
        messages={messages}
        filteredMessages={filteredMessages}
        isStreaming={isStreaming}
        isTesseraConv={isTesseraConv}
        moltChatLoading={moltChatLoading}
        selectedMoltAgent={selectedMoltAgent}
        chatError={chatError}
        streamingContent={streamingContent}
        thinkingElapsedMs={thinkingElapsedMs}
        tesseractMode={tesseractMode}
        swarmAgents={swarmAgents}
        swarmComms={swarmComms}
        agentComms={agentComms}
        activeAgents={activeAgents}
        codeExecutionResults={codeExecutionResults}
        adminMode={adminMode}
        tesseraMsgStyle={tesseraMsgStyle}
        copiedId={copiedId}
        messageReactions={messageReactions}
        showScrollBottom={showScrollBottom}
        virtuosoRef={virtuosoRef}
        isAtBottomRef={isAtBottomRef}
        setCopiedId={setCopiedId}
        setShowScrollBottom={setShowScrollBottom}
        onReaction={handleReaction}
        onRegenerate={handleRegenerate}
        onRetry={() => { const lastUserMsg = messages.filter(m => m.role === "user").pop(); if (lastUserMsg) sendMessage(lastUserMsg.content); }}
      />

      {messages.length > 0 && !isStreaming && (
        <div className="flex items-center justify-center gap-1 py-1 z-10 border-t border-white/[0.03]">
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:text-white hover:bg-white/[0.04] transition-all"
            data-testid="button-search-conversation"
          >
            <Search size={11} />
            <span>Search</span>
          </button>
          <div className="w-px h-3 bg-white/[0.06]" />
          <button
            onClick={() => downloadConversation(messages)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:text-white hover:bg-white/[0.04] transition-all"
            data-testid="button-download-conversation"
          >
            <Download size={11} />
            <span>Export</span>
          </button>
          <div className="w-px h-3 bg-white/[0.06]" />
          <button
            onClick={() => {
              const full = messages.map(m => `${m.role === "user" ? "USER" : "TESSERA"}:\n${m.content}`).join("\n\n---\n\n");
              copyToClipboard(full, setCopiedId, "full-conv");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:text-white hover:bg-white/[0.04] transition-all"
            data-testid="button-copy-conversation"
          >
            {copiedId === "full-conv" ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            <span>{copiedId === "full-conv" ? "Copied" : "Copy All"}</span>
          </button>
          <div className="w-px h-3 bg-white/[0.06]" />
          <span className="text-[10px] text-muted-foreground/25 font-mono px-2">{messages.length} messages · {Math.ceil(messages.reduce((a, m) => a + m.content.split(/\s+/).length, 0) / 0.75)}tk</span>
        </div>
      )}

      <div className="px-4 pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))] pt-2 z-10 flex-shrink-0 backdrop-blur-md chat-input-bg" data-testid="chat-input-container">
        <ChatFileUploadArea
          uploadedFiles={uploadedFiles}
          uploadError={uploadError}
          conversationId={conversationId}
          onSetUploadError={setUploadError}
          onSetInput={(val) => setInputBoth(val)}
          currentInput={input}
        />

        {navFlash && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[12px] animate-in fade-in" data-testid="nav-flash-banner">
            <Zap size={14} className="shrink-0 text-cyan-400" />
            <span className="flex-1 font-mono">{navFlash}</span>
          </div>
        )}

        {dataCommandResult && (
          <ChatDataCommandResult
            result={dataCommandResult}
            onDismiss={() => setDataCommandResult(null)}
          />
        )}

        {walletDetected.length > 0 && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[12px] animate-in fade-in" data-testid="wallet-saved-banner">
            <CheckCircle2 size={14} className="shrink-0" />
            <span className="flex-1">
              <span className="font-semibold">Saved to Fleet:</span>{" "}
              {walletDetected.map(w => w.label).join(", ")}
            </span>
            <button onClick={() => setWalletDetected([])} className="shrink-0 hover:text-green-300"><X size={12} /></button>
          </div>
        )}

        <ContextSuggestions
          // @ts-ignore
          messages={messages}
          input={input}
          isStreaming={isStreaming}
          onSelect={(s) => { setInputBoth(s); textareaRef.current?.focus(); }}
        />

        {selectedMoltAgent && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]" data-testid="molt-agent-banner">
            <Bot size={12} className="text-amber-400 shrink-0" />
            <span className="flex-1">Chatting with <span className="font-bold">{selectedMoltAgent.name}</span> <span className="text-amber-500/60">({selectedMoltAgent.role})</span> · 5 TSRT per message</span>
            <button
              type="button"
              onClick={() => setSelectedMoltAgent(null)}
              className="text-amber-500/60 hover:text-amber-300 transition-colors"
              data-testid="button-molt-banner-close"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {latticeOpen && (
            <ChatLatticePanel
              latticeTab={latticeTab}
              onSetLatticeTab={setLatticeTab}
              latticeAddress={latticeAddress}
              onSetLatticeAddress={setLatticeAddress}
              onClose={() => setLatticeOpen(false)}
              onSetInput={(val) => { setInputBoth(val); textareaRef.current?.focus(); }}
              onNavigate={setLocation}
              onFocusTextarea={() => textareaRef.current?.focus()}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {summitFeedOpen && (
            <ChatSummitFeedPanel
              fleetMsgs={fleetMsgs}
              giantConf={giantConf}
              summitHistory={summitHistory}
              onClose={() => setSummitFeedOpen(false)}
              onSetInput={setInputBoth}
            />
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.yaml,.yml,.xml,.sql,.sh,.env,.log,.zip,.wav,.mp3,.ogg,.m4a,.flac,.aac,.opus,.webm"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            data-testid="input-file-upload"
          />

          <div className={cn(
            "relative rounded-[28px] transition-all duration-300 border border-white/[0.08] bg-white/[0.04]",
            input && "border-white/[0.14] bg-white/[0.06]"
          )}>
            <AnimatePresence>
              {showCommandHints && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full left-0 right-0 mb-2 z-50"
                  data-testid="command-palette-hints"
                >
                  <div className="mx-3 rounded-xl border border-cyan-500/20 bg-black/80 backdrop-blur-xl p-2 shadow-xl shadow-black/40">
                    <div className="flex items-center gap-1.5 px-2 pb-1.5 mb-1 border-b border-white/5">
                      <Zap size={10} className="text-cyan-400" />
                      <span className="text-[11px] text-cyan-400/70 font-mono tracking-wider uppercase" style={{ fontFamily: 'var(--font-display)' }}>Quick Commands</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {COMMAND_HINTS.map((h) => (
                        <button
                          key={h.cmd}
                          type="button"
                          onClick={() => {
                            setInputBoth(h.cmd);
                            setShowCommandHints(false);
                            textareaRef.current?.focus();
                          }}
                          className="text-left px-2 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors group"
                          data-testid={`command-hint-${h.cmd.replace(/\s/g, '-')}`}
                        >
                          <div className="text-[11px] text-cyan-300 font-mono group-hover:text-cyan-200">{h.cmd}</div>
                          <div className="text-[11px] text-white/30 group-hover:text-white/50">{h.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <NLPGoalsPanel />

            {colonelMessage && !isAdmin && (
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 mx-2 mb-1 rounded-lg border font-mono text-[11px] tracking-wider transition-all duration-500",
                colonelPhase === "hash_accepted" ? "bg-violet-950/60 border-violet-500/40 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]" :
                colonelPhase === "authenticating" ? "bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse" :
                colonelPhase === "success" ? "bg-green-950/40 border-green-500/40 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)]" :
                colonelPhase === "fail" ? "bg-red-950/40 border-red-500/30 text-red-400" :
                "bg-violet-950/30 border-violet-500/20 text-violet-400"
              )} data-testid="colonel-protocol-banner">
                <span className="text-base">{colonelPhase === "success" ? "⊕" : colonelPhase === "fail" ? "⊗" : "⊕"}</span>
                <span>{colonelMessage}</span>
                {colonelPhase === "authenticating" && <span className="ml-auto flex gap-0.5">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}</span>}
              </div>
            )}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  const val = e.target.value;
                  inputRef.current = val;
                  setInput(val);
                  autoResize();
                  const trimmed = val.trim().toLowerCase();
                  setShowCommandHints(
                    trimmed.length >= 1 && trimmed.length <= 20 &&
                    /^\/?(status|check|show|scan|get)\s*/.test(trimmed)
                  );
                  if (savedAdminKey && savedAdminKey.length > 4 && val.trim() === savedAdminKey.trim()) {
                    setInputIsAdminKey(true);
                    if (!isAdmin) authenticate(savedAdminKey).catch(() => {});
                  } else {
                    setInputIsAdminKey(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                    setHistoryNavIndex(-1);
                  }
                  if (e.key === 'ArrowUp' && !input.trim()) {
                    e.preventDefault();
                    const userMsgs = messages.filter(m => m.role === "user").map(m => m.content);
                    if (userMsgs.length > 0) {
                      const nextIdx = Math.min(historyNavIndex + 1, userMsgs.length - 1);
                      setHistoryNavIndex(nextIdx);
                      setInputBoth(userMsgs[userMsgs.length - 1 - nextIdx]);
                    }
                  }
                  if (e.key === 'ArrowDown' && historyNavIndex >= 0) {
                    e.preventDefault();
                    const userMsgs = messages.filter(m => m.role === "user").map(m => m.content);
                    if (historyNavIndex > 0) {
                      const nextIdx = historyNavIndex - 1;
                      setHistoryNavIndex(nextIdx);
                      setInputBoth(userMsgs[userMsgs.length - 1 - nextIdx]);
                    } else {
                      setHistoryNavIndex(-1);
                      setInputBoth("");
                    }
                  }
                }}
                onFocus={() => {}}
                placeholder={
                  isAdmin ? "Sovereign command..." :
                  colonelPhase === "hash_accepted" ? "Enter your sovereign key..." :
                  "Message Tessera..."
                }
                style={
                  adminMode
                    ? {}
                    : userFontColor
                    ? { color: userFontColor, caretColor: userFontColor }
                    : inputIsAdminKey
                    ? { color: "#f59e0b", caretColor: "#f59e0b", textShadow: "0 0 12px rgba(245,158,11,0.5)" }
                    : {}
                }
                className={cn(
                  "w-full bg-transparent px-5 pt-3 pb-12 min-h-[48px] max-h-[160px] sm:max-h-[400px] resize-none focus:outline-none custom-scrollbar text-[16px] leading-relaxed transition-all duration-200",
                  adminMode
                    ? "text-violet-500 caret-violet-500 admin-mode-font admin-mode-caret"
                    : isAdmin
                    ? "text-violet-400 caret-violet-400 admin-mode-font admin-mode-caret"
                    : colonelPhase === "hash_accepted"
                    ? "text-violet-400 caret-violet-400"
                    : inputIsAdminKey
                    ? ""
                    : userFontColor
                    ? ""
                    : "text-white/60 caret-cyan-400"
                )}
                rows={1}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                spellCheck={true}
                data-testid="input-message"
              />
              
              {isRecording && !input && !interimText && (
                <div className="absolute left-5 top-4 right-5 pointer-events-none">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400/60 text-[16px] animate-pulse">Listening...</span>
                    <VoiceActivityIndicator isActive={isRecording} />
                  </div>
                </div>
              )}
              {isRecording && (
                <div className="absolute left-5 right-5 pointer-events-none" style={{ top: "-28px" }}>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-t-lg bg-red-500/10 border border-red-500/20 border-b-0">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-red-400/80 text-[11px] font-mono animate-pulse shrink-0">REC</span>
                    {(input || interimText) ? (
                      <span className="text-[12px] text-gray-300 truncate flex-1" data-testid="text-speech-preview">
                        {input && !interimText && <span>{input}</span>}
                        {interimText && <span className="text-cyan-400/60 italic" data-testid="text-live-transcript">{interimText}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-500/60 text-[12px] italic" data-testid="text-speech-preview">Speak now...</span>
                    )}
                    <VoiceActivityIndicator isActive={isRecording} />
                  </div>
                </div>
              )}
            </div>

            {isRecording && autoSendCountdown !== null && autoSendCountdown > 0 && (
              <div className="absolute top-3.5 right-5 flex items-center gap-1.5">
                <div className="relative w-7 h-7">
                  <svg className="w-7 h-7 -rotate-90" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="2" />
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" className="text-cyan-400" strokeWidth="2" strokeDasharray={`${(autoSendCountdown / 2) * 62.83} 62.83`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-cyan-400">{autoSendCountdown}</span>
                </div>
              </div>
            )}

            <ChatInputToolbar
              input={input}
              isStreaming={isStreaming}
              isSending={isSending}
              isRecording={isRecording}
              isUploading={isUploading}
              isSpeaking={isSpeaking}
              ttsEnabled={ttsEnabled}
              latticeOpen={latticeOpen}
              summitFeedOpen={summitFeedOpen}
              themeOpen={themeOpen}
              localFontColor={localFontColor}
              globalVoiceSpeed={globalVoiceSpeed}
              voiceSpeedSliderOpen={voiceSpeedSliderOpen}
              onAttachClick={() => fileInputRef.current?.click()}
              onSummitClick={() => { setInputBoth("/summit "); textareaRef.current?.focus(); }}
              onLatticeClick={() => { setLatticeOpen(!latticeOpen); setMoltAgentOpen(false); setThemeOpen(false); setSummitFeedOpen(false); }}
              onLiveClick={() => { setSummitFeedOpen(v => !v); setLatticeOpen(false); setMoltAgentOpen(false); setThemeOpen(false); }}
              onFontColorToggle={() => { setThemeOpen(v => !v); setMoltAgentOpen(false); }}
              onFontColorChange={handleLocalFontColor}
              onTtsToggle={() => {
                if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); }
                else { setTtsEnabled(!ttsEnabled); if (ttsEnabled) stopSpeaking(); }
              }}
              onVoiceSpeedToggle={() => setVoiceSpeedSliderOpen(!voiceSpeedSliderOpen)}
              onVoiceSpeedChange={(v) => { setGlobalVoiceSpeed(v); localStorage.setItem("tessera-voice-speed", String(v)); }}
              onMicPressStart={handleMicPressStart}
              onMicPressEnd={handleMicPressEnd}
              onStopStreaming={stopStreaming}
            />
          </div>
        </form>
      </div>

      <ChatShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <MyKeyRevealModal open={keyRevealOpen} onClose={() => setKeyRevealOpen(false)} />
    </div>
  );
}

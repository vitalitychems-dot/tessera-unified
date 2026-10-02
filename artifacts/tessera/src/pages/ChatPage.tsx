import { useEffect, useRef } from "react";
import { ChatArea } from "@/components/ChatArea";
import { useParams, useLocation } from "wouter";
import { useCreateConversation } from "@/hooks/use-conversations";

export default function ChatPage() {
  useEffect(() => {
    document.title = "Chat | Tessera";
    const scrollContainer = document.querySelector("[data-scroll-container]");
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, []);
  const params = useParams<{ id: string }>();
  const conversationId = params.id ? parseInt(params.id, 10) : null;
  const createConv = useCreateConversation();
  const [, navigate] = useLocation();
  const createdRef = useRef(false);

  useEffect(() => {
    if (!conversationId && !createdRef.current) {
      createdRef.current = true;
      createConv.mutate({ title: "New Chat" });
    }
  }, [conversationId]);

  return (
    <div className="flex min-h-full w-full">
      
      {conversationId ? (
        <ChatArea conversationId={conversationId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative tessera-page backdrop-blur-md">
          <div className="max-w-sm z-10">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-xs font-mono mt-3">Starting chat...</p>
          </div>
        </div>
      )}
    </div>
  );
}

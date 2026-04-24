import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Bot, Send, X, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useCurrentUser } from "@/contexts/current-user";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Log 2 hours on my current project today",
  "What did I work on this week?",
  "What tasks do I still have pending?",
  "Summarise my hours by project this week",
];

export function AiChatWidget() {
  const { currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, sending, configured, send, reset } = useAiChat();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Hide entirely until we know who the user is — avoids a half-rendered
  // widget flicker on initial load.
  if (!currentUser) return null;

  // Auto-scroll to the latest message whenever the list changes.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function handleSubmit() {
    if (!draft.trim() || sending) return;
    void send(draft);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <>
      {/* Floating launcher button */}
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className={cn(
          "fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        aria-label={open ? "Close time-tracking assistant" : "Open time-tracking assistant"}
        data-testid="ai-chat-launcher"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </Button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-20 right-5 z-40 w-[22rem] sm:w-[26rem] max-w-[calc(100vw-2.5rem)]",
            "h-[32rem] max-h-[calc(100vh-7rem)] rounded-xl border border-border bg-card shadow-2xl",
            "flex flex-col overflow-hidden",
          )}
          role="dialog"
          aria-label="Time tracking assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/40">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Time Assistant</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ask me to log time or summarise your week</p>
            </div>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={reset}
                title="Start a new conversation"
                aria-label="Start a new conversation"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Body */}
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="px-3 py-3 space-y-3 text-sm">
              {configured === false && (
                <div className="rounded-md border border-dashed border-border p-3 text-muted-foreground text-xs">
                  The assistant isn't configured yet. An administrator needs to set the <code className="font-mono">GROQ_API_KEY</code> (or <code className="font-mono">OPENAI_API_KEY</code>) environment variable and restart the API server.
                </div>
              )}
              {configured !== false && messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Hi {currentUser.name.split(" ")[0]}! Try one of these to get started:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setDraft(p); }}
                        className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-foreground transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-2",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap break-words",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : m.errored
                        ? "bg-destructive/10 text-destructive border border-destructive/30"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {m.pending ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
                      </span>
                    ) : (
                      m.content
                    )}
                    {!!m.toolCalls?.length && !m.pending && (
                      <p className="text-[10px] mt-1.5 opacity-60">
                        Used: {Array.from(new Set(m.toolCalls.map((t) => t.name))).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="border-t border-border p-2 bg-card">
            <div className="flex gap-2 items-end">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Log 2 hours on Acme today…"
                rows={1}
                className="min-h-[2.25rem] max-h-32 resize-none text-sm"
                disabled={sending || configured === false}
                aria-label="Message the time tracking assistant"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!draft.trim() || sending || configured === false}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

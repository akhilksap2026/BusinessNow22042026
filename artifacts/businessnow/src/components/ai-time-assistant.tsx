/**
 * AI Time Tracking Assistant — floating chat widget.
 *
 * Pure addon: this component owns its own state, fetches `/api/ai-chat`
 * (with `/api/ai-time-helper` as a backward-compatible alias), and
 * renders itself as a fixed bottom-right launcher. It does not modify
 * any other page or component.
 *
 * Visual contract:
 *   - Collapsed: pill-style "Time AI" button at bottom-right.
 *   - Expanded: 380×560 panel on desktop; full-screen sheet on <sm.
 *   - Empty state: 3 suggestion chips for first-message guidance.
 *   - Each assistant turn shows a row of tool-call chips below the
 *     bubble (transparency about what the model fetched).
 *   - When the model proposes entries, a confirmation card appears
 *     with Confirm / Cancel buttons. Confirm sends `confirmedEntries`
 *     back to the same endpoint, which re-issues each one through the
 *     existing POST /api/time-entries route (governance preserved).
 *
 * Session: a fresh sessionId is generated on every component mount so
 * a browser refresh starts a brand new conversation (per spec).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Send,
  X,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListTimeEntriesQueryKey,
  getGetTimeEntrySummaryQueryKey,
  getListTimesheetsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface ProposedEntry {
  projectId?: number | null;
  taskId?: number | null;
  date: string;
  hours: number;
  description: string;
  billable?: boolean;
}

interface Proposal {
  summary: string;
  entries: ProposedEntry[];
  warnings?: string[];
}

interface ToolCallSummary {
  name: string;
  ok: boolean;
  error?: string;
}

interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  proposal?: Proposal;
  toolCalls?: ToolCallSummary[];
  loggedCount?: number;
  failedCount?: number;
  failedDetails?: string;
  pending?: boolean;
}

interface WelcomePayload {
  greeting: string;
  daysSinceLastLog: number | null;
  catchUpReminder?: string;
  suggestionChips: string[];
  configured: boolean;
}

const DEFAULT_CHIPS = [
  "Log 2h on … today",
  "What's my week look like?",
  "Show my pending tasks",
];

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AITimeAssistant() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [welcome, setWelcome] = useState<WelcomePayload | null>(null);
  // Fresh sessionId per component mount → browser refresh = new server-side session.
  const [sessionId, setSessionId] = useState(() => newId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chips = useMemo(() => welcome?.suggestionChips ?? DEFAULT_CHIPS, [welcome]);

  // Fetch welcome (proactive opening message) on first open.
  useEffect(() => {
    if (!open || !currentUser || welcome !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${BASE}/api/ai-chat/welcome`, { headers: authHeaders() });
        if (!r.ok) throw new Error(String(r.status));
        const data: WelcomePayload = await r.json();
        if (!cancelled) {
          setWelcome(data);
          setTurns(t =>
            t.length === 0
              ? [{ id: newId(), role: "assistant", text: data.greeting }]
              : t,
          );
        }
      } catch {
        if (!cancelled) {
          // Soft-fall back to a static greeting.
          const fallback: WelcomePayload = {
            greeting: `Hi ${currentUser.name.split(" ")[0]} — I can help you log time fast.`,
            daysSinceLastLog: null,
            suggestionChips: DEFAULT_CHIPS,
            configured: true,
          };
          setWelcome(fallback);
          setTurns(t => (t.length === 0 ? [{ id: newId(), role: "assistant", text: fallback.greeting }] : t));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentUser, welcome]);

  // Auto-scroll on new turns.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, open]);

  // Focus input when opened.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  function invalidateTimeQueries() {
    queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTimeEntrySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
  }

  async function callApi(payload: Record<string, unknown>): Promise<any> {
    const r = await fetch(`${BASE}/api/ai-chat`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sessionId, ...payload }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText);
      throw new Error(`${r.status} ${txt}`);
    }
    return r.json();
  }

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    const userTurn: ChatTurn = { id: newId(), role: "user", text: message };
    const pendingTurn: ChatTurn = { id: newId(), role: "assistant", text: "", pending: true };
    setTurns(t => [...t, userTurn, pendingTurn]);
    try {
      const data = await callApi({ message });
      setTurns(t =>
        t.map(turn =>
          turn.id === pendingTurn.id
            ? {
                ...turn,
                text: data.reply ?? "(no reply)",
                proposal: data.proposal ?? undefined,
                toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : undefined,
                pending: false,
              }
            : turn,
        ),
      );
    } catch (err: any) {
      setTurns(t =>
        t.map(turn =>
          turn.id === pendingTurn.id
            ? { ...turn, text: `Couldn't reach the assistant. Please try again.`, pending: false }
            : turn,
        ),
      );
      toast({
        variant: "destructive",
        title: "AI assistant error",
        description: err?.message ?? "Failed to reach AI assistant.",
      });
    } finally {
      setSending(false);
    }
  }

  async function confirmProposal(turnId: string, proposal: Proposal) {
    setSending(true);
    const pendingTurn: ChatTurn = { id: newId(), role: "assistant", text: "", pending: true };
    setTurns(t => [...t, pendingTurn]);
    try {
      const data = await callApi({ confirmedEntries: proposal.entries });
      const logged = Array.isArray(data.logged) ? data.logged.length : 0;
      const errors = Array.isArray(data.errors) ? data.errors : [];
      setTurns(t =>
        t.map(turn => {
          if (turn.id === turnId) return { ...turn, proposal: undefined };
          if (turn.id === pendingTurn.id) {
            return {
              ...turn,
              text: data.reply ?? `Logged ${logged} entries.`,
              loggedCount: logged,
              failedCount: errors.length,
              failedDetails:
                errors.length > 0
                  ? errors.map((e: any) => `${e.entry?.date ?? "?"}: ${e.error}`).join("\n")
                  : undefined,
              pending: false,
            };
          }
          return turn;
        }),
      );
      if (logged > 0) invalidateTimeQueries();
      if (errors.length > 0) {
        toast({
          variant: "destructive",
          title:
            logged > 0
              ? `Logged ${logged}, but ${errors.length} failed`
              : `Couldn't log ${errors.length} ${errors.length === 1 ? "entry" : "entries"}`,
          description: errors.map((e: any) => e.error).slice(0, 3).join("\n"),
        });
      }
    } catch (err: any) {
      setTurns(t =>
        t.map(turn =>
          turn.id === pendingTurn.id
            ? { ...turn, text: `Couldn't reach the assistant.`, pending: false }
            : turn,
        ),
      );
      toast({
        variant: "destructive",
        title: "Failed to log entries",
        description: err?.message ?? "Network or server error.",
      });
    } finally {
      setSending(false);
    }
  }

  function declineProposal(turnId: string) {
    setTurns(t =>
      t.map(turn =>
        turn.id === turnId
          ? {
              ...turn,
              proposal: undefined,
              text: turn.text + "\n\n(Cancelled. Tell me what to change.)",
            }
          : turn,
      ),
    );
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  async function resetConversation() {
    const oldSession = sessionId;
    setTurns([]);
    setWelcome(null);
    setSessionId(newId());
    fetch(`${BASE}/api/ai-chat`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sessionId: oldSession, reset: true }),
    }).catch(() => {
      /* ignore */
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  if (!currentUser) return null;

  const hasUserTurn = turns.some(t => t.role === "user");

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="button-open-ai-assistant"
          className={cn(
            "fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full",
            "bg-gradient-to-br from-indigo-600 to-violet-600 text-white",
            "px-4 py-3 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40",
            "transition-all hover:scale-105 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2",
          )}
          aria-label="Open AI time tracking assistant"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Time AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-background border shadow-2xl",
            "inset-0 sm:inset-auto sm:bottom-5 sm:right-5",
            "sm:w-[380px] sm:h-[560px] sm:rounded-xl sm:border",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
          )}
          data-testid="panel-ai-assistant"
          role="dialog"
          aria-label="AI time tracking assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 p-1.5 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Time Tracking Assistant</p>
                <p className="text-[11px] text-muted-foreground">Helps you log time faster</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={resetConversation}
                title="Start over"
                data-testid="button-reset-ai-assistant"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setOpen(false)}
                title="Close"
                data-testid="button-close-ai-assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conversation */}
          <ScrollArea className="flex-1 px-3 py-3" data-testid="scroll-ai-conversation">
            <div ref={scrollRef} className="flex flex-col gap-3">
              {welcome && !welcome.configured && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                  AI assistant is not configured. Add a <code>GROQ_API_KEY</code> (or{" "}
                  <code>OPENAI_API_KEY</code>) secret to enable it.
                </div>
              )}
              {turns.map(turn => (
                <ChatBubble
                  key={turn.id}
                  turn={turn}
                  onConfirm={p => confirmProposal(turn.id, p)}
                  onDecline={() => declineProposal(turn.id)}
                />
              ))}

              {/* Suggestion chips on empty state */}
              {!hasUserTurn && (
                <div className="flex flex-wrap gap-1.5 mt-1" data-testid="suggestion-chips">
                  {chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(chip)}
                      disabled={sending}
                      data-testid={`chip-suggestion-${idx}`}
                      className={cn(
                        "rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40",
                        "px-3 py-1 text-xs text-indigo-800 dark:text-indigo-300",
                        "hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors",
                        "disabled:opacity-50",
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Tell me what to log…"
                rows={1}
                disabled={sending}
                data-testid="input-ai-message"
                className={cn(
                  "flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm",
                  "min-h-[36px] max-h-32 leading-snug",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-300",
                  "disabled:opacity-60",
                )}
              />
              <Button
                size="sm"
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                data-testid="button-send-ai-message"
                className="h-9 px-3 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              Replies are AI-generated. Always review the summary before confirming.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function ChatBubble({
  turn,
  onConfirm,
  onDecline,
}: {
  turn: ChatTurn;
  onConfirm: (p: Proposal) => void;
  onDecline: () => void;
}) {
  const isUser = turn.role === "user";
  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
        data-testid={`bubble-${turn.role}`}
      >
        {turn.pending ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> thinking…
          </span>
        ) : (
          turn.text
        )}
        {turn.loggedCount !== undefined && turn.loggedCount > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {turn.loggedCount} logged
          </div>
        )}
        {turn.failedCount !== undefined && turn.failedCount > 0 && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400" title={turn.failedDetails}>
            <AlertCircle className="inline h-3 w-3 mr-1" /> {turn.failedCount} failed
          </div>
        )}
      </div>

      {/* Tool-call chips below assistant bubble for transparency. */}
      {!isUser && turn.toolCalls && turn.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[88%]" data-testid="tool-call-chips">
          {turn.toolCalls.map((tc, idx) => (
            <span
              key={idx}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono border",
                tc.ok
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
              )}
              title={tc.error ?? ""}
              data-testid={`chip-tool-${tc.name}`}
            >
              <Wrench className="h-2.5 w-2.5" />
              {tc.name}
            </span>
          ))}
        </div>
      )}

      {turn.proposal && turn.proposal.entries.length > 0 && (
        <Card
          className="mt-2 w-full border-indigo-200 dark:border-indigo-900"
          data-testid="card-ai-proposal"
        >
          <CardContent className="p-3">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-2">
              Confirm to log:
            </p>
            <div className="flex flex-col gap-1.5">
              {turn.proposal.entries.map((e, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs rounded border bg-muted/40 px-2 py-1.5"
                  data-testid={`proposed-entry-${idx}`}
                >
                  <span className="font-mono text-[11px] text-muted-foreground">{e.date}</span>
                  <Badge variant="secondary" className="font-medium">
                    {e.hours}h
                  </Badge>
                  <span className="flex-1 truncate" title={e.description}>
                    {e.description || (
                      <span className="italic text-muted-foreground">no description</span>
                    )}
                  </span>
                  {e.billable === false && (
                    <Badge variant="outline" className="text-[10px]">
                      non-billable
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {turn.proposal.warnings && turn.proposal.warnings.length > 0 && (
              <div
                className="mt-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5"
                data-testid="proposal-warnings"
              >
                {turn.proposal.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-amber-900 dark:text-amber-200"
                  >
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onConfirm(turn.proposal!)}
                data-testid="button-confirm-proposal"
                className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm & Log
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDecline}
                data-testid="button-decline-proposal"
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

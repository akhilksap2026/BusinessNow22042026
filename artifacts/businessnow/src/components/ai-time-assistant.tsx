/**
 * AI Time Tracking Assistant — floating chat widget.
 *
 * Pure addon: this component owns its own state, fetches a single backend
 * route (`POST /api/ai-time-helper`), and renders itself as a fixed
 * bottom-right launcher. It does not modify any other page or component.
 *
 * Visual contract:
 *   - Collapsed: pill-style "Time AI" button at bottom-right.
 *   - Expanded: 380×560 panel on desktop; full-screen sheet on <sm.
 *   - Confirmation card: when the AI proposes entries, a structured card
 *     appears with Confirm / Cancel buttons. On confirm we send the same
 *     entries back to the server, which calls the existing
 *     POST /api/time-entries (governance preserved).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, X, RotateCw, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { authHeaders } from "@/lib/auth-headers";
import { useCurrentUser } from "@/contexts/current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { getListTimeEntriesQueryKey, getGetTimeEntrySummaryQueryKey, getListTimesheetsQueryKey } from "@workspace/api-client-react";
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
}

interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  proposal?: Proposal;
  loggedCount?: number;
  failedCount?: number;
  failedDetails?: string;
  pending?: boolean;
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getOrCreateSessionId(): string {
  const KEY = "aiTimeAssistant.sessionId";
  if (typeof window === "undefined") return newId();
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = newId();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return newId();
  }
}

export function AITimeAssistant() {
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const sessionId = useMemo(getOrCreateSessionId, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Greet on first open if no history yet.
  useEffect(() => {
    if (!open || turns.length > 0 || !currentUser) return;
    setTurns([
      {
        id: newId(),
        role: "assistant",
        text:
          `Hi ${currentUser.name.split(" ")[0]} — I can help log your time. Try things like:\n` +
          `• "Log 5 hours on Project Atlas for database optimization"\n` +
          `• "I worked 3 hours yesterday on the redesign task"\n` +
          `• "What's left to log this week?"`,
      },
    ]);
  }, [open, turns.length, currentUser]);

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
    const r = await fetch(`${BASE}/api/ai-time-helper`, {
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
                pending: false,
              }
            : turn,
        ),
      );
    } catch (err: any) {
      setTurns(t =>
        t.map(turn =>
          turn.id === pendingTurn.id
            ? { ...turn, text: `⚠ ${err?.message ?? "Failed to reach AI assistant"}`, pending: false }
            : turn,
        ),
      );
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
          if (turn.id === turnId) {
            // Strip the proposal from the original turn so the buttons go away.
            return { ...turn, proposal: undefined };
          }
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
    } catch (err: any) {
      setTurns(t =>
        t.map(turn =>
          turn.id === pendingTurn.id
            ? { ...turn, text: `⚠ ${err?.message ?? "Failed to log entries"}`, pending: false }
            : turn,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  function declineProposal(turnId: string) {
    setTurns(t =>
      t.map(turn =>
        turn.id === turnId
          ? { ...turn, proposal: undefined, text: turn.text + "\n\n(Cancelled. Tell me what to change.)" }
          : turn,
      ),
    );
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  async function resetConversation() {
    setTurns([]);
    try {
      // Tell the server to drop the session history too.
      await fetch(`${BASE}/api/ai-time-helper`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ sessionId, reset: true, message: "" }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  // Hide widget for unauthenticated visitors (during /me bootstrap).
  if (!currentUser) return null;

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
              {turns.map(turn => (
                <ChatBubble
                  key={turn.id}
                  turn={turn}
                  onConfirm={p => confirmProposal(turn.id, p)}
                  onDecline={() => declineProposal(turn.id)}
                />
              ))}
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

      {turn.proposal && turn.proposal.entries.length > 0 && (
        <Card className="mt-2 w-full border-indigo-200 dark:border-indigo-900" data-testid="card-ai-proposal">
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
                    {e.description || <span className="italic text-muted-foreground">no description</span>}
                  </span>
                  {e.billable === false && (
                    <Badge variant="outline" className="text-[10px]">
                      non-billable
                    </Badge>
                  )}
                </div>
              ))}
            </div>
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

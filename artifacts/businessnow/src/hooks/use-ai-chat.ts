import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authHeaders } from "@/lib/auth-headers";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const SESSION_KEY = "ai-chat:sessionId";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{ name: string; args: unknown; result: unknown }>;
  pending?: boolean;
  errored?: boolean;
}

export interface UseAiChatResult {
  messages: ChatMessage[];
  sending: boolean;
  configured: boolean | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

let nextId = 0;
const newId = () => `m_${Date.now().toString(36)}_${++nextId}`;

/**
 * Manages a single AI assistant chat session: sends user messages, streams
 * back assistant replies, and invalidates cached server data when the
 * assistant successfully mutates state (so e.g. the Time Tracking page
 * refreshes after the assistant logs a new entry).
 */
export function useAiChat(): UseAiChatResult {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const sessionIdRef = useRef<string | null>(
    typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null,
  );

  // Probe whether the assistant is enabled on the server (i.e. an API key
  // is configured). This drives the empty-state copy in the widget.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/api/ai-chat/status`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => { if (!cancelled) setConfigured(!!d.configured); })
      .catch(() => { if (!cancelled) setConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
    const placeholder: ChatMessage = { id: newId(), role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setSending(true);

    try {
      const r = await fetch(`${BASE}/api/ai-chat`, {
        method: "POST",
        headers: { ...authHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId: sessionIdRef.current }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const err = (data as { error?: string }).error ?? `Request failed (${r.status})`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id ? { ...m, pending: false, errored: true, content: err } : m,
          ),
        );
        return;
      }

      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        try { localStorage.setItem(SESSION_KEY, data.sessionId); } catch { /* noop */ }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                pending: false,
                content: data.reply || "(no reply)",
                toolCalls: data.toolCalls,
              }
            : m,
        ),
      );

      // If the assistant mutated state (e.g. logged a time entry), invalidate
      // any cached data tied to the current user's time/projects/tasks so the
      // rest of the app stays in sync without a manual refresh.
      if (data.mutated) {
        qc.invalidateQueries({
          predicate: (q) => {
            const k = JSON.stringify(q.queryKey);
            return /time|timesheet|project|task|dashboard/i.test(k);
          },
        });
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, pending: false, errored: true, content: (err as Error).message || "Network error" }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }, [qc, sending]);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    setMessages([]);
  }, []);

  return { messages, sending, configured, send, reset };
}

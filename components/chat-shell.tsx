"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Copy, MessageSquarePlus, RefreshCw, Send, Trash2 } from "lucide-react";
import type { ChatMessage, ChatThread } from "@/lib/types";

const STORAGE_KEY = "tcl_chat_threads_v1";
const MAX_CONTEXT_MESSAGES = 12;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const initialThread = (): ChatThread => ({
  id: createId(),
  title: "New Chat",
  messages: [],
  updatedAt: new Date().toISOString()
});

export function ChatShell() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatThread[];
      setThreads(parsed);
      setActiveThreadId(parsed[0]?.id ?? "");
      return;
    }

    const thread = initialThread();
    setThreads([thread]);
    setActiveThreadId(thread.id);
  }, []);

  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    }
  }, [threads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [threads, typing]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId),
    [threads, activeThreadId]
  );

  const updateActiveThread = (updater: (thread: ChatThread) => ChatThread) => {
    setThreads((previous) =>
      previous.map((thread) => (thread.id === activeThreadId ? updater(thread) : thread))
    );
  };

  const handleNewChat = () => {
    const thread = initialThread();
    setThreads((previous) => [thread, ...previous]);
    setActiveThreadId(thread.id);
    setInput("");
  };

  const handleClearActive = () => {
    if (!activeThreadId) return;
    updateActiveThread((thread) => ({ ...thread, messages: [], title: "New Chat", updatedAt: new Date().toISOString() }));
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  const prepareContext = (messages: ChatMessage[]) =>
    messages.slice(-MAX_CONTEXT_MESSAGES).map(({ role, content }) => ({ role, content }));

  const streamAssistantResponse = async (threadId: string, withMessages: ChatMessage[]) => {
    setIsStreaming(true);
    setTyping(true);

    const assistantMessageId = createId();
    setThreads((previous) =>
      previous.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: "",
                  createdAt: new Date().toISOString()
                }
              ],
              updatedAt: new Date().toISOString()
            }
          : thread
      )
    );

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: prepareContext(withMessages) })
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to stream response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setTyping(false);
        setThreads((previous) =>
          previous.map((thread) => {
            if (thread.id !== threadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: `${message.content}${chunk}` }
                  : message
              ),
              updatedAt: new Date().toISOString()
            };
          })
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "I ran into an issue generating a response. Please try again or regenerate this reply.";
      setThreads((previous) =>
        previous.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            messages: thread.messages.map((entry) =>
              entry.id === assistantMessageId
                ? {
                    ...entry,
                    content: errorMessage
                  }
                : entry
            )
          };
        })
      );
    } finally {
      setTyping(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed || isStreaming || !activeThread) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    const nextMessages = [...activeThread.messages, userMessage];
    updateActiveThread((thread) => ({
      ...thread,
      messages: nextMessages,
      title: thread.messages.length === 0 ? trimmed.slice(0, 36) : thread.title,
      updatedAt: new Date().toISOString()
    }));

    setInput("");
    await streamAssistantResponse(activeThread.id, nextMessages);
  };

  const handleRegenerate = async () => {
    if (!activeThread || isStreaming) return;

    const lastUserIndex = [...activeThread.messages].reverse().findIndex((message) => message.role === "user");
    if (lastUserIndex < 0) return;

    const cutoff = activeThread.messages.length - lastUserIndex;
    const trimmedMessages = activeThread.messages.slice(0, cutoff);

    updateActiveThread((thread) => ({ ...thread, messages: trimmedMessages }));
    await streamAssistantResponse(activeThread.id, trimmedMessages);
  };

  return (
    <div className="flex h-screen bg-background text-zinc-100">
      <aside className="hidden w-72 flex-col border-r border-border bg-card/80 p-4 md:flex">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-zinc-900/80 p-3 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-black">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Internal AI</p>
            <h1 className="text-sm font-semibold">The Content Lab</h1>
          </div>
        </div>

        <button
          className="mb-4 inline-flex items-center justify-center gap-2 rounded-xl border border-accentBlue/40 bg-accentBlue/10 px-3 py-2 text-sm font-medium text-accentBlue transition hover:bg-accentBlue/20"
          onClick={handleNewChat}
          type="button"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </button>

        <div className="space-y-2 overflow-y-auto">
          {threads.map((thread) => (
            <button
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                activeThreadId === thread.id
                  ? "border-accent/60 bg-accent/10"
                  : "border-border bg-zinc-900/40 hover:bg-zinc-800/60"
              }`}
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              type="button"
            >
              <p className="truncate font-medium">{thread.title || "Untitled Chat"}</p>
              <p className="mt-1 text-xs text-zinc-500">{new Date(thread.updatedAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur">
          <p className="text-sm font-medium text-zinc-300">Brand-safe assistant for campaign and content workflows</p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-border bg-zinc-900/60 p-2 text-zinc-300 hover:text-white"
              onClick={handleRegenerate}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              className="rounded-lg border border-border bg-zinc-900/60 p-2 text-zinc-300 hover:text-white"
              onClick={handleClearActive}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {activeThread?.messages.map((message) => (
              <div
                className={`group rounded-2xl border p-4 shadow-soft ${
                  message.role === "user"
                    ? "ml-auto max-w-2xl border-accentBlue/40 bg-accentBlue/10"
                    : "max-w-3xl border-border bg-card"
                }`}
                key={message.id}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>{message.role === "user" ? "You" : "The Content Lab AI"}</span>
                  {message.role === "assistant" && message.content && (
                    <button
                      className="opacity-0 transition group-hover:opacity-100"
                      onClick={() => handleCopy(message.content)}
                      title="Copy response"
                      type="button"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-7 text-zinc-100">{message.content}</p>
              </div>
            ))}
            {typing && <p className="text-sm text-zinc-400">The Content Lab AI is typing…</p>}
          </div>
        </section>

        <form className="border-t border-border bg-card/70 p-4" onSubmit={handleSubmit}>
          <div className="mx-auto flex w-full max-w-4xl items-end gap-3 rounded-2xl border border-border bg-zinc-900/60 p-3 shadow-soft">
            <textarea
              className="max-h-48 min-h-12 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-500"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit(event);
                }
              }}
              placeholder="Ask for concepts, campaign hooks, scripts, captions..."
              rows={1}
              value={input}
            />
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isStreaming || input.trim().length === 0}
              type="submit"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

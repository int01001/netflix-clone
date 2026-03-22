'use client';

import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Movie } from "@/lib/types";

type Props = {
  onSelectMovie: (movie: Movie) => void;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  movies?: Movie[];
};

type MoodApiResponse = {
  mood: string;
  moodLabel: string;
  reply: string;
  movies: Movie[];
};

const QUICK_MOODS = [
  { label: "Happy", mood: "happy" },
  { label: "Sad", mood: "sad" },
  { label: "Stressed", mood: "stressed" },
  { label: "Bored", mood: "bored" },
  { label: "Romantic", mood: "romantic" },
  { label: "Chill", mood: "chill" },
];

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function MoodChatbot({ onSelectMovie }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: id(),
      role: "assistant",
      text: "Hi, I am your movie mood bot. Tell me how you feel and I will suggest movies.",
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending, open]);

  const sendMood = async (payload: { message?: string; mood?: string }) => {
    const text = (payload.message ?? "").trim();

    if (!payload.mood && !text) return;

    if (text) {
      setMessages((prev) => [
        ...prev,
        {
          id: id(),
          role: "user",
          text,
        },
      ]);
    }

    setPending(true);
    try {
      const historyPayload = messages.slice(-8).map((messageItem) => ({
        role: messageItem.role,
        text: messageItem.text,
      }));

      const res = await fetch("/api/chat/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mood: payload.mood ?? null,
          history: historyPayload,
        }),
      });

      const data = (await res.json()) as MoodApiResponse;

      setMessages((prev) => [
        ...prev,
        {
          id: id(),
          role: "assistant",
          text:
            `${data.reply ?? "I could not find matches right now. Try another mood."}` +
            (data.moodLabel ? ` [Mood: ${data.moodLabel}]` : ""),
          movies: data.movies ?? [],
        },
      ]);
    } catch (error) {
      console.error("mood bot request failed", error);
      setMessages((prev) => [
        ...prev,
        {
          id: id(),
          role: "assistant",
          text: "I could not fetch recommendations. Please try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMood({ message: text });
  };

  const buttonLabel = useMemo(
    () => (open ? "Close chatbot" : "Open mood chatbot"),
    [open],
  );

  const clearChat = () => {
    setMessages([
      {
        id: id(),
        role: "assistant",
        text: "Fresh start. Tell me your mood and I will recommend better options.",
      },
    ]);
  };

  return (
    <>
      <button
        aria-label={buttonLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[95] flex h-14 w-14 items-center justify-center rounded-full border border-[#ff5962]/50 bg-[linear-gradient(180deg,#f6121d_0%,#b20710_100%)] text-white shadow-[0_14px_28px_rgba(229,9,20,0.45)] transition hover:scale-[1.03]"
      >
        {open ? <XMarkIcon className="h-7 w-7" /> : <ChatBubbleLeftRightIcon className="h-7 w-7" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[95] w-[min(94vw,390px)] rounded-2xl border border-white/15 bg-[rgba(10,10,14,0.88)] shadow-[0_24px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Mood Recommender</p>
              <p className="text-xs text-[var(--muted)]">Chat for quick movie suggestions</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="rounded-full border border-white/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] transition hover:border-[#e50914]/65 hover:text-white"
              >
                Reset
              </button>
              <SparklesIcon className="h-5 w-5 text-[#ff7077]" />
            </div>
          </div>

          <div className="hide-scrollbar max-h-[48vh] space-y-3 overflow-y-auto px-3 py-3" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-[#e50914] text-white"
                      : "border border-white/10 bg-white/[0.04] text-[var(--muted)]"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.movies && message.movies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.movies.slice(0, 6).map((movie) => {
                        const poster =
                          movie.thumbnailUrl && movie.thumbnailUrl !== "N/A"
                            ? movie.thumbnailUrl
                            : movie.backdropUrl && movie.backdropUrl !== "N/A"
                              ? movie.backdropUrl
                              : null;

                        return (
                          <button
                            key={movie.imdbId ?? movie.id}
                            onClick={() => onSelectMovie(movie)}
                            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-black/35 p-2 text-left transition hover:border-[#e50914]/50 hover:bg-[#e50914]/10"
                          >
                            <div className="relative h-12 w-20 overflow-hidden rounded bg-black/60">
                              {poster ? (
                                <Image
                                  src={poster}
                                  alt={movie.title}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-white">
                                {movie.title}
                              </p>
                              <p className="truncate text-[11px] text-[var(--muted)]">
                                {movie.genre ?? "Movie"} {movie.year ? `- ${movie.year}` : ""}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--muted)]">
                  Understanding your mood and finding better matches...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-3 py-3">
            <div className="hide-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
              {QUICK_MOODS.map((item) => (
                <button
                  key={item.mood}
                  onClick={() =>
                    sendMood({
                      mood: item.mood,
                      message: `I am feeling ${item.label.toLowerCase()}`,
                    })
                  }
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[#e50914]/65 hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form className="flex items-center gap-2" onSubmit={onSubmit}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Example: I am stressed, no horror, something recent."
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--muted-strong)] focus:border-[#e50914]/70"
              />
              <button
                type="submit"
                disabled={pending}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ff5861]/45 bg-[#e50914] text-white transition hover:bg-[#f6121d] disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

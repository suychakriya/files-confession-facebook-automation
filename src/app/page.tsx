"use client";

import { useState, useRef } from "react";

const MAX_CHARS = 10000;

export default function Home() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOver = content.length > MAX_CHARS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/confessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("Your confession has been shared anonymously.");
        setContent("");
      } else {
        const err = await res.json();
        setStatus("error");
        setMessage(err.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-140 mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-5xl font-black text-pink-500 tracking-tight mb-3">
            Confessions
          </h1>
          <p className="text-pink-300 text-base">This is a safe place to share your thoughts, secrets, and confessions anonymously.</p>
        </div>

        {/* Input card */}
         <form onSubmit={handleSubmit}>
        <div className="bg-pink-100 rounded-[18px] shadow-md border border-pink-100 p-7 mb-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value) }}
              placeholder={"Write your confession here..."}
              maxLength={MAX_CHARS}
              rows={5}
              className="w-full min-h-36 field-sizing-content border bg-white border-pink-500 rounded-xl text-gray-700 text-sm px-4 py-3 resize-none placeholder-pink-200 focus:outline-none focus:border-pink-300 transition-colors leading-relaxed"
            />
            <div className="text-right text-xs mt-1 mb-4">
              {isOver
                ? <span className="text-red-400">Your content is over limit allowed</span>
                : <span className="text-pink-400">{content.length} characters</span>
              }
            </div>
     
        </div>

        <div className="flex flex-col justify-center items-center">
                     <button
              type="submit"
              disabled={status === "loading" || !content.trim() || isOver}
              className="w-36 py-3.5 bg-linear-to-r from-pink-400 to-pink-500 text-white rounded-2xl text-sm font-bold shadow-sm transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {status === "loading" ? "Submitting..." : "Submit 👀"}
            </button>
       

          {status === "success" && (
            <p className="mt-4 text-center text-sm text-pink-500">{message}</p>
          )}
          {status === "error" && (
            <p className="mt-4 text-center text-sm text-red-400">{message}</p>
          )}
        </div>
     </form>
      </div>
    </main>
  );
}

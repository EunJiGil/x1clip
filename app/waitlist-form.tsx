"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "done" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <p className="mx-auto max-w-[440px] rounded-full bg-[#f5f5f7] px-6 py-4 text-[17px] font-medium" role="status">
        You&rsquo;re on the list. We&rsquo;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[440px]">
      <div className="flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white p-1.5 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-[17px] outline-none placeholder:text-[#86868b]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-3 text-[14px] text-[#e30000]" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

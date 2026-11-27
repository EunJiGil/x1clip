"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "done" | "error";

// Stripe Payment Link: $19 환불 가능 얼리버드 예약금 (live)
const PREORDER_URL = process.env.NEXT_PUBLIC_PREORDER_URL ?? "https://buy.stripe.com/3cI7sEemV1Bj5Mv9Z40co00";

const RESERVE_POINTS = [
  "$19 comes off the final price",
  "Full refund anytime before shipping",
  "Secure checkout by Stripe",
];

function trackCheckout() {
  (window as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "InitiateCheckout");
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

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
      // Meta 픽셀 전환 이벤트 (광고 최적화용)
      (window as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Lead");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    // Stripe Payment Link: 이메일 미리 채워서 넘김 (선택 단계, 링크 없으면 숨김)
    const preorderUrl = PREORDER_URL
      ? `${PREORDER_URL}?prefilled_email=${encodeURIComponent(email)}`
      : null;
    if (!preorderUrl || dismissed) {
      return (
        <div className="mx-auto max-w-[440px] rounded-3xl bg-[#f5f5f7] px-6 py-5" role="status">
          <p className="text-[17px] font-medium">You&rsquo;re on the list. We&rsquo;ll be in touch.</p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-[440px] rounded-3xl bg-[#f5f5f7] px-6 py-6 text-left" role="status">
        <p className="text-[14px] font-medium text-[#30a14e]">✓ You&rsquo;re on the list</p>
        <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
          Lock in $159 (expected price ~$199).
        </p>
        <ul className="mt-4 space-y-2 text-[15px] text-[#424245]">
          {RESERVE_POINTS.map((point) => (
            <li key={point} className="flex gap-2.5">
              <span aria-hidden className="text-accent">✓</span>
              {point}
            </li>
          ))}
        </ul>
        <a
          href={preorderUrl}
          onClick={trackCheckout}
          className="mt-5 block rounded-full bg-accent px-5 py-3 text-center text-[16px] font-medium text-white transition hover:bg-accent-hover"
        >
          Reserve for $19
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 block w-full text-center text-[13px] text-[#86868b] hover:text-[#6e6e73]"
        >
          Maybe later. Keep me on the waitlist.
        </button>
      </div>
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
      {PREORDER_URL && (
        <p className="mt-3 text-[14px] text-[#6e6e73]">
          Already sure?{" "}
          <a href={PREORDER_URL} onClick={trackCheckout} className="text-accent hover:underline">
            Reserve now for $19 &rarr;
          </a>
        </p>
      )}
    </form>
  );
}

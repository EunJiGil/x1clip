"use client";

import { useEffect, useState } from "react";
import type { Activity, LogEntry } from "@/lib/store";
import { matchProduct, searchUrl } from "@/lib/amazon";
import type { AmazonJob } from "@/lib/amazonAgent";

type State = {
  log: LogEntry[];
  cart: string[];
  activity: { state: Activity; since: number };
  cameraSeenAt: number | null;
};

type Kind = "food" | "shopping" | "vision" | "chat";

const KIND_LABEL: Record<Kind, string> = {
  food: "Nutrition",
  shopping: "Shopping",
  vision: "Look",
  chat: "Ask",
};

function kindOf(e: LogEntry): Kind {
  if (e.foods.length > 0) return "food";
  if (e.ingredients.length > 0 || e.amazon) return "shopping";
  if (/\b(cart|ingredients?|groceries|grocery|shopping|buy|order|amazon)\b/i.test(e.transcript)) return "shopping";
  if (/\b(calories?|kcal|nutrition|protein|healthy)\b/i.test(e.transcript)) return "food";
  if (e.hadImage && /(look|see|this|that|read|identify|what is|what's)/i.test(e.transcript)) return "vision";
  return "chat";
}

function timeAgo(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

// ---------- 아이콘 ----------
function KindIcon({ kind, className = "h-4 w-4" }: { kind: Kind; className?: string }) {
  const common = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24" };
  switch (kind) {
    case "food":
      return (
        <svg {...common} aria-hidden>
          <path d="M5 11h14a7 7 0 0 1-14 0Z" strokeLinejoin="round" />
          <path d="M9 4c0 1.5 1 1.5 1 3M13 4c0 1.5 1 1.5 1 3" strokeLinecap="round" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 5h2l2 10h10l2-7H7" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="10" cy="19" r="1.3" />
          <circle cx="17" cy="19" r="1.3" />
        </svg>
      );
    case "vision":
      return (
        <svg {...common} aria-hidden>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z" strokeLinejoin="round" />
          <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" strokeLinejoin="round" />
        </svg>
      );
  }
}

// ---------- 상단 상태 ----------
function StatusPill({ activity }: { activity: Activity }) {
  if (activity === "listening")
    return (
      <span className="flex items-center gap-2 rounded-full bg-[#ff453a]/15 px-3 py-1.5 text-[13px] font-medium text-[#ff6961]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff453a]" />
        Listening
      </span>
    );
  if (activity === "thinking")
    return (
      <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0a84ff]/25 to-[#bf5af2]/25 px-3 py-1.5 text-[13px] font-medium text-white">
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </span>
        Thinking
      </span>
    );
  return (
    <span className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] text-[#a1a1a6]">
      <span className="h-2 w-2 rounded-full bg-[#30d158]" />
      Ready
    </span>
  );
}

// ---------- 질문 종류별 위젯 ----------
function FoodWidget({ entry }: { entry: LogEntry }) {
  const max = Math.max(...entry.foods.map((f) => f.kcal), 1);
  return (
    <div className="mt-6 rounded-2xl bg-white/[0.04] p-5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-white">
          {entry.totalKcal.toLocaleString()}
        </span>
        <span className="text-[17px] text-[#a1a1a6]">kcal</span>
      </div>
      <ul className="mt-5 space-y-3">
        {entry.foods.map((f, i) => (
          <li key={i}>
            <div className="flex justify-between text-[14px]">
              <span className="capitalize text-white">
                {f.name}
                {f.grams ? <span className="text-[#6e6e73]"> · {f.grams}g</span> : null}
              </span>
              <span className="tabular-nums text-[#a1a1a6]">{f.kcal}</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-white/[0.06]">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-[#ff9f0a] to-[#ff375f]"
                style={{ width: `${(f.kcal / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ITEM_ICON = { waiting: "○", adding: "…", added: "✓", failed: "✕" } as const;

function ShoppingWidget({
  entry,
  cart,
  job,
  onAmazon,
  onClear,
}: {
  entry: LogEntry;
  cart: string[];
  job: AmazonJob | null;
  onAmazon: (a: "add" | "login") => void;
  onClear: () => void;
}) {
  const items = entry.ingredients.length > 0 ? entry.ingredients : cart;
  const showJob = job && job.status !== "idle" && job.at >= entry.at - 5_000;
  return (
    <div className="mt-6 rounded-2xl bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-[#a1a1a6]">
          {entry.ingredients.length > 0 ? `Added ${entry.ingredients.length} items` : "Your list"}
          <span className="text-[#6e6e73]"> · {cart.length} in list</span>
        </p>
        {cart.length > 0 && (
          <button onClick={onClear} className="text-[13px] text-[#0a84ff] hover:underline">
            Clear list
          </button>
        )}
      </div>
      <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
        {items.map((item) => {
          const product = matchProduct(item);
          return (
            <li key={item} className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2.5">
              <span className="min-w-0">
                <span className="block text-[15px] capitalize text-white">{item}</span>
                {product && <span className="block truncate text-[12px] text-[#6e6e73]">{product.title}</span>}
              </span>
              <a
                href={product ? `https://www.amazon.com/dp/${product.asin}` : searchUrl(item)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[12px] text-[#0a84ff] hover:underline"
              >
                {product ? "Buy ↗" : "Search ↗"}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAmazon("add")}
          disabled={job?.status === "running"}
          className="flex-1 rounded-full bg-[#ff9900] px-4 py-2.5 text-[14px] font-semibold text-black transition hover:bg-[#ffa41c] disabled:opacity-60"
        >
          {job?.status === "running" ? "Adding to Amazon…" : "Add 3 to Amazon cart"}
        </button>
        <button
          onClick={() => onAmazon("login")}
          className="rounded-full bg-white/[0.08] px-4 py-2.5 text-[13px] text-white hover:bg-white/[0.12]"
        >
          Sign in
        </button>
      </div>
      {showJob && (
        <div className="mt-3 text-[13px]">
          <p className={job.status === "error" ? "text-[#ff6961]" : "text-[#a1a1a6]"}>{job.message}</p>
          <ul className="mt-1.5 space-y-0.5">
            {job.items.map((i) => (
              <li
                key={i.asin}
                className={
                  i.state === "added" ? "text-[#30d158]" : i.state === "failed" ? "text-[#ff6961]" : "text-[#a1a1a6]"
                }
              >
                {ITEM_ICON[i.state]} {i.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- 메인 ----------
export function Dashboard() {
  const [state, setState] = useState<State>({
    log: [],
    cart: [],
    activity: { state: "idle", since: 0 },
    cameraSeenAt: null,
  });
  const [job, setJob] = useState<AmazonJob | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const [res, amz] = await Promise.all([
          fetch("/api/state", { cache: "no-store" }),
          fetch("/api/amazon", { cache: "no-store" }),
        ]);
        if (!alive) return;
        if (res.ok) {
          const next = (await res.json()) as State;
          setState((prev) => {
            // 새 질문이 들어오면 맨 위 카드를 최신으로
            if (next.log[0]?.id !== prev.log[0]?.id) setSelectedId(null);
            return next;
          });
        }
        if (amz.ok) setJob(await amz.json());
      } catch {}
    }
    poll();
    const id = setInterval(() => {
      poll();
      setTick((t) => t + 1);
    }, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  async function amazon(action: "login" | "add") {
    const res = await fetch("/api/amazon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (action === "add" && res.ok) setJob(await res.json());
  }

  async function clearCart() {
    await fetch("/api/state", { method: "DELETE" });
    setState((s) => ({ ...s, cart: [] }));
  }

  const busy = state.activity.state !== "idle";
  const cameraLive = state.cameraSeenAt !== null && Date.now() - state.cameraSeenAt < 30_000;
  const current = state.log.find((e) => e.id === selectedId) ?? state.log[0];
  const kind = current ? kindOf(current) : null;

  return (
    <main className="min-h-screen bg-[#0b0b0c] text-white">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0b0b0c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-[20px] font-semibold tracking-[-0.04em]">x1</span>
            <span className="hidden text-[13px] text-[#6e6e73] sm:inline">Glasses</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] text-[#a1a1a6] sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${cameraLive ? "bg-[#30d158]" : "bg-[#48484a]"}`} />
              Camera
            </span>
            <StatusPill activity={state.activity.state} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {/* 지금 듣는 중 / 생각 중 */}
        {busy && (
          <div className="mb-4 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-[#0a84ff]/15 via-[#5e5ce6]/15 to-[#bf5af2]/15 p-5 ring-1 ring-white/[0.06]">
            <div className="flex h-10 items-end gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1.5 animate-pulse rounded-full bg-white/80"
                  style={{ height: `${14 + ((i * 7) % 20)}px`, animationDelay: `${i * 110}ms` }}
                />
              ))}
            </div>
            <p className="text-[17px] text-white/90">
              {state.activity.state === "listening" ? "Listening…" : "Looking and thinking…"}
            </p>
          </div>
        )}

        {/* 최신(또는 선택한) 질문 카드 */}
        {current && kind ? (
          <article className="overflow-hidden rounded-3xl bg-[#161618] ring-1 ring-white/[0.06]">
            <div className={current.hadImage ? "grid lg:grid-cols-[1.1fr_1fr]" : ""}>
              {current.hadImage && (
                <div className="relative bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/frame?id=${current.id}`}
                    alt="What the glasses saw"
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-black/50 px-2.5 py-1 text-[12px] text-white/80 backdrop-blur">
                    Captured {timeAgo(current.at)}
                  </span>
                </div>
              )}
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#a1a1a6]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-white">
                    <KindIcon kind={kind} className="h-3.5 w-3.5" />
                  </span>
                  {KIND_LABEL[kind]}
                  {!current.hadImage && <span className="text-[#6e6e73]">· {timeAgo(current.at)}</span>}
                </div>
                <p className="mt-5 text-[15px] text-[#a1a1a6]">“{current.transcript}”</p>
                <p className="mt-2 text-[24px] font-medium leading-snug tracking-[-0.02em] text-white sm:text-[28px]">
                  {current.reply}
                </p>

                {kind === "food" && <FoodWidget entry={current} />}
                {kind === "shopping" && (
                  <ShoppingWidget entry={current} cart={state.cart} job={job} onAmazon={amazon} onClear={clearCart} />
                )}
              </div>
            </div>
          </article>
        ) : (
          !busy && (
            <div className="flex flex-col items-center rounded-3xl bg-[#161618] px-6 py-24 text-center ring-1 ring-white/[0.06]">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#bf5af2]">
                <KindIcon kind="chat" className="h-6 w-6" />
              </span>
              <p className="mt-5 text-[24px] font-medium tracking-[-0.02em]">Hold the button and ask.</p>
              <p className="mt-2 max-w-sm text-[15px] text-[#a1a1a6]">
                “What am I looking at?” · “How many calories is this?” · “Add the ingredients to my cart.”
              </p>
            </div>
          )
        )}

        {/* 지난 질문들 */}
        {state.log.length > 1 && (
          <section className="mt-8">
            <h2 className="mb-3 px-1 text-[13px] font-medium text-[#6e6e73]">Earlier</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.log
                .filter((e) => e.id !== current?.id)
                .map((e) => {
                  const k = kindOf(e);
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => {
                          setSelectedId(e.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl bg-[#161618] p-3 text-left ring-1 ring-white/[0.06] transition hover:bg-[#1c1c1e]"
                      >
                        {e.hadImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/frame?id=${e.id}`}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#a1a1a6]">
                            <KindIcon kind={k} className="h-5 w-5" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[12px] text-[#6e6e73]">
                            <KindIcon kind={k} className="h-3 w-3" />
                            {KIND_LABEL[k]} · {timeAgo(e.at)}
                          </span>
                          <span className="mt-0.5 block truncate text-[15px] text-white">{e.transcript}</span>
                          <span className="block truncate text-[13px] text-[#a1a1a6]">{e.reply}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

// 개발 서버 메모리에 상태 저장 (HMR에도 유지되도록 globalThis 사용)

export type Food = { name: string; grams?: number; kcal: number };

export type LogEntry = {
  id: string;
  at: number;
  transcript: string;
  reply: string;
  hadImage: boolean; // 이 질문 때 찍은 사진이 있으면 /api/frame?id=<id>
  foods: Food[];
  totalKcal: number;
  ingredients: string[];
  amazon: boolean; // 아마존 자동 담기를 요청한 질문인지
};

export type Activity = "idle" | "listening" | "thinking";

type Store = {
  frame: { jpeg: Buffer; at: number } | null;
  log: LogEntry[];
  images: Record<string, Buffer>; // 질문별 사진 (최근 30개)
  cart: string[];
  activity: { state: Activity; since: number };
  captureSeq: number; // 촬영 요청 번호 (버튼 누를 때마다 +1)
  captureWaiters: (() => void)[]; // 촬영 요청을 기다리는 카메라 연결
  cameraSeenAt: number | null; // 카메라가 마지막으로 서버에 접속한 시각
};

const g = globalThis as unknown as { __glassesStore?: Store };
export const store: Store = (g.__glassesStore ??= {
  frame: null,
  log: [],
  images: {},
  cart: [],
  activity: { state: "idle", since: 0 },
  captureSeq: 0,
  captureWaiters: [],
  cameraSeenAt: null,
});
store.images ??= {};
store.activity ??= { state: "idle", since: 0 };
store.captureSeq ??= 0;
store.captureWaiters ??= [];
store.cameraSeenAt ??= null;

export function setActivity(state: Activity) {
  store.activity = { state, since: Date.now() };
}

export function addLogEntry(entry: LogEntry, jpeg: Buffer | null) {
  store.log.unshift(entry);
  if (jpeg) store.images[entry.id] = jpeg;
  for (const old of store.log.splice(30)) delete store.images[old.id];
}

/** 카메라에게 "지금 한 장 찍어" 신호 */
export function requestCapture() {
  store.captureSeq++;
  const waiters = store.captureWaiters;
  store.captureWaiters = [];
  waiters.forEach((wake) => wake());
}

/** since 이후에 찍힌 사진을 최대 timeoutMs 동안 기다림 */
export async function waitForFrameAfter(since: number, timeoutMs: number) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (store.frame && store.frame.at >= since) return store.frame;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

// ESP32-CAM 롱폴링: 촬영 요청이 올 때까지 최대 20초 대기
// GET /api/capture?seq=N  ->  "<최신 seq> capture" 또는 "<최신 seq> idle"
import { connection } from "next/server";
import { store } from "@/lib/store";

const WAIT_MS = 20_000;

export async function GET(request: Request) {
  await connection();
  store.cameraSeenAt = Date.now();
  const param = new URL(request.url).searchParams.get("seq");

  // 처음 접속: 현재 번호만 알려줌
  if (param === null || param === "") return new Response(`${store.captureSeq} idle`);

  const seq = Number(param);
  if (store.captureSeq > seq) return new Response(`${store.captureSeq} capture`);

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      store.captureWaiters = store.captureWaiters.filter((w) => w !== wake);
      resolve();
    }, WAIT_MS);
    const wake = () => {
      clearTimeout(timer);
      resolve();
    };
    store.captureWaiters.push(wake);
    request.signal.addEventListener("abort", wake);
  });

  store.cameraSeenAt = Date.now();
  const action = store.captureSeq > seq ? "capture" : "idle";
  return new Response(`${store.captureSeq} ${action}`);
}

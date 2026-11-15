// ESP32-CAM -> JPEG 업로드 (POST)
// GET            -> 가장 최근 사진
// GET ?id=<id>   -> 그 질문 때 찍은 사진
import { connection } from "next/server";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const jpeg = Buffer.from(await request.arrayBuffer());
  if (jpeg.length < 100) return new Response("empty", { status: 400 });
  store.frame = { jpeg, at: Date.now() };
  return new Response("ok");
}

export async function GET(request: Request) {
  await connection();
  const id = new URL(request.url).searchParams.get("id");
  const jpeg = id ? store.images[id] : store.frame?.jpeg;
  if (!jpeg) return new Response("no frame", { status: 404 });
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": id ? "private, max-age=3600" : "no-store" },
  });
}

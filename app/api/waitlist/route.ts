// 웨이트리스트 이메일 저장
// - 배포(Vercel): Upstash Redis (KV_REST_API_URL / UPSTASH_REDIS_REST_URL 환경변수)
// - 로컬(Redis 없음): data/waitlist.json
import { connection } from "next/server";
import { Redis } from "@upstash/redis";
import { promises as fs } from "node:fs";
import path from "node:path";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY = "waitlist"; // hash: email -> 가입 시각

function getRedis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const FILE = path.join(process.cwd(), "data", "waitlist.json");
type Entry = { email: string; at: string };
async function readFile(): Promise<Entry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Entry[];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {}
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  const at = new Date().toISOString();
  const redis = getRedis();
  if (redis) {
    await redis.hsetnx(KEY, email, at);
  } else {
    const list = await readFile();
    if (!list.some((e) => e.email === email)) {
      list.push({ email, at });
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(list, null, 2));
    }
  }
  return Response.json({ ok: true });
}

// 가입자 수만 공개
export async function GET() {
  await connection();
  const redis = getRedis();
  const count = redis ? await redis.hlen(KEY) : (await readFile()).length;
  return Response.json({ count });
}

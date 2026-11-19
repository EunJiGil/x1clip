// x1glasses.com 으로 온 메일 -> 개인 메일함으로 전달
// Resend "email.received" 웹훅이 호출함 (본문은 웹훅에 없어서 API로 다시 가져옴)
// 환경변수: RESEND_API_KEY, RESEND_WEBHOOK_SECRET (whsec_...), INBOUND_FORWARD_TO
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.resend.com";
const FORWARD_FROM = "forward@x1glasses.com";

// Svix 서명 검증: base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`))
function verify(body: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const [version, sig] = s.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

async function resend(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Resend ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

type Received = {
  from: string;
  to: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  headers?: Record<string, string>;
};
type Attachment = { filename: string; download_url: string };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const forwardTo = process.env.INBOUND_FORWARD_TO;
  if (!secret || !forwardTo) return new Response("inbound not configured", { status: 500 });

  const body = await request.text();
  if (!verify(body, request.headers, secret)) return new Response("bad signature", { status: 401 });

  const event = JSON.parse(body) as { type: string; data: { email_id: string; from: string } };
  if (event.type !== "email.received") return new Response("ignored");
  // 우리가 전달한 메일이 다시 들어오는 루프 방지
  if (event.data.from.toLowerCase() === FORWARD_FROM) return new Response("ignored");

  const id = event.data.email_id;
  const email = (await resend(`/emails/receiving/${id}`)) as Received;
  const { data: attachments = [] } = (await resend(`/emails/receiving/${id}/attachments`)) as {
    data?: Attachment[];
  };

  // 표시 이름은 원래 From 헤더에서 (없으면 주소)
  const fromHeader = email.headers?.from ?? email.from;
  const name = fromHeader.replace(/<.*>/, "").replace(/"/g, "").trim() || email.from;
  const note = `Sent to ${email.to.join(", ")} from ${fromHeader}. Reply normally to answer them.`;

  await resend("/emails", {
    method: "POST",
    // 웹훅 재시도 때 같은 메일이 두 번 전달되지 않게
    headers: { "Idempotency-Key": `inbound-${id}` },
    body: JSON.stringify({
      from: `${name} via x1 <${FORWARD_FROM}>`,
      to: [forwardTo],
      reply_to: email.from,
      subject: email.subject ?? "(no subject)",
      text: `${note}\n\n${email.text ?? ""}`,
      html: email.html
        ? `<p style="color:#888;font-size:12px">${note.replace(/</g, "&lt;")}</p>${email.html}`
        : undefined,
      attachments: attachments.map((a) => ({ filename: a.filename, path: a.download_url })),
    }),
  });

  return new Response("forwarded");
}

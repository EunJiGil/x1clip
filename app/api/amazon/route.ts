// 아마존 자동 담기
// GET  -> 진행 상태
// POST {action:"login"} -> 크롬으로 아마존 열기 (처음 한 번 로그인)
// POST {action:"add"}   -> 장바구니에서 아마존 상품과 매칭된 재료 최대 3개 담기
import { connection } from "next/server";
import { matchedAsins } from "@/lib/amazon";
import { addToAmazonCart, getJob, openAmazon } from "@/lib/amazonAgent";
import { store } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json(getJob());
}

export async function POST(request: Request) {
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };
  if (action === "login") {
    await openAmazon();
    return Response.json({ ok: true });
  }
  return Response.json(await addToAmazonCart(matchedAsins(store.cart)));
}

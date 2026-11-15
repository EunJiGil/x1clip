// 대시보드용: 대화 기록 / 장바구니 / 기기 상태
import { connection } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json({
    // 사진이 실제로 남아있는 경우만 hadImage=true
    log: store.log.map((e) => ({ ...e, hadImage: !!store.images[e.id] })),
    cart: store.cart,
    activity: store.activity,
    cameraSeenAt: store.cameraSeenAt,
  });
}

export async function DELETE() {
  store.cart = [];
  return Response.json({ ok: true });
}

// ATOM Echo -> 16kHz 16-bit mono PCM 업로드
// 응답: 24kHz 16-bit mono PCM (TTS) 스트림
import { askAgent, pcmToWav, transcribe, ttsPcmStream } from "@/lib/openai";
import { addLogEntry, requestCapture, setActivity, store, waitForFrameAfter } from "@/lib/store";
import { matchedAsins } from "@/lib/amazon";
import { addToAmazonCart } from "@/lib/amazonAgent";

const IN_RATE = 16000;

export async function POST(request: Request) {
  const t0 = Date.now();
  // 버튼을 누르자마자(녹음 시작 시점) 카메라에게 촬영 요청
  requestCapture();
  setActivity("listening");
  let reply = "Sorry, something went wrong.";
  try {
    const pcm = Buffer.from(await request.arrayBuffer());
    setActivity("thinking");
    console.log(`[voice] ${pcm.length} bytes (${(pcm.length / 2 / IN_RATE).toFixed(1)}s)`);

    if (pcm.length < IN_RATE * 2 * 0.3) {
      reply = "I didn't catch that. Hold the button while you speak.";
    } else {
      const transcript = await transcribe(pcmToWav(pcm, IN_RATE));
      console.log(`[voice] STT: "${transcript}" (+${Date.now() - t0}ms)`);
      if (!transcript) {
        reply = "I didn't catch that. Please try again.";
      } else {
        // 이번 버튼 누름 때 찍힌 사진 (보통 이미 도착해 있음, 최대 3초 더 기다림)
        const frame = await waitForFrameAfter(t0, 3000);
        // 최근 10분 안의 대화 4턴까지 기억
        const history = store.log
          .filter((e) => Date.now() - e.at < 10 * 60_000)
          .slice(0, 4)
          .reverse()
          .map((e) => ({ user: e.transcript, assistant: e.reply }));
        const result = await askAgent(transcript, frame?.jpeg ?? null, history, store.cart);
        reply = result.reply;
        console.log(`[voice] reply: "${reply}" image=${!!frame} (+${Date.now() - t0}ms)`);

        addLogEntry(
          {
            id: crypto.randomUUID(),
            at: Date.now(),
            transcript,
            reply,
            hadImage: !!frame,
            foods: result.foods,
            totalKcal: result.total_kcal,
            ingredients: result.ingredients,
            amazon: result.amazon,
          },
          frame?.jpeg ?? null,
        );
        for (const raw of result.ingredients) {
          const item = raw.trim().toLowerCase();
          if (item && !store.cart.includes(item)) store.cart.push(item);
        }
        if (result.amazon) {
          console.log("[voice] -> Amazon auto-add");
          void addToAmazonCart(matchedAsins(store.cart));
        }
      }
    }
  } catch (err) {
    console.error("[voice] error", err);
  }
  setActivity("idle");

  try {
    const audio = await ttsPcmStream(reply);
    return new Response(audio, {
      headers: { "Content-Type": "audio/pcm", "X-Sample-Rate": "24000" },
    });
  } catch (err) {
    console.error("[voice] TTS error", err);
    return new Response("tts error", { status: 500 });
  }
}

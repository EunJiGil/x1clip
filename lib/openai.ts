// OpenAI REST 호출 (STT / Vision 채팅 / TTS)

import { PREFERRED_NAMES } from "./amazon";

const API = "https://api.openai.com/v1";

function key() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY 가 .env.local 에 없습니다");
  return k;
}

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";
export const STT_MODEL = process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe";
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
export const TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? "nova";

/** 16-bit mono PCM -> WAV */
export function pcmToWav(pcm: Buffer, sampleRate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function transcribe(wav: Buffer): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "speech.wav");
  form.append("model", STT_MODEL);
  form.append("language", "en");
  const res = await fetch(`${API}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`STT 실패 ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

const SYSTEM_PROMPT = `You are an AI assistant built into the user's glasses. The user speaks to you, and your reply is read aloud through a small speaker.
- Write "reply" in English, conversational, 1-3 short sentences. No markdown, emoji, or lists.
- If an image is attached, it is what the user is looking at right now through their glasses.
- Earlier turns of the conversation are included. Use them to resolve "this", "that", "it" (e.g. "put that in the cart" refers to the dish you just discussed).
- If the image shows food and the user asks about the food, calories, or nutrition, estimate each item's name, approximate grams, and kcal into "foods", and compute "total_kcal". In "reply", say exactly that total_kcal number (one number, not a range).
- If the user asks about ingredients, groceries, shopping, the cart, or how to make it, put the grocery ingredients for that dish into "ingredients", and in "reply" do NOT list them all; just say how many you added and name at most two (e.g. "I added 8 ramen ingredients to your cart, including noodles and miso."). Use short, simple, lowercase grocery names (e.g. "eggs", "soy sauce", "green onions"), one item each, no "or" alternatives, no parentheses.
- Items already in the cart are listed below. Do not repeat them in "ingredients".
- Set "amazon" to true ONLY when the user explicitly asks to put items in their Amazon cart, or to order / buy them (e.g. "add them to my Amazon cart", "order these"). Then say in "reply" that you're adding a few items to their Amazon cart now. Otherwise "amazon" is false.
- Otherwise "foods" and "ingredients" are empty arrays and "total_kcal" is 0.
Respond ONLY with this JSON:
{"reply": string, "foods": [{"name": string, "grams": number, "kcal": number}], "total_kcal": number, "ingredients": string[], "amazon": boolean}`;

export type AgentResult = {
  reply: string;
  foods: { name: string; grams?: number; kcal: number }[];
  total_kcal: number;
  ingredients: string[];
  amazon: boolean;
};

export type Turn = { user: string; assistant: string };

export async function askAgent(
  text: string,
  jpeg: Buffer | null,
  history: Turn[] = [],
  cart: string[] = [],
): Promise<AgentResult> {
  const userContent: unknown[] = [{ type: "text", text }];
  if (jpeg) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` },
    });
  }
  const res = await fetch(`${API}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nWhen an ingredient matches one of these, use exactly this name: ${PREFERRED_NAMES.join(", ")}.\n\nCurrent cart: ${cart.length ? cart.join(", ") : "(empty)"}`,
        },
        ...history.flatMap((t) => [
          { role: "user", content: t.user },
          { role: "assistant", content: JSON.stringify({ reply: t.assistant }) },
        ]),
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Chat 실패 ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0].message.content) as Partial<AgentResult>;
  return {
    reply: parsed.reply ?? "Sorry, could you say that again?",
    foods: parsed.foods ?? [],
    total_kcal: parsed.total_kcal ?? 0,
    ingredients: parsed.ingredients ?? [],
    amazon: parsed.amazon === true,
  };
}

/** TTS: 24kHz 16-bit mono raw PCM 스트림 */
export async function ttsPcmStream(text: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${API}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: "pcm",
      instructions: "Speak like a warm, friendly, upbeat assistant. Clear and natural.",
    }),
  });
  if (!res.ok || !res.body) throw new Error(`TTS 실패 ${res.status}: ${await res.text()}`);
  return res.body;
}

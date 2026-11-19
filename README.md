# x1: turn any eyeglasses into AI glasses

**x1** is a small clip that slides onto the arm of the glasses you already own. It has a forward-facing camera, a microphone and a speaker. Hold the button and ask a question. x1 takes a photo of what you're looking at, works out what you mean, and answers in your ear.

The working prototype is two off-the-shelf boards, an **M5Stack ATOM Echo** (button, mic, speaker) and an **ESP32-CAM**, about **$25 in parts**. A Next.js server on a laptop does speech-to-text, a vision LLM call and text-to-speech. From releasing the button to having the answer text takes about **2.8 s** (median of 14 real questions). See [Measured latency](#measured-latency).

Built solo at a hackathon by **Fittings Labs**. It's an early prototype, not a product. See [Limits](#notes-and-limits) and [What's next](#whats-next).

### Demo (real prototype, real speed, not sped up)

<!-- On github.com: edit this README, drag x1-demo.mp4 onto the line below, and replace this comment + the line with the generated https://github.com/user-attachments/... URL -->
DEMO_VIDEO_URL

The pauses are the real latency: the button is released, the photo and question go to the laptop, and the answer comes back through the speaker.

## What it does

| You say | x1 does |
|---|---|
| "What am I looking at?" | Takes a photo and describes the scene |
| "What's this food? How many calories?" | Identifies each dish, estimates grams and kcal, and says the total |
| "What do I need to make this?" | Lists the grocery ingredients and adds them to your cart |
| "Add them to my Amazon cart." | Opens Chrome on the laptop and adds up to 3 matched products to your real Amazon cart (it never checks out) |
| Any general question | Answers in 1–3 short spoken sentences, remembering the last few turns |

A live **dashboard** (`/dashboard`) shows each question, the photo taken at that moment, the answer, a calorie breakdown or the shopping list, and Amazon add-to-cart progress.

| "What am I looking at?" | "Can you recommend some good ramen restaurants near Y Combinator?" |
|---|---|
| ![Dashboard: photo from the clip camera, answer and calorie breakdown](docs/dashboard-nutrition.jpg) | ![Dashboard: general question with conversation history](docs/dashboard-ask.jpg) |

The photo on the left of each card is the actual 640×480 frame from the ESP32-CAM at the moment the button was pressed.

## How it works

```
 ┌──────────────┐  hold button: 16 kHz PCM, streamed while you talk
 │  ATOM Echo   │ ───────────────────────────────────────────────┐
 │  mic+speaker │ ◀─────────── 24 kHz PCM reply (TTS) ────────┐  │
 └──────────────┘                                            │  ▼
                                                     ┌─────────────────────────┐
 ┌──────────────┐  long-poll /api/capture            │  Laptop: Next.js server │
 │  ESP32-CAM   │ ◀── "capture" when button pressed ─│                         │
 │  camera      │ ──── one JPEG → /api/frame ───────▶│ 1. Speech to text       │
 └──────────────┘                                    │ 2. Vision LLM + memory  │
                                                     │ 3. Text to speech       │
        Wi-Fi: laptop's 2.4 GHz hotspot              │ 4. Cart / Amazon agent  │
                                                     └───────────┬─────────────┘
                                                                 ▼
                                                    /dashboard (live view)
```

1. **Press the button**: the Echo opens an HTTP request to `/api/voice` and streams microphone audio while you speak (chunked transfer, so there is no fixed recording limit). The server immediately signals the camera.
2. **The camera shoots once**: the ESP32-CAM holds a long-poll on `/api/capture`. When it receives "capture", it takes a single fresh JPEG and uploads it. It never streams video, which saves battery and is better for privacy.
3. **Understand**: the server converts the speech to text (`gpt-4o-mini-transcribe`) and sends the text, the photo, the last few turns and the current cart to a vision model (`gpt-4.1-mini`). The model returns structured JSON: `reply`, `foods[]`, `total_kcal`, `ingredients[]`, `amazon`.
4. **Act**: food goes into the calorie log, ingredients go into the cart, and when `amazon` is true a Playwright agent drives a logged-in Chrome to add up to 3 matched products to the Amazon cart, slowly and like a person.
5. **Answer**: the reply is turned into speech (`gpt-4o-mini-tts`, 24 kHz PCM) and streamed straight back to the Echo speaker as it is generated.

The Echo LED shows the state: blue blinking = Wi-Fi, red = listening, yellow = thinking, green = speaking.

The two boards never talk to each other. Each one joins the laptop's hotspot on its own, and the server coordinates them over plain HTTP.

## Measured latency

These numbers come from the server log of 14 real questions that included a photo, on a laptop hotspot calling the OpenAI API.

| Stage | Time |
|---|---|
| Button released → speech-to-text done | ~1.0–2.0 s |
| Speech-to-text → vision LLM reply text | ~1.0–2.1 s |
| **Button released → reply text** | **2.2–4.2 s (median ~2.8 s)** |

- **The photo adds almost no delay.** The camera is triggered the moment the button is pressed, so the JPEG has usually arrived before you finish talking.
- **Text-to-speech time is not included.** The time until the first audio plays wasn't logged.
- **A missing photo is slow.** When the photo didn't arrive, the server waited 3 s for it and then answered without it, which took ~5.5 s.

## Hardware

<img src="docs/prototype.jpg" width="420" alt="The prototype: ESP32-CAM and ATOM Echo taped to a pair of glasses">

The current prototype, honestly: an ESP32-CAM and an ATOM Echo held onto the glasses arm with tape, powered over USB.

| Part | Role | Approx. price |
|---|---|---|
| M5Stack **ATOM Echo** (ESP32-PICO) | Button, PDM microphone, I2S speaker, RGB LED | ~$13 |
| **ESP32-CAM** (AI Thinker, OV2640) + ESP32-CAM-MB | Camera, 640×480 JPEG; the MB board is only for USB flashing and power | ~$10 |
| Laptop | Runs the server and a 2.4 GHz Mobile Hotspot the devices join | — |
| USB power bank | Powers the devices while worn | any |

I haven't measured power draw yet.

## Repository layout

```
app/
  page.tsx, waitlist-form.tsx   Waitlist landing page (deployed on Vercel)
  dashboard/                    Live conversation dashboard
  api/voice/                    Echo audio in → STT → vision LLM → TTS audio out
  api/capture/                  Camera long-poll: "take a photo now"
  api/frame/                    Camera JPEG upload / per-question photos
  api/state/                    Dashboard state (log, cart, device status)
  api/amazon/                   Amazon add-to-cart agent (login / add / status)
  api/waitlist/                 Waitlist signups (Upstash Redis on Vercel, JSON file locally)
lib/
  openai.ts                     STT, vision chat (JSON output), TTS
  store.ts                      In-memory state shared by the routes
  amazon.ts                     Ingredient → Amazon product (ASIN) matching
  amazonAgent.ts                Playwright Chrome automation (never checks out)
firmware/
  atom_echo_agent/              ATOM Echo: push-to-talk streaming client
  esp32cam_frames/              ESP32-CAM: capture-on-request uploader
  atom_echo_test/               Mic/speaker loopback test
docs/                           README media
```

## Run it

### 1. Server (laptop)

```bash
npm install
cp .env.example .env.local      # add OPENAI_API_KEY
npx next dev -H 0.0.0.0 -p 3000 # listen on the hotspot interface too
```

Then turn on the laptop hotspot: Windows Settings → Network & internet → **Mobile hotspot**, band **2.4 GHz**, and turn power saving off. The laptop's address on the hotspot is `192.168.137.1`. If Windows asks, allow Node.js through the firewall.

- Dashboard: http://localhost:3000/dashboard
- Amazon agent: on the dashboard, press **Sign in** once and log in to Amazon in the Chrome window that opens. That profile is kept in `.amazon-profile/`, which is git-ignored. The Chrome path is set in `lib/amazonAgent.ts`.

### 2. Firmware (Arduino IDE or arduino-cli, ESP32 core 3.x)

For each sketch, copy `secrets.example.h` to `secrets.h` and fill in the hotspot name and password.

| Sketch | Board (FQBN) | Notes |
|---|---|---|
| `firmware/atom_echo_agent` | `esp32:esp32:m5stack_atom` | Set **Upload Speed to 115200**, or uploads fail |
| `firmware/esp32cam_frames` | `esp32:esp32:esp32cam` | Flash through the ESP32-CAM-MB board |

```bash
arduino-cli compile -u -p COM3 -b "esp32:esp32:m5stack_atom:UploadSpeed=115200" firmware/atom_echo_agent
arduino-cli compile -u -p COM4 -b esp32:esp32:esp32cam firmware/esp32cam_frames
```

After that the devices only need USB power, from the laptop or a power bank.

### 3. Waitlist site (Vercel)

The landing page and `/api/waitlist` deploy to Vercel as they are. Connect **Upstash Redis** from the Vercel Marketplace (it provides `KV_REST_API_URL` and `KV_REST_API_TOKEN`) so signups persist. The device APIs are meant to run on the laptop, on the same network as the hardware.

## Tech

Next.js 16 (App Router, route handlers) · TypeScript · Tailwind CSS 4 · OpenAI (gpt-4o-mini-transcribe, gpt-4.1-mini vision, gpt-4o-mini-tts) · Playwright · Upstash Redis · Vercel · Arduino / ESP32 (I2S PDM mic, I2S speaker, esp32-camera)

## What's next

- **No laptop.** Move the server to the cloud and use the phone as the hub (clip → BLE → phone → cloud), so x1 works outdoors.
- **One board.** Replace the two modules with a single ESP32-S3 that has a camera and mic, and sleep between button presses.
- **Faster answers.** Use streaming speech-to-text and speech-to-speech models instead of three separate calls.
- **Power.** Measure the real current draw and size a small battery from it.

## Notes and limits

- The working prototype is two dev boards held to the glasses, not the slim clip in the concept render below.
- There is no wake word. x1 only listens while the button is held, and the camera takes one photo per question; it never streams video.
- Calorie numbers are model estimates from a single photo, not nutrition facts.
- Amazon has no public add-to-cart API, so x1 drives a real browser. It adds at most 3 items per request, pauses between actions, and stops before checkout.
- Server state is held in memory for the demo. It resets when the server restarts.

## Concept

Where I'd like the clip to end up. This is a concept film made with generative AI image and video models, **not the prototype**.

![x1 concept film (AI-generated)](docs/x1-launch.gif)

If you'd like to follow along, there's a waitlist: https://x1glasses.com

## License

MIT. See [LICENSE](LICENSE).

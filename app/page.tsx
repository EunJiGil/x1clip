import Image, { type StaticImageData } from "next/image";
import Script from "next/script";
import { WaitlistForm } from "./waitlist-form";

// Meta 픽셀: 랜딩 페이지에만 (대시보드 제외). 가입 시 Lead 이벤트는 waitlist-form에서 보냄
const META_PIXEL_ID = "1077335882046000";

import logo from "./_media/x1-logo.png";
import heroHand from "./_media/hero-hand.jpg";
import heroModel from "./_media/hero-model.jpg";
import usePress from "./_media/use-press.jpg";
import useKitchen from "./_media/use-kitchen.jpg";
import useCafe from "./_media/use-cafe.jpg";
import useStreet from "./_media/use-street.jpg";
import useGrocery from "./_media/use-grocery.jpg";
import useBus from "./_media/use-bus.jpg";
import clipWhite from "./_media/clip-white.jpg";
import clipBlack from "./_media/clip-black.jpg";
import clipSilver from "./_media/clip-silver.jpg";
import clipHand from "./_media/clip-hand.jpg";
import glassesBlack from "./_media/glasses-black.jpg";
import glassesTortoise from "./_media/glasses-tortoise.jpg";
import glassesSun from "./_media/glasses-sun.jpg";
import protoHand from "./_media/proto-hand.jpg";
import protoDashboard from "./_media/proto-dashboard.jpg";
import teamYc from "./_media/team-yc.png";

const useCases: {
  src: StaticImageData;
  alt: string;
  label: string;
  quote: string;
  focus: string;
}[] = [
  {
    src: useKitchen,
    alt: "A woman in her kitchen looks at vegetables and eggs on a cutting board",
    label: "Cooking",
    quote: "“What can I make with this?”",
    focus: "object-[62%_50%]",
  },
  {
    src: useCafe,
    alt: "A man at a cafe counter looks down at a croissant and a flat white",
    label: "Calories",
    quote: "“How many calories is this?”",
    focus: "object-[38%_50%]",
  },
  {
    src: usePress,
    alt: "A woman presses the x1 clip on her glasses on a city street at dusk",
    label: "Email",
    quote: "“Email Sam that I’m running late.”",
    focus: "object-[62%_50%]",
  },
  {
    src: useGrocery,
    alt: "An older man in a grocery shop studies a jar",
    label: "Shopping",
    quote: "“Add this to my cart.”",
    focus: "object-[55%_50%]",
  },
  {
    src: useStreet,
    alt: "A woman on a city street touches the clip on her glasses",
    label: "Nearby",
    quote: "“Find me a good café nearby.”",
    focus: "object-[44%_50%]",
  },
  {
    src: useBus,
    alt: "A young man on a city bus looks out of the window wearing x1",
    label: "Translation",
    quote: "“What does that sign say?”",
    focus: "object-[42%_50%]",
  },
];

const glasses = [
  { src: glassesBlack, alt: "x1 on black rectangular frames", fit: "object-contain p-4" },
  { src: glassesTortoise, alt: "x1 on tortoiseshell frames", fit: "object-contain p-4" },
  { src: glassesSun, alt: "x1 on sunglasses", fit: "object-cover" },
];

const colors = [
  { src: clipWhite, label: "White" },
  { src: clipBlack, label: "Black" },
  { src: clipSilver, label: "Silver" },
];

const steps = [
  ["Clip it on", "Slide x1 onto the arm of any glasses. No tools needed."],
  ["Touch and ask", "Hold the clip and ask. It takes a look while you speak."],
  ["Hear the answer", "A short spoken reply in your ear, in about three seconds."],
];

const faqs = [
  [
    "Is x1 real?",
    "Yes. A working prototype already answers questions about what it sees, in about three seconds. The slim clip shown on this page is a concept render of where it’s headed.",
  ],
  [
    "How much will x1 cost?",
    "Waitlist members will get early-bird pricing of $159. After that, we’re aiming for around $199. x1 is still in development, so final pricing may change.",
  ],
  [
    "What happens to my $19 reservation?",
    "It holds the $159 early-bird price and is credited when x1 ships (estimated 2027). Payment is handled by Stripe. Email hello@x1glasses.com anytime before shipping for a full refund.",
  ],
];

function HeroLoop({ video, poster, alt }: { video: string; poster: StaticImageData; alt: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[16px] bg-[#f5f5f7] ring-1 ring-black/[0.06] ring-inset sm:rounded-[24px]">
      <Image
        src={poster}
        alt={alt}
        placeholder="blur"
        preload
        sizes="(max-width: 640px) 50vw, 500px"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={video}
        poster={poster.src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />
    </div>
  );
}

function Heading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="text-center">
      <p className="text-[14px] font-semibold text-accent sm:text-[15px]">{eyebrow}</p>
      <h2 className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[52px]">
        {title}
        <br />
        <span className="text-[#86868b]">{sub}</span>
      </h2>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-5">
          <a href="#" aria-label="x1 home">
            <Image src={logo} alt="x1" preload className="h-[18px] w-auto" />
          </a>
          <a
            href="#waitlist"
            className="rounded-full bg-[#1d1d1f] px-3.5 py-1 text-[12px] font-medium text-white transition hover:bg-black"
          >
            Join waitlist
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-10 text-center sm:px-5 sm:pt-12">
          <Image src={logo} alt="" aria-hidden className="rise mx-auto h-6 w-auto opacity-90 sm:h-7" />
          <h1 className="rise rise-1 mx-auto mt-3 max-w-[820px] text-[36px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[56px]">
            Turn any dumb eyeglasses into AI glasses.
          </h1>
          <p className="rise rise-2 mx-auto mt-3 max-w-[540px] text-[16px] leading-relaxed text-[#6e6e73] sm:text-[19px]">
            A tiny clip for the glasses you already own. It sees what you see, hears what you ask, and answers in
            your ear.
          </p>
          <div id="waitlist" className="rise rise-2 mt-6 scroll-mt-32">
            <WaitlistForm />
          </div>

          {/* Two loops side by side; height is capped so both fit above the fold. */}
          <div className="rise rise-3 mx-auto mt-8 grid max-w-[min(100%,calc((100svh-480px)*2+12px))] grid-cols-2 gap-2 sm:mt-10 sm:gap-3">
            <HeroLoop
              video="/hero/hand.mp4"
              poster={heroHand}
              alt="Fingers turning the silver x1 clip, its blue light pulsing"
            />
            <HeroLoop
              video="/hero/model.mp4"
              poster={heroModel}
              alt="A man taps the x1 clip on his tortoiseshell glasses"
            />
          </div>
        </section>

        {/* Everyday */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-5">
          <Heading eyebrow="Everyday" title="Your world," sub="explained." />
          <p className="mx-auto mt-5 max-w-[520px] text-center text-[17px] leading-relaxed text-[#6e6e73] sm:text-[19px]">
            Touch the clip and ask. x1 looks at what&rsquo;s in front of you and answers in a sentence or two.
          </p>

          <div className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {useCases.map((u) => (
              <figure key={u.label} className="w-[62%] shrink-0 snap-start sm:w-auto">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] bg-[#f5f5f7]">
                  <Image
                    src={u.src}
                    alt={u.alt}
                    placeholder="blur"
                    sizes="(max-width: 640px) 62vw, (max-width: 1024px) 33vw, 170px"
                    className={`h-full w-full object-cover ${u.focus}`}
                  />
                </div>
                <figcaption className="mt-3 px-0.5">
                  <span className="text-[12px] font-semibold text-accent">{u.label}</span>
                  <span className="mt-0.5 block text-[15px] font-medium leading-snug tracking-[-0.01em]">
                    {u.quote}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* The clip */}
        <section className="mt-24 bg-[#f5f5f7] py-20 sm:mt-32 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-5">
            <Heading eyebrow="The clip" title="Small enough" sub="to forget it’s there." />
            <p className="mx-auto mt-5 max-w-[520px] text-center text-[17px] leading-relaxed text-[#6e6e73] sm:text-[19px]">
              A camera, a microphone and a speaker in one smooth capsule.
            </p>

            <div className="mt-10 overflow-hidden rounded-[22px] bg-white sm:mt-14 sm:rounded-[28px]">
              <Image
                src={clipHand}
                alt="The silver x1 clip held between two fingers"
                placeholder="blur"
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="w-full mix-blend-multiply"
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3 sm:gap-3">
              {colors.map((c) => (
                <figure key={c.label} className="overflow-hidden rounded-[14px] bg-white sm:rounded-[20px]">
                  <Image
                    src={c.src}
                    alt={`x1 in ${c.label.toLowerCase()}`}
                    placeholder="blur"
                    sizes="(max-width: 640px) 33vw, 340px"
                    className="w-full mix-blend-multiply"
                  />
                  <figcaption className="pb-3 text-center text-[12px] font-medium text-[#6e6e73] sm:pb-4 sm:text-[14px]">
                    {c.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Your glasses */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-5">
          <Heading eyebrow="Any frame" title="Fits the glasses" sub="you already own." />
          <p className="mx-auto mt-5 max-w-[520px] text-center text-[17px] leading-relaxed text-[#6e6e73] sm:text-[19px]">
            Prescription frames, readers, sunglasses. Nothing new to buy, no new look to get used to.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-2 sm:mt-14 sm:gap-3">
            {glasses.map((g) => (
              <div
                key={g.alt}
                className="relative aspect-square overflow-hidden rounded-[14px] bg-[#f5f5f7] sm:aspect-[4/3] sm:rounded-[20px]"
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  placeholder="blur"
                  sizes="(max-width: 640px) 33vw, 340px"
                  className={`h-full w-full mix-blend-multiply ${g.fit}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-5">
          <Heading eyebrow="How it works" title="Clip. Touch." sub="Ask." />
          <ol className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-8">
            {steps.map(([title, body], i) => (
              <li key={title} className="border-t border-black/10 pt-5">
                <span className="text-[13px] font-semibold text-accent">0{i + 1}</span>
                <h3 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#6e6e73]">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Proof: the real prototype */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:mt-32 sm:px-5">
          <Heading eyebrow="Not just a render" title="It already works." sub="Here’s the prototype." />
          <p className="mx-auto mt-5 max-w-[560px] text-center text-[17px] leading-relaxed text-[#6e6e73] sm:text-[19px]">
            x1 started at VexoHacks, a hackathon held at Y Combinator, where it was a finalist.
          </p>

          {/* 세 장 한 줄: 폭 비율(4 : 8.6 : 4)을 이미지 비율에 맞춰 높이가 같게. 모바일은 스크린샷 위 + 사진 두 장 */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-2 sm:mt-12 sm:grid-cols-[4fr_8.6fr_4fr] sm:gap-3">
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#f5f5f7] sm:rounded-[18px]">
                <Image
                  src={protoHand}
                  alt="The working x1 prototype held in a hand next to a pair of glasses"
                  placeholder="blur"
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover object-[50%_58%]"
                />
              </div>
              <figcaption className="mt-2 px-0.5 text-[12px] text-[#86868b]">The prototype.</figcaption>
            </figure>
            <figure className="order-first col-span-2 sm:order-none sm:col-span-1">
              <div className="relative aspect-[1600/930] overflow-hidden rounded-[14px] bg-[#111] sm:rounded-[18px]">
                <Image
                  src={protoDashboard}
                  alt="A real answer from the prototype: it identifies a bowl of ramen and estimates 710 kcal"
                  placeholder="blur"
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2 px-0.5 text-[12px] text-[#86868b]">
                A real answer from the prototype, unedited.
              </figcaption>
            </figure>
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#f5f5f7] sm:rounded-[18px]">
                <Image
                  src={teamYc}
                  alt="An x1 engineer holding the prototype and a laptop at Y Combinator"
                  placeholder="blur"
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover object-[60%_50%]"
                />
              </div>
              <figcaption className="mt-2 px-0.5 text-[12px] text-[#86868b]">At VexoHacks, held at Y Combinator.</figcaption>
            </figure>
          </div>

          <p className="mt-10 text-center text-[22px] font-semibold tracking-[-0.03em] sm:mt-12 sm:text-[28px]">
            Built by engineers from Microsoft and AWS.
          </p>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-3xl px-4 sm:mt-32 sm:px-5">
          <Heading eyebrow="FAQ" title="Questions," sub="answered." />
          <div className="mt-10 border-b border-black/10 sm:mt-14">
            {faqs.map(([q, a]) => (
              <details key={q} className="group border-t border-black/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold tracking-[-0.01em] sm:text-[19px] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden
                    className="text-[22px] font-normal leading-none text-[#86868b] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto mt-24 max-w-5xl px-4 pb-24 text-center sm:mt-32 sm:px-5 sm:pb-32">
          <h2 className="text-[34px] font-semibold leading-tight tracking-[-0.045em] sm:text-[52px]">
            Now with Meta Muse.
          </h2>
          <p className="mt-2 text-[17px] text-[#6e6e73] sm:text-[21px]">Meet x1. Your glasses, reimagined.</p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-[12px] text-[#86868b]">
        © 2026 x1. Fittings Labs · San Francisco, CA
      </footer>
    </>
  );
}

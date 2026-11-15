import Image from "next/image";
import { WaitlistForm } from "./waitlist-form";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-5">
          <span className="text-[19px] font-semibold tracking-[-0.04em]">x1</span>
          <a
            href="#waitlist"
            className="rounded-full bg-[#1d1d1f] px-3.5 py-1 text-[12px] font-medium text-white transition hover:bg-black"
          >
            Join waitlist
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-16 text-center sm:px-5 sm:pt-24">
        <p className="rise text-[15px] font-semibold text-[#86868b] sm:text-[17px]">x1</p>
        <h1 className="rise rise-1 mx-auto mt-2 max-w-[860px] text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[72px]">
          Turn any dumb eyeglasses into AI glasses.
        </h1>
        <p className="rise rise-2 mx-auto mt-5 max-w-[560px] text-[17px] leading-relaxed text-[#6e6e73] sm:text-[21px]">
          A tiny clip for the glasses you already own. It sees what you see, hears what you ask, and answers in your ear.
        </p>

        <div id="waitlist" className="rise rise-2 mt-8 scroll-mt-32">
          <WaitlistForm />
        </div>

        <div className="rise rise-3 mt-16 grid grid-cols-2 gap-2.5 sm:mt-20 sm:gap-4">
          <div className="relative aspect-[1/1.07] overflow-hidden rounded-[14px] bg-[#f5f5f7] sm:rounded-[22px]">
            <Image
              src="/x1-device.gif"
              alt="The x1 clip held between two fingers"
              fill
              unoptimized
              priority
              sizes="(max-width: 640px) 50vw, 500px"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[1/1.07] overflow-hidden rounded-[14px] bg-[#f5f5f7] sm:rounded-[22px]">
            <Image
              src="/x1-worn.jpg"
              alt="x1 clipped onto the arm of everyday eyeglasses"
              fill
              priority
              sizes="(max-width: 640px) 50vw, 500px"
              className="object-cover"
            />
          </div>
        </div>

        <h2 className="mt-20 text-[34px] font-semibold leading-tight tracking-[-0.045em] sm:mt-28 sm:text-[56px]">
          Now with Meta Muse.
        </h2>
        <p className="mt-2 text-[17px] text-[#6e6e73] sm:text-[21px]">Meet x1. Your glasses, reimagined.</p>
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-[12px] text-[#86868b]">
        © 2026 x1. Fittings Labs.
      </footer>
    </>
  );
}

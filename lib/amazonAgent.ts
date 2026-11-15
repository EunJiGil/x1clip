// 노트북 크롬을 직접 조작해서 아마존 장바구니에 담기 (결제는 절대 안 함)
// - 전용 크롬 프로필(.amazon-profile)에 사용자가 한 번 직접 로그인해두면 계속 유지됨
// - 사람처럼 천천히, 한 번에 최대 3개만 담음
import type { BrowserContext, Page } from "playwright-core";
import path from "node:path";
import { CATALOG } from "./amazon";

export const MAX_ITEMS = 3;

export type AmazonItemState = "waiting" | "adding" | "added" | "failed";
export type AmazonJob = {
  status: "idle" | "running" | "done" | "error";
  message: string;
  items: { asin: string; title: string; state: AmazonItemState }[];
  at: number;
};

const PROFILE_DIR = path.join(process.cwd(), ".amazon-profile");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const g = globalThis as unknown as { __amazon?: { ctx: BrowserContext | null; job: AmazonJob } };
const state = (g.__amazon ??= {
  ctx: null,
  job: { status: "idle", message: "", items: [], at: 0 },
});

export function getJob() {
  return state.job;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const humanPause = (min = 1200, max = 2800) => sleep(min + Math.random() * (max - min));

async function getContext() {
  if (state.ctx) {
    try {
      state.ctx.pages(); // 살아있는지 확인
      return state.ctx;
    } catch {
      state.ctx = null;
    }
  }
  const { chromium } = await import("playwright-core");
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: CHROME,
    headless: false,
    viewport: null,
    args: ["--start-maximized"],
  });
  ctx.on("close", () => {
    state.ctx = null;
  });
  state.ctx = ctx;
  return ctx;
}

async function getPage(): Promise<Page> {
  const ctx = await getContext();
  return ctx.pages()[0] ?? (await ctx.newPage());
}

/** 로그인용: 아마존 첫 화면 열기 */
export async function openAmazon() {
  const page = await getPage();
  await page.goto("https://www.amazon.com/", { waitUntil: "domcontentloaded" });
  await page.bringToFront();
}

async function isSignedIn(page: Page) {
  const text = (await page.locator("#nav-link-accountList").innerText().catch(() => "")) || "";
  return text.length > 0 && !/sign in/i.test(text);
}

async function addOne(page: Page, asin: string): Promise<boolean> {
  await page.goto(`https://www.amazon.com/dp/${asin}`, { waitUntil: "domcontentloaded" });
  await humanPause(1500, 3000);
  await page.mouse.wheel(0, 300 + Math.random() * 300); // 상품 페이지를 보는 것처럼 살짝 스크롤
  await humanPause(800, 1600);

  // 식료품은 "Subscribe & Save"가 기본 선택인 경우가 있어서 "One-time purchase"를 먼저 고름
  const oneTime = page.getByText(/one-time purchase/i).first();
  if (await oneTime.isVisible().catch(() => false)) {
    await oneTime.click().catch(() => {});
    await humanPause(700, 1400);
  }

  const button = page.locator("#add-to-cart-button, input[name='submit.add-to-cart']").first();
  if (await button.isVisible().catch(() => false)) {
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await humanPause(500, 1100);
    await button.click();
  } else {
    // 일반 "Add to Cart"가 없고 "See All Buying Options"만 있는 상품: 판매자 목록에서 첫 번째 담기
    const seeAll = page
      .locator("#buybox-see-all-buying-choices a, a:has-text('See All Buying Options'), a:has-text('See all buying options')")
      .first();
    if (!(await seeAll.isVisible().catch(() => false))) return false;
    await seeAll.click();
    const offerAdd = page.locator("#aod-offer-list input[name='submit.addToCart'], #aod-pinned-offer input[name='submit.addToCart']").first();
    await offerAdd.waitFor({ timeout: 8_000 }).catch(() => {});
    if (!(await offerAdd.isVisible().catch(() => false))) return false;
    await humanPause(800, 1500);
    await offerAdd.click();
  }

  // 보호플랜 등 추가 팝업이 뜨면 "No thanks"
  await humanPause(1200, 2000);
  const noThanks = page.locator("#attachSiNoCoverage, button:has-text('No thanks')").first();
  if (await noThanks.isVisible().catch(() => false)) await noThanks.click().catch(() => {});

  // 담겼는지 확인
  const ok = await Promise.race([
    page
      .getByText(/added to (cart|basket)/i)
      .first()
      .waitFor({ timeout: 10_000 })
      .then(() => true),
    page.waitForURL(/\/cart|huc|smart-wagon/i, { timeout: 10_000 }).then(() => true),
  ]).catch(() => false);
  return ok;
}

/** 장바구니에 담기 (백그라운드로 실행, 상태는 getJob()으로 확인) */
export async function addToAmazonCart(asins: string[]) {
  if (state.job.status === "running") return state.job;
  const pick = asins.slice(0, MAX_ITEMS);
  state.job = {
    status: "running",
    message: "Opening Amazon…",
    at: Date.now(),
    items: pick.map((asin) => ({
      asin,
      title: CATALOG.find((p) => p.asin === asin)?.title ?? asin,
      state: "waiting",
    })),
  };

  void (async () => {
    try {
      const page = await getPage();
      await page.bringToFront();
      await page.goto("https://www.amazon.com/", { waitUntil: "domcontentloaded" });
      await humanPause();
      if (!(await isSignedIn(page))) {
        state.job.status = "error";
        state.job.message = "Not signed in. Sign in to Amazon in the Chrome window, then try again.";
        return;
      }
      for (const item of state.job.items) {
        item.state = "adding";
        state.job.message = `Adding ${item.title}…`;
        const ok = await addOne(page, item.asin).catch(() => false);
        item.state = ok ? "added" : "failed";
        await humanPause(2500, 4500); // 다음 상품 전에 쉬기
      }
      await page.goto("https://www.amazon.com/gp/cart/view.html", { waitUntil: "domcontentloaded" });
      const added = state.job.items.filter((i) => i.state === "added").length;
      state.job.status = "done";
      state.job.message = `Added ${added} of ${state.job.items.length} items to your Amazon cart.`;
    } catch (err) {
      state.job.status = "error";
      state.job.message = err instanceof Error ? err.message : String(err);
    }
  })();

  return state.job;
}

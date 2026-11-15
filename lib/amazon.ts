// 장바구니 재료 -> 아마존 상품 매칭
// ASIN은 amazon.com 상품 페이지(/dp/<ASIN>)에서 확인한 값 (2026-11 검색)

export type AmazonProduct = { asin: string; title: string; keywords: string[] };

export const CATALOG: AmazonProduct[] = [
  { asin: "B00MRPLYGA", title: "Nongshim Shin Ramyun, 10 ct", keywords: ["ramen", "ramyun", "noodle"] },
  { asin: "B000QCJ7UQ", title: "Kikkoman Soy Sauce, 10 fl oz", keywords: ["soy sauce", "soy"] },
  { asin: "B008K0Y3FK", title: "Kadoya Pure Sesame Oil, 5.5 oz", keywords: ["sesame oil"] },
  { asin: "B00I01ZXYE", title: "ONE ORGANIC Sushi Nori, 50 sheets", keywords: ["nori", "seaweed"] },
  { asin: "B000R30L5E", title: "Swanson Chicken Broth, 32 oz", keywords: ["broth", "stock"] },
  { asin: "B00IBNZAEE", title: "Hikari Organic White Miso, 17.6 oz", keywords: ["miso"] },
];

/** AI가 장바구니 이름을 이 목록에 맞추도록 프롬프트에 넣을 이름들 */
export const PREFERRED_NAMES = [
  "ramen noodles",
  "chicken broth",
  "soy sauce",
  "miso paste",
  "sesame oil",
  "nori",
  "eggs",
  "green onions",
  "pork belly",
  "bean sprouts",
  "garlic",
  "ginger",
];

export function matchProduct(item: string): AmazonProduct | null {
  const s = item.toLowerCase();
  return CATALOG.find((p) => p.keywords.some((k) => s.includes(k))) ?? null;
}

/** 장바구니 재료 중 아마존 상품과 매칭되는 ASIN (중복 제거, 장바구니 순서) */
export function matchedAsins(cart: string[]) {
  return [...new Set(cart.map((i) => matchProduct(i)?.asin).filter((a): a is string => !!a))];
}

export function searchUrl(item: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(item)}&i=grocery`;
}

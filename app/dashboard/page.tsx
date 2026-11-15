import type { Metadata } from "next";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "x1 — Live" };

export default function Page() {
  return <Dashboard />;
}

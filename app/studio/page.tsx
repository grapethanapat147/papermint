import type { Metadata } from "next";
import StudioClient from "./StudioClient";

export const metadata: Metadata = {
  title: "Papermint Studio — Branded receipts",
  description: "Create beautiful, trustworthy branded business receipts.",
};

export default function StudioPage() {
  return <StudioClient />;
}

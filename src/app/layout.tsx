import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "WoundCare — Wound monitoring",
  description: "A simple, secure way to track wound photos over time."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
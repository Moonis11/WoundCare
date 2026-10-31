import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "WoundCare — Yara kuzatuvi",
  description: "Yara holatini suratlar va qaydlar orqali vaqt davomida hujjatlashtirish platformasi."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uz"><body>{children}</body></html>;
}
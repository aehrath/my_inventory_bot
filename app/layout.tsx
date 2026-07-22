import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockBot — Small Business Inventory",
  description: "Inventory, cost of goods, sales tax, and tax-ready business totals in one private workspace.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

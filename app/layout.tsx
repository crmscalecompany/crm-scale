import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CRM Interno — Scale",
  description: "CRM interno da Scale Company — SDR, Closer e Account Manager em um único funil.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} antialiased`}>
      {/* suppressHydrationWarning: some browser extensions (ColorZilla, Grammarly, etc.)
          inject attributes like cz-shortcut-listen into <body> before React hydrates,
          which otherwise falsely reports as a hydration mismatch. */}
      <body className="min-h-screen" suppressHydrationWarning>
        {/* Ambient neon blobs — sit behind the glass cards so their
            backdrop-blur has real color to pick up instead of blurring flat black. */}
        <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
          <div
            className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-accent-primary/25 blur-[120px]"
            style={{ animation: "drift-a 18s ease-in-out infinite", willChange: "transform" }}
          />
          <div
            className="absolute -right-32 top-1/4 h-[380px] w-[380px] rounded-full bg-accent-light/20 blur-[130px]"
            style={{ animation: "drift-b 22s ease-in-out infinite", willChange: "transform" }}
          />
          <div
            className="absolute bottom-[-15%] left-1/3 h-[440px] w-[440px] rounded-full bg-accent-primary/15 blur-[140px]"
            style={{ animation: "drift-c 26s ease-in-out infinite", willChange: "transform" }}
          />
        </div>
        <DotPattern
          cr={1}
          className={cn(
            "fixed inset-0 -z-10 h-full w-full fill-accent-primary/10 md:fill-accent-primary/10",
            "[mask-image:radial-gradient(ellipse_80%_60%_at_50%_-10%,white,transparent_75%)]"
          )}
        />
        {children}
      </body>
    </html>
  );
}

import { Inter, Space_Grotesk } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Clip Central",
  description: "Discord clipping campaign command center",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="overflow-x-hidden font-sans">
        <Providers>
          <AppShell session={session}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

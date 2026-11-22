import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MovieFlow — Watch Together. Listen Together.",
  description: "A premium Apple-inspired social entertainment platform combining movie streaming, music listening, synchronized watch parties, and FaceTime-style communication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#1D1D1F] antialiased selection:bg-[#2563EB]/20 selection:text-[#1D1D1F]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

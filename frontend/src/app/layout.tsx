import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MovieFlow — Watch Together. Listen Together.",
  description:
    "A premium Apple-inspired social entertainment platform combining movie streaming, music listening, synchronized watch parties, and FaceTime-style communication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen antialiased"
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

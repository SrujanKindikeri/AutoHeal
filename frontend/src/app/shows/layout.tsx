import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TV Shows | MovieFlow",
};

export default function ShowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

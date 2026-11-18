import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Movies | MovieFlow",
};

export default function MoviesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

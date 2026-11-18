import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Library | MovieFlow",
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

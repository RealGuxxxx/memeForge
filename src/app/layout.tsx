import type { Metadata } from "next";
import { Providers } from "./providers";
import "@/styles/base.css";
import "@/styles/tokenlist-fix.css";

export const metadata: Metadata = {
  title: "Meme Forge",
  description: "Create and share your memes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

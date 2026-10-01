import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";
export const metadata: Metadata = {
  title: "Bodas de Prata · Cleide & Flávio",
  description: "Nove dias de estrada, história e memórias a dois.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Nossa viagem",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#aa3d2e",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tukio | Tiketi za Matukio Tanzania",
  description:
    "Uza na nunua tiketi za matukio Tanzania kwa urahisi. Lipa kwa Mobile Money na pokea tiketi yako ya QR Code papo hapo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sw" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

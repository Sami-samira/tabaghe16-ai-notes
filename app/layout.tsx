import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "طبقه ۱۶ | متن و خلاصه پادکست",
  description:
    "دفتر شنیداری شخصی برای انتخاب اپیزودهای پادکست طبقه ۱۶، تبدیل صدا به متن و دریافت خلاصه فارسی.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}

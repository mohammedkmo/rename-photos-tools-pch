import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "../globals.css";
import Header from "@/components/layout/Header";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getLangDir } from 'rtl-detect';
import { Toaster } from "@/components/ui/toaster"
import DeviceProvider from "@/components/DeviceProvider";
import { Analytics } from '@vercel/analytics/react';

const rubik = Rubik({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
});


export const metadata: Metadata = {
  title: "PCH badging",
  description: "Petrochina PCH badging",
};

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string }
}>) {
  const messages = await getMessages();

  const direction = getLangDir(locale);

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${GeistSans.variable} ${rubik.variable}`}
    >
      <body className="bg-pch-ground text-pch-ink">
        <NextIntlClientProvider messages={messages}>
          <DeviceProvider>
            {/* A fixed height, not a minimum: the shell must bound its children
                or their overflow-auto never engages and the page scrolls
                instead of the sheet. */}
            <div className="h-[100dvh] flex flex-col overflow-hidden">
              <Header />
              {children}
            </div>
          </DeviceProvider>
        </NextIntlClientProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}

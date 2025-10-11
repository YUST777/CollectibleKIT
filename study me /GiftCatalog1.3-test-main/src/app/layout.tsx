import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AppProvider } from "@/components/app-provider";
import { ClientBody } from "./ClientBody";
import { LoadingScreen } from '@/components/LoadingScreen';
import { ClientStyleEffects } from '@/components/ClientStyleEffects';

export const metadata: Metadata = {
  title: "Gifts Catalog",
  description: "A catalog for Telegram NFT gifts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-[#121212] dark:to-[#121212] font-sans text-sm">
        <LoadingScreen>
          <AppProvider>
            <ClientStyleEffects />
            <ClientBody>{children}</ClientBody>
            <Toaster position="top-right" />
          </AppProvider>
        </LoadingScreen>
      </body>
    </html>
  );
}

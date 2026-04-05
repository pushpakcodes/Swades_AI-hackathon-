"use client";

import { Toaster } from "@my-better-t-app/ui/components/sonner";

import { ThemeProvider } from "./theme-provider";
import { BackgroundUploader } from "./background-uploader";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <BackgroundUploader />
      <Toaster richColors />
    </ThemeProvider>
  );
}

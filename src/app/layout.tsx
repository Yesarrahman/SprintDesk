import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const absans = localFont({ 
  src: "../../public/fonts/Absans-Regular.woff2",
  variable: "--font-absans" 
});

export const metadata: Metadata = {
  title: "SprintDesk - Modern Task Management",
  description: "Modern SaaS task and project management for teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${absans.className} ${absans.variable} antialiased bg-slate-50 dark:bg-[#0D2440] text-slate-900 dark:text-slate-50`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

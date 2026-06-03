import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "AI Native Programming Tutor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#059669', // emerald-600
          colorBackground: '#FFFFFF', // white
          colorText: '#1E293B', // slate-800
          colorTextSecondary: '#475569', // slate-600
          colorDanger: '#DC2626', // red-600
          colorSuccess: '#10B981', // emerald-500
          colorWarning: '#D97706', // amber-600
          colorInputBackground: '#F1F5F9', // slate-100
          colorInputText: '#1E293B', // slate-800
          borderRadius: '0.375rem', // 6px rounded-md
          fontFamily: 'var(--font-geist-sans), sans-serif',
        },
        elements: {
          card: 'rounded-xl shadow-sm border border-slate-200',
          formButtonPrimary: 'font-medium',
        }
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}

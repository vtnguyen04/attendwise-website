import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/context/app-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AttendWise',
  description: 'Event Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders>
            {children}
          </AppProviders>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
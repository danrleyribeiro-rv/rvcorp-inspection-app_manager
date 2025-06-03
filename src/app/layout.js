// src/app/layout.js
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from "@/components/theme-provider";
import { NotificationProvider } from '@/context/notification-context';
import { LoadingProvider } from '@/context/loading-context'; // Import LoadingProvider
import { TopProgressBar } from '@/components/ui/top-progress-bar'; // Import TopProgressBar
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Lince | Gerência de Inspeções',
  description: 'Management platform for Lince Inspection App',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NotificationProvider>
              <LoadingProvider> {/* Wrap with LoadingProvider */}
                <TopProgressBar /> {/* Render the progress bar here, above children */}
                {children}
              </LoadingProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
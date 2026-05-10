import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import '@/app/globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const themeScript = `
(function() {
  var s = typeof document !== 'undefined' && document.documentElement;
  if (!s) return;
  var stored = localStorage.getItem('theme');
  var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  s.classList.toggle('dark', dark);
})();
`;

export const metadata: Metadata = {
  title: 'My Little Moments – Daycare Admin',
  description: 'Daycare and school management for My Little Moments',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-warm-50 font-sans text-slate-800 antialiased dark:bg-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

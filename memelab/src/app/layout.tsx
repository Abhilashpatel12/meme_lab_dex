import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";
import { Navbar } from "@/components/ui/Navbar";
import AppWalletProviders from "@/components/app-providers";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MemeLab DEX',
  description: 'Experimental Token Launchpad',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline theme script – runs BEFORE hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (
                    theme === 'dark' ||
                    (!theme && window.matchMedia &&
                      window.matchMedia('(prefers-color-scheme: dark)').matches)
                  ) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className={inter.className} suppressHydrationWarning>
        <AppWalletProviders>
          <Navbar />
          <main className="bg-lab-dark min-h-screen text-white">
            {children}
          </main>
        </AppWalletProviders>
      </body>
    </html>
  );
}

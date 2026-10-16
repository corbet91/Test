import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revenue Dashboard',
  description: 'Restaurant revenue trend dashboard with admin panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

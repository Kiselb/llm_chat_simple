import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Диалог — персональный AI-чат',
  description: 'Общайтесь с AI и возвращайтесь к сохранённым диалогам в любое время.',
  openGraph: {
    title: 'Диалог — персональный AI-чат',
    description: 'Общайтесь с AI и возвращайтесь к сохранённым диалогам в любое время.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Диалог — персональный AI-чат' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Диалог — персональный AI-чат',
    description: 'Общайтесь с AI и возвращайтесь к сохранённым диалогам в любое время.',
    images: ['/og.jpg'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}

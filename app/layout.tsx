import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://verity-ellworth.ellworth-acquaye.chatgpt.site'),
  title: 'Verity — Governed verification platform',
  description: 'An independent engineering study in typed evidence, isolated execution, and human-gated AI remediation.',
  openGraph: {
    title: 'Verity — Governed verification platform',
    description: 'Evidence before action. An independent engineering study by Ellworth Acquaye.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Verity — Evidence before action.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verity — Governed verification platform',
    description: 'Evidence before action. An independent engineering study by Ellworth Acquaye.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}

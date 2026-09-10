import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Astra Game Center', description: 'Your games. Your space.', icons: { icon: '/center/brand.svg' } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="stylesheet" href="/center/style.css" /><link rel="stylesheet" href="/center/auth.css" /></head><body>{children}</body></html>;
}

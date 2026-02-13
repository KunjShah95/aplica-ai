import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenClaw - Your Personal AI Evolution',
  description:
    'The safest and most intuitive AI assistant. Automate tasks, analyze data, and create content with the speed of thought.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Vercel Monitoring',
  description: 'Monitor your Vercel projects, deployments, and domains.',
  metadataBase: new URL('https://vercel.com'),
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      style={
        {
          '--font-geist-sans': GeistSans.style.fontFamily,
          '--font-geist-mono': GeistMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

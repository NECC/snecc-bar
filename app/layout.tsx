import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'sNECC Bar',
  description: 'Created with v0',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
    // iOS "Add to Home Screen": usa apple-touch-icon (PNG 180x180). Se não existir, o Safari mostra a 1.ª letra do título ("S").
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt">
      <head>
        {/* iOS Add to Home Screen: ícone que aparece no ecrã inicial (evita mostrar "S") */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )


}

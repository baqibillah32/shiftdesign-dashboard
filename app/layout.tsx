import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shiftdesign Dashboard',
  description: 'Business dashboard for Shiftdesign Studio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}

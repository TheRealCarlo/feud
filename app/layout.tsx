import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Brawler Bearz Feud',
  description: 'A strategic game for Brawler Bearz holders',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}


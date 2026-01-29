import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "sayitLPU - Anonymous Confessions",
  description: "A safe space for LPU students to share their thoughts anonymously. Confess your deepest, darkest secrets without worrying about anyone finding out your true identity.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}


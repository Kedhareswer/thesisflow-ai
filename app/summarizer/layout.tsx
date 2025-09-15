import type { ReactNode } from 'react'
export { metadata } from '../seo/summarizer-metadata'

export default function SummarizerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

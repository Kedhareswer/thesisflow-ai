import type { ReactNode } from 'react'
export { metadata } from '../seo/explorer-metadata'

export default function ExplorerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

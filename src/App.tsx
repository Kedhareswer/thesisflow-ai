
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { useRouter } from 'next/router'

export default function App() {
  return (
    <AppRouterCacheProvider>
      <div id="app-root">
        {/* This App component is just a bridge for Vite to work with Next.js */}
        {/* All actual routing is handled by Next.js in app/ directory */}
      </div>
    </AppRouterCacheProvider>
  )
}

import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { HelmetProvider } from 'react-helmet-async'
import { LoadingSpinner } from './components/LoadingSpinner'
import './i18n/config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Suspense>
    </HelmetProvider>
  </StrictMode>,
)

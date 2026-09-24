import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateLegacyProgressKeys } from './lib/progressMigration'

// Move progress saved under the old subject-only keys to the per-block keys before anything reads it.
migrateLegacyProgressKeys()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { EntitlementProvider } from './state/entitlement'
import { HistoryProvider } from './state/history'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EntitlementProvider>
      <HistoryProvider>
        <App />
      </HistoryProvider>
    </EntitlementProvider>
  </React.StrictMode>,
)

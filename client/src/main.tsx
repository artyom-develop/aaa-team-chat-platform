/// <reference types="./vite-env.d.ts" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RouterApp } from './Router.tsx'
import { BrowserRouter } from 'react-router-dom'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

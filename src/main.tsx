import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import './index.css'

const el = document.getElementById('root') as HTMLElement
createRoot(el).render(<App />)
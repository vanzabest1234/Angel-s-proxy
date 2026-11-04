import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import SearchPage from './browse/SearchPage.jsx'
import './styles/shell.css'

// The browser's content frame loads the same origin at /search, so the frame
// renders the results page instead of the desktop shell.
const isSearchPage = window.location.pathname === '/search'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isSearchPage ? <SearchPage /> : <App />}</React.StrictMode>,
)

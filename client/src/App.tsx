import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { LobbyPage } from './pages/LobbyPage'
import { RoomPage } from './pages/RoomPage'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { RouterApp } from './Router'
import { ToasterUtil } from './utils/toaster'

function App() {
  return (
    <>
      <ToasterUtil />
      <RouterApp />
    </>
  )
}

export default App

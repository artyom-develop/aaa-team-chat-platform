import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { LobbyPage } from './pages/LobbyPage'
import { RoomPage } from './pages/RoomPage'

export const RouterApp = () => {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />
			<Route path="/login" element={<LoginPage />} />
			<Route path="/register" element={<RegisterPage />} />

			<Route
				path="/lobby/:slug"
				element={
					<ProtectedRoute>
						<LobbyPage />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/room/:slug"
				element={
					<ProtectedRoute>
						<RoomPage />
					</ProtectedRoute>
				}
			/>

			{/* Redirect all unknown routes to home */}
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	)
}
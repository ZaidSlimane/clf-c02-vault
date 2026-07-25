import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DomainPage from './pages/DomainPage'
import ExamPage from './pages/ExamPage'
import SignInPage from './pages/SignInPage'
import TrackerPage from './pages/TrackerPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/exam" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
        <Route path="/domain/:domainId" element={<ProtectedRoute><DomainPage /></ProtectedRoute>} />
        <Route path="/domain/:domainId/:subNoteId" element={<ProtectedRoute><DomainPage /></ProtectedRoute>} />
        <Route path="/tracker" element={<ProtectedRoute><TrackerPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

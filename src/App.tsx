import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DomainPage from './pages/DomainPage'
import ExamPage from './pages/ExamPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/domain/:domainId" element={<DomainPage />} />
        <Route path="/domain/:domainId/:subNoteId" element={<DomainPage />} />
      </Route>
    </Routes>
  )
}

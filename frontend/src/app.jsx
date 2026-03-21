import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ResultPage from './pages/ResultPage'
import DiaryPage from './pages/DiaryPage'
import MapPage from './pages/MapPage'
import BrandsPage from './pages/BrandsPage'
import FamilyPage from './pages/FamilyPage'
import SymptomPage from './pages/SymptomPage'
import FestivalPage from './pages/FestivalPage'
import AdminDashboard from './pages/AdminDashboard'
import AuthPage from './pages/AuthPage'
import Chatbot from './components/chatbot'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/"         element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
          <Route path="/auth"     element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
          <Route path="/result"   element={<ErrorBoundary><ResultPage /></ErrorBoundary>} />
          <Route path="/diary"    element={<ErrorBoundary><DiaryPage /></ErrorBoundary>} />
          <Route path="/map"      element={<ErrorBoundary><MapPage /></ErrorBoundary>} />
          <Route path="/brands"   element={<ErrorBoundary><BrandsPage /></ErrorBoundary>} />
          <Route path="/family"   element={<ErrorBoundary><FamilyPage /></ErrorBoundary>} />
          <Route path="/symptoms" element={<ErrorBoundary><SymptomPage /></ErrorBoundary>} />
          <Route path="/festival" element={<ErrorBoundary><FestivalPage /></ErrorBoundary>} />
          <Route path="/admin"    element={<ErrorBoundary showError><AdminDashboard /></ErrorBoundary>} />
        </Routes>
        <Chatbot />
      </Layout>
    </ErrorBoundary>
  )
}
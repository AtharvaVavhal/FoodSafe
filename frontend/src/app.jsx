import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
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
import MealPlannerPage from './pages/MealPlannerPage'
import Chatbot from './components/chatbot'
import ErrorBoundary from './components/ErrorBoundary'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <PageTransition>
          <Routes>
            <Route path="/"         element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/auth"     element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
            <Route path="/scan"     element={<ProtectedRoute><ErrorBoundary><HomePage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/result"   element={<ProtectedRoute><ErrorBoundary><ResultPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/diary"    element={<ProtectedRoute><ErrorBoundary><DiaryPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/map"      element={<ProtectedRoute><ErrorBoundary><MapPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/brands"   element={<ProtectedRoute><ErrorBoundary><BrandsPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/family"   element={<ProtectedRoute><ErrorBoundary><FamilyPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/symptoms" element={<ProtectedRoute><ErrorBoundary><SymptomPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/festival" element={<ProtectedRoute><ErrorBoundary><FestivalPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/meal"     element={<ProtectedRoute><ErrorBoundary><MealPlannerPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/admin"    element={<ProtectedRoute><ErrorBoundary showError><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
          </Routes>
        </PageTransition>
        <Chatbot />
      </Layout>
    </ErrorBoundary>
  )
}

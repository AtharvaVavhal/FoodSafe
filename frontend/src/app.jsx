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

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <PageTransition>
          <Routes>
            <Route path="/scan"      element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
            <Route path="/"
            element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/auth"     element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
            <Route path="/result"   element={<ErrorBoundary><ResultPage /></ErrorBoundary>} />
            <Route path="/diary"    element={<ErrorBoundary><DiaryPage /></ErrorBoundary>} />
            <Route path="/map"      element={<ErrorBoundary><MapPage /></ErrorBoundary>} />
            <Route path="/brands"   element={<ErrorBoundary><BrandsPage /></ErrorBoundary>} />
            <Route path="/family"   element={<ErrorBoundary><FamilyPage /></ErrorBoundary>} />
            <Route path="/symptoms" element={<ErrorBoundary><SymptomPage /></ErrorBoundary>} />
            <Route path="/festival" element={<ErrorBoundary><FestivalPage /></ErrorBoundary>} />
            <Route path="/meal"     element={<ErrorBoundary><MealPlannerPage /></ErrorBoundary>} />
            <Route path="/admin"    element={<ErrorBoundary showError><AdminDashboard /></ErrorBoundary>} />
          </Routes>
        </PageTransition>
        <Chatbot />
      </Layout>
    </ErrorBoundary>
  )
}
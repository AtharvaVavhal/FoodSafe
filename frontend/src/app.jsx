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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"         element={<HomePage />} />
        <Route path="/result"   element={<ResultPage />} />
        <Route path="/diary"    element={<DiaryPage />} />
        <Route path="/map"      element={<MapPage />} />
        <Route path="/brands"   element={<BrandsPage />} />
        <Route path="/family"   element={<FamilyPage />} />
        <Route path="/symptoms" element={<SymptomPage />} />
        <Route path="/festival" element={<FestivalPage />} />
        <Route path="/admin"    element={<AdminDashboard />} />
      </Routes>
    </Layout>
  )
}

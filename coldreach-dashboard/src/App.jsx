import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Contacts from './pages/Contacts'
import Applications from './pages/Applications'
import Pipeline from './pages/Pipeline'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

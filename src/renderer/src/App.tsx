import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout'
import HomePage from '@/pages/home'
import PlaceholderPage from '@/pages/page'

function App(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/playground/history" element={<PlaceholderPage title="History" />} />
        <Route path="/playground/starred" element={<PlaceholderPage title="Starred" />} />
        <Route path="/playground/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/models/genesis" element={<PlaceholderPage title="Genesis" />} />
        <Route path="/models/explorer" element={<PlaceholderPage title="Explorer" />} />
        <Route path="/models/quantum" element={<PlaceholderPage title="Quantum" />} />
        <Route path="/docs/introduction" element={<PlaceholderPage title="Introduction" />} />
        <Route path="/docs/get-started" element={<PlaceholderPage title="Get Started" />} />
        <Route path="/docs/tutorials" element={<PlaceholderPage title="Tutorials" />} />
        <Route path="/docs/changelog" element={<PlaceholderPage title="Changelog" />} />
        <Route path="/settings/general" element={<PlaceholderPage title="General" />} />
        <Route path="/settings/team" element={<PlaceholderPage title="Team" />} />
        <Route path="/settings/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/settings/limits" element={<PlaceholderPage title="Limits" />} />
        <Route path="/projects/design-engineering" element={<PlaceholderPage title="Design Engineering" />} />
        <Route path="/projects/sales-marketing" element={<PlaceholderPage title="Sales & Marketing" />} />
        <Route path="/projects/travel" element={<PlaceholderPage title="Travel" />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  )
}

export default App

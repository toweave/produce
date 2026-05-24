import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout'
import HomePage from '@/pages/home'
import PlaceholderPage from '@/pages/page'
import SeedanceCreatePage from '@/pages/seedance/create'
import SeedanceTasksPage from '@/pages/seedance/tasks'
import SeedanceTaskDetailPage from '@/pages/seedance/task-detail'
import Seedance2CreatePage from '@/pages/seedance2/create'
import Seedance2TasksPage from '@/pages/seedance2/tasks'
import Seedance2TaskDetailPage from '@/pages/seedance2/task-detail'
import LogsViewer from '@/pages/logs-viewer'

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
        <Route path="/seedance/create" element={<SeedanceCreatePage />} />
        <Route path="/seedance/tasks" element={<SeedanceTasksPage />} />
        <Route path="/seedance/tasks/:id" element={<SeedanceTaskDetailPage />} />
        <Route path="/seedance2/create" element={<Seedance2CreatePage />} />
        <Route path="/seedance2/tasks" element={<Seedance2TasksPage />} />
        <Route path="/seedance2/tasks/:id" element={<Seedance2TaskDetailPage />} />
        <Route path="/seedance/logs" element={<LogsViewer defaultVersion="1.5" />} />
        <Route path="/seedance2/logs" element={<LogsViewer defaultVersion="2.0" />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  )
}

export default App

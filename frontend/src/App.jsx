import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import WidgetLayout from './components/layout/WidgetLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import UsersListPage from './pages/admin/users/UsersListPage';
import UserFormPage from './pages/admin/users/UserFormPage';
import AudiencesListPage from './pages/admin/audiences/AudiencesListPage';
import AudienceFormPage from './pages/admin/audiences/AudienceFormPage';
import PlansListPage from './pages/admin/plans/PlansListPage';
import PlanFormPage from './pages/admin/plans/PlanFormPage';
import TopicsListPage from './pages/admin/topics/TopicsListPage';
import TopicFormPage from './pages/admin/topics/TopicFormPage';
import PathwaysListPage from './pages/admin/pathways/PathwaysListPage';
import PathwayFormPage from './pages/admin/pathways/PathwayFormPage';
import ReportsPage from './pages/admin/reports/ReportsPage';
import ProfilePage from './pages/admin/profile/ProfilePage';
import SettingsPage from './pages/admin/settings/SettingsPage';
import WidgetPage from './pages/widget/WidgetPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Consumer widget */}
        <Route path="/v1" element={<WidgetLayout />}>
          <Route path="widget" element={<WidgetPage />} />
        </Route>

        {/* Admin (protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="audiences" element={<AudiencesListPage />} />
          <Route path="audiences/new" element={<AudienceFormPage />} />
          <Route path="audiences/:id/edit" element={<AudienceFormPage />} />
          <Route path="plans" element={<PlansListPage />} />
          <Route path="plans/new" element={<PlanFormPage />} />
          <Route path="plans/:id/edit" element={<PlanFormPage />} />
          <Route path="topics" element={<TopicsListPage />} />
          <Route path="topics/new" element={<TopicFormPage />} />
          <Route path="topics/:id/edit" element={<TopicFormPage />} />
          <Route path="pathways" element={<PathwaysListPage />} />
          <Route path="pathways/new" element={<PathwayFormPage />} />
          <Route path="pathways/:id/edit" element={<PathwayFormPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UsersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/new"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:id/edit"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App

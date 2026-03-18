import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import WidgetLayout from "./components/layout/WidgetLayout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import UsersListPage from "./pages/admin/users/UsersListPage";
import UserFormPage from "./pages/admin/users/UserFormPage";
import AudiencesListPage from "./pages/admin/audiences/AudiencesListPage";
import AudienceFormPage from "./pages/admin/audiences/AudienceFormPage";
import PlansListPage from "./pages/admin/plans/PlansListPage";
import PlanFormPage from "./pages/admin/plans/PlanFormPage";
import TopicsListPage from "./pages/admin/topics/TopicsListPage";
import TopicFormPage from "./pages/admin/topics/TopicFormPage";
import PathwaysListPage from "./pages/admin/pathways/PathwaysListPage";
import PathwayFormPage from "./pages/admin/pathways/PathwayFormPage";
import ReportsPage from "./pages/admin/reports/ReportsPage";
import UtilizationReportPage from "./pages/admin/reports/UtilizationReportPage";
import CoverageReportPage from "./pages/admin/reports/CoverageReportPage";
import ContentAuditReportPage from "./pages/admin/reports/ContentAuditReportPage";
import AuditLogReportPage from "./pages/admin/reports/AuditLogReportPage";
import ProfilePage from "./pages/admin/profile/ProfilePage";
import SettingsPage from "./pages/admin/settings/SettingsPage";
import WidgetPage from "./pages/widget/WidgetPage";

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
          <Route
            path="reports/utilization"
            element={<UtilizationReportPage />}
          />
          <Route path="reports/coverage" element={<CoverageReportPage />} />
          <Route
            path="reports/content-audit"
            element={<ContentAuditReportPage />}
          />
          <Route path="reports/audit-log" element={<AuditLogReportPage />} />
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
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />
    </BrowserRouter>
  );
}

export default App;

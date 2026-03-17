import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import { logout } from "../../services/authService";

export default function AdminLayout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  return (
    <div className="d-flex vh-100 overflow-hidden">
      <nav
        className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white"
        style={{ width: 240 }}
      >
        <span className="fs-5 fw-semibold mb-4">OpenContactRoute</span>
        <ul className="nav nav-pills flex-column mb-auto gap-1">
          <li>
            <NavLink to="/admin" end className="nav-link text-white">
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/audiences" className="nav-link text-white">
              Audiences
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/plans" className="nav-link text-white">
              Plans
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/topics" className="nav-link text-white">
              Topics
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/pathways" className="nav-link text-white">
              Contact Pathways
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/reports" className="nav-link text-white">
              Reports
            </NavLink>
          </li>
          {user?.user_role === "admin" && (
            <>
              <li>
                <NavLink to="/admin/users" className="nav-link text-white">
                  Users
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/settings" className="nav-link text-white">
                  Settings
                </NavLink>
              </li>
            </>
          )}
        </ul>
        <div className="mt-auto">
          <NavLink to="/admin/profile" className="nav-link text-white mb-2">
            My Profile
          </NavLink>
          <button
            className="btn btn-outline-light btn-sm w-100"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-grow-1 p-4 bg-light overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

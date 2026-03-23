import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { SiteConfigProvider } from "./context/SiteConfigContext";

// Provider hierarchy:
//   AuthProvider      — fetches the authenticated user on load; must wrap everything
//                       so any component can access the current user via useAuth()
//   SiteConfigProvider — fetches org_name and primary_color; must be inside AuthProvider
//                        because settings are loaded from an authenticated API endpoint
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SiteConfigProvider>
        <App />
      </SiteConfigProvider>
    </AuthProvider>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { SiteConfigProvider } from "./context/SiteConfigContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SiteConfigProvider>
        <App />
      </SiteConfigProvider>
    </AuthProvider>
  </StrictMode>,
);

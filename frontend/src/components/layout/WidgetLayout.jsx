import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSiteConfig } from "../../hooks/useSiteConfig";

const WIDGET_SCOPE = "widget-primary-scope";

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(hex, amount) {
  return (
    "#" +
    hexToRgb(hex)
      .map((c) => Math.max(0, Math.round(c * (1 - amount))))
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

export default function WidgetLayout() {
  const { siteConfig } = useSiteConfig();

  useEffect(() => {
    const color = siteConfig.primary_color || "#0d6efd";
    const [r, g, b] = hexToRgb(color);
    const hover = darken(color, 0.15);
    const active = darken(color, 0.22);

    let style = document.getElementById(WIDGET_SCOPE);
    if (!style) {
      style = document.createElement("style");
      style.id = WIDGET_SCOPE;
      document.head.appendChild(style);
    }

    style.textContent = `
      #widget-root .btn-primary {
        --bs-btn-bg: ${color};
        --bs-btn-border-color: ${color};
        --bs-btn-hover-bg: ${hover};
        --bs-btn-hover-border-color: ${hover};
        --bs-btn-active-bg: ${active};
        --bs-btn-active-border-color: ${active};
        --bs-btn-disabled-bg: ${color};
        --bs-btn-disabled-border-color: ${color};
        --bs-btn-focus-shadow-rgb: ${r}, ${g}, ${b};
      }
      #widget-root .btn-outline-primary {
        --bs-btn-color: ${color};
        --bs-btn-border-color: ${color};
        --bs-btn-hover-bg: ${color};
        --bs-btn-hover-border-color: ${color};
        --bs-btn-active-bg: ${color};
        --bs-btn-active-border-color: ${color};
        --bs-btn-focus-shadow-rgb: ${r}, ${g}, ${b};
      }
      #widget-root .bg-primary { background-color: ${color} !important; }
      #widget-root .text-primary { color: ${color} !important; }
      #widget-root .border-primary { border-color: ${color} !important; }
      #widget-root a { color: ${color}; }
      #widget-root a:hover { color: ${hover}; }
    `;

    return () => style.remove();
  }, [siteConfig.primary_color]);

  return (
    <div id="widget-root" className="container py-4">
      <Outlet />
    </div>
  );
}

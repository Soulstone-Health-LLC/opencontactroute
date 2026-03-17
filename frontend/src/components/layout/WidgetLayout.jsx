import { Outlet } from "react-router-dom";

export default function WidgetLayout() {
  return (
    <div className="container py-4">
      <Outlet />
    </div>
  );
}

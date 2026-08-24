import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";

export function ProtectedRoute() {
  const { status } = useAdminAuth();

  if (status === "checking") {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#8a8177", fontFamily: "monospace", fontSize: 13 }}>
        checking session…
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

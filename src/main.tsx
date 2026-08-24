import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { DataProvider } from "./context/DataContext.tsx";
import { Home } from "./pages/Home.tsx";
import { Library } from "./pages/Library.tsx";
import { ProjectPage } from "./pages/ProjectPage.tsx";
import { About } from "./pages/About.tsx";
import { NotFound } from "./pages/NotFound.tsx";

import { AdminAuthProvider } from "./admin/AdminAuthContext.tsx";
import { AdminToastProvider } from "./admin/AdminToastContext.tsx";
import { ProtectedRoute } from "./admin/ProtectedRoute.tsx";
import { AdminLayout } from "./admin/layout/AdminLayout.tsx";
import { Login } from "./admin/pages/Login.tsx";
import { Dashboard } from "./admin/pages/Dashboard.tsx";
import { ProjectForm } from "./admin/pages/ProjectForm.tsx";
import { ProjectPreview } from "./admin/pages/ProjectPreview.tsx";
import { AboutEditor } from "./admin/pages/AboutEditor.tsx";
import { Feedback } from "./admin/pages/Feedback.tsx";
import { Settings } from "./admin/pages/Settings.tsx";

function PublicSite() {
  return (
    <DataProvider>
      <App />
    </DataProvider>
  );
}

function AdminRoot() {
  return (
    <AdminToastProvider>
      <AdminAuthProvider>
        <ProtectedRoute />
      </AdminAuthProvider>
    </AdminToastProvider>
  );
}

function AdminLoginRoot() {
  return (
    <AdminToastProvider>
      <AdminAuthProvider>
        <Login />
      </AdminAuthProvider>
    </AdminToastProvider>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<PublicSite />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Library />} />
        <Route path="projects/:slug" element={<ProjectPage />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin — not linked from public nav. Every route below requires
          a valid server-side session; ProtectedRoute redirects to
          /admin/login otherwise, and every API call it makes is
          independently gated by requireAdmin on the server. */}
      <Route path="/admin/login" element={<AdminLoginRoot />} />
      <Route path="/admin" element={<AdminRoot />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects/:id/edit" element={<ProjectForm />} />
          <Route path="projects/:id/preview" element={<ProjectPreview />} />
          <Route path="about" element={<AboutEditor />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </>,
  ),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

import { api } from "../../lib/apiClient";
import type { AdminProject, AdminProfile, AdminComment, SyncStatus } from "./types";

export const authApi = {
  login: (password: string) => api.post<{ ok: true }>("/api/auth/login", { password }),
  logout: () => api.post<{ ok: true }>("/api/auth/logout"),
  session: () => api.get<{ authenticated: boolean }>("/api/auth/session"),
};

export const projectsApi = {
  list: () => api.get<{ projects: AdminProject[] }>("/api/admin/projects"),
  get: (id: string) => api.get<{ project: AdminProject }>(`/api/admin/projects/${id}`),
  create: (name: string) => api.post<{ project: AdminProject }>("/api/admin/projects", { name }),
  update: (id: string, body: Partial<AdminProject>) =>
    api.put<{ project: AdminProject }>(`/api/admin/projects/${id}`, body),
  publish: (id: string) => api.patch<{ project: AdminProject }>(`/api/admin/projects/${id}/publish`),
  unpublish: (id: string) => api.patch<{ project: AdminProject }>(`/api/admin/projects/${id}/unpublish`),
  duplicate: (id: string) => api.post<{ project: AdminProject }>(`/api/admin/projects/${id}/duplicate`),
  remove: (id: string) => api.delete<{ ok: true }>(`/api/admin/projects/${id}`),
  reorder: (order: string[]) => api.put<{ ok: true }>("/api/admin/projects-order", { order }),

  uploadIcon: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.upload<{ project: AdminProject }>(`/api/admin/projects/${id}/icon`, fd);
  },
  removeIcon: (id: string) => api.delete<{ project: AdminProject }>(`/api/admin/projects/${id}/icon`),

  addScreenshot: (id: string, file: File, caption: string) => {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("caption", caption);
    return api.upload<{ project: AdminProject }>(`/api/admin/projects/${id}/screenshots`, fd);
  },
  replaceScreenshot: (id: string, screenshotId: string, file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.upload<{ project: AdminProject }>(`/api/admin/projects/${id}/screenshots/${screenshotId}/replace`, fd);
  },
  updateScreenshotCaption: (id: string, screenshotId: string, caption: string) =>
    api.patch<{ project: AdminProject }>(`/api/admin/projects/${id}/screenshots/${screenshotId}`, { caption }),
  removeScreenshot: (id: string, screenshotId: string) =>
    api.delete<{ project: AdminProject }>(`/api/admin/projects/${id}/screenshots/${screenshotId}`),
  reorderScreenshots: (id: string, order: string[]) =>
    api.put<{ project: AdminProject }>(`/api/admin/projects/${id}/screenshots/reorder`, { order }),
};

export const profileApi = {
  get: () => api.get<{ profile: AdminProfile }>("/api/admin/profile"),
  update: (body: Partial<AdminProfile>) => api.put<{ profile: AdminProfile }>("/api/admin/profile", body),
  uploadPhoto: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.upload<{ profile: AdminProfile }>("/api/admin/profile/photo", fd);
  },
  removePhoto: () => api.delete<{ profile: AdminProfile }>("/api/admin/profile/photo"),
};

export const commentsApi = {
  list: (slug?: string) =>
    api.get<{ comments: AdminComment[] }>(`/api/admin/comments${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`),
  setHidden: (id: string, hidden: boolean) => api.patch<{ ok: true }>(`/api/admin/comments/${id}`, { hidden }),
  markUseful: (id: string) => api.post<{ ok: true }>(`/api/admin/comments/${id}/mark-useful`),
  remove: (id: string) => api.delete<{ ok: true }>(`/api/admin/comments/${id}`),
  reply: (projectSlug: string, body: string) =>
    api.post<{ comment: AdminComment }>("/api/admin/comments", { projectSlug, body }),
};

export const miscApi = {
  getNotes: () => api.get<{ notes: string }>("/api/admin/notes"),
  updateNotes: (notes: string) => api.put<{ notes: string }>("/api/admin/notes", { notes }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true }>("/api/admin/change-password", { currentPassword, newPassword }),
};

export const syncApi = {
  status: () => api.get<SyncStatus>("/api/admin/sync/status"),
  now: () => api.post<SyncStatus>("/api/admin/sync/now"),
};

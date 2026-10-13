export type PublishState = "draft" | "published";

export interface AdminScreenshot {
  id: string;
  src?: string;
  caption: string;
}

export interface AdminProject {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  shortDescription: string;
  description: string;
  url: string;
  githubUrl: string;
  category: string;
  status: "live" | "in-progress" | "resting";
  publishState: PublishState;
  accent: "slate" | "taupe";
  madeWith: string[];
  whyIMadeIt: string;
  whoItsFor: string;
  whatILearned: string;
  adminNotes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  screenshots: AdminScreenshot[];
  screenshotCount: number;
  commentCount: number;
}

export interface AdminProfile {
  name: string;
  heroBlurb: string;
  aboutParagraphs: string[];
  location: string;
  links: { label: string; href: string }[];
  photo?: string;
}

export interface AdminComment {
  id: string;
  projectSlug: string;
  projectName: string;
  authorName: string;
  body: string;
  isAdmin: boolean;
  hidden: boolean;
  flagged: boolean;
  flaggedReason?: string;
  helpfulCount: number;
  createdAt: string;
}

export interface SyncStatus {
  /** False when GITHUB_TOKEN / GITHUB_REPO aren't set, so changes only live on the server. */
  configured: boolean;
  repo: string | null;
  branch: string | null;
  state: "off" | "idle" | "pending" | "syncing" | "ok" | "error" | "paused";
  lastSyncedAt: string | null;
  lastError: string | null;
  pausedReason: string | null;
  repoPrivate: boolean | null;
  savesPrivateContent: boolean | null;
}

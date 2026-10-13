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
  accent: "brown" | "butter" | "green" | "blue";
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

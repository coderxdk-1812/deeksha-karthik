export type ProjectStatus = "live" | "in-progress" | "resting";

export interface Screenshot {
  /** Path to a real screenshot. Leave undefined to render a placeholder mock. */
  src?: string;
  /** What the screenshot is showing — used as caption + alt text base. */
  caption: string;
}

export interface Project {
  name: string;
  slug: string;
  /** Path to a real icon/logo image. Leave undefined for an auto-generated monogram. */
  icon?: string;
  /** One-line hook, shown on cards. */
  shortDescription: string;
  /** Longer paragraph(s) shown on the detail page. */
  description: string;
  url: string;
  /** Source repository. Optional — the link only renders when present. */
  githubUrl?: string;
  screenshots: Screenshot[];
  category: string;
  status: ProjectStatus;
  /** Languages/frameworks/tools — optional. */
  madeWith?: string[];
  /** Optional narrative fields — only rendered when present. */
  whyIMadeIt?: string;
  whoItsFor?: string;
  whatILearned?: string;
  /** Accent colour for this project's card/detail chrome — one of the palette roles. */
  accent: "slate" | "taupe";
  /** Catalog number, e.g. "004" — shown as a small stamp. Derived at build time if omitted. */
  catalogNumber?: string;
}

export interface ProfileLink {
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  heroBlurb: string;
  aboutParagraphs: string[];
  location: string;
  links: ProfileLink[];
  /** Path to a photo of the site owner. Undefined means no photo — layout adapts. */
  photo?: string;
}

export interface Comment {
  id: string;
  authorName: string;
  body: string;
  isAdmin: boolean;
  helpfulCount: number;
  createdAt: string;
}

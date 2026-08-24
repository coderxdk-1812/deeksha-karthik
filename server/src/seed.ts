import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

/**
 * Runs once, the first time the server boots against an empty
 * database. Ports the placeholder content that used to live in
 * src/data/*.ts so the site doesn't go blank the moment the admin
 * layer is wired in — everything here is editable from the admin
 * dashboard afterwards and this file never runs again once seeded.
 */

interface SeedScreenshot {
  caption: string;
}

interface SeedProject {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  url: string;
  category: string;
  status: "live" | "in-progress" | "resting";
  madeWith?: string[];
  whyIMadeIt?: string;
  whoItsFor?: string;
  whatILearned?: string;
  accent: "terracotta" | "butter" | "green" | "blue";
  screenshots: SeedScreenshot[];
}

const seedProjects: SeedProject[] = [
  {
    name: "ExamBuoy",
    slug: "exambuoy",
    shortDescription:
      "A calm countdown and study planner for exam season, built so revision stops feeling like drowning.",
    description:
      "ExamBuoy turns a syllabus and a set of exam dates into a day-by-day plan that actually accounts for how much time is left. It was built during the run-up to IB finals, when every other planner either assumed unlimited time or didn't understand subject weighting.",
    url: "https://example.com/exambuoy",
    category: "Study tools",
    status: "live",
    madeWith: ["Flutter", "Dart", "Firebase"],
    whyIMadeIt:
      "I kept rebuilding the same spreadsheet every term. I wanted something that would just tell me what to study today, not a wall of empty checkboxes.",
    whoItsFor: "Students staring down multiple exams with a fixed number of days to prepare.",
    whatILearned:
      "State management across a multi-week planning horizon is trickier than it looks — a lot of the work went into handling missed days gracefully instead of just guilt-tripping the user.",
    accent: "terracotta",
    screenshots: [
      { caption: "The daily plan, showing today's three focus subjects" },
      { caption: "Adding an exam — subject weighting and confidence sliders" },
      { caption: "Week view with catch-up days highlighted" },
      { caption: "End-of-day check-in prompt" },
    ],
  },
  {
    name: "RevisBot",
    slug: "revisebot",
    shortDescription:
      "An AI study companion that quizzes you on your own notes instead of generic flashcard decks.",
    description:
      "RevisBot ingests whatever notes or textbook PDFs you already have and turns them into short, spaced quizzes. The second version rebuilt the whole ingestion pipeline after the first prototype turned out to only really work on tidy notes.",
    url: "https://example.com/revisebot",
    category: "AI tools",
    status: "in-progress",
    madeWith: ["Flutter", "Python", "OpenAI API"],
    whyIMadeIt: "Making flashcards by hand takes longer than actually studying. This does the boring part for you.",
    whoItsFor: "Anyone revising from their own messy notes rather than a polished course.",
    whatILearned:
      "Prompting a model to write good quiz questions from bad OCR output is its own skill — most of the v2 rebuild was cleanup logic, not the AI part.",
    accent: "green",
    screenshots: [
      { caption: "Uploading a set of lecture notes" },
      { caption: "A generated quiz, mid-session" },
      { caption: "Reviewing questions you got wrong last time" },
    ],
  },
  {
    name: "SafeSurf",
    slug: "safesurf",
    shortDescription: "A lightweight Chrome extension that quietly flags risky pages before you land on them.",
    description:
      "SafeSurf sits in the toolbar and checks pages against a small set of heuristics as you browse, surfacing a gentle warning instead of a full block page. It was built to be unobtrusive — most of the design effort went into making the warning ignorable when you actually know what you're doing.",
    url: "https://example.com/safesurf",
    category: "Browser extension",
    status: "live",
    madeWith: ["JavaScript", "Chrome Extension APIs"],
    whyIMadeIt: "Most safe-browsing tools are either invisible or so aggressive people just disable them.",
    whoItsFor: "Anyone who wants a second opinion without a lecture.",
    accent: "blue",
    screenshots: [
      { caption: "The popup, showing a page's safety summary" },
      { caption: "An inline warning banner on a flagged page" },
      { caption: "Settings — adjusting sensitivity" },
    ],
  },
  {
    name: "ClosetAI",
    slug: "closetai",
    shortDescription: "Photograph your wardrobe once, then let the app suggest outfits instead of staring at a closet.",
    description:
      "ClosetAI catalogs clothing from photos and suggests combinations based on weather, occasion, and what you haven't worn in a while. Still early — the outfit-suggestion logic is the part getting the most attention right now.",
    url: "https://example.com/closetai",
    category: "Lifestyle",
    status: "in-progress",
    madeWith: ["React Native", "Expo", "Supabase"],
    whoItsFor: "People who own more clothes than their mental model of their closet can handle.",
    whatILearned: "Background removal on phone-quality photos is a much harder problem than it sounds.",
    accent: "butter",
    screenshots: [
      { caption: "The catalog view, sorted by category" },
      { caption: "Today's suggested outfit, with weather context" },
      { caption: "Adding a new item from a photo" },
    ],
  },
  {
    name: "World Cup Tactical Analyst",
    slug: "world-cup-tactical-analyst",
    shortDescription: "A match-data dashboard that explains tactical patterns instead of just showing stat lines.",
    description:
      "Built around a World Cup dataset, this tool pulls out formation changes, pressing triggers, and passing-network shifts across a match, then renders them as an annotated timeline rather than a spreadsheet of numbers.",
    url: "https://example.com/tactical-analyst",
    category: "Data / sports",
    status: "in-progress",
    madeWith: ["Python", "FastAPI", "React", "scikit-learn"],
    whyIMadeIt: "Post-match analysis online is either pundit opinion or raw data with no story attached.",
    whoItsFor: "Football nerds who want the numbers to explain themselves.",
    accent: "green",
    screenshots: [
      { caption: "Match timeline with tactical shift markers" },
      { caption: "Passing network comparison, first half vs second" },
      { caption: "Formation detection over the course of a match" },
      { caption: "Team comparison summary" },
    ],
  },
  {
    name: "Digital Garden",
    slug: "digital-garden",
    shortDescription: "A desktop notes app where ideas grow into a connected map instead of disappearing into folders.",
    description:
      "Digital Garden is a small local-first desktop app for keeping loosely-connected notes — closer to a personal wiki than a to-do list. Notes link to each other and the whole thing renders as a garden-like map you can wander through.",
    url: "https://example.com/digital-garden",
    category: "Productivity",
    status: "live",
    madeWith: ["Tauri", "React", "TypeScript", "Rust"],
    whyIMadeIt: "Folders make me file ideas away and forget them. A map makes me want to revisit them.",
    whoItsFor: "People who think in loosely connected fragments rather than neat outlines.",
    whatILearned: "Tauri's IPC boundary forces you to actually think about what should live in Rust vs. the frontend.",
    accent: "green",
    screenshots: [
      { caption: "The garden map, zoomed out" },
      { caption: "Editing a note with linked references in the sidebar" },
      { caption: "Searching across the whole garden" },
    ],
  },
  {
    name: "DocChatBot",
    slug: "docchatbot",
    shortDescription: "Drop in a folder of PDFs and ask them questions in plain English instead of Ctrl+F-ing forever.",
    description:
      "DocChatBot reads a batch of documents, chunks and embeds them, and answers questions with citations back to the source page. Started as a way to get through a stack of internship reading without losing a week to it.",
    url: "https://example.com/docchatbot",
    category: "AI tools",
    status: "resting",
    madeWith: ["Python", "LangChain", "Gemini API"],
    whyIMadeIt: "I had a folder of PDFs and a deadline, and no patience left for skimming.",
    whoItsFor: "Anyone who needs answers from a pile of documents, not a summary of all of them.",
    whatILearned: "Chunking strategy matters more than model choice for answer quality.",
    accent: "blue",
    screenshots: [
      { caption: "Uploading a batch of PDFs" },
      { caption: "Asking a question, with the cited source shown alongside" },
      { caption: "Chat history for a document set" },
    ],
  },
  {
    name: "It's a Meep",
    slug: "its-a-meep",
    shortDescription:
      "A tiny, pointless, delightful corner of the internet with butterflies and flowers that react to your cursor.",
    description:
      "No practical purpose whatsoever — just a small interactive scene built purely because it was fun to make. Move your cursor around and the butterflies and flowers respond.",
    url: "https://example.com/its-a-meep",
    category: "Just for fun",
    status: "live",
    madeWith: ["HTML", "CSS", "JavaScript"],
    whyIMadeIt: "Not everything has to be useful. Sometimes you just want to make something move nicely.",
    accent: "butter",
    screenshots: [{ caption: "Butterflies mid-flutter" }, { caption: "A flower blooming on hover" }],
  },
  {
    name: "Treasure Hunt Game",
    slug: "treasure-hunt-game",
    shortDescription: "A small browser map game — click your way across the island following clues to find the treasure.",
    description:
      "A single-page treasure hunt built around a hand-drawn map. Each correct click reveals the next clue; wrong guesses nudge you back toward the right region without giving the answer away outright.",
    url: "https://example.com/treasure-hunt",
    category: "Just for fun",
    status: "resting",
    madeWith: ["HTML", "CSS", "JavaScript"],
    whyIMadeIt: "Wanted to see if a whole game could live in one HTML file. It mostly can.",
    accent: "terracotta",
    screenshots: [
      { caption: "The island map, start of the hunt" },
      { caption: "A clue revealed after a correct guess" },
      { caption: "The treasure, finally" },
    ],
  },
];

const seedComments = [
  {
    projectSlug: "exambuoy",
    authorName: "Priya",
    body: "The daily plan view is great, but on my phone the subject cards get cut off on the right edge — had to scroll sideways to see the confidence slider.",
    createdAt: "2026-06-02T14:20:00.000Z",
    helpfulCount: 4,
  },
  {
    projectSlug: "exambuoy",
    authorName: "Anonymous",
    body: "Took me a second to realize I could drag exams to reorder them — maybe a small hint the first time would help.",
    createdAt: "2026-06-10T09:05:00.000Z",
    helpfulCount: 2,
  },
  {
    projectSlug: "safesurf",
    authorName: "Marcus",
    body: "Really like how unobtrusive the warning banner is. Only thing — I couldn't immediately tell how to dismiss it permanently for a site I trust.",
    createdAt: "2026-05-14T11:40:00.000Z",
    helpfulCount: 6,
  },
  {
    projectSlug: "digital-garden",
    authorName: "Anonymous",
    body: "The map view is beautiful but zooming with a trackpad felt jumpy compared to a mouse wheel. Worth testing on trackpad specifically.",
    createdAt: "2026-04-28T18:12:00.000Z",
    helpfulCount: 3,
  },
  {
    projectSlug: "docchatbot",
    authorName: "Wei",
    body: "This saved me so much time going through a stack of research papers. Citation links work well — would love page thumbnails eventually.",
    createdAt: "2026-03-19T08:55:00.000Z",
    helpfulCount: 5,
  },
];

export function runSeedIfEmpty(): void {
  const projectCount = (db.prepare("SELECT COUNT(*) as n FROM projects").get() as { n: number }).n;

  if (projectCount === 0) {
    const now = new Date().toISOString();
    const insertProject = db.prepare(`
      INSERT INTO projects (
        id, slug, name, short_description, description, url, category, status,
        publish_state, icon_path, accent, made_with, why_i_made_it, who_its_for,
        what_i_learned, admin_notes, sort_order, created_at, updated_at
      ) VALUES (
        @id, @slug, @name, @shortDescription, @description, @url, @category, @status,
        'published', NULL, @accent, @madeWith, @whyIMadeIt, @whoItsFor,
        @whatILearned, @adminNotes, @sortOrder, @createdAt, @updatedAt
      )
    `);
    const insertScreenshot = db.prepare(`
      INSERT INTO screenshots (id, project_id, path, caption, position)
      VALUES (@id, @projectId, NULL, @caption, @position)
    `);

    const insertAll = db.transaction((items: SeedProject[]) => {
      items.forEach((p, index) => {
        const id = randomUUID();
        insertProject.run({
          id,
          slug: p.slug,
          name: p.name,
          shortDescription: p.shortDescription,
          description: p.description,
          url: p.url,
          category: p.category,
          status: p.status,
          accent: p.accent,
          madeWith: JSON.stringify(p.madeWith ?? []),
          whyIMadeIt: p.whyIMadeIt ?? null,
          whoItsFor: p.whoItsFor ?? null,
          whatILearned: p.whatILearned ?? null,
          adminNotes:
            index === 0
              ? "Seeded from the original placeholder data. Replace these screenshots with real ones when you get a chance."
              : "",
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        });
        p.screenshots.forEach((s, i) => {
          insertScreenshot.run({ id: randomUUID(), projectId: id, caption: s.caption, position: i });
        });
      });
    });
    insertAll(seedProjects);

    const insertComment = db.prepare(`
      INSERT INTO comments (id, project_slug, author_name, body, is_admin, hidden, flagged, flagged_reason, helpful_count, created_at)
      VALUES (@id, @projectSlug, @authorName, @body, 0, 0, 0, NULL, @helpfulCount, @createdAt)
    `);
    const insertComments = db.transaction((items: typeof seedComments) => {
      for (const c of items) {
        insertComment.run({ id: randomUUID(), ...c });
      }
    });
    insertComments(seedComments);

    console.log(`Seeded ${seedProjects.length} projects and ${seedComments.length} comments.`);
  }

  const profileExists = db.prepare("SELECT 1 FROM profile WHERE id = 1").get();
  if (!profileExists) {
    db.prepare(
      `INSERT INTO profile (id, name, hero_blurb, about_paragraphs, location, links, photo_path, updated_at)
       VALUES (1, @name, @heroBlurb, @aboutParagraphs, @location, @links, NULL, @updatedAt)`,
    ).run({
      name: "Deeksha",
      heroBlurb:
        "I build small, finished things — study tools, browser extensions, a chatbot or two — and put them here instead of letting them rot in a folder called Coding-stuff.",
      aboutParagraphs: JSON.stringify([
        "I like projects that solve one specific, slightly annoying problem I actually had — a syllabus with no plan attached, a wardrobe I couldn't keep track of, a stack of PDFs I didn't want to read. Most of what's here started as \"I'll just build the thing instead of complaining about it.\"",
        "Some of these are finished and get used regularly. Some are half-built and paused mid-thought. I've tried to be honest about which is which — check the status on each project before you judge the rough edges too harshly.",
        "If something here is confusing, broken, or just not what you expected — tell me. That's most of the point of putting this online instead of leaving it on my laptop.",
      ]),
      location: "Built on nights and weekends",
      links: JSON.stringify([
        { label: "Email", href: "mailto:hello@example.com" },
        { label: "GitHub", href: "https://github.com" },
      ]),
      updatedAt: new Date().toISOString(),
    });
  }

  const notesExist = db.prepare("SELECT 1 FROM portfolio_notes WHERE id = 1").get();
  if (!notesExist) {
    db.prepare("INSERT INTO portfolio_notes (id, notes, updated_at) VALUES (1, '', @updatedAt)").run({
      updatedAt: new Date().toISOString(),
    });
  }

  const adminExists = db.prepare("SELECT 1 FROM admin_users WHERE id = 1").get();
  if (!adminExists) {
    const rawPassword = process.env.ADMIN_PASSWORD;
    if (!rawPassword) {
      console.warn(
        "\n⚠️  No ADMIN_PASSWORD set in the environment. The admin account has NOT been created.\n" +
          "   Set ADMIN_PASSWORD in server/.env and restart the server to enable the admin login.\n",
      );
      return;
    }
    const hash = bcrypt.hashSync(rawPassword, 12);
    db.prepare(
      "INSERT INTO admin_users (id, username, password_hash, updated_at) VALUES (1, 'admin', @hash, @updatedAt)",
    ).run({ hash, updatedAt: new Date().toISOString() });
    console.log("Admin account created from ADMIN_PASSWORD.");
  }
}

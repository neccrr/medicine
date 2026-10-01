// Build-time prerender (run by scripts/prerender.mjs after `vite build`): one static HTML page
// per public route, plus sitemap.xml and robots.txt. Each page is the app's index.html with
// that route's title, description, canonical URL and breadcrumbs, and a plain-HTML version of
// its content inside #root. Search engines read that directly; for people, the splash covers it
// and React replaces it as soon as the app starts, exactly as on any other route.

import { marked } from "marked";
import { groupByBlock, studyBlocks } from "../lib/blocks";
import {
  ebookMeta,
  ebookSubjects,
  examPackagesByBlock,
  flashcardDecks,
  flashcardSubjects,
  keyOf,
  loadEbookChapter,
  loadOcclusionNotes,
  occlusionKeys,
  modulesByBlockSubject,
  moduleSubjects,
  quizBanks,
  quizQuestionsInBlock,
  quizSubjects,
  subjectKey,
  summaries,
  summarySubjects,
} from "../lib/content";
import { allSubjects, blockHasExam, breadcrumbs, indexablePaths, pageMeta, PRIVATE_PATHS, subjectSections, type PageMeta } from "../lib/routeMeta";
import { findLabActivity, labExercises } from "../lib/labActivities";
import { SITE_NAME } from "../lib/site";
import type { Subject } from "../types/content";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SECTION_LINKS: [string, string][] = [
  ["/subjects", "Subjects"],
  ["/flashcards", "Flashcards"],
  ["/occlusion", "Image Occlusion"],
  ["/quizzes", "Quizzes"],
  ["/exam", "Exam"],
  ["/modules", "Modules"],
  ["/ebooks", "Ebooks"],
  ["/summaries", "Summaries"],
  ["/lab", "Virtual Lab"],
];

function subjectList(section: string, subjects: Subject[], detail: (s: Subject) => string): string {
  return groupByBlock(subjects)
    .filter((group) => group.subjects.length > 0)
    .map(
      (group) =>
        `<h2>${esc(group.block.label)}</h2><ul>${group.subjects
          .map((s) => `<li><a href="/${section}/${keyOf(s)}">${esc(s.label)}</a> ${esc(detail(s))}</li>`)
          .join("")}</ul>`,
    )
    .join("");
}

async function content(path: string): Promise<string> {
  const parts = path.split("/").filter(Boolean);
  const [section, blockId, subjectId, chapterId] = parts;
  const key = blockId && subjectId ? subjectKey(blockId, subjectId) : "";

  switch (parts.length === 1 ? section : `${section}/*`) {
    case "flashcards":
      return subjectList("flashcards", flashcardSubjects, (s) => `(${flashcardDecks[keyOf(s)]?.length ?? 0} cards)`);
    case "quizzes":
      return subjectList("quizzes", quizSubjects, (s) => `(${quizBanks[keyOf(s)]?.length ?? 0} questions)`);
    case "modules":
      return subjectList("modules", moduleSubjects, (s) => `(${modulesByBlockSubject[keyOf(s)]?.length ?? 0} modules)`);
    case "summaries":
      return subjectList("summaries", summarySubjects, () => "");
    case "ebooks":
      return `<ul>${ebookSubjects
        .map((s) => {
          const book = ebookMeta[keyOf(s)];
          return `<li><a href="/ebooks/${keyOf(s)}">${esc(book.title)}</a>: ${esc(book.description)}</li>`;
        })
        .join("")}</ul>`;
    case "lab":
      return labExercises
        .map(
          (e) =>
            `<h2>${esc(e.title)}</h2><p>${esc(e.description)}</p><ol>${e.activities
              .map((a) => `<li><a href="/lab/${e.id}/${a.slug}">${esc(a.title)}</a>: ${esc(a.summary)}</li>`)
              .join("")}</ol>`,
        )
        .join("");
    case "lab/*": {
      const found = findLabActivity(blockId, subjectId);
      if (!found) return "";
      const { activity } = found;
      return [
        `<h2>Background</h2>${activity.background.map((p) => `<p>${esc(p)}</p>`).join("")}`,
        `<h2>Steps</h2><ol>${activity.steps.map((st) => `<li>${esc(st)}</li>`).join("")}</ol>`,
        `<h2>What you should find</h2><p>${esc(activity.expected)}</p>`,
        `<h2>Check your understanding</h2><ol>${activity.questions.map((q) => `<li>${esc(q.question)}</li>`).join("")}</ol>`,
      ].join("");
    }
    case "exam":
      return `<ul>${studyBlocks
        .filter((b) => blockHasExam(b.id))
        .map((b) => `<li><a href="/exam/${b.id}">${esc(b.label)}</a></li>`)
        .join("")}</ul>`;

    case "subjects":
      return groupByBlock(allSubjects())
        .filter((g) => g.subjects.length > 0)
        .map((g) => `<h2>${esc(g.block.label)}</h2><ul>${g.subjects.map((s) => `<li><a href="/subjects/${s.key}">${esc(s.label)}</a></li>`).join("")}</ul>`)
        .join("");
    case "subjects/*":
      return `<ul>${subjectSections(key)
        .map((s) => `<li><a href="${s.path}">${esc(s.name)}</a></li>`)
        .join("")}</ul>${(ebookMeta[key]?.chapters ?? []).length ? `<h2>Chapters</h2><ol>${ebookMeta[key].chapters.map((c) => `<li><a href="/ebooks/${key}/${c.id}">${esc(c.title)}</a></li>`).join("")}</ol>` : ""}`;
    case "occlusion":
      return `<ul>${occlusionKeys.map((k) => `<li><a href="/occlusion/${k}">${esc(flashcardSubjects.find((s) => keyOf(s) === k)?.label ?? k)}</a></li>`).join("")}</ul>`;
    case "occlusion/*": {
      const notes = (await loadOcclusionNotes(key)) ?? [];
      return `<h2>Figures</h2><ul>${notes.map((n) => `<li>${esc(n.title)} (${n.masks.length} labels)</li>`).join("")}</ul>`;
    }
    case "flashcards/*":
      return `<h2>Cards in this deck</h2><ul>${(flashcardDecks[key] ?? []).map((c) => `<li>${esc(c.front)}</li>`).join("")}</ul>`;
    case "quizzes/*":
      return `<h2>Questions</h2><ol>${(quizBanks[key] ?? []).map((q) => `<li>${esc(q.question)}</li>`).join("")}</ol>`;
    case "modules/*":
      return `<ul>${(modulesByBlockSubject[key] ?? []).map((m) => `<li>${esc(m.name)}</li>`).join("")}</ul>`;
    case "summaries/*":
      return `<article>${marked.parse(summaries[key] ?? "", { async: false })}</article>`;
    case "exam/*": {
      // Past papers belong to the institution: list the exams, never their questions.
      const packages = examPackagesByBlock[blockId] ?? [];
      if (packages.length === 0) {
        return `<p>A timed exam drawn from the block's ${quizQuestionsInBlock(blockId).length} quiz questions.</p>`;
      }
      const shown = subjectId ? packages.filter((p) => p.id === subjectId) : packages;
      return `<ul>${shown
        .map((p) => `<li>${packages.length > 1 && !subjectId ? `<a href="/exam/${blockId}/${p.id}">${esc(p.name)}</a>` : esc(p.name)}: ${p.questions.length} questions, timed</li>`)
        .join("")}</ul>`;
    }
    case "ebooks/*": {
      const book = ebookMeta[key];
      const toc = `<h2>Chapters</h2><ol>${book.chapters
        .map((c) => `<li><a href="/ebooks/${key}/${c.id}">${esc(c.title)}</a></li>`)
        .join("")}</ol>`;
      if (!chapterId) return toc;
      const i = book.chapters.findIndex((c) => c.id === chapterId);
      const markdown = (await loadEbookChapter(`${key}/${chapterId}`)) ?? "";
      const prev = book.chapters[i - 1];
      const next = book.chapters[i + 1];
      const pager = [
        prev && `<a href="/ebooks/${key}/${prev.id}" rel="prev">← ${esc(prev.title)}</a>`,
        next && `<a href="/ebooks/${key}/${next.id}" rel="next">${esc(next.title)} →</a>`,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<article>${marked.parse(markdown, { async: false })}</article><p>${pager}</p>${toc}`;
    }
    default:
      return `<p>Open <a href="/">${SITE_NAME}</a> to use this page.</p>`;
  }
}

function breadcrumbJsonLd(path: string, origin: string): string {
  const trail = breadcrumbs(path);
  if (trail.length < 2) return "";
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${origin}${c.path}` })),
  };
  // "<" can't end the script element early once escaped.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/** Swaps one tag's attribute value in the template; throws if the tag is missing. */
function setTag(html: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(html)) throw new Error(`Prerender: index.html is missing ${pattern}`);
  return html.replace(pattern, replacement);
}

function metaTag(attr: "name" | "property", key: string) {
  return new RegExp(`<meta\\s+${attr}="${key.replace(":", "\\:")}"\\s+content="[^"]*"\\s*/?>`);
}

export function renderPage(template: string, path: string, meta: PageMeta, body: string, origin: string): string {
  const url = `${origin}${path}`;
  const title = esc(meta.title);
  const description = esc(meta.description);
  let html = template;
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = setTag(html, metaTag("name", "description"), `<meta name="description" content="${description}" />`);
  html = setTag(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`);
  html = setTag(html, metaTag("property", "og:url"), `<meta property="og:url" content="${esc(url)}" />`);
  html = setTag(html, metaTag("property", "og:title"), `<meta property="og:title" content="${title}" />`);
  html = setTag(html, metaTag("property", "og:description"), `<meta property="og:description" content="${description}" />`);
  html = setTag(html, metaTag("name", "twitter:title"), `<meta name="twitter:title" content="${title}" />`);
  html = setTag(html, metaTag("name", "twitter:description"), `<meta name="twitter:description" content="${description}" />`);
  const extraHead = [meta.indexable ? "" : `<meta name="robots" content="noindex" />`, breadcrumbJsonLd(path, origin)].join("");
  html = html.replace("</head>", `${extraHead}</head>`);
  // The home page's no-JavaScript description; this page has its own content.
  html = html.replace(/\s*<noscript>\s*<main[\s\S]*?<\/main>\s*<\/noscript>/, "");
  return setTag(html, /<div id="root"><\/div>/, `<div id="root">${body}</div>`);
}

async function pageBody(path: string, meta: PageMeta): Promise<string> {
  const trail = breadcrumbs(path);
  const nav = `<nav aria-label="Sections"><a href="/">${SITE_NAME}</a> ${SECTION_LINKS.map(([href, name]) => `<a href="${href}">${name}</a>`).join(" ")}</nav>`;
  const crumbs =
    trail.length > 1
      ? `<nav aria-label="Breadcrumb"><ol>${trail.map((c) => `<li><a href="${c.path}">${esc(c.name)}</a></li>`).join("")}</ol></nav>`
      : "";
  const main = await content(path);
  // Chapters and summaries start with their own heading; one <h1> per page.
  const heading = /^<article>\s*<h1/.test(main) ? "" : `<h1>${esc(meta.title.replace(` · ${SITE_NAME}`, ""))}</h1>`;
  const footer = `<footer><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer>`;
  return `<div class="prerender">${nav}${crumbs}${heading}<p>${esc(meta.description)}</p>${main}${footer}</div>`;
}

export interface RenderedSite {
  /** Output path relative to dist → file contents. */
  files: Map<string, string>;
  indexed: string[];
}

/** Everything the prerender step writes, from the built index.html. */
export async function renderSite(template: string, origin: string): Promise<RenderedSite> {
  const files = new Map<string, string>();
  const indexed = indexablePaths();
  for (const path of [...indexed, ...PRIVATE_PATHS]) {
    // The root index.html stays the app shell (the service worker caches it); every other
    // route gets its own page.
    if (path === "/") continue;
    const meta = pageMeta(path);
    files.set(`${path.slice(1)}/index.html`, renderPage(template, path, meta, await pageBody(path, meta), origin));
  }

  // Served by Vercel, with a 404 status, for any URL with no page of its own. It's the app shell,
  // so a route that exists in the app but has no prerendered page still works for people.
  const notFound: PageMeta = { title: `Page not found · ${SITE_NAME}`, description: pageMeta("/").description, indexable: false };
  files.set(
    "404.html",
    renderPage(template, "/404", notFound, `<div class="prerender"><h1>Page not found</h1><p><a href="/">Go to ${SITE_NAME}</a></p></div>`, origin),
  );

  const urls = [...indexed, "/privacy.html", "/terms.html"];
  files.set(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`)
      .join("\n")}\n</urlset>\n`,
  );
  files.set(
    "robots.txt",
    [
      "User-agent: *",
      "Allow: /",
      "# The API, and course material that belongs to its authors: lecture PDFs, slide figures",
      "# and past exam paper images.",
      "Disallow: /api/",
      "Disallow: /*.pdf$",
      "Disallow: /ebook-figures/",
      "Disallow: /exams/",
      "",
      `Sitemap: ${origin}/sitemap.xml`,
      "",
    ].join("\n"),
  );
  return { files, indexed };
}

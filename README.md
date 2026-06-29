# DeepFocus

A personal content curation and publishing platform. Collect articles, blogs, videos, and research papers in one place — with AI-generated reading gists so you can decide how deep to go before committing.

**Stack:** TypeScript · React · Tailwind CSS · Quarto (`.qmd`) · Vite · Vercel

---

## Features

- **Fullscreen video hero** landing page with a browse page and individual article pages
- **Filterable content grid** — filter by type (article, blog, video, research) or tag
- **AI reading gists** — 1 min / 5 min / 10 min summaries generated via Claude Haiku, stored in frontmatter
- **CLI tooling** for adding content without touching the UI
- **Own work + external content** — flag your own writing or curate third-party links

---

## Project Structure

```
deepfocus/
├── cli/                    # CLI scripts
│   ├── generate-gists.ts   # AI summary generation
│   ├── add-video.ts        # Add a YouTube video by URL
│   └── add-external.ts     # Add an external article/link by URL
├── content/                # All .qmd content files
│   ├── _template.qmd       # Frontmatter template — copy this
│   ├── articles/
│   ├── blogs/
│   ├── videos/
│   └── research/
├── scripts/
│   └── build-content.ts    # Parses .qmd → JSON for the frontend
├── web/                    # Vite + React frontend
│   └── src/
│       ├── pages/          # Landing, Home, Article
│       └── components/     # Nav, FilterBar, ContentCard, GistPanel, VideoEmbed
├── public/                 # Static assets (favicon, images)
├── package.json
└── vercel.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) — only needed for gist generation

### Install

```bash
git clone https://github.com/your-username/deepfocus.git
cd deepfocus
npm install
cd web && npm install && cd ..
```

### Develop

```bash
npm run dev
```

Builds content from `.qmd` files, then starts the Vite dev server at `localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

---

## Adding Content

### Your own articles (manual)

Copy `content/_template.qmd` to the relevant folder and fill in the frontmatter:

```yaml
---
title: "Your Title"
author: "Your Name"
date: 2026-06-30
type: article           # article | blog | video | research
category: "Engineering"
tags: [tag1, tag2]
estimated_read_time: 8
is_own_work: true
---

Write your content here in Markdown.
```

Then run `npm run build:content` (or restart `npm run dev`) to pick it up.

### Images in articles

Copy images to `public/images/` and reference them in `.qmd`:

```markdown
![Alt text](/images/your-image.png)
```

---

## CLI Tools

All commands run from the project root. Set `ANTHROPIC_API_KEY` in your environment first.

### Generate AI reading gists

Reads a `.qmd` file and injects three summaries into its frontmatter (one Claude Haiku call):

```bash
npm run gists -- content/articles/my-article.qmd
```

Writes `gists.quick` (~150 words), `gists.medium` (~600 words), `gists.full` (~1500 words).

### Add a YouTube video

```bash
npm run video -- https://youtube.com/watch?v=VIDEO_ID
```

Fetches metadata + transcript, creates `content/videos/{slug}.qmd` with gists in one API call.

### Add an external article

```bash
npm run add-external -- https://example.com/some-article
npm run add-external -- --type research https://arxiv.org/abs/...
```

Scrapes the URL, extracts title/author/content, creates a `.qmd` with gists in one API call.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | CLI only | Claude Haiku for gist + metadata generation |

Not needed at Vercel deploy time — only for local CLI use.

---

## Deployment

Deployed via Vercel. `vercel.json` handles the build and SPA rewrites automatically.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `web/dist` |
| Install command | `npm install && cd web && npm install` |

Push to `main` → Vercel redeploys automatically.

---

## License

MIT — see [LICENSE](./LICENSE).

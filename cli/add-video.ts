#!/usr/bin/env tsx
/**
 * add-video.ts
 * Usage: npm run video -- https://www.youtube.com/watch?v=VIDEO_ID
 *
 * Fetches YouTube metadata + transcript (free, no API key),
 * then uses a single Claude call to generate tags, category, and gists.
 * Creates content/videos/{slug}.qmd
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import slugify from 'slugify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VIDEOS_DIR = path.join(ROOT, 'content', 'videos')

const inputUrl = process.argv[2]

if (!inputUrl) {
  console.error('Usage: npm run video -- <YouTube URL>')
  process.exit(1)
}

const apiKey = process.env['ANTHROPIC_API_KEY']
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY is not set')
  process.exit(1)
}

const client = new Anthropic({ apiKey })

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

function toEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

function toWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

interface YouTubeMeta {
  title: string
  author: string
  authorUrl: string
  thumbnailUrl: string
}

async function fetchYouTubeMeta(videoId: string): Promise<YouTubeMeta> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new Error(`YouTube oEmbed failed: ${res.status}`)
  const data = await res.json() as {
    title: string
    author_name: string
    author_url: string
    thumbnail_url: string
  }
  return {
    title: data.title,
    author: data.author_name,
    authorUrl: data.author_url,
    thumbnailUrl: data.thumbnail_url,
  }
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Dynamic import to handle ESM
    const { YoutubeTranscript } = await import('youtube-transcript')
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    return transcript.map((t: { text: string }) => t.text).join(' ').slice(0, 10000)
  } catch {
    console.log('  Transcript not available — will use title/description only.')
    return null
  }
}

interface ClaudeVideoAnalysis {
  category: string
  tags: string[]
  estimated_read_time: number
  gists: {
    short: string
    long: string
  }
  description: string
}

async function analyzeVideo(
  title: string,
  author: string,
  transcript: string | null
): Promise<ClaudeVideoAnalysis> {
  const contentSection = transcript
    ? `Transcript (first 10000 chars):\n${transcript}`
    : `No transcript available. Base analysis on the title and author.`

  const prompt = `Analyze this YouTube video for a content platform.

Title: "${title}"
Channel: "${author}"
${contentSection}

Return ONLY valid JSON with this exact structure:
{
  "category": "<single category e.g. Engineering, Machine Learning, Product, Design, Business, Science>",
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>"],
  "estimated_read_time": <number 1-15, minutes to watch/engage>,
  "description": "<one sentence description for the .qmd body>",
  "gists": {
    "short": "<~150 word takeaway — single paragraph, the single most important insight>",
    "long": "<complete explanation of the entire video content — cover every major point, argument, example, and conclusion the speaker makes. Use \\n\\n between paragraphs. Aim for thoroughness over brevity.>"
  }
}

Return only the JSON, no other text.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  return JSON.parse(jsonMatch[0]) as ClaudeVideoAnalysis
}

function buildQmdContent(
  meta: YouTubeMeta,
  videoId: string,
  analysis: ClaudeVideoAnalysis,
): string {
  const today = new Date().toISOString().slice(0, 10)
  const frontmatter = {
    title: meta.title,
    author: meta.author,
    author_url: meta.authorUrl,
    date: today,
    type: 'video',
    category: analysis.category,
    tags: analysis.tags,
    video_url: toEmbedUrl(videoId),
    source_url: toWatchUrl(videoId),
    estimated_read_time: analysis.estimated_read_time,
    is_own_work: false,
    gists: analysis.gists,
  }

  const lines = ['---']
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((t) => `"${t}"`).join(', ')}]`)
    } else if (typeof v === 'object' && v !== null) {
      lines.push(`${k}:`)
      for (const [gk, gv] of Object.entries(v as Record<string, string>)) {
        // Multi-line gists: use yaml block scalar
        const escaped = String(gv).replace(/"/g, '\\"')
        lines.push(`  ${gk}: "${escaped}"`)
      }
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`)
    }
  }
  lines.push('---')
  lines.push('')
  lines.push(analysis.description)
  lines.push('')

  return lines.join('\n')
}

async function main() {
  console.log(`Processing: ${inputUrl}`)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const videoId = extractVideoId(inputUrl)!
  if (!videoId) {
    console.error('Could not extract video ID from URL')
    process.exit(1)
  }

  console.log(`  Video ID: ${videoId}`)

  console.log('  Fetching YouTube metadata...')
  const meta = await fetchYouTubeMeta(videoId)
  console.log(`  Title: ${meta.title}`)
  console.log(`  Author: ${meta.author}`)

  console.log('  Fetching transcript...')
  const transcript = await fetchTranscript(videoId)
  if (transcript) console.log(`  Transcript: ${transcript.length} chars`)

  console.log('  Calling Claude API (category + tags + gists in one call)...')
  const analysis = await analyzeVideo(meta.title, meta.author, transcript)

  const slug = slugify(meta.title, { lower: true, strict: true }).slice(0, 60)
  const filename = `${slug}.qmd`
  const outPath = path.join(VIDEOS_DIR, filename)

  if (fs.existsSync(outPath)) {
    console.error(`File already exists: ${outPath}`)
    console.error('Delete it first or rename the video.')
    process.exit(1)
  }

  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true })
  }

  const content = buildQmdContent(meta, videoId, analysis)
  fs.writeFileSync(outPath, content, 'utf-8')

  console.log(`\nCreated: content/videos/${filename}`)
  console.log(`  Category: ${analysis.category}`)
  console.log(`  Tags: ${analysis.tags.join(', ')}`)
  console.log('\nRun "npm run build:content" to include it in the site.')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})

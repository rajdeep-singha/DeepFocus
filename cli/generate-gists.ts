#!/usr/bin/env tsx
/**
 * generate-gists.ts
 * Usage: npm run gists -- content/articles/my-article.qmd
 *
 * Reads a .qmd file, sends the body to Claude API,
 * and injects 3 gist summaries into the frontmatter.
 * Requires: ANTHROPIC_API_KEY env variable
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Anthropic from '@anthropic-ai/sdk'

const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: npm run gists -- <path-to-file.qmd>')
  process.exit(1)
}

const absPath = path.resolve(process.cwd(), filePath)

if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`)
  process.exit(1)
}

const apiKey = process.env['ANTHROPIC_API_KEY']
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY is not set')
  process.exit(1)
}

const client = new Anthropic({ apiKey })

async function generateGists(title: string, body: string) {
  console.log(`Generating gists for: "${title}"`)
  console.log('Calling Claude API (single call for all 3 levels)...')

  const prompt = `You are summarizing a piece of writing titled "${title}" for a content platform.

Generate THREE summaries at different levels of depth. Return ONLY valid JSON with this exact structure:
{
  "quick": "<~150 word summary — single paragraph, the single most important takeaway>",
  "medium": "<~600 word summary — key points and context, use \\n\\n between paragraphs>",
  "full": "<~1500 word summary — comprehensive overview covering main arguments, evidence, and implications, use \\n\\n between paragraphs>"
}

The content to summarize:
---
${body.slice(0, 12000)}
---

Return only the JSON object, no other text.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON')
  }

  const gists = JSON.parse(jsonMatch[0]) as { quick: string; medium: string; full: string }

  if (!gists.quick || !gists.medium || !gists.full) {
    throw new Error('Missing gist fields in Claude response')
  }

  return gists
}

async function main() {
  const raw = fs.readFileSync(absPath, 'utf-8')
  const { data, content } = matter(raw)

  const title = (data['title'] as string) ?? path.basename(absPath, '.qmd')
  const gists = await generateGists(title, content)

  // Inject gists into frontmatter
  data['gists'] = gists

  // Reconstruct the file with updated frontmatter
  const updated = matter.stringify(content, data)
  fs.writeFileSync(absPath, updated, 'utf-8')

  console.log('Gists written to frontmatter:')
  console.log(`  quick: ${gists.quick.slice(0, 80)}...`)
  console.log(`  medium: ${gists.medium.slice(0, 80)}...`)
  console.log(`  full: ${gists.full.slice(0, 80)}...`)
  console.log(`\nUpdated: ${absPath}`)
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})

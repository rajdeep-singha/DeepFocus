import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

export type Provider = 'claude' | 'gemini'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const GEMINI_MODEL = 'gemini-3.5-flash'

/** Decide which provider to use: CLI flag > LLM_PROVIDER env > claude. */
export function resolveProvider(argv: string[] = process.argv): Provider {
  if (argv.includes('--gemini')) return 'gemini'
  if (argv.includes('--claude')) return 'claude'
  const env = process.env['LLM_PROVIDER']?.toLowerCase()
  if (env === 'gemini' || env === 'claude') return env
  return 'claude'
}

/** Send a single user prompt and return the model's text response. */
export async function generateText(
  prompt: string,
  opts: { maxTokens?: number; provider?: Provider; json?: boolean } = {},
): Promise<string> {
  const provider = opts.provider ?? resolveProvider()
  const maxTokens = opts.maxTokens ?? 4096
  return provider === 'gemini'
    ? generateWithGemini(prompt, maxTokens, opts.json === true)
    : generateWithClaude(prompt, maxTokens)
}

/** Parse a JSON object out of a model reply (fences, leading/trailing prose). */
export function parseModelJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? text).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Model did not return valid JSON')
  return JSON.parse(candidate.slice(start, end + 1))
}

async function generateWithClaude(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0]?.type === 'text' ? message.content[0].text : ''
}

async function generateWithGemini(prompt: string, maxTokens: number, json: boolean): Promise<string> {
  const apiKey = process.env['GEMINI_API_KEY'] ?? process.env['GOOGLE_API_KEY']
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  })
  return response.text ?? ''
}

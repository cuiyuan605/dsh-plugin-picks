import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'

/** One immutable skill provider that teaches the publish workflow. */
const PROVIDER_NAME = 'dsh-plugin-publisher'
const SKILL_BODY_URL = new URL('./assets/publish-plugin.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('./assets/', import.meta.url)),
}

/** User-editable publisher settings, mirrored to a JSON file for the release script. */
const CONFIG_PATH = path.join(homedir(), '.dsh', 'dsh-plugin-publisher.json')
const CONFIG_FALLBACK = {
  tokenFile: path.join(homedir(), '.dsh', 'npm-token'),
  registry: 'https://registry.npmjs.org/',
  repo: '',
  ghBin: '',
  ghConfigDir: '',
  bump: 'patch',
}

export const Config = z.object({
  tokenFile: z.string().default(CONFIG_FALLBACK.tokenFile),
  registry: z.string().default(CONFIG_FALLBACK.registry),
  repo: z.string().default(CONFIG_FALLBACK.repo),
  ghBin: z.string().default(CONFIG_FALLBACK.ghBin),
  ghConfigDir: z.string().default(CONFIG_FALLBACK.ghConfigDir),
  bump: z.string().default(CONFIG_FALLBACK.bump),
})

function writeConfig(config) {
  const previous = (() => {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    } catch {
      return {}
    }
  })()
  const next = { ...CONFIG_FALLBACK, ...previous }
  for (const key of Object.keys(CONFIG_FALLBACK)) {
    const value = config && typeof config[key] === 'string' ? config[key].trim() : ''
    if (value !== '') next[key] = value
  }
  try {
    mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    writeFileSync(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  } catch {
    // A read-only environment still gets the skill; the script falls back to its own defaults.
  }
}

const CANDIDATE = {
  name: 'publish-dsh-plugin',
  description:
    'Publish a DSH plugin to npm and add or update its version in a curated plugin market index. Use when the user asks to release, publish, ship, or update a DSH plugin bundle.',
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: 'bundled',
  resourceBase: RESOURCE_BASE,
  rank: 600,
  locator: SKILL_BODY_URL,
}

const provider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get() {
    return {
      ...CANDIDATE,
      content: await readFile(SKILL_BODY_URL, 'utf8'),
    }
  },
}

export const name = 'plugin-publisher'
export const inject = ['skills']

export function apply(ctx, config) {
  writeConfig(config)
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber), 'plugin-publisher settings')
  })
  ctx.skills.registerProvider(() => provider)
}

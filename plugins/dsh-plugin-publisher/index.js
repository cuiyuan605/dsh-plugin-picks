import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** One immutable skill provider that teaches the publish workflow. */
const PROVIDER_NAME = 'dsh-plugin-publisher'
const SKILL_BODY_URL = new URL('./assets/publish-plugin.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('./assets/', import.meta.url)),
}

/** User-editable publisher settings; the release script reads the same file. */
const CONFIG_PATH = path.join(homedir(), '.dsh', 'dsh-plugin-publisher.json')
const CONFIG_DEFAULTS = {
  tokenFile: path.join(homedir(), '.dsh', 'npm-token'),
  registry: 'https://registry.npmjs.org/',
  repo: '',
  ghBin: '',
  ghConfigDir: '',
  bump: 'patch',
}

function ensureConfig() {
  try {
    if (existsSync(CONFIG_PATH)) return
    mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    writeFileSync(CONFIG_PATH, `${JSON.stringify(CONFIG_DEFAULTS, null, 2)}\n`, 'utf8')
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

export function apply(ctx) {
  ensureConfig()
  ctx.skills.registerProvider(() => provider)
}

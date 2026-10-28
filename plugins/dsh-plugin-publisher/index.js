import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** One immutable skill provider that teaches the publish workflow. */
const PROVIDER_NAME = 'dsh-plugin-publisher'
const SKILL_BODY_URL = new URL('./assets/publish-plugin.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('./assets/', import.meta.url)),
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
  ctx.skills.registerProvider(() => provider)
}

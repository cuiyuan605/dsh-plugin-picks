#!/usr/bin/env node
/**
 * Publish one DSH plugin bundle and upsert its version in a curated market index.
 *
 * Usage:
 *   node release.mjs --dir <plugin-dir> --index <docs/index.json> [--bump patch|minor|major|none]
 *     [--no-publish] [--icon <file>] [--repo owner/name] [--push]
 *     [--gh-bin <gh>] [--gh-config-dir <dir>] [--pm npm]
 */
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'
import path from 'node:path'

function parseArgs(argv) {
  const out = { bump: 'patch', publish: true, push: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dir') out.dir = argv[++i]
    else if (arg === '--index') out.index = argv[++i]
    else if (arg === '--bump') out.bump = argv[++i]
    else if (arg === '--icon') out.icon = argv[++i]
    else if (arg === '--repo') out.repo = argv[++i]
    else if (arg === '--gh-config-dir') out.ghConfigDir = argv[++i]
    else if (arg === '--gh-bin') out.ghBin = argv[++i]
    else if (arg === '--pm') out.pm = argv[++i]
    else if (arg === '--no-publish') out.publish = false
    else if (arg === '--push') out.push = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!out.dir) throw new Error('--dir is required')
  if (!out.index) throw new Error('--index is required')
  if (!['patch', 'minor', 'major', 'none'].includes(out.bump)) throw new Error(`invalid --bump: ${out.bump}`)
  return out
}

const args = parseArgs(process.argv.slice(2))
const dir = path.resolve(args.dir)
const indexPath = path.resolve(args.index)
const pkgPath = path.join(dir, 'package.json')
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
const pm = args.pm || (process.platform === 'win32' ? 'npm.cmd' : 'npm')

if (!pkg.name) throw new Error('package.json has no name')
if (!pkg.dsh || !pkg.dsh.bundle) throw new Error(`${pkg.name}: package.json does not declare dsh.bundle`)

const run = (command, options = {}) => {
  process.stderr.write(`$ ${command}\n`)
  return execSync(command, { cwd: dir, stdio: 'inherit', ...options })
}

// 1. bump version
if (args.bump !== 'none') {
  run(`"${pm}" version ${args.bump} --no-git-tag-version`)
}
const nextPkg = JSON.parse(await readFile(pkgPath, 'utf8'))

// 2. publish to npm
if (args.publish) {
  const tokenFile = path.join(homedir(), '.dsh', 'npm-token')
  let token = process.env.NPM_TOKEN
  if (!token && existsSync(tokenFile)) token = (await readFile(tokenFile, 'utf8')).trim()
  if (!token) {
    throw new Error(
      'npm token missing: set NPM_TOKEN or write a granular token (bypass 2FA, read/write) to ~/.dsh/npm-token',
    )
  }
  const registry = 'https://registry.npmjs.org/'
  run(
    `"${pm}" publish --registry ${registry} --//registry.npmjs.org/:_authToken=${token}`,
    { stdio: 'inherit' },
  )
}

// 3. update the market index
const index = JSON.parse(await readFile(indexPath, 'utf8'))
const timestamp = Math.floor(Date.now() / 1000)
const versionEntry = {
  version: nextPkg.version,
  publishTimestamp: timestamp,
  source: { type: 'npm' },
  ...(nextPkg.engines && nextPkg.engines.dsh ? { engines: { dsh: nextPkg.engines.dsh } } : {}),
}

let plugin = (index.plugins || []).find((entry) => entry.name === nextPkg.name)
if (!plugin) {
  const zhMeta = readLocalizedMeta(dir, 'zh')
  const enMeta = readLocalizedMeta(dir, 'en')
  plugin = {
    name: nextPkg.name,
    ...(zhMeta && zhMeta.title
      ? { title: { en: (enMeta && enMeta.title) || nextPkg.name, zh: zhMeta.title } }
      : {}),
    description: nextPkg.description,
    ...(typeof nextPkg.author === 'string' ? { author: nextPkg.author } : {}),
    versions: [],
  }
  index.plugins = index.plugins || []
  index.plugins.push(plugin)
}

if (nextPkg.description) plugin.description = plugin.description || nextPkg.description

plugin.versions = (plugin.versions || []).filter((entry) => entry.version !== versionEntry.version)
plugin.versions.push(versionEntry)

// 4. copy icon next to the index
const iconSource = args.icon ? path.resolve(args.icon) : path.join(dir, 'icon.svg')
if (existsSync(iconSource)) {
  const iconsDir = path.join(path.dirname(indexPath), 'icons')
  await mkdir(iconsDir, { recursive: true })
  const safeName = nextPkg.name.replace(/^@/, '').replace(/\//g, '-')
  await copyFile(iconSource, path.join(iconsDir, `${safeName}.svg`))
  plugin.icon = `icons/${safeName}.svg`
}

await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8')
process.stderr.write(`index updated: ${indexPath} (${nextPkg.name}@${nextPkg.version})\n`)

// 5. optionally push the index through the GitHub API
if (args.push && args.repo) {
  const gh = args.ghBin || (process.platform === 'win32' ? 'gh.exe' : 'gh')
  const env = { ...process.env }
  if (args.ghConfigDir) env.GH_CONFIG_DIR = path.resolve(args.ghConfigDir)
  const remotePath = 'docs/index.json'
  let sha = ''
  try {
    sha = execSync(`"${gh}" api repos/${args.repo}/contents/${remotePath} --jq .sha`, { env })
      .toString()
      .trim()
  } catch {
    sha = ''
  }
  const content = Buffer.from(await readFile(indexPath)).toString('base64')
  const shaArg = sha ? ` -f sha=${sha}` : ''
  execSync(
    `"${gh}" api -X PUT repos/${args.repo}/contents/${remotePath} -f message="Update index: ${nextPkg.name}@${nextPkg.version}" -f content=${content} -f branch=main${shaArg}`,
    { env, stdio: 'inherit' },
  )
  process.stderr.write(`index pushed to ${args.repo}\n`)
}

function readLocalizedMeta(pluginDir, locale) {
  const file = path.join(pluginDir, 'locale', `${locale}.json`)
  if (!existsSync(file)) return undefined
  try {
    return JSON.parse(readFileSync(file, 'utf8')).meta
  } catch {
    return undefined
  }
}

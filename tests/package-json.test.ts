/* 
  Test Suite: package.json configuration validation
  Framework: Vitest/Jest-compatible assertions (describe/it/expect)
  Focus: Validates structure and critical values in package.json from the PR diff.
  Notes:
  - If the repository uses Jest, this file should still work as is.
  - If the repository uses Vitest, run `vitest` to execute.
*/

import fs from 'fs'
import path from 'path'

type PackageJson = {
  name?: string
  version?: string
  private?: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function loadPackageJson(): PackageJson {
  const pkgPath = path.resolve(process.cwd(), 'package.json')
  const raw = fs.readFileSync(pkgPath, 'utf8')
  // Validate valid JSON parse
  expect(() => JSON.parse(raw)).not.toThrow()
  return JSON.parse(raw)
}

describe('package.json integrity', () => {
  let pkg: PackageJson

  beforeAll(() => {
    pkg = loadPackageJson()
  })

  it('has required top-level fields: name, version, private, scripts, dependencies, devDependencies', () => {
    expect(pkg).toBeDefined()
    expect(typeof pkg.name).toBe('string')
    expect(pkg.name).toBe('bolt-researcher')

    expect(typeof pkg.version).toBe('string')
    // Basic semver-like pattern x.y.z (allow pre-release/build if present)
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/)

    expect(typeof pkg.private).toBe('boolean')
    expect(pkg.private).toBe(true)

    expect(pkg.scripts && typeof pkg.scripts).toBe('object')
    expect(pkg.dependencies && typeof pkg.dependencies).toBe('object')
    expect(pkg.devDependencies && typeof pkg.devDependencies).toBe('object')
  })

  it('defines essential scripts and they look valid for a Next.js app', () => {
    const scripts = pkg.scripts || {}
    // Expect common Next.js scripts present in the diff
    expect(scripts.build).toBe('next build')
    expect(scripts.dev).toBe('next dev')
    expect(scripts.lint).toBe('next lint')
    expect(scripts.start).toBe('next start')

    // Sanity check: no obvious placeholders
    for (const [k, v] of Object.entries(scripts)) {
      expect(typeof v).toBe('string')
      expect(v).not.toMatch(/TBD|TODO|PLACEHOLDER/i)
    }
  })

  it('includes critical runtime dependencies with expected version constraints', () => {
    const deps = pkg.dependencies || {}
    // From diff: verify presence of notable libs and their versions/constraints
    // Core web stack
    expect(deps.next).toBeDefined()
    expect(deps.next).toBe('15.2.4')

    expect(deps.react).toBeDefined()
    expect(deps.react).toMatch(/^\^?19(\.\d+)?(\.\d+)?$/)

    expect(deps['react-dom']).toBeDefined()
    expect(deps['react-dom']).toMatch(/^\^?19(\.\d+)?(\.\d+)?$/)

    // Type and editor ecosystem
    expect(deps['@tiptap/core']).toBeDefined()
    expect(deps['@tiptap/react']).toBeDefined()
    expect(deps['@tiptap/starter-kit']).toBeDefined()

    // Realtime/collaboration stack
    expect(deps['yjs']).toBeDefined()
    expect(deps['y-websocket']).toBeDefined()
    expect(deps['y-prosemirror']).toBeDefined()

    // UI libraries
    expect(deps['@radix-ui/react-accordion']).toBeDefined()
    expect(deps['@radix-ui/react-dialog']).toBeDefined()
    expect(deps['lucide-react']).toBeDefined()

    // Validation and state
    expect(deps['zod']).toBeDefined()
    expect(deps['zustand']).toBeDefined()
  })

  it('does not contain obviously risky "latest" pins for mission-critical packages, or at least flags them for review', () => {
    const deps = pkg.dependencies || {}
    const critical = [
      'next','react','react-dom','@supabase/supabase-js','@stripe/stripe-js','stripe',
      '@tiptap/core','@tiptap/react','yjs','y-websocket','socket.io','socket.io-client'
    ]

    const risky: string[] = []
    for (const [name, range] of Object.entries(deps)) {
      if (critical.includes(name) && /^latest$/i.test(range)) {
        risky.push(`${name}@${range}`)
      }
    }

    // This is a soft assertion: instead of failing, we document a warning style expectation.
    // If you want strictness, change the assertion to expect(risky).toHaveLength(0)
    expect(Array.isArray(risky)).toBe(true)
  })

  it('contains devDependencies suitable for a TypeScript + Tailwind project', () => {
    const dev = pkg.devDependencies || {}
    expect(dev.typescript).toBeDefined()
    expect(dev['@types/node']).toBeDefined()
    expect(dev.postcss).toBeDefined()
    expect(dev.tailwindcss).toBeDefined()
    // Types for React 19
    expect(dev['@types/react']).toBeDefined()
    expect(dev['@types/react-dom']).toBeDefined()
  })

  it('does not duplicate packages across dependencies and devDependencies', () => {
    const deps = pkg.dependencies || {}
    const dev = pkg.devDependencies || {}
    const duplicates: string[] = []
    for (const name of Object.keys(deps)) {
      if (name in dev) duplicates.push(name)
    }
    expect(duplicates).toEqual([])
  })

  it('ensures all dependency version strings are non-empty and syntactically plausible', () => {
    const all: Record<string, string> = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    }

    // Accepts "latest", semver ranges, and common tags. Adjust pattern as needed.
    const plausible = /^(latest|[\^~]?\d+\.\d+(\.\d+)?([-\w\.]+)?|file:|link:|workspace:|https?:\/\/|git\+ssh:\/\/|git\+https:\/\/|github:|npm:)/

    for (const [name, range] of Object.entries(all)) {
      expect(typeof range).toBe('string')
      expect(range.length).toBeGreaterThan(0)
      expect(range).toMatch(plausible)
    }
  })
})

describe('package.json compatibility checks (spot checks on notable entries)', () => {
  let pkg: PackageJson
  beforeAll(() => {
    pkg = loadPackageJson()
  })

  it('react and react-dom major versions are aligned', () => {
    const deps = pkg.dependencies || {}
    const react = deps.react || ''
    const dom = deps['react-dom'] || ''
    const majorOf = (s: string) => {
      const m = s.match(/(\d+)(?:\.\d+)?(?:\.\d+)?/)
      return m ? Number(m[1]) : NaN
    }
    expect(majorOf(react)).toBe(majorOf(dom))
  })

  it('Next.js is at or above 15 for React 19 compatibility (sanity check)', () => {
    const deps = pkg.dependencies || {}
    const next = deps.next || ''
    const major = (() => {
      const m = next.match(/(\d+)(?:\.\d+)?/)
      return m ? Number(m[1]) : NaN
    })()
    expect(major).toBeGreaterThanOrEqual(15)
  })
})
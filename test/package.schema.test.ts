/**
 * Test suite: package.json schema validation (basic)
 * Testing library/framework used: Vitest
 *
 * Validates critical keys exist and have reasonable types/values.
 * This provides meaningful validation for configuration files in the absence of direct unit-testable code.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";

describe("package.json schema", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

  it("has required top-level keys", () => {
    expect(pkg).toHaveProperty("name");
    expect(pkg).toHaveProperty("version");
    expect(pkg).toHaveProperty("private");
    expect(pkg).toHaveProperty("scripts");
    expect(pkg).toHaveProperty("dependencies");
    expect(pkg).toHaveProperty("devDependencies");
  });

  it("has valid name and version", () => {
    expect(typeof pkg.name).toBe("string");
    expect(pkg.name.length).toBeGreaterThan(0);
    expect(typeof pkg.version).toBe("string");
    // Basic semver-ish check
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("scripts include common entries and are strings when present", () => {
    const s = pkg.scripts || {};
    for (const [k, v] of Object.entries(s)) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
    // Common Next.js scripts often used
    if (s.build) expect(s.build).toMatch(/next build/);
    if (s.dev) expect(s.dev).toMatch(/next dev/);
    if (s.start) expect(s.start).toMatch(/next start/);
  });

  it("dependencies and devDependencies are objects", () => {
    expect(typeof pkg.dependencies).toBe("object");
    expect(typeof pkg.devDependencies).toBe("object");
  });
});
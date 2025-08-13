/**
 * Test suite: vitest.config.ts configuration
 * Testing library/framework used: Vitest
 *
 * Goals:
 * - Validate the exported config shape
 * - Ensure important fields (environment, globals, include/exclude, coverage reporters) are set as expected
 * - Ensure resolve.alias includes common alias like "@" -> "/src" if present
 *
 * Note:
 * These tests import the configuration as a module and make assertions on its structure.
 * If the config changes, update expectations accordingly.
 */

import { describe, it, expect } from "vitest";

// vitest.config.ts default export
import config from "../vitest.config";

type UserConfig = {
  test?: {
    environment?: string;
    globals?: boolean;
    setupFiles?: string[] | string;
    include?: string[] | string;
    exclude?: string[] | string;
    coverage?: {
      enabled?: boolean;
      reporter?: string[] | string;
      reportsDirectory?: string;
      thresholds?: Record<string, number>;
    };
  };
  resolve?: {
    alias?: Record<string, string> | Array<{ find: string | RegExp; replacement: string }>;
  };
};

function normalizeArray<T>(v: T[] | T | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

describe("vitest.config.ts", () => {
  it("exports an object config", () => {
    expect(config).toBeTypeOf("object");
  });

  it("defines a test configuration block", () => {
    const c = config as UserConfig;
    expect(c.test).toBeDefined();
  });

  it("sets jsdom environment and globals appropriately", () => {
    const c = config as UserConfig;
    expect(c.test?.environment).toBeDefined();
    // Allow 'jsdom' or 'happy-dom' if project prefers either — but default expectation is jsdom
    expect(["jsdom", "happy-dom"]).toContain(c.test?.environment);
    expect(typeof c.test?.globals).toBe("boolean");
  });

  it("includes sane defaults for include/exclude patterns", () => {
    const c = config as UserConfig;
    const include = normalizeArray(c.test?.include);
    const exclude = normalizeArray(c.test?.exclude);

    // Should include typical test globs
    const includeStr = include.join(" ");
    expect(includeStr).toMatch(/test|spec/);

    // Should exclude node_modules at minimum
    expect(exclude.join(" ")).toMatch(/node_modules/);
  });

  it("enables coverage or has an explicit decision not to", () => {
    const c = config as UserConfig;
    // If coverage is present, validate shape. If not present, that's acceptable but should be explicit at some point.
    if (c.test?.coverage) {
      expect(typeof c.test.coverage.enabled).toBe("boolean");
      const reporters = normalizeArray(c.test.coverage.reporter);
      // If coverage enabled, ideally there are reporters
      if (c.test.coverage.enabled) {
        expect(reporters.length).toBeGreaterThan(0);
      }
      if (c.test.coverage.reportsDirectory) {
        expect(typeof c.test.coverage.reportsDirectory).toBe("string");
        expect(c.test.coverage.reportsDirectory.length).toBeGreaterThan(0);
      }
      if (c.test.coverage.thresholds) {
        // thresholds should be numbers if provided
        for (const [k, v] of Object.entries(c.test.coverage.thresholds)) {
          expect(typeof v).toBe("number");
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    } else {
      // If coverage is not configured, make note via assertion message.
      expect(c.test?.coverage, "Consider enabling coverage to track test quality").toBeUndefined();
    }
  });

  it("exposes a resolve.alias configuration when applicable", () => {
    const c = config as UserConfig;
    if (c.resolve?.alias) {
      const alias = c.resolve.alias;
      if (Array.isArray(alias)) {
        // Array form
        const hasAny = alias.length > 0;
        expect(hasAny).toBe(true);
      } else {
        // Record form
        expect(typeof alias).toBe("object");
        // Common alias check if present
        if ("@" in alias) {
          expect(alias["@"]).toBeTypeOf("string");
          // Can't strictly assert path, but it often points to /src
        }
      }
    } else {
      // Alias configuration is optional depending on project setup
      expect(c.resolve?.alias, "Alias configuration is optional").toBeUndefined();
    }
  });

  it("does not contain obvious misconfigurations", () => {
    const c = config as UserConfig;
    // environment should not be 'node' for React/Next component tests unless explicitly intended.
    if (c.test?.environment) {
      expect(c.test.environment).not.toBe("node");
    }
    // setupFiles should be strings and resolvable paths (basic check: non-empty if provided)
    const setup = normalizeArray(c.test?.setupFiles);
    setup.forEach((s) => expect(typeof s).toBe("string"));
  });
});
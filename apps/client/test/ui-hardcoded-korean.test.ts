import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const SRC_ROOT = join(process.cwd(), "apps", "client", "src");
const ALLOWED_FILES = new Set([
  "shared/i18n/resources.ts",
  "shared/i18n/ui-locale.ts"
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const HANGUL_PATTERN = /[가-힣]/;

test("keeps Korean UI copy out of Client source outside i18n resources", () => {
  const offenders = getSourceFiles(SRC_ROOT)
    .map((filePath) => ({
      filePath,
      relativePath: relative(SRC_ROOT, filePath)
    }))
    .filter(({ relativePath }) => !ALLOWED_FILES.has(relativePath.split(sep).join("/")))
    .flatMap(({ filePath, relativePath }) =>
      findHangulLines(relativePath, readFileSync(filePath, "utf8"))
    );

  assert.deepEqual(offenders, []);
});

function getSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return getSourceFiles(path);
    }

    return SOURCE_EXTENSIONS.has(path.slice(path.lastIndexOf("."))) ? [path] : [];
  });
}

function findHangulLines(relativePath: string, source: string): string[] {
  return stripComments(source)
    .split("\n")
    .flatMap((line, index) =>
      HANGUL_PATTERN.test(line)
        ? [`${relativePath}:${index + 1}: ${line.trim()}`]
        : []
    );
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

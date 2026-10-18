import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const distDir = resolve(root, process.env.NEXT_DIST_DIR || ".next-prod");
const standaloneDir = join(distDir, "standalone");
const standaloneModulesDir = join(standaloneDir, "node_modules");
const buildIdPath = join(distDir, "BUILD_ID");

if (!existsSync(standaloneDir) || !existsSync(standaloneModulesDir) || !existsSync(buildIdPath)) {
  throw new Error(
    `Standalone build not found at ${standaloneDir}. Run the production build before this check.`
  );
}

const buildTime = statSync(buildIdPath).mtimeMs;
const sourceRoots = [
  join(root, "src"),
  join(root, "prisma"),
];
const sourceFiles = [
  join(root, "package.json"),
  join(root, "package-lock.json"),
  join(root, "Dockerfile"),
  join(root, "next.config.ts"),
];

for (const sourceRoot of sourceRoots) {
  if (existsSync(sourceRoot)) collectSourceFiles(sourceRoot, sourceFiles);
}

const staleInputs = sourceFiles
  .filter((file) => existsSync(file) && statSync(file).mtimeMs > buildTime)
  .map((file) => file.replace(`${root}${process.platform === "win32" ? "\\" : "/"}`, ""));

if (staleInputs.length > 0) {
  throw new Error(
    `Standalone output predates current source inputs. Rebuild before scanning: ${staleInputs.join(", ")}`
  );
}

const packages = scanNodeModules(standaloneModulesDir);
const packageByName = new Map();
for (const pkg of packages) {
  const versions = packageByName.get(pkg.name) ?? [];
  versions.push(pkg.version);
  packageByName.set(pkg.name, versions);
}

const forbiddenPackages = [
  "eslint-config-next",
  "@next/eslint-plugin-next",
  "fast-glob",
  "micromatch",
  "braces",
  "esbuild",
];
const failures = [];

for (const packageName of forbiddenPackages) {
  const versions = packageByName.get(packageName);
  if (versions) failures.push(`${packageName} is present (${versions.join(", ")})`);
}

for (const version of packageByName.get("source-map-js") ?? []) {
  if (isVersionLessThan(version, "1.2.2")) {
    failures.push(`source-map-js ${version} is present; require 1.2.2 or later`);
  }
}

if (failures.length > 0) {
  console.error("Standalone runtime dependency scan failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Standalone runtime dependency scan passed.");
console.log(`Build ID: ${readFileSync(buildIdPath, "utf8").trim()}`);
console.log(`Scanned package manifests: ${packages.length}`);
console.log("No ESLint tooling chain, esbuild, braces, or vulnerable source-map-js version was found.");

function collectSourceFiles(directory, output) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, output);
    } else if (/\.(?:[cm]?js|jsx|[cm]?ts|tsx|prisma|sql)$/.test(entry.name)) {
      output.push(fullPath);
    }
  }
}

function scanNodeModules(nodeModulesDir, output = []) {
  for (const entry of readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Unexpected symlink in standalone node_modules: ${join(nodeModulesDir, entry.name)}`);
    }
    if (!entry.isDirectory()) continue;

    const entryPath = join(nodeModulesDir, entry.name);
    if (entry.name.startsWith("@")) {
      scanScopedModules(entryPath, output);
      continue;
    }

    scanPackageDirectory(entryPath, output);
  }

  return output;
}

function scanScopedModules(scopeDir, output) {
  for (const entry of readdirSync(scopeDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Unexpected symlink in standalone scoped modules: ${join(scopeDir, entry.name)}`);
    }
    if (entry.isDirectory()) scanPackageDirectory(join(scopeDir, entry.name), output);
  }
}

function scanPackageDirectory(packageDir, output) {
  const manifestPath = join(packageDir, "package.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (typeof manifest.name === "string" && typeof manifest.version === "string") {
        output.push({ name: manifest.name, version: manifest.version });
      }
    } catch (error) {
      throw new Error(`Could not read ${manifestPath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const nestedNodeModules = join(packageDir, "node_modules");
  if (existsSync(nestedNodeModules)) scanNodeModules(nestedNodeModules, output);
}

function isVersionLessThan(version, minimum) {
  const parsedVersion = parseVersion(version);
  const parsedMinimum = parseVersion(minimum);
  if (!parsedVersion || !parsedMinimum) return true;

  for (let index = 0; index < parsedMinimum.length; index += 1) {
    if (parsedVersion[index] < parsedMinimum[index]) return true;
    if (parsedVersion[index] > parsedMinimum[index]) return false;
  }

  return false;
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

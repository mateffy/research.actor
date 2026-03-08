#!/usr/bin/env bun
import { $ } from "bun";

// Packages to publish (must be in dependency order)
const packages = [
  { name: "@cachelyze/core", path: "packages/core" },
  { name: "@cachelyze/cli", path: "packages/cli" },
  { name: "cachelyze", path: "packages/cachelyze" },
  { name: "research.actor", path: "packages/research.actor" },
  { name: "@cachelyze/skill", path: "packages/skill" },
];

// Read version from core package (source of truth)
const corePkg = await Bun.file("packages/core/package.json").json();
const version = corePkg.version;
const tag = `v${version}`;

console.log(`Publishing version ${version}...\n`);

// Check if tag already exists
let tagExists = false;
try {
  await $`git rev-parse ${tag}`.quiet();
  tagExists = true;
} catch {
  // Tag doesn't exist
}

if (tagExists) {
  console.error(`Error: Tag ${tag} already exists.`);
  console.error("Did you forget to run 'bun run version:<patch|minor|major>' first?");
  process.exit(1);
}

// Check for uncommitted changes
try {
  const status = await $`git status --porcelain`.quiet();
  if (status.stdout.toString().trim()) {
    console.error("Error: You have uncommitted changes. Please commit or stash them first.");
    process.exit(1);
  }
} catch {
  // Ignore if git status fails
}

// Check if gh CLI is available
let ghAvailable = false;
try {
  await $`gh --version`.quiet();
  ghAvailable = true;
} catch {
  console.warn("Warning: GitHub CLI (gh) not found. Skipping GitHub release creation.");
}

// Create git tag
console.log(`Creating git tag ${tag}...`);
await $`git tag -a ${tag} -m "Release ${tag}"`;

// Push tag to GitHub
console.log(`Pushing tag to GitHub...`);
await $`git push origin ${tag}`;

// Publish packages to npm
console.log("\nPublishing packages to npm...\n");

for (const pkg of packages) {
  console.log(`Publishing ${pkg.name}...`);
  try {
    await $`bun publish --access public`.cwd(pkg.path);
    console.log(`✓ ${pkg.name} published\n`);
  } catch (error) {
    console.error(`✗ Failed to publish ${pkg.name}`);
    console.error(error);
    console.error("\nRolling back: deleting tag...");
    await $`git tag -d ${tag}`;
    await $`git push origin --delete ${tag}`;
    process.exit(1);
  }
}

// Create GitHub release
if (ghAvailable) {
  console.log("Creating GitHub release...");
  try {
    await $`gh release create ${tag} --title ${tag} --generate-notes`;
    console.log(`✓ GitHub release created`);
  } catch (error) {
    console.error("✗ Failed to create GitHub release");
    console.error(error);
    console.error("You can create it manually at your repository's releases page");
  }
}

console.log(`\n✓ Successfully published version ${version}!`);
for (const pkg of packages) {
  console.log(`  - npm: ${pkg.name}@${version}`);
}
console.log(`  - GitHub: ${tag}`);

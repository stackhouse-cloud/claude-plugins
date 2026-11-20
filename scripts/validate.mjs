#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const KEBAB_NAME_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESERVED_NAME_RE =
  /^(?:claude|anthropic|anthropics|claude-code|claude-mods)$|^(?:claude|anthropic|anthropics|cc-plugin)-/i;

const ALLOWED_MARKETPLACE_KEYS = new Set([
  "$schema",
  "name",
  "description",
  "owner",
  "metadata",
  "renames",
  "plugins",
]);

const ALLOWED_MARKETPLACE_ENTRY_KEYS = new Set([
  "name",
  "displayName",
  "source",
  "description",
  "version",
  "author",
  "category",
  "homepage",
  "repository",
  "license",
  "keywords",
  "tags",
  "defaultEnabled",
  "strict",
]);

const ALLOWED_PLUGIN_MANIFEST_KEYS = new Set([
  "$schema",
  "name",
  "displayName",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "metadata",
  "icon",
  "documentationUrl",
  "supportUrl",
  "privacyPolicyUrl",
  "termsOfServiceUrl",
  "defaultEnabled",
  "dependencies",
  "network",
  "userConfig",
  "types",
  "channels",
  "skills",
  "commands",
  "agents",
  "hooks",
  "mcpServers",
  "lspServers",
  "outputStyles",
  "workflows",
  "experimental",
]);

const SECRET_TOKEN_RE =
  /\b(?:qzl_[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,})\b/;

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(targetPath) {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function isValidDotSlashPath(value) {
  if (typeof value !== "string" || !value.startsWith("./") || value.length <= 2) {
    return false;
  }
  if (value.includes("\\") || value.split("/").includes("..")) {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return normalized !== "." && normalized !== ".." && !normalized.startsWith("../");
}

function parseFrontmatter(rawContent) {
  const content = rawContent.replace(/\r\n/g, "\n");
  if (!content.startsWith("---\n")) {
    return null;
  }
  const closingIndex = content.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }
  const block = content.slice(4, closingIndex);
  const fields = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    let val = line.slice(colon + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    fields[key] = val;
  }
  return fields;
}

async function readJson(filePath, label, errors) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    errors.push(`${label} is missing: ${filePath}`);
    return { data: null, raw: null };
  }
  try {
    return { data: JSON.parse(raw), raw };
  } catch (err) {
    errors.push(`${label} contains invalid JSON (${filePath}): ${err.message}`);
    return { data: null, raw };
  }
}

export async function validateClaudeMarketplaceRepo(repoRoot) {
  const errors = [];

  for (const requiredRootFile of ["README.md", "LICENSE"]) {
    if (!(await pathExists(path.join(repoRoot, requiredRootFile)))) {
      errors.push(`Repository root is missing ${requiredRootFile}.`);
    }
  }

  const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const { data: marketplace } = await readJson(
    marketplacePath,
    "Marketplace manifest",
    errors
  );
  if (!marketplace) {
    return { valid: false, errors };
  }

  for (const key of Object.keys(marketplace)) {
    if (!ALLOWED_MARKETPLACE_KEYS.has(key)) {
      errors.push(`Marketplace manifest contains unrecognized key "${key}".`);
    }
  }

  if (
    typeof marketplace.name !== "string" ||
    !KEBAB_NAME_RE.test(marketplace.name) ||
    RESERVED_NAME_RE.test(marketplace.name)
  ) {
    errors.push(
      'Marketplace "name" must be lowercase kebab-case and not use a reserved Anthropic/Claude prefix.'
    );
  }

  if (
    !marketplace.owner ||
    typeof marketplace.owner.name !== "string" ||
    marketplace.owner.name.trim().length === 0
  ) {
    errors.push('Marketplace "owner.name" is required.');
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    errors.push('Marketplace "plugins" must be a non-empty array.');
    return { valid: false, errors };
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;
    if (!entry || typeof entry !== "object") {
      errors.push(`${label} must be an object.`);
      continue;
    }

    for (const key of Object.keys(entry)) {
      if (!ALLOWED_MARKETPLACE_ENTRY_KEYS.has(key)) {
        errors.push(`${label} contains unrecognized key "${key}".`);
      }
    }

    if (
      typeof entry.name !== "string" ||
      !KEBAB_NAME_RE.test(entry.name) ||
      RESERVED_NAME_RE.test(entry.name)
    ) {
      errors.push(
        `${label}.name must be lowercase kebab-case and not use a reserved Anthropic/Claude prefix.`
      );
      continue;
    }

    if (seenNames.has(entry.name)) {
      errors.push(`Duplicate plugin name in marketplace.json: "${entry.name}".`);
    }
    seenNames.add(entry.name);

    if (!isValidDotSlashPath(entry.source)) {
      errors.push(
        `${label}.source must be a "./"-prefixed relative path from the marketplace root without ".." (got "${entry.source}").`
      );
      continue;
    }

    const pluginDir = path.resolve(repoRoot, entry.source);
    if (!(await isDirectory(pluginDir))) {
      errors.push(`${label}.source directory does not exist: ${entry.source}`);
      continue;
    }

    if (!(await pathExists(path.join(pluginDir, "README.md")))) {
      errors.push(`${entry.name}: plugin directory is missing README.md.`);
    }

    const pluginManifestPath = path.join(
      pluginDir,
      ".claude-plugin",
      "plugin.json"
    );
    const { data: pluginManifest } = await readJson(
      pluginManifestPath,
      `${entry.name} plugin.json`,
      errors
    );
    if (!pluginManifest) {
      continue;
    }

    for (const key of Object.keys(pluginManifest)) {
      if (!ALLOWED_PLUGIN_MANIFEST_KEYS.has(key)) {
        errors.push(
          `${entry.name}: plugin.json contains unrecognized key "${key}".`
        );
      }
    }

    if (pluginManifest.name !== entry.name) {
      errors.push(
        `${entry.name}: marketplace entry name ("${entry.name}") does not match plugin.json name ("${pluginManifest.name}").`
      );
    }

    if (pluginManifest.icon !== undefined) {
      if (!isValidDotSlashPath(pluginManifest.icon)) {
        errors.push(
          `${entry.name}: icon path "${pluginManifest.icon}" must start with "./" and contain no "..".`
        );
      } else if (!(await pathExists(path.join(pluginDir, pluginManifest.icon)))) {
        errors.push(
          `${entry.name}: icon file not found at ${pluginManifest.icon}.`
        );
      }
    }

    for (const urlField of [
      "homepage",
      "repository",
      "documentationUrl",
      "supportUrl",
      "privacyPolicyUrl",
      "termsOfServiceUrl",
    ]) {
      if (pluginManifest[urlField] !== undefined) {
        try {
          const parsed = new URL(pluginManifest[urlField]);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            errors.push(`${entry.name}: ${urlField} must be an http(s) URL.`);
          }
        } catch {
          errors.push(
            `${entry.name}: ${urlField} is not a valid URL ("${pluginManifest[urlField]}").`
          );
        }
      }
    }

    const declaredUserConfig = new Set(
      Object.keys(pluginManifest.userConfig ?? {})
    );

    const mcpPath = path.join(pluginDir, ".mcp.json");
    if (await pathExists(mcpPath)) {
      const { data: mcpData, raw: mcpRaw } = await readJson(
        mcpPath,
        `${entry.name} .mcp.json`,
        errors
      );
      if (mcpData && mcpRaw) {
        const serversMap =
          mcpData.mcpServers && typeof mcpData.mcpServers === "object"
            ? mcpData.mcpServers
            : mcpData;
        const serverEntries = Object.entries(serversMap).filter(
          ([k]) => !k.startsWith("_")
        );
        if (serverEntries.length === 0) {
          errors.push(`${entry.name}: .mcp.json must declare at least one MCP server.`);
        }
        for (const [serverName, cfg] of serverEntries) {
          if (!cfg || typeof cfg !== "object") {
            errors.push(`${entry.name}: .mcp.json server "${serverName}" must be an object.`);
            continue;
          }
          if (cfg.url !== undefined) {
            try {
              const parsed = new URL(cfg.url);
              if (parsed.protocol !== "https:") {
                errors.push(
                  `${entry.name}: .mcp.json server "${serverName}" url must use https://.`
                );
              }
            } catch {
              errors.push(
                `${entry.name}: .mcp.json server "${serverName}" url is invalid.`
              );
            }
          }
        }
        if (SECRET_TOKEN_RE.test(mcpRaw)) {
          errors.push(
            `${entry.name}: .mcp.json appears to contain a hardcoded credential.`
          );
        }
        for (const match of mcpRaw.matchAll(/\$\{user_config\.([^}]+)\}/g)) {
          const cfgKey = match[1];
          if (!declaredUserConfig.has(cfgKey)) {
            errors.push(
              `${entry.name}: .mcp.json references "\${user_config.${cfgKey}}" which is not declared in plugin.json userConfig.`
            );
          }
        }
      }
    }

    const skillsDir = path.join(pluginDir, "skills");
    if (await isDirectory(skillsDir)) {
      const skillEntries = await fs.readdir(skillsDir, { withFileTypes: true });
      for (const dirent of skillEntries) {
        if (!dirent.isDirectory()) {
          continue;
        }
        const skillFolder = dirent.name;
        const skillFile = path.join(skillsDir, skillFolder, "SKILL.md");
        if (!(await pathExists(skillFile))) {
          errors.push(
            `${entry.name}: skill directory skills/${skillFolder} is missing SKILL.md.`
          );
          continue;
        }
        const rawSkill = await fs.readFile(skillFile, "utf8");
        if (/\b(?:GetDynamicTools|CallDynamicTool)\b/.test(rawSkill)) {
          errors.push(
            `${entry.name}: skills/${skillFolder}/SKILL.md references Cursor-only dynamic tool helpers.`
          );
        }
        const fm = parseFrontmatter(rawSkill);
        if (!fm) {
          errors.push(
            `${entry.name}: skills/${skillFolder}/SKILL.md is missing YAML frontmatter.`
          );
          continue;
        }
        if (
          !fm.name ||
          fm.name !== skillFolder ||
          fm.name.length > 64 ||
          !KEBAB_NAME_RE.test(fm.name)
        ) {
          errors.push(
            `${entry.name}: skills/${skillFolder}/SKILL.md frontmatter "name" ("${fm.name ?? ""}") must match folder "${skillFolder}".`
          );
        }
        if (
          !fm.description ||
          fm.description === ">-" ||
          fm.description === ">" ||
          fm.description === "|" ||
          fm.description.length > 1024
        ) {
          errors.push(
            `${entry.name}: skills/${skillFolder}/SKILL.md frontmatter must have a single-line "description" (1–1024 chars).`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const targetRoot = process.argv[2]
    ? path.resolve(process.argv[2])
    : process.cwd();
  const result = await validateClaudeMarketplaceRepo(targetRoot);
  if (!result.valid) {
    console.error("Claude plugin marketplace validation failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log("Claude plugin marketplace validation passed.");
}

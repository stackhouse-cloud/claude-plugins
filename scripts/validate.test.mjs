import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateClaudeMarketplaceRepo } from "./validate.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("stackhouse-cloud/claude-plugins repository passes validation and ships quizletto + tixanto + cordo", async () => {
  const result = await validateClaudeMarketplaceRepo(REPO_ROOT);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);

  const marketplace = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, ".claude-plugin", "marketplace.json"),
      "utf8"
    )
  );
  assert.equal(marketplace.name, "stackhouse");
  assert.equal(marketplace.owner?.name, "StackHouse");

  const quizlettoEntry = marketplace.plugins.find(
    (p) => p.name === "quizletto"
  );
  assert.ok(quizlettoEntry, "expected quizletto entry in marketplace.json");
  assert.equal(quizlettoEntry.source, "./plugins/quizletto");

  const tixantoEntry = marketplace.plugins.find((p) => p.name === "tixanto");
  assert.ok(tixantoEntry, "expected tixanto entry in marketplace.json");
  assert.equal(tixantoEntry.source, "./plugins/tixanto");

  const mcp = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "plugins", "quizletto", ".mcp.json"),
      "utf8"
    )
  );
  const serverCfg = mcp.mcpServers?.quizletto ?? mcp.quizletto;
  assert.equal(serverCfg?.type, "http");
  assert.equal(serverCfg?.url, "https://api.quizletto.cloud/v1/mcp");

  const tixantoManifest = JSON.parse(
    await fs.readFile(
      path.join(
        REPO_ROOT,
        "plugins",
        "tixanto",
        ".claude-plugin",
        "plugin.json"
      ),
      "utf8"
    )
  );
  assert.equal(
    tixantoManifest.userConfig,
    undefined,
    "tixanto uses OAuth 2.1 and should not require userConfig"
  );

  const tixantoMcp = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "plugins", "tixanto", ".mcp.json"),
      "utf8"
    )
  );
  const tixantoCfg = tixantoMcp.mcpServers?.tixanto ?? tixantoMcp.tixanto;
  assert.equal(tixantoCfg?.type, "http");
  assert.equal(tixantoCfg?.url, "https://api.tixanto.cloud/v1/mcp/http");
  assert.equal(
    tixantoCfg?.headers,
    undefined,
    "tixanto uses OAuth 2.1 and should not set static auth headers"
  );

  const cordoEntry = marketplace.plugins.find((p) => p.name === "cordo");
  assert.ok(cordoEntry, "expected cordo entry in marketplace.json");
  assert.equal(cordoEntry.source, "./plugins/cordo");

  const cordoManifest = JSON.parse(
    await fs.readFile(
      path.join(
        REPO_ROOT,
        "plugins",
        "cordo",
        ".claude-plugin",
        "plugin.json"
      ),
      "utf8"
    )
  );
  assert.equal(
    cordoManifest.userConfig,
    undefined,
    "cordo uses OAuth 2.1 and should not require userConfig"
  );

  const cordoMcp = JSON.parse(
    await fs.readFile(
      path.join(REPO_ROOT, "plugins", "cordo", ".mcp.json"),
      "utf8"
    )
  );
  const cordoCfg = cordoMcp.mcpServers?.cordo ?? cordoMcp.cordo;
  assert.equal(cordoCfg?.type, "http");
  assert.equal(cordoCfg?.url, "https://api.cordo.cloud/mcp");
  assert.equal(
    cordoCfg?.headers,
    undefined,
    "cordo uses OAuth 2.1 and should not set static auth headers"
  );
});

test("validator rejects common Claude marketplace pitfalls", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-plugins-test-"));
  try {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# Test\n");
    await fs.writeFile(path.join(tmpDir, "LICENSE"), "MIT\n");
    await fs.mkdir(path.join(tmpDir, ".claude-plugin"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "plugins", "demo", ".claude-plugin"), {
      recursive: true,
    });

    // Missing "./" source prefix + reserved marketplace name + unrecognized plugin.json key
    await fs.writeFile(
      path.join(tmpDir, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        name: "claude-official",
        owner: { name: "StackHouse" },
        plugins: [
          {
            name: "demo",
            source: "plugins/demo",
          },
        ],
      })
    );

    const badMarketplace = await validateClaudeMarketplaceRepo(tmpDir);
    assert.equal(badMarketplace.valid, false);
    assert.ok(
      badMarketplace.errors.some((e) => e.includes("reserved")),
      "should reject reserved claude-* marketplace name"
    );
    assert.ok(
      badMarketplace.errors.some((e) => e.includes('"./"-prefixed')),
      "should require ./ prefix on Claude marketplace source"
    );

    // Valid marketplace, check unrecognized plugin.json field + undeclared user_config
    await fs.writeFile(
      path.join(tmpDir, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        name: "stackhouse",
        owner: { name: "StackHouse" },
        plugins: [{ name: "demo", source: "./plugins/demo" }],
      })
    );
    await fs.writeFile(path.join(tmpDir, "plugins", "demo", "README.md"), "# Demo\n");
    await fs.writeFile(
      path.join(tmpDir, "plugins", "demo", ".claude-plugin", "plugin.json"),
      JSON.stringify({
        name: "demo",
        publisher: "StackHouse",
      })
    );
    await fs.writeFile(
      path.join(tmpDir, "plugins", "demo", ".mcp.json"),
      JSON.stringify({
        demo: {
          type: "http",
          url: "https://example.com/mcp",
          headers: { Authorization: "Bearer ${user_config.api_token}" },
        },
      })
    );

    const badPlugin = await validateClaudeMarketplaceRepo(tmpDir);
    assert.equal(badPlugin.valid, false);
    assert.ok(
      badPlugin.errors.some((e) => e.includes('unrecognized key "publisher"')),
      "should reject Cursor-only publisher key in Claude plugin.json"
    );
    assert.ok(
      badPlugin.errors.some((e) => e.includes("user_config.api_token")),
      "should reject undeclared user_config placeholder in .mcp.json"
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

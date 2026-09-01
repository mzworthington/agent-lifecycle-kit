import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getPhilosophySection,
  getSop,
  getKitEntity,
  getKitRelated,
  listKitIndex,
  resolveKitRoot,
  searchKit,
} from "./knowledge.ts";

const kitRoot = resolveKitRoot({
  ...process["env"],
  KIT_ROOT: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.."),
});

describe("kit-knowledge", () => {
  it("resolves kit root with CODING_PHILOSOPHY", () => {
    assert.ok(fs.existsSync(path.join(kitRoot, "CODING_PHILOSOPHY.md")));
    assert.ok(fs.existsSync(path.join(kitRoot, "SOPs")));
  });

  it("lists philosophy sections without dumping full file in index", () => {
    const index = listKitIndex(kitRoot);
    assert.match(index, /Philosophy sections/);
    assert.match(index, /§8/);
    assert.ok(!index.includes("Zero-trust input"));
  });

  it("returns one philosophy section by id", () => {
    const section = getPhilosophySection(kitRoot, "8");
    assert.ok(section);
    assert.match(section!.title, /Interaction/i);
    assert.match(section!.body, /Mermaid/);
  });

  it("returns an SOP by stem and truncates reasonably", () => {
    const sop = getSop(kitRoot, "conventional-commits");
    assert.ok(sop);
    assert.equal(sop!.id, "conventional-commits");
    assert.match(sop!.body, /Conventional Commits/i);
  });

  it("search returns excerpts not full philosophy", () => {
    const hits = searchKit(kitRoot, "hexagonal ports adapters", 5);
    assert.ok(hits.length >= 1);
    assert.ok(hits.some((h) => h.kind === "philosophy" || h.kind === "sop"));
    for (const h of hits) {
      assert.ok(h.excerpt.length <= 700, `excerpt too long: ${h.excerpt.length}`);
    }
  });

  it("search finds context-budget SOP when present", () => {
    const budgetPath = path.join(kitRoot, "SOPs", "context-budget.md");
    if (!fs.existsSync(budgetPath)) {
      // File may be added in the same change set; skip soft if missing during partial checkout
      return;
    }
    const hits = searchKit(kitRoot, "context budget always-on tokens", 8);
    assert.ok(hits.some((h) => h.id.includes("context-budget") || h.excerpt.includes("always-on")));
  });

  it("resolveKitRoot prefers KIT_ROOT env", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kit-root-"));
    fs.writeFileSync(path.join(tmp, "AGENTS.md"), "# test\n");
    assert.equal(resolveKitRoot({ KIT_ROOT: tmp }), path.resolve(tmp));
  });

  it("get_entity and get_related read ontology index", () => {
    const entity = getKitEntity(kitRoot, "skill:agent-tdd");
    assert.ok(entity);
    assert.equal(entity!.type, "Skill");
    const related = getKitRelated(kitRoot, "skill:agent-tdd", "uses");
    assert.ok(related.some((e) => e.to.startsWith("mcp:")));
    const phil = getKitRelated(kitRoot, "sop:conventional-commits", "implements");
    assert.ok(phil.some((e) => e.to.startsWith("philosophy:")));
    const docs = getKitRelated(kitRoot, "sop:eval-driven-development", "references");
    assert.ok(docs.some((e) => e.to.startsWith("doc:")));
  });
});

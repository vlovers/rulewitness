#!/usr/bin/env node
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const required = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "docs/engineering/MULTI_AGENT_WORKFLOW.md",
  "docs/engineering/DEFINITION_OF_DONE.md",
  "docs/engineering/REVIEW_POLICY.md",
  "docs/engineering/RELEASE_CHECKLIST.md",
];

const markers = {
  "AGENTS.md": ["MULTI_AGENT_WORKFLOW.md", "worktree", "review"],
  "CLAUDE.md": ["AGENTS.md"],
  ".github/PULL_REQUEST_TEMPLATE.md": [
    "MULTI_AGENT_WORKFLOW.md",
    "head SHA",
    "review",
  ],
  "docs/engineering/MULTI_AGENT_WORKFLOW.md": ["worktree", "Issue", "review"],
};

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path !== ".." && !path.startsWith(".." + sep) && !isAbsolute(path);
}

export function checkGovernance(directory) {
  const errors = [];
  const root = realpathSync(resolve(directory));
  // A Markdown and a YAML engineering-task template are competing intake paths.
  // Check the final integrated tree, not just this PR's changed files.
  const templateDir = resolve(root, ".github/ISSUE_TEMPLATE");
  const templateError = ".github/ISSUE_TEMPLATE";
  try {
    const directory = realpathSync(templateDir);
    if (!inside(root, directory)) throw Error("unsafe directory");
    const names = readdirSync(templateDir).filter((name) =>
      /^(?:engineering(?:_task)?|engineering-task)\.(?:md|ya?ml)$/i.test(name),
    );
    if (names.length !== 1) {
      const count = names.length;
      const details = count ? ": " + names.sort().join(", ") : "";
      const reason = "expected exactly one engineering intake template";
      errors.push(`${templateError}: ${reason}, found ${count}${details}`);
    } else {
      const target = realpathSync(resolve(templateDir, names[0]));
      if (!inside(root, target)) {
        errors.push(`${templateError}: engineering intake escapes repository`);
      } else if (!statSync(target).isFile()) {
        errors.push(`${templateError}: engineering intake is not a regular file`);
      } else {
        const content = readFileSync(target, "utf8");
        if (/\.ya?ml$/i.test(names[0])) {
          const ids = [...content.matchAll(/^\s+id: ([a-z_]+)\s*$/gm)].map((match) => match[1]);
          const expected = ["parent", "outcome", "boundaries", "ownership", "verification", "handoff", "safety"];
          if (!/^name:\s*\S/m.test(content) || !/^description:\s*\S/m.test(content)) {
            errors.push(`${templateError}: engineering form missing metadata`);
          }
          if (new Set(ids).size !== ids.length || expected.some((id) => !ids.includes(id))) {
            errors.push(`${templateError}: engineering form missing or duplicate fields`);
          }
          if ((content.match(/^\s+required: true\s*$/gm) ?? []).length < expected.length - 1) {
            errors.push(`${templateError}: engineering form missing required validations`);
          }
        } else if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(content)) {
          errors.push(`${templateError}: Markdown engineering template missing frontmatter`);
        }
      }
    }
  } catch {
    errors.push(`${templateError}: missing or unsafe template directory`);
  }
  for (const name of required) {
    const file = resolve(root, name);
    let contents;
    try {
      if (!inside(root, realpathSync(file)) || !statSync(file).isFile())
        throw Error("not a safe file");
      contents = readFileSync(file, "utf8");
    } catch {
      errors.push(name + ": missing, unreadable or escapes repository");
      continue;
    }
    if (contents.trim().length < 20) errors.push(name + ": empty");
    for (const marker of markers[name] ?? []) {
      if (!contents.toLowerCase().includes(marker.toLowerCase())) {
        errors.push(name + ": missing marker " + marker);
      }
    }
    for (const match of contents.matchAll(
      /(?<!!)\[[^\]\n]+\]\((<[^>\n]*>|(?:\\.|[^)\n])+?)(?:\s+"[^"\n]*")?\)/g,
    )) {
      const raw = match[1];
      const link = raw.startsWith("<") ? raw.slice(1, -1) : raw;
      if (/^(?:[a-z][\da-z+.-]*:|\/|#|\{)/i.test(link)) continue;
      let target;
      try {
        const decoded = decodeURIComponent(
          link
            .split("#")[0]
            .split("?")[0]
            .replace(/\\([() ])/g, "$1"),
        );
        if (!decoded) continue;
        target = resolve(root, dirname(name), decoded);
        if (!inside(root, target) || !inside(root, realpathSync(target))) {
          errors.push(name + ": link escapes repository: " + link);
          continue;
        }
        const st = statSync(target);
        if (!st.isFile() && !st.isDirectory()) throw Error("not file/dir");
      } catch {
        errors.push(name + ": broken or unsafe local link: " + link);
      }
    }
  }
  return errors.sort();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = checkGovernance(process.argv[2] ?? process.cwd());
  if (errors.length) {
    console.error(
      "Agent contract FAILED:\n" + errors.map((x) => "- " + x).join("\n"),
    );
    process.exitCode = 1;
  } else console.log("Agent contract: PASS");
}

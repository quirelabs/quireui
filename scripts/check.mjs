// Enforces the rules that can be checked without a browser: FOUNDATIONS.md and the component
// conventions. Plain Node, no dependencies. Exit code 1 when anything fails.
//   node scripts/check.mjs                      the free registry (this repo)
//   node check.mjs --root <dir> --registry <file> --sources <dir> --also <registry.json>
// The second form checks another registry (Pro); --also makes its imports of free items resolve.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const root = resolve(arg("--root", resolve(import.meta.dirname, "..")));
const registry = JSON.parse(readFileSync(resolve(root, arg("--registry", "registry.json")), "utf8"));
const sourceDir = resolve(root, arg("--sources", "registry"));
const also = arg("--also", null);
// Items another registry provides, so "@/registry/..." imports from Pro files resolve too.
const external = also ? JSON.parse(readFileSync(resolve(also), "utf8")).items : [];
const problems = [];
const fail = (file, message) => problems.push(`${relative(root, file)}: ${message}`);

const FIELD_ORDER = ["name", "type", "title", "description", "dependencies", "registryDependencies", "files"];
// A class list may opt out of the motion rule with this comment on the line above.
const MOTION_EXCEPTION = "motion-exception:";
// A component that cannot carry data-slot (the element is rendered by a library) says why.
const SLOT_EXCEPTION = "no-slot:";

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// ---------- Source files ----------

const sources = walk(sourceDir).filter((f) => /\.(tsx?|css)$/.test(f));

for (const file of sources.filter((f) => /\.tsx?$/.test(f))) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  for (const hook of ["forwardRef", "useMemo", "useCallback"]) {
    if (new RegExp(`\\b${hook}\\b`).test(text)) fail(file, `uses ${hook}; the React Compiler handles this`);
  }
  if (/from "@phosphor-icons\/react"/.test(text)) fail(file, 'imports icons from "@phosphor-icons/react"; use "/ssr"');
  if (/\bTODO\b/.test(text)) fail(file, "still has a TODO from the scaffold");

  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (/(^|[\s"'`])dark:/.test(line)) fail(file, `line ${i + 1}: dark: class; dark mode is a token swap`);
    const motion = line.match(/(^|[\s"'`])(transition(-[a-z]+)?|duration-\d+|ease-(in|out|in-out|linear))(?=[\s"'`])/);
    if (motion && !lines[i - 1]?.includes(MOTION_EXCEPTION)) {
      fail(file, `line ${i + 1}: "${motion[2]}" class; use the motion-* utilities or add a ${MOTION_EXCEPTION} comment`);
    }
  });

  if (file.endsWith(".tsx") && /[/\\](ui|blocks)[/\\]/.test(relative(root, file)) && !text.includes("data-slot=") && !text.includes(SLOT_EXCEPTION)) {
    fail(file, "no data-slot on the main element");
  }
}

// ---------- Registry entries ----------

const itemsByPath = new Map();
for (const item of registry.items) {
  const where = resolve(root, arg("--registry", "registry.json"));
  const label = `item "${item.name}"`;

  for (const field of ["title", "description"]) {
    if (!item[field]) fail(where, `${label} has no ${field}`);
    else if (/\bTODO\b/.test(item[field])) fail(where, `${label} ${field} is still a TODO`);
  }
  const order = Object.keys(item).filter((k) => FIELD_ORDER.includes(k));
  const expected = FIELD_ORDER.filter((k) => order.includes(k));
  if (order.join() !== expected.join()) fail(where, `${label} fields out of order: ${order.join(", ")}`);

  for (const f of item.files ?? []) {
    if (!existsSync(join(root, f.path))) fail(where, `${label} lists a missing file ${f.path}`);
    itemsByPath.set(f.path, item);
  }
  const deps = item.registryDependencies ?? [];
  if (item.type === "registry:ui" || item.type === "registry:block") {
    // Utils is covered by the import check; the foundation is needed by everything styled.
    if (!deps.includes("@quireui/foundation")) fail(where, `${label} is missing @quireui/foundation in registryDependencies`);
  }
}

// Every import has to be declared, or installs break for users.
for (const [path, item] of itemsByPath) {
  const file = join(root, path);
  if (!/\.tsx?$/.test(path) || !existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const imports = [...text.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  const deps = item.registryDependencies ?? [];
  const npm = item.dependencies ?? [];

  for (const spec of imports) {
    const local = spec.match(/^@\/(?:pro\/)?registry\/(?:ui|lib|blocks)\/([a-z-]+)(?:\/[a-z-]+)?$/);
    if (local) {
      // The file name of a lib can differ from its registry name (cn.ts is "utils").
      const file = spec.split("/").pop();
      const target = [...registry.items, ...external].find((i) => i.files?.some((f) => f.path.endsWith(`/${file}.ts`) || f.path.endsWith(`/${file}.tsx`)));
      if (target && target !== item && !deps.includes(`@quireui/${target.name}`)) {
        fail(join(root, path), `imports ${spec} but "${item.name}" does not list @quireui/${target.name}`);
      }
      continue;
    }
    if (spec.startsWith(".") || spec.startsWith("@/") || spec === "react" || spec.startsWith("react/")) continue;
    const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    if (!npm.includes(pkg)) fail(join(root, path), `imports ${pkg} but "${item.name}" does not list it in dependencies`);
  }
}

for (const file of sources.filter((f) => /\.tsx?$/.test(f))) {
  const path = relative(root, file);
  if (!itemsByPath.has(path)) fail(file, "is not part of any registry item");
}

// ---------- Report ----------

if (problems.length) {
  console.error(`check: ${problems.length} problem${problems.length === 1 ? "" : "s"}\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`check: ${registry.items.length} registry items, ${sources.length} files, all good`);

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const output = new URL("../pages-dist/", import.meta.url);
const client = new URL("../dist/client/", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("pages", Date.now().toString());

const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://knowdown.github.io/", {
    headers: { accept: "text/html" },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Static render failed: ${response.status}`);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(client, output, { recursive: true });

const prefix = (source) =>
  source
    .replaceAll('href="/', 'href="/easypay/')
    .replaceAll('src="/', 'src="/easypay/')
    .replaceAll("url(/assets/", "url(/easypay/assets/")
    .replaceAll('"/assets/', '"/easypay/assets/')
    .replaceAll("'/assets/", "'/easypay/assets/");

await writeFile(new URL("index.html", output), prefix(await response.text()));

async function rewriteAssets(directory) {
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await rewriteAssets(path);
    else if ([".css", ".js"].includes(extname(path))) {
      await writeFile(path, prefix(await readFile(path, "utf8")));
    }
  }
}

await rewriteAssets(output.pathname);
await writeFile(new URL(".nojekyll", output), "");

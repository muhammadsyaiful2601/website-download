/* Menyegarkan assets/releases.json dari GitHub Releases saat site di-deploy.
 * Dipakai sebagai build command Netlify:  node scripts/sync-releases.mjs
 * Kalau GitHub tidak bisa dihubungi, berkas lama dipertahankan.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_API =
  "https://api.github.com/repos/muhammadsyaiful2601/peminjaman-releases/releases?per_page=20";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/releases.json");

async function main() {
  try {
    const res = await fetch(REPO_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "netlify-build-sync-releases",
      },
    });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    const data = await res.json();

    const releases = (Array.isArray(data) ? data : [])
      .filter((r) => !r.draft && r.tag_name)
      .map((r) => ({
        tag_name: r.tag_name,
        name: r.name,
        published_at: r.published_at,
        html_url: r.html_url,
        prerelease: Boolean(r.prerelease),
        body: r.body || "",
        assets: (r.assets || []).map((a) => ({
          name: a.name,
          size: a.size,
          download_count: a.download_count,
          browser_download_url: a.browser_download_url,
        })),
      }));

    if (!releases.length) throw new Error("Tidak ada rilis");

    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(
      OUT,
      JSON.stringify({ updated_at: new Date().toISOString(), releases }, null, 2),
      "utf8"
    );
    console.log(`releases.json diperbarui: ${releases.length} rilis (${releases[0].tag_name})`);
  } catch (err) {
    console.log(`Sinkronisasi dilewati: ${err.message}`);
    try {
      await readFile(OUT, "utf8");
      console.log("Cache lama dipertahankan.");
    } catch {
      console.log("Perhatian: belum ada cache releases.json.");
    }
  }
}

main();
# Website media release — 11 October 2026

Michael authorized replacement of unverified artwork and photos, followed by publication. This supersedes the old literal-banner lock for these replacements. The 4DK identity marks, colours, page structure and routes remain the baseline.

## Sources and review

- Compared Food Library source export 1.2.0 (7 October) with the 11 October hash-bound correction ledger in `food-library-corrections`. Its old approval flags are not fresh owner approval. No shared canonical assignments or runtime 0.7.0 assets were changed.
- Reused already attributed website photographs. Removed the child-containing jollof card and blurred plated-rice photo; both now use the existing clear licensed jollof photograph. The old untraceable meal collage is replaced by the new generated editorial hero; the plan collage and meatball-pasta recipe image are replaced by a newly generated vegetarian tomato-spinach pasta photograph.
- Replaced banner artwork, marginal notes and tomato illustration with newly generated originals. Generation used the built-in OpenAI image-generation tool on 11 October. Full original files are retained in the task outputs and generation records; no upscaled files were used as resolution evidence.
- Recaptured all eight screenshots from the existing built 4DK React interface, with synthetic sample data and intercepted local API responses. Licensed tomato and garlic photographs are hash-checked against source export 1.2.0. All food/background requests use licensed or newly generated replacements. The UI itself is rendered, not generated. A capture-only Home rail position correction prevents a decorative label from crossing the title; a dark overlay keeps the replacement Profile decoration behind its text. These capture treatments do not change the live application. Captures demonstrate appearance, not live account, AI-provider, payment or runtime-library correctness.
- `/credits.txt` lists attribution and explains generated media and screenshot fixtures. Embedded CC photographs retain their own licences; surrounding UI ownership is separate.

## Generation briefs

1. Hero: vertical editorial photograph of a black cast-iron skillet with tomato rice, chicken, tomatoes and herbs, on matte near-black surface; three-quarter overhead angle, dark side lighting, negative space above/left; grounded everyday cooking; no text, branding, people or packaging. Native output 1024×1536. It is an editorial illustration, not a claim to show the exact recipe result.
2. Banner: wide acid yellow-green field; original black woodcut garlic and cloves at left, sliced tomato and herbs at right; open middle, flat print texture; no text or logos. Native output 2172×724.
3. Make note: transparent square, lowercase acid-green brush lettering “make something real” on three lines, underline flourish, no paper or shadow. Native output 1280×1280.
4. Brighter note: transparent square, acid-green brush lettering “brighter days” on two lines with underline flourish. Native output 1280×1280.
5. Tomato: original acid-green woodcut/halftone pair of tomatoes, whole and sliced with short stem and leaf; transparent background; no text or logos. Native output 1536×1024.

Original paths and exact production hashes are recorded in the task release evidence and `src/data/asset-manifest.json`. Generated output is not evidence of exclusive copyright. Agent visual review is not owner approval of global food-library entries.

6. Pasta: landscape editorial photo of vegetarian pasta with tomato sauce and spinach on a dark plate; no meat, fish, cheese, people or text. Native output 1536×1024.

## Release procedure

Use the checked-in production assets and lockfile. Historical `w4-build-assets.mjs` and older acquisition scripts reconstruct the pre-release corpus and must not be run as release preparation.

1. `npm ci`, `npm run check`, `npm run build`, `npm run smoke`.
2. Regenerate social cards with `node tools/w5-build-og.mjs` if source photography changes, then rebuild.
3. Run preview at port 4321, `node tools/launch-browser.mjs`, `node tools/w9r2-measure.mjs`, and `node tools/w9r2-verify.mjs --release`.
4. Deploy `deploy/cloudflare/site/wrangler.jsonc` to the existing `get4dk-site` worker. This points to production `dist`, not the held noindex package.
5. Verify public responses, robots/sitemap, content hashes and browser interactions after deployment. Keep the prior Cloudflare version available for rollback.

The measurement gate requires at least 1× native pixels at the largest tested rendering; 2× remains the hero quality target. The generated portrait hero is a native 1024-pixel-wide image, not a claimed 2× master at every desktop width. Physical-device checks and application transactions are separate from this marketing-site release.

## Canonical HTTPS follow-up

Live verification found that HTTP served the marketing page without redirecting. The existing `get4dk-www-redirect` worker now also has the route `http://get4dk.com/*`; its existing 308 redirect preserves path and query. HTTPS static hosting, application and beta hosts are unchanged. Cloudflare documents scheme-specific matching at https://developers.cloudflare.com/workers/configuration/routing/routes/.

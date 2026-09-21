# Haciensus Field Notes

The deployed blog is intentionally dependency-free and lives in `blog/site/`.
Drafts and editorial source material live in `blog/content/` and are never
included in the Cloudflare Pages upload.

## Publishing a note

1. Copy `article-template.md` into `blog/content/posts/<slug>.md`.
2. Keep `status: draft` while researching, reviewing, and fact-checking.
3. Create the public page at `blog/site/notes/<slug>/index.html` only after the
   note is approved for publication.
4. Reuse the header, footer, metadata, and `.article-shell`, `.article-header`,
   `.article-meta`, and `.prose` classes already defined in `styles.css`.
5. Add the canonical URL to `blog/site/sitemap.xml` and verify metadata, links,
   keyboard navigation, and mobile layout before merging.

Do not copy private research, interview material, or internal notes into
`blog/site/`. A draft is not public merely because it is promising.

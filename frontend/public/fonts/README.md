# Brand font — Google Sans

The product uses **Google Sans** everywhere (landing, app, blog, portals). Google
Sans is Google's proprietary brand typeface and is **not redistributable**, so the
font files are intentionally **not committed** to this repo.

To enable it, drop the licensed WOFF2 files here with these exact names:

```
public/fonts/GoogleSans-Regular.woff2   (weight 400)
public/fonts/GoogleSans-Medium.woff2    (weight 500)
public/fonts/GoogleSans-Bold.woff2      (weight 700)
```

They are referenced by `@font-face` in `src/styles.scss` and served from
`/fonts/…` by Vite / nginx. No code change is needed once the files are present —
hard-refresh and Google Sans renders.

## Until the files exist

Every font declaration falls back gracefully:

```
"Google Sans", "Google Sans Text", "Product Sans", "IBM Plex Sans", system-ui, …
```

so the app renders in **IBM Plex Sans** (already loaded) with no broken text and no
console errors beyond a benign 404 for the missing woff2 (which `font-display: swap`
handles).

## Licensing note / libre substitute

If a licensed Google Sans is unavailable, a visually close, freely-licensed
substitute can be dropped in under the same filenames (e.g. **Inter** or
**Product Sans**-alike). Tell the maintainers which substitute is in use.

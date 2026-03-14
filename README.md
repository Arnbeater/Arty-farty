# Arty-farty

A browser-based **Dithering Bitmap Creator** that turns uploaded photos/graphics into stylized bitmap art on a single canvas.

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Deploy to GitHub Pages (with workflow)

This repo includes `.github/workflows/deploy-pages.yml` so the app can be published automatically.

1. Push to `main` (or `master`) to trigger deployment.
2. In GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. After workflow completion, your app is live at:
   - `https://<your-username>.github.io/<repo-name>/`

## Features

- Upload any reference image (photo, illustration, graphic).
- Dither algorithms: Floyd–Steinberg, ordered Bayer 4×4, or threshold.
- Adjustable bitmap size, contrast, brightness, threshold, and grain/noise.
- Ink/paper color controls for custom monochrome palettes.
- One-canvas live preview with PNG export.

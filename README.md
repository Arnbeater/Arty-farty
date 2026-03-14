# Arty-farty

A browser-based art playground with **two modes on one canvas**:

1. **Dithering Bitmap Creator** for converting uploaded reference images into stylized bitmap art.
2. **Funky Animation Mode** for live generative particle visuals.

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

- Single shared canvas for both modes (starts in animation mode so motion is visible immediately).
- Upload any reference image (photo, illustration, graphic) in dithering mode.
- Dither algorithms: Floyd–Steinberg, ordered Bayer 4×4, or threshold.
- Adjustable bitmap size, contrast, brightness, threshold, grain/noise, and invert toggle.
- Ink/paper color controls for custom monochrome palettes.
- Animation controls for particle count, speed, drift/warp, trails, glow, and palette shuffle.
- PNG export of the current canvas output.

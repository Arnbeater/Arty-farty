# Arty-farty

A tiny web app that generates funky JavaScript-powered particle animations and ASCII art from image references.

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

- Animated generative particle artwork on an HTML canvas.
- Live controls for particle count, warp amount, and glow intensity.
- ASCII converter: upload an image reference, tune detail, generate text art, and copy the result.
- Palette shuffler for instant visual remixes.

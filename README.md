# Val Dranov - Portfolio

A static portfolio site with live, interactive product demos. No build step, no dependencies.

## Structure

- `index.html` - portfolio hub
- `projects/jobflow/index.html` - JobFlow case study (embeds the live demo)
- `projects/jobflow/app.html` - the JobFlow demo app itself (open directly for full screen, works great on a phone)
- `projects/jobflow-consulting/index.html` - JobFlow Consulting case study (automation practice, simulated acquisition-engine console)
- `css/site.css`, `js/site.js` - shared design system and behavior
- `assets/fonts` - self-hosted Outfit and JetBrains Mono
- `assets/icons` - Phosphor icon sources (compiled into `projects/jobflow/icons.js`)

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to GitHub Pages

Push this folder to a repository, then Settings > Pages > deploy from branch (`main`, root). The `.nojekyll` file is already in place.

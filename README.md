# RoadNetra

A frontend-only civic-tech prototype for reporting road damage. It uses plain HTML, CSS, JavaScript, and browser localStorage—no installation or backend required.

## Run locally

First extract the entire `RoadNetra-source.zip` folder. Then open `RoadNetra/index.html` in any modern web browser. Do not open an HTML file from inside the ZIP or move it away from the `css` and `js` folders; the pages use relative links to those shared files. Start with **Report Damage**, then use the generated complaint ID on **Track**. Reports remain in that browser until its site data is cleared. The Dashboard has a **Reset demo data** option.

## Pages

- `index.html` — landing page and live summary
- `report.html` — damage reporting form with photo preview
- `complaints.html` — searchable reports with status progression controls
- `track.html` — complaint ID tracker
- `dashboard.html` — report statistics

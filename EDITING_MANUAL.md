# Fiscal Lens — personal editing manual

## 1. Open the frontend
Extract the complete ZIP into one folder. Open `index.html` in a browser. No npm installation, internet connection, backend, or font download is needed. Keep all CSS and JavaScript files beside the HTML. After editing in VS Code, save and refresh the browser (Ctrl+Shift+R if styles appear cached).

## 2. File map

| File | Responsibility | Useful search term |
| --- | --- | --- |
| index.html | Page content, navigation, sections, chart/table containers | OVERVIEW, TRACKER, OUTPUTS, BENCHMARKS |
| base.css | Palette, fonts, spacing, focus, motion preferences | :root |
| layout.css | Sidebar, golden-ratio grids, mobile stacking | GOLDEN SPLIT, MOBILE |
| components.css | Buttons, cards, inputs, chart, table, walkthrough | Feature headings in comments |
| styles.css | Main stylesheet importing the three CSS layers | CANONICAL |
| style.css | Compatibility alias for older singular filename | LEGACY |
| data.js | Eight input definitions, historical rows, forecast outputs | FEATURES, HISTORY, PREDICTIONS |
| app.js | Legend, chart, source table, cards, walkthrough, active navigation | renderChart, renderValues, renderCards, STEPS |

Only `styles.css` is linked by the page. You may leave `style.css` in the folder; it is not loaded. Do not link both stylesheets. JavaScript loads `data.js` before `app.js` with `defer`. Do not change that order.

## 3. Design rules you can reuse
The golden ratio is a layout guide, not a requirement for every element. The hero and process panel allocate 1.618 parts to the main content and 1 part to supporting content, approximately 61.8% to 38.2% after subtracting the gap. The tracker reverses the order so controls occupy the smaller column. Equal-size cards use equal columns because they have equal importance.

Shared spacing tokens use 8, 13, 21, 34, 55 and 89 pixels. The denser page uses 44px between desktop sections, 34px on mobile, and 21px within panels. Adjust these in layout.css without changing the golden-ratio column proportions. Body text is 17px with a line height of 1.5; headings use tighter line heights. Typography is deliberately not scaled by 1.618 at every level, which would make dashboard labels too large or too small.

| Token | Default | Use |
| --- | --- | --- |
| --bg | #292b36 | Main slate background |
| --surface | #333643 | Raised panels |
| --surface-deep | #22242e | Navigation and inset areas |
| --text | #f3f4f7 | Main text |
| --muted | #bdc1d1 | Supporting text |
| --line | #4a4e60 | Borders and chart grid |
| --yellow | #f2ce63 | Main action, selected navigation, output emphasis |
| --blue | #97beff | Market context |
| --purple | #c0a5f5 | Advisor context |
| --radius | 16px | Standard panel corners |

Keep most of the page neutral. Yellow and purple offer complementary contrast; blue bridges the palette. Avoid coloring every panel. Keep readable light text on dark panels and dark text on yellow buttons. Chart series colors live separately in `FEATURES` so each input remains identifiable.

## 4. Common personal edits

### Rename the app or change its wording
In `index.html`, edit the title, `.brand`, hero text, headings and footer. Edit visible text without removing IDs: JavaScript uses IDs to locate containers. Change module descriptions in the HTML, but workflow descriptions in `STEPS` in `app.js`.

### Change the palette
Edit the variables in `base.css`. For a quick experiment, add overrides after the imports in `styles.css`:

```css
:root {
  --yellow: #ffdc7c;
  --purple: #cbb3ff;
}
```

Chart grid and axis text read the CSS tokens during rendering. Refresh after changing tokens. Change series colors in `data.js`, not in the SVG output.

### Adjust widths and spacing
In `layout.css`, `.main` sets maximum content width and outer padding. `.shell` controls navigation width. `.hero-banner`, `.workspace`, and `.process-grid` control ratios. Use `minmax(0, ...)` to keep wide chart/table content from forcing the page wider than the screen.

```css
/* More space for chart results, if your controls become shorter. */
.workspace {
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}
```

At 1150px and below, the tracker stacks. At 800px and below, navigation moves above the page and cards stack. At 480px and below, module links and legend stack. The quick-access panel hides on small screens; essential information remains in the main copy and workflow.

### Change default chart lines or date window
Edit `const selected` in `app.js` with keys from `FEATURES`. The initial selection is forecast crude, USD/PKR and current levy. Legend checkboxes derive their initial state from this set. Edit the `window` select in HTML to add an observation count; `0` means all rows. Add `selected` to an option to change the default window. Counts represent rows, not calendar months.

### Add a new historical input
1. Add an object to `FEATURES` with a unique `key`, readable `label`, accurate `unit`, and light-on-dark `color`.
2. Add a finite numeric value under that exact key to every row of `HISTORY`.
3. Optionally add the key to `selected` for default visibility.
4. Refresh. The legend, chart and raw-values table update automatically.

```js
// Shape example only: add actual values to every historical row before enabling.
{ key: 'new_input', label: 'New input', unit: 'Your unit', color: '#a9caff' }
```

Keep `HISTORY` ordered oldest to newest, with consistent date strings. Do not join daily and monthly datasets by row position: align dates first. A zero starting value cannot be indexed and is omitted from the chart, while raw values remain available in the table. An all-unchecked selection displays an empty-state message.

The chart uses `100 + (value - baseline) / abs(baseline) * 100`. This supports negative fiscal-gap baselines. It compares relative movement, not original magnitudes. Use “Inspect source values” for original units. SVG point titles expose original values on mouse hover; the table is the accessible alternative on touch or keyboard.

### Connect forecast results
No forecasting, regression-tree fitting, or price calculation runs in this page. `PREDICTIONS` contains historical references and null forecasts. Replace each `forecast: null` with a real finite numeric output and `targetDate: null` with its target date, then refresh. Do not put numbers in quotes. Use `null` to represent unavailable outputs; a real zero remains valid.

Each prediction entry requires `label`, `unit`, `current`, `date`, `source`, `forecast`, and `targetDate`. Add a new object to add a new card. For four equally weighted cards, change the `.cards` desktop grid to `repeat(4,minmax(0,1fr))`, then review medium-screen readability.

For future API integration, serve the site over HTTP and fetch JSON from your own backend. Validate all fields, show loading/error states, assign the validated array to `PREDICTIONS`, then call `renderCards()`. A browser cannot run a Windows C++ executable directly. The current frontend has no API endpoint or submit controls that pretend to run models.

### Edit or extend the walkthrough
Add/edit objects in `STEPS` in `app.js`. Each needs `title`, `copy`, and `visual`. Buttons are created automatically. `showStep()` updates the panel and `aria-pressed` state. Keep conceptual explanations distinct from actual model traces.

For a real tree path, export feature name, input value, threshold, chosen branch and final leaf output. Replace the `decision-path` placeholder with a list rendered using `textContent`. Do not insert raw backend strings with `innerHTML`. The advisor uses regression-tree SSE, not Gini classification impurity.

### Add a new page section
Duplicate a section in HTML, give it a unique ID, then add a `.nav` anchor with a matching `href`. Active navigation discovers links automatically. Preserve the existing section IDs if you want old bookmarks to work. Reuse `.section`, `.section-head`, `.panel` and `.eyebrow` so the new feature fits the same design.

### Add benchmark results
Replace the table dashes only with actual measured timings. Include the data size, machine, run count and timing unit. Both compared methods should use identical inputs. Current complexity estimates assume dense AR solving and prefix-sum scoring after sorting for best-split search; confirm they match your C++ implementation.

## 5. Existing data limitations
The numerical dataset and historical references are retained from the supplied data.js; only series colors changed. Forecast-crude history is a dataset field, not a fresh model output. Affordability values use the supplied dataset scale rather than an invented 0–1 slider. The latest training `current_levy` and the separate petroleum-levy reference have different definitions: the supplied notes identify 83 versus 78 petroleum levy plus 5 carbon levy. Confirm the target definition before combining price components. References show their own dates and sources. The original UI's example forecasts, decision branches and benchmark timings were removed because they were not connected to a model.

## 6. Check edits before sharing
- Open index.html and confirm no console errors or missing files.
- Toggle individual inputs, then all off and back on; inspect the raw table.
- Switch every observation window and workflow stage.
- Use Tab and Enter to reach navigation, controls, details and buttons.
- Test at approximately 390px, 768px and 1440px widths and at 200% zoom.
- The chart and tables may scroll within their panels; the whole page should not scroll sideways.
- Confirm unavailable outputs still show dashes and actual zero outputs show 0.
- If the page is blank, check script order and spelling of element IDs. If styles disappear, check all CSS files are together and the imports have not been moved below ordinary CSS rules.

## Compact layout revision
The palette now uses cooler blue-violet greys. Controls and supporting text are larger, section gaps are smaller, and the chart uses a 1000 × 520 viewBox with larger labels. Its geometry in app.js is left=76, top=24, width=890, height=430; date labels sit at y=495. Keep the SVG viewBox and these coordinates in sync. Short page labels replace decorative taglines; code comments and this manual retain editing guidance.

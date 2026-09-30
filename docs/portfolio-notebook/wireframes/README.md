# Recovered portfolio-first notebook preview

Open `index.html` or `contact-sheet.html`. The six screens use local assets and need no application build or network connection.

This is the existing Impeccable-refined public design. Its source folder disappeared from the project mirror during the specification task on 30 September 2026. The HTML-generation source, CSS, JavaScript, capture procedure, and contact-sheet source were recovered from this task's recorded work. Existing public assets and licenses were restored from their recorded locations. Screenshots were then recreated; the files are not claimed to be byte-identical to the lost captures. No new screen design, portfolio claim, or imagery was introduced.

## Screens

- `index.html`: portfolio-first Home.
- `projects.html`: project index.
- `project.html`: project/case-study template.
- `writing.html`: writing index.
- `article.html`: reading template.
- `about.html`: biography/contact placeholders.
- `screens/`: twelve desktop/mobile captures, 1440 px and 390 px wide.
- `contact-sheet.html`: clickable screenshot gallery.
- `contact-sheet.png`: full-size contact sheet, with a common 50% scale for all captures.
- `contact-sheet-overview.png`: smaller contact sheet for inline display.
- `verification.json`: refreshed checks at 1440, 768, and 390 px plus navigation checks.

The preview contains deliberate placeholders, not factual projects, articles, results, biography, or contact destinations. No AI-generated images or pretend project screenshots are used. The newer publishing dashboard and thumbnail-editor screens are still design work in PF-01.

## Open-source assets

- Rough Notation 0.5.1, MIT: [project](https://roughnotation.com/). Actual library retained as `vendor/rough-notation.js`.
- Lucide 0.468.0, ISC/MIT notices: [project](https://lucide.dev/). Actual library retained as `vendor/lucide.js`.
- Patrick Hand, SIL Open Font License 1.1: [font source](https://github.com/google/fonts/tree/main/ofl/patrickhand). Local font and OFL retained in `vendor/`.
- Native semantic HTML and CSS; system body font. Notebook color and margin are CSS, not image assets.

## Verification and regeneration

Read the actual results in `verification.json` and the package-level verification document. The tests concern static design files only, not authentication, storage, upload, publishing, or a complete accessibility audit.

The recovered capture procedure checks each page at the original three widths. This environment could not take full-page screenshots using its usual browser option, so each captured page used a viewport expanded to its measured content height. The stylesheet has no viewport-height-dependent layout; the same width and complete page content are retained. No capture is cropped or stretched in the contact sheet.

Regenerate the static HTML with `python3 build-preview.py`. Regenerate the contact sheet after capturing screens with `python3 make-contact-sheet.py`; it uses Pillow and the local Noto Sans font. These utilities produce design artifacts and do not implement a SvelteKit website.

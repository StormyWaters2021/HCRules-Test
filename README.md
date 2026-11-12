# HeroClix Interactive Rules — unified symbol-reference build

## Install / deploy

This is a complete static site, not a patch. Extract the contents of the ZIP into the root of your GitHub Pages repository, replacing existing files. `index.html` belongs directly in the root. Commit and push to the branch configured in Settings > Pages (typically `main`, `/(root)`). No build step or server software is needed.

## Changes

- Shared `symbols.json` registry maps each semantic symbol ID to one artwork asset and references to existing rules. Popups retrieve the rule content from `data.json`; they do **not** contain duplicate rule descriptions.
- Rule text can contain inline tokens such as `[[Improved Movement]]`, `[[Movement: Elevated]]`, or `[[Targeting: Adjacent]]`. The token renderer creates an inline, accessible button at exactly that position in the text.
- Standard power and PAC category icons, improved-ability icons and the existing PDF-extracted inline icons point into the same reference system.
- Great Size and Giant Reach symbol popups link to source definitions and to Comprehensive Rule 21.2b. Tiny Size also links to 21.2b.
- Bullet rules render as structured `<ul><li>` lists. The list content is taken from the existing extracted rules, rather than reworded.
- Effective dates, navigation history, breadcrumbs and white-circle black combat symbols in PAC group headers from the previous update are included.
- PAC reverse-side terrain expands from the comprehensive rule entries without separate copies.

## Editing the rule data

For rule prose that contains an inline icon, put `[[symbol-id]]` inside `inlineContent` or in a `displayBlocks[].items[]` string. Define the symbol once in `symbols.json` with its image and rule references. Keep `text` as original extracted source text. Tokens should be added only at positions supported by the printed source.

`references` support `{ "type": "rule", "id": "21.2b" }`, `{ "type": "back", "back": "back-2", "entry": "Great Size" }`, and `{ "type": "improved", "back": "back-1", "entry": "Improved Movement Elevated" }`. Definitions are always looked up by these IDs at runtime.

## Validation and limitations

- 544 comprehensive-rule entries retained; 48 main PAC powers retained.
- 141 symbol identifiers, all corresponding artwork paths present, and token references validated.
- 31 rule entries with original bullet markers now have structured lists.
- Original text-source omission in 27.7e, the phrase beginning `Adjacent. Lines of fire drawn ...`, restored from the supplied comprehensive PDF.
- JavaScript syntax passes `node --check`.
- Chromium DOM interaction checks were run at 390px and 1280px with locally injected static data. Search, PAC navigation, Great Size references, three bullets in 21.2b, and Flight icons passed with no page-script errors. Full HTTP deployment/browser visual audit and complete word-for-word/PDF symbol certification have **not** been performed.
- Existing source-dependent layout artifacts outside the audited entries may remain. The printed PDFs remain the authority for exact wording and symbols; PDFs are not shipped with the site.

## Source versions

- Comprehensive Rules: July 1, 2026
- Powers and Abilities Card: October 3, 2022 (from the supplied PDF filename)

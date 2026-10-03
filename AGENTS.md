# Repository guidance

Before implementation or review work, follow the canonical [JST Stack engineering roadmap](https://github.com/jst-stack/jst/blob/main/docs/ECOSYSTEM_ROADMAP.md). Keep policy normalization independent from ESLint traversal, make every convention configurable through the public policy API, and add the smallest adversarial test that proves each rule cannot be bypassed. Run `npm run check` before delivery.

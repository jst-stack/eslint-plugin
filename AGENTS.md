# Repository guidance

Before implementation or review work, follow the public [JST architecture contract](https://github.com/jst-stack/jst/blob/main/skills/frontend-architecture/SKILL.md) and organization [governance](https://github.com/jst-stack/.github/blob/main/GOVERNANCE.md). Keep policy normalization independent from ESLint traversal, make every convention configurable through the public policy API, and add the smallest adversarial test that proves each rule cannot be bypassed. Run `npm run check` before delivery.

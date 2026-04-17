# cypress-visual-eval

[![NPM Version](https://img.shields.io/npm/v/cypress-visual-eval?style=flat-square&color=blue)](https://www.npmjs.com/package/cypress-visual-eval)

AI-powered visual regression testing for Cypress. Takes a screenshot, compares it to a baseline using pixel diffing, and — only when a difference is detected — uses a vision AI model to decide whether the difference is a real bug or acceptable variance.

> This project is in active development. Expect iteration, API refinement, and workflow changes as the plugin matures.

The AI acts as a fallback filter, not a primary gate. If images are identical, the test passes immediately with no API call. If a pixel diff is detected, the AI receives the baseline, the current screenshot, and the diff image, and returns a pass/fail decision with a human-readable reason. This means rendering noise and minor positional shifts no longer fail your build, while actual regressions — broken text, missing elements, wrong colors — still do.

---

## How it works

1. `cy.visualTest('name')` takes a screenshot of the current state
2. It's compared against a stored baseline using [pixelmatch](https://github.com/mapbox/pixelmatch)
3. **If the diff is zero — pass immediately.** No AI call, no cost.
4. **If a diff is detected** — the baseline, screenshot, and diff image are sent to a vision AI model
5. The AI returns `{ pass: boolean, reason: string }`
6. The test passes or fails based on that decision

---

## Installation

```bash
npm install -D cypress-visual-eval
```

This plugin expects Cypress `15.10+`.

---

## Setup

### 1. Register the plugin

In `cypress.config.js`:

```js
import { visualEvalPlugin } from 'cypress-visual-eval'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      visualEvalPlugin(on, config, {
        provider: 'claude',          // 'claude' | 'openai' | 'gemini'
        baselineDir: 'cypress/baseline', // optional, this is the default
        promptPath: 'cypress/prompts/visual-eval.md', // optional custom prompt file
      })
    }
  }
})
```

### 2. Import the command

In `cypress/support/e2e.js`:

```js
import 'cypress-visual-eval/commands'
```

TypeScript users get the `cy.visualTest(...)` command typing from that import automatically. No extra `declare global` block is needed.

The command runtime uses `Cypress.expose()` for flags such as baseline generation and AI-disable mode.

### 3. Add your API key

For local development, add to `cypress.env.json` (this file should be in `.gitignore`):

```json
{
  "AI_VISUAL_API_KEY": "your-api-key-here"
}
```

For CI, set it as an environment variable in your pipeline.

The plugin resolves credentials in this order:

- `apiKey` passed directly to `visualEvalPlugin(...)`
- `AI_VISUAL_API_KEY` from Cypress env (for example, from `cypress.env.json`)
- `AI_VISUAL_API_KEY` from the process environment
- provider-specific process env var (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`)
- throws a clear error if none are set

---

## Usage

```js
it('renders the checkout page correctly', () => {
  cy.visit('/checkout')
  cy.get('[data-cy=summary]').should('be.visible')
  cy.visualTest('checkout-page')
})
```

You can pass one flat options object as the second argument to `cy.visualTest(...)`.

`pixelDiffThreshold`

- Optional
- Default: `0`
- This is the plugin's own threshold for how many changed pixels are allowed before the test fails or falls back to AI

```js
cy.visualTest('checkout-page', {
  pixelDiffThreshold: 8,
})
```

Cypress screenshot options

- Optional
- Any standard [`cy.screenshot()` options](https://docs.cypress.io/api/commands/screenshot) can be passed in the same object

```js
cy.visualTest('hero-mobile', {
  capture: 'viewport',
})

cy.visualTest('hero-clip', {
  clip: { x: 0, y: 0, width: 400, height: 300 },
  blackout: ['[data-cy=clock]'],
})
```

`pixelmatch` options

- Optional
- Supported [`pixelmatch` options](https://github.com/mapbox/pixelmatch#api):
  - `threshold`
  - `includeAA`
  - `alpha`
  - `aaColor`
  - `diffColor`
  - `diffColorAlt`
  - `diffMask`

```js
cy.visualTest('checkout-page', {
  threshold: 0.2,
  includeAA: true,
  diffMask: true,
  diffColor: [0, 255, 0],
})
```

Combining options

```js
cy.visualTest('checkout-page', {
  pixelDiffThreshold: 8,
  capture: 'viewport',
  clip: { x: 0, y: 0, width: 400, height: 300 },
  threshold: 0.2,
  includeAA: true,
  diffMask: true,
})
```

`overwrite` is always forced to `true` so repeated runs keep writing to deterministic screenshot paths.

Plugin setup can also define global defaults for `pixelDiffThreshold` and any supported `pixelmatch` options. Per-test command options override those defaults for that run.

---

## Recommended scripts

Add these to your consumer project's `package.json`:

```json
"scripts": {
  "cy": "cypress run",
  "cy:open": "cypress open",
  "cy:generate-base": "cypress run -x GENERATE_BASELINE=TRUE",
  "cy:no-ai": "cypress run -x VISUAL_EVAL_AI_DISABLED=TRUE"
}
```

- `cy:generate-base` — run once after intentional UI changes to update baseline images
- `cy:no-ai` — run with pixel diff only, AI fallback disabled. Useful for fast local checks or when you want deterministic results only.

---

## Providers

| Provider | Default model | Env variable |
|----------|--------------|--------------|
| `claude` | claude-sonnet-4-6 | `AI_VISUAL_API_KEY` or `ANTHROPIC_API_KEY` |
| `openai` | gpt-4o | `AI_VISUAL_API_KEY` or `OPENAI_API_KEY` |
| `gemini` | gemini-2.0-flash | `AI_VISUAL_API_KEY` or `GEMINI_API_KEY` |

Each provider SDK is an optional peer dependency — install only what you need:

```bash
npm install -D @anthropic-ai/sdk      # claude
npm install -D openai                 # openai
npm install -D @google/genai          # gemini
```

You can override the model in plugin setup:

```js
visualEvalPlugin(on, config, {
  provider: 'claude',
  model: 'claude-opus-4-20250514',
})
```

### Custom prompts

By default, the plugin uses its built-in visual evaluation guidance. If you want to customize the AI reviewer, pass a `promptPath` that points to a `.md` or `.txt` file in plugin setup:

```js
import { defineConfig } from 'cypress'
import { visualEvalPlugin } from 'cypress-visual-eval'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      visualEvalPlugin(on, config, {
        provider: 'openai',
        promptPath: 'cypress/prompts/checkout-review.md',
      })
    }
  }
})
```

How `promptPath` works:

- Supports `.md` and `.txt` files only
- Relative paths resolve from the Cypress project root
- Absolute paths are also supported
- If `promptPath` is omitted, the built-in default prompt is used
- If the file is missing, unreadable, or uses the wrong extension, plugin setup fails immediately with a clear error

When you provide a custom prompt file, its contents replace the plugin's built-in evaluation guidance. The plugin still appends:

- the fixed image contract describing the BASELINE, COMPARE, and DIFF images
- the JSON-only response rules required for parsing

This means your custom prompt should focus on evaluation criteria, priorities, and review style, not on output formatting.

Example `cypress/prompts/checkout-review.md`:

```md
Review this UI diff like a strict product designer.

Fail when:
- typography or spacing changes are visible
- primary actions shift position or change emphasis
- icons, logos, or illustrations are missing or distorted
- content looks clipped, wrapped badly, or visually unbalanced

Pass only when the difference is clearly harmless rendering noise.

Prefer failing when the change might be user-noticeable.
```

Recommended prompt authoring tips:

- Describe what kinds of regressions matter most for your product
- Explain when the model should be strict versus lenient
- Keep the instructions focused on visual judgment
- Do not include JSON schema or formatting instructions, because the plugin adds those automatically

### Custom provider

Pass your own class instance instead of a provider name:

```js
import { visualEvalPlugin } from 'cypress-visual-eval'
import { MyCustomProvider } from './myCustomProvider'

visualEvalPlugin(on, config, {
  provider: new MyCustomProvider(),
})
```

Custom provider instances are supported only in `visualEvalPlugin(...)`.

The interface your class must implement:

```ts
interface VisualEvalProvider {
  compare(
    baselineBase64: string,
    screenshotBase64: string,
    diffBase64?: string,  // only present when pixel diff > 0
  ): Promise<{ pass: boolean; reason: string }>
}
```

---

## Security

- Never commit `cypress.env.json` — add it to `.gitignore`
- Never put API keys in `cypress.config.js`
- In CI, always use secrets/environment variables

Suggested `.gitignore` additions:

```
cypress.env.json
```

Baseline images (`cypress/baseline/`) should generally be committed to git — this ensures the whole team and CI share the same reference images. If you choose not to commit them, every environment will need to generate its own baselines before running tests.

---

## Credits

Pixel comparison is powered by [pixelmatch](https://github.com/mapbox/pixelmatch) by Mapbox. PNG image loading and writing is handled by [pngjs](https://github.com/pngjs/pngjs).

---

## Contributing

```bash
git clone https://github.com/alex-berk/cypress-visual-eval.git
cd cypress-visual-eval
npm install
npm run build:watch
```

Mutation testing is configured with Stryker and the Vitest runner:

```bash
npm run test:coverage
npm run test:mutation:dry-run
npm run test:mutation
```

Vitest coverage reports are written to `coverage/`.
Stryker mutation reports are written to `reports/mutation/`.

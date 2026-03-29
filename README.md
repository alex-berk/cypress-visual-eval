# cypress-visual-eval
[![npm](https://img.shields.io/npm/v/cypress-visual-eval)](https://www.npmjs.com/package/cypress-visual-eval)

AI-powered visual regression testing for Cypress. Takes a screenshot, compares it to a baseline using pixel diffing, and — only when a difference is detected — uses a vision AI model to decide whether the difference is a real bug or acceptable variance.

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

### 3. Add your API key

For local development, add to `cypress.env.json` (this file should be in `.gitignore`):

```json
{
  "AI_VISUAL_API_KEY": "your-api-key-here"
}
```

For CI, set it as an environment variable in your pipeline.

The plugin resolves credentials in this order: `AI_VISUAL_API_KEY` env var → provider-specific env var (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`) → `cypress.env.json` → throws a clear error.

---

## Usage

```js
it('renders the checkout page correctly', () => {
  cy.visit('/checkout')
  cy.get('[data-cy=summary]').should('be.visible')
  cy.visualTest('checkout-page')
})
```

You can pass any standard Cypress screenshot options as the second argument:

```js
cy.visualTest('hero-mobile', { viewport: { width: 375, height: 812 } })
cy.visualTest('hero-clip', { clip: { x: 0, y: 0, width: 400, height: 300 } })
```

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

You can override the model:

```js
visualEvalPlugin(on, config, {
  provider: 'claude',
  model: 'claude-opus-4-20250514',
})
```

### Custom provider

Pass your own class instance instead of a provider name:

```js
import { visualEvalPlugin } from 'cypress-visual-eval'
import { MyCustomProvider } from './myCustomProvider'

visualEvalPlugin(on, config, {
  provider: new MyCustomProvider(),
})
```

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

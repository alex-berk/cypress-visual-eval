# cypress-visual-eval

AI-powered visual regression testing for Cypress. Takes a screenshot, compares it to a baseline, and uses a vision AI model to decide whether the difference is a bug or acceptable variance.

Unlike pixel-diff tools that fail on every anti-aliasing change or font rendering difference, `cypress-visual-eval` understands context — a button 3px lower is fine, garbled text or a missing element is not.

---

## How it works

1. `cy.visualTest('name')` takes a screenshot of the current state
2. It's compared against a stored baseline image using pixel diffing
3. Both images plus the diff are sent to a vision AI model
4. The AI returns a pass/fail decision with a human-readable reason
5. The test passes or fails based on that decision

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
import { setupVisualEval } from 'cypress-visual-eval'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      setupVisualEval(on, config, {
        provider: 'claude',         // 'claude' | 'openai' | 'gemini'
        baselineDir: 'cypress/visual-baselines', // optional, this is the default
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

For CI, set it as an environment variable in your pipeline:

```bash
# GitHub Actions, GitLab CI, etc.
AI_VISUAL_API_KEY=your-api-key-here
```

The plugin resolves credentials in this order: environment variable → `cypress.env.json` → throws a clear error.

---

## Usage

```js
it('renders the homepage correctly', () => {
  cy.visit('/')
  cy.get('[data-cy=hero]').should('be.visible')
  cy.visualTest('homepage-hero')
})
```

You can pass any standard Cypress screenshot options as the second argument:

```js
cy.visualTest('hero-mobile', { viewport: { width: 375, height: 812 } })
cy.visualTest('hero-clip', { clip: { x: 0, y: 0, width: 400, height: 300 } })
```

---

## Updating baselines

When you make intentional UI changes, run with the update flag to regenerate baselines:

```bash
CYPRESS_UPDATE_BASELINE=true cypress run
```

Baselines are stored as PNG files in `baselineDir` and should be committed to git so the whole team shares the same reference images.

---

## Providers

| Provider | Model | Environment variable |
|----------|-------|----------------------|
| `claude` | claude-sonnet-4 | `AI_VISUAL_API_KEY` or `ANTHROPIC_API_KEY` |
| `openai` | gpt-4o | `AI_VISUAL_API_KEY` or `OPENAI_API_KEY` |
| `gemini` | gemini-1.5-pro | `AI_VISUAL_API_KEY` or `GEMINI_API_KEY` |

You can override the model per-provider:

```js
setupVisualEval(on, config, {
  provider: 'claude',
  model: 'claude-opus-4-20250514',
})
```

### Custom provider

You can bring your own provider by passing a class that implements the `compare` method:

```js
import { setupVisualEval } from 'cypress-visual-eval'
import { MyCustomProvider } from './myCustomProvider'

setupVisualEval(on, config, {
  provider: MyCustomProvider,
})
```

The interface your class must implement:

```ts
interface VisualEvalProvider {
  compare(
    baseline: string,    // base64 PNG
    screenshot: string,  // base64 PNG
    diff: string,        // base64 PNG
  ): Promise<{ pass: boolean; reason: string }>
}
```

---

## Security

- Never commit `cypress.env.json` — add it to `.gitignore`
- Never put API keys in `cypress.config.js`
- In CI, always use secrets/environment variables, never hardcoded values

A `.gitignore` snippet to add to your project:

```
cypress.env.json
cypress/visual-baselines/*.png   # optional — see below
```

Whether to commit baseline images is a team decision. Committing them means everyone shares the same reference and CI has access without extra setup. Not committing them means baselines are local only and each environment generates its own.

---

## Contributing

```bash
git clone https://github.com/alex-berk/cypress-visual-eval.git
cd cypress-visual-eval
npm install
npm run dev    # watch mode — rebuilds on save
```

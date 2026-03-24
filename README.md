# cypress-visual-eval

AI-powered visual regression evaluation for Cypress.

## Overview

`cypress-visual-eval` is a testing utility that brings semantic understanding to visual regression testing. Instead of relying solely on pixel-by-pixel comparisons, it evaluates UI changes in context and determines whether they represent meaningful regressions or acceptable variations.

Traditional visual testing tools are often too sensitive—flagging minor layout shifts, anti-aliasing differences, or rendering inconsistencies as failures. This library takes a different approach by analyzing screenshots with the help of AI and making a higher-level decision: *is this change actually a bug?*

## Key Idea

Given two screenshots:

- a **baseline** (expected state)
- a **current** (new state)

the system evaluates the differences and classifies them based on intent and impact.

Examples:

- A button shifted a few pixels → acceptable
- Slight spacing differences → acceptable
- Text content changed → failure
- Missing or broken UI elements → failure

The goal is to reduce noise and make visual tests reflect real user-facing issues.

## How It Works

At a high level, the library:

1. Captures or receives a screenshot of the current UI
2. Compares it against a stored baseline image
3. Uses an AI-based evaluation layer to interpret the differences
4. Returns a structured result indicating whether the change is acceptable

## Use Cases

- Visual regression testing with reduced flakiness
- Detecting unintended UI/content changes
- Validating design consistency across deployments
- Replacing or augmenting pixel-diff tools

## Status

Early-stage project. APIs and behavior are subject to change as the evaluation model and integration approach evolve.


---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once the implementation passes tests, verify it end-to-end with Claude in Chrome if possible: invoke the claude-in-chrome skill, start the app's dev server, and exercise the new behavior in the browser exactly as an end user would. Be picky about the UI - fix anything that looks off. Skip this step only when the work has no user-facing surface (pure backend/library code) or the browser tools are unavailable, and say so explicitly in your summary.

Once done, use /code-review to review the work.

Commit your work to the current branch.

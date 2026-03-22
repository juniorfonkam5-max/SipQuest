---
description: Whenever something breaks (e.g., the 3D card flip animation gets stuck, or the dice roller outputs a wrong number) Run the debug workflow 
---

## Role
Act as a Senior QA and Debugging Engineer. I have encountered a bug in the app. Your goal is to methodically identify and fix this specific issue without breaking any existing, working functionality.

## Debugging Workflow & Constraints (MUST FOLLOW)

Analyze First: Before writing or editing any code, give me a 1-2 sentence explanation of what you believe is causing the error.


Small, Incremental Changes: Make small, incremental changes to the codebase. Do not refactor entire files or try to fix everything everywhere all at once. Write the absolute minimum amount of code required to resolve this specific bug.

Isolate the Fix: Do not alter any CSS, styling, animations, or unrelated logic unless it is the direct root cause of the bug.

Log it: If the data flow is unclear, add simple console.log statements so we can trace the issue together.

## Verification
After making your incremental fix, you must pause and explicitly ask me to test the app in the browser. Do not move on to any other tasks or write any further code until I verify that the fix works.
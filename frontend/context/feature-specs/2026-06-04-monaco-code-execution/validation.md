# Validation Criteria: Phase 4

## Success Criteria

1. **Mounting & Fallback**
   - Monaco editor mounts correctly when `activeBlockId` is a code block.
   - If Monaco fails to load, the UI safely falls back to a `<textarea>`.

2. **Code Execution**
   - "Run" executes the submitted code.
   - Displays correct terminal output and verdicts ('passed', 'failed', 'error').

3. **Socratic Hints**
   - Failing to pass the exercise correctly triggers a streaming hint in the lesson feed.
   - The hints increment/escalate based on the number of attempts (`codeAttempts`).

4. **Code Gating**
   - The "Continue" button remains disabled until `verdict = 'passed'` for the current code block.

5. **Code Roast**
   - Passing the code block makes the "🎭 Roast My Code" button appear.
   - Clicking the button streams a Socratic/persona roast into the UI without breaking surrounding layout.

# Contributing

Thanks for helping improve YouTube Inline Fullscreen!

## Development setup

1. Clone the repo
2. Install dependencies:

   ```bash
   npm install
   ```

3. Compile styles (see the README for watch mode):

   ```bash
   npm run sass
   ```

4. Load the extension into Chrome via the [Extensions page](chrome://extensions): enable **Developer Mode** and click **Load unpacked**.

## Code style

**Prettier is the single source of truth for formatting.**

- Run `npm run format` before committing.
- Do **not** hand-format code, and do not reformat files that are unrelated to your change.
- CI runs `npm run format:check` on every pull request — keep your diff clean so it's easy to review.

## Pull requests

Keep diffs focused: one logical change per PR, and only touch the lines that actually change. Avoid drive-by reformatting.

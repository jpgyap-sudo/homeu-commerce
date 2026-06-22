// Ambient module declarations for side-effect CSS imports (e.g. `import
// './globals.css'`). Next.js's own bundled types don't always cover plain
// (non-module) .css imports across every Next/TypeScript version pairing —
// this is the standard, safe way to satisfy the typechecker without
// affecting runtime behavior (Next's webpack/Turbopack loaders already
// handle the actual CSS regardless of this declaration).
declare module '*.css'

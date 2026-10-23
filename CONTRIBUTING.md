# Contributing to TOKENMAXX

Thanks for helping maxx the burn.

## Dev setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local state lives in `.data/store.json`. On Vercel the board uses an in-memory store (demo).

## Good first PRs

- Add a provider in `src/lib/providers.ts`
- Wire a real usage sync adapter (replace demo bumps in `src/lib/store.ts`)
- Improve dither board polish or accessibility
- Docs / translations

## Provider shape

```ts
{
  id: "my-tool",
  name: "My Tool",
  blurb: "One line on what usage we pull.",
  tint: "green", // green | blue | orange | red | pink | grey
  category: "ide", // hub | ide | subscription | api | agent | cli
  viaT3: false,   // true = included in T3 Code linkup
}
```

## Checks

```bash
npm run lint
npm run build
```

## License

By contributing you agree your work is MIT-licensed with the project.

# URnetwork Client Manager (Beta)

Web dashboard for managing URnetwork clients, providers, wallets, and network
statistics. Built with React 19, Vite, Tailwind CSS, and Chart.js.

## Development

Create an `.env` file and add `VITE_API_BASE=/api`, so the dev server proxies
API requests (see `vite.config.ts`).

```sh
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npm test         # node --test tests/*.test.mjs
```

## Branding

The UI follows the URnetwork design system defined in
[urnetwork/elements](https://github.com/urnetwork/elements). Design tokens
(colors, radii, shadows, fonts) live in `tailwind.config.js` and
`src/index.css`; chart colors in `src/theme/chartColors.ts`; per-country
location colors in `src/theme/locationColors.ts`.

**Fonts:** `src/assets/fonts/` contains licensed commercial fonts used across
URnetwork apps — ABC Gravity ([ABC Dinamo](https://abcdinamo.com/typefaces/gravity)),
PP Neue Bit and PP Neue Montreal ([Pangram Pangram](https://pangrampangram.com)).
Do not reuse them outside URnetwork projects.

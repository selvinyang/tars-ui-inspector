# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

### Local Figma OAuth

1. Create a Figma OAuth app with `file_content:read` and `current_user:read` scopes.
2. Add `http://localhost:3000/api/figma/callback` as an exact redirect URL.
3. Copy `.env.example` to `.env.local` and fill in the client ID and client secret.
4. Start the local app, select **从 Figma 导入**, connect Figma, then paste a URL for a specific Frame.

The Frame reader also provides a design-property inspection panel for text layers, including font family, weight, size, line height, letter spacing, color, relative position, and layer dimensions. Mixed text styles are identified separately instead of being presented as one uniform style.

After importing a Frame, use **属性检查** in the canvas toolbar to compare the Figma values with manually calibrated development values. The prototype calculates pixel deltas for typography, position, and dimensions in real time and can convert a confirmed mismatch into an issue. Development values are explicitly marked as manual until DOM/CSS collection is connected.

### Local development-page collector

After Figma properties are available, select **采集开发属性** and copy the generated script tag into the page being inspected. The local collector reads visible text elements only: computed typography, bounding boxes, the page URL, and viewport dimensions. It does not read form values, cookies, local storage, or network traffic. Refresh the development page, then select **检查连接并匹配** in Inspector. Text content is used as the primary match signal and relative position as the tie-breaker; unmatched layers remain editable manually.

For third-party or production websites whose HTML cannot be edited, load the unpacked Manifest V3 extension from [`chrome-extension`](./chrome-extension). Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select that folder. Copy the session ID shown by Inspector into the extension popup and capture the active page. The extension uses temporary `activeTab` access plus `chrome.scripting`; it has host permission only for the local Inspector endpoint.

The collector endpoint intentionally keeps only a small in-memory snapshot for local prototyping. It is disabled in the static GitHub Pages build and is not designed as a hosted collection service.

The client secret and access tokens never enter the browser JavaScript bundle. OAuth tokens are stored in local HttpOnly cookies. The GitHub Pages build intentionally disables Figma OAuth because static hosting cannot exchange authorization codes securely.

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

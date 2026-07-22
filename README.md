# StockBot Inventory

StockBot is a TypeScript inventory and tax workspace for a small business. It stores inventory, activity, expenses, tax settings, address-rate caches, and tax-update audit history in the server's D1 database. JSON import/export provides portable backups.

## Local development

Use Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Tax-rate sources

- California addresses use the public California CDTFA Tax Rate API.
- Streamlined Sales Tax quarterly files are linked in the Tax Center for participating-state verification.
- Other states can use the optional Avalara AvaTax address endpoint.

Copy `.env.example` to `.env.local` to enable Avalara:

```text
AVALARA_ACCOUNT_ID=your-account-id
AVALARA_LICENSE_KEY=your-license-key
AVALARA_ENVIRONMENT=production
```

Use `sandbox` for an Avalara sandbox account. Credentials stay on the server and are never returned to the browser or included in an exported StockBot backup.

Rate checks are previews. Manually edited state and local rates are protected, and selected address updates are saved with their source, check time, and audit entry. Recorded sales keep the rate used at the time of the transaction.

## Commands

```bash
npm run build
npm run lint
npm run dev
```

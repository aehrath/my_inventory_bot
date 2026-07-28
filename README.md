# StockBot Inventory

StockBot is a TypeScript inventory and tax workspace for a small business. It
uses Cloudflare D1, a serverless SQLite database, with indexed relational tables
for products, activity, expenses, purchase sources, and customers. Compact
nested settings remain JSON where extra tables would add overhead. JSON
import/export provides portable backups.

Existing installations migrate automatically from the original single-record
state snapshot. After migration, saves compare individual records and write only
the rows that changed.

## Expense imports

The Tax Center includes a categorized expense ledger and accepts CSV or JSON records. Every imported row must provide a stable unique key, such as an Amazon order ID, invoice ID, receipt ID, or bank transaction ID. StockBot normalizes key casing and whitespace, rejects keys already in the database, rejects duplicates within the same file, previews the result, and performs the duplicate check again when the user applies the import.

Supported CSV headers include:

```text
external_key, amazon_order_id, order_id, transaction_id, invoice_id,
receipt_id, purchase_source, source_key, vendor, merchant, date, amount,
category, personal, personal_use, note, description
```

A ready-to-fill CSV template can be downloaded from the expense ledger. JSON imports can be an array of expense objects or an object containing an `expenses` array.

Amazon Business order-history exports are detected automatically. Because those files can repeat one order across several item rows, StockBot groups rows by `Order ID`, imports one expense per order, uses `Order Net Total` once, carries over seller and title details, and derives an initial office-equipment or office-supplies category when the Amazon category data supports it.

During import review, assign a purchase source key such as `Amazon Business`
or `Amazon Personal`. StockBot suggests the Amazon Account Group when it is
available and saves the chosen source on every record for sorting and filtering.

Set `personal` (or `personal_use`) to `true`, `yes`, or `1` to retain a
purchase in the ledger without counting it as a business expense. Personal
records are excluded from COGS, purchase inventory, taxable income, and Tax
Center totals. They can still be sorted, filtered, exported, and changed in
multi-selected groups.

Create additional expense categories from the **New category** form in the
Expenses summary. A custom category is saved with the workspace and immediately
appears in the ledger filter, every expense category dropdown, manual expense
entry, import matching, category summaries, and JSON backups.

## Local development

Use Node.js 22.13 or newer. The repository includes `.nvmrc` and
`.node-version` files that select Node 22 in supported version managers.

With Laravel Herd:

```bash
herd isolate-node 22
```

With nvm:

```bash
nvm install 22
nvm use
```

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

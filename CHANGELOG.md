# Changelog

All notable changes to StockBot are documented here.

## Unreleased

## 0.40.0 - 2026-08-22

### Added

- Added a visible **Redo** button beside Undo with up to 50 forward workspace snapshots.
- Added **Command+Shift+Z** and **Ctrl+Shift+Z** shortcuts outside active text editing.

### Changed

- A new workspace change made after undoing now clears the abandoned redo path, matching standard editor behavior.

## 0.39.1 - 2026-08-22

### Fixed

- **Command+Z** and **Ctrl+Z** now undo workspace changes after using dropdowns, checkboxes, buttons, and other non-text controls.
- The shortcut is handled before focused controls can consume it and also recognizes the physical Z key across keyboard layouts.
- Native field undo remains available while editing text, numeric, and multiline inputs.

## 0.39.0 - 2026-08-22

### Added

- Added a workspace-wide **Undo** button that restores the complete product, customer, activity, expense, tax, and settings snapshot from before the last change.
- Added **Command+Z** and **Ctrl+Z** shortcuts outside editable fields, while leaving native text undo intact inside inputs.
- Kept the 50 most recent workspace changes available for undo during the current app session.

## 0.38.1 - 2026-08-22

### Fixed

- Amazon expenses without a linked archived document now fall back to their saved purchase source, seller, import timestamp, and order date instead of displaying blank provenance metadata.
- Existing Amazon records with a blank or unknown seller normalize to **Amazon**, and missing purchase dates are recovered from imported Order Date data when available.

### Changed

- Split the combined source-document badge into configurable **Seller / source** and **Source date** columns in the expense ledger.

## 0.38.0 - 2026-08-22

### Added

- Added a blank-by-default **Show canceled orders** checkbox to the expense ledger.
- Added a persistent, configurable **Order status** column and canceled-order status badges.

### Changed

- Canceled orders are retained with their imported document provenance for audit history but excluded from expense, inventory, COGS, tax, and business totals.
- Amazon Business, Amazon consumer Order History, and generic imports now recognize both **Canceled** and **Cancelled** status spellings.
- Existing imported records infer cancellation from saved Order Status, Shipment Status, or Status fields when the app loads.
- Introduced **stockbot-data v3** so the full data grid and Git snapshots expose the normalized canceled field.

## 0.37.1 - 2026-08-22

### Fixed

- Consolidated redundant Amazon source labels such as **Amazon**, **Amazon.com**, **Amazon · Amazon.com**, and **Amazon - Amazon.com** into the single source **Amazon**.
- Existing saved expenses are normalized when loaded, and future imports or manual entries use the same rule while intentionally named accounts such as **Amazon Business** and **Amazon Personal** remain distinct.

## 0.37.0 - 2026-08-22

### Added

- Added a searchable business-use review list to expense imports with a Business toggle for every imported order.
- Added bulk actions to mark every imported record as business-related or unrelated.

### Changed

- Unrelated imported purchases remain in the ledger with their source-document history but are excluded from inventory, COGS, business-expense, and tax calculations.
- Existing records show their saved business-use status when re-imported, while new records default to business use unless the source file says otherwise.

## 0.36.0 - 2026-08-22

### Added

- Added **Capital asset** and **Needs review** accounting classes so durable equipment and ambiguous purchases stay out of operating-expense and tax totals.
- Added Amazon import classification for production ingredients and components, finished resale goods, ordinary consumables, durable equipment, and mixed orders.

### Changed

- Tax-exempt Amazon purchases now use product and taxonomy clues instead of assuming every resale exemption represents a finished resale item.
- Re-importing can correct legacy auto-assigned **Other**, **Office supplies**, or **Office equipment** categories when stronger product-cost evidence is present, while preserving custom categories.

### Fixed

- Amazon Business imports now use **Amazon** as the purchase source instead of mistaking the buyer's **Account Group** for a marketplace or account source.
- Preserved Account Group as an imported source-data column and Seller Name as the vendor.

## 0.35.1 - 2026-08-22

### Fixed

- Prevented an unused local preview-controller WebSocket probe from following vinext's trailing-slash redirect until the development server crashed with `Maximum redirects exceeded`.
- Kept normal application requests and Vite hot reloading unaffected.

## 0.35.0 - 2026-08-22

### Added

- Added a durable imported-document archive with detected source names and UTC timestamps embedded in stored filenames.
- Added many-to-many source-document links for expenses, products, customers, inventory activity, and COGS entries.
- Added imported documents and provenance links to the complete Data History diff grid and GitHub pushes.
- Introduced the independently versioned **stockbot-data v2** format.

### Changed

- Functionally identical documents with only formatting or whitespace differences now reuse the existing archive copy.
- Repeated imports update the document's last-imported time and import count, merge row links, and tell the user that the copy already existed.

## 0.34.0 - 2026-08-21

### Added

- Added immutable server-side data commits with complete downloadable JSON snapshots.
- Added optional GitHub pushes that create a real Git commit without storing the one-time token.
- Added a full-field version comparison grid that includes populated, empty, changed, and unchanged values.
- Introduced the independently versioned **stockbot-data v1** format.

## 0.33.0 - 2026-07-28

### Added

- Added a lazy-loaded Amazon product-image preview to the sticky ASIN hover card.
- Switched the preview when hovering or focusing a different ASIN in a multi-item order.
- Cached preview lookups and added a graceful unavailable state for blocked or removed listings.

## 0.32.0 - 2026-07-28

### Changed

- Replaced the native ASIN title tooltip with an interactive hover card containing every ASIN in the order.
- Kept the card open while hovering it or focusing its links so any ASIN remains selectable.
- Added keyboard-accessible Amazon links inside the ASIN hover card.

## 0.31.0 - 2026-07-28

### Changed

- Renamed the expense-ledger header to **ASIN(s)**.
- Displayed multiple ASINs as a compact comma-separated list.
- Made every ASIN a direct link to its Amazon product page.

## 0.30.0 - 2026-07-28

### Added

- Added dedicated ASIN tracking to imported expense records, including every ASIN on multi-item Amazon orders.
- Added an ASIN expense column that is visible by default and supports searching, sorting, reordering, and column configuration.
- Added ASIN support to the expense CSV template and import-review details.

### Changed

- Existing Amazon expenses automatically recover their ASINs from previously saved source fields.
- Re-importing an order refreshes its ASIN list without creating a duplicate or replacing its category and Personal setting.

## 0.29.0 - 2026-07-28

### Added

- Added native support for Amazon consumer **Your Orders → Order History.csv** exports and all 28 source columns.
- Added a clear import-review notice for cancelled and zero-dollar Amazon orders that are intentionally ignored.

### Fixed

- Combined item-level rows under their Amazon order ID and summed every line total instead of dropping later items as duplicates.
- Mapped Amazon.com as the vendor, copied product names into the expense description, and kept the complete original order data available as configurable columns.
- Re-importing an existing order now corrects its imported amount, vendor, date, description, and source fields without creating another expense or replacing its category and Personal setting.

## 0.28.0 - 2026-07-28

### Changed

- Replaced the competing **Inventory** and **COGS** accounting types with one **Product cost** accounting class.
- Added separate product-cost timing: **Track in inventory** or **Recognize directly as COGS**.
- Updated the COGS workspace, expense totals, filters, sortable columns, manual entry, and category summaries to use the two-part treatment.

### Added

- Added independent **Accounting class** and **Cost timing** controls to the category editor.
- Added automatic migration from saved Inventory and COGS categories and built-in overrides without changing their accounting result.

## 0.27.0 - 2026-07-28

### Added

- Added an **Edit categories** control to Expenses and a dedicated editor for every built-in and custom expense category.
- Added persistent accounting-type overrides for built-in categories with their original defaults clearly labeled.
- Added custom-category rename and delete actions with live usage counts.

### Changed

- Moved new-category creation into the category editor so category administration lives in one place.
- Deleting a used custom category now reassigns its expense records to a safe built-in category with the same accounting purpose.
- Built-in names remain protected so expense imports continue to map consistently.

## 0.26.0 - 2026-07-28

### Added

- Added **Inventory**, **COGS**, **Operating expense**, and **Taxes & fees** accounting types with sensible defaults for every built-in expense category.
- Added a required accounting type when creating a custom category.
- Added a configurable, sortable **Category type** expense column and a category-type ledger filter.

### Changed

- Moved purchased inventory into the **COGS** workspace and removed the redundant Purchase Inventory navigation item.
- Kept inventory waiting to become COGS visibly separate from costs recognized through sales or direct COGS expenses.
- Business, COGS, inventory, and tax totals now follow category types instead of hard-coded category names.
- Existing custom categories migrate to **Operating expense**, and saved expense-column layouts gain the new type column automatically.

## 0.25.0 - 2026-07-28

### Added

- Added a new-category creator to the Expenses summary.
- Custom expense categories appear immediately in the ledger filter, inline category dropdowns, manual expense form, category summaries, and imports.

### Changed

- Custom categories are saved with business settings and included in JSON backups.
- Custom category names are normalized and protected from empty, duplicate, built-in, and reserved names.

## 0.24.0 - 2026-07-28

### Added

- Added a configurable, sortable **Personal** expense column and a Business/Personal ledger filter.
- Added Personal support to manual expense entry, CSV/JSON imports, backups, and indexed D1 storage.
- Personal changes apply to every selected expense when editing a multi-selected group.

### Changed

- Personal expenses stay in the ledger but are excluded from business expenses, COGS, purchase inventory, taxable income, and tax-center calculations.
- **Clear all** now waits for the database to confirm the deletion and then reloads a fresh view.

## 0.23.0 - 2026-07-28

### Changed

- Moved products, activity, expenses, purchase sources, and customers from one state snapshot into dedicated D1/SQLite tables.
- Kept compact nested settings and raw import details as JSON only where that is lighter than additional relational tables.
- Changed saving to update only records whose contents changed and to delete only records removed from StockBot.

### Added

- Added database indexes for product SKUs, vendors, expense keys, purchase sources, categories, dates, customers, and imported invoice keys.
- Added an automatic one-time migration that preserves existing StockBot data and retains the original snapshot as a migration safety fallback.

## 0.22.0 - 2026-07-28

### Added

- Added a required purchase source key during expense-import review, with an automatic Amazon account-group suggestion when available.
- Added a configurable and sortable **Purchase source** column plus a dedicated source filter to Expenses.
- Added source sorting, searching, and filtering to Purchase Inventory.
- Added optional purchase source entry for manual expenses and `purchase_source` support to the CSV template.

### Changed

- Existing expense data is migrated without loss, and the new **Purchase source** column is enabled automatically.

### Fixed

- Pinned local development to Node.js 22 and added an early runtime check so unsupported Node versions fail with setup instructions instead of a `node:fs/promises` module error.

## 0.21.0 - 2026-07-23

### Changed

- Removed expense-selection checkboxes in favor of clearly highlighted selectable rows.
- Clicking expense rows toggles them; Shift-clicking selects the full visible range from the previous row.
- Changing the category dropdown on any selected row applies that category to every selected expense.
- Removed the separate bulk category dropdown and **Change category** button.

### Added

- Added keyboard-accessible row selection while preserving Delete/Backspace bulk deletion.

## 0.20.0 - 2026-07-23

### Added

- Added a checkbox to every expense row and a **Select all visible** checkbox in the table header.
- Added a bulk category picker with every existing expense category.
- Added a clear-selection action and visible selected-row count.
- Added Delete/Backspace-key support and a **Delete selected** button for removing selected expenses after confirmation.

### Changed

- Bulk category changes immediately update tax totals and the expense-backed Purchase inventory.

## 0.19.0 - 2026-07-23

### Added

- Added a guarded **Clear all** button alongside **Reset demo**.
- **Clear all** removes products, customers, inventory activity, COGS activity, and expenses while preserving business and tax settings.

### Changed

- Renamed the original reset action to **Reset demo** so its effect is unambiguous.

## 0.18.0 - 2026-07-23

### Added

- Added `Raw materials` and `Resale item` expense categories.
- Added a sortable **Purchase inventory** section with item counts, per-item cost, total cost, vendor, purchase date, and source expense key.
- Added inline category dropdowns to every visible expense Category cell.

### Changed

- Clear pack sizes such as `200 PCS`, `10 pack`, and `Pack of 12` are removed from the inventory name and used as the item count.
- Purchase cost is divided by the detected item count to calculate per-item cost.
- Changing an expense to any category other than `Raw materials` or `Resale item` removes it from Purchase inventory without deleting the expense.
- Raw-material and resale inventory purchases remain out of operating-expense and taxable-income totals until they are reclassified as a recognized cost.

## 0.17.0 - 2026-07-22

### Changed

- Made resolvable **Used in final product** names into accessible hyperlinks.
- Opening a final-product link switches to Products, filters to the item, and opens its product record.
- Kept free-text and deleted product references as plain historical labels.

## 0.16.0 - 2026-07-22

### Changed

- Recognized `Invoice Token`, `Invoice Title`, `Requested Amount`, `Amount Paid`, and other invoice-summary columns.
- Derived quantities from clear title patterns such as `24 Hats` and `Hats x12` while preserving mixed titles such as `50 Pens and 12 Hats` as one bundle.
- Generated stable historical SKUs when the export does not provide product identifiers.

### Fixed

- The provided invoice-summary export now imports every valid row instead of rejecting rows for missing line-item fields.
- Customers without exported addresses no longer default to California or receive an inferred destination tax.

## 0.15.0 - 2026-07-22

### Added

- Added a Customers section with contact details, locations, invoice counts, units sold, revenue, and last-purchase dates.
- Added CSV and JSON imports for historical invoice lines, plus a downloadable template.
- Added a sortable Sold column to Products.

### Changed

- Historical invoice lines create missing products and record sales against existing products without reducing current on-hand quantities.
- Imported customers are created automatically and matched by customer key or email.

### Fixed

- Invoice number and line ID now form a durable unique key, preventing repeat imports from counting the same sale twice.

## 0.14.0 - 2026-07-22

### Changed

- Expense imports now add or enrich records only in the Expenses ledger.

### Fixed

- Removed automatic product creation, product detail updates, and on-hand quantity changes from expense imports.

## 0.13.0 - 2026-07-22

### Added

- Added a dedicated COGS page with sold-item cost, revenue, gross profit, and production-use summaries.
- Added sortable item-level COGS records with quantity, unit cost, total cost, revenue, and final-product association.
- Added a Used in final product activity that reduces component inventory and records its finished-product destination.
- Added durable product-name and SKU snapshots to new inventory activity records.

### Changed

- Kept production-use costs separate from recognized customer-sale COGS to prevent tax-report double counting.

## 0.12.0 - 2026-07-22

### Fixed

- Recognized `10 pack`, `10-pack`, `10pack`, and `Pack of 10` description formats during expense import.
- Removed the pack phrase, multiplied the inventory count, and converted package cost to per-piece cost.

## 0.11.0 - 2026-07-22

### Changed

- Shortened overflowing product descriptions with an ellipsis.
- Added the full product description as a hover tooltip.

## 0.10.0 - 2026-07-22

### Changed

- Moved PCS and PIECES pack sizes out of imported product descriptions and into inventory quantities.
- Multiplied pack size by the number of packages purchased.
- Converted the package price to a per-piece unit cost so inventory value and COGS remain accurate.

## 0.9.0 - 2026-07-22

### Added

- Added automatic inventory creation from SKU, ASIN, UPC, part-number, and model-number fields in expense imports.
- Added imported product details including vendor, category, quantity, unit cost, and sales-tax-paid status.

### Changed

- A new expense for an existing product adds its purchased quantity to the current on-hand count.

### Fixed

- Re-importing an expense key that already exists never adds its product quantities again.

## 0.8.0 - 2026-07-22

### Added

- Added a saved Vendor field to the product editor and backup data.
- Added a sortable Vendor column to the Products table.
- Added vendor names to product search.

### Changed

- Existing products and older backups are upgraded safely with an empty vendor value.

## 0.7.0 - 2026-07-22

### Added

- Added ascending and descending sorting to Products, Activity, Recent Activity, and Expenses.
- Added sorting for every configurable Amazon Business source column.

### Changed

- Matched MyTrueWealthBot's light-gray header bands, green rules, cell dividers, and paired arrow indicators.
- Kept expense headers draggable for column reordering while making a normal click sort the ledger.

## 0.6.0 - 2026-07-22

### Added

- Added a dedicated Changelog section to the main StockBot navigation.
- Added this maintained project changelog for development and release history.

## 0.5.0 - 2026-07-22

### Added

- Added all 73 columns from the provided Amazon Business orders export.
- Added expense display-column controls with search, select all, clear all, and persistent preferences.
- Added draggable visible headers so expense ledger columns can be reordered.

### Changed

- Preserved source CSV values on every imported expense for detailed review.

## 0.4.0 - 2026-07-22

### Changed

- Moved the expense ledger out of the Tax center and into a dedicated Expenses section.
- Added all-years and imported-year filters so historical records remain visible.

### Fixed

- Improved expense import handling and made imported-year results explicit.

## 0.3.0 - 2026-07-22

### Added

- Added support for Amazon Business orders CSV exports.
- Grouped multi-line order items into one expense using the Amazon order ID.
- Added category suggestions for office equipment, supplies, and other common purchases.

### Fixed

- Allowed an existing order to be enriched with newly imported source details without creating a duplicate.

## 0.2.0 - 2026-07-22

### Added

- Added expense categories for cost of goods, utilities, rent, office equipment, and other filing needs.
- Added CSV and JSON expense imports with preview and approval.
- Added unique external keys such as Amazon order IDs, invoice numbers, and bank transaction IDs.

### Fixed

- Blocked duplicate expenses during manual entry, import, and server-side saves.

## 0.1.0 - 2026-07-22

### Added

- Added product lists and stock movements for purchases, sales, adjustments, and personal use.
- Added inventory value, cost of goods, revenue, gross profit, taxable income, and reorder calculations.
- Added customer destination-based sales tax with opt-in state collection settings.
- Added address-based personal use tax, state and local tax layers, and source-backed rate updates.
- Added a tax filing center plus local server storage with JSON import and export.
- Added the StockBot robot and visual design.

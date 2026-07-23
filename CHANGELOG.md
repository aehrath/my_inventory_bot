# Changelog

All notable changes to StockBot are documented here.

## Unreleased

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

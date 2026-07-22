# Changelog

All notable changes to StockBot are documented here.

## Unreleased

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

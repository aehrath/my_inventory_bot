export type ChangelogSection = {
  title: "Added" | "Changed" | "Fixed";
  items: readonly string[];
};

export type ChangelogRelease = {
  version: string;
  date: string;
  title: string;
  summary: string;
  sections: readonly ChangelogSection[];
};

export const changelogReleases: readonly ChangelogRelease[] = [
  {
    version: "0.27.0",
    date: "July 28, 2026",
    title: "Category editor",
    summary: "Expense categories now have one visible workspace for creation, accounting setup, renaming, and safe removal.",
    sections: [
      {
        title: "Added",
        items: [
          "Added an Edit categories control to the Expenses summary and a dedicated editor for every built-in and custom category.",
          "Added persistent accounting-type overrides for built-in categories with their original defaults clearly identified.",
          "Added custom-category rename and delete actions with usage counts.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Moved new-category creation into the editor so category administration lives in one place.",
          "Deleting a used custom category now reassigns its expense records to a safe built-in category with the same accounting purpose.",
          "Built-in names remain protected so imported categories continue to map consistently.",
        ],
      },
    ],
  },
  {
    version: "0.26.0",
    date: "July 28, 2026",
    title: "One COGS workspace",
    summary: "Purchased inventory and recognized costs now share one accounting-aware COGS workspace.",
    sections: [
      {
        title: "Changed",
        items: [
          "Moved purchased inventory into the COGS page and removed the redundant Purchase Inventory navigation item.",
          "Separated inventory waiting to become COGS from costs already recognized through sales or direct COGS expenses.",
          "Business and tax totals now follow each category's accounting type instead of hard-coded category names.",
        ],
      },
      {
        title: "Added",
        items: [
          "Added Inventory, COGS, Operating expense, and Taxes & fees category types with sensible defaults for every built-in category.",
          "Added an accounting-type choice for custom categories plus sortable, configurable type display and filtering in Expenses.",
          "Added automatic migration for existing custom categories and saved expense-column layouts.",
        ],
      },
    ],
  },
  {
    version: "0.25.0",
    date: "July 28, 2026",
    title: "Custom expense categories",
    summary: "Create categories that become available everywhere expenses are categorized or filtered.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a new-category creator to the Expenses summary.",
          "Custom categories appear immediately in the ledger filter, inline category dropdowns, manual expense form, category summaries, and expense imports.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Custom categories are saved with business settings and included in JSON backups.",
          "Category names are normalized and protected from empty, duplicate, built-in, and reserved names.",
        ],
      },
    ],
  },
  {
    version: "0.24.0",
    date: "July 28, 2026",
    title: "Personal expense separation",
    summary: "Personal purchases stay documented without affecting business inventory, expenses, COGS, or tax totals.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a configurable and sortable Personal expense column plus a Business/Personal ledger filter.",
          "Added Personal support to manual entry, CSV and JSON imports, backups, and indexed D1 storage.",
          "Personal changes apply to every selected row when expenses are multi-selected.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Personal expenses remain visible in the ledger but are excluded from business expenses, COGS, purchase inventory, taxable income, and Tax Center calculations.",
          "Clear all now waits for the database to confirm the deletion and reloads StockBot into a fresh view.",
        ],
      },
    ],
  },
  {
    version: "0.23.0",
    date: "July 28, 2026",
    title: "Lightweight relational storage",
    summary: "StockBot now stores business records in indexed D1/SQLite tables with automatic migration from the legacy snapshot.",
    sections: [
      {
        title: "Changed",
        items: [
          "Moved products, activity, expenses, purchase sources, and customers from one state snapshot into dedicated relational tables.",
          "Kept compact nested settings and raw import details as JSON only where that is lighter than additional tables.",
          "Changed saving to update only records whose contents changed and to remove only deleted records.",
        ],
      },
      {
        title: "Added",
        items: [
          "Added database indexes for product SKUs, vendors, expense keys, purchase sources, categories, dates, customers, and imported invoice keys.",
          "Added an automatic one-time migration that preserves existing StockBot data and the original snapshot as a safety fallback.",
        ],
      },
    ],
  },
  {
    version: "0.22.0",
    date: "July 28, 2026",
    title: "Purchase source tracking",
    summary: "Imported purchases can now be separated by account or source throughout Expenses and Purchase Inventory.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a required purchase source key to the expense-import review, with Amazon account-group suggestions when available.",
          "Added a configurable, sortable Purchase source column and source filter to the Expenses ledger.",
          "Added Purchase source sorting, searching, and filtering to Purchase Inventory.",
          "Added optional purchase source entry for manually recorded expenses and purchase_source support in the CSV template.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Existing expense data is migrated without loss, and the new Purchase source column is enabled automatically.",
        ],
      },
    ],
  },
  {
    version: "0.21.0",
    date: "July 23, 2026",
    title: "Direct row multi-selection",
    summary: "Expenses now use click and Shift-click selection with category changes applied through the existing row control.",
    sections: [
      {
        title: "Changed",
        items: [
          "Removed expense-selection checkboxes in favor of clearly highlighted selectable rows.",
          "Clicking expense rows toggles them; Shift-clicking selects the full visible range from the previous row.",
          "Changing the category dropdown on any selected row applies that category to every selected expense.",
          "Removed the separate bulk category dropdown and Change category button.",
        ],
      },
      {
        title: "Added",
        items: ["Added keyboard-accessible row selection while preserving Delete/Backspace bulk deletion."],
      },
    ],
  },
  {
    version: "0.20.0",
    date: "July 23, 2026",
    title: "Bulk expense categorization",
    summary: "Multiple expense records can now be selected and recategorized together.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a checkbox to every expense row and a Select all visible checkbox in the table header.",
          "Added a bulk category picker with every existing expense category.",
          "Added a clear-selection action and visible selected-row count.",
          "Added Delete/Backspace-key support and a Delete selected button for removing selected expenses after confirmation.",
        ],
      },
      {
        title: "Changed",
        items: ["Bulk category changes immediately update tax totals and the expense-backed Purchase inventory."],
      },
    ],
  },
  {
    version: "0.19.0",
    date: "July 23, 2026",
    title: "Clear workspace records",
    summary: "The Data & settings page now offers a clean start without restoring demo records.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a guarded Clear all button alongside Reset demo.",
          "Clear all removes products, customers, inventory activity, COGS activity, and expenses while preserving business and tax settings.",
        ],
      },
      {
        title: "Changed",
        items: ["Renamed the original reset action to Reset demo so its effect is unambiguous."],
      },
    ],
  },
  {
    version: "0.18.0",
    date: "July 23, 2026",
    title: "Expense-backed purchase inventory",
    summary: "Raw-material and resale purchases now stay synchronized with a dedicated inventory view.",
    sections: [
      {
        title: "Added",
        items: [
          "Added Raw materials and Resale item expense categories.",
          "Added a sortable Purchase inventory section with item counts, per-item cost, total cost, vendor, purchase date, and source expense key.",
          "Added inline category dropdowns to every visible expense Category cell.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Clear pack sizes such as 200 PCS, 10 pack, and Pack of 12 are removed from the inventory name and used as the item count.",
          "Purchase cost is divided by the detected item count to calculate per-item cost.",
          "Changing an expense to any category other than Raw materials or Resale item removes it from Purchase inventory without deleting the expense.",
          "Raw-material and resale inventory purchases remain out of operating-expense and taxable-income totals until they are reclassified as a recognized cost.",
        ],
      },
    ],
  },
  {
    version: "0.17.0",
    date: "July 22, 2026",
    title: "COGS links to products",
    summary: "Final-product names in the COGS ledger now open their linked product records.",
    sections: [
      {
        title: "Changed",
        items: [
          "Made resolvable Used in final product names into accessible hyperlinks.",
          "Opening a final-product link switches to Products, filters to the item, and opens its product record.",
          "Kept free-text and deleted product references as plain historical labels.",
        ],
      },
    ],
  },
  {
    version: "0.16.0",
    date: "July 22, 2026",
    title: "Invoice-summary exports import correctly",
    summary: "Invoice exports without line-item columns can now become duplicate-safe historical sales and customer records.",
    sections: [
      {
        title: "Changed",
        items: [
          "Recognized Invoice Token, Invoice Title, Requested Amount, Amount Paid, and other invoice-summary columns.",
          "Derived quantities from clear title patterns such as 24 Hats and Hats x12 while preserving mixed titles such as 50 Pens and 12 Hats as one bundle.",
          "Generated stable historical SKUs when the export does not provide product identifiers.",
        ],
      },
      {
        title: "Fixed",
        items: [
          "The provided invoice-summary export now imports every valid row instead of rejecting rows for missing line-item fields.",
          "Customers without exported addresses no longer default to California or receive an inferred destination tax.",
        ],
      },
    ],
  },
  {
    version: "0.15.0",
    date: "July 22, 2026",
    title: "Historical invoices and customers",
    summary: "Old invoice imports now build customer and product history without changing today’s inventory counts.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a Customers section with contact details, locations, invoice counts, units sold, revenue, and last-purchase dates.",
          "Added CSV and JSON imports for historical invoice lines, plus a downloadable template.",
          "Added a sortable Sold column to Products.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Historical invoice lines create missing products and record sales against existing products without reducing current on-hand quantities.",
          "Imported customers are created automatically and matched by customer key or email.",
        ],
      },
      {
        title: "Fixed",
        items: ["Invoice number and line ID now form a durable unique key, preventing repeat imports from counting the same sale twice."],
      },
    ],
  },
  {
    version: "0.14.0",
    date: "July 22, 2026",
    title: "Expense imports stay in Expenses",
    summary: "Imported expense records no longer create products or change inventory quantities.",
    sections: [
      {
        title: "Changed",
        items: ["Expense imports now add or enrich records only in the Expenses ledger."],
      },
      {
        title: "Fixed",
        items: ["Removed automatic product creation, product detail updates, and on-hand quantity changes from expense imports."],
      },
    ],
  },
  {
    version: "0.13.0",
    date: "July 22, 2026",
    title: "Item-level COGS tracking",
    summary: "Sold inventory costs and production allocations now have a dedicated, traceable workspace.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a dedicated COGS page with sold-item cost, revenue, gross profit, and production-use summaries.",
          "Added sortable item-level COGS records with quantity, unit cost, total cost, revenue, and final-product association.",
          "Added a Used in final product activity that reduces component inventory and records its finished-product destination.",
          "Added durable product-name and SKU snapshots to new inventory activity records.",
        ],
      },
      {
        title: "Changed",
        items: ["Kept production-use costs separate from recognized customer-sale COGS to prevent tax-report double counting."],
      },
    ],
  },
  {
    version: "0.12.0",
    date: "July 22, 2026",
    title: "Pack descriptions split correctly",
    summary: "Descriptions such as “10 pack” now import as ten individual inventory units per package.",
    sections: [
      {
        title: "Fixed",
        items: [
          "Recognized 10 pack, 10-pack, 10pack, and Pack of 10 description formats during expense import.",
          "Removed the pack phrase, multiplied the inventory count, and converted package cost to per-piece cost.",
        ],
      },
    ],
  },
  {
    version: "0.11.0",
    date: "July 22, 2026",
    title: "Long product names stay tidy",
    summary: "Product descriptions now fit cleanly inside the inventory table without hiding the full text.",
    sections: [
      {
        title: "Changed",
        items: [
          "Shortened overflowing product descriptions with an ellipsis.",
          "Added the full product description as a hover tooltip.",
        ],
      },
    ],
  },
  {
    version: "0.10.0",
    date: "July 22, 2026",
    title: "Pack sizes become real inventory units",
    summary: "Expense descriptions such as “200 PCS” now produce the correct individual-unit quantity and product name.",
    sections: [
      {
        title: "Changed",
        items: [
          "Moved PCS and PIECES pack sizes out of imported product descriptions and into inventory quantities.",
          "Multiplied pack size by the number of packages purchased.",
          "Converted the package price to a per-piece unit cost so inventory value and COGS remain accurate.",
        ],
      },
    ],
  },
  {
    version: "0.9.0",
    date: "July 22, 2026",
    title: "Expense purchases flow into inventory",
    summary: "Imported product lines now create or replenish inventory without counting the same expense twice.",
    sections: [
      {
        title: "Added",
        items: [
          "Added automatic inventory creation from SKU, ASIN, UPC, part-number, and model-number fields in expense imports.",
          "Added imported product details including vendor, category, quantity, unit cost, and sales-tax-paid status.",
        ],
      },
      {
        title: "Changed",
        items: ["A new expense for an existing product adds its purchased quantity to the current on-hand count."],
      },
      {
        title: "Fixed",
        items: ["Re-importing an expense key that already exists never adds its product quantities again."],
      },
    ],
  },
  {
    version: "0.8.0",
    date: "July 22, 2026",
    title: "Vendor tracking for products",
    summary: "Products can now keep their supplier or manufacturer alongside inventory details.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a saved Vendor field to the product editor and backup data.",
          "Added a sortable Vendor column to the Products table.",
          "Added vendor names to product search.",
        ],
      },
      {
        title: "Changed",
        items: ["Existing products and older backups are upgraded safely with an empty vendor value."],
      },
    ],
  },
  {
    version: "0.7.0",
    date: "July 22, 2026",
    title: "True Wealth-style sortable tables",
    summary: "Every StockBot table now shares MyTrueWealthBot’s crisp header treatment and sorting controls.",
    sections: [
      {
        title: "Added",
        items: [
          "Added ascending and descending sorting to Products, Activity, Recent Activity, and Expenses.",
          "Added sorting for every configurable Amazon Business source column.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Matched MyTrueWealthBot’s light-gray header bands, green rules, cell dividers, and paired arrow indicators.",
          "Kept expense headers draggable for column reordering while making a normal click sort the ledger.",
        ],
      },
    ],
  },
  {
    version: "0.6.0",
    date: "July 22, 2026",
    title: "A home for every StockBot update",
    summary: "Release notes now live inside StockBot and in the project repository.",
    sections: [
      {
        title: "Added",
        items: [
          "Added a dedicated Changelog section to the main navigation.",
          "Added a maintained CHANGELOG.md for development and release history.",
        ],
      },
    ],
  },
  {
    version: "0.5.0",
    date: "July 22, 2026",
    title: "Complete, configurable expense columns",
    summary: "Amazon Business expense details can be reviewed without losing the original export data.",
    sections: [
      {
        title: "Added",
        items: [
          "Added all 73 columns from the provided Amazon Business orders export.",
          "Added display-column controls with search, select all, clear all, and persistent preferences.",
          "Added draggable visible headers so ledger columns can be reordered.",
        ],
      },
      {
        title: "Changed",
        items: ["Preserved source CSV values on every imported expense for detailed review."],
      },
    ],
  },
  {
    version: "0.4.0",
    date: "July 22, 2026",
    title: "Expenses get their own workspace",
    summary: "Expense records are easier to find, filter, and verify outside the Tax center.",
    sections: [
      {
        title: "Changed",
        items: [
          "Moved the expense ledger into a dedicated Expenses section.",
          "Added all-years and imported-year filters so historical records remain visible.",
        ],
      },
      {
        title: "Fixed",
        items: ["Improved expense import handling and made imported-year results explicit."],
      },
    ],
  },
  {
    version: "0.3.0",
    date: "July 22, 2026",
    title: "Amazon Business imports",
    summary: "StockBot understands Amazon Business order exports as purchase records.",
    sections: [
      {
        title: "Added",
        items: [
          "Added support for Amazon Business orders CSV exports.",
          "Grouped multi-line order items into one expense using the Amazon order ID.",
          "Added category suggestions for office equipment, supplies, and other common purchases.",
        ],
      },
      {
        title: "Fixed",
        items: ["Allowed an existing order to be enriched with newly imported source details without creating a duplicate."],
      },
    ],
  },
  {
    version: "0.2.0",
    date: "July 22, 2026",
    title: "Duplicate-safe expense records",
    summary: "Business spending can be categorized and imported with reliable duplicate protection.",
    sections: [
      {
        title: "Added",
        items: [
          "Added expense categories for cost of goods, utilities, rent, office equipment, and other filing needs.",
          "Added CSV and JSON expense imports with preview and approval.",
          "Added unique external keys such as Amazon order IDs, invoice numbers, and bank transaction IDs.",
        ],
      },
      {
        title: "Fixed",
        items: ["Blocked duplicate expenses during manual entry, import, and server-side saves."],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "July 22, 2026",
    title: "StockBot launches",
    summary: "The first release brings inventory, profitability, sales tax, use tax, and backups together.",
    sections: [
      {
        title: "Added",
        items: [
          "Added product lists, stock movements, inventory value, cost of goods, revenue, and gross-profit calculations.",
          "Added customer destination-based sales tax with opt-in state collection settings.",
          "Added address-based personal use tax, state and local tax layers, and source-backed rate updates.",
          "Added a tax filing center plus local server storage with JSON import and export.",
        ],
      },
    ],
  },
];

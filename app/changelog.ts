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

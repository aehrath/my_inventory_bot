const INVENTORYBOT_DATA_FORMAT_ID = "inventorybot-data";
const INVENTORYBOT_DATA_FORMAT_VERSION = 1;
const INVENTORYBOT_DATA_SCHEMA = "https://inventorybot-inventory.aehrath.chatgpt.site/data-format/v1";
const inventoryBotDatasetLabels = {
  products: "Products", movements: "Activity", expenses: "Expenses", customers: "Customers", settings: "Workspace settings",
  stateTaxes: "State tax settings", localTaxRules: "Local tax rules", addressTaxRates: "Saved address tax rates",
  taxUpdateHistory: "Tax-rate history", customExpenseCategories: "Custom expense categories", expenseCategoryOverrides: "Expense category treatments",
  expenseColumnOrder: "Expense column order", expenseVisibleColumns: "Visible expense columns",
};

export async function GET() {
  const datasetProperties = Object.fromEntries(Object.keys(inventoryBotDatasetLabels).map((dataset) => [dataset, {
    type: "array",
    items: { type: "object", additionalProperties: true },
  }]));
  return Response.json({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: INVENTORYBOT_DATA_SCHEMA,
    title: "InventoryBot complete data snapshot",
    description: "Canonical, stable, full-field data used by InventoryBot Data History and Git integration.",
    type: "object",
    additionalProperties: false,
    required: ["$schema", "format", "formatVersion", "applicationStateVersion", "data"],
    properties: {
      $schema: { const: INVENTORYBOT_DATA_SCHEMA },
      format: { const: INVENTORYBOT_DATA_FORMAT_ID },
      formatVersion: { const: INVENTORYBOT_DATA_FORMAT_VERSION },
      applicationStateVersion: { type: "integer", minimum: 0 },
      data: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(inventoryBotDatasetLabels),
        properties: datasetProperties,
      },
    },
  }, { headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } });
}

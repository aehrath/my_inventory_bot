import { inventoryBotDatasetLabels, INVENTORYBOT_DATA_FORMAT_ID, INVENTORYBOT_DATA_FORMAT_VERSION, INVENTORYBOT_DATA_SCHEMA } from "../../data-format.ts";

export async function GET() {
  const datasetProperties = Object.fromEntries(Object.keys(inventoryBotDatasetLabels).map((dataset) => [dataset, {
    type: "array",
    items: { type: "object", additionalProperties: true },
  }]));
  return Response.json({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: INVENTORYBOT_DATA_SCHEMA,
    title: "InventoryBot complete data and provenance snapshot",
    description: "Canonical, stable, full-field data with imported-document provenance used by InventoryBot Data History and Git integration.",
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

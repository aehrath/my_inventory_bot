export const inventorySchemaSql = `
  CREATE TABLE IF NOT EXISTS inventory_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

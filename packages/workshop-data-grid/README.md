# Workshop Data Grid

Shared headless React data-grid primitives for ProjectBot and InventoryBot.

Version 1 provides sortable and draggable columns, row selection, bulk
deletion, inline editing, stable comparison helpers, and a bounded undo/redo
state hook. Product-specific apps supply their own column renderers and server
persistence callbacks.

The package has no app imports, stylesheets, storage code, or environment
bindings. Move this directory into a standalone repository as-is, then remove
`private: true` when it is ready to publish. Consumers only need React 19 or
newer and may theme the documented `workshopGrid*` and `sortPair` class names.

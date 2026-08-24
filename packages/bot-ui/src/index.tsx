"use client";

import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";

export type GridSortDirection = "asc" | "desc";
export type GridSortValue = string | number | boolean;

export function compareGridValues(
  left: GridSortValue,
  right: GridSortValue,
  direction: GridSortDirection,
) {
  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return comparison * (direction === "asc" ? 1 : -1);
}

export function moveGridColumn<T>(columns: readonly T[], source: T, target: T): T[] {
  const sourceIndex = columns.indexOf(source);
  const targetIndex = columns.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return [...columns];
  const reordered = [...columns];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered;
}

export function useUndoRedoState<T>(initial: T, maximumSteps = 50) {
  const [history, setHistory] = useState({ present: initial, past: [] as T[], future: [] as T[] });

  const commit: Dispatch<SetStateAction<T>> = useCallback((next) => {
    setHistory((current) => {
      const present = typeof next === "function"
        ? (next as (value: T) => T)(current.present)
        : next;
      if (Object.is(present, current.present)) return current;
      return {
        present,
        past: [...current.past.slice(-(maximumSteps - 1)), current.present],
        future: [],
      };
    });
  }, [maximumSteps]);

  const replace = useCallback((present: T) => {
    setHistory({ present, past: [], future: [] });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => current.past.length ? {
      present: current.past[current.past.length - 1],
      past: current.past.slice(0, -1),
      future: [current.present, ...current.future].slice(0, maximumSteps),
    } : current);
  }, [maximumSteps]);

  const redo = useCallback(() => {
    setHistory((current) => current.future.length ? {
      present: current.future[0],
      past: [...current.past.slice(-(maximumSteps - 1)), current.present],
      future: current.future.slice(1),
    } : current);
  }, [maximumSteps]);

  return {
    present: history.present,
    commit,
    replace,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undoCount: history.past.length,
    redoCount: history.future.length,
  };
}

export function useDataGridSelection(visibleIds: readonly string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback((id: string, range = false) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (range && anchorId) {
        const anchorIndex = visibleIds.indexOf(anchorId);
        const idIndex = visibleIds.indexOf(id);
        if (anchorIndex >= 0 && idIndex >= 0) {
          const [start, end] = anchorIndex < idIndex ? [anchorIndex, idIndex] : [idIndex, anchorIndex];
          visibleIds.slice(start, end + 1).forEach((visibleId) => next.add(visibleId));
          return [...next];
        }
      }
      if (next.has(id)) next.delete(id); else next.add(id);
      return [...next];
    });
    setAnchorId(id);
  }, [anchorId, visibleIds]);

  const remove = useCallback((ids: readonly string[]) => {
    const removed = new Set(ids);
    setSelectedIds((current) => current.filter((id) => !removed.has(id)));
    setAnchorId((current) => current && removed.has(current) ? null : current);
  }, []);
  const clear = useCallback(() => { setSelectedIds([]); setAnchorId(null); }, []);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  return { selectedIds, selectedSet, toggle, remove, clear, allVisibleSelected };
}

export function rowClickIsInteractive(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, [role='button']"));
}

type SelectableRowProps = {
  id: string;
  selection: ReturnType<typeof useDataGridSelection>;
  children: React.ReactNode;
};

export function SelectableRow({ id, selection, children }: SelectableRowProps) {
  return <div role="row" aria-selected={selection.selectedSet.has(id)} onClick={(event) => { if (!rowClickIsInteractive(event.target)) selection.toggle(id, event.shiftKey); }}>{children}</div>;
}

export async function deleteSelectedRows(
  ids: readonly string[],
  selection: ReturnType<typeof useDataGridSelection>,
  onDelete: (ids: readonly string[]) => Promise<boolean | void> | boolean | void,
) {
  const deleted = await onDelete(ids);
  if (deleted !== false) selection.remove(ids);
  // Preserve selection for retry when deletion fails.
}

export function isGridDeleteKey(event: Pick<KeyboardEvent, "key">) {
  return event.key === "Delete" || event.key === "Backspace";
}

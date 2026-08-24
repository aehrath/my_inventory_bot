"use client";

import { ReactNode, useCallback, useMemo, useRef, useState } from "react";

export type GridDirection = "asc" | "desc";
export type GridValue = string | number | boolean | null | undefined;
export type GridSort<Key extends string = string> = { key: Key; direction: GridDirection };

export type WorkshopGridColumn<Row, Key extends string = string> = {
  key: Key;
  label: string;
  width: string;
  render: (row: Row) => ReactNode;
  sortValue?: (row: Row) => GridValue;
  editValue?: (row: Row) => string | number;
  inputType?: "text" | "number";
};

export const compareGridValues = (left: GridValue, right: GridValue, direction: GridDirection) => {
  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true, sensitivity: "base" });
  return comparison * (direction === "asc" ? 1 : -1);
};

export const nextGridSort = <Key extends string>(current: GridSort<Key>, key: Key): GridSort<Key> => ({
  key,
  direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
});

export const moveGridColumn = <Key extends string>(order: Key[], source: Key, target: Key) => {
  if (source === target) return order;
  const next = order.filter((key) => key !== source);
  const targetIndex = next.indexOf(target);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, source);
  return next;
};

export function useUndoRedoState<T>(initial: T, maximumSteps = 50) {
  const [history, setHistory] = useState({ present: initial, past: [] as T[], future: [] as T[] });
  const commit = useCallback((next: T | ((current: T) => T)) => {
    setHistory((current) => {
      const value = typeof next === "function" ? (next as (current: T) => T)(current.present) : next;
      if (Object.is(value, current.present)) return current;
      return { present: value, past: [...current.past.slice(-(maximumSteps - 1)), current.present], future: [] };
    });
  }, [maximumSteps]);
  const replace = useCallback((present: T) => setHistory({ present, past: [], future: [] }), []);
  const undo = useCallback(() => setHistory((current) => current.past.length ? {
    present: current.past[current.past.length - 1],
    past: current.past.slice(0, -1),
    future: [current.present, ...current.future].slice(0, maximumSteps),
  } : current), [maximumSteps]);
  const redo = useCallback(() => setHistory((current) => current.future.length ? {
    present: current.future[0],
    past: [...current.past.slice(-(maximumSteps - 1)), current.present],
    future: current.future.slice(1),
  } : current), [maximumSteps]);
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
    undoTarget: history.past.at(-1),
    redoTarget: history.future[0],
  };
}

type WorkshopDataGridProps<Row, Key extends string> = {
  ariaLabel: string;
  rows: Row[];
  rowKey: (row: Row) => string;
  columns: WorkshopGridColumn<Row, Key>[];
  initialSort: GridSort<Key>;
  onDelete?: (ids: string[]) => void | Promise<void>;
  onEdit?: (row: Row, key: Key, value: string) => void | Promise<void>;
  onActivate?: (row: Row) => void;
  empty?: ReactNode;
};

export function WorkshopDataGrid<Row, Key extends string>({ ariaLabel, rows, rowKey, columns, initialSort, onDelete, onEdit, onActivate, empty }: WorkshopDataGridProps<Row, Key>) {
  const [sort,setSort]=useState(initialSort);
  const [order,setOrder]=useState<Key[]>(columns.map((column)=>column.key));
  const [selected,setSelected]=useState<string[]>([]);
  const [editing,setEditing]=useState<{id:string;key:Key}|null>(null);
  const [deleting,setDeleting]=useState(false);
  const dragged=useRef<Key|null>(null);
  const moved=useRef(false);
  const cancelEdit=useRef(false);
  const columnMap=useMemo(()=>new Map(columns.map((column)=>[column.key,column])),[columns]);
  const ordered=order.map((key)=>columnMap.get(key)).filter(Boolean) as WorkshopGridColumn<Row,Key>[];
  const sorted=useMemo(()=>[...rows].sort((left,right)=>{
    const column=columnMap.get(sort.key);
    return compareGridValues(column?.sortValue?.(left),column?.sortValue?.(right),sort.direction);
  }),[rows,columnMap,sort]);
  const selectedSet=new Set(selected);
  const visibleIds=sorted.map(rowKey);
  const allSelected=visibleIds.length>0&&visibleIds.every((id)=>selectedSet.has(id));
  const gridTemplate=`34px ${ordered.map((column)=>column.width).join(" ")} 42px`;
  const deleteSelection=async()=>{if(!onDelete||!selected.length)return;setDeleting(true);try{await onDelete(selected);setSelected([]);}finally{setDeleting(false);}};
  return <div className="workshopGrid" role="table" aria-label={ariaLabel}>
    {selected.length>0&&<div className="workshopGridSelection"><strong>{selected.length} selected</strong><button type="button" onClick={()=>setSelected([])}>Clear</button>{onDelete&&<button className="danger" type="button" disabled={deleting} onClick={()=>void deleteSelection()}>{deleting?"Deleting…":"Delete selected"}</button>}</div>}
    <div className="workshopGridHead" role="row" style={{gridTemplateColumns:gridTemplate}}>
      <label className="workshopGridCheck"><input type="checkbox" checked={allSelected} aria-label="Select all visible rows" onChange={()=>setSelected(allSelected?selected.filter((id)=>!visibleIds.includes(id)):Array.from(new Set([...selected,...visibleIds])))} /></label>
      {ordered.map((column)=><button
        role="columnheader"
        aria-sort={sort.key===column.key?(sort.direction==="asc"?"ascending":"descending"):"none"}
        draggable
        type="button"
        key={column.key}
        className={`workshopGridHeaderCell ${sort.key===column.key?`sorted ${sort.direction}`:""}`}
        onDragStart={()=>{dragged.current=column.key;moved.current=false;}}
        onDragOver={(event)=>{event.preventDefault();if(dragged.current&&dragged.current!==column.key){moved.current=true;setOrder((current)=>moveGridColumn(current,dragged.current!,column.key));}}}
        onDragEnd={()=>{dragged.current=null;}}
        onClick={()=>{if(moved.current){moved.current=false;return;}setSort((current)=>nextGridSort(current,column.key));}}
        title="Click to sort; drag to move column"
      ><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i/><b/></span></button>)}
      <span/>
    </div>
    {sorted.map((row)=>{const id=rowKey(row);return <div className={`workshopGridRow ${selectedSet.has(id)?"selected":""}`} role="row" aria-selected={selectedSet.has(id)} style={{gridTemplateColumns:gridTemplate}} key={id}><label className="workshopGridCheck"><input type="checkbox" checked={selectedSet.has(id)} aria-label={`Select row ${id}`} onChange={()=>setSelected((current)=>current.includes(id)?current.filter((value)=>value!==id):[...current,id])}/></label>{ordered.map((column)=>{const active=editing?.id===id&&editing.key===column.key;return <div className="workshopGridCell" role="cell" key={column.key} onDoubleClick={()=>{if(column.editValue&&onEdit){cancelEdit.current=false;setEditing({id,key:column.key});}}}>{active?<input autoFocus type={column.inputType??"text"} defaultValue={column.editValue?.(row)} onBlur={(event)=>{setEditing(null);if(cancelEdit.current){cancelEdit.current=false;return;}void onEdit?.(row,column.key,event.currentTarget.value);}} onKeyDown={(event)=>{if(event.key==="Escape"){cancelEdit.current=true;event.currentTarget.blur();}if(event.key==="Enter")event.currentTarget.blur();}}/>:column.render(row)}</div>})}<button className="workshopGridOpen" type="button" aria-label={onActivate?`Open row ${id}`:`Select row ${id}`} onClick={()=>onActivate?onActivate(row):setSelected((current)=>current.includes(id)?current.filter((value)=>value!==id):[...current,id])}>{onActivate?"›":"✓"}</button></div>})}
    {!sorted.length&&empty}
  </div>;
}

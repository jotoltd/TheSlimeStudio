"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

type TaskCard = {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  color: string | null;
  due_date: string | null;
  position: number;
};

type TaskList = {
  id: string;
  title: string;
  position: number;
  board_id: string;
  cards: TaskCard[];
};

type TaskBoard = {
  id: string;
  name: string;
  position: number;
};

const COLORS: Record<string, string> = {
  pink: "#ff8ab5",
  yellow: "#ffd166",
  green: "#7ed98e",
  blue: "#7cc3ff",
  purple: "#b79aff",
  orange: "#ffab7a",
};

function fmtDue(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isOverdue(d: string) {
  return d < new Date().toISOString().slice(0, 10);
}

export default function TasksPage() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const { toast } = useToast();

  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [renameBoardName, setRenameBoardName] = useState("");
  const [boardMenu, setBoardMenu] = useState(false);

  const [addingCardTo, setAddingCardTo] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [editingCard, setEditingCard] = useState<TaskCard | null>(null);
  const [renamingList, setRenamingList] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function load(boardId?: string | null) {
    setLoading(true); setLoadErr("");
    try {
      const qs = boardId ? `?board_id=${boardId}` : "";
      const res = await fetch(`/api/tasks${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) setLoadErr(data.error || "Failed to load board");
      else {
        setBoards(data.boards || []);
        setActiveBoard(data.board_id || null);
        setLists(data.lists || []);
      }
    } catch {
      setLoadErr("Failed to load board");
    }
    setLoading(false);
  }

  // ---------- boards ----------

  async function addBoard() {
    const name = newBoardName.trim();
    if (!name) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "board", name }),
    });
    const data = await res.json();
    if (res.ok) {
      setBoards((prev) => [...prev, data.board]);
      setNewBoardName("");
      setAddingBoard(false);
      load(data.board.id);
    } else {
      toast(data.error || "Failed to add board", "error");
    }
  }

  async function renameBoard() {
    const name = renameBoardName.trim();
    const id = activeBoard;
    setRenamingBoard(false);
    if (!name || !id) return;
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "board", id, name }),
    });
  }

  async function deleteBoard() {
    const board = boards.find((b) => b.id === activeBoard);
    if (!board) return;
    if (!confirm(`Delete "${board.name}" and all its lists and cards?`)) return;
    setBoardMenu(false);
    await fetch(`/api/tasks?entity=board&id=${board.id}`, { method: "DELETE" });
    const remaining = boards.filter((b) => b.id !== board.id);
    setBoards(remaining);
    load(remaining[0]?.id || null);
  }

  function findCard(id: string) {
    for (const l of lists) {
      const c = l.cards.find((x) => x.id === id);
      if (c) return c;
    }
    return null;
  }

  // ---------- cards ----------

  async function addCard(listId: string) {
    const title = newCardTitle.trim();
    if (!title) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "card", list_id: listId, title }),
    });
    const data = await res.json();
    if (res.ok) {
      setLists((prev) => prev.map((l) => l.id === listId ? { ...l, cards: [...l.cards, data.card] } : l));
      setNewCardTitle("");
    } else {
      toast(data.error || "Failed to add card", "error");
    }
  }

  async function saveCard(card: TaskCard, patch: Partial<TaskCard>) {
    setLists((prev) => prev.map((l) => ({
      ...l,
      cards: l.cards.map((c) => c.id === card.id ? { ...c, ...patch } : c),
    })));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "card", id: card.id, ...patch }),
    });
  }

  async function deleteCard(card: TaskCard) {
    if (!confirm(`Delete "${card.title}"?`)) return;
    setLists((prev) => prev.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) })));
    setEditingCard(null);
    await fetch(`/api/tasks?entity=card&id=${card.id}`, { method: "DELETE" });
  }

  function moveCardToList(card: TaskCard, targetListId: string) {
    const target = lists.find((l) => l.id === targetListId);
    if (!target || card.list_id === targetListId) return;
    const moved = { ...card, list_id: targetListId, position: target.cards.length };
    setLists((prev) => prev.map((l) => ({
      ...l,
      cards: l.id === card.list_id
        ? l.cards.filter((c) => c.id !== card.id).map((c, i) => ({ ...c, position: i }))
        : l.id === targetListId ? [...l.cards, moved] : l.cards,
    })));
    persistOrder(moved, card.list_id);
    setOpenMenu(null);
  }

  // ---------- drag & drop ----------

  function onDrop(listId: string, beforeCardId: string | null) {
    if (!dragCardId) return;
    const card = findCard(dragCardId);
    if (!card) { setDragCardId(null); setDropTarget(null); return; }
    const sourceListId = card.list_id;

    setLists((prev) => {
      const next = prev.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) }));
      const target = next.find((l) => l.id === listId);
      if (!target) return prev;
      const idx = beforeCardId ? target.cards.findIndex((c) => c.id === beforeCardId) : -1;
      const insertAt = idx === -1 ? target.cards.length : idx;
      target.cards.splice(insertAt, 0, { ...card, list_id: listId });
      for (const l of next) {
        if (l.id === listId || l.id === sourceListId) {
          l.cards = l.cards.map((c, i) => ({ ...c, list_id: l.id, position: i }));
        }
      }
      return next;
    });
    persistOrder({ ...card, list_id: listId }, sourceListId);
    setDragCardId(null);
    setDropTarget(null);
  }

  function persistOrder(card: TaskCard, sourceListId: string) {
    setLists((current) => {
      const updates: { id: string; list_id: string; position: number }[] = [];
      for (const l of current) {
        if (l.id === card.list_id || l.id === sourceListId) {
          l.cards.forEach((c, i) => updates.push({ id: c.id, list_id: l.id, position: i }));
        }
      }
      fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "cards-order", cards: updates }),
      }).catch(() => toast("Could not save card order", "error"));
      return current;
    });
  }

  // ---------- lists ----------

  async function addList() {
    const title = newListTitle.trim();
    if (!title) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "list", title, board_id: activeBoard }),
    });
    const data = await res.json();
    if (res.ok) {
      setLists((prev) => [...prev, data.list]);
      setNewListTitle("");
      setAddingList(false);
    } else {
      toast(data.error || "Failed to add list", "error");
    }
  }

  async function renameList(list: TaskList) {
    const title = renameTitle.trim();
    setRenamingList(null);
    if (!title || title === list.title) return;
    setLists((prev) => prev.map((l) => l.id === list.id ? { ...l, title } : l));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "list", id: list.id, title }),
    });
  }

  async function deleteList(list: TaskList) {
    const msg = list.cards.length
      ? `Delete "${list.title}" and its ${list.cards.length} card${list.cards.length === 1 ? "" : "s"}?`
      : `Delete "${list.title}"?`;
    if (!confirm(msg)) return;
    setLists((prev) => prev.filter((l) => l.id !== list.id));
    await fetch(`/api/tasks?entity=list&id=${list.id}`, { method: "DELETE" });
    setOpenMenu(null);
  }

  const adjacent = (card: TaskCard, dir: -1 | 1) => {
    const idx = lists.findIndex((l) => l.id === card.list_id);
    return lists[idx + dir]?.id;
  };

  return (
    <div className="py-8 md:py-10 px-5 md:px-10 h-full flex flex-col">
      <PageHeader title="Task Board" subtitle="Organise studio jobs, ideas and to-dos. Drag cards between lists to update their status." />

      {/* Board switcher */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {renamingBoard ? (
          <input
            autoFocus
            value={renameBoardName}
            onChange={(e) => setRenameBoardName(e.target.value)}
            onBlur={renameBoard}
            onKeyDown={(e) => { if (e.key === "Enter") renameBoard(); if (e.key === "Escape") setRenamingBoard(false); }}
            className="text-[0.9rem] font-display bg-white rounded-full px-4 py-2 border border-ink/15 focus:outline-none focus:border-bright-lavender w-56"
          />
        ) : (
          boards.map((b) => (
            <button
              key={b.id}
              onClick={() => { if (b.id !== activeBoard) load(b.id); }}
              className={`px-4 py-2 rounded-full text-[0.88rem] font-medium whitespace-nowrap transition-colors ${
                b.id === activeBoard
                  ? "bg-ink text-white shadow-sm"
                  : "bg-white/70 text-ink-soft hover:bg-white hover:text-ink"
              }`}
            >
              {b.name}
            </button>
          ))
        )}
        {addingBoard ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addBoard(); if (e.key === "Escape") { setAddingBoard(false); setNewBoardName(""); } }}
              placeholder="Board name..."
              className="text-[0.88rem] bg-white rounded-full px-4 py-2 border border-ink/15 focus:outline-none focus:border-bright-lavender w-44"
            />
            <button onClick={addBoard} className="px-3 py-2 rounded-full bg-ink text-white text-[0.8rem] hover:bg-ink/85 transition-colors">
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingBoard(true)}
            className="px-4 py-2 rounded-full text-[0.88rem] text-ink-soft border-2 border-dashed border-ink/15 hover:border-ink/30 hover:text-ink transition-colors whitespace-nowrap"
          >
            + New board
          </button>
        )}
        {activeBoard && !renamingBoard && (
          <div className="relative" ref={boardMenu ? menuRef : undefined}>
            <button
              onClick={() => setBoardMenu(!boardMenu)}
              className="w-8 h-8 rounded-full grid place-items-center text-ink-soft hover:bg-ink/5 transition-colors"
              aria-label="Board options"
            >
              ⋯
            </button>
            {boardMenu && (
              <div className="absolute left-0 top-9 bg-white rounded-xl shadow-lg border border-ink/10 py-1.5 z-30 w-44">
                <button
                  onClick={() => { setRenameBoardName(boards.find((b) => b.id === activeBoard)?.name || ""); setRenamingBoard(true); setBoardMenu(false); }}
                  className="w-full text-left px-4 py-2 text-[0.85rem] hover:bg-ink/5"
                >
                  Rename board
                </button>
                <button
                  onClick={deleteBoard}
                  className="w-full text-left px-4 py-2 text-[0.85rem] text-red-600 hover:bg-red-50"
                >
                  Delete board
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink-soft text-[0.9rem]">Loading board...</div>
      ) : loadErr ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center text-red-600 text-[0.9rem]">{loadErr}</div>
      ) : !activeBoard ? (
        <div className="bg-white rounded-[20px] p-10 shadow-sm text-center text-ink-soft text-[0.9rem]">
          No boards yet — create one with <strong>+ New board</strong> above to get started.
        </div>
      ) : (
        <div className="flex gap-4 items-start overflow-x-auto pb-4 flex-1">
          {lists.map((list) => (
            <div
              key={list.id}
              className={`w-[290px] flex-shrink-0 rounded-[20px] p-3 transition-colors ${
                dropTarget === list.id ? "bg-bright-lavender/15 ring-2 ring-bright-lavender/40" : "bg-white/70"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(list.id); }}
              onDragLeave={() => setDropTarget((t) => (t === list.id ? null : t))}
              onDrop={(e) => { e.preventDefault(); onDrop(list.id, null); }}
            >
              {/* List header */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                {renamingList === list.id ? (
                  <input
                    autoFocus
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onBlur={() => renameList(list)}
                    onKeyDown={(e) => { if (e.key === "Enter") renameList(list); if (e.key === "Escape") setRenamingList(null); }}
                    className="flex-1 text-[0.9rem] font-display bg-white rounded-lg px-2 py-1 border border-ink/15 focus:outline-none focus:border-bright-lavender"
                  />
                ) : (
                  <>
                    <h3 className="font-display text-[0.95rem] truncate">
                      {list.title}
                      <span className="ml-2 text-[0.75rem] text-ink-soft font-body font-normal">{list.cards.length}</span>
                    </h3>
                    <div className="relative" ref={openMenu === `list-${list.id}` ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMenu(openMenu === `list-${list.id}` ? null : `list-${list.id}`)}
                        className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-ink/5 transition-colors"
                        aria-label="List options"
                      >
                        ⋯
                      </button>
                      {openMenu === `list-${list.id}` && (
                        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-ink/10 py-1.5 z-30 w-40">
                          <button
                            onClick={() => { setRenamingList(list.id); setRenameTitle(list.title); setOpenMenu(null); }}
                            className="w-full text-left px-4 py-2 text-[0.85rem] hover:bg-ink/5"
                          >
                            Rename list
                          </button>
                          <button
                            onClick={() => deleteList(list)}
                            className="w-full text-left px-4 py-2 text-[0.85rem] text-red-600 hover:bg-red-50"
                          >
                            Delete list
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[8px]">
                {list.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => { setDragCardId(card.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragCardId(null); setDropTarget(null); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(list.id, card.id); }}
                    onClick={() => setEditingCard(card)}
                    className={`group bg-white rounded-xl p-3 shadow-sm border border-ink/[0.06] cursor-pointer hover:shadow-md transition-shadow ${
                      dragCardId === card.id ? "opacity-40" : ""
                    }`}
                  >
                    {card.color && (
                      <div className="h-1.5 w-10 rounded-full mb-2" style={{ background: COLORS[card.color] }} />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[0.88rem] font-medium leading-snug break-words">{card.title}</div>
                      <div className="relative flex-shrink-0" ref={openMenu === `card-${card.id}` ? menuRef : undefined}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `card-${card.id}` ? null : `card-${card.id}`); }}
                          className="w-6 h-6 rounded-md grid place-items-center text-ink-soft/60 hover:bg-ink/5 hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="Card options"
                        >
                          ⋯
                        </button>
                        {openMenu === `card-${card.id}` && (
                          <div className="absolute right-0 top-7 bg-white rounded-xl shadow-lg border border-ink/10 py-1.5 z-30 w-44" onClick={(e) => e.stopPropagation()}>
                            {adjacent(card, -1) && (
                              <button onClick={() => moveCardToList(card, adjacent(card, -1)!)} className="w-full text-left px-4 py-2 text-[0.85rem] hover:bg-ink/5">
                                ← Move left
                              </button>
                            )}
                            {adjacent(card, 1) && (
                              <button onClick={() => moveCardToList(card, adjacent(card, 1)!)} className="w-full text-left px-4 py-2 text-[0.85rem] hover:bg-ink/5">
                                → Move right
                              </button>
                            )}
                            <button onClick={() => { setEditingCard(card); setOpenMenu(null); }} className="w-full text-left px-4 py-2 text-[0.85rem] hover:bg-ink/5">
                              Edit card
                            </button>
                            <button onClick={() => deleteCard(card)} className="w-full text-left px-4 py-2 text-[0.85rem] text-red-600 hover:bg-red-50">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {card.due_date && (
                        <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${
                          isOverdue(card.due_date) ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink-soft"
                        }`}>
                          {fmtDue(card.due_date)}
                        </span>
                      )}
                      {card.description && (
                        <span className="text-[0.7rem] text-ink-soft/60">≡ notes</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add card */}
              {addingCardTo === list.id ? (
                <div className="mt-2">
                  <textarea
                    autoFocus
                    rows={2}
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(list.id); }
                      if (e.key === "Escape") { setAddingCardTo(null); setNewCardTitle(""); }
                    }}
                    placeholder="Card title..."
                    className="w-full text-[0.88rem] rounded-xl border border-ink/15 px-3 py-2 resize-none focus:outline-none focus:border-bright-lavender bg-white"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => addCard(list.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-ink text-white text-[0.8rem] hover:bg-ink/85 transition-colors"
                    >
                      Add card
                    </button>
                    <button
                      onClick={() => { setAddingCardTo(null); setNewCardTitle(""); }}
                      className="px-3 py-1.5 rounded-lg text-ink-soft text-[0.8rem] hover:bg-ink/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingCardTo(list.id); setNewCardTitle(""); }}
                  className="mt-2 w-full text-left px-3 py-2 rounded-xl text-[0.85rem] text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
                >
                  + Add a card
                </button>
              )}
            </div>
          ))}

          {/* Add list */}
          <div className="w-[290px] flex-shrink-0">
            {addingList ? (
              <div className="bg-white/70 rounded-[20px] p-3">
                <input
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addList(); if (e.key === "Escape") { setAddingList(false); setNewListTitle(""); } }}
                  placeholder="List title..."
                  className="w-full text-[0.9rem] rounded-xl border border-ink/15 px-3 py-2 focus:outline-none focus:border-bright-lavender bg-white"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={addList} className="px-3.5 py-1.5 rounded-lg bg-ink text-white text-[0.8rem] hover:bg-ink/85 transition-colors">
                    Add list
                  </button>
                  <button
                    onClick={() => { setAddingList(false); setNewListTitle(""); }}
                    className="px-3 py-1.5 rounded-lg text-ink-soft text-[0.8rem] hover:bg-ink/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-full px-4 py-3 rounded-[20px] bg-white/40 border-2 border-dashed border-ink/15 text-[0.9rem] text-ink-soft hover:bg-white/70 hover:text-ink transition-colors text-left"
              >
                + Add a list
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card edit modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-ink/40 z-50 grid place-items-center p-4" onClick={() => setEditingCard(null)}>
          <div
            className="bg-white rounded-[20px] shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              value={editingCard.title}
              onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
              onBlur={(e) => {
                const t = e.target.value.trim();
                if (t && t !== findCard(editingCard.id)?.title) saveCard(editingCard, { title: t });
              }}
              className="w-full font-display text-[1.05rem] bg-transparent border-b-2 border-transparent focus:border-bright-lavender focus:outline-none pb-1 mb-4"
            />
            <label className="block text-[0.75rem] uppercase tracking-wide text-ink-soft font-semibold mb-1.5">Notes</label>
            <textarea
              rows={6}
              value={editingCard.description || ""}
              onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
              onBlur={(e) => {
                if (e.target.value !== (findCard(editingCard.id)?.description || "")) {
                  saveCard(editingCard, { description: e.target.value || null });
                }
              }}
              placeholder="Add details, links, reminders..."
              className="w-full text-[0.88rem] leading-relaxed rounded-xl border border-ink/15 px-3 py-2.5 resize-y focus:outline-none focus:border-bright-lavender mb-4"
            />
            <label className="block text-[0.75rem] uppercase tracking-wide text-ink-soft font-semibold mb-1.5">Label</label>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setEditingCard({ ...editingCard, color: null }); saveCard(editingCard, { color: null }); }}
                className={`w-8 h-8 rounded-full border-2 grid place-items-center text-[0.7rem] text-ink-soft transition-colors ${
                  !editingCard.color ? "border-ink" : "border-ink/15"
                }`}
                aria-label="No label"
              >
                ✕
              </button>
              {Object.entries(COLORS).map(([name, hex]) => (
                <button
                  key={name}
                  onClick={() => { setEditingCard({ ...editingCard, color: name }); saveCard(editingCard, { color: name }); }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    editingCard.color === name ? "border-ink scale-110" : "border-transparent"
                  }`}
                  style={{ background: hex }}
                  aria-label={`${name} label`}
                />
              ))}
            </div>
            <label className="block text-[0.75rem] uppercase tracking-wide text-ink-soft font-semibold mb-1.5">Due date</label>
            <input
              type="date"
              value={editingCard.due_date || ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setEditingCard({ ...editingCard, due_date: v });
                saveCard(editingCard, { due_date: v });
              }}
              className="text-[0.88rem] rounded-xl border border-ink/15 px-3 py-2 focus:outline-none focus:border-bright-lavender mb-5"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => deleteCard(editingCard)}
                className="px-3.5 py-2 rounded-lg bg-red-100 text-red-700 text-[0.85rem] hover:bg-red-200 transition-colors"
              >
                Delete card
              </button>
              <button
                onClick={() => setEditingCard(null)}
                className="px-5 py-2 rounded-lg bg-ink text-white text-[0.85rem] hover:bg-ink/85 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

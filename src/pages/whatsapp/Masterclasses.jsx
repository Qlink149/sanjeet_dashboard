import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Plus, RefreshCcw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  activateMasterclass,
  createMasterclass,
  deleteMasterclass,
  fetchMasterclassRegistrants,
  fetchMasterclasses,
  updateMasterclass,
} from "@/utils/apiUtils";

const EMPTY_FORM = { title: "", meeting_link: "", notes: "", activate: false };

const truncate = (url, n = 42) => {
  if (!url) return "—";
  return url.length <= n ? url : `${url.slice(0, n)}…`;
};

const formatIst = (iso) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const Masterclasses = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rosterMc, setRosterMc] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const load = useCallback(async (signal) => {
    setSpin(true);
    try {
      const res = await fetchMasterclasses(signal);
      if (res?.aborted) return;
      if (!res?.success) {
        toast.error(res?.message || "Failed to load masterclasses");
        return;
      }
      setRows(res.data || []);
    } catch (e) {
      toast.error(e?.message || "Failed to load masterclasses");
    } finally {
      setLoading(false);
      setSpin(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const hasActive = rows.some((r) => r.is_active);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      meeting_link: row.meeting_link || "",
      notes: row.notes || "",
      activate: false,
    });
    setFormOpen(true);
  };

  const openRoster = async (row) => {
    setRosterMc(row);
    setRegistrants([]);
    setRosterLoading(true);
    try {
      const res = await fetchMasterclassRegistrants(row.masterclass_id);
      if (!res?.success) {
        toast.error(res?.message || "Could not load registrants");
        return;
      }
      setRegistrants(res.data || []);
    } catch (e) {
      toast.error(e?.message || "Could not load registrants");
    } finally {
      setRosterLoading(false);
    }
  };

  const onSave = async () => {
    const title = form.title.trim();
    const meeting_link = form.meeting_link.trim();
    if (!title || !meeting_link) {
      toast.error("Title and meeting link are required");
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editing) {
        res = await updateMasterclass(editing.masterclass_id, {
          title,
          meeting_link,
          notes: form.notes.trim() || null,
        });
      } else {
        res = await createMasterclass({
          title,
          meeting_link,
          notes: form.notes.trim() || null,
          activate: !!form.activate,
        });
      }
      if (!res?.success) {
        toast.error(res?.message || "Save failed");
        return;
      }
      toast.success(editing ? "Updated" : "Created");
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onActivate = async (id) => {
    setBusyId(id);
    try {
      const res = await activateMasterclass(id);
      if (!res?.success) {
        toast.error(res?.message || "Could not activate");
        return;
      }
      toast.success("This link is now Active for WhatsApp");
      await load();
    } catch (e) {
      toast.error(e?.message || "Could not activate");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (row) => {
    if (row.is_active) {
      toast.error("Deactivate this masterclass before deleting it");
      return;
    }
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    setBusyId(row.masterclass_id);
    try {
      const res = await deleteMasterclass(row.masterclass_id);
      if (!res?.success) {
        toast.error(res?.message || "Delete failed");
        return;
      }
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">Masterclasses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Exactly one Active link is sent when someone asks on WhatsApp.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()} disabled={spin}>
            {spin ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add masterclass
          </Button>
        </div>
      </div>

      {!loading && !hasActive && (
        <div className="border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 rounded-md px-4 py-3 text-sm">
          WhatsApp will not send a link until one is Active.
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            No masterclasses yet. Add one and set it Active.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Meeting link</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.masterclass_id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>
                    <a
                      href={row.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                      title={row.meeting_link}
                    >
                      {truncate(row.meeting_link)}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => openRoster(row)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      {row.registrant_count ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {row.is_active ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatIst(row.updated_at)} IST
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!row.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.masterclass_id}
                        onClick={() => onActivate(row.masterclass_id)}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busyId === row.masterclass_id}
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit masterclass" : "New masterclass"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mc-title">Title</Label>
              <Input
                id="mc-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Money Ceiling — Sept 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-link">Meeting URL</Label>
              <Input
                id="mc-link"
                value={form.meeting_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meeting_link: e.target.value }))
                }
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-notes">Notes (optional)</Label>
              <Textarea
                id="mc-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
            {!editing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activate: e.target.checked }))
                  }
                />
                Set as Active after create
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!rosterMc}
        onOpenChange={(open) => !open && setRosterMc(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {rosterMc && (
            <>
              <SheetHeader>
                <SheetTitle>{rosterMc.title}</SheetTitle>
                <SheetDescription>
                  People who received this masterclass link via WhatsApp
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate("/leads", {
                      state: { presetMasterclassId: rosterMc.masterclass_id },
                    })
                  }
                >
                  Open in People filter
                </Button>
                {rosterLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : registrants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No registrations yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {registrants.map((r) => (
                      <div
                        key={r.lead_id}
                        className="border rounded-md p-3 text-sm"
                      >
                        <p className="font-medium">{r.name || "—"}</p>
                        <p className="text-muted-foreground">
                          {r.contact_number || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatIst(r.registered_at)} IST
                          {r.source ? ` · ${r.source}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Masterclasses;

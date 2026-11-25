import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createLink,
  deleteLink,
  fetchLinks,
  updateLink,
} from "@/utils/apiUtils";

// Mirrors the backend rules in short_links.py.
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const MASTERCLASS_TARGET = "@masterclass";
const EMPTY_FORM = { slug: "", target: "", note: "" };

const validateSlug = (slug) =>
  SLUG_RE.test(slug.trim().toLowerCase())
    ? ""
    : "1-40 characters: lowercase letters, digits, '-' or '_'";

const validateTarget = (target) => {
  const t = target.trim();
  if (t === MASTERCLASS_TARGET) return "";
  return /^https:\/\/\S+$/.test(t)
    ? ""
    : "Must be an https:// link (or @masterclass)";
};

const Links = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busySlug, setBusySlug] = useState(null);
  const [copied, setCopied] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async (signal) => {
    setSpin(true);
    try {
      const res = await fetchLinks(signal);
      if (res?.aborted) return;
      if (!res?.success) {
        setError(res?.message || "Failed to load links");
        toast.error(res?.message || "Failed to load links");
        return;
      }
      setError("");
      setRows(res.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load links");
      toast.error(e?.message || "Failed to load links");
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTouched(false);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ slug: row.slug, target: row.target || "", note: row.note || "" });
    setTouched(false);
    setFormOpen(true);
  };

  const slugError = editing ? "" : validateSlug(form.slug);
  const targetError = validateTarget(form.target);

  const onSave = async () => {
    setTouched(true);
    if (slugError || targetError) return;
    setSaving(true);
    try {
      const res = editing
        ? await updateLink(editing.slug, {
            target: form.target.trim(),
            note: form.note.trim(),
          })
        : await createLink({
            slug: form.slug.trim().toLowerCase(),
            target: form.target.trim(),
            note: form.note.trim(),
          });
      if (!res?.success) {
        toast.error(res?.message || "Save failed");
        return;
      }
      toast.success(editing ? "Link updated" : "Link created");
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onCopy = async (row) => {
    try {
      await navigator.clipboard.writeText(row.public_url);
      setCopied(row.slug);
      toast.success("URL copied");
      setTimeout(() => setCopied((c) => (c === row.slug ? null : c)), 1500);
    } catch {
      toast.error("Could not copy. Select the URL and copy manually.");
    }
  };

  const onConfirmDelete = async () => {
    const row = toDelete;
    if (!row) return;
    setBusySlug(row.slug);
    try {
      const res = await deleteLink(row.slug);
      if (!res?.success) {
        toast.error(res?.message || "Delete failed");
        return;
      }
      toast.success("Link deleted");
      setToDelete(null);
      await load();
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">Links</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Use the URL below in the template button. Meta does not allow direct
            WhatsApp group links, so this URL redirects to the real target. You
            can change the target any time without editing the template.
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
            Add link
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin" />
          </div>
        ) : error && rows.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            No links yet. Click Add link to create one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Public URL</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.slug}>
                  <TableCell className="font-medium">{row.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs break-all">{row.public_url}</code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCopy(row)}
                        aria-label={`Copy URL for ${row.slug}`}
                      >
                        {copied === row.slug ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span
                      className="text-xs text-muted-foreground break-all"
                      title={row.target}
                    >
                      {row.target === MASTERCLASS_TARGET
                        ? "Active masterclass link (automatic)"
                        : row.target}
                    </span>
                  </TableCell>
                  <TableCell>{row.clicks ?? 0}</TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {row.note || "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busySlug === row.slug}
                      onClick={() => setToDelete(row)}
                      aria-label={`Delete ${row.slug}`}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>
              Use this URL in the template button; Meta does not allow direct
              WhatsApp group links.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link-slug">Name</Label>
              <Input
                id="link-slug"
                value={form.slug}
                disabled={!!editing}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="coterie"
              />
              {touched && slugError ? (
                <p className="text-xs text-destructive">{slugError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Becomes the URL ending: /go/
                  {form.slug.trim().toLowerCase() || "name"}. Cannot be changed
                  later.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-target">Target URL</Label>
              <Input
                id="link-target"
                value={form.target}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target: e.target.value }))
                }
                placeholder="https://chat.whatsapp.com/..."
              />
              {touched && targetError ? (
                <p className="text-xs text-destructive">{targetError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Where people end up. Must start with https://. Use
                  @masterclass to always open the Active masterclass link.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-note">Note (optional)</Label>
              <Textarea
                id="link-note"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                rows={3}
              />
            </div>
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

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete link?</DialogTitle>
            <DialogDescription>
              {toDelete &&
                `Any template button using /go/${toDelete.slug} will stop working.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={!!busySlug}
            >
              {busySlug ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Links;

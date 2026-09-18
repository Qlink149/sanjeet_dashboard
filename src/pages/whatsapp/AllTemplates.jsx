import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCcw,
  Trash2,
  Plus,
  X,
  Send,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  getAllTemplates,
  deleteTemplate,
  createTemplate,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "@/utils/apiUtils";

const todayIst = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );

const SCHEDULE_CATEGORIES = [
  { value: "all_leads", label: "All WhatsApp-ready" },
  { value: "converted", label: "Converted" },
  { value: "nurture", label: "Nurture" },
  { value: "attended", label: "Attended" },
  { value: "not_now", label: "Not now" },
];

// Gupshup reports several status strings for the same underlying meaning.
// Bucket them into the three states the UI cares about.
const STATUS_BUCKET = {
  APPROVED: "approved",
  ACTIVE: "approved",
  PENDING: "pending",
  SUBMITTED: "pending",
  REJECTED: "rejected",
  FAILED: "rejected",
};

const getBucket = (status) => STATUS_BUCKET[status] || "pending";

const STATUS_STYLES = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  element_name: "",
  category: "",
  language_code: "en",
  header: "",
  footer: "",
  content: "",
  example: "",
};

const EMPTY_BUTTON_ROW = { type: "URL", text: "", url: "" };
const MAX_QUICK_REPLY_BUTTONS = 3;

const normalizeButtonRows = (rows) =>
  rows.map((row) => ({
    type: row.type === "QUICK_REPLY" ? "QUICK_REPLY" : "URL",
    text: row.text || "",
    url: row.url || "",
  }));

const buildValidButtons = (rows) =>
  normalizeButtonRows(rows)
    .filter((b) => {
      if (!b.text.trim()) return false;
      if (b.type === "QUICK_REPLY") return true;
      return b.url.trim();
    })
    .map((b) =>
      b.type === "QUICK_REPLY"
        ? { type: "QUICK_REPLY", text: b.text.trim() }
        : { text: b.text.trim(), url: b.url.trim() }
    );

const buttonTypeLabel = (button) => {
  if (button.type === "QUICK_REPLY" || button.type === "quick_reply") {
    return "Quick Reply";
  }
  if (button.type === "URL" || button.url) return "URL";
  if (!button.url) return "Quick Reply";
  return "URL";
};

const AllTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [spin, setSpin] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [buttonRows, setButtonRows] = useState([{ ...EMPTY_BUTTON_ROW }]);
  const [creating, setCreating] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [newDate, setNewDate] = useState(todayIst());
  const [newTime, setNewTime] = useState("10:00");
  const [newCategory, setNewCategory] = useState("all_leads");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // -----------------------------
  // FETCH ALL TEMPLATES
  // -----------------------------
  const loadTemplates = async (signal) => {
    setLoading(true);
    try {
      const res = await getAllTemplates(signal);
      if (res?.cancelled) return;
      if (res?.timedOut) {
        toast.error("Templates request timed out. Try refresh.");
        setTemplates([]);
        setLoadFailed(true);
        return;
      }
      if (!res?.success) {
        toast.error(res?.message || "Could not load templates from Gupshup.");
        setTemplates([]);
        setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      setTemplates(res?.data || []);
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Error fetching templates:", err);
      toast.error("Could not load templates.");
      setLoadFailed(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTemplates(controller.signal);
    return () => controller.abort();
  }, []);

  const loadSchedules = async (templateId) => {
    setLoadingSchedules(true);
    try {
      const res = await getSchedules(templateId);
      setSchedules((res?.data || []).filter((s) => s.schedule_type !== "expiry"));
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (selected?.id) {
      loadSchedules(selected.id);
      setNewDate(todayIst());
      setNewTime("10:00");
      setNewCategory("all_leads");
    } else {
      setSchedules([]);
    }
  }, [selected?.id]);

  const handleAddSchedule = async () => {
    if (!selected) return;
    if (!newDate) {
      toast.error("Pick a date on the calendar.");
      return;
    }
    setSavingSchedule(true);
    try {
      const res = await createSchedule({
        templateId: selected.id,
        templateName: selected.elementName,
        offsetDays: 0,
        sendTime: newTime,
        category: newCategory,
        scheduleType: "delay",
        sendDate: newDate,
      });
      if (res?.success) {
        toast.success("Scheduled", {
          description: `Will send on ${newDate} at ${newTime} IST.`,
        });
        loadSchedules(selected.id);
      } else {
        toast.error(res?.message || "Could not create schedule.");
      }
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleStopSchedule = async (schedule) => {
    const res = await updateSchedule(schedule.schedule_id, { enabled: false });
    if (res?.success) {
      toast("Schedule stopped");
      loadSchedules(selected.id);
    } else {
      toast.error(res?.message || "Could not stop schedule.");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const res = await deleteSchedule(scheduleId);
    if (res?.success) loadSchedules(selected.id);
    else toast.error(res?.message || "Could not delete schedule.");
  };

  const counts = useMemo(() => {
    const c = { all: templates.length, approved: 0, pending: 0, rejected: 0 };
    templates.forEach((t) => {
      c[getBucket(t.status)] += 1;
    });
    return c;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (statusFilter === "all") return templates;
    return templates.filter((t) => getBucket(t.status) === statusFilter);
  }, [templates, statusFilter]);

  // -----------------------------
  // DELETE TEMPLATE
  // -----------------------------
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteTemplate(selected?.elementName);
      setDeleteOpen(false);
      setSelected(null);
      loadTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // -----------------------------
  // CREATE TEMPLATE
  // -----------------------------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImage(null);
    setButtonRows([{ ...EMPTY_BUTTON_ROW }]);
  };

  const updateButtonRow = (index, field, value) => {
    const updated = [...buttonRows];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "type" && value === "QUICK_REPLY") {
      updated[index].url = "";
    }
    setButtonRows(updated);
  };

  const addButtonRow = () =>
    setButtonRows([...buttonRows, { ...EMPTY_BUTTON_ROW }]);

  const removeButtonRow = (index) =>
    setButtonRows(buttonRows.filter((_, i) => i !== index));

  const handleCreate = async () => {
    if (!form.element_name || !form.category || !form.content) {
      toast.error("Element name, category and content are required.");
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("element_name", form.element_name);
      formData.append("category", form.category);
      formData.append("language_code", form.language_code || "en");
      formData.append("content", form.content);
      formData.append("example", form.example || form.content);
      if (form.header) formData.append("header", form.header);
      if (form.footer) formData.append("footer", form.footer);
      if (image) formData.append("image", image);

      const validButtons = buildValidButtons(buttonRows);
      const quickReplyCount = validButtons.filter(
        (b) => b.type === "QUICK_REPLY"
      ).length;
      if (quickReplyCount > MAX_QUICK_REPLY_BUTTONS) {
        toast.error(`WhatsApp allows up to ${MAX_QUICK_REPLY_BUTTONS} Quick Reply buttons.`);
        setCreating(false);
        return;
      }
      if (validButtons.length > 0) {
        formData.append("buttons", JSON.stringify(validButtons));
      }

      const res = await createTemplate(formData);

      if (res?.success) {
        toast.success("Template submitted for approval.");
        setAddOpen(false);
        resetForm();
        loadTemplates();
      } else {
        toast.error(res?.message || "Failed to create template.");
      }
    } catch (err) {
      console.error("Error creating template:", err);
      toast.error("Something went wrong while creating the template.");
    } finally {
      setCreating(false);
    }
  };

  // -----------------------------
  // PARSE TEMPLATE META
  // -----------------------------
  const getMeta = (tpl) => {
    try {
      return JSON.parse(tpl.containerMeta || "{}");
    } catch {
      return {};
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[80vh] text-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl">All Templates</h1>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg"
            onClick={() => {
              setSpin(true);
              loadTemplates().finally(() => setSpin(false));
            }}
          >
            <RefreshCcw
              className={`w-4 h-4 transition-transform duration-700 ${
                spin ? "rotate-[360deg]" : ""
              }`}
            />
          </Button>

          <Sheet
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetForm();
            }}
          >
            <Button className="flex items-center gap-2" onClick={() => setAddOpen(true)}>
              Add Template
            </Button>

            <SheetContent side="right" className="w-[420px] sm:w-[460px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add a New Template</SheetTitle>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label>Element Name *</Label>
                  <Input
                    placeholder="e.g. event_reminder_day1"
                    value={form.element_name}
                    onChange={(e) =>
                      setForm({ ...form, element_name: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    lowercase_snake_case only — letters, numbers, underscores.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">MARKETING</SelectItem>
                      <SelectItem value="UTILITY">UTILITY</SelectItem>
                      <SelectItem value="AUTHENTICATION">AUTHENTICATION</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Language Code</Label>
                  <Input
                    placeholder="en"
                    value={form.language_code}
                    onChange={(e) =>
                      setForm({ ...form, language_code: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Header (optional)</Label>
                  <Input
                    placeholder="e.g. Dear Team,"
                    value={form.header}
                    onChange={(e) => setForm({ ...form, header: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Body Content *</Label>
                  <Textarea
                    rows={5}
                    placeholder="Template message body"
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Example (sample values) *</Label>
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setForm({ ...form, example: form.content })}
                    >
                      Copy from content
                    </button>
                  </div>
                  <Textarea
                    rows={4}
                    placeholder="Real sample text Meta will review"
                    value={form.example}
                    onChange={(e) =>
                      setForm({ ...form, example: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Footer (optional)</Label>
                  <Input
                    placeholder="e.g. to unsubscribe, reply STOP"
                    value={form.footer}
                    onChange={(e) => setForm({ ...form, footer: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Header Image (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                  />
                  {image && (
                    <p className="text-xs text-muted-foreground">{image.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Buttons (optional)</Label>
                    <button
                      type="button"
                      className="text-xs text-primary underline flex items-center gap-1"
                      onClick={addButtonRow}
                    >
                      <Plus className="w-3 h-3" /> Add button
                    </button>
                  </div>

                  {buttonRows.map((row, index) => (
                    <div key={index} className="flex gap-2 items-start flex-wrap">
                      <Select
                        value={row.type || "URL"}
                        onValueChange={(value) =>
                          updateButtonRow(index, "type", value)
                        }
                      >
                        <SelectTrigger className="w-[140px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="URL">URL</SelectItem>
                          <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="min-w-[140px] flex-1"
                        placeholder={
                          row.type === "QUICK_REPLY"
                            ? "Button label (e.g. Yes)"
                            : "Button text"
                        }
                        value={row.text}
                        onChange={(e) =>
                          updateButtonRow(index, "text", e.target.value)
                        }
                      />
                      {row.type !== "QUICK_REPLY" && (
                        <Input
                          className="min-w-[180px] flex-1"
                          placeholder="https://example.com"
                          value={row.url}
                          onChange={(e) =>
                            updateButtonRow(index, "url", e.target.value)
                          }
                        />
                      )}
                      {buttonRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-500"
                          onClick={() => removeButtonRow(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    URL opens a link when tapped. Quick Reply sends the label
                    back as a WhatsApp message (e.g. Yes). Up to{" "}
                    {MAX_QUICK_REPLY_BUTTONS} Quick Reply buttons per template.
                  </p>
                </div>
              </div>

              <SheetFooter>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit for Approval"
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* STATUS FILTER TABS */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* TEMPLATE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 && (
          <div className="col-span-full border rounded-lg p-8 text-center text-muted-foreground">
            {loadFailed ? (
              <>
                <p className="font-medium text-foreground mb-1">Could not load templates</p>
                <p className="text-sm">Try refresh. The rest of the dashboard still works.</p>
              </>
            ) : templates.length === 0 ? (
              <>
                <p className="font-medium text-foreground mb-1">No WhatsApp templates yet</p>
                <p className="text-sm">
                  This Gupshup app has zero templates. Use Add Template, or create one
                  in Gupshup and wait for Meta approval. Campaigns cannot send until
                  at least one template is Approved.
                </p>
              </>
            ) : (
              <p className="text-sm">No templates in this status tab.</p>
            )}
          </div>
        )}
        {filteredTemplates.map((tpl) => {
          const bucket = getBucket(tpl.status);

          return (
            <div
              key={tpl.id}
              className="border rounded-lg p-4 shadow-sm bg-popover space-y-3 cursor-pointer hover:shadow-md transition"
              onClick={() => setSelected(tpl)}
            >
              <h2 className="text-lg font-semibold">{tpl.elementName}</h2>

              {/* Preview Message */}
              <p className="text-sm text-gray-600 line-clamp-2">{tpl.data}</p>

              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary">{tpl.category}</Badge>
                <Badge className={STATUS_STYLES[bucket]}>{tpl.status}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILS DIALOG */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.elementName}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">Category</p>
                <Badge variant="secondary">{selected.category}</Badge>
              </div>

              <div>
                <p className="font-medium">Status</p>
                <Badge className={STATUS_STYLES[getBucket(selected.status)]}>
                  {selected.status}
                </Badge>
              </div>

              <div>
                <p className="font-medium">Message Body</p>

                <div
                  className="
                    text-gray-700
                    whitespace-pre-wrap
                    bg-muted/30
                    p-4
                    rounded-lg
                    leading-relaxed
                    text-sm
                    break-words
                    break-all
                    overflow-x-hidden
                  "
                >
                  {selected.data}
                </div>
              </div>

              {/* Buttons if present */}
              {(() => {
                const meta = getMeta(selected);
                const buttons = meta?.buttons || [];

                return buttons.length > 0 ? (
                  <div>
                    <p className="font-medium">Buttons</p>
                    <div className="flex flex-col gap-2">
                      {buttons.map((b, i) => (
                        <Badge key={i} className="w-fit">
                          {b.text}
                          {b.text ? ` · ${buttonTypeLabel(b)}` : buttonTypeLabel(b)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {getBucket(selected.status) === "approved" && (
                <div className="space-y-3 border-t pt-4">
                  <p className="font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Schedule this template
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pick the date and time on the calendar. This template sends
                    once then. Trigger Campaign expiry sends are separate.
                  </p>
                  {loadingSchedules ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : schedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No delay schedule yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {schedules.map((s) => (
                        <div
                          key={s.schedule_id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-medium">
                              {s.send_date
                                ? `${s.send_date} at ${s.send_time} IST`
                                : `${s.send_time} IST`}
                            </p>
                            <p className="text-muted-foreground">
                              {s.enabled && !s.last_run_date
                                ? "Waiting"
                                : s.last_run_date
                                  ? `Sent ${s.last_run_date}`
                                  : "Stopped"}
                            </p>
                          </div>
                          {s.enabled && !s.last_run_date && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7"
                              onClick={() => handleStopSchedule(s)}
                            >
                              Stop
                            </Button>
                          )}
                          <button
                            className="text-red-500"
                            onClick={() => handleDeleteSchedule(s.schedule_id)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        className="w-[150px] h-8 text-xs"
                        min={todayIst()}
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time (IST)</Label>
                      <Input
                        type="time"
                        className="w-[110px] h-8 text-xs"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Audience</Label>
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="w-[170px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={savingSchedule}
                      onClick={handleAddSchedule}
                    >
                      {savingSchedule ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          <DialogFooter className="pt-4">
            {selected && getBucket(selected.status) === "approved" && (
              <Button
                className="flex items-center gap-2"
                onClick={() =>
                  navigate("/trigger-campaign", {
                    state: { presetTemplateId: selected.id },
                  })
                }
              >
                <Send className="w-4 h-4" />
                Trigger Campaign
              </Button>
            )}

            <Button
              variant="destructive"
              className="flex items-center gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">This action cannot be undone.</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllTemplates;

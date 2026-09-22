import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileDown,
  Send,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import {
  getAllTemplates,
  triggerTemplateWithPhones,
  triggerTemplateWithExcel,
  triggerTemplateWithCategory,
  fetchLeadStats,
  fetchFilteredLeads,
} from "@/utils/apiUtils";

const LEAD_PAGE_SIZE = 25;

const PIPELINE_OPTIONS = [
  { value: "all_leads", label: "All WhatsApp-ready" },
  { value: "converted", label: "Converted" },
  { value: "nurture", label: "Nurture" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No show" },
  { value: "not_now", label: "Not now" },
  { value: "unknown", label: "Unknown" },
  { value: "discontinued", label: "Discontinued" },
  { value: "quiz_filled", label: "Quiz filled", countKey: "quiz_filled" },
  {
    value: "quiz_no_masterclass",
    label: "Quiz · no MC signup",
    countKey: "quiz_no_masterclass",
  },
];

const TriggerCampaign = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const presetTemplateId = location.state?.presetTemplateId;
  const presetPipeline = location.state?.presetPipeline || "";
  const presetProduct = location.state?.presetProduct || "";
  const presetSource = location.state?.presetSource || "";

  const [rows, setRows] = useState([{ code: "91", number: "" }]);
  const [campaign, setCampaign] = useState(presetTemplateId || "");
  const [pipeline, setPipeline] = useState(presetPipeline);
  const [product, setProduct] = useState(presetProduct);
  const [source, setSource] = useState(presetSource);
  const [file, setFile] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState("");
  const [templateNonce, setTemplateNonce] = useState(0);
  const [leadStats, setLeadStats] = useState(null);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const [selectionMode, setSelectionMode] = useState("all");
  const [exceptions, setExceptions] = useState(new Set());
  const [leadSearchInput, setLeadSearchInput] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadPage, setLeadPage] = useState(1);
  const [leadListData, setLeadListData] = useState({ leads: [], total: 0 });
  const [loadingLeads, setLoadingLeads] = useState(false);

  const fileInputRef = useRef(null);
  const audienceSelected = !!pipeline;

  useEffect(() => {
    const controller = new AbortController();
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const [res, statsRes] = await Promise.all([
          getAllTemplates(controller.signal),
          fetchLeadStats(controller.signal),
        ]);
        if (res?.cancelled || statsRes?.cancelled) return;
        if (!res?.success) {
          const msg = res?.timedOut
            ? "Templates request timed out. Try again."
            : res?.message || "Could not load templates.";
          toast.error(msg);
          setTemplatesError(msg);
          setTemplates([]);
        } else {
          const approved = (res?.data || []).filter((t) =>
            ["APPROVED", "ACTIVE"].includes(t.status)
          );
          setTemplates(approved);
          setTemplatesError("");
          if (presetTemplateId && approved.some((t) => t.id === presetTemplateId)) {
            setCampaign(presetTemplateId);
          }
        }
        if (statsRes?.success) setLeadStats(statsRes.data || null);
      } catch {
        if (controller.signal.aborted) return;
        toast.error("Could not load templates.");
        setTemplatesError("Could not load templates.");
        setTemplates([]);
      } finally {
        if (!controller.signal.aborted) setLoadingTemplates(false);
      }
    };
    loadTemplates();
    return () => controller.abort();
  }, [presetTemplateId, templateNonce]);

  const addRow = () => setRows([...rows, { code: "91", number: "" }]);
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));

  const onFileSelected = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
  };

  const isPhoneEntryUsed = rows.some((r) => r.number.trim() !== "");
  const disablePhoneInputs = !!file || audienceSelected;
  const disableFileUpload = isPhoneEntryUsed || audienceSelected;
  const disableAudience = !!file || isPhoneEntryUsed;

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === campaign),
    [templates, campaign]
  );

  const productOptions = Object.keys(leadStats?.products || {});
  const sourceOptions = Object.keys(leadStats?.sources || {}).filter(
    (s) => s !== "(blank)"
  );

  useEffect(() => {
    const t = setTimeout(() => setLeadSearch(leadSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [leadSearchInput]);

  useEffect(() => {
    setSelectionMode("all");
    setExceptions(new Set());
    setLeadPage(1);
  }, [pipeline, product, source]);

  useEffect(() => {
    if (!audienceSelected) return;
    let cancelled = false;
    const load = async () => {
      setLoadingLeads(true);
      try {
        const res = await fetchFilteredLeads({
          category: pipeline,
          product: product || "",
          source: source || "",
          search: leadSearch,
          page: leadPage,
          limit: LEAD_PAGE_SIZE,
          whatsappReady: true,
        });
        if (!cancelled && res?.success) {
          setLeadListData(res.data);
        }
      } finally {
        if (!cancelled) setLoadingLeads(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [audienceSelected, pipeline, product, source, leadSearch, leadPage]);

  const totalPages = Math.max(1, Math.ceil(leadListData.total / LEAD_PAGE_SIZE));

  const selectedCount =
    selectionMode === "all"
      ? Math.max(leadListData.total - exceptions.size, 0)
      : exceptions.size;

  const isRowChecked = (phone) =>
    selectionMode === "all" ? !exceptions.has(phone) : exceptions.has(phone);

  const toggleRow = (phone) => {
    setExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const handleSend = async () => {
    if (!campaign || sending) return;
    setSending(true);
    setResult(null);
    try {
      let res;
      if (audienceSelected) {
        if (selectionMode === "custom") {
          const phones = Array.from(exceptions).map((phone) => ({
            phone_code: "",
            phone_number: phone,
          }));
          if (phones.length === 0) {
            setResult({
              success: false,
              message: "No people selected — check at least one recipient.",
            });
            setSending(false);
            return;
          }
          res = await triggerTemplateWithPhones(campaign, phones);
        } else {
          res = await triggerTemplateWithCategory(
            campaign,
            pipeline,
            product,
            source,
            selectionMode === "all" ? Array.from(exceptions) : []
          );
        }
      } else if (file) {
        res = await triggerTemplateWithExcel(campaign, file);
      } else {
        const phones = rows
          .filter((r) => r.number.trim())
          .map((r) => ({
            phone_code: r.code,
            phone_number: r.number,
          }));
        if (phones.length === 0) {
          setResult({
            success: false,
            message: "Please add a phone number, upload Excel, or pick an audience",
          });
          setSending(false);
          return;
        }
        res = await triggerTemplateWithPhones(campaign, phones);
      }
      setResult(
        res?.success
          ? { ...res, triggered_at: new Date().toISOString() }
          : res
      );
      if (res?.success) {
        setRows([{ code: "91", number: "" }]);
        setFile(null);
        setPipeline("");
        setProduct("");
        setSource("");
        setSelectionMode("all");
        setExceptions(new Set());
        setLeadSearchInput("");
        if (res.campaign_id) {
          const count = res.total ?? 0;
          toast.success(
            `Campaign created — ${count} recipient${count === 1 ? "" : "s"}`
          );
          navigate(`/campaign-analytics/${res.campaign_id}`);
        }
      }
    } catch {
      setResult({
        success: false,
        message: "Something went wrong while triggering campaign",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Select onValueChange={setCampaign} value={campaign}>
            <SelectTrigger className="w-[280px]">
              <SelectValue
                placeholder={
                  loadingTemplates ? "Loading templates…" : "Select template"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {loadingTemplates ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin" />
                </div>
              ) : templatesError ? (
                <div className="p-4 text-sm text-destructive">{templatesError}</div>
              ) : templates.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No approved templates yet
                </div>
              ) : (
                templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.elementName} ({t.category})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select
            onValueChange={setPipeline}
            value={pipeline}
            disabled={disableAudience}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.countKey
                    ? ` (${leadStats?.[opt.countKey] || 0})`
                    : opt.value === "all_leads"
                    ? ` (${leadStats?.whatsapp_ready || 0})`
                    : ` (${leadStats?.pipelines?.[opt.value] || 0})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {audienceSelected && (
            <>
              <Select
                onValueChange={(v) => setProduct(v === "all" ? "" : v)}
                value={product || "all"}
                disabled={disableAudience}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {productOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(v) => setSource(v === "all" ? "" : v)}
                value={source || "all"}
                disabled={disableAudience}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-green-600 text-green-600 flex gap-2"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/sample_template_excel.xlsx";
              link.download = "sample_template_excel.xlsx";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <FileDown size={16} />
            Download Sample Excel
          </Button>
          <Button disabled={!campaign || sending} onClick={handleSend}>
            {sending ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Send Campaign
              </>
            )}
          </Button>
        </div>
      </div>
      {templatesError ? (
        <p className="text-sm text-destructive">
          {templatesError}{" "}
          <button
            type="button"
            className="underline font-medium"
            onClick={() => setTemplateNonce((n) => n + 1)}
          >
            Retry
          </button>
        </p>
      ) : !loadingTemplates && templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No approved WhatsApp templates yet. Campaigns cannot send until Meta
          approves one.{" "}
          <button
            type="button"
            className="underline text-primary font-medium"
            onClick={() => navigate("/templates")}
          >
            Add one on Templates
          </button>
        </p>
      ) : null}
      </div>

      {selectedTemplate?.category === "MARKETING" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This is a <strong>MARKETING</strong> template. WhatsApp/Meta may block
          delivery to Indian numbers. Use a UTILITY template for testing if needed.
        </div>
      )}

      {audienceSelected && (
        <div className="rounded-xl border">
          <div className="flex items-center justify-between gap-3 p-4 flex-wrap border-b">
            <div>
              <p className="font-medium text-sm">
                {selectedCount} of {leadListData.total} people selected
              </p>
              <p className="text-xs text-muted-foreground">
                WhatsApp-ready India and UAE numbers matching this filter.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-7 w-[200px] h-8"
                  placeholder="Search name, phone"
                  value={leadSearchInput}
                  onChange={(e) => {
                    setLeadSearchInput(e.target.value);
                    setLeadPage(1);
                  }}
                />
              </div>
              <Button
                size="sm"
                variant={selectionMode === "all" ? "default" : "outline"}
                onClick={() => {
                  setSelectionMode("all");
                  setExceptions(new Set());
                }}
              >
                Select all matching
              </Button>
              <Button
                size="sm"
                variant={selectionMode === "custom" ? "default" : "outline"}
                onClick={() => {
                  setSelectionMode("custom");
                  setExceptions(new Set());
                }}
              >
                Clear selection
              </Button>
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loadingLeads ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadListData.leads.map((lead) => (
                    <TableRow key={lead.lead_id || lead.contact_number}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={isRowChecked(lead.contact_number)}
                          onChange={() => toggleRow(lead.contact_number)}
                        />
                      </TableCell>
                      <TableCell>{lead.name || "—"}</TableCell>
                      <TableCell>{lead.contact_number}</TableCell>
                      <TableCell>
                        {(lead.products && lead.products[0]) || "—"}
                      </TableCell>
                      <TableCell>{lead.pipeline || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {leadListData.leads.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No people match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t text-sm">
              <span className="text-muted-foreground">
                Page {leadPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={leadPage <= 1}
                  onClick={() => setLeadPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={leadPage >= totalPages}
                  onClick={() => setLeadPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div
          className={`flex gap-3 p-4 rounded-lg border ${
            result.success
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <div className="text-sm space-y-1">
            <p className="font-medium">
              {result.message ||
                (result.success
                  ? "Campaign triggered successfully"
                  : "Something went wrong")}
            </p>
            {result.success && (
              <>
                {result.status === "queued" ? (
                  <p>
                    Queued {result.total} recipient
                    {result.total === 1 ? "" : "s"} — opening analytics…
                  </p>
                ) : result.status === "sent" ? (
                  <p>
                    Sent to {result.total} recipient
                    {result.total === 1 ? "" : "s"} — opening analytics…
                  </p>
                ) : (
                  <p>
                    Sent {result.sent} / {result.total}
                  </p>
                )}
                {result.campaign_id && (
                  <p className="text-xs font-mono opacity-80">
                    ID: {result.campaign_id}
                  </p>
                )}
                {result.triggered_at && (
                  <p className="text-xs opacity-80">
                    {new Date(result.triggered_at).toLocaleString()}
                  </p>
                )}
                {result.campaign_id && (
                  <button
                    className="underline text-primary"
                    onClick={() =>
                      navigate(`/campaign-analytics/${result.campaign_id}`)
                    }
                  >
                    View delivery analytics
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-xl font-medium">Upload Excel or Enter Manually</div>
      <label
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 ${
          disableFileUpload
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-muted/30"
        }`}
      >
        <Upload size={28} />
        {file ? (
          <p className="text-sm">{file.name}</p>
        ) : (
          <p className="text-sm">Drag & drop your Excel file here</p>
        )}
        <Button
          variant="outline"
          disabled={disableFileUpload}
          onClick={(e) => {
            e.preventDefault();
            fileInputRef.current?.click();
          }}
        >
          Browse File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileSelected}
        />
      </label>
      <Separator />
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-3 items-center">
            <Input
              className="w-20"
              disabled={disablePhoneInputs}
              value={row.code}
              onChange={(e) => {
                const updated = [...rows];
                updated[index].code = e.target.value;
                setRows(updated);
              }}
            />
            <Input
              placeholder="Phone number"
              disabled={disablePhoneInputs}
              value={row.number}
              onChange={(e) => {
                const updated = [...rows];
                updated[index].number = e.target.value;
                setRows(updated);
              }}
            />
            {!disablePhoneInputs &&
              (index === 0 ? (
                <Button variant="secondary" onClick={addRow}>
                  Add More
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => removeRow(index)}
                >
                  <X size={16} />
                </Button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TriggerCampaign;

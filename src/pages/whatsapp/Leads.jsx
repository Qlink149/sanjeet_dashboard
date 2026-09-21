import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchFilteredLeads,
  fetchLeadById,
  fetchLeadStats,
  fetchMasterclasses,
} from "@/utils/apiUtils";

const PIPELINE_LABELS = {
  converted: "Converted",
  nurture: "Nurture",
  attended: "Attended",
  no_show: "No show",
  not_now: "Not now",
  discontinued: "Discontinued",
  unknown: "Unknown",
};

const PAGE_SIZE = 50;
const QUIZ_SOURCE = "Money Ceiling Quiz";

const formatIst = (iso) => {
  if (!iso) return "—";
  try {
    return (
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(iso)) + " IST"
    );
  } catch {
    return iso;
  }
};

const engagementLabel = (ev) => {
  if (ev?.label) return ev.label;
  if (ev?.type === "quiz_submitted") return "Quiz submitted";
  if (ev?.type === "quiz_reengaged") return "Quiz re-submitted";
  if (ev?.type === "masterclass_registered")
    return `Registered · ${ev.title || "Masterclass"}`;
  if (ev?.type === "masterclass_reengaged")
    return `Re-engaged · ${ev.title || "Masterclass"}`;
  return ev?.type || "Event";
};

const Leads = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const presetCard = location.state?.presetCard;
  const presetMasterclassId = location.state?.presetMasterclassId;

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [masterclassFilter, setMasterclassFilter] = useState(
    presetMasterclassId || "all"
  );
  const [masterclasses, setMasterclasses] = useState([]);
  const [cardFilter, setCardFilter] = useState(presetCard || "all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (presetMasterclassId) setMasterclassFilter(presetMasterclassId);
  }, [presetMasterclassId]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    pipelineFilter,
    productFilter,
    sourceFilter,
    masterclassFilter,
    cardFilter,
  ]);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    fetchLeadStats().then((statsRes) => {
      if (cancelled) return;
      setStatsLoading(false);
      if (statsRes?.success) {
        setStats(statsRes.data || null);
        setStatsError("");
      } else if (!statsRes?.cancelled) {
        setStatsError(statsRes?.message || "Could not load people stats.");
      }
    });
    fetchMasterclasses().then((res) => {
      if (cancelled || !res?.success) return;
      setMasterclasses(res.data || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pipelineForQuery = useMemo(() => {
    const fromSelect = pipelineFilter !== "all" ? pipelineFilter : null;
    const fromCard =
      cardFilter === "converted" || cardFilter === "nurture" ? cardFilter : null;
    if (fromSelect && fromCard && fromSelect !== fromCard) return "__none__";
    return fromSelect || fromCard || "";
  }, [pipelineFilter, cardFilter]);

  const sourceForQuery = useMemo(() => {
    if (cardFilter === "quiz_filled") return QUIZ_SOURCE;
    if (cardFilter === "quiz_no_masterclass") return "";
    return sourceFilter !== "all" ? sourceFilter : "";
  }, [cardFilter, sourceFilter]);

  useEffect(() => {
    if (pipelineForQuery === "__none__") {
      setLeads([]);
      setTotal(0);
      setListError("");
      setLoading(false);
      setTableLoading(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setTableLoading(true);
      try {
        const res = await fetchFilteredLeads({
          pipeline: pipelineForQuery,
          product: productFilter !== "all" ? productFilter : "",
          source: sourceForQuery,
          masterclassId:
            masterclassFilter !== "all" ? masterclassFilter : "",
          search: searchQuery,
          page,
          limit: PAGE_SIZE,
          whatsappReady: cardFilter === "whatsapp",
          noNumber: cardFilter === "no_number",
          notWhatsappReady: cardFilter === "not_whatsapp",
          quizNoMasterclass: cardFilter === "quiz_no_masterclass",
          signal: controller.signal,
        });
        if (res?.cancelled) return;
        if (!res?.success) {
          setListError(res?.message || "Could not load people.");
          setLeads([]);
          setTotal(0);
          return;
        }
        setListError("");
        setLeads(res?.data?.leads || []);
        setTotal(res?.data?.total || 0);
      } catch {
        if (!controller.signal.aborted) {
          setListError("Could not load people.");
          setLeads([]);
          setTotal(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setTableLoading(false);
        }
      }
    };
    load();
    return () => controller.abort();
  }, [
    pipelineForQuery,
    productFilter,
    sourceForQuery,
    masterclassFilter,
    searchQuery,
    page,
    cardFilter,
  ]);

  const products = useMemo(
    () => Object.keys(stats?.products || {}),
    [stats]
  );
  const sources = useMemo(
    () => Object.keys(stats?.sources || {}).filter((s) => s !== "(blank)"),
    [stats]
  );

  const openDrawer = async (lead) => {
    setSelected(lead);
    if (!lead?.lead_id) return;
    setDrawerLoading(true);
    try {
      const res = await fetchLeadById(lead.lead_id);
      if (res?.success && res.data) setSelected(res.data);
    } finally {
      setDrawerLoading(false);
    }
  };

  const campaignState = () => {
    const state = {};
    if (pipelineFilter !== "all") state.presetPipeline = pipelineFilter;
    else if (cardFilter === "converted") state.presetPipeline = "converted";
    else if (cardFilter === "nurture") state.presetPipeline = "nurture";
    if (productFilter !== "all") state.presetProduct = productFilter;
    if (sourceFilter !== "all") state.presetSource = sourceFilter;
    if (cardFilter === "whatsapp" || cardFilter === "all") {
      state.presetPipeline = state.presetPipeline || "all_leads";
    }
    return state;
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showTableSkeleton = loading || (tableLoading && leads.length === 0);

  const cards = [
    { key: "quiz_filled", label: "Quiz filled", value: stats?.quiz_filled ?? 0 },
    {
      key: "quiz_no_masterclass",
      label: "Quiz · no MC signup",
      value: stats?.quiz_no_masterclass ?? 0,
    },
    { key: "whatsapp", label: "WhatsApp-ready", value: stats?.whatsapp_ready ?? 0 },
    { key: "not_whatsapp", label: "Not WhatsApp-ready", value: stats?.not_whatsapp_ready ?? 0 },
    { key: "converted", label: "Converted", value: stats?.converted ?? 0 },
    { key: "nurture", label: "Nurture", value: stats?.nurture ?? 0 },
    { key: "no_number", label: "No number", value: stats?.no_number ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">People</h1>
          <div className="text-muted-foreground text-sm mt-1">
            {statsLoading ? (
              <Skeleton className="h-4 w-80" />
            ) : statsError ? (
              "People stats unavailable."
            ) : (
              `${stats?.total ?? 0} people. Extra Excel rows live on each profile as history.`
            )}
          </div>
        </div>
        <Button
          onClick={() => navigate("/trigger-campaign", { state: campaignState() })}
        >
          <Send className="w-4 h-4 mr-2" />
          Trigger Campaign
        </Button>
      </div>

      {statsError && (
        <p className="text-sm text-destructive">{statsError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`border rounded-lg p-4 bg-popover transition ${
              statsLoading
                ? ""
                : "cursor-pointer hover:shadow-md"
            } ${cardFilter === card.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => {
              if (statsLoading) return;
              const next = cardFilter === card.key ? "all" : card.key;
              setCardFilter(next);
              if (card.key === "quiz_filled" && next === "quiz_filled") {
                setSourceFilter("all");
              }
              if (card.key === "quiz_no_masterclass" && next === "quiz_no_masterclass") {
                setSourceFilter("all");
                setMasterclassFilter("all");
              }
            }}
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-semibold">
                {statsError ? "—" : card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by name, phone, or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="md:flex-1"
        />
        <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pipelines</SelectItem>
            {Object.entries(PIPELINE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
                {statsLoading ? "" : ` (${stats?.pipelines?.[value] ?? 0})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="md:w-[200px]">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p} value={p}>
                {p} ({stats?.products?.[p] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s} ({stats?.sources?.[s] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={masterclassFilter} onValueChange={setMasterclassFilter}>
          <SelectTrigger className="md:w-[220px]">
            <SelectValue placeholder="Masterclass" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All masterclasses</SelectItem>
            {masterclasses.map((mc) => (
              <SelectItem key={mc.masterclass_id} value={mc.masterclass_id}>
                {mc.title}
                {typeof mc.registrant_count === "number"
                  ? ` (${mc.registrant_count})`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {showTableSkeleton
          ? "Loading people…"
          : `Showing ${leads.length} of ${total} people${
              tableLoading ? " · loading…" : ""
            }`}
      </p>

      <div className="border rounded-lg overflow-hidden relative">
        {tableLoading && leads.length > 0 && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <Loader2 className="animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Last touch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showTableSkeleton ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <>
            {leads.map((lead) => (
              <TableRow
                key={lead.lead_id || lead.contact_number || lead.email || lead.name}
                className="cursor-pointer"
                onClick={() => openDrawer(lead)}
              >
                <TableCell>{lead.name || "—"}</TableCell>
                <TableCell>{lead.contact_number || "—"}</TableCell>
                <TableCell>{lead.email || "—"}</TableCell>
                <TableCell>{lead.source || "—"}</TableCell>
                <TableCell>{(lead.products && lead.products[0]) || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {PIPELINE_LABELS[lead.pipeline] || lead.pipeline || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell>{lead.last_touch_date || "—"}</TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className={`text-center py-8 ${
                    listError ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {listError
                    ? listError
                    : "No people match this filter."}
                </TableCell>
              </TableRow>
            )}
              </>
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name || "Person"}</SheetTitle>
                <SheetDescription>
                  {selected.contact_number || "No WhatsApp number"}
                  {selected.whatsapp_ready
                    ? " · ready to message"
                    : selected.contact_number
                      ? " · not WhatsApp-ready"
                      : ""}
                </SheetDescription>
              </SheetHeader>
              {drawerLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <div className="px-4 pb-6 space-y-3 text-sm">
                  {selected.aka?.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Also listed as: </span>
                      {selected.aka.join(", ")}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    {selected.email || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone class: </span>
                    {selected.phone_class || "—"}
                  </p>
                  {(selected.contact_numbers || []).length > 0 && (
                    <p>
                      <span className="text-muted-foreground">All numbers: </span>
                      {selected.contact_numbers.join(", ")}
                    </p>
                  )}
                  {selected.quiz_archetype && (
                    <p>
                      <span className="text-muted-foreground">Quiz archetype: </span>
                      {selected.quiz_archetype}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Source: </span>
                    {selected.source || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Products: </span>
                    {(selected.products || []).join(", ") || "—"}
                  </p>
                  {(selected.engagement || []).length > 0 && (
                    <div className="pt-1">
                      <p className="font-medium mb-2">Engagement</p>
                      <div className="space-y-2 border-l-2 border-muted pl-3">
                        {selected.engagement.map((ev, i) => (
                          <div key={`${ev.type}-${ev.at}-${i}`} className="text-sm">
                            <p>{engagementLabel(ev)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatIst(ev.at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(selected.masterclass_registrations || []).length > 0 &&
                    !(selected.engagement || []).length && (
                      <div className="pt-1">
                        <p className="font-medium mb-2">Masterclass registrations</p>
                        <div className="space-y-2">
                          {selected.masterclass_registrations.map((r, i) => (
                            <div
                              key={r.masterclass_id || i}
                              className="border rounded-md p-2"
                            >
                              <p>{r.title || "Masterclass"}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatIst(r.registered_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  <p>
                    <span className="text-muted-foreground">Status: </span>
                    {selected.status_raw || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Referred by: </span>
                    {selected.referred_by || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Discovery: </span>
                    {selected.discovery_call_status || "—"}
                    {selected.discovery_call_date
                      ? ` (${selected.discovery_call_date})`
                      : ""}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Instagram: </span>
                    {selected.instagram_handle || "—"}
                  </p>
                  {selected.remarks && (
                    <p>
                      <span className="text-muted-foreground">Remarks: </span>
                      {selected.remarks}
                    </p>
                  )}
                  {(selected.history || []).length > 0 && (
                    <div className="pt-2">
                      <p className="font-medium mb-2">Import history</p>
                      <div className="space-y-2">
                        {selected.history.map((h, i) => (
                          <div key={i} className="border rounded-md p-2">
                            <p className="text-xs text-muted-foreground">
                              {h.date || "—"} · row {h.excel_row}
                            </p>
                            <p>{h.status || "—"}</p>
                            <p className="text-muted-foreground">
                              {[h.source, h.product].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Leads;

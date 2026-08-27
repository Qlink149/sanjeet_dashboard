import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Phone,
  CheckCircle2,
  Eye,
  XCircle,
  Percent,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import StatCard from "@/components/ui/statsCard";
import { Button } from "@/components/ui/button";
import { getCampaignById, exportCampaignCsv } from "@/utils/apiUtils";
import { toast } from "sonner";

const STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  read: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  undelivered: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 50;

const EMPTY_STATS = {
  total: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  delivery_rate: 0,
  read_rate: 0,
};

const formatWhen = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const CampaignAnalyticsDetail = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, id]);

  useEffect(() => {
    setCampaign(null);
    setLoadError("");
    setNotFound(false);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCampaignById(
          id,
          { page, limit: PAGE_SIZE, status: statusFilter },
          controller.signal
        );
        if (res?.cancelled) return;
        if (!res?.success) {
          const msg = res?.message || "Could not load campaign.";
          const is404 = /not found/i.test(msg) || msg.includes("(404)");
          setNotFound(is404);
          setLoadError(is404 ? "" : msg);
          setCampaign((prev) => (is404 ? null : prev));
          return;
        }
        setLoadError("");
        setNotFound(false);
        setCampaign(res.data);
      } catch {
        setLoadError("Could not load campaign.");
        setNotFound(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [id, page, statusFilter]);

  const changeStatus = (next) => {
    setStatusFilter(next);
  };

  const exportCsv = async () => {
    if (!campaign || exporting) return;
    setExporting(true);
    try {
      const { blob, filename } = await exportCampaignCsv(id, statusFilter);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || "Could not export CSV.");
    } finally {
      setExporting(false);
    }
  };

  if (loading && !campaign)
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (notFound)
    return (
      <p className="text-center py-10 text-muted-foreground">
        Campaign not found.
      </p>
    );

  if (!campaign)
    return (
      <p className="text-center py-10 text-destructive">
        {loadError || "Could not load campaign."}
      </p>
    );

  const stats = { ...EMPTY_STATS, ...(campaign.stats || {}) };
  const recipients = campaign.recipients || [];
  const recipientsTotal = campaign.recipients_total ?? recipients.length;
  const totalPages = Math.max(1, Math.ceil(recipientsTotal / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <Link
        to="/campaign-analytics"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </Link>

      <div>
        <h1 className="text-3xl">{campaign.template_name}</h1>
        <p className="text-sm text-muted-foreground">
          Sent {formatWhen(campaign.created_at)}
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-destructive">{loadError}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => changeStatus("all")} className="text-left">
          <StatCard title={stats.total} subtitle="Mobile numbers" icon={Phone} />
        </button>
        <button onClick={() => changeStatus("delivered")} className="text-left">
          <StatCard
            title={stats.delivered}
            subtitle="Delivered"
            icon={CheckCircle2}
            iconColor="text-green-600"
          />
        </button>
        <button onClick={() => changeStatus("read")} className="text-left">
          <StatCard
            title={stats.read}
            subtitle="Read"
            icon={Eye}
            iconColor="text-emerald-600"
          />
        </button>
        <button onClick={() => changeStatus("failed")} className="text-left">
          <StatCard
            title={stats.failed}
            subtitle="Failed"
            icon={XCircle}
            iconColor="text-red-600"
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title={`${stats.delivery_rate}%`}
          subtitle="Delivery rate"
          icon={Percent}
        />
        <StatCard
          title={`${stats.read_rate}%`}
          subtitle="Read rate"
          icon={Percent}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
          <p className="font-medium text-sm">
            Recipients {statusFilter !== "all" && `— ${statusFilter}`}
            {recipientsTotal ? ` (${recipientsTotal})` : ""}
          </p>
          <div className="flex items-center gap-3">
            {statusFilter !== "all" && (
              <button
                className="text-xs text-primary underline"
                onClick={() => changeStatus("all")}
              >
                Clear filter
              </button>
            )}
            <button
              className="flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={exportCsv}
              disabled={recipientsTotal === 0 || exporting}
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
              <Loader2 className="animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r) => (
                <TableRow key={r.phone_number}>
                  <TableCell>{r.phone_number}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[r.status] || ""}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[420px]">
                    {r.error || "—"}
                  </TableCell>
                </TableRow>
              ))}

              {recipients.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-6"
                  >
                    No recipients in this bucket.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
    </div>
  );
};

export default CampaignAnalyticsDetail;

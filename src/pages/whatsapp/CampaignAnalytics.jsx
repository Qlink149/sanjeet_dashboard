import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllCampaigns } from "@/utils/apiUtils";

const POLL_INTERVAL_MS = 30000;

const formatWhen = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const CampaignAnalytics = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getAllCampaigns();
      if (res?.cancelled) return;
      if (!res?.success) {
        setError(res?.message || "Could not load campaigns.");
        if (!silent) setCampaigns([]);
        return;
      }
      setError("");
      setCampaigns(res?.data || []);
    } catch {
      setError("Could not load campaigns.");
      if (!silent) setCampaigns([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [load]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Campaign Analytics</h1>
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg"
          onClick={() => {
            setSpin(true);
            load().finally(() => setSpin(false));
          }}
        >
          <RefreshCcw
            className={`w-4 h-4 transition-transform duration-700 ${
              spin ? "rotate-[360deg]" : ""
            }`}
          />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {error ? (
          <p className="text-sm text-destructive col-span-full text-center py-10">
            {error}
          </p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full text-center py-10">
            No campaigns triggered yet.
          </p>
        ) : (
          campaigns.map((c) => (
          <Link
            key={c.campaign_id}
            to={`/campaign-analytics/${c.campaign_id}`}
            className="border rounded-lg p-4 shadow-sm bg-popover space-y-3 hover:shadow-md transition block"
          >
            <h2 className="text-lg font-semibold">{c.template_name}</h2>
            <p className="text-xs text-muted-foreground">
              {formatWhen(c.created_at)}
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm pt-2">
              <div>
                <span className="text-muted-foreground">Numbers: </span>
                {c.total}
              </div>
              <div>
                <span className="text-muted-foreground">Delivered: </span>
                {c.delivered}
              </div>
              <div>
                <span className="text-muted-foreground">Read: </span>
                {c.read}
              </div>
              <div>
                <span className="text-muted-foreground">Failed: </span>
                {c.failed}
              </div>
            </div>
          </Link>
        ))
        )}
      </div>
    </div>
  );
};

export default CampaignAnalytics;

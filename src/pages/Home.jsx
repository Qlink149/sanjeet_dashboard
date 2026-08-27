import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeadStats, getAllCampaigns } from "@/utils/apiUtils";
import StatCard from "@/components/ui/statsCard";
import { Loader2, Users, MessageCircle, Sparkles, Ban, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const formatWhen = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsError, setCampaignsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setCampaignsError("");
        const [statsRes, campaignRes] = await Promise.all([
          fetchLeadStats(),
          getAllCampaigns(8),
        ]);
        if (!mounted) return;
        if (statsRes?.success) setStats(statsRes.data);
        else if (!statsRes?.cancelled) {
          setError(statsRes?.message || "Could not load people stats.");
        }
        if (campaignRes?.success) setCampaigns(campaignRes.data || []);
        else if (!campaignRes?.cancelled) {
          setCampaignsError(campaignRes?.message || "Could not load campaigns.");
          setCampaigns([]);
        }
      } catch (err) {
        if (mounted) setError("Could not reach the backend API.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      title: error ? "—" : stats?.whatsapp_ready ?? 0,
      subtitle: "WhatsApp-ready",
      icon: MessageCircle,
      to: "/leads",
      state: { presetCard: "whatsapp" },
    },
    {
      title: error ? "—" : stats?.converted ?? 0,
      subtitle: "Converted",
      icon: Sparkles,
      to: "/leads",
      state: { presetCard: "converted" },
    },
    {
      title: error ? "—" : stats?.nurture ?? 0,
      subtitle: "Nurture",
      icon: Users,
      to: "/leads",
      state: { presetCard: "nurture" },
    },
    {
      title: error ? "—" : stats?.no_number ?? 0,
      subtitle: "No number",
      icon: Ban,
      to: "/leads",
      state: { presetCard: "no_number" },
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-semibold">Overview</h1>
        <p className="text-muted-foreground">
          {stats?.total ?? 0} people on file. Campaigns use WhatsApp-ready India and UAE numbers only.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.subtitle}
            className="text-left"
            onClick={() => navigate(card.to, { state: card.state })}
          >
            <StatCard title={card.title} subtitle={card.subtitle} icon={card.icon} />
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent campaigns</CardTitle>
            <CardDescription>Latest WhatsApp template sends</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate("/trigger-campaign")}>
            <Send className="w-4 h-4 mr-2" />
            Trigger Campaign
          </Button>
        </CardHeader>
        <CardContent>
          {campaignsError ? (
            <p className="text-sm text-destructive py-8 text-center">
              {campaignsError}
            </p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No campaigns yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow
                    key={c.campaign_id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/campaign-analytics/${c.campaign_id}`)}
                  >
                    <TableCell>{c.template_name || "—"}</TableCell>
                    <TableCell>{c.total ?? "—"}</TableCell>
                    <TableCell>{c.delivered ?? 0}</TableCell>
                    <TableCell>{c.read ?? 0}</TableCell>
                    <TableCell>{c.failed ?? 0}</TableCell>
                    <TableCell>{formatWhen(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;

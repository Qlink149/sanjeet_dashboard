import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSchedules } from "@/utils/apiUtils";

const todayIst = () => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const rowLabel = (s) => {
  if (s.schedule_type === "expiry") {
    return s.last_run_date
      ? `Expiry auto · triggered ${s.last_run_date}`
      : `Expiry auto · daily ${s.send_time} IST`;
  }
  const n = Number(s.offset_days);
  const delay = [3, 5, 7, 10, 15, 30].includes(n)
    ? `After ${n} days`
    : `${n} day delay`;
  return `${delay} at ${s.send_time} IST`;
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);

  const load = async () => {
    const res = await getSchedules();
    setSchedules(res?.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const today = todayIst();
  const count = schedules.filter((s) => {
    if (!s.enabled) return false;
    if (s.schedule_type === "expiry") return s.last_run_date === today;
    return !s.last_run_date;
  }).length;

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full p-3 relative">
          <Bell className="w-4 h-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Campaign notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {schedules.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No auto-sends yet. Schedule a delay on a template, or wait for
            expiry templates to fire on their own.
          </p>
        ) : (
          schedules.slice(0, 8).map((s) => (
            <DropdownMenuItem
              key={s.schedule_id}
              className="flex flex-col items-start gap-0.5"
              onClick={() =>
                navigate(
                  s.schedule_type === "expiry" ? "/trigger-campaign" : "/templates"
                )
              }
            >
              <span className="font-medium">{s.template_name || "Template"}</span>
              <span className="text-xs text-muted-foreground">
                {rowLabel(s)}
                {!s.enabled ? " · stopped" : ""}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;

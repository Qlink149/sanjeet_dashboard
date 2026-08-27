import Sidebar from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/theme-provider";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import NotificationBell from "@/components/notification-bell";

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { loggedIn } = useAuth();

  useEffect(() => {
    if (!loggedIn) {
      navigate("/login", { replace: true });
    }
  }, [loggedIn, navigate]);

  if (!loggedIn) return null;

  const formatSegment = (segment) =>
    segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const segments = location.pathname.split("/").filter(Boolean);
  const pageTitle =
    location.pathname === "/" ? "Dashboard" : formatSegment(segments.at(-1));

  const isNested = segments.length > 1;

  return (
    <div className="flex w-full h-[100svh] overflow-hidden font-sans">
        <Sidebar />

        <div className="px-10 w-full overflow-y-scroll">
          <div className="flex items-center justify-between my-5 sticky top-0 z-50 bg-background/80 backdrop-blur-sm py-4">
            <div className="flex items-center gap-3">
              {isNested && (
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  size="icon"
                  className="p-1 rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="text-4xl font-bold">{pageTitle}</div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                variant="outline"
                size="icon"
                className="rounded-full p-3"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>

              <Button
                className="rounded-full"
                onClick={() => {
                  window.location.href =
                    "mailto:pratham.paleriya@qlink.in?subject=Support%20-%20Sanjeet%20Dashboard";
                }}
              >
                Help
              </Button>
            </div>
          </div>

          <Outlet />
        </div>
    </div>
  );
};

export default MainLayout;

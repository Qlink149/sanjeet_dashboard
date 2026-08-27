import React, { useState } from "react";
import {
  Home,
  Users,
  LogOut,
  MessageSquare,
  FileText,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navigationGroups = [
    {
      title: "Main",
      items: [
        { name: "Dashboard", icon: Home, path: "/" },
      ],
    },
    {
      title: "WhatsApp Bot",
      items: [
        { name: "Chat History", icon: MessageSquare, path: "/chat-history" },
        { name: "Templates", icon: FileText, path: "/templates" },
        { name: "People", icon: Users, path: "/leads" },
        { name: "Trigger Campaign", icon: Send, path: "/trigger-campaign" },
        { name: "Campaign Analytics", icon: BarChart, path: "/campaign-analytics" },
      ],
    },
  ];

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div
      className={`${collapsed ? "w-16" : "w-64"
        } bg-accent-foreground px-1 flex flex-col transition-all duration-300 ease-in-out relative dark:bg-accent`}
    >
      {/* Header */}
      <div className="py-4">
        {!collapsed ? (
          <div>
            <h1 className="text-xl px-4 font-semibold text-secondary dark:text-secondary-foreground">
              Sanjeet
            </h1>
            <p className="text-xs px-4 text-muted/70 mt-1 dark:text-muted-foreground/70">
              Powered by clara.ai by qlink
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">
              S
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-5">
        {navigationGroups.map((group, gi) => (
          <div key={gi} className="mb-6">
            {!collapsed && (
              <h3 className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {group.title}
              </h3>
            )}

            <nav className="space-y-1 px-2">
              {group.items.map((item, i) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={i}
                    to={item.path}
                    className={`
                      w-full flex items-center ${collapsed ? "justify-center" : ""
                      } px-3 py-2 rounded-md transition-colors
                      ${active
                        ? "bg-accent/10 dark:bg-accent-foreground/10 text-secondary dark:text-secondary-foreground"
                        : "hover:bg-accent/10 hover:text-muted text-muted dark:text-muted-foreground"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {!collapsed && (
                      <span className="ml-3 text-sm font-medium">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="my-4 h-[0.2px] bg-secondary/7 mx-3" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 space-y-2 mt-auto">
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center px-3 py-2 rounded-md bg-accent/10 hover:bg-accent/20 hover:text-muted text-muted dark:text-muted-foreground transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              {!collapsed && (
                <span className="ml-3 text-sm font-medium">Collapse</span>
              )}
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className={`w-full flex items-center ${collapsed ? "justify-center bg-red-400/20" : ""
            } px-3 py-2 rounded-md text-destructive hover:bg-destructive hover:text-secondary transition-colors`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && (
            <span className="ml-3 text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

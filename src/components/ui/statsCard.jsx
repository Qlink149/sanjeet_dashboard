import React from "react";

const StatCard = ({ title, subtitle, icon: Icon, iconColor = "text-primary" }) => {
  return (
    <div className="h-32 bg-muted-foreground/10 p-6 flex items-center justify-between rounded-lg">
      <div>
        <div className="text-4xl font-bold">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>

      <div className="bg-popover dark:bg-popover-foreground flex items-center justify-center h-full aspect-square rounded-md">
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  );
};

export default StatCard;

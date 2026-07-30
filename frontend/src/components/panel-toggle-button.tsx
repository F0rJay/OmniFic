import { IconButton, Tooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

import "./panel-toggle-button.css";

interface PanelToggleButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function PanelToggleButton({ label, onClick, children, className }: PanelToggleButtonProps) {
  return (
    <Tooltip content={label}>
      <IconButton
        type="button"
        variant="ghost"
        color="gray"
        size="1"
        className={["panel-toggle-button", className].filter(Boolean).join(" ")}
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

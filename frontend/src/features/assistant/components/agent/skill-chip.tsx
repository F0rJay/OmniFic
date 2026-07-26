import { Box } from "lucide-react";

import "./agent-mentions.css";

export function SkillChip({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <span
      className="agent-skill-chip"
      data-selected={selected}
      draggable={false}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      <span
        className="agent-skill-chip-icon"
        aria-hidden="true"
      >
        <Box size={14} />
      </span>
      <span className="agent-skill-chip-label">{label}</span>
    </span>
  );
}

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { SkillChip } from "../skill-chip";

export function SkillNodeView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="span"
      data-skill-id={String(node.attrs.skillId ?? "")}
      draggable={false}
    >
      <SkillChip
        label={String(node.attrs.skillName ?? node.attrs.skillRaw ?? "")}
        selected={selected}
      />
    </NodeViewWrapper>
  );
}

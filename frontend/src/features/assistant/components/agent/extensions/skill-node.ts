import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { SkillNodeView } from "./skill-node-view";

export interface AssistantSkillNodeAttributes {
  skillId: string;
  skillName: string;
  skillRaw: string;
  skillSource: "builtin" | "custom";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    assistantSkill: {
      insertAssistantSkill: (attrs: AssistantSkillNodeAttributes) => ReturnType;
    };
  }
}

export const SkillNode = Node.create({
  name: "assistantSkill",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      skillId: { default: "" },
      skillName: { default: "" },
      skillRaw: { default: "" },
      skillSource: { default: "builtin" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-assistant-skill="true"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            skillId: node.dataset.skillId ?? "",
            skillName: node.dataset.skillName ?? "",
            skillRaw: node.dataset.skillRaw ?? "",
            skillSource: node.dataset.skillSource ?? "builtin",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-assistant-skill": "true",
        "data-skill-id": HTMLAttributes.skillId || "",
        "data-skill-name": HTMLAttributes.skillName || "",
        "data-skill-raw": HTMLAttributes.skillRaw || "",
        "data-skill-source": HTMLAttributes.skillSource || "builtin",
      }),
      HTMLAttributes.skillName || "",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SkillNodeView);
  },

  addCommands() {
    return {
      insertAssistantSkill:
        (attrs: AssistantSkillNodeAttributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});

import { Flex, Text, Tooltip } from "@radix-ui/themes";
import { Box, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RenderableDisplayMessage } from "../../../display/display-message-types";

interface ModelChangedMessageProps {
  message: RenderableDisplayMessage;
}

export function ModelChangedMessage({ message }: ModelChangedMessageProps) {
  const { t } = useTranslation();
  const previousModel = String(message.payload?.previous_model_name || "—");
  const model = String(message.payload?.model_name || "—");

  return (
    <Flex
      align="center"
      gap="3"
      className="agent-model-changed-message"
      role="status"
    >
      <span className="agent-model-changed-line" />
      <Flex
        align="center"
        gap="2"
        className="agent-model-changed-content"
      >
        <Box
          size={16}
          aria-hidden="true"
        />
        <Text size="2">{t("assistant.modelChanged", { previousModel, model })}</Text>
        <Tooltip content={t("assistant.modelChangedHint")}>
          <Info
            size={14}
            aria-label={t("assistant.modelChangedHint")}
          />
        </Tooltip>
      </Flex>
      <span className="agent-model-changed-line" />
    </Flex>
  );
}

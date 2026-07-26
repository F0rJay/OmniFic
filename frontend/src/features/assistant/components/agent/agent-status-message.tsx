import { Box, Flex } from "@radix-ui/themes";

interface AgentStatusMessageProps {
  content: string;
  elapsed?: string;
}

export function AgentStatusMessage({ content, elapsed }: AgentStatusMessageProps) {
  const display = elapsed ? `${content} · ${elapsed}` : content;
  return (
    <Box className="agent-message-card">
      <Flex
        align="center"
        gap="2"
      >
        <span
          className="text-shimmer"
          data-text={display}
        >
          {display}
        </span>
      </Flex>
    </Box>
  );
}

import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import { motion } from "motion/react";
import { Link } from "react-router";

import { MOTION_TRANSITION } from "@/lib/motion";

import "./sidebar-nav.css";
import {
  SIDEBAR_ICON_SIZE,
  SIDEBAR_ITEM_HEIGHT,
  type AppSidebarNavItem,
} from "./app-sidebar.constants";

const MotionFlex = motion.create(Flex);

interface SidebarNavProps {
  items: AppSidebarNavItem[];
  isExpanded: boolean;
}

function SidebarNavItem({ item, isExpanded }: { item: AppSidebarNavItem; isExpanded: boolean }) {
  const Icon = item.icon;
  const content = (
    <MotionFlex
      align="center"
      className="app-sidebar-nav-item"
      data-active={item.active ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "center",
        height: SIDEBAR_ITEM_HEIGHT,
      }}
    >
      {item.active ? (
        <motion.span
          layoutId="app-sidebar-active-indicator"
          className="app-sidebar-nav-item__active-indicator"
          transition={MOTION_TRANSITION.normal}
        />
      ) : null}
      <Box
        className="app-sidebar-nav-item__icon-box"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: SIDEBAR_ITEM_HEIGHT,
          height: SIDEBAR_ITEM_HEIGHT,
          flexShrink: 0,
        }}
      >
        <Icon
          size={SIDEBAR_ICON_SIZE}
          color="currentColor"
          className="app-sidebar-nav-item__icon"
        />
      </Box>
      <motion.div
        initial={false}
        animate={{
          opacity: isExpanded ? 1 : 0,
          width: isExpanded ? 132 : 0,
        }}
        transition={MOTION_TRANSITION.normal}
        className="app-sidebar-nav-item__label"
        style={{ pointerEvents: isExpanded ? "auto" : "none" }}
      >
        <Text
          size="2"
          weight={item.active ? "bold" : "medium"}
        >
          {item.label}
        </Text>
      </motion.div>
    </MotionFlex>
  );

  const linked = (
    <Link
      to={item.href}
      aria-label={item.label}
      aria-current={item.active ? "page" : undefined}
      className="app-sidebar-nav-link"
      style={{ display: "block", width: "100%" }}
    >
      {content}
    </Link>
  );

  return isExpanded ? (
    <Box
      key={item.href}
      width="100%"
    >
      {linked}
    </Box>
  ) : (
    <Tooltip
      key={item.href}
      content={item.label}
      side="right"
    >
      <Box width="100%">{linked}</Box>
    </Tooltip>
  );
}

export function SidebarNav({ items, isExpanded }: SidebarNavProps) {
  return (
    <Flex
      direction="column"
      align="center"
      gap="1"
      width="100%"
    >
      {items.map((item) => (
        <SidebarNavItem
          key={item.href}
          item={item}
          isExpanded={isExpanded}
        />
      ))}
    </Flex>
  );
}

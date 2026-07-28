import type { ComponentProps } from "react";

interface ProductLogoProps extends Omit<ComponentProps<"img">, "src" | "width" | "height"> {
  size?: number;
}

export function ProductLogo({ size = 24, alt = "OmniFic", style, ...props }: ProductLogoProps) {
  return (
    <img
      {...props}
      src="/pwa-icons/icon-192.png"
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        userSelect: "none",
        ...style,
      }}
    />
  );
}

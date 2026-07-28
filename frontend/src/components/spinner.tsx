import type { ComponentProps } from "react";

import { ProductLogo } from "./product-logo";

import "./spinner.css";

const spinnerSizeClassNames = {
  12: "spinner--12",
  18: "spinner--18",
  24: "spinner--24",
  32: "spinner--32",
  56: "spinner--56",
} as const;

export interface SpinnerProps extends Omit<ComponentProps<"span">, "children"> {
  size?: 12 | 18 | 24 | 32 | 56;
}

export function Spinner({
  size = 24,
  className,
  "aria-label": ariaLabel = "Loading",
  ...props
}: SpinnerProps) {
  const spinnerClassName = className
    ? `spinner ${spinnerSizeClassNames[size]} ${className}`
    : `spinner ${spinnerSizeClassNames[size]}`;

  return (
    <span
      {...props}
      className={spinnerClassName}
      data-slot="spinner"
      role="status"
      aria-label={ariaLabel}
    >
      <ProductLogo
        className="spinner__logo"
        size={size}
        alt=""
        aria-hidden="true"
        style={{ width: "100%", height: "100%" }}
      />
    </span>
  );
}

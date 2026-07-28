import { Text, TextField } from "@radix-ui/themes";
import { useEffect, useState } from "react";

import { hexToRgb, normalizeHexColor, rgbToHex } from "../lib/theme-customization";

interface ThemeColorFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function ThemeColorField({
  label,
  value,
  disabled = false,
  onChange,
}: ThemeColorFieldProps) {
  const normalizedValue = normalizeHexColor(value, "#000000");
  const [draftHex, setDraftHex] = useState(normalizedValue);
  const rgb = hexToRgb(normalizedValue);

  useEffect(() => setDraftHex(normalizedValue), [normalizedValue]);

  const commitHex = () => {
    const nextValue = normalizeHexColor(draftHex, "");
    if (!nextValue) {
      setDraftHex(normalizedValue);
      return;
    }
    setDraftHex(nextValue);
    if (nextValue !== normalizedValue) onChange(nextValue);
  };

  const updateChannel = (channel: "red" | "green" | "blue", rawValue: string) => {
    const parsedValue = Number.parseInt(rawValue, 10);
    const nextRgb = { ...rgb, [channel]: Number.isFinite(parsedValue) ? parsedValue : 0 };
    onChange(rgbToHex(nextRgb.red, nextRgb.green, nextRgb.blue));
  };

  return (
    <div className="theme-color-field">
      <Text
        size="2"
        weight="medium"
        className="theme-color-field__label"
      >
        {label}
      </Text>

      <div className="theme-color-field__controls">
        <label className="theme-color-field__picker-shell">
          <span className="settings-dialog-visually-hidden">{label}</span>
          <input
            type="color"
            className="theme-color-field__picker"
            value={normalizedValue}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value.toLowerCase())}
          />
        </label>

        <TextField.Root
          size="2"
          className="theme-color-field__hex"
          value={draftHex}
          disabled={disabled}
          aria-label={`${label} HEX`}
          onChange={(event) => setDraftHex(event.target.value)}
          onBlur={commitHex}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitHex();
              event.currentTarget.blur();
            }
          }}
        />

        <div
          className="theme-color-field__rgb"
          aria-label={`${label} RGB`}
        >
          {(
            [
              ["R", "red", rgb.red],
              ["G", "green", rgb.green],
              ["B", "blue", rgb.blue],
            ] as const
          ).map(([channelLabel, channel, channelValue]) => (
            <label
              key={channel}
              className="theme-color-field__channel"
            >
              <span>{channelLabel}</span>
              <input
                type="number"
                min="0"
                max="255"
                inputMode="numeric"
                value={channelValue}
                disabled={disabled}
                aria-label={`${label} ${channelLabel}`}
                onChange={(event) => updateChannel(channel, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

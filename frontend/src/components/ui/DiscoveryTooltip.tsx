"use client";

import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { useDiscovery } from "@/app/hooks/useDiscovery";

interface DiscoveryTooltipProps {
  featureKey: 'command_palette' | 'upload_button' | 'bookmark_button';
  text: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function DiscoveryTooltip({
  featureKey,
  text,
  children,
  side = "bottom",
  align = "center",
}: DiscoveryTooltipProps) {
  const { isVisible, dismiss } = useDiscovery(featureKey);

  // If not visible, just return the children to avoid unnecessary DOM overhead
  if (!isVisible) {
    return <>{children}</>;
  }

  return (
    <Tooltip.Root open={true}>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          align={align}
          sideOffset={8}
          className="z-[100] animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 max-w-[250px] overflow-hidden rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold shadow-xl ring-1 ring-black/5"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 leading-tight">{text}</div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss();
              }}
              className="mt-0.5 rounded-full p-0.5 hover:bg-primary-foreground/20 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              aria-label="Dismiss tooltip"
            >
              <X size={14} />
            </button>
          </div>
          <Tooltip.Arrow className="fill-primary" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

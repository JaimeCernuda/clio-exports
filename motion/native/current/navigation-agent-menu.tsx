import type { ComponentProps } from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { BrandIcon } from "@clio-ui/components/clio/brand-icon";
import { ClioMenuContent } from "@clio-ui/components/clio/clio-menu";
import { SidebarMenuButton } from "@clio-ui/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@clio-ui/components/ui/dropdown-menu";

/** Native navigation appearance without an uncaptured live-stream or release probe. */
export function NavigationAgentMenu(
  props: ComponentProps<typeof ClioMenuContent>,
) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          aria-label="CLIO: offline archive"
          className="h-11 min-w-0 flex-1 gap-2.5 px-1.5"
          size="lg"
          tooltip="CLIO: offline archive"
        >
          <BrandIcon className="size-[26px]! shrink-0 text-primary" />
          <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate font-heading text-h3 font-semibold">
                CLIO
              </span>
              <ChevronsUpDownIcon
                aria-hidden
                className="size-3.5 shrink-0 text-faint"
              />
            </span>
            <span className="truncate text-label text-muted-foreground">
              Offline archive
            </span>
          </span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <ClioMenuContent {...props} live={false} />
    </DropdownMenu>
  );
}

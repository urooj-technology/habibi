import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarContext, useSidebar } from "@/components/ui/sidebar-context";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
/** Explicit pixel widths — wide enough for indented submenu labels. */
const SIDEBAR_WIDTH_PX = 288; // 18rem
const SIDEBAR_WIDTH_MOBILE_PX = 300;
const SIDEBAR_WIDTH_ICON_PX = 56;
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarProvider = React.forwardRef(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      style: _style,
      className,
      children,
      ...props
    },
    ref
  ) => {
    void _style;
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    React.useEffect(() => {
      const handleKeyDown = (event) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              "group/sidebar-wrapper flex h-full max-h-full min-h-0 w-full min-w-0 max-w-full items-stretch overflow-hidden bg-background",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = React.forwardRef(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    const collapsed = state === "collapsed";
    const iconMode = collapsed && collapsible === "icon";
    const desktopWidth = iconMode ? SIDEBAR_WIDTH_ICON_PX : SIDEBAR_WIDTH_PX;

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
            className
          )}
          style={{ width: SIDEBAR_WIDTH_PX }}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <>
          {openMobile ? (
            <button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setOpenMobile(false)}
            />
          ) : null}
          <div
            className={cn(
              "fixed inset-y-0 z-50 flex h-svh flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 ease-in-out md:hidden",
              side === "left" ? "left-0 border-r border-sidebar-border" : "right-0 border-l border-sidebar-border",
              openMobile
                ? "translate-x-0"
                : side === "left"
                ? "-translate-x-full"
                : "translate-x-full",
              className
            )}
            style={{ width: SIDEBAR_WIDTH_MOBILE_PX }}
            ref={ref}
            {...props}
          >
            <div
              data-sidebar="sidebar"
              className="flex h-full w-full min-w-0 flex-col"
              style={{ padding: "12px 16px", boxSizing: "border-box" }}
            >
              {children}
            </div>
          </div>
        </>
      );
    }

    // Desktop: flush sidebar beside main content (no outer gap).
    // With document dir=rtl, flex-start is on the right — compensate so
    // side="right" stays visually on the right and side="left" on the left.
    return (
      <aside
        ref={ref}
        className={cn(
          "group peer z-20 hidden h-full min-h-0 shrink-0 grow-0 flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out md:flex",
          side === "right"
            ? "order-last border-l rtl:order-first"
            : "border-r rtl:order-last",
          className
        )}
        style={{ width: desktopWidth, minWidth: desktopWidth, maxWidth: desktopWidth }}
        data-state={state}
        data-collapsible={collapsed ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full min-w-0 flex-col group-data-[collapsible=icon]:!px-1.5 group-data-[collapsible=icon]:!py-1.5"
          style={{ padding: "12px 16px", boxSizing: "border-box" }}
        >
          {children}
        </div>
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarInset = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "relative z-0 flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-background",
        className
      )}
      {...props}
    />
  );
});
SidebarInset.displayName = "SidebarInset";

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex min-w-0 shrink-0 flex-col gap-2 py-1", className)}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "mt-auto flex min-w-0 shrink-0 flex-col gap-2 border-t border-sidebar-border pt-2",
        className
      )}
      {...props}
    />
  );
});
SidebarFooter.displayName = "SidebarFooter";

const SidebarSeparator = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      className={cn("mx-0 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
});
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-2",
        className
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        className={cn(
          "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60 transition-[margin,opacity] ease-linear",
          "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("w-full text-sm", className)} {...props} />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex w-full min-w-0 flex-col gap-1 px-0", className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("group/menu-item relative flex w-full min-w-0 flex-col", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex min-w-0 items-center gap-2 overflow-hidden rounded-md px-2.5 py-2 text-start text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pe-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:!mx-auto group-data-[collapsible=icon]:justify-center [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:[&>span]:hidden group-data-[collapsible=icon]:[&>svg:last-child]:hidden",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-border))]",
      },
      size: {
        default: "h-9 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const SidebarMenuButton = React.forwardRef(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    if (!tooltip) {
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = { children: tooltip };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side={
            typeof document !== "undefined" && document.documentElement.dir === "rtl"
              ? "left"
              : "right"
          }
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuSub = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "ms-2 me-0 flex min-w-0 flex-col gap-0.5 border-s border-sidebar-border ps-2.5 pe-0 py-1",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
));
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("min-w-0", className)} {...props} />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef(
  ({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";

    return (
      <Comp
        ref={ref}
        data-sidebar="menu-sub-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          "flex h-8 min-w-0 items-center gap-2 rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
          "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          "group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
};

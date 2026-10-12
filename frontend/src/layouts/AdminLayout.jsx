import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import usePermissions from "../hooks/usePermissions";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  Users,
  IdCard,
  Database,
  ShieldCheck,
  ChevronDown,
  Globe,
  User,
  LogOut,
  Menu as MenuIcon,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "dashboard.title",
    path: "/app/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    title: "inventory.title",
    path: "/app/inventory",
    icon: Package,
    permission: "inventory.view",
    submenu: [
      {
        title: "inventory.categories",
        path: "/app/inventory/categories",
        permission: "inventory.view",
      },
      {
        title: "inventory.products",
        path: "/app/inventory/products",
        permission: "inventory.view",
      },
      {
        title: "inventory.stock",
        path: "/app/inventory/stock",
        permission: "inventory.view",
      },
    ],
  },
  {
    title: "sales.title",
    path: "/app/sales",
    icon: ShoppingCart,
    permission: "sales.view",
    submenu: [
      {
        title: "sales.invoices",
        path: "/app/sales",
        permission: "sales.view",
      },
      {
        title: "saleReturn.returnsList",
        path: "/app/sales/returns",
        permission: "sale_returns.view",
      },
    ],
  },
  {
    title: "purchases.title",
    path: "/app/purchases",
    icon: Receipt,
    permission: "purchases.view",
    submenu: [
      {
        title: "purchases.bills",
        path: "/app/purchases",
        permission: "purchases.view",
      },
    ],
  },
  {
    title: "accounting.title",
    path: "/app/accounting",
    icon: Wallet,
    permission: "accounting.view",
    submenu: [
      {
        title: "accounting.accounts",
        path: "/app/accounting/accounts",
        permission: "accounting.view",
      },
      {
        title: "accounting.journalEntries",
        path: "/app/accounting/journal-entries",
        permission: "accounting.view",
      },
      {
        title: "accounting.trialBalance",
        path: "/app/accounting/trial-balance",
        permission: "accounting.view",
      },
      {
        title: "accounting.reports",
        path: "/app/accounting/reports",
        permission: "accounting.view",
      },
      {
        title: "accountantTools.openingBalances",
        path: "/app/accounting/opening-balances",
        permission: "accounting.view",
      },
    ],
  },
  {
    title: "contacts.title",
    path: "/app/contacts",
    icon: Users,
    permission: "contacts.view",
    submenu: [
      {
        title: "contacts.customers",
        path: "/app/contacts/customers",
        permission: "contacts.view",
      },
      {
        title: "contacts.suppliers",
        path: "/app/contacts/suppliers",
        permission: "contacts.view",
      },
    ],
  },
  {
    title: "hr.title",
    path: "/app/hr",
    icon: IdCard,
    permission: "hr.view",
    submenu: [
      { title: "hr.employees", path: "/app/hr/employees", permission: "hr.view" },
      {
        title: "hr.payrollRuns",
        path: "/app/hr/payroll-runs",
        permission: "hr.view",
      },
    ],
  },
  {
    title: "backup.title1",
    path: "/app/backup",
    icon: Database,
    permission: "backup.view",
  },
  {
    title: "user.title",
    path: "/app/user",
    icon: ShieldCheck,
    permission: ["users.view", "roles.view"],
    submenu: [
      {
        title: "user.users",
        path: "/app/user/users",
        permission: "users.view",
      },
      {
        title: "roles.title",
        path: "/app/user/roles",
        permission: "roles.view",
      },
    ],
  },
];

function itemAllowed(item, can, canAny) {
  if (!item.permission) return true;
  if (Array.isArray(item.permission)) return canAny(item.permission);
  return can(item.permission);
}

const AdminLayoutContent = ({ children, direction, filteredMenuItems, isMenuActive, t, navigate, auth, i18n }) => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  // Auto-expand active submenu on route change; close mobile drawer after navigate
  useEffect(() => {
    filteredMenuItems.forEach((item) => {
      if (item.submenu && isMenuActive(item.path)) {
        setExpandedMenus((prev) => ({ ...prev, [item.title]: true }));
      }
    });
    if (isMobile) setOpenMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleMenu = (title) => {
    setExpandedMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <>
      <Sidebar side={direction === "rtl" ? "right" : "left"} collapsible="icon">
        <SidebarHeader>
          <div className="flex min-w-0 items-center gap-2.5 px-0.5 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <img
              src="/image/Logo.png"
              alt={t("common.shortName", "ERP")}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                {t("common.shortName", "Haji Nasrullah ERP")}
              </p>
              <p
                className="truncate text-[11px] leading-tight text-muted-foreground"
                title={t("common.nameProject")}
              >
                {t("common.nameProject")}
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const filteredSubmenu = item.submenu || null;
                const Icon = item.icon;
                const active = isMenuActive(item.path);

                if (item.submenu && filteredSubmenu.length > 0) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={!!expandedMenus[item.title]}
                      onOpenChange={() => toggleMenu(item.title)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={active} tooltip={t(item.title)}>
                            <Icon />
                            <span>{t(item.title)}</span>
                            <ChevronDown
                              className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                                expandedMenus[item.title] ? "rotate-180" : ""
                              }`}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {filteredSubmenu.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  isActive={isMenuActive(subItem.path)}
                                  onClick={() => navigate(subItem.path)}
                                  className="cursor-pointer"
                                >
                                  <span className="truncate">{t(subItem.title)}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => navigate(item.path)}
                      tooltip={t(item.title)}
                    >
                      <Icon />
                      <span>{t(item.title)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex min-w-0 items-center gap-2 px-0.5 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
              <p
                className="truncate text-sm font-medium text-sidebar-foreground"
                title={auth?.user?.user?.name || auth?.user?.user?.email || ""}
              >
                {auth?.user?.user?.name || auth?.user?.user?.email || ""}
              </p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {auth?.user?.user?.role?.name ||
                  (auth?.user?.user?.is_admin ? "Admin" : "")}
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <SidebarTrigger aria-label={t("common.accessibility.openNavigation")}>
            <MenuIcon className="h-5 w-5" />
          </SidebarTrigger>

          <h1 className="flex-1 truncate text-base font-semibold text-foreground">
            {t("dashboard.welcome")}
          </h1>

          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("settings.language")}>
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={direction === "rtl" ? "start" : "end"}>
              <DropdownMenuItem onClick={() => changeLanguage("en")}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("da")}>
                دری
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("ps")}>
                پښتو
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NotificationBell align={direction === "rtl" ? "start" : "end"} />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={direction === "rtl" ? "start" : "end"}>
              <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                <User className="h-4 w-4" />
                {t("common.profile")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  auth.logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                {t("auth.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto p-3 sm:p-6">
          <div className="flex min-w-0 max-w-full flex-1 flex-col">
            {children}
            <footer className="mt-auto border-t border-border bg-muted/40 py-3 text-center text-xs text-muted-foreground sm:text-sm">
              © {new Date().getFullYear()} {"  "}
              {t("common.shortName", "ERP")}
              {"  "}
              {t("common.allRightsReserved")}
              {"  "}
            </footer>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

const AdminLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [direction, setDirection] = useState(document.dir || "ltr");
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { can, canAny } = usePermissions();

  // Set direction based on current language on mount and when language changes
  useEffect(() => {
    const dir = ["da", "ps"].includes(i18n.language) ? "rtl" : "ltr";
    setDirection(dir);
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.lang = i18n.language || "en";
    document.body.style.direction = dir;
  }, [i18n.language]);

  const filteredMenuItems = useMemo(() => {
    return menuItems
      .map((item) => {
        if (item.submenu?.length) {
          const submenu = item.submenu.filter((sub) =>
            itemAllowed(sub, can, canAny)
          );
          if (!submenu.length && !itemAllowed(item, can, canAny)) {
            return null;
          }
          if (!submenu.length) return null;
          return { ...item, submenu };
        }
        return itemAllowed(item, can, canAny) ? item : null;
      })
      .filter(Boolean);
  }, [can, canAny]);

  const isMenuActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <SidebarProvider
      dir={direction}
      className="h-full w-full"
    >
      <AdminLayoutContent
        direction={direction}
        filteredMenuItems={filteredMenuItems}
        isMenuActive={isMenuActive}
        t={t}
        navigate={navigate}
        auth={auth}
        i18n={i18n}
      >
        {children}
      </AdminLayoutContent>
    </SidebarProvider>
  );
};

export default AdminLayout;

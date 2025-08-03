import { Link, useLocation } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Users,
  Settings,
  BarChart2,
  Package,
  Globe,
  Mail,
  Bot,
  Palette,
  Moon,
  Sun,
  Laptop,
  ChevronRight,
  FolderOpen,
  FileText,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { SiteSwitcher } from "./SiteSwitcher";
import { useTheme } from "@/hooks/use-theme";

const navigation = [
  {
    title: "Tableau de bord",
    items: [
      {
        title: "Vue d'ensemble",
        href: "/",
        icon: LayoutDashboard,
        badge: null,
      },
      {
        title: "WordPress",
        href: "/wordpress",
        icon: Globe,
        badge: null,
      },
      {
        title: "WooCommerce",
        href: "/woocommerce",
        icon: ShoppingCart,
        badge: null,
      },
      {
        title: "Analytics",
        href: "/statistics",
        icon: BarChart2,
        badge: "Pro",
        badgeVariant: "secondary" as const,
      },
    ],
  },
  {
    title: "Gestion",
    items: [
      {
        title: "Campagnes",
        href: "/campaigns",
        icon: Mail,
        badge: "3",
        badgeVariant: "default" as const,
      },
      {
        title: "Commandes",
        href: "/orders",
        icon: Package,
        badge: null,
      },
      {
        title: "Clients",
        href: "/customers",
        icon: Users,
        badge: null,
      },
      {
        title: "Produits",
        href: "/products",
        icon: FolderOpen,
        badge: null,
        subItems: [
          {
            title: "Tous les produits",
            href: "/products",
          },
          {
            title: "Catégories",
            href: "/products/categories",
          },
          {
            title: "Inventaire",
            href: "/products/inventory",
          },
        ],
      },
    ],
  },
  {
    title: "Outils",
    items: [
      {
        title: "Assistant IA",
        href: "/ai-assistant",
        icon: Bot,
        badge: "Beta",
        badgeVariant: "outline" as const,
      },
      {
        title: "SEO & Contenu",
        href: "/seo",
        icon: FileText,
        badge: null,
      },
      {
        title: "Automatisations",
        href: "/automations",
        icon: Zap,
        badge: null,
      },
    ],
  },
];

const bottomNavigation = [
  {
    title: "Paramètres",
    href: "/settings/sites",
    icon: Settings,
  },
  {
    title: "Thème",
    icon: Palette,
    action: "theme",
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const handleThemeChange = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4" />;
    if (theme === "dark") return <Moon className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />;
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Globe className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">WPHQ</span>
            <span className="text-xs text-muted-foreground">Hub WordPress</span>
          </div>
        </div>
        <div className="mt-4">
          <SiteSwitcher />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href || item.title}>
                    {item.subItems ? (
                      <>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href)}
                          tooltip={state === "collapsed" ? item.title : undefined}
                        >
                          <Link to={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                          </Link>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(subItem.href)}
                              >
                                <Link to={subItem.href}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={state === "collapsed" ? item.title : undefined}
                      >
                        <Link to={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={item.badgeVariant || "default"}
                              className="ml-auto"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {bottomNavigation.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.action === "theme" ? (
                <SidebarMenuButton
                  onClick={handleThemeChange}
                  tooltip={state === "collapsed" ? `Thème: ${theme}` : undefined}
                >
                  {getThemeIcon()}
                  <span>Thème: {theme}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href!)}
                  tooltip={state === "collapsed" ? item.title : undefined}
                >
                  <Link to={item.href!}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>
                  {user?.displayName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-xs">
                <span className="font-medium">
                  {user?.displayName || "Utilisateur"}
                </span>
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <Users className="mr-2 h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
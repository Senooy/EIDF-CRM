import { Bell, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SyncStatusButton } from "@/components/SyncStatus";

const searchCommands = [
  {
    group: "Navigation",
    items: [
      { title: "Dashboard", href: "/", keywords: ["home", "accueil"] },
      { title: "WordPress", href: "/wordpress", keywords: ["wp", "site"] },
      { title: "WooCommerce", href: "/woocommerce", keywords: ["shop", "boutique"] },
      { title: "Campagnes", href: "/campaigns", keywords: ["email", "marketing"] },
      { title: "Commandes", href: "/orders", keywords: ["orders", "ventes"] },
      { title: "Clients", href: "/customers", keywords: ["users", "utilisateurs"] },
      { title: "Produits", href: "/products", keywords: ["items", "articles"] },
    ],
  },
  {
    group: "Actions",
    items: [
      { title: "Nouvelle campagne", href: "/campaigns/create", keywords: ["create", "new"] },
      { title: "Ajouter un site", href: "/settings/sites", keywords: ["add", "config"] },
      { title: "Synchroniser", action: "sync", keywords: ["refresh", "update"] },
    ],
  },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Nouvelle commande", message: "Commande #1234 reçue", unread: true },
    { id: 2, title: "Stock faible", message: "Le produit 'T-shirt' est presque épuisé", unread: true },
    { id: 3, title: "Campagne terminée", message: "La campagne 'Soldes d'été' est terminée", unread: false },
  ]);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleCommand = (item: any) => {
    if (item.href) {
      navigate(item.href);
      setOpen(false);
    } else if (item.action === "sync") {
      // Trigger sync action
      setOpen(false);
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    );
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
        <SidebarTrigger className="md:hidden" />
        
        <div className="flex-1 flex items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher... (Cmd+K)"
              className="pl-8 pr-8 bg-muted/50"
              onClick={() => setOpen(true)}
              readOnly
            />
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SyncStatusButton />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3",
                      notification.unread && "bg-muted/50"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {notification.unread && (
                        <Badge variant="secondary" className="ml-auto h-2 w-2 p-0 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center">
                Voir toutes les notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tapez une commande ou recherchez..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          {searchCommands.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.title}
                  onSelect={() => handleCommand(item)}
                >
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
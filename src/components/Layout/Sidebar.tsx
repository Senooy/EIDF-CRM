
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  ShoppingCart,
  Users,
  Settings,
  BarChart2,
  Package,
  Globe,
  Mail,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "WordPress", href: "/wordpress", icon: Globe },
  { name: "WooCommerce", href: "/woocommerce", icon: ShoppingCart },
  { name: "Campagnes", href: "/campaigns", icon: Mail },
  { name: "Commandes", href: "/orders", icon: Package },
  { name: "Clients", href: "/customers", icon: Users },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Paramètres", href: "/settings/sites", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  
  return (
    <aside className="w-64 border-r border-gray-100 bg-gray-50 h-screen flex-shrink-0 hidden md:block">
      <div className="h-full py-6 flex flex-col justify-between">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = 
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
              
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-gray-900" : "text-gray-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="px-4">
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-xs text-gray-500">
              EIDF v1.0.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

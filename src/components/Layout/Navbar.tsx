
import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Navbar = () => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-lg">EIDF</span>
          <div className="hidden md:flex relative">
            <Input
              placeholder="Rechercher..."
              className="w-64 pl-10 bg-gray-50 border-gray-200"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

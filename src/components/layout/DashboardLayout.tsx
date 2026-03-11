import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShoppingCart,
  Tags,
  ClipboardList,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Package, label: 'Productos', href: '/productos' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: ShoppingCart, label: 'Ventas', href: '/ventas' },
  { icon: ClipboardList, label: 'Movimientos', href: '/inventario' },
  { icon: BarChart2, label: 'Reportes', href: '/reportes' },
  { icon: Tags, label: 'Categorías', href: '/categorias', adminOnly: true },
  { icon: Users, label: 'Usuarios', href: '/usuarios', adminOnly: true },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Inventario</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {isAdmin && <ShieldCheck className="h-3 w-3" />}
                  {role === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed top-16 left-0 bottom-0 w-64 bg-sidebar-background border-r border-sidebar-border z-40 transform transition-transform duration-200 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                onClick={() => {
                  navigate(item.href);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 bottom-0 flex-col bg-sidebar-background border-r border-sidebar-border transition-all duration-300 z-40',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className={cn(
          'h-16 flex items-center border-b border-sidebar-border',
          sidebarOpen ? 'px-6' : 'justify-center'
        )}>
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            {sidebarOpen && <span className="font-semibold text-sidebar-foreground">Inventario</span>}
          </div>
        </div>

        <nav className={cn('flex-1 p-4 space-y-1', !sidebarOpen && 'px-2')}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full gap-3',
                  sidebarOpen ? 'justify-start' : 'justify-center',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                onClick={() => navigate(item.href)}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && item.label}
              </Button>
            );
          })}
        </nav>

        <div className={cn(
          'p-4 border-t border-sidebar-border',
          !sidebarOpen && 'px-2'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </aside>

      {/* Desktop Header */}
      <header
        className={cn(
          'hidden lg:flex fixed top-0 right-0 h-16 bg-card border-b border-border items-center justify-between px-6 z-30 transition-all duration-300',
          sidebarOpen ? 'left-64' : 'left-20'
        )}
      >
        <div></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {isAdmin && <ShieldCheck className="h-3 w-3" />}
                  {role === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {role === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 lg:pt-16 min-h-screen transition-all duration-300',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
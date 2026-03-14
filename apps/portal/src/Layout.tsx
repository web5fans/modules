import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useKeystore } from '@/contexts/KeystoreContext';
import { KEY_STORE_URL } from 'keystore/constants';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutGrid, 
  Settings, 
  Wifi, 
  WifiOff,
  LogOut,
  Globe
} from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const { user, isLoggedIn, logout } = useUser();
  const { connected } = useKeystore();

  const navItems = [
    { path: '/apps', label: 'Web5 Apps', icon: LayoutGrid },
    { path: '/settings', label: 'User Settings', icon: Settings },
  ];

  const currentTab = location.pathname === '/settings' ? 'settings' : 'apps';

  if (!isLoggedIn) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Web5 User Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={KEY_STORE_URL}
              target="_blank"
            >
              <Badge 
                variant={connected ? "default" : "destructive"}
                className="hidden sm:flex items-center gap-1"
              >
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connected ? 'Connected' : 'Offline'}
              </Badge>
            </a>

            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground">{user.pds}</div>
                </div>
                
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={logout}
                  className="hidden sm:flex"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-2">
          <Tabs value={currentTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              {navItems.map((item) => (
                <TabsTrigger key={item.path} value={item.path.slice(1)} asChild>
                  <Link to={item.path} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

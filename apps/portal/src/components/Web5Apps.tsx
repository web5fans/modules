import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, MessageSquare, Wallet, SquareChevronRight, FileText } from 'lucide-react';

interface Web5App {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  category: string;
  status: 'live' | 'beta' | 'coming-soon';
}

const WEB5_APPS: Web5App[] = [
  {
    id: 'BBS',
    name: 'Web5 BBS(dev)',
    description: 'Forum and discussion platform',
    icon: <MessageSquare className="h-8 w-8" />,
    url: 'https://bbsfans.dev',
    category: 'Social',
    status: 'live'
  },
  {
    id: 'DAO',
    name: 'CKB Community Found DAO 1.1(dev)',
    description: 'To support community members in buiding and exploring the ckb ecosystem',
    icon: <Globe className="h-8 w-8" />,
    url: 'https://ccfdao.dev',
    category: 'Community',
    status: 'live'
  },
  {
    id: 'Keystore',
    name: 'Web5 Keystore',
    description: 'A simple web wallet to manager sign key',
    icon: <Wallet className="h-8 w-8" />,
    url: 'https://keystore.web5.fans',
    category: 'Tools',
    status: 'beta'
  },
  {
    id: 'Console',
    name: 'Web5 Console',
    description: 'A full Web5 demo app that composes all basic modules of web5.',
    icon: <SquareChevronRight className="h-8 w-8" />,
    url: 'https://console.web5.fans',
    category: 'Tools',
    status: 'beta'
  },
  {
    id: 'HomePage',
    name: 'Web5fans Official Website',
    description: 'Web5fans Official Website and document of Web5',
    icon: <FileText className="h-8 w-8" />,
    url: 'https://www.web5.fans',
    category: 'Document',
    status: 'live'
  }
];

export function Web5Apps() {
  const handleAppClick = (app: Web5App) => {
    if (app.status === 'coming-soon') {
      return;
    }
    if (app.url !== '#') {
      window.open(app.url, '_blank');
    }
  };

  const getStatusBadge = (status: Web5App['status']) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-500">Live</Badge>;
      case 'beta':
        return <Badge variant="secondary">Beta</Badge>;
      case 'coming-soon':
        return <Badge variant="outline">Coming Soon</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Web5 Apps</h1>
          <p className="text-muted-foreground">
            Discover and launch decentralized applications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {WEB5_APPS.map((app) => (
          <Card 
            key={app.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              app.status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02]'
            }`}
            onClick={() => handleAppClick(app)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {app.icon}
                </div>
                {getStatusBadge(app.status)}
              </div>
              <CardTitle className="text-lg mt-3">{app.name}</CardTitle>
              <CardDescription className="text-xs">
                {app.category}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {app.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, MessageSquare, Image, Music, FileText, Gamepad2, ShoppingBag, Video } from 'lucide-react';

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
    id: 'bbs',
    name: 'Web5 BBS',
    description: 'Decentralized forum and discussion platform',
    icon: <MessageSquare className="h-8 w-8" />,
    url: 'https://web5.bbsfans.dev',
    category: 'Social',
    status: 'live'
  },
  {
    id: 'docs',
    name: 'Web5 Docs',
    description: 'Documentation and guides for Web5 developers',
    icon: <FileText className="h-8 w-8" />,
    url: 'https://docs.web5.fans',
    category: 'Developer',
    status: 'live'
  },
  {
    id: 'gallery',
    name: 'Web5 Gallery',
    description: 'Decentralized image sharing and storage',
    icon: <Image className="h-8 w-8" />,
    url: '#',
    category: 'Media',
    status: 'coming-soon'
  },
  {
    id: 'music',
    name: 'Web5 Music',
    description: 'Own your music. Decentralized streaming platform',
    icon: <Music className="h-8 w-8" />,
    url: '#',
    category: 'Entertainment',
    status: 'beta'
  },
  {
    id: 'video',
    name: 'Web5 Video',
    description: 'Decentralized video sharing platform',
    icon: <Video className="h-8 w-8" />,
    url: '#',
    category: 'Entertainment',
    status: 'coming-soon'
  },
  {
    id: 'market',
    name: 'Web5 Market',
    description: 'Decentralized marketplace for digital goods',
    icon: <ShoppingBag className="h-8 w-8" />,
    url: '#',
    category: 'Commerce',
    status: 'beta'
  },
  {
    id: 'games',
    name: 'Web5 Games',
    description: 'Blockchain gaming platform',
    icon: <Gamepad2 className="h-8 w-8" />,
    url: '#',
    category: 'Gaming',
    status: 'coming-soon'
  },
  {
    id: 'explorer',
    name: 'Web5 Explorer',
    description: 'Explore the Web5 ecosystem',
    icon: <Globe className="h-8 w-8" />,
    url: 'https://web5.fans',
    category: 'Tools',
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

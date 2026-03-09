import { useState, useEffect } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { useUser } from '@/contexts/UserContext';
import { useKeystore } from '@/contexts/KeystoreContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Database, 
  Key, 
  FileDown, 
  Loader2, 
  Check,
  AlertCircle,
  Copy,
  Fingerprint,
  Wallet,
  ChevronDown,
  ChevronRight,
  FileJson
} from 'lucide-react';
import { exportRepoCar, fetchRepoRecords, fetchRepoInfo, AtpAgent, pdsLogin, fetchUserProfile, writePDS } from 'pds_module/logic';
import { updateDidKey, fetchDidCkbCellsInfo } from 'did_module/logic';

export function UserSettings() {
  const { user, logout, updateUser } = useUser();
  const { client } = useKeystore();
  const { wallet, open } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [activeTab, setActiveTab] = useState('data');
  const [collections, setCollections] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, any[]>>({});
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({});

  const toggleRecord = (recordKey: string) => {
    setExpandedRecords(prev => ({
      ...prev,
      [recordKey]: !prev[recordKey]
    }));
  };

  useEffect(() => {
    if (activeTab === 'data' && user) {
      loadRecords();
    }
  }, [activeTab, user]);

  const loadRecords = async () => {
    if (!user) return;
    
    setIsLoadingRecords(true);
    try {
      // Fetch repo info to get dynamic collections
      const repoInfo = await fetchRepoInfo(user.did, user.pds);
      if (!repoInfo || !repoInfo.collections) {
        throw new Error('Could not fetch repo info or collections');
      }
      const dynamicCollections = repoInfo.collections as string[];
      setCollections(dynamicCollections);

      const results: Record<string, unknown[]> = {};
      for (const colId of dynamicCollections) {
        const data = await fetchRepoRecords(user.did, colId, user.pds, 50);
        if (data && data.records) {
          results[colId] = data.records;
        }
      }
      setRecords(results);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const updateDisplayName = async (displayName: string): Promise<boolean> => {
    if (!user || !client) return false;

    try {
      // Create AtpAgent
      const agent = new AtpAgent({
        service: `https://${user.pds}`,
      });

      // Login to PDS
      const loginResult = await pdsLogin(agent, user.did, user.didKey, user.ckbAddress, client);

      if (!loginResult) {
        throw new Error('Failed to login to PDS');
      }

      // Fetch current profile
      const profile = await fetchUserProfile(user.did, user.pds);

      if (!profile) {
        throw new Error('Failed to fetch profile');
      }

      // Update displayName while preserving other fields
      const updatedRecord = {
        ...profile.value,
        $type: 'app.actor.profile',
        displayName: displayName,
      };

      // Write updated record to PDS
      const result = await writePDS(
        agent,
        loginResult.accessJwt,
        user.didKey,
        client,
        {
          record: updatedRecord,
          did: user.did,
          rkey: 'self',
          type: 'update',
        }
      );

      return result === true;
    } catch (err) {
      console.error('Failed to update display name:', err);
      return false;
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    setMessage('');
    
    try {
      const carData = await exportRepoCar(user.did, user.pds);
      if (carData) {
        const blob = new Blob([carData], { type: 'application/vnd.ipld.car' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.username}-backup-${new Date().toISOString().split('T')[0]}.car`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage('Export completed successfully!');
      } else {
        setMessage('Failed to export data');
      }
    } catch (err) {
      setMessage('Error exporting data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!user || !newDisplayName) return;

    setIsUpdatingProfile(true);
    setMessage('');

    try {
      const success = await updateDisplayName(newDisplayName);

      if (success) {
        setMessage('Display name updated successfully!');
        setNewDisplayName('');
      } else {
        setMessage('Failed to update display name');
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update display name');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateSignKey = async () => {
    if (!user || !signer || !client) return;
    
    setMessage('');
    
    try {
      const newDidKey = await client.getDIDKey();
      if (!newDidKey) {
        setMessage('No key available in keystore');
        return;
      }
      
      const didCells = await fetchDidCkbCellsInfo(signer!);
      
      if (didCells.length === 0) {
        setMessage('No DID cell found');
        return;
      }
      
      const cell = didCells[0];
      await updateDidKey(signer, cell.args, newDidKey);
      
      updateUser({ didKey: newDidKey });
      setMessage('Sign key updated successfully!');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update sign key');
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
            <CardDescription>
              Please complete registration to access your settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-2xl">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{user.username}</h1>
          <p className="text-muted-foreground">
            @{user.username}.{user.pds.split('.')[0]}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {user.pds}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="data">
            <Database className="h-4 w-4 mr-2" />
            My Data
          </TabsTrigger>
          <TabsTrigger value="manage">
            <User className="h-4 w-4 mr-2" />
            Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your Web5 identity details and blockchain addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* DID Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">DID (Decentralized Identifier)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono truncate"
                    title={user.did}
                  >
                    {user.did.slice(0, 25)}...{user.did.slice(-15)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.did, 'did')}
                    className="shrink-0"
                  >
                    {copiedField === 'did' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* DID Key Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">DID Key</Label>
                </div>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono truncate"
                    title={user.didKey}
                  >
                    {user.didKey.slice(0, 25)}...{user.didKey.slice(-15)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.didKey, 'didKey')}
                    className="shrink-0"
                  >
                    {copiedField === 'didKey' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* CKB Address Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">CKB Address</Label>
                </div>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono truncate"
                    title={user.ckbAddress}
                  >
                    {user.ckbAddress}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.ckbAddress, 'ckbAddress')}
                    className="shrink-0"
                  >
                    {copiedField === 'ckbAddress' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                PDS Records
              </CardTitle>
              <CardDescription>
                Your data stored on {user.pds}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecords ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading records...
                </div>
              ) : collections.length > 0 ? (
                <div className="space-y-4">
                  {collections.map((colId) => {
                    const colRecords = records[colId] || [];
                    return (
                      <div key={colId} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">{colId}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {colRecords.length} record{colRecords.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="p-3 space-y-2">
                          {colRecords.length > 0 ? (
                            colRecords.map((record, idx) => {
                              const recordKey = `${colId}-${idx}`;
                              const isExpanded = expandedRecords[recordKey];
                              return (
                                <div key={idx} className="border rounded-md bg-card">
                                  <button
                                    onClick={() => toggleRecord(recordKey)}
                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <code className="text-xs font-mono text-muted-foreground truncate">
                                        {record.uri.split('/').pop()}
                                      </code>
                                    </div>
                                    <code className="text-xs font-mono text-muted-foreground truncate max-w-[120px] hidden sm:block">
                                      {record.cid.slice(0, 12)}...
                                    </code>
                                  </button>
                                  {isExpanded && (
                                    <div className="px-3 pb-3 pt-1 border-t">
                                      <div className="space-y-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">URI</Label>
                                          <code className="block text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                                            {record.uri}
                                          </code>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">CID</Label>
                                          <code className="block text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                                            {record.cid}
                                          </code>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">Data</Label>
                                          <pre className="text-xs font-mono bg-muted px-2 py-1.5 rounded overflow-x-auto">
                                            {JSON.stringify(record.value, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground px-3 py-2">No records in this collection</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          {!wallet ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Wallet Required
                </CardTitle>
                <CardDescription>
                  Management operations require your CKB wallet to be connected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={open}>Connect Wallet</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Update Display Name
                  </CardTitle>
                  <CardDescription>
                    Change your display name in your profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="Enter new display name"
                    />
                    <Button 
                      onClick={handleUpdateDisplayName}
                      disabled={!newDisplayName || isUpdatingProfile}
                    >
                      {isUpdatingProfile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Update'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Update Sign Key
                  </CardTitle>
                  <CardDescription>
                    Update the signing key associated with your DID
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleUpdateSignKey}>
                    Update Sign Key
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5" />
                    Backup Data
                  </CardTitle>
                  <CardDescription>
                    Export all your PDS data as a CAR file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleExportData}
                    disabled={isExporting}
                    variant="secondary"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Backup
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message.includes('success') ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {message}
            </div>
          )}

          <Separator />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Logout</CardTitle>
              <CardDescription>
                Sign out from DAO World. Your data remains on the PDS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={logout}>
                Logout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

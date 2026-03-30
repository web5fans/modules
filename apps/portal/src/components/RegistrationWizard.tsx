import { useState, useEffect } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { useKeystore } from '@/contexts/KeystoreContext';
import { usePds } from '@/contexts/PdsContext';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Key, Loader2, Wallet, User, Server, FileCheck } from 'lucide-react';
import { buildCreateTransaction, sendCkbTransaction, fetchDidCkbCellsInfo, updateDidKey } from 'did_module/logic';
import { pdsCreateAccount } from 'pds_module/logic';
import type { AtpAgent } from 'web5-api';

const AVAILABLE_PDS_OPTIONS = [
  'web5.bbsfans.dev',
  'web5.ccfdao.dev', 
  'web5.group'
];

interface RegistrationWizardProps {
  onComplete: () => void;
}

interface ExistingDidInfo {
  did: string;
  didKey: string;
  username: string;
  pds: string;
  metadata: string;
}

export function RegistrationWizard({ onComplete }: RegistrationWizardProps) {
  const [step, setStep] = useState<number | 'existing-did'>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { client, connected, didKey, connect, isConnecting } = useKeystore();
  const { agent, checkAvailability, isAvailable, isResolving } = usePds();
  const { login } = useUser();
  const { wallet, open } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [formData, setFormData] = useState({
    username: '',
    pds: AVAILABLE_PDS_OPTIONS[0],
    metadata: ''
  });

  const [createdDid, setCreatedDid] = useState('');
  const [txHash, setTxHash] = useState('');
  const [existingDidInfo, setExistingDidInfo] = useState<ExistingDidInfo | null>(null);
  const [ckbAddress, setCkbAddress] = useState('');
  const [balance, setBalance] = useState<string>('');

  // Helper to get total steps for progress calculation
  const getTotalSteps = () => step === 'existing-did' ? 2 : 6;
  const getCurrentStepNumber = () => step === 'existing-did' ? 2 : (step as number);
  const progress = (getCurrentStepNumber() / getTotalSteps()) * 100;

  // Parse handle from alsoKnownAs format "at://username.pds"
  const parseHandle = (aka: string): { username: string; pds: string } | null => {
    const match = aka.match(/at:\/\/(.+)\.(.+)/);
    if (match) {
      return { username: match[1], pds: match[2] };
    }
    return null;
  };

  // Parse PDS from endpoint "https://pds.host" → "pds.host"
  const parsePdsFromEndpoint = (endpoint: string): string => {
    return endpoint.replace('https://', '');
  };

  // Effect to get wallet info after connection
  useEffect(() => {
    const fetchWalletInfo = async () => {
      if (!signer || step !== 1) return;

      try {
        const address = await signer.getRecommendedAddress();
        setCkbAddress(address);
        
        const balanceResult = await signer.getBalance();
        // Format balance to show as CKB (divide by 100000000)
        const balanceInCkb = (Number(balanceResult) / 100000000).toFixed(4);
        setBalance(balanceInCkb);
      } catch (e: unknown) {
        console.error('Failed to fetch wallet info:', e);
      }
    };

    if (signer) {
      fetchWalletInfo();
    }
  }, [signer, step]);

  // Function to check DID and continue
  const handleCheckDidAndContinue = async () => {
    if (!signer) return;

    setIsLoading(true);
    setError('');

    try {
      const didCells = await fetchDidCkbCellsInfo(signer);
      
      if (didCells.length > 0) {
        // Parse first DID cell
        const didInfo = didCells[0];
        const metadata = JSON.parse(didInfo.didMetadata);
        const didKeyFromMetadata = metadata.verificationMethods?.atproto;
        const alsoKnownAs = metadata.alsoKnownAs?.[0]; // "at://username.pds"
        const pdsEndpoint = metadata.services?.atproto_pds?.endpoint; // "https://pds.host"
        
        // Extract username and pds from alsoKnownAs
        const handleInfo = alsoKnownAs ? parseHandle(alsoKnownAs) : null;
        const username = handleInfo?.username || '';
        const pds = pdsEndpoint ? parsePdsFromEndpoint(pdsEndpoint) : (handleInfo?.pds || '');
        
        // Store this info and go to existing DID flow
        setExistingDidInfo({
          did: didInfo.did,
          didKey: didKeyFromMetadata,
          username,
          pds,
          metadata: didInfo.didMetadata
        });
        setStep('existing-did');
      } else {
        // No DID, continue to registration flow
        setStep(2);
      }
    } catch (e: unknown) {
      console.error('Failed to query DID:', e);
      setError(e instanceof Error ? e.message : 'Failed to query DID');
      setStep(2); // Continue to registration on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = () => {
    if (!wallet) {
      open();
    }
  };

  const handleCheckKeystore = async () => {
    if (connected && didKey) {
      setStep(3);
    } else {
      await connect();
    }
  };

  const handleCheckUsername = async () => {
    if (!formData.username) {
      setError('Please enter a username');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const available = await checkAvailability(formData.username, formData.pds);
    
    if (available) {
      setStep(5);
    } else {
      setError('Username is not available');
    }
    
    setIsLoading(false);
  };

  const handleCreateDid = async () => {
    if (!signer || !client) {
      setError('Wallet or keystore not connected');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const metadata = JSON.stringify({
        services: {
          atproto_pds: {
            type: "AtprotoPersonalDataServer",
            endpoint: `https://${formData.pds}` 
          }
        },
        alsoKnownAs: [`at://${formData.username}.${formData.pds}`],
        verificationMethods: {
          atproto: didKey,
        }
      }, null, 2)
      const { rawTx, did } = await buildCreateTransaction(signer, metadata);
      const txObj = JSON.parse(rawTx);
      
      const hash = await sendCkbTransaction(signer, txObj);
      
      setTxHash(hash);
      setCreatedDid(did);
      setStep(6);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create DID');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPds = async () => {
    if (!agent || !client || !signer || !createdDid) {
      setError('Missing required connections');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const address = await signer.getRecommendedAddress();
      const didKeyStr = await client.getDIDKey();
      
      const result = await pdsCreateAccount(
        agent as AtpAgent,
        formData.pds,
        formData.username,
        didKeyStr,
        createdDid,
        address,
        client
      );

      if (result) {
        login({
          didKey: didKeyStr,
          did: createdDid,
          metadata: formData.metadata,
          username: formData.username,
          pds: formData.pds,
          ckbAddress: address,
          accessJwt: result.accessJwt,
          refreshJwt: result.refreshJwt
        });
        onComplete();
      } else {
        setError('Failed to create PDS account');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register on PDS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteExistingDid = async () => {
    if (!existingDidInfo || !ckbAddress) return;

    setIsLoading(true);
    setError('');

    try {
      login({
        didKey: existingDidInfo.didKey,
        did: existingDidInfo.did,
        metadata: existingDidInfo.metadata,
        username: existingDidInfo.username,
        pds: existingDidInfo.pds,
        ckbAddress: ckbAddress,
        // accessJwt and refreshJwt will be fetched when needed
      });
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSignKey = async () => {
    if (!signer || !client || !existingDidInfo) return;

    setIsLoading(true);
    setError('');

    try {
      const newDidKey = await client.getDIDKey();
      if (!newDidKey) {
        setError('No key available in keystore');
        return;
      }

      const didCells = await fetchDidCkbCellsInfo(signer);

      if (didCells.length === 0) {
        setError('No DID cell found');
        return;
      }

      const cell = didCells[0];
      await updateDidKey(signer, cell.args, newDidKey);

      setExistingDidInfo({
        ...existingDidInfo,
        didKey: newDidKey,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update sign key');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Step 1: Connect CKB Wallet
              </CardTitle>
              <CardDescription>
                Connect your CKB wallet first. We'll check if you already have an existing DID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!wallet ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>No wallet connected</span>
                </div>
              ) : signer ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span>Wallet connected</span>
                  </div>
                  
                  {ckbAddress && (
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <div className="text-sm break-all font-mono">
                          {ckbAddress.slice(0, 20)}...{ckbAddress.slice(-8)}
                        </div>
                      </div>
                      {balance && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Balance</Label>
                          <div className="text-lg font-semibold">{balance} CKB</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span>Wallet connected</span>
                </div>
              )}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking for existing DID...
                </div>
              )}
              
              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {!wallet ? (
                <div />
              ) : (
                <Button variant="outline" onClick={open}>
                  Wallet Settings
                </Button>
              )}
              <Button 
                onClick={wallet ? handleCheckDidAndContinue : handleConnectWallet} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {wallet ? 'Continue' : 'Connect Wallet'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'existing-did':
        const keyMatches = connected && didKey === existingDidInfo?.didKey;
        
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Existing DID Found
              </CardTitle>
              <CardDescription>
                You already have a DID. Complete registration by connecting the correct keypair.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingDidInfo && (
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div><strong>Your DID:</strong> {existingDidInfo.did}</div>
                  <div><strong>Username:</strong> {existingDidInfo.username}</div>
                  <div><strong>PDS:</strong> {existingDidInfo.pds}</div>
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="font-semibold text-amber-600 mb-1">Required Keypair:</div>
                    <code className="text-xs break-all bg-background p-1 rounded">
                      {existingDidInfo.didKey}
                    </code>
                  </div>
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="font-semibold text-blue-600 mb-1">Current Keystore Key:</div>
                    {connected && didKey ? (
                      <code className="text-xs break-all bg-background p-1 rounded">
                        {didKey}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">Not connected</span>
                    )}
                  </div>
                </div>
              )}
              
              {keyMatches ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span>Keypair matches! You can complete registration.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>Please switch to the required keypair in Keystore.</span>
                </div>
              )}
              
              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={connect} disabled={isConnecting}>
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isConnecting ? 'Connecting...' : 'Connect Keystore'}
              </Button>
              {keyMatches ? (
                <Button onClick={handleCompleteExistingDid} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Complete Registration
                </Button>
              ) : connected && didKey ? (
                <Button onClick={handleUpdateSignKey} disabled={isLoading} variant="secondary">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Key
                </Button>
              ) : (
                <Button disabled>
                  Complete Registration
                </Button>
              )}
            </CardFooter>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Step 2: Create or Import Sign Key
              </CardTitle>
              <CardDescription>
                You need a signing key to register. Create one in the keystore or import an existing key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span>Keystore connected</span>
                  {didKey && (
                    <Badge variant="outline" className="ml-2">
                      {didKey.slice(0, 15)}...{didKey.slice(-4)}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>Keystore not connected</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCheckKeystore} disabled={!connected}>
                {connected ? 'Continue' : 'Open Keystore'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 3:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Step 3: Select PDS
              </CardTitle>
              <CardDescription>
                Choose a Personal Data Server to host your data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>PDS Server</Label>
                <Select 
                  value={formData.pds} 
                  onValueChange={(value) => setFormData({ ...formData, pds: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_PDS_OPTIONS.map(pds => (
                      <SelectItem key={pds} value={pds}>{pds}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>Continue</Button>
            </CardFooter>
          </Card>
        );

      case 4:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Step 4: Choose Username
              </CardTitle>
              <CardDescription>
                Select a unique username for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="your-username"
                  />
                  <Button 
                    onClick={handleCheckUsername} 
                    disabled={isLoading || !formData.username}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                  </Button>
                </div>
                
                {isResolving && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking availability...
                  </div>
                )}
                
                {isAvailable === true && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    Username is available!
                  </div>
                )}
                
                {isAvailable === false && !isResolving && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Username is not available
                  </div>
                )}
              </div>
              
              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleCheckUsername} disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Continue'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 5:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Step 5: Create On-Chain Identity
              </CardTitle>
              <CardDescription>
                Create your DID on the CKB blockchain. This requires a small amount of CKB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div><strong>Username:</strong> {formData.username}</div>
                <div><strong>PDS:</strong> {formData.pds}</div>
              </div>
              
              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} disabled={isLoading}>Back</Button>
              <Button onClick={handleCreateDid} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Identity
              </Button>
            </CardFooter>
          </Card>
        );

      case 6:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Step 6: Register on PDS
              </CardTitle>
              <CardDescription>
                Complete your registration by creating your PDS account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {txHash && (
                <div className="text-sm">
                  <strong>Transaction Hash:</strong> {txHash.slice(0, 20)}...{txHash.slice(-8)}
                </div>
              )}
              
              {createdDid && (
                <div className="text-sm">
                  <strong>Your DID:</strong> {createdDid.slice(0, 25)}...{createdDid.slice(-8)}
                </div>
              )}
              
              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(5)} disabled={isLoading}>Back</Button>
              <Button onClick={handleRegisterPds} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Complete Registration
              </Button>
            </CardFooter>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 space-y-6">
      <div className="w-full max-w-lg space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {step === 'existing-did' 
              ? 'Step 2 of 2' 
              : `Step ${step} of ${getTotalSteps()}`}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {renderStep()}
    </div>
  );
}

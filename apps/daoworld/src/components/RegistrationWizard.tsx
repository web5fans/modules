import { useState } from 'react';
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
import { KEY_STORE_URL } from 'keystore/constants';
import { buildCreateTransaction, sendCkbTransaction } from 'did_module/logic';
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

export function RegistrationWizard({ onComplete }: RegistrationWizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { client, connected, didKey } = useKeystore();
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

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleCheckKeystore = () => {
    if (connected && didKey) {
      setStep(2);
    } else {
      window.open(KEY_STORE_URL, '_blank');
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
      setStep(4);
    } else {
      setError('Username is not available');
    }
    
    setIsLoading(false);
  };

  const handleConnectWallet = () => {
    if (wallet) {
      setStep(5);
    } else {
      open();
    }
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Step 1: Create or Import Sign Key
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
              <Button variant="outline" onClick={() => window.open(KEY_STORE_URL, '_blank')}>
                Open Keystore
              </Button>
              <Button onClick={handleCheckKeystore} disabled={!connected}>
                {connected ? 'Continue' : 'Check Connection'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Step 2: Select PDS
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
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </CardFooter>
          </Card>
        );

      case 3:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Step 3: Choose Username
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
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleCheckUsername} disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Continue'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 4:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Step 4: Connect CKB Wallet
              </CardTitle>
              <CardDescription>
                Connect your CKB wallet to create your on-chain identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wallet ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span>Wallet connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>No wallet connected</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleConnectWallet}>
                {wallet ? 'Continue' : 'Connect Wallet'}
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
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {renderStep()}
    </div>
  );
}

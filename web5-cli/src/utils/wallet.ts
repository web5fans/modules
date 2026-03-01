import { CKB_SK_PATH, keyExists, readKey, writeKey, removeKey, error, success, hexFromBytes, readJsonFile } from './common.js'
import { ccc } from '@ckb-ccc/ccc'

export type TransactionStatus =
  | 'sent'
  | 'pending'
  | 'proposed'
  | 'committed'
  | 'unknown'
  | 'rejected'

export interface WalletManager {
  newWallet(): Promise<void>
  importWallet(sk: string): Promise<void>
  clean(): Promise<void>
  getAddress(): Promise<void>
  sendTx(txPath: string): Promise<void>
  checkTx(txHash: string): Promise<void>
  balance(): Promise<void>
}

function getNetwork(): 'ckb_testnet' | 'ckb' {
  const network = process.env.CKB_NETWORK
  if (network === 'ckb') return 'ckb'
  return 'ckb_testnet'
}

async function getClient(): Promise<ccc.Client> {
  const network = getNetwork()
  if (network === 'ckb') {
    return new ccc.ClientPublicMainnet()
  }
  return new ccc.ClientPublicTestnet()
}

async function getSigner(): Promise<ccc.Signer | null> {
  const privateKey = await readKey(CKB_SK_PATH)
  if (!privateKey) return null

  const client = await getClient()
  return new ccc.SignerCkbPrivateKey(client, privateKey)
}

function generatePrivateKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return hexFromBytes(bytes)
}

function exitAfter(fn: (...args: any[]) => Promise<void>): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    try {
      await fn(...args)
    } finally {
      process.exit(0)
    }
  }
}

export const walletManager: WalletManager = {
  async newWallet(): Promise<void> {
    if (keyExists(CKB_SK_PATH)) {
      error('Wallet already exists. Use "clean" first to remove it.')
      return
    }

    try {
      const privateKey = generatePrivateKey()
      const client = await getClient()
      const signer = new ccc.SignerCkbPrivateKey(client, privateKey)
      const address = await signer.getRecommendedAddress()
      await writeKey(CKB_SK_PATH, privateKey)
      success(address)
    } catch (e: unknown) {
      error(`Failed to create wallet: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async importWallet(sk: string): Promise<void> {
    if (keyExists(CKB_SK_PATH)) {
      error('Wallet already exists. Use "clean" first to remove it.')
      return
    }

    try {
      const client = await getClient()
      const signer = new ccc.SignerCkbPrivateKey(client, sk)
      const address = await signer.getRecommendedAddress()
      await writeKey(CKB_SK_PATH, sk)
      success(address)
    } catch (e: unknown) {
      error(`Failed to import wallet: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async clean(): Promise<void> {
    const result = await removeKey(CKB_SK_PATH)
    success(result)
  },

  async getAddress(): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "new" or "import" first.')
      return
    }

    try {
      const address = await signer.getRecommendedAddress()
      success(address)
    } catch (e: unknown) {
      error(`Failed to get address: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async sendTx(txPath: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "new" or "import" first.')
      return
    }

    try {
      const txData = await readJsonFile(txPath)
      if (!txData) {
        error('Failed to read transaction file')
        return
      }

      const tx = ccc.Transaction.from(txData)
      const txHash = await signer.sendTransaction(tx)
      success(txHash)
    } catch (e: unknown) {
      error(`Failed to send transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async checkTx(txHash: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "new" or "import" first.')
      return
    }

    try {
      const tx = await signer.client.getTransaction(txHash)
      success(tx?.status ?? 'unknown')
    } catch (e: unknown) {
      error(`Failed to check transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async balance(): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "new" or "import" first.')
      return
    }

    try {
      const balance = await signer.getBalance()
      const balanceInCKB = ccc.fixedPointToString(balance)
      success(`${balanceInCKB} CKB`)
    } catch (e: unknown) {
      error(`Failed to get balance: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

// Wrap methods that need process exit
export const walletManagerWithExit: WalletManager = {
  newWallet: exitAfter(walletManager.newWallet),
  importWallet: exitAfter(walletManager.importWallet),
  clean: exitAfter(walletManager.clean),
  getAddress: exitAfter(walletManager.getAddress),
  sendTx: exitAfter(walletManager.sendTx),
  checkTx: exitAfter(walletManager.checkTx),
  balance: exitAfter(walletManager.balance),
}

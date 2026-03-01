import { SIGNKEY_PATH, keyExists, readKey, writeKey, removeKey, error, success, bytesFromHex, hexFromBytes } from './common.js'
import { Secp256k1Keypair, verifySignature as verifySignatureAtproto } from '@atproto/crypto'

export interface KeystoreManager {
  newKey(): Promise<void>
  importKey(sk: string): Promise<void>
  clean(): Promise<void>
  getDIDKey(): Promise<void>
  sign(message: string): Promise<void>
  verify(message: string, signature: string, didKey?: string): Promise<void>
}

export const keystoreManager: KeystoreManager = {
  async newKey(): Promise<void> {
    if (keyExists(SIGNKEY_PATH)) {
      error('Keypair already exists. Use "clean" first to remove it.')
      return
    }

    try {
      const keypair = await Secp256k1Keypair.create({ exportable: true })
      const exportedBytes = await keypair.export()
      const privateKey = hexFromBytes(exportedBytes)

      await writeKey(SIGNKEY_PATH, privateKey)
      const didKey = keypair.did()
      success(didKey)
    } catch (e: unknown) {
      error(`Failed to create keypair: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async importKey(sk: string): Promise<void> {
    if (keyExists(SIGNKEY_PATH)) {
      error('Keypair already exists. Use "clean" first to remove it.')
      return
    }

    try {
      const keypair = await Secp256k1Keypair.import(bytesFromHex(sk), { exportable: true })
      await writeKey(SIGNKEY_PATH, sk)
      const didKey = keypair.did()
      success(didKey)
    } catch (e: unknown) {
      error(`Failed to import key: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async clean(): Promise<void> {
    const result = await removeKey(SIGNKEY_PATH)
    success(result)
  },

  async getDIDKey(): Promise<void> {
    const privateKey = await readKey(SIGNKEY_PATH)
    if (!privateKey) {
      error('No keypair found. Use "new" or "import" first.')
      return
    }

    try {
      const keypair = await Secp256k1Keypair.import(bytesFromHex(privateKey))
      success(keypair.did())
    } catch (e: unknown) {
      error(`Failed to get DID key: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async sign(message: string): Promise<void> {
    const privateKey = await readKey(SIGNKEY_PATH)
    if (!privateKey) {
      error('No keypair found. Use "new" or "import" first.')
      return
    }

    try {
      const keypair = await Secp256k1Keypair.import(bytesFromHex(privateKey))
      const messageBytes = bytesFromHex(message)
      const signature = await keypair.sign(messageBytes)
      success(hexFromBytes(signature))
    } catch (e: unknown) {
      error(`Failed to sign message: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async verify(message: string, signature: string, didKey?: string): Promise<void> {
    try {
      let pubDidKey: string
      
      if (didKey) {
        pubDidKey = didKey
      } else {
        const privateKey = await readKey(SIGNKEY_PATH)
        if (!privateKey) {
          error('No keypair found and no didKey provided.')
          return
        }
        const keypair = await Secp256k1Keypair.import(bytesFromHex(privateKey))
        pubDidKey = keypair.did()
      }

      const messageBytes = bytesFromHex(message)
      const signatureBytes = bytesFromHex(signature)
      
      const verified = await verifySignatureAtproto(pubDidKey, messageBytes, signatureBytes)
      success(verified)
    } catch (e: unknown) {
      success(false)
    }
  }
}

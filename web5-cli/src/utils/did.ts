import { CKB_SK_PATH, readKey, error, success, writeJsonFile } from './common.js'
import { ccc } from '@ckb-ccc/ccc'
import { base32 } from '@scure/base'

export interface didCkbCellInfo {
  txHash: string
  index: number
  args: string
  capacity: string
  did: string
  didMetadata: string
}

export interface DidManager {
  buildCreateTx(username: string, pds: string, didkey: string, outputPath: string): Promise<void>
  buildDestroyTx(args: string, outputPath: string): Promise<void>
  buildUpdateDidKeyTx(args: string, newDidKey: string, outputPath: string): Promise<void>
  buildUpdateHandleTx(args: string, newHandle: string, outputPath: string): Promise<void>
  buildTransferTx(args: string, receiver: string, outputPath: string): Promise<void>
  list(ckbAddr: string): Promise<void>
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

function didFromArgs(args: string): string {
  const argsBytes = ccc.bytesFrom(args.slice(0, 42))
  return `did:ckb:${base32.encode(argsBytes).toLowerCase()}`
}

export const didManager: DidManager = {
  async buildCreateTx(username: string, pds: string, didkey: string, outputPath: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "wallet new" or "wallet import" first.')
      return
    }

    try {
      const address = await signer.getRecommendedAddressObj()
      const handle = `${username.toLowerCase()}.${pds}`
      
      const metadata = {
        document: {
          alsoKnownAs: [`at://${handle}`],
          verificationMethods: {
            atproto: didkey
          },
          services: {
            atproto_pds: {
              type: 'AtprotoPersonalDataServer',
              endpoint: `https://${pds}`
            }
          }
        }
      }

      const { tx, id } = await ccc.didCkb.createDidCkb({
        signer,
        data: { value: metadata },
        receiver: address.script,
      })

      await tx.completeInputsByCapacity(signer)
      await tx.completeFeeBy(signer)

      const rawTx = ccc.stringify(tx)
      const did = didFromArgs(id)

      await writeJsonFile(outputPath, JSON.parse(rawTx))
      success({ did, txPath: outputPath })
    } catch (e: unknown) {
      error(`Failed to build create transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async buildDestroyTx(args: string, outputPath: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "wallet new" or "wallet import" first.')
      return
    }

    try {
      const { tx } = await ccc.didCkb.destroyDidCkb({ client: signer.client, id: args })
      await tx.completeInputsByCapacity(signer)
      await tx.completeFeeBy(signer)
      
      const rawTx = ccc.stringify(tx)
      await writeJsonFile(outputPath, JSON.parse(rawTx))
      success({ txPath: outputPath })
    } catch (e: unknown) {
      error(`Failed to build destroy transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async buildUpdateDidKeyTx(args: string, newDidKey: string, outputPath: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "wallet new" or "wallet import" first.')
      return
    }

    try {
      const address = await signer.getRecommendedAddressObj()
      const { tx } = await ccc.didCkb.transferDidCkb({
        client: signer.client,
        id: args,
        receiver: address.script,
        data: (_, data?: ccc.didCkb.DidCkbData) => {
          if (!data) throw new Error('data is undefined')
          const doc = data.value.document as { verificationMethods?: Record<string, string> }
          if (!doc.verificationMethods) doc.verificationMethods = {}
          doc.verificationMethods.atproto = newDidKey
          return data
        },
      })

      await tx.completeInputsByCapacity(signer)
      await tx.completeFeeBy(signer)

      const rawTx = ccc.stringify(tx)
      await writeJsonFile(outputPath, JSON.parse(rawTx))
      success({ txPath: outputPath })
    } catch (e: unknown) {
      error(`Failed to build update didKey transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async buildUpdateHandleTx(args: string, newHandle: string, outputPath: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "wallet new" or "wallet import" first.')
      return
    }

    try {
      const address = await signer.getRecommendedAddressObj()
      const parts = newHandle.split('.')
      const pdsHost = parts.slice(1).join('.')
      const serviceEndpoint = `https://${pdsHost}`

      const { tx } = await ccc.didCkb.transferDidCkb({
        client: signer.client,
        id: args,
        receiver: address.script,
        data: (_, data?: ccc.didCkb.DidCkbData) => {
          if (!data) throw new Error('data is undefined')
          const doc = data.value.document as { 
            alsoKnownAs?: string[]
            services?: Record<string, { type?: string; endpoint?: string }> 
          }
          doc.alsoKnownAs = [`at://${newHandle}`]
          if (!doc.services) doc.services = {}
          if (!doc.services.atproto_pds) doc.services.atproto_pds = { type: 'AtprotoPersonalDataServer' }
          doc.services.atproto_pds.endpoint = serviceEndpoint
          return data
        },
      })

      await tx.completeInputsByCapacity(signer)
      await tx.completeFeeBy(signer)

      const rawTx = ccc.stringify(tx)
      await writeJsonFile(outputPath, JSON.parse(rawTx))
      success({ txPath: outputPath })
    } catch (e: unknown) {
      error(`Failed to build update handle transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async buildTransferTx(args: string, receiver: string, outputPath: string): Promise<void> {
    const signer = await getSigner()
    if (!signer) {
      error('No wallet found. Use "wallet new" or "wallet import" first.')
      return
    }

    try {
      const receiverAddr = await ccc.Address.fromString(receiver.trim(), signer.client)
      const { tx } = await ccc.didCkb.transferDidCkb({
        client: signer.client,
        id: args,
        receiver: receiverAddr.script,
      })

      await tx.completeInputsByCapacity(signer)
      await tx.completeFeeBy(signer)

      const rawTx = ccc.stringify(tx)
      await writeJsonFile(outputPath, JSON.parse(rawTx))
      success({ txPath: outputPath })
    } catch (e: unknown) {
      error(`Failed to build transfer transaction: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async list(ckbAddr: string): Promise<void> {
    try {
      const client = await getClient()
      const address = await ccc.Address.fromString(ckbAddr, client)
      
      const didScriptInfo = await client.getKnownScript(ccc.KnownScript.DidCkb)
      const didCodeHash = didScriptInfo?.codeHash
      if (!didCodeHash) {
        error('DidCkb script codeHash not found')
        return
      }

      const signer = await new ccc.SignerCkbScriptReadonly (client, address.script)
      if (!signer) {
        error('No wallet found. Use "wallet new" or "wallet import" first.')
        return
      }

      const cells = await signer.findCells({
        script: {
          codeHash: didCodeHash,
          hashType: 'type',
          args: "0x",
        },
      }, true, 'desc', 10);

      const result: Array<didCkbCellInfo> = [];
      for await (const cell of cells) {
        const txHash = cell.outPoint.txHash;
        const index = Number(cell.outPoint.index);
        try {
          const data = cell.outputData ?? '0x';
          const didData = ccc.didCkb.DidCkbData.decode(data);
          const didDoc = didData.value.document;      
          const didMetadata = JSON.stringify(didDoc);
          if (!cell.cellOutput.type) throw new Error('cell.cellOutput.type is undefined');
          const args = ccc.bytesFrom(cell.cellOutput.type.args.slice(0, 42)); // 20 bytes Type args
          const did = `did:ckb:${base32.encode(args).toLowerCase()}`;
          result.push({
            txHash,
            index,
            capacity: ccc.fixedPointToString(cell.cellOutput.capacity),
            args: cell.cellOutput.type.args,
            did,
            didMetadata,
          });
        } catch (error) {
          console.error(`Error processing cell ${txHash}:${index}:`, error);
        }
      }
      success(result)
    } catch (e: unknown) {
      error(`Failed to list DID cells: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

// Wrap methods that need process exit
function exitAfter(fn: (...args: any[]) => Promise<void>): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    try {
      await fn(...args)
    } finally {
      process.exit(0)
    }
  }
}

export const didManagerWithExit: DidManager = {
  buildCreateTx: exitAfter(didManager.buildCreateTx),
  buildDestroyTx: exitAfter(didManager.buildDestroyTx),
  buildUpdateDidKeyTx: exitAfter(didManager.buildUpdateDidKeyTx),
  buildUpdateHandleTx: exitAfter(didManager.buildUpdateHandleTx),
  buildTransferTx: exitAfter(didManager.buildTransferTx),
  list: exitAfter(didManager.list),
}

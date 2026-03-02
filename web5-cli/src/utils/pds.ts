import { error, success, hexFromBytes, bytesFromHex } from './common.js'
import { AtpAgent, FansWeb5CkbIndexAction } from 'web5-api'
import type { UnsignedCommit } from '@atproto/repo'
import { CID } from 'multiformats'
import * as cbor from '@ipld/dag-cbor'
import { Secp256k1Keypair } from '@atproto/crypto'
import { readFile, writeFile } from 'fs/promises'

export type userInfo = {
  accessJwt: string
  refreshJwt: string
  handle: string
  did: string
}

export type sessionInfo = {
  accessJwt: string
  refreshJwt: string
  handle: string
  did: string
  didMetadata: string
}

export type RepoInfo = {
  handle: string
  did: string
  didDoc: {
    verificationMethods: Record<string, string>
    alsoKnownAs: string[]
    services: Record<string, {
      type: string
      endpoint: string
    }>
  }
  collections: string[]
  handleIsCorrect: boolean
}

export type RepoRecords = {
  cursor?: string
  records: {
    uri: string
    cid: string
    value: Record<string, any>
  }[]
}

export type RepoBlobs = {
  cursor?: string
  cids: string[]
}

export interface PdsManager {
  checkUsername(username: string): Promise<void>
  getDidByUsername(username: string, pds: string): Promise<void>
  createAccount(pds: string, username: string, didKey: string, did: string, ckbAddress: string, signKey: string): Promise<void>
  deleteAccount(pds: string, didKey: string, did: string, ckbAddress: string, signKey: string): Promise<void>
  login(pds: string, didKey: string, did: string, ckbAddress: string, signKey: string): Promise<void>
  write(pds: string, accessJwt: string, didKey: string, did: string, data: string, signKey: string, rkey?: string, type?: 'update' | 'create' | 'delete'): Promise<void>
  repo(pds: string, did: string): Promise<void>
  records(pds: string, did: string, collection: string, limit?: number, cursor?: string): Promise<void>
  blobs(pds: string, did: string, limit?: number, cursor?: string): Promise<void>
  exportRepo(pds: string, did: string, dataFile: string, since?: string): Promise<void>
  importRepo(pds: string, did: string, accessJwt: string, dataFile: string): Promise<void>
}

function createAgent(pds: string): AtpAgent {
  return new AtpAgent({ service: `https://${pds}` })
}

function checkUsernameFormat(username: string): boolean {
  if (username.length < 4 || username.length > 18) {
    return false
  }
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/
  return usernameRegex.test(username)
}

export const pdsManager: PdsManager = {
  async checkUsername(username: string): Promise<void> {
    const isValid = checkUsernameFormat(username)
    success(isValid ? 'valid' : 'invalid')
  },

  async getDidByUsername(username: string, pds: string): Promise<void> {
    try {
      const handle = `${username.toLowerCase()}.${pds}`
      const url = `https://${handle}/.well-known/atproto-did`
      const response = await fetch(url)
      const text = await response.text()
      
      if (text.trim().startsWith('did:ckb')) {
        success(text.trim())
      } else if (text.includes('User not found')) {
        success('')
      } else {
        error('Failed to fetch DID')
      }
    } catch (e: unknown) {
      error(`Failed to get DID: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async createAccount(pds: string, username: string, didKey: string, did: string, ckbAddress: string, signKey: string): Promise<void> {
    try {
      const agent = createAgent(pds)
      const handle = `${username.toLowerCase()}.${pds}`
      
      const res = await agent.fans.web5.ckb.preCreateAccount({
        handle,
        signingKey: didKey,
        did,
      })

      if (!res.success) {
        error('Pre-create account failed')
        return
      }

      const uncommit: UnsignedCommit = {
        did: res.data.did,
        version: 3,
        rev: res.data.rev,
        prev: null,
        data: CID.parse(res.data.data),
      }

      const encoded = cbor.encode(uncommit)
      const unSignBytesHex = hexFromBytes(encoded).slice(2)
      
      if (unSignBytesHex !== res.data.unSignBytes) {
        error('Sign bytes not consistent')
        return
      }

      const keypair = await Secp256k1Keypair.import(bytesFromHex(signKey))
      const sig = await keypair.sign(encoded)

      const params = {
        handle,
        password: '',
        signingKey: didKey,
        ckbAddr: ckbAddress,
        root: {
          did: res.data.did,
          version: 3,
          rev: res.data.rev,
          prev: res.data.prev,
          data: res.data.data,
          signedBytes: hexFromBytes(sig),
        },
      }

      const createRes = await agent.web5CreateAccount(params)
      if (!createRes.success) {
        error('Create account failed')
        return
      }

      const userInfo: userInfo = {
        accessJwt: createRes.data.accessJwt,
        refreshJwt: createRes.data.refreshJwt,
        handle: createRes.data.handle,
        did: createRes.data.did,
      }
      success(userInfo)
    } catch (e: unknown) {
      error(`Failed to create account: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async deleteAccount(pds: string, didKey: string, did: string, ckbAddress: string, signKey: string): Promise<void> {
    try {
      const agent = createAgent(pds)
      
      const preDelete = await agent.fans.web5.ckb.preIndexAction({
        did,
        ckbAddr: ckbAddress,
        index: { $type: 'fans.web5.ckb.preIndexAction#deleteAccount' },
      })

      const keypair = await Secp256k1Keypair.import(bytesFromHex(signKey))
      const sig = await keypair.sign(new TextEncoder().encode(preDelete.data.message))

      const deleteInfo = await agent.fans.web5.ckb.indexAction({
        did,
        message: preDelete.data.message,
        signingKey: didKey,
        signedBytes: hexFromBytes(sig),
        ckbAddr: ckbAddress,
        index: { $type: 'fans.web5.ckb.indexAction#deleteAccount' },
      })

      success(deleteInfo.success)
    } catch (e: unknown) {
      error(`Failed to delete account: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async login(pds: string, didKey: string, did: string, ckbAddress: string, signKey: string): Promise<void> {
    try {
      const agent = createAgent(pds)
      
      const preLogin = await agent.fans.web5.ckb.preIndexAction({
        did,
        ckbAddr: ckbAddress,
        index: { $type: 'fans.web5.ckb.preIndexAction#createSession' },
      })

      const keypair = await Secp256k1Keypair.import(bytesFromHex(signKey))
      const sig = await keypair.sign(new TextEncoder().encode(preLogin.data.message))

      const loginInfo = await agent.web5Login({
        did,
        message: preLogin.data.message,
        signingKey: didKey,
        signedBytes: hexFromBytes(sig),
        ckbAddr: ckbAddress,
        index: { $type: 'fans.web5.ckb.indexAction#createSession' },
      })

      if (!loginInfo.success) {
        error('Login failed')
        return
      }

      const loginInfoData = loginInfo.data.result as FansWeb5CkbIndexAction.CreateSessionResult
      const sessionInfo: sessionInfo = {
        accessJwt: loginInfoData.accessJwt,
        refreshJwt: loginInfoData.refreshJwt,
        handle: loginInfoData.handle,
        did: loginInfoData.did,
        didMetadata: JSON.stringify(loginInfoData.didDoc),
      }
      success(sessionInfo)
    } catch (e: unknown) {
      error(`Failed to login: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async write(pds: string, accessJwt: string, didKey: string, did: string, data: string, signKey: string, rkey?: string, type?: 'update' | 'create' | 'delete'): Promise<void> {
    try {
      const agent = createAgent(pds)
      agent.setHeader('Authorization', `Bearer ${accessJwt}`)

      const record = JSON.parse(data)
      const newRecord = {
        created: new Date().toISOString().split('.')[0] + 'Z',
        ...record,
      }
      const { TID } = await import('@atproto/common-web')
      const recordRkey = rkey || TID.next().toString()

      // Determine write type, default to 'create'
      const writeType = type || 'create'
      const preWriteType = `fans.web5.ckb.preDirectWrites#${writeType}` as const
      const directWriteType = `fans.web5.ckb.directWrites#${writeType}` as const

      const preWriteRes = await agent.fans.web5.ckb.preDirectWrites({
        repo: did,
        writes: [{
          $type: preWriteType,
          collection: newRecord.$type,
          rkey: recordRkey,
          value: newRecord,
        }],
        validate: false,
      })

      const preWriterData = preWriteRes.data
      const uncommit: UnsignedCommit = {
        did: preWriterData.did,
        version: 3,
        rev: preWriterData.rev,
        prev: preWriterData.prev ? CID.parse(preWriterData.prev) : null,
        data: CID.parse(preWriterData.data),
      }

      const unSignBytes = cbor.encode(uncommit)
      const unSignBytesHex = hexFromBytes(unSignBytes).slice(2)
      
      if (unSignBytesHex !== preWriterData.unSignBytes) {
        error('Sign bytes not consistent')
        return
      }

      const keypair = await Secp256k1Keypair.import(bytesFromHex(signKey))
      const sig = await keypair.sign(unSignBytes)

      const writeRes = await agent.fans.web5.ckb.directWrites({
        repo: did,
        validate: false,
        signingKey: didKey,
        writes: [{
          $type: directWriteType,
          collection: newRecord.$type,
          rkey: recordRkey,
          value: newRecord,
        }],
        root: {
          did: preWriterData.did,
          version: 3,
          rev: preWriterData.rev,
          prev: preWriterData.prev,
          data: preWriterData.data,
          signedBytes: hexFromBytes(sig),
        },
      })

      success(writeRes.success)
    } catch (e: unknown) {
      error(`Failed to write data: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async repo(pds: string, did: string): Promise<void> {
    try {
      const url = new URL(`https://${pds}/xrpc/com.atproto.repo.describeRepo`)
      url.searchParams.append('repo', did)

      const response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })

      if (!response.ok) {
        error(`Failed to fetch repo info: ${response.status} ${response.statusText}`)
        return
      }

      const repoInfo: RepoInfo = await response.json()
      success(repoInfo)
    } catch (e: unknown) {
      error(`Failed to fetch repo info: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async records(pds: string, did: string, collection: string, limit?: number, cursor?: string): Promise<void> {
    try {
      const url = new URL(`https://${pds}/xrpc/com.atproto.repo.listRecords`)
      url.searchParams.append('repo', did)
      url.searchParams.append('collection', collection)
      url.searchParams.append('limit', (limit || 10).toString())
      if (cursor) {
        url.searchParams.append('cursor', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })

      if (!response.ok) {
        error(`Failed to fetch records: ${response.status} ${response.statusText}`)
        return
      }

      const data: RepoRecords = await response.json()
      success(data)
    } catch (e: unknown) {
      error(`Failed to fetch records: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async blobs(pds: string, did: string, limit?: number, cursor?: string): Promise<void> {
    try {
      const url = new URL(`https://${pds}/xrpc/com.atproto.sync.listBlobs`)
      url.searchParams.append('did', did)
      url.searchParams.append('limit', (limit || 10).toString())
      if (cursor) {
        url.searchParams.append('cursor', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })

      if (!response.ok) {
        error(`Failed to fetch blobs: ${response.status} ${response.statusText}`)
        return
      }

      const data: RepoBlobs = await response.json()
      success(data)
    } catch (e: unknown) {
      error(`Failed to fetch blobs: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async exportRepo(pds: string, did: string, dataFile: string, since?: string): Promise<void> {
    try {
      const url = new URL(`https://${pds}/xrpc/com.atproto.sync.getRepo`)
      url.searchParams.append('did', did)
      if (since) {
        url.searchParams.append('since', since)
      }

      const response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })

      if (!response.ok) {
        error(`Failed to export repo: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.arrayBuffer()
      await writeFile(dataFile, Buffer.from(data))
      success(true)
    } catch (e: unknown) {
      error(`Failed to export repo: ${e instanceof Error ? e.message : String(e)}`)
    }
  },

  async importRepo(pds: string, did: string, accessJwt: string, dataFile: string): Promise<void> {
    try {
      const car = await readFile(dataFile)
      const url = new URL(`https://${pds}/xrpc/com.atproto.repo.importRepo`)
      url.searchParams.append('did', did)

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessJwt}`,
          'Content-Type': 'application/vnd.ipld.car',
        },
        body: car,
      })

      success(response.ok)
    } catch (e: unknown) {
      error(`Failed to import repo: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
}

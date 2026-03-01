import { mkdir, readFile, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { homedir } from 'os'

export const CLI_DIR = join(homedir(), '.web5-cli')
export const SIGNKEY_PATH = join(CLI_DIR, 'signkey')
export const CKB_SK_PATH = join(CLI_DIR, 'ckb-sk')

export interface Output {
  success: boolean
  data?: unknown
  error?: string
}

export function outputJSON(result: Output): void {
  console.log(JSON.stringify(result, null, 2))
}

export function success(data?: unknown): void {
  outputJSON({ success: true, data })
}

export function error(message: string): void {
  outputJSON({ success: false, error: message })
}

export async function ensureDir(): Promise<void> {
  if (!existsSync(CLI_DIR)) {
    await mkdir(CLI_DIR, { recursive: true })
  }
}

export async function readKey(path: string): Promise<string | null> {
  try {
    const data = await readFile(path, 'utf-8')
    return data.trim()
  } catch {
    return null
  }
}

export async function writeKey(path: string, key: string): Promise<void> {
  await ensureDir()
  await writeFile(path, key, 'utf-8')
}

export async function removeKey(path: string): Promise<boolean> {
  try {
    await unlink(path)
    return true
  } catch {
    return false
  }
}

export function keyExists(path: string): boolean {
  return existsSync(path)
}

export function bytesFromHex(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2)
  }
  const match = hex.match(/.{1,2}/g)
  if (!match) {
    return new Uint8Array()
  }
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}

export function hexFromBytes(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8')
}

export async function readJsonFile(path: string): Promise<unknown | null> {
  try {
    const data = await readFile(path, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

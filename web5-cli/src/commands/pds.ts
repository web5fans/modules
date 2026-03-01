import { Command } from 'commander'
import { pdsManager } from '../utils/pds.js'
import { SIGNKEY_PATH, CKB_SK_PATH, readKey } from '../utils/common.js'

async function getSignKey(): Promise<string | null> {
  return readKey(SIGNKEY_PATH)
}

export function createPdsCommand(): Command {
  const command = new Command('pds')
    .description('Interact with PDS servers')

  command
    .command('check-username')
    .description('Check if username is valid')
    .requiredOption('--username <username>', 'Username to check')
    .action(async (options) => {
      await pdsManager.checkUsername(options.username)
    })

  command
    .command('get-did-by-username')
    .description('Get DID by username')
    .requiredOption('--username <username>', 'Username')
    .requiredOption('--pds <pds>', 'PDS host (e.g., web5.bbsfans.dev)')
    .action(async (options) => {
      await pdsManager.getDidByUsername(options.username, options.pds)
    })

  command
    .command('create-account')
    .description('Create an account on PDS')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--username <username>', 'Username')
    .requiredOption('--didkey <didKey>', 'DID key')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--ckb-address <address>', 'CKB address')
    .action(async (options) => {
      const signKey = await getSignKey()
      if (!signKey) {
        console.log(JSON.stringify({ success: false, error: 'No signkey found. Use "keystore new" or "keystore import" first.' }, null, 2))
        return
      }
      await pdsManager.createAccount(options.pds, options.username, options.didkey, options.did, options.ckbAddress, signKey)
    })

  command
    .command('delete-account')
    .description('Delete an account on PDS')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--didkey <didKey>', 'DID key')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--ckb-address <address>', 'CKB address')
    .action(async (options) => {
      const signKey = await getSignKey()
      if (!signKey) {
        console.log(JSON.stringify({ success: false, error: 'No signkey found. Use "keystore new" or "keystore import" first.' }, null, 2))
        return
      }
      await pdsManager.deleteAccount(options.pds, options.didkey, options.did, options.ckbAddress, signKey)
    })

  command
    .command('login')
    .description('Login to PDS')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--didkey <didKey>', 'DID key')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--ckb-address <address>', 'CKB address')
    .action(async (options) => {
      const signKey = await getSignKey()
      if (!signKey) {
        console.log(JSON.stringify({ success: false, error: 'No signkey found. Use "keystore new" or "keystore import" first.' }, null, 2))
        return
      }
      await pdsManager.login(options.pds, options.didkey, options.did, options.ckbAddress, signKey)
    })

  command
    .command('write')
    .description('Write data to PDS')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--accessJwt <token>', 'Access JWT token')
    .requiredOption('--didkey <didKey>', 'DID key')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--data <json>', 'Data to write (JSON string)')
    .option('--rkey <rkey>', 'Record key (optional)')
    .option('--type <type>', 'Write type: create, update, or delete (default: create)')
    .action(async (options) => {
      const signKey = await getSignKey()
      if (!signKey) {
        console.log(JSON.stringify({ success: false, error: 'No signkey found. Use "keystore new" or "keystore import" first.' }, null, 2))
        return
      }
      const writeType = options.type || 'create'
      if (!['create', 'update', 'delete'].includes(writeType)) {
        console.log(JSON.stringify({ success: false, error: 'Invalid type. Must be one of: create, update, delete' }, null, 2))
        return
      }
      await pdsManager.write(options.pds, options.accessJwt, options.didkey, options.did, options.data, signKey, options.rkey, writeType)
    })

  command
    .command('repo')
    .description('Get repo information')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--did <did>', 'DID')
    .action(async (options) => {
      await pdsManager.repo(options.pds, options.did)
    })

  command
    .command('records')
    .description('Get repo records')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--collection <collection>', 'Collection name')
    .option('--limit <limit>', 'Limit', '20')
    .option('--cursor <cursor>', 'Cursor for pagination')
    .action(async (options) => {
      await pdsManager.records(options.pds, options.did, options.collection, parseInt(options.limit), options.cursor)
    })

  command
    .command('blobs')
    .description('Get repo blobs')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--did <did>', 'DID')
    .option('--limit <limit>', 'Limit', '20')
    .option('--cursor <cursor>', 'Cursor for pagination')
    .action(async (options) => {
      await pdsManager.blobs(options.pds, options.did, parseInt(options.limit), options.cursor)
    })

  command
    .command('export')
    .description('Export repo to CAR file')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--data-file <path>', 'Output file path')
    .option('--since <since>', 'Since CID (optional)')
    .action(async (options) => {
      await pdsManager.exportRepo(options.pds, options.did, options.dataFile, options.since)
    })

  command
    .command('import')
    .description('Import repo from CAR file')
    .requiredOption('--pds <pds>', 'PDS host')
    .requiredOption('--did <did>', 'DID')
    .requiredOption('--accessJwt <token>', 'Access JWT token')
    .requiredOption('--data-file <path>', 'Input file path')
    .action(async (options) => {
      await pdsManager.importRepo(options.pds, options.did, options.accessJwt, options.dataFile)
    })

  return command
}

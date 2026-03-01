import { Command } from 'commander'
import { didManagerWithExit } from '../utils/did.js'

export function createDidCommand(): Command {
  const command = new Command('did')
    .description('Manage DID operations')

  command
    .command('build-create-tx')
    .description('Build transaction to create a new DID')
    .requiredOption('--username <username>', 'Username for the DID')
    .requiredOption('--pds <pds>', 'PDS host (e.g., web5.bbsfans.dev)')
    .requiredOption('--didkey <didkey>', 'DID key for atproto verification')
    .requiredOption('--output-path <path>', 'Output path for transaction JSON')
    .action(async (options) => {
      await didManagerWithExit.buildCreateTx(options.username, options.pds, options.didkey, options.outputPath)
    })

  command
    .command('build-destroy-tx')
    .description('Build transaction to destroy a DID')
    .requiredOption('--args <args>', 'DID args (type script args)')
    .requiredOption('--output-path <path>', 'Output path for transaction JSON')
    .action(async (options) => {
      await didManagerWithExit.buildDestroyTx(options.args, options.outputPath)
    })

  command
    .command('build-update-didkey-tx')
    .description('Build transaction to update DID key')
    .requiredOption('--args <args>', 'DID args (type script args)')
    .requiredOption('--new-didkey <didKey>', 'New DID key')
    .requiredOption('--output-path <path>', 'Output path for transaction JSON')
    .action(async (options) => {
      await didManagerWithExit.buildUpdateDidKeyTx(options.args, options.newDidkey, options.outputPath)
    })

  command
    .command('build-update-handle-tx')
    .description('Build transaction to update DID handle')
    .requiredOption('--args <args>', 'DID args (type script args)')
    .requiredOption('--new-handle <handle>', 'New handle (e.g., david1.web5.bbsfans.dev)')
    .requiredOption('--output-path <path>', 'Output path for transaction JSON')
    .action(async (options) => {
      await didManagerWithExit.buildUpdateHandleTx(options.args, options.newHandle, options.outputPath)
    })

  command
    .command('build-transfer-tx')
    .description('Build transaction to transfer DID')
    .requiredOption('--args <args>', 'DID args (type script args)')
    .requiredOption('--receiver <address>', 'Receiver CKB address')
    .requiredOption('--output-path <path>', 'Output path for transaction JSON')
    .action(async (options) => {
      await didManagerWithExit.buildTransferTx(options.args, options.receiver, options.outputPath)
    })

  command
    .command('list')
    .description('List DID cells for a CKB address')
    .requiredOption('--ckb-addr <address>', 'CKB address')
    .action(async (options) => {
      await didManagerWithExit.list(options.ckbAddr)
    })

  return command
}

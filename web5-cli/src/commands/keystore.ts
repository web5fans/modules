import { Command } from 'commander'
import { keystoreManager } from '../utils/keystore.js'

export function createKeystoreCommand(): Command {
  const command = new Command('keystore')
    .description('Manage DID signing keys')

  command
    .command('new')
    .description('Create a new keypair')
    .action(async () => {
      await keystoreManager.newKey()
    })

  command
    .command('import')
    .description('Import an existing private key')
    .requiredOption('--sk <privateKey>', 'Private key to import (hex format)')
    .action(async (options) => {
      await keystoreManager.importKey(options.sk)
    })

  command
    .command('clean')
    .description('Remove the existing keypair')
    .action(async () => {
      await keystoreManager.clean()
    })

  command
    .command('get')
    .description('Get the DID key')
    .action(async () => {
      await keystoreManager.getDIDKey()
    })

  command
    .command('sign')
    .description('Sign a message')
    .requiredOption('--message <message>', 'Message to sign (hex format)')
    .action(async (options) => {
      await keystoreManager.sign(options.message)
    })

  command
    .command('verify')
    .description('Verify a signature')
    .requiredOption('--message <message>', 'Original message (hex format)')
    .requiredOption('--signature <signature>', 'Signature to verify (hex format)')
    .option('--didkey <didKey>', 'DID key (if not provided, uses local keypair)')
    .action(async (options) => {
      await keystoreManager.verify(options.message, options.signature, options.didkey)
    })

  return command
}

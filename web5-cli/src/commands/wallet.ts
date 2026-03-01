import { Command } from 'commander'
import { walletManagerWithExit } from '../utils/wallet.js'

export function createWalletCommand(): Command {
  const command = new Command('wallet')
    .description('Manage CKB wallet')

  command
    .command('new')
    .description('Create a new CKB wallet')
    .action(async () => {
      await walletManagerWithExit.newWallet()
    })

  command
    .command('import')
    .description('Import an existing private key')
    .requiredOption('--sk <privateKey>', 'Private key to import (hex format)')
    .action(async (options) => {
      await walletManagerWithExit.importWallet(options.sk)
    })

  command
    .command('clean')
    .description('Remove the existing wallet')
    .action(async () => {
      await walletManagerWithExit.clean()
    })

  command
    .command('get')
    .description('Get the CKB address')
    .action(async () => {
      await walletManagerWithExit.getAddress()
    })

  command
    .command('send-tx')
    .description('Send a transaction')
    .requiredOption('--tx-path <path>', 'Path to the transaction JSON file')
    .action(async (options) => {
      await walletManagerWithExit.sendTx(options.txPath)
    })

  command
    .command('check-tx')
    .description('Check transaction status')
    .requiredOption('--tx-hash <txHash>', 'Transaction hash')
    .action(async (options) => {
      await walletManagerWithExit.checkTx(options.txHash)
    })

  command
    .command('balance')
    .description('Check account balance')
    .action(async () => {
      await walletManagerWithExit.balance()
    })

  return command
}

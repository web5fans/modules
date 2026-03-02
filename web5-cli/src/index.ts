#!/usr/bin/env node

import { Command } from 'commander'
import { createKeystoreCommand } from './commands/keystore.js'
import { createWalletCommand } from './commands/wallet.js'
import { createDidCommand } from './commands/did.js'
import { createPdsCommand } from './commands/pds.js'

const program = new Command()

program
  .name('web5-cli')
  .description('Web5 CLI tool for interacting with Web5 infrastructure')
  .version('0.1.2')

program.addCommand(createKeystoreCommand())
program.addCommand(createWalletCommand())
program.addCommand(createDidCommand())
program.addCommand(createPdsCommand())

program.parse()

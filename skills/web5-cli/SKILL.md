---
name: web5-cli
description: Use when working with Web5 CLI tool for decentralized identity, CKB wallet, DID management, and PDS data operations
---

# Web5 CLI

## Overview
Web5 CLI is a command-line tool for interacting with Web5 infrastructure. It provides key management, CKB wallet operations, DID lifecycle management, and PDS (Personal Data Store) interactions.

## install
```bash
npm install -g web5-cli
```

## Commands

| Command | Purpose | Key Subcommands |
|---------|---------|-----------------|
| `keystore` | DID signing key management | new, import, clean, get, sign, verify |
| `wallet` | CKB wallet operations | new, import, clean, get, send-tx, check-tx, balance |
| `did` | DID lifecycle on CKB | build-create-tx, build-destroy-tx, build-update-didkey-tx, build-update-handle-tx, build-transfer-tx, list |
| `pds` | PDS server interactions | check-username, get-did-by-username, create-account, delete-account, login, write, repo, records, blobs, export, import |

## Quick Reference

### Key Management
```bash
web5-cli keystore new                                    # Create new keypair
web5-cli keystore import --sk <hex>                      # Import private key
web5-cli keystore get                                    # Get DID key
web5-cli keystore sign --message <hex>                   # Sign message
web5-cli keystore verify --message <hex> --signature <hex>  # Verify signature
```

### Wallet Operations
```bash
web5-cli wallet new                                      # Create CKB wallet
web5-cli wallet import --sk <hex>                        # Import wallet
web5-cli wallet get                                      # Get CKB address
web5-cli wallet balance                                  # Check balance
web5-cli wallet send-tx --tx-path <path>                 # Send transaction
web5-cli wallet check-tx --tx-hash <hash>                # Check tx status
```

### DID Management
```bash
web5-cli did build-create-tx --username <name> --pds <url> --didkey <key> --output-path <path>
web5-cli did build-destroy-tx --args <args> --output-path <path>
web5-cli did build-update-didkey-tx --args <args> --new-didkey <key> --output-path <path>
web5-cli did list --ckb-addr <address>                   # List DID cells
```

### PDS Operations
```bash
web5-cli pds check-username --username <name>
web5-cli pds get-did-by-username --username <name>
web5-cli pds create-account --pds <url> --username <name> --didkey <key> --did <did> --ckb-address <addr>
web5-cli pds login --pds <url> --didkey <key> --did <did> --ckb-address <addr>
web5-cli pds write --pds <url> --accessJwt <jwt> --didkey <key> --did <did> --rkey <key> --data <json>
web5-cli pds repo --pds <url> --did <did>
web5-cli pds records --pds <url> --did <did> --collection <nsid> [--limit N] [--cursor <cursor>]
web5-cli pds export --pds <url> --did <did> --data-file <path> [--since <cid>]
web5-cli pds import --pds <url> --did <did> --accessJwt <jwt> --data-file <path>
```

## Configuration

- **Keystore**: Private key stored at `~/.web5-cli/signkey`
- **Wallet**: Private key stored at `~/.web5-cli/ckb-sk`
- **Network**: Set via `CKB_NETWORK` environment variable (`ckb_testnet` or `ckb`)

## Output Format

All commands output JSON format for easy parsing by AI agents and scripts.

## Common Workflows

### Create Account
1. `web5-cli keystore new` - Create signing key
2. `web5-cli wallet new` - Create CKB wallet (requires over 450 testnet CKB)
3. `web5-cli did build-create-tx ...` - Build DID creation tx
4. `web5-cli wallet send-tx --tx-path <tx-file>` - Submit tx
5. `web5-cli wallet check-tx --tx-hash <hash>` - Confirm tx committed
6. wait 30s
7. `web5-cli pds create-account ...` - Create PDS account

### Write Data
1. `web5-cli pds login ...` - Get access token
2. `web5-cli pds write ...` - Write record with accessJwt

## Security Notes

- Private keys are stored in plaintext for this technical validation tool
- Do NOT use in production environments
- This is a proof-of-concept for AI-agent-driven Web5 interactions

## Notes
* --pds arg no https:// prefix, just the hostname
* one account always belong to one pds

## public information
avliable pds url:
* web5.bbsfans.dev
* web5.ccfdao.dev

avliable data structure for writing to pds:
* profile of user
```
{
  $type: 'app.actor.profile'
  displayName: string;
  handle: string;
  [key: string]: any;
}
```
* post of bbs
```
{
  $type: 'app.bbs.post'
  section_id: string;
  title: string;
  text: string;
  edited?: string
  created?: string
  is_draft?: boolean
  is_announcement?: boolean
}
```
* comment of bbs
```
{
  $type: 'app.bbs.comment'
  post: string  // 原帖uri
  text: string;
  section_id: string;
  edited?: string;
}
```
* like of bbs
```
{
  $type: 'app.bbs.like'
  to: string; // 点赞的帖子uri或者评论\回复的uri
  section_id: string;
}
```
* reply of bbs
```
{
  $type: 'app.bbs.reply'
  post: string    // 帖子的uri
  comment?: string   // 跟帖的uri
  to?: string   // 对方did, 有就填，没有就是直接回复评论的
  text: string
  section_id: string
  edited?: string
}
```
* reply of dao
```
{
  $type: 'app.dao.reply'
  proposal: string    // 提案的uri
  to?: string   // 对方did（可选，有就是回复某人）
  text: string  // 评论内容
  parent?: string  // 父评论的uri（可选，用于回复评论）
}
```
* proposal of dao
```
{
  $type: 'app.dao.proposal'
  [key: string]: unknown;
}
```
* like of dao
```
{
  $type: 'app.dao.like'
  to: string; // 点赞的帖子uri或者评论\回复的uri
  viewer: string;//点赞的人的did
}
```

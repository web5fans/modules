# RegistrationWizard Refactor Plan

## Current Flow (6 Steps)
1. Step 1: Create/Import Sign Key (Keystore)
2. Step 2: Select PDS
3. Step 3: Choose Username
4. Step 4: Connect CKB Wallet
5. Step 5: Create On-Chain Identity
6. Step 6: Register on PDS

## New Flow (Conditional)

### Step 1: Connect CKB Wallet (NEW FIRST STEP)
- User connects CKB wallet first
- After connection, automatically query DID cells

### Branch A: User HAS existing DID
- Query `fetchDidCkbCellsInfo(signer)` to get DID information
- Parse DID metadata to extract:
  - `did`: The DID string
  - `verificationMethods.atproto`: The didKey
  - `alsoKnownAs[0]`: Handle (format: `at://username.pds`)
  - `services.atproto_pds.endpoint`: PDS URL
- Automatically populate UserContext with extracted data
- Show prompt: "You have an existing DID. Please go to Keystore and switch your keypair to the DID's corresponding didKey: {didKey}"
- Add button to open Keystore in new tab
- Once keystore is connected with matching didKey, complete registration

### Branch B: User has NO existing DID
- Proceed to original registration flow (Steps 1-6 from current flow)
- Step 2: Create/Import Sign Key (Keystore)
- Step 3: Select PDS
- Step 4: Choose Username
- Step 5: Review & Create DID
- Step 6: Register on PDS

## Key Functions to Use

### DID Query
```typescript
import { fetchDidCkbCellsInfo } from 'did_module/logic';

// Returns: Array<didCkbCellInfo>
// {
//   txHash: string;
//   index: number;
//   args: string;
//   capacity: string;
//   did: string;
//   didMetadata: string; // JSON string containing document
// }
```

### UserContext Structure
```typescript
interface UserData {
  didKey: string;      // From verificationMethods.atproto
  did: string;         // From did field
  metadata: string;    // Full didMetadata JSON
  username: string;    // Parsed from alsoKnownAs[0]
  pds: string;         // Parsed from services.atproto_pds.endpoint
  ckbAddress: string;  // From signer.getRecommendedAddress()
  accessJwt?: string;
  refreshJwt?: string;
}
```

## Implementation Tasks

### Task 1: Restrure Step Components
- Modify `renderStep()` to handle new conditional flow
- Update step numbering logic (progress bar)
- Add new state to track if user has existing DID

### Task 2: Implement DID Detection Logic
- After wallet connection, call `fetchDidCkbCellsInfo`
- Parse first DID cell's metadata
- Check if `verificationMethods.atproto` exists
- Branch based on result

### Task 3: Implement Existing DID Flow
- Create UI for existing DID case
- Show DID info and required didKey
- Add keystore switch prompt
- Auto-login when conditions met

### Task 4: Update Step Numbering
- Reorder steps so wallet connection is first
- Update step titles and descriptions
- Update progress calculations

## Files to Modify
- `/home/rink/work/github/web5fans/modules/apps/daoworld/src/components/RegistrationWizard.tsx`

## Testing Checklist
- [ ] Connect wallet without DID → goes to registration flow
- [ ] Connect wallet with DID → shows existing DID info
- [ ] Can switch to keystore from prompt
- [ ] After switching keypair, completes registration
- [ ] All original registration steps still work

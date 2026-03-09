# Fix Plan: Update Display Name via PDS Profile

## Issue
The `handleUpdateDisplayName` function currently uses `updateHandle` from the DID module, which updates the on-chain handle. But the user wants to update the `displayName` field in the PDS profile record.

## Root Cause
Current implementation (lines 128-154):
- Uses `updateHandle` from did_module
- Updates on-chain DID document
- Doesn't touch the PDS profile record

## Required Changes

### 1. Import Additional Functions
Add to imports from 'pds_module/logic':
- `pdsLogin`
- `writePDS`
- `fetchUserProfile`
- `AtpAgent` (type)

### 2. Create New Function: updateDisplayName

Create a helper function to update the display name on PDS:

```typescript
const updateDisplayName = async (displayName: string): Promise<boolean> => {
  if (!user || !client) return false;
  
  try {
    // 1. Create AtpAgent
    const agent = new AtpAgent({
      service: `https://${user.pds}`,
    });
    
    // 2. Login to PDS
    const { pdsLogin } = await import('pds_module/logic');
    const loginResult = await pdsLogin(agent, user.did, user.didKey, user.ckbAddress, client);
    
    if (!loginResult) {
      throw new Error('Failed to login to PDS');
    }
    
    // 3. Fetch current profile
    const { fetchUserProfile } = await import('pds_module/logic');
    const profile = await fetchUserProfile(user.did, user.pds);
    
    if (!profile) {
      throw new Error('Failed to fetch profile');
    }
    
    // 4. Update displayName while preserving other fields
    const updatedRecord = {
      ...profile.value,
      $type: 'app.actor.profile',
      displayName: displayName,
    };
    
    // 5. Write updated record to PDS
    const { writePDS } = await import('pds_module/logic');
    const result = await writePDS(
      agent,
      loginResult.accessJwt,
      user.didKey,
      client,
      {
        record: updatedRecord,
        did: user.did,
        rkey: 'self',
        type: 'update',
      }
    );
    
    return result === true;
  } catch (err) {
    console.error('Failed to update display name:', err);
    return false;
  }
};
```

### 3. Update handleUpdateDisplayName Function

Replace lines 128-154 with:

```typescript
const handleUpdateDisplayName = async () => {
  if (!user || !newDisplayName) return;
  
  setIsUpdatingProfile(true);
  setMessage('');
  
  try {
    const success = await updateDisplayName(newDisplayName);
    
    if (success) {
      setMessage('Display name updated successfully!');
      setNewDisplayName('');
      // Optionally update local user state if needed
      // updateUser({ displayName: newDisplayName });
    } else {
      setMessage('Failed to update display name');
    }
  } catch (err: unknown) {
    setMessage(err instanceof Error ? err.message : 'Failed to update display name');
  } finally {
    setIsUpdatingProfile(false);
  }
};
```

### 4. Update Component Dependencies

The function no longer needs `signer` from ccc, so update the guard condition:
- Remove `!signer` check from line 129
- Keep only `!user || !newDisplayName` check

## Testing
- Verify login to PDS works
- Verify profile record is fetched
- Verify displayName is updated
- Verify other profile fields are preserved
- Verify proper error handling

## Files to Change
- `apps/daoworld/src/components/UserSettings.tsx` (lines 128-154, plus add helper function)

## Effort
Medium fix - ~15 minutes (requires understanding PDS record structure)

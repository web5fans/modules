# Fix Plan: PDS Records Display Bug

## Issue
The `UserSettings.tsx` component has a bug in displaying PDS Records. The `records` state is a map of collection IDs to record arrays, but the display code incorrectly accesses `records.records` which doesn't exist.

## Root Cause
- Line 33: `const [records, setRecords] = useState<Record<string, any[]>>({});` - state is a map
- Lines 257-270: Tries to access `records?.records.length` and `records.records.map()` - wrong API

## The Fix
Replace lines 244-272 with corrected display logic that:
1. Iterates over `collections` array
2. For each collection, displays its records from the `records` map
3. Shows collection name and records properly

## Code Change
```tsx
<Card>
  <CardHeader>
    <CardTitle>PDS Records</CardTitle>
    <CardDescription>
      Your data stored on {user.pds}
    </CardDescription>
  </CardHeader>
  <CardContent>
    {isLoadingRecords ? (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading records...
      </div>
    ) : collections.length > 0 ? (
      <div className="space-y-4">
        {collections.map((colId) => {
          const colRecords = records[colId] || [];
          return (
            <div key={colId} className="border rounded-lg p-3">
              <div className="font-semibold mb-2 text-sm text-muted-foreground">
                {colId}
              </div>
              {colRecords.length > 0 ? (
                <div className="space-y-2">
                  {colRecords.map((record, idx) => (
                    <div key={idx} className="p-2 bg-muted rounded text-sm">
                      <div className="font-medium truncate">{record.uri}</div>
                      <div className="text-xs text-muted-foreground">
                        CID: {record.cid?.slice(0, 20)}...
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No records in this collection</p>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-muted-foreground">No records found</p>
    )}
  </CardContent>
</Card>
```

## Testing
- Verify PDS Records tab loads without errors
- Verify records display with collection names
- Verify empty collections show appropriate message

## Files to Change
- `apps/portal/src/components/UserSettings.tsx` (lines 244-272)

## Effort
Quick fix - ~5 minutes

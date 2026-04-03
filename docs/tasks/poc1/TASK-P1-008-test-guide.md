# Manual Test Guide: TASK-P1-008 - Permission Dialog UI

## Test Environment Setup

1. Start VS Code with the AI Interop extensions:
   ```bash
   /Users/immeta/work/humancode/startcode.sh
   ```

2. Open the Command Palette (Cmd+Shift+P)

## Test Scenarios

### Test 1: Permission Dialog Appears

**Steps:**
1. Run command: "Test AI Interop Permission Control"
2. Observe the permission dialog

**Expected:**
- Dialog appears with title: "Extension 'Permission Caller' wants to call 'Permission Target'"
- Dialog shows caller and target extension IDs
- Three buttons visible: "Allow for Session", "Allow Once", "Deny"

### Test 2: Allow for Session

**Steps:**
1. Run command: "Test AI Interop Permission Control"
2. Click "Allow for Session" button
3. Check console output

**Expected:**
- Permission granted with scope 'session'
- Subsequent permission checks pass without showing dialog
- Console shows: "Permission granted by user: perm-caller -> perm-target (scope: session)"

### Test 3: Allow Once

**Steps:**
1. Clear permissions (restart VS Code or wait for expiration)
2. Run command: "Test AI Interop Permission Control"
3. Click "Allow Once" button
4. Wait 1 minute
5. Run permission check again

**Expected:**
- Permission granted with scope 'once'
- Permission expires after 1 minute
- Next check requires re-authorization

### Test 4: Deny Permission

**Steps:**
1. Clear permissions
2. Run command: "Test AI Interop Permission Control"
3. Click "Deny" button

**Expected:**
- Permission denied
- Console shows: "Permission denied by user"
- Invocation fails with permission error

### Test 5: Permissions View

**Steps:**
1. Grant a permission (use Test 2 - click "Allow for Session")
2. Open the bottom Panel (View → Appearance → Panel or Cmd+J)
3. Look for the "AI Interop" tab in the Panel tabs
4. Click on it to see the "Permissions" view

**Expected:**
- View shows granted permission
- Format: "perm-caller → perm-target"
- Shows scope: "session"
- Shows timestamp
- "Revoke" button visible for each permission

**Alternative access after fix:**
After restarting VS Code with the updated code, you can also use:
- Command Palette: "View: Show AI Interop" (now available since hideIfEmpty is set to false)

### Test 6: Revoke Permission

**Steps:**
1. Open Permissions view (with at least one permission)
2. Click "Revoke" button on a permission
3. Try to invoke the same endpoint pair

**Expected:**
- Permission removed from view
- Next invocation requires re-authorization
- Dialog appears again

## Verification Checklist

- [ ] Dialog appears on first cross-extension call
- [ ] "Allow for Session" grants persistent permission
- [ ] "Allow Once" grants temporary permission (1 minute)
- [ ] "Deny" blocks the invocation
- [ ] Permissions view displays granted permissions
- [ ] Revoke button removes permissions
- [ ] View auto-refreshes when permissions change
- [ ] Dialog is modal and blocks invocation

## Log Files

Check logs at: `/Users/immeta/work/humancode/1.log`

Look for:
- `[PolicyService] Permission granted by user`
- `[PolicyService] Permission denied by user`
- `[PolicyService] Permission check passed`

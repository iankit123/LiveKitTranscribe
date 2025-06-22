# RolePromptModal Test Plan

## Test Cases

### TC1: Modal Display on First Visit
- **Description**: Modal should appear when visiting meeting room without saved data
- **Steps**: 
  1. Clear localStorage
  2. Navigate to meeting room URL
  3. Check if modal appears with dark overlay
- **Expected**: Modal visible with name input and role selection
- **Status**: PENDING

### TC2: Form Validation
- **Description**: Form should validate required fields
- **Steps**:
  1. Try submitting empty form
  2. Try submitting with only name
  3. Try submitting with only role
- **Expected**: Form prevents submission until both fields filled
- **Status**: PENDING

### TC3: Role Selection
- **Description**: User can select between Interviewer and Candidate
- **Steps**:
  1. Click Interviewer radio button
  2. Verify selection
  3. Click Candidate radio button
  4. Verify selection change
- **Expected**: Only one role can be selected at a time
- **Status**: PENDING

### TC4: Form Submission
- **Description**: Modal closes and connects to room after submission
- **Steps**:
  1. Enter name "Test User"
  2. Select "Interviewer" role
  3. Click "Continue to Meeting"
- **Expected**: Modal closes, connection starts, data saved to localStorage
- **Status**: PENDING

### TC5: LocalStorage Persistence
- **Description**: Saved data should prevent modal on subsequent visits
- **Steps**:
  1. Complete form submission (TC4)
  2. Refresh page
  3. Check if modal appears
- **Expected**: Modal should not appear, auto-connect with saved data
- **Status**: PENDING

### TC6: Participant Name Generation
- **Description**: Proper participant name format generated
- **Steps**:
  1. Submit form with role "Interviewer"
  2. Check console logs for participant name
- **Expected**: Format "Interviewer-{roomName}-{timestamp}"
- **Status**: PENDING

### TC7: Video Connection After Modal
- **Description**: Video meeting should start after modal submission
- **Steps**:
  1. Complete modal submission
  2. Wait for connection
  3. Check video elements appear
- **Expected**: Video grid and meeting controls visible
- **Status**: PENDING
# Security Specification - Tinta Journal

## Phase 0: Payload-First Security Architecture

### 1. Data Invariants
1. **User Isolation & Privacy**: Every entry belongs strictly to the user identified by `userId`. Users can only read, write, update, and delete their own journal entries (`request.auth.uid == userId`).
2. **Path Integrity**: Path variable `{userId}` must match `request.auth.uid` and the document's internal `userId` field.
3. **Immutability of Identity & Creation**: `userId` and `createdAt` cannot be altered once created (`incoming().userId == existing().userId` and `incoming().createdAt == existing().createdAt`).
4. **Boundary Enforcements**: `content` must be a string up to 50,000 characters. `title` must not exceed 200 characters. `tags` array bounded to max 15 items. `images` array bounded to max 10 items.
5. **No Cross-User Leakage**: List queries are strictly restricted to the caller's own path (`users/$(request.auth.uid)/entries`).

### 2. The "Dirty Dozen" Payloads (Must be Denied)
1. **Unauthenticated Read**: Attempting to read `/users/user_123/entries/entry_1` without authentication.
2. **Cross-User Snooping**: Authenticated user B attempting to read `/users/user_A/entries/entry_1`.
3. **Cross-User Creation**: User B attempting to create an entry under `/users/user_A/entries/entry_1`.
4. **Identity Spoofing**: User A creating entry at `/users/user_A/entries/entry_1` but setting `userId: "user_B"`.
5. **User Id Mutation**: User A updating an entry and changing `userId` to `user_B`.
6. **Creation Date Tampering**: User A updating an existing entry and changing `createdAt`.
7. **Junk Path ID Poisoning**: Trying to create an entry with an ID containing malicious characters `../../admin` or over 128 characters.
8. **Denial of Wallet Payload**: Attempting to inject a 10MB string into `content` (exceeding 50,000 chars limit).
9. **Unbounded Array Exhaustion**: Submitting an entry with 10,000 tag items.
10. **Shadow Field Injection**: Sending ghost administrative fields such as `{ isAdmin: true, role: 'superadmin' }`.
11. **Type Confusion Attack**: Supplying boolean or numeric values for string fields (e.g. `content: true`).
12. **Blanket Collection Scraping**: Querying the root without path confinement.

### 3. Verification Matrix
All operations outside `users/$(request.auth.uid)/entries/{entryId}` will return `PERMISSION_DENIED`.
All write operations must pass schema verification via `isValidJournalEntry()`.

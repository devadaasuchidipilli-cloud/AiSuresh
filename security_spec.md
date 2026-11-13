# Security Specification — Super AI Agent

## 1. Data Invariants
1. **Identity Ownership Invariant**: Every document in `profiles`, `conversations`, `messages`, `agent_tasks`, `task_steps`, `uploaded_files`, `search_history`, `usage_records`, and `audit_logs` MUST have a `userId` matching `request.auth.uid` (and for `profiles/{profileId}`, `profileId == request.auth.uid`).
2. **Verified Email Invariant**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Relational Integrity Invariant**:
   - A `messages` document can only be created if `exists(/databases/$(database)/documents/conversations/$(incoming().conversationId))` and that conversation's `userId == request.auth.uid`.
   - A `task_steps` document can only be created if `exists(/databases/$(database)/documents/agent_tasks/$(incoming().taskId))` and that task's `userId == request.auth.uid`.
4. **Immutability Invariant**: `userId`, `createdAt`, `conversationId`, and `taskId` cannot be mutated during `update` operations.
5. **Temporal Integrity**: `createdAt == request.time` on `create`, and `updatedAt == request.time` on `update`.
6. **Terminal State Locking**: Once an `agent_tasks` document reaches `status == 'completed'` or `status == 'failed'`, non-admin users cannot mutate it further.
7. **PII Isolation**: `profiles/{profileId}` contains `email` and is strictly readable only by `isOwner(profileId)` or `isAdmin()`.
8. **Query Enforcer**: Every `allow list` rule restricts `resource.data.userId == request.auth.uid` (or `isAdmin()`).

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection**: `{ userId: "u1", displayName: "Ravi", preferredLanguage: "te-IN", theme: "dark", isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `.keys().hasOnly(...)`.
2. **Identity Spoofing on Create**: `{ userId: "victim_uid", title: "Chat", language: "te", domain: "general", messageCount: 0, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `data.userId == request.auth.uid`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` writing to `conversations` -> Rejected by `isVerifiedUser()`.
4. **Orphaned Message Write**: Creating a message in `messages` pointing to a non-existent `conversationId` -> Rejected by `exists(...)` and parent ownership check.
5. **Cross-Tenant Parent Attachment**: Creating a `task_steps` document referencing another user's `taskId` -> Rejected by `get(...).data.userId == request.auth.uid`.
6. **ID Poisoning Attack**: Document ID with 200 characters or invalid characters (`../admin`) -> Rejected by `isValidId(id)`.
7. **Denial-of-Wallet Oversized String**: Message `content` with 50,000 characters -> Rejected by `data.content.size() <= 20000`.
8. **Timestamp Forgery**: Client passes a past or future timestamp instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
9. **Immutable Field Mutation**: Updating `userId` or `createdAt` on an existing `conversations` document -> Rejected by `incoming().userId == existing().userId && incoming().createdAt == existing().createdAt`.
10. **Terminal State Re-opening**: Updating an `agent_tasks` document whose existing `status` is `'completed'` -> Rejected by terminal state guard.
11. **PII Blanket Read**: User A attempting `get` or `list` on User B's `profiles` document -> Rejected by `isOwner(profileId) || isAdmin()`.
12. **Value Poisoning on Update**: Updating `agent_tasks.progress` with a string `"100%"` instead of an integer `0..100` -> Rejected by `isValidAgentTask(incoming())` wrapper in `allow update`.

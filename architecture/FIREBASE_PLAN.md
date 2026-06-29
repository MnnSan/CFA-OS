# FIREBASE PLAN: CFA Level III Operating System

This document outlines the cloud migration blueprint, database structures, security rules, and data sync mechanics using Firebase.

---

## 1. Cloud Migration Overview

To support multi-device access (laptop, desktop, mobile), the platform will transition from standard browser `localStorage` to **Firebase Cloud Firestore**.

Key Constraints:
* **Local-First Caching**: The application must continue working offline. Database updates are written to a local cache and pushed to the cloud when a network connection is available.
* **Anonymous-First Entry**: Allow candidates to use the application immediately without an account. Migrate their anonymous data when they sign up with email/password.

---

## 2. Firebase Authentication Flow

The Authentication flow manages the transition from local-only to cloud-synced states:

```
                  ┌──────────────────────────────┐
                  │      Anonymous Session       │
                  │ (Data written to Local DB)   │
                  └──────────────┬───────────────┘
                                 │
                 Candidate signs up with Email / Password
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │   Link Anonymous Auth to     │
                  │   Permanent Firebase User    │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Sync all Local Session and   │
                  │ Note data to Firestore       │
                  └──────────────────────────────┘
```

1. **Anonymous Sign-In**: At first launch, the App Context calls `signInAnonymously()`. This provides a unique `uid` to lock local database records.
2. **Account Upgrades**: When the candidate updates their profile in settings, the client calls `linkWithCredential()` to attach email/password or OAuth credentials to the anonymous user account, preserving all logged study data.

---

## 3. Cloud Firestore Layout

To isolate candidate data while offering shared access to the standard CFA curriculum indices, we split database collections:

### 1. Global / Shared Collections (Read-Only to Candidates)
Shared syllabus database indices:
* `/curriculum/v2026/subjects/{subjectId}`
* `/curriculum/v2026/readings/{readingId}`
* `/curriculum/v2026/losList/{losId}`

### 2. User-Specific Collections (Private to Authenticated Candidate)
Contains personal progress, notes, and session timers:
* `/users/{userId}/profile` (Contains settings, target hours, streaks)
* `/users/{userId}/sessions/{sessionId}` (Contains stopwatch logs)
* `/users/{userId}/notes/{noteId}` (Contains markdown bodies)
* `/users/{userId}/resources/{resourceId}` (Contains resource link pointers)
* `/users/{userId}/revisions/{revisionId}` (Contains spaced repetition histories)
* `/users/{userId}/formulas/{formulaId}` (Contains formulas modification records)

---

## 4. Offline Synchronization Strategy

The system initializes Firestore with local persistence enabled:

```typescript
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

### Sync Rules:
* **Writes**: Updates to study sessions or notes are written to the local cache immediately. Firestore synchronizes edits to the server in the background.
* **Conflict Resolution**: Last-Write-Wins (LWW) based on `updatedTime` ISO timestamps. If notes are modified offline on two devices, the version with the newer client timestamp overwrite the older.

---

## 5. Security Rules

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Curriculum index is public read, admin write
    match /curriculum/{version=**} {
      allow read: if true;
      allow write: if false;
    }
    
    // User scope matches authentication uid
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Cloud Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
* **Storage Paths**: Files are uploaded to paths matching `users/{userId}/resources/{resourceId}`.

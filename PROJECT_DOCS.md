# ICPC HUE - Deep Dive Archive

## 🧠 System Architecture & Data Flow

The system employs a **Defense-in-Depth** strategy, layering security, validation, and encryption before data ever reaches the persistence layer.

### Core Data Flow & Security Pipeline
This flowchart illustrates the complete lifecycle of a user request, from the React frontend through the tiered middleware security architecture, to the encrypted database storage and asynchronous background workers.

```mermaid
graph TD
    subgraph Client ["Frontend Layer (Next.js 16)"]
        UI[User Interface]
        ApplyPage[Apply Page]
        Dash[Dashboard]
        NextAPI["Next.js API Routes (/api/*)"]
        
        UI --> ApplyPage
        UI --> Dash
        ApplyPage -->|POST JSON| NextAPI
        Dash -->|GET Data| NextAPI
    end

    subgraph Security ["Security Middleware Layer"]
        M_Rate[Rate Limiter]
        M_Bot[Bot Blocker & Analytics]
        M_Auth[API Key Validator]
        M_Sanitize[Input Sanitizer]
        
        NextAPI -->|Forward Request| M_Rate
        M_Rate --> M_Bot
        M_Bot --> M_Auth
        M_Auth --> M_Sanitize
    end

    subgraph Backend ["Backend Controller Logic (Express)"]
        Controller{Request Type?}
        
        subgraph Sub_App ["Application Submission Flow"]
            Encrypt[PII Encryption Service]
            Unique[Uniqueness Check (Decryption Scan)]
            ScrapeTrigger[Async Scraper Trigger]
        end
        
        subgraph Sub_Admin ["Admin Access Flow"]
            BasicAuth[Basic Auth Check]
            TOTP[TOTP 2FA Verification]
            Decrypt[PII Decryption Service]
            Render[SSR Admin Panel]
        end
        
        subgraph Sub_Judge ["Judge0 Integration"]
            J_Logic[Custom Comparator]
            J_Cheat[Cheat Detection]
            J_API[External Judge0 API]
        end
    end

    subgraph Workers ["Background Workers"]
        CF_W[Codeforces Scraper]
        LC_W[LeetCode Scraper]
    end

    subgraph Data ["Persistence Layer (PostgreSQL)"]
        DB[(Applications DB)]
        Logs[(Access Logs)]
    end

    M_Sanitize --> Controller
    
    Controller -->|Submit App| Encrypt
    Encrypt --> Unique
    Unique -->|Insert Encrypted| DB
    Unique -->|Trigger| ScrapeTrigger
    
    ScrapeTrigger -.->|Async Fire| CF_W
    ScrapeTrigger -.->|Async Fire| LC_W
    
    CF_W -->|Update Stats| DB
    LC_W -->|Update Stats| DB

    Controller -->|Admin View| BasicAuth
    BasicAuth --> TOTP
    TOTP -->|Fetch| DB
    DB -->|Encrypted Data| Decrypt
    Decrypt --> Render
    Render -->|HTML| Client

    Controller -->|Solve Problem| J_Logic
    J_Logic --> J_API
    J_API -- Result --> J_Logic
    J_Logic --> J_Cheat
    J_Cheat --> DB

    Controller -.->|Audit| Logs
```

---

## ⚖️ Judge0 Integration & Internal Logic

The platform integrates a **Self-Hosted Judge0** instance for compiling and executing C++ code (GCC 9.2.0). However, it adds a layer of custom logic *on top* of the standard output comparison.

### 1. Robust Output Comparison (The "BigInt" Fix)
Standard string comparison fails in edge cases typical of competitive programming (e.g., extra whitespace, floating point precision). We implemented a custom `compareOutputs` function in `/api/judge/submit`:
- **Tokenization**: Splits output by whitespace to ignore formatting differences.
- **BigInt Detection**: Automatically detects integers larger than `2^53 - 1` (JavaScript's `MAX_SAFE_INTEGER`). Instead of losing precision by converting to `Number` (Float), it uses `BigInt` for exact comparison.
- **Epsilon Comparator**: For floating-point numbers, it applies a `1e-5` tolerance window to account for standard IEE754 rounding errors.

### 2. Shadow Ban System (Anti-Cheat)
The judge doesn't just check correctness; it checks behavior. Users can be "Shadow Banned" automatically:
- **Detection Triggers**:
  - **Impossible Speed**: Solving a hard problem in `< 20 seconds`.
  - **Copy-Paste Patterns**: Analyzing `pasteEvents` and `tabSwitches` sent from the frontend.
  - **Rapid Fire**: Solving distinct problems within `< 45 seconds` of each other.
- **Consequence**: Upon reaching 5 flags, `is_shadow_banned` is set to TRUE. The user can still submit and sees "Accepted", but their score is silently removed from the public leaderboard.

---

## 📚 Training Sheets System (Sheet-1)

The training curriculum is defined as code in `@/lib/problems.ts` to ensure fast, zero-latency access during contests.

### Structure
- **Sheet-1**: "Say Hello With C++"
- **Problems**: 26 Problems (A-Z) covering basics (Input/Output, Data Types, Conditions, Loops).
- **Test Cases**: Each problem contains hardcoded I/O examples and hidden test cases.

### Dual Submission Modes
1.  **Judge Submission**:
    -   Route: `/api/judge/submit`
    -   Action: Compiles code, runs against test cases, updates stats.
2.  **Sheet File Upload**:
    -   Route: `/api/sheets/submit`
    -   Action: Uploads a `.cpp` file for manual review by a coach, bypassing the automated judge.

---

## 🔒 Security & Privacy Implementation

### 1. Zero-Knowledge-Style Privacy
We implement **Application-Level Encryption** for Personally Identifiable Information (PII).
- **Sensitive Fields**: `National ID`, `Telephone`, `Email`.
- **Method**: AES-256 encryption using `crypto-js` before trying the database.
- **Key Management**: Keys are stored in environment variables (`DB_ENCRYPTION_KEY`), never in the DB.
- **Uniqueness Check**: Due to encryption, standard SQL `UNIQUE` constraints cannot work on raw data. The system performs an O(N) scan by decrypting relevant fields to ensure no duplicate entries exist.

### 2. Admin Security (Multi-Factor)
The Admin Panel is protected by more than just a password.
- **Layer 1**: Basic Authentication (Username/Password).
- **Layer 2**: **Time-based One-Time Password (TOTP)**. Administrators must append a 6-digit Google Authenticator code to their password `password,123456`.

---

## 🧩 Frontend Architecture (Next.js 16)

The frontend is split into distinct functional domains, utilizing the App Router for seamless navigation.

### API Structure (`/app/api`)
- **/auth**: Handles detailed authentication flows (Login, Register, Email Verification).
- **/judge**: Internal judge interface for problems.
- **/analyze-complexity**: AI-powered code analysis endpoint.
- **/leaderboard**: Fetches cached leaderboard data.

### Visual Components
- **3D Engine**: Uses `react-three-fiber` for the `Hero` scene and `Badge3D` elements.
- **Gamification**: `AchievementsWidget` tracks user progress locally before syncing.

---

## ⚡ Performance Concepts

- **Optimistic Updates**: The UI updates immediately upon badge earning or submission, syncing in the background.
- **Background Scraping**: Profile data (Codeforces/LeetCode) is scraped asynchronously. The user gets an immediate "Success" response while the server spawns a detached worker to fetch external stats.

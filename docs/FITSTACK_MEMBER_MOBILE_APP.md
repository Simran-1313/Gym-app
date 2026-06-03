# FitStack Member Mobile App — Complete Implementation Guide

**Version:** 1.0  
**Date:** June 2026  
**Audience:** Backend engineers, mobile engineers, QA, product — no prior context required  
**Platform:** Expo (React Native) + existing FitStack multi-tenant backend (to be extended)

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [How It Fits in the Product](#2-how-it-fits-in-the-product)
3. [System Architecture](#3-system-architecture)
4. [Backend — What You Must Build](#4-backend--what-you-must-build)
5. [Mobile App — Folder Structure](#5-mobile-app--folder-structure)
6. [Mobile App — Dependencies](#6-mobile-app--dependencies)
7. [Environment Variables](#7-environment-variables)
8. [Authentication (Mobile vs Admin Panel)](#8-authentication-mobile-vs-admin-panel)
9. [Screen Specifications](#9-screen-specifications)
10. [White-Label Branding](#10-white-label-branding)
11. [Payments (Razorpay)](#11-payments-razorpay)
12. [Push Notifications](#12-push-notifications)
13. [Phased Build Roadmap](#13-phased-build-roadmap)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment Checklist](#15-deployment-checklist)
16. [Appendix A — TypeScript Types (Shared)](#appendix-a--typescript-types-shared)
17. [Appendix B — Error Codes](#appendix-b--error-codes)
18. [Appendix C — Manual QA Checklists](#appendix-c--manual-qa-checklists)

---

## 1. What We Are Building

FitStack is a **multi-tenant gym management SaaS**. Each gym is a **tenant**. Gym owners use the **Admin Web Panel** (Next.js, port 3000) to manage members, billing, classes, staff, etc.

This document describes the **Member Mobile App** — a **branded iOS + Android app** that gym members use to:

- Log in with credentials emailed by their gym
- View membership status and renew/pay online
- Book fitness classes
- See workout and diet plans (later phases)
- Receive push notifications (expiry reminders, class reminders)
- View invoices and check-in history

**One Expo codebase** ships to both iOS and Android. Each gym gets **white-label branding** (logo, colors, gym name) loaded from the backend after login.

**Backend assumption:** You already have (or will build) a Node/Express API at `http://localhost:4000` with admin routes under `/api/admin/*`. This guide defines **new member routes** under `/api/member/*` that reuse the same database, tenant isolation, and business logic.

---

## 2. How It Fits in the Product

### Competitor context (why this app matters)

Indian gym software competitor FitGymSoftware offers a branded member app but lacks:

- Member self-booking from the app (we build this — P0)
- Push notifications (we build this — P0)
- Trainer–member chat (P1)
- AI workout plans (P1)

Our member app is a **key differentiator** in Phase 2 of the product roadmap.

### Roles in the system

| Role        | Client              | Auth cookie/token      | Can see                          |
|-------------|---------------------|------------------------|----------------------------------|
| SUPER_ADMIN | Super-admin panel   | `super_admin_token`    | All tenants                      |
| ADMIN       | Admin web panel     | `admin_token` (cookie) | Own gym only                     |
| MEMBER      | **This mobile app** | `member_token` (JWT)   | Own profile + own gym's public data |

### What the member app does NOT do

- Create or manage other members
- Access admin reports, leads, staff payroll, POS
- See data from other gyms
- Store passwords in plain text or tokens in AsyncStorage (use SecureStore)

---

## 3. System Architecture

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  Member Mobile App  │  HTTPS  │   FitStack Backend API       │
│  (Expo / RN)        │────────▶│   localhost:4000 (dev)       │
│  iOS + Android      │  Bearer │                              │
└─────────────────────┘  JWT    │  /api/admin/*  ← Admin panel │
                                │  /api/member/* ← THIS DOC    │
                                └──────────────┬───────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
              PostgreSQL                  Razorpay                   Firebase FCM
         (schema per tenant)           (payments)              (push notifications)
```

### Request flow (every member API call)

1. Mobile app sends `Authorization: Bearer <member_token>` header.
2. Backend middleware verifies JWT, extracts `userId`, `tenantId`, `role`.
3. If `role !== 'MEMBER'`, return `403`.
4. Backend switches DB schema to tenant's schema (same as admin).
5. Query runs scoped to that member or tenant-public data only.
6. Response: `{ success, message, data?, meta? }`.

### Multi-tenancy rule (critical)

- **Never** accept `tenantId` from the mobile client in create/update bodies.
- Resolve `tenantId` only from the JWT.
- A member belongs to exactly one tenant; they cannot switch gyms in one login session.

---

## 4. Backend — What You Must Build

All endpoints below are **new**. Prefix every route with `/api/member`.

### 4.1 Standard response shape

Every endpoint returns JSON:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

`meta` is only present on paginated list endpoints.

### 4.2 Auth middleware

Create `memberAuthMiddleware`:

```
Input:  Authorization: Bearer <token>
Output: req.user = { id, email, role: 'MEMBER', tenantId, isFirstLogin }
Errors:
  401 — missing or invalid token
  403 — role is not MEMBER
  403 — "Your gym account has been suspended" (tenant.isActive === false)
  403 — member isActive === false
```

JWT payload fields:

```typescript
{
  sub: string       // user id
  email: string
  role: 'MEMBER'
  tenantId: string
  iat: number
  exp: number       // 7 days recommended for access token
}
```

Cookie name for admin: `admin_token`.  
Mobile uses **no cookies** — header only. Optionally support refresh tokens (see §4.3).

---

### 4.3 Auth endpoints

#### POST `/api/member/auth/login`

**Auth:** None  
**Body:**

```json
{
  "email": "member@gym.com",
  "password": "tempPassword123",
  "gymSlug": "iron-paradise"
}
```

`gymSlug` identifies which tenant the member belongs to. Required because one email could theoretically exist across tenants (use gym slug to resolve tenant before credential check).

**Success 200:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "opaque-random-string",
    "expiresIn": 604800,
    "isFirstLogin": true,
    "user": {
      "id": "uuid",
      "email": "member@gym.com",
      "name": "Rahul Sharma",
      "phone": "9876543210",
      "avatarUrl": null,
      "isFirstLogin": true,
      "tenant": {
        "id": "uuid",
        "name": "Iron Paradise Gym",
        "slug": "iron-paradise",
        "logo": "https://cdn.../logo.png",
        "primaryColor": "#2563EB",
        "isActive": true
      }
    }
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| 400 | Validation error (invalid email, missing fields) |
| 401 | Invalid email or password |
| 403 | Gym account suspended |
| 404 | Gym not found (bad gymSlug) |

**Backend logic:**

1. Find tenant by `gymSlug`.
2. Find user where `email + tenantId + role=MEMBER`.
3. Compare bcrypt password.
4. Issue access JWT + refresh token (store refresh token hash in DB with expiry 30 days).
5. Return user + tenant branding.

---

#### POST `/api/member/auth/refresh`

**Auth:** None  
**Body:** `{ "refreshToken": "..." }`  
**Success:** New `accessToken` + `expiresIn`.  
**Errors:** 401 if refresh token invalid/expired/revoked.

---

#### POST `/api/member/auth/logout`

**Auth:** Bearer  
**Body:** `{ "refreshToken": "..." }` (optional — revoke refresh token)  
**Success:** `{ success: true, message: "Logged out" }`

---

#### POST `/api/member/auth/change-password`

**Auth:** Bearer (required — first-login flow)  
**Body:**

```json
{
  "currentPassword": "temp123",
  "newPassword": "NewSecure1!",
  "confirmPassword": "NewSecure1!"
}
```

**Validation:**

- `newPassword` min 8 chars, 1 uppercase, 1 number, 1 special `!@#$%^&*`
- `newPassword === confirmPassword`

**Success:** Set `isFirstLogin = false`, revoke all refresh tokens, return `{ success: true, message: "Password changed. Please login again." }`  
Mobile app then clears tokens and navigates to login.

---

#### GET `/api/member/auth/me`

**Auth:** Bearer  
**Success:**

```json
{
  "success": true,
  "data": {
    "user": { /* same user shape as login */ },
    "activeSubscription": { /* see Subscription type */ }
  }
}
```

---

#### PATCH `/api/member/auth/me/profile`

**Auth:** Bearer  
**Body:** `{ "name"?: string, "phone"?: string }`  
**Success:** Updated user object.

---

#### POST `/api/member/auth/forgot-password`

**Auth:** None  
**Body:** `{ "email": "...", "gymSlug": "..." }`  
**Success:** Always return 200 with "If an account exists, reset instructions were sent" (no email enumeration).  
**Backend:** Generate reset token, email link (web page or deep link). Implement in Phase 1.

---

### 4.4 Membership & subscriptions

#### GET `/api/member/subscription`

**Auth:** Bearer  
**Returns:** Current active subscription or null.

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "startDate": "2026-01-01",
      "endDate": "2026-04-01",
      "status": "ACTIVE",
      "paymentStatus": "PAID",
      "freezeStartDate": null,
      "freezeEndDate": null,
      "plan": {
        "id": "uuid",
        "name": "Quarterly Premium",
        "price": 8999,
        "durationDays": 90
      }
    },
    "daysRemaining": 42,
    "isExpiringSoon": false
  }
}
```

`isExpiringSoon`: true when `daysRemaining <= 7`.

---

#### GET `/api/member/subscription/history`

**Auth:** Bearer  
**Query:** `page`, `limit`  
**Returns:** Paginated list of past subscriptions.

---

#### GET `/api/member/plans`

**Auth:** Bearer  
**Returns:** Active membership plans the member can purchase/renew.

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "Monthly",
        "price": 2999,
        "durationDays": 30,
        "description": "Full gym access"
      }
    ]
  }
}
```

Only return `isActive: true` plans for member's tenant.

---

### 4.5 Payments (Razorpay)

#### POST `/api/member/payments/create-order`

**Auth:** Bearer  
**Body:**

```json
{
  "membershipPlanId": "uuid",
  "type": "RENEWAL"
}
```

`type`: `RENEWAL` | `NEW` (first subscription after trial)

**Success:**

```json
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "razorpayKeyId": "rzp_test_xxx",
    "amount": 899900,
    "currency": "INR",
    "planName": "Quarterly Premium"
  }
}
```

Amount in **paise** (899900 = ₹8999).

---

#### POST `/api/member/payments/verify`

**Auth:** Bearer  
**Body:**

```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature"
}
```

**Backend:**

1. Verify Razorpay signature with server secret.
2. Create/update subscription, set `paymentStatus: PAID`, generate invoice.
3. Return updated subscription + invoice id.

**Errors:** 400 invalid signature, 409 already processed.

---

### 4.6 Classes & booking

#### GET `/api/member/classes`

**Auth:** Bearer  
**Query:** `dayOfWeek?` (0=Sunday..6=Saturday), `date?` (ISO date for week view)

**Returns:** Classes with schedules and booking availability.

```json
{
  "success": true,
  "data": {
    "classes": [
      {
        "id": "uuid",
        "name": "HIIT Blast",
        "description": "High intensity",
        "capacity": 20,
        "durationMinutes": 45,
        "trainer": { "id": "uuid", "name": "Priya Singh" },
        "schedules": [
          {
            "scheduleId": "uuid",
            "dayOfWeek": 1,
            "startTime": "07:00",
            "bookedCount": 15,
            "spotsLeft": 5,
            "memberBookingStatus": null
          }
        ]
      }
    ]
  }
}
```

`memberBookingStatus`: `null` | `"BOOKED"` | `"WAITLISTED"` | `"CANCELLED"`

---

#### GET `/api/member/classes/schedule`

**Auth:** Bearer  
**Query:** `from` (ISO date), `to` (ISO date)  
**Returns:** Flat list of class occurrences in date range for calendar UI.

---

#### POST `/api/member/classes/book`

**Auth:** Bearer  
**Body:**

```json
{
  "classId": "uuid",
  "scheduleId": "uuid",
  "date": "2026-06-10"
}
```

**Rules:**

- Reject if class full → optionally add to waitlist if `enableWaitlist` tenant setting.
- Reject if member subscription not ACTIVE.
- Reject if booking cutoff passed (e.g. 2 hours before class — configurable per tenant).
- One booking per member per class occurrence.

**Success:** `{ booking: { id, status: "BOOKED", ... } }`

---

#### POST `/api/member/classes/bookings/:bookingId/cancel`

**Auth:** Bearer  
**Rules:** Apply cancellation policy (e.g. cannot cancel within 1 hour of start).

---

#### GET `/api/member/classes/bookings`

**Auth:** Bearer  
**Query:** `status?`, `from?`, `to?`, `page`, `limit`  
**Returns:** Member's bookings (upcoming + past).

---

### 4.7 Check-ins

#### GET `/api/member/checkins`

**Auth:** Bearer  
**Query:** `page`, `limit`, `from?`, `to?`  
**Returns:** Member's own check-in history.

```json
{
  "success": true,
  "data": {
    "checkins": [
      {
        "id": "uuid",
        "method": "QR",
        "checkInAt": "2026-06-04T08:30:00Z",
        "checkOutAt": "2026-06-04T10:00:00Z"
      }
    ]
  }
}
```

---

#### POST `/api/member/checkins/qr`

**Auth:** Bearer  
**Body:** `{ "qrPayload": "signed-string-from-gym-qr" }`  
**Backend:** Validate QR signature + expiry, create check-in for authenticated member.  
Used when gym displays rotating QR at entrance.

---

### 4.8 Invoices

#### GET `/api/member/invoices`

**Auth:** Bearer  
**Query:** `page`, `limit`, `status?`

#### GET `/api/member/invoices/:id`

**Auth:** Bearer — only invoices belonging to this member.

#### GET `/api/member/invoices/:id/pdf`

**Auth:** Bearer  
**Returns:** PDF binary stream (`Content-Type: application/pdf`).

---

### 4.9 Notifications

#### GET `/api/member/notifications`

**Auth:** Bearer  
**Query:** `page`, `limit`, `unreadOnly?`

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "Membership expiring soon",
        "body": "Your plan expires in 5 days",
        "type": "EXPIRY_REMINDER",
        "readAt": null,
        "createdAt": "2026-06-01T10:00:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

#### PATCH `/api/member/notifications/:id/read`

#### POST `/api/member/notifications/read-all`

#### POST `/api/member/devices`

**Auth:** Bearer  
**Body:**

```json
{
  "pushToken": "ExponentPushToken[xxx]",
  "platform": "ios"
}
```

Register/update FCM/APNs token for push notifications.

---

### 4.10 Gym info & branding (public + authenticated)

#### GET `/api/member/gym/info`

**Auth:** Bearer  
**Returns:**

```json
{
  "success": true,
  "data": {
    "tenant": {
      "name": "Iron Paradise Gym",
      "logo": "https://...",
      "primaryColor": "#2563EB",
      "address": "123 MG Road, Pune",
      "phone": "+91...",
      "hours": "Mon-Sat 6am-10pm"
    },
    "features": {
      "classBooking": true,
      "inAppPayments": true,
      "workoutPlans": false
    }
  }
}
```

`features` driven by tenant plan tier (Starter/Growth/Enterprise).

---

### 4.11 Workout & diet plans (Phase 2)

#### GET `/api/member/workout-plans`

Returns plans assigned to this member by trainer/admin.

#### GET `/api/member/workout-plans/:id`

#### GET `/api/member/diet-plans`

Same pattern.

---

### 4.12 Database tables to add (backend)

If not already present, create:

```sql
-- Refresh tokens for mobile
CREATE TABLE member_refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class bookings
CREATE TABLE class_bookings (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL,
  class_id UUID NOT NULL,
  schedule_id UUID NOT NULL,
  class_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- BOOKED, CANCELLED, ATTENDED, NO_SHOW, WAITLISTED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, class_id, schedule_id, class_date)
);

-- Push device tokens
CREATE TABLE member_devices (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL,
  push_token VARCHAR(512) NOT NULL,
  platform VARCHAR(10) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, push_token)
);

-- In-app notifications
CREATE TABLE member_notifications (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant branding extension (alter existing tenants table)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#2563EB';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS operating_hours TEXT;
```

---

### 4.13 CORS configuration (backend)

Admin panel uses cookies; mobile uses Bearer tokens. Add mobile app origins:

```env
FRONTEND_ADMIN_URL=http://localhost:3000
# Expo dev — use your machine LAN IP
MOBILE_APP_ORIGINS=http://localhost:8081,exp://192.168.x.x:8081
```

CORS must allow:

- `Authorization` header
- Methods: GET, POST, PATCH, DELETE
- **Do not** require credentials for member routes (no cookies)

---

### 4.14 Backend folder structure (suggested)

```
backend/
├── src/
│   ├── routes/
│   │   ├── admin/          # existing
│   │   └── member/         # NEW
│   │       ├── auth.routes.ts
│   │       ├── subscription.routes.ts
│   │       ├── payments.routes.ts
│   │       ├── classes.routes.ts
│   │       ├── checkins.routes.ts
│   │       ├── invoices.routes.ts
│   │       ├── notifications.routes.ts
│   │       └── gym.routes.ts
│   ├── middleware/
│   │   ├── adminAuth.ts
│   │   └── memberAuth.ts     # NEW
│   ├── controllers/member/   # NEW
│   ├── services/
│   │   ├── razorpay.service.ts
│   │   └── push.service.ts   # NEW — FCM
│   └── validators/member/    # NEW — zod schemas
```

Mount member routes:

```typescript
app.use('/api/member/auth', memberAuthRoutes);
app.use('/api/member', memberAuthMiddleware, memberProtectedRoutes);
// login/refresh/forgot-password excluded from middleware
```

---

## 5. Mobile App — Folder Structure

Create the app as **`fitstack-member-app`** (or use existing `GymMemberApp` and rename).

```
fitstack-member-app/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root: providers, auth gate, theme
│   ├── index.tsx                 # Redirect → login or (tabs)
│   ├── (auth)/                   # Unauthenticated stack
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── change-password.tsx   # Forced on isFirstLogin
│   │   └── forgot-password.tsx
│   └── (app)/                    # Authenticated stack
│       ├── _layout.tsx           # Tab navigator
│       ├── (tabs)/
│       │   ├── _layout.tsx
│       │   ├── home.tsx          # Dashboard
│       │   ├── classes.tsx       # Browse + book
│       │   ├── membership.tsx    # Plan + renew
│       │   └── profile.tsx
│       ├── class/
│       │   └── [id].tsx          # Class detail + book button
│       ├── booking/
│       │   └── [id].tsx          # Booking detail / cancel
│       ├── invoice/
│       │   └── [id].tsx
│       ├── checkins.tsx
│       ├── notifications.tsx
│       ├── invoices.tsx
│       └── payment/
│           └── checkout.tsx      # Razorpay WebView / native SDK
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   └── ErrorView.tsx
│   │   ├── membership/
│   │   │   ├── SubscriptionCard.tsx
│   │   │   └── PlanPicker.tsx
│   │   ├── classes/
│   │   │   ├── ClassListItem.tsx
│   │   │   ├── WeekCalendar.tsx
│   │   │   └── BookingButton.tsx
│   │   └── layout/
│   │       ├── Screen.tsx        # SafeArea + scroll wrapper
│   │       └── GymHeader.tsx     # Logo + gym name
│   ├── lib/
│   │   ├── api.ts                # Axios instance + interceptors
│   │   ├── apiServices.ts        # Typed API functions
│   │   ├── authStorage.ts        # expo-secure-store wrappers
│   │   └── queryClient.ts        # TanStack Query client
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts           # Tenant primary color
│   │   └── useNotifications.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── types/
│   │   └── index.ts              # Mirror backend types
│   ├── utils/
│   │   ├── dates.ts
│   │   ├── currency.ts           # paise → ₹ display
│   │   └── validation.ts         # zod schemas
│   └── constants/
│       ├── config.ts
│       └── colors.ts
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
├── __tests__/
│   ├── unit/
│   │   ├── utils/currency.test.ts
│   │   └── utils/validation.test.ts
│   ├── components/
│   │   └── SubscriptionCard.test.tsx
│   └── integration/
│       └── authFlow.test.ts
├── e2e/                          # Maestro or Detox
│   └── flows/
│       ├── login.yaml
│       ├── book-class.yaml
│       └── renew-membership.yaml
├── app.json
├── eas.json                      # EAS Build profiles
├── .env.example
├── tsconfig.json
└── package.json
```

### Routing rules (Expo Router)

| Condition | Route |
|-----------|-------|
| No token | `(auth)/login` |
| Token + `isFirstLogin` | `(auth)/change-password` |
| Token + password OK | `(app)/(tabs)/home` |
| 401 from API | Clear token → login |

Implement auth gate in `app/_layout.tsx`:

```typescript
// Pseudocode — implement in AuthProvider
if (isLoading) return <LoadingScreen />;
if (!accessToken) return <Redirect href="/(auth)/login" />;
if (user?.isFirstLogin) return <Redirect href="/(auth)/change-password" />;
return <Slot />;
```

---

## 6. Mobile App — Dependencies

```bash
npx create-expo-app@latest fitstack-member-app -t expo-template-blank-typescript
cd fitstack-member-app
npx expo install expo-router expo-secure-store expo-notifications expo-linking expo-constants
npm install axios @tanstack/react-query zod react-hook-form @hookform/resolvers
npm install react-native-razorpay   # or WebView checkout — see §11
npm install -D jest @testing-library/react-native jest-expo @types/jest
npm install -D maestro              # optional E2E
```

**package.json scripts to add:**

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 7. Environment Variables

### Mobile (`.env`)

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
EXPO_PUBLIC_DEFAULT_GYM_SLUG=iron-paradise
```

Use LAN IP in development — Android emulator cannot reach `localhost` on your machine.  
For production:

```env
EXPO_PUBLIC_API_URL=https://api.fitstack.in
```

Access in code: `process.env.EXPO_PUBLIC_API_URL`.

### Backend (`.env` additions)

```env
JWT_MEMBER_SECRET=long-random-string-different-from-admin
JWT_MEMBER_EXPIRES_IN=7d
JWT_MEMBER_REFRESH_EXPIRES_IN=30d
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
FCM_SERVER_KEY=xxx
```

---

## 8. Authentication (Mobile vs Admin Panel)

| Aspect | Admin Web Panel | Member Mobile App |
|--------|-----------------|-------------------|
| Token delivery | httpOnly cookie `admin_token` | JSON `accessToken` in login response |
| Storage | Browser cookie (JS cannot read) | `expo-secure-store` |
| Request auth | Cookie sent automatically (`withCredentials: true`) | `Authorization: Bearer <token>` |
| Refresh | Session cookie refresh server-side | POST `/auth/refresh` with refresh token |
| First login | Redirect to `/change-password` | Redirect to `(auth)/change-password` |
| Logout | POST logout, cookie cleared | Clear SecureStore + POST logout |

### Mobile axios setup (`src/lib/api.ts`)

```typescript
import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './authStorage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = await getRefreshToken();
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.EXPO_PUBLIC_API_URL}/api/member/auth/refresh`,
            { refreshToken: refresh }
          );
          await setTokens(data.data.accessToken, refresh);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          await clearTokens();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Secure storage keys

```
fitstack_access_token
fitstack_refresh_token
fitstack_gym_slug        # remember last gym for login UX
```

---

## 9. Screen Specifications

### 9.1 Login

**Fields:** Gym code/slug (pre-filled from env or last login), email, password  
**Actions:** Login → store tokens → fetch `/auth/me` → route  
**Errors:** Show `error.response.data.message`  
**Suspended gym:** Show full-screen message with support contact

### 9.2 Change password (first login)

Same validation as admin panel. On success → clear tokens → show "Login again" → login screen.

### 9.3 Home tab

**Shows:**

- Gym logo + "Welcome, {name}"
- Subscription status card (plan name, expiry, days left, color-coded urgency)
- Quick actions: Book class, Renew, View QR (for check-in)
- Upcoming booked classes (next 3)
- Unread notifications badge

**API calls:** `GET /auth/me`, `GET /classes/bookings?from=today&limit=3`, `GET /notifications?unreadOnly=true`

### 9.4 Classes tab

- Week strip selector (Mon–Sun)
- List of classes for selected day with spots left
- Tap → class detail

### 9.5 Class detail

- Name, trainer, time, duration, spots left
- Book / Cancel / Join waitlist button (state machine)
- Disable book if subscription expired

### 9.6 Membership tab

- Current plan card
- History list
- "Renew" / "Upgrade" → plan picker → checkout

### 9.7 Profile tab

- Name, email, phone (editable)
- Check-in history link
- Invoices link
- Notifications settings
- Logout

### 9.8 Payment checkout

- Show plan summary + GST if applicable
- Open Razorpay
- On success → verify API → show receipt → navigate to membership

### 9.9 Notifications

- List with read/unread
- Tap to mark read + deep link (e.g. membership tab for EXPIRY_REMINDER)

---

## 10. White-Label Branding

After login, store tenant branding in `ThemeContext`:

```typescript
interface TenantTheme {
  name: string;
  logo: string | null;
  primaryColor: string; // hex, default #2563EB
}
```

Apply `primaryColor` to:

- Tab bar active tint
- Primary buttons
- Header accents

**Do not** show "FitStack" prominently — show gym name. Small "Powered by FitStack" in profile footer is acceptable for Starter tier; remove for Enterprise white-label.

---

## 11. Payments (Razorpay)

### Flow

1. User selects plan → `POST /payments/create-order`
2. Open Razorpay checkout with `orderId`, `key`, `amount`
3. On success callback → `POST /payments/verify` with payment ids
4. Show success/failure

### React Native integration

**Option A (recommended for India):** `react-native-razorpay` — requires EAS dev build (not Expo Go).

**Option B:** Razorpay WebView checkout — works in Expo Go for development.

### Test cards (Razorpay test mode)

Use Razorpay dashboard test keys. UPI test flow available in sandbox.

---

## 12. Push Notifications

### Setup

1. Configure Firebase project → add iOS/Android apps
2. Add `google-services.json` (Android) and APNs key (iOS) to EAS
3. Use `expo-notifications` to get `ExponentPushToken`
4. On login: `POST /devices` with token
5. Backend sends via FCM when: expiry reminder, class reminder (1h before), payment confirmation

### Notification types

| type | Trigger |
|------|---------|
| EXPIRY_REMINDER | 7, 3, 1 days before subscription end |
| CLASS_REMINDER | 60 min before booked class |
| PAYMENT_SUCCESS | After verify |
| MEMBERSHIP_FROZEN | Admin freezes membership |

---

## 13. Phased Build Roadmap

### Phase 0 — Foundation (Week 1–2)

**Backend:**

- [ ] Member auth (login, refresh, logout, me, change-password)
- [ ] memberAuth middleware + tenant isolation
- [ ] CORS for mobile

**Mobile:**

- [ ] Project scaffold + folder structure
- [ ] Auth flow (login, secure storage, change password)
- [ ] API layer + AuthContext

**Exit criteria:** Member can log in, change temp password, see empty home screen.

---

### Phase 1 — MVP (Week 3–5)

**Backend:**

- [ ] Subscription + plans endpoints
- [ ] Razorpay create-order + verify
- [ ] Invoices list + PDF
- [ ] Check-in history
- [ ] Gym info/branding

**Mobile:**

- [ ] Home dashboard with subscription card
- [ ] Membership tab + renewal payment
- [ ] Profile + invoices list
- [ ] Theming from tenant

**Exit criteria:** Member can view membership, pay renewal, see invoices.

---

### Phase 2 — Classes + Push (Week 6–8)

**Backend:**

- [ ] Class listing, book, cancel, waitlist
- [ ] Device registration + FCM push service
- [ ] Notification inbox endpoints

**Mobile:**

- [ ] Classes tab + booking flow
- [ ] Push permission + token registration
- [ ] Notifications screen

**Exit criteria:** Member can book/cancel class, receive push reminder.

---

### Phase 3 — Engagement (Week 9–12)

**Backend:**

- [ ] Workout/diet plan assignment endpoints
- [ ] QR check-in
- [ ] Progress photos upload (S3 presigned URLs)

**Mobile:**

- [ ] Workout plan viewer
- [ ] QR scanner for check-in
- [ ] Progress tracker

---

### Phase 4 — Differentiation (Future)

- Trainer chat (WebSocket)
- AI workout plans
- In-app shop (products from admin POS catalog)
- Community feed

---

## 14. Testing Strategy

### 14.1 Backend tests (Jest + Supertest)

| Suite | What to test |
|-------|--------------|
| auth.login | Valid login, wrong password, suspended tenant, wrong gymSlug |
| auth.changePassword | First login flow, validation rules, token revocation |
| member isolation | Member A cannot access Member B's invoices |
| tenant isolation | Member from tenant A cannot book tenant B classes |
| payments.verify | Valid signature creates subscription; replay rejected |
| class.book | Capacity limit, expired membership rejected, waitlist |

**Example test:**

```typescript
describe('POST /api/member/classes/book', () => {
  it('returns 403 when subscription expired', async () => {
    const token = await loginAsMemberWithExpiredSub();
    const res = await request(app)
      .post('/api/member/classes/book')
      .set('Authorization', `Bearer ${token}`)
      .send({ classId, scheduleId, date: '2026-06-10' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/subscription/i);
  });
});
```

Run: `npm test` in backend. Target **80%+ coverage** on member routes.

---

### 14.2 Mobile unit tests (Jest)

Test pure functions and components without network:

- `currency.ts` — paise to ₹ formatting
- `validation.ts` — login and password schemas
- `SubscriptionCard` — renders "Expired" when daysRemaining <= 0
- `authStorage` — mock SecureStore

```bash
npm test
```

---

### 14.3 Mobile integration tests

Use MSW (Mock Service Worker) or jest mocks for axios:

- Login success → tokens stored
- 401 response → refresh token attempted
- Refresh fail → tokens cleared

---

### 14.4 E2E tests (Maestro — recommended for Expo)

Install: `curl -Ls "https://get.maestro.mobile.dev" | bash`

**`e2e/flows/login.yaml`:**

```yaml
appId: com.fitstack.member
---
- launchApp
- tapOn: "Email"
- inputText: "member@test.com"
- tapOn: "Password"
- inputText: "Test1234!"
- tapOn: "Log in"
- assertVisible: "Welcome"
```

Run against dev build:

```bash
maestro test e2e/flows/
```

**Critical E2E flows to automate:**

1. Login → home visible
2. First login → forced password change → re-login
3. Book class → appears in upcoming
4. Cancel booking
5. Renew membership (Razorpay test mode)

---

### 14.5 Manual QA matrix

Test on **real devices**:

| Device | OS | Priority |
|--------|-----|----------|
| Pixel 6 | Android 14 | P0 |
| Samsung A series | Android 13 | P1 (common in India) |
| iPhone 13 | iOS 17 | P0 |
| Low-end Android | Android 11 | P1 |

**Network conditions:** Test on 4G throttled, offline → show cached data or friendly error.

---

### 14.6 Security testing checklist

- [ ] JWT expired → 401, app refreshes or logs out
- [ ] Tampered JWT → 401
- [ ] Member cannot call `/api/admin/*` routes
- [ ] No tokens in logs or crash reports
- [ ] Certificate pinning (optional Phase 3 production hardening)
- [ ] Razorpay signature tampering rejected server-side

---

## 15. Deployment Checklist

### Backend

- [ ] Deploy API with HTTPS
- [ ] Set production JWT secrets
- [ ] Configure Razorpay live keys
- [ ] FCM production credentials
- [ ] Rate limit `/auth/login` (e.g. 10/min per IP)

### Mobile (EAS Build)

**`eas.json` profiles:**

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

Steps:

1. `eas build --platform android --profile production`
2. `eas build --platform ios --profile production`
3. Upload to Play Store / App Store
4. For per-gym white-label Enterprise: use EAS `app.config.js` dynamic `name`, `icon`, `bundleIdentifier` per tenant build

### App Store metadata

- App name: `{Gym Name}` not "FitStack"
- Screenshots: membership, classes, booking
- Privacy policy URL required

---

## Appendix A — TypeScript Types (Shared)

Copy to mobile `src/types/index.ts`. Keep in sync with backend.

```typescript
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FROZEN';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type BookingStatus = 'BOOKED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW' | 'WAITLISTED';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  isActive: boolean;
}

export interface MemberUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isFirstLogin: boolean;
  tenant: Tenant;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  description?: string;
}

export interface Subscription {
  id: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  paymentStatus: PaymentStatus;
  plan: MembershipPlan;
}

export interface ClassBooking {
  id: string;
  classId: string;
  className: string;
  date: string;
  startTime: string;
  status: BookingStatus;
  trainerName?: string;
}

export interface ApiResponse<T = void> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

---

## Appendix B — Error Codes

| HTTP | When | Mobile UX |
|------|------|-----------|
| 400 | Validation failed | Show field errors or toast |
| 401 | Invalid/expired token | Try refresh; else logout |
| 403 | Suspended gym/member/expired sub | Full-screen message with context |
| 404 | Resource not found | Back + toast |
| 409 | Duplicate booking / payment | Explain conflict |
| 422 | Business rule (class full) | Offer waitlist if available |
| 500 | Server error | "Try again later" + retry button |

Always display `response.data.message` to the user — never raw stack traces.

---

## Appendix C — Manual QA Checklists

### Auth

- [ ] Login with valid credentials
- [ ] Login with wrong password shows error
- [ ] Login to suspended gym shows suspension message
- [ ] First login forces password change
- [ ] After password change, old password rejected
- [ ] Logout clears session; back button cannot access app
- [ ] App restart: still logged in (token in SecureStore)
- [ ] Token expiry: silent refresh works

### Membership

- [ ] Active sub shows correct days remaining
- [ ] Expired sub shows renew CTA, booking disabled
- [ ] Renew payment completes and sub extends
- [ ] Invoice appears after payment

### Classes

- [ ] Schedule loads for each day of week
- [ ] Book class when spots available
- [ ] Full class shows waitlist (if enabled)
- [ ] Cancel within policy window works
- [ ] Cancel outside policy shows error

### Branding

- [ ] Gym logo appears on home
- [ ] Primary color applied to buttons/tabs
- [ ] Gym name in header, not FitStack

### Push

- [ ] Permission prompt on first launch after login
- [ ] Test push received on device
- [ ] Tap notification opens correct screen

---

## Quick Start Commands (Developer Onboarding)

```bash
# 1. Backend (implement member routes first)
cd backend && npm run dev   # port 4000

# 2. Mobile app
cd fitstack-member-app
cp .env.example .env          # set EXPO_PUBLIC_API_URL to your LAN IP
npm install
npx expo start

# 3. Run tests
npm test                      # mobile unit tests
cd ../backend && npm test     # backend API tests
maestro test e2e/flows/       # E2E (requires dev build)
```

---

## Document maintenance

When adding a feature:

1. Add backend endpoint spec to §4
2. Add screen spec to §9
3. Add test cases to §14
4. Update types in Appendix A
5. Add QA checklist items to Appendix C

---

*End of document — FitStack Member Mobile App Implementation Guide v1.0*

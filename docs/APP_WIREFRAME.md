# Gym App Wireframe

**Project:** Clasendra Member Mobile App  
**Platform:** Expo SDK 56, React Native 0.85, React 19  
**Document purpose:** Current-state product wireframe covering features, navigation routes, screens, user flows, and UI structure.

## 1. App Summary

This app is a white-label mobile experience for gym members. Members log in with gym-provided credentials, complete first-login setup, create a fitness profile, view AI-generated diet/workout plans, book classes, track check-ins and activity, chat with the gym community/trainers, browse gym products, and manage profile preferences.

The visual language is premium fitness + glassmorphism:

- Animated mesh/background gradients.
- Frosted glass cards and overlays.
- Floating custom bottom tab bar.
- Light/dark theme support.
- Gym branding through logo, name, and tenant data.
- Haptics on key interactions.

## 2. Current Features

| Area | Current Feature |
| --- | --- |
| Authentication | Member login, first-login password change, logout, current user refresh |
| Onboarding | Fitness profile form with age, weight, height, gender, goal, diet preference, activity level, allergies |
| AI Plans | Diet plan generation, workout plan generation, saved plan loading, regenerate plan actions |
| Home Dashboard | Greeting, member/gym summary, activity rings, hydration tracker, weekly snapshot, quick actions, BMI calculator |
| Classes | Browse schedules, date filter, capacity indicator, booking confirmation, booking success state |
| Bookings | View booked classes, status badges, cancel confirmed bookings |
| Check-ins | Visit history, method badges, active/in-progress check-ins, pagination |
| Activity | Rings, hydration logging, live workout timer, analytics chart, weekly consistency, wearable placeholder |
| Chat | Group/direct room list, search, live socket updates, unread counts |
| Chat Room | Text messages, images, emoji picker, typing indicators, read/delivered ticks, retry failed messages |
| FitCoach AI | AI fitness/nutrition chat with suggestions, streaming responses, stop generation |
| Notifications | Notification list, unread styling, fallback sample notifications |
| Products | Product list, search, category filter, pagination, product detail |
| Profile | Avatar picker, profile edit, fitness metrics, quick links, dark mode, logout confirmation |
| Push Notifications | Device token registration after login |

## 3. Route Map

### Auth Stack

| Route | Screen | When Shown |
| --- | --- | --- |
| `Login` | `LoginScreen` | No authenticated user |
| `ChangePassword` | `ChangePasswordScreen` | Authenticated user with `isFirstLogin` |

### Onboarding Stack

| Route | Screen | When Shown |
| --- | --- | --- |
| `Onboarding` | `OnboardingScreen` | Authenticated user with `isOnboarded === false` |
| `DietPlan` | `DietPlanScreen` | After onboarding submits profile |
| `WorkoutPlan` | `WorkoutPlanScreen` | Available in onboarding stack |

### Root Stack

| Route | Screen | Notes |
| --- | --- | --- |
| `MainTabs` | Bottom tabs | Main signed-in experience |
| `DietPlan` | `DietPlanScreen` | Opened from Home/Profile/Onboarding |
| `WorkoutPlan` | `WorkoutPlanScreen` | Opened from Home/Profile |
| `Onboarding` | `OnboardingScreen` | Used to update fitness profile |
| `Notifications` | `NotificationsScreen` | Opened from Home/Profile |
| `Activity` | `ActivityScreen` | Opened from Home/Profile |
| `Products` | `ProductsNavigator` | Nested products stack |

### Bottom Tabs

| Tab Route | Screen/Navigator | Purpose |
| --- | --- | --- |
| `Home` | `HomeScreen` | Member dashboard |
| `Classes` | `ClassesNavigator` | Schedules and bookings |
| `Chat` | `ChatNavigator` | Gym chats and AI coach |
| `CheckIns` | `CheckInsScreen` | Visit history |
| `Profile` | `ProfileScreen` | Account and preferences |

### Nested Stacks

| Stack | Route | Screen |
| --- | --- | --- |
| Classes | `ClassSchedules` | `ClassesScreen` |
| Classes | `MyBookings` | `BookingsScreen` |
| Chat | `ChatList` | `ChatListScreen` |
| Chat | `ChatRoom` | `ChatRoomScreen` |
| Chat | `AiCoach` | `AiCoachScreen` |
| Products | `ProductList` | `ProductsScreen` |
| Products | `ProductDetail` | `ProductDetailScreen` |

## 4. Primary User Flows

### First-Time Login

```text
Login
  -> ChangePassword
  -> Onboarding
  -> DietPlan
  -> MainTabs / Home
```

### Returning Member

```text
Login
  -> MainTabs
  -> Home
```

### Create/Refresh Plans

```text
Home/Profile
  -> DietPlan or WorkoutPlan
  -> Empty/Loaded/Generating state
  -> Generate New Plan
```

### Book a Class

```text
Classes tab
  -> Pick date
  -> Select class
  -> Confirm Booking modal
  -> Booked badge / success animation
  -> My Bookings
```

### Chat

```text
Chat tab
  -> ChatList
  -> ChatRoom
  -> Send text/image/emoji

Chat tab
  -> FitCoach AI
  -> Send prompt
  -> Stream AI response
```

### Track Activity

```text
Home or Profile
  -> Activity
  -> Log water
  -> Start Live Workout
  -> Finish & Save
  -> Review analytics and weekly consistency
```

## 5. Screen Wireframes

### Login

```text
+-------------------------------------+
| Full-screen fitness image background |
| Dark gradient overlay                |
|                                     |
|              Gym Logo                |
|           Gym / Clasendra            |
|       Sign-in helper text            |
|                                     |
| +-------- Glass Login Card --------+ |
| | Member Login                     | |
| | Email input                      | |
| | Password input + show/hide       | |
| | [Sign In]                        | |
| | Use the email/password...        | |
| +----------------------------------+ |
|          Powered by Clasendra        |
+-------------------------------------+
```

Primary actions: sign in, show/hide password.  
States: loading button, missing fields alert, login failed alert.

### Change Password

```text
+-------------------------------------+
| Header: Set New Password             |
|                                     |
|              Gym Logo                |
|          Set Your Password           |
| First login helper text              |
|                                     |
| +-------- Password Card -----------+ |
| | Current password + show/hide     | |
| | New password + show/hide         | |
| | Confirm password + show/hide     | |
| | [Change Password]                | |
| | [Skip for now]                   | |
| +----------------------------------+ |
+-------------------------------------+
```

Primary actions: change password, skip/logout.  
Validation: required fields, matching password, minimum 8 characters.

### Onboarding / Fitness Profile

```text
+-------------------------------------+
| Header: Your Fitness Profile         |
|                                     |
| Tell us about yourself               |
| Progress bar: % complete             |
|                                     |
| +---- Personal Info ---------------+ |
| | Age | Weight | Height            | |
| | Gender chips                     | |
| +----------------------------------+ |
| +---- Goals -----------------------+ |
| | Weight Loss / Muscle Gain / ...  | |
| +----------------------------------+ |
| +---- Preferences -----------------+ |
| | Diet preference chips            | |
| | Activity level chips             | |
| | Allergies textarea               | |
| +----------------------------------+ |
| [Create My Plan]                    |
+-------------------------------------+
```

Primary action: create profile and begin AI plan flow.  
States: profile loading, validation alerts, submit loading.

### Home

```text
+-------------------------------------+
| Floating header: gym logo/name       |
| Theme toggle | Notifications         |
|                                     |
| Greeting + member avatar/name        |
| 3D fitness figure                    |
| Motivation banner                    |
|                                     |
| + Activity Rings + + Hydration +     |
| | Move/Exercise  | | ml + +/-  |     |
| +----------------+ +-----------+     |
|                                     |
| Weekly Snapshot: visits/kcal/mins    |
| Start Daily Workout banner           |
|                                     |
| Quick Actions: Diet, Classes, Body,  |
| Settings                             |
| Upcoming Schedule                    |
| FitCoach AI Insight                  |
| BMI Calculator + steppers            |
|                                     |
| Bottom tabs                          |
+-------------------------------------+
```

Primary actions: open notifications, toggle theme, open activity, log water, open workout plan, open diet/classes/onboarding/profile/products.  
Current note: upcoming schedule card is static sample content.

### Classes

```text
+-------------------------------------+
| Classes                              |
| Browse & book upcoming sessions      |
| [View My Bookings]                   |
|                                     |
| Horizontal date picker               |
| Count: X classes available           |
|                                     |
| +-------- Class Card --------------+ |
| | Date block | Class name          | |
| | Time/duration | Trainer          | |
| | Capacity bar                     | |
| | [Book Now] or Booked/Class Full  | |
| +----------------------------------+ |
|                                     |
| Modal: Confirm Booking               |
+-------------------------------------+
```

Primary actions: filter by day, book class, view bookings.  
States: loading, refresh, empty day, error, booking confirmation, success burst.  
Current note: sample class data is injected if the backend returns no schedules.

### My Bookings

```text
+-------------------------------------+
| Header: My Bookings                  |
|                                     |
| +---- Booking Card ----------------+ |
| | Class name                       | |
| | Date - start-end time            | |
| | Duration badge                   | |
| | Status badge                     | |
| | [Cancel Booking] if confirmed    | |
| +----------------------------------+ |
|                                     |
| Modal: Cancel Booking                |
+-------------------------------------+
```

Primary actions: cancel confirmed booking, refresh.  
States: loading, empty, error, cancel confirmation.

### Check-Ins

```text
+-------------------------------------+
| Check-ins                            |
| Your gym visit history               |
|                                     |
| + Summary: Total Gym Visits -------+ |
| +----------------------------------+ |
|                                     |
| +---- Check-in Card ---------------+ |
| | Method icon                      | |
| | Date                             | |
| | In time -> Out time              | |
| | Duration or Active badge         | |
| | Method pill                      | |
| +----------------------------------+ |
| [Load more] if more pages            |
+-------------------------------------+
```

Primary actions: refresh, load more.  
States: loading, empty, error, paginated loading.

### Diet Plan

```text
+-------------------------------------+
| Header: My Diet Plan                 |
|                                     |
| Loading/Generating AI state          |
| or Empty state + generate button     |
|                                     |
| +---- Diet Summary ----------------+ |
| | Summary text                     | |
| | Updated date                     | |
| | Calories/day                     | |
| | Macro rings: protein/carbs/fat   | |
| +----------------------------------+ |
| Horizontal day tabs                  |
|                                     |
| +---- Meal Card ------------------+  |
| | Meal name | calories             | |
| | Food items list                  | |
| +----------------------------------+ |
| [Generate New Plan]                  |
| [Continue to App] after onboarding   |
+-------------------------------------+
```

Primary actions: select day, regenerate diet plan, update profile from empty state, continue after onboarding.

### Workout Plan

```text
+-------------------------------------+
| Header: My Workout Plan              |
|                                     |
| Loading/Generating AI state          |
| or Empty state + generate button     |
|                                     |
| +---- Workout Summary -------------+ |
| | Days count | exercises count     | |
| | Updated date                     | |
| +----------------------------------+ |
|                                     |
| +---- Day Card -------------------+  |
| | Day + focus badge                | |
| | Exercise rows                    | |
| | Sets x reps - rest               | |
| +----------------------------------+ |
| [Generate New Plan]                  |
+-------------------------------------+
```

Primary actions: regenerate workout plan, update profile from empty state.

### Activity

```text
+-------------------------------------+
| Activity Dashboard                   |
|                                     |
| + Activity Rings + + Hydration +     |
| | Move/Exercise  | | ml + add  |     |
| +----------------+ +-----------+     |
|                                     |
| Weekly Snapshot                      |
| Start Live Workout banner            |
| Wearable Tracker: Coming Soon        |
| FitCoach AI Insight                  |
|                                     |
| Analytics card                       |
| Metric selector: calories/duration/  |
| water                                |
| Period selector: daily/monthly       |
| Bar chart                            |
|                                     |
| Weekly Consistency day row           |
|                                     |
| Modal: Live Workout                  |
| - Select workout type                |
| - Timer and estimated calories       |
| - Start / Finish & Save              |
+-------------------------------------+
```

Primary actions: log water, start/finish workout, change metric, change period, view wearable info.  
Current note: activity service has fallback data when backend endpoints are unavailable.

### Chat List

```text
+-------------------------------------+
| Header: Messages                     |
|                                     |
| FitCoach AI banner                   |
| Search conversations                 |
|                                     |
| Section: Group                       |
| +---- Room Row -------------------+  |
| | Avatar | room name | time        | |
| | Message preview | unread badge   | |
| +----------------------------------+ |
|                                     |
| Section: Direct Messages             |
| +---- Room Row -------------------+  |
| +----------------------------------+ |
+-------------------------------------+
```

Primary actions: open FitCoach AI, search rooms, open group/direct chat, refresh.  
States: loading, empty, search-empty, error, socket updates.

### Chat Room

```text
+-------------------------------------+
| Header: room name                    |
|                                     |
| [Load earlier messages]              |
|                                     |
| Other user bubble + sender name      |
| Own message bubble + tick status     |
| Image bubble                         |
| Deleted message tombstone            |
| Typing indicator                     |
|                                     |
| Emoji picker if open                 |
| Input bar: emoji | image | text | send|
+-------------------------------------+
```

Primary actions: send text, send image, insert emoji, retry failed message, load earlier messages.  
Realtime events: message, status update, message deleted, typing, reconnect state.

### FitCoach AI

```text
+-------------------------------------+
| Header: FitCoach AI                  |
|                                     |
| Empty state: AI avatar/title/copy    |
| Suggestion chips                     |
|                                     |
| User messages                        |
| Assistant streaming messages         |
|                                     |
| Input bar: prompt field | send/stop  |
+-------------------------------------+
```

Primary actions: send suggestion, send prompt, stop streaming response.

### Notifications

```text
+-------------------------------------+
| Header: Notifications                |
|                                     |
| +---- Notification Card -----------+ |
| | Type icon                        | |
| | Title | New badge if unread      | |
| | Body preview                     | |
| | Time ago                         | |
| +----------------------------------+ |
+-------------------------------------+
```

Primary actions: refresh.  
States: loading, empty, error.  
Current note: fallback sample notifications are returned if the endpoint fails.

### Products

```text
+-------------------------------------+
| Header: Products                     |
| Search products                      |
| Category chips                       |
|                                     |
| +---- Product Row -----------------+ |
| | Image/placeholder                | |
| | Category                         | |
| | Name                             | |
| | Price                            | |
| | In Stock / Out                   | |
| | Chevron                          | |
| +----------------------------------+ |
+-------------------------------------+
```

Primary actions: search, filter by category, open product detail, refresh, infinite scroll.

### Product Detail

```text
+-------------------------------------+
| Header: Product Details              |
|                                     |
| +---- Product Hero ----------------+ |
| | Image/placeholder                | |
| | Category                         | |
| | Name                             | |
| | Price                            | |
| | Stock status                     | |
| +----------------------------------+ |
|                                     |
| Description card                     |
| Available at Gym Counter card        |
+-------------------------------------+
```

Primary action: inspect product information.  
Current note: no in-app cart or checkout; purchase is handled at the gym counter.

### Profile

```text
+-------------------------------------+
| Profile                              |
| Manage your account & fitness data   |
|                                     |
| +---- Profile Hero ----------------+ |
| | Editable avatar                  | |
| | Name, email, member since        | |
| | Account active/inactive          | |
| | Edit Profile toggle              | |
| +----------------------------------+ |
|                                     |
| Edit mode card: name, phone, save    |
|                                     |
| Fitness Metrics grid                 |
| [Update Fitness Profile]             |
|                                     |
| Quick Links: diet, workout, activity,|
| notifications                        |
| Preferences: dark mode switch        |
| [Logout]                             |
|                                     |
| Modal: Logout confirmation           |
+-------------------------------------+
```

Primary actions: edit account, pick avatar, update fitness profile, open quick links, toggle dark mode, logout.

## 6. API/Data Dependencies

| Feature | Endpoint/Service |
| --- | --- |
| Login | `POST /member/auth/login` |
| Logout | `POST /member/auth/logout` |
| Current user | `GET /member/auth/me` |
| Change password | `POST /member/auth/change-password` |
| Update account | `PATCH /member/auth/me/profile` |
| Fitness profile | `GET /member/profile`, `POST /member/profile` |
| Class schedules | `GET /member/classes/schedules` |
| Book class | `POST /member/classes/:scheduleId/book` |
| My bookings | `GET /member/classes/bookings` |
| Cancel booking | `DELETE /member/classes/bookings/:bookingId` |
| Check-ins | `GET /member/checkins` |
| AI diet plan | `GET/POST /member/ai-plans/diet` |
| AI workout plan | `GET/POST /member/ai-plans/workout` |
| Notifications | `GET /member/notifications` |
| Device token | `PUT /member/notifications/device-token` |
| Activity summary | `GET /member/activity/summary` |
| Activity analytics | `GET /member/activity/analytics` |
| Workout logging | `POST /member/activity/workouts` |
| Water logging | `POST /member/activity/water` |
| Wearable status | `GET /member/activity/sync-device/status` |
| Chat rooms | `GET /member/chat/rooms` |
| Chat messages | `GET /member/chat/rooms/:roomId/messages` |
| Mark chat read | `POST /member/chat/rooms/:roomId/read` |
| Product list | POS product service, paginated |
| Product detail | POS product detail service |

## 7. Navigation Guards

```text
App loading
  -> LoadingSpinner

No user
  -> AuthStack/Login

User + first login
  -> AuthStack/ChangePassword

User + not onboarded
  -> Onboarding stack

User + onboarded
  -> RootStack/MainTabs
```

## 8. Current-State Notes

- `master` is configured to track `origin/master` after the pull attempt, but local and remote histories are unrelated until resolved.
- Expo SDK 56 docs were checked before creating this document.
- The app currently uses React Navigation stacks/tabs, not Expo Router file-based routes.
- Some screens intentionally include fallback/demo data when backend endpoints are pending or return empty data.
- Products are display-only; there is no mobile cart, checkout, or order placement flow.
- Wearable sync is represented as a coming-soon feature in the UI.
- Home has a store banner component available in code, and route support exists through `Products`.
- Chat sends messages through sockets and reads room/message history through HTTP.

## 9. Suggested Next Wireframe Pass

For a design handoff, the next useful artifact would be a visual Figma-style mobile frame set for:

1. Login and first-login setup.
2. Home dashboard.
3. Classes and booking modal.
4. Activity dashboard and live workout modal.
5. Chat list and chat room.
6. Profile and edit state.


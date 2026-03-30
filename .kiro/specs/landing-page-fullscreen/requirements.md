pl# Requirements Document

## Introduction

This feature covers two related improvements to the NejoExamPrep web application:

1. **Landing Page** — The existing `Index.tsx` already serves as a home/welcome page with a navbar, hero section, stats bar, how-it-works section, features grid, CTA banner, and footer. This requirement formalises and validates that page as the official landing page of the site.

2. **Auto-Fullscreen on Landing Page Entry** — When a visitor first loads the landing page (`/`), the app should automatically request browser fullscreen using the Fullscreen API. This is a UX/immersion feature for the landing page only. It must not interfere with the exam flow, which has its own separate fullscreen and cheat-prevention logic.

## Glossary

- **Landing_Page**: The root route (`/`) rendered by `Index.tsx`, serving as the home and welcome page of the site.
- **Fullscreen_API**: The browser-native `document.documentElement.requestFullscreen()` API used to enter fullscreen mode.
- **Fullscreen_Hook**: A custom React hook (`useFullscreenOnEntry`) that encapsulates the auto-fullscreen request logic for the landing page.
- **Exam_Flow**: The sequence of pages used during an active exam — `StudentAccess`, `ExamReady`, `ExamPage`, and `ExamComplete`. These pages are explicitly excluded from this feature.
- **Cheat_Prevention**: The existing `useCheatPrevention` hook used exclusively within `ExamPage.tsx`. This feature must not modify or interact with it.
- **User_Gesture**: A browser-required interaction (e.g., click, keypress) that must precede a fullscreen request on some browsers.

---

## Requirements

### Requirement 1: Landing Page Exists as the Site Entry Point

**User Story:** As a visitor, I want to see a welcoming home page when I navigate to the site, so that I understand what NejoExamPrep is and how to get started.

#### Acceptance Criteria

1. THE Landing_Page SHALL be rendered at the root route (`/`).
2. THE Landing_Page SHALL display a navigation bar containing the site logo, site name, navigation links, an exam key input form, and a sign-in button.
3. THE Landing_Page SHALL display a hero section with a headline, subheadline, a primary call-to-action button linking to `/login`, and a secondary call-to-action button linking to the how-it-works section.
4. THE Landing_Page SHALL display a student portal card that navigates to `/student` when clicked.
5. THE Landing_Page SHALL display a features section listing the platform's key capabilities.
6. THE Landing_Page SHALL display a how-it-works section describing the three-step exam process.
7. THE Landing_Page SHALL display a footer containing the site name, copyright notice, and a teacher sign-in link.
8. WHEN a visitor submits a non-empty exam key via the navbar form, THE Landing_Page SHALL navigate to `/exam/{key}`.
9. IF a visitor submits an empty exam key, THEN THE Landing_Page SHALL not navigate away from the current page.

---

### Requirement 2: Auto-Fullscreen Request on Landing Page Entry

**User Story:** As a site visitor, I want the site to automatically enter fullscreen when I arrive at the landing page, so that the experience feels immersive and focused.

#### Acceptance Criteria

1. WHEN the Landing_Page mounts in the browser, THE Fullscreen_Hook SHALL call `document.documentElement.requestFullscreen()` automatically.
2. WHEN the Fullscreen_API request is rejected by the browser (e.g., no prior user gesture, permissions denied), THE Fullscreen_Hook SHALL silently catch the error and not display any error message to the user.
3. THE Fullscreen_Hook SHALL only be used on the Landing_Page component and SHALL NOT be applied to any exam-related pages (`StudentAccess`, `ExamReady`, `ExamPage`, `ExamComplete`).
4. THE Fullscreen_Hook SHALL NOT modify, import, or interact with the `useCheatPrevention` hook or any exam session logic.
5. WHILE the document is already in fullscreen mode, THE Fullscreen_Hook SHALL not make a redundant fullscreen request.
6. THE Landing_Page SHALL remain fully functional if the browser does not support the Fullscreen_API or if the request is denied.

---

### Requirement 3: Fullscreen Does Not Interfere with Exam Flow

**User Story:** As a student taking an exam, I want the exam's own fullscreen and cheat-prevention logic to remain unchanged, so that my exam session is not disrupted.

#### Acceptance Criteria

1. THE Exam_Flow pages SHALL NOT use the Fullscreen_Hook introduced by this feature.
2. THE Cheat_Prevention hook SHALL remain the sole fullscreen and security enforcement mechanism during an active exam session.
3. WHEN a student navigates from the Landing_Page to any Exam_Flow page, THE Fullscreen_Hook SHALL no longer be active.
4. IF the browser is in fullscreen mode when a student enters the Exam_Flow, THEN THE Exam_Flow SHALL manage fullscreen state independently using its existing logic.

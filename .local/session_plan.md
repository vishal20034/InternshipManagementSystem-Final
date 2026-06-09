# Objective
Implement 9 features from REPLIT_PROMPT_FINAL and push to GitHub.

# Tasks
### T001: Backend - Models + New API Routes [DONE WHEN: server restarts without error]
- Add onboardingPopupSeen, joinerTypeSelected, joinerType to Student.js
- Add fallbackVideoUrl to DomainTask.js
- Update studentPortal.js: add /student/me, /mark-onboarding-seen, /set-joiner-type, /report-broken-video routes
- Update server.js student-login to include new flags in response
- Update coinService.js with new earning structure

### T002: Frontend student-dashboard.html [DONE WHEN: popup only shows once, empty state visible]
- Section 01 Attendance: remove bullet points, keep only title + MANDATORY badge
- Show instructionModal only once (use DB flag onboardingPopupSeen via API)
- Show joinerTypeModal only once (use DB flag joinerTypeSelected via API)  
- Add empty state to coding problems (Feature 4)
- Add logout button
- Add auto-login check

### T003: Frontend v2-tasks.html [DONE WHEN: all UI elements present]
- Add Quick Share buttons above checkboxes (Feature 3)
- Add coin ₹ value display (Feature 8A)
- Add "How to Earn Coins" guide panel (Feature 8B)
- Add video progress gate (Feature 5: 80% → quiz unlock)
- Add broken video auto-replace (Feature 7)
- Add auto-login check + logout
- Update nav coin badge with ₹ value

### T004: Create quiz-portal.html (Feature 6)
- Camera permission screen
- Front camera recording
- 5 MCQ, 10-min timer
- Pass/fail logic

### T005: Update quizEngine.js + studentPortal routes for quiz (Feature 5 + 6 backend)
- Override quiz settings to 5 MCQ, 10-min
- Add /generate-quiz endpoint  
- Add fallback question bank per domain

### T006: Git push to GitHub

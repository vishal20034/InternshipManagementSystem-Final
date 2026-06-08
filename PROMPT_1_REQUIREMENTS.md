# TEN Internship Portal — Change Requirements (Prompt 1)

## Source: Client Instructions (June 2026)

---

### 1. Groups Page — Important Notice
- **Remove**: Stipend phone number (+91 99488 28185)
- **Add**: "For any queries, contact: hr@entrepreneurshipnetwork.net"
- Remove any strikethrough/striped text in the notice section

---

### 2. My Documents — Submit Button Flow
- After student uploads both files (Address Proof + Marksheet), a Submit button appears
- On Submit: documents vanish from upload tab → move to **HR Pending** section
- Upload zones lock after submission (already implemented)

---

### 3. HR Portal — Pending Documents Section
- Buttons already exist: **Offer Letter** | **Reject**
- After HR clicks either button → document moves to **History** (NOT stays in Pending)
- Add a final **Submit** confirmation step before action executes

---

### 4. Automation — 24-Hour Auto Offer Letter
- If HR hasn't acted on documents within **1 day**, system auto-sends offer letter to student
- ✅ Already implemented in `services/automationCron.js` → `checkOverdueOfferLetters()`
- Runs every 30 minutes, checks `uploadedAt` ≤ 24 hours ago

---

### 5. My Documents — Star Performance (Locked)
- Add "⭐ Star Performance Award" row to Official Documents table
- Default state: **Locked** (🔒 Not Available)
- Unlocked only when HR explicitly issues it

---

### 6. Instructions Section — Attendance Form Link
- **Remove** "Open Attendance Form" Google Form link from Guidelines/Instructions section
- **Move** the Google Form link to the **Attendance section only** (for WhatsApp re-joiners)

---

### 7. Instructions Section — Daily Job Posting
- Remove external Google Doc link from instructions
- Replace with text pointing students to the internal **Daily Tasks** section for coins

---

### 8. New Joiner Popup (on first login after registration)
- Show modal asking: **"Are you a New Joiner or already joined before via WhatsApp?"**
- Button 1: "🆕 I am a New Joiner"
- Button 2: "💬 Already Joined Before via WhatsApp"
- On each button click: show **warning popup** — "This cannot be undone. Are you sure?"
- Shows only **once** per student (stored in localStorage by employeeId)

---

### 9. Attendance — New Joiner vs WhatsApp Re-Joiner

| Type | Portal Attendance | Google Form |
|------|------------------|-------------|
| New Joiner | ✅ Required | ❌ Not shown |
| WhatsApp Re-Joiner | ✅ Required | ✅ Also required (shown in Attendance section) |

Google Form URL: `https://docs.google.com/forms/d/e/1FAIpQLSf3qZwNUgQl7vqqTnGW4PKrMDwRWPJEMiVQ-NUI6h4NnJa8Zg/viewform`

---

### 10. Coordinator Auto-Attendance (End of Day)
- If coordinator **didn't mark** a student's attendance for the day
- System checks if student was **active** (submitted task or watched video that day)
- If active → **auto-marks coordinator attendance** as Present
- Runs at **11:55 PM daily** via cron
- Implemented in `services/automationCron.js` → `autoMarkCoordinatorAttendance()`

---

### 11. Student Profile — Show All Registration Details
- Profile modal now shows: Name, Domain, Employee ID, College, Email, Phone, Joined, End Date
- **Password field**: shown as dots (••••••••) by default, toggle "Show/Hide" button
- Password shown only on click — security measure against shoulder surfing

---

### 12. Discord Community Link
- URL: `https://discord.gg/GYnZFbDE7`
- Added as:
  - Nav sidebar button (💬 Discord Community)
  - QR code in Attendance section (scannable + clickable)
  - Link in Profile modal footer
- Students can scan OR click to join TEN alumni Discord

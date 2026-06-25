# Brain Dump: Basma (بصمة)

## Elevator Pitch
Basma is an Arabic educational platform that gives any teacher the right to have their own branded educational platform — white-labeled, easy, and simple. No need to build from scratch and pay 50K L.E. Start free if you're small, grow as you teach. Built for teachers in Egypt, adaptable across the Arabic world (North Africa, GCC) for teachers of all sizes.

## Core Loop & Purpose

**Main actions a teacher takes on login:**
- Check student results (quizzes, assignments) and read analytics (top performers, lowest)
- Create a new session and notify students (auto-notification if enabled in settings)
- Check course growth: attendance, progress, income (for paid courses)
- Check new payments from subscribed students
- Switch between groups to view each group's courses, students, payments, sessions, quizzes, assignments, analytics
- Review and grade student assignments
- Interact with students via group live chat
- Answer student questions

**Success definition:** Seeing real student growth through collected data. Everything feeds one beast — DATA. When fed to AI, it generates useful tips for the teacher to deal with problems and make better decisions.

**Five pillars:**
- **Own** a platform that is yours — your brand, colors, fonts, logo, domain
- **Manage** everything: courses, sessions, students, groups, brand, quizzes, assignments
- **Analyze** everything: groups, courses, students (deeply), sessions, quizzes
- **Remind** students about upcoming sessions, quizzes, results, or custom teacher notes
- **AI** powers data analytics and assists students

## Actors

- **Teacher**: The platform owner. Manages groups, courses, students, brand, analytics, payments. Full control.
- **Student**: Belongs to one group. Can access course content, take quizzes, submit assignments, participate in live chat, ask questions, receive notifications. Cannot see other students' sensitive data (only name/avatar visible to others).
- **Anonymous Visitor**: Can visit the teacher's public website. May sign up to become a student IF the teacher has enabled open registration. If not, students join via private invitation links or are manually added by the teacher.

## Core Nouns (Entities)

### Group-Level (inside a group)
- **Group**: The center of gravity. Container that holds courses and students. Each group is isolated.
- **Student**: Belongs to **one group only**. Sensitive data is private from other students. Can be active or inactive.
- **Course**: Belongs to a group. Holds sessions, quizzes, assignments.
- **Session**: Belongs to a course. Has time, location/center, notes. Triggers notifications.
- **Quiz**: Belongs to a course. Tracks student results.
- **Assignment**: Belongs to a course. Students submit, teacher reviews/grades.
- **Live Chat**: Group-level. Accessible to all students in the group + the teacher.

### Instance-Level (above groups — belongs to the teacher's whole platform)
- **AI Assistant**: Helps students, powers analytics engine.
- **Questions Bank**: Shared across groups/courses.
- **Brand Management**: Logo, colors, fonts, domain, white-label settings.
- **Payment Management**: Track student payments for paid courses.
- **Students Deep Analytics**: Cross-course, overall student performance analysis.
- **Notification Center**: WhatsApp-based notifications and reminders.
- **Files Management**: Shared file storage across the platform.

## Business Rules

### Tiers & Pricing
| Tier | Students | Price | Groups |
|------|----------|-------|--------|
| Small Teach | 3–10 | Free | 1 group only |
| Mid Teach | 11–50 | 250–350 L.E | Multiple (suitable) |
| Big Teach | 51–200 | 500–750 L.E | Multiple (suitable) |
| Huge Teach | 201–1000+ | 1K+ L.E | Multiple (suitable) |

### Tier Enforcement Rules
- **Student limit hit**: New students can still join but are added as **inactive** — they cannot do anything until the teacher upgrades the plan.
- **Free tier branding**: Shows "Powered by Basma".
- **Paid tier branding**: Full white-label — teacher owns it, no Basma branding.
- **Payment Management**: Only available on paid plans. Free/small teachers don't need it.
- **Group limit**: Free plan = 1 group only. Paid plans have multiple groups (suitable per tier).

### Student Data & Privacy
- Sensitive student data is private — only the teacher can see it.
- Non-sensitive info (name, avatar) may be visible to other students.
- Teacher can export student data (CSV, etc.).

### Registration Rules
- **Open registration**: Teacher enables → any anonymous visitor can sign up as a student.
- **Closed registration**: Teacher disables → students join via private invitation links OR are manually added.

### Multi-Tenancy
- Each teacher gets a completely isolated platform instance.
- A student in Teacher A's platform cannot exist in Teacher B's platform — completely separate.
- Data is not shared between teacher instances.

## Boundaries & Constraints

### Explicitly OUT of Scope (for now)
- Video streaming / live virtual classrooms
- Parent accounts
- Mobile app
- Advanced payment gateways beyond basic payment tracking (note: payment gateway integration IS wanted)

### Platform
- **Web-only** (no mobile app)
- **Bilingual**: Arabic + English
- **Multi-tenant**: Each teacher is an isolated instance on the Basma platform
- **Region**: Egypt-first, expandable to North Africa and GCC

### Core Features (All Tiers)
- Course Management
- Students Management
- Sessions Management
- Notification System (WhatsApp)
- Basic Student Analysis
- Quiz Management
- Assignment Management
- Basic Platform Style Customization
- Files Management

### Paid Features Only
- Questions Bank
- AI Personal Assistant
- Brand White-labeling
- Students Deep Analysis
- Payment Management

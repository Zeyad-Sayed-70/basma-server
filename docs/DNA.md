# Basma (بصمة)

## Purpose
Give every Arabic-speaking teacher their own white-labeled educational platform — for free when small, paid when they grow — instead of building from scratch.

## Core Entities
- instances — each teacher gets one; fully isolated from others
- groups — the unit of containment; holds courses and students
- courses — holds sessions, quizzes, assignments
- sessions — triggers notifications when created
- quizzes
- assignments
- students — belongs to one group only; has `status` (active/inactive)
- question_bank — shared across the instance, not per-group
- payments — tracks student payments for paid courses
- brand — per-instance; logo, colors, fonts, domain, white-label toggle
- notifications — WhatsApp-based; auto-sent when sessions created (if enabled)

## Relationships That Matter
- Student belongs to **one group only** (not many-to-many).
- Group is the isolation boundary for students — they cannot cross groups.
- Instance is the isolation boundary for everything — no data shared between teachers.
- Brand white-labeling is gated by tier (free shows "Powered by Basma").
- Payment management is gated by tier (free tier has no access).
- Questions bank sits above groups — shared across the whole instance.
- Student sensitive data is visible only to the teacher; non-sensitive (name, avatar) visible to peers in the same group.

## Defining Flows
- Teacher signs up → gets an instance → customizes brand → creates group → creates courses/sessions within it
- Anonymous visits teacher's site → signs up (if open) or uses invitation link → becomes student in a group
- Student limit hit → new students added as **inactive** → teacher upgrades plan → students activated
- Teacher creates session → system sends WhatsApp notification (if enabled) → students reminded
- Student takes quiz / submits assignment → results feed analytics → AI generates insights for teacher
- Student joins live chat → interacts with teacher and peers within their group only

## Hard Constraints & Principles
- Multi-tenant from day one; instance data isolation is non-negotiable — a student in one instance cannot exist in another.
- Student-to-group is strictly one-to-one, not many-to-many.
- Tier enforcement is soft-gated: oversize students join as inactive (never hard-blocked).
- Sensitive student data is never visible to other students.
- Registration mode is teacher-controlled: open sign-up or invitation-only (links / manual add).
- Bilingual: Arabic + English.

## What This Is NOT
- Not a mobile app (web only).
- Not a video streaming or live virtual classroom platform.
- Not a social network; no follows, no DMs outside group chat.
- No parent accounts (for now).

## Tech Direction
- Multi-tenant architecture required — every teacher instance must be isolated at the data layer from day one.
- WhatsApp integration needed for the notification system.

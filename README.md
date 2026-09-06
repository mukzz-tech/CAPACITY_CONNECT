# CAPACITY CONNECT
**Digital Capacity Building and Learning Management Portal**
*SIH 2026 — PS #26075 — Ministry of Earth Sciences (India Meteorological Department)*

A comprehensive, accessible, and low-cost learning management and competency-tracking platform engineered for the India Meteorological Department (IMD).

## Key Features
- **Curriculum Management**: Seeded with real IMD institutional courses and refresher programs.
- **Per-Lesson Mixed Assessments**: MCQ, Fill-in-the-Blank, Match-the-Following, and Voice Answers with auto-grading.
- **5-Tier Official IMD Grading Scale**: Outstanding (90+), Excellent (80.1–89.9), Very Good (70–80), Good (60–69.9), Passed (50–59.9).
- **Client-Side Face & Attentiveness Proctoring**: Strict Mode for exams and Lenient Mode for lectures (zero video uploaded).
- **Text-to-Speech (TTS)**: Web Speech Synthesis in English and Hindi.
- **Voice Commands**: Hands-free navigation and voice-based question answering.
- **AI Chatbot**: Context-aware meteorological assistant with FAQ caching and rate limiting.
- **Verifiable Certificates**: Auto-generated PDF certificates with dynamic QR code verification.
- **Admin Oversight**: User approvals, course publishing reviews, competency tracking, and proctoring review queue.

## Structure
- `/backend`: Node.js + Express API + Prisma ORM
- `/frontend`: React (Vite) + Tailwind CSS + Lucide Icons
- `/docs`: Architecture specifications and reference materials

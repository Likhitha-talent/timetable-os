# Timetable OS

> 24-hour AI timetable builder — talk to an AI about your day, get a schedule you can actually execute.

## Core Concept

Timetable OS turns a natural conversation about your day into a realistic, executable 24-hour schedule.

The core loop is:

**Talk → Plan → Approve → Execute → Adapt**

The user discusses tasks, priorities, fixed commitments, sleep, preferences, and available time with the AI. The system creates a schedule that strictly fits within a 24-hour window. Once approved, the schedule becomes an active day manager with live timers, automatic task transitions, notifications, and dynamic rescheduling.

## Tech Stack

### Frontend
- React
- Responsive UI
- Real-time timers
- Task execution interface
- Animations and notifications

### Backend
- Django
- Django REST Framework
- PostgreSQL
- Authentication
- Schedule and task management APIs

### AI / Scheduling
- Natural-language task and constraint extraction
- AI planning assistant
- 24-hour scheduling engine
- Dynamic schedule adaptation

## Project Structure

```text
backend/     Django + DRF API
frontend/    React application
ai-engine/   AI extraction + scheduling logic
docs/        Architecture and API documentation


User Conversation
       ↓
AI Understands Requirements
       ↓
24-Hour Scheduling Engine
       ↓
Proposed Timetable
       ↓
User Approval
       ↓
Active Schedule
       ↓
Live Execution
       ↓
Dynamic Adaptation
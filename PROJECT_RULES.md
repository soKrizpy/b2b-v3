# B2B LEARNING ENGINE
# PROJECT RULES & DEVELOPMENT STANDARDS

Version: 1.0
Status: Active
Primary Development Tool: Antigravity

---

# 1. PROJECT IDENTITY

Project name: B2B Learning Engine

Purpose:
Build a modern, efficient, interactive coding-learning platform where students receive guided instructions through Bits2Bytes and perform actual coding activities using external tools.

Supported learning tools include:
- Scratch
- ScratchJr
- Roblox Studio
- Godot
- Unity
- EduBlocks
- Visual Studio Code
- HTML/CSS/JavaScript environments
- Gemini
- ChatGPT
- Other educational coding tools

Core principle:

Bits2Bytes guides the learning process. Students practice using authentic external tools. Teachers validate learning outcomes. The platform records learning progress.

The platform must prioritize:
1. Learning effectiveness.
2. Workflow efficiency.
3. User experience.
4. Performance.
5. Maintainability.
6. Scalability.

# 2. PROJECT BOUNDARIES

STRICT RULES:

- Work only inside the designated b2b-learning-engine directory.
- Never modify the legacy repository E:\BITES2BYTES\b2b-v2.
- Never modify the existing production website.
- Never access or modify production Supabase without explicit approval.
- Never deploy to Vercel without explicit approval.
- Never create Git repositories or branches automatically.
- Never delete or overwrite existing work without approval.
- Never expose secrets, credentials, API keys, or private student information.
- Never perform unrelated refactoring.

The existing production backend and student data must remain preserved.

The new project must initially operate independently using local mock data.

# 3. DEVELOPMENT TECHNOLOGY

Initial prototype:
- HTML
- CSS
- Vanilla JavaScript
- JSON mock data

Avoid unnecessary frameworks and dependencies.

Do not introduce a large dependency merely to implement a simple interaction.

Keep the architecture ready for future Supabase integration, but do not integrate the production backend during the prototype stage.

# 4. PRODUCT ARCHITECTURE

The primary user roles are:

## Student
- Student Dashboard
- Quest Map
- Lesson Engine
- Guided Practice
- Project Challenge
- Assessment
- Progress and Achievements

## Teacher
- Teacher Dashboard
- Student Management
- Session Management
- Submission Queue
- Submission Review
- Feedback and Reports

## Admin
- Admin Dashboard
- User Management
- Curriculum Management
- Lesson Management
- Schedule Management
- Invoice Management
- Platform Configuration

Each role must have a purpose-built experience.

Avoid creating one oversized dashboard for every role.

# 5. UX AND NAVIGATION PRINCIPLES

The most important design objective is EFFECTIVENESS AND EFFICIENCY OF USER FLOWS.

Rules:

1. Design desktop-first for computers and laptops.
2. Keep the interface responsive for tablets.
3. Minimize unnecessary page transitions.
4. Minimize redundant clicks.
5. Preserve user context when opening or closing overlays.
6. Avoid full-page reloads for small interactions.
7. Use persistent primary navigation.
8. Use inline navigation for lesson stages.
9. Use drawers for contextual tasks such as teacher submission reviews.
10. Use modals only for short tasks, confirmations, and focused information.
11. Use toasts for lightweight feedback.
12. Avoid nested modal dialogs.
13. Maintain queue position and scroll position when closing drawers.
14. Make important actions easy to discover.

Every navigation decision must be justified by user workflow.

Do not add pages simply to make the application appear more complete.

# 6. LESSON ENGINE — CORE PRODUCT

The Lesson Engine is the highest-priority product component.

It must use an External Tool Guided Learning architecture.

Do not build:
- Roblox Studio emulators.
- Unity editors.
- Godot editors.
- Heavy browser-based coding environments.
- Unnecessary programming language runtimes.

Students practice using the actual external tools.

Bits2Bytes provides instructions, visual references, code examples, prompts, interactive questions, and progress tracking.

## Learning stages

1. Brief
2. Learning Materials
3. Guided Practice
4. Comprehension Check
5. Project Challenge
6. Project Submission

The learning stages must exist inside one continuous workspace.

## Learning materials

A lesson normally contains 10–20 slides, but the number must remain flexible.

Each slide should focus on one primary learning objective.

Supported content blocks:

- Heading
- Text
- Image
- Annotated screenshot
- Code snippet
- Copyable code
- AI prompt
- Copyable prompt
- Diagram
- Video embed
- Multiple-choice question
- True/false question
- Ordering activity
- Prediction question
- Checklist
- Expected result
- External tool link
- Learning resource

A slide may combine multiple content blocks.

Content must be stored separately from presentation logic.

## Instruction quality

Every practical instruction should clearly explain:

1. What the student needs to do.
2. Which application or tool to open.
3. Which menu, panel, or component to use.
4. What code or prompt to enter, if applicable.
5. What result should appear.
6. What to do if the result is different.

Use simple language appropriate to the student's age and skill level.

Never assume students already understand an unfamiliar technical term.

## Learning content metadata

Each lesson should support:

- Lesson ID
- Title
- Description
- Learning objectives
- Required tools
- Required tool versions or environments
- Skill level
- Estimated duration
- Prerequisites
- Slide collection
- Practice instructions
- Assessment criteria
- Project challenge
- Lesson version
- Publication status

## Lesson states

Support:
- Draft
- Review
- Published
- Archived

Published content must not be silently overwritten while students are using an earlier version.

# 7. INTERACTIVE LEARNING

Interactive components must be lightweight.

Supported interactions:

- Knowledge checks
- Practice checkpoints
- Multiple-choice questions
- True/false questions
- Ordering exercises
- Prediction questions
- Checklists
- Hints
- Immediate feedback

Keep three learning activities separate:

Knowledge Check:
Tests understanding of concepts.

Practice Checkpoint:
Checks whether students have followed practical instructions.

Project Challenge:
Tests independent application of knowledge.

Do not combine all three into one generic quiz.

Wrong answers should include explanations and hints.

Use gradual difficulty:
- Guided examples first.
- Partially guided practice next.
- Independent challenges afterward.

# 8. EXTERNAL TOOL INTEGRATION

External tools must remain authentic.

Rules:

- Open Tool actions should open the appropriate external website or application when supported.
- Copy buttons must work.
- AI prompts must be prepared and easy to copy.
- Specify required tools and versions where relevant.
- Never claim automatic access to external application activity without a real integration.
- Never request passwords, API keys, or sensitive account information.
- Provide alternative submission methods such as screenshots, videos, project files, or links.

# 9. STUDENT PROGRESS

Progress states must be distinct:

- Not Started
- In Progress
- Practice Completed
- Submitted
- Revision Required
- Approved
- Completed

Reading a lesson does not automatically mean the student has mastered it.

Track learning activity separately from project approval.

Preserve historical progress when lesson content is updated.

The Quest Map must reflect actual completion rules, not merely page visits.

# 10. TEACHER WORKSPACE

Teacher Workspace must prioritize fast review workflows.

Required features:

- Student list
- Submission queue
- Search
- Filters
- Submission status
- Project details
- Student information
- Feedback editor
- Approve action
- Request Revision action
- Review history

Opening a submission must use a contextual drawer.

Closing the drawer must preserve the queue position.

Feedback and status changes must produce visible confirmation.

# 11. ADMIN WORKSPACE

Admin must be able to manage:

- Users
- Students
- Teachers
- Curriculum
- Modules
- Topics
- Lessons
- Slide content
- Learning resources
- Tools
- Schedules
- Operational records

Lesson authoring should be content-driven.

Adding or editing lesson content must not require changing application source code.

# 12. DESIGN SYSTEM

Create centralized design tokens.

Support:
- Light mode
- Dark mode

All components must use consistent design tokens.

Audit every UI element, including:

- Cards
- Buttons
- Inputs
- Dropdowns
- Select menus
- Badges
- Tooltips
- Modals
- Drawers
- Tables
- Scrollbars
- Placeholders
- Focus indicators
- Loading indicators
- Error states

Do not rely on random hardcoded colors.

Every component must have appropriate:
- Default state
- Hover state
- Focus state
- Active state
- Disabled state
- Error state
- Success state

Maintain accessible contrast.

Do not use color alone to communicate success, errors, or status.

# 13. ACCESSIBILITY

- Support keyboard navigation.
- Keep focus indicators visible.
- Use semantic HTML.
- Use accessible labels.
- Provide alternative text for meaningful images.
- Respect reduced-motion preferences.
- Maintain readable text sizes.
- Ensure controls are easy to operate.
- Avoid interactions that require a mouse exclusively.

# 14. PERFORMANCE

Performance is a product requirement.

Initial targets:

- Initial lesson content: <= 1.5 seconds.
- Slide transition: <= 300 ms.
- Interaction response: <= 200 ms.
- Largest Contentful Paint: <= 2.5 seconds.
- Cumulative Layout Shift: <= 0.1.

These are targets, not assumed results.

Rules:

- Lazy-load images and heavy resources.
- Do not load every lesson image immediately.
- Do not initialize inactive interactive components.
- Stop inactive timers and animations.
- Avoid unnecessary DOM updates.
- Avoid full-page reloads.
- Optimize image formats and dimensions.
- Avoid autoplay videos.
- Keep animations lightweight.
- Avoid unnecessary dependencies.

Measure actual performance before reporting success.

# 15. DATA AND SECURITY

Prototype data must be fictional.

Never put secrets in frontend code.

Validate user input.

Separate:
- Presentation
- Application logic
- Data
- Service integrations

Use stable IDs.

Keep data structures ready for future backend integration.

Do not treat localStorage as permanent production storage.

No production database migration or modification without explicit approval.

# 16. VERSIONING AND CHANGE MANAGEMENT

Maintain:

- PROJECT_RULES.md
- README.md
- CHANGELOG.md

Before major changes:

1. Inspect the current project.
2. Identify affected files.
3. Identify potential regressions.
4. Preserve recoverable checkpoints.
5. Implement a small, scoped change.
6. Verify the result.

Report all created, modified, and deleted files.

Never silently remove existing functionality.

# 17. TESTING AND QUALITY ASSURANCE

Test actual user workflows.

Required scenarios:

Student:
- Open dashboard.
- Continue learning.
- Navigate lesson slides.
- Copy code and prompts.
- Answer interactive questions.
- Complete practice checkpoints.
- Submit a project.
- View progress.

Teacher:
- Open submission queue.
- Search and filter submissions.
- Open review drawer.
- Provide feedback.
- Approve a submission.
- Request revision.
- Return to the same queue position.

Admin:
- Open curriculum management.
- Create and edit lesson content.
- Reorder slides.
- Preview lessons.
- Publish and archive content.

Also verify:

- Light mode.
- Dark mode.
- Responsive behavior.
- Keyboard navigation.
- Empty states.
- Loading states.
- Error states.
- Success feedback.
- Browser console errors.
- Performance.

Never report an untested feature as successfully tested.

# 18. DEFINITION OF DONE

A feature is complete only when:

- Its intended functionality works.
- Existing workflows are not broken.
- Dark mode is verified.
- Light mode is verified.
- Responsive behavior is verified.
- Loading, empty, error, and success states exist where relevant.
- Keyboard accessibility is considered.
- No new console errors are introduced.
- The relevant user workflow has been tested.
- Documentation is updated.

# 19. DEVELOPMENT PRIORITY

Implement in this order:

Phase 1 — Project Foundation
- Project structure
- Design tokens
- Navigation
- Theme system
- Shared components

Phase 2 — Student Experience
- Student Dashboard
- Quest Map
- Lesson Workspace
- Content block renderer
- Guided Practice
- Comprehension Check
- Project Challenge
- Submission flow

Phase 3 — Teacher Experience
- Teacher Dashboard
- Submission queue
- Review drawer
- Feedback workflow

Phase 4 — Progress
- Student progress
- Achievements
- Activity history

Phase 5 — Admin Experience
- Curriculum management
- Lesson authoring
- User management
- Operational views

Phase 6 — Verification
- Full workflow testing
- Visual consistency
- Performance
- Accessibility
- Regression checks

Do not start by building every dashboard simultaneously.

The Student Lesson Workspace is the first major product milestone.

# 20. FINAL DEVELOPMENT PRINCIPLE

Build incrementally.

Prioritize working user flows over the number of screens.

Do not confuse visual completeness with functional completeness.

Do not perform endless audits without implementing improvements.

Do not overengineer for hypothetical future requirements.

Every implementation must improve the actual learning experience.

The goal is a reliable, efficient, maintainable coding-learning platform that can grow without requiring a complete rebuild.

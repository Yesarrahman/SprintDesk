# antigravity.md

# Project Name
SprintDesk

# Project Overview

SprintDesk is a modern SaaS-style project management and productivity web application built using Next.js 15, Supabase, Tailwind CSS, Framer Motion, and TypeScript.

The application focuses on:
- Task management
- Team collaboration
- Productivity analytics
- Calendar scheduling
- Estimated task completion time
- Modern glassmorphism UI

---

# Tech Stack

## Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion

## Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime

## State Management
- Zustand

## Validation
- Zod
- React Hook Form

## Charts
- Recharts

## Drag & Drop
- dnd-kit

---

# Development Rules

## General Rules
- Always use TypeScript
- Use functional components only
- Use reusable components
- Use clean architecture
- Avoid duplicated code
- Keep components modular
- Use server actions where possible

---

# UI Rules

## Design Style
- Modern SaaS
- Glassmorphism
- Minimal
- Smooth animations

## Requirements
- Use soft shadows
- Use backdrop blur
- Use rounded corners
- Use subtle gradients
- Maintain spacing consistency

## Animation Rules
- Use Framer Motion
- Add smooth transitions
- Add hover animations
- Add loading skeletons
- Avoid excessive motion

---

# Folder Structure

```txt
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── store/
├── types/
├── utils/
└── styles/
```

---

# Component Rules

## Requirements
- Keep components small
- Reuse UI components
- Separate business logic
- Use composition pattern

## Naming Convention
- PascalCase for components
- camelCase for variables/functions
- kebab-case for folders

---

# State Management Rules

## Zustand Usage
Use Zustand for:
- UI state
- Sidebar state
- Theme state
- Notification state

Do NOT use Zustand for:
- Server data caching

Use React Query or server actions for server data.

---

# API Rules

## Requirements
- Validate all inputs with Zod
- Handle all errors gracefully
- Use typed responses
- Use async/await

---

# Database Rules

## Requirements
- Use UUID primary keys
- Add created_at and updated_at
- Use foreign key constraints
- Enable Row Level Security

---

# Authentication Rules

## Requirements
- Use Supabase Auth
- Protect all dashboard routes
- Redirect unauthorized users
- Validate sessions server-side

---

# Accessibility Rules

## Requirements
- Use semantic HTML
- Add aria labels
- Support keyboard navigation
- Maintain proper contrast ratio

---

# Performance Rules

## Requirements
- Optimize images
- Lazy load components
- Use dynamic imports when necessary
- Avoid unnecessary re-renders

---

# Responsive Design Rules

## Requirements
- Mobile-first layout
- Tablet support
- Desktop optimization

---

# Code Quality Rules

## Requirements
- Strong typing everywhere
- Avoid any type
- Use ESLint
- Use Prettier

---

# Task Management Features

## Core Features
- Task CRUD
- Task assignment
- Kanban board
- Calendar view
- Notifications
- Recurring tasks
- Archive system

---

# Estimated Finish Time Feature

## Logic
Estimate completion time using:
- Total estimated task duration
- Active tasks
- User productivity history
- Completion trends

Display estimated daily completion time on dashboard.

---

# Security Rules

## Requirements
- Enable Row Level Security
- Validate permissions
- Protect API routes
- Sanitize inputs

---

# Deployment

## Frontend
- Vercel

## Backend
- Supabase

---

# Coding Style

## Preferred
- Clean
- Readable
- Scalable
- Reusable

Avoid:
- Large components
- Inline business logic
- Repeated styles
- Hardcoded values

---

# Important

Always prioritize:
1. Clean architecture
2. Reusable components
3. Performance
4. Responsive design
5. Accessibility
6. Smooth UX
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant SaaS CRM platform built for managing WordPress/WooCommerce sites with integrated AI capabilities (Google Gemini). The application provides analytics, SEO optimization, email campaign management, and e-commerce insights.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Express.js, Prisma ORM (PostgreSQL), Firebase Auth
- **AI**: Google Gemini API for content generation and SEO optimization  
- **APIs**: WooCommerce REST API v3, WordPress REST API
- **Infrastructure**: Docker, Kubernetes (Helm charts), Terraform

## Development Commands

```bash
# Install dependencies
npm install

# Development - run full stack locally
npm run start        # Runs server (port 3001), proxy, and client concurrently
npm run start:saas   # Runs SaaS server mode with multi-tenant support

# Individual services
npm run dev                    # Frontend only (Vite dev server)
npm run start:server           # Backend server only
npm run start:server:saas      # SaaS backend only  
npm run start:proxy            # Proxy server only

# Build & Production
npm run build        # Production build
npm run build:dev    # Development build  

# Database (Prisma)
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio GUI
npm run prisma:seed       # Seed database

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Server Architecture
The application has two server modes:

1. **Standard Server** (`server.ts`): Single-tenant mode with direct WooCommerce integration
   - Direct API credentials in environment variables
   - Simplified auth flow
   - Proxies WooCommerce API requests

2. **SaaS Server** (`server-saas.ts`): Multi-tenant mode with organization support
   - Organization-based isolation
   - API credentials stored per organization (encrypted in database)
   - Activity tracking and billing integration
   - Campaign and email management features

### Key Directories

- `/src/components/` - React UI components organized by feature
- `/src/server/` - Backend services, routes, and middleware
  - `/routes/` - API route handlers  
  - `/services/` - Business logic services
  - `/middleware/` - Auth, tracking, etc.
- `/src/lib/` - Shared utilities and integrations
  - WooCommerce/WordPress clients
  - Gemini AI service
  - Database and caching layers
- `/src/pages/` - React Router page components
- `/prisma/` - Database schema and migrations
- `/services/` - Microservices (gateway, organization)

### Authentication & Security

- Firebase Auth for user authentication
- JWT tokens for API requests
- Organization-based access control (multi-tenant)
- Encrypted API credentials storage (AES-256)
- Role-based permissions (OWNER, ADMIN, MEMBER, VIEWER)

### Key Features

1. **WordPress/WooCommerce Integration**
   - Multi-site management
   - Real-time sync with WordPress APIs
   - WooCommerce analytics and reporting
   - Product catalog management

2. **AI-Powered SEO**
   - Batch content generation using Gemini
   - SEO optimization for products/posts
   - Yoast SEO integration
   - Multi-language support

3. **Campaign Management**  
   - Email campaign creation and scheduling
   - Template variations with A/B testing
   - Bounce and unsubscribe management
   - IP warmup scheduling

4. **Analytics Dashboard**
   - Revenue tracking and forecasting
   - Customer insights and segmentation
   - Order and product analytics
   - Activity feed and audit logs

### Environment Configuration

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Firebase
FIREBASE_SERVICE_ACCOUNT=... # Base64 encoded service account JSON

# AI
GEMINI_API_KEY=...

# Stripe (for billing)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# WooCommerce (for single-tenant mode)
WOOCOMMERCE_API_URL=...
WOOCOMMERCE_CLIENT_KEY=...
WOOCOMMERCE_SECRET_KEY=...
```

### Testing

The project includes various test files for different components:
- API integration tests (`test-*.js/mjs/ts` files)
- Component functionality tests
- SEO quality validation
- Batch processing tests

Run individual tests with: `node test-[name].mjs`

### Database Schema

PostgreSQL database managed by Prisma with key models:
- Organization (multi-tenant root)
- User (Firebase auth integration)
- Campaign, EmailTemplate, EmailSegment (campaign management)
- ApiCredential (encrypted API storage)
- ActivityLog (audit trail)
- Subscription (billing/plans)

### Deployment

- Docker support with Dockerfiles for frontend and services
- Kubernetes deployment via Helm charts
- Terraform infrastructure as code
- GitHub Actions CI/CD pipeline support
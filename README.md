# 🚀 Enterprise QC Platform

The most comprehensive Quality Control platform for agencies, marketing teams, and creative professionals.

## ✨ Features

- **Advanced QC Workflows** - Stage-based review process with AI scoring
- **Real-time Collaboration** - Multi-user annotations and comments
- **Team Management** - Role-based access and workload tracking
- **Executive Dashboards** - KPI tracking and business intelligence
- **AI-Powered Analysis** - Content quality scoring and recommendations
- **Batch Upload System** - Agency-scale file processing
- **Security & Compliance** - GDPR compliant with 2FA and audit logging
- **Rich Text Editor** - Collaborative editing with markdown support
- **Workflow Automation** - Smart assignment and trigger-based rules
- **Time Tracking** - Productivity monitoring and reporting

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leandroqctool/qc-tool&env=DATABASE_URL,NEXTAUTH_SECRET,NEXTAUTH_URL,R2_ENDPOINT,R2_BUCKET,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_PUBLIC_BASE_URL)

### Required Environment Variables

```bash
DATABASE_URL=your_neon_database_url
DATABASE_URL_UNPOOLED=your_neon_unpooled_url
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_random_secret_key
R2_ENDPOINT=your_r2_endpoint
R2_BUCKET=your_bucket_name
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_BASE_URL=your_public_url
```

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Authentication**: NextAuth.js
- **Storage**: Cloudflare R2
- **UI**: Radix UI + Tailwind CSS v4
- **TypeScript**: Strict mode
- **Testing**: Jest + Playwright + React Testing Library

## 📊 Architecture

This platform includes 80+ enterprise features across:

- **Core QC Engine** - File management, review workflows, quality scoring
- **Collaboration Tools** - Real-time editing, annotations, messaging
- **Team Management** - User roles, capacity planning, performance tracking
- **Analytics & Reporting** - Executive dashboards, custom reports, data export
- **Security & Compliance** - 2FA, audit logging, GDPR compliance
- **Automation** - Smart assignments, workflow triggers, batch processing
- **AI Integration** - Quality analysis, content scoring, recommendations

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/leandroqctool/qc-tool.git
   cd qc-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

## 📈 Production Deployment

The platform is production-ready with:

- ✅ TypeScript strict mode
- ✅ Comprehensive test coverage
- ✅ Security hardening
- ✅ Performance optimization
- ✅ Error handling & monitoring
- ✅ Backup & recovery systems

## 📚 Documentation

- [Master Plan](./docs/MASTER_PLAN.md) - Complete feature overview
- [Operational Runbooks](./docs/OPERATIONAL_RUNBOOKS.md) - Deployment & maintenance
- [Testing Report](./docs/TESTING_REPORT.md) - Quality assurance details

## 🤝 Contributing

This is an enterprise-grade platform with comprehensive features. Please review the architecture before contributing.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the creative industry**

*Transforming quality control from a bottleneck into a competitive advantage.*
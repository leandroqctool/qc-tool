# QC Tool - Operational Runbooks

## 🚀 **PRODUCTION OPERATIONS GUIDE**

This document provides comprehensive operational procedures for managing the QC Tool in production environments.

---

## 📋 **TABLE OF CONTENTS**

1. [Deployment Procedures](#deployment-procedures)
2. [Monitoring & Alerting](#monitoring--alerting)
3. [Incident Response](#incident-response)
4. [Backup & Recovery](#backup--recovery)
5. [Performance Optimization](#performance-optimization)
6. [Security Operations](#security-operations)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🚀 **DEPLOYMENT PROCEDURES**

### **Pre-Deployment Checklist**

**✅ Code Quality**
- [ ] All tests passing (`npm run test:all`)
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] ESLint checks passed
- [ ] Security audit clean (`npm audit`)

**✅ Environment Setup**
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] R2 bucket permissions verified
- [ ] NextAuth configuration validated

**✅ Dependencies**
- [ ] Node.js version 18+ installed
- [ ] Vercel CLI authenticated
- [ ] Database connectivity confirmed
- [ ] External services accessible

### **Deployment Commands**

```bash
# Automated deployment (recommended)
./scripts/deploy.sh

# Manual deployment steps
npm ci --prefer-offline
npm run test:ci
npm run build
vercel --prod
```

### **Post-Deployment Verification**

```bash
# Health check
curl https://your-domain.com/api/health

# Main application
curl -I https://your-domain.com

# Database connectivity
curl https://your-domain.com/api/stats
```

### **Rollback Procedures**

**Immediate Rollback (< 5 minutes)**
```bash
# Revert to previous Vercel deployment
vercel rollback --prod
```

**Database Rollback (if needed)**
```bash
# Apply reverse migrations
npm run db:rollback
```

---

## 📊 **MONITORING & ALERTING**

### **Key Metrics to Monitor**

**🔍 Application Metrics**
- Response time (target: < 500ms avg)
- Error rate (target: < 1%)
- Request throughput
- Memory usage (alert: > 80%)
- Database connection pool

**🔍 Infrastructure Metrics**
- Vercel function execution time
- Database query performance
- R2 storage latency
- CDN cache hit rate

**🔍 Business Metrics**
- User session duration
- File upload success rate
- QC review completion time
- System availability (target: 99.9%)

### **Alerting Thresholds**

**🚨 Critical Alerts**
- System down (0 successful health checks)
- Database unavailable
- Error rate > 5%
- Response time > 5 seconds

**⚠️ Warning Alerts**
- Memory usage > 80%
- Error rate > 1%
- Response time > 1 second
- Disk usage > 85%

**📊 Info Alerts**
- Deployment completed
- High traffic volume
- Scheduled maintenance

### **Monitoring Endpoints**

```bash
# System health
GET /api/health

# Detailed metrics
GET /api/monitoring/metrics

# Active alerts
GET /api/monitoring/alerts
```

### **Dashboard Access**

- **System Monitoring**: `/monitoring` (admin only)
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Database Monitoring**: Neon Console
- **R2 Analytics**: Cloudflare Dashboard

---

## 🚨 **INCIDENT RESPONSE**

### **Incident Classification**

**P0 - Critical (< 15 min response)**
- Complete system outage
- Data loss or corruption
- Security breach
- Payment system failure

**P1 - High (< 1 hour response)**
- Major feature unavailable
- Performance severely degraded
- Authentication issues
- File upload failures

**P2 - Medium (< 4 hours response)**
- Minor feature issues
- Performance slightly degraded
- UI/UX problems
- Non-critical integrations down

**P3 - Low (< 24 hours response)**
- Cosmetic issues
- Enhancement requests
- Documentation updates
- Minor bugs

### **Incident Response Steps**

**1. Detection & Assessment**
```bash
# Check system health
curl https://your-domain.com/api/health

# Review recent deployments
vercel ls

# Check error logs
vercel logs --prod
```

**2. Initial Response**
- Acknowledge the incident
- Assess impact and severity
- Notify stakeholders if P0/P1
- Begin investigation

**3. Investigation**
```bash
# Check application logs
vercel logs --prod --since 1h

# Database performance
# Check Neon dashboard for slow queries

# Review monitoring dashboard
# Visit /monitoring for system metrics
```

**4. Resolution**
- Apply immediate fixes
- Deploy hotfix if needed
- Monitor for stability
- Document root cause

**5. Post-Incident**
- Conduct post-mortem
- Update runbooks
- Implement preventive measures
- Communicate lessons learned

### **Emergency Contacts**

- **On-call Engineer**: [Your contact info]
- **Database Admin**: [Neon support]
- **Infrastructure**: [Vercel support]
- **Security Team**: [Security contact]

---

## 💾 **BACKUP & RECOVERY**

### **Backup Strategy**

**🗄️ Database Backups**
- **Frequency**: Automatic daily backups (Neon)
- **Retention**: 30 days (configurable)
- **Location**: Neon managed backups
- **Recovery Point**: < 24 hours

**📁 File Storage Backups**
- **Frequency**: Continuous replication (R2)
- **Retention**: Indefinite
- **Location**: Cloudflare R2 with versioning
- **Recovery Point**: < 1 hour

**⚙️ Application Backups**
- **Code**: Git repository (GitHub)
- **Configuration**: Environment variables (Vercel)
- **Deployments**: Vercel deployment history

### **Recovery Procedures**

**Database Recovery**
```bash
# Point-in-time recovery via Neon console
# 1. Access Neon dashboard
# 2. Select "Restore" option
# 3. Choose recovery point
# 4. Confirm restoration
```

**File Recovery**
```bash
# R2 object versioning
# 1. Access Cloudflare R2 dashboard
# 2. Navigate to affected bucket
# 3. Select object versions
# 4. Restore previous version
```

**Application Recovery**
```bash
# Rollback to previous deployment
vercel rollback --prod

# Restore from specific commit
git checkout <commit-hash>
vercel --prod
```

### **Disaster Recovery Plan**

**🔴 Complete System Failure**
1. Assess scope of failure
2. Activate disaster recovery team
3. Restore from latest backups
4. Verify data integrity
5. Perform system health checks
6. Communicate with stakeholders

**⏱️ Recovery Time Objectives (RTO)**
- Application: < 1 hour
- Database: < 2 hours
- File storage: < 30 minutes
- Complete system: < 4 hours

**📊 Recovery Point Objectives (RPO)**
- Database: < 24 hours
- File storage: < 1 hour
- Application state: < 1 hour

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### **Performance Monitoring**

**🔍 Key Metrics**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)
- API response times

**📊 Monitoring Tools**
- Vercel Analytics
- Web Vitals monitoring
- Custom metrics API
- Database query analysis

### **Optimization Strategies**

**🚀 Frontend Optimization**
```bash
# Analyze bundle size
npm run build -- --analyze

# Optimize images
# Use Next.js Image component
# Implement lazy loading
# Enable WebP/AVIF formats
```

**⚡ Backend Optimization**
```bash
# Database query optimization
# Add indexes for slow queries
# Implement query caching
# Use connection pooling
```

**🌐 CDN & Caching**
```bash
# Vercel Edge Network
# Static asset caching
# API response caching
# Database query caching
```

### **Performance Thresholds**

**✅ Target Metrics**
- Page load time: < 2 seconds
- API response time: < 500ms
- Database queries: < 100ms
- File upload: < 30 seconds (10MB)

**⚠️ Alert Thresholds**
- Page load time: > 5 seconds
- API response time: > 2 seconds
- Database queries: > 1 second
- Memory usage: > 80%

---

## 🔒 **SECURITY OPERATIONS**

### **Security Monitoring**

**🛡️ Security Metrics**
- Failed login attempts
- Suspicious IP addresses
- Unusual access patterns
- File upload anomalies
- API rate limiting triggers

**🔍 Security Logs**
```bash
# Access security audit logs
GET /api/security/audit

# Monitor failed authentications
# Check for brute force attempts
# Review privilege escalations
```

### **Security Incident Response**

**🚨 Security Breach**
1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Assess scope of breach
   - Notify security team

2. **Investigation**
   - Analyze security logs
   - Identify attack vectors
   - Determine data exposure
   - Document timeline

3. **Containment**
   - Block malicious IPs
   - Revoke compromised credentials
   - Apply security patches
   - Monitor for persistence

4. **Recovery**
   - Restore from clean backups
   - Implement additional controls
   - Update security policies
   - Conduct security review

### **Regular Security Tasks**

**📅 Daily**
- Review security alerts
- Monitor failed login attempts
- Check for suspicious activity

**📅 Weekly**
- Update security policies
- Review user access rights
- Analyze security metrics

**📅 Monthly**
- Security vulnerability scan
- Access control audit
- Security training updates
- Incident response drill

---

## 🔧 **TROUBLESHOOTING GUIDE**

### **Common Issues**

**🚫 Application Won't Start**
```bash
# Check build logs
vercel logs --prod

# Verify environment variables
vercel env ls

# Check function timeout
# Increase timeout in vercel.json
```

**🐌 Slow Performance**
```bash
# Check database performance
# Review slow query logs in Neon

# Analyze bundle size
npm run build -- --analyze

# Monitor memory usage
# Check /api/monitoring/metrics
```

**💾 Database Connection Issues**
```bash
# Test database connectivity
npm run db:test

# Check connection pool
# Monitor active connections

# Verify environment variables
echo $DATABASE_URL
```

**📁 File Upload Failures**
```bash
# Check R2 configuration
# Verify bucket permissions

# Test presigned URL generation
curl -X POST /api/files/upload-url

# Check CORS settings
# Verify allowed origins in R2
```

**🔐 Authentication Problems**
```bash
# Verify NextAuth configuration
# Check NEXTAUTH_URL and NEXTAUTH_SECRET

# Test authentication flow
# Review session configuration

# Check user permissions
# Verify role-based access
```

### **Log Analysis**

**📋 Application Logs**
```bash
# View recent logs
vercel logs --prod --since 1h

# Filter by function
vercel logs --prod --since 1h | grep "api/health"

# Search for errors
vercel logs --prod --since 1h | grep "ERROR"
```

**📊 Performance Logs**
```bash
# Monitor response times
# Check /api/monitoring/metrics

# Database query performance
# Review Neon dashboard

# Memory usage patterns
# Analyze heap snapshots
```

### **Health Check Commands**

```bash
# System health
curl -f https://your-domain.com/api/health || echo "Health check failed"

# Database connectivity
curl -f https://your-domain.com/api/stats || echo "Database issue"

# Authentication
curl -f https://your-domain.com/api/auth/session || echo "Auth issue"

# File storage
curl -f https://your-domain.com/api/files/list || echo "Storage issue"
```

---

## 📞 **SUPPORT CONTACTS**

**🆘 Emergency Support**
- **Vercel Support**: https://vercel.com/support
- **Neon Support**: https://neon.tech/support
- **Cloudflare Support**: https://support.cloudflare.com

**📚 Documentation**
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/

**🔧 Internal Resources**
- **System Monitoring**: `/monitoring`
- **Health Check**: `/api/health`
- **Security Dashboard**: `/security`
- **Analytics**: `/analytics`

---

## 📝 **CHANGELOG**

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-XX | 1.0.0 | Initial operational runbooks |
| 2024-XX-XX | 1.1.0 | Added monitoring procedures |
| 2024-XX-XX | 1.2.0 | Enhanced security operations |

---

**💡 Remember: When in doubt, check the monitoring dashboard first, then review recent deployments, and always preserve evidence during incident response.**

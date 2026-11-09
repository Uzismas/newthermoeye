# Security Policy

## Overview

Thermoeye is a clinical decision support platform handling sensitive medical data. Security is paramount for protecting patient privacy, ensuring data integrity, and maintaining trust in healthcare operations.

## Reporting Security Vulnerabilities

### How to Report

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security issues privately:

1. **Email**: Send details to `security@thermoeye.example.com` (replace with actual contact)
2. **Subject**: `[SECURITY] Brief description`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Affected versions/components
   - Any suggested fixes (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Status updates**: Every 7 days until resolved
- **Fix timeline**: Varies by severity (critical: 7 days, high: 14 days, medium: 30 days)

## Security Classifications

### Critical Severity
- PHI/PII data exposure or leakage
- Authentication bypass
- Unauthorized access to patient records
- SQL injection or remote code execution
- Privilege escalation to admin/doctor roles

### High Severity
- Unauthorized data modification
- Session hijacking
- CSRF vulnerabilities
- Audit log tampering
- Model inference manipulation

### Medium Severity
- Information disclosure (non-PHI)
- Denial of service
- XSS vulnerabilities
- Missing security headers
- Weak encryption

### Low Severity
- Rate limiting issues
- UI redressing
- Minor information leaks

## Secure Development Practices

### Data Protection

#### Protected Health Information (PHI)
- **Never log PHI**: No patient names, IDs, birthdates, or identifiable information in logs
- **De-identification required**: All uploaded scans must be de-identified before processing
- **Encryption**:
  - At rest: AES-256 for stored patient data
  - In transit: TLS 1.3 minimum for all API communications
- **Access control**: Role-based access with least privilege principle
- **Audit logging**: All PHI access must be logged with user, timestamp, and purpose

#### Sensitive Credentials
- **Never commit**:
  - API keys (`.env.local`, `.env.production`)
  - Database credentials
  - Private keys (`.pem`, `.key`)
  - JWT secrets
  - OAuth tokens
- **Use environment variables**: Store all secrets in `.env.local` (gitignored)
- **Rotate regularly**: API keys and secrets should be rotated quarterly minimum
- **Least privilege**: Use read-only keys where possible

### Authentication & Authorization

#### Production Requirements
- **Multi-factor authentication (MFA)**: Required for all doctor and admin accounts
- **Strong passwords**: Minimum 12 characters, complexity requirements
- **Session management**:
  - Secure, HTTP-only cookies
  - Session timeout: 30 minutes of inactivity
  - Concurrent session limits per user
- **Rate limiting**: 
  - Login attempts: 5 per 15 minutes per IP
  - API calls: 100 per minute per user
  - File uploads: 10 per hour per user

#### Role-Based Access Control (RBAC)
- **Doctor**: Review cases, approve reports, access hospital-scoped data
- **Admin**: Manage users, view audit logs, system configuration
- **Viewer**: Read-only access to approved reports
- **Hospital scope**: Users can only access data from their assigned hospital(s)

### Input Validation

#### File Uploads
```javascript
// All uploads must be validated
- File type: .jpg, .png, .dcm (DICOM) only
- File size: Maximum 50MB per file
- Malware scan: Required before storage
- Content verification: Check magic bytes, not just extension
- Quarantine: All uploads go to quarantine bucket first
```

#### API Inputs
- Validate all inputs against schema
- Sanitize SQL queries (use parameterized queries only)
- Escape HTML/JavaScript in all user content
- Limit string lengths (prevent buffer overflow)
- Validate numerical ranges

### Secure Storage

#### Object Storage
```
Structure:
- quarantine/     → Uploads before validation
- raw/            → Original scans (encrypted)
- processed/      → Analyzed images (encrypted)
- reports/        → Generated reports (encrypted)

Access:
- Pre-signed URLs with expiration (15 minutes)
- Hospital-scoped access keys
- Audit all access
```

#### Database
- **Encryption at rest**: Database-level encryption enabled
- **Parameterized queries**: Never use string concatenation for SQL
- **Least privilege**: Application database user has minimal required permissions
- **Backup encryption**: All backups encrypted and access-controlled
- **Audit table**: Append-only, tamper-evident audit log

### Audit Logging

#### Required Events
```javascript
// All these actions must generate audit entries
- user.login / user.logout
- case.create / case.view / case.update
- scan.upload / scan.view / scan.download
- analysis.run / analysis.view
- review.submit / review.update
- report.preview / report.download / report.release
- admin.user_create / admin.role_change
- system.config_change / system.model_deploy
```

#### Audit Log Structure
```json
{
  "timestamp": "ISO 8601",
  "event_type": "category.action",
  "user_id": "uuid",
  "user_role": "doctor|admin|viewer",
  "hospital_id": "uuid",
  "resource_type": "case|scan|report",
  "resource_id": "uuid",
  "action": "create|view|update|delete|download",
  "ip_address": "xxx.xxx.xxx.xxx",
  "user_agent": "string",
  "outcome": "success|failure",
  "error": "string (if failure)"
}
```

## Compliance Requirements

### HIPAA (United States)
- **Administrative safeguards**: Security officer, training, access management
- **Physical safeguards**: Facility access, device controls, media disposal
- **Technical safeguards**: Access controls, audit controls, integrity, transmission security
- **Breach notification**: Report breaches affecting 500+ individuals to HHS within 60 days

### GDPR (European Union)
- **Lawful basis**: Consent or legitimate interest for processing
- **Data minimization**: Collect only necessary patient data
- **Right to erasure**: Implement data deletion on patient request
- **Data portability**: Allow patients to export their data
- **Breach notification**: Report to supervisory authority within 72 hours

### PDPA (Thailand)
- **Consent**: Explicit consent required for sensitive health data
- **Purpose limitation**: Use data only for stated purposes
- **Data retention**: Define and enforce retention periods
- **Cross-border transfer**: Restrictions on transferring data outside Thailand

### FDA (Medical Devices)
If Thermoeye becomes a regulated medical device:
- **510(k) clearance**: Required for market authorization
- **Quality System Regulation (QSR)**: Design controls, CAPA, risk management
- **Post-market surveillance**: Adverse event reporting
- **Cybersecurity**: Follow FDA guidance on medical device cybersecurity

## Development Security Checklist

### Before Every Commit
- [ ] No hardcoded secrets or credentials
- [ ] No PHI in code, comments, or test data
- [ ] Input validation on all user inputs
- [ ] Parameterized SQL queries (no string concatenation)
- [ ] XSS protection (escape user content)
- [ ] CSRF tokens on state-changing operations

### Before Every Deployment
- [ ] Dependencies updated (`npm audit`, `pip check`)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] TLS 1.3 enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive information
- [ ] Database backups configured and tested
- [ ] Secrets rotated and stored securely
- [ ] Penetration testing completed (for production)

### Code Review Focus
- Authentication and authorization logic
- SQL queries and database interactions
- File upload handling
- API input validation
- PHI access and logging
- Audit log entries
- Error handling (avoid leaking stack traces)

## Incident Response

### In Case of Security Breach

1. **Immediate (0-1 hour)**:
   - Contain the breach (disable affected systems)
   - Notify security team and management
   - Preserve evidence (logs, snapshots)

2. **Short-term (1-24 hours)**:
   - Assess scope and impact
   - Identify affected patients/records
   - Begin root cause analysis
   - Prepare breach notification

3. **Medium-term (1-7 days)**:
   - Notify affected patients (HIPAA: 60 days)
   - Report to regulatory authorities (GDPR: 72 hours)
   - Deploy patches/fixes
   - Update security controls

4. **Long-term (7+ days)**:
   - Complete post-incident review
   - Update security policies
   - Implement preventive controls
   - Conduct security training

## Third-Party Dependencies

### Vetting Process
- Review security advisories
- Check for active maintenance
- Verify license compatibility
- Scan for known vulnerabilities (`npm audit`, Snyk, Dependabot)
- Document approved versions

### Update Policy
- **Critical vulnerabilities**: Patch within 24 hours
- **High vulnerabilities**: Patch within 7 days
- **Medium vulnerabilities**: Patch within 30 days
- **Low vulnerabilities**: Patch with next regular update

## Security Contacts

- **Security Team**: `security@thermoeye.example.com`
- **Privacy Officer**: `privacy@thermoeye.example.com`
- **Compliance Officer**: `compliance@thermoeye.example.com`

---

**Last Updated**: 2026-08-08

This policy is reviewed quarterly and updated as needed to reflect current threats and best practices.

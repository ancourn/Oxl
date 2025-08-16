import crypto from 'crypto';

// Encryption utilities
export class EncryptionUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  // Generate a secure encryption key
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  // Generate initialization vector
  static generateIV(): string {
    return crypto.randomBytes(this.IV_LENGTH).toString('hex');
  }

  // Encrypt data
  static encrypt(data: string, key: string): { encrypted: string; iv: string; tag: string } {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipher(this.ALGORITHM, keyBuffer);
      cipher.setAAD(Buffer.from('oxl-encryption'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  static decrypt(encryptedData: string, key: string, iv: string, tag: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      const tagBuffer = Buffer.from(tag, 'hex');
      
      const decipher = crypto.createDecipher(this.ALGORITHM, keyBuffer);
      decipher.setAAD(Buffer.from('oxl-encryption'));
      decipher.setAuthTag(tagBuffer);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash password
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Generate secure token
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Sanitize input
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  // Generate CSRF token
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  // Validate CSRF token
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken;
  }
}

// Audit logging
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export class AuditLogger {
  private static logs: AuditLogEntry[] = [];

  // Log an action
  static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    // Store in memory (in production, this would go to a database)
    this.logs.push(logEntry);

    // Log to console for development
    console.log('Audit Log:', logEntry);

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      await this.sendToExternalService(logEntry);
    }
  }

  // Get audit logs
  static getLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      if (filters.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Export logs
  static exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV format
      const headers = 'ID,User ID,Action,Resource,Resource ID,IP Address,User Agent,Timestamp,Severity\n';
      const rows = this.logs.map(log => 
        `${log.id},${log.userId},${log.action},${log.resource},${log.resourceId || ''},${log.ipAddress},${log.userAgent},${log.timestamp.toISOString()},${log.severity}`
      ).join('\n');
      return headers + rows;
    }
  }

  // Send to external logging service
  private static async sendToExternalService(logEntry: AuditLogEntry): Promise<void> {
    // This would integrate with services like Sentry, Loggly, Datadog, etc.
    if (process.env.SENTRY_DSN) {
      // Send to Sentry
      console.log('Sending to Sentry:', logEntry);
    }
  }

  // Clean up old logs
  static cleanup(olderThanDays: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
  }
}

// GDPR Compliance utilities
export class GDPRUtils {
  // Check if data processing is lawful
  static isLawfulProcessing(userId: string, purpose: string): boolean {
    // In a real implementation, this would check:
    // 1. User consent
    // 2. Contract necessity
    // 3. Legal obligation
    // 4. Vital interests
    // 5. Public task
    // 6. Legitimate interests
    
    return true; // Placeholder
  }

  // Anonymize user data
  static anonymizeUserData(userData: any): any {
    const anonymized = { ...userData };
    
    // Remove or hash personal identifiers
    if (anonymized.email) {
      anonymized.email = this.hashEmail(anonymized.email);
    }
    if (anonymized.name) {
      anonymized.name = 'Anonymous User';
    }
    if (anonymized.phone) {
      anonymized.phone = this.hashPhone(anonymized.phone);
    }
    if (anonymized.address) {
      anonymized.address = 'Address Redacted';
    }
    
    return anonymized;
  }

  // Hash email for anonymization
  private static hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  // Hash phone for anonymization
  private static hashPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    return crypto.createHash('sha256').update(cleaned).digest('hex').substring(0, 16);
  }

  // Generate data processing report
  static generateProcessingReport(userId: string): any {
    return {
      userId,
      reportGenerated: new Date().toISOString(),
      dataCategories: [
        'Profile Information',
        'Team Memberships',
        'Document Access',
        'File Storage',
        'Communication Data'
      ],
      retentionPeriod: 'Until account deletion or 2 years of inactivity',
      thirdPartySharing: 'None without explicit consent',
      dataSubjectRights: [
        'Right to access',
        'Right to rectification',
        'Right to erasure',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object',
        'Right to be informed'
      ]
    };
  }

  // Handle data deletion request
  static async handleDeletionRequest(userId: string): Promise<void> {
    // This would implement the "right to be forgotten"
    // In a real system, this would:
    // 1. Verify identity
    // 2. Check legal obligations for retention
    // 3. Delete user data from all systems
    // 4. Confirm deletion
    // 5. Log the action
    
    console.log(`Processing deletion request for user ${userId}`);
  }

  // Validate data processing consent
  static validateConsent(userId: string, processingType: string): boolean {
    // Check if user has given valid consent for data processing
    // This would query the database for consent records
    return true; // Placeholder
  }
}

// 2FA Utilities
export class TwoFactorAuth {
  // Generate TOTP secret
  static generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Generate backup codes
  static generateBackupCodes(count: number = 10): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Verify TOTP token
  static verifyTOTPToken(secret: string, token: string): boolean {
    // This would integrate with a TOTP library like speakeasy
    // For now, it's a placeholder implementation
    console.log(`Verifying TOTP token ${token} against secret ${secret}`);
    return true; // Placeholder
  }

  // Verify backup code
  static verifyBackupCode(storedCodes: string[], providedCode: string): boolean {
    return storedCodes.includes(providedCode.toUpperCase());
  }

  // Generate 2FA setup QR code data
  static generateQRCodeData(email: string, secret: string): string {
    return `otpauth://totp/Oxl:${email}?secret=${secret}&issuer=Oxl&algorithm=SHA1&digits=6&period=30`;
  }
}

// Security middleware utilities
export class SecurityMiddleware {
  // Validate HTTPS in production
  static enforceHTTPS(req: any): boolean {
    if (process.env.NODE_ENV === 'production') {
      return req.secure || req.headers['x-forwarded-proto'] === 'https';
    }
    return true;
  }

  // Security headers
  static getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    };
  }

  // Rate limiting configuration
  static getRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    };
  }

  // Validate request origin
  static validateOrigin(origin: string): boolean {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://yourdomain.com'
    ];
    
    return allowedOrigins.includes(origin);
  }

  // Session security
  static validateSession(session: any): boolean {
    return session && session.user && session.user.id;
  }

  // Input validation
  static validateInput(input: any, schema: any): boolean {
    // This would integrate with a validation library like Joi or Zod
    try {
      // Placeholder validation
      return input !== null && input !== undefined;
    } catch {
      return false;
    }
  }
}
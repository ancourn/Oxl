const fs = require('fs')
const path = require('path')

class FinalReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      testResults: {},
      fixResults: {},
      codeQuality: {},
      deploymentReadiness: {},
      recommendations: [],
      summary: {}
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`)
  }

  async collectTestResults() {
    this.log('Collecting test results...')

    // Check for test reports
    const testReports = [
      './websocket-test-report.json',
      './meet-websocket-test-report.json',
      './socket-fix-report.json',
      './notification-fix-report.json',
      './permission-fix-report.json'
    ]

    this.reportData.testResults = {
      totalTestSuites: 5,
      reportsFound: 0,
      passedTests: 0,
      failedTests: 0,
      warnings: 0,
      details: []
    }

    for (const reportPath of testReports) {
      if (fs.existsSync(reportPath)) {
        try {
          const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
          this.reportData.testResults.reportsFound++
          this.reportData.testResults.passedTests += reportData.summary.passedTests || 0
          this.reportData.testResults.failedTests += reportData.summary.failedTests || 0
          this.reportData.testResults.warnings += reportData.summary.warnings || 0
          
          this.reportData.testResults.details.push({
            reportType: reportData.testType || 'Unknown',
            path: reportPath,
            ...reportData.summary
          })
        } catch (error) {
          this.log(`Error reading test report ${reportPath}: ${error.message}`, 'warning')
        }
      }
    }

    this.log(`Found ${this.reportData.testResults.reportsFound}/5 test reports`, 'info')
  }

  async collectFixResults() {
    this.log('Collecting fix results...')

    // Check for fix reports
    const fixReports = [
      './socket-fix-report.json',
      './notification-fix-report.json',
      './permission-fix-report.json'
    ]

    this.reportData.fixResults = {
      totalFixSuites: 3,
      reportsFound: 0,
      fixesApplied: 0,
      errors: 0,
      details: []
    }

    for (const reportPath of fixReports) {
      if (fs.existsSync(reportPath)) {
        try {
          const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
          this.reportData.fixResults.reportsFound++
          this.reportData.fixResults.fixesApplied += reportData.summary.totalFixes || 0
          this.reportData.fixResults.errors += reportData.summary.errors || 0
          
          this.reportData.fixResults.details.push({
            fixType: reportData.fixType || 'Unknown',
            path: reportPath,
            ...reportData.summary
          })
        } catch (error) {
          this.log(`Error reading fix report ${reportPath}: ${error.message}`, 'warning')
        }
      }
    }

    this.log(`Found ${this.reportData.fixResults.reportsFound}/3 fix reports`, 'info')
  }

  async analyzeCodeQuality() {
    this.log('Analyzing code quality...')

    // Check for common code quality indicators
    const srcDir = path.join(__dirname, '..', 'src')
    
    this.reportData.codeQuality = {
      filesScanned: 0,
      typescriptFiles: 0,
      testFiles: 0,
      apiRoutes: 0,
      components: 0,
      potentialIssues: [],
      securityChecks: {
        authImplemented: false,
        validationImplemented: false,
        errorHandlingImplemented: false
      },
      bestPractices: {
        soCSeparation: false,
        testingCoverage: false,
        documentation: false,
        typeSafety: false
      }
    }

    if (fs.existsSync(srcDir)) {
      this.scanDirectory(srcDir)
    }

    // Check for specific implementations
    this.checkSecurityImplementations()
    this.checkBestPractices()

    this.log(`Scanned ${this.reportData.codeQuality.filesScanned} files`, 'info')
  }

  scanDirectory(dir) {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        this.scanDirectory(fullPath)
      } else {
        this.reportData.codeQuality.filesScanned++
        
        if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          this.reportData.codeQuality.typescriptFiles++
        }
        
        if (item.includes('.test.') || item.includes('.spec.')) {
          this.reportData.codeQuality.testFiles++
        }
        
        if (fullPath.includes('/api/')) {
          this.reportData.codeQuality.apiRoutes++
        }
        
        if (fullPath.includes('/components/')) {
          this.reportData.codeQuality.components++
        }
        
        // Check for potential issues
        this.checkFileForIssues(fullPath)
      }
    }
  }

  checkFileForIssues(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      
      // Check for console.log statements
      if (content.includes('console.log')) {
        this.reportData.codeQuality.potentialIssues.push({
          file: filePath,
          issue: 'Console.log statements found',
          severity: 'low'
        })
      }
      
      // Check for TODO comments
      if (content.includes('TODO') || content.includes('FIXME')) {
        this.reportData.codeQuality.potentialIssues.push({
          file: filePath,
          issue: 'TODO/FIXME comments found',
          severity: 'medium'
        })
      }
      
      // Check for error handling
      if (!content.includes('try') && !content.includes('catch') && content.includes('await')) {
        this.reportData.codeQuality.potentialIssues.push({
          file: filePath,
          issue: 'Potential missing error handling',
          severity: 'medium'
        })
      }
      
      // Check for hardcoded values
      if (content.includes('http://localhost') || content.includes('127.0.0.1')) {
        this.reportData.codeQuality.potentialIssues.push({
          file: filePath,
          issue: 'Hardcoded localhost values found',
          severity: 'medium'
        })
      }
    } catch (error) {
      // Ignore file read errors
    }
  }

  checkSecurityImplementations() {
    // Check for auth implementation
    const authFiles = [
      '/src/lib/auth.ts',
      '/src/app/api/auth/[...nextauth]/route.ts'
    ]
    
    for (const authFile of authFiles) {
      if (fs.existsSync(path.join(__dirname, '..', authFile))) {
        this.reportData.codeQuality.securityChecks.authImplemented = true
        break
      }
    }
    
    // Check for validation implementation
    const validationFiles = [
      '/src/lib/validations',
      '/src/lib/schemas'
    ]
    
    for (const validationDir of validationFiles) {
      if (fs.existsSync(path.join(__dirname, '..', validationDir))) {
        this.reportData.codeQuality.securityChecks.validationImplemented = true
        break
      }
    }
    
    // Check for error handling
    if (fs.existsSync(path.join(__dirname, '..', 'src/lib/error-handling.ts'))) {
      this.reportData.codeQuality.securityChecks.errorHandlingImplemented = true
    }
  }

  checkBestPractices() {
    // Check for separation of concerns
    const libDir = path.join(__dirname, '..', 'src/lib')
    if (fs.existsSync(libDir)) {
      const libItems = fs.readdirSync(libDir)
      if (libItems.length > 0) {
        this.reportData.codeQuality.bestPractices.soCSeparation = true
      }
    }
    
    // Check for testing
    if (this.reportData.codeQuality.testFiles > 10) {
      this.reportData.codeQuality.bestPractices.testingCoverage = true
    }
    
    // Check for documentation
    const readmeFiles = [
      '/README.md',
      '/docs',
      '/documentation'
    ]
    
    for (const readmeFile of readmeFiles) {
      if (fs.existsSync(path.join(__dirname, '..', readmeFile))) {
        this.reportData.codeQuality.bestPractices.documentation = true
        break
      }
    }
    
    // Check for TypeScript usage
    if (this.reportData.codeQuality.typescriptFiles > this.reportData.codeQuality.filesScanned * 0.8) {
      this.reportData.codeQuality.bestPractices.typeSafety = true
    }
  }

  async assessDeploymentReadiness() {
    this.log('Assessing deployment readiness...')

    this.reportData.deploymentReadiness = {
      overallScore: 0,
      categories: {
        infrastructure: {
          score: 0,
          checks: [
            { name: 'Docker support', status: false },
            { name: 'Environment variables', status: false },
            { name: 'Build configuration', status: false },
            { name: 'Database migrations', status: false }
          ]
        },
        security: {
          score: 0,
          checks: [
            { name: 'Authentication', status: false },
            { name: 'Authorization', status: false },
            { name: 'Input validation', status: false },
            { name: 'HTTPS configuration', status: false }
          ]
        },
        performance: {
          score: 0,
          checks: [
            { name: 'Code splitting', status: false },
            { name: 'Image optimization', status: false },
            { name: 'Bundle analysis', status: false },
            { name: 'Caching strategy', status: false }
          ]
        },
        monitoring: {
          score: 0,
          checks: [
            { name: 'Error tracking', status: false },
            { name: 'Performance monitoring', status: false },
            { name: 'Logging system', status: false },
            { name: 'Health checks', status: false }
          ]
        }
      },
      recommendations: [],
      blockers: [],
      warnings: []
    }

    // Check infrastructure readiness
    this.checkInfrastructureReadiness()
    
    // Check security readiness
    this.checkSecurityReadiness()
    
    // Check performance readiness
    this.checkPerformanceReadiness()
    
    // Check monitoring readiness
    this.checkMonitoringReadiness()

    // Calculate overall score
    const categories = Object.values(this.reportData.deploymentReadiness.categories)
    const totalChecks = categories.reduce((sum, cat) => sum + cat.checks.length, 0)
    const passedChecks = categories.reduce((sum, cat) => sum + cat.checks.filter(check => check.status).length, 0)
    
    this.reportData.deploymentReadiness.overallScore = Math.round((passedChecks / totalChecks) * 100)

    this.log(`Deployment readiness score: ${this.reportData.deploymentReadiness.overallScore}%`, 'info')
  }

  checkInfrastructureReadiness() {
    const infra = this.reportData.deploymentReadiness.categories.infrastructure
    
    // Check Docker support
    if (fs.existsSync(path.join(__dirname, '..', 'Dockerfile'))) {
      infra.checks[0].status = true
      infra.score += 25
    }
    
    // Check environment variables
    if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
      infra.checks[1].status = true
      infra.score += 25
    }
    
    // Check build configuration
    if (fs.existsSync(path.join(__dirname, '..', 'next.config.js'))) {
      infra.checks[2].status = true
      infra.score += 25
    }
    
    // Check database migrations
    if (fs.existsSync(path.join(__dirname, '..', 'prisma'))) {
      infra.checks[3].status = true
      infra.score += 25
    }
  }

  checkSecurityReadiness() {
    const security = this.reportData.deploymentReadiness.categories.security
    
    // Check authentication
    if (this.reportData.codeQuality.securityChecks.authImplemented) {
      security.checks[0].status = true
      security.score += 25
    }
    
    // Check authorization
    if (fs.existsSync(path.join(__dirname, '..', 'src/lib/middleware'))) {
      security.checks[1].status = true
      security.score += 25
    }
    
    // Check input validation
    if (this.reportData.codeQuality.securityChecks.validationImplemented) {
      security.checks[2].status = true
      security.score += 25
    }
    
    // Check HTTPS configuration
    const nextConfig = fs.readFileSync(path.join(__dirname, '..', 'next.config.js'), 'utf8')
    if (nextConfig.includes('https') || nextConfig.includes('ssl')) {
      security.checks[3].status = true
      security.score += 25
    }
  }

  checkPerformanceReadiness() {
    const performance = this.reportData.deploymentReadiness.categories.performance
    
    // Check code splitting (Next.js does this automatically)
    performance.checks[0].status = true
    performance.score += 25
    
    // Check image optimization
    if (fs.existsSync(path.join(__dirname, '..', 'next.config.js'))) {
      const nextConfig = fs.readFileSync(path.join(__dirname, '..', 'next.config.js'), 'utf8')
      if (nextConfig.includes('images')) {
        performance.checks[1].status = true
        performance.score += 25
      }
    }
    
    // Check bundle analysis
    if (fs.existsSync(path.join(__dirname, '..', 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
      if (pkg.dependencies['@next/bundle-analyzer'] || pkg.devDependencies['@next/bundle-analyzer']) {
        performance.checks[2].status = true
        performance.score += 25
      }
    }
    
    // Check caching strategy
    if (fs.existsSync(path.join(__dirname, '..', 'next.config.js'))) {
      const nextConfig = fs.readFileSync(path.join(__dirname, '..', 'next.config.js'), 'utf8')
      if (nextConfig.includes('cache') || nextConfig.includes('swc')) {
        performance.checks[3].status = true
        performance.score += 25
      }
    }
  }

  checkMonitoringReadiness() {
    const monitoring = this.reportData.deploymentReadiness.categories.monitoring
    
    // Check error tracking
    if (fs.existsSync(path.join(__dirname, '..', 'sentry.config.js')) || 
        fs.existsSync(path.join(__dirname, '..', '.sentryclirc'))) {
      monitoring.checks[0].status = true
      monitoring.score += 25
    }
    
    // Check performance monitoring
    if (fs.existsSync(path.join(__dirname, '..', 'vercel.json')) || 
        fs.existsSync(path.join(__dirname, '..', 'next.config.js'))) {
      monitoring.checks[1].status = true
      monitoring.score += 25
    }
    
    // Check logging system
    if (fs.existsSync(path.join(__dirname, '..', 'src/lib/logger.ts'))) {
      monitoring.checks[2].status = true
      monitoring.score += 25
    }
    
    // Check health checks
    if (fs.existsSync(path.join(__dirname, '..', 'src/app/api/health'))) {
      monitoring.checks[3].status = true
      monitoring.score += 25
    }
  }

  generateRecommendations() {
    this.log('Generating recommendations...')

    const { testResults, fixResults, codeQuality, deploymentReadiness } = this.reportData

    // Test-related recommendations
    if (testResults.failedTests > 0) {
      this.reportData.recommendations.push({
        category: 'Testing',
        priority: 'high',
        title: 'Fix failing tests',
        description: `${testResults.failedTests} tests are currently failing. Fix these before deployment.`
      })
    }

    if (testResults.reportsFound < testResults.totalTestSuites) {
      this.reportData.recommendations.push({
        category: 'Testing',
        priority: 'medium',
        title: 'Complete test coverage',
        description: 'Some test suites did not generate reports. Ensure all tests are properly configured.'
      })
    }

    // Code quality recommendations
    if (codeQuality.potentialIssues.length > 10) {
      this.reportData.recommendations.push({
        category: 'Code Quality',
        priority: 'medium',
        title: 'Address code quality issues',
        description: `Found ${codeQuality.potentialIssues.length} potential issues. Review and fix critical ones.`
      })
    }

    if (!codeQuality.securityChecks.authImplemented) {
      this.reportData.recommendations.push({
        category: 'Security',
        priority: 'high',
        title: 'Implement authentication',
        description: 'Authentication system is not properly implemented. This is a security risk.'
      })
    }

    if (!codeQuality.bestPractices.testingCoverage) {
      this.reportData.recommendations.push({
        category: 'Testing',
        priority: 'medium',
        title: 'Improve test coverage',
        description: 'Test coverage is insufficient. Add more comprehensive tests.'
      })
    }

    // Deployment recommendations
    if (deploymentReadiness.overallScore < 70) {
      this.reportData.recommendations.push({
        category: 'Deployment',
        priority: 'high',
        title: 'Improve deployment readiness',
        description: `Deployment readiness score is ${deploymentReadiness.overallScore}%. Address critical issues before deployment.`
      })
    }

    if (deploymentReadiness.overallScore < 50) {
      deploymentReadiness.blockers.push({
        title: 'Insufficient deployment readiness',
        description: 'Score is too low for safe deployment.'
      })
    } else if (deploymentReadiness.overallScore < 80) {
      deploymentReadiness.warnings.push({
        title: 'Moderate deployment readiness',
        description: 'Some areas need improvement before deployment.'
      })
    }

    // Security recommendations
    if (!codeQuality.securityChecks.validationImplemented) {
      this.reportData.recommendations.push({
        category: 'Security',
        priority: 'high',
        title: 'Implement input validation',
        description: 'Input validation is not implemented. This is a security vulnerability.'
      })
    }

    // Performance recommendations
    if (deploymentReadiness.categories.performance.score < 50) {
      this.reportData.recommendations.push({
        category: 'Performance',
        priority: 'medium',
        title: 'Optimize performance',
        description: 'Performance optimizations are needed. Check bundle size and loading times.'
      })
    }

    // Monitoring recommendations
    if (deploymentReadiness.categories.monitoring.score < 50) {
      this.reportData.recommendations.push({
        category: 'Monitoring',
        priority: 'medium',
        title: 'Set up monitoring',
        description: 'Monitoring and alerting systems are not properly configured.'
      })
    }
  }

  generateSummary() {
    this.log('Generating summary...')

    const { testResults, fixResults, codeQuality, deploymentReadiness } = this.reportData

    this.reportData.summary = {
      totalTests: testResults.passedTests + testResults.failedTests,
      testPassRate: testResults.passedTests + testResults.failedTests > 0 ? 
        Math.round((testResults.passedTests / (testResults.passedTests + testResults.failedTests)) * 100) : 0,
      totalFixes: fixResults.fixesApplied,
      fixSuccessRate: fixResults.fixesApplied + fixResults.errors > 0 ? 
        Math.round((fixResults.fixesApplied / (fixResults.fixesApplied + fixResults.errors)) * 100) : 0,
      codeQuality: {
        issuesFound: codeQuality.potentialIssues.length,
        securityScore: Object.values(codeQuality.securityChecks).filter(v => v).length * 25,
        bestPracticesScore: Object.values(codeQuality.bestPractices).filter(v => v).length * 25
      },
      deploymentReadiness: {
        overallScore: deploymentReadiness.overallScore,
        status: deploymentReadiness.overallScore >= 80 ? 'Ready' : 
               deploymentReadiness.overallScore >= 50 ? 'Needs Improvement' : 'Not Ready'
      },
      overallStatus: this.calculateOverallStatus()
    }
  }

  calculateOverallStatus() {
    const { testResults, fixResults, codeQuality, deploymentReadiness } = this.reportData.summary

    let score = 0
    let maxScore = 100

    // Test score (30%)
    score += testResults.testPassRate * 0.3

    // Fix score (20%)
    score += fixResults.fixSuccessRate * 0.2

    // Code quality score (20%)
    const qualityScore = (codeQuality.securityScore + codeQuality.bestPracticesScore) / 2
    score += qualityScore * 0.2

    // Deployment readiness score (30%)
    score += deploymentReadiness.overallScore * 0.3

    if (score >= 80) return 'Production Ready'
    if (score >= 60) return 'Nearly Ready'
    if (score >= 40) return 'Needs Work'
    return 'Not Ready'
  }

  async saveReport() {
    this.log('Saving final report...')

    const reportPath = './final-deployment-report.json'
    const htmlReportPath = './final-deployment-report.html'

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2))

    // Generate HTML report
    const htmlReport = this.generateHTMLReport()
    fs.writeFileSync(htmlReportPath, htmlReport)

    this.log(`JSON report saved to: ${reportPath}`, 'success')
    this.log(`HTML report saved to: ${htmlReportPath}`, 'success')
  }

  generateHTMLReport() {
    const { summary, deploymentReadiness, recommendations } = this.reportData

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oxl Workspace - Deployment Readiness Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .status { padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; }
        .status.ready { background: #d4edda; color: #155724; }
        .status.needs-work { background: #fff3cd; color: #856404; }
        .status.not-ready { background: #f8d7da; color: #721c24; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; min-width: 120px; }
        .metric h3 { margin: 0; color: #007bff; }
        .metric p { margin: 5px 0 0 0; color: #666; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; }
        .recommendations h3 { margin-top: 0; color: #856404; }
        .recommendations ul { margin: 10px 0; padding-left: 20px; }
        .deployment-categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .category { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .category h3 { margin-top: 0; color: #333; }
        .category ul { margin: 10px 0; padding-left: 20px; }
        .category li { margin: 5px 0; }
        .category li.yes { color: #28a745; }
        .category li.no { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Oxl Workspace - Deployment Readiness Report</h1>
            <p>Generated on ${new Date(this.reportData.timestamp).toLocaleString()}</p>
        </div>

        <div class="status ${summary.overallStatus.toLowerCase().replace(' ', '-')}">
            Overall Status: ${summary.overallStatus}
        </div>

        <div class="section">
            <h2>Summary</h2>
            <div class="metric">
                <h3>${summary.testPassRate}%</h3>
                <p>Test Pass Rate</p>
            </div>
            <div class="metric">
                <h3>${summary.fixSuccessRate}%</h3>
                <p>Fix Success Rate</p>
            </div>
            <div class="metric">
                <h3>${summary.codeQuality.securityScore}%</h3>
                <p>Security Score</p>
            </div>
            <div class="metric">
                <h3>${summary.deploymentReadiness.overallScore}%</h3>
                <p>Deployment Ready</p>
            </div>
        </div>

        <div class="section">
            <h2>Deployment Readiness</h2>
            <div class="deployment-categories">
                <div class="category">
                    <h3>Infrastructure</h3>
                    <ul>
                        <li class="${deploymentReadiness.categories.infrastructure.checks[0].status ? 'yes' : 'no'}">Docker support</li>
                        <li class="${deploymentReadiness.categories.infrastructure.checks[1].status ? 'yes' : 'no'}">Environment variables</li>
                        <li class="${deploymentReadiness.categories.infrastructure.checks[2].status ? 'yes' : 'no'}">Build configuration</li>
                        <li class="${deploymentReadiness.categories.infrastructure.checks[3].status ? 'yes' : 'no'}">Database migrations</li>
                    </ul>
                    <p><strong>Score:</strong> ${deploymentReadiness.categories.infrastructure.score}%</p>
                </div>
                <div class="category">
                    <h3>Security</h3>
                    <ul>
                        <li class="${deploymentReadiness.categories.security.checks[0].status ? 'yes' : 'no'}">Authentication</li>
                        <li class="${deploymentReadiness.categories.security.checks[1].status ? 'yes' : 'no'}">Authorization</li>
                        <li class="${deploymentReadiness.categories.security.checks[2].status ? 'yes' : 'no'}">Input validation</li>
                        <li class="${deploymentReadiness.categories.security.checks[3].status ? 'yes' : 'no'}">HTTPS configuration</li>
                    </ul>
                    <p><strong>Score:</strong> ${deploymentReadiness.categories.security.score}%</p>
                </div>
                <div class="category">
                    <h3>Performance</h3>
                    <ul>
                        <li class="${deploymentReadiness.categories.performance.checks[0].status ? 'yes' : 'no'}">Code splitting</li>
                        <li class="${deploymentReadiness.categories.performance.checks[1].status ? 'yes' : 'no'}">Image optimization</li>
                        <li class="${deploymentReadiness.categories.performance.checks[2].status ? 'yes' : 'no'}">Bundle analysis</li>
                        <li class="${deploymentReadiness.categories.performance.checks[3].status ? 'yes' : 'no'}">Caching strategy</li>
                    </ul>
                    <p><strong>Score:</strong> ${deploymentReadiness.categories.performance.score}%</p>
                </div>
                <div class="category">
                    <h3>Monitoring</h3>
                    <ul>
                        <li class="${deploymentReadiness.categories.monitoring.checks[0].status ? 'yes' : 'no'}">Error tracking</li>
                        <li class="${deploymentReadiness.categories.monitoring.checks[1].status ? 'yes' : 'no'}">Performance monitoring</li>
                        <li class="${deploymentReadiness.categories.monitoring.checks[2].status ? 'yes' : 'no'}">Logging system</li>
                        <li class="${deploymentReadiness.categories.monitoring.checks[3].status ? 'yes' : 'no'}">Health checks</li>
                    </ul>
                    <p><strong>Score:</strong> ${deploymentReadiness.categories.monitoring.score}%</p>
                </div>
            </div>
        </div>

        ${recommendations.length > 0 ? `
        <div class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">
                <h3>Priority Recommendations</h3>
                <ul>
                    ${recommendations.map(rec => `<li><strong>${rec.title}:</strong> ${rec.description}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}

        ${deploymentReadiness.blockers.length > 0 ? `
        <div class="section">
            <h2>Deployment Blockers</h2>
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px;">
                <ul>
                    ${deploymentReadiness.blockers.map(blocker => `<li><strong>${blocker.title}:</strong> ${blocker.description}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}

        ${deploymentReadiness.warnings.length > 0 ? `
        <div class="section">
            <h2>Deployment Warnings</h2>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px;">
                <ul>
                    ${deploymentReadiness.warnings.map(warning => `<li><strong>${warning.title}:</strong> ${warning.description}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>Next Steps</h2>
            <p><strong>For Production Ready status:</strong></p>
            <ol>
                <li>Address all high-priority recommendations</li>
                <li>Resolve any deployment blockers</li>
                <li>Run final integration tests</li>
                <li>Deploy to staging environment</li>
                <li>Monitor performance and error rates</li>
                <li>Deploy to production</li>
            </ol>
        </div>
    </div>
</body>
</html>
    `
  }

  async run() {
    try {
      this.log('Starting final report generation...')
      
      await this.collectTestResults()
      await this.collectFixResults()
      await this.analyzeCodeQuality()
      await this.assessDeploymentReadiness()
      this.generateRecommendations()
      this.generateSummary()
      await this.saveReport()
      
      this.log('Final report generation completed!', 'success')
      this.log(`Overall status: ${this.reportData.summary.overallStatus}`, 'info')
      
      if (this.reportData.summary.overallStatus === 'Production Ready') {
        this.log('🎉 Your application is ready for production deployment!', 'success')
      } else {
        this.log('⚠️  Your application needs some work before production deployment', 'warning')
      }
      
    } catch (error) {
      this.log(`Report generation failed: ${error.message}`, 'error')
    }
  }
}

// Run the report generator
const generator = new FinalReportGenerator()
generator.run()
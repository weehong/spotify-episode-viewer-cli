/**
 * Code Quality Analysis Script
 * Analyzes the codebase for SOLID principles compliance and quality metrics
 */

const fs = require('fs');
const path = require('path');

class CodeQualityAnalyzer {
    constructor() {
        this.metrics = {
            files: 0,
            classes: 0,
            interfaces: 0,
            methods: 0,
            linesOfCode: 0,
            solidCompliance: {
                srp: { score: 0, violations: [] },
                ocp: { score: 0, violations: [] },
                lsp: { score: 0, violations: [] },
                isp: { score: 0, violations: [] },
                dip: { score: 0, violations: [] }
            }
        };
    }

    /**
     * Analyze the entire codebase
     */
    async analyze() {
        console.log('🔍 Starting Code Quality Analysis...\n');
        
        const srcPath = path.join(process.cwd(), 'src');
        await this.analyzeDirectory(srcPath);
        
        this.calculateSOLIDScores();
        this.generateReport();
    }

    /**
     * Analyze a directory recursively
     */
    async analyzeDirectory(dirPath) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                await this.analyzeDirectory(itemPath);
            } else if (item.endsWith('.js')) {
                await this.analyzeFile(itemPath);
            }
        }
    }

    /**
     * Analyze a single JavaScript file
     */
    async analyzeFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        this.metrics.files++;
        this.metrics.linesOfCode += lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
        
        // Count classes and interfaces
        const classMatches = content.match(/class\s+\w+/g) || [];
        const interfaceMatches = content.match(/class\s+I\w+/g) || [];
        
        this.metrics.classes += classMatches.length;
        this.metrics.interfaces += interfaceMatches.length;
        
        // Count methods
        const methodMatches = content.match(/\s+(async\s+)?\w+\s*\([^)]*\)\s*{/g) || [];
        this.metrics.methods += methodMatches.length;
        
        // Analyze SOLID principles
        this.analyzeSRP(filePath, content);
        this.analyzeOCP(filePath, content);
        this.analyzeLSP(filePath, content);
        this.analyzeISP(filePath, content);
        this.analyzeDIP(filePath, content);
    }

    /**
     * Analyze Single Responsibility Principle
     */
    analyzeSRP(filePath, content) {
        const fileName = path.basename(filePath);
        
        // Check if class has multiple responsibilities
        const responsibilities = [];
        
        if (content.includes('require(') && content.includes('class')) {
            responsibilities.push('dependency management');
        }
        if (content.includes('console.log') || content.includes('console.error')) {
            responsibilities.push('logging');
        }
        if (content.includes('axios') || content.includes('fetch')) {
            responsibilities.push('HTTP communication');
        }
        if (content.includes('process.env')) {
            responsibilities.push('configuration');
        }
        if (content.includes('JSON.parse') || content.includes('JSON.stringify')) {
            responsibilities.push('data transformation');
        }
        
        // Configuration classes should only handle configuration
        if (fileName.includes('Configuration') && responsibilities.length > 1) {
            this.metrics.solidCompliance.srp.violations.push({
                file: fileName,
                issue: 'Configuration class has multiple responsibilities',
                responsibilities
            });
        }
        
        // Service classes should focus on business logic
        if (fileName.includes('Service') && responsibilities.includes('HTTP communication')) {
            this.metrics.solidCompliance.srp.violations.push({
                file: fileName,
                issue: 'Service class directly handles HTTP communication'
            });
        }
    }

    /**
     * Analyze Open/Closed Principle
     */
    analyzeOCP(filePath, content) {
        const fileName = path.basename(filePath);
        
        // Check for extensibility patterns
        if (content.includes('class') && content.includes('extends')) {
            this.metrics.solidCompliance.ocp.score += 10;
        }
        
        // Check for interface implementations
        if (fileName.startsWith('I') && content.includes('class I')) {
            this.metrics.solidCompliance.ocp.score += 15;
        }
        
        // Check for hard-coded values that prevent extension
        const hardCodedPatterns = [
            /https:\/\/[^"']+/g,
            /'[A-Z_]+'/g,
            /\d{4,}/g
        ];
        
        hardCodedPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches && matches.length > 2) {
                this.metrics.solidCompliance.ocp.violations.push({
                    file: fileName,
                    issue: 'Contains hard-coded values that may prevent extension'
                });
            }
        });
    }

    /**
     * Analyze Liskov Substitution Principle
     */
    analyzeLSP(filePath, content) {
        const fileName = path.basename(filePath);
        
        // Check for proper inheritance
        if (content.includes('extends') && content.includes('super(')) {
            this.metrics.solidCompliance.lsp.score += 15;
        }
        
        // Check for interface implementations
        if (content.includes('extends I') && content.includes('throw new Error')) {
            this.metrics.solidCompliance.lsp.violations.push({
                file: fileName,
                issue: 'Interface method throws "not implemented" error'
            });
        }
    }

    /**
     * Analyze Interface Segregation Principle
     */
    analyzeISP(filePath, content) {
        const fileName = path.basename(filePath);
        
        // Check interface size
        if (fileName.startsWith('I') && content.includes('class I')) {
            const methodCount = (content.match(/\s+\w+\s*\([^)]*\)\s*{/g) || []).length;
            
            if (methodCount <= 5) {
                this.metrics.solidCompliance.isp.score += 20;
            } else {
                this.metrics.solidCompliance.isp.violations.push({
                    file: fileName,
                    issue: `Interface has ${methodCount} methods (should be <= 5 for good ISP)`
                });
            }
        }
        
        // Check for focused interfaces
        if (fileName.includes('Http') || fileName.includes('Logger') || fileName.includes('Auth')) {
            this.metrics.solidCompliance.isp.score += 10;
        }
    }

    /**
     * Analyze Dependency Inversion Principle
     */
    analyzeDIP(filePath, content) {
        const fileName = path.basename(filePath);
        
        // Check for dependency injection
        if (content.includes('constructor(') && content.includes('this.')) {
            this.metrics.solidCompliance.dip.score += 15;
        }
        
        // Check for direct instantiation (violation)
        const directInstantiations = content.match(/new\s+[A-Z]\w+\s*\(/g) || [];
        if (directInstantiations.length > 1 && !fileName.includes('Container')) {
            this.metrics.solidCompliance.dip.violations.push({
                file: fileName,
                issue: 'Contains direct instantiation of dependencies'
            });
        }
        
        // Check for interface dependencies
        if (content.includes('I') && content.includes('require(')) {
            this.metrics.solidCompliance.dip.score += 10;
        }
    }

    /**
     * Calculate overall SOLID scores
     */
    calculateSOLIDScores() {
        const principles = ['srp', 'ocp', 'lsp', 'isp', 'dip'];
        
        principles.forEach(principle => {
            const maxScore = this.metrics.files * 20; // 20 points per file per principle
            const violations = this.metrics.solidCompliance[principle].violations.length;
            const penalty = violations * 10;
            
            this.metrics.solidCompliance[principle].score = Math.max(0, 
                this.metrics.solidCompliance[principle].score - penalty
            );
            
            this.metrics.solidCompliance[principle].percentage = Math.min(100,
                (this.metrics.solidCompliance[principle].score / maxScore) * 100
            );
        });
    }

    /**
     * Generate and display the quality report
     */
    generateReport() {
        console.log('📊 CODE QUALITY ANALYSIS REPORT');
        console.log('================================\n');
        
        // Basic metrics
        console.log('📈 Basic Metrics:');
        console.log(`   Files analyzed: ${this.metrics.files}`);
        console.log(`   Classes found: ${this.metrics.classes}`);
        console.log(`   Interfaces found: ${this.metrics.interfaces}`);
        console.log(`   Methods found: ${this.metrics.methods}`);
        console.log(`   Lines of code: ${this.metrics.linesOfCode}`);
        console.log(`   Average methods per class: ${(this.metrics.methods / this.metrics.classes).toFixed(1)}`);
        console.log(`   Average lines per file: ${(this.metrics.linesOfCode / this.metrics.files).toFixed(1)}\n`);
        
        // SOLID compliance
        console.log('🎯 SOLID Principles Compliance:');
        const principles = {
            srp: 'Single Responsibility Principle',
            ocp: 'Open/Closed Principle',
            lsp: 'Liskov Substitution Principle',
            isp: 'Interface Segregation Principle',
            dip: 'Dependency Inversion Principle'
        };
        
        let totalScore = 0;
        Object.entries(principles).forEach(([key, name]) => {
            const score = this.metrics.solidCompliance[key].percentage || 0;
            const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
            console.log(`   ${emoji} ${name}: ${score.toFixed(1)}%`);
            totalScore += score;
        });
        
        const overallScore = totalScore / 5;
        const overallEmoji = overallScore >= 80 ? '✅' : overallScore >= 60 ? '⚠️' : '❌';
        console.log(`\n${overallEmoji} Overall SOLID Score: ${overallScore.toFixed(1)}%\n`);
        
        // Violations
        console.log('⚠️  SOLID Violations:');
        let hasViolations = false;
        Object.entries(this.metrics.solidCompliance).forEach(([principle, data]) => {
            if (data.violations.length > 0) {
                hasViolations = true;
                console.log(`\n   ${principle.toUpperCase()} Violations:`);
                data.violations.forEach(violation => {
                    console.log(`   - ${violation.file}: ${violation.issue}`);
                });
            }
        });
        
        if (!hasViolations) {
            console.log('   🎉 No SOLID violations found!\n');
        }
        
        // Quality assessment
        console.log('\n🏆 Quality Assessment:');
        if (overallScore >= 90) {
            console.log('   EXCELLENT - Professional-grade code following SOLID principles');
        } else if (overallScore >= 80) {
            console.log('   GOOD - Well-structured code with minor improvements needed');
        } else if (overallScore >= 60) {
            console.log('   FAIR - Code structure needs improvement');
        } else {
            console.log('   POOR - Significant refactoring needed');
        }
        
        console.log('\n✨ Analysis complete!\n');
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new CodeQualityAnalyzer();
    analyzer.analyze().catch(console.error);
}

module.exports = CodeQualityAnalyzer;

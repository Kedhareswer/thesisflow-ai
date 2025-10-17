import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, Database, UserCheck, Globe, FileText, Mail } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  // Use environment variables with fallback values
  const lastUpdated = process.env.NEXT_PUBLIC_PRIVACY_LAST_UPDATED || "October 16, 2025"
  const effectiveDate = process.env.NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE || "October 16, 2025"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">
            <Shield className="w-3 h-3 mr-1" />
            Legal Document
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how ThesisFlow AI collects, uses, and protects your personal information.
          </p>
          <div className="flex gap-4 justify-center mt-6 text-sm text-muted-foreground">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Effective: {effectiveDate}</span>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="prose prose-neutral max-w-none dark:prose-invert p-8">
            
            {/* Table of Contents */}
            <div className="bg-muted/50 rounded-lg p-6 mb-8 not-prose">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Table of Contents
              </h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <a href="#introduction" className="text-primary hover:underline">1. Introduction</a>
                <a href="#information-collection" className="text-primary hover:underline">2. Information We Collect</a>
                <a href="#how-we-use" className="text-primary hover:underline">3. How We Use Your Information</a>
                <a href="#data-sharing" className="text-primary hover:underline">4. Data Sharing and Disclosure</a>
                <a href="#data-security" className="text-primary hover:underline">5. Data Security</a>
                <a href="#your-rights" className="text-primary hover:underline">6. Your Privacy Rights</a>
                <a href="#cookies" className="text-primary hover:underline">7. Cookies and Tracking</a>
                <a href="#international" className="text-primary hover:underline">8. International Data Transfers</a>
                <a href="#children" className="text-primary hover:underline">9. Children's Privacy</a>
                <a href="#changes" className="text-primary hover:underline">10. Changes to This Policy</a>
                <a href="#contact" className="text-primary hover:underline">11. Contact Us</a>
              </div>
            </div>

            <Separator className="my-8" />

            {/* 1. Introduction */}
            <section id="introduction" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Shield className="w-6 h-6" />
                1. Introduction
              </h2>
              <p>
                Welcome to ThesisFlow AI ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our research assistant platform and related services (collectively, the "Service").
              </p>
              <p>
                By accessing or using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section id="information-collection" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Database className="w-6 h-6" />
                2. Information We Collect
              </h2>
              
              <h3>2.1 Information You Provide to Us</h3>
              <p>We collect information that you voluntarily provide when using our Service:</p>
              <ul>
                <li><strong>Account Information:</strong> Name, email address, password, academic institution, research field, and profile details</li>
                <li><strong>Research Content:</strong> Documents you upload, research queries, notes, citations, and academic work products</li>
                <li><strong>Payment Information:</strong> Billing details, payment method information (processed securely through third-party payment processors)</li>
                <li><strong>Communication Data:</strong> Messages, feedback, support requests, and correspondence with our team</li>
                <li><strong>User Preferences:</strong> Settings, customizations, notification preferences, and feature selections</li>
              </ul>

              <h3>2.2 Automatically Collected Information</h3>
              <p>When you access our Service, we automatically collect certain information:</p>
              <ul>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, click patterns, search queries</li>
                <li><strong>Log Data:</strong> Server logs, error reports, API calls, performance metrics</li>
                <li><strong>Location Data:</strong> Approximate geographic location based on IP address</li>
              </ul>

              <h3>2.3 Information from Third Parties</h3>
              <ul>
                <li><strong>Authentication Services:</strong> Data from Google, Microsoft, or other OAuth providers if you use social login</li>
                <li><strong>Academic Databases:</strong> Publicly available research paper metadata, citations, and bibliographic information</li>
                <li><strong>Analytics Providers:</strong> Aggregated usage statistics and performance data</li>
              </ul>
            </section>

            {/* 3. How We Use Your Information */}
            <section id="how-we-use" className="mb-8">
              <h2 className="flex items-center gap-2">
                <UserCheck className="w-6 h-6" />
                3. How We Use Your Information
              </h2>
              <p>We use the collected information for the following purposes:</p>
              
              <h3>3.1 Service Provision</h3>
              <ul>
                <li>Provide, operate, and maintain our research assistant platform</li>
                <li>Process your research queries and generate AI-powered insights</li>
                <li>Enable collaboration features and document sharing</li>
                <li>Manage your account, subscriptions, and billing</li>
                <li>Provide customer support and respond to inquiries</li>
              </ul>

              <h3>3.2 Service Improvement</h3>
              <ul>
                <li>Analyze usage patterns to improve features and user experience</li>
                <li>Train and improve our AI models (using aggregated, de-identified data)</li>
                <li>Conduct research and development for new features</li>
                <li>Test, monitor, and debug platform performance</li>
              </ul>

              <h3>3.3 Communication</h3>
              <ul>
                <li>Send service notifications, updates, and security alerts</li>
                <li>Respond to comments, questions, and support requests</li>
                <li>Send marketing communications (with your consent, where required)</li>
                <li>Provide educational content and research tips</li>
              </ul>

              <h3>3.4 Legal and Security</h3>
              <ul>
                <li>Comply with legal obligations and regulatory requirements</li>
                <li>Enforce our Terms of Service and other agreements</li>
                <li>Protect against fraud, abuse, and security threats</li>
                <li>Resolve disputes and investigate violations</li>
              </ul>
            </section>

            {/* 4. Data Sharing */}
            <section id="data-sharing" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Globe className="w-6 h-6" />
                4. Data Sharing and Disclosure
              </h2>
              <p>We do not sell your personal information. We may share your information in the following circumstances:</p>

              <h3>4.1 Service Providers</h3>
              <p>We share data with trusted third-party vendors who perform services on our behalf:</p>
              <ul>
                <li><strong>Cloud Hosting:</strong> Vercel, Railway, Supabase for infrastructure and database hosting</li>
                <li><strong>AI Services:</strong> OpenRouter, Groq for AI model processing</li>
                <li><strong>Payment Processing:</strong> Stripe or similar payment processors</li>
                <li><strong>Analytics:</strong> Aggregated usage analytics providers</li>
                <li><strong>Email Services:</strong> Transactional and marketing email providers</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                All service providers are contractually obligated to protect your data and use it only for the specified purposes.
              </p>

              <h3>4.2 Legal Requirements</h3>
              <p>We may disclose your information if required to do so by law or in response to:</p>
              <ul>
                <li>Valid legal processes (subpoenas, court orders, warrants)</li>
                <li>Government requests or investigations</li>
                <li>Protection of our rights, property, or safety</li>
                <li>Prevention of fraud or illegal activity</li>
              </ul>

              <h3>4.3 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred to the successor entity. We will notify you of any such change in ownership or control.
              </p>

              <h3>4.4 With Your Consent</h3>
              <p>We may share your information for other purposes with your explicit consent.</p>
            </section>

            {/* 5. Data Security */}
            <section id="data-security" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Lock className="w-6 h-6" />
                5. Data Security
              </h2>
              <p>We implement industry-standard security measures to protect your information:</p>

              <h3>5.1 Technical Safeguards</h3>
              <ul>
                <li><strong>Encryption:</strong> TLS/SSL encryption for data in transit, AES-256 encryption for data at rest</li>
                <li><strong>Authentication:</strong> Secure password hashing (bcrypt), multi-factor authentication support</li>
                <li><strong>Access Controls:</strong> Role-based access control (RBAC), principle of least privilege</li>
                <li><strong>Infrastructure:</strong> Secure cloud hosting with regular security audits</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring, intrusion detection systems</li>
              </ul>

              <h3>5.2 Organizational Safeguards</h3>
              <ul>
                <li>Regular security training for employees</li>
                <li>Confidentiality agreements with all personnel</li>
                <li>Incident response and data breach procedures</li>
                <li>Regular security assessments and penetration testing</li>
              </ul>

              <h3>5.3 Data Retention</h3>
              <p>We retain your information only as long as necessary to:</p>
              <ul>
                <li>Provide our services and fulfill the purposes described in this policy</li>
                <li>Comply with legal, accounting, or reporting requirements</li>
                <li>Resolve disputes and enforce our agreements</li>
              </ul>
              <p>
                Upon account deletion, we will delete or anonymize your personal information within 90 days, except where retention is required by law.
              </p>
            </section>

            {/* 6. Your Rights */}
            <section id="your-rights" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Eye className="w-6 h-6" />
                6. Your Privacy Rights
              </h2>
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>

              <h3>6.1 General Rights</h3>
              <ul>
                <li><strong>Access:</strong> Request copies of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (right to be forgotten)</li>
                <li><strong>Portability:</strong> Request transfer of your data in a structured, machine-readable format</li>
                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
              </ul>

              <h3>6.2 GDPR Rights (European Users)</h3>
              <p>If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under GDPR:</p>
              <ul>
                <li>Right to lodge a complaint with a supervisory authority</li>
                <li>Right to object to automated decision-making and profiling</li>
                <li>Enhanced transparency and consent requirements</li>
              </ul>

              <h3>6.3 CCPA Rights (California Residents)</h3>
              <p>California residents have specific rights under the California Consumer Privacy Act (CCPA):</p>
              <ul>
                <li>Right to know what personal information is collected, used, shared, or sold</li>
                <li>Right to delete personal information held by businesses</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
              </ul>
              <p className="text-sm italic">
                Note: We do not sell personal information as defined by CCPA.
              </p>

              <h3>6.4 How to Exercise Your Rights</h3>
              <p>To exercise any of these rights, please contact us at:</p>
              <ul>
                <li><strong>Email:</strong> privacy@thesisflow-ai.com</li>
                <li><strong>Account Settings:</strong> Manage data preferences in your account dashboard</li>
                <li><strong>Response Time:</strong> We will respond to requests within 30 days</li>
              </ul>
            </section>

            {/* 7. Cookies */}
            <section id="cookies" className="mb-8">
              <h2>7. Cookies and Tracking Technologies</h2>
              <p>We use cookies and similar tracking technologies to enhance your experience:</p>

              <h3>7.1 Types of Cookies</h3>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for authentication, security, and basic functionality</li>
                <li><strong>Performance Cookies:</strong> Help us understand how users interact with our Service</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Analytics Cookies:</strong> Collect aggregated usage statistics</li>
              </ul>

              <h3>7.2 Managing Cookies</h3>
              <p>You can control cookies through:</p>
              <ul>
                <li>Browser settings (most browsers allow you to refuse cookies)</li>
                <li>Cookie consent banner when you first visit our site</li>
                <li>Account settings for analytics preferences</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                Note: Disabling essential cookies may affect Service functionality.
              </p>
            </section>

            {/* 8. International Transfers */}
            <section id="international" className="mb-8">
              <h2>8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from your jurisdiction.
              </p>
              <p>
                When we transfer data internationally, we ensure appropriate safeguards are in place:
              </p>
              <ul>
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Adequacy decisions for certain countries</li>
                <li>Binding Corporate Rules where applicable</li>
                <li>Consent for specific transfers where required</li>
              </ul>
            </section>

            {/* 9. Children's Privacy */}
            <section id="children" className="mb-8">
              <h2>9. Children's Privacy</h2>
              <p>
                Our Service is not directed to individuals under the age of 13 (or 16 in the EEA). We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. We will delete such information from our systems.
              </p>
              <p>
                For educational institutions using our Service with students under 18, we comply with applicable laws including FERPA (Family Educational Rights and Privacy Act) and COPPA (Children's Online Privacy Protection Act).
              </p>
            </section>

            {/* 10. Changes to Policy */}
            <section id="changes" className="mb-8">
              <h2>10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
              </p>
              <p>
                When we make material changes, we will:
              </p>
              <ul>
                <li>Update the "Last Updated" date at the top of this policy</li>
                <li>Notify you via email or prominent notice on our Service</li>
                <li>Obtain your consent where required by applicable law</li>
                <li>Provide a 30-day notice period for substantial changes</li>
              </ul>
              <p>
                Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* 11. Contact */}
            <section id="contact" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Mail className="w-6 h-6" />
                11. Contact Us
              </h2>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
              
              <div className="bg-muted/50 rounded-lg p-6 mt-4 not-prose">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Email</h4>
                    <a href="mailto:privacy@thesisflow-ai.com" className="text-primary hover:underline">
                      privacy@thesisflow-ai.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Support</h4>
                    <a href="mailto:support@thesisflow-ai.com" className="text-primary hover:underline">
                      support@thesisflow-ai.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Data Protection Officer</h4>
                    <a href="mailto:dpo@thesisflow-ai.com" className="text-primary hover:underline">
                      dpo@thesisflow-ai.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Response Time</h4>
                    <p className="text-sm text-muted-foreground">Within 30 days</p>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="my-8" />

            {/* Footer Links */}
            <div className="flex flex-wrap gap-4 justify-center text-sm not-prose">
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/signup" className="text-primary hover:underline">Sign Up</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/" className="text-primary hover:underline">Home</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/contact" className="text-primary hover:underline">Contact Support</Link>
            </div>

          </CardContent>
        </Card>

        {/* Compliance Badges */}
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <Badge variant="outline" className="gap-1">
            <Shield className="w-3 h-3" />
            GDPR Compliant
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Lock className="w-3 h-3" />
            CCPA Compliant
          </Badge>
          <Badge variant="outline" className="gap-1">
            <UserCheck className="w-3 h-3" />
            FERPA Compliant
          </Badge>
        </div>
      </div>
    </div>
  )
}

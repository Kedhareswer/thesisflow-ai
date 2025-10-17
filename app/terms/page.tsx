import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Scale, FileText, Shield, Users, CreditCard, AlertTriangle, BookOpen, Gavel } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  const lastUpdated = "October 16, 2025"
  const effectiveDate = "October 16, 2025"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">
            <Scale className="w-3 h-3 mr-1" />
            Legal Agreement
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Please read these Terms of Service carefully before using ThesisFlow AI. By accessing our Service, you agree to be bound by these terms.
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
                <a href="#acceptance" className="text-primary hover:underline">1. Acceptance of Terms</a>
                <a href="#definitions" className="text-primary hover:underline">2. Definitions</a>
                <a href="#eligibility" className="text-primary hover:underline">3. Eligibility</a>
                <a href="#account" className="text-primary hover:underline">4. Account Registration</a>
                <a href="#license" className="text-primary hover:underline">5. License and Access</a>
                <a href="#acceptable-use" className="text-primary hover:underline">6. Acceptable Use Policy</a>
                <a href="#content" className="text-primary hover:underline">7. User Content</a>
                <a href="#intellectual-property" className="text-primary hover:underline">8. Intellectual Property</a>
                <a href="#payment" className="text-primary hover:underline">9. Payment and Billing</a>
                <a href="#termination" className="text-primary hover:underline">10. Termination</a>
                <a href="#disclaimers" className="text-primary hover:underline">11. Disclaimers</a>
                <a href="#limitation" className="text-primary hover:underline">12. Limitation of Liability</a>
                <a href="#indemnification" className="text-primary hover:underline">13. Indemnification</a>
                <a href="#dispute-resolution" className="text-primary hover:underline">14. Dispute Resolution</a>
                <a href="#general" className="text-primary hover:underline">15. General Provisions</a>
                <a href="#contact" className="text-primary hover:underline">16. Contact Information</a>
              </div>
            </div>

            <Separator className="my-8" />

            {/* 1. Acceptance */}
            <section id="acceptance" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Scale className="w-6 h-6" />
                1. Acceptance of Terms
              </h2>
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and ThesisFlow AI ("Company," "we," "our," or "us") governing your access to and use of the ThesisFlow AI research assistant platform, including all related websites, mobile applications, and services (collectively, the "Service").
              </p>
              <p>
                By creating an account, accessing, or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>, which is incorporated herein by reference.
              </p>
              <p>
                <strong>If you do not agree to these Terms, you must not access or use the Service.</strong>
              </p>
            </section>

            {/* 2. Definitions */}
            <section id="definitions" className="mb-8">
              <h2>2. Definitions</h2>
              <p>For purposes of these Terms:</p>
              <ul>
                <li><strong>"Service"</strong> means the ThesisFlow AI platform, including all features, content, and functionality</li>
                <li><strong>"User Content"</strong> means any data, text, documents, or other materials you upload or submit to the Service</li>
                <li><strong>"Subscription"</strong> means the paid plan you select for access to premium features</li>
                <li><strong>"Academic Work"</strong> means research papers, theses, dissertations, and related scholarly work</li>
                <li><strong>"AI Services"</strong> means artificial intelligence and machine learning features provided through the Service</li>
              </ul>
            </section>

            {/* 3. Eligibility */}
            <section id="eligibility" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                3. Eligibility
              </h2>
              <p>You must meet the following requirements to use our Service:</p>
              <ul>
                <li><strong>Age:</strong> You must be at least 13 years old (or 16 in the EEA)</li>
                <li><strong>Capacity:</strong> You must have the legal capacity to enter into binding contracts</li>
                <li><strong>Compliance:</strong> You must not be prohibited from using the Service under applicable laws</li>
                <li><strong>Account Integrity:</strong> You must provide accurate and complete information</li>
              </ul>
              <p>
                If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
              </p>
            </section>

            {/* 4. Account Registration */}
            <section id="account" className="mb-8">
              <h2>4. Account Registration and Security</h2>
              
              <h3>4.1 Account Creation</h3>
              <p>To access certain features, you must create an account by providing:</p>
              <ul>
                <li>Valid email address</li>
                <li>Secure password</li>
                <li>Academic institution or affiliation (optional)</li>
                <li>Research field and interests</li>
              </ul>

              <h3>4.2 Account Security</h3>
              <p>You are responsible for:</p>
              <ul>
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Not sharing your account with others</li>
              </ul>

              <h3>4.3 Accuracy of Information</h3>
              <p>
                You agree to provide accurate, current, and complete information and to update such information to maintain its accuracy.
              </p>
            </section>

            {/* 5. License */}
            <section id="license" className="mb-8">
              <h2>5. License and Access Rights</h2>
              
              <h3>5.1 License Grant</h3>
              <p>
                Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal academic and research purposes.
              </p>

              <h3>5.2 License Restrictions</h3>
              <p>You may NOT:</p>
              <ul>
                <li>Copy, modify, or create derivative works of the Service</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Remove or alter any proprietary notices</li>
                <li>Use the Service for commercial purposes without authorization</li>
                <li>Access the Service through automated means (bots, scrapers)</li>
                <li>Resell or redistribute the Service or any part thereof</li>
              </ul>

              <h3>5.3 Subscription Tiers</h3>
              <p>Different subscription tiers may provide access to different features, including:</p>
              <ul>
                <li><strong>Free Tier:</strong> Basic features with usage limitations</li>
                <li><strong>Pro Tier:</strong> Enhanced features, higher limits, priority support</li>
                <li><strong>Team/Enterprise:</strong> Collaboration features, custom integration</li>
              </ul>
            </section>

            {/* 6. Acceptable Use */}
            <section id="acceptable-use" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Shield className="w-6 h-6" />
                6. Acceptable Use Policy
              </h2>
              <p>You agree NOT to use the Service to:</p>

              <h3>6.1 Prohibited Activities</h3>
              <ul>
                <li><strong>Illegal Activities:</strong> Violate any applicable laws or regulations</li>
                <li><strong>Academic Dishonesty:</strong> Plagiarize, cheat, or violate academic integrity policies</li>
                <li><strong>Harassment:</strong> Harass, abuse, threaten, or intimidate others</li>
                <li><strong>Misinformation:</strong> Spread false or misleading information</li>
                <li><strong>Spam:</strong> Send unsolicited communications or advertisements</li>
                <li><strong>Malicious Code:</strong> Upload viruses, malware, or harmful code</li>
                <li><strong>Security Violations:</strong> Attempt to breach security or access unauthorized data</li>
                <li><strong>Interference:</strong> Disrupt or interfere with the Service's operation</li>
              </ul>

              <h3>6.2 Academic Integrity</h3>
              <p>
                While our Service provides AI-assisted research support, you are responsible for ensuring your use complies with your institution's academic integrity policies. The Service is designed to assist, not replace, your own research and writing.
              </p>
            </section>

            {/* 7. User Content */}
            <section id="content" className="mb-8">
              <h2 className="flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                7. User Content and Data
              </h2>

              <h3>7.1 Ownership</h3>
              <p>
                You retain all rights to your User Content. By uploading content to the Service, you do not transfer ownership to us.
              </p>

              <h3>7.2 License to Use</h3>
              <p>
                You grant us a limited, worldwide, non-exclusive license to use, store, and process your User Content solely to provide and improve the Service. This includes:
              </p>
              <ul>
                <li>Processing your content through AI models</li>
                <li>Generating research insights and recommendations</li>
                <li>Enabling collaboration features you choose to use</li>
                <li>Creating anonymized, aggregated data for service improvement</li>
              </ul>

              <h3>7.3 Content Responsibilities</h3>
              <p>You represent and warrant that:</p>
              <ul>
                <li>You own or have necessary rights to your User Content</li>
                <li>Your content does not violate third-party rights</li>
                <li>Your content complies with these Terms and applicable laws</li>
                <li>Your content does not contain confidential information you don't have permission to share</li>
              </ul>

              <h3>7.4 Content Removal</h3>
              <p>
                We reserve the right to remove any User Content that violates these Terms or applicable laws, but we have no obligation to monitor content.
              </p>
            </section>

            {/* 8. Intellectual Property */}
            <section id="intellectual-property" className="mb-8">
              <h2>8. Intellectual Property Rights</h2>
              
              <h3>8.1 Our Property</h3>
              <p>
                The Service, including all content, features, functionality, software, and design elements, is owned by ThesisFlow AI and protected by copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <h3>8.2 Trademarks</h3>
              <p>
                "ThesisFlow AI," our logo, and all related names, logos, and slogans are trademarks of our company. You may not use these without our prior written permission.
              </p>

              <h3>8.3 Feedback</h3>
              <p>
                Any suggestions, ideas, or feedback you provide regarding the Service becomes our property. We may use this feedback without obligation or compensation to you.
              </p>
            </section>

            {/* 9. Payment */}
            <section id="payment" className="mb-8">
              <h2 className="flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                9. Payment and Billing
              </h2>

              <h3>9.1 Subscription Fees</h3>
              <p>
                Certain features require a paid subscription. By subscribing, you agree to pay the applicable fees for the selected plan.
              </p>

              <h3>9.2 Billing Terms</h3>
              <ul>
                <li><strong>Recurring Charges:</strong> Subscriptions renew automatically until cancelled</li>
                <li><strong>Payment Methods:</strong> We accept major credit cards and other specified payment methods</li>
                <li><strong>Billing Cycle:</strong> Charges occur monthly or annually based on your selection</li>
                <li><strong>Price Changes:</strong> We will notify you 30 days before any price increases</li>
              </ul>

              <h3>9.3 Refund Policy</h3>
              <p>
                Subscription fees are generally non-refundable except as required by law or as stated in our refund policy. We may provide prorated refunds on a case-by-case basis.
              </p>

              <h3>9.4 Free Trials</h3>
              <p>
                Free trials may be offered for certain subscription tiers. You will be charged at the end of the trial period unless you cancel before it ends. We may require payment information to start a trial.
              </p>

              <h3>9.5 Usage Limits</h3>
              <p>
                Some features have usage limits (e.g., API calls, token limits). Exceeding these limits may result in additional charges or temporary service restrictions.
              </p>
            </section>

            {/* 10. Termination */}
            <section id="termination" className="mb-8">
              <h2 className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                10. Termination and Suspension
              </h2>

              <h3>10.1 Termination by You</h3>
              <p>
                You may terminate your account at any time through your account settings or by contacting support. Termination does not relieve you of any payment obligations.
              </p>

              <h3>10.2 Termination by Us</h3>
              <p>We may suspend or terminate your account immediately if:</p>
              <ul>
                <li>You violate these Terms or our policies</li>
                <li>You engage in fraudulent or illegal activities</li>
                <li>Your account has been inactive for an extended period</li>
                <li>We are required to do so by law</li>
                <li>Continuing to provide the Service creates legal or security risks</li>
              </ul>

              <h3>10.3 Effect of Termination</h3>
              <p>Upon termination:</p>
              <ul>
                <li>Your right to access the Service immediately ceases</li>
                <li>We may delete your User Content after a grace period</li>
                <li>Provisions that should survive termination will remain in effect</li>
                <li>You may export your data before deletion (if permitted)</li>
              </ul>
            </section>

            {/* 11. Disclaimers */}
            <section id="disclaimers" className="mb-8">
              <h2>11. Disclaimers and Warranties</h2>
              
              <h3>11.1 Service "As Is"</h3>
              <p className="font-semibold uppercase text-muted-foreground">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p>We specifically disclaim warranties of:</p>
              <ul>
                <li>Merchantability</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy, reliability, or completeness of content</li>
                <li>Uninterrupted or error-free operation</li>
              </ul>

              <h3>11.2 AI-Generated Content</h3>
              <p className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 not-prose">
                <strong>Important:</strong> AI-generated content may contain errors, inaccuracies, or hallucinations. You are responsible for verifying all AI-generated information before use. Do not rely solely on AI outputs for academic work without independent verification.
              </p>

              <h3>11.3 No Academic Guarantees</h3>
              <p>
                We do not guarantee that use of our Service will result in improved grades, accepted publications, or any specific academic outcomes.
              </p>
            </section>

            {/* 12. Limitation of Liability */}
            <section id="limitation" className="mb-8">
              <h2>12. Limitation of Liability</h2>
              
              <p className="font-semibold uppercase text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THESISFLOW AI, ITS AFFILIATES, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
              </p>

              <p>This includes damages for:</p>
              <ul>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Service interruptions or data loss</li>
                <li>Costs of substitute services</li>
                <li>Academic consequences (failed courses, rejected papers, etc.)</li>
                <li>Reliance on AI-generated content</li>
              </ul>

              <p>
                Our total liability to you for any claims arising from these Terms or the Service shall not exceed the greater of (a) the amount you paid us in the 12 months preceding the claim or (b) $100.
              </p>

              <p className="text-sm italic">
                Some jurisdictions do not allow limitation of certain liabilities, so some limitations may not apply to you.
              </p>
            </section>

            {/* 13. Indemnification */}
            <section id="indemnification" className="mb-8">
              <h2>13. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless ThesisFlow AI and its affiliates from any claims, losses, damages, liabilities, and expenses (including attorneys' fees) arising from:
              </p>
              <ul>
                <li>Your use of the Service</li>
                <li>Your User Content</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Your violation of applicable laws</li>
              </ul>
            </section>

            {/* 14. Dispute Resolution */}
            <section id="dispute-resolution" className="mb-8">
              <h2 className="flex items-center gap-2">
                <Gavel className="w-6 h-6" />
                14. Dispute Resolution
              </h2>

              <h3>14.1 Informal Resolution</h3>
              <p>
                Before filing any legal claim, you agree to contact us at legal@thesisflow-ai.com to attempt to resolve the dispute informally. We will attempt to resolve disputes in good faith.
              </p>

              <h3>14.2 Arbitration Agreement</h3>
              <p>
                If informal resolution fails, disputes will be resolved through binding arbitration rather than in court, except where prohibited by law. This includes:
              </p>
              <ul>
                <li>One arbitrator under applicable arbitration rules</li>
                <li>Location determined by mutual agreement or arbitration rules</li>
                <li>Each party bears their own costs unless awarded by arbitrator</li>
                <li>Arbitration on an individual basis (no class actions)</li>
              </ul>

              <h3>14.3 Governing Law</h3>
              <p>
                These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
              </p>

              <h3>14.4 Exceptions</h3>
              <p>
                Either party may seek injunctive relief in court for intellectual property violations or to protect confidential information.
              </p>
            </section>

            {/* 15. General */}
            <section id="general" className="mb-8">
              <h2>15. General Provisions</h2>

              <h3>15.1 Entire Agreement</h3>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and ThesisFlow AI.
              </p>

              <h3>15.2 Modifications</h3>
              <p>
                We may modify these Terms at any time. Material changes will be notified via email or Service notice. Continued use after changes constitutes acceptance.
              </p>

              <h3>15.3 Severability</h3>
              <p>
                If any provision is found unenforceable, the remaining provisions will continue in full force.
              </p>

              <h3>15.4 Waiver</h3>
              <p>
                Our failure to enforce any right or provision is not a waiver of that right or provision.
              </p>

              <h3>15.5 Assignment</h3>
              <p>
                You may not assign these Terms without our consent. We may assign these Terms without restriction.
              </p>

              <h3>15.6 Force Majeure</h3>
              <p>
                We are not liable for failures or delays caused by circumstances beyond our reasonable control.
              </p>

              <h3>15.7 Export Control</h3>
              <p>
                You agree to comply with all applicable export and import laws and regulations.
              </p>
            </section>

            {/* 16. Contact */}
            <section id="contact" className="mb-8">
              <h2>16. Contact Information</h2>
              <p>For questions about these Terms, please contact us:</p>
              
              <div className="bg-muted/50 rounded-lg p-6 mt-4 not-prose">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Legal Inquiries</h4>
                    <a href="mailto:legal@thesisflow-ai.com" className="text-primary hover:underline">
                      legal@thesisflow-ai.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">General Support</h4>
                    <a href="mailto:support@thesisflow-ai.com" className="text-primary hover:underline">
                      support@thesisflow-ai.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Billing Questions</h4>
                    <a href="mailto:billing@thesisflow-ai.com" className="text-primary hover:underline">
                      billing@thesisflow-ai.com
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Response Time</h4>
                    <p className="text-sm text-muted-foreground">Within 48 hours</p>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="my-8" />

            {/* Acknowledgment */}
            <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800 not-prose">
              <p className="font-semibold mb-2">Acknowledgment</p>
              <p className="text-sm">
                By using ThesisFlow AI, you acknowledge that you have read these Terms of Service and agree to be bound by them. If you do not agree to these Terms, please do not use our Service.
              </p>
            </div>

            <Separator className="my-8" />

            {/* Footer Links */}
            <div className="flex flex-wrap gap-4 justify-center text-sm not-prose">
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/signup" className="text-primary hover:underline">Create Account</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/" className="text-primary hover:underline">Home</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/contact" className="text-primary hover:underline">Contact</Link>
            </div>

          </CardContent>
        </Card>

        {/* Legal Notice */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>These terms were last updated on {lastUpdated}</p>
          <p className="mt-2">ThesisFlow AI reserves the right to update these terms at any time.</p>
        </div>
      </div>
    </div>
  )
}

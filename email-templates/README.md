# ThesisFlow-AI - Modern Email Templates

This directory contains modern, professional email templates for ThesisFlow-AI's authentication and collaboration system. These templates provide a clean, accessible experience for users during signup, login, and team collaboration flows.

## 📧 Available Templates

### 1. **account-confirmation.html** - Email Signup Confirmation
- **Purpose**: Sent when users sign up and need to verify their email
- **Features**: 
  - Modern, clean design with ThesisFlow-AI branding
  - Feature highlights showcasing AI-powered research capabilities
  - Mobile-responsive design with excellent email client compatibility
  - Security notices and help sections

### 2. **magic-link-login.html** - Magic Link Authentication
- **Purpose**: Sent when users request passwordless login
- **Features**:
  - Clear explanation of magic link security benefits
  - Visual security features grid with icons
  - Time-limited access messaging
  - Mobile-responsive design

### 3. **password-recovery.html** - Password Reset
- **Purpose**: Sent when users request password reset
- **Features**:
  - Step-by-step password reset instructions
  - Security tips and best practices
  - Red-themed CTA button for urgency and attention
  - Comprehensive security warnings

### 4. **team-invitation.html** - Team Invitations
- **Purpose**: Sent when users are invited to join research teams/projects
- **Features**:
  - Dynamic invitation details with team information
  - Collaboration features showcase
  - Green-themed CTA button for positive action
  - Team member role and size information

### 5. **change-email-address.html** - Email Change Confirmation
- **Purpose**: Sent when users request to change their email address
- **Features**:
  - Clear display of old and new email addresses
  - Step-by-step process explanation
  - Amber-themed design for attention
  - Security warnings and expiration notices

### 6. **reset-password.html** - Password Reset Confirmation
- **Purpose**: Sent after a successful password reset (confirmation)
- **Features**:
  - Success confirmation with timestamp and IP details
  - Security recommendations and best practices
  - Green-themed design for positive confirmation
  - Account security tips and guidance

### 7. **reauthentication.html** - Security Reauthentication
- **Purpose**: Sent when unusual activity requires user verification
- **Features**:
  - Security alert with detection details
  - Explanation of why reauthentication is needed
  - Red-themed design for urgency
  - Device, location, and IP information display

## 🎨 Design Features

### **Modern Professional Design**
- **Background**: Clean light gray (#f8fafc) with white containers
- **Layout**: Centered 600px max-width for optimal readability
- **Typography**: System fonts for maximum compatibility and readability
- **Shadows**: Subtle shadows (0 2px 4px rgba(0, 0, 0, 0.04)) for depth

### **ThesisFlow-AI Branding**
- 🎯 ThesisFlow-AI logo with document icon
- Orange brand color (#FF6B2C) for primary actions and branding
- Consistent typography using system font stack
- Research-focused iconography and messaging

### **Color Scheme**
- **Primary Brand**: Orange (#FF6B2C) with hover state (#E55A1F)
- **Success**: Green (#10b981) for positive actions like invitations and confirmations
- **Warning**: Red (#dc2626) for urgent actions like password reset and security alerts
- **Attention**: Amber (#f59e0b) for important changes like email updates
- **Info**: Blue (#0ea5e9) for informational elements
- **Text**: Dark (#1a1a1a) and muted gray (#6b7280) for hierarchy

### **Visual Elements**
- **Hero Images**: High-quality professional images from Pexels
- **Logo**: Circular logo with rounded corners
- **Icons**: Emoji icons for feature lists (⚡️, 🔐, 👥)
- **Buttons**: Gradient buttons with hover effects

### **Responsive Design**
- Mobile-first approach
- Responsive breakpoints at 600px
- Optimized for all email clients
- Table-based layout for maximum compatibility

### **Security Features**
- Security notes on all templates
- Expiration warnings with visual indicators
- Clear instructions for suspicious emails
- Professional security messaging

## 🚀 How to Apply to Supabase

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to **Authentication** → **Email Templates**

2. **Update Each Template**
   - **Confirm signup**: Copy content from `account-confirmation.html`
   - **Magic link**: Copy content from `magic-link-login.html`
   - **Reset password**: Copy content from `password-recovery.html`
   - **Invite user**: Copy content from `team-invitation.html`
   - **Change email**: Copy content from `change-email-address.html`
   - **Password reset confirmation**: Copy content from `reset-password.html`
   - **Reauthentication**: Copy content from `reauthentication.html`

3. **Update Email Subjects**
   - Confirm signup: "Confirm your account - ThesisFlow-AI"
   - Magic link: "Secure Access to ThesisFlow-AI"
   - Reset password: "Reset Your Password - ThesisFlow-AI"
   - Invite user: "You've Been Invited - ThesisFlow-AI"
   - Change email: "Confirm Email Change - ThesisFlow-AI"
   - Password reset confirmation: "Password Reset Successful - ThesisFlow-AI"
   - Reauthentication: "Security Alert - Reauthentication Required - ThesisFlow-AI"

### Option 2: Management API

You can also update templates programmatically using the Supabase Management API:

```bash
# Set your access token and project reference
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="wvlxgbqjwgleizbpdulo"

# Update email templates
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_confirmation": "Confirm your account - ThesisFlow-AI",
    "mailer_templates_confirmation_content": "<!DOCTYPE html>...",
    "mailer_subjects_magic_link": "Secure Access to ThesisFlow-AI",
    "mailer_templates_magic_link_content": "<!DOCTYPE html>...",
    "mailer_subjects_recovery": "Reset Your Password - ThesisFlow-AI",
    "mailer_templates_recovery_content": "<!DOCTYPE html>...",
    "mailer_subjects_invite": "You've Been Invited - ThesisFlow-AI",
    "mailer_templates_invite_content": "<!DOCTYPE html>..."
  }'
```

## 🔧 Template Variables

The templates use Supabase's Go Template variables:

- `{{ .ConfirmationURL }}` - The confirmation/reset link
- `{{ .SiteURL }}` - Your application's site URL
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Custom metadata (for invitations)
- `{{ .Token }}` - 6-digit OTP code (if using OTP instead of links)

## 📱 Email Client Compatibility

These templates are designed to work with:
- ✅ Gmail (web and mobile)
- ✅ Outlook (web and desktop)
- ✅ Apple Mail
- ✅ Thunderbird
- ✅ Mobile email apps

## 🎯 Customization

### **Colors**
To change the color scheme, update the CSS variables:
```css
.wrapper {
    background-image: linear-gradient(45deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}
.button {
    background-image: linear-gradient(45deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}
```

### **Logo**
Update the logo image URL in each template:
```html
<img src="YOUR_LOGO_URL" alt="Your Brand Logo" style="max-width: 70px; border-radius: 50%;">
```

### **Hero Images**
Update the hero image URL in each template:
```html
<img src="YOUR_HERO_IMAGE_URL" alt="Your hero image description" style="display: block;">
```

### **Features List**
Customize the features list in the confirmation and invitation templates to match your application's features.

## 🔒 Security Considerations

1. **Link Expiration**: All links have appropriate expiration times (24 hours)
2. **Security Notes**: Each template includes security warnings with visual indicators
3. **Fallback Links**: Plain text links provided for accessibility
4. **No Tracking**: Templates don't include tracking pixels
5. **Professional Messaging**: Clear, professional security messaging

## 📊 Testing

After applying the templates:

1. **Test Signup Flow**: Create a new account to test confirmation email
2. **Test Magic Link**: Request a magic link to test login email
3. **Test Password Reset**: Request password reset to test recovery email
4. **Test Invitations**: Send team invitations to test invite email
5. **Test Email Change**: Request email address change to test change confirmation
6. **Test Password Reset Confirmation**: Complete password reset to test success email
7. **Test Reauthentication**: Trigger security verification to test reauthentication email

## 🐛 Troubleshooting

### **Common Issues**
- **Images not loading**: Use inline CSS instead of external stylesheets
- **Links not working**: Ensure `{{ .ConfirmationURL }}` is properly formatted
- **Mobile display issues**: Test on various email clients
- **Glassmorphism not supported**: Fallback to solid backgrounds for older clients

### **Debug Steps**
1. Check Supabase dashboard for template syntax errors
2. Test with a real email address
3. Check spam folder if emails aren't received
4. Verify SMTP settings in Supabase dashboard
5. Test glassmorphism effects on different email clients

## 📞 Support

If you encounter issues with the email templates:
1. Check the Supabase documentation on email templates
2. Verify your project's email settings
3. Test with different email providers
4. Contact Supabase support if needed

---

**Note**: These templates feature a modern, professional design specifically for ThesisFlow-AI. The design includes clean layouts, research-focused iconography, modern typography, and engaging visual elements while maintaining excellent email client compatibility across all major email providers. 
# Bolt Research Hub - Custom Email Templates

This directory contains custom email templates for Bolt Research Hub's authentication system. These templates provide a modern, branded experience for users during signup, login, and other authentication flows.

## 📧 Available Templates

### 1. **confirmation.html** - Email Signup Confirmation
- **Purpose**: Sent when users sign up and need to verify their email
- **Features**: 
  - Welcome message with Bolt Research Hub branding
  - Feature highlights
  - Security notes
  - Mobile-responsive design

### 2. **magic-link.html** - Magic Link Authentication
- **Purpose**: Sent when users request passwordless login
- **Features**:
  - Clear explanation of magic links
  - Security information
  - Mobile-responsive design

### 3. **recovery.html** - Password Reset
- **Purpose**: Sent when users request password reset
- **Features**:
  - Step-by-step instructions
  - Security warnings
  - Red-themed CTA button for urgency

### 4. **invite.html** - Team Invitations
- **Purpose**: Sent when users are invited to join teams/projects
- **Features**:
  - Invitation details with custom data
  - Team collaboration features
  - Green-themed CTA button for acceptance

## 🎨 Design Features

### **Branding**
- ⚡ Bolt Research Hub logo and branding
- Consistent gradient header (purple to blue)
- Professional typography using system fonts

### **Color Scheme**
- **Primary**: Purple gradient (#667eea to #764ba2)
- **Success**: Green gradient (#10b981 to #059669)
- **Warning**: Red gradient (#dc2626 to #b91c1c)
- **Info**: Blue accents (#0ea5e9)

### **Responsive Design**
- Mobile-first approach
- Responsive breakpoints at 600px
- Optimized for all email clients

### **Security Features**
- Security notes on all templates
- Expiration warnings
- Clear instructions for suspicious emails

## 🚀 How to Apply to Supabase

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to **Authentication** → **Email Templates**

2. **Update Each Template**
   - **Confirm signup**: Copy content from `confirmation.html`
   - **Magic link**: Copy content from `magic-link.html`
   - **Reset password**: Copy content from `recovery.html`
   - **Invite user**: Copy content from `invite.html`

3. **Update Email Subjects**
   - Confirm signup: "Welcome to Bolt Research Hub!"
   - Magic link: "Your Magic Link - Bolt Research Hub"
   - Reset password: "Reset Your Password - Bolt Research Hub"
   - Invite user: "You've Been Invited - Bolt Research Hub"

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
    "mailer_subjects_confirmation": "Welcome to Bolt Research Hub!",
    "mailer_templates_confirmation_content": "<!DOCTYPE html>...",
    "mailer_subjects_magic_link": "Your Magic Link - Bolt Research Hub",
    "mailer_templates_magic_link_content": "<!DOCTYPE html>...",
    "mailer_subjects_recovery": "Reset Your Password - Bolt Research Hub",
    "mailer_templates_recovery_content": "<!DOCTYPE html>...",
    "mailer_subjects_invite": "You've Been Invited - Bolt Research Hub",
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
To change the color scheme, update the CSS variables in the header:
```css
.header {
    background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}
```

### **Logo**
Update the logo text in each template:
```html
<div class="logo">⚡ Your Brand Name</div>
```

### **Features List**
Customize the features list in the confirmation and invitation templates to match your application's features.

## 🔒 Security Considerations

1. **Link Expiration**: All links have appropriate expiration times
2. **Security Notes**: Each template includes security warnings
3. **Fallback Links**: Plain text links provided for accessibility
4. **No Tracking**: Templates don't include tracking pixels

## 📊 Testing

After applying the templates:

1. **Test Signup Flow**: Create a new account to test confirmation email
2. **Test Magic Link**: Request a magic link to test login email
3. **Test Password Reset**: Request password reset to test recovery email
4. **Test Invitations**: Send team invitations to test invite email

## 🐛 Troubleshooting

### **Common Issues**
- **Images not loading**: Use inline CSS instead of external stylesheets
- **Links not working**: Ensure `{{ .ConfirmationURL }}` is properly formatted
- **Mobile display issues**: Test on various email clients

### **Debug Steps**
1. Check Supabase dashboard for template syntax errors
2. Test with a real email address
3. Check spam folder if emails aren't received
4. Verify SMTP settings in Supabase dashboard

## 📞 Support

If you encounter issues with the email templates:
1. Check the Supabase documentation on email templates
2. Verify your project's email settings
3. Test with different email providers
4. Contact Supabase support if needed

---

**Note**: These templates are designed specifically for Bolt Research Hub. Customize the branding, colors, and content to match your application's needs. 
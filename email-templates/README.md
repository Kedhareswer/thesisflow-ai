# Bolt Researcher Hub - Custom Email Templates

This directory contains custom email templates for Bolt Researcher Hub's authentication system. These templates provide a modern, glassmorphic experience for users during signup, login, and other authentication flows.

## 📧 Available Templates

### 1. **confirmation.html** - Email Signup Confirmation
- **Purpose**: Sent when users sign up and need to verify their email
- **Features**: 
  - Modern glassmorphism design
  - Hero illustration with professional imagery
  - Feature highlights with lightning bolt icons
  - Mobile-responsive design

### 2. **magic-link.html** - Magic Link Authentication
- **Purpose**: Sent when users request passwordless login
- **Features**:
  - Clear explanation of magic links
  - Security information with visual indicators
  - Mobile-responsive design

### 3. **recovery.html** - Password Reset
- **Purpose**: Sent when users request password reset
- **Features**:
  - Step-by-step instructions
  - Security warnings with lock icons
  - Red-themed CTA button for urgency

### 4. **invite.html** - Team Invitations
- **Purpose**: Sent when users are invited to join teams/projects
- **Features**:
  - Invitation details with custom data
  - Team collaboration features
  - Green-themed CTA button for acceptance

## 🎨 Design Features

### **Modern Glassmorphism Design**
- **Background**: Dynamic gradient background (#d5ddec to #f0f2f5)
- **Glass Effect**: Semi-transparent white background with backdrop blur
- **Borders**: Subtle white borders with transparency
- **Shadows**: Soft shadows for depth and modern feel

### **Branding**
- 🚀 Bolt Researcher Hub logo and branding
- Professional hero illustrations from Pexels
- Consistent typography using system fonts
- Lightning bolt icons for feature lists

### **Color Scheme**
- **Primary**: Blue gradient (#4b6cb7 to #182848)
- **Success**: Green gradient (#10b981 to #059669)
- **Warning**: Red gradient (#dc2626 to #b91c1c)
- **Info**: Blue accents (#0ea5e9)
- **Text**: Dark blue (#1c2a48) and gray (#33425e)

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
   - **Confirm signup**: Copy content from `confirmation.html`
   - **Magic link**: Copy content from `magic-link.html`
   - **Reset password**: Copy content from `recovery.html`
   - **Invite user**: Copy content from `invite.html`

3. **Update Email Subjects**
   - Confirm signup: "Welcome to the Bolt Researcher Hub!"
   - Magic link: "Secure Access to Your Research Hub"
   - Reset password: "Reset Your Password - Bolt Researcher Hub"
   - Invite user: "You've Been Invited - Bolt Researcher Hub"

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
    "mailer_subjects_confirmation": "Welcome to the Bolt Researcher Hub!",
    "mailer_templates_confirmation_content": "<!DOCTYPE html>...",
    "mailer_subjects_magic_link": "Secure Access to Your Research Hub",
    "mailer_templates_magic_link_content": "<!DOCTYPE html>...",
    "mailer_subjects_recovery": "Reset Your Password - Bolt Researcher Hub",
    "mailer_templates_recovery_content": "<!DOCTYPE html>...",
    "mailer_subjects_invite": "You've Been Invited - Bolt Researcher Hub",
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

**Note**: These templates feature a modern glassmorphism design specifically for Bolt Researcher Hub. The design includes professional imagery, modern typography, and engaging visual elements while maintaining excellent email client compatibility. 
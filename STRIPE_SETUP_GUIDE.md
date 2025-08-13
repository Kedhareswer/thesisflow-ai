# Stripe Payment Integration Setup Guide

## Prerequisites
- Stripe account (create at https://dashboard.stripe.com/register)
- Node.js and npm installed
- Supabase project configured

## Step 1: Configure Stripe Account

### 1.1 Get Your API Keys
1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers → API keys
3. Copy your **Publishable key** and **Secret key**

### 1.2 Configure Webhook Endpoint
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   - Local testing: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for forwarding
   - Production: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Copy the **Webhook signing secret**

### 1.3 Configure Customer Portal
1. Go to Settings → Billing → Customer portal
2. Enable the customer portal
3. Configure:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Allow customers to update subscriptions
   - Set cancellation policy

## Step 2: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (will be filled after running setup script)
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE_YEARLY=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Create Stripe Products and Prices

Run the setup script to create products and prices:

```bash
node scripts/setup-stripe-prices.js
```

This will:
1. Create Pro and Enterprise products in Stripe
2. Create monthly and yearly prices for each
3. Output the price IDs to add to your `.env.local`

## Step 4: Test Locally with Stripe CLI

### 4.1 Install Stripe CLI
```bash
# On Windows (using Scoop)
scoop install stripe

# On Mac
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

### 4.2 Login to Stripe CLI
```bash
stripe login
```

### 4.3 Forward Webhooks to Local Server
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret displayed and update `STRIPE_WEBHOOK_SECRET` in `.env.local`

### 4.4 Trigger Test Events
In another terminal:
```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test payment failure
stripe trigger invoice.payment_failed
```

## Step 5: Test the Integration

### 5.1 Test Checkout Flow
1. Start your development server: `npm run dev`
2. Sign in to your app
3. Navigate to `/plan`
4. Click "Start 7-Day Trial" for Pro plan
5. You'll be redirected to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
7. Complete the checkout
8. You should be redirected back and see your plan updated

### 5.2 Test Customer Portal
1. As a Pro subscriber, go to `/plan`
2. Click "Manage Plan"
3. You'll be redirected to Stripe Customer Portal
4. Test updating payment method or canceling subscription

### 5.3 Test Webhook Processing
Monitor the console logs in your app and Stripe CLI to see webhook events being processed.

## Step 6: Database Schema Updates

Ensure your Supabase database has the required columns:

```sql
-- Add Stripe fields to user_plans table if not exists
ALTER TABLE user_plans 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_plans_stripe_customer_id 
ON user_plans(stripe_customer_id);
```

## Step 7: Production Deployment

### 7.1 Environment Variables
Set all environment variables in your production environment (Vercel, Netlify, etc.)

### 7.2 Update Webhook URL
In Stripe Dashboard, update the webhook endpoint to your production URL

### 7.3 Switch to Live Keys
Replace test keys with live keys:
- `pk_live_...` for publishable key
- `sk_live_...` for secret key

### 7.4 Configure Domain in Stripe
Add your production domain to Stripe Dashboard → Settings → Branding

## Common Test Card Numbers

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Declined payment |
| 4000 0000 0000 0002 | Declined (generic) |
| 4000 0000 0000 9987 | Failed (processing error) |

Use any future date for expiry and any 3-digit CVC.

## Troubleshooting

### Webhook Signature Verification Failed
- Ensure you're using the correct webhook secret
- Check that you're not parsing the request body before verification

### Customer Not Found
- Verify Supabase user exists
- Check stripe_customer_id is being saved correctly

### Subscription Not Updating
- Check webhook events are being received
- Verify database permissions for service role key
- Check Supabase RLS policies

## Monitoring

### Stripe Dashboard
- Monitor successful/failed payments
- Track subscription metrics
- Review webhook delivery status

### Application Logs
- Log all Stripe API calls
- Track webhook processing
- Monitor error rates

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Testing Guide](https://stripe.com/docs/testing)
- [Webhook Events](https://stripe.com/docs/webhooks/stripe-events)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil'
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe subscription status to our plan types
function mapSubscriptionStatus(status: string, planType: string): string {
  if (status === 'active' || status === 'trialing') {
    return planType // 'pro' or 'enterprise'
  }
  return 'free' // For canceled, past_due, unpaid, etc.
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Session completed successfully
        if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
          const customerId = session.customer as string
          const subscriptionId = session.subscription as string
          const userId = session.metadata?.supabase_user_id
          const planType = session.metadata?.plan_type || 'free'

          if (userId) {
            // Update user plan in Supabase
            const { error } = await supabaseAdmin
              .from('user_plans')
              .upsert({
                user_id: userId,
                plan_type: planType,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: 'active',
                updated_at: new Date().toISOString()
              })

            if (error) {
              console.error('Error updating user plan:', error)
            } else {
              console.log(`Updated plan for user ${userId} to ${planType}`)
              
              // Reset usage for the new billing period
              await supabaseAdmin
                .rpc('reset_user_usage', { p_user_uuid: userId })
            }
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const planType = subscription.metadata?.plan_type || 'free'
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          const status = mapSubscriptionStatus(subscription.status, planType)
          
          // Update subscription details
          const { error } = await supabaseAdmin
            .from('user_plans')
            .upsert({
              user_id: userId,
              plan_type: status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              current_period_start: new Date(((subscription as any).current_period_start || 0) * 1000).toISOString(),
              current_period_end: new Date(((subscription as any).current_period_end || 0) * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString()
            })

          if (error) {
            console.error('Error updating subscription:', error)
          } else {
            console.log(`Updated subscription for user ${userId}`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          // Downgrade to free plan
          const { error } = await supabaseAdmin
            .from('user_plans')
            .update({
              plan_type: 'free',
              status: 'canceled',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          if (error) {
            console.error('Error canceling subscription:', error)
          } else {
            console.log(`Canceled subscription for user ${userId}`)
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string
        
        if (subscriptionId) {
          // Retrieve subscription to get user ID
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.supabase_user_id

          if (userId) {
            // Reset usage for new billing period
            await supabaseAdmin
              .rpc('reset_user_usage', { p_user_uuid: userId })
            
            console.log(`Reset usage for user ${userId} after successful payment`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.supabase_user_id

          if (userId) {
            // Update status to past_due
            await supabaseAdmin
              .from('user_plans')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
            
            console.log(`Payment failed for user ${userId}`)
          }
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          // Send notification email (implement email service)
          console.log(`Trial ending soon for user ${userId}`)
          
          // You could trigger an email notification here
          // await sendTrialEndingEmail(userId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// Stripe requires raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

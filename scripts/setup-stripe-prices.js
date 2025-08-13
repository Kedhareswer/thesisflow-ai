// Script to create Stripe recurring prices
// Run this script once to set up your Stripe products and prices
// Usage: node scripts/setup-stripe-prices.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key');

async function setupStripePrices() {
  try {
    console.log('Creating Stripe recurring prices...');

    // Create Pro Monthly Price ($29/month)
    const proMonthlyPrice = await stripe.prices.create({
      product: 'prod_SrE9EJdym66Hdr', // Pro product ID
      unit_amount: 2900, // $29.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      nickname: 'Pro Monthly',
      metadata: {
        plan_type: 'pro',
        billing_period: 'monthly'
      }
    });
    console.log('Created Pro Monthly price:', proMonthlyPrice.id);

    // Create Enterprise Monthly Price ($99/month)
    const enterpriseMonthlyPrice = await stripe.prices.create({
      product: 'prod_SrE9hKEszkVJly', // Enterprise product ID
      unit_amount: 9900, // $99.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      nickname: 'Enterprise Monthly',
      metadata: {
        plan_type: 'enterprise',
        billing_period: 'monthly'
      }
    });
    console.log('Created Enterprise Monthly price:', enterpriseMonthlyPrice.id);

    // Create Pro Yearly Price ($290/year - ~17% discount)
    const proYearlyPrice = await stripe.prices.create({
      product: 'prod_SrE9EJdym66Hdr', // Pro product ID
      unit_amount: 29000, // $290.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1
      },
      nickname: 'Pro Yearly',
      metadata: {
        plan_type: 'pro',
        billing_period: 'yearly'
      }
    });
    console.log('Created Pro Yearly price:', proYearlyPrice.id);

    // Create Enterprise Yearly Price ($990/year - ~17% discount)
    const enterpriseYearlyPrice = await stripe.prices.create({
      product: 'prod_SrE9hKEszkVJly', // Enterprise product ID
      unit_amount: 99000, // $990.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1
      },
      nickname: 'Enterprise Yearly',
      metadata: {
        plan_type: 'enterprise',
        billing_period: 'yearly'
      }
    });
    console.log('Created Enterprise Yearly price:', enterpriseYearlyPrice.id);

    console.log('\n✅ Stripe prices created successfully!');
    console.log('\nAdd these price IDs to your .env.local file:');
    console.log(`STRIPE_PRICE_ID_PRO_MONTHLY=${proMonthlyPrice.id}`);
    console.log(`STRIPE_PRICE_ID_PRO_YEARLY=${proYearlyPrice.id}`);
    console.log(`STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=${enterpriseMonthlyPrice.id}`);
    console.log(`STRIPE_PRICE_ID_ENTERPRISE_YEARLY=${enterpriseYearlyPrice.id}`);

  } catch (error) {
    console.error('Error creating Stripe prices:', error);
    process.exit(1);
  }
}

// Run the setup
setupStripePrices();

// Script to create Stripe recurring prices
// Run this script once to set up your Stripe products and prices
// Usage: node scripts/setup-stripe-prices.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key');

// --- Helper functions to make script idempotent ---
/**
 * Returns an existing active price for given product & interval settings, or null if none found.
 */
async function checkExistingPrice(productId, interval, intervalCount) {
  try {
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    return prices.data.find((p) => p.recurring && p.recurring.interval === interval && p.recurring.interval_count === intervalCount) || null;
  } catch (err) {
    console.warn('Failed to list prices', err);
    return null;
  }
}

/**
 * Fetches an existing price matching the config or creates a new one.
 */
async function createOrGetPrice(config) {
  const { product, recurring } = config;
  const existing = await checkExistingPrice(product, recurring.interval, recurring.interval_count);
  if (existing) {
    console.log(`Using existing price ${existing.id} for ${config.nickname}`);
    return existing;
  }
  const created = await stripe.prices.create(config);
  console.log(`Created new price ${created.id} for ${config.nickname}`);
  return created;
}

async function setupStripePrices() {
  try {
    console.log('Creating Stripe recurring prices...');

    // Create Pro Monthly Price ($29/month)
    const proMonthlyPrice = await createOrGetPrice({
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
    const enterpriseMonthlyPrice = await createOrGetPrice({
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
    const proYearlyPrice = await createOrGetPrice({
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
    const enterpriseYearlyPrice = await createOrGetPrice({
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

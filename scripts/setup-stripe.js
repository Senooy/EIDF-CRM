#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, silent = false) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    if (!silent) {
      log(`✓ ${command}`, 'green');
    }
    return result.trim();
  } catch (error) {
    log(`✗ Failed: ${command}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

async function checkStripeCliInstalled() {
  try {
    execCommand('stripe --version', true);
    log('✓ Stripe CLI is installed', 'green');
  } catch {
    log('✗ Stripe CLI is not installed', 'red');
    log('\nPlease install Stripe CLI first:', 'yellow');
    log('brew install stripe/stripe-cli/stripe', 'blue');
    log('or visit: https://stripe.com/docs/stripe-cli', 'blue');
    process.exit(1);
  }
}

async function loginToStripe() {
  log('\n🔐 Logging into Stripe...', 'bright');
  log('Please follow the browser prompt to authenticate', 'yellow');
  execCommand('stripe login');
}

async function createProducts() {
  log('\n📦 Creating products...', 'bright');
  
  const products = [
    {
      name: 'EIDF CRM Starter',
      description: 'Perfect for small WooCommerce stores',
      metadata: { plan: 'STARTER' }
    },
    {
      name: 'EIDF CRM Professional',
      description: 'For growing e-commerce businesses',
      metadata: { plan: 'PROFESSIONAL' }
    },
    {
      name: 'EIDF CRM Enterprise',
      description: 'Custom solutions for large organizations',
      metadata: { plan: 'ENTERPRISE' }
    }
  ];

  const productIds = {};

  for (const product of products) {
    const command = `stripe products create \
      --name="${product.name}" \
      --description="${product.description}" \
      --metadata[plan]="${product.metadata.plan}"`;
    
    const result = execCommand(command);
    const productId = result.match(/id: (prod_\w+)/)?.[1];
    productIds[product.metadata.plan] = productId;
    log(`  Created product: ${product.name} (${productId})`, 'green');
  }

  return productIds;
}

async function createPrices(productIds) {
  log('\n💰 Creating prices...', 'bright');
  
  const prices = [
    // Starter plans
    {
      product: productIds.STARTER,
      amount: 2900, // 29€
      currency: 'eur',
      interval: 'month',
      metadata: { plan: 'STARTER', billing: 'monthly' }
    },
    {
      product: productIds.STARTER,
      amount: 29000, // 290€ (2 months free)
      currency: 'eur',
      interval: 'year',
      metadata: { plan: 'STARTER', billing: 'yearly' }
    },
    // Professional plans
    {
      product: productIds.PROFESSIONAL,
      amount: 9900, // 99€
      currency: 'eur',
      interval: 'month',
      metadata: { plan: 'PROFESSIONAL', billing: 'monthly' }
    },
    {
      product: productIds.PROFESSIONAL,
      amount: 99000, // 990€ (2 months free)
      currency: 'eur',
      interval: 'year',
      metadata: { plan: 'PROFESSIONAL', billing: 'yearly' }
    },
    // Enterprise plans
    {
      product: productIds.ENTERPRISE,
      amount: 29900, // 299€
      currency: 'eur',
      interval: 'month',
      metadata: { plan: 'ENTERPRISE', billing: 'monthly' }
    },
    {
      product: productIds.ENTERPRISE,
      amount: 299000, // 2990€ (2 months free)
      currency: 'eur',
      interval: 'year',
      metadata: { plan: 'ENTERPRISE', billing: 'yearly' }
    }
  ];

  const priceIds = {};

  for (const price of prices) {
    const command = `stripe prices create \
      --product="${price.product}" \
      --unit-amount=${price.amount} \
      --currency=${price.currency} \
      --recurring[interval]=${price.interval} \
      --metadata[plan]="${price.metadata.plan}" \
      --metadata[billing]="${price.metadata.billing}"`;
    
    const result = execCommand(command);
    const priceId = result.match(/id: (price_\w+)/)?.[1];
    const key = `${price.metadata.plan}_${price.metadata.billing.toUpperCase()}`;
    priceIds[key] = priceId;
    log(`  Created price: ${price.metadata.plan} ${price.metadata.billing} (${priceId})`, 'green');
  }

  return priceIds;
}

async function setupWebhook() {
  log('\n🪝 Setting up webhook endpoint...', 'bright');
  
  const webhookUrl = process.env.WEBHOOK_URL || 'https://api.eidf-crm.com/api/billing/webhook';
  
  const command = `stripe webhooks create \
    --url="${webhookUrl}" \
    --enabled-events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed,invoice.payment_succeeded`;
  
  const result = execCommand(command);
  const endpointId = result.match(/id: (we_\w+)/)?.[1];
  const secret = result.match(/secret: (whsec_\w+)/)?.[1];
  
  log(`  Created webhook endpoint: ${endpointId}`, 'green');
  log(`  Webhook secret: ${secret}`, 'yellow');
  
  return { endpointId, secret };
}

async function createCustomerPortalConfig() {
  log('\n🚪 Configuring customer portal...', 'bright');
  
  const command = `stripe portal_configurations create \
    --business-profile[headline]="Manage your EIDF CRM subscription" \
    --business-profile[privacy-policy-url]="https://eidf-crm.com/privacy" \
    --business-profile[terms-of-service-url]="https://eidf-crm.com/terms" \
    --features[customer-update][enabled]=true \
    --features[invoice-history][enabled]=true \
    --features[payment-method-update][enabled]=true \
    --features[subscription-cancel][enabled]=true \
    --features[subscription-pause][enabled]=false \
    --features[subscription-update][enabled]=true`;
  
  const result = execCommand(command);
  const portalId = result.match(/id: (bpc_\w+)/)?.[1];
  
  log(`  Created portal configuration: ${portalId}`, 'green');
  
  return portalId;
}

async function createTestCustomers() {
  log('\n👥 Creating test customers...', 'bright');
  
  const customers = [
    {
      email: 'test-free@eidf-crm.com',
      name: 'Test Free User',
      metadata: { plan: 'FREE' }
    },
    {
      email: 'test-starter@eidf-crm.com',
      name: 'Test Starter User',
      metadata: { plan: 'STARTER' }
    },
    {
      email: 'test-pro@eidf-crm.com',
      name: 'Test Pro User',
      metadata: { plan: 'PROFESSIONAL' }
    }
  ];

  const customerIds = {};

  for (const customer of customers) {
    const command = `stripe customers create \
      --email="${customer.email}" \
      --name="${customer.name}" \
      --metadata[plan]="${customer.metadata.plan}" \
      --test-clock[name]="Test clock for ${customer.name}"`;
    
    const result = execCommand(command);
    const customerId = result.match(/id: (cus_\w+)/)?.[1];
    customerIds[customer.metadata.plan] = customerId;
    log(`  Created test customer: ${customer.name} (${customerId})`, 'green');
  }

  return customerIds;
}

async function generateEnvFile(priceIds, webhook) {
  log('\n📝 Generating environment variables...', 'bright');
  
  const envContent = `
# Stripe Configuration (Generated by setup-stripe.js)
# ${new Date().toISOString()}

# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# Webhook Secret
STRIPE_WEBHOOK_SECRET=${webhook.secret}

# Price IDs
STRIPE_STARTER_MONTHLY_PRICE_ID=${priceIds.STARTER_MONTHLY}
STRIPE_STARTER_YEARLY_PRICE_ID=${priceIds.STARTER_YEARLY}
STRIPE_PRO_MONTHLY_PRICE_ID=${priceIds.PROFESSIONAL_MONTHLY}
STRIPE_PRO_YEARLY_PRICE_ID=${priceIds.PROFESSIONAL_YEARLY}
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=${priceIds.ENTERPRISE_MONTHLY}
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=${priceIds.ENTERPRISE_YEARLY}

# Portal Configuration
STRIPE_PORTAL_CONFIG_ID=${webhook.portalId || 'bpc_YOUR_PORTAL_ID'}
`;

  const envPath = path.join(process.cwd(), '.env.stripe');
  fs.writeFileSync(envPath, envContent.trim());
  
  log(`  Created .env.stripe file`, 'green');
  log(`  ⚠️  Remember to add your API keys!`, 'yellow');
}

async function testWebhook() {
  log('\n🧪 Testing webhook...', 'bright');
  
  log('  Sending test event...', 'yellow');
  const command = 'stripe trigger checkout.session.completed';
  execCommand(command);
  
  log('  Check your webhook endpoint logs to verify it\'s working', 'blue');
}

async function printSummary(productIds, priceIds, webhook) {
  log('\n✅ Stripe setup completed!', 'bright');
  log('\n📊 Summary:', 'bright');
  
  log('\nProducts created:', 'yellow');
  Object.entries(productIds).forEach(([plan, id]) => {
    log(`  ${plan}: ${id}`, 'green');
  });
  
  log('\nPrices created:', 'yellow');
  Object.entries(priceIds).forEach(([key, id]) => {
    log(`  ${key}: ${id}`, 'green');
  });
  
  log('\nWebhook:', 'yellow');
  log(`  Endpoint ID: ${webhook.endpointId}`, 'green');
  log(`  Secret: ${webhook.secret}`, 'green');
  
  log('\n🎯 Next steps:', 'bright');
  log('1. Copy the API keys from your Stripe dashboard', 'blue');
  log('2. Add them to your .env.stripe file', 'blue');
  log('3. Copy the environment variables to your main .env file', 'blue');
  log('4. Test the webhook with: stripe listen --forward-to localhost:3001/api/billing/webhook', 'blue');
  log('5. Create a test subscription with: stripe checkout sessions create --mode=subscription --line-items[0][price]=PRICE_ID --line-items[0][quantity]=1', 'blue');
}

async function main() {
  log('🚀 EIDF CRM - Stripe Setup Script', 'bright');
  log('==================================\n', 'bright');
  
  // Check if Stripe CLI is installed
  await checkStripeCliInstalled();
  
  // Login to Stripe
  await loginToStripe();
  
  try {
    // Create products
    const productIds = await createProducts();
    
    // Create prices
    const priceIds = await createPrices(productIds);
    
    // Setup webhook
    const webhook = await setupWebhook();
    
    // Configure customer portal
    const portalId = await createCustomerPortalConfig();
    webhook.portalId = portalId;
    
    // Create test customers (optional)
    if (process.argv.includes('--with-test-data')) {
      await createTestCustomers();
    }
    
    // Generate .env file
    await generateEnvFile(priceIds, webhook);
    
    // Test webhook (optional)
    if (process.argv.includes('--test-webhook')) {
      await testWebhook();
    }
    
    // Print summary
    await printSummary(productIds, priceIds, webhook);
    
  } catch (error) {
    log('\n❌ Setup failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
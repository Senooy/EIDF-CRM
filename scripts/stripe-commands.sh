#!/bin/bash

# EIDF CRM - Stripe CLI Commands Helper
# This script contains useful Stripe CLI commands for managing your SaaS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

function print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

function print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    print_error "Stripe CLI is not installed!"
    echo "Install with: brew install stripe/stripe-cli/stripe"
    exit 1
fi

case "$1" in
    "setup")
        print_header "Running complete Stripe setup"
        node scripts/setup-stripe.js "${@:2}"
        ;;
        
    "listen")
        print_header "Starting webhook listener"
        PORT=${PORT:-3001}
        echo "Forwarding webhooks to: http://localhost:$PORT/api/billing/webhook"
        stripe listen --forward-to "localhost:$PORT/api/billing/webhook"
        ;;
        
    "test-webhook")
        print_header "Testing webhook events"
        echo "Available events to test:"
        echo "1. checkout.session.completed"
        echo "2. customer.subscription.updated"
        echo "3. customer.subscription.deleted"
        echo "4. invoice.payment_failed"
        echo ""
        read -p "Enter event number (1-4): " choice
        
        case $choice in
            1) stripe trigger checkout.session.completed ;;
            2) stripe trigger customer.subscription.updated ;;
            3) stripe trigger customer.subscription.deleted ;;
            4) stripe trigger invoice.payment_failed ;;
            *) print_error "Invalid choice" ;;
        esac
        ;;
        
    "create-checkout")
        print_header "Creating checkout session"
        
        # Get price ID from user
        echo "Select a plan:"
        echo "1. Starter Monthly (29€/month)"
        echo "2. Starter Yearly (290€/year)"
        echo "3. Professional Monthly (99€/month)"
        echo "4. Professional Yearly (990€/year)"
        echo "5. Enterprise Monthly (299€/month)"
        echo "6. Enterprise Yearly (2990€/year)"
        
        read -p "Enter plan number (1-6): " plan_choice
        
        # Map choice to price ID (you'll need to replace these with actual IDs)
        case $plan_choice in
            1) PRICE_ID="${STRIPE_STARTER_MONTHLY_PRICE_ID:-price_starter_monthly}" ;;
            2) PRICE_ID="${STRIPE_STARTER_YEARLY_PRICE_ID:-price_starter_yearly}" ;;
            3) PRICE_ID="${STRIPE_PRO_MONTHLY_PRICE_ID:-price_pro_monthly}" ;;
            4) PRICE_ID="${STRIPE_PRO_YEARLY_PRICE_ID:-price_pro_yearly}" ;;
            5) PRICE_ID="${STRIPE_ENTERPRISE_MONTHLY_PRICE_ID:-price_enterprise_monthly}" ;;
            6) PRICE_ID="${STRIPE_ENTERPRISE_YEARLY_PRICE_ID:-price_enterprise_yearly}" ;;
            *) print_error "Invalid choice"; exit 1 ;;
        esac
        
        # Create checkout session
        stripe checkout sessions create \
            --mode=subscription \
            --line-items[0][price]="$PRICE_ID" \
            --line-items[0][quantity]=1 \
            --success-url="https://eidf-crm.com/billing/success?session_id={CHECKOUT_SESSION_ID}" \
            --cancel-url="https://eidf-crm.com/billing"
        ;;
        
    "list-products")
        print_header "Listing all products"
        stripe products list --limit 10
        ;;
        
    "list-prices")
        print_header "Listing all prices"
        stripe prices list --limit 20
        ;;
        
    "list-customers")
        print_header "Listing customers"
        stripe customers list --limit 10
        ;;
        
    "list-subscriptions")
        print_header "Listing active subscriptions"
        stripe subscriptions list --status=active --limit 10
        ;;
        
    "create-test-customer")
        print_header "Creating test customer"
        read -p "Enter customer email: " email
        read -p "Enter customer name: " name
        
        stripe customers create \
            --email="$email" \
            --name="$name" \
            --metadata[source]="cli_test"
        ;;
        
    "create-portal-session")
        print_header "Creating customer portal session"
        read -p "Enter customer ID (cus_xxx): " customer_id
        
        stripe billing_portal sessions create \
            --customer="$customer_id" \
            --return-url="https://eidf-crm.com/billing"
        ;;
        
    "refund")
        print_header "Creating refund"
        read -p "Enter payment intent ID (pi_xxx): " payment_intent
        read -p "Enter refund amount in cents (leave empty for full refund): " amount
        
        if [ -z "$amount" ]; then
            stripe refunds create --payment-intent="$payment_intent"
        else
            stripe refunds create --payment-intent="$payment_intent" --amount="$amount"
        fi
        ;;
        
    "cancel-subscription")
        print_header "Canceling subscription"
        read -p "Enter subscription ID (sub_xxx): " sub_id
        read -p "Cancel immediately? (y/n): " immediate
        
        if [ "$immediate" = "y" ]; then
            stripe subscriptions cancel "$sub_id" --invoice-now --prorate
        else
            stripe subscriptions update "$sub_id" --cancel-at-period-end
        fi
        ;;
        
    "logs")
        print_header "Viewing Stripe logs"
        stripe logs tail
        ;;
        
    "clean")
        print_header "Cleaning test data"
        print_warning "This will delete all test mode data!"
        read -p "Are you sure? (yes/no): " confirm
        
        if [ "$confirm" = "yes" ]; then
            # Delete test subscriptions
            stripe subscriptions list --limit 100 | grep '"id"' | cut -d'"' -f4 | while read -r sub_id; do
                echo "Canceling subscription: $sub_id"
                stripe subscriptions cancel "$sub_id" --invoice-now --prorate || true
            done
            
            # Delete test customers
            stripe customers list --limit 100 | grep '"id"' | cut -d'"' -f4 | while read -r cus_id; do
                echo "Deleting customer: $cus_id"
                stripe customers delete "$cus_id" || true
            done
            
            print_success "Test data cleaned!"
        else
            print_warning "Cleanup cancelled"
        fi
        ;;
        
    *)
        print_header "EIDF CRM - Stripe CLI Helper"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Setup Commands:"
        echo "  setup              - Run complete Stripe setup"
        echo "  setup --with-test-data - Setup with test customers"
        echo ""
        echo "Development Commands:"
        echo "  listen             - Start webhook listener"
        echo "  test-webhook       - Trigger test webhook events"
        echo "  logs               - View Stripe logs"
        echo ""
        echo "Management Commands:"
        echo "  list-products      - List all products"
        echo "  list-prices        - List all prices"
        echo "  list-customers     - List customers"
        echo "  list-subscriptions - List active subscriptions"
        echo ""
        echo "Testing Commands:"
        echo "  create-checkout    - Create a checkout session"
        echo "  create-test-customer - Create a test customer"
        echo "  create-portal-session - Create customer portal session"
        echo ""
        echo "Admin Commands:"
        echo "  refund             - Create a refund"
        echo "  cancel-subscription - Cancel a subscription"
        echo "  clean              - Delete all test data"
        echo ""
        echo "Environment Variables:"
        echo "  PORT               - Local server port (default: 3001)"
        echo "  STRIPE_*_PRICE_ID  - Price IDs for each plan"
        ;;
esac
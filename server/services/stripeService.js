// services/stripeService.js
import Stripe from "stripe";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get or create Stripe Customer for a user
 */
export const getOrCreateCustomer = async (user) => {
  if (user.stripeCustomerId) {
    try {
      // Verify customer still exists in Stripe
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (customer && !customer.deleted) {
        return customer;
      }
    } catch (e) {
      console.warn("Stripe customer retrieve failed, creating new one:", e.message);
    }
  }

  // Create a new customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user._id.toString(),
    },
  });

  // Update user in DB
  user.stripeCustomerId = customer.id;
  await user.save();

  return customer;
};

/**
 * Get or create the Pro subscription price in Stripe
 */
export const getOrCreateProPrice = async () => {
  // 1. Find or create Product
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find((p) => p.name === "SEO Analyzer Pro" && p.active);

  if (!product) {
    product = await stripe.products.create({
      name: "SEO Analyzer Pro",
      description: "Unlimited SEO analyses, priority processing, competitor analysis, and historical keyword tracking.",
      metadata: {
        type: "pro_plan",
      },
    });
    console.log("🆕 Created Stripe Product: SEO Analyzer Pro");
  }

  // 2. Find or create Price ($5/month)
  const prices = await stripe.prices.list({ product: product.id, limit: 100 });
  let price = prices.data.find(
    (p) => p.unit_amount === 500 && p.recurring && p.recurring.interval === "month" && p.active
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 500, // $5.00
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });
    console.log("🆕 Created Stripe Price: $5.00/month");
  }

  return price;
};

/**
 * Create a Checkout Session for Pro subscription
 */
export const createCheckoutSession = async (user, successUrl, cancelUrl) => {
  const customer = await getOrCreateCustomer(user);
  const price = await getOrCreateProPrice();

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user._id.toString(),
    },
  });

  return session;
};

/**
 * Create a Billing Portal Session so users can manage their subscription
 */
export const createPortalSession = async (user, returnUrl) => {
  const customer = await getOrCreateCustomer(user);

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  return session;
};

export { stripe };

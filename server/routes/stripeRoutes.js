// routes/stripeRoutes.js
import express from "express";
import { 
  createCheckoutSession, 
  createPortalSession, 
  stripe 
} from "../services/stripeService.js";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import { sendSubscriptionSuccessEmail } from "../services/emailService.js";

const router = express.Router();

/**
 * Create a Stripe Checkout Session for Pro Plan ($5/month)
 */
router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const successUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment=success`;
    const cancelUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard?payment=cancel`;

    const session = await createCheckoutSession(req.user, successUrl, cancelUrl);

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create checkout session",
    });
  }
});

/**
 * Create a Stripe Customer Portal Session
 */
router.post("/portal", auth, async (req, res) => {
  try {
    const returnUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard`;
    const session = await createPortalSession(req.user, returnUrl);

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Portal error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create billing portal session",
    });
  }
});

/**
 * Stripe Webhook
 * NOTE: Needs raw body parsing. We will use req.rawBody which we'll configure in server.js.
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Use rawBody (buffer) for signature verification
    const body = req.rawBody || req.body;
    
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Fallback for testing without webhook secret (not recommended for production, but good for local dev)
      console.warn("⚠️ Running Stripe Webhook WITHOUT signature verification!");
      event = req.body;
    }
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        console.log(`🔔 Payment received for user ${userId}, subscription ${subscriptionId}`);

        const user = await User.findById(userId);
        if (user) {
          user.plan = "pro";
          user.stripeSubscriptionId = subscriptionId;
          user.stripeCustomerId = customerId;
          await user.save();

          // Send confirmation email
          await sendSubscriptionSuccessEmail(user.email, user.name, "Pro Plan", "$5.00/month");
          console.log(`✨ User ${user.name} upgraded to Pro plan!`);
        } else {
          console.error(`❌ User not found for ID: ${userId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        console.log(`🔔 Subscription deleted for customer ${customerId}`);

        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.plan = "free";
          user.stripeSubscriptionId = null;
          await user.save();
          console.log(`✨ User ${user.name} downgraded to Free plan.`);
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error(`❌ Error processing webhook event ${event.type}:`, err);
    return res.status(500).json({ error: "Error processing event" });
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;

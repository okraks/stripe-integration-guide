import express, { Request, Response } from "express";
import dotenv from "dotenv";
import Stripe from "stripe";

// Environment config
dotenv.config();

// Stripe initialization
let _stripe: Stripe | null = null;
export const getStripe = (): Stripe => {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_TEST_KEY as string);
  }
  return _stripe;
};

// create an express app
const app = express();

// Stripe webhook to listen for events
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      if (endpointSecret) {
        // Get the signature sent by Stripe
        const signature = req.headers["stripe-signature"];

        if (!signature) {
          throw new Error("Missing Stripe signature");
        }

        const event = getStripe().webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret
        );

        switch (event.type) {
          case "checkout.session.completed": {
            const checkoutSession = event.data.object;

            const {
              currency,
              subscription,
              amount_total,
              status,
              payment_status,
              metadata,
              created,
            } = checkoutSession;

            // Get order ID from metadata
            const orderId = metadata;

            // Mark order as complete based on the payment_status
            if (payment_status == "paid") {
              //
            } else {
              //
            }

            break;
          }

          default:
            console.log(`⚡️ Unhandled Stripe Webhook ->  ${event.type}`);
        }

        res.json({ received: true });
      } else {
        res.status(500).json({ message: "Something went wrong" });
      }
    } catch (error: any) {
      console.error(`Webhook error: ${error?.message}`);
      res.status(400).send(`Webhook error: ${error?.message}`);
    }
  }
);

// Express Middleware setup
app.use(express.json());

const port = process.env.PORT || 3001;

// Default Route
app.get("/", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Our express app is live!",
  });
});

// POST  /checkout to process incoming payment requests from client
app.post("/checkout", async (req: Request, res: Response) => {
  /*  
  gain product information by id from request, calculate final price using quantity
  */

  const product: { id: number; name: string; priceInCents: number } = {
    id: 1,
    name: "Sunglasses",
    priceInCents: 4500,
  };

  // Create an order id and mark as unpaid
  const orderId = Math.floor(Math.random() * 1000);

  try {
    const session = await getStripe().checkout.sessions.create({
      currency: "usd",
      metadata: {
        productName: product?.name,
        productId: product?.id,
        orderId: orderId,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product?.name,
              metadata: product,
            },
            unit_amount: product.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment", // other modes are 'subscription' and 'setup'
      success_url: `http://localhost:3000/checkout?status=failed`,
      cancel_url: `http://localhost:3000/checkout?status=failed`,
    });

    res.status(200).json({ checkoutUrl: session.url });
  } catch (e) {
    console.log("e", e);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server up and running on port: ${port}`);
});

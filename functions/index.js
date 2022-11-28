const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const functions = require("firebase-functions/v1");
const credentials = require("./credentials.json");
const {Stripe} = require("stripe");
const stripe = new Stripe(credentials.stripe.secret, {
  apiVersion: "2020-08-27",
});

exports.calendar_functions = require("./calendar/calendar-functions");

exports.handleStripeWebhookEvents = functions
    .region("us-west2")
    .https
    .onRequest((request, response) => {
      let event;
      try {
        event = stripe.webhooks.constructEvent(
            request.rawBody,
            request.headers["stripe-signature"],
            credentials.stripe.signing);
      } catch (err) {
        return response.status(400).send();
      }

      if (event.type === "customer.subscription.updated") {
        const updatedSubscription = event.data.object;
        const previousSubscription = event.data.previous_attributes;

        if (previousSubscription.status === "trialing" &&
        updatedSubscription.status === "active") {
          const discounts = [];
          // isReferral is set in StripeSubscriptionCreate in frontend
          if (updatedSubscription.metadata.isReferral === "true") {
            discounts.push({"coupon": "ambassador20"});
          }
          if (updatedSubscription.metadata.isReferral === "free") {
            discounts.push({"coupon": "ambassador100"});
          }

          stripe.prices.list({active: true, type: "one_time"})
              .then((signupPriceList) => {
                const signupPriceId = signupPriceList.data.find(
                    (price) => price.metadata.id === "initiation",
                );
                if (signupPriceId === undefined) {
                  throw new Error("No price with metadata id initiation");
                }
                console.log(signupPriceId);
                return signupPriceId;
              })
              .then((signupPriceId) => {
                stripe.invoiceItems.create({
                  customer: updatedSubscription.customer,
                  price: signupPriceId,
                  discounts: [],
                });
                stripe.invoices.create({
                  customer: updatedSubscription.customer,
                  auto_advance: true,
                });
              })
              .catch((err) => {
                console.error(err.message);
              });
        }
      }

      response.status(200).send();
    });

exports.sendEmailForNewUser = functions
    .region("us-west2")
    .auth
    .user()
    .onCreate((user) => {
      return db.collection("mail").add({
        to: [user.email, "success.academy.us@gmail.com"],
        message: {
          subject: "Success Academy - 登録確認しました",
          text: "ご登録ありがとうございます。",
          html: "<h1>ご登録ありがとうございます。</h1>",
        },
      });
    });

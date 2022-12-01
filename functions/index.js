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
    .onRequest(async (request, response) => {
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

          const priceList =
            await stripe.prices.list({active: true, type: "one_time"});
          const signupPriceId = priceList.data.find(
              (price) => price.metadata.id === "initiation").id;
          if (signupPriceId === undefined) {
            response.status(500).send("No price with metadata id initiation");
          }
          stripe.invoiceItems.create({
            customer: updatedSubscription.customer,
            price: signupPriceId,
            discounts: [],
          });
          stripe.invoices.create({
            customer: updatedSubscription.customer,
            auto_advance: true,
          });
        }
      }

      if (event.type === "charge.succeeded") {
        const priceList =
            await stripe.prices.list({active: true, type: "one_time"});
        const pointPriceId = priceList.data.find(
            (price) => price.metadata.id === "point").id;
        if (pointPriceId === undefined) {
          response.status(500).send("No price with metadata id point");
        }
        const charge = event.data.object;
        if (charge.metadata.priceId === pointPriceId) {
          const doc = db.collection("myUsers")
              .doc(charge.metadata.userId)
              .collection("student_profiles")
              .doc(charge.metadata.profileId);
          const docData = await doc.get();
          if (!docData.exists) {
            response.status(500).send("Document does not exist");
          }
          await doc.update({
            num_points: docData.get("num_points") + charge.amount,
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

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
          if (updatedSubscription.metadata.is_referral === "true") {
            discounts.push({"coupon": "ambassador20"});
          }
          if (updatedSubscription.metadata.is_referral === "free") {
            discounts.push({"coupon": "ambassador100"});
          }

          const priceList =
            await stripe.prices.list({active: true, type: "one_time"});
          const signupPriceId = priceList.data.find(
              (price) => price.metadata.id === "initiation").id;
          if (signupPriceId === undefined) {
            response.status(500)
                .send("No price with metadata: 'id: initiation'");
          }
          stripe.invoiceItems.create({
            customer: updatedSubscription.customer,
            price: signupPriceId,
            discounts: discounts,
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
          response.status(500).send("No price with metadata: 'id: point'");
        }
        const charge = event.data.object;
        if (charge.metadata.priceId === pointPriceId) {
          const doc = db.collection("myUsers")
              .doc(charge.metadata.userId)
              .collection("student_profiles")
              .doc(charge.metadata.profileId);
          const docData = await doc.get();
          if (!docData.exists) {
            response.status(500)
                .send("[charge.succeeded] student profile doc does not exist");
          }
          await doc.update({
            num_points: docData.get("num_points") + charge.amount,
          });
        }
      }

      if (event.type === "customer.subscription.created") {
        const subscription = event.data.object;
        const profileId = subscription.metadata.profile_id;

        const customerId = subscription.customer;
        const customer = await stripe.customers.retrieve(customerId);

        const studentsQuery = await db.collectionGroup("student_profiles")
            .get();
        const profile = studentsQuery.docs
            .find((doc) => doc.id === profileId);

        db.collection("mail").add({
          to: [customer.email, "success.academy.us@gmail.com"],
          message: {
            subject: "Success Academy - 登録確認しました",
            html: `<p>
            ${profile.get("last_name")} ${profile.get("first_name")}様
            <br>
            サクセス・アカデミーに会員登録いただきありがとうございました！<br>
            会員向けフリーレッスンの参加手順について、簡単にご説明させていただきます。<br>
            <br>
            <body>
                <p>
                    <h4>(1)会員登録14日後に月会費の自動決済が始まります</h4>
                    登録いただいてから14日間は、無料トライアル期間です。<br>
                    14日後は、月会費が自動決済されますので、ご了承ください。<br>
                    紹介コードなしでご登録された方は、月会費と一緒に体験後の入会費US$50もご請求させていただきます。<br>
                    キャンセルをご希望の場合は、トライアル中にマイページ上でお手続きください。<br><br>
                </p>
            
                <p>
                    <h4>(2)クラスへの参加方法</h4> 
                    会員向けフリーレッスンは、学年をこえて、クラス取り放題になっております。<br>
                    小学生クラス・中学生クラスはどなたでもご参加いただけます。<br>
                    お子様のレベルやスケジュールに合わせて、クラスにご参加ください！<br>
            
                    <br>
                    ※未就学児クラスはオプションですので、コース選択をしないとそれらのクラスにはご参加いただけません。<br>
                    また、未就学児クラスは人数制限をしており、全クラス予約が必要です。<br>
            
                    <br>
                    クラスへの参加手順は以下の通りです。<br>
                    （１）時間割を見て、参加したいクラスをチェックする。<br>
                    （２）クラスが始まる前までに、参加したいクラスで使用するプリントを印刷しておく。<br>
                    （印刷ができない場合は、ノートとペンがあれば大丈夫です！）<br>
                    （３）時間になったら、クラスに参加する。※ZOOMのビデオはオンにしてご参加ください。<br>
                    ★時間割・プリント・ZOOM情報は全てマイページ上にありますので、ご確認ください。<br><br>
                </p>
            
                <p>
                    <h4>(3)会員向けフリーレッスンのカリキュラムについて</h4>
                    当塾のフリーレッスンのカリキュラムは3ヶ月でワンクールとなっております。<br>
                    （通常、１年で学習する内容を３ヶ月にまとめています。）<br>
                    今クールは1月3日〜3月26日です。<br><br>
            
                    <a href="https://mailchi.mp/2520fc266eb0/12?e=1fb03b9cbc">過去のメルマガ（2020年12月号）</a>の『Message』にて、カリキュラムについての詳しい説明が記載されてますので、ご確認いただけると幸いです。<br>
                    また、最新のメルマガは<a href="https://docs.google.com/document/d/1fM2oD8FjPZtYxwIOfN5hk_wKvEuII4TW2P8YoL516Js/edit">こちら</a>からご確認ください！<br>
                    <br>
                    ご不明な点などありましたら、遠慮なくご連絡ください。<br>
                    よろしくお願いします。<br><br>
            
                    サクセス・アカデミー<br>
                    info@mercy-education.com
            
                </p>
            
            </body>
            
            </p>`,
          },
        });
      }

      response.status(200).send();
    });

// exports.sendEmailForNewUser = functions
//     .region("us-west2")
//     .auth
//     .user()
//     .onCreate((user) => {
//       return db.collection("mail").add({
//         to: [user.email, "success.academy.us@gmail.com"],
//         message: {
//           subject: "Success Academy - 登録確認しました",
//           text: "ご登録ありがとうございます。",
//           html: "<h1>ご登録ありがとうございます。</h1>",
//         },
//       });
//     });

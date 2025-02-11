/* eslint-disable max-len */
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const functions = require("firebase-functions/v1");
const calendarUtils = require("./calendar/calendar-utils");
const credentials = require("./credentials.json");
const {Stripe} = require("stripe");
const stripe = new Stripe(credentials.stripe.secret, {
  apiVersion: "2020-08-27",
});

exports.calendar_functions = require("./calendar/calendar-functions");

exports.handleStripeWebhookEvents = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
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
          if (updatedSubscription.metadata.referral_type === "twenty") {
            discounts.push({"coupon": "ambassador20"});
          } else if (updatedSubscription.metadata.referral_type === "fifty") {
            discounts.push({"coupon": "ambassador50"});
          } else if (updatedSubscription.metadata.referral_type === "free") {
            discounts.push({"coupon": "ambassador100"});
          }

          const priceList =
            await stripe.prices.list({active: true, type: "one_time"});
          const signupPriceId = priceList.data.find(
              (price) => price.lookup_key === "sign_up_fee").id;
          if (signupPriceId === undefined) {
            response.status(500)
                .send("No price with lookup_key: sign_up_fee");
          }
          stripe.invoiceItems.create({
            customer: updatedSubscription.customer,
            price: signupPriceId,
            discounts: discounts,
            subscription: updatedSubscription.id,
          });
          stripe.invoices.create({
            customer: updatedSubscription.customer,
            auto_advance: true,
            subscription: updatedSubscription.id,
          });
        }
      }

      if (event.type === "charge.succeeded") {
        const priceList =
            await stripe.prices.list({active: true});
        const pointPriceId = priceList.data.find(
            (price) => price.lookup_key === "point_one_time").id;
        if (pointPriceId === undefined) {
          response.status(500).send("No price with lookup_key: point_one_time");
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
            num_points: docData.get("num_points") + parseInt(charge.metadata.numPoints),
          });
        }
      }

      if (event.type === "invoice.paid") {
        const invoice = event.data.object;
        const pointPlanItem = invoice.lines.data.find((item) => item.plan.metadata.id.includes("point"));
        if (pointPlanItem != undefined) {
          const pointQuantity = pointPlanItem.quantity;
          console.log("pointQuantity: " + pointQuantity);

          const profileId = invoice.subscription_details.metadata.profile_id;
          const studentsQuery = await db.collectionGroup("student_profiles").get();
          const studentProfile = studentsQuery.docs.find((doc) => doc.id === profileId);
          await studentProfile.ref.update({
            num_points: studentProfile.get("num_points") + parseInt(pointQuantity),
          });
        } else {
          console.log("No point plan");
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
                    今クールは4月3日〜6月24日です。<br><br>
            
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

exports.email_attendees = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall(async (data, context) => {
      const recipientList = ["success.academy.us@gmail.com"];
      const timeZoneList = ["Asia/Tokyo"];

      const teacherProfile = (await db.collectionGroup("teacher_profile")
          .get()).docs.find((doc) => doc.id === data.teacherId);
      if (teacherProfile != undefined) {
        const teacherUser = await teacherProfile.ref.parent.parent.get();
        recipientList.push(teacherUser.get("email"));
        timeZoneList.push(teacherUser.get("time_zone"));
      }

      const studentProfile = (await db.collectionGroup("student_profiles")
          .get()).docs.find((doc) => doc.id === data.studentId);
      if (studentProfile != undefined) {
        const studentUser = await studentProfile.ref.parent.parent.get();
        recipientList.push(studentUser.get("email"));
        timeZoneList.push(studentUser.get("time_zone"));
      }

      const studentName = `${studentProfile.get("last_name")} ${studentProfile.get("first_name")}`;
      const startTimes = timeZoneList.map((tz) => `<p><b>${tz}</b> ${new Date(data.startTime).toLocaleString("ja-JP", {timeZone: tz})}</p>`).join("");
      const endTimes = timeZoneList.map((tz) => `<p><b>${tz}</b> ${new Date(data.endTime).toLocaleString("ja-JP", {timeZone: tz})}</p>`).join("");

      if (data.isCancel) {
        db.collection("mail").add({
          to: recipientList,
          message: {
            subject: "Success Academy - レッスン予約キャンセル確認 - Lesson Cancellation",
            html:
            `<div>
              <p><b>${data.summary}</b> の予約をキャンセルしました。</p>
            </div>
            <div>
              <p><b>生徒：</b>${studentName}</p>
              <p><b>レッスン説明：</b>${data.description}</p>
              <h3>開始時間</h3>
              ${startTimes}
              <h3>終了時間</h3>
              ${endTimes}
            </div>
            <hr/>
            <div>
              <p><b>${data.summary}</b> Cancel Confirmation</p>
            </div>
            <div>
              <p><b>Student: </b>${studentName}</p>
              <p><b>Lesson description: </b>${data.description}</p>
              <h3>Start time</h3>
              ${startTimes}
              <h3>End time</h3>
              ${endTimes}
            </div>`,
          },
        });
      } else {
        db.collection("mail").add({
          to: recipientList,
          message: {
            subject: "Success Academy - レッスン予約確認 - Lesson Confirmation",
            html:
            `<div>
              <p><b>${data.summary}</b> の予約が確認されました。</p>
            </div>
            <div>
              <p><b>生徒：</b>${studentName}</p>
              <p><b>レッスン説明：</b>${data.description}</p>
              <h3>開始時間</h3>
              ${startTimes}
              <h3>終了時間</h3>
              ${endTimes}
            </div>
            <hr/>
            <div>
              <p><b>${data.summary}</b> Signup Confirmation</p>
            </div>
            <div>
              <p><b>Student:</b>${studentName}</p>
              <p><b>Lesson description:</b>${data.description}</p>
              <h3>Start time</h3>
              ${startTimes}
              <h3>End time</h3>
              ${endTimes}
            </div>`,
          },
        });
      }
    });

exports.send_reminder_emails = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .pubsub
    .schedule("every 30 minutes")
    .onRun(async (context) => {
      const startTime = new Date(Date.now());
      const endTime = new Date(startTime.getTime() + 86400000); // 24 hours
      const query = {
        calendarId: "primary",
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
      };
      const events = await calendarUtils.listEvents(query);
      for (const event of events) {
        if (event?.extendedProperties?.shared?.eventType === "private" &&
            event?.extendedProperties?.private?.reminderSent !== "true") {
          const recipientList = ["success.academy.us@gmail.com"];
          const timeZoneList = ["Asia/Tokyo"];

          const teacherId = event?.extendedProperties?.shared?.teacherId;
          if (teacherId !== undefined) {
            const teacherProfile = (await db.collectionGroup("teacher_profile")
                .get()).docs.find((doc) => doc.id === teacherId);
            if (teacherProfile != undefined) {
              const teacherUser = await teacherProfile.ref.parent.parent.get();
              recipientList.push(teacherUser.get("email"));
              timeZoneList.push(teacherUser.get("time_zone"));
            }
          }

          let hasStudents = false;
          const studentIds = JSON.parse(event?.extendedProperties?.shared?.studentIdList);
          if (studentIds !== undefined) {
            for (const id of studentIds) {
              hasStudents = true;
              const studentProfile = (await db.collectionGroup("student_profiles")
                  .get()).docs.find((doc) => doc.id === id);
              if (studentProfile != undefined) {
                const studentUser = await studentProfile.ref.parent.parent.get();
                recipientList.push(studentUser.get("email"));
                timeZoneList.push(studentUser.get("time_zone"));
              }
            }
          }

          const startTimes = timeZoneList.map((tz) => `<p><b>${tz}</b> ${new Date(event.start.dateTime).toLocaleString("ja-JP", {timeZone: tz})}</p>`).join("");
          const endTimes = timeZoneList.map((tz) => `<p><b>${tz}</b> ${new Date(event.end.dateTime).toLocaleString("ja-JP", {timeZone: tz})}</p>`).join("");

          if (hasStudents) {
            db.collection("mail").add({
              to: recipientList,
              message: {
                subject: "Success Academy - レッスン・リマインド",
                html:
                `<div>
                  <p><b>${event.summary}</b> 予約したレッスンが明日あります。</p>
                </div>
                <div>
                  <p><b>レッスン説明：</b>${event.description}</p>
                  <h3>開始時間</h3>
                  ${startTimes}
                  <h3>終了時間</h3>
                  ${endTimes}
                </div>
                <hr/>
                <div>
                  <p><b>${event.summary}</b> You have a lesson tomorrow.</p>
                </div>
                <div>
                  <p><b>Lesson description:</b>${event.description}</p>
                  <h3>Start time</h3>
                  ${startTimes}
                  <h3>End time</h3>
                  ${endTimes}
                </div>`,
              },
            });

            const eventData = {
              calendarId: "primary",
              eventId: event.id,
            };
            calendarUtils.patchEvent(eventData)
                .then((data) => data)
                .catch((err) => {
                  console.error(err);
                  throw new functions.https.HttpsError("internal", err);
                });
          }
        }
      }
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

exports.update_subscription = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      if (data.deleted) {
        return stripe.subscriptions.retrieve(data.id).then((subscription) => {
          const itemId = subscription.items.data.find((item) => item.plan.id === data.priceId).id;
          return stripe.subscriptions.update(data.id, {
            items: [
              {
                id: itemId,
                deleted: true,
              },
            ],
          });
        }).catch((err) => {
          throw new functions.https.HttpsError("internal", err);
        });
      } else {
        const updateItems = [
          {
            price: data.priceId,
            quantity: data.quantity,
          },
        ];
        return stripe.subscriptions.retrieve(data.id).then((subscription) => {
          const item = subscription.items.data.find((item) => item.plan.id === data.existingPriceId);
          if (item !== undefined) {
            updateItems.push({
              id: item.id,
              deleted: true,
            });
          }

          return stripe.subscriptions.update(data.id, {
            items: updateItems,
            proration_behavior: "none",
          });
        }).catch((err) => {
          throw new functions.https.HttpsError("internal", err);
        });
      }
    });

exports.verifyUser = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall(async (data, context) => {
      admin.auth().updateUser(data.uid, {emailVerified: true}).then((userRecord) => console.log("Successfully verified user")).catch((error) => console.log("Failed to verify user"));
    });

exports.updateEmail = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall(async (data, context) => {
      admin.auth().updateUser(data.uid, {email: data.email}).then((userRecord) => console.log("Successfully updated email")).catch((error) => console.log("Failed to update email: " + error));
    });

const admin = require("firebase-admin");
const db = admin.firestore();
const functions = require("firebase-functions/v1");
const calendarUtils = require("./calendar-utils");

// eslint-disable-next-line max-len
const testCalendarId = "3313765c4e9242a84e058797b11437b1ab1034a05ba19e1d4885aa9cf0838195@group.calendar.google.com";

/** Returns calendar ID.
 * @param {boolean} isDev If true, returns calendar ID of test calendar.
 * @return {String} The calendar ID.
 */
function getCalendarId(isDev = false) {
  if (isDev) {
    return testCalendarId;
  }
  return "primary";
}

/** Maybe refunds points to the list of students in an event.
 * @param {Array} event The event with points and containing a list of students.
 */
async function maybeRefundPoints(event) {
  const studentIdList = event.extendedProperties.shared.studentIdList;
  const numPoints = event.extendedProperties.shared.numPoints;
  if (numPoints == 0 || studentIdList.length == 0) {
    return;
  }

  if ("recurrence" in event) {
    // TODO: Implement point refund for deleted recurrence event.
  } else {
    // TODO: The points refund doesn't take into account free lesson discount.
    const studentsQuery = await db.collectionGroup("student_profiles").get();
    studentsQuery.docs.filter(
        (doc) => studentIdList.includes(doc.id))
        .forEach(async (profile) => {
          await profile.ref.update({
            num_points: profile.get("num_points") + parseInt(numPoints),
          });
        });
  }
}

exports.insert_event = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: getCalendarId(data.isDev),
        eventType: data.eventType,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
        numPoints: data.numPoints,
      };

      return calendarUtils.insertEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.update_event = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: getCalendarId(data.isDev),
        eventId: data.eventId,
        eventType: data.eventType,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
        numPoints: data.numPoints,
      };

      return calendarUtils.updateEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.get_event = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const query = {
        calendarId: getCalendarId(data.isDev),
        eventId: data.eventId,
      };

      return calendarUtils.getEvent(query)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.list_events = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const query = {
        calendarId: getCalendarId(data.isDev),
        timeZone: data.timeZone,
        timeMin: data.timeMin,
        timeMax: data.timeMax,
        singleEvents: data.singleEvents,
      };

      return calendarUtils.listEvents(query)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.list_instances = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const query = {
        calendarId: getCalendarId(data.isDev),
        eventId: data.eventId,
        timeZone: data.timeZone,
        timeMin: data.timeMin,
        timeMax: data.timeMax,
      };

      return calendarUtils.listInstances(query)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.delete_event = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const calendarId = getCalendarId(data.isDev);

      return Promise.all([
        calendarUtils.getEvent({
          calendarId: calendarId,
          eventId: data.eventId,
        }).then(
            (event) => maybeRefundPoints(event),
        ),
        calendarUtils.deleteEvent({
          calendarId: calendarId,
          eventId: data.eventId,
        }),
      ]).catch((err) => {
        console.error(err);
        throw new functions.https.HttpsError("internal", err);
      });
    });

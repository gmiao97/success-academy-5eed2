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
          .then((result) => result)
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
          .then((result) => result)
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
      return calendarUtils.deleteEvent({
        calendarId: getCalendarId(data.isDev),
        eventId: data.eventId,
      })
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

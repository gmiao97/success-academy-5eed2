const functions = require("firebase-functions/v1");
const calendarUtils = require("./calendar-utils");

exports.insert_event = functions
    .region("us-west2")
    .runWith({timeoutSeconds: 60, memory: "8GB"})
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: "primary",
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
        calendarId: "primary",
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
        calendarId: "primary",
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
        calendarId: "primary",
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
        calendarId: "primary",
        eventId: data.eventId})
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

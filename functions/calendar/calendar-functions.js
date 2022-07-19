const functions = require("firebase-functions/v1");
const calendarUtils = require("./calendar-utils");

const FREE_LESSON_CALENDAR_ID =
  "a1v2bktm2g9rgariippf2ivhms@group.calendar.google.com";
const PRESCHOOL_LESSON_CALENDAR_ID =
"fs4hea6n2s3s7deh2ujc710lfk@group.calendar.google.com";
const PRIVATE_LESSON_CALENDAR_ID =
"mq9nrjs0mov9adb6rgfdssigsk@group.calendar.google.com";


exports.addEventToFreeLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: FREE_LESSON_CALENDAR_ID,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.addEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.addEventToPreschoolLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: PRESCHOOL_LESSON_CALENDAR_ID,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.addEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.addEventToPrivateLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: PRIVATE_LESSON_CALENDAR_ID,
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

      return calendarUtils.addEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.updateEventInFreeLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: FREE_LESSON_CALENDAR_ID,
        eventId: data.eventId,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.updateEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.updateEventInPreschoolLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: PRESCHOOL_LESSON_CALENDAR_ID,
        eventId: data.eventId,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.updateEvent(eventData)
          .then((data) => data)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.updateEventInPrivateLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: PRIVATE_LESSON_CALENDAR_ID,
        eventId: data.eventId,
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

exports.listEventsFromFreeLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const query = {
        calendarId: FREE_LESSON_CALENDAR_ID,
        timeZone: data.timeZone,
        timeMin: data.timeMin,
        timeMax: data.timeMax,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.getEvents(query)
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.listEventsFromPreschoolLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const query = {
        calendarId: PRESCHOOL_LESSON_CALENDAR_ID,
        timeZone: data.timeZone,
        timeMin: data.timeMin,
        timeMax: data.timeMax,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.getEvents(query)
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.listEventsFromPrivateLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const query = {
        calendarId: PRIVATE_LESSON_CALENDAR_ID,
        timeZone: data.timeZone,
        timeMin: data.timeMin,
        timeMax: data.timeMax,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return calendarUtils.getEvents(query)
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.deleteEventFromFreeLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      return calendarUtils.deleteEvent({
        calendarId: FREE_LESSON_CALENDAR_ID,
        eventId: data.eventId})
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.deleteEventFromPreschoolLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      return calendarUtils.deleteEvent({
        calendarId: PRESCHOOL_LESSON_CALENDAR_ID,
        eventId: data.eventId})
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.deleteEventFromPrivateLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      return calendarUtils.deleteEvent({
        calendarId: PRIVATE_LESSON_CALENDAR_ID,
        eventId: data.eventId})
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

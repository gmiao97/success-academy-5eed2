const {google} = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar("v3");
const functions = require("firebase-functions");
const randomstring = require("randomstring");

const googleCredentials = require("./credentials.json");
const FREE_LESSON_CALENDAR_ID =
  "a1v2bktm2g9rgariippf2ivhms@group.calendar.google.com";
const PRESCHOOL_LESSON_CALENDAR_ID =
"fs4hea6n2s3s7deh2ujc710lfk@group.calendar.google.com";
const PRIVATE_LESSON_CALENDAR_ID =
"mq9nrjs0mov9adb6rgfdssigsk@group.calendar.google.com";

/** Adds a new event
 * @param {Object} event The parameters for event creation.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
function addEvent(event) {
  return new Promise((resolve, reject) => {
    calendar.events.insert({
      auth: buildAuth(),
      calendarId: event.calendarId,
      conferenceDataVersion: 1,
      requestBody: buildResource(event),
    }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.data);
      }
    });
  });
}

/** Updates an event
 * @param {Object} event The parameters for event update.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
function updateEvent(event) {
  return new Promise((resolve, reject) => {
    calendar.events.update({
      auth: buildAuth(),
      calendarId: event.calendarId,
      eventId: event.eventId,
      conferenceDataVersion: 1,
      requestBody: buildResource(event),
    }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.data);
      }
    });
  });
}

/** Deletes an event
 * @param {Object} event The parameters for event deletion.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
function deleteEvent(event) {
  return new Promise((resolve, reject) => {
    calendar.events.delete({
      auth: buildAuth(),
      calendarId: event.calendarId,
      eventId: event.eventId,
    }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.data);
      }
    });
  });
}

/**
 * Gets events with start time between {@param timeMin} and {@param timeMax}
 * @param {Object} query
 * @return {Promise}
 */
function getEvents(query) {
  const params = {
    auth: buildAuth(),
    calendarId: query.calendarId,
    orderBy: "startTime",
    singleEvents: true,
  };
  query.timeZone && (params.timeZone = query.timeZone);
  query.timeMin && (params.timeMin = query.timeMin);
  query.timeMax && (params.timeMax = query.timeMax);

  params.sharedExtendedProperty = [];
  if (query.studentIdList) {
    for (const studentId of query.studentIdList) {
      params.sharedExtendedProperty.push(`${studentId}=student`);
    }
  }
  query.teacherId &&
    (params.sharedExtendedProperty.push(`${query.teacherId}=teacher`));

  return new Promise((resolve, reject) => {
    calendar.events.list(params,
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.data.items);
          }
        });
  });
}

/**
 * @param {Object} event The parameters for event creation.
 * @return {Object} An object representing the event resource
 */
function buildResource(event) {
  const resource = {};

  if (event.startTime) {
    resource.start = {dateTime: event.startTime};
    event.timeZone && (resource.start.timeZone = event.timeZone);
  }
  if (event.endTime) {
    resource.end = {dateTime: event.endTime};
    event.timeZone && (resource.end.timeZone = event.timeZone);
  }

  event.eventName && (resource.summary = event.eventName);
  event.description && (resource.description = event.description);
  resource.anyoneCanAddSelf = true;
  resource.guestsCanInviteOthers = false;
  resource.conferenceData = {
    createRequest: {requestId: randomstring.generate(10)},
  },
  event.recurrence && (resource.recurrence = event.recurrence);

  if (event.teacherId) {
    resource.extendedProperties = {...resource.extendedProperties};
    resource.extendedProperties.shared = {...resource.extendedProperties.shared,
      [event.teacherId]: "teacher"};
  }
  if (event.studentIdList) {
    resource.extendedProperties = {...resource.extendedProperties};
    const studentIdExtendedProperties = {};
    for (const studentId of event.studentIdList) {
      studentIdExtendedProperties[studentId] = "student";
    }
    resource.extendedProperties.shared = {...resource.extendedProperties.shared,
      ...studentIdExtendedProperties};
  }
  if (event.numPoints) {
    resource.extendedProperties = {...resource.extendedProperties};
    resource.extendedProperties.shared = {...resource.extendedProperties.shared,
      numPoints: event.numPoints};
  }

  return resource;
}

/**
 * @return {OAuth2Client}
 */
function buildAuth() {
  const oAuth2Client = new OAuth2(
      googleCredentials.web.client_id,
      googleCredentials.web.client_secret,
      googleCredentials.web.redirect_uris[0],
  );
  oAuth2Client.setCredentials({
    refresh_token: googleCredentials.refresh_token,
  });
  return oAuth2Client;
}

exports.addEventToFreeLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      const eventData = {
        calendarId: FREE_LESSON_CALENDAR_ID,
        eventName: data.eventName,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
      };

      return addEvent(eventData)
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
        eventName: data.eventName,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return addEvent(eventData)
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
        eventName: data.eventName,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
        numPoints: data.numPoints,
      };

      return addEvent(eventData)
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
        eventName: data.eventName,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
      };

      return updateEvent(eventData)
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
        eventName: data.eventName,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
      };

      return updateEvent(eventData)
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
        eventName: data.eventName,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: data.timeZone,
        recurrence: data.recurrence,
        teacherId: data.teacherId,
        studentIdList: data.studentIdList,
        numPoints: data.numPoints,
      };

      return updateEvent(eventData)
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
      };

      return getEvents(query)
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
        studentIdList: data.studentIdList,
        teacherId: data.teacherId,
      };

      return getEvents(query)
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
        studentIdList: data.studentIdList,
        teacherId: data.teacherId,
      };

      return getEvents(query)
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
      return deleteEvent({
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
      return deleteEvent({
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
      return deleteEvent({
        calendarId: PRIVATE_LESSON_CALENDAR_ID,
        eventId: data.eventId})
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

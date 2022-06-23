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

/**
 * Gets events with start time between {@param timeMin} and {@param timeMax}
 * @param {string} calendarId
 * @param {string} timeZone Time zone used in the response.
 * @param {string} timeMin Lower bound (exclusive) for an event's end time.
 * @param {string} timeMax Upper bound (exclusive) for an event's start time.
 * @return {Promise}
 */
function getEvents(calendarId, timeZone, timeMin, timeMax) {
  const params = {
    auth: buildAuth(),
    calendarId: calendarId,
    orderBy: "startTime",
    singleEvents: true,
    timeZone: timeZone,
  };
  timeMin && (params.timeMin = timeMin);
  timeMax && (params.timeMax = timeMax);

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

exports.listAllEventsFromFreeLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      return getEvents(
          FREE_LESSON_CALENDAR_ID,
          data.timeZone,
          data.timeMin,
          data.timeMax)
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.listAllEventsFromPreschoolLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      return getEvents(
          PRESCHOOL_LESSON_CALENDAR_ID,
          data.timeZone,
          data.timeMin,
          data.timeMax)
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

exports.listAllEventsFromPrivateLessonCalendar = functions
    .region("us-west2")
    .https
    .onCall((data, context) => {
      return getEvents(
          PRIVATE_LESSON_CALENDAR_ID,
          data.timeZone,
          data.timeMin,
          data.timeMax)
          .then((result) => result)
          .catch((err) => {
            console.error(err);
            throw new functions.https.HttpsError("internal", err);
          });
    });

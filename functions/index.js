const {google} = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar("v3");
const functions = require("firebase-functions");
const randomstring = require("randomstring");

const googleCredentials = require("./credentials.json");
const FREE_LESSON_CALENDAR_ID =
"a1v2bktm2g9rgariippf2ivhms@group.calendar.google.com";
// const PRESCHOOL_LESSON_CALENDAR_ID =
// "fs4hea6n2s3s7deh2ujc710lfk@group.calendar.google.com";
// const INDIVIDUAL_LESSON_CALENDAR_ID =
// "mq9nrjs0mov9adb6rgfdssigsk@group.calendar.google.com";

/** Adds a new event
 * @param {Object} event - The parameters for event creation.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
function addEvent(event) {
  return new Promise((resolve, reject) => {
    calendar.events.insert({
      auth: buildAuth(),
      calendarId: event.calendarId,
      conferenceDataVersion: 1,
      resource: buildResource(event),
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
 * @param {Object} event - The parameters for event creation.
 * @return {Object} An object representing the event resource
 */
function buildResource(event) {
  const resource = {};

  if (event.startTime) {
    resource.start = {...resource.start, dateTime: event.startTime};
    event.timeZone && (resource.start =
      {...resource.start, timeZone: event.timeZone});
  }
  if (event.endTime) {
    resource.end = {...resource.end, dateTime: event.endTime};
    event.timeZone && (resource.end =
      {...resource.end, timeZone: event.timeZone});
  }

  event.eventName && (resource.summary = event.eventName);
  event.description && (resource.description = event.description);
  resource.anyoneCanAddSelf = true;
  resource.guestsCanInviteOthers = false;
  resource.conferenceData = {
    createRequest: {requestId: randomstring.generate(10)},
  },
  event.recurrence && (resource.recurrence = event.recurrence);
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
    .onRequest((request, response) => {
      const eventData = {
        calendarId: FREE_LESSON_CALENDAR_ID,
        eventName: request.body.eventName,
        description: request.body.description,
        startTime: request.body.startTime,
        endTime: request.body.endTime,
        timeZone: request.body.timeZone,
        recurrence: request.body.recurrence,
      };

      addEvent(eventData).then((data) => {
        response.status(200).send(data);
        return;
      }).catch((err) => {
        console.error("Error adding event: " + err.message);
        response.status(500).send(err.message);
        return;
      });
    });

const {google} = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar("v3");
const randomstring = require("randomstring");
const credentials = require("../credentials.json");

// eslint-disable-next-line max-len
const listEventFields = "items(id,recurringEventId,summary,description,start,end,recurrence,extendedProperties)";
// eslint-disable-next-line max-len
const getEventFields = "id,recurringEventId,summary,description,start,end,recurrence,extendedProperties";

/** Adds a new event
 * @param {Object} event The parameters for event creation.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
exports.insertEvent = function(event) {
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
};

/** Updates an event
 * @param {Object} event The parameters for event update.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
exports.updateEvent = function(event) {
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
};

/** Patches an event
 * @param {Object} event The parameters for event update.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
exports.patchEvent = function(event) {
  return new Promise((resolve, reject) => {
    calendar.events.patch({
      auth: buildAuth(),
      calendarId: event.calendarId,
      eventId: event.eventId,
      conferenceDataVersion: 1,
      requestBody: {
        extendedProperties: {
          private: {
            reminderSent: "true",
          },
        },
      },
    }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.data);
      }
    });
  });
};

/** Deletes an event
 * @param {Object} event The parameters for event deletion.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
exports.deleteEvent = function(event) {
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
};

/**
 * Get event with eventId
 * @param {Object} query
 * @return {Promise}
 */
exports.getEvent = function(query) {
  const params = {
    auth: buildAuth(),
    calendarId: query.calendarId,
    eventId: query.eventId,
    fields: getEventFields,
  };

  return new Promise((resolve, reject) => {
    calendar.events.get(params,
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.data);
          }
        });
  });
};

/**
 * Gets events with start time between {@param timeMin} and {@param timeMax}
 * @param {Object} query
 * @return {Promise}
 */
exports.listEvents = function(query) {
  const params = {
    auth: buildAuth(),
    calendarId: query.calendarId,
    singleEvents: query.singleEvents,
    maxResults: 2500,
    fields: listEventFields,
  };
  query.timeZone && (params.timeZone = query.timeZone);
  query.timeMin && (params.timeMin = query.timeMin);
  query.timeMax && (params.timeMax = query.timeMax);

  return new Promise((resolve, reject) => {
    console.log("Sending list events request to Google Calendar API");
    calendar.events.list(params,
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            console.log("Received response from Google Calendar API");
            resolve(res.data.items);
          }
        });
  });
};

/**
 * @param {Object} event The parameters for event creation.
 * @return {Object} An object representing the event resource
 */
function buildResource(event) {
  const resource = {};
  resource.extendedProperties = {
    shared: {
      eventType: event.eventType,
    },
  };

  resource.start = {
    dateTime: event.startTime,
    timeZone: event.timeZone,
  };
  resource.end = {
    dateTime: event.endTime,
    timeZone: event.timeZone,
  };
  resource.summary = event.summary;
  resource.description = event.description;
  resource.anyoneCanAddSelf = true;
  resource.guestsCanInviteOthers = false;
  resource.conferenceData = {
    createRequest: {requestId: randomstring.generate(10)},
  },
  event.recurrence && (resource.recurrence = event.recurrence);

  event.teacherId &&
    (resource.extendedProperties.shared.teacherId = event.teacherId);
  event.studentIdList &&
    (resource.extendedProperties.shared.studentIdList =
      JSON.stringify(event.studentIdList));
  event.numPoints &&
    (resource.extendedProperties.shared.numPoints = event.numPoints);

  return resource;
}

/**
 * @return {OAuth2Client}
 */
function buildAuth() {
  const oAuth2Client = new OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0],
  );
  oAuth2Client.setCredentials({
    refresh_token: credentials.refresh_token,
  });
  return oAuth2Client;
}

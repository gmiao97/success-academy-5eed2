const {google} = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar("v3");
const randomstring = require("randomstring");
const credentials = require("../credentials.json");

/** Adds a new event
 * @param {Object} event The parameters for event creation.
 * @return {Promise} A promise indicating result of calling Google Calendar
 * API
 */
exports.addEvent = function(event) {
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
 * Gets events with start time between {@param timeMin} and {@param timeMax}
 * @param {Object} query
 * @return {Promise}
 */
exports.getEvents = function(query) {
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
};

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

  event.summary && (resource.summary = event.summary);
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
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0],
  );
  oAuth2Client.setCredentials({
    refresh_token: credentials.refresh_token,
  });
  return oAuth2Client;
}

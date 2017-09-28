// Flight statuses for departing flights
const DEPARTING_STATUSES = {
  SCH: { text: 'Scheduled',      mood:  0 },
  DEL: { text: 'Delayed',        mood: -1 },
  WIL: { text: 'Wait in Lounge', mood:  0 },
  GTO: { text: 'Gate',           mood:  0 },
  GCL: { text: 'Gate Open',      mood:  1 },
  GTD: { text: 'Gate Closed',    mood: -1 },
  GCH: { text: 'Gate Changed',   mood:  0 },
  BRD: { text: 'Boarding',       mood:  1 },
  DEP: { text: 'Departed',       mood:  0 },
  TOM: { text: 'Tomorrow',       mood: -1 },
  CNX: { text: 'Cancelled',      mood: -1 },
};

// Flight statuses for arriving flights
const ARRIVING_STATUSES = {
  SCH: { text: 'Scheduled',      mood:  0 },
  AIR: { text: 'Airborne',       mood:  0 },
  EXP: { text: 'Expected',       mood:  0 },
  FIR: { text: 'Flight inbound', mood:  0 },
  LND: { text: 'Landed',         mood:  1 },
  FIB: { text: 'FIBAG',          mood:  0 },
  ARR: { text: 'Arrived',        mood:  0 },
  DIV: { text: 'Diverted',       mood: -1 },
  CNX: { text: 'Cancelled',      mood: -1 },
  TOM: { text: 'Tomorrow',       mood: -1 }
};

class Flight {
  constructor(flight) {
    this.name = flight.flightName;
    this.time = flight.scheduleTime.split(':').splice(0, 2).join(':');
    this.gate = flight.gate;
    this.route = flight.route.destinations.join(' - ');

    var state = flight.publicFlightState.flightStates[0];
    var statusesNames = flight.flightDirection === 'D' ?  DEPARTING_STATUSES : ARRIVING_STATUSES;

    var status = statusesNames[state];
    var mood = '';
    switch (status.mood) {
      case 1:
        mood = 'positive';
        break;
      case -1:
        mood = 'negative';
        break;
    }

    this.status = `
      <span class="${mood}">${status.text}</span>
    `;
  }

  render() {
    return $(`
      <tr>
        <td>${this.name}</td>
        <td>${this.route}</td>
        <td>${this.time}</td>
        <td>${this.gate}</td>
        <td class="status">${this.status}</td>
      </tr>
    `);
  }
}

class FlightTable {
  constructor(domNode, options) {
    this.tableNode = $(domNode);
    this.tableBody = this.tableNode.find('tbody');

    this.direction = options.direction;

    this.page = 0;

    var now = Date.now();
    var startTime = new Date(now - 20 * 60 * 1000);
    this.startTimeFormatted = startTime.getHours() + ':' + startTime.getMinutes();

    this.endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    this.callLimit = 10;
  }

  updateFlight(flightDetails) {
    // Ignore if current flight is not main in codeshares
    if (flightDetails.mainFlight !== flightDetails.flightName) {
      return;
    }

    // Ignore if currect flight is not passenger flight
    if (flightDetails.serviceType !== 'J'
      && flightDetails.serviceType !== 'C') {
      return;
    }

    var flight = new Flight(flightDetails);
    this.tableBody.append(flight.render());
  }

  fetchFlights() {
    $.ajax({
      url: 'https://api.schiphol.nl/public-flights/flights',
      headers: {
        'ResourceVersion': 'v3',
      },
      dataType: 'json',
      data: {
        app_id: window.B.appId,
        app_key: window.B.appKey,
        flightdirection: this.direction,
        includedelays: true,
        scheduletime: this.startTimeFormatted,
        sort: '+scheduletime',
        page: this.page
      },
      context: this,
      success: function (data, status, xhr) {
        data.flights.forEach((flights) => {
          this.updateFlight(flights);
        });

        var lastFlight = data.flights[data.flights.length - 1];
        var lastFlightTime = new Date(`${lastFlight.scheduleDate} ${lastFlight.scheduleTime}`);

        if (this.endTime > lastFlightTime && --this.callLimit) {
          this.page++;
          this.fetchFlights();
        }
      }
    });
  }
}

const departuresFlightTable = new FlightTable(
  document.getElementById('flight-departures-table'),
  { direction: 'D' }
);
departuresFlightTable.fetchFlights();

const arrivalsFlightTable = new FlightTable(
  document.getElementById('flight-arrivals-table'),
  { direction: 'A' }
);
arrivalsFlightTable.fetchFlights();

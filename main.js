class Flight {
  constructor(flight) {
    this.name = flight.flightName;
    this.number = flight.flightName;
    this.date = flight.scheduleDate;
    this.time = flight.scheduleTime;
    this.datetime = Date.parse(flight.actualOffBlockTime);
    this.formattedString = this.datetime.toLocaleString();
    this.destinations = flight.route.destinations.toString();
    this.gate = flight.gate;
    this.terminal = flight.terminal;
    this.status = flight.publicFlightState.flightStates.toString();

    this.element = null;
  }

  update(flightDetails) {
    console.log('fligth updated:', flightDetails);
  }

  render() {
    /*
      <th>Terminal</th>
      <th>Flight Number</th>
      <th>Destination</th>
      <th>Time</th>
      <th>Gate</th>
      <th>Status</th>
    */
    this.element = $(`
      <tr>
        <td>${this.terminal}</td>
        <td>${this.number}</td>
        <td>${this.destinations}</td>
        <td>${this.time}</td>
        <td>${this.gate}</td>
        <td>${this.status}</td>
      </tr>
    `);
    return this.element[0];
  }

}

class FlightTable {
  constructor(headers) {
    this.headers = headers;
    this.flights = {};
  }

  render(tableElement) {
    if (!(tableElement instanceof HTMLTableElement)) {
      throw new Error('FlightTable#render: tableElement must be a <table>');
    }
    this.element = tableElement;
    this.tableHeader = tableElement.querySelector('thead');
  }

  update(flightDetails) {
    let flight = this.flights[flightDetails.flightName];
    if (!flight) {
      flight = this.flights[flightDetails.flightName] = new Flight(flightDetails);
    }

    flight.update(flightDetails);
    let flightNode = flight.render();

    this.element.appendChild(flightNode);
  }
}

const DEPARTING_STATUSES = {
  SCH: 'Scheduled',
  DEL: 'Delayed',
  WIL: 'Wait in Lounge',
  GTO: 'Gate',
  GCL: 'Gate Open',
  GTD: 'Gate Closed',
  GCH: 'Gate Changed',
  BRD: 'Boarding',
  DEP: 'Departed',
  TOM: 'Tomorrow',
  CNX: 'Cancelled'
};

const ARRIVING_STATUSES = {
  SCH: 'Scheduled',
  AIR: 'Airborne',
  EXP: 'Expected',
  FIR: 'Flight in Dutch airspace',
  LND: 'Landed',
  FIB: 'FIBAG',
  ARR: 'Arrived',
  DIV: 'Diverted',
  CNX: 'Cancelled',
  TOM: 'Tomorrow',
};

(function () {

  const flightTable = new FlightTable([
    'Time',
    'Number',
    'Destination'
  ]);

  flightTable.render(document.getElementById('flight-table'));

  $.ajax({
    url: 'https://api.schiphol.nl/public-flights/flights',
    headers: {
      'ResourceVersion': 'v3',
    },
    dataType: 'json',
    data: {
      app_id: window.B.app_id,
      app_key: window.B.app_key,
      flightdirection: 'D',
      includedelays: true,
      scheduletime: '12:00',
      sort: '+scheduletime',
      page: '0',
    },
    success: function(data, status, xhr) {
      let output = [];
      data.flights.forEach(function (flight) {
        output.push({
          flightName: flight.flightName,
          scheduleDate: flight.scheduleDate,
          scheduleTime: flight.scheduleTime,
          actualOffBlockTime: flight.actualOffBlockTime
        });

        flightTable.update(flight);
      });
      // console.table(output);
    },
    error: function () {
      console.error('Unable to fetch flight details. See Network tab');
    }
  });
})();



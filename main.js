/* global $ */
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
    this.status = flight.publicFlightState.flightStates
      .map(state => DEPARTING_STATUSES[state])
      .toString();

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

const FLIGHT_DIRECTIONS = {
  DEPARTING: 'D',
  ARRIVING: 'A'
};


class FlightApi {
  constructor({appId, appKey}) {
    this.appId = appId;
    this.appKey = appKey;
    this.destinationsCache = {};
  }
  
  // Direction: 'A' for arrival, 'D' for departure
  getFlights(direction, success, error) {

    $.ajax({
      url: 'https://api.schiphol.nl/public-flights/flights',
      headers: {
        'ResourceVersion': 'v3',
      },
      dataType: 'json',
      data: {
        app_id: this.appId,
        app_key: this.appKey,
        flightdirection: direction,
        includedelays: true,
        scheduletime: '12:00',
        sort: '+scheduletime',
        page: '0',
      },
      context: this,
      success: success,
      error: error
    });
  
  }
  
  getDestination(destinationCode, success, error) {
    
    // By caching the response we avoid calling the API multiple
    // times
    if (this.destinationsCache[destinationCode] != undefined ){
      success(this.destinationsCache[destinationCode]);
    } 
    
    let api = this;
    // get destinations here.
    $.ajax({
      url: 'https://api.schiphol.nl/public-flights/destinations/'+destinationCode,
      headers: {
        'ResourceVersion': 'v1',
      },
      dataType: 'json',
      data: {
        app_id: api.appId,
        app_key: api.appKey,
      },
      success: function(data, status, xhr) {
        console.log(xhr.getResponseHeader('Link'));
        console.log(data);
        
        let destination = {
          'city': data.city,
          'country': data.country
        };
        
        api.destinationsCache[destinationCode] = destination;

        success(destination);

      },
      error: function () {
        error();
      }
    });
  }
}


(function () {

  const flightTable = new FlightTable([
    'Time',
    'Number',
    'Destination'
  ]);

  flightTable.render(document.getElementById('flight-table'));

  const api = new FlightApi({
    appId: window.B.app_id,
    appKey: window.B.app_key
  });
  
  function getFlights() {
    api.getFlights(
      FLIGHT_DIRECTIONS.DEPARTING,
      (data) => { 
        data.flights.forEach(function (flight) {
          flightTable.update(flight);
        });
      }, 
      (error) => {
        console.log(error);
      }
    );
  }
  
  $('#refresh').click(getFlights);
  
  getFlights();
/*
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
  });*/
})();



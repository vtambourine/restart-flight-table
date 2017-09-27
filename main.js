/* global $ */

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

const FLIGHT_TYPES = {
  PASSENGER_LINE: 'J',
  PASSENGER_CHARTER: 'C',
  FREIGHT_LINE: 'F',
  FREIGHT_CHARTER: 'H'
}

class Flight {
  constructor(flight) {
    this.name = flight.flightName;
    this.number = flight.flightName;
    this.date = flight.scheduleDate;
    this.time = flight.scheduleTime;

    this.mainFlight = flight.mainFlight;

    this.datetime = Date.parse(flight.actualOffBlockTime);
    this.formattedString = this.datetime.toLocaleString();
    this.destinations = flight.route.destinations.join(' — ');
    this.gate = flight.gate || '';
    this.terminal = flight.terminal;
    this.status = flight.publicFlightState.flightStates
      .map(state => DEPARTING_STATUSES[state])
      .join(' | ');

    this.element = null;
  }

  update(flightDetails) {
    // console.log('fligth updated:', flightDetails);
  }

  render() {
    this.element = $(`
      <tr>
        <td class="flight-number">${this.number}</td>
        <td>${this.destinations}</td>
        <td>${this.time}</td>
        <td  class="gate">${this.gate}</td>
        <td  class="status">${this.status}</td>
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
    if (flightDetails.mainFlight !== flightDetails.flightName) {
      return;
    }

    if (
      flightDetails.serviceType !== FLIGHT_TYPES.PASSENGER_LINE &&
      flightDetails.serviceType !== FLIGHT_TYPES.PASSENGER_CHARTER
    ) {
      return;
    }

    let flight = this.flights[flightDetails.flightName];


    if (!flight) {
      flight = this.flights[flightDetails.flightName] = new Flight(flightDetails);
    }

    flight.update(flightDetails);
    let flightNode = flight.render();

    this.element.appendChild(flightNode);
  }

  has(flightId) {
    return !!this.flgihts[flightId]
  }
}

class Time {
  constructor(string) {
    let stringParts = string.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
    if (!stringParts || !stringParts[2]) {
      console.log(stringParts, string)
      throw new Error('Invalid Time');
    }

    this.hours = stringParts[1];
    this.minutes = '0' + stringParts[2];
    this.seconds = stringParts[3];
    console.log(this.minutes.length)
    if (this.minutes.length <= 1) {
      this.minutes = '0' + this.minutes;
    }

    console.log(this.minutes)
  }

  format() {
    return this.hours + ':' + this.minutes + (this.seconds ? ':' + this.seconds : '');
  }

  valueOf() {
    return (this.seconds || 0) + this.minutes * 60 + this.hours * 3600;
  }
}

class FlightApi {
  constructor({appId, appKey}) {
    this.appId = appId;
    this.appKey = appKey;
    this.destinationsCache = {};

    let now = Date.now();
    // Now - 5 hours
    let startTime = new Date(now - 5 * 60 * 60 * 1000);
    this.startTime = startTime.getHours() + ':' + startTime.getMinutes();

    // Start + 30 minutes
    let endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    this.endTimeRaw = endTime;
    this.endTime = endTime.getHours() + ':' + endTime.getMinutes();

    this.callLimit = 2;
  }
  
  // Direction: 'A' for arrival, 'D' for departure
  getFlights(direction, success, error, startTime) {
    startTime = startTime || this.startTime;
    console.log('fetch for', startTime)

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
        scheduletime: startTime,
        // scheduletime: '22:50',
        sort: '+scheduletime',
        page: '0',
      },
      context: this,
      success: function(data, status, xhr) {
        let lastFlight = data.flights[data.flights.length - 1];

        console.log(data.flights)
        // console.log(lastFlight);
        // let endTime = new Time(this.endTime);
        // let lastFlightTime = new Time(lastFlight.scheduleTime);
    
        let lastFlightTime = new Date(`${lastFlight.scheduleDate} ${lastFlight.scheduleTime}`);
    
        console.log(this.endTimeRaw > lastFlightTime);
        if (this.endTimeRaw > lastFlightTime && --this.callLimit) {
          this.getFlights(
            direction, 
            success, 
            error, 
            lastFlight.scheduleTime.replace(/:\d{2}$/, ''))
        }

        success.apply(this, arguments);
      },
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

  flightTable.render(document.getElementById('flight-departures-table'));

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
})();



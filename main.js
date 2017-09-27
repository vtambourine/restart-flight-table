/* global $ */

// Flight statuses for departing flights
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

// Flight statuses for arriving flights
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

// Flight directions
const FLIGHT_DIRECTIONS = {
  DEPARTING: 'D',
  ARRIVING: 'A'
};

// Service type of flight
const FLIGHT_TYPES = {
  PASSENGER_LINE: 'J',
  PASSENGER_CHARTER: 'C',
  FREIGHT_LINE: 'F',
  FREIGHT_CHARTER: 'H'
}

/**
 * Represents single flight. Can be both arriving or departing
 */
class Flight {

  constructor(flight) {
    // Flight name
    this.name = flight.flightName;

    // Schedule date the commercial flgiht will be operated
    this.date = flight.scheduleDate;

    // Time of departure of the commercial flight
    this.time = flight.scheduleTime.split(':').splice(0, 2).join(':')

    // Main flight name in case of codeshare
    this.mainFlight = flight.mainFlight;

    // Number of scheduled gate
    this.gate = flight.gate || '';

    // Complete route of the flight
    this.route = flight.route.destinations.join(' — ');
    
    // List of public statuses fo the flight
    var statuses = flight.flightDirection === FLIGHT_DIRECTIONS.DEPARTING
      ? DEPARTING_STATUSES : ARRIVING_STATUSES;
    this.statuses = flight.publicFlightState.flightStates
      .map(state => statuses[state])
      .join(' | ');
  }

  renderNode(header) {
    return $(`
      <tr>
        ${header.map(key => {
          return `<td>${this[key]}</td>`
        })}
      </tr>
    `)[0]
  }

  render() {
    return $(`
      <tr>
        <td>${this.name}</td>
        <td>${this.route}</td>
        <td>${this.time}</td>
        <td>${this.gate}</td>
        <td>${this.statuses}</td>
      </tr>
    `)[0];
  }

}

class FlightTable {
  constructor(domNode, options) {
    this.flights = {};

    if (!(domNode instanceof HTMLTableElement)) {
      throw new Error('FlightTable expect <table> node as first argument');
    }
    this.tableNode = domNode;
    this.tableBody = this.tableNode.querySelector('tbody');

    this.direction = options.direction;
    this.api = new FlightApi(options.direction, {
      appId: window.B.app_id,
      appKey: window.B.app_key
    });

    this.headers = options.headers;
  }

  fetchFlights() {
    this.api.getFlights(
      (data) => {
        data.flights.forEach((flight) => {
          this.updateFlight(flight);
        });
      }, 
      (error) => {
        console.log(error);
      }
    );
  }

  updateFlight(flightDetails) {
    // Ignore if current flight is not main in codeshares
    if (flightDetails.mainFlight !== flightDetails.flightName) {
      return;
    }

    // Ignore if currect flight is not passenger flight
    if (flightDetails.serviceType !== FLIGHT_TYPES.PASSENGER_LINE
      && flightDetails.serviceType !== FLIGHT_TYPES.PASSENGER_CHARTER) {
      return;
    }

    let flight = this.flights[flightDetails.flightName];

    if (!flight) {
      flight = this.flights[flightDetails.flightName] = new Flight(flightDetails);
    }

    let flightNode = flight.render();

    this.tableBody.appendChild(flightNode);
  }
}

/**
 * Schiphol Airport API interface
 */
class FlightApi {
  constructor(direction, { appId, appKey }) {
    this.appId = appId;
    this.appKey = appKey;
    this.destinationsCache = {};

    this.direction = direction;

    // Show flights from 20 minutes behind...
    let now = Date.now();
    let startTime = new Date(now - 20 * 60 * 1000);
    this.startTimeFormatted = startTime.getHours() + ':' + startTime.getMinutes();

    // ...in one hour interval
    let endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    this.endTime = endTime;

    // this.flights = {};

    // Start from the first page of the response
    this.requestPage = 0;

    // Maximin call limit to prevent loops
    this.callLimit = 1;
  }
  
  // Direction: 'A' for arrival, 'D' for departure
  getFlights(success, error) {
    $.ajax({
      url: 'https://api.schiphol.nl/public-flights/flights',
      headers: {
        'ResourceVersion': 'v3',
      },
      dataType: 'json',
      data: {
        app_id: this.appId,
        app_key: this.appKey,
        flightdirection: this.direction,
        includedelays: true,
        scheduletime: this.startTimeFormatted,
        sort: '+scheduletime',
        page: this.requestPage,
      },
      context: this,
      success: function (data, status, xhr) {
        let lastFlight = data.flights[data.flights.length - 1];
        let lastFlightTime = new Date(`${lastFlight.scheduleDate} ${lastFlight.scheduleTime}`);
    
        if (this.endTime > lastFlightTime && --this.callLimit) {
          this.requestPage++;
          this.getFlights(success, error);
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

  const departuresFlightTable = new FlightTable(
    document.getElementById('flight-table-d'),
    { 
      direction: FLIGHT_DIRECTIONS.DEPARTING,
      headers: [
        'name',
        'route',
        'time',
        'gate',
        'statuses'
      ]
    }
  );

  departuresFlightTable.fetchFlights();
  $('#refresh-d').click(departuresFlightTable.fetchFlights);

  const arrivalsFlightTable = new FlightTable(
    document.getElementById('flight-table-a'),
    { 
      direction: FLIGHT_DIRECTIONS.ARRIVING,
      headers: [
        'name',
        'route',
        'time',
        'gate',
        'statuses'
      ] 
    }
  );
  arrivalsFlightTable.fetchFlights();
  $('#refresh-a').click(arrivalsFlightTable.fetchFlights);

})();

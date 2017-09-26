class Flight {
  constructor(flight) {
    this.name = flight.name;
    this.date = flight.scheduleDate;
    this.time = flight.scheduleTime;
    this.datetime = Date.parse(flight.actualOffBlockTime);
    this.formattedString = this.datetime.toLocaleString();

    this.element = null;
  }

  update(flightDetails) {
    console.log('fligth updated:', flightDetails.flightName);

    this.element.classList.add('updated');
  }

  render() {
    this.element = $(`
      <tr>
        <td>${this.time}</td>
        <td>${this.name}</td>
        <td>${'dest'}</td>
      </tr>
    `);
    return this.element;
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
  }
}

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
      // scheduledate: '2017-09-21',
      // scheduletime: '12:00',
      sort: '+scheduletime',
      page: '0',
    },
    success: function(data, status, xhr) {
      console.log(xhr.getResponseHeader('Link'))
      console.log(data)
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
      // console.error.call(this, Array.prototype.slice.call(arguments));
    }
  });
})();

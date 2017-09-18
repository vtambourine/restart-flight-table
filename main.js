(function () {
  console.log('loaded');

  $.ajax({
    url: 'https://api.schiphol.nl/public-flights/flights',
    headers: {
      'ResourceVersion': 'v3',
    },
    dataType: 'json',
    data: {
      app_id: window.B.app_id,
      app_key: window.B.app_key,
      flightdirection: 'A',
      fromdate: '2017-09-18',
      todate: '2017-09-19'
    },
    success: function(data) {
      console.log('hey!!!');
      console.log(data)
    }
  });
})();
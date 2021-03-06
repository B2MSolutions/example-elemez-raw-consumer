$(function() {

  var graph;
  var totalNumberOfEvents = 0;

  var token = parseQueryString()["token"];
  if (token) {
    $('.js-token-input').val(token);
  }

  createGraph();

  $('button').click(function(e) {
    e.preventDefault();
    startPolling($('.js-token-input').val());
  });

  function parseQueryString() {
    return window.location
      .search
      .substring(1)
      .split("&")
      .map(function(s) {
        return s.split("=")
      })
      .reduce(function(p, s) {
        return p[s[0]] = s[1], p
      }, {});
  }

  function parseDate(ms) {
    function zeroPad(o) {
      return o > 9 ? o : '0' + o;
    }
    date = new Date(ms);
    return zeroPad(date.getDate()) + '/' + zeroPad(date.getMonth() + 1) + '/' + zeroPad(date.getFullYear()) + ' ' + zeroPad(date.getHours()) + ':' + zeroPad(date.getMinutes());
  }

  function updateEventsOverTime(total, startedAt) {
    var $el = $('.js-events-over-time'),
      minutesSinceStarted = (new Date().getTime() - startedAt) / 60000,
      eventsPerMinute = total / minutesSinceStarted;
    $el.html(eventsPerMinute.toFixed(1));
  }

  function updateEventsStream(events) {
    var html = events.map(function(event) {
      return '<li id="' + event.key + '" class="list-group-item">' +
        '<strong>' + event.key + ' ' + event.scheme + ':' + event.schemeid + '</strong><br />' +
        ' raised on ' + parseDate(event.raised) +
        ', received on ' + parseDate(event.received) + '<br />' +
        ' sender was ' + event.sender +
        ' source was ' + event.source +
        ' type was ' + event.type +
        '</li>';
    }).join('');
    $('.js-events-stream').prepend(html);
  }

  function addToTotals(total, data) {
    _.each(data, function(item) {
      var existing = _.find(total, function(t) {
        return t.key === item.type;
      });

      if (existing) {
        existing.value += 1;
      } else {
        total.push({
          key: item.type,
          value: 1
        });
      }
    });

    return total;
  }

  function sortByLargestValue(v) {
    return -v.value;
  }

  function addToList(item) {
    $('.js-top-elements').append('<li><strong>' + item.key + '</strong> appeared <strong>' + item.value + '</strong> times</li>');
    $(".js-events-stream li:gt(50)").remove();
  }

  function updateTotal(events) {
    totalNumberOfEvents += events.length;
    var el = $('.js-events-total')
    el.html(totalNumberOfEvents);
  }

  function updateTypesList(events) {
    $('.js-top-elements').html('');
    _.chain(events)
      .sortBy(sortByLargestValue)
      .each(addToList);
  }

  function startPolling(token) {
    var lastKey;
    var totalEvents = [];
    var startedAt = new Date().getTime();

    $.ajax({
      url: 'https://elemez.com/raw/1/latest',
      beforeSend: function(xhr) {
        xhr.setRequestHeader('token', token);
      },
      success: function(data) {
        lastKey = data.lastKey;
        setInterval(poll, 1000);
      }
    });

    function poll() {
      var lastKeyQueryParameter = lastKey ? '&lastkey=' + lastKey : '';
      $.ajax({
        url: 'https://elemez.com/raw/1?sort=asc&limit=1000' + lastKeyQueryParameter,
        beforeSend: function(xhr) {
          xhr.setRequestHeader('token', token);
        },
        success: function(data) {
          updateTotal(data.events);
          updateEventsOverTime(totalNumberOfEvents, startedAt);
          if (data.events.length > 0) {
            lastKey = data.lastKey;
            updateEventsStream(data.events);
            totalEvents = addToTotals(totalEvents, data.events);
            updateTypesList(totalEvents);
            updateGraph(data.events.length);
          }
        },
        error: function() {
          console.log(JSON.stringify(arguments, null, '  '));
        }
      });
    }
  }

  function updateGraph(n) {
    var data = { one: n };
    graph.series.addData(data);
    graph.render();
  }

  function createGraph() {
    var tv = 1000;

    graph = new Rickshaw.Graph( {
      element: document.getElementById("chart"),
      width: 200,
      height: 100,
      renderer: 'line',
      series: new Rickshaw.Series.FixedDuration([{ name: 'one' }], undefined, {
          timeInterval: tv,
          maxDataPoints: 100,
          timeBase: new Date().getTime() / 1000
        }) 
    } );

    graph.render();
  }
});

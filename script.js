$(function() {

  var token = parseQueryString()["token"];
  if(token) {
    $('.js-token-input').val(token);
  }

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

  function updateEventsOverTime(events, startedAt) {
    var $el = $('.js-events-over-time'),
      minutesSinceStarted = (new Date().getTime() - startedAt) / 60000,
      eventsPerMinute = events.length / Math.Min(minutesSinceStarted, 10);
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
  }

  function updateTopFive(events) {
    $('.js-top-elements').html('');
    _.chain(events)
      .sortBy(sortByLargestValue)
      .take(5)
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
        setInterval(poll, 5000);
      }
    });

    function poll() {
      var lastKeyQueryParameter = lastKey ? '&lastkey=' + lastKey : '';
      $.ajax({
        url: 'https://elemez.com/raw/1?sort=asc' + lastKeyQueryParameter,
        beforeSend: function(xhr) {
          xhr.setRequestHeader('token', token);
        },
        success: function(data) {
          updateEventsOverTime(data.events, startedAt);
          if (data.events.length > 0) {
            lastKey = data.lastKey;
            updateEventsStream(data.events);
            totalEvents = addToTotals(totalEvents, data.events);
            updateTopFive(totalEvents);
          }
        },
        error: function() {
          console.log(JSON.stringify(arguments, null, '  '));
        }
      });
    }
  }
});

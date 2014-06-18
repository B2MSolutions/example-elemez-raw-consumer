$(function() {

  $('button').click(function(e) {
    e.preventDefault();
    startPolling($('.js-token-input').val());
  });

  function parseDate(ms) {
    function zeroPad(o) {
      return o > 9 ? o : '0' + o;
    }
    date = new Date(ms);
    return zeroPad(date.getDate()) + '/' + zeroPad(date.getMonth() + 1) + '/' + zeroPad(date.getFullYear()) + ' ' + zeroPad(date.getHours()) + ':' + zeroPad(date.getMinutes());
  }

  function updateEventsOverTime(events) {
    var $el = $('.js-events-over-time'),
      ratio = (events.length / 5).toFixed();
    $el.parent().css('width', ratio + '%');
    $el.html(ratio + ' / 5"');
  }

  function updateEventsStream(events) {
    var html = events.map(function(event) {
      setTimeout(function() {
        // I should delete items from the page also
        $('#' + event.key).fadeOut();
      }, 5000);
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
/*
  function getTotalsForCurrent(current) {
    return _.chain(current)
      .groupBy('type')
      .map(function(value, key) {
        var result = {};
        result.key = key;
        result.value = value.length;
        return result;
      })
      .value();
  }

  function getTotals(total, current) {
    var _total = _.clone(total);
    _.each(current, function(c) {
      var item = _.find(_total, function(o) { return o.key === c.key; });
      if(item) {
        item.value += c.value;
      } else {
        _total.push({
          key: c.key,
          value: c.value
        });
      }
    });

    return _.sortBy(_total, 'value');
  }
*/

  function addToTotals(total, data) {
    _.each(data, function(item) {
      var existing = _.find(total, function(t) {
        return t.key === item.type;
      });

      if(existing) {
       existing.value += 1;
      } else {
        total.push({ key: item.type, value: 1});
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
    setInterval(poll, 5000);

    var lastKey;
    var totalEvents = [];

    function poll() {
      var lastKeyQueryParameter = lastKey ? 'lastkey=' + lastKey : '';
      $.ajax({
        url: 'http://host-003:3000/raw/1?' + lastKeyQueryParameter,
        beforeSend: function(xhr) {
          xhr.setRequestHeader('token', token);
          xhr.setRequestHeader('id', 'id');
          xhr.setRequestHeader('scheme', 'scheme');
        },
        success: function(data) {
          lastKey = data.lastKey;
          updateEventsOverTime(data.events);
          updateEventsStream(data.events);
          totalEvents = addToTotals(totalEvents, data.events);
          updateTopFive(totalEvents);        
        }
      });
    }
  }
});

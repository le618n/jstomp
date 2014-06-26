jstomp
======

Javascript STOMP client works over WebSocket

## Example
    $(function() {
        var client = jStomp('ws://localhost:61614');
        client.onconnected = function () {
            client.subscribe('/topic/jstomp', function (data) {
                alert(data.body);
            });
            client.send('/topic/jstomp', null, 'hello\r\n你好\r\nこんにちは');
        };
    });

## Example
    $(function () {
        var client = jStomp('ws://localhost:61614', { "heart-beat": [600000, 600000] });
        client.onlog = function (text) { };
        client.onconnected = function () {
            var id = client.subscribe('/topic/jstomp', function (data) {
                client.onlog(data.body);
            });
            client.send('/topic/jstomp', null, 'hello\r\n你好\r\nこんにちは');
            client.unsubscribe(id);
        };
        client.onmessage = function (ev) { };
        client.onreceipt = function (ev) { };
        client.onerror = function (ev) { };
        client.ondisconnectd = function (ev) { };
    
        client.onwsopen = function (ev) { };
        client.onwsclose = function (ev) { };
        client.onwserror = function (ev) { };
        client.onwsmessage = function (ev) { };
    });

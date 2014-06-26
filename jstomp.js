// Authors & copyright (c) 2014: le618n(le618n@hotmail.com). MIT license.
// For stomp specification please visit http://stomp.github.io/stomp-specification-1.2.html
(function (owner) {
    owner.jStomp = function (url, options) {
        var opt = jStomp.extends({ "heart-beat": [0, 0], protocol: ['v12.stomp'], 'accept-version': '1.2' }, options || {});
        var ws = new WebSocket(url, opt.protocol), subscriptions = {}, counter = 0, serverActiveTime, clientActiveTime;
        var send = function (command, headers, body) {
            clientActiveTime = Date.now();
            ws.send(jStomp.packet(command, headers || {}, body));
        }
        var serverApi = {
            connected: function (ev) {
                dispatch('onconnected', ev.frames);
                heartbeat(ev.frames.headers);
            },
            message: function (ev) {
                dispatch('onmessage', ev.frames);
                var callback = subscriptions[ev.frames.headers.subscription];
                if (typeof callback === "function") callback(ev.frames);
            },
            receipt: function (ev) {
                dispatch('onreceipt', ev.frames);
            },
            error: function (ev) {
                dispatch('onerror', ev.frames);
            },
        };
        var clientApi = {
            subscribe: function (destination, callback, headers) {
                headers = headers || {};
                if (!headers.id) headers.id = "id-" + counter++;
                headers.destination = destination;
                subscriptions[headers.id] = callback;
                send("SUBSCRIBE", headers);
                return headers.id;
            },
            unsubscribe: function (id) {
                delete subscriptions[id];
                send("UNSUBSCRIBE", { id: id });
            },
            begin: function (transaction) {
                send("BEGIN", { transaction: transaction });
            },
            commit: function (transaction) {
                send("COMMIT", { transaction: transaction });
            },
            abort: function (transaction) {
                send("ABORT", { transaction: transaction });
            },
            ack: function (messageId, subscription, headers) {
                headers = headers || {};
                headers["message-id"] = messageId;
                headers.subscription = subscription;
                send("ACK", headers);
            },
            nack: function (messageId, subscription, headers) {
                headers = headers || {};
                headers["message-id"] = messageId;
                headers.subscription = subscription;
                send("NACK", headers);
            },
            send: function (destination, headers, body) {
                headers = headers || {};
                headers.destination = destination;
                send("SEND", headers, body ? body : '');
            },
            disconnect: function () {
                send('DISCONNECT');
                dispose();
                dispatch('ondisconnected');
            },
        };
        var dispatch = function (name) {
            log('dispatch:' + name);
            if (typeof clientApi[name] === "function") {
                clientApi[name](arguments);
            }
        };
        var heartbeat = function (headers) {
            var beat = function (c, s) {
                if (s > 0 && Date.now() - serverActiveTime > 2 * s) {
                    log('lost connection: ' + new Date(serverActiveTime));
                } else if (c > 0) {
                    var ts = Date.now() - clientActiveTime;
                    if (ts <= c) {
                        setTimeout(function () { beat(c, s); }, c + ts);
                    } else {
                        ws.send(jStomp.EOL);
                        log('outgoing heart-beats: ' + new Date());
                        setTimeout(function () { beat(c, s); }, c);
                    }
                }
            };
            var hb = headers['heart-beat'].split(",");
            var sx = parseInt(hb[0]), sy = parseInt(hb[1]), cx = opt["heart-beat"][0], cy = opt["heart-beat"][1];
            if (!(cx === 0 || sy === 0)) {
                beat(Math.max(cx, sy), (sx === 0 || cy === 0) ? 0 : Math.max(sx, cy));
            } else if (!(sx === 0 || cy === 0)) {
                beat(Math.max(sx, cy), (cx === 0 || sy === 0) ? 0 : Math.max(cx, sy));
            }
        };
        var log = function (text) {
            if (typeof clientApi.onlog === "function") {
                clientApi.onlog(text);
            }
        };
        var dispose = function () {
            ws.close();
            ws.onclose = null;
        };
        (function () {
            ws.onopen = function (ev) {
                dispatch('onwsopen', ev);
                send('CONNECT', {
                    'heart-beat': opt['heart-beat'].join(','),
                    'accept-version': opt['accept-version']
                });
            };
            ws.onclose = function (ev) {
                dispatch('onwsclose', ev);
            };
            ws.onerror = function (ev) {
                dispatch('onwserror', ev);
            };
            ws.onmessage = function (ev) {
                dispatch('onwsmessage', ev);
                serverActiveTime = Date.now();
                if (ev.data === jStomp.EOL) {
                    log('incoming heart-beats: ' + new Date(serverActiveTime));
                } else {
                    ev.frames = jStomp.unpack(ev.data);
                    serverApi[ev.frames.command.toLowerCase()](ev);
                }
            };
        })();
        return clientApi;
    };
    jStomp.EOL = '\n';
    jStomp.NUL = '\0';
    jStomp.extends = function (d, b) {
        for (var p in b) {
            if (b.hasOwnProperty(p)) d[p] = b[p];
        }
        return d;
    };
    jStomp.packet = function (command, headers, body) {
        var frames = [command];
        if (headers) {
            for (var key in headers) {
                frames.push(key + ':' + headers[key]);
            }
        }
        if (body) {
            var matchs = encodeURIComponent(body).match(/%[89ABab]/g);
            frames.push("content-length:" + (body.length + (matchs ? matchs.length : 0)));
        }
        frames.push(jStomp.EOL + (body ? body : null));
        return frames.join(jStomp.EOL) + jStomp.NUL;
    };
    jStomp.unpack = function (data) {
        var start = data.indexOf(jStomp.EOL);
        var length = data.length;
        var frames = { command: data.substring(0, start), headers: {}, body: '' };
        while (0 < start && start < length) {
            var next = data.indexOf(jStomp.EOL, ++start);
            if (start < next) {
                var hd = data.substring(start, next);
                var kv = hd.indexOf(':');
                if (0 < kv) frames.headers[hd.substring(0, kv)] = hd.substring(++kv, hd.length);
                start = next;
                continue;
            }
            frames.body = data.substring(++start, --length);
            break;
        }
        return frames;
    };
})(window);

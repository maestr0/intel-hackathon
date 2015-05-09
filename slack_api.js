var sys  = require('sys'),
    http = require('http'),
    qs = require('querystring');

var server = {

    commands_stack: [
        {command: "say", params: "params of the say"}
    ],

    router: {
        getFunctionByPath: function(path) {
            if (path.match(/^\/add_command\/?$/)) {
                return 'addCommand';
            }
            if (path.match(/^\/get_commands\/?$/)) {
                return 'sendAllCommands';
            }       

            return false;
        }
    },

    methods: {
        addCommand: function (params, req, res) {
            var data = false;
            if (req.method == 'POST' && params && params.text) {
               var parts = /^monster\! ?([^\ ]*)? ?(.*)?/.exec(params.text);
               var command = parts[1] || false;
               var message = parts[2] || '';
               console.log("Command: " + command);
               console.log("Message: " + message);

               switch (command) {
               case 'help':
                   data = {text: "Damn, you're so demanding!\n\t\tmonster! say <message>\n\tmonster! move < head | body | left_hand | right_hand > <angle>"};
                   break;
               case 'say':
                   server.commands_stack.push({command: command, params: message}); 
                   data = {text: "Hi " + params.user_name + ", sure thing!"};
                   break;
               case 'move':
                    var parts = /^([^\ ]*) ([^\ ]*)/.exec(message);
                    if (parts && parts[1] && parts[2]) {
                        var body_parts = ['head', 'body', 'left_hand', 'right_hand'];
                        part = parts[1];
                        angle = parseInt(parts[2]);
                        console.log(body_parts.indexOf(part));
                        console.log(typeof angle);
                        if (body_parts.indexOf(part) >= 0 && typeof angle == 'number' && angle > -180 && angle < 180) {
                            server.commands_stack.push({command: command, part: part, angle: angle}); 
                            data = {text: "Hi " + params.user_name + ", I don't want to but I am moving my " + part + " to " + angle + " degree position"};
                        } else {
                            data = {text: "Hi " + params.user_name + ", I don't know what you mean by moving my " + part + " to " + parts[2] + " degree position"};
                        }
                    } else {
                        data = {text: "Hi " + params.user_name + ", I don't know what to move and how much"};
                    }
                    break;
               case 'joke':
                    var jokes_api = 'http://api.icndb.com/jokes/random';
                    http.get(jokes_api, function(response) {
                        var body = '';
                        response.on('data', function (chunk) {
                            body += chunk;
                        });
                        response.on('end', function (chunk) {
                            console.log(body);
                            var obj_body = JSON.parse(body);
                            data = {text: "Here's your joke " + params.user_name + ": " + obj_body.value.joke};
                            server.commands_stack.push({command: 'say', params: obj_body.value.joke}); 
                            server.send_response(res, data);
                        });
                    });
                    return;
               default:
                   data = {text: "Hi " + params.user_name + ", \"say\" and \"move\" are  the only things I can do at the moment"};
               }
            }
            server.send_response(res, data);
        },
        sendAllCommands: function (params, req, res) {
            var data = server.commands_stack;
            server.commands_stack = [];
            server.send_response(res, data);
        }
    },

    not_found: function(res, message) {
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.write(message + "\n");
            res.end();
    },

    send_response: function (res, data) {
            if (data) {
                data.timestamp = new Date().getTime();
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.write(JSON.stringify(data));
                res.end();
            } else {
                server.not_found(res, 'Not sufficient data');
            }
    },

    start_server: function (port) {
        http.createServer(function (req, res) {

                var method = server.router.getFunctionByPath(req.url);
                if (method) {
                    var payload = '';
                    req.on('data', function(data) {
                        payload += data;
                    });
                    req.on('end', function() {
                        var POST = qs.parse(payload) || {};
                        server.methods[method](POST, req, res);
                    });
                } else {
                    server.not_found(res, 'Api not found');
                }

        }).listen(port);

    }
}

server.start_server(process.env.PORT || 8000);

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
        addCommand: function (params, req) {
            if (req.method == 'POST' && params && params.text) {
               var parts = /^monster\! ?([^\ ]*)? ?(.*)?/.exec(params.text);
               var command = parts[1] || false;
               var message = parts[2] || '';
               console.log("Command: " + command);
               console.log("Message: " + message);
               if (!command) {
                   return {text: "Hi " + params.user_name + ", what can I do for you?\nI can only \"say\" at the moment"};
               }
               if (command != "say") {
                   return {text: "Hi " + params.user_name + ", \"say\" is the only thing I can do at the moment"};
               }
               server.commands_stack.push({command: command, params: message}); 
               return {text: "Hi " + params.user_name + ", sure thing!"};
            }
            return false;
        },
        sendAllCommands: function (params) {
            var data = server.commands_stack;
            server.commands_stack = [];
            return data;
        }
    },

    not_found: function(res, message) {
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.write(message + "\n");
            res.end();
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

                        data = server.methods[method](POST, req);

                        if (data) {
                            data.timestamp = new Date().getTime();
                            res.writeHead(200, {'Content-Type': 'application/json'});
                            res.write(JSON.stringify(data));
                            res.end();
                        } else {
                            server.not_found(res, 'Not sufficient data');
                        }
                    });
                } else {
                    server.not_found(res, 'Api not found');
                }

        }).listen(port);

    }
}

server.start_server(process.env.PORT || 8000);

var Cylon = require('cylon');
var sys = require('sys')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) {  sys.puts(stdout);
                                        sys.puts(error);
                                        sys.puts(stderr);
                                     };

Cylon.api({
  host: "0.0.0.0",
  port: "3000"
});

Cylon.robot({
  connections: {
    edison: { adaptor: "intel-iot"}
  },

  devices: {
      head: { driver: "servo", pin: 3 },
      leftHand: { driver: "servo", pin: 5 },
      rightHand: { driver: "servo", pin: 6 },
      body: { driver: "servo", pin: 9 },
      maxbotix: { driver: 'maxbotix', pin: 1 }
  },

  work: function(my) {      
        
      my.init();
      my.body.angle(0);
      my.rightHand.angle(0);
      my.leftHand.angle(0);
      my.head.angle(0);
      console.log("Cookie Monster is up and running!"); 
  },
  
   name: "Cookie Monster",

  say: function(msg) {
      var cmd = "/home/root/git/intel-edison/say.sh \"" + msg +"\"";
      console.log("executing", cmd);
      exec(cmd, puts);
    return "Saying ... " + msg;
  },
  
    move: function(angle, servoName){        
        this[servoName].angle(angle);        
        return "moving " + servoName + " @ " + angle;
    },
    
    commands: function() {
    return {
       say: this.say,
       move: this.move
    };
  },
    
    init: function(){
        console.log('inside init');
        var that = this;
        
        var http = require('http');
        var moveQueue = [],
            sayQueue = [];

        every((5).seconds(), function(){
            console.log('API call');

            var optionsget = {
                host : 'mouseinabox.info',
                port : 8000,
                path : '/get_commands',
                method : 'GET'
            };

            var actionsObject = {};

            // do the GET request
            var reqGet = http.request(optionsget, function(res) {

                res.on('data', function(d) {
                    actionsObject = JSON.parse(d);
                    console.log(actionsObject);
                    for (var i = 0; i < actionsObject.length; i++) {
                        if (actionsObject[i].command === 'say'){
                            console.log(actionsObject[i].params);
                            that.say(actionsObject[i].params);
                            //sayQueue.push(actionsObject[i].params);
                        }
                        else {
                            console.log(actionsObject[i]);
                            //moveQueue.push(actionsObject[i]);
                        }
                        console.log(actionsObject[i].command);
                    }
                });

            });

            reqGet.end();
            reqGet.on('error', function(e) {
                console.error(e);
            });

        });

    }

}).start();



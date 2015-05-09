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
      button: { driver: 'button', pin: 2 }
  },

  work: function(my) {      
      console.log("Cookie Monster is up and running!");   
      my.body.angle(0);
      my.rightHand.angle(0);
      my.leftHand.angle(0);
      my.head.angle(0);  
      
      my.button.on('push', function() {
            my.say("I want my COOKIES!");
        });
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
  }

}).start();

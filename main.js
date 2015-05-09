var Cylon = require('cylon');
var sys = require('sys')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout);
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
      servohead: { driver: "servo", pin: 3 },
      servo2: { driver: "servo", pin: 5 },
      servo3: { driver: "servo", pin: 6 },
      servo4: { driver: "servo", pin: 9 }
  },

  work: function(my) {      
      console.log("Started!");      
  },
  
   name: "Pawel's Edison",

  say: function(msg) {
      var cmd = "/home/root/git/intel-edison/say.sh \"" + msg +"\"";
      console.log("executing", cmd);
      exec(cmd, puts);
    return "Saying ... " + msg;
  },
  
    move_head: function(angle){
        console.log("Before Angle: " + (this.servohead.currentAngle()));
        this.servohead.angle(angle);
        console.log("Current Angle: " + (this.servohead.currentAngle()));
        return "moved head to " + angle;
    },
    
    commands: function() {
    return {
       say: this.say,
       move_head: this.move_head
    };
  }

}).start();

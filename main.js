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
    
    sayQueue:[],
    
  work: function(my) {      
        
      my.init();
      my.twitterInit();
      my.body.angle(0);
      my.rightHand.angle(0);
      my.leftHand.angle(0);
      my.head.angle(0);
      
      my.button.on('push', function() {
            my.say("I want my COOKIES!");
        });
        console.log("Cookie Monster is up and running!"); 
      
      
      setTimeout(this.ttsWorker, 500); 
  },
    
    ttsWorker: function(){
        
        if(this.sayQueue.length===0){
            setTimeout(this.ttsWorker, 1000);
        } else {
            var msg = this.sayQueue.shift();
            var xFactor = 50;
            this.textToSpeach(msg);
            setTimeout(this.ttsWorker, msg.length * xFactor);
        }
    },    
  
   name: "Cookie Monster",

  say: function(msg) {
      this.sayQueue.push(msg);      
    return "Added to Say Queue." + msg;
  },
    
    textToSpeach: function(msg){
          var cmd = "/home/root/git/intel-edison/say.sh \"" + msg +"\"";
          console.log("executing", cmd);
          exec(cmd, puts);
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
        var moveQueue = [];            
        
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
                            //that.say(actionsObject[i].params);
                            that.sayQueue.push(actionsObject[i].params);
                        }
                        else if (actionsObject[i].command === 'move'){
                            //console.log(actionsObject[i]);
                            switch(actionsObject[i].part) {
                                case 'left_hand': that.leftHand.angle(actionsObject[i].angle); break;
                                case 'right_hand': that.rightHand.angle(actionsObject[i].angle); break;
                                case 'head': that.head.angle(actionsObject[i].angle); break;
                                case 'body': that.body.angle(actionsObject[i].angle); break;
                            }
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

    },
    
    twitterInit: function(){
        
        var that = this;
        
        var Twit = require('twit');

        var T = new Twit({
            consumer_key:         'PJm2UtzwPqmDdmx5gq65AGNIw'
          , consumer_secret:      'ExQD15puURg8VFoVVm11MzAsH38PqWyNwrsl9kB53ByYcOv0sb'
          , access_token:         '2840236010-wnBakeJPEWLbgPWSgW1ubxXtQztic8H3E1ZeFYR'
          , access_token_secret:  'UByJiAmDjokddJb1DNyZ3RHlHLosfyapXrUFRxvSii58w'
        });
        
        var tweetsUsed = '';
        
        var searchTweetsFrom = Date.now();
        
        setInterval(function(){
            
            T.get('search/tweets', { q: '#cookiemonster since:2015-05-09', count: 10 }, function(err, data, response) {
                if (data.statuses !== null){

                    for (var i = 0; i < data.statuses.length; i++){
                        // cookieTweetArray.push({'id':data.statuses[i].id, 'tweet': data.statuses[i].text});
                        if (tweetsUsed.indexOf(data.statuses[i].id) === -1){
                            tweetsUsed = tweetsUsed + ',' + data.statuses[i].id;
                            that.say(data.statuses[i].text);
                            console.log(data.statuses[i].text);
                        }
                    }
                }
            });
            
        },5000);
        
        
    }
    
    

}).start();



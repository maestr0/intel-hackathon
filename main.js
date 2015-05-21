var Cylon = require('cylon');
var sys = require('sys')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) {
    //sys.puts(stdout);
    //sys.puts(error);
    //sys.puts(stderr);
};

Cylon.api({
    host: "0.0.0.0",
    port: "3000"
});

Cylon.robot({
    connections: {
        edison: {adaptor: "intel-iot"}
    },
    name: "Cookie Monster",
    devices: {
        head: {
            driver: "servo", pin: 3,
            freq: 50,
            // pulseWidth in MicroSeconds as per servo spec sheet
            // e.g. http://www.servodatabase.com/servo/towerpro/sg90
            pulseWidth: {min: 500, max: 2400},
            limits: {bottom: 20, top: 160}
        },
        leftHand: {
            driver: "servo", pin: 5,
            freq: 50,
            // pulseWidth in MicroSeconds as per servo spec sheet
            // e.g. http://www.servodatabase.com/servo/towerpro/sg90
            pulseWidth: {min: 500, max: 2400},
            limits: {bottom: 20, top: 160}
        },
        rightHand: {
            driver: "servo", pin: 6,
            freq: 50,
            // pulseWidth in MicroSeconds as per servo spec sheet
            // e.g. http://www.servodatabase.com/servo/towerpro/sg90
            pulseWidth: {min: 500, max: 2400},
            limits: {bottom: 20, top: 160}
        },
        body: {
            driver: "servo", pin: 9,
            freq: 50,
            // pulseWidth in MicroSeconds as per servo spec sheet
            // e.g. http://www.servodata\\base.com/servo/towerpro/sg90
            pulseWidth: {min: 500, max: 2400},
            limits: {bottom: 20, top: 160}
        },
        button: {driver: 'button', pin: 2},
        button2: {driver: 'button', pin: 8},
        buzzer: {driver: "direct-pin", pin: 7, connection: "edison"},
        sound: {driver: "analogSensor", pin: 1, connection: "edison"},
        proximity: {driver: 'analog-sensor', pin: 0, lowerLimit: 20, upperLimit: 900},
        led: {driver: 'led', pin: 13},
        relay: {driver: 'led', pin: 8}
    },

    sayings: ["I would do anything for a cookie.",
        "It's good to be alive.",
        "That what wrong with the media today. All they have is questions, questions, questions. They never have cookies.",
        "C is for Cookie and cookie is for me!",
        "I want my COOKIES!"
    ],

    sayQueue: [],

    work: function (my) {

        my.init();

        my.bind();

        setTimeout(this.ttsWorker, 500);

        console.log("Cookie Monster is up and running!");
        my.say("Hi");
        my.say("It is good to be alive");
    },

    init: function () {
        console.log('inside init');
        var that = this;

        var cmd = "/home/root/git/intel-edison/bluetooth_speaker.sh";
        console.log("executing", cmd);
        exec(cmd, puts);

        var http = require('http');

        every((5).seconds(), function () {
            var optionsget = {
                host: 'mouseinabox.info',
                port: 8000,
                path: '/get_commands',
                method: 'GET'
            };

            var actionsObject = {};

            // do the GET request
            var reqGet = http.request(optionsget, function (res) {

                res.on('data', function (d) {
                    actionsObject = JSON.parse(d);
                    console.log(actionsObject);
                    for (var i = 0; i < actionsObject.length; i++) {
                        if (actionsObject[i].command === 'say') {
                            console.log(actionsObject[i].params);
                            //that.say(actionsObject[i].params);
                            that.sayQueue.push(actionsObject[i].params);
                        } else if (actionsObject[i].command === 'dance') {
                            console.log(actionsObject[i].params);
                            //that.say(actionsObject[i].params);
                            that.dance();
                        }
                        else if (actionsObject[i].command === 'move') {
                            //console.log(actionsObject[i]);
                            switch (actionsObject[i].part) {
                                case 'left_hand':
                                    that.leftHand.angle(actionsObject[i].angle);
                                    break;
                                case 'right_hand':
                                    that.rightHand.angle(actionsObject[i].angle);
                                    break;
                                case 'head':
                                    that.head.angle(actionsObject[i].angle);
                                    break;
                                case 'body':
                                    that.body.angle(actionsObject[i].angle);
                                    break;
                            }
                            //moveQueue.push(actionsObject[i]);
                        }
                        console.log(actionsObject[i].command);
                    }
                });

            });

            reqGet.end();
            reqGet.on('error', function (e) {
                console.error(e);
            });

        });

    },

    bind: function(){
        var my = this;

        my.button.on('push', function () {
            var item = my.sayings[Math.floor(Math.random() * my.sayings.length)];
            my.say(item);
        });

        my.button2.on('push', function () {
            var cmd = "mplayer /home/root/git/intel-edison/vomiting-03.wav";
            console.log("executing", cmd);
            exec(cmd, puts);
        });

        my.proximity.on('lowerLimit', function (val) {
            var ignoreProximity = false;
            if (!ignoreProximity) {
                ignoreProximity = true;
                my.sayQueue.push("Me see cookie. Me want cookie.");
                my.relay.turnOn();
                setTimeout(function () {
                    my.body.angle(40);
                    my.rightHand.angle(180);
                    my.leftHand.angle(0);
                    my.head.angle(0);

                    setTimeout(function () {
                        my.body.angle(90);
                        my.rightHand.angle(90);
                        my.leftHand.angle(120);
                        my.head.angle(180);
                        setTimeout(function () {
                            my.body.angle(90);
                            my.rightHand.angle(90);
                            my.leftHand.angle(10);
                            my.head.angle(80);
                            setTimeout(function () {
                                my.relay.turnOff();
                            }, 1000);
                        }, 700);
                    }, 700);
                }, 700);
                setTimeout(function () {
                    ignoreProximity = false;
                }, 5000);
            }
        });

    },

    ttsWorker: function () {
        this.led.turnOff();
        if (this.sayQueue.length === 0) {
            setTimeout(this.ttsWorker, 100);
        } else {
            var msg = this.sayQueue.shift();
            var xFactor = 50;
            this.textToSpeach(msg);
            this.led.turnOn();
            setTimeout(this.ttsWorker, msg.length * xFactor + 1000);
        }
    },

    say: function (msg) {
        this.sayQueue.push(msg);
        return "Added to Say Queue." + msg;
    },

    textToSpeach: function (msg) {
        var cmd = "/home/root/git/intel-edison/say.sh \"" + msg + "\"";
        console.log("executing say.sh ", msg);
        exec(cmd, puts);
    },

    move: function (angle, servoName) {
        var that = this;
        this.relay.turnOn();
        this[servoName].angle(angle);
        setTimeout(function () {
            that.relay.turnOff();
        }, 500);
        return "moving " + servoName + " @ " + angle;
    },

    commands: function () {
        return {
            say: this.say,
            move: this.move,
            dance: this.dance
        };
    },

    twitterInit: function () {

        var that = this;

        var Twit = require('twit');

        var T = new Twit({
            consumer_key: 'PJm2UtzwPqmDdmx5gq65AGNIw'
            , consumer_secret: 'ExQD15puURg8VFoVVm11MzAsH38PqWyNwrsl9kB53ByYcOv0sb'
            , access_token: '2840236010-wnBakeJPEWLbgPWSgW1ubxXtQztic8H3E1ZeFYR'
            , access_token_secret: 'UByJiAmDjokddJb1DNyZ3RHlHLosfyapXrUFRxvSii58w'
        });

        var stream = T.stream('statuses/filter', {track: 'intelcookiemonster'});
        stream.on('tweet', function (tweet) {
            var sayTweetStr = '';
            var sayTweetArray = [];
            sayTweetArray = tweet.text.replace(/\n/g, " ").split(' ');
            for (var j = 0; j < sayTweetArray.length; j++) {
                if ((sayTweetArray[j][0] !== '#') && (sayTweetArray[j][0] !== '@') && (sayTweetArray[j].substring(0, 4) !== 'http')) {
                    sayTweetStr = sayTweetStr + ' ' + sayTweetArray[j];
                }
            }
            that.say(sayTweetStr);
            console.log(sayTweetStr);
        });

    },

    dance: function () {
        this.relay.turnOn();
        var my = this;
        this.body.angle(30);
        this.rightHand.angle(0);
        this.leftHand.angle(180);
        this.head.angle(180);

        setTimeout(function () {
            my.body.angle(90);
            my.rightHand.angle(90);
            my.leftHand.angle(90);
            my.head.angle(90);

            setTimeout(function () {
                my.body.angle(90);
                my.rightHand.angle(60);
                my.leftHand.angle(20);
                my.head.angle(45);

                setTimeout(function () {
                    my.body.angle(90);
                    my.rightHand.angle(90);
                    my.leftHand.angle(90);
                    my.head.angle(90);

                    setTimeout(function () {
                        my.body.angle(90);
                        my.rightHand.angle(90);
                        my.leftHand.angle(90);
                        my.head.angle(90);

                        setTimeout(function () {
                            my.body.angle(90);
                            my.rightHand.angle(60);
                            my.leftHand.angle(20);
                            my.head.angle(45);

                            setTimeout(function () {
                                my.body.angle(90);
                                my.rightHand.angle(90);
                                my.leftHand.angle(90);
                                my.head.angle(90);

                                setTimeout(function () {
                                    my.body.angle(180);
                                    my.rightHand.angle(180);
                                    my.leftHand.angle(0);
                                    my.head.angle(0);

                                    setTimeout(function () {
                                        my.body.angle(120);
                                        my.rightHand.angle(180);
                                        my.leftHand.angle(0);
                                        my.head.angle(60);
                                    }, 700);

                                    setTimeout(function () {
                                        my.body.angle(60);
                                        my.rightHand.angle(180);
                                        my.leftHand.angle(0);
                                        my.head.angle(120);

                                        setTimeout(function () {
                                            my.body.angle(0);
                                            my.rightHand.angle(180);
                                            my.leftHand.angle(0);
                                            my.head.angle(0);

                                            setTimeout(function () {
                                                my.body.angle(90);
                                                my.rightHand.angle(90);
                                                my.leftHand.angle(120);
                                                my.head.angle(90);

                                                setTimeout(function () {
                                                    my.body.angle(90);
                                                    my.rightHand.angle(90);
                                                    my.leftHand.angle(90);
                                                    my.head.angle(90);

                                                    setTimeout(function () {
                                                        my.body.angle(90);
                                                        my.rightHand.angle(60);
                                                        my.leftHand.angle(20);
                                                        my.head.angle(45);

                                                        setTimeout(function () {
                                                            my.body.angle(90);
                                                            my.rightHand.angle(90);
                                                            my.leftHand.angle(90);
                                                            my.head.angle(90);

                                                            setTimeout(function () {
                                                                my.body.angle(90);
                                                                my.rightHand.angle(90);
                                                                my.leftHand.angle(90);
                                                                my.head.angle(90);

                                                                setTimeout(function () {
                                                                    my.body.angle(90);
                                                                    my.rightHand.angle(60);
                                                                    my.leftHand.angle(20);
                                                                    my.head.angle(45);

                                                                    setTimeout(function () {
                                                                        my.body.angle(90);
                                                                        my.rightHand.angle(90);
                                                                        my.leftHand.angle(90);
                                                                        my.head.angle(90);

                                                                        setTimeout(function () {
                                                                            my.body.angle(180);
                                                                            my.rightHand.angle(180);
                                                                            my.leftHand.angle(0);
                                                                            my.head.angle(0);

                                                                            setTimeout(function () {
                                                                                my.body.angle(120);
                                                                                my.rightHand.angle(180);
                                                                                my.leftHand.angle(0);
                                                                                my.head.angle(60);
                                                                            }, 700);

                                                                            setTimeout(function () {
                                                                                my.body.angle(60);
                                                                                my.rightHand.angle(180);
                                                                                my.leftHand.angle(0);
                                                                                my.head.angle(120);

                                                                                setTimeout(function () {
                                                                                    my.body.angle(0);
                                                                                    my.rightHand.angle(180);
                                                                                    my.leftHand.angle(0);
                                                                                    my.head.angle(0);

                                                                                    setTimeout(function () {
                                                                                        my.body.angle(90);
                                                                                        my.rightHand.angle(90);
                                                                                        my.leftHand.angle(120);
                                                                                        my.head.angle(90);
                                                                                        setTimeout(function () {
                                                                                            my.relay.turnOff();
                                                                                        }, 1000);
                                                                                    }, 700);
                                                                                }, 700);
                                                                            }, 700);
                                                                        }, 700);

                                                                    }, 700);
                                                                }, 700);

                                                            }, 700);
                                                        }, 700);
                                                    }, 700);

                                                }, 700);
                                            }, 700);
                                        }, 700);
                                    }, 700);
                                }, 700);

                            }, 700);
                        }, 700);

                    }, 700);
                }, 700);
            }, 700);

        }, 700);
    }

}).start();



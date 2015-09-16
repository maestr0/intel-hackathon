var Cylon = require('cylon');
var sys = require('sys')
var exec = require('child_process').exec;
var http = require('http');

function puts(error, stdout, stderr) {
//        sys.puts(stdout);
//        sys.puts(error);
//        sys.puts(stderr);
};

//Cylon.api({
//    host: "0.0.0.0",
//    port: "3000"
//});

var count = 0;

Cylon.robot({
        connections: {
            edison: {
                adaptor: "intel-iot"
            }
        },

        name: "Cookie Monster",

        devices: {
            head: {
                driver: "servo",
                pin: 3,
                freq: 50,
                // pulseWidth in MicroSeconds as per servo spec sheet
                // e.g. http://www.servodatabase.com/servo/towerpro/sg90
                pulseWidth: {
                    min: 500,
                    max: 2400
                }
                //                limits: {
                //                    bottom: 20,
                //                    top: 160
                //                }
            },
            leftHand: {
                driver: "servo",
                pin: 5,
                freq: 50,
                // pulseWidth in MicroSeconds as per servo spec sheet
                // e.g. http://www.servodatabase.com/servo/towerpro/sg90
                pulseWidth: {
                    min: 500,
                    max: 2400
                }
            },
            rightHand: {
                driver: "servo",
                pin: 6,
                freq: 50,
                // pulseWidth in MicroSeconds as per servo spec sheet
                // e.g. http://www.servodatabase.com/servo/towerpro/sg90
                pulseWidth: {
                    min: 500,
                    max: 2400
                }
            },
            body: {
                driver: "servo",
                pin: 9,
                freq: 50,
                // pulseWidth in MicroSeconds as per servo spec sheet
                // e.g. http://www.servodata\\base.com/servo/towerpro/sg90
                pulseWidth: {
                    min: 500,
                    max: 2400
                }
                //                ,
                //                limits: {
                //                    bottom: 20,
                //                    top: 160
                //                }
            },
            buttonLeft: {
                driver: 'button',
                pin: 2
            },
            relay: {
                driver: 'led',
                pin: 4
            },
            buzzer: {
                driver: "direct-pin",
                pin: 7,
                connection: "edison"
            },
            buttonRight: {
                driver: 'button',
                pin: 8
            },
            led: {
                driver: 'led',
                pin: 13
            },

            proximity: {
                driver: 'analog-sensor',
                pin: 0,
                lowerLimit: 50,
                upperLimit: 100
            },
            sound: {
                driver: "analog-sensor",
                pin: 1,
                connection: "edison",
                lowerLimit: 40,
                upperLimit: 900
            },

            screen: {
                driver: "upm-jhd1313m1",
                connection: "edison"
            }
        },

        speechQueue: [],

        work: function (my) {
            this.relay.turnOn();
//            this.led.turnOn();
//            my.body.angle(90);
//            my.rightHand.angle(90);
//            my.leftHand.angle(90);
//            my.head.angle(90);
//            this.relay.turnOff();
//            //        my.init();
//
//            my.bind();
//
//            setTimeout(this.ttsWorker, 1000);

            console.log("I'm alive!");
        },

        init: function () {
            console.log('inside init');
            var that = this;

            //        var cmd = "/home/root/git/intel-edison/bluetooth_speaker.sh";
            //        console.log("executing", cmd);
            //        exec(cmd, puts);



            //        every((5).seconds(), function () {
            //            var optionsget = {
            //                host: 'mouseinabox.info',
            //                port: 8000,
            //                path: '/get_commands',
            //                method: 'GET'
            //            };
            //
            //            var actionsObject = {};
            //
            //            // do the GET request
            //            var reqGet = http.request(optionsget, function (res) {
            //
            //                res.on('data', function (d) {
            //                    actionsObject = JSON.parse(d);
            //                    console.log(actionsObject);
            //                    for (var i = 0; i < actionsObject.length; i++) {
            //                        if (actionsObject[i].command === 'say') {
            //                            console.log(actionsObject[i].params);
            //                            //that.say(actionsObject[i].params);
            //                            that.speechQueue.push(actionsObject[i].params);
            //                        } else if (actionsObject[i].command === 'dance') {
            //                            console.log(actionsObject[i].params);
            //                            //that.say(actionsObject[i].params);
            //                            that.dance();
            //                        } else if (actionsObject[i].command === 'move') {
            //                            //console.log(actionsObject[i]);
            //                            switch (actionsObject[i].part) {
            //                            case 'left_hand':
            //                                that.leftHand.angle(actionsObject[i].angle);
            //                                break;
            //                            case 'right_hand':
            //                                that.rightHand.angle(actionsObject[i].angle);
            //                                break;
            //                            case 'head':
            //                                that.head.angle(actionsObject[i].angle);
            //                                break;
            //                            case 'body':
            //                                that.body.angle(actionsObject[i].angle);
            //                                break;
            //                            }
            //                            //moveQueue.push(actionsObject[i]);
            //                        }
            //                        console.log(actionsObject[i].command);
            //                    }
            //                });
            //
            //            });
            //
            //            reqGet.end();
            //            reqGet.on('error', function (e) {
            //                console.error(e);
            //            });
            //
            //        });

        },

        bind: function () {
            var my = this;
            var ignoreSoundDetection = false;
            my.sound.on('analogRead', function (val) {
                if(!my.ignoreSoundDetection){
                    my.ignoreSoundDetection = true;
                    my.detectSound(val);
                    setTimeout(function () {
                        my.ignoreSoundDetection = false;
                    }, 1000);
                }
            });

            my.buttonLeft.on('push', function () {
                var item = my.sayings[Math.floor(Math.random() * my.sayings.length)];
                my.say(item);
            });

            my.buttonRight.on('push', function () {
                var cmd = "mplayer -volume 60 /home/root/git/intel-edison/vomiting-03.wav";
                console.log("executing", cmd);
                exec(cmd, puts);
            });

            var ignoreProximity = false;
            my.proximity.on('lowerLimit', function (val) {
                if (!ignoreProximity) {
                    ignoreProximity = true;
                    console.log("\nproximity " + val)
                    my.speechQueue.push("Cookie");
                    count = count + 1;
                    console.log("count", count);
                    my.relay.turnOn();

                    setTimeout(function () {
                        //                        my.rightHand.angle(180);
                        //                        my.leftHand.angle(0);
                        my.head.angle(0);
                        //                        my.body.angle(0);

                        setTimeout(function () {
                            //                            my.body.angle(90);
                            my.rightHand.angle(90);
                            my.leftHand.angle(90);
                            my.head.angle(60);
                            //                            my.body.angle(90);

                            setTimeout(function () {
                                //                                my.body.angle(90);
                                //                                my.rightHand.angle(0);
                                //                                my.leftHand.angle(180);
                                my.head.angle(120);
                                //                                my.body.angle(180);

                                setTimeout(function () {
                                    //                                    my.rightHand.angle(90);
                                    //                                    my.leftHand.angle(90);
                                    my.head.angle(180);
                                    //                                    my.body.angle(180);
                                    setTimeout(function () {
                                        my.relay.turnOff();
                                    }, 600);
                                }, 700);
                            }, 700);
                        }, 700);
                    }, 700);

                    setTimeout(function () {
                        ignoreProximity = false;
                    }, 5000);
                }
            });

        },

        reset: function () {
            this.writeMessage("Where are cookies?");
            this.buzzer.digitalWrite(0);
        },

        writeMessage: function (message, color) {
            var that = this;
            var str = message.toString();
            while (str.length < 16) {
                str = str + " ";
            }
            console.log("write LCD msg", message);
            that.screen.setCursor(0, 0);
            that.screen.write(str);
            switch (color) {
            case "red":
                that.screen.setColor(255, 0, 0);
                break;
            case "green":
                that.screen.setColor(0, 255, 0);
                break;
            case "blue":
                that.screen.setColor(0, 0, 255);
                break;
            default:
                that.screen.setColor(255, 255, 255);
                break;
            }
        },

        detectSound: function (val) {
            var that = this;
            if (val >= 450) {
                console.log("Sound detected:", val)
                that.writeMessage("Sound detected", "blue");
                that.speechQueue.push("What the fuck is this noise? I can't work like that.");
                setTimeout(function () {
                    that.reset();
                }, 500);
            }
        },

        ttsWorker: function () {
            this.led.turnOff();
            var delay = 500;
            if (this.speechQueue.length !== 0) {
                var msg = this.speechQueue.shift();
                var xFactor = 50;
                this.textToSpeach(msg);
                this.led.turnOn();
                delay = msg.length * xFactor + 1500;
            }
            setTimeout(this.ttsWorker, delay);
        },

        sayings: ["I would do anything for a cookie.",
        "It's good to be alive.",
        "That what wrong with the media today. All they have is questions, questions, questions. They never have cookies.",
        "C is for Cookie and cookie is for me!",
        "I want my COOKIES!"
    ],

        say: function (msg) {
            this.speechQueue.push(msg);
        },

        textToSpeach: function (msg) {
            var cmd = "/home/root/git/intel-edison/speak-cm.sh \"" + msg + "\"";
            this.writeMessage(msg, "red");
            exec(cmd, puts);
        },

        move: function (angle, servoName) {
            var that = this;
            this.relay.turnOn();
            this[servoName].angle(angle);
            setTimeout(function () {
                that.relay.turnOff();
            }, 1000);
            return "moving " + servoName + " @ " + angle;
        },

        commands: function () {
            return {
                say: this.say,
                move: this.move,
                dance: this.dance
            };
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
    })
    .on('error', console.log)
    .start();

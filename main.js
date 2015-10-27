var Cylon = require('cylon');
var sys = require('sys')
var exec = require('child_process').exec;
var http = require('http');

var Config = {
    buzzerBreakDuration: 500,
    buzzerDefaultLength: 200,
    soundDetectionThreshold: 450,
    soundDetectionBreakDuration: 5000,
    voiceSynthesizerInterval: 500,
    logger: true,
    debug: true,
    startAPI: false
}

var CM = {
    speechQueue: [],
    buzzerQueue: [],
    detectSound: 0,

    work: function (my) {
        /* INIT  FUNCTION */
        this.led.turnOn();
        //my.initRemoteCommandReceiver();
        this.reset();
        this.bind();
        this.initVoiceSynthesizer();
        this.initBuzzerWorker();

        this.beep(700);
        this.beep(200);
        this.beep(200);

        this.log("work() ok!");
    },

    initVoiceSynthesizer: function () {
        setTimeout(this.speechWorker, Config.voiceSynthesizerInterval);
    },

    speechWorker: function () {
        var my = this;
        this.led.turnOff();
        if (this.speechQueue.length !== 0) {
            this.blockSoundDetection();
            var msg = this.speechQueue.shift();
            this.led.turnOn();
            this.runVoiceSynthesizer(msg, function (err, out, code) {
                my.releaseSoundDetection();
                setTimeout(my.speechWorker, Config.voiceSynthesizerInterval);
            });
        } else {
            setTimeout(my.speechWorker, Config.voiceSynthesizerInterval);
        }

    },

    runVoiceSynthesizer: function (msg, callback) {
        var cmd = "/home/root/git/intel-edison/speak-cm.sh \"" + msg + "\"";
        this.debug("executing: " + cmd);
        exec(cmd, callback);
    },

    bind: function () {
        var my = this;
        this.ignoreSoundDetection = false;
        my.sound.on('analogRead', function (amplitude) {
            if (my.ignoreSoundDetection === false &&
                (amplitude > Config.soundDetectionThreshold) && my.detectSound < 1) {

                my.debug("sound amplitude = " + amplitude)
                my.ignoreSoundDetection = true;
                my.soundDetected();
                setTimeout(function () {
                    my.debug("reset ignoreSoundDetection");
                    my.ignoreSoundDetection = false;
                }, Config.soundDetectionBreakDuration);
            }
        });

        my.buttonLeft.on('push', function () {
            var item = my.sayings[Math.floor(Math.random() * my.sayings.length)];
            my.beep();
            my.debug("left button pressed say()");
            my.say(item);
        });

        my.buttonRight.on('push', function () {
            my.blockSoundDetection();
            var cmd = "mplayer -volume 60 /home/root/git/intel-edison/vomiting-03.wav";
            my.debug("executing: " + cmd);
            my.beep();
            exec(cmd, function (err, out, code) {
                my.debug("mplayer finished");
                my.releaseSoundDetection();
            });
        });

        //var ignoreProximity = false;
        //my.proximity.on('lowerLimit', function (val) {
        //    if (!ignoreProximity) {
        //        ignoreProximity = true;
        //        console.log("\nproximity " + val)
        //        my.speechQueue.push("Cookie");
        //        count = count + 1;
        //        console.log("count", count);
        //        my.relay.turnOn();
        //
        //        setTimeout(function () {
        //            my.rightHand.angle(180);
        //            my.leftHand.angle(0);
        //            my.head.angle(0);
        //            my.body.angle(0);
        //
        //            setTimeout(function () {
        //                my.body.angle(90);
        //                my.rightHand.angle(90);
        //                my.leftHand.angle(90);
        //                my.head.angle(60);
        //                my.body.angle(90);
        //
        //                setTimeout(function () {
        //                    my.body.angle(90);
        //                    my.rightHand.angle(0);
        //                    my.leftHand.angle(180);
        //                    my.head.angle(120);
        //                    my.body.angle(180);
        //
        //                    setTimeout(function () {
        //                        my.rightHand.angle(90);
        //                        my.leftHand.angle(90);
        //                        my.head.angle(180);
        //                        my.body.angle(180);
        //                        setTimeout(function () {
        //                            my.relay.turnOff();
        //                        }, 1000);
        //                    }, 700);
        //                }, 700);
        //            }, 700);
        //        }, 700);
        //
        //        setTimeout(function () {
        //            ignoreProximity = false;
        //        }, 5000);
        //    }
        //});

    },

    say: function (msg) {
        this.speechQueue.push(msg);
    },

    blockSoundDetection: function () {
        this.detectSound++;
        this.debug("block SD " + this.detectSound);
    },
    releaseSoundDetection: function () {
        this.detectSound--;
        this.debug("release SD " + this.detectSound);
    },

    buzzerWorker: function () {
        var my = this;
        if (this.buzzerQueue.length !== 0) {
            var interval = this.buzzerQueue.shift();
            this.blockSoundDetection();
            this.buzzer.digitalWrite(1);
            setTimeout(function () {
                my.buzzer.digitalWrite(0);
                my.releaseSoundDetection();
            }, interval);
        }
        setTimeout(this.buzzerWorker, interval + Config.buzzerBreakDuration);
    },

    initBuzzerWorker: function () {
        this.buzzerWorker();
    },

    beep: function (interval) {
        if (!interval) {
            interval = Config.buzzerDefaultLength;
        }
        this.buzzerQueue.push(interval);
    },

    soundDetected: function () {
        var my = this;
        my.writeMessage("Sound detected", "blue");
        my.say("What is this noise? Stop it.");
        setTimeout(function () {
            my.clearLCD();
        }, Config.soundDetectionBreakDuration);
    },

    move: function () {
        var that = this;
        that.relay.turnOn();
        that.body.angle(90);
        that.rightHand.angle(90);
        that.leftHand.angle(90);
        that.head.angle(90);
        setTimeout(that.relay.turnOff, 500);
    },

    reset: function () {
        var that = this;
        this.screen.clear();
        this.relay.turnOn();
        this.body.angle(90);
        this.head.angle(90);
        this.rightHand.angle(90);
        this.leftHand.angle(90);
        setTimeout(function () {
            that.relay.turnOff();
        }, 1000);
    },

    clearLCD: function () {
        this.screen.clear();
    },

    debug: function (msg) {
        if (Config.debug) {
            console.log(new Date().toLocaleTimeString() + " " + msg);
        }
    },

    log: function (msg) {
        if (Config.logger) {
            console.log(new Date().toLocaleTimeString() + " " + msg);
        }
    },

    writeMessage: function (message, color) {
        var that = this;
        var str = message.toString();
        while (str.length < 16) {
            str = str + " ";
        }
        this.debug("write LCD msg", message);
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

    name: "Cookie Monster",

    sayings: ["I would do anything for a cookie.",
        "Lunch time. Lunch alert. Lunch alert",
        "C is for Cookie and cookie is for me!"
    ],

    connections: {
        edison: {
            adaptor: "intel-iot"
        }
    },

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
            lowerLimit: 700,
            upperLimit: 900
        },

        screen: {
            driver: "upm-jhd1313m1",
            connection: "edison"
        }
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
    },

    initRemoteCommandReceiver: function () {
        this.debug('inside init');
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

    }
};

if (Config.startAPI) {
    Cylon.api({
        host: "0.0.0.0",
        port: "3000"
    })
}

Cylon.robot(CM)
    .on('error', console.error)
    .start();

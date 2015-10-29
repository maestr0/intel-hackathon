var Cylon = require('cylon');
var sys = require('sys');
//var exec = require('child_process').exec;
var exec = require('exec-queue');
var http = require('http');
var Slack = require('slack-client');


var Config = {
    name: "Cookie Monster",
    buzzerBreakDuration: 200,
    buzzerDefaultLength: 200,
    soundDetectionThreshold: 750,
    soundDetectionBreakDuration: 5000,
    soundDetectionInterval: 500,
    voiceSynthesizerInterval: 500,
    logger: true,
    isUnMuted: true,
    debug: true,
    startAPI: false,
    audioVolume: 60,
    slack: {
        slackToken: 'xoxb-13361221814-18d8zqhgNi9RuvPEaQdnygag',
        autoReconnect: true,
        autoMark: true,
        commands: {
            execute: "execute ",
            mute: "mute",
            say: "say ",
            move: "move ",
            help: "help",
            audio: "audio",
            lunchLunch: "lunch lunch",
            unmute: "unmute"
        }
    },
    sayings: ["I would do anything for a cookie.",
        "Lunch time. Lunch alert. Lunch alert",
        "C is for Cookie and cookie is for me!"
    ]
};

var CM = {
    speechQueue: [],
    buzzerQueue: [],
    detectSound: 0,
    isUnMuted: Config.isUnMuted,
    slack: new Slack(Config.slack.slackToken, Config.slack.autoReconnect, Config.slack.autoMark),


    work: function () {
        /* INIT  FUNCTION */
        this.led.turnOn();
        this.reset();
        this.bind();
        this.initVoiceSynthesizer();
        this.initBuzzerWorker();
        this.initSlack();

        this.beep(700);
        this.beep(200);
        this.beep(200);

        this.log("work() ok!");
    },

    processSlackMessage: function (trimmedMessage, removePrefix, startWith, channel) {

        if (startWith(trimmedMessage, Config.slack.commands.execute)) {
            var cmd = removePrefix(trimmedMessage, Config.slack.commands.execute);
            exec(cmd, function (err, out, code) {
                channel.send(out);
            });
        } else if (trimmedMessage === Config.slack.commands.mute) {
            this.say("I will shut up!");
            this.isUnMuted = false;
        } else if (trimmedMessage === Config.slack.commands.unmute) {
            this.isUnMuted = true;
            this.say("Cookies");
        } else if (trimmedMessage === Config.slack.commands.lunchLunch) {
            this.say("Lunch, lunch, lunch. Stop working, let's go and eat something!");
        } else if (startWith(trimmedMessage, Config.slack.commands.audio)) {
            var text = removePrefix(trimmedMessage, Config.slack.commands.audio);
            this.playAudio(text)
        } else if (trimmedMessage === Config.slack.commands.help) {
            var commands = "";
            for (cmd in Config.slack.commands) {
                commands += "\n" + Config.slack.commands[cmd];
            }
            channel.send("Available commands: " + commands);
        } else if (startWith(trimmedMessage, Config.slack.commands.say)) {
            var text = removePrefix(trimmedMessage, Config.slack.commands.say);
            this.say(text);
        } else if (startWith(trimmedMessage, Config.slack.commands.move)) {
            channel.send("not implemented");
        }
        else {
            channel.send("Got it!" + trimmedMessage);
        }
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

    bind: function () {
        var my = this;
        this.ignoreSoundDetection = false;
        my.sound.on('analogRead', function (amplitude) {
            if (my.ignoreSoundDetection === false && (amplitude > Config.soundDetectionThreshold) && my.detectSound < 1 && my.isUnMuted) {
                my.ignoreSoundDetection = true;
                my.debug("sound amplitude = " + amplitude);
                my.soundDetected();
                setTimeout(function () {
                    my.debug("reset ignoreSoundDetection");
                    my.ignoreSoundDetection = false;
                }, Config.soundDetectionBreakDuration);
            } else {
                my.ignoreSoundDetection = true;
                setTimeout(function () {
                    my.ignoreSoundDetection = false;
                }, Config.soundDetectionInterval);
            }
        });

        my.buttonLeft.on('push', function () {
            var item = my.sayings[Math.floor(Math.random() * my.sayings.length)];
            my.beep();
            my.debug("left button pressed say()");
            my.say(item);
        });

        my.buttonRight.on('push', function () {
            my.beep();
            my.playAudio("vomiting-03.wav");
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

    initVoiceSynthesizer: function () {
        setTimeout(this.speechWorker, Config.voiceSynthesizerInterval);
    },

    runVoiceSynthesizer: function (msg, callback) {
        if (this.isUnMuted) {
            var cmd = "/home/root/git/intel-edison/speak-cm.sh \"" + msg + "\"";
            this.debug("executing: " + cmd);
            exec(cmd, callback);
        }
    },

    playAudio: function (path) {
        var my = this;
        if (this.isUnMuted) {
            my.blockSoundDetection();
            var cmd = "mplayer -volume " + Config.audioVolume + " /home/root/git/intel-edison/audio/" + path;
            my.debug("executing: " + cmd);
            exec(cmd, function (err, out, code) {
                my.debug("mplayer finished");
                my.releaseSoundDetection();
            });
        }
    },

    say: function (msg) {
        this.speechQueue.push(msg);
    },

    blockSoundDetection: function () {
        this.detectSound++;
        this.debug("block SD " + this.detectSound);
    },

    slackMessageProcessor: function (message) {
        var makeMention = function (userId) {
            return '<@' + userId + '>: ';
        };

        var isDirect = function (userId, messageText) {
            var userTag = makeMention(userId);
            return messageText &&
                messageText.length >= userTag.length &&
                messageText.substr(0, userTag.length) === userTag;
        };

        var startWith = function (string, startWith) {
            return trimmedMessage.substr(0, startWith.length) === startWith;
        };

        var removePrefix = function (string, prefix) {
            return string.substr(prefix.length, string.length).trim();
        };

        var channel = this.slack.getChannelGroupOrDMByID(message.channel);
        var trimmedMessage = removePrefix(message.text, makeMention(this.slack.self.id));

        if (message.type === 'message' && isDirect(this.slack.self.id, message.text)) {
            this.processSlackMessage(trimmedMessage, removePrefix, startWith, channel);
        }
    },

    releaseSoundDetection: function () {
        this.detectSound--;
        this.debug("release SD " + this.detectSound);
    },

    buzzerWorker: function () {
        var my = this;
        if (this.buzzerQueue.length !== 0) {
            this.blockSoundDetection();
            var interval = this.buzzerQueue.shift();
            if (this.isUnMuted) {
                setTimeout(function () {
                    my.buzzer.digitalWrite(1);
                }, 50);

                setTimeout(function () {
                    my.buzzer.digitalWrite(0);
                    setTimeout(function () {
                        my.releaseSoundDetection();
                    }, 100);
                    setTimeout(my.buzzerWorker, Config.buzzerBreakDuration);
                }, interval + 50);
            }
        } else {
            setTimeout(this.buzzerWorker, Config.buzzerBreakDuration);
        }
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

    name: Config.name,

    sayings: Config.sayings,

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

    initSlack: function () {
        var my = this;
        this.slack.on('message', function (message) {
            my.slackMessageProcessor(message);
        });

        this.slack.on('error', function (err) {
            console.error("Slack Error", err);
        });

        this.slack.on('open', function () {
            console.log("Connected to " + my.slack.team.name + " as @" + my.slack.self.name);
        });
        this.slack.login();
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

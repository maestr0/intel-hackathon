var Cylon = require('cylon');
var sys = require('sys');
var exec = require('exec-queue');
var http = require('http');
var Slack = require('slack-client');

var Config = {
    name: "Cookie Monster",
    buzzerWorkerInterval: 200,
    buzzerDefaultLength: 200,
    soundDetectionThreshold: 750,
    soundDetectionBreakDuration: 5000,
    soundDetectionInterval: 500,
    voiceSynthesizerWorkerInterval: 500,
    moveWorkerInterval: 500,
    audioWorkerInterval: 500,
    audioWorkerBreakDuration: 1000,
    moveDuration: 5900,
    isUnMuted: true,
    logLevel: 'debug',
    startAPI: false,
    audioVolume: 60,
    slack: {
        slackToken: process.env.SLACK_TOKEN,
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

var winston = require('winston')
require('winston-loggly');
winston.level = Config.logLevel;

winston.add(winston.transports.Loggly, {
    token: process.env.LOGGY_TOKEN,
    subdomain: "maestr0",
    tags: ["cookie-monster"],
    json: true,
    isBulk: true,
    level: Config.logLevel
});
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {colorize: false});
winston.add(winston.transports.File, {filename: 'cookie.log'});

Cylon.config({
    logger: function (msg) {
        winston.log("info", msg);
    }
});

var CM = {
    speechQueue: [],
    buzzerQueue: [],
    audioQueue: [],
    moveQueue: [],
    lcdQueue: [],
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
        this.initMoveWorker();
        this.initAudioPlayerWorker();
        this.initSlack();

        this.beep(700);
        this.beep(200);
        this.beep(200);

        this.log("CM start ok! " + new Date());
    },

    processSlackMessage: function (msg, removePrefix, startWith, channel) {

        if (startWith(msg, Config.slack.commands.execute)) {
            var cmd = removePrefix(msg, Config.slack.commands.execute);
            exec(cmd, function (err, out, code) {
                channel.send(out);
            });
        } else if (msg === Config.slack.commands.mute) {
            this.writeMessage("Muted");
            this.isUnMuted = false;
        } else if (msg === Config.slack.commands.unmute) {
            this.isUnMuted = true;
            this.writeMessage("Unmuted");
            this.say("Cookies");
        } else if (msg === Config.slack.commands.lunchLunch) {
            this.say("Lunch, lunch, lunch. Stop working, let's go and eat something!");
        } else if (startWith(msg, Config.slack.commands.audio)) {
            var text = removePrefix(msg, Config.slack.commands.audio).trim();
            if (text) {
                this.audioQueue.push(text);
            } else {
                this.listAudioFiles(channel);
            }
        } else if (msg === Config.slack.commands.help) {
            var commands = "";
            for (cmd in Config.slack.commands) {
                commands += "\n" + Config.slack.commands[cmd];
            }
            channel.send("Available commands: " + commands);
        } else if (startWith(msg, Config.slack.commands.say)) {
            var text = removePrefix(msg, Config.slack.commands.say);
            this.say(text);
        } else if (startWith(msg, Config.slack.commands.move)) {
            var text = removePrefix(msg, Config.slack.commands.say);
            this.moveQueue.push(text);
        }
        else {
            channel.send("I don't know what you want ;( ");
        }
    },

    listAudioFiles: function (channel) {
        var cmd = "ls /home/root/git/intel-edison/audio"
        exec(cmd, function (err, out, code) {
            channel.send(out);
        });

    },

    moveWorker: function () {
        var my = this;
        if (this.moveQueue.length !== 0) {
            var msg = this.moveQueue.shift();
            this.performMove(msg, function (err, out, code) {
                setTimeout(my.moveWorker, Config.moveWorkerInterval);
            });
        } else {
            setTimeout(my.moveWorker, Config.moveWorkerInterval);
        }
    },

    performMove: function (command, callback) {
        var my = this;
        my.debug("Move " + command);
        const moves = command.split(",");
        if (moves && moves.length === 5) {
            my.blockSoundDetection();
            my.relay.turnOn();
            my.debug(moves[0], moves[1], moves[2], moves[3], moves[4]);
            this.head.angle(parseInt(moves[0]));
            this.body.angle(parseInt(moves[1]));
            this.leftHand.angle(parseInt(moves[2]));
            this.rightHand.angle(parseInt(moves[3]));
            setTimeout(function () {
                my.relay.turnOff();
            }, Config.moveDuration);
            setTimeout(function () {
                my.releaseSoundDetection();
                callback();
            }, Config.moveDuration + parseInt(moves[4]));
        } else {
            my.log("Incorrect command");
            callback();
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
                setTimeout(my.speechWorker, Config.voiceSynthesizerWorkerInterval);
            });
        } else {
            setTimeout(my.speechWorker, Config.voiceSynthesizerWorkerInterval);
        }
    },

    audioPlayerWorker: function () {
        var my = this;
        if (this.audioQueue.length !== 0) {
            this.blockSoundDetection();
            var audioFile = this.audioQueue.shift();
            this.executeAudioPlayer(audioFile, function (err, out, code) {
                my.releaseSoundDetection();
                setTimeout(my.audioPlayerWorker, Config.audioWorkerInterval);
            });
        } else {
            setTimeout(my.audioPlayerWorker, Config.audioWorkerInterval);
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
            my.audioQueue.push("vomiting-03.wav");
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

    initMoveWorker: function () {
        this.moveWorker();
    },

    initVoiceSynthesizer: function () {
        this.speechWorker();
    },

    initAudioPlayerWorker: function () {
        this.audioPlayerWorker();
    },

    runVoiceSynthesizer: function (msg, callback) {
        if (this.isUnMuted) {
            var cmd = "/home/root/git/intel-edison/speak-cm.sh \"" + msg + "\"";
            this.debug("executing: " + cmd);
            exec(cmd, callback);
        }
    },

    executeAudioPlayer: function (filename, callback) {
        var my = this;
        if (this.isUnMuted) {
            var cmd = "mplayer -volume " + Config.audioVolume + " /home/root/git/intel-edison/audio/" + filename;
            my.debug("executing: " + cmd);
            exec(cmd, callback);
        }
    },

    say: function (msg) {
        this.speechQueue.push(msg);
    },

    blockSoundDetection: function () {
        this.detectSound++;
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

        if (message.text) {
            var channel = this.slack.getChannelGroupOrDMByID(message.channel);
            var trimmedMessage = removePrefix(message.text, makeMention(this.slack.self.id));

            if (message.type === 'message' && isDirect(this.slack.self.id, message.text)) {
                this.processSlackMessage(trimmedMessage, removePrefix, startWith, channel);
            }
        }
    },

    releaseSoundDetection: function () {
        this.detectSound--;
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
                    setTimeout(my.buzzerWorker, Config.buzzerWorkerInterval);
                }, interval + 50);
            }
        } else {
            setTimeout(this.buzzerWorker, Config.buzzerWorkerInterval);
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
        winston.log('debug', msg);
    },

    log: function (msg) {
        winston.log('info', msg);
    },

    writeMessage: function (message, color) {
        var that = this;
        var line1 = message.toString();
        while (line1.length < 16) {
            line1 = line1 + " ";
        }

        this.debug("write LCD msg", message);
        that.screen.setCursor(0, 0);
        that.screen.write(line1);
        if (line1.length > 16) {
            var line2 = line1.substring(16);
            that.screen.setCursor(0, 1);
            that.screen.write(line2);
        }

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
            winston.log('error', "Slack Error: " + err);
        });

        this.slack.on('open', function () {
            my.log("Connected to " + my.slack.team.name + " as @" + my.slack.self.name);
            my.writeMessage("Slack OK");
            my.beep(200);
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
    .on('error', winston.error)
    .start();

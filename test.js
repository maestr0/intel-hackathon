
var Cylon = require('cylon');

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
        relay: {driver: 'led', pin: 4},
        buzzer: {driver: "direct-pin", pin: 7, connection: "edison"},
        button2: {driver: 'button', pin: 8},
        led: {driver: 'led', pin: 13},

        proximity: {driver: 'analog-sensor', pin: 0, lowerLimit: 20, upperLimit: 900},
        sound: {driver: "analog-sensor", pin: 1, connection: "edison", lowerLimit: 40, upperLimit: 500},
        
        screen: { driver: "upm-jhd1313m1", connection: "edison" }
    },

    isBeeping: false,

    work: function (my) {
        my.beep();
        
        setTimeout(function(){
            my.beep();
            setTimeout(function(){
                my.beep();
            }, 100);
        }, 500);
  
        this.writeMessage("test test test test", "red");
        
        my.relay.turnOff();
        my.led.turnOn();
        
        my.body.angle(90);
        my.rightHand.angle(90);                                                                
        my.leftHand.angle(90);
        my.head.angle(90);        
        
        var soundScan = true;
        my.sound.on('upperLimit', function (val) {
            if(soundScan && !my.isBeeping){                
                soundScan = false;                
                my.writeMessage("Sound = " + val);
                my.beep();
                setTimeout(function(){
                    soundScan = true;
                    my.writeMessage("");
                }, 1500);
                
            }            
        });

        my.button.on('push', function () {
            my.beep();            
            my.relay.turnOff();
            my.head.angle(180);  
            my.writeMessage("button 1", "blue");
        });
        var move = true;
        my.button2.on('push', function () {
            my.beep();            
            my.writeMessage("button 2", "green");
            my.relay.turnOn();
            if(move) {
                my.head.angle(0);  
                my.rightHand.angle(0);  
                my.leftHand.angle(0);  
                my.body.angle(0);  
                move = !move;
            } else {
                my.head.angle(180);  
                my.rightHand.angle(180);  
                my.leftHand.angle(180);  
                my.body.angle(180);  
                move = !move;
            }
        });
        
        var proximityScan = true;
        my.proximity.on('lowerLimit', function (val) {              
            if(proximityScan){
                proximityScan = false;                
                my.writeMessage("Proxy = " + val);
                my.beep();
                setTimeout(function(){
                    proximityScan = true;
                    my.writeMessage("");
                }, 1500);
                
            }
        });
        
        console.log("test started");
    },
    beep: function(){
        var my = this;
        my.isBeeping = true;
        var my = this;
        my.buzzer.digitalWrite(1);        
        setTimeout(function(){
            my.buzzer.digitalWrite(0);
            setTimeout(function(){                
                my.isBeeping = false;
            }, 50);
        }, 50);
        
    },
    writeMessage: function(message, color) {
        var that = this;
        var str = message.toString();
        while (str.length < 16) {
            str = str + " ";
        }
        console.log(message);
        that.screen.setCursor(0,0);
        that.screen.write(str);
        switch(color)
        {
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
    }
}).start();



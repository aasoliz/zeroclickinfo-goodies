/*
Audio file is Notification Up II by FoolBoyMedia (http://www.freesound.org/people/FoolBoyMedia/sounds/234563/)
Used with permission.
License: CC BY-NC 3.0 http://creativecommons.org/licenses/by-nc/3.0/
*/

(function (env) {
    'use strict';

    var MAX_TIME = 359999, // => 99 hrs 59 mins 59 secs
        soundUrl = DDG.get_asset_path('timer', 'alarm.mp3'),
        Timer;

    // helper methods

    // add zeros to beginning of string
    function padZeros(n, len) {
        var s = n.toString();
        while (s.length < len) {
            s = '0' + s;
        }
        return s;
    }

    // split seconds into hours, minutes, seconds
    function getHrsMinsSecs(totalSeconds) {
        var result = {};

        result.hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        result.minutes = Math.floor(totalSeconds / 60);
        result.seconds = Math.floor(totalSeconds % 60);

        return result;
    }

    // get time in seconds from query
    function parseQueryForTime() {
        var q = DDG.get_query().replace('timer', '').replace('online', '').replace('s','sec').replace('m','min'),
            regex = new RegExp(/([\d]+\.?[\d]*) ?(min|sec|h)/),
            time = 0,
            match,
            val,
            unit;

        while (true) {
            match = regex.exec(q);
            if (match) {
                val = parseFloat(match[1]);
                unit = match[2];
                if (unit === 'h') {
                    time += val * 60 * 60;
                }
                else if (unit === 'min') {
                    time += val * 60;
                }
                else if (unit === 'sec') {
                    val = Math.round(val);
                    time += val;
                }
                q = q.replace(match[0], '');
            } else {
                break;
            }
        }

        return (time <= MAX_TIME) ? time : MAX_TIME;
    }

    //play the alarm sound
    function playLoopingSound() {
        function requirePlayer(player) {
            player.play('alarm-sound', soundUrl, {
                autoPlay: true
            });
        }
        DDG.require('audio', requirePlayer);
    }

    // shake it like a timer that's just finished
    function shakeElement($element) {
        var initialAmount = 10,
            swings = 7,
            swingDuration = 100;

        function shake($element, amount, swingsLeft, direction) {
            $element.animate({ left: (direction * amount) + "px" }, swingDuration,
                function () {
                    // decrement values as appropriate
                    swingsLeft--;
                    amount /= 1.2;

                    if (swingsLeft > 0) {
                        // if there's more swings left, have a go at another one
                        // (flipping the direction)
                        shake($element, amount, swingsLeft, direction * -1);
                    } else {
                        // else swing to original position
                        $element.animate({ left: 0 }, swingDuration);
                    }
                });
        }

        // let it loose
        shake($element, initialAmount, swings, 1);
    }

    Timer = function (number, startingTime) {
        // tells whether timer should update or not
        this.running = false;

        // tells whether the half_complete class has been added or not
        // (this is used for styling the progress circle)
        this.halfComplete = false;

        // dom setup
        this.$element = $(Spice.timer.timer());

        this.$nameInput = this.$element.find(".name_input");

        this.$hourInput = this.$element.find(".time_input .hours");
        this.$minuteInput = this.$element.find(".time_input .minutes");
        this.$secondInput = this.$element.find(".time_input .seconds");

        this.$hoursMinutesDisplay = this.$element.find('.time_display .hours_minutes');
        this.$secondsDisplay = this.$element.find('.time_display .seconds');

        this.$progressRotFill = this.$element.find('.rotated_fill');

        // interaction
        this.$nameInput.keyup(this.handleNameInput.bind(this));
        this.$element.find(".time_input input")
            .keyup(this.handleTimeInput.bind(this))
            .focusout(this.handleTimeFocusOut.bind(this));
        this.$element.find('.corner_btn.reset').click(this.handleResetClick.bind(this));
        this.$element.find('.play_pause a').click(this.handleStartStopClick.bind(this));
        this.$element.find('.corner_btn.add_minute').click(this.handleAddMinuteClick.bind(this));
        this.$element.find('.corner_btn.close').click(this.handleCloseClick.bind(this));

        // set starting time if it was passed
        if (startingTime) {
            this.setStartingTime(startingTime);

            var time = getHrsMinsSecs(startingTime);

            // prefill input fields

            // if a larger value exists we want all the smaller ones to be prefilled too
            // so 50 mins will be rendered as __:50:00
            if (time.hours) {
                this.$hourInput.val(padZeros(time.hours, 2));
                this.$minuteInput.val(padZeros(time.minutes, 2));
                this.$secondInput.val(padZeros(time.seconds, 2));
            } else if (time.minutes) {
                this.$minuteInput.val(padZeros(time.minutes, 2));
                this.$secondInput.val(padZeros(time.seconds, 2));
            } else {
                this.$secondInput.val(padZeros(time.seconds, 2));
            }
        } else {
            // default to 1 min
            this.setStartingTime(60);
            this.$minuteInput.val("01");
            this.$secondInput.val("00");
        }

        // prefill name with value
        this.$nameInput.val("Timer " + number);
    };

    $.extend(Timer.prototype, {
        start: function () {
            // if this is the first time timer has started
            // set the timer vals from the inputs
            if (!this.$element.hasClass("status_paused")) {
                this.getStartingTimeFromInput();
            }

            this.running = true;
            this.$element.removeClass("status_paused").addClass("status_running");

            this.renderTime();
        },
        setStartingTime: function (startingTimeSecs) {
            // starting time is in seconds, convert to ms
            this.totalTimeMs = startingTimeSecs * 1000;
            this.timeLeftMs = startingTimeSecs * 1000;
        },
        getStartingTimeFromInput: function () {
            var startHrs = parseInt(this.$hourInput.val(), 10) || 0,
                startMins = parseInt(this.$minuteInput.val(), 10) || 0,
                startSecs = parseInt(this.$secondInput.val(), 10) || 0;

            // make sure values are sane

            // if over 99 hrs, set to max time possible
            if (startHrs > 99) {
                startHrs = 99;
                startMins = 59;
                startSecs = 59;
            }

            // disallow more than 60 mins or secs
            if (startMins > 59) {
                startMins = 59;
            }

            if (startSecs > 59) {
                startSecs = 59;
            }

            this.setStartingTime(startHrs * 3600 + startMins * 60 + startSecs);
        },
        handleStartStopClick: function (e) {
            e.preventDefault();

            // if time hasn't been set yet - do nothing
            if (this.totalTimeMs === 0) {
                return;
            }

            if (this.$element.hasClass("status_running")) {
                this.pause();
            } else if (this.$element.hasClass("status_stopped")) {
                this.reset();
            } else {
                this.start();
            }
        },
        handleNameInput: function (e) {
            //make sure the bang dropdown doesn't trigger
            e.stopPropagation();

            var keycode = e.which || e.keycode,
                $input = $(e.currentTarget);

            // if enter, update timer name
            if (keycode === 13) {
                this.$nameInput.blur();
            }
        },
        handleTimeInput: function (e) {
            //make sure the bang dropdown doesn't trigger
            e.stopPropagation();

            var keycode = e.which || e.keycode,
                $input = $(e.currentTarget);

            // replace any non-digit characters
            $input.val($input.val().replace(/\D/g, ''));

            // update timer values
            this.getStartingTimeFromInput();

            // start if enter was pressed
            if (keycode === 13) {
                this.start();
            }
        },
        handleTimeFocusOut: function (e) {
            var $input = $(e.currentTarget),
                value = $input.val();

            // nothing to format if no text was entered
            if (value.length === 0) {
                return;
            }

            // cap the value at the highest this input can actually handle
            if ($input.hasClass("minutes") || $input.hasClass("seconds")) {
                value = Math.min(value, 59);
            }

            // pad with zeros
            $input.val(padZeros(value, 2));
        },
        renderProgressCircle: function () {
            var progress = 1 - this.timeLeftMs / this.totalTimeMs,
                angle = 360 * progress;

            // the progress circle consists of two clipped divs,
            // each displaying as a half circle
            //
            // one of them rotates based on how much the timer's progressed
            // the other one is stationary, and is only displayed once the timer is half complete

            // the first time we reach progress over 0.5
            // add the "half_complete" class
            if (!this.halfComplete && progress > 0.5) {
                this.halfComplete = true;
                this.$element.addClass("half_complete");
            }

            this.$progressRotFill.css("transform", "rotate(" + angle + "deg)");
        },
        renderTime: function () {
            var time = getHrsMinsSecs(Math.ceil(this.timeLeftMs / 1000));

            // update text timer
            this.$hoursMinutesDisplay.html(padZeros(time.hours, 2) + ":" + padZeros(time.minutes, 2));
            this.$secondsDisplay.html(padZeros(time.seconds, 2));

            this.renderProgressCircle();
        },
        update: function (timeDifference) {
            if (!this.running) {
                return;
            }

            this.timeLeftMs -= timeDifference;

            // handle running out of time
            if (this.timeLeftMs <= 0) {
                this.timeLeftMs = 0;
                playLoopingSound();
                shakeElement(this.$element);
                this.$element.removeClass("status_running").addClass("status_stopped");
                this.running = false;
            }

            this.renderTime();
        },
        handleResetClick: function (e) {
            e.preventDefault();
            this.reset();
        },
        handleAddMinuteClick: function (e) {
            e.preventDefault();

            this.timeLeftMs += 60 * 1000;
            this.totalTimeMs += 60 * 1000;

            // if this makes the timer less than 50% complete, remove the half_complete class
            if (1 - this.timeLeftMs / this.totalTimeMs < 0.5) {
                this.halfComplete = false;
                this.$element.removeClass("half_complete");
            }

            // trigger time re-render
            // (in case it's paused)
            this.renderTime();
        },
        handleCloseClick: function (e) {
            e.preventDefault();

            this.destroy();
        },
        reset: function () {
            // reset starting time from the original input
            this.getStartingTimeFromInput();

            this.halfComplete = false;

            // remove any styling based on timer state
            this.$element.removeClass("status_running status_paused status_stopped half_complete");
        },
        pause: function () {
            this.running = false;
            this.$element.removeClass("status_running").addClass("status_paused");
        },
        destroy: function () {
            this.$element.remove();
            this.destroyed = true;
        }
    });

    env.ddg_spice_timer = function(api_result) {
        
        function onShow() {
            var lastUpdate = new Date().getTime(),
                enteredTime = parseQueryForTime(),
                $dom = Spice.getDOM("timer"),
                $addTimerBtn = $dom.find("#add_timer_btn"),
                oldTitle = document.title,
                // start with one timer initially
                firstTimer = new Timer(1, enteredTime),
                timers = [firstTimer];

            // every 100 ms, update timers
            setInterval(function () {
                var timeDifference = new Date().getTime() - lastUpdate;

                // update all timers
                for (var i = 0; i < timers.length; i++) {
                    timers[i].update(timeDifference);
                }

                // do a sweep for any destroyed timers
                for (var i = 0; i < timers.length; i++) {
                    if (timers[i].destroyed) {
                        timers.splice(i, 1);
                        // very very very small chance of two timers destroyed in the same loop
                        // so just break
                        break;
                    }
                }

                lastUpdate = new Date().getTime();
            }, 100);

            // insert first timer before the add button
            firstTimer.$element.insertBefore($addTimerBtn.parent());

            $addTimerBtn.click(function (e) {
                e.preventDefault();

                // create new timer and insert it before the add button
                var timer = new Timer(timers.length + 1);
                timer.$element.insertBefore($addTimerBtn.parent());
                timers.push(timer);
            });
        }

        Spice.add({
            id: 'timer',
            name: 'Timer',
            signal: 'high',
            data: {},
            meta: {
                sourceName: 'Timer',
                itemType: 'timer'
            },
            templates: {
                detail: Spice.timer.timer_wrapper,
                wrap_detail: 'base_detail'
            },

            //wait for the spice to load before displaying things
            //this makes sure the divs display at the right time so the layout doesn't break
            onShow: onShow
        });
        

    };
}(this));

ddg_spice_timer();

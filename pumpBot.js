var b = require('octalbonescript');
var Jetty = require("jetty");
var tty = new Jetty(process.stdout);

// Clear the screen
tty.reset().clear();

// Configuration

var  pin = {
  moisture: 'P9_39',
  pump: ['P8_14', 'P8_16']
};

// How often to read the moisture value (milliseconds).
var moistureCheckTime = 1000;

// Start pump if moisture [0..1] falls below this value.
var moistureThreshold = 0.5;

// Minimum allowed milliseconds between pump end and start (5 minutes)
var minTimeBetweenPumpRuns = 5 * 60 * 1000;

// Maximum pump runs per day
var maxPumpRunsPerDay = 3;

// Pump run time in milliseconds (5 seconds)
var pumpRunTime = 5 * 1000;


// Set pin modes

b.pinModeSync(pin.pump[0], b.OUTPUT);
b.pinModeSync(pin.pump[1], b.OUTPUT);


// Helper functions

var setPumpState = function(start) {
  b.digitalWriteSync(pin.pump[0], start ? 1 : 0);
  b.digitalWriteSync(pin.pump[1], 0);
};

var stopPump = function() {
  setPumpState(false);
};

var startPump = function() {
  setPumpState(true);
};

var readMoisture = function(callback) {
    var value = b.analogRead(pin.moisture, function(err, moisture) {
      if (err) throw err;
      callback(moisture);
    });
};

var infReadMoisture = function(callback) {
  var readNext = function() {
    readMoisture(callback);
    setTimeout(readNext, moistureCheckTime);
  };
  readNext();
};


// Make sure pump is stopped
stopPump();

// Number of consecutive measurements below the given threshold.
var countMoistureBelowThreshold = 0;

// Store start times of pump runs (newest first).
var pumpRuns = [];

// Returns the number of pump runs this day
var pumpRunsToday = function() {
  // Get time 24 hours before now
  var start = Date.now() - 24 * 60 * 60 * 1000;
  return pumpRuns.reduce(function(count, pumpTime) {
    return pumpTime >= start ? count + 1 : count;
  }, 0);
};

// Returns true if it is ok to run the pump based on the given constraints.
var isOkToStartPump = function() {
    // Enough time passed since last pump run?
  if (pumpRuns.length > 0 && (Date.now() - (pumpRuns[0] + pumpRunTime) < minTimeBetweenPumpRuns)) {
    return false;
  }
  // Maximum pump runs per day exceeded?
  if (pumpRunsToday() >= maxPumpRunsPerDay) {
    return false;
  }
  return true;
};

// Run the pump if allowed by the given contraints.
var runPumpIfAllowed = function() {
  if (isOkToStartPump()) {
    pumpRuns.unshift(Date.now());
    startPump();
    setTimeout(stopPump, pumpRunTime);
  }
};

// Continously read the moisture and start the pump if the value gets to low.
infReadMoisture(function(moisture) {
  // Display some infos
  tty.moveTo([0, 0]).text('Moisture Level: ' + (moisture * 100).toFixed(2) + '% ');
  tty.moveTo([1, 0]).text('Pump runs today: ' + pumpRunsToday() + '  ');
  // Display time of last ten pump runs
  pumpRuns.forEach(function(pumpTime, i) {
    if (i <= 10) {
      tty.moveTo([i + 2, 0]);
      if (i < 10) {
        tty.text('* ' +  new Date(pumpTime));
      } else {
        tty.text('...');
      }
    }
  });
  // If moisture level is to low for 5 consecutive measurements => start pump if allowed.
  if (moisture < moistureThreshold) {
    countMoistureBelowThreshold += 1;
    if (countMoistureBelowThreshold >= 5) {
      runPumpIfAllowed();
      countMoistureBelowThreshold = 0;
    }
  } else {
    countMoistureBelowThreshold = 0;
  }
});

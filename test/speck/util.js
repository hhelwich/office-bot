import Observable from "./speck";

var appendStrs, equalSize, fillLeft, hasData, initData, makeResultString, maxLength, maybeStrToNumber, strContains, verifyStrValue,
  __slice = [].slice;

maxLength = function(strs) {
  var max, str, _i, _len;
  max = 0;
  for (_i = 0, _len = strs.length; _i < _len; _i++) {
    str = strs[_i];
    max = Math.max(max, str.length);
  }
  return max;
};

fillLeft = function(str, size) {
  return ((new Array(size - str.length + 1)).join(" ")) + str;
};

equalSize = function(strs) {
  var length, str, _i, _len, _results;
  length = maxLength(strs);
  _results = [];
  for (_i = 0, _len = strs.length; _i < _len; _i++) {
    str = strs[_i];
    _results.push(fillLeft(str, length));
  }
  return _results;
};

hasData = function(arrays) {
  var array, _i, _len;
  for (_i = 0, _len = arrays.length; _i < _len; _i++) {
    array = arrays[_i];
    if (array.length > 0) {
      return true;
    }
  }
  return false;
};

initData = function(n) {
  var i, _i, _results;
  _results = [];
  for (i = _i = 0; _i < n; i = _i += 1) {
    _results.push([]);
  }
  return _results;
};

appendStrs = function(strs0, strs1) {
  var i, str0, _i, _len, _results;
  _results = [];
  for (i = _i = 0, _len = strs0.length; _i < _len; i = ++_i) {
    str0 = strs0[i];
    _results.push(str0.concat(strs1[i]));
  }
  return _results;
};

strContains = function(str, sub) {
  return (str.indexOf(sub)) !== -1;
};

verifyStrValue = function(val) {
  var sub, _i, _len, _ref;
  _ref = " !,[]".split("");
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    sub = _ref[_i];
    if (strContains(val, sub)) {
      throw Error("invalid value " + val);
    }
  }
  return val;
};

maybeStrToNumber = function(str) {
  var n;
  n = parseInt(str, 10);
  if (isNaN(n)) {
    return str;
  } else {
    return n;
  }
};

makeResultString = function(results) {
  var result;
  return ((function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = results.length; _i < _len; _i++) {
      result = results[_i];
      _results.push((result.join(" ")).trim());
    }
    return _results;
  })()).join(" ");
};

let util = {
  dataOf: function() {
    var activeCount, callback, i, n, next, observable, observables, results, resultsNow, _fn, _i, _j, _len;
    observables = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
    n = observables.length;
    results = (function() {
      var _j, _results;
      _results = [];
      for (i = _j = 0; 0 <= n ? _j < n : _j > n; i = 0 <= n ? ++_j : --_j) {
        _results.push(["["]);
      }
      return _results;
    })();
    resultsNow = initData(n);
    activeCount = n;
    next = function() {
      var result;
      if (hasData(resultsNow)) {
        results = appendStrs(results, equalSize((function() {
          var _j, _len, _results;
          _results = [];
          for (_j = 0, _len = resultsNow.length; _j < _len; _j++) {
            result = resultsNow[_j];
            _results.push(result.join(","));
          }
          return _results;
        })()));
        resultsNow = initData(n);
      }
    };
    Observable.onNext(next);
    _fn = function(i) {
      observable.forEach(function(value) {
        resultsNow[i].push(verifyStrValue("" + value));
      }, function(error) {
        resultsNow[i].push("!" + (verifyStrValue("" + error)));
      }, function() {
        resultsNow[i].push("]");
        activeCount -= 1;
        if (activeCount === 0) {
          next();
          callback(makeResultString(results));
        }
      });
    };
    for (i = _j = 0, _len = observables.length; _j < _len; i = ++_j) {
      observable = observables[i];
      _fn(i);
    }
  },
  Observable: function(str) {
    var events;
    events = str.split(" ");
    return Observable(function(push, next) {
      var nextGroup;
      nextGroup = function() {
        var value, _i, _len, _ref;
        if (events.length > 0) {
          _ref = events.shift().split(",");
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            value = _ref[_i];
            if ((value.indexOf("!")) === 0) {
              next(function() {
                return next(nextGroup);
              });
              throw value.substring(1);
            } else {
              push(maybeStrToNumber(value));
            }
          }
          next(nextGroup);
        }
      };
      next(nextGroup);
    });
  },
  async: function(fn) {
    return setTimeout(fn, 1);
  },
  counter: function() {
    var count;
    count = 0;
    return function() {
      return count++;
    };
  }
};

export default util;

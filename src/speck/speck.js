var Obs, Observable, addListener, appendArray, async, bind, compose, copyArray, createSequence, curry, curryObs, error,
  globals, isEmpty, isFunc, isObservable, isTrue, iterate, listenerId, log, nop, objLength, obsListeners, obsProto,
  observableId, onNext, push, pushValues, removeListener, slice, toArray, toFunc, trigger, triggerEnd, triggerError,
  waitForArgs, waitForObs, _console, _ref, __hasProp = {}.hasOwnProperty;

bind = function(fn, context) {
  return function() {
    return fn.apply(context, arguments);
  };
};

_console = console;

log = bind(_console.log, _console);

error = bind(_console.error, _console);

_ref = Array.prototype;
slice = _ref.slice;
push = _ref.push;

if (typeof TEST !== "undefined" && TEST !== null && TEST) {
  console.log("test mode on");
}

if (typeof DEBUG !== "undefined" && DEBUG !== null && DEBUG) {
  console.log("debug mode on");
}

isTrue = function(value) {
  return value === true;
};

async = function(f) {
  setTimeout(function() {
    onNext();
    return f();
  }, 0);
};

nop = function() {};

isFunc = function(f) {
  return typeof f === "function";
};

toFunc = function(f) {
  if (isFunc(f)) {
    return f;
  } else {
    return nop;
  }
};

toArray = function(args) {
  return slice.call(args, 0);
};

copyArray = function(array) {
  return array.slice();
};

appendArray = function(a1, a2) {
  push.apply(a1, a2);
  return a1;
};

objLength = function(obj) {
  return (Object.keys(obj)).length;
};

isEmpty = function(obj) {
  return objLength(obj) === 0;
};

compose = function() {
  var fns;
  fns = toArray(arguments);
  return function() {
    var fn, result, _i;
    result = (fns.pop()).apply(null, arguments);
    for (_i = fns.length - 1; _i >= 0; _i += -1) {
      fn = fns[_i];
      result = fn(result);
    }
    return result;
  };
};

waitForObs = function(fn, args, n) {
  return function() {
    var args2, i, len, _i, _j;
    args2 = appendArray(copyArray(args), arguments);
    len = args2.length;
    for (i = _i = n; _i >= 1; i = _i += -1) {
      if (!isObservable(args2[len - i])) {
        return waitForObs(fn, args2, n);
      }
    }
    for (i = _j = 0; _j < n; i = _j += 1) {
      args2.unshift(args2.pop());
    }
    return fn.apply(null, args2);
  };
};

curryObs = function(n, fn) {
  return waitForObs(fn, [], n);
};

waitForArgs = function(fn, args) {
  if (args.length >= fn.length) {
    return fn.apply(null, args);
  } else {
    return function() {
      return waitForArgs(fn, args.concat(toArray(arguments)));
    };
  }
};

curry = function(fn) {
  return function() {
    return waitForArgs(fn, toArray(arguments));
  };
};

createSequence = function() {
  var counter;
  counter = 0;
  return function() {
    return counter++;
  };
};

observableId = createSequence();

listenerId = createSequence();

obsListeners = {};

addListener = function(obs, onValue, onError, onEnd) {
  var deregister, lid, listeners;
  listeners = obsListeners[obs._id];
  if (listeners == null) {
    obsListeners[obs._id] = listeners = {};
    if (obs._reg != null) {
      deregister = obs._reg.call(obs);
    }
  }
  lid = listenerId();
  listeners[lid] = {
    onValue: toFunc(onValue),
    onError: toFunc(onError),
    onEnd: toFunc(onEnd)
  };
  return function() {
    delete listeners[lid];
    if (isEmpty(listeners)) {
      delete obsListeners[obs._id];
      if (deregister != null) {
        deregister.call(obs);
        deregister = null;
      }
    }
  };
};

removeListener = function(obs, lid) {};

onNext = nop;

iterate = function(obj, callback) {
  var key, value;
  for (key in obj) {
    if (!__hasProp.call(obj, key)) {
      continue;
    }
    value = obj[key];
    callback(key, value);
  }
};

trigger = curry(function(oid, value) {
  if (value !== void 0) {
    iterate(obsListeners[oid], function(_, listener) {
      listener.onValue(value);
    });
  }
});

triggerError = curry(function(oid, error) {
  iterate(obsListeners[oid], function(_, listener) {
    listener.onError(error);
  });
});

triggerEnd = function(oid) {
  return function() {
    iterate(obsListeners[oid], function(_, listener) {
      listener.onEnd();
    });
  };
};

Obs = function() {
  this._id = observableId();
};

isObservable = function(obs) {
  return obs instanceof Obs;
};

pushValues = function(obs, create) {
  var checkEnd, id, msgCount, next, register;
  register = null;
  id = obs._id;
  msgCount = 0;
  checkEnd = function() {
    if (register == null && msgCount === 0) {
      async(triggerEnd(id));
    }
  };
  next = function(fn) {
    async(function() {
      var e;
      try {
        fn.call(obs);
      } catch (_error) {
        e = _error;
        triggerError(id)(e);
      }
      msgCount -= 1;
      checkEnd();
    });
    msgCount += 1;
  };
  register = create.call(obs, trigger(id), next);
  checkEnd();
  if (register != null) {
    obs._reg = register;
  }
  return obs;
};

globals = {
  map: curryObs(1, function(obs, fn, seed) {
    var deregister, id, ob0, _trigger, _triggerError;
    ob0 = new Obs();
    id = ob0._id;
    _trigger = trigger(id);
    _triggerError = triggerError(id);
    deregister = addListener(obs, function(value) {
      async(function() {
        var e;
        try {
          _trigger(fn(value));
        } catch (_error) {
          e = _error;
          _triggerError(e);
        }
      });
    }, function(e) {
      async(function() {
        _triggerError(e);
      });
    }, function() {
      deregister();
      async(triggerEnd(id));
    });
    return ob0;
  }),
  take: function(count, obs) {
    var deregister, i, id, ob, _trigger, _triggerError;
    ob = new Obs();
    id = ob._id;
    _trigger = trigger(id);
    _triggerError = triggerError(id);
    i = 0;
    deregister = addListener(obs, function(value) {
      if (i < count) {
        async(function() {
          _trigger(value);
        });
      }
      i += 1;
      if (i >= count) {
        deregister();
        async(triggerEnd(id));
      }
    }, function(e) {
      async(function() {
        _triggerError(e);
      });
    }, function() {
      deregister();
      async(triggerEnd(id));
    });
    return ob;
  },
  filter: curryObs(1, function(obs, predicate) {
    var deregister, elements, id, len, ob0, _trigger, _triggerError;
    ob0 = new Obs();
    id = ob0._id;
    _trigger = trigger(id);
    _triggerError = triggerError(id);
    len = predicate.length;
    elements = [];
    deregister = addListener(obs, function(value) {
      var e;
      try {
        if (isTrue(predicate(value))) {
          async(function() {
            _trigger(value);
          });
        }
      } catch (_error) {
        e = _error;
        async(function() {
          _triggerError(e);
        });
      }
    }, function(e) {
      async(function() {
        _triggerError(e);
      });
    }, function() {
      deregister();
      async(triggerEnd(id));
    });
    return ob0;
  })
};

Obs.prototype = obsProto = {
  log: function(prefix) {
    addListener(this, function(value) {
      log(prefix, value);
    }, function(e) {
      error(prefix, e);
    }, function() {
      log(prefix, "<end>");
    });
  },
  forEach: function(onValue, onError, onEnd) {
    return addListener(this, onValue, onError, onEnd);
  },
  map: function(fn) {
    return globals.map(fn, this);
  },
  filter: function(predicate) {
    return globals.filter(predicate, this);
  },
  take: function(count) {
    return globals.take(count, this);
  }
};

Observable = function(creator) {
  return pushValues(new Obs(), creator);
};

Observable.prototype = obsProto;

Observable.onNext = function(callback) {
  onNext = toFunc(callback);
};

Observable.fromArray = function(array) {
  array = array.slice(0);
  return Observable(function(push, next) {
    var pushIfAvailable, pushNext;
    pushIfAvailable = function() {
      if (array.length > 0) {
        next(pushNext);
      }
    };
    pushNext = function() {
      push(array.shift());
      pushIfAvailable();
    };
    pushIfAvailable();
  });
};

Observable.once = function(value) {
  return Observable.fromArray([value]);
};

iterate(globals, function(name, fn) {
  Observable[name] = fn;
});

this.speck = {
  Observable: Observable
};

if (typeof TEST !== "undefined" && TEST !== null && TEST) {
  this.speck._private = {
    toArray: toArray,
    copyArray: copyArray,
    appendArray: appendArray,
    compose: compose,
    curry: curry,
    curryObs: curryObs,
    isFunc: isFunc,
    isObservable: isObservable
  };
}

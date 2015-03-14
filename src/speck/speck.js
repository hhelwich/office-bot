var Obs, Observable, addListener, appendArray, async, bind, compose, copyArray, createSequence, curry, curryObs, error,
  globals, isEmpty, isFunc, isObservable, isTrue, iterate, listenerId, log, nop, objLength, obsListeners, obsProto,
  observableId, onNext, push, pushValues, removeListener, slice, toArray, toFunc, trigger, triggerEnd, triggerError,
  waitForArgs, waitForObs, _console, _ref, __hasProp = {}.hasOwnProperty;

// Binds a function to a context
// :: (->, {}) -> ->
bind = (fn, context) => {
  return () => {
    return fn.apply(context, arguments);
  };
};

// Aliases
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

// Returns true if the given value is of type boolean and is true.
// * -> boolean
isTrue = (value) => {
  return value === true;
};

// Add the given function to the message queue.
// :: (->) ->
async = (f) => {
  setTimeout(() => {
    onNext();
    return f();
  }, 0);
};

// Function that does nothing
// :: ->
nop = () => {};

// Returns `true` if the given value is a function.
// :: * -> boolean
isFunc = (f) => {
  return typeof f === "function";
};

// Returns a function. A function input is returned directly, Other values will result in a function that does nothing.
// :: * -> ->
toFunc = (f) => {
  if (isFunc(f)) {
    return f;
  } else {
    return nop;
  }
};

// Convert an argument object to an array.
// :: Arguments -> [*]
toArray = (args) => {
  return slice.call(args, 0);
};

// Shallow copy an array.
// :: [*] -> [*]
copyArray = (array) => {
  return array.slice();
};

// Appends content of second array to the end of the first array. Returns the changed first array.
// :: ([*], [*]) -> [*]
appendArray = (a1, a2) => {
  push.apply(a1, a2);
  return a1;
};

// Returns the number of own key/value pairs in the given object.
// :: {} -> number
objLength = (obj) => {
  return (Object.keys(obj)).length;
};

// Returns true if the given object has no own key/value pair.
// :: {} -> boolean
isEmpty = (obj) => {
  return objLength(obj) === 0;
};

// Function composition
compose = () => {
  var fns;
  fns = toArray(arguments);
  return () => {
    var fn, result, _i;
    result = (fns.pop()).apply(null, arguments);
    for (_i = fns.length - 1; _i >= 0; _i += -1) {
      fn = fns[_i];
      result = fn(result);
    }
    return result;
  };
};

// Call the given function if the last `n` elements of the `args` array are instances of `Obs`, otherwise return a
// function which waits for more arguments to be appended on the current arguments.
// (->, [*], number) -> ->
waitForObs = (fn, args, n) => {
  return () => {
    var args2, i, len, _i, _j;
    args2 = appendArray(copyArray(args), arguments);
    len = args2.length;
    for (i = _i = n; _i >= 1; i = _i += -1) {
      if (!isObservable(args2[len - i])) {
        return waitForObs(fn, args2, n);
      }
    }
    // The last n arguments are Observables => call function but move Observables from tail to head
    for (i = _j = 0; _j < n; i = _j += 1) {
      args2.unshift(args2.pop());
    }
    return fn.apply(null, args2);
  };
};

// Return a function which calls the given function if its last `n` arguments are instances of Obs, otherwise return a
// function which waits for more arguments to be appended on the given arguments.
curryObs = (n, fn) => {
  return waitForObs(fn, [], n);
};

// Call the given function if enough arguments are given, otherwise return function which waits for more arguments.
// :: (->, [*]) -> *
waitForArgs = (fn, args) => {
  if (args.length >= fn.length) {
    return fn.apply(null, args);
  } else {
    return () => {
      return waitForArgs(fn, args.concat(toArray(arguments)));
    };
  }
};

// Function currying
curry = (fn) => {
  return () => {
    return waitForArgs(fn, toArray(arguments));
  };
};

// Returns a sequence generator function.
// :: -> -> number
createSequence = () => {
  var counter;
  counter = 0;
  return () => {
    return counter++;
  };
};

// Observable unique id generator function.
// :: -> number
observableId = createSequence();

// Unique id generator function for listeners. It would be possible to have a listener id generator per observable but
// then it would be needed to store the generator in the observable itself (for GC) so we make a global generator here
// instead.
// :: -> number
listenerId = createSequence();

// All active listeners to all active observables are stored here.
// :: string -> string -> { onValue: ->, onError: ->, onEnd: -> }
obsListeners = {};

// Add a new listener function for an existing observable.
// Returns a function to deregister the listener.
// :: (Observable, (T ->), (* ->), (->)) ->
addListener = (obs, onValue, onError, onEnd) => {
  var deregister, lid, listeners;
  // Get listeners of observable
  listeners = obsListeners[obs._id];
  if (listeners == null) {
    obsListeners[obs._id] = listeners = {};
    if (obs._reg != null) {
      deregister = obs._reg.call(obs);
    }
  }
  // Add new listener
  lid = listenerId();
  listeners[lid] = {
    onValue: toFunc(onValue),
    onError: toFunc(onError),
    onEnd: toFunc(onEnd)
  };
  // Return deregister function
  return () => {
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

removeListener = (obs, lid) => {};

// A function to be called on the start of each queue message generated by this type.
// Can e.g. be used for debugging.
// :: ->
onNext = nop;

// Iterate key/value pairs of an object
// :: ((string -> *), ((string, *) ->)) ->
iterate = (obj, callback) => {
  var key, value;
  for (key in obj) {
    if (!__hasProp.call(obj, key)) {
      continue;
    }
    value = obj[key];
    callback(key, value);
  }
};

// Emit the given value on the observable with the given id.
// :: string -> * ->
trigger = curry((oid, value) => {
  if (value !== void 0) {
    iterate(obsListeners[oid], (_, listener) => {
      listener.onValue(value);
    });
  }
});

// Emit the given error object on the observable with the given id.
// :: string -> * ->
triggerError = curry((oid, error) => {
  iterate(obsListeners[oid], (_, listener) => {
    listener.onError(error);
  });
});

// End the observable with the given id.
// :: string -> ->
triggerEnd = (oid) => {
  return () => {
    iterate(obsListeners[oid], (_, listener) => {
      listener.onEnd();
    });
  };
};

// Internal Observable constructor function
// :: (->) -> Obs<T>
Obs = () => {
  this._id = observableId();
};

// Returns true if the given value is an observable
// :: * -> boolean
isObservable = (obs) => {
  return obs instanceof Obs;
};

// Calls the given function with a push function to emit values on the given observable.
// (Observable, (->)) -> Observable
pushValues = (obs, create) => {
  var checkEnd, id, msgCount, next, register;
  register = null;
  id = obs._id;
  msgCount = 0; // How much messages are in the queue for this observable
  checkEnd = () => {
    if (register == null && msgCount === 0) { // No more messages in queue => end observable
      async(triggerEnd(id));
    }
  };
  next = (fn) => {
    async(() => {
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
  // ((A -> B), Observable<A>) -> Observable<B>
  map: curryObs(1, (obs, fn, seed) => {
    var deregister, id, ob0, _trigger, _triggerError;
    ob0 = new Obs();
    id = ob0._id;
    _trigger = trigger(id);
    _triggerError = triggerError(id);
    deregister = addListener(obs, (value) => {
      async(() => {
        var e;
        try {
          _trigger(fn(value));
        } catch (_error) {
          e = _error;
          _triggerError(e);
        }
      });
    }, (e) => {
      async(() => {
        _triggerError(e);
      });
    }, () => {
      deregister();
      async(triggerEnd(id));
    });
    return ob0;
  }),
  take: (count, obs) => {
    var deregister, i, id, ob, _trigger, _triggerError;
    ob = new Obs();
    id = ob._id;
    _trigger = trigger(id);
    _triggerError = triggerError(id);
    i = 0; // Number of taken values
    deregister = addListener(obs, (value) => {
      if (i < count) {
        async(() => {
          _trigger(value);
        });
      }
      i += 1;
      if (i >= count) {
        deregister();
        async(triggerEnd(id));
      }
    }, (e) => {
      async(() => {
        _triggerError(e);
      });
    }, () => {
      deregister();
      async(triggerEnd(id));
    });
    return ob;
  },
  filter: curryObs(1, (obs, predicate) => {
    var deregister, elements, id, len, ob0, _trigger, _triggerError;
    ob0 = new Obs();
    id = ob0._id;
    _trigger = trigger(id);
    _triggerError = triggerError(id);
    len = predicate.length;
    elements = [];
    deregister = addListener(obs, (value) => {
      var e;
      try {
        if (isTrue(predicate(value))) {
          async(() => {
            _trigger(value);
          });
        }
      } catch (_error) {
        e = _error;
        async(() => {
          _triggerError(e);
        });
      }
    }, (e) => {
      async(() => {
        _triggerError(e);
      });
    }, () => {
      deregister();
      async(triggerEnd(id));
    });
    return ob0;
  })
};

// Prototype for all Observables.
Obs.prototype = obsProto = {
  log: (prefix) => {
    addListener(this, (value) => {
      log(prefix, value);
    }, (e) => {
      error(prefix, e);
    }, () => {
      log(prefix, "<end>");
    });
  },
  forEach: (onValue, onError, onEnd) => {
    return addListener(this, onValue, onError, onEnd);
  },
  map: (fn) => {
    return globals.map(fn, this);
  },
  filter: (predicate) => {
    return globals.filter(predicate, this);
  },
  take: (count) => {
    return globals.take(count, this);
  }
};

// Constructor function for a new Observable. It should be used without `new`.
export default Observable = (creator) => {
  return pushValues(new Obs(), creator);
};

Observable.prototype = obsProto; // For instanceof

// Will be called at the start of each queue message created by this type
// :: (->) ->
Observable.onNext = (callback) => {
  onNext = toFunc(callback);
};

// Returns an observable which emits all elements of the given array.
// :: [*] -> Observable
Observable.fromArray = (array) => {
  array = array.slice(0); // Shallow copy array
  return Observable((push, next) => {
    var pushIfAvailable, pushNext;
    pushIfAvailable = () => {
      if (array.length > 0) {
        next(pushNext);
      }
    };
    pushNext = () => {
      push(array.shift());
      pushIfAvailable();
    };
    pushIfAvailable();
  });
};

Observable.once = (value) => {
  return Observable.fromArray([value]);
};

// Copy all global functions to the exported object.
iterate(globals, (name, fn) => {
  Observable[name] = fn;
});

this.speck = {
  Observable: Observable
};

// Export internals for white box tests
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
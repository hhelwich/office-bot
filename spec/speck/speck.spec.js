import util from "./util";
import customMatchers from "./matcher";
import O, { _private } from "./speck";

var Observable, async, counter, dataOf;

dataOf = util.dataOf, Observable = util.Observable, async = util.async, counter = util.counter;

describe("Observable", function() {
  beforeEach(function() {
    return jasmine.addMatchers(customMatchers);
  });
  describe("constructor", function() {
    it("is callable as function", function(done) {
      var obs;
      obs = O(function(push, next) {
        next(function() {
          push(42);
        });
      });
      (expect(obs)).toBeInstanceOf(O);
      dataOf(obs, function(data) {
        (expect(data)).toBe("[ 42 ]");
        done();
      });
    });
    it("is callable with “new”", function(done) {
      var obs;
      obs = new O(function(push, next) {
        next(function() {
          push(42);
        });
      });
      (expect(obs)).toBeInstanceOf(O);
      dataOf(obs, function(data) {
        (expect(data)).toBe("[ 42 ]");
        done();
      });
    });
    it("preserves context", function(done) {
      var obs;
      obs = O(function(_, next) {
        var context;
        context = this;
        next(function() {
          (expect(context)).toBe(obs);
          (expect(this)).toBe(obs);
          return done();
        });
      });
    });
    it("can be empty", function(done) {
      var obs;
      obs = O(function() {});
      dataOf(obs, function(data) {
        (expect(data)).toBe("[ ]");
        done();
      });
    });
    it("allows to push values synchronously and asynchronously", function(done) {
      var obs;
      obs = O(function(push, next) {
        next(function() {
          next(function() {
            push(33);
            push(77);
          });
          push(11);
          push(12);
          push(42);
        });
      });
      dataOf(obs, function(data) {
        (expect(data)).toBe("[ 11,12,42 33,77 ]");
        done();
      });
    });
    it("allows to push values and errors synchronously and asynchronously", function(done) {
      var obs;
      obs = O(function(push, next) {
        next(function() {
          push(77);
          next(function() {
            push(11);
            throw "foo";
            push(33);
          });
          push(42);
        });
      });
      dataOf(obs, function(data) {
        (expect(data)).toBe("[ 77,42 11,!foo ]");
        done();
      });
    });
    return describe("register/deregister", function() {
      return it("registers on first listener", function(done) {
        var obs, order;
        order = counter();
        obs = O(function(push, next) {
          (expect(order())).toBe(0); // Constructor function is called synchronously
          // Return register function
          return function() { // Register function
            (expect(order())).toBe(3);
            async(function() {
              return push(42);
            });
            // Return de-register function
            return function() { // All listeners have been removed => de-register
              (expect(order())).toBe(5);
              return done();
            };
          };
        });
        (expect(order())).toBe(1);
        async(function() {
          var removeListener;
          (expect(order())).toBe(2);
          // Attach listener to observable => register function should be called
          removeListener = obs.forEach(function(v) {
            (expect(order())).toBe(4);
            (expect(v)).toBe(42);
            // Remove single listener => de-register function should be called
            return removeListener();
          });
        });
      });
    });
  });
  describe("global functions", function() {
    describe("fromArray", function() {
      it("emits all values asynchronously", function(done) {
        var o;
        o = O.fromArray([1, 2, 3, 4, 5]);
        return dataOf(o, function(data) {
          (expect(data)).toBe("[ 1 2 3 4 5 ]");
          return done();
        });
      });
      return it("emits values time-shared", function(done) {
        var o1, o2;
        o1 = O.fromArray([1, 2, 3, 4, 5]);
        o2 = O.fromArray([6, 7, 8, 9]);
        return dataOf(o1, o2, function(data) {
          (expect(data)).toBe("[ 1   2   3   4   5   ] [   6   7   8   9   ]");
          return done();
        });
      });
    });
    describe("filter", function() {
      var isNotTwo;
      isNotTwo = function(x) {
        return x !== 2;
      };
      it("filters values", function(done) {
        var o0, o1, o2;
        o0 = O.fromArray([1, 2, 3, 4]);
        o1 = O.filter(isNotTwo, o0);
        o2 = (O.filter(isNotTwo))(o0); // also test currying
        return dataOf(o0, o1, o2, function(data) {
          (expect(data)).toBe("[ 1     2 3     4     ] [   1       3     4     ] [     1       3     4     ]");
          return done();
        });
      });
      return xit("can handle predicate function with more than one parameters", function(done) {
        var isEqual, o, skipDuplicates;
        o = O.fromArray([1, 2, 2, 3, 4, 4, 4, 5]);
        isEqual = function(a, b) {
          return a === b;
        };
        skipDuplicates = O.filter(isEqual);
        return dataOf(o, skipDuplicates(o), function(data) {
          (expect(data)).toBe("[ 1   2   2 3   4   4 4 5   ] [   1   2     3   4       5   ]");
          return done();
        });
      });
    });
    describe("once", function() {
      return it("emits one single value", function(done) {
        var o;
        o = O.once(42);
        return dataOf(o, function(data) {
          (expect(data)).toBe("[ 42 ]");
          return done();
        });
      });
    });
    describe("map", function() {
      var square;
      square = function(x) {
        if (x === 3) {
          throw "ooops";
        }
        return x * x;
      };
      it("maps values", function(done) {
        var o, o0;
        o0 = O.fromArray([1, 2, 3, 4]);
        o = O.map(square, o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2   3        4    ] [   1   4   !ooops   16   ]");
          return done();
        });
      });
      it("can be curried", function(done) {
        var o, o0;
        o0 = O.fromArray([1, 2, 3, 4]);
        o = (O.map(square))(o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2   3        4    ] [   1   4   !ooops   16   ]");
          return done();
        });
      });
      it("keeps errors untouched", function(done) {
        var o, o0;
        o0 = Observable("1 2 !foo 4");
        o = (O.map(square))(o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2   !foo      4    ] [   1   4      !foo   16   ]");
          return done();
        });
      });
      it("make synchronous values/errors asynchronous", function(done) {
        var o, o0;
        o0 = Observable("1 2,3 4,!foo 6");
        o = (O.map(square))(o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2,3          4,!foo         6    ] [   1     4 !ooops        16 !foo   36   ]");
          return done();
        });
      });
      return xit("takes functions with two inputs", function(done) {
        var add, o, o0;
        add = function(a, b) {
          return a - b;
        };
        o0 = Observable("1 5 3 2,7 4,!foo !oops 11");
        o = O.map(add(o0));
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1 5    3   2,7       4,!foo         !oops      11    ] [     -4   2     -1 -5        3 !foo       !oops    -7   ]");
          return done();
        });
      });
    });
    describe("take", function() {
      var o0;
      o0 = null;
      beforeEach(function() {
        return o0 = Observable("0 1 2 3 !foo 5 6,7 8 9,!oops, 10");
      });
      it("takes values and ends", function(done) {
        var o;
        o = O.take(3, o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 0   1   2     3 !foo 5 6,7 8 9,!oops 10 ] [   0   1   2 ]");
          return done();
        });
      });
      it("keeps errors but they do not count", function(done) {
        var o;
        o = O.take(9, o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 0   1   2   3   !foo      5   6,7     8   9,!oops     10 ] [   0   1   2   3      !foo   5     6 7   8         9 ]");
          return done();
        });
      });
      return it("takes until end if count is greater than length", function(done) {
        var o;
        o = O.take(100, o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 0   1   2   3   !foo      5   6,7     8   9,!oops         10    ] [   0   1   2   3      !foo   5     6 7   8         9 !oops    10   ]");
          return done();
        });
      });
    });
    return describe("filter", function() {
      var o0;
      o0 = null;
      beforeEach(function() {
        return o0 = Observable("0 1 2 3 !foo 5 6,7 8 9,!oops, 10");
      });
      it("filters values (not errors)", function(done) {
        var isEven, o;
        isEven = function(x) {
          return x % 2 === 0;
        };
        o = O.filter(isEven, o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 0   1 2   3 !foo      5 6,7   8   9,!oops       10    ] [   0     2        !foo       6   8         !oops    10   ]");
          return done();
        });
      });
      return it("emits error if predicate throws", function(done) {
        var isEven, o;
        isEven = function(x) {
          if (x === 5 || x === 8) {
            throw "nooo";
          }
          return x % 2 === 0;
        };
        o = O.filter(isEven, o0);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 0   1 2   3 !foo      5       6,7   8       9,!oops       10    ] [   0     2        !foo   !nooo     6   !nooo         !oops    10   ]");
          return done();
        });
      });
    });
  });
  describe("methods", function() {
    describe("map", function() {
      var square;
      square = function(x) {
        if (x === 3) {
          throw "ooops";
        }
        return x * x;
      };
      return it("maps values", function(done) {
        var o, o0;
        o0 = O.fromArray([1, 2, 3, 4]);
        o = o0.map(square);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2   3        4    ] [   1   4   !ooops   16   ]");
          return done();
        });
      });
    });
    describe("filter", function() {
      var isNotTwo;
      isNotTwo = function(x) {
        return x !== 2;
      };
      return it("filters values", function(done) {
        var o, o0;
        o0 = O.fromArray([1, 2, 3, 4]);
        o = o0.filter(isNotTwo);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2 3   4   ] [   1     3   4   ]");
          return done();
        });
      });
    });
    return describe("take", function() {
      return it("takes values", function(done) {
        var o, o0;
        o0 = O.fromArray([1, 2, 3, 4]);
        o = o0.take(3);
        return dataOf(o0, o, function(data) {
          (expect(data)).toBe("[ 1   2   3     4 ] [   1   2   3 ]");
          return done();
        });
      });
    });
  });
  return describe("white box tests", function() {
    var _;
    _ = _private;
    describe("toArrary", function() {
      return it("converts argument object to array", function() {
        var fn;
        fn = function(a, b, c) {
          return (expect(_.toArray(arguments))).toEqual([1, 2, 3]);
        };
        return fn(1, 2, 3);
      });
    });
    describe("copyArray", function() {
      return it("copies an array", function() {
        var a, b;
        a = [1, 2, 3];
        b = _.copyArray(a);
        (expect(a)).toEqual([1, 2, 3]);
        (expect(b)).toEqual(a);
        return (expect(b)).not.toBe(a);
      });
    });
    describe("appendArray", function() {
      return it("concats two arrays in place", function() {
        var a, a1, a2;
        a1 = [1, 2, 3];
        a2 = [4, 5, 6];
        a = _.appendArray(a1, a2);
        (expect(a)).toEqual([1, 2, 3, 4, 5, 6]);
        (expect(a)).toBe(a1);
        return (expect(a2)).toEqual([4, 5, 6]);
      });
    });
    describe("compose", function() {
      var f1, f2, f3;
      f1 = function(x, y) {
        return x * y;
      };
      f2 = function(x) {
        return x + 3;
      };
      f3 = function(x) {
        return x * x;
      };
      it("composes one function", function() {
        var f;
        f = _.compose(f1);
        return (expect(f(4, 5))).toBe(20);
      });
      it("composes two functions", function() {
        var f;
        f = _.compose(f2, f1);
        return (expect(f(4, 5))).toBe(23);
      });
      return it("composes more functions", function() {
        var f;
        f = _.compose(f3, f2, f3, f2, f1);
        return (expect(f(4, 5))).toBe(283024);
      });
    });
    describe("curry", function() {
      it("keeps one argument function", function() {
        var f;
        f = _.curry(function(x) {
          return x * x;
        });
        return (expect(f(3))).toBe(9);
      });
      it("curries a function", function() {
        var f;
        f = _.curry(function(a, b, c) {
          return a + b * c;
        });
        (expect(f(2, 3, 4))).toBe(14);
        (expect(f(2)(3)(4))).toBe(14);
        (expect(f(2, 3)(4))).toBe(14);
        return (expect(f(2)(3, 4))).toBe(14);
      });
      it("passes arguments if more than expected", function() {
        var f;
        f = _.curry(function(a, b) {
          return (expect(_.toArray(arguments))).toEqual([1, 2, 3]);
        });
        return f(1)(2, 3);
      });
      return it("can be called with empty arguments", function() {
        var f;
        f = _.curry(function(a, b, c) {
          return a + b * c;
        });
        return (expect(f()(1, 2)()()(3))).toBe(7);
      });
    });
    describe("curryObs", function() {
      return it("allows optional arguments", function() {
        var expected, f, f0, f1, f2, o1, o2;
        o1 = O(function() {});
        o2 = O(function() {});
        f = function() {
          return _.toArray(arguments);
        };
        f = _.curryObs(2, f);
        expected = [o1, o2, 1, 2, 3];
        f0 = f(1);
        f1 = f0(2);
        f2 = f1(3);
        (expect((f2(o1))(o2))).toEqual(expected);
        (expect(f2(o1, o2))).toEqual(expected);
        (expect((f1(3, o1))(o2))).toEqual(expected);
        (expect(f1(3, o1, o2))).toEqual(expected);
        f1 = f0(2, 3);
        (expect((f1(o1))(o2))).toEqual(expected);
        (expect(f1(o1, o2))).toEqual(expected);
        (expect((f0(2, 3, o1))(o2))).toEqual(expected);
        (expect(f0(2, 3, o1, o2))).toEqual(expected);
        f0 = f(1, 2);
        f1 = f0(3);
        (expect((f1(o1))(o2))).toEqual(expected);
        (expect(f1(o1, o2))).toEqual(expected);
        (expect((f0(3, o1))(o2))).toEqual(expected);
        (expect(f0(3, o1, o2))).toEqual(expected);
        f0 = f(1, 2, 3);
        (expect((f0(o1))(o2))).toEqual(expected);
        (expect(f0(o1, o2))).toEqual(expected);
        (expect((f(1, 2, 3, o1))(o2))).toEqual(expected);
        return (expect(f(1, 2, 3, o1, o2))).toEqual(expected);
      });
    });
    describe("isFunc", function() {
      it("returns `true` if argument is a function", function() {
        return (expect(_.isFunc(function() {}))).toBe(true);
      });
      return it("returns `false` if argument is not a function", function() {
        var v, _i, _len, _ref;
        _ref = [null, void 0, true, false, "", "0", " ", {}, []];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          (expect(_.isFunc(v))).toBe(false);
        }
      });
    });
    return describe("isObservable", function() {
      it("returns `true` if argument is an observable", function() {
        (expect(_.isObservable(O(function() {})))).toBe(true);
        return (expect(_.isObservable(new O(function() {})))).toBe(true);
      });
      return it("returns `false` if argument is not an observable", function() {
        var v, _i, _len, _ref;
        _ref = [null, void 0, true, false, "", "0", " ", {}, [], function() {}];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          (expect(_.isObservable(v))).toBe(false);
        }
      });
    });
  });
});

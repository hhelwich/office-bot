var gulp = require("gulp");
var traceurCl = require("gulp-traceur-cmdline");
var traceur = require("gulp-traceur");
var uglify = require("gulp-uglify");
var jshint = require("gulp-jshint");

gulp.task("lint", function() {
  gulp.src("./src/**/*.js").pipe(jshint()).pipe(jshint.reporter("default")).pipe(jshint.reporter("fail"));
});

gulp.task("traceur browser", function(done) {
  gulp.src("src/browser/main.js").pipe(traceurCl({
    modules : "inline",
    out     : "build/browser/main.js",
    debug   : false
  }));
  var fs = require("fs");
  var workaround = function() {
    fs.exists(__dirname + "/build/browser/main.js", function (exists) {
      if (exists) {
        done();
      } else {
        setTimeout(workaround, 500);
      }
    });
  };
  workaround();
});

gulp.task("uglify", ["traceur browser"], function() {
  gulp.src("build/browser/main.js").pipe(uglify()).pipe(gulp.dest("build/public"));
});

gulp.task("traceur server", function() {
  gulp.src(["src/**/*.js", "!src/browser/**/*.js"]).pipe(traceur()).pipe(gulp.dest("build"));
});

gulp.task("copy static resources", function() {
  gulp.src("src/browser/static/**/*").pipe(gulp.dest("build/public"));
});

gulp.task("default", ["lint", "uglify", "traceur server", "copy static resources"], function () {});

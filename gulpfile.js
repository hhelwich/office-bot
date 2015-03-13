var gulp = require("gulp");
var traceurCl = require("gulp-traceur-cmdline");
var traceur = require("gulp-traceur");
var uglify = require("gulp-uglify");

gulp.task("traceur browser", function(done) {
  gulp.src("src/browser.js").pipe(traceurCl({
    modules : "inline",
    out     : "build/browser.js",
    debug   : false
  }));
  setTimeout(done, 500);
});

gulp.task("uglify", ["traceur browser"], function() {
  gulp.src("build/browser.js").pipe(uglify()).pipe(gulp.dest("build/static"));
});

gulp.task("traceur server", function() {
  gulp.src(["src/**/*.js", "!src/browser.js"]).pipe(traceur()).pipe(gulp.dest("build"));
});

gulp.task("copy static resources", function() {
  gulp.src("static/**/*").pipe(gulp.dest("build/static"));
});

gulp.task("default", ["uglify", "traceur server", "copy static resources"], function () {
});

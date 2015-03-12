var gulp = require("gulp");
var traceur = require("gulp-traceur");

gulp.task("default", function () {

    gulp.src("static/**/*").pipe(gulp.dest("build/static"));
    gulp.src("src/server.js").pipe(traceur()).pipe(gulp.dest("build"));

});

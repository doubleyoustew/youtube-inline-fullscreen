var gulp            = require('gulp');
var watch           = require('gulp-watch');
const sass          = require('gulp-sass')(require('sass'));

var paths = {

    style: {
        all: './app/*.scss',
        output: './app/'
    }

};

gulp.task('watch:sass', function () {
    gulp.watch(paths.style.all, gulp.series('sass'));
});

gulp.task('sass', function (done) {
    gulp.src(paths.style.all)
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(paths.style.output));
        
    done();
});

gulp.task('watch', gulp.series('watch:sass'));

gulp.task('default', gulp.series('watch'));

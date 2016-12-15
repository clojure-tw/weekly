"use strict";

const gulp = require('gulp-help')(require('gulp'));
const bower = require('gulp-bower');
const purify = require('gulp-purifycss');
const concatCss = require('gulp-concat-css');
const cleanCSS = require('gulp-clean-css');
const gulpIgnore = require('gulp-ignore');
const htmlreplace = require('gulp-html-replace');
const gulpRemoveHtml = require('gulp-remove-html');
const htmlmin = require('gulp-html-minifier');
const gulpAmpValidator = require('gulp-amphtml-validator');
const replace = require('gulp-replace');
const uncss = require('gulp-uncss');

const paths = {
  src: {
    dir:  './resources/public/weekly',
    html: './resources/public/weekly/**/*.html'
  },
  dist: {
    dir:  './build/dist',
    html: './build/dist/**/*.html'
  },
  tmp: {
    dir: './build/tmp',
    css: './build/tmp/app.css'
  }
};

gulp.task('bower', function() {
  return bower();
});

gulp.task('compile:css', ['bower'], function() {
  return gulp.src(['./bower_components/bootstrap/dist/css/bootstrap.min.css',
                   './resources/public/weekly/css/screen.css'])
    .pipe(concatCss('app.css'))
    .pipe(purify([paths.src.html]))
  // remove !importent which not supported by amphtml
    .pipe(replace(/!important/g, ''))
  // remove @-ms-viewport which not supported by amphtml
    .pipe(replace(/@-ms-viewport\s*{\n(.*?)\n}/g, ''))
    .pipe(gulp.dest(paths.tmp.dir));
});

// inline-css inserts the cleaned + minified CSS into HTML
gulp.task('build:inline-css', ['compile:css'], function() {
  return gulp.src(paths.src.html)
    .pipe(htmlreplace({
      'cssInline': {
        'src': gulp.src(paths.tmp.css).pipe(cleanCSS()),
        'tpl': '<style amp-custom>%s</style>'
      }
    }))
    .pipe(gulp.dest(paths.dist.dir));
});

gulp.task('build:remove-html', ['build:inline-css'], function () {
  return gulp.src(paths.dist.html)
    .pipe(gulpRemoveHtml({
      'keyword': 'build:removeHtml'
    }))
    .pipe(gulp.dest(paths.dist.dir));
});

gulp.task('build:minify-html', ['build:remove-html'], function() {
  return gulp.src(paths.dist.html)
    .pipe(htmlmin({collapseWhitespace: true,
                   minifyJS: true,
                   minifyCSS: true,
                   removeComments: true}))
    .pipe(gulp.dest(paths.dist.dir));
});

gulp.task('validate:amphtml', ['build:minify-html'], function() {
return gulp.src(paths.dist.html)
  // Some page no need to support amp, just ignore it
    .pipe(gulpIgnore.exclude(['**/404.html']))
  // Valide the input and attach the validation result to the "amp" property
  // of the file object.
    .pipe(gulpAmpValidator.validate())
  // Print the validation results to the console.
    .pipe(gulpAmpValidator.format())
  // Exit the process with error code (1) if an AMP validation error
  // occurred.
    .pipe(gulpAmpValidator.failAfterError());
});

gulp.task('build', 'build all resources', [
  'bower',
  'compile:css',
  'build:inline-css',
  'build:remove-html',
  'build:minify-html',
  'validate:amphtml'
]);

gulp.task('default', 'build all resources', [
  'build',
]);

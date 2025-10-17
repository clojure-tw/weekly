"use strict";

const gulp = require('gulp');
const bower = require('gulp-bower');
const purify = require('gulp-purifycss');
const concatCss = require('gulp-concat-css');
const cleanCSS = require('gulp-clean-css');
const gulpIgnore = require('gulp-ignore');
const htmlreplace = require('gulp-html-replace');
const gulpRemoveHtml = require('gulp-remove-html');
const htmlmin = require('gulp-html-minifier');
const replace = require('gulp-replace');
const { exec } = require('child_process'); // ✅ 用於 AMP 驗證
const fs = require('fs');

const paths = {
  src: {
    dir: './resources/public/weekly',
    html: './resources/public/weekly/**/*.html'
  },
  dist: {
    dir: './build/dist',
    html: './build/dist/**/*.html'
  },
  tmp: {
    dir: './build/tmp',
    css: './build/tmp/app.css'
  }
};

// --- Tasks ---

gulp.task('bower', function () {
  return bower();
});

gulp.task('compile:css', gulp.series('bower', function () {
  return gulp.src([
    './bower_components/bootstrap/dist/css/bootstrap.min.css',
    './resources/public/weekly/css/screen.css'
  ])
    .pipe(concatCss('app.css'))
    .pipe(purify([paths.src.html]))
    // remove unsupported AMP syntax
    .pipe(replace(/!important/g, ''))
    .pipe(replace(/@-ms-viewport\s*{\n(.*?)\n}/g, ''))
    .pipe(gulp.dest(paths.tmp.dir));
}));

gulp.task('build:inline-css', gulp.series('compile:css', function () {
  return gulp.src(paths.src.html)
    .pipe(htmlreplace({
      'cssInline': {
        'src': gulp.src(paths.tmp.css).pipe(cleanCSS()),
        'tpl': '<style amp-custom>%s</style>'
      }
    }))
    .pipe(gulp.dest(paths.dist.dir));
}));

gulp.task('build:remove-html', gulp.series('build:inline-css', function () {
  return gulp.src(paths.dist.html)
    .pipe(gulpRemoveHtml({ keyword: 'build:removeHtml' }))
    .pipe(gulp.dest(paths.dist.dir));
}));

gulp.task('build:minify-html', gulp.series('build:remove-html', function () {
  return gulp.src(paths.dist.html)
    .pipe(htmlmin({
      collapseWhitespace: true,
      minifyJS: true,
      minifyCSS: true,
      removeComments: true
    }))
    .pipe(gulp.dest(paths.dist.dir));
}));

gulp.task('build:fix-html-link', gulp.series('build:minify-html', function () {
  return gulp.src(paths.dist.html)
    .pipe(replace(/<a\s+href="http/g, '<a target="_blank" href="http'))
    .pipe(gulp.dest(paths.dist.dir));
}));

// ✅ New AMP Validation Task using official CLI
gulp.task('validate:amphtml', gulp.series('build:minify-html', function (done) {
  console.log('🔍 Running AMP validation...');
  
  exec(`npx amphtml-validator ${paths.dist.html}`, (err, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    if (err) {
      console.error('❌ AMP validation failed.');
      done(new Error('AMP validation failed.'));
    } else {
      console.log('✅ AMP validation passed.');
      done();
    }
  });
}));

// --- Build sequence ---
gulp.task('build', gulp.series(
  'bower',
  'compile:css',
  'build:inline-css',
  'build:remove-html',
  'build:minify-html',
  'build:fix-html-link',
  'validate:amphtml'
));

gulp.task('default', gulp.series('build'));

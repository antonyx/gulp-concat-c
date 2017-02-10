![status](https://secure.travis-ci.org/antonyx/gulp-concat-c.svg?branch=master)

## Installation

Install package with NPM and add it to your development dependencies:

`npm install --save-dev gulp-concat-c`

## Information

<table>
<tr>
<td>Package</td><td>gulp-concat-c</td>
</tr>
<tr>
<td>Description</td>
<td>Similar to concat, but creates a C array in the output file.</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.10</td>
</tr>
</table>

## Usage

```js
var concatc = require('gulp-concat-c');

gulp.task('scripts', function() {
  return gulp.src('./lib/*.js')
    .pipe(concatc('files.h'))
    .pipe(gulp.dest('./dist/'));
});
```

This will concat files by your operating systems newLine. It will take the base directory from the first file that passes through it.

## Contribution

If you write tests, follow semver and have something to add, I love accepting pull requests!
Any questions? Make an issue on github! 

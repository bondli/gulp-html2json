# gulp-html2json

translate weex's component to json. this output json used for translate to react dom.

## Usage
    var gulpHtmlToJson = require('gulp-html2json');

    return gulp.src(sourceFiles)
      .pipe(gulpHtmlToJson())
      .pipe(gulp.dest(distDir));


## Releases

### 0.0.1 Initial release
* initial code

### 0.0.2
* bugfix

### 0.0.3
* 支持组件中的script解析

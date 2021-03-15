const { task, series, watch, parallel, src, dest } = require('gulp');
const sass = require('gulp-sass');
const pug = require('gulp-pug');
const rmfr = require('rmfr');
const fs = require('fs');
const connect = require('gulp-connect');
const puppeteer = require('puppeteer');

task('resume-sass', () => {
    return src('src/scss/resume.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(dest('dist/css/'))
        .pipe(connect.reload());
});

task(
    'sass:watch',
    series(() => {
        watch('./src/scss/resume.scss', series('resume-sass'));
        watch('./src/scss/components/*.scss', series('resume-sass'));
        return Promise.resolve('the value is ignored');
    })
);

task('json2pug', () => {
    const locals = JSON.parse(fs.readFileSync('./resume.json', 'utf-8'));
    return src('./src/pug/index.pug')
        .pipe(
            pug({
                locals,
            })
        )
        .pipe(dest('./dist/'))
        .pipe(connect.reload());
});

task('json2pug:watch', () => {
    watch('./resume.json', series('json2pug'));
    watch('./src/pug/*.pug', series('json2pug'));
    return Promise.resolve('the value is ignored');
});

function src2dist(dir) {
    return src(`./src/${dir}/*.*`).pipe(dest(`./dist/${dir}/`));
}

task('copy', () => {
    src2dist('pdf');
    return Promise.resolve('the value is ignored');
});

task('clean', () => {
    rmfr('./dist/');
});

let port = 9000;

task('set-pdf-port', () => {
  port = 9001
  return Promise.resolve('the value is ignored');
})

task('set-screenshot-port', () => {
  port = 9002
  return Promise.resolve('the value is ignored');
})

task('webserver', () => {
    connect.server({
        root: './dist',
        livereload: true,
        port,
    });
    return Promise.resolve('the value is ignored');
});

task('default', series('resume-sass', 'json2pug', 'copy'));

task('dev', parallel('default', 'json2pug:watch', 'sass:watch', 'webserver'));

task('pdf', parallel('set-pdf-port', 'default', 'webserver'), async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()

  // In the case of multiple pages in a single browser, each page can have its own viewport size.
  await page.setViewport({
    width: 1440,
    height: 900
  })

  // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms.
  await page.goto('http://localhost:9001', {waitUntil: 'networkidle0'})

  await page.pdf({
    path: './src/pdf/resume.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: 30,
      right: 40,
      bottom: 30,
      left: 40
    }
  })

  console.log('PDF已生成, 目录./src/pdf')
  browser.close()

  connect.serverClose()
  process.exit(0)
})

// task('screenshot', parallel('set-screenshot-port', 'default', 'webserver'), async () => {
//   const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
//   const page = await browser.newPage()

//   // In the case of multiple pages in a single browser, each page can have its own viewport size.
//   await page.setViewport({
//     width: 1440,
//     height: 900
//   })

//   // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms.
//   await page.goto('http://localhost:9002', {waitUntil: 'networkidle0'})

//   await page.screenshot({
//     path: './screenshot/screenshot.png',
//     fullPage: true,
//     omitBackground: true
//   })

//   console.log('截图已生成, 目录./screenshot')
//   browser.close()

//   connect.serverClose()
//   process.exit(0)
// })

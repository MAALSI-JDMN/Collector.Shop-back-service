var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// import DB
const db = require('./database');

var indexRouter = require('./routes');
var kafkaRouter = require('./routes/kafka');
var demoRouter = require('./routes/demo')
var articlesRouter = require('./routes/articles');
var hydraRouter = require('./routes/hydra');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use('/', indexRouter);
app.use('/articles',articlesRouter);
app.use('/kafka', kafkaRouter);
app.use('/demo', demoRouter)
app.use('/hydra', hydraRouter);

// catch 404
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;

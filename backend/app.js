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
var rabbitmqRouter = require('./routes/rabbitmq');
var demoRouter = require('./routes/demo')
var articlesRouter = require('./routes/articles');

var app = express();

// CORS - Autorise les requêtes cross-origin
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/articles',articlesRouter);
app.use('/kafka', kafkaRouter);
app.use('/rabbitmq', rabbitmqRouter);
app.use('/demo', demoRouter)

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

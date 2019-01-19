/**
 * Created by stanislasderoquemaurel on 23/04/2018
 */

const express = require('express'),
      bodyParser = require('body-parser'),
      mongoClient = require('mongodb').MongoClient,
      userRouter = require('./controllers/user.router.js'),
      middlewareHelper = require('./middleware.helper.js'),
      environment = require('./environments/environment.js'),
      db = require('./db.js');

const dbUrl = `mongodb://localhost:27017/disclose`;

const app = express(),
      appRoot = require('app-root-path');

// app.use(bodyParser.json({limit: '50mb'})); // to support JSON-encoded bodies
// app.use(bodyParser.urlencoded({limit: '50mb', extended: true})); // to support URL-encoded bodies

// app.use(express.json({limit: '50mb'}));
// app.use(express.urlencoded({limit: '50mb', extended: true}));

app.use(middlewareHelper.headers);
app.use('/user', userRouter);
app.use(middlewareHelper.errorHandler);


db.connect(dbUrl)
  .then(() => {
    app.listen(8080);
    console.log('Started listening on port 8080 !');
  })
  .catch(err => {
    console.log('Unable to connect to Mongo', err);
    process.exit(1);
  });

module.exports = app;
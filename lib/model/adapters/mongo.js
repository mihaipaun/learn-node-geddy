var path = require('path');
var mongo = require(path.join(process.cwd(), 'node_modules/mongodb-wrapper'));
var Mongo = function (config) {
  if (!geddy.config.db.mongo) {
    throw "No Mongo config defined.";
  }
  if (!config.model) {
    throw "No model defined for the MongoAdapter.";
  }
  if (!geddy.config.db.mongo.db) {
    throw "No db name provided for the MongoAdapter.";
  }
  return new (function() {
    // Model string
    this.model = config.model;
    this.dbName = geddy.config.db.mongo.db;
    this.port = geddy.config.db.mongo.port || 27017;
    this.host = geddy.config.db.mongo.host || 'localhost';
    // Connect to the DB
    this.db = mongo.db(this.host, this.port, this.dbName);

    // Set up the collection
    var collectionName = geddy.inflection.pluralize(this.model).toLowerCase();
    this.db.collection(collectionName);
    this.collection = this.db[collectionName];
    console.log(this.model);
    /*
    * Required Adapter Methods
    */

    // Load a specific instance
    this.load = function(query, opts, callback){
      if (typeof opts == 'function') {
        callback = opts;
        opts = null;
      }
      if (typeof query == 'function') {
        callback = query;
        query = {};
        opts = null;
      }
      var self = this
        , id
        , dbCallback = function(err, doc){
          var instance = {};

          // if there's an error, return early
          if (err) {
            return callback(err, null);
          }

          // if there's a doc, create a model out of it
          if (doc) {
            instance = geddy.model[self.model].create(doc);
          }

          return callback(null, instance);
        };
      if (typeof query == 'string') {
        id = query;
        this.collection.findOne({id: id}, dbCallback);
      } else {
        this.collection.findOne(query, dbCallback);
      }
    };

    // Load all instances matching a query
    this.all = function(query, opts, callback){
      var instances = [];
      var self = this;
      if (typeof opts == 'function') {
        callback = opts;
        opts = null;
      }
      if (typeof query == 'function') {
        callback = query;
        query = {};
        opts = null;
      }
      this.collection.find(query).toArray(function(err, docs){

        // if there's an error, return early
        if (err) {
          return callback(err, null);
        }

        // iterate through the docs and create models out of them
        for (var i in docs) {
          instances.push( geddy.model[self.model].create(docs[i]) )
        }

        return callback(null, instances);

      });
    };

    // Save or update a specific instance
    this.save = function(instance, opts, callback){
      var self = this;
      if (typeof opts == 'function') {
        callback = opts;
        opts = null;
      }
      if (typeof query == 'function') {
        callback = query;
        query = {};
        opts = null;
      }
      // sometimes we won't need to pass a callback
      if (typeof callback != 'function') {
        callback = function(){};
      }

      // Mongo doesn't like it when you send functions to it
      // so lets make sure we're only using the properties
      cleanInstance = instance.toObj();

      // Double check to see if this thing is valid
      instance = geddy.model[this.model].create(cleanInstance);

      if (!instance.isValid()) {
        return callback(instace.errors, null);
      }

      // Check to see if we have this to do item already
      this.collection.findOne({id: instance.id}, function(err, doc){

        if (err) {
          return callback(err, null);
        }

        // if we already have the to do item, update it with the new values
        if (doc) {
          self.collection.update({id: instance.id}, cleanInstance, function(err, docs){
            return callback(instance.errors, instance);
          });
        }

        // if we don't already have the to do item, save a new one
        else {
          instance.saved = true;
          self.collection.save(cleanInstance, function(err, docs){
            return callback(err, instance);
          });
        }

      });
    };

    // Remove a specific instance by id
    this.remove = function(id, opts, callback){
      if (typeof opts == 'function') {
        callback = opts;
        opts = null;
      }
      if (typeof callback != 'function') {
        callback = function(){};
      }

      this.collection.remove({id: id}, function(err, res){
        callback(err);
      });
    };

    /*
    * Mongo Specific Adapter Methods
    */

    // Get all the distinct values of a certain field
    this.distinct = function(query, opts, callback){
      this.collection.distinct(query, {}, function(err, array){
        callback(err, array);
      });
    };

    // Count the number of instances matching a query
    this.count = function(query, opts, callback){
      this.collection.count(query, {}, function(err, num){
        callback(err, num);
      });
    };
  })();
};

exports.Mongo = Mongo;
//pkg=default, wrapper=plain

(function(Backbone, _) {

  
  //SE the namespace
  var SE = {};

  //SE.Emitter
  //----------
  //Emitter is our basic class, with event support & extend function
  SE.Emitter = function () {
  };
  SE.Emitter.extend = Backbone.Model.extend;
  _.extend(SE.Emitter, Backbone.Events);
  _.extend(SE.Emitter.prototype, Backbone.Events);


  Backbone.SE = SE;


  SE.Engine = {};
  //SE.Engine.Base
  //--------------
  //interface for storage engines which describes a certain `sync` method.
  SE.Engine.Base = SE.Emitter.extend({
    //the default implement is proxy to `this[method]` so you can implement `create`, `read`, `update`, and `delete` to describe the sync behavior.
    sync: function (method, model, options) {
      return this[method](model, options);
    }
  }, {
    createSync: function () {
      var engine, sync;

      engine = this.construct.apply(this, arguments);
      sync = _.bind(engine.sync, engine);
      sync.engine = engine;

      return sync;
    },
    //implement this method to make an instance of Engine class.  
    //you may want to use `_.memoize` on this method to singleton your Engine.
    construct: function () {
      throw '`construct` factory method not implemented';
    }
  });


  //SE.Engine.LocalStorage
  //--------------
  //Basically copy-paste from <https://github.com/jeromegn/Backbone.localStorage>
  //
  //    Licensed under MIT license
  //
  //    Copyright (c) 2010 Jerome Gravel-Niquet
  //
  //    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  //
  //    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  //
  //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  SE.Engine.LocalStorage = (function (root, _, Backbone) {

    // A simple module to replace `Backbone.sync` with *localStorage*-based
    // persistence. Models are given GUIDS, and saved into a JSON object. Simple
    // as that.

    // Hold reference to Underscore.js and Backbone.js in the closure in order
    // to make things work even if they are removed from the global namespace

    // Generate a pseudo-GUID by concatenating random hexadecimal.
    function guid() {
      // Generate four random hex digits.
      function s4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      }

      return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
    }

    // Our Store is represented by a single JS object in *localStorage*. Create it
    // with a meaningful name, like the name you'd give a table.
    // window.Store is deprectated, use Backbone.LocalStorage instead
    var Store = function (name) {
      if (!this.localStorage) {
        throw "Backbone.localStorage: Environment does not support localStorage.";
      }
      this.name = name;
      var store = this.localStorage().getItem(this.name);
      this.records = (store && store.split(",")) || [];
    };

    _.extend(Store.prototype, {

      // Save the current state of the **Store** to *localStorage*.
      save: function () {
        this.localStorage().setItem(this.name, this.records.join(","));
      },

      // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
      // have an id of it's own.
      create: function (model) {
        if (!model.id) {
          model.id = guid();
          model.set(model.idAttribute, model.id);
        }
        this.localStorage().setItem(this.name + "-" + model.id, JSON.stringify(model));
        this.records.push(model.id.toString());
        this.save();
        return this.find(model);
      },

      // Update a model by replacing its copy in `this.data`.
      update: function (model) {
        this.localStorage().setItem(this.name + "-" + model.id, JSON.stringify(model));
        if (!_.include(this.records, model.id.toString())) {
          this.records.push(model.id.toString());
        }
        this.save();
        return this.find(model);
      },

      // Retrieve a model from `this.data` by id.
      find: function (model) {
        return this.jsonData(this.localStorage().getItem(this.name + "-" + model.id));
      },

      // Return the array of all models currently in storage.
      findAll: function () {
        // Lodash removed _#chain in v1.0.0-rc.1
        return (_.chain || _)(this.records)
          .map(function (id) {
            return this.jsonData(this.localStorage().getItem(this.name + "-" + id));
          }, this)
          .compact()
          .value();
      },

      // Delete a model from `this.data`, returning it.
      destroy: function (model) {
        if (model.isNew()) {
          return false;
        }
        this.localStorage().removeItem(this.name + "-" + model.id);
        this.records = _.reject(this.records, function (id) {
          return id === model.id.toString();
        });
        this.save();
        return model;
      },

      localStorage: function () {
        return root.localStorage;
      },

      // fix for "illegal access" error on Android when JSON.parse is passed null
      jsonData: function (data) {
        return data && JSON.parse(data);
      },

      // Clear localStorage for specific collection.
      _clear: function () {
        var local = this.localStorage(),
          itemRe = new RegExp("^" + this.name + "-");

        // Remove id-tracking item (e.g., "foo").
        local.removeItem(this.name);

        // Lodash removed _#chain in v1.0.0-rc.1
        // Match all data items (e.g., "foo-ID") and remove.
        (_.chain || _)(local).keys()
          .filter(function (k) {
            return itemRe.test(k);
          })
          .each(function (k) {
            local.removeItem(k);
          });

        this.records.length = 0;
      },

      // Size of localStorage.
      _storageSize: function () {
        return this.localStorage().length;
      }

    });


    return SE.Engine.Base.extend({
      constructor: function (name) {
        SE.Engine.Base.prototype.constructor.apply(this, arguments);

        this.store = new Store(name);
      },
      // localSync delegate to the model or collection's
      // *localStorage* property, which should be an instance of `Store`.
      // window.Store.sync and Backbone.localSync is deprecated, use Backbone.LocalStorage.sync instead
      sync: function (method, model, options) {
        var store = this.store,
          resp,
          errorMessage,
          syncDfd = Backbone.$.Deferred && Backbone.$.Deferred(); //If $ is having Deferred - use it.

        try {

          switch (method) {
          case "read":
            resp = model.id !== undefined ? store.find(model) : store.findAll();
            break;
          case "create":
            resp = store.create(model);
            break;
          case "update":
            resp = store.update(model);
            break;
          case "delete":
            resp = store.destroy(model);
            break;
          }

        } catch (error) {
          if (error.code === 22 && store._storageSize() === 0) {
            errorMessage = "Private browsing is unsupported";
          } else {
            errorMessage = error.message;
          }
        }

        if (resp) {
          if (options && options.success) {
            if (Backbone.VERSION === "0.9.10") {
              options.success(model, resp, options);
            } else {
              options.success(resp);
            }
          }
          if (syncDfd) {
            syncDfd.resolve(resp);
          }

        } else {
          errorMessage = errorMessage || "Record Not Found";

          if (options && options.error) {
            if (Backbone.VERSION === "0.9.10") {
              options.error(model, errorMessage, options);
            } else {
              options.error(errorMessage);
            }
          }

          if (syncDfd) {
            syncDfd.reject(errorMessage);
          }
        }

        // add compatibility with $.ajax
        // always execute callback for success and error
        if (options && options.complete) {
          options.complete(resp);
        }

        return syncDfd && syncDfd.promise();
      }
    }, {
      construct: _.memoize(function (name) {
        return new this(name);
      })
    });

  }(this, _, Backbone));


  //SE.Router.Base
  //--------------
  //interface for routers which decides the proper `SE.Engine` for a model/collection.
  SE.Router = {};
  SE.Router.Base = SE.Engine.Base;


  //SE.Router.LateBind
  //--------------
  //decide which engine to use on the fly(but only once per model)  
  //
  //     sync: Backbone.StorageEngin.Router.LateBind.construct (method, model, options)->
  //       logic_returning_engine_instance model, options

  SE.Router.LateBind = SE.Router.Base.extend({
    constructor: function(cb) {
      this._cb = cb;
    },
    sync: function(method, model, options) {
      var engine = this._cb.apply(this, arguments);
      model.sync = _.bind(engine.sync, engine);

      return model.sync.apply(model, arguments);
    }
  }, {
    construct: function(cb) {
      return new this(cb);
    }
  });


})(Backbone, _);
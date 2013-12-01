//pkg=full, wrapper=plain

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

  /*global chrome*/

  //SE.Engine.ChromeStorage
  //--------------
  //Basically copy-paste from <https://github.com/scryptmouse/Backbone.ChromeStorage>
  //
  //    Released under MIT license
  //
  //    Copyright (c) 2012-2013 Alexandra Grey
  //
  //    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  //
  //    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  //
  //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  SE.Engine.ChromeStorage = (function (root, _, Backbone) {

    var $ = Backbone.$;

    // #ChromeStorage.Wrapper

    // A wrapper around the `chrome.storage.*` API that uses
    // `$.Deferred` objects for greater flexibility.
    function Wrapper(type) {
      type = '' + type || 'local';

      if (!chrome.storage[type]) {
        console.warn('Unknown type %s, defaulting to local', type);
        type = 'local';
      }

      this.type = type;
      this.storage = chrome.storage[this.type];
    }

    // ## _csResponse
    //
    // Private helper function that's used to return a callback to
    // wrapped `chrome.storage.*` methods.
    //
    // It will **resolve** the provided `$.Deferred` object
    // with the response, or **reject** it if there was an
    // error.
    function _csResponse(dfd) {
      return function () {
        var err = chrome.runtime.lastError;
        if (!err) {
          dfd.resolve.apply(dfd, arguments);
        }
        else {
          console.warn("chromeStorage error: '%s'", err.message);
          dfd.reject(dfd, err.message, err);
        }
      };
    }

    // ## chrome.storage.* API
    // Private factory functions for wrapping API methods

    // ### wrapMethod
    //
    // For wrapping **clear** and **getBytesInUse**
    function wrapMethod(method) {
      return function (cb) {
        var dfd = $.Deferred();

        if (typeof cb === 'function') {
          dfd.done(cb);
        }

        this.storage[method](_csResponse(dfd));

        return dfd.promise();
      };
    }

    // ### wrapAccessor
    //
    // For wrapping **get**, **set**, and **remove**.
    function wrapAccessor(method) {
      return function (items, cb) {
        var dfd = $.Deferred();

        if (typeof cb === 'function') {
          dfd.done(cb);
        }

        this.storage[method](items, _csResponse(dfd));

        return dfd.promise();
      };
    }

    // The `Wrapper` prototype has the same methods as the `chrome.storage.*` API,
    // accepting the same parameters, except that they return `$.Deferred` promise
    // and the callback is always optional. If one is provided, it will be added as a
    // **done** callback.
    _(Wrapper.prototype).extend({
      getBytesInUse: wrapMethod('getBytesInUse'),

      clear: wrapMethod('clear'),

      get: wrapAccessor('get'),

      set: wrapAccessor('set'),

      remove: wrapAccessor('remove'),

      // Pick out the relevant properties from the storage API.
      getQuotaObject: function () {
        return _(this.storage).pick(
          'QUOTA_BYTES',
          'QUOTA_BYTES_PER_ITEM',
          'MAX_ITEMS',
          'MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE',
          'MAX_WRITE_OPERATIONS_PER_HOUR');
      }
    });

    // #Backbone.ChromeStorage

    // Public API is essentially the same as Backbone.localStorage.
    function ChromeStorage(name, type) {
      _.bindAll(this);

      this.name = name;
      this.type = type || ChromeStorage.defaultType || 'local';
      this.store = new Wrapper(this.type);

      this.loaded = this.store.get(this.name).
        pipe(this._parseRecords).
        done(function (records) {
          this.records = records;
          chrome.storage.onChanged.addListener(this.updateRecords.bind(this));
        }.bind(this));
    }


    // `Backbone.ChromeStorage.defaultType` can be overridden globally if desired.
    //
    // The current options are `'local'` or `'sync'`.
    ChromeStorage.defaultType = 'local';

    // ### wantsJSON

    // Private helper function for use with a `$.Deferred`'s **pipe**.
    //
    // It mimics the effect of returning a JSON representation of the
    // provided model from a server, in order to satisfy Backbone.sync
    // methods that expect that.
    function wantsJSON(model) {
      return function () {
        return model.toJSON();
      };
    }

    // ### _S4
    // Generate a random four-digit hex string for **_guid**.
    function _S4() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    // ### _guid
    // Pseudo-GUID generator
    function _guid() {
      return (_S4() + _S4() + "-" + _S4() + "-" + _S4() + "-" + _S4() + "-" + _S4() + _S4() + _S4());
    }

    // ### unstringify
    // Gracefully upgrade from stringified models.
    function unstringify(model) {
      return typeof model === 'string' ? JSON.parse(model) : model;
    }

    _(ChromeStorage.prototype).extend({
      // ## Methods for updating the record string
      //
      // ### updateRecords
      updateRecords: function (changes, type) {
        var records_change = changes[this.name];

        if (this._recordsChanged(records_change, type)) {
          this.records = records_change.newValue;
        }
      },

      // *StorageChange* `records_change`
      // *string* `type` is one of 'local' or 'sync'
      _recordsChanged: function (records_change, type) {
        if (type === this.type && records_change) {
          return !_.isEqual(records_change.newValue, this.records);
        }
        else {
          return false;
        }
      },

      // ## CRUD methods
      //
      // ### create
      create: function (model) {
        if (!model.id) {
          model.id = _guid();
          model.set(model.idAttribute, model.id);
        }

        return this.store.set(this._wrap(model), this._created.bind(this, model)).pipe(wantsJSON(model));
      },

      _created: function (model) {
        this.records.push('' + model.id);
        this.save();
      },

      // ### update
      update: function (model) {
        return this.store.set(this._wrap(model), this._updated.bind(this, model)).pipe(wantsJSON(model));
      },

      _updated: function (model) {
        var id = '' + model.id;

        if (!_(this.records).include(id)) {
          this.records.push(id);
          this.save();
        }
      },

      // ### find
      find: function (model) {
        return this.store.get(this._wrap(model)).pipe(this._found.bind(this, model));
      },

      _found: function (model, result) {
        return unstringify(result[this._idOf(model)]);
      },

      // ### findAll
      findAll: function () {
        var modelsDfd = $.Deferred(),
        /* Bind the callback to use once the models are fetched. */
          resolveModels = modelsDfd.resolve.bind(modelsDfd)
          ;

        // Waits until the model IDs have been initially
        // populated, and then queries the storage for
        // the actual records.
        $.when(this.loaded).done(function (/*records*/) {
          var model_ids = this._getRecordIds();

          this.store.get(model_ids, resolveModels);
        }.bind(this));

        return modelsDfd.pipe(this._foundAll);
      },

      _foundAll: function (models) {
        return _(models).map(unstringify);
      },

      // ### destroy
      destroy: function (model) {
        return this.store.
          remove(this._idOf(model), this._destroyed.bind(this, model)).
          pipe(wantsJSON(model));
      },

      _destroyed: function (model) {
        this.records = _.without(this.records, model.id);
        this.save();
      },

      // ## Utility methods
      //
      // ### quota
      // This is mostly relevant in `sync` contexts,
      // given the rate-limited write operations.
      //
      // For `local` contexts, it will just return an object with
      // the `QUOTA_BYTES` property.
      //
      // In `sync` contexts, it will return the above as well as:
      //
      //  * `QUOTA_BYTES_PER_ITEM`
      //  * `MAX_ITEMS`
      //  * `MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE`
      //  * `MAX_WRITE_OPERATIONS_PER_HOUR`
      //
      // It also queries the API with `getBytesInUse`, adding that
      // to the resultant object under the property name `QUOTA_BYTES_IN_USE`.
      quota: function () {
        var q = this.store.getQuotaObject();

        return this.store.getBytesInUse().pipe(function (bytes) {
          return _(q).extend({
            QUOTA_BYTES_IN_USE: bytes
          });
        });
      },

      // ### save
      // Save the current list of model ids into
      // a stringified array with the collection
      // name as key.
      save: function () {
        var o = {};

        o[this.name] = this.records;

        this.store.set(o);
      },

      // ### _getRecordIds
      // Get an array of all model IDs to fetch from storage,
      // prefixed with the collection name
      _getRecordIds: function () {
        return this.records.map(this._idOf);
      },

      // ### _idOf
      // Get the key that the item will be stored as:
      // the collection name followed by the model's id.
      //
      // Accepts a model instance or the id directly.
      _idOf: function (model) {
        return this.name + '-' + (_.isString(model) ? model : model.id);
      },

      // ### _wrap
      // Encapsulate a model into an object that
      // the storage API wants.
      //
      // Accepts a string ID or a model instance.
      _wrap: function (model) {
        var o = {};

        o[this._idOf(model)] = _.isString(model) ? model : model.toJSON();

        return o;
      },

      // ### _parseRecords
      // Takes the object returned from `chrome.storage` with the
      // collection name as a property name, and an array of model ids
      // as the property's value.
      //
      // Legacy support for stringified arrays.
      // It **split**s the string and returns the result.
      _parseRecords: function (records) {
        var record_list = records && records[this.name] ? records[this.name] : null;

        if (_.isArray(record_list)) {
          return record_list;
        }
        else if (typeof record_list === 'string') {
          console.debug('[Backbone.ChromeStorage (%s / %s)] upgrading from stringified array of ids', this.type, this.name);
          return record_list.split(',');
        }
        else {
          return [];
        }
      }
    });

    return SE.Engine.Base.extend({
      constructor: function (name, type) {
        SE.Engine.Base.prototype.constructor.apply(this, arguments);

        this.store = new ChromeStorage(name, type);
      },

      // Largely the same implementation as in Backbone.localSync, except that
      // `$.Deferred` objects are requisite.
      sync: function (method, model, options, error) {
        var store = this.store,
          resp,
          isFn = _.isFunction
          ;

        switch (method) {
          case "read":
            resp = model.id !== null ? store.find(model) : store.findAll();
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
          default:
            var err = new Error('Unknown Method: "' + method + '"');
            resp = $.Deferred();
            resp.reject(resp, err.message, err);
        }

        if (isFn(options.success)) {
          resp.done(options.success);
        }

        if (isFn(options.error)) {
          resp.fail(options.error);
        }

        if (isFn(error)) {
          resp.fail(options.error);
        }

        return resp && resp.promise();
      }
    }, {
      construct: _.memoize(function (name, type) {
        return new this(name, type);
      }, function(name, type) {
        return name + type;
      })
    });

  }(this, _, Backbone));


})(Backbone, _);
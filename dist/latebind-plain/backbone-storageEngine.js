//pkg=latebind, wrapper=plain

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
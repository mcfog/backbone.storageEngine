
//SE.Router.LateBind
//--------------
//decide which engine to use on the fly(but only once per model)  
//
//     sync: Backbone.StorageEngin.Router.LateBind.createSync (method, model, options)->
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

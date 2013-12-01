
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

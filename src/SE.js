
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

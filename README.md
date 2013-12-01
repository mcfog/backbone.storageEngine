backbone.storageEngine
======================

manage your backbone model/collection sync policy easily, with built-in support for localStorage/chrome.storage

### build commands
default build command

    npm i grunt-cli -g
    npm i

roll you own build

    grunt clean dist:<pkg>:<wrapper> uglify

pkg might be `core` / `default` / `full`, or `localstorage` / `chromestorage`. refer `Gruntfile.coffee` for details

wrapper might be `plain` / `amd` / 'amd-lodash' refer `wrapper` directory for details or simply roll your own wrapper 

### use localStorage / chrome.storage

    LocalModel = Backbone.Model.extend {
        sync: Backbone.StorageEngine.Engine.LocalStorage.construct model.name
    }

    ChromeCollection = Backbone.Collection.extend {
        sync: Backbone.StorageEngine.Engine.ChromeStorage.construct model.collection.name
    }

localStorage powered by [jeromegn/Backbone.localStorage](https://github.com/jeromegn/Backbone.localStorage), and chrome.storage powered by [scryptmouse/Backbone.ChromeStorage](https://github.com/scryptmouse/Backbone.ChromeStorage)

### implement your own engine

    MyEngine = Backbone.StorageEngine.Engine.Base.extend {
        constructor: (@name)-> @
        create: (model, options)->
        read: (model, options)->
        update: (model, options)->
        delete: (model, options)->
    }, {
        construct: _.memoize (name)->
            new this name
    }

    MyCollection = Backbone.Collection.extend {
        sync: MyEngine.construct 'my'
    }

### decide which engine to use on the fly
requires `Backbone.StorageEngine.Router.LateBind`

    BaseModel = Backbone.Model.extend {
        sync: Backbone.StorageEngine.Router.LateBind.construct (method, model, options)->
            if model.type is 'local'
                Backbone.StorageEngine.Engine.LocalStorage.construct model.name
            else
                MyEngine.construct model.name
    }



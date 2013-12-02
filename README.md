backbone.storageEngine
======================

manage your backbone model/collection sync policy easily, with built-in support for localStorage/chrome.storage

+ [Annotated Source](http://mcfog.github.io/backbone.storageEngine/docs/backbone-storageEngine.html)
+ [Default Build with localStorage support](https://raw.github.com/mcfog/backbone.storageEngine/master/dist/default-plain/backbone-storageEngine.js) ( [minified](https://raw.github.com/mcfog/backbone.storageEngine/master/dist/default-plain/backbone-storageEngine.min.js) )
+ [Full Build with localStorage AND chromestorage](https://raw.github.com/mcfog/backbone.storageEngine/master/dist/full-plain/backbone-storageEngine.js) ( [minified](https://raw.github.com/mcfog/backbone.storageEngine/master/dist/full-plain/backbone-storageEngine.min.js) )
+ more builds(amd wrapper / latebind) can be built easily

### build commands
default build command

    npm i grunt-cli -g
    npm i

roll you own build

    grunt clean dist:<pkg>:<wrapper> uglify

`<pkg>` might be `core` / `default` / `full`, or `localstorage` / `chromestorage`.  
look [Gruntfile.coffee](https://github.com/mcfog/backbone.storageEngine/blob/master/Gruntfile.coffee) for details

`<wrapper>` might be `plain` / `amd` / `amd-lodash`  
look [wrapper](https://github.com/mcfog/backbone.storageEngine/tree/master/wrapper) directory for details or simply roll your own wrapper 

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



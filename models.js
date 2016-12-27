blue={}

//
// Objects
//

blue.Object={
    meta: { type: "Object" },

    onObjectExtend: function() {
    },
    onObjectCreate: function(obj) {
        return this;
    },
    extend: function(obj) {
        var newObj=Object.create(this);
        newObj.meta={ type: this.meta.type+"Extension"}
        for(key in obj) {
            if(obj.hasOwnProperty(key)) {
               newObj[key]=obj[key]
            }
        }
        newObj.__listeners__=[];
        newObj.__properties__=[];
        newObj.fire("ObjectExtend", newObj);
        newObj.Super=this;
        return newObj;
    },
    mixin: function(obj) {
        Object.assign(this, obj);
    },
    create: function(obj) {
        var objTemplate=Object.create(this);
        var newObj=Object.create(objTemplate);        
        var args=Array.prototype.slice.call(arguments);
        if(obj!=null) {
            for(key in obj) {
                if(obj.hasOwnProperty(key)) {
                    newObj[key]=obj[key]
                }
            }
        }
        args.unshift("ObjectCreate");
        objTemplate.__listeners__=[];
        newObj.fire.apply(newObj, args);
        return newObj;
    },
    fire: function(eventName) {
        var handler="on"+eventName;
        var args=Array.prototype.slice.call(arguments, 1)
        if(handler in this) {
            this[handler].apply(this, args);
        }
        args.unshift(this)
        for(var index in this.__listeners__) {
            listener=this.__listeners__[index];
            if(typeof listener[handler]=="function") {
                listener[handler].apply(listener, args);
            }
        } 
    },
    camelize: function(str, capitalizeFirstWord) {
        var pos=str.indexOf("_")
        if(pos>-1) {
            var parts=str.split("_");
            var rv=parts[0];
            var index=1;
            if(capitalizeFirstWord) {
                index=0;
                rv="";
            }
            while(index<parts.length) {
                var part=parts[index]
                var word=part.charAt(0).toUpperCase()+part.slice(1);
                rv=rv+word;
                index=index+1;
            }
            return rv;
        } else {
            if(capitalizeFirstWord)
                return str.charAt(0).toUpperCase()+str.slice(1);
            else
                return str.charAt(0).toLowerCase()+str.slice(1);
        }
    },
    listenTo: function(obj) {
        obj.__listeners__.push(this);
    },
    stopListeningTo: function(obj) {
        var pos=obj.__listeners__.indexOf(this);
        if(pos>-1) {
            obj.__listeners__.splice(pos, 1);
        }
    },
    load: function(propertyName, value) {
        var property=this.camelize(propertyName, false);
        this[property]=value; 
    },
    get: function(propertyName, value) {
        var property=this.camelize(propertyName, false);
        return this[property]
    },
    set: function(propertyName, value) {
        var property=this.camelize(propertyName, false);
        var oldValue=this[property];
        this[property]=value; 
        this.fire(this.camelize(propertyName, true)+"Change", oldValue, value);
    },
    getObjectType: function() {
        if(this.hasOwnProperty("meta")) {
            return this.meta.type;
        } else {
            return this.meta.type+":instance";
        }
    },
    getObjectName: function() {
        return this.getObjectType();
    },
    log: function(message) {
        console.log(this.getObjectName()+" - "+message);
    },
    trace: function(message) {
        this.log(message);
        console.trace();
    },
    isInstance: function() {
        return !this.hasOwnProperty("meta");
    }
}

// 
// Models
//

blue.Model=blue.Object.extend({
    meta: { type: "Model" },
    getObjectName: function() {
        if(!this.isInstance()) {
            return blue.Object.getObjectName.apply(this);
        } else 
            if(this.meta.primaryKey in this)
                return this.meta.type+":"+this[this.meta.primaryKey];
            else
                return this.meta.type+":new";

    },
    onObjectExtend: function() {
        this.preprocess();
    },
    onObjectCreate: function(obj) {
        if("data" in this) {
            this.parse(this.data);    
        }

        return this;
    },
    preprocess: function() {
        this.meta.keys=[];
        this.meta.attributes=[];
        this.meta.parsedAttributes=[];
        this.meta.preparedAttributes=[];

        if(this.primaryKey) {
            this.meta.primaryKey=this.primaryKey;
        } else {
            this.meta.primaryKey="id";
        }
        this.meta.keys.push(this.meta.primaryKey);


        for(var index in this.attributes) {
            var attr=this.attributes[index];
            this.meta.attributes.push(attr);
            this.meta.keys.push(attr);
        }

        for(var key in this) {
            if(key.startsWith("parse") && key.length>5) {
                var attr=key.substring(5);
                this.meta.keys.push(attr);
                this.meta.parsedAttributes.push(attr);
            }
            if(key.startsWith("prepare") && key.length>7) {
                this.meta.preparedAttributes.push(key.substring(7));
            }
        }

        for(var key in this.paths) {
            this.meta.keys.push(key); 
        }

        for(var key in this.models) {
            this.meta.keys.push(key);
        }
    },

    parse: function(data) {
        var pk=this.meta.primaryKey;
        if(pk in data) {
            this.load(pk, data[pk]);
        }
        
        for(var index in this.meta.attributes) {
            var key=this.meta.attributes[index];
            this.load(key, data[key]);
        }

        for(var index in this.meta.parsedAttributes) {
            var key=this.meta.parsedAttributes[index];
            this.load(key, this["parse"+key](data));
        }

        for(var key in this.meta.paths) {
            this.load(key, this.resolve(this.meta.paths[key], data));
        }

        for(var key in this.meta.models) {
            var modeldata=data[key];
            var model=this.meta.models[key].create();
            model.parse(modeldata);
            this.load(key, model);
        }
    },

    resolve: function(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj)
    },

    prepare: function() {
        var object=blue.Object.create();
        for(var key in this.meta.keys) {
            var attr=this.camelize(this.meta.keys[key]);
            if(this.readonly.indexOf(attr)==-1) {
                if(this.meta.preparedAttributes.indexOf(attr)!=-1) {
                    object.load(attr, this["prepare"+attr]());
                } else {
                    object.load(attr, this[attr]);
                }
            } 
        }
        return object;
    },

});

//
// Resources
//

blue.Http=blue.Object.extend({
    meta: { type: "Http" },
    onObjectCreate: function(setup) {
        if(typeof this.url!="string") {
            throw "bad URL: "+this.url;
        }
        if(this.method==undefined) {
            this.method="GET";
        }

        this.request=new XMLHttpRequest();
    },
    setup: function() {
    },
    send: function() {
        var self=this;
        this.request.onreadystatechange=function() {
            self.onReadyStateChange(self, this);
        }
        for(var header in this.headers) {
            request.setRequestHeader(header, this.headers[header]);
        }
        this.request.open(this.method, encodeURI(this.url), true);
        this.request.send(this.body);
    },
    onReadyStateChange: function() {
        switch(this.request.readyState) {
            case 0:
                this.fire("NotInitialized");
                break;
            case 1:
                this.fire("ConnectionEstablished");
                break;
            case 2:
                this.fire("RequestReceived");
                break;
            case 3:
                this.fire("ProcessingRequest");
                break;
            case 4:
                if(this.request.status>=200 && this.request.status<300)
                    this.status=this.request.status;
                    this.statusMessage=this.request.statusText;
                    this.response=this.request.response;
                    this.fire("Loaded")
                if(this.request.status>=400)
                    this.fire("Failed")
        } 
    }
});

//
// Tests
//

board=blue.Model.extend({
    meta: { type: "Board" },
    attributes: ["id", "name"]
});

user=blue.Model.extend({
    meta: { type: "User" },
    attributes: ["first_name", "last_name"],
    paths: {"board_id":"board.id"},
    models: {"board": board},
    readonly: ["board_id", "board_name"],

    parseBoardName: function(data) {
        if("board" in data)
            return "Board: "+data.board.name;
        else 
            return;
    },

    prepareBoard: function(model) {
        return this.board.id;
    },

    onFirstNameChange: function(oldValue, newValue) {
        console.log("oldValue: "+oldValue);
        console.log("newValue: "+newValue);
    }
});

userWithoutBoard=user.extend({
    models: {},
});

var u=user.create();
var u2=user.create({
    data: {
        id: 3, 
        first_name:"Mahadevan", 
        last_name: "K", 
        board: { 
            id: 2, 
            name: "ICSE"
        }
    }
});
var u3=userWithoutBoard.create({ 
    data: {
        id: 3, 
        first_name:"Mahadevan", 
        last_name: "K", 
        board: { 
            id: 2, 
            name: "ICSE"
        }
    },
    onLastNameChange: function(oldValue, newValue) {
        console.log("oldValue: "+oldValue);
        console.log("newValue: "+newValue);
    }
});

console.log(u);
console.log(u2);
console.log(u3);
console.log(u2.prepare());
console.log(u3.prepare());
u3.set("lastName", "P");
u3.set("firstName", "Maha");

var request=blue.Http.create({ 
    url: "http://google.com",
    onLoaded: function() {
        console.log("Got response");
    }
});

request.send();

/*
userResource=blue.Rest.extend({
    url: "some-url",
    model: user,
    headers: {
    },
    params: {
        path: [ "id" ],
        query: [ "limit", "offset" ]
    },
    response: {
        collection_key: "",
        object_key: "",
    },
    limit: 20,
    onListLoaded: 
    onObjectLoaded:
    onCreate
    onUpdate
    onDelete
    onFailure
});

r=userResource.create()

r.list({
});

users=r.nextPage();
users=r.prevPage();
*/

blue={}
blue.core={}
blue.M={}

//
// Objects
//

blue.core.Object={
    blue: { type: "Object", listeners: []},
    init: function() {
    },
    initInstance: function(obj) {
    },
    extend: function(obj) {
        var newObj=Object.create(this);
        for(key in obj) {
            if(obj.hasOwnProperty(key))
                newObj[key]=obj[key]
        }
        newObj.init();
        return newObj;
    },
    instance: function(obj) {
        var newObj=Object.create(this);        
        newObj.initInstance(obj);
        return newObj;
    },
    fire: function(eventName) {
        handler="on"+eventName;
        args=Array.prototype.slice.call(arguments, 1)
        if(handler in this) {
            this[handler].apply(this, args);
        }
        args.unshift(this)
        for(var index in this.blue.listeners) {
            listener=listeners[index];
            if(handler in listener) {
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
                part=parts[index]
                word=part.charAt(0).toUpperCase()+part.slice(1);
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
    listen: function(obj) {
        this.blue.listeners.push(obj);
    },
    unlisten: function(obj) {
        pos=this.blue.listeners.indexOf(obj);
        if(pos>-1) {
            this.blue.listeners.splice(pos, 1);
        }
    },
    getAttribute: function(property) {
        return this[this.camelize(property, false)];
    },
    setAttribute: function(property, value) {
       eventName=this.camelize(property, true)+"Change";
       oldValue=this.getAttribute(property);
       this[this.camelize(property, false)]=value; 
       this.fire(eventName, oldValue, value);
    }

}

// 
// Models
//

blue.core.Model=blue.core.Object.extend({
    blue: { type: "Model" },
    init: function() {
        this.preprocess();
    },
    initInstance: function(obj) {
        if(obj!=null)
            this.parse(obj);    
    },
    preprocess: function() {
        this.keys=[];
        this.blue.attributes=[];
        this.blue.parsedAttributes=[];
        this.blue.preparedAttributes=[];
        for(var index in this.attributes) {
            attr=this.attributes[index];
            this.keys.push(attr);
        }

        for(var key in this) {
            if(key.startsWith("parse") && key.length>5) {
                attr=key.substring(5);
                this.keys.push(attr);
                this.blue.parsedAttributes.push(attr);
            }
            if(key.startsWith("prepare") && key.length>7) {
                this.blue.preparedAttributes.push(key.substring(7));
            }
        }

        for(var key in this.paths) {
            this.keys.push(key); 
        }

        for(var key in this.models) {
            this.keys.push(key);
        }
    },

    parse: function(data) {
        var pk=this.primaryKey;
        if(pk in data) {
            this.setAttribute(pk, data[pk]);
        }
        
        for(var index in this.attributes) {
            key=this.attributes[index];
            this.setAttribute(key, data[key]);
        }

        for(var index in this.blue.parsedAttributes) {
            key=this.blue.parsedAttributes[index];
            this.setAttribute(key, this["parse"+key](data));
        }

        for(var key in this.paths) {
            this.setAttribute(key, this.resolve(this.paths[key], data));
        }

        for(var key in this.models) {
            var modeldata=data[key];
            var model=this.models[key].instance();
            model.parse(modeldata);
            this.setAttribute(key, model);
        }
    },

    resolve: function(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj)
    },

    prepare: function() {
        var object=blue.core.Object.instance();
        for(var key in this.keys) {
            attr=this.camelize(this.keys[key]);
            if(this.readonly.indexOf(attr)==-1) {
                if(this.blue.preparedAttributes.indexOf(attr)!=-1) {
                    object.setAttribute(attr, this["prepare"+attr]());
                } else {
                    object.setAttribute(attr, this.getAttribute(attr));
                }
            } 
        }
        return object;
    },

});

//
// Tests
//

blue.M.board=blue.core.Model.extend({
    blue: { type: "Board" },
    attributes: ["id", "name"]
});

blue.M.user=blue.core.Model.extend({
    blue: { type: "User" },
    attributes: ["first_name", "last_name"],
    paths: {"board_id":"board.id"},
    models: {"board": blue.M.board},
    readonly: ["board_id", "board_name"],

    parseBoardName: function(data) {
        return "Board: "+data.board.name;
    },

    prepareBoard: function(model) {
        return this.board.id;
    },

    onFirstNameChange: function(oldValue, newValue) {
        console.log("oldValue: "+oldValue);
        console.log("newValue: "+newValue);
    }
});

blue.M.userWithoutBoard=blue.M.user.extend({
    models: {},
});

var u=blue.M.user.instance();
var u2=blue.M.user.instance({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
var u3=blue.M.userWithoutBoard.instance({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
console.log(u2);
console.log(u3);
console.log(u2.prepare());
console.log(u3.prepare());

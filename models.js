blue={}
blue.core={}
blue.M={}

//
// Objects
//

blue.core.Object={
    blue: { type: "Object", listeners: []},
    onExtend: function() {
    },
    onCreate: function() {
    },
    extend: function(obj) {
        var newObj=Object.create(this);
        for(key in obj) {
            if(obj.hasOwnProperty(key))
                newObj[key]=obj[key]
        }
        newObj.fire("Extend", newObj);
        return newObj;
    },
    create: function() {
        var newObj=Object.create(this);        
        args=Array.prototype.slice.call(arguments);
        args.unshift("Create");
        newObj.fire.apply(newObj, args);
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
    },
    loadAttribute: function(property, value) {
       this[this.camelize(property, false)]=value; 
    },
}

// 
// Models
//

blue.core.Model=blue.core.Object.extend({
    blue: { type: "Model" },
    onExtend: function() {
        this.preprocess();
    },
    onCreate: function(obj) {
        if(obj!=null) {
            this.parse(obj);    
        }
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
            this.loadAttribute(key, data[key]);
        }

        for(var index in this.blue.parsedAttributes) {
            key=this.blue.parsedAttributes[index];
            this.loadAttribute(key, this["parse"+key](data));
        }

        for(var key in this.paths) {
            this.loadAttribute(key, this.resolve(this.paths[key], data));
        }

        for(var key in this.models) {
            var modeldata=data[key];
            var model=this.models[key].create();
            model.parse(modeldata);
            this.loadAttribute(key, model);
        }
    },

    resolve: function(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj)
    },

    prepare: function() {
        var object=blue.core.Object.create();
        for(var key in this.keys) {
            attr=this.camelize(this.keys[key]);
            if(this.readonly.indexOf(attr)==-1) {
                if(this.blue.preparedAttributes.indexOf(attr)!=-1) {
                    object.loadAttribute(attr, this["prepare"+attr]());
                } else {
                    object.loadAttribute(attr, this.getAttribute(attr));
                }
            } 
        }
        return object;
    },

});

//
// Resources
//

blue.core.AjaxRequest=blue.core.Object.extend({
    blue: { type: "Resource" },
    onCreate: function(tag, url) {
        this.request=new XMLHttpRequest();
        this.tag=tag || "ajax";
        this.url=url;
        this.queryParams="";
    },
    getXMLHttpRequest: function() {
        return this.request;
    },
    setHeader: function(header, value) {
        this.request.setRequestHeader(header, value);
    },
    getHeader: function(header) {
        this.request.getResponseHeader(header);
    },
    addQueryParams: function(params) {
        str="";
        for(var key in params) {
            str=str+key+"="+encodeURI(params[key])+"&"
        }
        this.queryParams=this.queryParams+str.slice(0, -1)
    }, 
    encode: function(params) {
        str="";
        for(var key in params) {
            str=str+key+"="+encodeURI(params[key])+"&"
        }
        return str.slice(0, -1)
    },
    sendRequest(method, data) {
        var self=this;
        this.request.onreadystatechange=function() {
            self.onReadyStateChange(self, this);
        }
        if(this.queryParams=="") {
            this.request.open(method, this.url, true); 
        } else {
            if(this.url.indexOf("?")!=-1) {
                this.request.open(method, this.url+"&"+encodeURI(this.queryParams), true); 
            } else {
                this.request.open(method, this.url+"?"+encodeURI(this.queryParams), true); 
            }
        }
        this.request.send(data);
    }, 
    get: function(params) {
        this.addQueryParams(params);
        this.sendRequest("GET", null);
    }, 
    post: function(params) {
        this.sendRequest("POST", this.encode(params));
    },
    del: function(params) {
        this.sendRequest("DELETE", url, null);
    },
    put: function(params) {
        this.sendRequest("PUT", this.encode(params));
    },
    patch: function(params) {
        this.sendRequest("PATCH", this.encode(params));
    },
    head: function() {
        this.sendRequest("HEAD");
    },
    options: function() {
        this.sendRequest("OPTIONS");
    },
    connect: function() {
        this.sendRequest("CONNECT");
    },
    onReadyStateChange: function() {
        eventPrefix=this.camelize(this.tag, true);
        switch(this.request.readyState) {
            case 0:
                this.fire(eventPrefix+"NotInitialized");
                break;
            case 1:
                this.fire(eventPrefix+"ConnectionEstablished");
                break;
            case 2:
                this.fire(eventPrefix+"RequestReceived");
                break;
            case 3:
                this.fire(eventPrefix+"ProcessingRequest");
                break;
            case 4:
                if(this.request.status>=200 && this.request.status<300)
                    this.status=this.request.status;
                    this.statusMessage=this.request.statusText;
                    this.response=this.request.response;
                    this.fire(eventPrefix+"Loaded")
                if(this.request.status>=400)
                    this.fire(eventPrefix+"Failed")
        }      
    }
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

blue.M.userWithoutBoard=blue.M.user.extend({
    models: {},
});

var u=blue.M.user.create();
var u2=blue.M.user.create({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
var u3=blue.M.userWithoutBoard.create({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
console.log(u);
console.log(u2);
console.log(u3);
console.log(u2.prepare());
console.log(u3.prepare());

var request=blue.core.AjaxRequest.create("user", "http://reqres.in/api/users/1");
request.onUserLoaded=function() {
    var data=JSON.parse(this.response);
    console.log(data.data);
    var user=blue.M.userWithoutBoard.create(data.data);
    console.log(user);
}
request.get();


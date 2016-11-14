blue={}
blue.core={}
blue.M={}

blue.core.Object={
    blue: { type: "Object" },
    init: function() {
    },
    init_instance: function(obj) {
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
        newObj.init_instance(obj);
        return newObj;
    }
}

blue.core.Model=blue.core.Object.extend({
    blue: { type: "Model" },
    init: function() {
        console.log(this.blue.type+":init called");
        this.preprocess();
    },
    init_instance: function(obj) {
        if(obj!=null)
            this.parse(obj);    
    },
    preprocess: function() {
        this.keys=[];
        this.parsedAttributes=[];
        this.preparedAttributes=[];
        for(var index in this.attributes) {
            attr=this.attributes[index];
            this.keys.push(attr);
        }

        for(var key in this) {
            if(key.startsWith("parse_")) {
                attr=key.substring(6);
                this.keys.push(attr);
                this.parsedAttributes.push(attr);
            }
            if(key.startsWith("prepare_")) {
                this.preparedAttributes.push(key.substring(8));
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

        for(var index in this.parsedAttributes) {
            key=this.parsedAttributes[index];
            this.setAttribute(key, this["parse_"+key](data));
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
        var object={};
        for(var key in this.keys) {
            attr=this.keys[key];
            if(this.read_only.indexOf(attr)==-1) {
                if(this.preparedAttributes.indexOf(attr)!=-1) {
                    object[attr]= this["prepare_"+attr]();
                } else {
                    object[attr]=this[attr];
                }
            } 
        }
        return object;
    },

    setAttribute: function(property, value) {
       this[property]=value; 
    }
});

blue.M.board=blue.core.Model.extend({
    blue: { type: "Board" },
    attributes: ["id", "name"]
});

blue.M.user=blue.core.Model.extend({
    blue: { type: "User" },
    attributes: ["first_name", "last_name"],
    paths: {"board_id":"board.id"},
    models: {"board": blue.M.board},
    read_only: ["board_id", "board_name"],

    parse_board_name: function(data) {
        return "Board: "+data.board.name;
    },

    prepare_board: function(model) {
        return this.board.id;
    },
});

blue.M.userWithoutBoard=blue.M.user.extend({
    models: {}
});

var u=blue.M.user.instance();
var u2=blue.M.user.instance({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
var u3=blue.M.userWithoutBoard.instance({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
console.log(u2);
console.log(u3);
console.log(u2.prepare());
console.log(u3.prepare());

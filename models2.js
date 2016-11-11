blue={}
blue.core={}
blue.M={}

blue.core.Object=function() {
}
blue.core.Object.prototype={
    extend: function() {
    }
}

blue.core.BaseModel=function(object) {
    this.__meta__={};
    for(var key in object) {
        value=object[key];
        if(typeof(value)=="function") {
            this[key]=value;
        } else {
            this.__meta__[key]=value;
        }
    }
    if(!("primaryKey" in this.__meta__)) {
        this.__meta__.primaryKey="id";
    }
    this.preprocess();
}
blue.core.BaseModel.prototype={
    preprocess: function() {
        this.__meta__.keys=[];
        this.__meta__.parsedAttributes=[];
        this.__meta__.preparedAttributes=[];
        for(var index in this.__meta__.attributes) {
            attr=this.__meta__.attributes[index];
            this.__meta__.keys.push(attr);
        }

        for(var key in this) {
            if(key.startsWith("parse_")) {
                attr=key.substring(6);
                this.__meta__.keys.push(attr);
                this.__meta__.parsedAttributes.push(attr);
            }
            if(key.startsWith("prepare_")) {
                this.__meta__.preparedAttributes.push(key.substring(8));
            }
        }

        for(var key in this.__meta__.paths) {
            this.__meta__.keys.push(key); 
        }

        for(var key in this.__meta__.models) {
            this.__meta__.keys.push(key);
        }
    },

    parse: function(data) {
        var pk=this.__meta__.primaryKey;
        if(pk in data) {
            this.setAttribute(pk, data[pk]);
        }
        
        for(var index in this.__meta__.attributes) {
            key=this.__meta__.attributes[index];
            this.setAttribute(key, data[key]);
        }

        for(var index in this.__meta__.parsedAttributes) {
            key=this.__meta__.parsedAttributes[index];
            this.setAttribute(key, this["parse_"+key](data));
        }

        for(var key in this.__meta__.paths) {
            this.setAttribute(key, this.resolve(this.__meta__.paths[key], data));
        }

        for(var key in this.__meta__.models) {
            var modeldata=data[key];
            this.setAttribute(key, new this.__meta__.models[key](modeldata));
        }
    },

    resolve: function(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj)
    },

    prepare: function() {
        var object={};
        for(var key in this.__meta__.keys) {
            attr=this.__meta__.keys[key];
            if(this.__meta__.read_only.indexOf(attr)==-1) {
                if(this.__meta__.preparedAttributes.indexOf(attr)!=-1) {
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
}

blue.core.createModel=function(modelname, object) {
    blue.M[modelname]=function() {
        if(arguments[0]) {
            this.parse(arguments[0]);
        }
    }
    blue.M[modelname].prototype=new blue.core.BaseModel(object);
}

blue.core.createModel("board", {
    attributes: ["id", "name"]
});

blue.core.createModel("user", {
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

var u=new blue.M.user();
var u2=new blue.M.user({"id": 3, "first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
console.log(u2);
console.log(u2.prepare());

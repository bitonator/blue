blue={}
blue.core={}
blue.R={}
blue.models={}
blue.M={}

blue.core.Model=function() {
    this.__blue__={};
    this.__blue__.primaryKey="id";
    this[this.__blue__.primaryKey]=null;
}
blue.core.ModelPrototype={
    setResource: function(resource) {
        this.__blue__.resource=resource;
    },
    save: function() {
        if(this[this.__blue__.primaryKey]==null) {
            console.log("Model create not implemented yet!");
        } else {
            console.log("Model update not implemented yet!");
        }
    }
}
blue.core.Model.prototype=blue.core.ModelPrototype;

blue.createModel=function(modelname, prototype) {
    blue.M[modelname]=function() {
        blue.core.Model.call();
    }
    blue.M[modelname].prototype=new blue.core.Model();
}

blue.core.Resource=function(keys) {
    this.__blue__={};

    for(var key in keys) {
        if(key.startsWith("blue_")) {
            attr=key.substring(5);
            this.__blue__[attr]=keys[key];
        } else {
            this[key]=keys[key];
        }
    }

    this.preprocess();
}
blue.core.ResourcePrototype={
    preprocess: function() {
        this.__blue__.keys=[];
        this.__blue__.parsedAttributes=[];
        this.__blue__.preparedAttributes=[];
        for(var index in this.attributes) {
            attr=this.attributes[index];
            this.__blue__.keys.push(attr);
        }

        for(var key in this) {
            if(key.startsWith("parse_")) {
                attr=key.substring(6);
                this.__blue__.keys.push(attr);
                this.__blue__.parsedAttributes.push(attr);
            }
            if(key.startsWith("prepare_")) {
                this.__blue__.preparedAttributes.push(key.substring(8));
            }
        }

        for(var key in this.paths) {
            this.__blue__.keys.push(key); 
        }

        for(var key in this.models) {
            this.__blue__.keys.push(key);
        }
    },
    parse: function(data) {
        var object=new this.__blue__.model();
        object.setResource(this);
        
        for(var index in this.attributes) {
            key=this.attributes[index];
            object[key]=data[key];
        }

        for(var index in this.__blue__.parsedAttributes) {
            key=this.__blue__.parsedAttributes[index];
            object[key]=this["parse_"+key](data);
        }

        for(var key in this.paths) {
            object[key]=this.resolve(this.paths[key], data);
        }

        for(var key in this.models) {
            var modeldata=data[key];
            object[key]=this.models[key].parse(modeldata);
        }

        return object;
    },

    resolve: function(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj)
    },

    prepare:function(model) {
        var object={};
        for(var key in this.__blue__.keys) {
            attr=this.__blue__.keys[key];
            if(this.read_only.indexOf(attr)==-1) {
                if(this.__blue__.preparedAttributes.indexOf(attr)!=-1) {
                    object[attr]= this["prepare_"+attr](model);
                } else {
                    object[attr]=model[attr];
                }
            } 
        }
        return object;
    }
}
blue.core.Resource.prototype=blue.core.ResourcePrototype;

//// Test Code
blue.createModel("board", {});
blue.R.Board=new blue.core.Resource({
    blue_model: blue.M.board,
    attributes: ["id", "name"]
});

blue.createModel("user", {});
blue.R.User=new blue.core.Resource({
    blue_model: blue.M.user,
    attributes: ["first_name", "last_name"],
    paths: {"board_id":"board.id"},
    models: {"board": blue.R.Board},
    read_only: ["board_id", "board_name"],

    parse_board_name: function(data) {
        return "Board: "+data.board.name;
    },

    prepare_board: function(model) {
        return model.board.id;
    }
});

var u=blue.R.User.parse({"first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
console.log(u);
var v=blue.R.User.prepare(u);
console.log(v);

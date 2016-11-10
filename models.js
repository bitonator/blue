blue={}
blue.core={}
blue.R={}
blue.models={}
blue.M={}

blue.core.Model=function() {
    this.blue={};
    this.blue.primaryKey="id";
    this[this.blue.primaryKey]=null;
}
blue.core.ModelPrototype={
    setResource: function(resource) {
        this.blue.resource=resource;
    },
    save: function() {
        if(this[this.blue.primaryKey]==null) {
            console.log("Model create not implemented yet!");
        } else {
            console.log("Model update not implemented yet!");
        }
    }
}
blue.core.Model.prototype=blue.core.ModelPrototype;

blue.core.Resource=function(keys) {
    this.blue={};

    for(var key in keys) {
        if(key.startsWith("blue_")) {
            attr=key.substring(5);
            this.blue[attr]=keys[key];
        } else {
            this[key]=keys[key];
        }
    }
}
blue.core.ResourcePrototype={
    parse: function(data) {
        console.log("Blue is ");
        console.log(this.blue);
        var object=new this.blue.model();
        object.setResource(this);
        
        for(var index in this.attributes) {
            key=this.attributes[index];
            object[key]=data[key];
        }

        for(var key in this) {
            if(key.startsWith("parse_")) {
                attr=key.substring(6);
                object[attr]=this[key](data);
            }
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
        for(var key in this.blue.keys) {
            attr=this.blue.keys[key];
            if(this.read_only.indexOf(attr)==-1) {
                var prepare_fn="prepare_"+attr;
                if(prepare_fn in this) {
                    object[attr]=this[prepare_fn](model);
                } else {
                    object[attr]=model[attr];
                }
            }         
        }
        return object;
    }
}
blue.core.Resource.prototype=blue.core.ResourcePrototype;

### test code
blue.M.board=function() {
    blue.core.Model.call(this);
};
blue.M.board.prototype=new blue.core.Model();
blue.R.Board=new blue.core.Resource({
    blue_model: blue.M.board,
    attributes: ["id", "name"]
});

blue.M.user=function() {
    blue.core.Model.call(this);
};
blue.M.user.prototype=new blue.core.Model();

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

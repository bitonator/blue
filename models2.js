blue={}
blue.core={}
blue.M={}

blue.core.extend=function(Base, Derived) {
    Derived.prototype=new Base();
    Derived.prototype.constructor=Derived;
    return Derived;
}

blue.core.BaseModel=function() {
}
blue.core.BaseModel.prototype={
    setDescription: function(obj) {
        this.__meta__=obj;
        if("primaryKey" in obj)
            this.__meta__.primaryKey=obj["primaryKey"]
        else
            this.__meta__.primaryKey="id";
        this.preprocess();
    },
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
            this[pk]=data[pk];
        }
        
        for(var index in this.__meta__.attributes) {
            key=this.__meta__.attributes[index];
            this[key]=data[key];
        }

        for(var index in this.__meta__.parsedAttributes) {
            key=this.__meta__.parsedAttributes[index];
            this[key]=this["parse_"+key](data);
        }

        for(var key in this.__meta__.paths) {
            this[key]=this.resolve(this.__meta__.paths[key], data);
        }

        for(var key in this.__meta__.models) {
            var modeldata=data[key];
            this[key]=this.__meta__.models[key].parse(modeldata);
        }
    },

    resolve: function(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : undefined
        }, obj)
    },

    prepare:function(model) {
        var object={};
        for(var key in this.__meta__.keys) {
            attr=this.__meta__.keys[key];
            if(this.read_only.indexOf(attr)==-1) {
                if(this.__meta__.preparedAttributes.indexOf(attr)!=-1) {
                    object[attr]= this["prepare_"+attr](model);
                } else {
                    object[attr]=model[attr];
                }
            } 
        }
        return object;
    }
}

blue.core.createModel=function(modelname, object) {
    blue.M[modelname]=blue.core.extend(blue.core.BaseModel, object);
}

blue.core.createModel("user", function() {
    this.parse_board_name=function(data) {
        return "Board: "+data.board.name;
    }

    this.prepare_board=function(model) {
        return model.board.id;
    }

    this.setDescription({
        attributes: ["first_name", "last_name"],
        paths: {"board_id":"board.id"},
        // this.models: {"board": blue.R.Board},
        read_only: ["board_id", "board_name"],
    });
});


var u=new blue.M.user();
u.parse({"first_name":"Mahadevan", "last_name": "K", "board": { id: 2, name: "ICSE"}});
console.log(u);


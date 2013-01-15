var Parent = OOP.Class.extend({
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: OOP.Composable.make(function() {
        console.log("Parent initialize");
    }),
    config: OOP.Composable.make({ a: 'a' })
});


var Child = Parent.extend({
    constructor: function() {
        console.log("Child constructor");
        this._super('constructor');
    },

    initialize: function() {
        console.log("Child initialize");
    },
    config: { b: 'b' }
});


var parent = new Parent();

console.log('---------------');

var child = new Child();

console.log('---------------');

// --------------------------------------

var Point = OOP.Class.extend({
    statics: {
        createNew: function(x, y) {
            return new Point(x, y);
        }
    },
    constructor: function(x, y) {
        this.x = x;
        this.y = y;
    },
    toString: function() {
        return '(' + this. x + ', ' + this.y + ')';
    }
});

var Colors = OOP.Enum.create(['white', 'black'], {
    reverse: function() {
        return this === Colors['white']? Colors['black'] : Colors['white'];
    }
});

var Color = {
    color: Colors.white
};

var Circle = Point.extend( {
    augments: [Color],

    statics: {
        createNew: function(x, y) {
            return new Circle(x, y);
        }
    },
    constructor: function(x, y, radius) {
        this._super('constructor', x, y);
        this.radius = radius;
    },
    toString: function(str) {
        return this._super('toString') + ':' + this.radius + ', ' + this.color.val();
    }
});

var point = new Point(10, 10);
var circle = new Circle(20, 20, 30);

console.log("Point: " + point);
console.log("Circle: " + circle);


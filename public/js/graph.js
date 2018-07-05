//  graph.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  Graph library
(function(root, OOP, FP) {
    // Enums
    const Types = OOP.Enum.create(['Graphs', 'Graph', 'Nodes', 'Node', 'Links', 'Link'], {
        children() {
            return Types.members[this.idx() + 1];
        },
        parent() {
            return Types.members[this.idx() - 1];
        }
    });

    const Direction = OOP.Enum.create(['In', 'Out'], {
        reverse() {
            return Direction.members[(this.idx() + 1) % 2];
        }
    });

    const Duality =  OOP.Enum.create(['Vertex', 'Edge'], {
        dual() {
            return Duality.members[(this.idx() + 1) % 2];
        }
    });

    // Graph objects
    const GraphObject = OOP.Class.extend({
        $statics: {
            Types: Types
        },

        $constructor: function(id, owner) {
            this.id = id || OOP.uniqueId();
            this.initialize(owner);
        },

        config: OOP.Extensible.create({name: 'default'}),

        initialize: OOP.Extensible.create(function(owner) {
            if (this._owner) {
                throw new Error(this + ' is already initialized with ' + this._owner);
            }
            this._owner = owner;
        }),

        free: OOP.Extensible.create(function() {
            if (this._owner) {
                let owner = this._owner;
                this._owner = null;
                owner.free(this);
            }
        }),

        type() {
            return this._owner ? this._owner.type().children() : undefined;
        },
        factory() {
            return GraphFactory.getByConfig(this.config);
        },
        toString() {
            return this.type().val() + '#' + this.id;
        },
        index() {
            return this._owner ? this._owner.indexOf(this) : -1;
        },
        indexOf() {
            return -1;
        },
        belongsTo(type) {
            return type === undefined || this.type() === type ? this._owner : this._owner.belongsTo(type);
        },


        // ---- JSON
        toJSON: OOP.Extensible.create(function() {
            return { id: this.id }
        }),

        fromJSON: OOP.Extensible.create(function(json, map) {
            if (json.id) {
                this.id = json.id;
                map[json.id] = this;
            }
        }),

        // ---- Private methods

        _bind: function(prop, that) { // "this" is implicit
            if (this[prop] === null && that[prop] === null) {
                this[prop] = that;
                that[prop] = this;

            } else if (this[prop] !== that) { // it is already bound
                throw new Error(this + ' object is already bound to ' + this[prop]);
            } else if (that[prop] !== this) { // it is already bound
                throw new Error(that + ' object is already bound to ' + that[thatProp]);
            }
        },
        _unbind: function(prop) {
            var that = this[prop];

            if (that == null || that[prop] !== this) {
                throw new Error(prop + ' property can not be unbind');
            }
            that[prop] = null;
            this[prop] = null;
        },
        _toJsonBind: function(json, name) {
            var value = this['_' + name];
            if (value) {
                json[name + 'Id'] = value.id;
            }
            return json;
        },
        _fromJsonBound: function(json, map, name) {
            var bound = json[name + 'Id'];

            if (bound && map[bound]) {
                this._bind('_' + name, map[bound]);
            }
        }
    });

    var Iterable = {
        Iterator: OOP.Class.extend({
            $constructor: function(container) {
                this.container = container;
                this._cursor = -1;
            },
            current: function() {
                return this.container.get(this._cursor);
            },
            next: function() {
                return this.container.get(++this._cursor);
            },
            hasNext: function() {
                return this._cursor + 1 < this.container.size();
            },
            index: function() {
                return this._cursor;
            }
        }),
        iterator: function() {
            return new this.Iterator(this);
        }
    };

    var Accessible = {
        Accessor: OOP.Class.extend({
            $constructor: function(container) {
                this.container = container;
                this.array = [];
            },
            get: function(gobj) {
                return this.array[gobj.index()];
            },
            members: function(gobj, value) {
                this.array[gobj.index()] = value;
            }
        }),
        accessor: function() {
            return new this.Accessor(this);
        }
    };

    var GraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],

        initialize: function() {
            this._children = [];
        },

        free: function() {
            return this.forEach(function(child) {
                this.remove(child);
            })
        },

        get: function(index) {
            return this._children[index];
        },
        size: function() {
            return this._children.length;
        },
        empty: function() {
            return this.size() === 0;
        },
        forEach: function(func, thisArg) {
            this._children.forEach(func, thisArg || this);
        },
        indexOf: function(child) {
            return this._children.indexOf(child);
        },
        find: function(func, thisArg) {
            return this._children.find(func, thisArg || this);
        },
        contains: function(gobj) {
            return this.indexOf(gobj) !== -1;
        },
        add: function(gobj) {
            if (gobj.type() === this.type().children() ) {
                gobj.initialize(this);
                this._children.push(gobj);
                return this;
            } else {
                throw new Error('This graph object ' + gobj + ' could not be added to ' + this + ' graph container');
            }
        },
        newChild: function(id) {
            return this.factory().create(this.type().children(), id);
        },
        addNew: function(id) {
            var gobj = this.newChild(id);
            this.add(gobj);
            return gobj;
        },
        remove: function(gobj) {
            var idx = this.indexOf(gobj);
            if (idx !== -1) {
                this._children.splice(idx, 1);
                gobj.free();
            }
            return idx;
        },

        toJSON: function() {
            return this._children.map(function(elem) {
                return elem.toJSON()
            })
        },
        fromJSON: function(json, map) {
            json.forEach(function(child) {
                this.addNew().fromJSON(child, map);
            }, this);
        }
    });


    var DuoGraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],

        Container: GraphContainer,

        names: ['0', '1'],

        initialize: function(owner) {
            this[0] = new this.Container(this.names[0] + '#' + this.id, owner);
            this[1] = new this.Container(this.names[1] + '#' + this.id, owner);
        },

        container: function(enumerator) {
            return this[enumerator ? enumerator.idx() : 0];
        },
        get: function(index) {
            var size0 = this[0].size();
            return index < size0? this[0].get(index) : this[1].get(index - size0);
        },
        indexOf: function(gobj) {
            var indexOf0 = this[0].indexOf(gobj);
            return indexOf0 === -1? indexOf0 : this[1].indexOf(gobj);
        },
        forEach: function(func) {
            this[0].forEach(func, this);
            this[1].forEach(func, this);
            return this;
        },
        find: function(func) {
            var result = this[0].find(func, this);
            return result? result : this[1].find(func, this);
        },
        size: function() {
            return this[0].size() + this[1].size();
        },
        empty: function() {
            return this.size() === 0;
        },
        add: function(gobj, enumerator) {
            return this.container(enumerator).add(gobj);
        },
        addNew: function(id, enumerator) {
            return this.container(enumerator).addNew(id);
        },
        remove: function(gobj) {
            return gobj._owner.remove(gobj);
        },
        free: function() {
            this[0].free();
            this[1].free();
        },
        toJSON: function() {
            var json = Object.create(null);
            json[this.names[0]] = this[0].toJSON();
            json[this.names[1]] = this[1].toJSON();
            return json;
        },
        fromJSON: function(json, map) {
            this[0].fromJSON(json[this.names[0]], map);
            this[1].fromJSON(json[this.names[1]], map);
        }
    });

    var MLGraphObject = GraphObject.extend({
        initialize: function(owner) {
            this.link = this.factory().createLink(undefined, owner);
            this.node = this.factory().createNode(undefined, owner);
            this.graph = this.factory().createGraph(undefined, owner);
        },
        free: function() {
            this.link.free();
            this.node.free();
            this.graph.free();
        }
    });

    var MLGraphContainer = GraphContainer.extend({
        initialize: function(owner) {
            this.links = this.factory().createLinks();
            this.nodes = this.factory().createNodes();
            this.graphs = this.factory().createGraphs();
        },
        free: function(child) {
            this.links.free(child);
            this.nodes.free(child);
            this.graphs.free(child);
        },


        add: function(child) {
            this.links.add(child.link, this);
            this.nodes.add(child.node, this);
            this.graphs.add(child.graph, this);

            return this.$super('add', child);
        },
        remove: function(child) {
            this.links.remove(child.link, this);
            this.nodes.remove(child.node, this);
            this.graphs.remove(child.graph, this);

            return this.$super('remove', child);
        }
    });

// ---- Link

    var Link = GraphObject.extend({
        initialize: function() {
            this._pair = null;
        },

        type: function() {
            return Types.Link;
        },
        checkCanBeBound: OOP.Extensible.create(function(pair) {
            if (pair.from() === null) {
                throw new Error(pair + ' has to be belong to a node');
            }
        }),
        bind: function(pair) {
            this.checkCanBeBound(pair);
            this._bind('_pair', pair);
        },
        unbind: function() {
            this._unbind('_pair')
        },
        from: function() {
            return this.belongsTo(Types.Node);
        },
        to: function() {
            return this._pair ? this._pair.from() : null;
        },
        pair: function() {
            return this._pair;
        },
        toJSON: function(json) {
            return this._toJsonBind(json, 'pair');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'pair');
        },
        free: function() {
            this.unbind();
        }
    });

// ----- Link $mixins

    var LinkDirected = {
        config: {directed: true},

        checkCanBeBound: function(pair) {
            if (this.direction().reverse() !== pair.direction()) {
                throw new Error('Incorrect direction: ' + pair.direction());
            }
        },
        reverse: function () {
            var node = this.from();
            return node ? node
                .links(this.direction().reverse())
                .find(function (link) {
                    return link.from() == node
                })
                : null
        },
        direction: function() {
            return this.belongsTo().direction();
        }
    };

    var LinkMultilevel = {
        config: { multilevel: true },

        initialize: function(owner, multilevel) {
            this._multilevel = multilevel;
        },
        multilevel: function () {
            return this._multilevel;
        },
        checkCanBeBound: function (pair) {
            if (!pair.from().inverse().links().empty()) {
                throw new Error(pair + ' can not be multilevel bound');
            }
        },
        inverse: function() {
            var inverseNode = this.from().inverse(); // this.node().multilevel().link.to()
            return inverseNode ? inverseNode.links().get(this.index()) : null;
        },

        toJSON: function(json) {
            json.multilevelId = this._multilevel.id
        },
        fromJSON: function(json, map) {
            this._multilevel = map[json.multilevelId];
        }
    };

// -------------- Links $mixins

    var LinksDirected = {
        config: {directed: true},

        names: Direction.values,

        reverse: function() {
            return this.belongsTo().links(this.direction().reverse());
        },
        direction: function() {
            return this.belongsTo().direction(this);
        }
    };

    var LinksMultilevel = {
        config: { multilevel: true },

        inverse: function(direction) {
            return this._owner.inverse().links(direction);
        },

        add: function(link, downNode) {
            this.$super("add", link);
            if (downNode) {
                link.bindDownNode(downNode);
            } else {
                var downNodes = this._owner.downGraph().nodes();
                downNodes.add(downNodes.newChild(), link, undefined);
            }
            return link;
        }
    };

// --------------- Node

    var Node = GraphObject.extend({
        initialize: function() {
            this._links = this.factory().createLinks(undefined, this);
        },
        type: function() {
            return Types.Node;
        },
        graph: function() {
            return this._owner._owner;
        },
        links: function() {
            return this._links;
        },
        toJSON: function(json) {
            json.links = this.links().toJSON();
            return json
        },
        fromJSON: function(json, map) {
            this.links().fromJSON(json.links, map);
        },
        free: function() {
            this.links().free();
            return this.$super('free');
        }
    });

// ----------- Node $mixins

    var NodeDirected = {
        config: {directed: true},

        links: function(direction) {
            return direction? this._links.container(direction) : this._links;
        },
        direction: function(links) {
            return this._links[0] === links? Direction['In'] : this._links[1] === links? Direction['Out'] : undefined;
        },
        indexOf: function(links) {
            var direction = this.direction(links);
            return direction? direction : -1;
        }
    };

    var NodeMultilevel = {
        config: { multilevel: true },

        initialize: function() {
            this._inverse = null;
            this._downGraph = null;
            this._upLink = null;
        },
        inverse: function() {
            return this._inverse;
        },
        downGraph: function() {
            return this._downGraph;
        },
        upLink: function() {
            return this._upLink;
        },
        bindInverse: function(inverse) {
            this._bind('_inverse', inverse);
        },
        unbindInverse: function() {
            this._unbind('_inverse')
        },
        bindDownGraph: function(downGraph) {
            this._bind('_downGraph', downGraph, '_upNode');
        },
        unbindDownGraph: function() {
            this._unbind('_downGraph', '_upNode')
        },
        bindUpLink: function(upLink) {
            this._bind('_upLink', upLink, '_downNode');
        },
        unbindUpLink: function() {
            this._unbind('_upLink', '_downNode')
        },
        toJSON: function(json) {
            this._toJsonBind(json, 'inverse');
            this._toJsonBind(json, 'upLink');
            return this._toJsonBind(json, 'downGraph');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'inverse');
            this._fromJsonBound(json, map, 'upLink');
            this._fromJsonBound(json, map, 'downGraph');
        },
        free: function() {
            this.unbindInverse();
            var downGraph = this.downGraph();
            var upLink = this.upLink();
            this.unbindDownGraph();
            this.unbindUpLink();
            downGraph.free();
            upLink.free();
        }
    };

    var NodeDual = {
        config: {dual: true},

        duality: function() {
            return this._owner.duality();
        }
    };


// ---------------- Nodes $mixins

    var NodesDual = {
        config: {dual: true},

        names: Duality.values,

        dual: function() {
            return this._owner.nodes(this.duality().dual());
        },
        duality: function() {
            return this._owner.duality(this);
        }
    };

    var NodesMultilevel = {
        config: { multilevel: true },

        add: function(node, upLink, downGraph) {
            this.$super("add", node);

            if (upLink) {
                this.bindUpLink(upLink);
            } else {
                var upLinks = this._owner.upNode().links();
                upLinks.add(upLinks.newChild(), node);
            }

            if (downGraph) {
                this.bindDownGraph(downGraph);
            } else {
                var downGraphs = this._owner.graphs();
                downGraphs.add(downGraphs.newChild(), node);
            }

            return node;
        },


        up: function(duality) {
            return this._owner.up().nodes(duality);
        }
    };

// ----------------- Graph

    var Graph = GraphObject.extend( {
        initialize: function() {
            this._nodes = this.factory().createNodes(undefined, this)
        },
        type: function() {
            return Types.Graph;
        },
        nodes: function() {
            return this._nodes;
        },
        toJSON: function(json) {
            json.nodes = this.nodes().toJSON();
            return json
        },
        fromJSON: function(json, map) {
            this.nodes().fromJSON(json.nodes , map)
        }
    });

// --------------- Graph $mixins

    var GraphDual = {
        config: {dual: true},

        nodes: function(duality) {
            return duality? this._nodes.container(duality) : this._nodes;
        },
        duality: function(nodes) {
            return this._nodes[0] === nodes? Duality.hedge : this._nodes[1] === nodes? Duality.hvert : undefined;
        },
        indexOf: function(nodes) {
            var duality = this.duality(nodes);
            return duality? duality : -1;
        }
    };

    var GraphMultilevel = {
        config: { multilevel: true },

        initialize: function() {
            this._upNode = null;
            this._graphs = null
        },
        upNode: function() {
            return this._upNode;
        },
        graphs: function() {  // Graphs own by this graph
            return this._graphs;
        },
        next: function() {
            return this._owner._owner;
        },
        level: function() {
            return this.next()? this.next().level() + 1 : 0;
        },
        bindUpNode: function(upNode) {
            this._bind('_upNode', upNode, '_downGraph');
        },
        unbindUpNode: function() {
            this._unbind('_upNode', '_downGraph')
        },
        toJSON: function(json) {
            return this._toJsonBind(json, 'upNode');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'upNode');
        },
        free: function() {
            var upNode = this.upNode();
            this.unbindUpNode();
            upNode.free();
        }
    };

// -----------  Graphs

    var Graphs = GraphContainer.extend({
        type: function() {
            return Types['graphs'];
        }
    });

    var GraphsMultilevel = {
        initialize: function(owner) {
            owner._graphs = this;
        },
        config: { multilevel: true },

        add: function(graph, upNode) {
            this.$super("add", graph);

            if (upNode) {
                this.bindUpNode(upNode);
            } else {
                var upNodes = this._owner.nodes();
                upNodes.add(upNodes.newChild(), graph);
            }
            return graph;
        }
    };

// ----------------- Graph Factory

    var GraphFactory = OOP.Class.extend({
        $statics: {
            VERSION: '0.1',

            Types: Types,
            Direction: Direction,
            Duality: Duality,

            register: function(config, props) {
                var factory = new GraphFactory(config, props);
                GraphFactory[factory.name] = factory;
                return factory;
            },
            getByConfig: function(config) {
                return GraphFactory[GraphFactory._configToName(config || {})];
            },
            getFactoryByName: function(fullname) {
                return GraphFactory[fullname]
            },
            _configToName: function(config) {
                var name = config.name || 'default';
                if (config.directed) {
                    name += '_directed';
                }
                if (config.dual) {
                    name += '_dual';
                }
                if (config.multilevel) {
                    name += '_multilevel';
                }
                return name;
            }
        },
        $constructor: function(config, props) {
            this.config = config;
            this.name = GraphFactory._configToName(config);
            FP.extend(this, props);
        },

        create: function(type, id, owner) {
            return new this[type.val()](id, owner);
        },

        createLink: function(id, owner) {
            return new this.Link(id, owner)
        },
        createLinks: function(id, owner) {
            return new this.Links(id, owner)
        },
        createNode: function(id, owner) {
            return new this.Node(id, owner)
        },
        createNodes: function(id, owner) {
            return new this.Nodes(id, owner)
        },
        createGraph: function(id, owner) {
            return new this.Graph(id, owner)
        },
        createGraphs: function(id, owner) {
            return new this.Graphs(id, owner)
        }
    });

    var Directed = {
        config: { directed: true }
    };

    var Multilevel = {
        config: { multilevel: true }
    };

    var Dual = {
        config: { dual: true }
    };

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Links: GraphContainer,
        Node: Node,
        Nodes: GraphContainer,
        Graph: Graph,
        Graphs: Graphs
    });

    GraphFactory.register({name: 'default', directed: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected],
            Container: {  // Existing Container has an extend() method so It is mergeable
                $mixins: [LinksDirected]
            }
        }),
        Node: Node.extend({
            $mixins: [NodeDirected]
        }),
        Nodes: GraphContainer.extend({
            $mixins: [Directed]
        }),
        Graph: Graph.extend({
            $mixins: [Directed]
        }),
        Graphs: Graphs.extend({
            $mixins: [Directed]
        })
    });

    GraphFactory.register({name: 'default', dual: true}, {
        Link: Link.extend({
            $mixins: [Dual]
        }),
        Links: GraphContainer.extend({
            $mixins: [Dual]
        }),
        Node: Node.extend({
            $mixins: [NodeDual]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [NodesDual],
            Container: {
                $mixins: [NodesDual]
            }
        }),
        Graph: Graph.extend({
            $mixins: [GraphDual]
        }),
        Graphs: Graphs.extend({
            $mixins: [Dual]
        })
    });

    GraphFactory.register({name: 'default', multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkMultilevel]
        }),
        Links: GraphContainer.extend({
            $mixins: [LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [NodeMultilevel]
        }),
        Nodes: GraphContainer.extend({
            $mixins: [NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            $mixins: [GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Dual]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Dual],
            Container: {
                $mixins: [LinksDirected, Dual]
            }
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeDual]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [Directed, NodesDual],
            Container: {
                $mixins: [Directed, NodesDual]
            }
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphDual]
        }),
        Graphs: Graphs.extend({
            $mixins: [Directed, Dual]
        })
    });

    GraphFactory.register({name: 'default', directed: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, LinksMultilevel],
            Container: {
                $mixins: [LinksDirected, LinksMultilevel]
            }
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeMultilevel]
        }),
        Nodes: GraphContainer.extend({
            $mixins: [Directed, NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            $mixins: [Directed, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [Dual, LinkMultilevel]
        }),
        Links: GraphContainer.extend({
            $mixins: [Dual, LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [NodeDual, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [NodesDual, NodesMultilevel],
            Container: {
                $mixins: [NodesDual, NodesMultilevel]
            }
        }),
        Graph: Graph.extend({
            $mixins: [GraphDual, GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            $mixins: [Dual, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Dual, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Dual, LinksMultilevel],
            Container: {
                $mixins: [LinksDirected, Dual, LinksMultilevel]
            }
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeDual, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [Directed, NodesDual, NodesMultilevel],
            Container: {
                $mixins: [Directed, NodesDual, NodesMultilevel]
            }
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphDual, GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            $mixins: [Directed, Dual, GraphsMultilevel]
        })
    });

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    exports.G = GraphFactory;


})(this, this.OOP, this.FP);








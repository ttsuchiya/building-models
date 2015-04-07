(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, LinkManager, getParameterByName;

AppView = React.createFactory(require('./views/app-view'));

LinkManager = require('./models/link-manager');

getParameterByName = function(name) {
  var regex, results;
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  results = regex.exec(location.search);
  if (results === null) {
    return "";
  } else {
    return decodeURIComponent(results[1].replace(/\+/g, ' '));
  }
};

jsPlumb.bind('ready', function() {
  var appView;
  appView = AppView({
    url: 'json/serialized.json',
    linkManager: LinkManager.instance('building-models'),
    data: getParameterByName('data')
  });
  return React.render(appView, $('#app')[0]);
});



},{"./models/link-manager":3,"./views/app-view":9}],2:[function(require,module,exports){
var GraphPrimitive;

module.exports = GraphPrimitive = (function() {
  GraphPrimitive.counters = {};

  GraphPrimitive.reset_counters = function() {
    return GraphPrimitive.counters = {};
  };

  GraphPrimitive.nextID = function(type) {
    if (!GraphPrimitive.counters[type]) {
      GraphPrimitive.counters[type] = 0;
    }
    GraphPrimitive.counters[type]++;
    return type + "-" + GraphPrimitive.counters[type];
  };

  GraphPrimitive.prototype.type = 'GraphPrimitive';

  function GraphPrimitive() {
    this.id = GraphPrimitive.nextID(this.type);
    this.key = this.id;
  }

  return GraphPrimitive;

})();



},{}],3:[function(require,module,exports){
var DiagramNode, Importer, Link, LinkManager,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Importer = require('../utils/importer');

Link = require('./link');

DiagramNode = require('./node');

module.exports = LinkManager = (function() {
  LinkManager.instances = {};

  LinkManager.instance = function(context) {
    var base;
    if ((base = LinkManager.instances)[context] == null) {
      base[context] = new LinkManager(context);
    }
    return LinkManager.instances[context];
  };

  function LinkManager(context) {
    this.loadDataFromUrl = bind(this.loadDataFromUrl, this);
    this.linkKeys = {};
    this.nodeKeys = {};
    this.linkListeners = [];
    this.nodeListeners = [];
    this.selectionListeners = [];
    this.selectedNode = {};
  }

  LinkManager.prototype.addLinkListener = function(listener) {
    log.info("adding link listener");
    return this.linkListeners.push(listener);
  };

  LinkManager.prototype.addNodeListener = function(listener) {
    log.info("adding node listener");
    return this.nodeListeners.push(listener);
  };

  LinkManager.prototype.addSelectionListener = function(listener) {
    log.info("adding selection listener " + listener);
    return this.selectionListeners.push(listener);
  };

  LinkManager.prototype.getLinks = function() {
    var key, ref, results, value;
    ref = this.linkKeys;
    results = [];
    for (key in ref) {
      value = ref[key];
      results.push(value);
    }
    return results;
  };

  LinkManager.prototype.getNodes = function() {
    var key, ref, results, value;
    ref = this.nodeKeys;
    results = [];
    for (key in ref) {
      value = ref[key];
      results.push(value);
    }
    return results;
  };

  LinkManager.prototype.hasLink = function(link) {
    return this.linkKeys[link.terminalKey()] != null;
  };

  LinkManager.prototype.hasNode = function(node) {
    return this.nodeKeys[node.key] != null;
  };

  LinkManager.prototype.importLink = function(linkSpec) {
    var link, sourceNode, targetNode;
    sourceNode = this.nodeKeys[linkSpec.sourceNode];
    targetNode = this.nodeKeys[linkSpec.targetNode];
    linkSpec.sourceNode = sourceNode;
    linkSpec.targetNode = targetNode;
    link = new Link(linkSpec);
    return this.addLink(link);
  };

  LinkManager.prototype.addLink = function(link) {
    var i, len, listener, ref;
    if (!this.hasLink(link)) {
      this.linkKeys[link.terminalKey()] = link;
      this.nodeKeys[link.sourceNode.key].addLink(link);
      this.nodeKeys[link.targetNode.key].addLink(link);
      ref = this.linkListeners;
      for (i = 0, len = ref.length; i < len; i++) {
        listener = ref[i];
        log.info("notifying of new link: " + (link.terminalKey()));
        listener.handleLinkAdd(link);
      }
      this.selectLink(link);
      return true;
    }
    return false;
  };

  LinkManager.prototype.importNode = function(nodeSpec) {
    var node;
    node = new DiagramNode(nodeSpec.data, nodeSpec.key);
    return this.addNode(node);
  };

  LinkManager.prototype.addNode = function(node) {
    var i, len, listener, ref;
    if (!this.hasNode(node)) {
      this.nodeKeys[node.key] = node;
      ref = this.nodeListeners;
      for (i = 0, len = ref.length; i < len; i++) {
        listener = ref[i];
        log.info("notifying of new Node");
        listener.handleNodeAdd(node);
      }
      this.selectNode(node.key);
      return true;
    }
    return false;
  };

  LinkManager.prototype.moveNode = function(nodeKey, x, y) {
    var i, len, listener, node, ref, results;
    node = this.nodeKeys[nodeKey];
    if (!node) {
      return;
    }
    node.x = x;
    node.y = y;
    ref = this.nodeListeners;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      listener = ref[i];
      log.info("notifying of NodeMove");
      results.push(listener.handleNodeMove(node));
    }
    return results;
  };

  LinkManager.prototype.selectNode = function(nodeKey) {
    var i, len, listener, ref, results;
    if (this.selectedNode) {
      this.selectedNode.selected = false;
    }
    if (this.selectedLink) {
      this.selectedLink.selected = false;
      this.selectedLink = null;
    }
    this.selectedNode = this.nodeKeys[nodeKey];
    if (this.selectedNode) {
      this.selectedNode.selected = true;
      log.info("Selection happened for " + nodeKey + " -- " + this.selectedNode.title);
    }
    ref = this.selectionListeners;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      listener = ref[i];
      results.push(listener({
        node: this.selectedNode,
        connection: null
      }));
    }
    return results;
  };

  LinkManager.prototype.changeNode = function(title, image) {
    var i, len, listener, ref, results;
    if (this.selectedNode) {
      log.info("Change  for " + this.selectedNode.title);
      this.selectedNode.title = title;
      this.selectedNode.image = image;
      ref = this.selectionListeners;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        listener = ref[i];
        results.push(listener({
          node: this.selectedNode,
          connection: null
        }));
      }
      return results;
    }
  };

  LinkManager.prototype.selectLink = function(link) {
    var i, len, listener, ref, results;
    if (this.selectedLink) {
      this.selectedLink.selected = false;
    }
    if (this.selectedNode) {
      this.selectedNode.selected = false;
      this.selectedNode = null;
    }
    this.selectedLink = link;
    link.selected = true;
    ref = this.selectionListeners;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      listener = ref[i];
      results.push(listener({
        node: null,
        connection: this.selectedLink
      }));
    }
    return results;
  };

  LinkManager.prototype.changeLink = function(title, color, deleted) {
    var i, len, listener, ref, results;
    if (this.selectedLink) {
      log.info("Change  for " + this.selectedLink.title);
      if (deleted) {
        return this.removeSelectedLink();
      } else {
        this.selectedLink.title = title;
        this.selectedLink.color = color;
        ref = this.selectionListeners;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          listener = ref[i];
          results.push(listener({
            node: null,
            connection: this.selectedLink
          }));
        }
        return results;
      }
    }
  };

  LinkManager.prototype._nameForNode = function(node) {
    return this.nodeKeys[node];
  };

  LinkManager.prototype.newLinkFromEvent = function(info) {
    var endKey, endTerminal, newLink, startKey, startTerminal;
    newLink = {};
    startKey = $(info.source).data('node-key') || 'undefined';
    endKey = $(info.target).data('node-key') || 'undefined';
    startTerminal = info.connection.endpoints[0].anchor.type === "Top" ? "a" : "b";
    endTerminal = info.connection.endpoints[1].anchor.type === "Top" ? "a" : "b";
    this.importLink({
      sourceNode: startKey,
      targetNode: endKey,
      sourceTerminal: startTerminal,
      targetTerminal: endTerminal,
      color: info.color,
      title: info.title
    });
    return true;
  };

  LinkManager.prototype.removelink = function(link) {
    var key;
    key = link.terminalKey();
    return delete this.linkKeys[key];
  };

  LinkManager.prototype.deleteSelected = function() {
    log.info("Deleting selected items");
    this.removeSelectedLink();
    return this.removeSelectedNode();
  };

  LinkManager.prototype.removeSelectedNode = function() {
    var i, len, listener, ref, results;
    if (this.selectedNode) {
      this.removeNode(this.selectedNode.key);
      ref = this.selectionListeners;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        listener = ref[i];
        results.push(listener({
          node: null,
          connection: null
        }));
      }
      return results;
    }
  };

  LinkManager.prototype.removeSelectedLink = function() {
    var i, j, len, len1, listener, ref, ref1, results;
    if (this.selectedLink) {
      this.removelink(this.selectedLink);
      ref = this.linkListeners;
      for (i = 0, len = ref.length; i < len; i++) {
        listener = ref[i];
        log.info("notifying of deleted Link");
        listener.handleLinkRm(this.selectedLink);
      }
      this.selectedLink = null;
      ref1 = this.selectionListeners;
      results = [];
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        listener = ref1[j];
        results.push(listener({
          node: null,
          connection: null
        }));
      }
      return results;
    }
  };

  LinkManager.prototype.removeLinksForNode = function(node) {
    var i, len, link, ref, results;
    ref = node.links;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      results.push(this.removelink(link));
    }
    return results;
  };

  LinkManager.prototype.removeNode = function(nodeKey) {
    var i, j, len, len1, listener, node, ref, ref1, results;
    node = this.nodeKeys[nodeKey];
    delete this.nodeKeys[nodeKey];
    this.removeLinksForNode(node);
    ref = this.nodeListeners;
    for (i = 0, len = ref.length; i < len; i++) {
      listener = ref[i];
      log.info("notifying of deleted Node");
      listener.handleNodeRm(node);
    }
    this.selectedNode = null;
    ref1 = this.selectionListeners;
    results = [];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      listener = ref1[j];
      results.push(listener({
        node: null,
        connection: null
      }));
    }
    return results;
  };

  LinkManager.prototype.loadData = function(data) {
    var importer;
    log.info("json success");
    importer = new Importer(this);
    return importer.importData(data);
  };

  LinkManager.prototype.loadDataFromUrl = function(url) {
    log.info("loading local data");
    log.info("url " + url);
    return $.ajax({
      url: url,
      dataType: 'json',
      success: (function(_this) {
        return function(data) {
          return _this.loadData(data);
        };
      })(this),
      error: function(xhr, status, err) {
        return log.error(url, status, err.toString());
      }
    });
  };

  LinkManager.prototype.serialize = function() {
    var key, link, linkExports, node, nodeExports;
    nodeExports = (function() {
      var ref, results;
      ref = this.nodeKeys;
      results = [];
      for (key in ref) {
        node = ref[key];
        results.push(node.toExport());
      }
      return results;
    }).call(this);
    linkExports = (function() {
      var ref, results;
      ref = this.linkKeys;
      results = [];
      for (key in ref) {
        link = ref[key];
        results.push(link.toExport());
      }
      return results;
    }).call(this);
    return {
      nodes: nodeExports,
      links: linkExports
    };
  };

  LinkManager.prototype.toJsonString = function() {
    return JSON.stringify(this.serialize());
  };

  return LinkManager;

})();



},{"../utils/importer":7,"./link":4,"./node":5}],4:[function(require,module,exports){
var GraphPrimitive, Link,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

GraphPrimitive = require('./graph-primitive');

module.exports = Link = (function(superClass) {
  extend(Link, superClass);

  Link.defaultColor = "#777";

  function Link(options) {
    var base, base1, ref;
    this.options = options != null ? options : {};
    if ((base = this.options).color == null) {
      base.color = Link.defaultColor;
    }
    if ((base1 = this.options).title == null) {
      base1.title = '';
    }
    ref = this.options, this.sourceNode = ref.sourceNode, this.sourceTerminal = ref.sourceTerminal, this.targetNode = ref.targetNode, this.targetTerminal = ref.targetTerminal, this.color = ref.color, this.title = ref.title;
    Link.__super__.constructor.call(this);
  }

  Link.prototype.type = 'Link';

  Link.prototype.terminalKey = function() {
    return this.sourceNode.key + "[" + this.sourceTerminal + "] ---" + this.key + "---> " + this.targetNode.key + "[" + this.targetTerminal + "]";
  };

  Link.prototype.nodeKey = function() {
    return this.sourceNode + " ---" + this.key + "---> " + this.targetNode;
  };

  Link.prototype.outs = function() {
    return [this.targetNode];
  };

  Link.prototype.ins = function() {
    return [this.sourceNode];
  };

  Link.prototype.toExport = function() {
    return {
      "title": this.title,
      "color": this.color,
      "sourceNodeKey": this.sourceNode.key,
      "sourceTerminal": this.sourceTerminal,
      "targetNodeKey": this.targetNode.key,
      "targetTerminal": this.targetTerminal
    };
  };

  return Link;

})(GraphPrimitive);



},{"./graph-primitive":2}],5:[function(require,module,exports){
var GraphPrimitive, Node,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

GraphPrimitive = require('./graph-primitive.coffee');

module.exports = Node = (function(superClass) {
  extend(Node, superClass);

  function Node(nodeSpec, key) {
    if (nodeSpec == null) {
      nodeSpec = {
        x: 0,
        y: 0,
        title: "untitled",
        image: null
      };
    }
    Node.__super__.constructor.call(this);
    if (key) {
      this.key = key;
    }
    this.links = [];
    this.x = nodeSpec.x;
    this.y = nodeSpec.y;
    this.title = nodeSpec.title;
    this.image = nodeSpec.image;
  }

  Node.prototype.type = 'Node';

  Node.prototype.addLink = function(link) {
    if (link.sourceNode === this || link.targetNode === this) {
      if (_.contains(this.links, link)) {
        throw new Error("Duplicate link for Node:" + this.id);
      }
      return this.links.push(link);
    } else {
      throw new Error("Bad link for Node:" + this.id);
    }
  };

  Node.prototype.outLinks = function() {
    return _.filter(this.links, (function(_this) {
      return function(link) {
        return link.sourceNode === _this;
      };
    })(this));
  };

  Node.prototype.inLinks = function() {
    return _.filter(this.links, (function(_this) {
      return function(link) {
        return link.targetNode === _this;
      };
    })(this));
  };

  Node.prototype.infoString = function() {
    var link, linkNamer, outs;
    linkNamer = function(link) {
      return " --" + link.title + "-->[" + link.targetNode.title + "]";
    };
    outs = (function() {
      var i, len, ref, results;
      ref = this.outLinks();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        link = ref[i];
        results.push(linkNamer(link));
      }
      return results;
    }).call(this);
    return this.title + " " + outs;
  };

  Node.prototype.downstreamNodes = function() {
    var visit, visitedNodes;
    visitedNodes = [];
    visit = function(node) {
      log.info("visiting node: " + node.id);
      visitedNodes.push(node);
      return _.each(node.outLinks(), function(link) {
        var downstreamNode;
        downstreamNode = link.targetNode;
        if (!_.contains(visitedNodes, downstreamNode)) {
          return visit(downstreamNode);
        }
      });
    };
    visit(this);
    return _.without(visitedNodes, this);
  };

  Node.prototype.toExport = function() {
    return {
      title: this.title,
      x: this.x,
      y: this.y,
      image: this.image,
      key: this.key
    };
  };

  return Node;

})(GraphPrimitive);



},{"./graph-primitive.coffee":2}],6:[function(require,module,exports){
var GoogleDriveIO;

module.exports = GoogleDriveIO = (function() {
  function GoogleDriveIO() {}

  GoogleDriveIO.prototype.CLIENT_ID = '1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com';

  GoogleDriveIO.prototype.SCOPES = 'https://www.googleapis.com/auth/drive';

  GoogleDriveIO.prototype.authorize = function(immediate, callback) {
    var args;
    args = {
      'client_id': this.CLIENT_ID,
      'scope': this.SCOPES,
      'immediate': immediate || false
    };
    return gapi.auth.authorize(args, callback);
  };

  GoogleDriveIO.prototype.makeMultipartBody = function(parts, boundary) {
    var encoding, part, type;
    return (((function() {
      var i, len, results;
      results = [];
      for (i = 0, len = parts.length; i < len; i++) {
        part = parts[i];
        type = "\r\n--" + boundary + "\r\nContent-Type: " + part.fileType;
        encoding = part.encoding ? "\r\nContent-Transfer-Encoding: " + part.encoding : '';
        results.push("" + type + encoding + "\r\n\r\n" + part.message);
      }
      return results;
    })()).join('')) + ("\r\n--" + boundary + "--");
  };

  GoogleDriveIO.prototype.sendFile = function(fileSpec, contents, callback) {
    var boundary, contentType, metadata, multipartRequestBody, parts, request;
    boundary = '-------314159265358979323846';
    contentType = fileSpec.mimeType || 'application/octet-stream';
    metadata = {
      'title': fileSpec.fileName,
      'mimeType': contentType
    };
    parts = [
      {
        fileType: contentType,
        message: JSON.stringify(metadata)
      }, {
        fileType: 'application/json',
        message: contents
      }
    ];
    multipartRequestBody = this.makeMultipartBody(parts, boundary);
    request = gapi.client.request({
      path: '/upload/drive/v2/files',
      method: 'POST',
      params: {
        uploadType: 'multipart'
      },
      headers: {
        'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    });
    return request.execute(callback || (function(file) {
      return console.log(file);
    }));
  };

  GoogleDriveIO.prototype.upload = function(fileSpec, contents) {
    return this.authorize(true, (function(_this) {
      return function(token) {
        if (token && !token.error) {
          return gapi.client.load('drive', 'v2', function() {
            return _this.sendFile(fileSpec, contents);
          });
        } else {
          return console.log("No authorization. Upload failed for file: " + fileSpec.fileName);
        }
      };
    })(this));
  };

  return GoogleDriveIO;

})();



},{}],7:[function(require,module,exports){
var MySystemImporter;

module.exports = MySystemImporter = (function() {
  function MySystemImporter(system) {
    this.system = system;
    void 0;
  }

  MySystemImporter.prototype.importData = function(data) {
    this.importNodes(data.nodes);
    return this.importLinks(data.links);
  };

  MySystemImporter.prototype.importNodes = function(importNodes) {
    var data, i, len, results;
    results = [];
    for (i = 0, len = importNodes.length; i < len; i++) {
      data = importNodes[i];
      results.push(this.system.importNode({
        key: data.key,
        data: data
      }));
    }
    return results;
  };

  MySystemImporter.prototype.importLinks = function(links) {
    var data, i, len, results;
    results = [];
    for (i = 0, len = links.length; i < len; i++) {
      data = links[i];
      results.push(this.system.importLink({
        sourceNode: data.sourceNodeKey,
        targetNode: data.targetNodeKey,
        sourceTerminal: data.sourceTerminal,
        targetTerminal: data.targetTerminal,
        title: data.title,
        color: data.color
      }));
    }
    return results;
  };

  return MySystemImporter;

})();



},{}],8:[function(require,module,exports){
var DiagramToolkit;

module.exports = DiagramToolkit = (function() {
  function DiagramToolkit(domContext, options) {
    this.domContext = domContext;
    this.options = options != null ? options : {};
    this.type = 'jsPlumbWrappingDiagramToolkit';
    this.color = this.options.color || '#233';
    this.lineWidth = this.options.lineWidth || 6;
    this.kit = jsPlumb.getInstance({
      Container: this.domContext
    });
    this.kit.importDefaults({
      Connector: [
        'Bezier', {
          curviness: 50
        }
      ],
      Anchors: ['TopCenter', 'BottomCenter'],
      Endpoint: this._endpointOptions,
      DragOptions: {
        cursor: 'pointer',
        zIndex: 2000
      },
      DoNotThrowErrors: false
    });
    this.registerListeners();
  }

  DiagramToolkit.prototype.registerListeners = function() {
    return this.kit.bind('connection', this.handleConnect.bind(this));
  };

  DiagramToolkit.prototype.handleConnect = function(info, evnt) {
    var base;
    if (typeof (base = this.options).handleConnect === "function") {
      base.handleConnect(info, evnt);
    }
    return true;
  };

  DiagramToolkit.prototype.handleClick = function(connection, evnt) {
    var base;
    return typeof (base = this.options).handleClick === "function" ? base.handleClick(connection, evnt) : void 0;
  };

  DiagramToolkit.prototype.handleLabelClick = function(label, evnt) {
    var base;
    return typeof (base = this.options).handleClick === "function" ? base.handleClick(label.component, evnt) : void 0;
  };

  DiagramToolkit.prototype.handleDisconnect = function(info, evnt) {
    var base;
    return (typeof (base = this.options).handleDisconnect === "function" ? base.handleDisconnect(info, evnt) : void 0) || true;
  };

  DiagramToolkit.prototype.repaint = function() {
    return this.kit.repaintEverything();
  };

  DiagramToolkit.prototype._endpointOptions = [
    "Dot", {
      radius: 15
    }
  ];

  DiagramToolkit.prototype.makeTarget = function(div) {
    var opts;
    opts = (function(_this) {
      return function(anchor) {
        return {
          isTarget: true,
          isSource: true,
          endpoint: _this._endpointOptions,
          connector: ['Bezier'],
          anchor: anchor,
          paintStyle: _this._paintStyle(),
          maxConnections: -1
        };
      };
    })(this);
    this.kit.addEndpoint(div, opts('Top'));
    return this.kit.addEndpoint(div, opts('Bottom'));
  };

  DiagramToolkit.prototype.clear = function() {
    if (this.kit) {
      this.kit.deleteEveryEndpoint();
      this.kit.reset();
      return this.registerListeners();
    } else {
      return console.log('No kit defined');
    }
  };

  DiagramToolkit.prototype._paintStyle = function(color) {
    return {
      strokeStyle: color || this.color,
      lineWidth: this.lineWidth
    };
  };

  DiagramToolkit.prototype._overlays = function(label, selected) {
    var results;
    results = [
      [
        'Arrow', {
          location: 1.0,
          events: {
            click: this.handleLabelClick.bind(this)
          }
        }
      ]
    ];
    if ((label != null ? label.length : void 0) > 0) {
      results.push([
        'Label', {
          location: 0.4,
          events: {
            click: this.handleLabelClick.bind(this)
          },
          label: label || '',
          cssClass: "label" + (selected ? ' selected' : '')
        }
      ]);
    }
    return results;
  };

  DiagramToolkit.prototype._clean_borked_endpoints = function() {
    return $('._jsPlumb_endpoint:not(.jsplumb-draggable)').remove();
  };

  DiagramToolkit.prototype.addLink = function(source, target, label, color, source_terminal, target_terminal, linkModel) {
    var connection, paintStyle;
    paintStyle = this._paintStyle(color);
    if (linkModel.selected) {
      paintStyle.lineWidth = paintStyle.lineWidth * 1.2;
    }
    connection = this.kit.connect({
      source: source,
      target: target,
      anchors: [source_terminal || "Top", target_terminal || "Bottom"],
      paintStyle: paintStyle,
      overlays: this._overlays(label, linkModel.selected)
    });
    connection.bind('click', this.handleClick.bind(this));
    return connection.linkModel = linkModel;
  };

  DiagramToolkit.prototype.setSuspendDrawing = function(shouldwestop) {
    if (!shouldwestop) {
      this._clean_borked_endpoints();
    }
    return this.kit.setSuspendDrawing(shouldwestop, !shouldwestop);
  };

  DiagramToolkit.prototype.supspendDrawing = function() {
    return this.setSuspendDrawing(true);
  };

  DiagramToolkit.prototype.resumeDrawing = function() {
    return this.setSuspendDrawing(false);
  };

  return DiagramToolkit;

})();



},{}],9:[function(require,module,exports){
var LinkEditView, LinkView, NodeEditView, NodeWell, StatusMenu, div, protoNodes;

LinkView = React.createFactory(require('./link-view'));

NodeWell = React.createFactory(require('./node-well-view'));

NodeEditView = React.createFactory(require('./node-edit-view'));

LinkEditView = React.createFactory(require('./link-edit-view'));

StatusMenu = React.createFactory(require('./status-menu-view'));

div = React.DOM.div;

log.setLevel(log.levels.TRACE);

protoNodes = [
  {
    'title': 'Egg',
    'image': 'img/nodes/egg.png'
  }, {
    'title': 'Chick',
    'image': 'img/nodes/chick.jpg'
  }, {
    'title': 'Chicken',
    'image': 'img/nodes/chicken.jpg'
  }, {
    'title': '',
    'image': ''
  }
];

module.exports = React.createClass({
  displayName: 'App',
  getInitialState: function() {
    return {
      selectedNode: null,
      selectedConnection: null
    };
  },
  componentDidUpdate: function() {
    return log.info('Did Update: AppView');
  },
  addDeleteKeyHandler: function(add) {
    var deleteFunction;
    if (add) {
      deleteFunction = this.props.linkManager.deleteSelected.bind(this.props.linkManager);
      return $(window).on('keydown', function(e) {
        if (e.which === 8 && !$(e.target).is('input, textarea')) {
          e.preventDefault();
          return deleteFunction();
        }
      });
    } else {
      return $(window).off('keydown');
    }
  },
  componentDidMount: function() {
    var ref;
    this.addDeleteKeyHandler(true);
    this.props.linkManager.addSelectionListener((function(_this) {
      return function(selections) {
        _this.setState({
          selectedNode: selections.node,
          selectedConnection: selections.connection
        });
        return log.info('updated selections: + selections');
      };
    })(this));
    if (((ref = this.props.data) != null ? ref.length : void 0) > 0) {
      return this.props.linkManager.loadData(JSON.parse(this.props.data));
    } else {
      return this.props.linkManager.loadDataFromUrl(this.props.url);
    }
  },
  componentDidUnmount: function() {
    return this.addDeleteKeyHandler(false);
  },
  getData: function() {
    return this.props.linkManager.toJsonString();
  },
  onNodeChanged: function(node, title, image) {
    return this.props.linkManager.changeNode(title, image);
  },
  onLinkChanged: function(link, title, color, deleted) {
    return this.props.linkManager.changeLink(title, color, deleted);
  },
  render: function() {
    return div({
      className: 'app'
    }, StatusMenu({
      linkManager: this.props.linkManager,
      getData: this.getData
    }), LinkView({
      linkManager: this.props.linkManager
    }), div({
      className: 'bottomTools'
    }, NodeWell({
      protoNodes: protoNodes
    }), NodeEditView({
      node: this.state.selectedNode,
      onNodeChanged: this.onNodeChanged,
      protoNodes: protoNodes
    }), LinkEditView({
      link: this.state.selectedConnection,
      onLinkChanged: this.onLinkChanged
    })));
  }
});



},{"./link-edit-view":11,"./link-view":12,"./node-edit-view":13,"./node-well-view":15,"./status-menu-view":17}],10:[function(require,module,exports){
var GoogleDriveIO, button, div, input, label, ref;

GoogleDriveIO = require('../utils/google-drive-io');

ref = React.DOM, div = ref.div, label = ref.label, input = ref.input, button = ref.button;

module.exports = React.createClass({
  displayName: 'GoogleFileView',
  getInitialState: function() {
    return {
      filename: 'model',
      authStatus: 'unknown'
    };
  },
  componentDidMount: function() {
    var googleDrive, waitForGAPI;
    googleDrive = new GoogleDriveIO();
    waitForGAPI = (function(_this) {
      return function() {
        var ref1;
        if (typeof gapi !== "undefined" && gapi !== null ? (ref1 = gapi.auth) != null ? ref1.authorize : void 0 : void 0) {
          return _this.authorize(true);
        } else {
          return setTimeout(waitForGAPI, 10);
        }
      };
    })(this);
    return waitForGAPI();
  },
  saveToGDrive: function() {
    var filename, googleDrive;
    googleDrive = new GoogleDriveIO();
    filename = this.state.filename;
    log.info("Proposing to save to '" + filename + "'");
    if (!filename || filename.length === 0) {
      filename = 'model';
    }
    if (!/\.json$/.test(filename)) {
      filename += '.json';
    }
    log.info("Saving to '" + filename + "'");
    return googleDrive.upload({
      fileName: filename,
      mimeType: 'application/json'
    }, this.props.linkManager.toJsonString());
  },
  authorize: function(immediate) {
    var googleDrive;
    googleDrive = new GoogleDriveIO();
    return googleDrive.authorize(immediate, (function(_this) {
      return function(token) {
        if (token && !token.error) {
          return _this.setState({
            authStatus: 'authorized'
          });
        } else {
          _this.setState({
            authStatus: 'unauthorized'
          });
          return console.error("Google Drive Authorization failed: " + ((token != null ? token.error : void 0) || 'Unknown error'));
        }
      };
    })(this));
  },
  changeFilename: function(e) {
    log.info("Changing filename: " + e.target.value);
    return this.setState({
      filename: e.target.value
    });
  },
  render: function() {
    switch (this.state.authStatus) {
      case 'authorized':
        return div({
          className: 'file-dialog-view'
        }, label({}, 'Filename:'), input({
          type: 'text',
          onChange: this.changeFilename,
          value: this.state.fileName,
          id: 'filename'
        }), button({
          id: 'send',
          onClick: this.saveToGDrive
        }, 'Save to Google Drive'));
      case 'unauthorized':
        return div({
          className: 'file-dialog-view'
        }, button({
          id: 'authorize',
          onClick: ((function(_this) {
            return function() {
              return _this.authorize(false);
            };
          })(this))
        }, 'Authorize for Google Drive'));
      default:
        return null;
    }
  }
});



},{"../utils/google-drive-io":6}],11:[function(require,module,exports){
var button, div, h2, input, label, palette, palettes, ref;

ref = React.DOM, div = ref.div, h2 = ref.h2, button = ref.button, label = ref.label, input = ref.input;

palettes = [['#4D6A6D', '#798478', "#A0A083", "#C9ADA1", "#EAE0CC"], ['#351431', '#775253', "#BDC696", "#D1D3C4", "#DFE0DC"], ['#D6F49D', '#EAD637', "#CBA328", "#230C0F", "#A2D3C2"]];

palette = palettes[2];

module.exports = React.createClass({
  displayName: 'LinkEditView',
  notifyChange: function(title, color, deleted) {
    var base;
    return typeof (base = this.props).onLinkChanged === "function" ? base.onLinkChanged(this.props.link, title, color, !!deleted) : void 0;
  },
  changeTitle: function(e) {
    return this.notifyChange(e.target.value, this.props.link.color);
  },
  deleteLink: function() {
    return this.notifyChange(this.props.link.title, this.props.link.color, true);
  },
  pickColor: function(e) {
    return this.notifyChange(this.props.link.title, $(e.target).css('background-color'));
  },
  render: function() {
    var colorCode, i;
    if (this.props.link) {
      return div({
        className: 'link-edit-view'
      }, h2({}, this.props.link.title), div({
        className: 'edit-row'
      }, button({
        type: 'button',
        className: 'delete',
        onClick: this.deleteLink
      }, 'delete this link')), div({
        className: 'edit-row'
      }, label({
        name: 'title'
      }, 'Title'), input({
        type: 'text',
        name: 'title',
        value: this.props.link.title,
        onChange: this.changeTitle
      })), div({
        className: 'edit-row'
      }, label({
        name: 'color'
      }, 'Color'), (function() {
        var j, len, results;
        results = [];
        for (i = j = 0, len = palette.length; j < len; i = ++j) {
          colorCode = palette[i];
          results.push(div({
            className: 'colorChoice',
            key: i,
            style: {
              backgroundColor: colorCode
            },
            onTouchEnd: this.pickColor,
            onClick: this.pickColor
          }));
        }
        return results;
      }).call(this)));
    } else {
      return div({
        className: 'link-edit-view hidden'
      });
    }
  }
});



},{}],12:[function(require,module,exports){
var DiagramToolkit, Importer, Node, NodeList, div;

Node = React.createFactory(require('./node-view'));

Importer = require('../utils/importer');

NodeList = require('../models/link-manager');

DiagramToolkit = require('../utils/js-plumb-diagram-toolkit');

div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'LinkView',
  componentDidMount: function() {
    var $container;
    $container = $(this.refs.container.getDOMNode());
    this.diagramToolkit = new DiagramToolkit($container, {
      Container: $container[0],
      handleConnect: this.handleConnect,
      handleClick: this.handleClick
    });
    this._updateToolkit();
    this.props.linkManager.addLinkListener(this);
    this.props.linkManager.addNodeListener(this);
    return $container.droppable({
      accept: '.proto-node',
      hoverClass: "ui-state-highlight",
      drop: this.addNode
    });
  },
  addNode: function(e, ui) {
    var image, offset, ref, title;
    ref = ui.draggable.data(), title = ref.title, image = ref.image;
    offset = $(this.refs.linkView.getDOMNode()).offset();
    return this.props.linkManager.importNode({
      data: {
        x: ui.offset.left - offset.left,
        y: ui.offset.top - offset.top,
        title: title,
        image: image
      }
    });
  },
  getInitialState: function() {
    return {
      nodes: [],
      links: []
    };
  },
  componentWillUpdate: function() {
    var ref;
    return (ref = this.diagramToolkit) != null ? typeof ref.clear === "function" ? ref.clear() : void 0 : void 0;
  },
  componentDidUpdate: function() {
    return this._updateToolkit();
  },
  handleEvent: function(handler) {
    if (this.ignoringEvents) {
      return false;
    } else {
      handler();
      return true;
    }
  },
  onNodeMoved: function(node_event) {
    return this.handleEvent((function(_this) {
      return function() {
        var left, ref, top;
        ref = node_event.extra.position, left = ref.left, top = ref.top;
        return _this.props.linkManager.moveNode(node_event.nodeKey, left, top);
      };
    })(this));
  },
  onNodeDeleted: function(node_event) {
    return this.handleEvent((function(_this) {
      return function() {
        return _this.props.linkManager.removeNode(node_event.nodeKey);
      };
    })(this));
  },
  handleConnect: function(info, evnt) {
    return this.handleEvent((function(_this) {
      return function() {
        return _this.props.linkManager.newLinkFromEvent(info, evnt);
      };
    })(this));
  },
  handleClick: function(connection, evnt) {
    return this.handleEvent((function(_this) {
      return function() {
        return _this.props.linkManager.selectLink(connection.linkModel);
      };
    })(this));
  },
  handleLinkAdd: function(info, evnt) {
    this.setState({
      links: this.props.linkManager.getLinks()
    });
    return true;
  },
  handleLinkRm: function() {
    this.setState({
      links: this.props.linkManager.getLinks()
    });
    return false;
  },
  handleNodeAdd: function(nodeData) {
    this.setState({
      nodes: this.props.linkManager.getNodes()
    });
    return true;
  },
  handleNodeMove: function(nodeData) {
    this.setState({
      nodes: this.props.linkManager.getNodes()
    });
    this.diagramToolkit.repaint();
    return true;
  },
  handleNodeRm: function() {
    this.setState({
      nodes: this.props.linkManager.getNodes()
    });
    return false;
  },
  _nodeForName: function(name) {
    var ref;
    return ((ref = this.refs[name]) != null ? ref.getDOMNode() : void 0) || false;
  },
  _updateNodeValue: function(name, key, value) {
    var changed, i, len, node, ref;
    changed = 0;
    ref = this.state.nodes;
    for (i = 0, len = ref.length; i < len; i++) {
      node = ref[i];
      if (node.key === name) {
        node[key] = value;
        changed++;
      }
    }
    if (changed > 0) {
      return this.setState({
        nodes: this.state.nodes
      });
    }
  },
  _updateToolkit: function() {
    if (this.diagramToolkit) {
      this.ignoringEvents = true;
      this.diagramToolkit.supspendDrawing();
      this._redrawLinks();
      this._redrawTargets();
      this.diagramToolkit.resumeDrawing();
      return this.ignoringEvents = false;
    }
  },
  _redrawTargets: function() {
    return this.diagramToolkit.makeTarget($(this.refs.linkView.getDOMNode()).find('.elm'));
  },
  _redrawLinks: function() {
    var i, len, link, ref, results, source, sourceTerminal, target, targetTerminal;
    ref = this.state.links;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      source = this._nodeForName(link.sourceNode.key);
      target = this._nodeForName(link.targetNode.key);
      if (source && target) {
        sourceTerminal = link.sourceTerminal === 'a' ? 'Top' : 'Bottom';
        targetTerminal = link.targetTerminal === 'a' ? 'Top' : 'Bottom';
        results.push(this.diagramToolkit.addLink(source, target, link.title, link.color, sourceTerminal, targetTerminal, link));
      } else {
        results.push(void 0);
      }
    }
    return results;
  },
  render: function() {
    var node;
    return div({
      className: 'link-view',
      ref: 'linkView'
    }, div({
      className: 'container',
      ref: 'container'
    }, (function() {
      var i, len, ref, results;
      ref = this.state.nodes;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        node = ref[i];
        results.push(Node({
          key: node.key,
          data: node,
          selected: node.selected,
          nodeKey: node.key,
          ref: node.key,
          onMove: this.onNodeMoved,
          onDelete: this.onNodeDeleted,
          linkManager: this.props.linkManager
        }));
      }
      return results;
    }).call(this)));
  }
});



},{"../models/link-manager":3,"../utils/importer":7,"../utils/js-plumb-diagram-toolkit":8,"./node-view":14}],13:[function(require,module,exports){
var div, h2, input, label, option, ref, select;

ref = React.DOM, div = ref.div, h2 = ref.h2, label = ref.label, input = ref.input, select = ref.select, option = ref.option;

module.exports = React.createClass({
  displayName: 'NodeEdit',
  changeTitle: function(e) {
    var base;
    return typeof (base = this.props).onNodeChanged === "function" ? base.onNodeChanged(this.props.node, e.target.value, this.props.node.image) : void 0;
  },
  changeImage: function(e) {
    var base;
    return typeof (base = this.props).onNodeChanged === "function" ? base.onNodeChanged(this.props.node, this.props.node.title, e.target.value) : void 0;
  },
  render: function() {
    var i, node;
    if (this.props.node) {
      return div({
        className: 'node-edit-view'
      }, h2({}, this.props.node.title), div({
        className: 'edit-row'
      }, label({
        name: 'title'
      }, 'Title'), input({
        type: 'text',
        name: 'title',
        value: this.props.node.title,
        onChange: this.changeTitle
      })), div({
        className: 'edit-row'
      }, label({
        name: 'image'
      }, 'Image'), select({
        name: 'image',
        value: this.props.node.image,
        onChange: this.changeImage
      }, (function() {
        var j, len, ref1, results;
        ref1 = this.props.protoNodes;
        results = [];
        for (i = j = 0, len = ref1.length; j < len; i = ++j) {
          node = ref1[i];
          results.push(option({
            key: i,
            value: node.image
          }, node.title));
        }
        return results;
      }).call(this))));
    } else {
      return div({
        className: 'node-edit-view hidden'
      });
    }
  }
});



},{}],14:[function(require,module,exports){
var div, i, img, ref;

ref = React.DOM, div = ref.div, i = ref.i, img = ref.img;

module.exports = React.createClass({
  displayName: 'NodeView',
  componentDidMount: function() {
    var $elem;
    $elem = $(this.refs.node.getDOMNode());
    $elem.draggable({
      drag: this.doMove,
      containment: 'parent'
    });
    return $elem.bind('mouseup touchend', ((function(_this) {
      return function() {
        return _this.handleSelected(true);
      };
    })(this)));
  },
  handleSelected: function(actually_select) {
    var selectionKey;
    if (this.props.linkManager) {
      selectionKey = actually_select ? this.props.nodeKey : 'dont-select-anything';
      return this.props.linkManager.selectNode(selectionKey);
    }
  },
  propTypes: {
    onDelete: React.PropTypes.func,
    onMove: React.PropTypes.func,
    onSelect: React.PropTypes.func,
    nodeKey: React.PropTypes.string
  },
  getDefaultProps: function() {
    return {
      onMove: function() {
        return log.info('internal move handler');
      },
      onStop: function() {
        return log.info('internal move handler');
      },
      onDelete: function() {
        return log.info('internal on-delete handler');
      },
      onSelect: function() {
        return log.info('internal select handler');
      }
    };
  },
  doMove: function(evt, extra) {
    return this.props.onMove({
      nodeKey: this.props.nodeKey,
      reactComponent: this,
      domElement: this.refs.node.getDOMNode(),
      syntheticEvent: evt,
      extra: extra
    });
  },
  doDelete: function(evt) {
    return this.props.onDelete({
      nodeKey: this.props.nodeKey,
      reactComponent: this,
      domElement: this.refs.node.getDOMNode(),
      syntheticEvent: evt
    });
  },
  render: function() {
    var ref1, style;
    style = {
      top: this.props.data.y,
      left: this.props.data.x
    };
    return div({
      className: "elm" + (this.props.selected ? ' selected' : ''),
      ref: 'node',
      style: style,
      'data-node-key': this.props.nodeKey
    }, div({
      className: 'img-background'
    }, div({
      className: 'delete-box',
      onClick: this.doDelete
    }, i({
      className: 'fa fa-times-circle'
    })), (((ref1 = this.props.data.image) != null ? ref1.length : void 0) > 0 ? img({
      src: this.props.data.image
    }) : null), div({
      className: 'node-title'
    }, this.props.data.title)));
  }
});



},{}],15:[function(require,module,exports){
var ProtoNodeView, div;

ProtoNodeView = React.createFactory(require('./proto-node-view'));

div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'NodeWell',
  getInitialState: function() {
    return {
      nodes: []
    };
  },
  render: function() {
    var i, node;
    return div({
      className: 'node-well'
    }, (function() {
      var j, len, ref, results;
      ref = this.props.protoNodes;
      results = [];
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        node = ref[i];
        results.push(ProtoNodeView({
          key: i,
          image: node.image,
          title: node.title
        }));
      }
      return results;
    }).call(this));
  }
});



},{"./proto-node-view":16}],16:[function(require,module,exports){
var div, img, ref;

ref = React.DOM, div = ref.div, img = ref.img;

module.exports = React.createClass({
  displayName: 'ProtoNode',
  componentDidMount: function() {
    return $(this.refs.node.getDOMNode()).draggable({
      drag: this.doMove,
      revert: true,
      helper: 'clone',
      revertDuration: 0,
      opacity: 0.35
    });
  },
  doMove: function() {
    return void 0;
  },
  render: function() {
    var ref1;
    return div({
      className: 'proto-node',
      ref: 'node',
      'data-node-key': this.props.key,
      'data-image': this.props.image,
      'data-title': this.props.title
    }, div({
      className: 'img-background'
    }, ((ref1 = this.props.image) != null ? ref1.length : void 0) > 0 ? img({
      src: this.props.image
    }) : null));
  }
});



},{}],17:[function(require,module,exports){
var GoogleFileView, div;

GoogleFileView = React.createFactory(require('./google-file-view'));

div = React.DOM.div;

log.setLevel(log.levels.TRACE);

module.exports = React.createClass({
  displayName: 'StatusMenu',
  openLink: function() {
    if (this.props.getData) {
      return window.open(window.location.protocol + "//" + window.location.host + window.location.pathname + "?data=" + (encodeURIComponent(this.props.getData())));
    }
  },
  render: function() {
    return div({
      className: 'status-menu'
    }, div({
      className: 'title'
    }, this.props.title || 'Building Models'), GoogleFileView({
      linkManager: this.props.linkManager
    }), div({
      className: 'open-data-url',
      onClick: this.openLink
    }, this.props.linkText || 'Link to my model'));
  }
});



},{"./google-file-view":10}]},{},[1]);

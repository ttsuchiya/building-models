var $ = require('jquery');
// Purpose of this class: Provide an abstraction over our
// chosen diagramming toolkit.  
function DiagramToolkit(domContext, options) {
  this.options = options || {};
  this.domContex = domContext;
  this.type      = 'jsPlumbWrappingDiagramToolkit';
  this.color     = this.options.color || "#222" ;
  this.lineWidth = this.options.lineWidth || 6;    
  this.kit       = jsPlumb.getInstance({ Container: domContext});

  this.registerListeners = function() {
    this.kit.bind("connection", this.handleConnect.bind(this));
  };

  this.handleConnect = function(info,evnt) {
    if (this.options.handleConnect) {
      this.options.handleConnect(info, evnt);
    }
    return true;
  };
  
  this.handleDisconnect = function(info,evnt) {
    if (this.options.handleDisconnect) {
      return this.options.handleDisconnect(info, evnt);
    }
    return true;
  };

  this.repaint = function() {
    this.kit.repaintEverything();
  };

  this._endpointOptions = [ "Dot", { radius:15 } ];

  this.makeTarget = function(div) {
    var opts = {
      isTarget:true, 
      isSource:true,
      endpoint: this._endpointOptions,
      connector:[ "Bezier"],
      anchor: "Top",
      paintStyle: this._paintStyle(),
      maxConnections: -1,
    };
    
    this.kit.addEndpoint(div,opts);
    opts.anchor = "Bottom";
    this.kit.addEndpoint(div,opts);
  };

  this.clear = function() {
    if(this.kit) {
      this.kit.deleteEveryEndpoint();
      this.kit.reset();
      this.registerListeners();
    }
    else {
      console.log("No kit defined");
    }
  };

  this.kit.importDefaults({
    Connector:        [ "Bezier",    { curviness: 50 } ],
    Anchors:          [ "TopCenter", "BottomCenter"],
    Endpoint:         this._endpointOptions,
    DragOptions :     { cursor: 'pointer', zIndex:2000 },
    DoNotThrowErrors: false
  });

  this._paintStyle = function(color) {
    var _color = color || this.color;
    var _line_width = this.lineWidth;
    return ({
      strokeStyle: _color,
      lineWidth: _line_width
    });
  };
    
  this._overlays = function(label) {
    var _label = label || "";
    return ([ 
      [ "Arrow", { location: 1.0 }],
      [ "Label", { location: 0.4, label:_label, cssClass: "label"} ]
    ]);
  };

  this._clean_borked_endpoints = function() {
    $("._jsPlumb_endpoint:not(.jsplumb-draggable)").remove();
  }

  this.addLink = function(source, target, label, color, source_terminal, target_terminal) {
    this.kit.connect({
      source: source,
      target: target,
      anchors: [source_terminal || "Top", target_terminal || "Bottom"],
      paintStyle: this._paintStyle(color),
      overlays: this._overlays(label)
    });
  };

  this.setSuspendDrawing = function(shouldwestop) {
    if (!shouldwestop) {
      this._clean_borked_endpoints();
    }
    this.kit.setSuspendDrawing(shouldwestop,!shouldwestop);
  };

  this.supspendDrawing = function() {
    this.setSuspendDrawing(true);
  };
  
  this.resumeDrawing = function() {
    this.setSuspendDrawing(false);
  };

  this.registerListeners();

}


module.exports = DiagramToolkit;
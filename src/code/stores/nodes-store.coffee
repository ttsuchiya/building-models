PaletteStore       = require './palette-store'
GraphActions       = require '../actions/graph-actions'

nodeActions = Reflux.createActions(
  [
    "nodesChanged"
  ]
)

nodeStore   = Reflux.createStore
  listenables: [nodeActions]

  init: ->
    @nodes               = []
    @paletteItemHasNodes = false
    @selectedPaletteItem = null

    PaletteStore.store.listen @paletteChanged
    GraphActions.graphChanged.listen  @graphChanged

  onNodesChanged: (nodes) ->
    @nodes = nodes
    @internalUpdate()

  graphChanged: (status) ->
    @nodes = status.nodes
    @internalUpdate()

  paletteChanged: ->
    @selectedPaletteItem = PaletteStore.store.selectedPaletteItem
    @internalUpdate()

  internalUpdate: ->
    @paletteItemHasNodes = false
    return unless @selectedPaletteItem
    _.each @nodes, (node) =>
      if node.paletteItemIs @selectedPaletteItem
        @paletteItemHasNodes = true
    @notifyChange()

  notifyChange: ->
    data =
      nodes: @nodes
      paletteItemHasNodes: @paletteItemHasNodes
    @trigger(data)

mixin =
  getInitialState: ->
    nodes: nodeStore.nodes
    paletteItemHasNodes: nodeStore.paletteItemHasNodes

  componentDidMount: ->
    @unsubscribe = nodeStore.listen @onNodesChange

  componentWillUnmount: ->
    @unsubscribe()

  onNodesChange: (status) ->
    @setState
      # nodes: status.nodes
      paletteItemHasNodes: status.paletteItemHasNodes

module.exports =
  actions: nodeActions
  store: nodeStore
  mixin: mixin

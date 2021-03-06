HashParams      = require '../utils/hash-parameters'
ImportActions   = require '../actions/import-actions'

AppSettingsActions = Reflux.createActions(
  [
    "setComplexity"
    "setSimulationType"
    "showMinigraphs"
    "relationshipSymbols"
  ]
)

Complexity = {
  basic: 0
  expanded: 1
  DEFAULT: 1
}

SimulationType = {
  diagramOnly: 0
  static: 1
  time: 2
  DEFAULT: 1
}


AppSettingsStore   = Reflux.createStore
  listenables: [AppSettingsActions, ImportActions]

  init: ->
    simulationType = if HashParams.getParam('simplified')
      SimulationType.diagramOnly
    else
      SimulationType.DEFAULT

    @settings =
      showingSettingsDialog: false
      complexity: Complexity.DEFAULT
      simulationType: simulationType
      showingMinigraphs: false
      relationshipSymbols: false

  onShowMinigraphs: (show) ->
    @settings.showingMinigraphs = show
    @notifyChange()

  onSetComplexity: (val) ->
    @settings.complexity = val
    if val is 0
      @settings.showingMinigraphs = false
    @notifyChange()

  onSetSimulationType: (val) ->
    @settings.simulationType = val
    @notifyChange()

  onRelationshipSymbols: (show) ->
    @settings.relationshipSymbols = show
    @notifyChange()

  notifyChange: ->
    @trigger _.clone @settings

  onImport: (data) ->
    _.merge @settings, data.settings
    @notifyChange()

  serialize: ->
    complexity: @settings.complexity
    simulationType: @settings.simulationType
    showingMinigraphs: @settings.showingMinigraphs
    relationshipSymbols: @settings.relationshipSymbols

AppSettingsStore.Complexity = Complexity
AppSettingsStore.SimulationType = SimulationType

mixin =
  getInitialState: ->
    _.clone AppSettingsStore.settings

  componentDidMount: ->
    @unsubscribe = AppSettingsStore.listen @onAppSettingsChange

  componentWillUnmount: ->
    @unsubscribe()

  onAppSettingsChange: (newData) ->
    @setState _.clone newData

module.exports =
  actions: AppSettingsActions
  store: AppSettingsStore
  mixin: mixin

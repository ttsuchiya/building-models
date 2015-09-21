{div, span, i, br} = React.DOM

ModalAppSettings = React.createFactory require './modal-app-settings-view'
AppSettingsStore = require '../stores/app-settings-store'
CodapStore       = require "../stores/codap-store"
tr               = require '../utils/translate'

module.exports = React.createClass

  mixins: [ CodapStore.mixin, AppSettingsStore.mixin ]

  displayName: 'DocumentActions'

  getInitialState: ->
    canRedo: false
    canUndo: false

  componentDidMount: ->
    @props.graphStore.addChangeListener @modelChanged

  modelChanged: (status) ->
    @setState
      canRedo: status.canRedo
      canUndo: status.canUndo

  undoClicked: ->
    @props.graphStore.undo()

  redoClicked: ->
    @props.graphStore.redo()

  renderRunLink: ->
    if @state.codapHasLoaded and not @props.diagramOnly
      classNames = "fa fa-play-circle"
      classNames += " error" unless @props.graphIsValid
      (span {},
        (i {className: classNames, onClick: @props.runSimulation})
        tr "~DOCUMENT.ACTIONS.RUN_SIMULATION"
      )

  renderSettingsLink: ->
    (span {},
      (i {className: "fa fa-cog", onClick: AppSettingsStore.actions.showSettingsDialog})
    )

  render: ->
    buttonClass = (enabled) -> "button-link #{if not enabled then 'disabled' else ''}"
    (div {className: 'document-actions'},
      (div {className: "misc-actions"},
        @renderRunLink()
      )
      unless @state.hideUndoRedo
        (div {className: 'undo-redo'},
          (span {className: (buttonClass @state.canUndo), onClick: @undoClicked, disabled: not @state.canUndo}, tr "~DOCUMENT.ACTIONS.UNDO")
          (span {className: (buttonClass @state.canRedo), onClick: @redoClicked, disabled: not @state.canRedo}, tr "~DOCUMENT.ACTIONS.REDO")
        )

      if @props.iframed
        (div {className: "misc-actions"},
          @renderSettingsLink()
        )
      (ModalAppSettings {
        showing: @state.showingSettingsDialog
        capNodeValues: @state.capNodeValues
        diagramOnly: @state.diagramOnly
        onClose: ->
          AppSettingsStore.actions.close()
      })
    )

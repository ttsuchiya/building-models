{div, i, span} = React.DOM
tr = require '../utils/translate'

Dropdown           = React.createFactory require './dropdown-view'
OpenInCodap        = React.createFactory require './open-in-codap-view'
ModalGoogleSave    = React.createFactory require './modal-google-save-view'
BuildInfoView      = React.createFactory require './build-info-view'
GoogleFileStore    = require '../stores/google-file-store'
UndoRedoUIStore    = require '../stores/undo-redo-ui-store'
AppSettingsActions = require('../stores/app-settings-store').actions

module.exports = React.createClass

  displayName: 'GlobalNav'

  mixins: [ GoogleFileStore.mixin, UndoRedoUIStore.mixin ]

  getInitialState: ->
    dirty: false
    saved: false

  componentDidMount: ->
    @props.graphStore.addChangeListener @modelChanged

  modelChanged: (status) ->
    @setState
      dirty: status.dirty
      canUndo: status.canUndo
      saved: status.saved

  render: ->
    options = [
      name: tr "~MENU.NEW"
      action: GoogleFileStore.actions.newFile
    ,
      name: tr "~MENU.OPEN"
      action: GoogleFileStore.actions.openFile
    ,
      name: tr "~MENU.SAVE"
      action: GoogleFileStore.actions.showSaveDialog
    ,
      name: tr "~MENU.SAVE_AS"
      action: false
    ,
      name: tr "~MENU.REVERT_TO_ORIGINAL"
      action: if @state.canUndo then GoogleFileStore.actions.revertToOriginal else false
    ,
      name: tr "~MENU.REVERT_TO_LAST_SAVE"
      action: if @state.saved and @state.dirty then GoogleFileStore.actions.revertToLastSave else false
    ]

    (div {className: 'global-nav'},
      (div {},
        (Dropdown {anchor: @props.filename, items: options, className:'global-nav-content-filename'})
        if @state.dirty
          (span {className: 'global-nav-file-status'}, 'Unsaved')
      )
      if @state.action
        (div {},
          (i {className: "icon-codap-options spin"})
          @state.action
        )
      (ModalGoogleSave {
        showing: @state.showingSaveDialog
        onSave: GoogleFileStore.actions.saveFile
        filename: @props.filename
        isPublic: @state.isPublic
        onRename: (newName) ->
          GoogleFileStore.actions.rename(newName)
        onClose: ->
          GoogleFileStore.actions.close()
        setIsPublic: GoogleFileStore.actions.setIsPublic
      })
      (BuildInfoView {})
      (div {className: 'global-nav-name-and-help'},
        (OpenInCodap { disabled: @state.dirty })
      )
    )

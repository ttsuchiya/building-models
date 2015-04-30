{div, h2, label, input, select, option, optgroup, button} = React.DOM
tr = require "../utils/translate"
NodeInspectorTabs = React.createFactory require './inspector-tabs-view'
ColorPicker = React.createFactory require './color-picker-view'
ImagePickerView = React.createFactory require './image-picker-view'

module.exports = React.createClass

  displayName: 'NodeInspectorView'

  changeTitle: (e) ->
    @props.onNodeChanged? @props.node, e.target.value, @props.node.image

  changeImage: (node) ->
    @props.onNodeChanged? @props.node, @props.node.title, node.image

  delete: (e) ->
    @props.onNodeDelete? @props.node

  render: ->
    builtInNodes = []
    droppedNodes = []
    remoteNodes = []
    tabs = [tr('design'), tr('define')]
    selected = tr('design')

    (div {className: 'node-inspector-view'},
      (NodeInspectorTabs {tabs: tabs, selected: selected} )
      (div {className: 'node-inspector-content'},
        (div {className: 'edit-row'},
          (label {htmlFor: 'title'}, tr "~NODE-EDIT.TITLE")
          (input {type: 'text', name: 'title', value: @props.node.title, onChange: @changeTitle})
        )
        (div {className: 'edit-row'},
          (label {htmlFor: 'color'}, tr "~NODE-EDIT.COLOR")
          (ColorPicker {type: 'text', name: 'title', value: @props.node.title, onChange: @changeTitle})
        )
        (div {className: 'edit-row'},
          (label {htmlFor: 'image'}, tr "~NODE-EDIT.IMAGE")
          (ImagePickerView {nodes:@props.protoNodes, selected: @props.node, onChange: @changeImage})
        )
        (div {className: 'edit-row'},
          (label {className: 'node-delete', onClick: @delete}, tr("~NODE-EDIT.DELETE"))
        )
      )
    )

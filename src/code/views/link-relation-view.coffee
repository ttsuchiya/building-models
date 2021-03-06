{br, div, h2, label, span, input, p, i, select, option, textarea} = React.DOM

RelationFactory  = require "../models/relation-factory"
SvgGraph         = React.createFactory require "./svg-graph-view"
tr               = require "../utils/translate"
autosize         = require "autosize"
SimulationStore  = require '../stores/simulation-store'
AppSettingsStore = require '../stores/app-settings-store'

Graph = React.createFactory React.createClass
  render: ->
    (SvgGraph {
      width: 130
      height: 130
      yLabel: @props.yAxis
      xLabel: @props.xAxis
      link: @props.link
      graphStore: @props.graphStore
    })

QuantStart = React.createFactory React.createClass
  render: ->
    start = tr "~NODE-RELATION-EDIT.SEMI_QUANT_START"
    (div {style: {width: "95%"}},
      (span {}, "#{tr "~NODE-RELATION-EDIT.AN_INCREASE_IN"} ")
      (span {className: "source"}, @props.source)
      (span {}, " #{tr "~NODE-RELATION-EDIT.CAUSES"} ")
      (span {className: "target"}, @props.target)
    )

module.exports = LinkRelationView = React.createClass

  displayName: 'LinkRelationView'

  mixins: [ SimulationStore.mixin, AppSettingsStore.mixin ]

  getDefaultProps: ->
    link:
      targetNode:
        title: "default target node"
      sourceNode:
        title: "default source node"

  getInitialState: ->
    status = @checkStatus(@props.link)
    return {
      selectedVector: null
      selectedScalar: null
      selectedVectorHasChanged: false
      selectedAccumulator: null
      selectedTransferModifier: null
      isAccumulator: status.isAccumulator
      isDualAccumulator: status.isDualAccumulator
      isTransfer: status.isTransfer
      isTransferModifier: status.isTransferModifier
    }

  componentWillMount: ->
    if @state.isAccumulator or @state.isTransferModifier or not @state.selectedVector?
      @updateState(@props)
    else if @props.link.relation.customData?
      selectedVector = RelationFactory.vary
      selectedScalar = RelationFactory.custom
      @setState {selectedVector, selectedScalar}

  componentDidMount: ->
    autosize(@refs.reasoning)

  componentWillReceiveProps: (newProps) ->
    if @props.link isnt newProps.link
      @updateState(newProps)

      # ensure reasoning value has been set, as onblur not triggered
      @props.link.reasoning = @refs.reasoning.value

    # a hack to update uncontrolled textarea when viewing new links
    @refs.reasoning.value = newProps.link.reasoning

  checkStatus: (link) ->
    {sourceNode, targetNode} = link
    status =
      isAccumulator: targetNode.isAccumulator
      isDualAccumulator: sourceNode.isAccumulator and targetNode.isAccumulator
      isTransferModifier: targetNode.isTransfer and
        (targetNode.transferLink?.sourceNode is sourceNode) or
        (targetNode.transferLink?.targetNode is sourceNode)

  updateState: (props) ->
    status = @checkStatus(props.link)
    {vector, scalar, accumulator, transferModifier} = RelationFactory.selectionsFromRelation props.link.relation
    if props.link.relation.customData?
      vector = RelationFactory.vary
      scalar = RelationFactory.custom
    @setState
      selectedVector: vector
      selectedScalar: scalar
      selectedAccumulator: accumulator
      selectedTransferModifier: transferModifier
      isAccumulator: status.isAccumulator
      isDualAccumulator: status.isDualAccumulator
      isTransferModifier: status.isTransferModifier

  updateRelation: ->
    if @state.isAccumulator
      selectedAccumulator = @getAccumulator()
      @setState {selectedAccumulator}

      if selectedAccumulator?
        link = @props.link
        relation = RelationFactory.CreateRelation(selectedAccumulator)
        relation.isDefined = true
        @props.graphStore.changeLink(link, {relation: relation})
    else if @state.isTransferModifier
      selectedTransferModifier = @getTransferModifier()
      @setState {selectedTransferModifier}

      if selectedTransferModifier?
        link = @props.link
        relation = RelationFactory.CreateRelation(selectedTransferModifier)
        relation.isDefined = true
        @props.graphStore.changeLink(link, {relation: relation})
    else
      selectedVector = @getVector()
      selectedScalar = @getScalar()
      if selectedVector? and selectedVector.isCustomRelationship
        selectedScalar = RelationFactory.custom
      @setState {selectedVector, selectedScalar}

      if selectedVector?
        link = @props.link
        existingData = link.relation.customData
        relation = RelationFactory.fromSelections(selectedVector, selectedScalar, existingData)
        relation.isDefined = selectedVector? and selectedScalar?
        if not selectedVector.isCustomRelationship
          relation.customData = null
        else
          relation.isDefined = link.relation.customData?
          relation.isCustomRelationship = true

        @props.graphStore.changeLink(link, {relation: relation})

  updateReasoning: ->
    @props.graphStore.changeLink(@props.link, {reasoning: @refs.reasoning.value})

  getAccumulator: ->
    RelationFactory.accumulators[@refs.accumulator.value]

  getTransferModifier: ->
    RelationFactory.transferModifiers[@refs.transfer.value]

  getVector: ->
    id = @refs.vector.value
    newVector = RelationFactory.vectors[id]

    selectedVectorHasChanged = false
    if @state.selectedVector and id != @state.selectedVector.id
      selectedVectorHasChanged = true

    @setState { selectedVectorHasChanged }
    newVector

  getScalar: ->
    if @state.complexity is AppSettingsStore.store.Complexity.basic
      RelationFactory.scalars.aboutTheSame
    else if @refs.scalar
      RelationFactory.scalars[@refs.scalar.value]
    else
      undefined

  renderVectorPulldown: (vectorSelection)->
    vectorOptions = if @state.complexity is AppSettingsStore.store.Complexity.basic
      RelationFactory.basicVectors
    else
      RelationFactory.vectors
    options = _.map vectorOptions, (opt, i) ->
      (option {value: opt.id, key: i}, opt.uiText)

    if not vectorSelection?
      options.unshift (option {key: "placeholder", value: "unselected", disabled: "disabled"},
        tr "~NODE-RELATION-EDIT.UNSELECTED")
      currentOption = "unselected"
    else
      currentOption = vectorSelection.id

    (div {className: "bb-select"},
      (span {}, "#{tr "~NODE-RELATION-EDIT.TO"} ")
      (select {value: currentOption, className:"", ref: "vector", onChange: @updateRelation},
      options)
    )

  renderScalarPulldown:(scalarSelection) ->
    options = _.map RelationFactory.scalars, (opt, i) ->
      (option {value: opt.id, key: i}, opt.uiText)

    if not scalarSelection?
      options.unshift (option {key: "placeholder", value: "unselected", disabled: "disabled"},
        tr "~NODE-RELATION-EDIT.UNSELECTED")
      currentOption = "unselected"
    else
      currentOption = scalarSelection.id

    onlyBasic = @state.complexity is AppSettingsStore.store.Complexity.basic
    vectorSelected = @state.selectedVector
    # place dropdown but hide it (to keep spacing) if we haven't selected
    # the vector or we have only basic complecity settings
    visible = vectorSelected and not onlyBasic
    visClass = if visible then ' visible' else ' hidden'

    if @state.selectedVector?.isCustomRelationship
      (div {className: "bb-select#{visClass}"},
        (span {}, "#{tr "~NODE-RELATION-EDIT.CUSTOM"}")
      )
    else
      (div {className: "bb-select#{visClass}"},
        (span {}, "#{tr "~NODE-RELATION-EDIT.BY"} ")
        (select {value: currentOption, className:"", ref: "scalar", onChange: @updateRelation},
          options
        )
      )

  renderAccumulator: (source, target) ->
    options = []
    _.each RelationFactory.accumulators, (opt, i) =>
      if (not opt.forDualAccumulator or @state.isDualAccumulator) and
          (not opt.forSoloAccumulatorOnly or not @state.isDualAccumulator)
        options.push (option {value: opt.id, key: opt.id}, opt.text)

    if not @state.selectedAccumulator
      options.unshift (option {key: "placeholder", value: "unselected", disabled: "disabled"},
        tr "~NODE-RELATION-EDIT.UNSELECTED")
      currentOption = "unselected"
    else
      currentOption = @state.selectedAccumulator.id

    textClass = if @state.selectedAccumulator?.hideAdditionalText then "hidden" else ""

    (div {className: 'top'},
      (span {className: "source"}, source)
      (span {className: textClass}, " #{tr "~NODE-RELATION-EDIT.IS"} ")
      (div {},
        (select {value: currentOption, ref: "accumulator", onChange: @updateRelation},
          options
        )
      )
      (span {className: "target"}, target)
      (span {className: textClass}, " #{tr "~NODE-RELATION-EDIT.EACH"} ")
      (span {className: textClass}, @state.stepUnits.toLowerCase())
    )

  renderTransfer: (source, target, isTargetProportional) ->
    spanWrap = (string,className) -> "<span class='#{className}'>#{string}</span>"
    options = _.map RelationFactory.transferModifiers, (opt, i) ->
      (option {value: opt.id, key: opt.id}, opt.text)
    sourceTitle = @props.link.sourceNode?.title || "NONE"
    targetTitle = @props.link.targetNode?.transferLink?.targetNode?.title || "NONE"

    if (isTargetProportional)
      sourceTitle = @props.link.targetNode?.transferLink?.sourceNode?.title || "NONE"
      line_a = tr "~NODE-RELATION-EDIT.VARIABLE_FLOW_TARGET_A",
        { targetTitle: spanWrap targetTitle, 'target' }
      line_b = tr "~NODE-RELATION-EDIT.VARIABLE_FLOW_TARGET_B",
        { sourceTitle: spanWrap sourceTitle, 'source' }

    else
      line_a = tr "~NODE-RELATION-EDIT.VARIABLE_FLOW_SOURCE_A",
        { sourceTitle: spanWrap sourceTitle, 'source' }
      line_b = tr "~NODE-RELATION-EDIT.VARIABLE_FLOW_SOURCE_B",
        { targetTitle: spanWrap targetTitle, 'target' }

    if not @state.selectedTransferModifier
      options.unshift (option {key: "placeholder", value: "unselected", disabled: "disabled"},
        tr "~NODE-RELATION-EDIT.UNSELECTED")
      currentOption = "unselected"
    else
      currentOption = @state.selectedTransferModifier.id
    (div {className: 'top'},


      # note that localization will be a problem here due to the hard-coded order
      # of the elements and because we can't use the string-replacement capabilities
      # of the translate module since there is special formatting of node titles, etc.
      (span { dangerouslySetInnerHTML: {__html: line_a} })
      (select {value: currentOption, ref: "transfer", onChange: @updateRelation},
        options
      )
      (span { dangerouslySetInnerHTML: {__html: line_b} })
      (span {}, "#{@state.stepUnits.toLowerCase()}.")
    )

  renderNonAccumulator: (source, target) ->
    (div {},
      (div {className: 'top'},
        (QuantStart {source: source, target: target})
        (div {className: 'full'},
          @renderVectorPulldown(@state.selectedVector)
        )
        (div {className: 'full'},
          @renderScalarPulldown(@state.selectedScalar)
        )
      )
      (div {className: 'bottom'},
        (div {className: 'graph', id:'relation-graph'},
          (Graph
            xAxis: source
            yAxis: target
            link: @props.link
            graphStore: @props.graphStore
          )
        )
      )
    )

  render: ->
    source = @props.link.sourceNode.title
    target = @props.link.targetNode.title

    (div {className: 'link-relation-view'},
      if @state.isAccumulator
        @renderAccumulator(source, target)
      else if @state.isTransferModifier
        target = @props.link.targetNode?.transferLink?.targetNode?.title
        isTargetProportional = @props.link.sourceNode == @props.link.targetNode?.transferLink?.targetNode
        @renderTransfer(source, target, isTargetProportional)
      else
        @renderNonAccumulator(source, target)
      (div {className: 'bottom'},
        (div {},
          (span {}, "#{tr "~NODE-RELATION-EDIT.BECAUSE"} ")
        )
        (textarea
          defaultValue: @props.link.reasoning
          placeholder: tr "~NODE-RELATION-EDIT.BECAUSE_PLACEHOLDER"
          onChange: @updateReasoning
          ref: 'reasoning'
          className: 'full'
          rows: 3
          style: { overflowY: "scroll", resize: "none"}
        )
      )
    )



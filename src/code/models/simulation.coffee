# transfer values are scaled if they have no modifier and
# their source is an independent node (has no inputs)
isScaledTransferNode = (node) ->
  return false unless node.isTransfer
  return false if node.inLinks('transfer-modifier').length
  sourceNode = node.transferLink?.sourceNode
  targetNode = node.transferLink?.targetNode
  not sourceNode?.inLinks().length and not (targetNode?.inLinks().length > 1)

isUnscaledTransferNode = (node) ->
  node.isTransfer and not isScaledTransferNode(node)

scaleInput = (val, nodeIn, nodeOut) ->
  if (nodeIn.valueDefinedSemiQuantitatively isnt nodeOut.valueDefinedSemiQuantitatively)
    if (nodeIn.valueDefinedSemiQuantitatively)
      return nodeOut.mapSemiquantToQuant val
    else
      return nodeIn.mapQuantToSemiquant val
  else
    return val

combineInputs = (inValues, useScaledProduct) ->
  return null if not inValues?.length
  return inValues[0] if inValues.length is 1

  if useScaledProduct
    # scaled product is computed as (n1 * n2 * ...) / 100^(n-1)
    numerator = _.reduce(inValues, ((prod, value) -> prod * value), 1)
    denominator = Math.pow(100, inValues.length - 1)
  else
    # simple arithmetic mean
    numerator = _.reduce(inValues, ((sum, value) -> sum + value), 0)
    denominator = inValues.length

  numerator / denominator

getTransferLimit = (transferNode) ->
  {sourceNode} = transferNode?.transferLink
  if sourceNode then sourceNode.previousValue ? sourceNode.initialValue else 0

filterFinalValue = (value) ->
  # limit max value
  value = if @capNodeValues then Math.min(@max, value) else value
  # limit min value
  shouldLimitMinValue = @capNodeValues or (@isAccumulator and not @allowNegativeValues)
  if shouldLimitMinValue then Math.max(@min, value) else value

RangeIntegrationFunction = (incrementAccumulators) ->

  # if we've already calculated a currentValue for ourselves this step, return it
  return @currentValue if @currentValue?

  # if we have no incoming links, we always remain our previous or initial value
  # collectors aren't calculated in this phase, but they do capture initial/previous values
  startValue = @previousValue ? @initialValue
  return startValue if @isAccumulator and not incrementAccumulators

  # regular nodes and flow nodes only have 'range' and 'transfer-modifier' links
  links = @inLinks('range').concat(@inLinks('transfer-modifier'))

  inValues = []
  _.each links, (link) =>
    return unless link.relation.isDefined
    sourceNode = link.sourceNode
    inV = sourceNode.previousValue ? sourceNode.initialValue
    inV = scaleInput(inV, sourceNode, this)
    outV = startValue
    inValues.push link.relation.evaluate(inV, outV, link.sourceNode.max, @max)

  # if the user has explicitly set the combination method, we use that
  # otherwise, if any link points to a collector, it should use the scaled product
  useScaledProduct = if @combineMethod? then @combineMethod is 'product' \
                      else @isTransfer or !!(_.find @outLinks(), (link) -> link.targetNode.isAccumulator)
  value = if inValues.length then combineInputs(inValues, useScaledProduct) else startValue

  # can't transfer more than is present in source
  if @capNodeValues and isUnscaledTransferNode(@)
    value = Math.min(value, getTransferLimit(@))

  # if we need to cap, do it at end of all calculations
  value = @filterFinalValue value

  value

# Sets the value of node.initialValue before the simulations starts. If there
# are inbound `initial-value` links, we request the initial values of the
# source nodes (no calculations needed) and average them.
SetInitialAccumulatorValueFunction = ->
  initialValueLinks = @inLinks('initial-value')
  inValues = []
  _.each initialValueLinks, (link) ->
    return unless link.relation.isDefined
    sourceNode = link.sourceNode
    inValues.push sourceNode.initialValue
  if inValues.length
    @initialValue = combineInputs(inValues)

SetAccumulatorValueFunction = (nodeValues) ->
  # collectors only have accumulator and transfer links
  links = @inLinks('accumulator').concat(@inLinks('transfer')).concat(@outLinks('transfer'))

  startValue = @previousValue ? @initialValue
  return startValue unless links.length > 0

  deltaValue = 0
  for link in links
    {sourceNode, targetNode, relation, transferNode} = link
    inV = nodeValues[sourceNode.key]
    outV = startValue
    switch relation.type
      when 'accumulator'
        deltaValue += relation.evaluate(inV, outV, sourceNode.max, @max) / @accumulatorInputScale

      when 'transfer'
        transferValue = nodeValues[transferNode.key]
        
        # can't overdraw non-negative collectors
        if @capNodeValues or (sourceNode.isAccumulator and not sourceNode.allowNegativeValues)
          transferValue = Math.min(transferValue, getTransferLimit(transferNode))

        if sourceNode is @
          deltaValue -= transferValue
        else if targetNode is @
          deltaValue += transferValue

  # accumulators hold their values in previousValue which is confusing
  # (this done because the accumulator values is only computed on the first of the 20 loops in RangeIntegrationFunction)
  # TODO: possibly change RangeIntegrationFunction function to make this more clear
  @currentValue = @filterFinalValue startValue + deltaValue

module.exports = class Simulation

  constructor: (@opts={}) ->
    @nodes          = @opts.nodes      or []
    @duration       = @opts.duration   or 10
    @capNodeValues  = @opts.capNodeValues or false
    @decorateNodes() # extend nodes with integration methods

    @onStart     = @opts.onStart or (nodeNames) ->
      log.info "simulation stated: #{nodeNames}"

    @onFrames    = @opts.onFrames or (frames) ->
      log.info "simulation frames: #{frames}"

    @onEnd       = @opts.onEnd or ->
      log.info "simulation end"

    @recalculateDesiredSteps = false
    @stopRun = false

  decorateNodes: ->
    _.each @nodes, (node) =>
      # make this a local node property (it may eventually be different per node)
      node.capNodeValues = @capNodeValues
      node.filterFinalValue = filterFinalValue.bind(node)
      node._cumulativeValue = 0  # for averaging
      # Create a bound method on this node.
      # Put the functionality here rather than in the class "Node".
      # Keep all the logic for integration here in one file for clarity.
      node.getCurrentValue = RangeIntegrationFunction.bind(node)
      node.setAccumulatorValue = SetAccumulatorValueFunction.bind(node)
      node.setInitialAccumulatorValue = SetInitialAccumulatorValueFunction.bind(node)

  initializeValues: (node) ->
    node.currentValue = null
    node.previousValue = null

  nextStep: (node) ->
    node.previousValue = node.currentValue
    node.currentValue = null

  evaluateNode: (node, firstTime) ->
    node.currentValue = node.getCurrentValue(firstTime)

  # create an object representation of the current timeStep and add
  # it to the current bundle of frames.
  generateFrame: (time) ->
    nodes = _.map @nodes, (node) ->
      title: node.title
      value: node.currentValue
    frame =
      time: time
      nodes: nodes

    @framesBundle.push frame

  stop: ->
    @stopRun = true


  run: ->
    @stopRun = false
    time = 0
    @framesBundle = []
    _.each @nodes, (node) => @initializeValues node

    nodeNames = _.pluck @nodes, 'title'
    @onStart(nodeNames)

    # For each step, we run the simulation many times, and then average the final few results.
    # We first run the simulation 10 times. This has the effect of "pushing" a value from
    # a parent node all the way down to all the descendants, while still allowing a simple
    # integration function on each node that only pulls values from immediate parents.
    # Note that this "pushing" may not do anything of value in a closed loop, as the values
    # will simply move around the circle.
    # We then run the simulation an additional 20 times, and average the 20 results to
    # obtain a final value.
    # The number "20" used is arbitrary, but large enough not to affect loops that we expect
    # to see in Sage. In any loop, if the number of nodes in the loop and the number of times
    # we iterate are not divisible by each other, we'll see imbalances, but the effect of the
    # imbalance is smaller the more times we loop around.

    # Changes to accomodate data flows:
    #
    # There are now three types of nodes: normal, collector, and transfer and four types of links:
    # range, accumulator, transfer and transfer-modifier.  Transfer nodes are created automatically
    # between two accumulator nodes when the link type is set to transfer and are automatically
    # removed if the link is changed away from transfer or either of the nodes in the link
    # is changed from not being an accumulator.  Range links are the type of the original links -
    # they are pure functions that transmit a value from a source (domain) to a target (range) node
    # and are the only links evaluated during the 20 step cumulative value calculation.
    # Once each node's cumulative value is obtained and then averaged across the nodes, the accumulator
    # values are updated by checking the accumulator and transfer links into any accumulator node.
    # The transfer links values are then modified by the transfer-modifier links which are links
    # from the source node of a transfer link to the transfer node of the transfer link.

    nodeValues = {}
    collectorNodes = _.filter @nodes, (node) -> node.isAccumulator

    # before the first step, set the initial values of all aqccumulators,
    # in case they are linked with `initial-value` relationships
    _.each collectorNodes, (node) -> node.setInitialAccumulatorValue()

    step = =>

      # update the accumulator/collector values on all but the first step
      if time isnt 0
        _.each collectorNodes, (node) -> node.setAccumulatorValue nodeValues

      # push values down chain
      for i in [0...10]
        _.each @nodes, (node) => @nextStep node  # toggles previous / current val.
        _.each @nodes, (node) => @evaluateNode node, i is 0

      # accumulate values for later averaging
      for i in [0...20]
        _.each @nodes, (node) => @nextStep node
        _.each @nodes, (node) => node._cumulativeValue += @evaluateNode node

      # calculate average and capture the instantaneous node values
      _.each @nodes, (node) ->
        nodeValues[node.key] = node.currentValue = node._cumulativeValue / 20
        node._cumulativeValue = 0

      # output before collectors are updated
      @generateFrame(time++)

    # simulate each step
    while time < @duration
      step()

    @onFrames(@framesBundle)    # send all at once
    @onEnd()


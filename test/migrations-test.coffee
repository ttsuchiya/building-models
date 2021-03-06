Migrations     = require "../src/code/data/migrations/migrations"
TimeUnits      = require "../src/code/utils/time-units"
originalData   = require "./serialized-test-data/v-0.1"

chai   = require('chai')
should = require('chai').should()
expect = chai.expect


describe.only "Migrations",  ->
  describe "update", ->
    beforeEach ->
      @result = Migrations.update(originalData)

    describe "the final version number", ->
      it "should be 1.22.0", ->
        @result.version.should.equal "1.22.0"

    describe "the nodes", ->
      it "should have two nodes", ->
        @result.nodes.length.should.equal 2

      it "should have key: and data: attributes", ->
        for node in @result.nodes
          node.key.should.exist
          node.data.should.exist

    describe "the palette", ->
      it "should exist", ->
        @result.palette.should.exist
      it "should include a blank node", ->
        blank = _.find @result.palette, (pitem) ->
          pitem.key is "img/nodes/blank.png"
        blank.should.exist

    describe "the links", ->
      it "should have one link", ->
        @result.links.length.should.equal 1

    describe "v-1.1 changes", ->
      it "should have initial node values", ->
        for node in @result.nodes
          node.data.initialValue.should.exist
          node.data.isAccumulator.should.exist
          node.data.isAccumulator.should.equal false

      it "should have valid relationship values", ->
        for link in @result.links
          link.relation.should.exist
          expect(link.relation.text).to.be.undefined
          expect(link.relation.formula).to.be.undefined

    describe "v-1.2 node changes", ->
      it "should have initial node values", ->
        for node in @result.nodes
          node.data.valueDefinedSemiQuantitatively.should.exist
          node.data.valueDefinedSemiQuantitatively.should.equal true

    describe "v-1.3 node changes", ->
      it "should have initial node values", ->
        for node in @result.nodes
          node.data.min.should.equal 0
          node.data.max.should.equal 100

    describe "v-1.4 changes", ->
      it "should have settings and cap value", ->
        # Removed or changed in 1.9:
        # @result.settings.capNodeValues.should.equal false

    describe "v-1.5 changes", ->
      it "should have images and paletteItems for nodes", ->
        for node in @result.nodes
          node.data.image.should.not.be.null
          node.data.paletteItem.should.not.be.null

      it "paletteItems should have a uuid", ->
        for paletteItem in @result.palette
          paletteItem.uuid.should.not.be.null

    # Removed in 1.19
    # describe "v-1.6 changes", ->
    #   it "should have diagramOnly setting", ->
    #     @result.settings.diagramOnly.should.equal false

    describe "v-1.7 changes", ->
      it "should have settings for the simulation", ->
        @result.settings.simulation.should.exist
        # Removed or changed in 1.8:
        # @result.settings.simulation.period.should.equal 10
        # @result.settings.simulation.stepSize.should.equal 1
        # @result.settings.simulation.periodUnits.should.equal "YEAR"
        # @result.settings.simulation.stepUnits.should.equal "YEAR"

    describe "v-1.8 changes", ->
      it "should have settings for the simulation", ->
        @result.settings.simulation.duration.should.equal 10
        @result.settings.simulation.stepUnits.should.equal TimeUnits.defaultUnit

#    describe "v-1.9 changes", ->
#      it "should have speed setting", ->
#        @result.settings.simulation.speed.should.equal 4

    # Removed in 1.13
    # describe "v-1.10 changes", ->
    #   it "should have newIntegration setting", ->
    #     @result.settings.simulation.newIntegration.should.equal false

    describe "v-1.11.0 changes", ->
      it "should have minigraphs setting", ->
        @result.settings.showMinigraphs.should.equal false

    describe "v-1.12.0 changes", ->
      it "should have frames array", ->
        for node in @result.nodes
          node.data.frames.should.exist

    describe "v-1.15.0 changes", ->
      it "should have link reasoning", ->
        for link in @result.links
          link.reasoning.should.exist

    describe "v-1.16.0 changes", ->
      it "should not have simulation speed settings", ->
        speed = @result.settings.simulation.speed
        should.equal(speed, undefined)

    ## removed in 1.20.0
    # describe "v-1.17.0 changes", ->
    #   it "should have experiment number and frame", ->
    #     experiment = @result.settings.simulation.experimentNumber
    #     frame = @result.settings.simulation.experimentFrame
    #     should.equal(experiment, 0)
    #     should.equal(frame, 0)

    describe "v-1.18.0 changes", ->
      it "should have link relation type", ->
        for link in @result.links
          link.relation.type.should.exist

    ## removed in 1.22.0
    # describe "v-1.19.0 changes", ->
    #   it "should have complexity setting", ->
    #     @result.settings.complexity.should.equal 3

    describe "v-1.22.0 changes", ->
      it "should have complexity and simulation settings", ->
        @result.settings.simulationType.should.equal 1
        @result.settings.complexity.should.equal 1


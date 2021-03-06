global._   = require 'lodash'
global.log = require 'loglevel'

chai = require('chai')
chai.config.includeStack = true

expect         = chai.expect
should         = chai.should()
Sinon          = require('sinon')

requireModel = (name) -> require "#{__dirname}/../src/code/models/#{name}"

Relationship = requireModel("relationship")

describe "relationship", ->
  it "should exists", ->
    Relationship.should.exist

  describe "the constructor", ->
    beforeEach ->
      @arguments = {}
    describe "using the defaults", ->
      it "should make an undefined relationship", ->
        undertest = new Relationship(@arguments)
        undertest.isDefined.should.equal false
        expect(undertest.text).to.be.undefined
        expect(undertest.formula).to.be.undefined

  describe "evaluate", ->
    describe "a simple formula", ->
      beforeEach ->
        @inFormula = "2 * in ^ 2 + out"
        @arguments = {formula: @inFormula}
        @undertest = new Relationship(@arguments)

      it "should be defined", ->
        @undertest.isDefined.should.equal true

      it "should do the math correctly", ->
        @undertest.evaluate(2,2).should.equal 10
        @undertest.evaluate(2,1).should.equal 9
        @undertest.evaluate(1,1).should.equal 3

      it "should not have errors", ->
        @undertest.hasError.should.be.false

    describe "a formula with an error", ->
      beforeEach ->
        @inFormula = "x +-+- 2 * in ^ 2"
        @arguments = {formula: @inFormula}
        @undertest = new Relationship(@arguments)

      it "should return a magic error number", ->
        @undertest.evaluate(2,2).should.equal Relationship.errValue

      it "should indicate an error", ->
        @undertest.hasError.should.be.true

    describe "a custom relationship", ->
      beforeEach ->
        @customData = [[0,5],[1,16],[2,11],[3,16]]
        @arguments = {customData: @customData}
        @undertest = new Relationship(@arguments)

      it "should retrieve a point via lookup", ->
        @undertest.evaluate(3,0).should.equal 16

      it "should handle out-of-range lookups", ->
        @undertest.evaluate(5,0).should.equal 0

      it "should handle non-integer lookups via rounding", ->
        @undertest.evaluate(2.9,0).should.equal 16
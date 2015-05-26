AppView     = React.createFactory require './views/app-view'
LinkManager = require './models/link-manager'
CodapConnect = require './utils/codap-connect'

getParameterByName = (name) ->
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
  regex = new RegExp "[#&]#{name}=([^&]*)"
  results = regex.exec(location.hash)
  if results is null then "" else decodeURIComponent results[1].replace(/\+/g, ' ')

window.initApp = (wireframes=false) ->
  opts =
    url: 'json/serialized.json'
    linkManager: LinkManager.instance 'building-models'
    data: getParameterByName 'data'
  appView = AppView opts
  elem = '#app'
  codapConnect = new CodapConnect
  codapConnect.init()
  jsPlumb.bind 'ready', ->
    React.render appView, $(elem)[0]

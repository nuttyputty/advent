'use strict'

const EventEmitter = require('events')
const isObject = require('lodash.isplainobject')
const createEngine = require('@nuttyputty/advent-memory')
const uuid = require('uuid').v4
const createEntity = require('./entity')

class Emitter extends EventEmitter {}

const isFunction = fn => typeof fn === 'function'

const createStore = (decider, reducer, options = {}) => {
  if (!isFunction(decider)) {
    throw new TypeError('Decider must be a function.')
  } else if (!isFunction(reducer)) {
    throw new TypeError('Reducer must be a function.')
  }

  const name = options.entity || ''
  const engine = options.engine || createEngine()
  const emitter = options.emitter || new Emitter()
  const entity = createEntity({ ...options, decider, reducer, engine, emitter })

  const toCommand = (id, command) => {
    if (!isObject(command)) {
      throw new TypeError('Command must be a plain object.')
    } else if (typeof command.type !== 'string') {
      throw new TypeError('Command must have a valid type.')
    } else if (typeof command.payload === 'undefined') {
      throw new TypeError('Command must have a payload.')
    }

    const { type, user = {}, meta = {}, online = [], payload } = command
    return { type, user, meta, online, payload, id: uuid(), ts: Date.now(), entity: { name, id } }
  }

  const send = async (id, data) => {
    if (Array.isArray(data)) {
      let state
      for (const cmd of data) {
        state = await send(id, cmd)
      }

      return state
    }

    return entity(id).execute(toCommand(id, data))
  }

  const get = id => {
    let unbind
    const subscribe = (type, fn) => {
      if (isFunction(type)) {
        fn = type
        type = null
      }

      unbind = listen(id, (event, ...args) => {
        if (!type || type === event.type) fn(event, ...args)
      })
    }


    const setState = state => entity(id).setState(state)
    const getState = () => entity(id).getState()
    const clearState = () => {
      if(unbind)unbind()
      entity(id).clear()
    }

    const dispatch = cmd => send(id, cmd)
    return { subscribe, getState, setState, clearState, dispatch }
  }

  const clear = () => entity.clear()
  const dispatch = (...args) => send(...args)

  const listen = (type, fn) => {
    if (isFunction(type)) {
      fn = type
      type = '*'
    }

    emitter.on(type, fn)
    return () => emitter.off(type, fn)
  }

  return { get, clear, dispatch, subscribe: listen }
}

const packer = (type, fn, options = {}) => {
  if (isObject(fn)) {
    options = fn
    fn = undefined
  }

  fn = isFunction(fn) ? fn : f => f

  return (...args) => {
    let data = fn(...args)

    if (isObject(data)) {
      let { user, online, meta, entity,  ...payload } = data
      user = user || options.user
      meta = meta || options.meta
      entity = entity || options.entity
      online = online || []
      data = { user, meta, entity, online, payload }
    } else {
      data = { payload: data }
    }

    return { ...options, ...data, type }
  }
}

module.exports = {
  createStore,
  createEvent: packer,
  createCommand: packer
}

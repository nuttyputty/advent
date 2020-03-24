'use strict'

const isObject = require('lodash.isplainobject')
const uuid = require('uuid').v4
const update = require('./update')

module.exports = ({ engine, decider, reducer, emitter }) => {
  const cache = {}

  const getEntity = id => {
    let state
    let loaded = false

    const clear = () => {
      loaded = false
      state = undefined
      delete cache[id]
      return id
    }

    const load = async reload => {
      if (reload) clear()
      if (loaded) return state
      const { snap } = await engine.load(id)
      state = snap
      loaded = true
      return state
    }

    const reduce = (events = [], command, silent, snap) => {
     return events.reduce((oldState, event) => {
        state = update(oldState, reducer(oldState, event))
        state.id = id
        state.version = state.version || 0
        state.revision = event.revision || 0
        if (silent) return state
        const change = { command, oldState, newState: state }
        ;['*', id, event.type].forEach(type => emitter.emit(type, event, change))
        return state
      }, snap || state)
    }

    const commit = async (events = []) => {
      state = clone({ ...state, version: state.revision-1 })
      await engine.save([...events], state)
      return events
    }

    const run = async command => {
      const { user, meta, entity, online } = command
      let events = await decider(await load(), command)
      events = events || []
      events = Array.isArray(events) ? events : [events]
      events = events.map(event => toEvent({ ...command, ...event, user, meta, entity, online }))
      if(events.length > 0){
        await reduce(events, command)
        await commit(events)
      }
    }

    const execute = async command => {
      await run(command)
      return state
    }

    const clone = data => {
      return JSON.parse(JSON.stringify(data))
    }

    const getState = async () => {
      if(!loaded)
        state = await load()
      return state
    }

    const setState = newState => {
      state = newState
    }

    const toEvent = event => {
      if (!isObject(event)) {
        throw new TypeError('Event must be a plain object.')
      } else if (!event.type || typeof event.type !== 'string') {
        throw new TypeError('Event must have a valid type.')
      } else if (typeof event.payload === 'undefined') {
        throw new TypeError('Event must have a payload.')
      }

      return { ...event, id: uuid(), cid: event.id, ts: Date.now() }
    }

    return { clear, execute, commit, getState, setState }
  }

  return id => (cache[id] = cache[id] || getEntity(id))
}

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

    const reduce = (events = [], command, silent) => {
      return events.reduce((changes, event) => {
        const oldState = {...state}
        const reduction = reducer(oldState, event)
        state = update(oldState, reduction)
        changes = {...changes, ...reduction}
        state.id = id
        if (silent) return changes
        const change = { command, oldState, newState: {...state} }
        ;['*', id, event.type].forEach(type => emitter.emit(type, event, change))
        return changes
      }, {id})
    }

    const commit = async (events = [], changes) => {
      await engine.save([...events], changes)
      return events
    }

    const run = async command => {
      const { user, meta, entity, online } = command
      let events = await decider(await load(), command)
      events = events || []
      events = Array.isArray(events) ? events : [events]
      events = events.map(event => toEvent({ ...command, ...event, user, meta, entity, online }))
      if(events.length > 0){
        const changes = await reduce(events, command)
        await commit(events, changes)
      }
    }

    const execute = async command => {
      await run(command)
      return state
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

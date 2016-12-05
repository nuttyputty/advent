import 'babel-polyfill'
import { createStore } from '../../src/index'
import { increment, decrement } from './constants'
import commandReducer from './commands'
import eventReducer from './events'

const noop = () => {}

// Creating store
const store = createStore(commandReducer, eventReducer)

// Subscribing to store events
store.subscribe((e, data) => {
  console.log('event:', data)
})

// Executing commands
store(increment({id: 123, count: 110}))
store(increment({id: 123, count: 200}))
store(increment({id: 123, count: 100}))

// Delayed command
setTimeout(() => {
  store(decrement({id: 123, count: 10}))
}, 500)

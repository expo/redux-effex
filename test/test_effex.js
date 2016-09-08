import expect from 'expect'
import {effectsMiddleware} from '../src/index.js'
import configureStore from 'redux-mock-store'

const effects = [
  {
    action: 'good-action',
    async effect({action, dispatch, getState}) {
      await Promise.resolve()
      return dispatch({
        type: 'success', payload: {actionPayload: action.payload, state: getState()}
      })
    }
  },
  {
    action: 'async-action',
    async effect({dispatch, nextDispatchAsync}) {
      await Promise.resolve()
      let nextAction = await nextDispatchAsync('next-action')
      return dispatch({
        type: 'success', payload: nextAction.payload
      })
    }
  },
  {
    action: 'failure',
    async effect() {
      await Promise.reject(new Error('fail'))
    },
    async error ({action, dispatch, getState, nextDispatchAsync, error}) {
      console.log('Handling Error')
      let nextAction = await nextDispatchAsync('next-action')
      console.log('Received next action')
      return dispatch({
        type: 'success', payload: {error: error.message, state: getState()}
      })
    }
  }
]

const mockStore = configureStore([effectsMiddleware(effects)])

describe('redux-effex', function () {
  beforeEach(function () {
    this.store = mockStore('state')
  })
  it('should call effects', async function () {
    await this.store.dispatch({type: 'good-action', payload: 'payload'})
    expect(this.store.getActions()).toEqual([
      {type: 'good-action', payload: 'payload'},
      {type: 'success', payload: {actionPayload: 'payload', state: 'state'}}
    ])
  })
  it('should allow effects to wait for actions', async function () {
    await this.store.dispatch({type: 'async-action'})
    await Promise.resolve() // Wait for event loop to clear
    await this.store.dispatch({type: 'next-action', payload: 'payload'})
    await Promise.resolve() // Wait for event loop to clear
    expect(this.store.getActions()).toEqual([
      {type: 'async-action'},
      {type: 'next-action', payload: 'payload'},
      {type: 'success', payload: 'payload'}
    ])
  })
  it('should send errors to the error handler', async function () {
    await this.store.dispatch({type: 'failure'})
    await Promise.resolve() // Wait for event loop to clear
    await this.store.dispatch({type: 'next-action'})
    await Promise.resolve() // Wait for event loop to clear
    console.log('Checking')
    expect(this.store.getActions()).toEqual([
      {type: 'failure'},
      {type: 'next-action'},
      {type: 'success', payload: {error: 'fail', state: 'state'}}
    ])
  })
})

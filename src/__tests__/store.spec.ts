import { describe, it, expect } from 'vitest'
import store from '../store'

describe('move', () => {
  it('inserts before the target, both directions', () => {
    store.state.items = ['a', 'b', 'c', 'd'].map((id) => ({ id }) as never)
    const ids = () => store.state.items.map((i) => i.id).join('')
    store.commit('move', { from: 0, to: 2 })
    expect(ids()).toBe('bacd')
    store.commit('move', { from: 3, to: 0 })
    expect(ids()).toBe('dbac')
    store.commit('move', { from: 1, to: 4 }) // past the end = append
    expect(ids()).toBe('dacb')
  })
})

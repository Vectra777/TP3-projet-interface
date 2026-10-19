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

describe('accounts', () => {
  it('keeps one library per user and checks passwords', async () => {
    localStorage.clear()
    await store.dispatch('register', { name: 'alice', password: 'secret' })
    await store.dispatch('addItem', { id: '1', title: 'Interstellar', year: '2014', poster: '', director: 'Christopher Nolan' })
    await store.dispatch('logout')
    expect(store.state.items).toEqual([])

    await expect(store.dispatch('register', { name: 'Alice', password: 'x' })).rejects.toThrow('taken')
    await store.dispatch('register', { name: 'bob', password: 'hunter2' })
    expect(store.state.items).toEqual([])

    await expect(store.dispatch('login', { name: 'alice', password: 'wrong' })).rejects.toThrow('Wrong username or password')
    await store.dispatch('login', { name: 'alice', password: 'secret' })
    expect(store.state.items.map((i) => i.title)).toEqual(['Interstellar'])
    expect(localStorage.getItem('users')).not.toContain('secret')
  })
})

describe('view', () => {
  it('searches, filters and sorts without touching the stored order', () => {
    store.state.items = [
      { id: 'a', title: 'Tenet', director: 'Christopher Nolan', year: '2020', addedAt: 1, watched: true, favorite: false },
      { id: 'b', title: 'Alien', director: 'Ridley Scott', year: '1979', addedAt: 3, watched: false, favorite: true },
      { id: 'c', title: 'Inception', director: 'Christopher Nolan', year: '2010', addedAt: 2, watched: false, favorite: false },
    ] as never
    const ids = (v: object) =>
      store.getters.view({ query: '', show: 'all', sort: 'custom', ...v }).map((i: { id: string }) => i.id).join('')
    expect(ids({})).toBe('abc')
    expect(ids({ sort: 'title' })).toBe('bca')
    expect(ids({ sort: 'year' })).toBe('acb')
    expect(ids({ sort: 'added' })).toBe('bca')
    expect(ids({ query: ' nolan ' })).toBe('ac')
    expect(ids({ show: 'unwatched', sort: 'title' })).toBe('bc')
    expect(ids({ show: 'favorites' })).toBe('b')
    expect(store.state.items.map((i) => i.id).join('')).toBe('abc')
  })
})

describe('favorites and stats', () => {
  it('counts watched, favorites and averages only rated items', () => {
    store.state.items = [
      { id: 'a', watched: true, favorite: true, rating: 4 },
      { id: 'b', watched: true, favorite: false, rating: 2 },
      { id: 'c', watched: false, favorite: false, rating: null },
    ] as never
    store.dispatch('toggleFavorite', 'c')
    expect(store.getters.favorites.map((i: { id: string }) => i.id)).toEqual(['a', 'c'])
    expect(store.getters.stats).toEqual({
      total: 3,
      watched: 2,
      remaining: 1,
      favorites: 2,
      averageRating: 3,
    })
  })
})

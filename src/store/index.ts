import { createStore, type ActionContext } from 'vuex'

export interface Item {
  id: string
  title: string
  year: string
  poster: string
  director: string
  watched: boolean
  favorite: boolean
  addedAt: number
  rating: number | null
  review: string
}

// each user gets their own library under `library:<name>`; `library` is the pre-accounts one
const LEGACY_KEY = 'library'
const USERS_KEY = 'users'
const SESSION_KEY = 'currentUser'
const libraryKey = (user: string) => `library:${user}`

interface User {
  name: string
  passwordHash: string
}
interface State {
  user: string | null
  items: Item[]
}
type Context = ActionContext<State, State>
type Credentials = { name: string; password: string }

// a corrupted value must not crash the whole app at startup
function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

// accounts only live in this browser: hashing just avoids keeping passwords in clear text
async function hash({ name, password }: Credentials) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${name}:${password}`))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

const initialUser = localStorage.getItem(SESSION_KEY)

const store = createStore<State>({
  state: () => ({
    user: initialUser,
    items: initialUser ? load(libraryKey(initialUser), []) : [],
  }),
  getters: {
    favorites: (s) => s.items.filter((i) => i.favorite),
    has: (s) => (id: string) => s.items.some((i) => i.id === id),
    stats: (s) => {
      const watched = s.items.filter((i) => i.watched).length
      const rated = s.items.filter((i) => i.rating !== null)
      return {
        total: s.items.length,
        watched,
        remaining: s.items.length - watched,
        favorites: s.items.filter((i) => i.favorite).length,
        averageRating: rated.length
          ? rated.reduce((sum, i) => sum + i.rating!, 0) / rated.length
          : null,
      }
    },
  },
  mutations: {
    setUser: (s, user: string | null) => {
      s.user = user
      s.items = user ? load(libraryKey(user), []) : []
    },
    add:(s, item: Item) => void s.items.push(item),
    remove: (s, id: string) => void (s.items = s.items.filter((i) => i.id !== id)),
    toggleWatched: (s, id: string) => {
      const i = s.items.find((i) => i.id === id)
      if (i) i.watched = !i.watched
    },
    setReview: (
      s,
      { id, ...patch }: Pick<Item, 'id'> & Partial<Pick<Item, 'rating' | 'review'>>,
    ) => {
      const i = s.items.find((i) => i.id === id)
      if (i) Object.assign(i, patch)
    },
    // insert the item at index `from` before the item currently at index `to`
    move: (s, { from, to }: { from: number; to: number }) => {
      const [item] = s.items.splice(from, 1)
      s.items.splice(to > from ? to - 1 : to, 0, item!)
    },
    toggleFavorite: (s, id: string) => {
      const i = s.items.find((i) => i.id === id)
      if (i) i.favorite = !i.favorite
    },
  },
  actions: {
    addItem(
      { commit, getters }: Context,
      item: Omit<Item, 'watched' | 'favorite' | 'addedAt' | 'rating' | 'review'>,
    ) {
      if (!getters.has(item.id))
        commit('add', {
          ...item,
          watched: false,
          favorite: false,
          addedAt: Date.now(),
          rating: null,
          review: '',
        })
    },
    removeItem: ({ commit }: Context, id: string) => commit('remove', id),
    toggleWatched: ({ commit }: Context, id: string) => commit('toggleWatched', id),
    toggleFavorite: ({ commit }: Context, id: string) => commit('toggleFavorite', id),

    async register({ commit }: Context, { name, password }: Credentials) {
      name = name.trim()
      const users = load<User[]>(USERS_KEY, [])
      if (users.some((u) => u.name.toLowerCase() === name.toLowerCase()))
        throw new Error('This username is already taken.')
      users.push({ name, passwordHash: await hash({ name, password }) })
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
      // the first account inherits the library saved before accounts existed
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (users.length === 1 && legacy) {
        localStorage.setItem(libraryKey(name), legacy)
        localStorage.removeItem(LEGACY_KEY)
      }
      commit('setUser', name)
    },
    async login({ commit }: Context, { name, password }: Credentials) {
      const user = load<User[]>(USERS_KEY, []).find(
        (u) => u.name.toLowerCase() === name.trim().toLowerCase(),
      )
      if (!user || user.passwordHash !== (await hash({ name: user.name, password })))
        throw new Error('Wrong username or password.')
      commit('setUser', user.name)
    },
    logout: ({ commit }: Context) => commit('setUser', null),
  },
})

store.subscribe((_, s) => {
  if (s.user) {
    localStorage.setItem(SESSION_KEY, s.user)
    localStorage.setItem(libraryKey(s.user), JSON.stringify(s.items))
  } else localStorage.removeItem(SESSION_KEY)
})

export default store

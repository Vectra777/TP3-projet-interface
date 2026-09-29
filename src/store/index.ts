import { createStore, type ActionContext } from 'vuex'

export interface Item {
  id: string
  title: string
  year: string
  poster: string
  watched: boolean
  favorite: boolean
  addedAt: number
}

const KEY = 'library'
interface State {
  items: Item[]
}

const store = createStore<State>({
  state: () => ({
    items: JSON.parse(localStorage.getItem(KEY) ?? '[]') as Item[],
  }),
  getters: {
    favorites: (s) => s.items.filter((i) => i.favorite),
    has: (s) => (id: string) => s.items.some((i) => i.id === id),
  },
  mutations: {
    add: (s, item: Item) => void s.items.push(item),
    remove: (s, id: string) => void (s.items = s.items.filter((i) => i.id !== id)),
    toggleWatched: (s, id: string) => {
      const i = s.items.find((i) => i.id === id)
      if (i) i.watched = !i.watched
    },
    toggleFavorite: (s, id: string) => {
      const i = s.items.find((i) => i.id === id)
      if (i) i.favorite = !i.favorite
    },
  },
  actions: {
    addItem({ commit, getters }: ActionContext<State, State>, item: Omit<Item, 'watched' | 'favorite' | 'addedAt'>) {
      if (!getters.has(item.id)) commit('add', { ...item, watched: false, favorite: false, addedAt: Date.now() })
    },
  },
})

store.subscribe((_, s) => localStorage.setItem(KEY, JSON.stringify(s.items)))

export default store

import { createStore, type ActionContext } from 'vuex'

export interface Item {
  id: string
  title: string
  year: string
  poster: string
  watched: boolean
  favorite: boolean
  addedAt: number
  rating: number | null
  review: string
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
      { commit, getters }: ActionContext<State, State>,
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
  },
})

store.subscribe((_, s) => localStorage.setItem(KEY, JSON.stringify(s.items)))

export default store

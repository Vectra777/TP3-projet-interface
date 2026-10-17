import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/', name: 'search', component: () => import('@/views/SearchView.vue') },
    { path: '/library', name: 'library', component: () => import('@/views/LibraryView.vue') },
    { path: '/favorites', name: 'favorites', component: () => import('@/views/FavoritesView.vue') },
    { path: '/movie/:id', name: 'movie', component: () => import('@/views/MovieView.vue') },
  ],
})

// every page but /login needs a signed-in user; come back to the asked page after signing in
router.beforeEach((to) => {
  const signedIn = !!store.state.user
  if (!signedIn && to.name !== 'login') return { name: 'login', query: { redirect: to.fullPath } }
  if (signedIn && to.name === 'login') return { name: 'search' }
})

export default router

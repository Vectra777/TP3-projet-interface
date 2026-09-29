import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'search', component: () => import('@/views/SearchView.vue') },
    { path: '/library', name: 'library', component: () => import('@/views/LibraryView.vue') },
    { path: '/favorites', name: 'favorites', component: () => import('@/views/FavoritesView.vue') },
    { path: '/movie/:id', name: 'movie', component: () => import('@/views/MovieView.vue') },
  ],
})

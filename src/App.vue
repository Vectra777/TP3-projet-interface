<script setup lang="ts"></script>

<template>
  <nav class="flex gap-4 border-b p-4">
    <RouterLink to="/">Search</RouterLink>
    <RouterLink to="/library">Library</RouterLink>
    <RouterLink to="/favorites">Favorites</RouterLink>
  </nav>
  <main class="mx-auto max-w-5xl p-4"><RouterView /></main>
</template>

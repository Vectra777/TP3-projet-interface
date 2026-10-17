<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { posterUrl } from '@/api/tmdb'
import type { Item } from '@/store'

const store = useStore()
const router = useRouter()

const PER_SHELF = 5
const shelves = computed(() => {
  const items: Item[] = store.state.items
  const rows = []
  for (let i = 0; i < items.length; i += PER_SHELF) rows.push(items.slice(i, i + PER_SHELF))
  return rows
})

// --- sounds: synthesized filtered noise, no audio files needed ---
let ctx: AudioContext | undefined
interface Noise {
  dur: number
  freq: number
  to?: number
  vol?: number
  at?: number
  attack?: number
}
function noise({ dur, freq, to = freq, vol = 0.3, at = 0, attack = 0.002 }: Noise) {
  if (!navigator.userActivation?.hasBeenActive) return // browsers block audio before the first click
  ctx ??= new AudioContext()
  const t = ctx.currentTime + at
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const filter = new BiquadFilterNode(ctx, { type: 'bandpass', Q: 1.5 })
  filter.frequency.setValueAtTime(freq, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + dur)
  const gain = new GainNode(ctx)
  gain.gain.setValueAtTime(0.001, t)
  gain.gain.linearRampToValueAtTime(vol, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  const src = new AudioBufferSourceNode(ctx, { buffer })
  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start(t)
}
const sfx = {
  tick: () => noise({ dur: 0.03, freq: 4000, vol: 0.05 }),
  pickup: () => (
    noise({ dur: 0.08, freq: 1800, vol: 0.4 }),
    noise({ dur: 0.15, freq: 180, vol: 0.6, at: 0.02 })
  ),
  drop: () => noise({ dur: 0.1, freq: 900, vol: 0.5 }),
  putBack: () => noise({ dur: 0.1, freq: 900, vol: 0.5, at: 0.35 }),
  // recorded sounds from /public; `from` skips the silence before the snap
  open: () => play(clips.open, 0.4),
  close: () => play(clips.close),
  release: () => play(clips.click),
  whoosh: () => noise({ dur: 1, freq: 300, to: 3000, vol: 0.25, attack: 0.35 }),
}

const clips = {
  open: new Audio('/freesound_community-opening-a-dvd-case-84628.mp3'),
  close: new Audio('/freesound_community-closing-a-dvd-case-84634.mp3'),
  click: new Audio('/creatorshome-digital-click-357350.mp3'),
}
function play(clip: HTMLAudioElement, from = 0) {
  clip.currentTime = from
  clip.play().catch(() => {}) // blocked before the first click, same as the synthesized ones
}

// --- rearrange: drag a case before another one, or onto a shelf's empty space to put it at the end ---
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)
function drop(to: number) {
  if (dragFrom.value !== null && dragFrom.value !== to) {
    store.commit('move', { from: dragFrom.value, to })
    sfx.drop()
  }
  dragFrom.value = dragOver.value = null
}

// --- pick up / open / transition ---
const selected = ref<Item | null>(null)
// idle -> front -> open -> disc -> transition; Esc/backdrop goes back: disc -> front -> returning -> idle
const phase = ref('idle')
const caseEl = ref<HTMLElement | null>(null)
let shelfEl: HTMLElement
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// FLIP: animate the big case from wherever its twin sits on the shelf
function fly(direction: PlaybackDirection) {
  const el = caseEl.value!
  const from = shelfEl.getBoundingClientRect()
  const to = el.getBoundingClientRect()
  const start = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}) rotate(-4deg)`
  return el.animate([{ transform: start }, { transform: 'none' }], {
    duration: reduceMotion ? 1 : 550,
    easing: 'cubic-bezier(.2,.8,.2,1)',
    direction,
    fill: 'both',
  }).finished
}

async function pick(item: Item, event: MouseEvent) {
  if (selected.value) return
  shelfEl = event.currentTarget as HTMLElement
  selected.value = item
  phase.value = 'front'
  sfx.pickup()
  await nextTick()
  fly('normal')
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, reduceMotion ? 0 : ms))

async function putBack() {
  if (phase.value === 'disc') {
    phase.value = 'open' // disc slides back in, then the cover closes
    sfx.release()
    await wait(700)
    phase.value = 'front'
    setTimeout(sfx.close, reduceMotion ? 0 : 550) // the recording's snap lands as the cover shuts
    await wait(850)
  }
  if (phase.value !== 'front') return
  phase.value = 'returning'
  sfx.putBack()
  await fly('reverse')
  selected.value = null
  phase.value = 'idle'
}

async function onCaseClick() {
  if (phase.value === 'disc') return startTransition()
  if (phase.value !== 'front') return
  phase.value = 'open'
  sfx.open()
  await wait(800)
  phase.value = 'disc' // disc slides out to the right, booklet shows the review
  sfx.release()
}

const goToMovie = () => router.push(`/movie/${selected.value!.id}`)

// its shelf twin is gone, so there is nowhere to fly back to: just close
function removeSelected() {
  const item = selected.value!
  if (!confirm(`Remove "${item.title}" from your library? Your review will be deleted.`)) return
  selected.value = null
  phase.value = 'idle'
  store.dispatch('removeItem', item.id)
}

const stats = computed(() => store.getters.stats)

// tiny squares sweep diagonally from top-left; odd diagonals lag behind, so it fills in as a checkerboard
const CELL = 40
const cols = ref(0)
const delays = ref<number[]>([])
function startTransition() {
  if (reduceMotion) return goToMovie()
  cols.value = Math.ceil(innerWidth / CELL)
  const rows = Math.ceil(innerHeight / CELL)
  const step = 600 / (cols.value + rows)
  delays.value = Array.from({ length: cols.value * rows }, (_, i) => {
    const diagonal = (i % cols.value) + Math.floor(i / cols.value)
    return diagonal * step + (diagonal % 2) * 180
  })
  phase.value = 'transition'
  sfx.whoosh()
  setTimeout(goToMovie, Math.max(...delays.value) + 300)
}

const onKey = (e: KeyboardEvent) => e.key === 'Escape' && putBack()
onMounted(() => addEventListener('keydown', onKey))
onUnmounted(() => removeEventListener('keydown', onKey))
</script>

<template>
  <h1 class="text-2xl font-bold">Library</h1>
  <p class="mb-6 text-sm text-gray-400">Drag the cases to rearrange your shelves.</p>

  <dl v-if="stats.total" class="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
    <div
      v-for="[label, value] in [
        ['Movies', stats.total],
        ['Watched', stats.watched],
        ['To watch', stats.remaining],
        ['Favorites', stats.favorites],
        ['Avg. rating', stats.averageRating === null ? '—' : `★ ${stats.averageRating.toFixed(1)}`],
      ]"
      :key="label"
      class="rounded-xl border border-white/15 p-3"
    >
      <dt class="text-xs uppercase tracking-wide text-gray-400">{{ label }}</dt>
      <dd class="text-2xl font-bold">{{ value }}</dd>
    </div>
  </dl>

  <p v-if="!shelves.length" class="rounded-xl border border-dashed p-8 text-center text-gray-400">
    Your shelf is empty. Open a movie and click “Add to library”.
  </p>

  <div v-else class="flex flex-col gap-12">
    <div v-for="(row, r) in shelves" :key="r" class="shelf">
      <div
        class="flex items-end gap-[2.5%] px-[3%]"
        @dragover.prevent
        @drop="drop(r * PER_SHELF + row.length)"
      >
        <button
          v-for="(item, i) in row"
          :key="item.id"
          :aria-label="`Pick up ${item.title}`"
          :class="{
            invisible: selected?.id === item.id,
            'opacity-40': dragFrom === r * PER_SHELF + i,
            'drop-target': dragOver === r * PER_SHELF + i && dragFrom !== r * PER_SHELF + i,
          }"
          class="case shelf-case w-[17%]"
          draggable="true"
          @mouseenter="sfx.tick"
          @click="pick(item, $event)"
          @dragstart="dragFrom = r * PER_SHELF + i"
          @dragenter="dragOver = r * PER_SHELF + i"
          @dragend="dragFrom = dragOver = null"
          @drop.stop="drop(r * PER_SHELF + i)"
        >
          <img
            v-if="item.poster"
            :src="posterUrl(item.poster)"
            :alt="item.title"
            class="sleeve"
            draggable="false"
          />
          <span
            v-else
            class="sleeve flex items-center bg-gray-700 p-2 text-xs font-bold text-white"
            >{{ item.title }}</span
          >
          <span
            v-if="item.favorite || item.watched || item.rating"
            class="absolute right-[6%] bottom-[4%] z-10 flex gap-1 rounded-full bg-black/70 px-1.5 text-[10px] font-bold"
          >
            <span v-if="item.favorite" class="text-pink-400">♥</span>
            <span v-if="item.rating" class="text-yellow-400">★{{ item.rating }}</span>
            <span v-else-if="item.watched" class="text-green-400">✓</span>
          </span>
        </button>
      </div>
      <div class="plank" />
    </div>
  </div>

  <!-- picked-up case, in front of the screen -->
  <div
    v-if="selected"
    :class="phase === 'returning' ? 'opacity-0' : 'opacity-100'"
    class="backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm transition-opacity duration-500"
    @click.self="putBack"
  >
    <div class="relative">
      <div
        ref="caseEl"
        :class="{
          open: phase !== 'front' && phase !== 'returning',
          'disc-out': phase === 'disc' || phase === 'transition',
        }"
        class="dvd relative origin-top-left cursor-pointer"
        role="button"
        :aria-label="phase === 'disc' ? `Go to ${selected.title}` : `Open ${selected.title}`"
        @click="onCaseClick"
      >
        <!-- inside of the case (right half of the inside photo) with the disc on its hub -->
        <div class="tray absolute inset-0">
          <div class="disc">
            <div
              class="disc-face front"
              :style="selected.poster && { '--poster': `url(${posterUrl(selected.poster)})` }"
            />
            <div class="disc-face back" />
          </div>
        </div>
        <!-- front cover, hinged on the left -->
        <div class="cover absolute inset-0">
          <div class="face case">
            <img
              v-if="selected.poster"
              :src="posterUrl(selected.poster)"
              :alt="selected.title"
              class="sleeve"
            />
            <span
              v-else
              class="sleeve flex items-center bg-gray-700 p-4 text-xl font-bold text-white"
              >{{ selected.title }}</span
            >
          </div>
          <!-- inside of the cover: the paper insert becomes your review booklet -->
          <div class="face inner">
            <div
              :class="phase === 'disc' ? 'opacity-100' : 'opacity-0'"
              class="booklet flex flex-col gap-[0.5em] overflow-y-auto p-[6%] text-gray-800 transition-opacity delay-300 duration-500"
            >
              <h2 class="text-[1.6em] font-extrabold leading-tight tracking-tight">
                {{ selected.title }}
              </h2>
              <template v-if="selected.watched">
                <p class="font-semibold text-green-700">✓ Watched</p>
                <p class="text-[1.8em] leading-none tracking-widest">
                  <span
                    v-for="n in 5"
                    :key="n"
                    :class="n <= (selected.rating ?? 0) ? 'text-yellow-400' : 'text-gray-300'"
                    >★</span
                  >
                </p>
                <p class="whitespace-pre-line italic">{{ selected.review || 'No review yet.' }}</p>
              </template>
              <p v-else class="font-semibold text-gray-500">Not watched yet · on your watchlist</p>
              <p class="mt-auto text-[0.75em] uppercase tracking-wide text-gray-400">
                Click again for the movie page
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- title + hint next to the closed case; absolute so the case stays centered -->
      <div
        :class="phase === 'front' ? 'opacity-100' : 'pointer-events-none opacity-0'"
        class="absolute top-full left-1/2 mt-6 w-64 -translate-x-1/2 text-center text-white transition-opacity duration-300 sm:top-1/2 sm:left-full sm:mt-0 sm:ml-12 sm:-translate-y-1/2 sm:translate-x-0 sm:text-left"
      >
        <h2 class="text-2xl font-extrabold tracking-tight">{{ selected.title }}</h2>
        <p class="text-sm text-gray-300">
          {{ selected.year }}<template v-if="selected.director"> · {{ selected.director }}</template>
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-2 text-sm font-semibold sm:justify-start">
          <button
            :aria-pressed="selected.watched"
            :class="selected.watched ? 'bg-green-500 text-gray-900' : 'border border-white/30 hover:bg-white/10'"
            class="rounded-lg px-3 py-1.5"
            @click="store.dispatch('toggleWatched', selected.id)"
          >
            {{ selected.watched ? '✓ Watched' : 'Mark as watched' }}
          </button>
          <button
            :aria-pressed="selected.favorite"
            :class="selected.favorite ? 'bg-pink-500/20 text-pink-300' : 'hover:bg-white/10'"
            class="rounded-lg border border-white/30 px-3 py-1.5"
            @click="store.dispatch('toggleFavorite', selected.id)"
          >
            {{ selected.favorite ? '♥ Favorite' : '♡ Favorite' }}
          </button>
          <button class="rounded-lg px-3 py-1.5 text-red-400 hover:bg-red-500/10" @click="removeSelected">
            Remove
          </button>
        </div>
        <p class="mt-4 text-xs uppercase tracking-wide text-gray-400">
          Click the case to open · Esc to put it back
        </p>
      </div>
    </div>
  </div>

  <div
    v-if="phase === 'transition'"
    class="fixed inset-0 z-60 grid overflow-hidden"
    :style="{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, gridAutoRows: `${CELL}px` }"
    aria-hidden="true"
  >
    <div
      v-for="(d, i) in delays"
      :key="i"
      class="cell bg-navy"
      :style="{ animationDelay: `${d}ms` }"
    />
  </div>
</template>

<style scoped>
/* one floating strip of light oak per shelf */
.shelf {
  perspective: 900px;
}
.plank {
  height: 12px;
  border-radius: 2px;
  background:
    repeating-linear-gradient(
      90deg,
      rgb(120 72 30 / 0.12) 0 1px,
      transparent 1px 9px,
      rgb(120 72 30 / 0.08) 9px 11px,
      transparent 11px 29px
    ),
    linear-gradient(#e2c29b, #c99f70);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.5),
    0 10px 14px -6px rgb(0 0 0 / 0.35);
}

/*
  DVD case photos from /public. Each box is one panel of the case (681:931).
  Background sizes/positions crop the photos' transparent margins to that panel:
  front cover photo 1086x1448, case at 66,65 size 965x1311, white insert at 100,98 size 890x1246
  inside photo 1448x1086, panels at y 63 height 931, left panel x 43, right panel x 724, width 681
*/
.case {
  position: relative;
  aspect-ratio: 681 / 931;
  border-radius: 1.5%;
  background: url('/dvd%20front%20cover.png') 54.5% 47.4% / 112.5% 110.5% no-repeat;
  box-shadow: 0 6px 10px rgb(0 0 0 / 0.5);
}
/* poster slid into the white insert area */
.sleeve {
  position: absolute;
  left: 3.5%;
  top: 2.5%;
  width: 92.2%;
  height: 95%;
  object-fit: cover;
}
/* clear plastic sheen over the insert */
.case::after {
  content: '';
  position: absolute;
  inset: 2.5% 4.3% 2.5% 3.5%;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    rgb(255 255 255 / 0.3),
    transparent 35%,
    transparent 75%,
    rgb(255 255 255 / 0.08)
  );
}

/* blue bar where a dragged case will land */
.drop-target {
  box-shadow:
    -10px 0 0 -4px #60a5fa,
    0 6px 10px rgb(0 0 0 / 0.5);
}

/* on the shelf: pull it out a bit when hovered */
.shelf-case {
  transform-origin: bottom;
  transition:
    transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1),
    box-shadow 0.25s;
}
.shelf-case:hover,
.shelf-case:focus-visible {
  transform: translateY(-10px) rotateX(10deg) scale(1.04);
  box-shadow: 0 16px 20px rgb(0 0 0 / 0.6);
}
.shelf-case:active {
  transform: translateY(-4px) scale(0.98);
}

/* picked-up case */
.dvd {
  /* opened with the disc out it's ~2.9x as wide, so 30vw still fits the screen */
  width: min(30vw, 62vh);
  container-type: inline-size;
  aspect-ratio: 681 / 931;
  perspective: 1400px;
  transition: translate 0.8s cubic-bezier(0.3, 0.7, 0.2, 1);
}
.dvd.open {
  translate: 50% 0; /* keep the opened case (twice as wide) centered */
}
.dvd.disc-out {
  translate: 5% 0; /* case + disc beside it, centered */
}
.tray,
.face.inner {
  border-radius: 1.5%;
  background: url('/dvd%20case%20inside.png') 94.4% 40.6% / 212.6% 116.6% no-repeat;
  box-shadow: 0 25px 50px rgb(0 0 0 / 0.6);
}
.face.inner {
  transform: rotateY(180deg);
  background-position-x: 5.6%;
}
/* centered on the hub of the photo; the disc photos' center holes show that hub through them */
.disc {
  position: absolute;
  left: 51.4%;
  top: 49.1%;
  width: 82%;
  aspect-ratio: 1;
  translate: -50% -50%;
  transform-style: preserve-3d;
  transition:
    translate 0.7s cubic-bezier(0.3, 0.7, 0.2, 1),
    scale 0.7s cubic-bezier(0.3, 0.7, 0.2, 1);
}
.disc-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
/* disc photos are 1254px squares: white disc 1234px wide, iridescent one 1196px */
.disc-face.front {
  background: url('/Blank%20White%20Optical%20Disc%20Mockup.png') center / 101.6% no-repeat;
}
/* poster printed on the white label ring, between the clear hub and the silver rim */
.disc-face.front::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    conic-gradient(
      from 30deg,
      rgb(255 255 255 / 0.3),
      transparent 20%,
      rgb(255 255 255 / 0.2) 50%,
      transparent 70%
    ),
    var(--poster, none) center / cover;
  mask: radial-gradient(circle closest-side, transparent 31.5%, #000 32% 96.5%, transparent 97%);
}
.disc-face.back {
  rotate: y 180deg;
  background: url('/Iridescent%20Optical%20Disc%20on%20Transparency.png') center / 104.8% no-repeat;
}
.cover {
  transform-origin: left;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.3, 0.7, 0.2, 1);
}
.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.face.case {
  box-shadow: 0 25px 50px rgb(0 0 0 / 0.6);
}
.dvd.open .cover {
  transform: rotateY(-180deg);
}
.dvd.disc-out .disc {
  translate: 70% -50%; /* lifted off the hub, resting to the right of the case */
  scale: 1.05;
  animation: spin 3s linear 0.5s infinite; /* turns over to show the iridescent back */
}
.tray {
  perspective: 1400px;
}
/* white insert area of the inside photo's left panel */
.booklet {
  font-size: 5.2cqw; /* scales with the case */
  position: absolute;
  left: 5.7%;
  top: 4.4%;
  width: 86.6%;
  height: 91.9%;
}
@keyframes spin {
  to {
    rotate: y 360deg;
  }
}

.cell {
  transform: scale(0);
  animation: pop 0.3s cubic-bezier(0.3, 1.4, 0.5, 1) forwards;
}
@keyframes pop {
  from {
    transform: scale(0) rotate(45deg);
    border-radius: 30%;
  }
  to {
    transform: scale(1.02) rotate(0); /* 1.02 hides hairline gaps between cells */
    border-radius: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover,
  .shelf-case {
    transition: none;
  }
  .dvd.disc-out .disc {
    animation: none;
  }
}
</style>

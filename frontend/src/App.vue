<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-gray-900">⚽ Football Scout</h1>
            <span class="ml-2 text-sm text-gray-500">AI-Powered Player Discovery</span>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">Phase 1 - Core Infrastructure</span>
            <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Backend Connected"></div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Search Section -->
      <div class="mb-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Search for Players</h2>
          <div class="flex gap-4">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="e.g., young striker from France with pace"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              @keyup.enter="searchPlayers"
            />
            <button
              @click="searchPlayers"
              :disabled="!searchQuery.trim() || isSearching"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <svg v-if="isSearching" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSearching ? 'Searching...' : 'Search' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Sources Section -->
      <div class="mb-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Data Sources</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="source in sources"
              :key="source.id"
              class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <div class="font-medium text-gray-900">{{ source.name }}</div>
                <div class="text-sm text-gray-500">{{ source.reliability }}% reliable</div>
              </div>
              <div class="w-3 h-3 bg-green-500 rounded-full" title="Available"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div v-if="searchResults.length > 0" class="mb-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Search Results</h2>
          <div class="grid gap-4">
            <div
              v-for="player in searchResults"
              :key="player.id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ player.name }}</h3>
                  <p class="text-gray-600">{{ player.position }} • {{ player.nationality }}</p>
                  <p class="text-sm text-gray-500">{{ player.club }}</p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold text-green-600">{{ player.matchScore }}%</div>
                  <div class="text-sm text-gray-500">Match</div>
                </div>
              </div>
              <div class="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                <strong>Why this player:</strong> {{ player.explanation }}
              </div>
              <div class="mt-2 flex justify-between items-center text-sm text-gray-500">
                <span>Age: {{ player.age }}</span>
                <span>Market Value: €{{ (player.marketValue / 1000000).toFixed(1) }}M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="text-center text-sm text-gray-500">
        <p>Backend API: <span :class="apiStatus === 'connected' ? 'text-green-600' : 'text-red-600'">{{ apiStatus }}</span></p>
        <p>WebSocket: <span :class="wsStatus === 'connected' ? 'text-green-600' : 'text-red-600'">{{ wsStatus }}</span></p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { io } from 'socket.io-client'

// Reactive data
const searchQuery = ref('')
const isSearching = ref(false)
const sources = ref([])
const searchResults = ref([])
const apiStatus = ref('connecting...')
const wsStatus = ref('connecting...')

// WebSocket connection
const socket = io('http://localhost:3000')

// Socket event handlers
socket.on('connect', () => {
  wsStatus.value = 'connected'
  console.log('WebSocket connected')
})

socket.on('disconnect', () => {
  wsStatus.value = 'disconnected'
  console.log('WebSocket disconnected')
})

socket.on('search-progress', (data) => {
  console.log('Search progress:', data)
})

socket.on('search-results', (data) => {
  console.log('Search results:', data)
  searchResults.value = data.results
  isSearching.value = false
})

// API functions
const checkApiStatus = async () => {
  try {
    const response = await fetch('/api/sources')
    if (response.ok) {
      apiStatus.value = 'connected'
      const data = await response.json()
      sources.value = data
    } else {
      apiStatus.value = 'error'
    }
  } catch (error) {
    apiStatus.value = 'error'
    console.error('API connection error:', error)
  }
}

const searchPlayers = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  searchResults.value = []
  
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery.value }),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('Search started:', data)
    } else {
      isSearching.value = false
      console.error('Search failed')
    }
  } catch (error) {
    isSearching.value = false
    console.error('Search error:', error)
  }
}

// Initialize on mount
onMounted(() => {
  checkApiStatus()
})
</script>

<style scoped>
/* Add any component-specific styles here */
</style> 
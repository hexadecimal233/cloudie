<template>
  <!-- TODO: Update UI -->
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="transform translate-y-full"
    enter-to-class="transform translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="transform translate-y-0"
    leave-to-class="transform translate-y-full"
  >
    <div v-if="usePlayerStore().isFullscreen" class="fixed inset-0 size-full flex bg-default z-50">
      <div class="w-full h-full flex flex-col">
        <!-- 顶部控制栏 -->
        <div class="flex justify-between items-center p-4">
          <button 
            @click="usePlayerStore().isFullscreen = false" 
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <i-mingcute-close-line class="h-6 w-6" />
          </button>
          <div class="text-lg font-medium">Fullscreen Player</div>
          <div class="w-10"></div> <!-- 占位符保持居中 -->
        </div>
        
        <!-- 主要内容区域 -->
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="mb-8">
              <!-- 这里可以添加专辑封面 -->
              <div class="w-64 h-64 mx-auto bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <span class="text-gray-500 dark:text-gray-400">Album Cover</span>
              </div>
            </div>
            
            <div class="mb-4">
              <h2 class="text-2xl font-bold mb-2">{{ usePlayerStore().track?.title || 'Unknown Track' }}</h2>
              <p class="text-lg text-gray-600 dark:text-gray-400">{{ usePlayerStore().track?.artist || 'Unknown Artist' }}</p>
            </div>
            
            <!-- 进度条 -->
            <div class="mb-4">
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  class="bg-blue-500 h-2 rounded-full" 
                  :style="{ width: `${usePlayerStore().playProgress * 100}%` }"
                ></div>
              </div>
            </div>
            
            <!-- 控制按钮 -->
            <div class="flex justify-center space-x-4">
              <button 
                @click="usePlayerStore().nextTrack(-1)" 
                class="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <i-mingcute-skip-previous-line class="h-6 w-6" />
              </button>
              
              <button 
                @click="usePlayerStore().isPaused ? usePlayerStore().resume() : usePlayerStore().pause()" 
                class="p-4 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <i-mingcute-play-line v-if="usePlayerStore().isPaused" class="h-8 w-8" />
                <i-mingcute-pause-line v-else class="h-8 w-8" />
              </button>
              
              <button 
                @click="usePlayerStore().nextTrack(1)" 
                class="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <i-mingcute-skip-forward-line class="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/systems/stores/player';

</script>
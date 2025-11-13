<template>
    <UModal :close="{ onClick: () => emit('close', false) }" :title="$t('cloudie.playlistSelectModal.title')">
        <template #body>
            <UTabs :items="items">
                <template #all>
                    <div class="max-h-96 overflow-y-auto" ref="scrollContainer">
                        <div v-if="loading && data.length === 0" class="flex justify-center p-4">
                            <!-- TODO: Spinner -->
                        </div>
                        <div v-else-if="error" class="text-red-500 p-4">
                            {{ $t('cloudie.common.loadFail') }}
                        </div>
                        <div v-else-if="data.length === 0" class="text-gray-500 p-4">
                            {{ $t('cloudie.common.empty') }}
                        </div>
                        <div v-else class="space-y-2 p-2">
                            <MiniPlaylist 
                                v-for="playlist in data" :key="playlist.id" :playlist="playlist" @click="selectPlaylist(playlist)"
                            />
                            <div v-if="loading && data.length > 0" class="flex justify-center p-4">
                                <USpinner />
                            </div>
                            <div v-if="!hasNext && data.length > 0" class="text-center text-gray-500 p-4">
                                {{ $t('cloudie.common.noMore') }}
                            </div>
                        </div>
                    </div>
                </template>
                <template #create>
                    
                </template>
            </UTabs>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue';
import { usePlaylists, userInfo } from '@/utils/api';
import MiniPlaylist from '@/components/mini/MiniPlaylist.vue';
import { i18n } from '@/systems/i18n';

const emit = defineEmits(['close', 'select']);

const scrollContainer = ref<HTMLElement | null>(null);
const { data, error, loading, hasNext, fetchNext } = usePlaylists(userInfo.value.id);

const items = computed(() => [
    { slot: 'all', label: i18n.global.t('cloudie.playlistSelectModal.all') },
    { slot: 'create', label: i18n.global.t('cloudie.playlistSelectModal.create') }
]);

const selectPlaylist = (playlist: any) => {

};

const handleScroll = () => {
    if (!scrollContainer.value || loading.value || !hasNext.value) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchNext();
    }
};

onMounted(async () => {
    fetchNext();
    await nextTick();
    if (scrollContainer.value) {
        scrollContainer.value.addEventListener('scroll', handleScroll);
    }
});

onUnmounted(() => {
    if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll);
    }
});
</script>

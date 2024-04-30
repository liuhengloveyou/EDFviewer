<template>
  <q-page class="flex flex-center">
    <q-header>
      <q-bar style=" width: 100%;" class="bg-black text-grey-1">
        <div class="cursor-pointer non-selectable">
          文件
          <q-menu>
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup @click="onOpenFile">
                <q-item-section>打开</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
        <!-- <div class="cursor-pointer non-selectable">
          编辑
          <q-menu>
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup>
                <q-item-section>Cut</q-item-section>
              </q-item>
              <q-item clickable v-close-popup>
                <q-item-section>Copy</q-item-section>
              </q-item>
              <q-item clickable v-close-popup>
                <q-item-section>Paste</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup>
                <q-item-section>Select All</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div> -->
        <!-- <q-space />
        <q-btn dense flat icon="minimize" />
        <q-btn dense flat icon="crop_square" />
        <q-btn dense flat icon="close" /> -->
      </q-bar>
    </q-header>

    <q-footer class="bg-black text-grey-1">
      <q-bar style="width: 100%;" class="bg-black row items-start">
        <q-btn size="xs" flat icon="fast_rewind" color="grey-1" />
        <q-btn size="xs" flat icon="pause" color="grey-1" />
        <q-btn size="xs" flat icon="fast_forward" color="grey-1" />
        <q-slider v-model="fileSeek" :min="1" :max="fileDuration" label color="grey-1" label-text-color="black" markers
          track-size="1px" thumb-size="10px" @change="seekTo" />
        <q-chip dense size="xs">{{ fileSeek }}/{{ fileDuration }}</q-chip>
      </q-bar>
    </q-footer>

    <canvas class="emscripten" id="canvas" oncontextmenu="event.preventDefault()"></canvas>
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
import Module from "app/public/wasm/edfviewer";


export default defineComponent({
  name: 'IndexPage',
  data() {
    return {
      wasmModule: null,
      fileDuration: 5,
      fileSeek: 1,
    };
  },
  methods: {
    onOpenFile() {
      this.wasmModule.selectFile();
    },
    seekTo(val) {
      console.log("seekTo: ", val)

      this.wasmModule.seekTo(val);
    }
  },
  async mounted() {
    const that = this;
    let moduleArg = {
      canvas: (function () {
        var canvas = document.getElementById('canvas');
        //canvas.addEventListener("webglcontextlost", function(e) { alert('FIXME: WebGL context lost, please reload the page'); e.preventDefault(); }, false);
        return canvas;
      })(),
      setStatus: function (text) {
        console.log("status: " + text);
      },
      monitorRunDependencies: function (left) {
        // no run dependencies to log
      },
      onOpenedCB: function (param) {
        that.fileDuration = param.fileDuration
      }
    };

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    moduleArg.preinitializedWebGPUDevice = device;


    this.wasmModule = await Module(moduleArg);
    // console.log("mounted.module:", this.module)

    // const script = document.createElement("script");
    // script.src = "/edf-plot.js";
    // script.async = true;
    // (
    //   document.getElementsByTagName("body")[0] || document.documentElement
    // ).appendChild(script);
  },
  setup() {
    const fileInput = ref();
    const resultContainer = ref();

    return {
      fileInput,
      resultContainer,
    };
  },
});


</script>

<style scoped>
.emscripten {
  position: absolute;
  top: 0px;
  left: 0px;
  margin: 0px;
  padding: 0px;
  border: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: block;
  image-rendering: optimizeSpeed;
  image-rendering: -moz-crisp-edges;
  image-rendering: -o-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  -ms-interpolation-mode: nearest-neighbor;
}
</style>

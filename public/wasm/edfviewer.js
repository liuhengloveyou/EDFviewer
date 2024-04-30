
var Module = (() => {
  var _scriptDir = import.meta.url;
  
  return (
function(moduleArg = {}) {

// Support for growable heap + pthreads, where the buffer may change, so JS views
// must be updated.
function GROWABLE_HEAP_I8() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP8;
}
function GROWABLE_HEAP_U8() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU8;
}
function GROWABLE_HEAP_I16() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP16;
}
function GROWABLE_HEAP_U16() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU16;
}
function GROWABLE_HEAP_I32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP32;
}
function GROWABLE_HEAP_U32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU32;
}
function GROWABLE_HEAP_F32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPF32;
}
function GROWABLE_HEAP_F64() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPF64;
}

var Module = moduleArg;

var readyPromiseResolve, readyPromiseReject;

Module["ready"] = new Promise((resolve, reject) => {
 readyPromiseResolve = resolve;
 readyPromiseReject = reject;
});

[ "__emscripten_thread_init", "__emscripten_thread_exit", "__emscripten_thread_crashed", "__emscripten_thread_mailbox_await", "__emscripten_tls_init", "_pthread_self", "checkMailbox", "__embind_initialize_bindings", "establishStackSpace", "invokeEntryPoint", "PThread", "___indirect_function_table", "_main", "onRuntimeInitialized" ].forEach(prop => {
 if (!Object.getOwnPropertyDescriptor(Module["ready"], prop)) {
  Object.defineProperty(Module["ready"], prop, {
   get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"),
   set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js")
  });
 }
});

var libedfWorker;

function initEdfWorker() {
 libedfWorker = new Worker("/wasm/libedf.js");
 libedfWorker.addEventListener("message", ev => {
  const data = ev.data;
  console.log("message from libedfWorker::", data);
  switch (data.method) {
  case "loaded":
   {
    console.log("libedfWorker loaded:", Module.HEAPU8.buffer, Module.dataBuffAddr);
    break;
   }

  case "opened":
   {
    Module.onOpenedCB(data.param);
    const addr = Module.wasm_init_plot(data.param);
    Module.dataBuffAddr = Number(addr);
    console.log("libedfWorker opened:", Module.dataBuffAddr, data.param);
    libedfWorker.postMessage({
     method: "read",
     rid: 1,
     buffer: Module.HEAPU8.buffer,
     ptr: Module.dataBuffAddr
    });
    break;
   }

  case "data":
   {
    Module.wasm_set_data(data.rid);
    console.log("libedfWorker data:", data.rid, Module.wasm_seek(-1));
    break;
   }

  default:
   break;
  }
 });
}

function callFromC(myUint8Array) {
 var myUint8Array = Module.getBytes();
 console.log("myUint8Array>>>>>>>>>>>>>>>>>>", myUint8Array.byteOffset, myUint8Array.byteLength, myUint8Array);
 let numberOfFloats = myUint8Array.byteLength / 4;
 let dataView = new DataView(myUint8Array.buffer, myUint8Array.byteOffset, myUint8Array.byteLength);
 const range = (start, stop, step = 1) => Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step);
 let arrayOfNumbers = range(0, numberOfFloats).map(idx => dataView.getFloat32(idx * 4, true));
 console.log("myUint8Array>>>>>>>>>>>>>>>>>>", arrayOfNumbers);
}

Module.MKDIRED = false;

Module.MOUNT_DIR = "/working";

Module.current_edf_file = null;

Module.dataBuffAddr = 0;

Module.secondInScreen = 10;

Module.preRun = [];

Module.postRun = [];

Module.print = (function() {
 return function(text) {
  text = Array.prototype.slice.call(arguments).join(" ");
  console.log(text);
 };
})();

Module.printErr = function(text) {
 text = Array.prototype.slice.call(arguments).join(" ");
 console.error(text);
};

Module.onRuntimeInitialized = async () => {
 console.log("edfviewer.Module.onRuntimeInitialized", Module);
 initEdfWorker();
};

Module.canvas = (function() {
 var canvas = document.getElementById("canvas");
 return canvas;
})();

Module.selectFile = cb => {
 let edFileSelector = document.createElement("input");
 edFileSelector.setAttribute("id", "edFileSelector");
 edFileSelector.setAttribute("type", "file");
 edFileSelector.setAttribute("accept", ".edf");
 edFileSelector.addEventListener("change", event => {
  let {files: files} = event.target;
  if (files.length != 1) {
   return;
  }
  Module.current_edf_file = files[0];
  console.log("current_edf_file>>>>>>>>>", Module.current_edf_file);
  libedfWorker.postMessage({
   method: "open",
   file: Module.current_edf_file
  });
 }, false);
 edFileSelector.click();
};

/*
seek
*/ Module.seekTo = s => {
 const rst = Module.wasm_seek(s);
 libedfWorker.postMessage({
  method: "read",
  rid: rst,
  buffer: Module.HEAPU8.buffer,
  ptr: Module.dataBuffAddr
 });
};

Module.singleImage = imgDataPtr => {
 const width = Module.HEAPU32[imgDataPtr];
 const height = Module.HEAPU32[imgDataPtr + 1];
 const duration = Module.HEAPU32[imgDataPtr + 2];
 const imageBufferPtr = Module.HEAPU32[imgDataPtr + 3];
 const imageBuffer = Module.HEAPU8.slice(imageBufferPtr, imageBufferPtr + width * height * 3);
 Module._free(imgDataPtr);
 Module._free(imageBufferPtr);
 const imageDataBuffer = new Uint8ClampedArray(width * height * 4);
 let j = 0;
 for (let i = 0; i < imageBuffer.length; i++) {
  if (i && i % 3 === 0) {
   imageDataBuffer[j] = 255;
   j += 1;
  }
  imageDataBuffer[j] = imageBuffer[i];
  j += 1;
 }
 return {
  width: width,
  height: height,
  duration: duration,
  imageDataBuffer: imageDataBuffer
 };
};

var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";

var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";

var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module["ENVIRONMENT"]) {
 throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
}

var ENVIRONMENT_IS_PTHREAD = Module["ENVIRONMENT_IS_PTHREAD"] || false;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary;

if (ENVIRONMENT_IS_SHELL) {
 if ((typeof process == "object" && typeof require === "function") || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 if (typeof read != "undefined") {
  read_ = read;
 }
 readBinary = f => {
  if (typeof readbuffer == "function") {
   return new Uint8Array(readbuffer(f));
  }
  let data = read(f, "binary");
  assert(typeof data == "object");
  return data;
 };
 readAsync = (f, onload, onerror) => {
  setTimeout(() => onload(readBinary(f)));
 };
 if (typeof clearTimeout == "undefined") {
  globalThis.clearTimeout = id => {};
 }
 if (typeof setTimeout == "undefined") {
  globalThis.setTimeout = f => (typeof f == "function") ? f() : abort();
 }
 if (typeof scriptArgs != "undefined") {
  arguments_ = scriptArgs;
 } else if (typeof arguments != "undefined") {
  arguments_ = arguments;
 }
 if (typeof quit == "function") {
  quit_ = (status, toThrow) => {
   setTimeout(() => {
    if (!(toThrow instanceof ExitStatus)) {
     let toLog = toThrow;
     if (toThrow && typeof toThrow == "object" && toThrow.stack) {
      toLog = [ toThrow, toThrow.stack ];
     }
     err(`exiting due to exception: ${toLog}`);
    }
    quit(status);
   });
   throw toThrow;
  };
 }
 if (typeof print != "undefined") {
  if (typeof console == "undefined") console = /** @type{!Console} */ ({});
  console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
  console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != "undefined" ? printErr : print);
 }
} else  if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (typeof document != "undefined" && document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.startsWith("blob:")) {
  scriptDirectory = "";
 } else {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
 }
 if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 {
  read_ = url => {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = url => {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
   };
  }
  readAsync = (url, onload, onerror) => {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = () => {
    if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
} else  {
 throw new Error("environment detection error");
}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.error.bind(console);

Object.assign(Module, moduleOverrides);

moduleOverrides = null;

checkIncomingModuleAPI();

if (Module["arguments"]) arguments_ = Module["arguments"];

legacyModuleProp("arguments", "arguments_");

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

legacyModuleProp("thisProgram", "thisProgram");

if (Module["quit"]) quit_ = Module["quit"];

legacyModuleProp("quit", "quit_");

assert(typeof Module["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");

assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");

assert(typeof Module["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");

assert(typeof Module["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");

assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");

legacyModuleProp("asm", "wasmExports");

legacyModuleProp("read", "read_");

legacyModuleProp("readAsync", "readAsync");

legacyModuleProp("readBinary", "readBinary");

legacyModuleProp("setWindowTitle", "setWindowTitle");

var IDBFS = "IDBFS is no longer included by default; build with -lidbfs.js";

var PROXYFS = "PROXYFS is no longer included by default; build with -lproxyfs.js";

var WORKERFS = "WORKERFS is no longer included by default; build with -lworkerfs.js";

var FETCHFS = "FETCHFS is no longer included by default; build with -lfetchfs.js";

var ICASEFS = "ICASEFS is no longer included by default; build with -licasefs.js";

var JSFILEFS = "JSFILEFS is no longer included by default; build with -ljsfilefs.js";

var OPFS = "OPFS is no longer included by default; build with -lopfs.js";

var NODEFS = "NODEFS is no longer included by default; build with -lnodefs.js";

assert(ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER || ENVIRONMENT_IS_NODE, "Pthreads do not work in this environment yet (need Web Workers, or an alternative to them)");

assert(!ENVIRONMENT_IS_NODE, "node environment detected but not enabled at build time.  Add `node` to `-sENVIRONMENT` to enable.");

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.");

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

legacyModuleProp("wasmBinary", "wasmBinary");

if (typeof WebAssembly != "object") {
 err("no native wasm support detected");
}

var wasmMemory;

var wasmModule;

var ABORT = false;

var EXITSTATUS;

/** @type {function(*, string=)} */ function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed" + (text ? ": " + text : ""));
 }
}

var HEAP, /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

function updateMemoryViews() {
 var b = wasmMemory.buffer;
 Module["HEAP8"] = HEAP8 = new Int8Array(b);
 Module["HEAP16"] = HEAP16 = new Int16Array(b);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
 Module["HEAP32"] = HEAP32 = new Int32Array(b);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
}

assert(!Module["STACK_SIZE"], "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");

assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined, "JS engine does not provide full typed array support");

var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 2147483648;

legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");

assert(INITIAL_MEMORY >= 65536, "INITIAL_MEMORY should be larger than STACK_SIZE, was " + INITIAL_MEMORY + "! (STACK_SIZE=" + 65536 + ")");

if (ENVIRONMENT_IS_PTHREAD) {
 wasmMemory = Module["wasmMemory"];
} else {
 if (Module["wasmMemory"]) {
  wasmMemory = Module["wasmMemory"];
 } else {
  wasmMemory = new WebAssembly.Memory({
   "initial": INITIAL_MEMORY / 65536,
   "maximum": 2147483648 / 65536,
   "shared": true
  });
  if (!(wasmMemory.buffer instanceof SharedArrayBuffer)) {
   err("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag");
   if (ENVIRONMENT_IS_NODE) {
    err("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and/or recent version)");
   }
   throw Error("bad memory");
  }
 }
}

updateMemoryViews();

INITIAL_MEMORY = wasmMemory.buffer.byteLength;

assert(INITIAL_MEMORY % 65536 === 0);

function writeStackCookie() {
 var max = _emscripten_stack_get_end();
 assert((max & 3) == 0);
 if (max == 0) {
  max += 4;
 }
 GROWABLE_HEAP_U32()[((max) >> 2)] = 34821223;
 GROWABLE_HEAP_U32()[(((max) + (4)) >> 2)] = 2310721022;
 GROWABLE_HEAP_U32()[((0) >> 2)] = 1668509029;
}

function checkStackCookie() {
 if (ABORT) return;
 var max = _emscripten_stack_get_end();
 if (max == 0) {
  max += 4;
 }
 var cookie1 = GROWABLE_HEAP_U32()[((max) >> 2)];
 var cookie2 = GROWABLE_HEAP_U32()[(((max) + (4)) >> 2)];
 if (cookie1 != 34821223 || cookie2 != 2310721022) {
  abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
 }
 if (GROWABLE_HEAP_U32()[((0) >> 2)] != 1668509029) /* 'emsc' */ {
  abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
 }
}

(function() {
 var h16 = new Int16Array(1);
 var h8 = new Int8Array(h16.buffer);
 h16[0] = 25459;
 if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
})();

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATEXIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

var runtimeExited = false;

function preRun() {
 assert(!ENVIRONMENT_IS_PTHREAD);
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 assert(!runtimeInitialized);
 runtimeInitialized = true;
 if (ENVIRONMENT_IS_PTHREAD) return;
 checkStackCookie();
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 checkStackCookie();
 if (ENVIRONMENT_IS_PTHREAD) return;
 callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
 assert(!runtimeExited);
 checkStackCookie();
 if (ENVIRONMENT_IS_PTHREAD) return;
 ___funcs_on_exit();
 callRuntimeCallbacks(__ATEXIT__);
 flush_NO_FILESYSTEM();
 PThread.terminateAllThreads();
 runtimeExited = true;
}

function postRun() {
 checkStackCookie();
 if (ENVIRONMENT_IS_PTHREAD) return;
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
 __ATEXIT__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

var runDependencyTracking = {};

function getUniqueRunDependency(id) {
 var orig = id;
 while (1) {
  if (!runDependencyTracking[id]) return id;
  id = orig + Math.random();
 }
}

function addRunDependency(id) {
 runDependencies++;
 Module["monitorRunDependencies"]?.(runDependencies);
 if (id) {
  assert(!runDependencyTracking[id]);
  runDependencyTracking[id] = 1;
  if (runDependencyWatcher === null && typeof setInterval != "undefined") {
   runDependencyWatcher = setInterval(() => {
    if (ABORT) {
     clearInterval(runDependencyWatcher);
     runDependencyWatcher = null;
     return;
    }
    var shown = false;
    for (var dep in runDependencyTracking) {
     if (!shown) {
      shown = true;
      err("still waiting on run dependencies:");
     }
     err(`dependency: ${dep}`);
    }
    if (shown) {
     err("(end of list)");
    }
   }, 1e4);
  }
 } else {
  err("warning: run dependency added without ID");
 }
}

function removeRunDependency(id) {
 runDependencies--;
 Module["monitorRunDependencies"]?.(runDependencies);
 if (id) {
  assert(runDependencyTracking[id]);
  delete runDependencyTracking[id];
 } else {
  err("warning: run dependency removed without ID");
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

/** @param {string|number=} what */ function abort(what) {
 Module["onAbort"]?.(what);
 what = "Aborted(" + what + ")";
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
 readyPromiseReject(e);
 throw e;
}

var FS = {
 error() {
  abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");
 },
 init() {
  FS.error();
 },
 createDataFile() {
  FS.error();
 },
 createPreloadedFile() {
  FS.error();
 },
 createLazyFile() {
  FS.error();
 },
 open() {
  FS.error();
 },
 mkdev() {
  FS.error();
 },
 registerDevice() {
  FS.error();
 },
 analyzePath() {
  FS.error();
 },
 ErrnoError() {
  FS.error();
 }
};

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

function createExportWrapper(name) {
 return (...args) => {
  assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
  assert(!runtimeExited, `native function \`${name}\` called after runtime exit (use NO_EXIT_RUNTIME to keep it alive after main() exits)`);
  var f = wasmExports[name];
  assert(f, `exported native function \`${name}\` not found`);
  return f(...args);
 };
}

var wasmBinaryFile;

if (Module["locateFile"]) {
 wasmBinaryFile = "edfviewer.wasm";
 if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
 }
} else {
 wasmBinaryFile = new URL("edfviewer.wasm", import.meta.url).href;
}

function getBinarySync(file) {
 if (file == wasmBinaryFile && wasmBinary) {
  return new Uint8Array(wasmBinary);
 }
 if (readBinary) {
  return readBinary(file);
 }
 throw "both async and sync fetching of the wasm failed";
}

function getBinaryPromise(binaryFile) {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
  if (typeof fetch == "function") {
   return fetch(binaryFile, {
    credentials: "same-origin"
   }).then(response => {
    if (!response["ok"]) {
     throw `failed to load wasm binary file at '${binaryFile}'`;
    }
    return response["arrayBuffer"]();
   }).catch(() => getBinarySync(binaryFile));
  }
 }
 return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
 return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(receiver, reason => {
  err(`failed to asynchronously prepare wasm: ${reason}`);
  if (isFileURI(wasmBinaryFile)) {
   err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
  }
  abort(reason);
 });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
 if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") {
  return fetch(binaryFile, {
   credentials: "same-origin"
  }).then(response => {
   /** @suppress {checkTypes} */ var result = WebAssembly.instantiateStreaming(response, imports);
   return result.then(callback, function(reason) {
    err(`wasm streaming compile failed: ${reason}`);
    err("falling back to ArrayBuffer instantiation");
    return instantiateArrayBuffer(binaryFile, imports, callback);
   });
  });
 }
 return instantiateArrayBuffer(binaryFile, imports, callback);
}

function createWasm() {
 var info = {
  "env": wasmImports,
  "wasi_snapshot_preview1": wasmImports
 };
 /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
  wasmExports = instance.exports;
  registerTLSInit(wasmExports["_emscripten_tls_init"]);
  wasmTable = wasmExports["__indirect_function_table"];
  assert(wasmTable, "table not found in wasm exports");
  addOnInit(wasmExports["__wasm_call_ctors"]);
  wasmModule = module;
  removeRunDependency("wasm-instantiate");
  return wasmExports;
 }
 addRunDependency("wasm-instantiate");
 var trueModule = Module;
 function receiveInstantiationResult(result) {
  assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
  trueModule = null;
  receiveInstance(result["instance"], result["module"]);
 }
 if (Module["instantiateWasm"]) {
  try {
   return Module["instantiateWasm"](info, receiveInstance);
  } catch (e) {
   err(`Module.instantiateWasm callback failed with error: ${e}`);
   readyPromiseReject(e);
  }
 }
 instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
 return {};
}

var tempDouble;

var tempI64;

function legacyModuleProp(prop, newName, incoming = true) {
 if (!Object.getOwnPropertyDescriptor(Module, prop)) {
  Object.defineProperty(Module, prop, {
   configurable: true,
   get() {
    let extra = incoming ? " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)" : "";
    abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);
   }
  });
 }
}

function ignoredModuleProp(prop) {
 if (Object.getOwnPropertyDescriptor(Module, prop)) {
  abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
 }
}

function isExportedByForceFilesystem(name) {
 return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" ||  name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
}

function missingGlobal(sym, msg) {
 if (typeof globalThis !== "undefined") {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get() {
    warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
    return undefined;
   }
  });
 }
}

missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");

missingGlobal("asm", "Please use wasmExports instead");

function missingLibrarySymbol(sym) {
 if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get() {
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    var librarySymbol = sym;
    if (!librarySymbol.startsWith("_")) {
     librarySymbol = "$" + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    warnOnce(msg);
    return undefined;
   }
  });
 }
 unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
 if (!Object.getOwnPropertyDescriptor(Module, sym)) {
  Object.defineProperty(Module, sym, {
   configurable: true,
   get() {
    var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    abort(msg);
   }
  });
 }
}

function dbg(...args) {
 console.warn(...args);
}

/** @constructor */ function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = `Program terminated with exit(${status})`;
 this.status = status;
}

var terminateWorker = worker => {
 worker.terminate();
 worker.onmessage = e => {
  var cmd = e["data"]["cmd"];
  err(`received "${cmd}" command from terminated worker: ${worker.workerID}`);
 };
};

var killThread = pthread_ptr => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! killThread() can only ever be called from main application thread!");
 assert(pthread_ptr, "Internal Error! Null pthread_ptr in killThread!");
 var worker = PThread.pthreads[pthread_ptr];
 delete PThread.pthreads[pthread_ptr];
 terminateWorker(worker);
 __emscripten_thread_free_data(pthread_ptr);
 PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
 worker.pthread_ptr = 0;
};

var cancelThread = pthread_ptr => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! cancelThread() can only ever be called from main application thread!");
 assert(pthread_ptr, "Internal Error! Null pthread_ptr in cancelThread!");
 var worker = PThread.pthreads[pthread_ptr];
 worker.postMessage({
  "cmd": "cancel"
 });
};

var cleanupThread = pthread_ptr => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! cleanupThread() can only ever be called from main application thread!");
 assert(pthread_ptr, "Internal Error! Null pthread_ptr in cleanupThread!");
 var worker = PThread.pthreads[pthread_ptr];
 assert(worker);
 PThread.returnWorkerToPool(worker);
};

var zeroMemory = (address, size) => {
 GROWABLE_HEAP_U8().fill(0, address, address + size);
 return address;
};

var spawnThread = threadParams => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! spawnThread() can only ever be called from main application thread!");
 assert(threadParams.pthread_ptr, "Internal error, no pthread ptr!");
 var worker = PThread.getNewWorker();
 if (!worker) {
  return 6;
 }
 assert(!worker.pthread_ptr, "Internal error!");
 PThread.runningWorkers.push(worker);
 PThread.pthreads[threadParams.pthread_ptr] = worker;
 worker.pthread_ptr = threadParams.pthread_ptr;
 var msg = {
  "cmd": "run",
  "start_routine": threadParams.startRoutine,
  "arg": threadParams.arg,
  "pthread_ptr": threadParams.pthread_ptr
 };
 worker.postMessage(msg, threadParams.transferList);
 return 0;
};

var runtimeKeepaliveCounter = 0;

var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

var withStackSave = f => {
 var stack = stackSave();
 var ret = f();
 stackRestore(stack);
 return ret;
};

var convertI32PairToI53Checked = (lo, hi) => {
 assert(lo == (lo >>> 0) || lo == (lo | 0));
 assert(hi === (hi | 0));
 return ((hi + 2097152) >>> 0 < 4194305 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;
};

/** @type{function(number, (number|boolean), ...number)} */ var proxyToMainThread = (funcIndex, emAsmAddr, sync, ...callArgs) => withStackSave(() => {
 var serializedNumCallArgs = callArgs.length;
 var args = stackAlloc(serializedNumCallArgs * 8);
 var b = ((args) >> 3);
 for (var i = 0; i < callArgs.length; i++) {
  var arg = callArgs[i];
  GROWABLE_HEAP_F64()[b + i] = arg;
 }
 return __emscripten_run_on_main_thread_js(funcIndex, emAsmAddr, serializedNumCallArgs, args, sync);
});

function _proc_exit(code) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(0, 0, 1, code);
 EXITSTATUS = code;
 if (!keepRuntimeAlive()) {
  PThread.terminateAllThreads();
  Module["onExit"]?.(code);
  ABORT = true;
 }
 quit_(code, new ExitStatus(code));
}

/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
 EXITSTATUS = status;
 if (ENVIRONMENT_IS_PTHREAD) {
  assert(!implicit);
  exitOnMainThread(status);
  throw "unwind";
 }
 if (!keepRuntimeAlive()) {
  exitRuntime();
 }
 if (keepRuntimeAlive() && !implicit) {
  var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
  readyPromiseReject(msg);
  err(msg);
 }
 _proc_exit(status);
};

var _exit = exitJS;

var ptrToString = ptr => {
 assert(typeof ptr === "number");
 ptr >>>= 0;
 return "0x" + ptr.toString(16).padStart(8, "0");
};

var handleException = e => {
 if (e instanceof ExitStatus || e == "unwind") {
  return EXITSTATUS;
 }
 checkStackCookie();
 if (e instanceof WebAssembly.RuntimeError) {
  if (_emscripten_stack_get_current() <= 0) {
   err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)");
  }
 }
 quit_(1, e);
};

var PThread = {
 unusedWorkers: [],
 runningWorkers: [],
 tlsInitFunctions: [],
 pthreads: {},
 nextWorkerID: 1,
 debugInit() {
  function pthreadLogPrefix() {
   var t = 0;
   if (runtimeInitialized && typeof _pthread_self != "undefined" && !runtimeExited) {
    t = _pthread_self();
   }
   return "w:" + (Module["workerID"] || 0) + ",t:" + ptrToString(t) + ": ";
  }
  var origDbg = dbg;
  dbg = (...args) => origDbg(pthreadLogPrefix() + args.join(" "));
 },
 init() {
  PThread.debugInit();
  if (ENVIRONMENT_IS_PTHREAD) {
   PThread.initWorker();
  } else {
   PThread.initMainThread();
  }
 },
 initMainThread() {
  addOnPreRun(() => {
   addRunDependency("loading-workers");
   PThread.loadWasmModuleToAllWorkers(() => removeRunDependency("loading-workers"));
  });
 },
 initWorker() {
  PThread["receiveObjectTransfer"] = PThread.receiveObjectTransfer;
  PThread["threadInitTLS"] = PThread.threadInitTLS;
  PThread["setExitStatus"] = PThread.setExitStatus;
  noExitRuntime = false;
 },
 setExitStatus: status => EXITSTATUS = status,
 terminateAllThreads__deps: [ "$terminateWorker" ],
 terminateAllThreads: () => {
  assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! terminateAllThreads() can only ever be called from main application thread!");
  for (var worker of PThread.runningWorkers) {
   terminateWorker(worker);
  }
  for (var worker of PThread.unusedWorkers) {
   terminateWorker(worker);
  }
  PThread.unusedWorkers = [];
  PThread.runningWorkers = [];
  PThread.pthreads = [];
 },
 returnWorkerToPool: worker => {
  var pthread_ptr = worker.pthread_ptr;
  delete PThread.pthreads[pthread_ptr];
  PThread.unusedWorkers.push(worker);
  PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
  worker.pthread_ptr = 0;
  __emscripten_thread_free_data(pthread_ptr);
 },
 receiveObjectTransfer(data) {},
 threadInitTLS() {
  PThread.tlsInitFunctions.forEach(f => f());
 },
 loadWasmModuleToWorker: worker => new Promise(onFinishedLoading => {
  worker.onmessage = e => {
   var d = e["data"];
   var cmd = d["cmd"];
   if (d["targetThread"] && d["targetThread"] != _pthread_self()) {
    var targetWorker = PThread.pthreads[d["targetThread"]];
    if (targetWorker) {
     targetWorker.postMessage(d, d["transferList"]);
    } else {
     err(`Internal error! Worker sent a message "${cmd}" to target pthread ${d["targetThread"]}, but that thread no longer exists!`);
    }
    return;
   }
   if (cmd === "checkMailbox") {
    checkMailbox();
   } else if (cmd === "spawnThread") {
    spawnThread(d);
   } else if (cmd === "cleanupThread") {
    cleanupThread(d["thread"]);
   } else if (cmd === "killThread") {
    killThread(d["thread"]);
   } else if (cmd === "cancelThread") {
    cancelThread(d["thread"]);
   } else if (cmd === "loaded") {
    worker.loaded = true;
    onFinishedLoading(worker);
   } else if (cmd === "alert") {
    alert(`Thread ${d["threadId"]}: ${d["text"]}`);
   } else if (d.target === "setimmediate") {
    worker.postMessage(d);
   } else if (cmd === "callHandler") {
    Module[d["handler"]](...d["args"]);
   } else if (cmd) {
    err(`worker sent an unknown command ${cmd}`);
   }
  };
  worker.onerror = e => {
   var message = "worker sent an error!";
   if (worker.pthread_ptr) {
    message = `Pthread ${ptrToString(worker.pthread_ptr)} sent an error!`;
   }
   err(`${message} ${e.filename}:${e.lineno}: ${e.message}`);
   throw e;
  };
  assert(wasmMemory instanceof WebAssembly.Memory, "WebAssembly memory should have been loaded by now!");
  assert(wasmModule instanceof WebAssembly.Module, "WebAssembly Module should have been loaded by now!");
  var handlers = [];
  var knownHandlers = [ "onExit", "onAbort", "print", "printErr" ];
  for (var handler of knownHandlers) {
   if (Module.hasOwnProperty(handler)) {
    handlers.push(handler);
   }
  }
  worker.workerID = PThread.nextWorkerID++;
  worker.postMessage({
   "cmd": "load",
   "handlers": handlers,
   "urlOrBlob": Module["mainScriptUrlOrBlob"],
   "wasmMemory": wasmMemory,
   "wasmModule": wasmModule,
   "workerID": worker.workerID
  });
 }),
 loadWasmModuleToAllWorkers(onMaybeReady) {
  onMaybeReady();
 },
 allocateUnusedWorker() {
  var worker;
  if (!Module["locateFile"]) {
   worker = new Worker(new URL("edfviewer.worker.mjs", import.meta.url), {
    type: "module"
   });
  } else {
   var pthreadMainJs = locateFile("edfviewer.worker.mjs");
   worker = new Worker(pthreadMainJs, {
    type: "module"
   });
  }
  PThread.unusedWorkers.push(worker);
 },
 getNewWorker() {
  if (PThread.unusedWorkers.length == 0) {
   err("Tried to spawn a new thread, but the thread pool is exhausted.\n" + "This might result in a deadlock unless some threads eventually exit or the code explicitly breaks out to the event loop.\n" + "If you want to increase the pool size, use setting `-sPTHREAD_POOL_SIZE=...`." + "\nIf you want to throw an explicit error instead of the risk of deadlocking in those cases, use setting `-sPTHREAD_POOL_SIZE_STRICT=2`.");
   PThread.allocateUnusedWorker();
   PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0]);
  }
  return PThread.unusedWorkers.pop();
 }
};

Module["PThread"] = PThread;

var callRuntimeCallbacks = callbacks => {
 while (callbacks.length > 0) {
  callbacks.shift()(Module);
 }
};

var establishStackSpace = () => {
 var pthread_ptr = _pthread_self();
 var stackHigh = GROWABLE_HEAP_U32()[(((pthread_ptr) + (52)) >> 2)];
 var stackSize = GROWABLE_HEAP_U32()[(((pthread_ptr) + (56)) >> 2)];
 var stackLow = stackHigh - stackSize;
 assert(stackHigh != 0);
 assert(stackLow != 0);
 assert(stackHigh > stackLow, "stackHigh must be higher then stackLow");
 _emscripten_stack_set_limits(stackHigh, stackLow);
 stackRestore(stackHigh);
 writeStackCookie();
};

Module["establishStackSpace"] = establishStackSpace;

function exitOnMainThread(returnCode) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(1, 0, 0, returnCode);
 _exit(returnCode);
}

/**
     * @param {number} ptr
     * @param {string} type
     */ function getValue(ptr, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  return GROWABLE_HEAP_I8()[ptr];

 case "i8":
  return GROWABLE_HEAP_I8()[ptr];

 case "i16":
  return GROWABLE_HEAP_I16()[((ptr) >> 1)];

 case "i32":
  return GROWABLE_HEAP_I32()[((ptr) >> 2)];

 case "i64":
  abort("to do getValue(i64) use WASM_BIGINT");

 case "float":
  return GROWABLE_HEAP_F32()[((ptr) >> 2)];

 case "double":
  return GROWABLE_HEAP_F64()[((ptr) >> 3)];

 case "*":
  return GROWABLE_HEAP_U32()[((ptr) >> 2)];

 default:
  abort(`invalid type for getValue: ${type}`);
 }
}

var wasmTableMirror = [];

var wasmTable;

var getWasmTableEntry = funcPtr => {
 var func = wasmTableMirror[funcPtr];
 if (!func) {
  if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
  wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
 }
 assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
 return func;
};

var invokeEntryPoint = (ptr, arg) => {
 runtimeKeepaliveCounter = 0;
 var result = getWasmTableEntry(ptr)(arg);
 checkStackCookie();
 function finish(result) {
  if (keepRuntimeAlive()) {
   PThread.setExitStatus(result);
  } else {
   __emscripten_thread_exit(result);
  }
 }
 finish(result);
};

Module["invokeEntryPoint"] = invokeEntryPoint;

var noExitRuntime = Module["noExitRuntime"] || false;

var registerTLSInit = tlsInitFunc => PThread.tlsInitFunctions.push(tlsInitFunc);

/**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */ function setValue(ptr, value, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  GROWABLE_HEAP_I8()[ptr] = value;
  break;

 case "i8":
  GROWABLE_HEAP_I8()[ptr] = value;
  break;

 case "i16":
  GROWABLE_HEAP_I16()[((ptr) >> 1)] = value;
  break;

 case "i32":
  GROWABLE_HEAP_I32()[((ptr) >> 2)] = value;
  break;

 case "i64":
  abort("to do setValue(i64) use WASM_BIGINT");

 case "float":
  GROWABLE_HEAP_F32()[((ptr) >> 2)] = value;
  break;

 case "double":
  GROWABLE_HEAP_F64()[((ptr) >> 3)] = value;
  break;

 case "*":
  GROWABLE_HEAP_U32()[((ptr) >> 2)] = value;
  break;

 default:
  abort(`invalid type for setValue: ${type}`);
 }
}

var warnOnce = text => {
 warnOnce.shown ||= {};
 if (!warnOnce.shown[text]) {
  warnOnce.shown[text] = 1;
  err(text);
 }
};

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
  return UTF8Decoder.decode(heapOrArray.buffer instanceof SharedArrayBuffer ? heapOrArray.slice(idx, endPtr) : heapOrArray.subarray(idx, endPtr));
 }
 var str = "";
 while (idx < endPtr) {
  var u0 = heapOrArray[idx++];
  if (!(u0 & 128)) {
   str += String.fromCharCode(u0);
   continue;
  }
  var u1 = heapOrArray[idx++] & 63;
  if ((u0 & 224) == 192) {
   str += String.fromCharCode(((u0 & 31) << 6) | u1);
   continue;
  }
  var u2 = heapOrArray[idx++] & 63;
  if ((u0 & 240) == 224) {
   u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
  } else {
   if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
   u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
  }
  if (u0 < 65536) {
   str += String.fromCharCode(u0);
  } else {
   var ch = u0 - 65536;
   str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
  }
 }
 return str;
};

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead) => {
 assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
 return ptr ? UTF8ArrayToString(GROWABLE_HEAP_U8(), ptr, maxBytesToRead) : "";
};

var ___assert_fail = (condition, filename, line, func) => {
 abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);
};

class ExceptionInfo {
 constructor(excPtr) {
  this.excPtr = excPtr;
  this.ptr = excPtr - 24;
 }
 set_type(type) {
  GROWABLE_HEAP_U32()[(((this.ptr) + (4)) >> 2)] = type;
 }
 get_type() {
  return GROWABLE_HEAP_U32()[(((this.ptr) + (4)) >> 2)];
 }
 set_destructor(destructor) {
  GROWABLE_HEAP_U32()[(((this.ptr) + (8)) >> 2)] = destructor;
 }
 get_destructor() {
  return GROWABLE_HEAP_U32()[(((this.ptr) + (8)) >> 2)];
 }
 set_caught(caught) {
  caught = caught ? 1 : 0;
  GROWABLE_HEAP_I8()[(this.ptr) + (12)] = caught;
 }
 get_caught() {
  return GROWABLE_HEAP_I8()[(this.ptr) + (12)] != 0;
 }
 set_rethrown(rethrown) {
  rethrown = rethrown ? 1 : 0;
  GROWABLE_HEAP_I8()[(this.ptr) + (13)] = rethrown;
 }
 get_rethrown() {
  return GROWABLE_HEAP_I8()[(this.ptr) + (13)] != 0;
 }
 init(type, destructor) {
  this.set_adjusted_ptr(0);
  this.set_type(type);
  this.set_destructor(destructor);
 }
 set_adjusted_ptr(adjustedPtr) {
  GROWABLE_HEAP_U32()[(((this.ptr) + (16)) >> 2)] = adjustedPtr;
 }
 get_adjusted_ptr() {
  return GROWABLE_HEAP_U32()[(((this.ptr) + (16)) >> 2)];
 }
 get_exception_ptr() {
  var isPointer = ___cxa_is_pointer_type(this.get_type());
  if (isPointer) {
   return GROWABLE_HEAP_U32()[((this.excPtr) >> 2)];
  }
  var adjusted = this.get_adjusted_ptr();
  if (adjusted !== 0) return adjusted;
  return this.excPtr;
 }
}

var exceptionLast = 0;

var uncaughtExceptionCount = 0;

var ___cxa_throw = (ptr, type, destructor) => {
 var info = new ExceptionInfo(ptr);
 info.init(type, destructor);
 exceptionLast = ptr;
 uncaughtExceptionCount++;
 assert(false, "Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.");
};

var ___emscripten_init_main_thread_js = tb => {
 __emscripten_thread_init(tb, /*is_main=*/ !ENVIRONMENT_IS_WORKER, /*is_runtime=*/ 1, /*can_block=*/ !ENVIRONMENT_IS_WEB, /*default_stacksize=*/ 65536, /*start_profiling=*/ false);
 PThread.threadInitTLS();
};

var ___emscripten_thread_cleanup = thread => {
 if (!ENVIRONMENT_IS_PTHREAD) cleanupThread(thread); else postMessage({
  "cmd": "cleanupThread",
  "thread": thread
 });
};

var structRegistrations = {};

var runDestructors = destructors => {
 while (destructors.length) {
  var ptr = destructors.pop();
  var del = destructors.pop();
  del(ptr);
 }
};

/** @suppress {globalThis} */ function readPointer(pointer) {
 return this["fromWireType"](GROWABLE_HEAP_U32()[((pointer) >> 2)]);
}

var awaitingDependencies = {};

var registeredTypes = {};

var typeDependencies = {};

var InternalError;

var throwInternalError = message => {
 throw new InternalError(message);
};

var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
 myTypes.forEach(function(type) {
  typeDependencies[type] = dependentTypes;
 });
 function onComplete(typeConverters) {
  var myTypeConverters = getTypeConverters(typeConverters);
  if (myTypeConverters.length !== myTypes.length) {
   throwInternalError("Mismatched type converter count");
  }
  for (var i = 0; i < myTypes.length; ++i) {
   registerType(myTypes[i], myTypeConverters[i]);
  }
 }
 var typeConverters = new Array(dependentTypes.length);
 var unregisteredTypes = [];
 var registered = 0;
 dependentTypes.forEach((dt, i) => {
  if (registeredTypes.hasOwnProperty(dt)) {
   typeConverters[i] = registeredTypes[dt];
  } else {
   unregisteredTypes.push(dt);
   if (!awaitingDependencies.hasOwnProperty(dt)) {
    awaitingDependencies[dt] = [];
   }
   awaitingDependencies[dt].push(() => {
    typeConverters[i] = registeredTypes[dt];
    ++registered;
    if (registered === unregisteredTypes.length) {
     onComplete(typeConverters);
    }
   });
  }
 });
 if (0 === unregisteredTypes.length) {
  onComplete(typeConverters);
 }
};

var __embind_finalize_value_object = structType => {
 var reg = structRegistrations[structType];
 delete structRegistrations[structType];
 var rawConstructor = reg.rawConstructor;
 var rawDestructor = reg.rawDestructor;
 var fieldRecords = reg.fields;
 var fieldTypes = fieldRecords.map(field => field.getterReturnType).concat(fieldRecords.map(field => field.setterArgumentType));
 whenDependentTypesAreResolved([ structType ], fieldTypes, fieldTypes => {
  var fields = {};
  fieldRecords.forEach((field, i) => {
   var fieldName = field.fieldName;
   var getterReturnType = fieldTypes[i];
   var getter = field.getter;
   var getterContext = field.getterContext;
   var setterArgumentType = fieldTypes[i + fieldRecords.length];
   var setter = field.setter;
   var setterContext = field.setterContext;
   fields[fieldName] = {
    read: ptr => getterReturnType["fromWireType"](getter(getterContext, ptr)),
    write: (ptr, o) => {
     var destructors = [];
     setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
     runDestructors(destructors);
    }
   };
  });
  return [ {
   name: reg.name,
   "fromWireType": ptr => {
    var rv = {};
    for (var i in fields) {
     rv[i] = fields[i].read(ptr);
    }
    rawDestructor(ptr);
    return rv;
   },
   "toWireType": (destructors, o) => {
    for (var fieldName in fields) {
     if (!(fieldName in o)) {
      throw new TypeError(`Missing field: "${fieldName}"`);
     }
    }
    var ptr = rawConstructor();
    for (fieldName in fields) {
     fields[fieldName].write(ptr, o[fieldName]);
    }
    if (destructors !== null) {
     destructors.push(rawDestructor, ptr);
    }
    return ptr;
   },
   "argPackAdvance": GenericWireTypeSize,
   "readValueFromPointer": readPointer,
   destructorFunction: rawDestructor
  } ];
 });
};

var __embind_register_bigint = (primitiveType, name, size, minRange, maxRange) => {};

var embind_init_charCodes = () => {
 var codes = new Array(256);
 for (var i = 0; i < 256; ++i) {
  codes[i] = String.fromCharCode(i);
 }
 embind_charCodes = codes;
};

var embind_charCodes;

var readLatin1String = ptr => {
 var ret = "";
 var c = ptr;
 while (GROWABLE_HEAP_U8()[c]) {
  ret += embind_charCodes[GROWABLE_HEAP_U8()[c++]];
 }
 return ret;
};

var BindingError;

var throwBindingError = message => {
 throw new BindingError(message);
};

/** @param {Object=} options */ function sharedRegisterType(rawType, registeredInstance, options = {}) {
 var name = registeredInstance.name;
 if (!rawType) {
  throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
 }
 if (registeredTypes.hasOwnProperty(rawType)) {
  if (options.ignoreDuplicateRegistrations) {
   return;
  } else {
   throwBindingError(`Cannot register type '${name}' twice`);
  }
 }
 registeredTypes[rawType] = registeredInstance;
 delete typeDependencies[rawType];
 if (awaitingDependencies.hasOwnProperty(rawType)) {
  var callbacks = awaitingDependencies[rawType];
  delete awaitingDependencies[rawType];
  callbacks.forEach(cb => cb());
 }
}

/** @param {Object=} options */ function registerType(rawType, registeredInstance, options = {}) {
 if (!("argPackAdvance" in registeredInstance)) {
  throw new TypeError("registerType registeredInstance requires argPackAdvance");
 }
 return sharedRegisterType(rawType, registeredInstance, options);
}

var GenericWireTypeSize = 8;

/** @suppress {globalThis} */ var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": function(wt) {
   return !!wt;
  },
  "toWireType": function(destructors, o) {
   return o ? trueValue : falseValue;
  },
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": function(pointer) {
   return this["fromWireType"](GROWABLE_HEAP_U8()[pointer]);
  },
  destructorFunction: null
 });
};

var emval_freelist = [];

var emval_handles = [];

var __emval_decref = handle => {
 if (handle > 9 && 0 === --emval_handles[handle + 1]) {
  assert(emval_handles[handle] !== undefined, `Decref for unallocated handle.`);
  emval_handles[handle] = undefined;
  emval_freelist.push(handle);
 }
};

var count_emval_handles = () => emval_handles.length / 2 - 5 - emval_freelist.length;

var init_emval = () => {
 emval_handles.push(0, 1, undefined, 1, null, 1, true, 1, false, 1);
 assert(emval_handles.length === 5 * 2);
 Module["count_emval_handles"] = count_emval_handles;
};

var Emval = {
 toValue: handle => {
  if (!handle) {
   throwBindingError("Cannot use deleted val. handle = " + handle);
  }
  assert(handle === 2 || emval_handles[handle] !== undefined && handle % 2 === 0, `invalid handle: ${handle}`);
  return emval_handles[handle];
 },
 toHandle: value => {
  switch (value) {
  case undefined:
   return 2;

  case null:
   return 4;

  case true:
   return 6;

  case false:
   return 8;

  default:
   {
    const handle = emval_freelist.pop() || emval_handles.length;
    emval_handles[handle] = value;
    emval_handles[handle + 1] = 1;
    return handle;
   }
  }
 }
};

var EmValType = {
 name: "emscripten::val",
 "fromWireType": handle => {
  var rv = Emval.toValue(handle);
  __emval_decref(handle);
  return rv;
 },
 "toWireType": (destructors, value) => Emval.toHandle(value),
 "argPackAdvance": GenericWireTypeSize,
 "readValueFromPointer": readPointer,
 destructorFunction: null
};

var __embind_register_emval = rawType => registerType(rawType, EmValType);

var embindRepr = v => {
 if (v === null) {
  return "null";
 }
 var t = typeof v;
 if (t === "object" || t === "array" || t === "function") {
  return v.toString();
 } else {
  return "" + v;
 }
};

var floatReadValueFromPointer = (name, width) => {
 switch (width) {
 case 4:
  return function(pointer) {
   return this["fromWireType"](GROWABLE_HEAP_F32()[((pointer) >> 2)]);
  };

 case 8:
  return function(pointer) {
   return this["fromWireType"](GROWABLE_HEAP_F64()[((pointer) >> 3)]);
  };

 default:
  throw new TypeError(`invalid float width (${width}): ${name}`);
 }
};

var __embind_register_float = (rawType, name, size) => {
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": value => value,
  "toWireType": (destructors, value) => {
   if (typeof value != "number" && typeof value != "boolean") {
    throw new TypeError(`Cannot convert ${embindRepr(value)} to ${this.name}`);
   }
   return value;
  },
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": floatReadValueFromPointer(name, size),
  destructorFunction: null
 });
};

var createNamedFunction = (name, body) => Object.defineProperty(body, "name", {
 value: name
});

function usesDestructorStack(argTypes) {
 for (var i = 1; i < argTypes.length; ++i) {
  if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
   return true;
  }
 }
 return false;
}

function newFunc(constructor, argumentList) {
 if (!(constructor instanceof Function)) {
  throw new TypeError(`new_ called with constructor type ${typeof (constructor)} which is not a function`);
 }
 /*
       * Previously, the following line was just:
       *   function dummy() {};
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even
       * though at creation, the 'dummy' has the correct constructor name.  Thus,
       * objects created with IMVU.new would show up in the debugger as 'dummy',
       * which isn't very helpful.  Using IMVU.createNamedFunction addresses the
       * issue.  Doubly-unfortunately, there's no way to write a test for this
       * behavior.  -NRD 2013.02.22
       */ var dummy = createNamedFunction(constructor.name || "unknownFunctionName", function() {});
 dummy.prototype = constructor.prototype;
 var obj = new dummy;
 var r = constructor.apply(obj, argumentList);
 return (r instanceof Object) ? r : obj;
}

function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
 var needsDestructorStack = usesDestructorStack(argTypes);
 var argCount = argTypes.length;
 var argsList = "";
 var argsListWired = "";
 for (var i = 0; i < argCount - 2; ++i) {
  argsList += (i !== 0 ? ", " : "") + "arg" + i;
  argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired";
 }
 var invokerFnBody = `\n        return function (${argsList}) {\n        if (arguments.length !== ${argCount - 2}) {\n          throwBindingError('function ' + humanName + ' called with ' + arguments.length + ' arguments, expected ${argCount - 2}');\n        }`;
 if (needsDestructorStack) {
  invokerFnBody += "var destructors = [];\n";
 }
 var dtorStack = needsDestructorStack ? "destructors" : "null";
 var args1 = [ "humanName", "throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam" ];
 if (isClassMethodFunc) {
  invokerFnBody += "var thisWired = classParam['toWireType'](" + dtorStack + ", this);\n";
 }
 for (var i = 0; i < argCount - 2; ++i) {
  invokerFnBody += "var arg" + i + "Wired = argType" + i + "['toWireType'](" + dtorStack + ", arg" + i + ");\n";
  args1.push("argType" + i);
 }
 if (isClassMethodFunc) {
  argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
 }
 invokerFnBody += (returns || isAsync ? "var rv = " : "") + "invoker(fn" + (argsListWired.length > 0 ? ", " : "") + argsListWired + ");\n";
 var returnVal = returns ? "rv" : "";
 if (needsDestructorStack) {
  invokerFnBody += "runDestructors(destructors);\n";
 } else {
  for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
   var paramName = (i === 1 ? "thisWired" : ("arg" + (i - 2) + "Wired"));
   if (argTypes[i].destructorFunction !== null) {
    invokerFnBody += `${paramName}_dtor(${paramName});\n`;
    args1.push(`${paramName}_dtor`);
   }
  }
 }
 if (returns) {
  invokerFnBody += "var ret = retType['fromWireType'](rv);\n" + "return ret;\n";
 } else {}
 invokerFnBody += "}\n";
 invokerFnBody = `if (arguments.length !== ${args1.length}){ throw new Error(humanName + "Expected ${args1.length} closure arguments " + arguments.length + " given."); }\n${invokerFnBody}`;
 return [ args1, invokerFnBody ];
}

function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, /** boolean= */ isAsync) {
 var argCount = argTypes.length;
 if (argCount < 2) {
  throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
 }
 assert(!isAsync, "Async bindings are only supported with JSPI.");
 var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
 var needsDestructorStack = usesDestructorStack(argTypes);
 var returns = (argTypes[0].name !== "void");
 var closureArgs = [ humanName, throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1] ];
 for (var i = 0; i < argCount - 2; ++i) {
  closureArgs.push(argTypes[i + 2]);
 }
 if (!needsDestructorStack) {
  for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
   if (argTypes[i].destructorFunction !== null) {
    closureArgs.push(argTypes[i].destructorFunction);
   }
  }
 }
 let [args, invokerFnBody] = createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync);
 args.push(invokerFnBody);
 var invokerFn = newFunc(Function, args)(...closureArgs);
 return createNamedFunction(humanName, invokerFn);
}

var ensureOverloadTable = (proto, methodName, humanName) => {
 if (undefined === proto[methodName].overloadTable) {
  var prevFunc = proto[methodName];
  proto[methodName] = function(...args) {
   if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) {
    throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
   }
   return proto[methodName].overloadTable[args.length].apply(this, args);
  };
  proto[methodName].overloadTable = [];
  proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
 }
};

/** @param {number=} numArguments */ var exposePublicSymbol = (name, value, numArguments) => {
 if (Module.hasOwnProperty(name)) {
  if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
   throwBindingError(`Cannot register public name '${name}' twice`);
  }
  ensureOverloadTable(Module, name, name);
  if (Module.hasOwnProperty(numArguments)) {
   throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
  }
  Module[name].overloadTable[numArguments] = value;
 } else {
  Module[name] = value;
  if (undefined !== numArguments) {
   Module[name].numArguments = numArguments;
  }
 }
};

var heap32VectorToArray = (count, firstElement) => {
 var array = [];
 for (var i = 0; i < count; i++) {
  array.push(GROWABLE_HEAP_U32()[(((firstElement) + (i * 4)) >> 2)]);
 }
 return array;
};

/** @param {number=} numArguments */ var replacePublicSymbol = (name, value, numArguments) => {
 if (!Module.hasOwnProperty(name)) {
  throwInternalError("Replacing nonexistent public symbol");
 }
 if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
  Module[name].overloadTable[numArguments] = value;
 } else {
  Module[name] = value;
  Module[name].argCount = numArguments;
 }
};

var dynCallLegacy = (sig, ptr, args) => {
 assert(("dynCall_" + sig) in Module, `bad function pointer type - dynCall function not found for sig '${sig}'`);
 if (args?.length) {
  assert(args.length === sig.substring(1).replace(/j/g, "--").length);
 } else {
  assert(sig.length == 1);
 }
 var f = Module["dynCall_" + sig];
 return f(ptr, ...args);
};

var dynCall = (sig, ptr, args = []) => {
 if (sig.includes("j")) {
  return dynCallLegacy(sig, ptr, args);
 }
 assert(getWasmTableEntry(ptr), `missing table entry in dynCall: ${ptr}`);
 var rtn = getWasmTableEntry(ptr)(...args);
 return rtn;
};

var getDynCaller = (sig, ptr) => {
 assert(sig.includes("j") || sig.includes("p"), "getDynCaller should only be called with i64 sigs");
 return (...args) => dynCall(sig, ptr, args);
};

var embind__requireFunction = (signature, rawFunction) => {
 signature = readLatin1String(signature);
 function makeDynCaller() {
  if (signature.includes("j")) {
   return getDynCaller(signature, rawFunction);
  }
  return getWasmTableEntry(rawFunction);
 }
 var fp = makeDynCaller();
 if (typeof fp != "function") {
  throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
 }
 return fp;
};

var extendError = (baseErrorType, errorName) => {
 var errorClass = createNamedFunction(errorName, function(message) {
  this.name = errorName;
  this.message = message;
  var stack = (new Error(message)).stack;
  if (stack !== undefined) {
   this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
  }
 });
 errorClass.prototype = Object.create(baseErrorType.prototype);
 errorClass.prototype.constructor = errorClass;
 errorClass.prototype.toString = function() {
  if (this.message === undefined) {
   return this.name;
  } else {
   return `${this.name}: ${this.message}`;
  }
 };
 return errorClass;
};

var UnboundTypeError;

var getTypeName = type => {
 var ptr = ___getTypeName(type);
 var rv = readLatin1String(ptr);
 _free(ptr);
 return rv;
};

var throwUnboundTypeError = (message, types) => {
 var unboundTypes = [];
 var seen = {};
 function visit(type) {
  if (seen[type]) {
   return;
  }
  if (registeredTypes[type]) {
   return;
  }
  if (typeDependencies[type]) {
   typeDependencies[type].forEach(visit);
   return;
  }
  unboundTypes.push(type);
  seen[type] = true;
 }
 types.forEach(visit);
 throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([ ", " ]));
};

var getFunctionName = signature => {
 signature = signature.trim();
 const argsIndex = signature.indexOf("(");
 if (argsIndex !== -1) {
  assert(signature[signature.length - 1] == ")", "Parentheses for argument names should match.");
  return signature.substr(0, argsIndex);
 } else {
  return signature;
 }
};

var __embind_register_function = (name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync) => {
 var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
 name = readLatin1String(name);
 name = getFunctionName(name);
 rawInvoker = embind__requireFunction(signature, rawInvoker);
 exposePublicSymbol(name, function() {
  throwUnboundTypeError(`Cannot call ${name} due to unbound types`, argTypes);
 }, argCount - 1);
 whenDependentTypesAreResolved([], argTypes, argTypes => {
  var invokerArgsArray = [ argTypes[0], /* return value */ null ].concat(/* no class 'this'*/ argTypes.slice(1));
  /* actual params */ replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, /* no class 'this'*/ rawInvoker, fn, isAsync), argCount - 1);
  return [];
 });
};

var integerReadValueFromPointer = (name, width, signed) => {
 switch (width) {
 case 1:
  return signed ? pointer => GROWABLE_HEAP_I8()[pointer] : pointer => GROWABLE_HEAP_U8()[pointer];

 case 2:
  return signed ? pointer => GROWABLE_HEAP_I16()[((pointer) >> 1)] : pointer => GROWABLE_HEAP_U16()[((pointer) >> 1)];

 case 4:
  return signed ? pointer => GROWABLE_HEAP_I32()[((pointer) >> 2)] : pointer => GROWABLE_HEAP_U32()[((pointer) >> 2)];

 default:
  throw new TypeError(`invalid integer width (${width}): ${name}`);
 }
};

/** @suppress {globalThis} */ var __embind_register_integer = (primitiveType, name, size, minRange, maxRange) => {
 name = readLatin1String(name);
 if (maxRange === -1) {
  maxRange = 4294967295;
 }
 var fromWireType = value => value;
 if (minRange === 0) {
  var bitshift = 32 - 8 * size;
  fromWireType = value => (value << bitshift) >>> bitshift;
 }
 var isUnsignedType = (name.includes("unsigned"));
 var checkAssertions = (value, toTypeName) => {
  if (typeof value != "number" && typeof value != "boolean") {
   throw new TypeError(`Cannot convert "${embindRepr(value)}" to ${toTypeName}`);
  }
  if (value < minRange || value > maxRange) {
   throw new TypeError(`Passing a number "${embindRepr(value)}" from JS side to C/C++ side to an argument of type "${name}", which is outside the valid range [${minRange}, ${maxRange}]!`);
  }
 };
 var toWireType;
 if (isUnsignedType) {
  toWireType = function(destructors, value) {
   checkAssertions(value, this.name);
   return value >>> 0;
  };
 } else {
  toWireType = function(destructors, value) {
   checkAssertions(value, this.name);
   return value;
  };
 }
 registerType(primitiveType, {
  name: name,
  "fromWireType": fromWireType,
  "toWireType": toWireType,
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": integerReadValueFromPointer(name, size, minRange !== 0),
  destructorFunction: null
 });
};

var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
 var typeMapping = [ Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array ];
 var TA = typeMapping[dataTypeIndex];
 function decodeMemoryView(handle) {
  var size = GROWABLE_HEAP_U32()[((handle) >> 2)];
  var data = GROWABLE_HEAP_U32()[(((handle) + (4)) >> 2)];
  return new TA(GROWABLE_HEAP_I8().buffer, data, size);
 }
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": decodeMemoryView,
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": decodeMemoryView
 }, {
  ignoreDuplicateRegistrations: true
 });
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
 assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | (u1 & 1023);
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   heap[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   heap[outIdx++] = 192 | (u >> 6);
   heap[outIdx++] = 128 | (u & 63);
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   heap[outIdx++] = 224 | (u >> 12);
   heap[outIdx++] = 128 | ((u >> 6) & 63);
   heap[outIdx++] = 128 | (u & 63);
  } else {
   if (outIdx + 3 >= endIdx) break;
   if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
   heap[outIdx++] = 240 | (u >> 18);
   heap[outIdx++] = 128 | ((u >> 12) & 63);
   heap[outIdx++] = 128 | ((u >> 6) & 63);
   heap[outIdx++] = 128 | (u & 63);
  }
 }
 heap[outIdx] = 0;
 return outIdx - startIdx;
};

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
 assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
 return stringToUTF8Array(str, GROWABLE_HEAP_U8(), outPtr, maxBytesToWrite);
};

var lengthBytesUTF8 = str => {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var c = str.charCodeAt(i);
  if (c <= 127) {
   len++;
  } else if (c <= 2047) {
   len += 2;
  } else if (c >= 55296 && c <= 57343) {
   len += 4;
   ++i;
  } else {
   len += 3;
  }
 }
 return len;
};

var __embind_register_std_string = (rawType, name) => {
 name = readLatin1String(name);
 var stdStringIsUTF8 =  (name === "std::string");
 registerType(rawType, {
  name: name,
  "fromWireType"(value) {
   var length = GROWABLE_HEAP_U32()[((value) >> 2)];
   var payload = value + 4;
   var str;
   if (stdStringIsUTF8) {
    var decodeStartPtr = payload;
    for (var i = 0; i <= length; ++i) {
     var currentBytePtr = payload + i;
     if (i == length || GROWABLE_HEAP_U8()[currentBytePtr] == 0) {
      var maxRead = currentBytePtr - decodeStartPtr;
      var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
      if (str === undefined) {
       str = stringSegment;
      } else {
       str += String.fromCharCode(0);
       str += stringSegment;
      }
      decodeStartPtr = currentBytePtr + 1;
     }
    }
   } else {
    var a = new Array(length);
    for (var i = 0; i < length; ++i) {
     a[i] = String.fromCharCode(GROWABLE_HEAP_U8()[payload + i]);
    }
    str = a.join("");
   }
   _free(value);
   return str;
  },
  "toWireType"(destructors, value) {
   if (value instanceof ArrayBuffer) {
    value = new Uint8Array(value);
   }
   var length;
   var valueIsOfTypeString = (typeof value == "string");
   if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
    throwBindingError("Cannot pass non-string to std::string");
   }
   if (stdStringIsUTF8 && valueIsOfTypeString) {
    length = lengthBytesUTF8(value);
   } else {
    length = value.length;
   }
   var base = _malloc(4 + length + 1);
   var ptr = base + 4;
   GROWABLE_HEAP_U32()[((base) >> 2)] = length;
   if (stdStringIsUTF8 && valueIsOfTypeString) {
    stringToUTF8(value, ptr, length + 1);
   } else {
    if (valueIsOfTypeString) {
     for (var i = 0; i < length; ++i) {
      var charCode = value.charCodeAt(i);
      if (charCode > 255) {
       _free(ptr);
       throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
      }
      GROWABLE_HEAP_U8()[ptr + i] = charCode;
     }
    } else {
     for (var i = 0; i < length; ++i) {
      GROWABLE_HEAP_U8()[ptr + i] = value[i];
     }
    }
   }
   if (destructors !== null) {
    destructors.push(_free, base);
   }
   return base;
  },
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": readPointer,
  destructorFunction(ptr) {
   _free(ptr);
  }
 });
};

var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : undefined;

var UTF16ToString = (ptr, maxBytesToRead) => {
 assert(ptr % 2 == 0, "Pointer passed to UTF16ToString must be aligned to two bytes!");
 var endPtr = ptr;
 var idx = endPtr >> 1;
 var maxIdx = idx + maxBytesToRead / 2;
 while (!(idx >= maxIdx) && GROWABLE_HEAP_U16()[idx]) ++idx;
 endPtr = idx << 1;
 if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(GROWABLE_HEAP_U8().slice(ptr, endPtr));
 var str = "";
 for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
  var codeUnit = GROWABLE_HEAP_I16()[(((ptr) + (i * 2)) >> 1)];
  if (codeUnit == 0) break;
  str += String.fromCharCode(codeUnit);
 }
 return str;
};

var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
 assert(outPtr % 2 == 0, "Pointer passed to stringToUTF16 must be aligned to two bytes!");
 assert(typeof maxBytesToWrite == "number", "stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
 maxBytesToWrite ??= 2147483647;
 if (maxBytesToWrite < 2) return 0;
 maxBytesToWrite -= 2;
 var startPtr = outPtr;
 var numCharsToWrite = (maxBytesToWrite < str.length * 2) ? (maxBytesToWrite / 2) : str.length;
 for (var i = 0; i < numCharsToWrite; ++i) {
  var codeUnit = str.charCodeAt(i);
  GROWABLE_HEAP_I16()[((outPtr) >> 1)] = codeUnit;
  outPtr += 2;
 }
 GROWABLE_HEAP_I16()[((outPtr) >> 1)] = 0;
 return outPtr - startPtr;
};

var lengthBytesUTF16 = str => str.length * 2;

var UTF32ToString = (ptr, maxBytesToRead) => {
 assert(ptr % 4 == 0, "Pointer passed to UTF32ToString must be aligned to four bytes!");
 var i = 0;
 var str = "";
 while (!(i >= maxBytesToRead / 4)) {
  var utf32 = GROWABLE_HEAP_I32()[(((ptr) + (i * 4)) >> 2)];
  if (utf32 == 0) break;
  ++i;
  if (utf32 >= 65536) {
   var ch = utf32 - 65536;
   str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
  } else {
   str += String.fromCharCode(utf32);
  }
 }
 return str;
};

var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
 assert(outPtr % 4 == 0, "Pointer passed to stringToUTF32 must be aligned to four bytes!");
 assert(typeof maxBytesToWrite == "number", "stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
 maxBytesToWrite ??= 2147483647;
 if (maxBytesToWrite < 4) return 0;
 var startPtr = outPtr;
 var endPtr = startPtr + maxBytesToWrite - 4;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) {
   var trailSurrogate = str.charCodeAt(++i);
   codeUnit = 65536 + ((codeUnit & 1023) << 10) | (trailSurrogate & 1023);
  }
  GROWABLE_HEAP_I32()[((outPtr) >> 2)] = codeUnit;
  outPtr += 4;
  if (outPtr + 4 > endPtr) break;
 }
 GROWABLE_HEAP_I32()[((outPtr) >> 2)] = 0;
 return outPtr - startPtr;
};

var lengthBytesUTF32 = str => {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
  len += 4;
 }
 return len;
};

var __embind_register_std_wstring = (rawType, charSize, name) => {
 name = readLatin1String(name);
 var decodeString, encodeString, readCharAt, lengthBytesUTF;
 if (charSize === 2) {
  decodeString = UTF16ToString;
  encodeString = stringToUTF16;
  lengthBytesUTF = lengthBytesUTF16;
  readCharAt = pointer => GROWABLE_HEAP_U16()[((pointer) >> 1)];
 } else if (charSize === 4) {
  decodeString = UTF32ToString;
  encodeString = stringToUTF32;
  lengthBytesUTF = lengthBytesUTF32;
  readCharAt = pointer => GROWABLE_HEAP_U32()[((pointer) >> 2)];
 }
 registerType(rawType, {
  name: name,
  "fromWireType": value => {
   var length = GROWABLE_HEAP_U32()[((value) >> 2)];
   var str;
   var decodeStartPtr = value + 4;
   for (var i = 0; i <= length; ++i) {
    var currentBytePtr = value + 4 + i * charSize;
    if (i == length || readCharAt(currentBytePtr) == 0) {
     var maxReadBytes = currentBytePtr - decodeStartPtr;
     var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
     if (str === undefined) {
      str = stringSegment;
     } else {
      str += String.fromCharCode(0);
      str += stringSegment;
     }
     decodeStartPtr = currentBytePtr + charSize;
    }
   }
   _free(value);
   return str;
  },
  "toWireType": (destructors, value) => {
   if (!(typeof value == "string")) {
    throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
   }
   var length = lengthBytesUTF(value);
   var ptr = _malloc(4 + length + charSize);
   GROWABLE_HEAP_U32()[((ptr) >> 2)] = length / charSize;
   encodeString(value, ptr + 4, length + charSize);
   if (destructors !== null) {
    destructors.push(_free, ptr);
   }
   return ptr;
  },
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": readPointer,
  destructorFunction(ptr) {
   _free(ptr);
  }
 });
};

var __embind_register_value_object = (rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) => {
 structRegistrations[rawType] = {
  name: readLatin1String(name),
  rawConstructor: embind__requireFunction(constructorSignature, rawConstructor),
  rawDestructor: embind__requireFunction(destructorSignature, rawDestructor),
  fields: []
 };
};

var __embind_register_value_object_field = (structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) => {
 structRegistrations[structType].fields.push({
  fieldName: readLatin1String(fieldName),
  getterReturnType: getterReturnType,
  getter: embind__requireFunction(getterSignature, getter),
  getterContext: getterContext,
  setterArgumentType: setterArgumentType,
  setter: embind__requireFunction(setterSignature, setter),
  setterContext: setterContext
 });
};

var __embind_register_void = (rawType, name) => {
 name = readLatin1String(name);
 registerType(rawType, {
  isVoid: true,
  name: name,
  "argPackAdvance": 0,
  "fromWireType": () => undefined,
  "toWireType": (destructors, o) => undefined
 });
};

var nowIsMonotonic = 1;

var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;

var maybeExit = () => {
 if (runtimeExited) {
  return;
 }
 if (!keepRuntimeAlive()) {
  try {
   if (ENVIRONMENT_IS_PTHREAD) __emscripten_thread_exit(EXITSTATUS); else _exit(EXITSTATUS);
  } catch (e) {
   handleException(e);
  }
 }
};

var callUserCallback = func => {
 if (runtimeExited || ABORT) {
  err("user callback triggered after runtime exited or application aborted.  Ignoring.");
  return;
 }
 try {
  func();
  maybeExit();
 } catch (e) {
  handleException(e);
 }
};

var __emscripten_thread_mailbox_await = pthread_ptr => {
 if (typeof Atomics.waitAsync === "function") {
  var wait = Atomics.waitAsync(GROWABLE_HEAP_I32(), ((pthread_ptr) >> 2), pthread_ptr);
  assert(wait.async);
  wait.value.then(checkMailbox);
  var waitingAsync = pthread_ptr + 128;
  Atomics.store(GROWABLE_HEAP_I32(), ((waitingAsync) >> 2), 1);
 }
};

Module["__emscripten_thread_mailbox_await"] = __emscripten_thread_mailbox_await;

var checkMailbox = () => {
 var pthread_ptr = _pthread_self();
 if (pthread_ptr) {
  __emscripten_thread_mailbox_await(pthread_ptr);
  callUserCallback(__emscripten_check_mailbox);
 }
};

Module["checkMailbox"] = checkMailbox;

var __emscripten_notify_mailbox_postmessage = (targetThreadId, currThreadId, mainThreadId) => {
 if (targetThreadId == currThreadId) {
  setTimeout(checkMailbox);
 } else if (ENVIRONMENT_IS_PTHREAD) {
  postMessage({
   "targetThread": targetThreadId,
   "cmd": "checkMailbox"
  });
 } else {
  var worker = PThread.pthreads[targetThreadId];
  if (!worker) {
   err(`Cannot send message to thread with ID ${targetThreadId}, unknown thread ID!`);
   return;
  }
  worker.postMessage({
   "cmd": "checkMailbox"
  });
 }
};

var proxiedJSCallArgs = [];

var __emscripten_receive_on_main_thread_js = (funcIndex, emAsmAddr, callingThread, numCallArgs, args) => {
 proxiedJSCallArgs.length = numCallArgs;
 var b = ((args) >> 3);
 for (var i = 0; i < numCallArgs; i++) {
  proxiedJSCallArgs[i] = GROWABLE_HEAP_F64()[b + i];
 }
 assert(!emAsmAddr);
 var func = proxiedFunctionTable[funcIndex];
 assert(!(funcIndex && emAsmAddr));
 assert(func.length == numCallArgs, "Call args mismatch in _emscripten_receive_on_main_thread_js");
 PThread.currentProxiedOperationCallerThread = callingThread;
 var rtn = func(...proxiedJSCallArgs);
 PThread.currentProxiedOperationCallerThread = 0;
 assert(typeof rtn != "bigint");
 return rtn;
};

var __emscripten_thread_set_strongref = thread => {};

function __gmtime_js(time_low, time_high, tmPtr) {
 var time = convertI32PairToI53Checked(time_low, time_high);
 var date = new Date(time * 1e3);
 GROWABLE_HEAP_I32()[((tmPtr) >> 2)] = date.getUTCSeconds();
 GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >> 2)] = date.getUTCMinutes();
 GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >> 2)] = date.getUTCHours();
 GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >> 2)] = date.getUTCDate();
 GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >> 2)] = date.getUTCMonth();
 GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >> 2)] = date.getUTCFullYear() - 1900;
 GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >> 2)] = date.getUTCDay();
 var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
 var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
 GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >> 2)] = yday;
}

var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

var ydayFromDate = date => {
 var leap = isLeapYear(date.getFullYear());
 var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
 var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
 return yday;
};

function __localtime_js(time_low, time_high, tmPtr) {
 var time = convertI32PairToI53Checked(time_low, time_high);
 var date = new Date(time * 1e3);
 GROWABLE_HEAP_I32()[((tmPtr) >> 2)] = date.getSeconds();
 GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >> 2)] = date.getMinutes();
 GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >> 2)] = date.getHours();
 GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >> 2)] = date.getDate();
 GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >> 2)] = date.getMonth();
 GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >> 2)] = date.getFullYear() - 1900;
 GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >> 2)] = date.getDay();
 var yday = ydayFromDate(date) | 0;
 GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >> 2)] = yday;
 GROWABLE_HEAP_I32()[(((tmPtr) + (36)) >> 2)] = -(date.getTimezoneOffset() * 60);
 var start = new Date(date.getFullYear(), 0, 1);
 var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
 GROWABLE_HEAP_I32()[(((tmPtr) + (32)) >> 2)] = dst;
}

var __mktime_js = function(tmPtr) {
 var ret = (() => {
  var date = new Date(GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >> 2)] + 1900, GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >> 2)], GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >> 2)], GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >> 2)], GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >> 2)], GROWABLE_HEAP_I32()[((tmPtr) >> 2)], 0);
  var dst = GROWABLE_HEAP_I32()[(((tmPtr) + (32)) >> 2)];
  var guessedOffset = date.getTimezoneOffset();
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dstOffset = Math.min(winterOffset, summerOffset);
  if (dst < 0) {
   GROWABLE_HEAP_I32()[(((tmPtr) + (32)) >> 2)] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
  } else if ((dst > 0) != (dstOffset == guessedOffset)) {
   var nonDstOffset = Math.max(winterOffset, summerOffset);
   var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
   date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
  }
  GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >> 2)] = date.getDay();
  var yday = ydayFromDate(date) | 0;
  GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >> 2)] = yday;
  GROWABLE_HEAP_I32()[((tmPtr) >> 2)] = date.getSeconds();
  GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >> 2)] = date.getMinutes();
  GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >> 2)] = date.getHours();
  GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >> 2)] = date.getDate();
  GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >> 2)] = date.getMonth();
  GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >> 2)] = date.getYear();
  var timeMs = date.getTime();
  if (isNaN(timeMs)) {
   return -1;
  }
  return timeMs / 1e3;
 })();
 return (setTempRet0((tempDouble = ret, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0)), 
 ret >>> 0);
};

var __timegm_js = function(tmPtr) {
 var ret = (() => {
  var time = Date.UTC(GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >> 2)] + 1900, GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >> 2)], GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >> 2)], GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >> 2)], GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >> 2)], GROWABLE_HEAP_I32()[((tmPtr) >> 2)], 0);
  var date = new Date(time);
  GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >> 2)] = date.getUTCDay();
  var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
  GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >> 2)] = yday;
  return date.getTime() / 1e3;
 })();
 return (setTempRet0((tempDouble = ret, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0)), 
 ret >>> 0);
};

var __tzset_js = (timezone, daylight, std_name, dst_name) => {
 var currentYear = (new Date).getFullYear();
 var winter = new Date(currentYear, 0, 1);
 var summer = new Date(currentYear, 6, 1);
 var winterOffset = winter.getTimezoneOffset();
 var summerOffset = summer.getTimezoneOffset();
 var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
 GROWABLE_HEAP_U32()[((timezone) >> 2)] = stdTimezoneOffset * 60;
 GROWABLE_HEAP_I32()[((daylight) >> 2)] = Number(winterOffset != summerOffset);
 function extractZone(date) {
  var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
  return match ? match[1] : "GMT";
 }
 var winterName = extractZone(winter);
 var summerName = extractZone(summer);
 if (summerOffset < winterOffset) {
  stringToUTF8(winterName, std_name, 7);
  stringToUTF8(summerName, dst_name, 7);
 } else {
  stringToUTF8(winterName, dst_name, 7);
  stringToUTF8(summerName, std_name, 7);
 }
};

var _abort = () => {
 abort("native code called abort()");
};

var _emscripten_check_blocking_allowed = () => {
 if (ENVIRONMENT_IS_WORKER) return;
 warnOnce("Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread");
};

var _emscripten_date_now = () => Date.now();

var runtimeKeepalivePush = () => {
 runtimeKeepaliveCounter += 1;
};

var _emscripten_exit_with_live_runtime = () => {
 runtimeKeepalivePush();
 throw "unwind";
};

var JSEvents = {
 removeAllEventListeners() {
  while (JSEvents.eventHandlers.length) {
   JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
  }
  JSEvents.deferredCalls = [];
 },
 registerRemoveEventListeners() {
  if (!JSEvents.removeEventListenersRegistered) {
   __ATEXIT__.push(JSEvents.removeAllEventListeners);
   JSEvents.removeEventListenersRegistered = true;
  }
 },
 inEventHandler: 0,
 deferredCalls: [],
 deferCall(targetFunction, precedence, argsList) {
  function arraysHaveEqualContent(arrA, arrB) {
   if (arrA.length != arrB.length) return false;
   for (var i in arrA) {
    if (arrA[i] != arrB[i]) return false;
   }
   return true;
  }
  for (var i in JSEvents.deferredCalls) {
   var call = JSEvents.deferredCalls[i];
   if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
    return;
   }
  }
  JSEvents.deferredCalls.push({
   targetFunction: targetFunction,
   precedence: precedence,
   argsList: argsList
  });
  JSEvents.deferredCalls.sort((x, y) => x.precedence < y.precedence);
 },
 removeDeferredCalls(targetFunction) {
  for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
   if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
    JSEvents.deferredCalls.splice(i, 1);
    --i;
   }
  }
 },
 canPerformEventHandlerRequests() {
  if (navigator.userActivation) {
   return navigator.userActivation.isActive;
  }
  return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
 },
 runDeferredCalls() {
  if (!JSEvents.canPerformEventHandlerRequests()) {
   return;
  }
  for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
   var call = JSEvents.deferredCalls[i];
   JSEvents.deferredCalls.splice(i, 1);
   --i;
   call.targetFunction(...call.argsList);
  }
 },
 eventHandlers: [],
 removeAllHandlersOnTarget: (target, eventTypeString) => {
  for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
   if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
    JSEvents._removeHandler(i--);
   }
  }
 },
 _removeHandler(i) {
  var h = JSEvents.eventHandlers[i];
  h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
  JSEvents.eventHandlers.splice(i, 1);
 },
 registerOrRemoveHandler(eventHandler) {
  if (!eventHandler.target) {
   err("registerOrRemoveHandler: the target element for event handler registration does not exist, when processing the following event handler registration:");
   console.dir(eventHandler);
   return -4;
  }
  if (eventHandler.callbackfunc) {
   eventHandler.eventListenerFunc = function(event) {
    ++JSEvents.inEventHandler;
    JSEvents.currentEventHandler = eventHandler;
    JSEvents.runDeferredCalls();
    eventHandler.handlerFunc(event);
    JSEvents.runDeferredCalls();
    --JSEvents.inEventHandler;
   };
   eventHandler.target.addEventListener(eventHandler.eventTypeString, eventHandler.eventListenerFunc, eventHandler.useCapture);
   JSEvents.eventHandlers.push(eventHandler);
   JSEvents.registerRemoveEventListeners();
  } else {
   for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
    if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
     JSEvents._removeHandler(i--);
    }
   }
  }
  return 0;
 },
 getTargetThreadForEventCallback(targetThread) {
  switch (targetThread) {
  case 1:
   return 0;

  case 2:
   return PThread.currentProxiedOperationCallerThread;

  default:
   return targetThread;
  }
 },
 getNodeNameForTarget(target) {
  if (!target) return "";
  if (target == window) return "#window";
  if (target == screen) return "#screen";
  return target?.nodeName || "";
 },
 fullscreenEnabled() {
  return document.fullscreenEnabled ||  document.webkitFullscreenEnabled;
 }
};

var maybeCStringToJsString = cString => cString > 2 ? UTF8ToString(cString) : cString;

/** @type {Object} */ var specialHTMLTargets = [ 0, typeof document != "undefined" ? document : 0, typeof window != "undefined" ? window : 0 ];

var findEventTarget = target => {
 target = maybeCStringToJsString(target);
 var domElement = specialHTMLTargets[target] || (typeof document != "undefined" ? document.querySelector(target) : undefined);
 return domElement;
};

var getBoundingClientRect = e => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
 "left": 0,
 "top": 0
};

function _emscripten_get_element_css_size(target, width, height) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(2, 0, 1, target, width, height);
 target = findEventTarget(target);
 if (!target) return -4;
 var rect = getBoundingClientRect(target);
 GROWABLE_HEAP_F64()[((width) >> 3)] = rect.width;
 GROWABLE_HEAP_F64()[((height) >> 3)] = rect.height;
 return 0;
}

var _emscripten_get_now;

_emscripten_get_now = () => performance.timeOrigin + performance.now();

var getHeapMax = () =>  2147483648;

var growMemory = size => {
 var b = wasmMemory.buffer;
 var pages = (size - b.byteLength + 65535) / 65536;
 try {
  wasmMemory.grow(pages);
  updateMemoryViews();
  return 1;
 } /*success*/ catch (e) {
  err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
 }
};

var _emscripten_resize_heap = requestedSize => {
 var oldSize = GROWABLE_HEAP_U8().length;
 requestedSize >>>= 0;
 if (requestedSize <= oldSize) {
  return false;
 }
 var maxHeapSize = getHeapMax();
 if (requestedSize > maxHeapSize) {
  err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
  return false;
 }
 var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
 for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
  var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
  overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
  var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
  var replacement = growMemory(newSize);
  if (replacement) {
   return true;
  }
 }
 err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
 return false;
};

var fillFullscreenChangeEventData = eventStruct => {
 var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
 var isFullscreen = !!fullscreenElement;
 /** @suppress{checkTypes} */ GROWABLE_HEAP_I32()[((eventStruct) >> 2)] = isFullscreen;
 GROWABLE_HEAP_I32()[(((eventStruct) + (4)) >> 2)] = JSEvents.fullscreenEnabled();
 var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
 var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
 var id = reportedElement?.id || "";
 stringToUTF8(nodeName, eventStruct + 8, 128);
 stringToUTF8(id, eventStruct + 136, 128);
 GROWABLE_HEAP_I32()[(((eventStruct) + (264)) >> 2)] = reportedElement ? reportedElement.clientWidth : 0;
 GROWABLE_HEAP_I32()[(((eventStruct) + (268)) >> 2)] = reportedElement ? reportedElement.clientHeight : 0;
 GROWABLE_HEAP_I32()[(((eventStruct) + (272)) >> 2)] = screen.width;
 GROWABLE_HEAP_I32()[(((eventStruct) + (276)) >> 2)] = screen.height;
 if (isFullscreen) {
  JSEvents.previousFullscreenElement = fullscreenElement;
 }
};

var registerFullscreenChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
 targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
 if (!JSEvents.fullscreenChangeEvent) JSEvents.fullscreenChangeEvent = _malloc(280);
 var fullscreenChangeEventhandlerFunc = (e = event) => {
  var fullscreenChangeEvent = targetThread ? _malloc(280) : JSEvents.fullscreenChangeEvent;
  fillFullscreenChangeEventData(fullscreenChangeEvent);
  if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, fullscreenChangeEvent, userData); else if (getWasmTableEntry(callbackfunc)(eventTypeId, fullscreenChangeEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: fullscreenChangeEventhandlerFunc,
  useCapture: useCapture
 };
 return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_fullscreenchange_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(3, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
 if (!JSEvents.fullscreenEnabled()) return -1;
 target = findEventTarget(target);
 if (!target) return -4;
 registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "webkitfullscreenchange", targetThread);
 return registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "fullscreenchange", targetThread);
}

var runtimeKeepalivePop = () => {
 assert(runtimeKeepaliveCounter > 0);
 runtimeKeepaliveCounter -= 1;
};

/** @param {number=} timeout */ var safeSetTimeout = (func, timeout) => {
 runtimeKeepalivePush();
 return setTimeout(() => {
  runtimeKeepalivePop();
  callUserCallback(func);
 }, timeout);
};

var Browser = {
 mainLoop: {
  running: false,
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  pause() {
   Browser.mainLoop.scheduler = null;
   Browser.mainLoop.currentlyRunningMainloop++;
  },
  resume() {
   Browser.mainLoop.currentlyRunningMainloop++;
   var timingMode = Browser.mainLoop.timingMode;
   var timingValue = Browser.mainLoop.timingValue;
   var func = Browser.mainLoop.func;
   Browser.mainLoop.func = null;
   setMainLoop(func, 0, false, Browser.mainLoop.arg, true);
   _emscripten_set_main_loop_timing(timingMode, timingValue);
   Browser.mainLoop.scheduler();
  },
  updateStatus() {
   if (Module["setStatus"]) {
    var message = Module["statusMessage"] || "Please wait...";
    var remaining = Browser.mainLoop.remainingBlockers;
    var expected = Browser.mainLoop.expectedBlockers;
    if (remaining) {
     if (remaining < expected) {
      Module["setStatus"](`{message} ({expected - remaining}/{expected})`);
     } else {
      Module["setStatus"](message);
     }
    } else {
     Module["setStatus"]("");
    }
   }
  },
  runIter(func) {
   if (ABORT) return;
   if (Module["preMainLoop"]) {
    var preRet = Module["preMainLoop"]();
    if (preRet === false) {
     return;
    }
   }
   callUserCallback(func);
   Module["postMainLoop"]?.();
  }
 },
 isFullscreen: false,
 pointerLock: false,
 moduleContextCreatedCallbacks: [],
 workers: [],
 init() {
  if (Browser.initted) return;
  Browser.initted = true;
  function pointerLockChange() {
   Browser.pointerLock = document["pointerLockElement"] === Module["canvas"] || document["mozPointerLockElement"] === Module["canvas"] || document["webkitPointerLockElement"] === Module["canvas"] || document["msPointerLockElement"] === Module["canvas"];
  }
  var canvas = Module["canvas"];
  if (canvas) {
   canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (() => {});
   canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (() => {});
   canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
   document.addEventListener("pointerlockchange", pointerLockChange, false);
   document.addEventListener("mozpointerlockchange", pointerLockChange, false);
   document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
   document.addEventListener("mspointerlockchange", pointerLockChange, false);
   if (Module["elementPointerLock"]) {
    canvas.addEventListener("click", ev => {
     if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
      Module["canvas"].requestPointerLock();
      ev.preventDefault();
     }
    }, false);
   }
  }
 },
 createContext(/** @type {HTMLCanvasElement} */ canvas, useWebGL, setInModule, webGLContextAttributes) {
  if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
  var ctx;
  var contextHandle;
  if (useWebGL) {
   var contextAttributes = {
    antialias: false,
    alpha: false,
    majorVersion: 1
   };
   if (webGLContextAttributes) {
    for (var attribute in webGLContextAttributes) {
     contextAttributes[attribute] = webGLContextAttributes[attribute];
    }
   }
   if (typeof GL != "undefined") {
    contextHandle = GL.createContext(canvas, contextAttributes);
    if (contextHandle) {
     ctx = GL.getContext(contextHandle).GLctx;
    }
   }
  } else {
   ctx = canvas.getContext("2d");
  }
  if (!ctx) return null;
  if (setInModule) {
   if (!useWebGL) assert(typeof GLctx == "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
   Module.ctx = ctx;
   if (useWebGL) GL.makeContextCurrent(contextHandle);
   Module.useWebGL = useWebGL;
   Browser.moduleContextCreatedCallbacks.forEach(callback => callback());
   Browser.init();
  }
  return ctx;
 },
 destroyContext(canvas, useWebGL, setInModule) {},
 fullscreenHandlersInstalled: false,
 lockPointer: undefined,
 resizeCanvas: undefined,
 requestFullscreen(lockPointer, resizeCanvas) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  if (typeof Browser.lockPointer == "undefined") Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas == "undefined") Browser.resizeCanvas = false;
  var canvas = Module["canvas"];
  function fullscreenChange() {
   Browser.isFullscreen = false;
   var canvasContainer = canvas.parentNode;
   if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
    canvas.exitFullscreen = Browser.exitFullscreen;
    if (Browser.lockPointer) canvas.requestPointerLock();
    Browser.isFullscreen = true;
    if (Browser.resizeCanvas) {
     Browser.setFullscreenCanvasSize();
    } else {
     Browser.updateCanvasDimensions(canvas);
    }
   } else {
    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
    canvasContainer.parentNode.removeChild(canvasContainer);
    if (Browser.resizeCanvas) {
     Browser.setWindowedCanvasSize();
    } else {
     Browser.updateCanvasDimensions(canvas);
    }
   }
   Module["onFullScreen"]?.(Browser.isFullscreen);
   Module["onFullscreen"]?.(Browser.isFullscreen);
  }
  if (!Browser.fullscreenHandlersInstalled) {
   Browser.fullscreenHandlersInstalled = true;
   document.addEventListener("fullscreenchange", fullscreenChange, false);
   document.addEventListener("mozfullscreenchange", fullscreenChange, false);
   document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
   document.addEventListener("MSFullscreenChange", fullscreenChange, false);
  }
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);
  canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? () => canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null) || (canvasContainer["webkitRequestFullScreen"] ? () => canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null);
  canvasContainer.requestFullscreen();
 },
 requestFullScreen() {
  abort("Module.requestFullScreen has been replaced by Module.requestFullscreen (without a capital S)");
 },
 exitFullscreen() {
  if (!Browser.isFullscreen) {
   return false;
  }
  var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || (() => {});
  CFS.apply(document, []);
  return true;
 },
 nextRAF: 0,
 fakeRequestAnimationFrame(func) {
  var now = Date.now();
  if (Browser.nextRAF === 0) {
   Browser.nextRAF = now + 1e3 / 60;
  } else {
   while (now + 2 >= Browser.nextRAF) {
    Browser.nextRAF += 1e3 / 60;
   }
  }
  var delay = Math.max(Browser.nextRAF - now, 0);
  setTimeout(func, delay);
 },
 requestAnimationFrame(func) {
  if (typeof requestAnimationFrame == "function") {
   requestAnimationFrame(func);
   return;
  }
  var RAF = Browser.fakeRequestAnimationFrame;
  RAF(func);
 },
 safeSetTimeout(func, timeout) {
  return safeSetTimeout(func, timeout);
 },
 safeRequestAnimationFrame(func) {
  runtimeKeepalivePush();
  return Browser.requestAnimationFrame(() => {
   runtimeKeepalivePop();
   callUserCallback(func);
  });
 },
 getMimetype(name) {
  return {
   "jpg": "image/jpeg",
   "jpeg": "image/jpeg",
   "png": "image/png",
   "bmp": "image/bmp",
   "ogg": "audio/ogg",
   "wav": "audio/wav",
   "mp3": "audio/mpeg"
  }[name.substr(name.lastIndexOf(".") + 1)];
 },
 getUserMedia(func) {
  window.getUserMedia ||= navigator["getUserMedia"] || navigator["mozGetUserMedia"];
  window.getUserMedia(func);
 },
 getMovementX(event) {
  return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
 },
 getMovementY(event) {
  return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
 },
 getMouseWheelDelta(event) {
  var delta = 0;
  switch (event.type) {
  case "DOMMouseScroll":
   delta = event.detail / 3;
   break;

  case "mousewheel":
   delta = event.wheelDelta / 120;
   break;

  case "wheel":
   delta = event.deltaY;
   switch (event.deltaMode) {
   case 0:
    delta /= 100;
    break;

   case 1:
    delta /= 3;
    break;

   case 2:
    delta *= 80;
    break;

   default:
    throw "unrecognized mouse wheel delta mode: " + event.deltaMode;
   }
   break;

  default:
   throw "unrecognized mouse wheel event: " + event.type;
  }
  return delta;
 },
 mouseX: 0,
 mouseY: 0,
 mouseMovementX: 0,
 mouseMovementY: 0,
 touches: {},
 lastTouches: {},
 calculateMouseCoords(pageX, pageY) {
  var rect = Module["canvas"].getBoundingClientRect();
  var cw = Module["canvas"].width;
  var ch = Module["canvas"].height;
  var scrollX = ((typeof window.scrollX != "undefined") ? window.scrollX : window.pageXOffset);
  var scrollY = ((typeof window.scrollY != "undefined") ? window.scrollY : window.pageYOffset);
  assert((typeof scrollX != "undefined") && (typeof scrollY != "undefined"), "Unable to retrieve scroll position, mouse positions likely broken.");
  var adjustedX = pageX - (scrollX + rect.left);
  var adjustedY = pageY - (scrollY + rect.top);
  adjustedX = adjustedX * (cw / rect.width);
  adjustedY = adjustedY * (ch / rect.height);
  return {
   x: adjustedX,
   y: adjustedY
  };
 },
 setMouseCoords(pageX, pageY) {
  const {x: x, y: y} = Browser.calculateMouseCoords(pageX, pageY);
  Browser.mouseMovementX = x - Browser.mouseX;
  Browser.mouseMovementY = y - Browser.mouseY;
  Browser.mouseX = x;
  Browser.mouseY = y;
 },
 calculateMouseEvent(event) {
  if (Browser.pointerLock) {
   if (event.type != "mousemove" && ("mozMovementX" in event)) {
    Browser.mouseMovementX = Browser.mouseMovementY = 0;
   } else {
    Browser.mouseMovementX = Browser.getMovementX(event);
    Browser.mouseMovementY = Browser.getMovementY(event);
   }
   if (typeof SDL != "undefined") {
    Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
    Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
   } else {
    Browser.mouseX += Browser.mouseMovementX;
    Browser.mouseY += Browser.mouseMovementY;
   }
  } else {
   if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
    var touch = event.touch;
    if (touch === undefined) {
     return;
    }
    var coords = Browser.calculateMouseCoords(touch.pageX, touch.pageY);
    if (event.type === "touchstart") {
     Browser.lastTouches[touch.identifier] = coords;
     Browser.touches[touch.identifier] = coords;
    } else if (event.type === "touchend" || event.type === "touchmove") {
     var last = Browser.touches[touch.identifier];
     last ||= coords;
     Browser.lastTouches[touch.identifier] = last;
     Browser.touches[touch.identifier] = coords;
    }
    return;
   }
   Browser.setMouseCoords(event.pageX, event.pageY);
  }
 },
 resizeListeners: [],
 updateResizeListeners() {
  var canvas = Module["canvas"];
  Browser.resizeListeners.forEach(listener => listener(canvas.width, canvas.height));
 },
 setCanvasSize(width, height, noUpdates) {
  var canvas = Module["canvas"];
  Browser.updateCanvasDimensions(canvas, width, height);
  if (!noUpdates) Browser.updateResizeListeners();
 },
 windowedWidth: 0,
 windowedHeight: 0,
 setFullscreenCanvasSize() {
  if (typeof SDL != "undefined") {
   var flags = GROWABLE_HEAP_U32()[((SDL.screen) >> 2)];
   flags = flags | 8388608;
   GROWABLE_HEAP_I32()[((SDL.screen) >> 2)] = flags;
  }
  Browser.updateCanvasDimensions(Module["canvas"]);
  Browser.updateResizeListeners();
 },
 setWindowedCanvasSize() {
  if (typeof SDL != "undefined") {
   var flags = GROWABLE_HEAP_U32()[((SDL.screen) >> 2)];
   flags = flags & ~8388608;
   GROWABLE_HEAP_I32()[((SDL.screen) >> 2)] = flags;
  }
  Browser.updateCanvasDimensions(Module["canvas"]);
  Browser.updateResizeListeners();
 },
 updateCanvasDimensions(canvas, wNative, hNative) {
  if (wNative && hNative) {
   canvas.widthNative = wNative;
   canvas.heightNative = hNative;
  } else {
   wNative = canvas.widthNative;
   hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
   if (w / h < Module["forcedAspectRatio"]) {
    w = Math.round(h * Module["forcedAspectRatio"]);
   } else {
    h = Math.round(w / Module["forcedAspectRatio"]);
   }
  }
  if (((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode) && (typeof screen != "undefined")) {
   var factor = Math.min(screen.width / w, screen.height / h);
   w = Math.round(w * factor);
   h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
   if (canvas.width != w) canvas.width = w;
   if (canvas.height != h) canvas.height = h;
   if (typeof canvas.style != "undefined") {
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
   }
  } else {
   if (canvas.width != wNative) canvas.width = wNative;
   if (canvas.height != hNative) canvas.height = hNative;
   if (typeof canvas.style != "undefined") {
    if (w != wNative || h != hNative) {
     canvas.style.setProperty("width", w + "px", "important");
     canvas.style.setProperty("height", h + "px", "important");
    } else {
     canvas.style.removeProperty("width");
     canvas.style.removeProperty("height");
    }
   }
  }
 }
};

var _emscripten_set_main_loop_timing = (mode, value) => {
 Browser.mainLoop.timingMode = mode;
 Browser.mainLoop.timingValue = value;
 if (!Browser.mainLoop.func) {
  err("emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.");
  return 1;
 }
 if (!Browser.mainLoop.running) {
  runtimeKeepalivePush();
  Browser.mainLoop.running = true;
 }
 if (mode == 0) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
   var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
   setTimeout(Browser.mainLoop.runner, timeUntilNextTick);
  };
  Browser.mainLoop.method = "timeout";
 } else if (mode == 1) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
   Browser.requestAnimationFrame(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "rAF";
 } else if (mode == 2) {
  if (typeof Browser.setImmediate == "undefined") {
   if (typeof setImmediate == "undefined") {
    var setImmediates = [];
    var emscriptenMainLoopMessageId = "setimmediate";
    /** @param {Event} event */ var Browser_setImmediate_messageHandler = event => {
     if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
      event.stopPropagation();
      setImmediates.shift()();
     }
    };
    addEventListener("message", Browser_setImmediate_messageHandler, true);
    Browser.setImmediate = /** @type{function(function(): ?, ...?): number} */ (function Browser_emulated_setImmediate(func) {
     setImmediates.push(func);
     if (ENVIRONMENT_IS_WORKER) {
      if (Module["setImmediates"] === undefined) Module["setImmediates"] = [];
      Module["setImmediates"].push(func);
      postMessage({
       target: emscriptenMainLoopMessageId
      });
     } else postMessage(emscriptenMainLoopMessageId, "*");
    });
   } else {
    Browser.setImmediate = setImmediate;
   }
  }
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
   Browser.setImmediate(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "immediate";
 }
 return 0;
};

/**
     * @param {number=} arg
     * @param {boolean=} noSetTiming
     */ var setMainLoop = (browserIterationFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
 assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
 Browser.mainLoop.func = browserIterationFunc;
 Browser.mainLoop.arg = arg;
 /** @type{number} */ var thisMainLoopId = (() => Browser.mainLoop.currentlyRunningMainloop)();
 function checkIsRunning() {
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) {
   runtimeKeepalivePop();
   maybeExit();
   return false;
  }
  return true;
 }
 Browser.mainLoop.running = false;
 Browser.mainLoop.runner = function Browser_mainLoop_runner() {
  if (ABORT) return;
  if (Browser.mainLoop.queue.length > 0) {
   var start = Date.now();
   var blocker = Browser.mainLoop.queue.shift();
   blocker.func(blocker.arg);
   if (Browser.mainLoop.remainingBlockers) {
    var remaining = Browser.mainLoop.remainingBlockers;
    var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
    if (blocker.counted) {
     Browser.mainLoop.remainingBlockers = next;
    } else {
     next = next + .5;
     Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
    }
   }
   Browser.mainLoop.updateStatus();
   if (!checkIsRunning()) return;
   setTimeout(Browser.mainLoop.runner, 0);
   return;
  }
  if (!checkIsRunning()) return;
  Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
  if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
   Browser.mainLoop.scheduler();
   return;
  } else if (Browser.mainLoop.timingMode == 0) {
   Browser.mainLoop.tickStartTime = _emscripten_get_now();
  }
  if (Browser.mainLoop.method === "timeout" && Module.ctx) {
   warnOnce("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
   Browser.mainLoop.method = "";
  }
  Browser.mainLoop.runIter(browserIterationFunc);
  checkStackCookie();
  if (!checkIsRunning()) return;
  if (typeof SDL == "object") SDL.audio?.queueNewAudioData?.();
  Browser.mainLoop.scheduler();
 };
 if (!noSetTiming) {
  if (fps && fps > 0) {
   _emscripten_set_main_loop_timing(0, 1e3 / fps);
  } else {
   _emscripten_set_main_loop_timing(1, 1);
  }
  Browser.mainLoop.scheduler();
 }
 if (simulateInfiniteLoop) {
  throw "unwind";
 }
};

var _emscripten_set_main_loop = (func, fps, simulateInfiniteLoop) => {
 var browserIterationFunc = getWasmTableEntry(func);
 setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop);
};

var registerUiEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
 targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
 if (!JSEvents.uiEvent) JSEvents.uiEvent = _malloc(36);
 target = findEventTarget(target);
 var uiEventHandlerFunc = (e = event) => {
  if (e.target != target) {
   return;
  }
  var b = document.body;
  if (!b) {
   return;
  }
  var uiEvent = targetThread ? _malloc(36) : JSEvents.uiEvent;
  GROWABLE_HEAP_I32()[((uiEvent) >> 2)] = 0;
  GROWABLE_HEAP_I32()[(((uiEvent) + (4)) >> 2)] = b.clientWidth;
  GROWABLE_HEAP_I32()[(((uiEvent) + (8)) >> 2)] = b.clientHeight;
  GROWABLE_HEAP_I32()[(((uiEvent) + (12)) >> 2)] = innerWidth;
  GROWABLE_HEAP_I32()[(((uiEvent) + (16)) >> 2)] = innerHeight;
  GROWABLE_HEAP_I32()[(((uiEvent) + (20)) >> 2)] = outerWidth;
  GROWABLE_HEAP_I32()[(((uiEvent) + (24)) >> 2)] = outerHeight;
  GROWABLE_HEAP_I32()[(((uiEvent) + (28)) >> 2)] = pageXOffset | 0;
  GROWABLE_HEAP_I32()[(((uiEvent) + (32)) >> 2)] = pageYOffset | 0;
  if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, uiEvent, userData); else if (getWasmTableEntry(callbackfunc)(eventTypeId, uiEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: uiEventHandlerFunc,
  useCapture: useCapture
 };
 return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_resize_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(4, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
 return registerUiEventCallback(target, userData, useCapture, callbackfunc, 10, "resize", targetThread);
}

var fillMouseEventData = (eventStruct, e, target) => {
 assert(eventStruct % 4 == 0);
 GROWABLE_HEAP_F64()[((eventStruct) >> 3)] = e.timeStamp;
 var idx = ((eventStruct) >> 2);
 GROWABLE_HEAP_I32()[idx + 2] = e.screenX;
 GROWABLE_HEAP_I32()[idx + 3] = e.screenY;
 GROWABLE_HEAP_I32()[idx + 4] = e.clientX;
 GROWABLE_HEAP_I32()[idx + 5] = e.clientY;
 GROWABLE_HEAP_I32()[idx + 6] = e.ctrlKey;
 GROWABLE_HEAP_I32()[idx + 7] = e.shiftKey;
 GROWABLE_HEAP_I32()[idx + 8] = e.altKey;
 GROWABLE_HEAP_I32()[idx + 9] = e.metaKey;
 GROWABLE_HEAP_I16()[idx * 2 + 20] = e.button;
 GROWABLE_HEAP_I16()[idx * 2 + 21] = e.buttons;
 GROWABLE_HEAP_I32()[idx + 11] = e["movementX"];
 GROWABLE_HEAP_I32()[idx + 12] = e["movementY"];
 var rect = getBoundingClientRect(target);
 GROWABLE_HEAP_I32()[idx + 13] = e.clientX - (rect.left | 0);
 GROWABLE_HEAP_I32()[idx + 14] = e.clientY - (rect.top | 0);
};

var registerWheelEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
 targetThread = JSEvents.getTargetThreadForEventCallback(targetThread);
 if (!JSEvents.wheelEvent) JSEvents.wheelEvent = _malloc(104);
 var wheelHandlerFunc = (e = event) => {
  var wheelEvent = targetThread ? _malloc(104) : JSEvents.wheelEvent;
  fillMouseEventData(wheelEvent, e, target);
  GROWABLE_HEAP_F64()[(((wheelEvent) + (72)) >> 3)] = e["deltaX"];
  GROWABLE_HEAP_F64()[(((wheelEvent) + (80)) >> 3)] = e["deltaY"];
  GROWABLE_HEAP_F64()[(((wheelEvent) + (88)) >> 3)] = e["deltaZ"];
  GROWABLE_HEAP_I32()[(((wheelEvent) + (96)) >> 2)] = e["deltaMode"];
  if (targetThread) __emscripten_run_callback_on_thread(targetThread, callbackfunc, eventTypeId, wheelEvent, userData); else if (getWasmTableEntry(callbackfunc)(eventTypeId, wheelEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  allowsDeferredCalls: true,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: wheelHandlerFunc,
  useCapture: useCapture
 };
 return JSEvents.registerOrRemoveHandler(eventHandler);
};

function _emscripten_set_wheel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(5, 0, 1, target, userData, useCapture, callbackfunc, targetThread);
 target = findEventTarget(target);
 if (!target) return -4;
 if (typeof target.onwheel != "undefined") {
  return registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread);
 } else {
  return -1;
 }
}

var stringToUTF8OnStack = str => {
 var size = lengthBytesUTF8(str) + 1;
 var ret = stackAlloc(size);
 stringToUTF8(str, ret, size);
 return ret;
};

var WebGPU = {
 errorCallback: (callback, type, message, userdata) => {
  withStackSave(() => {
   var messagePtr = stringToUTF8OnStack(message);
   getWasmTableEntry(callback)(type, messagePtr, userdata);
  });
 },
 initManagers: () => {
  if (WebGPU.mgrDevice) return;
  /** @constructor */ function Manager() {
   this.objects = {};
   this.nextId = 1;
   this.create = function(object, wrapper = {}) {
    var id = this.nextId++;
    assert(typeof this.objects[id] == "undefined");
    wrapper.refcount = 1;
    wrapper.object = object;
    this.objects[id] = wrapper;
    return id;
   };
   this.get = function(id) {
    if (!id) return undefined;
    var o = this.objects[id];
    assert(typeof o != "undefined");
    return o.object;
   };
   this.reference = function(id) {
    var o = this.objects[id];
    assert(typeof o != "undefined");
    o.refcount++;
   };
   this.release = function(id) {
    var o = this.objects[id];
    assert(typeof o != "undefined");
    assert(o.refcount > 0);
    o.refcount--;
    if (o.refcount <= 0) {
     delete this.objects[id];
    }
   };
  }
  WebGPU.mgrSurface = WebGPU.mgrSurface || new Manager;
  WebGPU.mgrSwapChain = WebGPU.mgrSwapChain || new Manager;
  WebGPU.mgrAdapter = WebGPU.mgrAdapter || new Manager;
  WebGPU.mgrDevice = WebGPU.mgrDevice || new Manager;
  WebGPU.mgrQueue = WebGPU.mgrQueue || new Manager;
  WebGPU.mgrCommandBuffer = WebGPU.mgrCommandBuffer || new Manager;
  WebGPU.mgrCommandEncoder = WebGPU.mgrCommandEncoder || new Manager;
  WebGPU.mgrRenderPassEncoder = WebGPU.mgrRenderPassEncoder || new Manager;
  WebGPU.mgrComputePassEncoder = WebGPU.mgrComputePassEncoder || new Manager;
  WebGPU.mgrBindGroup = WebGPU.mgrBindGroup || new Manager;
  WebGPU.mgrBuffer = WebGPU.mgrBuffer || new Manager;
  WebGPU.mgrSampler = WebGPU.mgrSampler || new Manager;
  WebGPU.mgrTexture = WebGPU.mgrTexture || new Manager;
  WebGPU.mgrTextureView = WebGPU.mgrTextureView || new Manager;
  WebGPU.mgrQuerySet = WebGPU.mgrQuerySet || new Manager;
  WebGPU.mgrBindGroupLayout = WebGPU.mgrBindGroupLayout || new Manager;
  WebGPU.mgrPipelineLayout = WebGPU.mgrPipelineLayout || new Manager;
  WebGPU.mgrRenderPipeline = WebGPU.mgrRenderPipeline || new Manager;
  WebGPU.mgrComputePipeline = WebGPU.mgrComputePipeline || new Manager;
  WebGPU.mgrShaderModule = WebGPU.mgrShaderModule || new Manager;
  WebGPU.mgrRenderBundleEncoder = WebGPU.mgrRenderBundleEncoder || new Manager;
  WebGPU.mgrRenderBundle = WebGPU.mgrRenderBundle || new Manager;
 },
 makeColor: ptr => ({
  "r": GROWABLE_HEAP_F64()[((ptr) >> 3)],
  "g": GROWABLE_HEAP_F64()[(((ptr) + (8)) >> 3)],
  "b": GROWABLE_HEAP_F64()[(((ptr) + (16)) >> 3)],
  "a": GROWABLE_HEAP_F64()[(((ptr) + (24)) >> 3)]
 }),
 makeExtent3D: ptr => ({
  "width": GROWABLE_HEAP_U32()[((ptr) >> 2)],
  "height": GROWABLE_HEAP_U32()[(((ptr) + (4)) >> 2)],
  "depthOrArrayLayers": GROWABLE_HEAP_U32()[(((ptr) + (8)) >> 2)]
 }),
 makeOrigin3D: ptr => ({
  "x": GROWABLE_HEAP_U32()[((ptr) >> 2)],
  "y": GROWABLE_HEAP_U32()[(((ptr) + (4)) >> 2)],
  "z": GROWABLE_HEAP_U32()[(((ptr) + (8)) >> 2)]
 }),
 makeImageCopyTexture: ptr => {
  assert(ptr);
  assert(GROWABLE_HEAP_U32()[((ptr) >> 2)] === 0);
  return {
   "texture": WebGPU.mgrTexture.get(GROWABLE_HEAP_U32()[(((ptr) + (4)) >> 2)]),
   "mipLevel": GROWABLE_HEAP_U32()[(((ptr) + (8)) >> 2)],
   "origin": WebGPU.makeOrigin3D(ptr + 12),
   "aspect": WebGPU.TextureAspect[GROWABLE_HEAP_U32()[(((ptr) + (24)) >> 2)]]
  };
 },
 makeTextureDataLayout: ptr => {
  assert(ptr);
  assert(GROWABLE_HEAP_U32()[((ptr) >> 2)] === 0);
  var bytesPerRow = GROWABLE_HEAP_U32()[(((ptr) + (16)) >> 2)];
  var rowsPerImage = GROWABLE_HEAP_U32()[(((ptr) + (20)) >> 2)];
  return {
   "offset": GROWABLE_HEAP_U32()[((((ptr + 4)) + (8)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[(((ptr) + (8)) >> 2)],
   "bytesPerRow": bytesPerRow === 4294967295 ? undefined : bytesPerRow,
   "rowsPerImage": rowsPerImage === 4294967295 ? undefined : rowsPerImage
  };
 },
 makeImageCopyBuffer: ptr => {
  assert(ptr);
  assert(GROWABLE_HEAP_U32()[((ptr) >> 2)] === 0);
  var layoutPtr = ptr + 8;
  var bufferCopyView = WebGPU.makeTextureDataLayout(layoutPtr);
  bufferCopyView["buffer"] = WebGPU.mgrBuffer.get(GROWABLE_HEAP_U32()[(((ptr) + (32)) >> 2)]);
  return bufferCopyView;
 },
 makePipelineConstants: (constantCount, constantsPtr) => {
  if (!constantCount) return;
  var constants = {};
  for (var i = 0; i < constantCount; ++i) {
   var entryPtr = constantsPtr + 16 * i;
   var key = UTF8ToString(GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)]);
   constants[key] = GROWABLE_HEAP_F64()[(((entryPtr) + (8)) >> 3)];
  }
  return constants;
 },
 makePipelineLayout: layoutPtr => {
  if (!layoutPtr) return "auto";
  return WebGPU.mgrPipelineLayout.get(layoutPtr);
 },
 makeProgrammableStageDescriptor: ptr => {
  if (!ptr) return undefined;
  assert(ptr);
  assert(GROWABLE_HEAP_U32()[((ptr) >> 2)] === 0);
  var desc = {
   "module": WebGPU.mgrShaderModule.get(GROWABLE_HEAP_U32()[(((ptr) + (4)) >> 2)]),
   "constants": WebGPU.makePipelineConstants(GROWABLE_HEAP_U32()[(((ptr) + (12)) >> 2)], GROWABLE_HEAP_U32()[(((ptr) + (16)) >> 2)])
  };
  var entryPointPtr = GROWABLE_HEAP_U32()[(((ptr) + (8)) >> 2)];
  if (entryPointPtr) desc["entryPoint"] = UTF8ToString(entryPointPtr);
  return desc;
 },
 Int_BufferMapState: {
  unmapped: 0,
  pending: 1,
  mapped: 2
 },
 Int_CompilationMessageType: {
  error: 0,
  warning: 1,
  info: 2
 },
 Int_DeviceLostReason: {
  undefined: 0,
  destroyed: 1
 },
 Int_PreferredFormat: {
  rgba8unorm: 18,
  bgra8unorm: 23
 },
 WGSLFeatureName: [ , "readonly_and_readwrite_storage_textures", "packed_4x8_integer_dot_product", "unrestricted_pointer_parameters", "pointer_composite_access" ],
 AddressMode: [ , "clamp-to-edge", "repeat", "mirror-repeat" ],
 BlendFactor: [ , "zero", "one", "src", "one-minus-src", "src-alpha", "one-minus-src-alpha", "dst", "one-minus-dst", "dst-alpha", "one-minus-dst-alpha", "src-alpha-saturated", "constant", "one-minus-constant" ],
 BlendOperation: [ , "add", "subtract", "reverse-subtract", "min", "max" ],
 BufferBindingType: [ , "uniform", "storage", "read-only-storage" ],
 BufferMapState: {
  1: "unmapped",
  2: "pending",
  3: "mapped"
 },
 CompareFunction: [ , "never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always" ],
 CompilationInfoRequestStatus: [ "success", "error", "device-lost", "unknown" ],
 CullMode: [ , "none", "front", "back" ],
 ErrorFilter: {
  1: "validation",
  2: "out-of-memory",
  3: "internal"
 },
 FeatureName: [ , "depth-clip-control", "depth32float-stencil8", "timestamp-query", "texture-compression-bc", "texture-compression-etc2", "texture-compression-astc", "indirect-first-instance", "shader-f16", "rg11b10ufloat-renderable", "bgra8unorm-storage", "float32-filterable" ],
 FilterMode: [ , "nearest", "linear" ],
 FrontFace: [ , "ccw", "cw" ],
 IndexFormat: [ , "uint16", "uint32" ],
 LoadOp: [ , "clear", "load" ],
 MipmapFilterMode: [ , "nearest", "linear" ],
 PowerPreference: [ , "low-power", "high-performance" ],
 PrimitiveTopology: [ , "point-list", "line-list", "line-strip", "triangle-list", "triangle-strip" ],
 QueryType: {
  1: "occlusion",
  2: "timestamp"
 },
 SamplerBindingType: [ , "filtering", "non-filtering", "comparison" ],
 StencilOperation: [ , "keep", "zero", "replace", "invert", "increment-clamp", "decrement-clamp", "increment-wrap", "decrement-wrap" ],
 StorageTextureAccess: [ , "write-only", "read-only", "read-write" ],
 StoreOp: [ , "store", "discard" ],
 TextureAspect: [ , "all", "stencil-only", "depth-only" ],
 TextureDimension: [ , "1d", "2d", "3d" ],
 TextureFormat: [ , "r8unorm", "r8snorm", "r8uint", "r8sint", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32float", "r32uint", "r32sint", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rgb9e5ufloat", "rg32float", "rg32uint", "rg32sint", "rgba16uint", "rgba16sint", "rgba16float", "rgba32float", "rgba32uint", "rgba32sint", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb" ],
 TextureSampleType: [ , "float", "unfilterable-float", "depth", "sint", "uint" ],
 TextureViewDimension: [ , "1d", "2d", "2d-array", "cube", "cube-array", "3d" ],
 VertexFormat: [ , "uint8x2", "uint8x4", "sint8x2", "sint8x4", "unorm8x2", "unorm8x4", "snorm8x2", "snorm8x4", "uint16x2", "uint16x4", "sint16x2", "sint16x4", "unorm16x2", "unorm16x4", "snorm16x2", "snorm16x4", "float16x2", "float16x4", "float32", "float32x2", "float32x3", "float32x4", "uint32", "uint32x2", "uint32x3", "uint32x4", "sint32", "sint32x2", "sint32x3", "sint32x4", "unorm10-10-10-2" ],
 VertexStepMode: [ , "vertex-buffer-not-used", "vertex", "instance" ],
 FeatureNameString2Enum: {
  undefined: "0",
  "depth-clip-control": "1",
  "depth32float-stencil8": "2",
  "timestamp-query": "3",
  "texture-compression-bc": "4",
  "texture-compression-etc2": "5",
  "texture-compression-astc": "6",
  "indirect-first-instance": "7",
  "shader-f16": "8",
  "rg11b10ufloat-renderable": "9",
  "bgra8unorm-storage": "10",
  "float32-filterable": "11"
 }
};

var _emscripten_webgpu_get_device = () => {
 assert(Module["preinitializedWebGPUDevice"]);
 if (WebGPU.preinitializedDeviceId === undefined) {
  var device = Module["preinitializedWebGPUDevice"];
  var deviceWrapper = {
   queueId: WebGPU.mgrQueue.create(device["queue"])
  };
  WebGPU.preinitializedDeviceId = WebGPU.mgrDevice.create(device, deviceWrapper);
 }
 WebGPU.mgrDevice.reference(WebGPU.preinitializedDeviceId);
 return WebGPU.preinitializedDeviceId;
};

var ENV = {};

var getExecutableName = () => thisProgram || "./this.program";

var getEnvStrings = () => {
 if (!getEnvStrings.strings) {
  var lang = ((typeof navigator == "object" && navigator.languages && navigator.languages[0]) || "C").replace("-", "_") + ".UTF-8";
  var env = {
   "USER": "web_user",
   "LOGNAME": "web_user",
   "PATH": "/",
   "PWD": "/",
   "HOME": "/home/web_user",
   "LANG": lang,
   "_": getExecutableName()
  };
  for (var x in ENV) {
   if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
  }
  var strings = [];
  for (var x in env) {
   strings.push(`${x}=${env[x]}`);
  }
  getEnvStrings.strings = strings;
 }
 return getEnvStrings.strings;
};

var stringToAscii = (str, buffer) => {
 for (var i = 0; i < str.length; ++i) {
  assert(str.charCodeAt(i) === (str.charCodeAt(i) & 255));
  GROWABLE_HEAP_I8()[buffer++] = str.charCodeAt(i);
 }
 GROWABLE_HEAP_I8()[buffer] = 0;
};

var _environ_get = function(__environ, environ_buf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(6, 0, 1, __environ, environ_buf);
 var bufSize = 0;
 getEnvStrings().forEach((string, i) => {
  var ptr = environ_buf + bufSize;
  GROWABLE_HEAP_U32()[(((__environ) + (i * 4)) >> 2)] = ptr;
  stringToAscii(string, ptr);
  bufSize += string.length + 1;
 });
 return 0;
};

var _environ_sizes_get = function(penviron_count, penviron_buf_size) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(7, 0, 1, penviron_count, penviron_buf_size);
 var strings = getEnvStrings();
 GROWABLE_HEAP_U32()[((penviron_count) >> 2)] = strings.length;
 var bufSize = 0;
 strings.forEach(string => bufSize += string.length + 1);
 GROWABLE_HEAP_U32()[((penviron_buf_size) >> 2)] = bufSize;
 return 0;
};

var SYSCALLS = {
 varargs: undefined,
 get() {
  assert(SYSCALLS.varargs != undefined);
  var ret = GROWABLE_HEAP_I32()[((+SYSCALLS.varargs) >> 2)];
  SYSCALLS.varargs += 4;
  return ret;
 },
 getp() {
  return SYSCALLS.get();
 },
 getStr(ptr) {
  var ret = UTF8ToString(ptr);
  return ret;
 }
};

function _fd_close(fd) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(8, 0, 1, fd);
 abort("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(9, 0, 1, fd, offset_low, offset_high, whence, newOffset);
 var offset = convertI32PairToI53Checked(offset_low, offset_high);
 return 70;
}

var printCharBuffers = [ null, [], [] ];

var printChar = (stream, curr) => {
 var buffer = printCharBuffers[stream];
 assert(buffer);
 if (curr === 0 || curr === 10) {
  (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
  buffer.length = 0;
 } else {
  buffer.push(curr);
 }
};

var flush_NO_FILESYSTEM = () => {
 _fflush(0);
 if (printCharBuffers[1].length) printChar(1, 10);
 if (printCharBuffers[2].length) printChar(2, 10);
};

function _fd_write(fd, iov, iovcnt, pnum) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(10, 0, 1, fd, iov, iovcnt, pnum);
 var num = 0;
 for (var i = 0; i < iovcnt; i++) {
  var ptr = GROWABLE_HEAP_U32()[((iov) >> 2)];
  var len = GROWABLE_HEAP_U32()[(((iov) + (4)) >> 2)];
  iov += 8;
  for (var j = 0; j < len; j++) {
   printChar(fd, GROWABLE_HEAP_U8()[ptr + j]);
  }
  num += len;
 }
 GROWABLE_HEAP_U32()[((pnum) >> 2)] = num;
 return 0;
}

var webgl_enable_ANGLE_instanced_arrays = ctx => {
 var ext = ctx.getExtension("ANGLE_instanced_arrays");
 if (ext) {
  ctx["vertexAttribDivisor"] = (index, divisor) => ext["vertexAttribDivisorANGLE"](index, divisor);
  ctx["drawArraysInstanced"] = (mode, first, count, primcount) => ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
  ctx["drawElementsInstanced"] = (mode, count, type, indices, primcount) => ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
  return 1;
 }
};

var webgl_enable_OES_vertex_array_object = ctx => {
 var ext = ctx.getExtension("OES_vertex_array_object");
 if (ext) {
  ctx["createVertexArray"] = () => ext["createVertexArrayOES"]();
  ctx["deleteVertexArray"] = vao => ext["deleteVertexArrayOES"](vao);
  ctx["bindVertexArray"] = vao => ext["bindVertexArrayOES"](vao);
  ctx["isVertexArray"] = vao => ext["isVertexArrayOES"](vao);
  return 1;
 }
};

var webgl_enable_WEBGL_draw_buffers = ctx => {
 var ext = ctx.getExtension("WEBGL_draw_buffers");
 if (ext) {
  ctx["drawBuffers"] = (n, bufs) => ext["drawBuffersWEBGL"](n, bufs);
  return 1;
 }
};

var webgl_enable_WEBGL_multi_draw = ctx => !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));

var getEmscriptenSupportedExtensions = ctx => {
 var supportedExtensions = [  "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_disjoint_timer_query", "EXT_frag_depth", "EXT_shader_texture_lod", "EXT_sRGB", "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float", "OES_texture_half_float", "OES_texture_half_float_linear", "OES_vertex_array_object", "WEBGL_color_buffer_float", "WEBGL_depth_texture", "WEBGL_draw_buffers",  "EXT_color_buffer_half_float", "EXT_depth_clamp", "EXT_float_blend", "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc", "EXT_texture_filter_anisotropic", "KHR_parallel_shader_compile", "OES_texture_float_linear", "WEBGL_blend_func_extended", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_lose_context", "WEBGL_multi_draw" ];
 return (ctx.getSupportedExtensions() || []).filter(ext => supportedExtensions.includes(ext));
};

var GL = {
 counter: 1,
 buffers: [],
 programs: [],
 framebuffers: [],
 renderbuffers: [],
 textures: [],
 shaders: [],
 vaos: [],
 contexts: {},
 offscreenCanvases: {},
 queries: [],
 stringCache: {},
 unpackAlignment: 4,
 recordError: errorCode => {
  if (!GL.lastError) {
   GL.lastError = errorCode;
  }
 },
 getNewId: table => {
  var ret = GL.counter++;
  for (var i = table.length; i < ret; i++) {
   table[i] = null;
  }
  return ret;
 },
 genObject: (n, buffers, createFunction, objectTable) => {
  for (var i = 0; i < n; i++) {
   var buffer = GLctx[createFunction]();
   var id = buffer && GL.getNewId(objectTable);
   if (buffer) {
    buffer.name = id;
    objectTable[id] = buffer;
   } else {
    GL.recordError(1282);
   }
   GROWABLE_HEAP_I32()[(((buffers) + (i * 4)) >> 2)] = id;
  }
 },
 getSource: (shader, count, string, length) => {
  var source = "";
  for (var i = 0; i < count; ++i) {
   var len = length ? GROWABLE_HEAP_U32()[(((length) + (i * 4)) >> 2)] : undefined;
   source += UTF8ToString(GROWABLE_HEAP_U32()[(((string) + (i * 4)) >> 2)], len);
  }
  return source;
 },
 createContext: (/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
  if (!canvas.getContextSafariWebGL2Fixed) {
   canvas.getContextSafariWebGL2Fixed = canvas.getContext;
   /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (Object|null)} */ function fixedGetContext(ver, attrs) {
    var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
    return ((ver == "webgl") == (gl instanceof WebGLRenderingContext)) ? gl : null;
   }
   canvas.getContext = fixedGetContext;
  }
  var ctx = (canvas.getContext("webgl", webGLContextAttributes));
  if (!ctx) return 0;
  var handle = GL.registerContext(ctx, webGLContextAttributes);
  return handle;
 },
 registerContext: (ctx, webGLContextAttributes) => {
  var handle = _malloc(8);
  GROWABLE_HEAP_U32()[(((handle) + (4)) >> 2)] = _pthread_self();
  var context = {
   handle: handle,
   attributes: webGLContextAttributes,
   version: webGLContextAttributes.majorVersion,
   GLctx: ctx
  };
  if (ctx.canvas) ctx.canvas.GLctxObject = context;
  GL.contexts[handle] = context;
  if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
   GL.initExtensions(context);
  }
  return handle;
 },
 makeContextCurrent: contextHandle => {
  GL.currentContext = GL.contexts[contextHandle];
  Module.ctx = GLctx = GL.currentContext?.GLctx;
  return !(contextHandle && !GLctx);
 },
 getContext: contextHandle => GL.contexts[contextHandle],
 deleteContext: contextHandle => {
  if (GL.currentContext === GL.contexts[contextHandle]) {
   GL.currentContext = null;
  }
  if (typeof JSEvents == "object") {
   JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
  }
  if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) {
   GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
  }
  _free(GL.contexts[contextHandle].handle);
  GL.contexts[contextHandle] = null;
 },
 initExtensions: context => {
  context ||= GL.currentContext;
  if (context.initExtensionsDone) return;
  context.initExtensionsDone = true;
  var GLctx = context.GLctx;
  webgl_enable_ANGLE_instanced_arrays(GLctx);
  webgl_enable_OES_vertex_array_object(GLctx);
  webgl_enable_WEBGL_draw_buffers(GLctx);
  {
   GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
  }
  webgl_enable_WEBGL_multi_draw(GLctx);
  getEmscriptenSupportedExtensions(GLctx).forEach(ext => {
   if (!ext.includes("lose_context") && !ext.includes("debug")) {
    GLctx.getExtension(ext);
   }
  });
 }
};

/** @constructor */ function GLFW_Window(id, width, height, framebufferWidth, framebufferHeight, title, monitor, share) {
 this.id = id;
 this.x = 0;
 this.y = 0;
 this.fullscreen = false;
 this.storedX = 0;
 this.storedY = 0;
 this.width = width;
 this.height = height;
 this.framebufferWidth = framebufferWidth;
 this.framebufferHeight = framebufferHeight;
 this.storedWidth = width;
 this.storedHeight = height;
 this.title = title;
 this.monitor = monitor;
 this.share = share;
 this.attributes = Object.assign({}, GLFW.hints);
 this.inputModes = {
  208897: 212993,
  208898: 0,
  208899: 0
 };
 this.buttons = 0;
 this.keys = new Array;
 this.domKeys = new Array;
 this.shouldClose = 0;
 this.title = null;
 this.windowPosFunc = 0;
 this.windowSizeFunc = 0;
 this.windowCloseFunc = 0;
 this.windowRefreshFunc = 0;
 this.windowFocusFunc = 0;
 this.windowIconifyFunc = 0;
 this.windowMaximizeFunc = 0;
 this.framebufferSizeFunc = 0;
 this.windowContentScaleFunc = 0;
 this.mouseButtonFunc = 0;
 this.cursorPosFunc = 0;
 this.cursorEnterFunc = 0;
 this.scrollFunc = 0;
 this.dropFunc = 0;
 this.keyFunc = 0;
 this.charFunc = 0;
 this.userptr = 0;
}

var stringToNewUTF8 = str => {
 var size = lengthBytesUTF8(str) + 1;
 var ret = _malloc(size);
 if (ret) stringToUTF8(str, ret, size);
 return ret;
};

function _emscripten_set_window_title(title) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(11, 0, 1, title);
 return document.title = UTF8ToString(title);
}

var GLFW = {
 WindowFromId: id => {
  if (id <= 0 || !GLFW.windows) return null;
  return GLFW.windows[id - 1];
 },
 joystickFunc: 0,
 errorFunc: 0,
 monitorFunc: 0,
 active: null,
 scale: null,
 windows: null,
 monitors: null,
 monitorString: null,
 versionString: null,
 initialTime: null,
 extensions: null,
 devicePixelRatioMQL: null,
 hints: null,
 primaryTouchId: null,
 defaultHints: {
  131073: 0,
  131074: 0,
  131075: 1,
  131076: 1,
  131077: 1,
  131082: 0,
  135169: 8,
  135170: 8,
  135171: 8,
  135172: 8,
  135173: 24,
  135174: 8,
  135175: 0,
  135176: 0,
  135177: 0,
  135178: 0,
  135179: 0,
  135180: 0,
  135181: 0,
  135182: 0,
  135183: 0,
  139265: 196609,
  139266: 1,
  139267: 0,
  139268: 0,
  139269: 0,
  139270: 0,
  139271: 0,
  139272: 0,
  139276: 0
 },
 DOMToGLFWKeyCode: keycode => {
  switch (keycode) {
  case 32:
   return 32;

  case 222:
   return 39;

  case 188:
   return 44;

  case 173:
   return 45;

  case 189:
   return 45;

  case 190:
   return 46;

  case 191:
   return 47;

  case 48:
   return 48;

  case 49:
   return 49;

  case 50:
   return 50;

  case 51:
   return 51;

  case 52:
   return 52;

  case 53:
   return 53;

  case 54:
   return 54;

  case 55:
   return 55;

  case 56:
   return 56;

  case 57:
   return 57;

  case 59:
   return 59;

  case 61:
   return 61;

  case 187:
   return 61;

  case 65:
   return 65;

  case 66:
   return 66;

  case 67:
   return 67;

  case 68:
   return 68;

  case 69:
   return 69;

  case 70:
   return 70;

  case 71:
   return 71;

  case 72:
   return 72;

  case 73:
   return 73;

  case 74:
   return 74;

  case 75:
   return 75;

  case 76:
   return 76;

  case 77:
   return 77;

  case 78:
   return 78;

  case 79:
   return 79;

  case 80:
   return 80;

  case 81:
   return 81;

  case 82:
   return 82;

  case 83:
   return 83;

  case 84:
   return 84;

  case 85:
   return 85;

  case 86:
   return 86;

  case 87:
   return 87;

  case 88:
   return 88;

  case 89:
   return 89;

  case 90:
   return 90;

  case 219:
   return 91;

  case 220:
   return 92;

  case 221:
   return 93;

  case 192:
   return 96;

  case 27:
   return 256;

  case 13:
   return 257;

  case 9:
   return 258;

  case 8:
   return 259;

  case 45:
   return 260;

  case 46:
   return 261;

  case 39:
   return 262;

  case 37:
   return 263;

  case 40:
   return 264;

  case 38:
   return 265;

  case 33:
   return 266;

  case 34:
   return 267;

  case 36:
   return 268;

  case 35:
   return 269;

  case 20:
   return 280;

  case 145:
   return 281;

  case 144:
   return 282;

  case 44:
   return 283;

  case 19:
   return 284;

  case 112:
   return 290;

  case 113:
   return 291;

  case 114:
   return 292;

  case 115:
   return 293;

  case 116:
   return 294;

  case 117:
   return 295;

  case 118:
   return 296;

  case 119:
   return 297;

  case 120:
   return 298;

  case 121:
   return 299;

  case 122:
   return 300;

  case 123:
   return 301;

  case 124:
   return 302;

  case 125:
   return 303;

  case 126:
   return 304;

  case 127:
   return 305;

  case 128:
   return 306;

  case 129:
   return 307;

  case 130:
   return 308;

  case 131:
   return 309;

  case 132:
   return 310;

  case 133:
   return 311;

  case 134:
   return 312;

  case 135:
   return 313;

  case 136:
   return 314;

  case 96:
   return 320;

  case 97:
   return 321;

  case 98:
   return 322;

  case 99:
   return 323;

  case 100:
   return 324;

  case 101:
   return 325;

  case 102:
   return 326;

  case 103:
   return 327;

  case 104:
   return 328;

  case 105:
   return 329;

  case 110:
   return 330;

  case 111:
   return 331;

  case 106:
   return 332;

  case 109:
   return 333;

  case 107:
   return 334;

  case 16:
   return 340;

  case 17:
   return 341;

  case 18:
   return 342;

  case 91:
   return 343;

  case 224:
   return 343;

  case 93:
   return 348;

  default:
   return -1;
  }
 },
 getModBits: win => {
  var mod = 0;
  if (win.keys[340]) mod |= 1;
  if (win.keys[341]) mod |= 2;
  if (win.keys[342]) mod |= 4;
  if (win.keys[343] || win.keys[348]) mod |= 8;
  return mod;
 },
 onKeyPress: event => {
  if (!GLFW.active || !GLFW.active.charFunc) return;
  if (event.ctrlKey || event.metaKey) return;
  var charCode = event.charCode;
  if (charCode == 0 || (charCode >= 0 && charCode <= 31)) return;
  getWasmTableEntry(GLFW.active.charFunc)(GLFW.active.id, charCode);
 },
 onKeyChanged: (keyCode, status) => {
  if (!GLFW.active) return;
  var key = GLFW.DOMToGLFWKeyCode(keyCode);
  if (key == -1) return;
  var repeat = status && GLFW.active.keys[key];
  GLFW.active.keys[key] = status;
  GLFW.active.domKeys[keyCode] = status;
  if (GLFW.active.keyFunc) {
   if (repeat) status = 2;
   getWasmTableEntry(GLFW.active.keyFunc)(GLFW.active.id, key, keyCode, status, GLFW.getModBits(GLFW.active));
  }
 },
 onGamepadConnected: event => {
  GLFW.refreshJoysticks();
 },
 onGamepadDisconnected: event => {
  GLFW.refreshJoysticks();
 },
 onKeydown: event => {
  GLFW.onKeyChanged(event.keyCode, 1);
  if (event.keyCode === 8 || /* backspace */ event.keyCode === 9) /* tab */ {
   event.preventDefault();
  }
 },
 onKeyup: event => {
  GLFW.onKeyChanged(event.keyCode, 0);
 },
 onBlur: event => {
  if (!GLFW.active) return;
  for (var i = 0; i < GLFW.active.domKeys.length; ++i) {
   if (GLFW.active.domKeys[i]) {
    GLFW.onKeyChanged(i, 0);
   }
  }
 },
 onMousemove: event => {
  if (!GLFW.active) return;
  if (event.type === "touchmove") {
   event.preventDefault();
   let primaryChanged = false;
   for (let i of event.changedTouches) {
    if (GLFW.primaryTouchId === i.identifier) {
     Browser.setMouseCoords(i.pageX, i.pageY);
     primaryChanged = true;
     break;
    }
   }
   if (!primaryChanged) {
    return;
   }
  } else {
   Browser.calculateMouseEvent(event);
  }
  if (event.target != Module["canvas"] || !GLFW.active.cursorPosFunc) return;
  if (GLFW.active.cursorPosFunc) {
   getWasmTableEntry(GLFW.active.cursorPosFunc)(GLFW.active.id, Browser.mouseX, Browser.mouseY);
  }
 },
 DOMToGLFWMouseButton: event => {
  var eventButton = event["button"];
  if (eventButton > 0) {
   if (eventButton == 1) {
    eventButton = 2;
   } else {
    eventButton = 1;
   }
  }
  return eventButton;
 },
 onMouseenter: event => {
  if (!GLFW.active) return;
  if (event.target != Module["canvas"]) return;
  if (GLFW.active.cursorEnterFunc) {
   getWasmTableEntry(GLFW.active.cursorEnterFunc)(GLFW.active.id, 1);
  }
 },
 onMouseleave: event => {
  if (!GLFW.active) return;
  if (event.target != Module["canvas"]) return;
  if (GLFW.active.cursorEnterFunc) {
   getWasmTableEntry(GLFW.active.cursorEnterFunc)(GLFW.active.id, 0);
  }
 },
 onMouseButtonChanged: (event, status) => {
  if (!GLFW.active) return;
  if (event.target != Module["canvas"]) return;
  const isTouchType = event.type === "touchstart" || event.type === "touchend" || event.type === "touchcancel";
  let eventButton = 0;
  if (isTouchType) {
   event.preventDefault();
   let primaryChanged = false;
   if (GLFW.primaryTouchId === null && event.type === "touchstart" && event.targetTouches.length > 0) {
    const chosenTouch = event.targetTouches[0];
    GLFW.primaryTouchId = chosenTouch.identifier;
    Browser.setMouseCoords(chosenTouch.pageX, chosenTouch.pageY);
    primaryChanged = true;
   } else if (event.type === "touchend" || event.type === "touchcancel") {
    for (let i of event.changedTouches) {
     if (GLFW.primaryTouchId === i.identifier) {
      GLFW.primaryTouchId = null;
      primaryChanged = true;
      break;
     }
    }
   }
   if (!primaryChanged) {
    return;
   }
  } else {
   Browser.calculateMouseEvent(event);
   eventButton = GLFW.DOMToGLFWMouseButton(event);
  }
  if (status == 1) {
   GLFW.active.buttons |= (1 << eventButton);
   try {
    event.target.setCapture();
   } catch (e) {}
  } else {
   GLFW.active.buttons &= ~(1 << eventButton);
  }
  if (GLFW.active.mouseButtonFunc) {
   getWasmTableEntry(GLFW.active.mouseButtonFunc)(GLFW.active.id, eventButton, status, GLFW.getModBits(GLFW.active));
  }
 },
 onMouseButtonDown: event => {
  if (!GLFW.active) return;
  GLFW.onMouseButtonChanged(event, 1);
 },
 onMouseButtonUp: event => {
  if (!GLFW.active) return;
  GLFW.onMouseButtonChanged(event, 0);
 },
 onMouseWheel: event => {
  var delta = -Browser.getMouseWheelDelta(event);
  delta = (delta == 0) ? 0 : (delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1));
  GLFW.wheelPos += delta;
  if (!GLFW.active || !GLFW.active.scrollFunc || event.target != Module["canvas"]) return;
  var sx = 0;
  var sy = delta;
  if (event.type == "mousewheel") {
   sx = event.wheelDeltaX;
  } else {
   sx = event.deltaX;
  }
  getWasmTableEntry(GLFW.active.scrollFunc)(GLFW.active.id, sx, sy);
  event.preventDefault();
 },
 onCanvasResize: (width, height, framebufferWidth, framebufferHeight) => {
  if (!GLFW.active) return;
  var resizeNeeded = false;
  if (document["fullscreen"] || document["fullScreen"] || document["mozFullScreen"] || document["webkitIsFullScreen"]) {
   if (!GLFW.active.fullscreen) {
    resizeNeeded = width != screen.width || height != screen.height;
    GLFW.active.storedX = GLFW.active.x;
    GLFW.active.storedY = GLFW.active.y;
    GLFW.active.storedWidth = GLFW.active.width;
    GLFW.active.storedHeight = GLFW.active.height;
    GLFW.active.x = GLFW.active.y = 0;
    GLFW.active.width = screen.width;
    GLFW.active.height = screen.height;
    GLFW.active.fullscreen = true;
   }
  } else  if (GLFW.active.fullscreen == true) {
   resizeNeeded = width != GLFW.active.storedWidth || height != GLFW.active.storedHeight;
   GLFW.active.x = GLFW.active.storedX;
   GLFW.active.y = GLFW.active.storedY;
   GLFW.active.width = GLFW.active.storedWidth;
   GLFW.active.height = GLFW.active.storedHeight;
   GLFW.active.fullscreen = false;
  }
  if (resizeNeeded) {
   Browser.setCanvasSize(GLFW.active.width, GLFW.active.height);
  } else if (GLFW.active.width != width || GLFW.active.height != height || GLFW.active.framebufferWidth != framebufferWidth || GLFW.active.framebufferHeight != framebufferHeight) {
   GLFW.active.width = width;
   GLFW.active.height = height;
   GLFW.active.framebufferWidth = framebufferWidth;
   GLFW.active.framebufferHeight = framebufferHeight;
   GLFW.onWindowSizeChanged();
   GLFW.onFramebufferSizeChanged();
  }
 },
 onWindowSizeChanged: () => {
  if (!GLFW.active) return;
  if (GLFW.active.windowSizeFunc) {
   getWasmTableEntry(GLFW.active.windowSizeFunc)(GLFW.active.id, GLFW.active.width, GLFW.active.height);
  }
 },
 onFramebufferSizeChanged: () => {
  if (!GLFW.active) return;
  if (GLFW.active.framebufferSizeFunc) {
   getWasmTableEntry(GLFW.active.framebufferSizeFunc)(GLFW.active.id, GLFW.active.framebufferWidth, GLFW.active.framebufferHeight);
  }
 },
 onWindowContentScaleChanged: scale => {
  GLFW.scale = scale;
  if (!GLFW.active) return;
  if (GLFW.active.windowContentScaleFunc) {
   getWasmTableEntry(GLFW.active.windowContentScaleFunc)(GLFW.active.id, GLFW.scale, GLFW.scale);
  }
 },
 getTime: () => _emscripten_get_now() / 1e3,
 setWindowTitle: (winid, title) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return;
  win.title = title;
  if (GLFW.active.id == win.id) {
   _emscripten_set_window_title(title);
  }
 },
 setJoystickCallback: cbfun => {
  var prevcbfun = GLFW.joystickFunc;
  GLFW.joystickFunc = cbfun;
  GLFW.refreshJoysticks();
  return prevcbfun;
 },
 joys: {},
 lastGamepadState: [],
 lastGamepadStateFrame: null,
 refreshJoysticks: () => {
  if (Browser.mainLoop.currentFrameNumber !== GLFW.lastGamepadStateFrame || !Browser.mainLoop.currentFrameNumber) {
   GLFW.lastGamepadState = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads || []);
   GLFW.lastGamepadStateFrame = Browser.mainLoop.currentFrameNumber;
   for (var joy = 0; joy < GLFW.lastGamepadState.length; ++joy) {
    var gamepad = GLFW.lastGamepadState[joy];
    if (gamepad) {
     if (!GLFW.joys[joy]) {
      out("glfw joystick connected:", joy);
      GLFW.joys[joy] = {
       id: stringToNewUTF8(gamepad.id),
       buttonsCount: gamepad.buttons.length,
       axesCount: gamepad.axes.length,
       buttons: _malloc(gamepad.buttons.length),
       axes: _malloc(gamepad.axes.length * 4)
      };
      if (GLFW.joystickFunc) {
       getWasmTableEntry(GLFW.joystickFunc)(joy, 262145);
      }
     }
     var data = GLFW.joys[joy];
     for (var i = 0; i < gamepad.buttons.length; ++i) {
      GROWABLE_HEAP_I8()[data.buttons + i] = gamepad.buttons[i].pressed;
     }
     for (var i = 0; i < gamepad.axes.length; ++i) {
      GROWABLE_HEAP_F32()[((data.axes + i * 4) >> 2)] = gamepad.axes[i];
     }
    } else {
     if (GLFW.joys[joy]) {
      out("glfw joystick disconnected", joy);
      if (GLFW.joystickFunc) {
       getWasmTableEntry(GLFW.joystickFunc)(joy, 262146);
      }
      _free(GLFW.joys[joy].id);
      _free(GLFW.joys[joy].buttons);
      _free(GLFW.joys[joy].axes);
      delete GLFW.joys[joy];
     }
    }
   }
  }
 },
 setKeyCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.keyFunc;
  win.keyFunc = cbfun;
  return prevcbfun;
 },
 setCharCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.charFunc;
  win.charFunc = cbfun;
  return prevcbfun;
 },
 setMouseButtonCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.mouseButtonFunc;
  win.mouseButtonFunc = cbfun;
  return prevcbfun;
 },
 setCursorPosCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.cursorPosFunc;
  win.cursorPosFunc = cbfun;
  return prevcbfun;
 },
 setScrollCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.scrollFunc;
  win.scrollFunc = cbfun;
  return prevcbfun;
 },
 setDropCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.dropFunc;
  win.dropFunc = cbfun;
  return prevcbfun;
 },
 onDrop: event => {
  if (!GLFW.active || !GLFW.active.dropFunc) return;
  if (!event.dataTransfer || !event.dataTransfer.files || event.dataTransfer.files.length == 0) return;
  event.preventDefault();
  return false;
 },
 onDragover: event => {
  if (!GLFW.active || !GLFW.active.dropFunc) return;
  event.preventDefault();
  return false;
 },
 setWindowSizeCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.windowSizeFunc;
  win.windowSizeFunc = cbfun;
  return prevcbfun;
 },
 setWindowCloseCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.windowCloseFunc;
  win.windowCloseFunc = cbfun;
  return prevcbfun;
 },
 setWindowRefreshCallback: (winid, cbfun) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return null;
  var prevcbfun = win.windowRefreshFunc;
  win.windowRefreshFunc = cbfun;
  return prevcbfun;
 },
 onClickRequestPointerLock: e => {
  if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
   Module["canvas"].requestPointerLock();
   e.preventDefault();
  }
 },
 setInputMode: (winid, mode, value) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return;
  switch (mode) {
  case 208897:
   {
    switch (value) {
    case 212993:
     {
      win.inputModes[mode] = value;
      Module["canvas"].removeEventListener("click", GLFW.onClickRequestPointerLock, true);
      Module["canvas"].exitPointerLock();
      break;
     }

    case 212994:
     {
      err("glfwSetInputMode called with GLFW_CURSOR_HIDDEN value not implemented");
      break;
     }

    case 212995:
     {
      win.inputModes[mode] = value;
      Module["canvas"].addEventListener("click", GLFW.onClickRequestPointerLock, true);
      Module["canvas"].requestPointerLock();
      break;
     }

    default:
     {
      err(`glfwSetInputMode called with unknown value parameter value: ${value}`);
      break;
     }
    }
    break;
   }

  case 208898:
   {
    err("glfwSetInputMode called with GLFW_STICKY_KEYS mode not implemented");
    break;
   }

  case 208899:
   {
    err("glfwSetInputMode called with GLFW_STICKY_MOUSE_BUTTONS mode not implemented");
    break;
   }

  case 208900:
   {
    err("glfwSetInputMode called with GLFW_LOCK_KEY_MODS mode not implemented");
    break;
   }

  case 3342341:
   {
    err("glfwSetInputMode called with GLFW_RAW_MOUSE_MOTION mode not implemented");
    break;
   }

  default:
   {
    err(`glfwSetInputMode called with unknown mode parameter value: ${mode}`);
    break;
   }
  }
 },
 getKey: (winid, key) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return 0;
  return win.keys[key];
 },
 getMouseButton: (winid, button) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return 0;
  return (win.buttons & (1 << button)) > 0;
 },
 getCursorPos: (winid, x, y) => {
  GROWABLE_HEAP_F64()[((x) >> 3)] = Browser.mouseX;
  GROWABLE_HEAP_F64()[((y) >> 3)] = Browser.mouseY;
 },
 getMousePos: (winid, x, y) => {
  GROWABLE_HEAP_I32()[((x) >> 2)] = Browser.mouseX;
  GROWABLE_HEAP_I32()[((y) >> 2)] = Browser.mouseY;
 },
 setCursorPos: (winid, x, y) => {},
 getWindowPos: (winid, x, y) => {
  var wx = 0;
  var wy = 0;
  var win = GLFW.WindowFromId(winid);
  if (win) {
   wx = win.x;
   wy = win.y;
  }
  if (x) {
   GROWABLE_HEAP_I32()[((x) >> 2)] = wx;
  }
  if (y) {
   GROWABLE_HEAP_I32()[((y) >> 2)] = wy;
  }
 },
 setWindowPos: (winid, x, y) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return;
  win.x = x;
  win.y = y;
 },
 getWindowSize: (winid, width, height) => {
  var ww = 0;
  var wh = 0;
  var win = GLFW.WindowFromId(winid);
  if (win) {
   ww = win.width;
   wh = win.height;
  }
  if (width) {
   GROWABLE_HEAP_I32()[((width) >> 2)] = ww;
  }
  if (height) {
   GROWABLE_HEAP_I32()[((height) >> 2)] = wh;
  }
 },
 setWindowSize: (winid, width, height) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return;
  if (GLFW.active.id == win.id) {
   Browser.setCanvasSize(width, height);
  }
 },
 defaultWindowHints: () => {
  GLFW.hints = Object.assign({}, GLFW.defaultHints);
 },
 createWindow: (width, height, title, monitor, share) => {
  var i, id;
  for (i = 0; i < GLFW.windows.length && GLFW.windows[i] !== null; i++) {}
  if (i > 0) throw "glfwCreateWindow only supports one window at time currently";
  id = i + 1;
  if (width <= 0 || height <= 0) return 0;
  if (monitor) {
   Browser.requestFullscreen();
  } else {
   Browser.setCanvasSize(width, height);
  }
  for (i = 0; i < GLFW.windows.length && GLFW.windows[i] == null; i++) {}
  var useWebGL = GLFW.hints[139265] > 0;
  if (i == GLFW.windows.length) {
   if (useWebGL) {
    var contextAttributes = {
     antialias: (GLFW.hints[135181] > 1),
     depth: (GLFW.hints[135173] > 0),
     stencil: (GLFW.hints[135174] > 0),
     alpha: (GLFW.hints[135172] > 0)
    };
    Module.ctx = Browser.createContext(Module["canvas"], true, true, contextAttributes);
   } else {
    Browser.init();
   }
  }
  if (!Module.ctx && useWebGL) return 0;
  const canvas = Module["canvas"];
  var win = new GLFW_Window(id, canvas.clientWidth, canvas.clientHeight, canvas.width, canvas.height, title, monitor, share);
  if (id - 1 == GLFW.windows.length) {
   GLFW.windows.push(win);
  } else {
   GLFW.windows[id - 1] = win;
  }
  GLFW.active = win;
  GLFW.adjustCanvasDimensions();
  return win.id;
 },
 destroyWindow: winid => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return;
  if (win.windowCloseFunc) {
   getWasmTableEntry(win.windowCloseFunc)(win.id);
  }
  GLFW.windows[win.id - 1] = null;
  if (GLFW.active.id == win.id) GLFW.active = null;
  for (var i = 0; i < GLFW.windows.length; i++) if (GLFW.windows[i] !== null) return;
  Module.ctx = Browser.destroyContext(Module["canvas"], true, true);
 },
 swapBuffers: winid => {},
 requestFullscreen(lockPointer, resizeCanvas) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  if (typeof Browser.lockPointer == "undefined") Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas == "undefined") Browser.resizeCanvas = false;
  var canvas = Module["canvas"];
  function fullscreenChange() {
   Browser.isFullscreen = false;
   var canvasContainer = canvas.parentNode;
   if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
    canvas.exitFullscreen = Browser.exitFullscreen;
    if (Browser.lockPointer) canvas.requestPointerLock();
    Browser.isFullscreen = true;
    if (Browser.resizeCanvas) {
     Browser.setFullscreenCanvasSize();
    } else {
     Browser.updateCanvasDimensions(canvas);
     Browser.updateResizeListeners();
    }
   } else {
    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
    canvasContainer.parentNode.removeChild(canvasContainer);
    if (Browser.resizeCanvas) {
     Browser.setWindowedCanvasSize();
    } else {
     Browser.updateCanvasDimensions(canvas);
     Browser.updateResizeListeners();
    }
   }
   if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
   if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen);
  }
  if (!Browser.fullscreenHandlersInstalled) {
   Browser.fullscreenHandlersInstalled = true;
   document.addEventListener("fullscreenchange", fullscreenChange, false);
   document.addEventListener("mozfullscreenchange", fullscreenChange, false);
   document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
   document.addEventListener("MSFullscreenChange", fullscreenChange, false);
  }
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);
  canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? () => canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null) || (canvasContainer["webkitRequestFullScreen"] ? () => canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null);
  canvasContainer.requestFullscreen();
 },
 updateCanvasDimensions(canvas, wNative, hNative) {
  const scale = GLFW.getHiDPIScale();
  if (wNative && hNative) {
   canvas.widthNative = wNative;
   canvas.heightNative = hNative;
  } else {
   wNative = canvas.widthNative;
   hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
   if (w / h < Module["forcedAspectRatio"]) {
    w = Math.round(h * Module["forcedAspectRatio"]);
   } else {
    h = Math.round(w / Module["forcedAspectRatio"]);
   }
  }
  if (((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode) && (typeof screen != "undefined")) {
   var factor = Math.min(screen.width / w, screen.height / h);
   w = Math.round(w * factor);
   h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
   wNative = w;
   hNative = h;
  }
  const wNativeScaled = Math.floor(wNative * scale);
  const hNativeScaled = Math.floor(hNative * scale);
  if (canvas.width != wNativeScaled) canvas.width = wNativeScaled;
  if (canvas.height != hNativeScaled) canvas.height = hNativeScaled;
  if (typeof canvas.style != "undefined") {
   if (wNativeScaled != wNative || hNativeScaled != hNative) {
    canvas.style.setProperty("width", wNative + "px", "important");
    canvas.style.setProperty("height", hNative + "px", "important");
   } else {
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
   }
  }
 },
 calculateMouseCoords(pageX, pageY) {
  var rect = Module["canvas"].getBoundingClientRect();
  var cw = Module["canvas"].clientWidth;
  var ch = Module["canvas"].clientHeight;
  var scrollX = ((typeof window.scrollX != "undefined") ? window.scrollX : window.pageXOffset);
  var scrollY = ((typeof window.scrollY != "undefined") ? window.scrollY : window.pageYOffset);
  assert((typeof scrollX != "undefined") && (typeof scrollY != "undefined"), "Unable to retrieve scroll position, mouse positions likely broken.");
  var adjustedX = pageX - (scrollX + rect.left);
  var adjustedY = pageY - (scrollY + rect.top);
  adjustedX = adjustedX * (cw / rect.width);
  adjustedY = adjustedY * (ch / rect.height);
  return {
   x: adjustedX,
   y: adjustedY
  };
 },
 setWindowAttrib: (winid, attrib, value) => {
  var win = GLFW.WindowFromId(winid);
  if (!win) return;
  const isHiDPIAware = GLFW.isHiDPIAware();
  win.attributes[attrib] = value;
  if (isHiDPIAware !== GLFW.isHiDPIAware()) GLFW.adjustCanvasDimensions();
 },
 getDevicePixelRatio() {
  return (typeof devicePixelRatio == "number" && devicePixelRatio) || 1;
 },
 isHiDPIAware() {
  if (GLFW.active) return GLFW.active.attributes[139276] > 0; else return false;
 },
 adjustCanvasDimensions() {
  const canvas = Module["canvas"];
  Browser.updateCanvasDimensions(canvas, canvas.clientWidth, canvas.clientHeight);
  Browser.updateResizeListeners();
 },
 getHiDPIScale() {
  return GLFW.isHiDPIAware() ? GLFW.scale : 1;
 },
 onDevicePixelRatioChange() {
  GLFW.onWindowContentScaleChanged(GLFW.getDevicePixelRatio());
  GLFW.adjustCanvasDimensions();
 },
 GLFW2ParamToGLFW3Param: param => {
  var table = {
   196609: 0,
   196610: 0,
   196611: 0,
   196612: 0,
   196613: 0,
   196614: 0,
   131073: 0,
   131074: 0,
   131075: 0,
   131076: 0,
   131077: 135169,
   131078: 135170,
   131079: 135171,
   131080: 135172,
   131081: 135173,
   131082: 135174,
   131083: 135183,
   131084: 135175,
   131085: 135176,
   131086: 135177,
   131087: 135178,
   131088: 135179,
   131089: 135180,
   131090: 0,
   131091: 135181,
   131092: 139266,
   131093: 139267,
   131094: 139270,
   131095: 139271,
   131096: 139272
  };
  return table[param];
 }
};

var _glfwCreateStandardCursor = shape => {};

var _glfwCreateWindow = (width, height, title, monitor, share) => GLFW.createWindow(width, height, title, monitor, share);

var _glfwDestroyCursor = cursor => {};

var _glfwDestroyWindow = winid => GLFW.destroyWindow(winid);

var _glfwGetClipboardString = win => {};

var _glfwGetCursorPos = (winid, x, y) => GLFW.getCursorPos(winid, x, y);

var _glfwGetFramebufferSize = (winid, width, height) => {
 var ww = 0;
 var wh = 0;
 var win = GLFW.WindowFromId(winid);
 if (win) {
  ww = win.framebufferWidth;
  wh = win.framebufferHeight;
 }
 if (width) {
  GROWABLE_HEAP_I32()[((width) >> 2)] = ww;
 }
 if (height) {
  GROWABLE_HEAP_I32()[((height) >> 2)] = wh;
 }
};

var _glfwGetInputMode = (winid, mode) => {
 var win = GLFW.WindowFromId(winid);
 if (!win) return;
 switch (mode) {
 case 208897:
  {
   if (Browser.pointerLock) {
    win.inputModes[mode] = 212995;
   } else  {
    win.inputModes[mode] = 212993;
   }
  }
 }
 return win.inputModes[mode];
};

var _glfwGetJoystickAxes = (joy, count) => {
 GLFW.refreshJoysticks();
 var state = GLFW.joys[joy];
 if (!state || !state.axes) {
  GROWABLE_HEAP_I32()[((count) >> 2)] = 0;
  return;
 }
 GROWABLE_HEAP_I32()[((count) >> 2)] = state.axesCount;
 return state.axes;
};

var _glfwGetJoystickButtons = (joy, count) => {
 GLFW.refreshJoysticks();
 var state = GLFW.joys[joy];
 if (!state || !state.buttons) {
  GROWABLE_HEAP_I32()[((count) >> 2)] = 0;
  return;
 }
 GROWABLE_HEAP_I32()[((count) >> 2)] = state.buttonsCount;
 return state.buttons;
};

var _glfwGetKey = (winid, key) => GLFW.getKey(winid, key);

var _glfwGetTime = () => GLFW.getTime() - GLFW.initialTime;

var _glfwGetWindowSize = (winid, width, height) => GLFW.getWindowSize(winid, width, height);

var _glfwInit = () => {
 if (GLFW.windows) return 1;
 GLFW.initialTime = GLFW.getTime();
 GLFW.defaultWindowHints();
 GLFW.windows = new Array;
 GLFW.active = null;
 GLFW.scale = GLFW.getDevicePixelRatio();
 window.addEventListener("gamepadconnected", GLFW.onGamepadConnected, true);
 window.addEventListener("gamepaddisconnected", GLFW.onGamepadDisconnected, true);
 window.addEventListener("keydown", GLFW.onKeydown, true);
 window.addEventListener("keypress", GLFW.onKeyPress, true);
 window.addEventListener("keyup", GLFW.onKeyup, true);
 window.addEventListener("blur", GLFW.onBlur, true);
 GLFW.devicePixelRatioMQL = window.matchMedia("(resolution: " + GLFW.getDevicePixelRatio() + "dppx)");
 GLFW.devicePixelRatioMQL.addEventListener("change", GLFW.onDevicePixelRatioChange);
 Module["canvas"].addEventListener("touchmove", GLFW.onMousemove, true);
 Module["canvas"].addEventListener("touchstart", GLFW.onMouseButtonDown, true);
 Module["canvas"].addEventListener("touchcancel", GLFW.onMouseButtonUp, true);
 Module["canvas"].addEventListener("touchend", GLFW.onMouseButtonUp, true);
 Module["canvas"].addEventListener("mousemove", GLFW.onMousemove, true);
 Module["canvas"].addEventListener("mousedown", GLFW.onMouseButtonDown, true);
 Module["canvas"].addEventListener("mouseup", GLFW.onMouseButtonUp, true);
 Module["canvas"].addEventListener("wheel", GLFW.onMouseWheel, true);
 Module["canvas"].addEventListener("mousewheel", GLFW.onMouseWheel, true);
 Module["canvas"].addEventListener("mouseenter", GLFW.onMouseenter, true);
 Module["canvas"].addEventListener("mouseleave", GLFW.onMouseleave, true);
 Module["canvas"].addEventListener("drop", GLFW.onDrop, true);
 Module["canvas"].addEventListener("dragover", GLFW.onDragover, true);
 Browser.requestFullscreen = GLFW.requestFullscreen;
 Browser.calculateMouseCoords = GLFW.calculateMouseCoords;
 Browser.updateCanvasDimensions = GLFW.updateCanvasDimensions;
 Browser.resizeListeners.push((width, height) => {
  if (GLFW.isHiDPIAware()) {
   var canvas = Module["canvas"];
   GLFW.onCanvasResize(canvas.clientWidth, canvas.clientHeight, width, height);
  } else {
   GLFW.onCanvasResize(width, height, width, height);
  }
 });
 return 1;
};

var _glfwPollEvents = () => {};

var _glfwSetCharCallback = (winid, cbfun) => GLFW.setCharCallback(winid, cbfun);

var _glfwSetClipboardString = (win, string) => {};

var _glfwSetCursor = (winid, cursor) => {};

var _glfwSetCursorEnterCallback = (winid, cbfun) => {
 var win = GLFW.WindowFromId(winid);
 if (!win) return null;
 var prevcbfun = win.cursorEnterFunc;
 win.cursorEnterFunc = cbfun;
 return prevcbfun;
};

var _glfwSetCursorPos = (winid, x, y) => GLFW.setCursorPos(winid, x, y);

var _glfwSetCursorPosCallback = (winid, cbfun) => GLFW.setCursorPosCallback(winid, cbfun);

var _glfwSetErrorCallback = cbfun => {
 var prevcbfun = GLFW.errorFunc;
 GLFW.errorFunc = cbfun;
 return prevcbfun;
};

var _glfwSetInputMode = (winid, mode, value) => {
 GLFW.setInputMode(winid, mode, value);
};

var _glfwSetKeyCallback = (winid, cbfun) => GLFW.setKeyCallback(winid, cbfun);

var _glfwSetMonitorCallback = cbfun => {
 var prevcbfun = GLFW.monitorFunc;
 GLFW.monitorFunc = cbfun;
 return prevcbfun;
};

var _glfwSetMouseButtonCallback = (winid, cbfun) => GLFW.setMouseButtonCallback(winid, cbfun);

var _glfwSetScrollCallback = (winid, cbfun) => GLFW.setScrollCallback(winid, cbfun);

var _glfwSetWindowFocusCallback = (winid, cbfun) => {
 var win = GLFW.WindowFromId(winid);
 if (!win) return null;
 var prevcbfun = win.windowFocusFunc;
 win.windowFocusFunc = cbfun;
 return prevcbfun;
};

var _glfwSetWindowSize = (winid, width, height) => GLFW.setWindowSize(winid, width, height);

var _glfwShowWindow = winid => {};

var _glfwTerminate = () => {
 window.removeEventListener("gamepadconnected", GLFW.onGamepadConnected, true);
 window.removeEventListener("gamepaddisconnected", GLFW.onGamepadDisconnected, true);
 window.removeEventListener("keydown", GLFW.onKeydown, true);
 window.removeEventListener("keypress", GLFW.onKeyPress, true);
 window.removeEventListener("keyup", GLFW.onKeyup, true);
 window.removeEventListener("blur", GLFW.onBlur, true);
 Module["canvas"].removeEventListener("touchmove", GLFW.onMousemove, true);
 Module["canvas"].removeEventListener("touchstart", GLFW.onMouseButtonDown, true);
 Module["canvas"].removeEventListener("touchcancel", GLFW.onMouseButtonUp, true);
 Module["canvas"].removeEventListener("touchend", GLFW.onMouseButtonUp, true);
 Module["canvas"].removeEventListener("mousemove", GLFW.onMousemove, true);
 Module["canvas"].removeEventListener("mousedown", GLFW.onMouseButtonDown, true);
 Module["canvas"].removeEventListener("mouseup", GLFW.onMouseButtonUp, true);
 Module["canvas"].removeEventListener("wheel", GLFW.onMouseWheel, true);
 Module["canvas"].removeEventListener("mousewheel", GLFW.onMouseWheel, true);
 Module["canvas"].removeEventListener("mouseenter", GLFW.onMouseenter, true);
 Module["canvas"].removeEventListener("mouseleave", GLFW.onMouseleave, true);
 Module["canvas"].removeEventListener("drop", GLFW.onDrop, true);
 Module["canvas"].removeEventListener("dragover", GLFW.onDragover, true);
 if (GLFW.devicePixelRatioMQL) GLFW.devicePixelRatioMQL.removeEventListener("change", GLFW.onDevicePixelRatioChange);
 Module["canvas"].width = Module["canvas"].height = 1;
 GLFW.windows = null;
 GLFW.active = null;
};

var _glfwWindowHint = (target, hint) => {
 GLFW.hints[target] = hint;
};

var _js_readOneDataRecord = sec => {
 libedfWorker.postMessage({
  method: "read",
  rid: sec,
  buffer: Module.HEAPU8.buffer,
  ptr: Module.dataBuffAddr
 });
};

var arraySum = (array, index) => {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) {}
 return sum;
};

var MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var addDays = (date, days) => {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= (daysInCurrentMonth - newDate.getDate() + 1);
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
};

/** @type {function(string, boolean=, number=)} */ function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}

var writeArrayToMemory = (array, buffer) => {
 assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
 GROWABLE_HEAP_I8().set(array, buffer);
};

var _strftime = (s, maxsize, format, tm) => {
 var tm_zone = GROWABLE_HEAP_U32()[(((tm) + (40)) >> 2)];
 var date = {
  tm_sec: GROWABLE_HEAP_I32()[((tm) >> 2)],
  tm_min: GROWABLE_HEAP_I32()[(((tm) + (4)) >> 2)],
  tm_hour: GROWABLE_HEAP_I32()[(((tm) + (8)) >> 2)],
  tm_mday: GROWABLE_HEAP_I32()[(((tm) + (12)) >> 2)],
  tm_mon: GROWABLE_HEAP_I32()[(((tm) + (16)) >> 2)],
  tm_year: GROWABLE_HEAP_I32()[(((tm) + (20)) >> 2)],
  tm_wday: GROWABLE_HEAP_I32()[(((tm) + (24)) >> 2)],
  tm_yday: GROWABLE_HEAP_I32()[(((tm) + (28)) >> 2)],
  tm_isdst: GROWABLE_HEAP_I32()[(((tm) + (32)) >> 2)],
  tm_gmtoff: GROWABLE_HEAP_I32()[(((tm) + (36)) >> 2)],
  tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
 };
 var pattern = UTF8ToString(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S",
  "%Ec": "%c",
  "%EC": "%C",
  "%Ex": "%m/%d/%y",
  "%EX": "%H:%M:%S",
  "%Ey": "%y",
  "%EY": "%Y",
  "%Od": "%d",
  "%Oe": "%e",
  "%OH": "%H",
  "%OI": "%I",
  "%Om": "%m",
  "%OM": "%M",
  "%OS": "%S",
  "%Ou": "%u",
  "%OU": "%U",
  "%OV": "%V",
  "%Ow": "%w",
  "%OW": "%W",
  "%Oy": "%y"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value == "number" ? value.toString() : (value || "");
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : (value > 0 ? 1 : 0);
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);

  case 1:
   return janFourth;

  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);

  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);

  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);

  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);

  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   }
   return thisDate.getFullYear();
  }
  return thisDate.getFullYear() - 1;
 }
 var EXPANSION_RULES_2 = {
  "%a": date => WEEKDAYS[date.tm_wday].substring(0, 3),
  "%A": date => WEEKDAYS[date.tm_wday],
  "%b": date => MONTHS[date.tm_mon].substring(0, 3),
  "%B": date => MONTHS[date.tm_mon],
  "%C": date => {
   var year = date.tm_year + 1900;
   return leadingNulls((year / 100) | 0, 2);
  },
  "%d": date => leadingNulls(date.tm_mday, 2),
  "%e": date => leadingSomething(date.tm_mday, 2, " "),
  "%g": date => getWeekBasedYear(date).toString().substring(2),
  "%G": getWeekBasedYear,
  "%H": date => leadingNulls(date.tm_hour, 2),
  "%I": date => {
   var twelveHour = date.tm_hour;
   if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
   return leadingNulls(twelveHour, 2);
  },
  "%j": date => leadingNulls(date.tm_mday + arraySum(isLeapYear(date.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date.tm_mon - 1), 3),
  "%m": date => leadingNulls(date.tm_mon + 1, 2),
  "%M": date => leadingNulls(date.tm_min, 2),
  "%n": () => "\n",
  "%p": date => {
   if (date.tm_hour >= 0 && date.tm_hour < 12) {
    return "AM";
   }
   return "PM";
  },
  "%S": date => leadingNulls(date.tm_sec, 2),
  "%t": () => "\t",
  "%u": date => date.tm_wday || 7,
  "%U": date => {
   var days = date.tm_yday + 7 - date.tm_wday;
   return leadingNulls(Math.floor(days / 7), 2);
  },
  "%V": date => {
   var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7) / 7);
   if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
    val++;
   }
   if (!val) {
    val = 52;
    var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
    if (dec31 == 4 || (dec31 == 5 && isLeapYear(date.tm_year % 400 - 1))) {
     val++;
    }
   } else if (val == 53) {
    var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
    if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date.tm_year))) val = 1;
   }
   return leadingNulls(val, 2);
  },
  "%w": date => date.tm_wday,
  "%W": date => {
   var days = date.tm_yday + 7 - ((date.tm_wday + 6) % 7);
   return leadingNulls(Math.floor(days / 7), 2);
  },
  "%y": date => (date.tm_year + 1900).toString().substring(2),
  "%Y": date => date.tm_year + 1900,
  "%z": date => {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = (off / 60) * 100 + (off % 60);
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  },
  "%Z": date => date.tm_zone,
  "%%": () => "%"
 };
 pattern = pattern.replace(/%%/g, "\0\0");
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.includes(rule)) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 pattern = pattern.replace(/\0\0/g, "%");
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
};

var _strftime_l = (s, maxsize, format, tm, loc) => _strftime(s, maxsize, format, tm);

var _wgpuAdapterRelease = id => WebGPU.mgrAdapter.release(id);

var _wgpuBindGroupLayoutRelease = id => WebGPU.mgrBindGroupLayout.release(id);

var _wgpuBindGroupRelease = id => WebGPU.mgrBindGroup.release(id);

var _wgpuBufferDestroy = bufferId => {
 var bufferWrapper = WebGPU.mgrBuffer.objects[bufferId];
 assert(typeof bufferWrapper != "undefined");
 if (bufferWrapper.onUnmap) {
  for (var i = 0; i < bufferWrapper.onUnmap.length; ++i) {
   bufferWrapper.onUnmap[i]();
  }
  bufferWrapper.onUnmap = undefined;
 }
 WebGPU.mgrBuffer.get(bufferId).destroy();
};

var _wgpuBufferRelease = id => WebGPU.mgrBuffer.release(id);

var _wgpuCommandEncoderBeginRenderPass = (encoderId, descriptor) => {
 assert(descriptor);
 function makeColorAttachment(caPtr) {
  var viewPtr = GROWABLE_HEAP_U32()[(((caPtr) + (4)) >> 2)];
  if (viewPtr === 0) {
   return undefined;
  }
  var depthSlice = GROWABLE_HEAP_I32()[(((caPtr) + (8)) >> 2)];
  if (depthSlice == -1) depthSlice = undefined;
  var loadOpInt = GROWABLE_HEAP_U32()[(((caPtr) + (16)) >> 2)];
  assert(loadOpInt !== 0);
  var storeOpInt = GROWABLE_HEAP_U32()[(((caPtr) + (20)) >> 2)];
  assert(storeOpInt !== 0);
  var clearValue = WebGPU.makeColor(caPtr + 24);
  return {
   "view": WebGPU.mgrTextureView.get(viewPtr),
   "depthSlice": depthSlice,
   "resolveTarget": WebGPU.mgrTextureView.get(GROWABLE_HEAP_U32()[(((caPtr) + (12)) >> 2)]),
   "clearValue": clearValue,
   "loadOp": WebGPU.LoadOp[loadOpInt],
   "storeOp": WebGPU.StoreOp[storeOpInt]
  };
 }
 function makeColorAttachments(count, caPtr) {
  var attachments = [];
  for (var i = 0; i < count; ++i) {
   attachments.push(makeColorAttachment(caPtr + 56 * i));
  }
  return attachments;
 }
 function makeDepthStencilAttachment(dsaPtr) {
  if (dsaPtr === 0) return undefined;
  return {
   "view": WebGPU.mgrTextureView.get(GROWABLE_HEAP_U32()[((dsaPtr) >> 2)]),
   "depthClearValue": GROWABLE_HEAP_F32()[(((dsaPtr) + (12)) >> 2)],
   "depthLoadOp": WebGPU.LoadOp[GROWABLE_HEAP_U32()[(((dsaPtr) + (4)) >> 2)]],
   "depthStoreOp": WebGPU.StoreOp[GROWABLE_HEAP_U32()[(((dsaPtr) + (8)) >> 2)]],
   "depthReadOnly": !!(GROWABLE_HEAP_U32()[(((dsaPtr) + (16)) >> 2)]),
   "stencilClearValue": GROWABLE_HEAP_U32()[(((dsaPtr) + (28)) >> 2)],
   "stencilLoadOp": WebGPU.LoadOp[GROWABLE_HEAP_U32()[(((dsaPtr) + (20)) >> 2)]],
   "stencilStoreOp": WebGPU.StoreOp[GROWABLE_HEAP_U32()[(((dsaPtr) + (24)) >> 2)]],
   "stencilReadOnly": !!(GROWABLE_HEAP_U32()[(((dsaPtr) + (32)) >> 2)])
  };
 }
 function makeRenderPassTimestampWrites(twPtr) {
  if (twPtr === 0) return undefined;
  return {
   "querySet": WebGPU.mgrQuerySet.get(GROWABLE_HEAP_U32()[((twPtr) >> 2)]),
   "beginningOfPassWriteIndex": GROWABLE_HEAP_U32()[(((twPtr) + (4)) >> 2)],
   "endOfPassWriteIndex": GROWABLE_HEAP_U32()[(((twPtr) + (8)) >> 2)]
  };
 }
 function makeRenderPassDescriptor(descriptor) {
  assert(descriptor);
  var nextInChainPtr = GROWABLE_HEAP_U32()[((descriptor) >> 2)];
  var maxDrawCount = undefined;
  if (nextInChainPtr !== 0) {
   var sType = GROWABLE_HEAP_U32()[(((nextInChainPtr) + (4)) >> 2)];
   assert(sType === 15);
   assert(0 === GROWABLE_HEAP_U32()[((nextInChainPtr) >> 2)]);
   var renderPassDescriptorMaxDrawCount = nextInChainPtr;
   assert(renderPassDescriptorMaxDrawCount);
   assert(GROWABLE_HEAP_U32()[((renderPassDescriptorMaxDrawCount) >> 2)] === 0);
   maxDrawCount = GROWABLE_HEAP_U32()[((((renderPassDescriptorMaxDrawCount + 4)) + (8)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[(((renderPassDescriptorMaxDrawCount) + (8)) >> 2)];
  }
  var desc = {
   "label": undefined,
   "colorAttachments": makeColorAttachments(GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)], GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)]),
   "depthStencilAttachment": makeDepthStencilAttachment(GROWABLE_HEAP_U32()[(((descriptor) + (16)) >> 2)]),
   "occlusionQuerySet": WebGPU.mgrQuerySet.get(GROWABLE_HEAP_U32()[(((descriptor) + (20)) >> 2)]),
   "timestampWrites": makeRenderPassTimestampWrites(GROWABLE_HEAP_U32()[(((descriptor) + (24)) >> 2)]),
   "maxDrawCount": maxDrawCount
  };
  var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
  if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
  return desc;
 }
 var desc = makeRenderPassDescriptor(descriptor);
 var commandEncoder = WebGPU.mgrCommandEncoder.get(encoderId);
 return WebGPU.mgrRenderPassEncoder.create(commandEncoder.beginRenderPass(desc));
};

var _wgpuCommandEncoderFinish = (encoderId, descriptor) => {
 var commandEncoder = WebGPU.mgrCommandEncoder.get(encoderId);
 return WebGPU.mgrCommandBuffer.create(commandEncoder.finish());
};

var readI53FromI64 = ptr => GROWABLE_HEAP_U32()[((ptr) >> 2)] + GROWABLE_HEAP_I32()[(((ptr) + (4)) >> 2)] * 4294967296;

var _wgpuDeviceCreateBindGroup = (deviceId, descriptor) => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 function makeEntry(entryPtr) {
  assert(entryPtr);
  var bufferId = GROWABLE_HEAP_U32()[(((entryPtr) + (8)) >> 2)];
  var samplerId = GROWABLE_HEAP_U32()[(((entryPtr) + (32)) >> 2)];
  var textureViewId = GROWABLE_HEAP_U32()[(((entryPtr) + (36)) >> 2)];
  assert((bufferId !== 0) + (samplerId !== 0) + (textureViewId !== 0) === 1);
  var binding = GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)];
  if (bufferId) {
   var size = readI53FromI64((entryPtr) + (24));
   if (size == -1) size = undefined;
   return {
    "binding": binding,
    "resource": {
     "buffer": WebGPU.mgrBuffer.get(bufferId),
     "offset": GROWABLE_HEAP_U32()[((((entryPtr + 4)) + (16)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[(((entryPtr) + (16)) >> 2)],
     "size": size
    }
   };
  } else if (samplerId) {
   return {
    "binding": binding,
    "resource": WebGPU.mgrSampler.get(samplerId)
   };
  } else {
   return {
    "binding": binding,
    "resource": WebGPU.mgrTextureView.get(textureViewId)
   };
  }
 }
 function makeEntries(count, entriesPtrs) {
  var entries = [];
  for (var i = 0; i < count; ++i) {
   entries.push(makeEntry(entriesPtrs + 40 * i));
  }
  return entries;
 }
 var desc = {
  "label": undefined,
  "layout": WebGPU.mgrBindGroupLayout.get(GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)]),
  "entries": makeEntries(GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)], GROWABLE_HEAP_U32()[(((descriptor) + (16)) >> 2)])
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrBindGroup.create(device.createBindGroup(desc));
};

var _wgpuDeviceCreateBindGroupLayout = (deviceId, descriptor) => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 function makeBufferEntry(entryPtr) {
  assert(entryPtr);
  var typeInt = GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)];
  if (!typeInt) return undefined;
  return {
   "type": WebGPU.BufferBindingType[typeInt],
   "hasDynamicOffset": !!(GROWABLE_HEAP_U32()[(((entryPtr) + (8)) >> 2)]),
   "minBindingSize": GROWABLE_HEAP_U32()[((((entryPtr + 4)) + (16)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[(((entryPtr) + (16)) >> 2)]
  };
 }
 function makeSamplerEntry(entryPtr) {
  assert(entryPtr);
  var typeInt = GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)];
  if (!typeInt) return undefined;
  return {
   "type": WebGPU.SamplerBindingType[typeInt]
  };
 }
 function makeTextureEntry(entryPtr) {
  assert(entryPtr);
  var sampleTypeInt = GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)];
  if (!sampleTypeInt) return undefined;
  return {
   "sampleType": WebGPU.TextureSampleType[sampleTypeInt],
   "viewDimension": WebGPU.TextureViewDimension[GROWABLE_HEAP_U32()[(((entryPtr) + (8)) >> 2)]],
   "multisampled": !!(GROWABLE_HEAP_U32()[(((entryPtr) + (12)) >> 2)])
  };
 }
 function makeStorageTextureEntry(entryPtr) {
  assert(entryPtr);
  var accessInt = GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)];
  if (!accessInt) return undefined;
  return {
   "access": WebGPU.StorageTextureAccess[accessInt],
   "format": WebGPU.TextureFormat[GROWABLE_HEAP_U32()[(((entryPtr) + (8)) >> 2)]],
   "viewDimension": WebGPU.TextureViewDimension[GROWABLE_HEAP_U32()[(((entryPtr) + (12)) >> 2)]]
  };
 }
 function makeEntry(entryPtr) {
  assert(entryPtr);
  return {
   "binding": GROWABLE_HEAP_U32()[(((entryPtr) + (4)) >> 2)],
   "visibility": GROWABLE_HEAP_U32()[(((entryPtr) + (8)) >> 2)],
   "buffer": makeBufferEntry(entryPtr + 16),
   "sampler": makeSamplerEntry(entryPtr + 40),
   "texture": makeTextureEntry(entryPtr + 48),
   "storageTexture": makeStorageTextureEntry(entryPtr + 64)
  };
 }
 function makeEntries(count, entriesPtrs) {
  var entries = [];
  for (var i = 0; i < count; ++i) {
   entries.push(makeEntry(entriesPtrs + 80 * i));
  }
  return entries;
 }
 var desc = {
  "entries": makeEntries(GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)], GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)])
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrBindGroupLayout.create(device.createBindGroupLayout(desc));
};

var _wgpuDeviceCreateBuffer = (deviceId, descriptor) => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 var mappedAtCreation = !!(GROWABLE_HEAP_U32()[(((descriptor) + (24)) >> 2)]);
 var desc = {
  "label": undefined,
  "usage": GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)],
  "size": GROWABLE_HEAP_U32()[((((descriptor + 4)) + (16)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[(((descriptor) + (16)) >> 2)],
  "mappedAtCreation": mappedAtCreation
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 var device = WebGPU.mgrDevice.get(deviceId);
 var bufferWrapper = {};
 var id = WebGPU.mgrBuffer.create(device.createBuffer(desc), bufferWrapper);
 if (mappedAtCreation) {
  bufferWrapper.mapMode = 2;
  bufferWrapper.onUnmap = [];
 }
 return id;
};

var _wgpuDeviceCreateCommandEncoder = (deviceId, descriptor) => {
 var desc;
 if (descriptor) {
  assert(descriptor);
  assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
  desc = {
   "label": undefined
  };
  var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
  if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 }
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrCommandEncoder.create(device.createCommandEncoder(desc));
};

var _wgpuDeviceCreatePipelineLayout = (deviceId, descriptor) => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 var bglCount = GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)];
 var bglPtr = GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)];
 var bgls = [];
 for (var i = 0; i < bglCount; ++i) {
  bgls.push(WebGPU.mgrBindGroupLayout.get(GROWABLE_HEAP_U32()[(((bglPtr) + (4 * i)) >> 2)]));
 }
 var desc = {
  "label": undefined,
  "bindGroupLayouts": bgls
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrPipelineLayout.create(device.createPipelineLayout(desc));
};

var generateRenderPipelineDesc = descriptor => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 function makePrimitiveState(rsPtr) {
  if (!rsPtr) return undefined;
  assert(rsPtr);
  var nextInChainPtr = GROWABLE_HEAP_U32()[((rsPtr) >> 2)];
  var sType = nextInChainPtr ? GROWABLE_HEAP_U32()[(((nextInChainPtr) + (4)) >> 2)] : 0;
  return {
   "topology": WebGPU.PrimitiveTopology[GROWABLE_HEAP_U32()[(((rsPtr) + (4)) >> 2)]],
   "stripIndexFormat": WebGPU.IndexFormat[GROWABLE_HEAP_U32()[(((rsPtr) + (8)) >> 2)]],
   "frontFace": WebGPU.FrontFace[GROWABLE_HEAP_U32()[(((rsPtr) + (12)) >> 2)]],
   "cullMode": WebGPU.CullMode[GROWABLE_HEAP_U32()[(((rsPtr) + (16)) >> 2)]],
   "unclippedDepth": sType === 7 && !!(GROWABLE_HEAP_U32()[(((nextInChainPtr) + (8)) >> 2)])
  };
 }
 function makeBlendComponent(bdPtr) {
  if (!bdPtr) return undefined;
  return {
   "operation": WebGPU.BlendOperation[GROWABLE_HEAP_U32()[((bdPtr) >> 2)]],
   "srcFactor": WebGPU.BlendFactor[GROWABLE_HEAP_U32()[(((bdPtr) + (4)) >> 2)]],
   "dstFactor": WebGPU.BlendFactor[GROWABLE_HEAP_U32()[(((bdPtr) + (8)) >> 2)]]
  };
 }
 function makeBlendState(bsPtr) {
  if (!bsPtr) return undefined;
  return {
   "alpha": makeBlendComponent(bsPtr + 12),
   "color": makeBlendComponent(bsPtr + 0)
  };
 }
 function makeColorState(csPtr) {
  assert(csPtr);
  assert(GROWABLE_HEAP_U32()[((csPtr) >> 2)] === 0);
  var formatInt = GROWABLE_HEAP_U32()[(((csPtr) + (4)) >> 2)];
  return formatInt === 0 ? undefined : {
   "format": WebGPU.TextureFormat[formatInt],
   "blend": makeBlendState(GROWABLE_HEAP_U32()[(((csPtr) + (8)) >> 2)]),
   "writeMask": GROWABLE_HEAP_U32()[(((csPtr) + (12)) >> 2)]
  };
 }
 function makeColorStates(count, csArrayPtr) {
  var states = [];
  for (var i = 0; i < count; ++i) {
   states.push(makeColorState(csArrayPtr + 16 * i));
  }
  return states;
 }
 function makeStencilStateFace(ssfPtr) {
  assert(ssfPtr);
  return {
   "compare": WebGPU.CompareFunction[GROWABLE_HEAP_U32()[((ssfPtr) >> 2)]],
   "failOp": WebGPU.StencilOperation[GROWABLE_HEAP_U32()[(((ssfPtr) + (4)) >> 2)]],
   "depthFailOp": WebGPU.StencilOperation[GROWABLE_HEAP_U32()[(((ssfPtr) + (8)) >> 2)]],
   "passOp": WebGPU.StencilOperation[GROWABLE_HEAP_U32()[(((ssfPtr) + (12)) >> 2)]]
  };
 }
 function makeDepthStencilState(dssPtr) {
  if (!dssPtr) return undefined;
  assert(dssPtr);
  return {
   "format": WebGPU.TextureFormat[GROWABLE_HEAP_U32()[(((dssPtr) + (4)) >> 2)]],
   "depthWriteEnabled": !!(GROWABLE_HEAP_U32()[(((dssPtr) + (8)) >> 2)]),
   "depthCompare": WebGPU.CompareFunction[GROWABLE_HEAP_U32()[(((dssPtr) + (12)) >> 2)]],
   "stencilFront": makeStencilStateFace(dssPtr + 16),
   "stencilBack": makeStencilStateFace(dssPtr + 32),
   "stencilReadMask": GROWABLE_HEAP_U32()[(((dssPtr) + (48)) >> 2)],
   "stencilWriteMask": GROWABLE_HEAP_U32()[(((dssPtr) + (52)) >> 2)],
   "depthBias": GROWABLE_HEAP_I32()[(((dssPtr) + (56)) >> 2)],
   "depthBiasSlopeScale": GROWABLE_HEAP_F32()[(((dssPtr) + (60)) >> 2)],
   "depthBiasClamp": GROWABLE_HEAP_F32()[(((dssPtr) + (64)) >> 2)]
  };
 }
 function makeVertexAttribute(vaPtr) {
  assert(vaPtr);
  return {
   "format": WebGPU.VertexFormat[GROWABLE_HEAP_U32()[((vaPtr) >> 2)]],
   "offset": GROWABLE_HEAP_U32()[((((vaPtr + 4)) + (8)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[(((vaPtr) + (8)) >> 2)],
   "shaderLocation": GROWABLE_HEAP_U32()[(((vaPtr) + (16)) >> 2)]
  };
 }
 function makeVertexAttributes(count, vaArrayPtr) {
  var vas = [];
  for (var i = 0; i < count; ++i) {
   vas.push(makeVertexAttribute(vaArrayPtr + i * 24));
  }
  return vas;
 }
 function makeVertexBuffer(vbPtr) {
  if (!vbPtr) return undefined;
  var stepModeInt = GROWABLE_HEAP_U32()[(((vbPtr) + (8)) >> 2)];
  return stepModeInt === 1 ? null : {
   "arrayStride": GROWABLE_HEAP_U32()[(((vbPtr + 4)) >> 2)] * 4294967296 + GROWABLE_HEAP_U32()[((vbPtr) >> 2)],
   "stepMode": WebGPU.VertexStepMode[stepModeInt],
   "attributes": makeVertexAttributes(GROWABLE_HEAP_U32()[(((vbPtr) + (12)) >> 2)], GROWABLE_HEAP_U32()[(((vbPtr) + (16)) >> 2)])
  };
 }
 function makeVertexBuffers(count, vbArrayPtr) {
  if (!count) return undefined;
  var vbs = [];
  for (var i = 0; i < count; ++i) {
   vbs.push(makeVertexBuffer(vbArrayPtr + i * 24));
  }
  return vbs;
 }
 function makeVertexState(viPtr) {
  if (!viPtr) return undefined;
  assert(viPtr);
  assert(GROWABLE_HEAP_U32()[((viPtr) >> 2)] === 0);
  var desc = {
   "module": WebGPU.mgrShaderModule.get(GROWABLE_HEAP_U32()[(((viPtr) + (4)) >> 2)]),
   "constants": WebGPU.makePipelineConstants(GROWABLE_HEAP_U32()[(((viPtr) + (12)) >> 2)], GROWABLE_HEAP_U32()[(((viPtr) + (16)) >> 2)]),
   "buffers": makeVertexBuffers(GROWABLE_HEAP_U32()[(((viPtr) + (20)) >> 2)], GROWABLE_HEAP_U32()[(((viPtr) + (24)) >> 2)])
  };
  var entryPointPtr = GROWABLE_HEAP_U32()[(((viPtr) + (8)) >> 2)];
  if (entryPointPtr) desc["entryPoint"] = UTF8ToString(entryPointPtr);
  return desc;
 }
 function makeMultisampleState(msPtr) {
  if (!msPtr) return undefined;
  assert(msPtr);
  assert(GROWABLE_HEAP_U32()[((msPtr) >> 2)] === 0);
  return {
   "count": GROWABLE_HEAP_U32()[(((msPtr) + (4)) >> 2)],
   "mask": GROWABLE_HEAP_U32()[(((msPtr) + (8)) >> 2)],
   "alphaToCoverageEnabled": !!(GROWABLE_HEAP_U32()[(((msPtr) + (12)) >> 2)])
  };
 }
 function makeFragmentState(fsPtr) {
  if (!fsPtr) return undefined;
  assert(fsPtr);
  assert(GROWABLE_HEAP_U32()[((fsPtr) >> 2)] === 0);
  var desc = {
   "module": WebGPU.mgrShaderModule.get(GROWABLE_HEAP_U32()[(((fsPtr) + (4)) >> 2)]),
   "constants": WebGPU.makePipelineConstants(GROWABLE_HEAP_U32()[(((fsPtr) + (12)) >> 2)], GROWABLE_HEAP_U32()[(((fsPtr) + (16)) >> 2)]),
   "targets": makeColorStates(GROWABLE_HEAP_U32()[(((fsPtr) + (20)) >> 2)], GROWABLE_HEAP_U32()[(((fsPtr) + (24)) >> 2)])
  };
  var entryPointPtr = GROWABLE_HEAP_U32()[(((fsPtr) + (8)) >> 2)];
  if (entryPointPtr) desc["entryPoint"] = UTF8ToString(entryPointPtr);
  return desc;
 }
 var desc = {
  "label": undefined,
  "layout": WebGPU.makePipelineLayout(GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)]),
  "vertex": makeVertexState(descriptor + 12),
  "primitive": makePrimitiveState(descriptor + 40),
  "depthStencil": makeDepthStencilState(GROWABLE_HEAP_U32()[(((descriptor) + (60)) >> 2)]),
  "multisample": makeMultisampleState(descriptor + 64),
  "fragment": makeFragmentState(GROWABLE_HEAP_U32()[(((descriptor) + (80)) >> 2)])
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 return desc;
};

var _wgpuDeviceCreateRenderPipeline = (deviceId, descriptor) => {
 var desc = generateRenderPipelineDesc(descriptor);
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrRenderPipeline.create(device.createRenderPipeline(desc));
};

var _wgpuDeviceCreateSampler = (deviceId, descriptor) => {
 var desc;
 if (descriptor) {
  assert(descriptor);
  assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
  desc = {
   "label": undefined,
   "addressModeU": WebGPU.AddressMode[GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)]],
   "addressModeV": WebGPU.AddressMode[GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)]],
   "addressModeW": WebGPU.AddressMode[GROWABLE_HEAP_U32()[(((descriptor) + (16)) >> 2)]],
   "magFilter": WebGPU.FilterMode[GROWABLE_HEAP_U32()[(((descriptor) + (20)) >> 2)]],
   "minFilter": WebGPU.FilterMode[GROWABLE_HEAP_U32()[(((descriptor) + (24)) >> 2)]],
   "mipmapFilter": WebGPU.MipmapFilterMode[GROWABLE_HEAP_U32()[(((descriptor) + (28)) >> 2)]],
   "lodMinClamp": GROWABLE_HEAP_F32()[(((descriptor) + (32)) >> 2)],
   "lodMaxClamp": GROWABLE_HEAP_F32()[(((descriptor) + (36)) >> 2)],
   "compare": WebGPU.CompareFunction[GROWABLE_HEAP_U32()[(((descriptor) + (40)) >> 2)]]
  };
  var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
  if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 }
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrSampler.create(device.createSampler(desc));
};

var _wgpuDeviceCreateShaderModule = (deviceId, descriptor) => {
 assert(descriptor);
 var nextInChainPtr = GROWABLE_HEAP_U32()[((descriptor) >> 2)];
 assert(nextInChainPtr !== 0);
 var sType = GROWABLE_HEAP_U32()[(((nextInChainPtr) + (4)) >> 2)];
 var desc = {
  "label": undefined,
  "code": ""
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 switch (sType) {
 case 5:
  {
   var count = GROWABLE_HEAP_U32()[(((nextInChainPtr) + (8)) >> 2)];
   var start = GROWABLE_HEAP_U32()[(((nextInChainPtr) + (12)) >> 2)];
   var offset = ((start) >> 2);
   desc["code"] = GROWABLE_HEAP_U32().slice(offset, offset + count);
   break;
  }

 case 6:
  {
   var sourcePtr = GROWABLE_HEAP_U32()[(((nextInChainPtr) + (8)) >> 2)];
   if (sourcePtr) {
    desc["code"] = UTF8ToString(sourcePtr);
   }
   break;
  }

 default:
  abort("unrecognized ShaderModule sType");
 }
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrShaderModule.create(device.createShaderModule(desc));
};

var _wgpuDeviceCreateSwapChain = (deviceId, surfaceId, descriptor) => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 var device = WebGPU.mgrDevice.get(deviceId);
 var context = WebGPU.mgrSurface.get(surfaceId);
 assert(1 === GROWABLE_HEAP_U32()[(((descriptor) + (24)) >> 2)]);
 var canvasSize = [ GROWABLE_HEAP_U32()[(((descriptor) + (16)) >> 2)], GROWABLE_HEAP_U32()[(((descriptor) + (20)) >> 2)] ];
 if (canvasSize[0] !== 0) {
  context["canvas"]["width"] = canvasSize[0];
 }
 if (canvasSize[1] !== 0) {
  context["canvas"]["height"] = canvasSize[1];
 }
 var configuration = {
  "device": device,
  "format": WebGPU.TextureFormat[GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)]],
  "usage": GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)],
  "alphaMode": "opaque"
 };
 context.configure(configuration);
 return WebGPU.mgrSwapChain.create(context);
};

var _wgpuDeviceCreateTexture = (deviceId, descriptor) => {
 assert(descriptor);
 assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
 var desc = {
  "label": undefined,
  "size": WebGPU.makeExtent3D(descriptor + 16),
  "mipLevelCount": GROWABLE_HEAP_U32()[(((descriptor) + (32)) >> 2)],
  "sampleCount": GROWABLE_HEAP_U32()[(((descriptor) + (36)) >> 2)],
  "dimension": WebGPU.TextureDimension[GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)]],
  "format": WebGPU.TextureFormat[GROWABLE_HEAP_U32()[(((descriptor) + (28)) >> 2)]],
  "usage": GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)]
 };
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 var viewFormatCount = GROWABLE_HEAP_U32()[(((descriptor) + (40)) >> 2)];
 if (viewFormatCount) {
  var viewFormatsPtr = GROWABLE_HEAP_U32()[(((descriptor) + (44)) >> 2)];
  desc["viewFormats"] = Array.from(GROWABLE_HEAP_I32().subarray((((viewFormatsPtr) >> 2)), ((viewFormatsPtr + viewFormatCount * 4) >> 2)), function(format) {
   return WebGPU.TextureFormat[format];
  });
 }
 var device = WebGPU.mgrDevice.get(deviceId);
 return WebGPU.mgrTexture.create(device.createTexture(desc));
};

var _wgpuDeviceGetQueue = deviceId => {
 var queueId = WebGPU.mgrDevice.objects[deviceId].queueId;
 assert(queueId, "wgpuDeviceGetQueue: queue was missing or null");
 WebGPU.mgrQueue.reference(queueId);
 return queueId;
};

var _wgpuDeviceSetUncapturedErrorCallback = (deviceId, callback, userdata) => {
 var device = WebGPU.mgrDevice.get(deviceId);
 device.onuncapturederror = function(ev) {
  callUserCallback(() => {
   var Validation = 1;
   var OutOfMemory = 2;
   var type;
   assert(typeof GPUValidationError != "undefined");
   assert(typeof GPUOutOfMemoryError != "undefined");
   if (ev.error instanceof GPUValidationError) type = Validation; else if (ev.error instanceof GPUOutOfMemoryError) type = OutOfMemory;
   WebGPU.errorCallback(callback, type, ev.error.message, userdata);
  });
 };
};

var findCanvasEventTarget = findEventTarget;

var _wgpuInstanceCreateSurface = (instanceId, descriptor) => {
 assert(descriptor);
 assert(instanceId === 1, "WGPUInstance must be created by wgpuCreateInstance");
 var nextInChainPtr = GROWABLE_HEAP_U32()[((descriptor) >> 2)];
 assert(nextInChainPtr !== 0);
 assert(4 === GROWABLE_HEAP_U32()[(((nextInChainPtr) + (4)) >> 2)]);
 var descriptorFromCanvasHTMLSelector = nextInChainPtr;
 assert(descriptorFromCanvasHTMLSelector);
 assert(GROWABLE_HEAP_U32()[((descriptorFromCanvasHTMLSelector) >> 2)] === 0);
 var selectorPtr = GROWABLE_HEAP_U32()[(((descriptorFromCanvasHTMLSelector) + (8)) >> 2)];
 assert(selectorPtr);
 var canvas = findCanvasEventTarget(selectorPtr);
 var context = canvas.getContext("webgpu");
 assert(context);
 if (!context) return 0;
 var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
 if (labelPtr) context.surfaceLabelWebGPU = UTF8ToString(labelPtr);
 return WebGPU.mgrSurface.create(context);
};

var _wgpuPipelineLayoutRelease = id => WebGPU.mgrPipelineLayout.release(id);

var _wgpuQueueRelease = id => WebGPU.mgrQueue.release(id);

var _wgpuQueueSubmit = (queueId, commandCount, commands) => {
 assert(commands % 4 === 0);
 var queue = WebGPU.mgrQueue.get(queueId);
 var cmds = Array.from(GROWABLE_HEAP_I32().subarray((((commands) >> 2)), ((commands + commandCount * 4) >> 2)), id => WebGPU.mgrCommandBuffer.get(id));
 queue.submit(cmds);
};

function _wgpuQueueWriteBuffer(queueId, bufferId, bufferOffset_low, bufferOffset_high, data, size) {
 var bufferOffset = convertI32PairToI53Checked(bufferOffset_low, bufferOffset_high);
 var queue = WebGPU.mgrQueue.get(queueId);
 var buffer = WebGPU.mgrBuffer.get(bufferId);
 var subarray = GROWABLE_HEAP_U8().subarray(data, data + size);
 queue.writeBuffer(buffer, bufferOffset, subarray, 0, size);
}

var _wgpuQueueWriteTexture = (queueId, destinationPtr, data, dataSize, dataLayoutPtr, writeSizePtr) => {
 var queue = WebGPU.mgrQueue.get(queueId);
 var destination = WebGPU.makeImageCopyTexture(destinationPtr);
 var dataLayout = WebGPU.makeTextureDataLayout(dataLayoutPtr);
 var writeSize = WebGPU.makeExtent3D(writeSizePtr);
 var subarray = GROWABLE_HEAP_U8().subarray(data, data + dataSize);
 queue.writeTexture(destination, subarray, dataLayout, writeSize);
};

var _wgpuRenderPassEncoderDrawIndexed = (passId, indexCount, instanceCount, firstIndex, baseVertex, firstInstance) => {
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 pass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
};

var _wgpuRenderPassEncoderEnd = encoderId => {
 var encoder = WebGPU.mgrRenderPassEncoder.get(encoderId);
 encoder.end();
};

var _wgpuRenderPassEncoderSetBindGroup = (passId, groupIndex, groupId, dynamicOffsetCount, dynamicOffsetsPtr) => {
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 var group = WebGPU.mgrBindGroup.get(groupId);
 if (dynamicOffsetCount == 0) {
  pass.setBindGroup(groupIndex, group);
 } else {
  var offsets = [];
  for (var i = 0; i < dynamicOffsetCount; i++, dynamicOffsetsPtr += 4) {
   offsets.push(GROWABLE_HEAP_U32()[((dynamicOffsetsPtr) >> 2)]);
  }
  pass.setBindGroup(groupIndex, group, offsets);
 }
};

var _wgpuRenderPassEncoderSetBlendConstant = (passId, colorPtr) => {
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 var color = WebGPU.makeColor(colorPtr);
 pass.setBlendConstant(color);
};

function _wgpuRenderPassEncoderSetIndexBuffer(passId, bufferId, format, offset_low, offset_high, size_low, size_high) {
 var offset = convertI32PairToI53Checked(offset_low, offset_high);
 var size = convertI32PairToI53Checked(size_low, size_high);
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 var buffer = WebGPU.mgrBuffer.get(bufferId);
 if (size == -1) size = undefined;
 pass.setIndexBuffer(buffer, WebGPU.IndexFormat[format], offset, size);
}

var _wgpuRenderPassEncoderSetPipeline = (passId, pipelineId) => {
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 var pipeline = WebGPU.mgrRenderPipeline.get(pipelineId);
 pass.setPipeline(pipeline);
};

var _wgpuRenderPassEncoderSetScissorRect = (passId, x, y, w, h) => {
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 pass.setScissorRect(x, y, w, h);
};

function _wgpuRenderPassEncoderSetVertexBuffer(passId, slot, bufferId, offset_low, offset_high, size_low, size_high) {
 var offset = convertI32PairToI53Checked(offset_low, offset_high);
 var size = convertI32PairToI53Checked(size_low, size_high);
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 var buffer = WebGPU.mgrBuffer.get(bufferId);
 if (size == -1) size = undefined;
 pass.setVertexBuffer(slot, buffer, offset, size);
}

var _wgpuRenderPassEncoderSetViewport = (passId, x, y, w, h, minDepth, maxDepth) => {
 var pass = WebGPU.mgrRenderPassEncoder.get(passId);
 pass.setViewport(x, y, w, h, minDepth, maxDepth);
};

var _wgpuRenderPipelineRelease = id => WebGPU.mgrRenderPipeline.release(id);

var _wgpuSamplerRelease = id => WebGPU.mgrSampler.release(id);

var _wgpuShaderModuleRelease = id => WebGPU.mgrShaderModule.release(id);

var _wgpuSurfaceGetPreferredFormat = (surfaceId, adapterId) => {
 var format = navigator["gpu"]["getPreferredCanvasFormat"]();
 return WebGPU.Int_PreferredFormat[format];
};

var _wgpuSurfaceRelease = id => WebGPU.mgrSurface.release(id);

var _wgpuSwapChainGetCurrentTextureView = swapChainId => {
 var context = WebGPU.mgrSwapChain.get(swapChainId);
 return WebGPU.mgrTextureView.create(context.getCurrentTexture().createView());
};

var _wgpuSwapChainRelease = id => WebGPU.mgrSwapChain.release(id);

var _wgpuTextureCreateView = (textureId, descriptor) => {
 var desc;
 if (descriptor) {
  assert(descriptor);
  assert(GROWABLE_HEAP_U32()[((descriptor) >> 2)] === 0);
  var mipLevelCount = GROWABLE_HEAP_U32()[(((descriptor) + (20)) >> 2)];
  var arrayLayerCount = GROWABLE_HEAP_U32()[(((descriptor) + (28)) >> 2)];
  desc = {
   "format": WebGPU.TextureFormat[GROWABLE_HEAP_U32()[(((descriptor) + (8)) >> 2)]],
   "dimension": WebGPU.TextureViewDimension[GROWABLE_HEAP_U32()[(((descriptor) + (12)) >> 2)]],
   "baseMipLevel": GROWABLE_HEAP_U32()[(((descriptor) + (16)) >> 2)],
   "mipLevelCount": mipLevelCount === 4294967295 ? undefined : mipLevelCount,
   "baseArrayLayer": GROWABLE_HEAP_U32()[(((descriptor) + (24)) >> 2)],
   "arrayLayerCount": arrayLayerCount === 4294967295 ? undefined : arrayLayerCount,
   "aspect": WebGPU.TextureAspect[GROWABLE_HEAP_U32()[(((descriptor) + (32)) >> 2)]]
  };
  var labelPtr = GROWABLE_HEAP_U32()[(((descriptor) + (4)) >> 2)];
  if (labelPtr) desc["label"] = UTF8ToString(labelPtr);
 }
 var texture = WebGPU.mgrTexture.get(textureId);
 return WebGPU.mgrTextureView.create(texture.createView(desc));
};

var _wgpuTextureRelease = id => WebGPU.mgrTexture.release(id);

var _wgpuTextureViewRelease = id => WebGPU.mgrTextureView.release(id);

PThread.init();

InternalError = Module["InternalError"] = class InternalError extends Error {
 constructor(message) {
  super(message);
  this.name = "InternalError";
 }
};

embind_init_charCodes();

BindingError = Module["BindingError"] = class BindingError extends Error {
 constructor(message) {
  super(message);
  this.name = "BindingError";
 }
};

init_emval();

UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");

Module["requestFullscreen"] = Browser.requestFullscreen;

Module["requestFullScreen"] = Browser.requestFullScreen;

Module["requestAnimationFrame"] = Browser.requestAnimationFrame;

Module["setCanvasSize"] = Browser.setCanvasSize;

Module["pauseMainLoop"] = Browser.mainLoop.pause;

Module["resumeMainLoop"] = Browser.mainLoop.resume;

Module["getUserMedia"] = Browser.getUserMedia;

Module["createContext"] = Browser.createContext;

var preloadedImages = {};

var preloadedAudios = {};

WebGPU.initManagers();

var GLctx;

var proxiedFunctionTable = [ _proc_exit, exitOnMainThread, _emscripten_get_element_css_size, _emscripten_set_fullscreenchange_callback_on_thread, _emscripten_set_resize_callback_on_thread, _emscripten_set_wheel_callback_on_thread, _environ_get, _environ_sizes_get, _fd_close, _fd_seek, _fd_write, _emscripten_set_window_title ];

function checkIncomingModuleAPI() {
 ignoredModuleProp("fetchSettings");
}

var wasmImports = {
 /** @export */ __assert_fail: ___assert_fail,
 /** @export */ __cxa_throw: ___cxa_throw,
 /** @export */ __emscripten_init_main_thread_js: ___emscripten_init_main_thread_js,
 /** @export */ __emscripten_thread_cleanup: ___emscripten_thread_cleanup,
 /** @export */ _embind_finalize_value_object: __embind_finalize_value_object,
 /** @export */ _embind_register_bigint: __embind_register_bigint,
 /** @export */ _embind_register_bool: __embind_register_bool,
 /** @export */ _embind_register_emval: __embind_register_emval,
 /** @export */ _embind_register_float: __embind_register_float,
 /** @export */ _embind_register_function: __embind_register_function,
 /** @export */ _embind_register_integer: __embind_register_integer,
 /** @export */ _embind_register_memory_view: __embind_register_memory_view,
 /** @export */ _embind_register_std_string: __embind_register_std_string,
 /** @export */ _embind_register_std_wstring: __embind_register_std_wstring,
 /** @export */ _embind_register_value_object: __embind_register_value_object,
 /** @export */ _embind_register_value_object_field: __embind_register_value_object_field,
 /** @export */ _embind_register_void: __embind_register_void,
 /** @export */ _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
 /** @export */ _emscripten_notify_mailbox_postmessage: __emscripten_notify_mailbox_postmessage,
 /** @export */ _emscripten_receive_on_main_thread_js: __emscripten_receive_on_main_thread_js,
 /** @export */ _emscripten_thread_mailbox_await: __emscripten_thread_mailbox_await,
 /** @export */ _emscripten_thread_set_strongref: __emscripten_thread_set_strongref,
 /** @export */ _gmtime_js: __gmtime_js,
 /** @export */ _localtime_js: __localtime_js,
 /** @export */ _mktime_js: __mktime_js,
 /** @export */ _timegm_js: __timegm_js,
 /** @export */ _tzset_js: __tzset_js,
 /** @export */ abort: _abort,
 /** @export */ emscripten_check_blocking_allowed: _emscripten_check_blocking_allowed,
 /** @export */ emscripten_date_now: _emscripten_date_now,
 /** @export */ emscripten_exit_with_live_runtime: _emscripten_exit_with_live_runtime,
 /** @export */ emscripten_get_element_css_size: _emscripten_get_element_css_size,
 /** @export */ emscripten_get_now: _emscripten_get_now,
 /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
 /** @export */ emscripten_set_fullscreenchange_callback_on_thread: _emscripten_set_fullscreenchange_callback_on_thread,
 /** @export */ emscripten_set_main_loop: _emscripten_set_main_loop,
 /** @export */ emscripten_set_resize_callback_on_thread: _emscripten_set_resize_callback_on_thread,
 /** @export */ emscripten_set_wheel_callback_on_thread: _emscripten_set_wheel_callback_on_thread,
 /** @export */ emscripten_webgpu_get_device: _emscripten_webgpu_get_device,
 /** @export */ environ_get: _environ_get,
 /** @export */ environ_sizes_get: _environ_sizes_get,
 /** @export */ exit: _exit,
 /** @export */ fd_close: _fd_close,
 /** @export */ fd_seek: _fd_seek,
 /** @export */ fd_write: _fd_write,
 /** @export */ glfwCreateStandardCursor: _glfwCreateStandardCursor,
 /** @export */ glfwCreateWindow: _glfwCreateWindow,
 /** @export */ glfwDestroyCursor: _glfwDestroyCursor,
 /** @export */ glfwDestroyWindow: _glfwDestroyWindow,
 /** @export */ glfwGetClipboardString: _glfwGetClipboardString,
 /** @export */ glfwGetCursorPos: _glfwGetCursorPos,
 /** @export */ glfwGetFramebufferSize: _glfwGetFramebufferSize,
 /** @export */ glfwGetInputMode: _glfwGetInputMode,
 /** @export */ glfwGetJoystickAxes: _glfwGetJoystickAxes,
 /** @export */ glfwGetJoystickButtons: _glfwGetJoystickButtons,
 /** @export */ glfwGetKey: _glfwGetKey,
 /** @export */ glfwGetTime: _glfwGetTime,
 /** @export */ glfwGetWindowSize: _glfwGetWindowSize,
 /** @export */ glfwInit: _glfwInit,
 /** @export */ glfwPollEvents: _glfwPollEvents,
 /** @export */ glfwSetCharCallback: _glfwSetCharCallback,
 /** @export */ glfwSetClipboardString: _glfwSetClipboardString,
 /** @export */ glfwSetCursor: _glfwSetCursor,
 /** @export */ glfwSetCursorEnterCallback: _glfwSetCursorEnterCallback,
 /** @export */ glfwSetCursorPos: _glfwSetCursorPos,
 /** @export */ glfwSetCursorPosCallback: _glfwSetCursorPosCallback,
 /** @export */ glfwSetErrorCallback: _glfwSetErrorCallback,
 /** @export */ glfwSetInputMode: _glfwSetInputMode,
 /** @export */ glfwSetKeyCallback: _glfwSetKeyCallback,
 /** @export */ glfwSetMonitorCallback: _glfwSetMonitorCallback,
 /** @export */ glfwSetMouseButtonCallback: _glfwSetMouseButtonCallback,
 /** @export */ glfwSetScrollCallback: _glfwSetScrollCallback,
 /** @export */ glfwSetWindowFocusCallback: _glfwSetWindowFocusCallback,
 /** @export */ glfwSetWindowSize: _glfwSetWindowSize,
 /** @export */ glfwShowWindow: _glfwShowWindow,
 /** @export */ glfwTerminate: _glfwTerminate,
 /** @export */ glfwWindowHint: _glfwWindowHint,
 /** @export */ js_readOneDataRecord: _js_readOneDataRecord,
 /** @export */ memory: wasmMemory || Module["wasmMemory"],
 /** @export */ strftime_l: _strftime_l,
 /** @export */ wgpuAdapterRelease: _wgpuAdapterRelease,
 /** @export */ wgpuBindGroupLayoutRelease: _wgpuBindGroupLayoutRelease,
 /** @export */ wgpuBindGroupRelease: _wgpuBindGroupRelease,
 /** @export */ wgpuBufferDestroy: _wgpuBufferDestroy,
 /** @export */ wgpuBufferRelease: _wgpuBufferRelease,
 /** @export */ wgpuCommandEncoderBeginRenderPass: _wgpuCommandEncoderBeginRenderPass,
 /** @export */ wgpuCommandEncoderFinish: _wgpuCommandEncoderFinish,
 /** @export */ wgpuDeviceCreateBindGroup: _wgpuDeviceCreateBindGroup,
 /** @export */ wgpuDeviceCreateBindGroupLayout: _wgpuDeviceCreateBindGroupLayout,
 /** @export */ wgpuDeviceCreateBuffer: _wgpuDeviceCreateBuffer,
 /** @export */ wgpuDeviceCreateCommandEncoder: _wgpuDeviceCreateCommandEncoder,
 /** @export */ wgpuDeviceCreatePipelineLayout: _wgpuDeviceCreatePipelineLayout,
 /** @export */ wgpuDeviceCreateRenderPipeline: _wgpuDeviceCreateRenderPipeline,
 /** @export */ wgpuDeviceCreateSampler: _wgpuDeviceCreateSampler,
 /** @export */ wgpuDeviceCreateShaderModule: _wgpuDeviceCreateShaderModule,
 /** @export */ wgpuDeviceCreateSwapChain: _wgpuDeviceCreateSwapChain,
 /** @export */ wgpuDeviceCreateTexture: _wgpuDeviceCreateTexture,
 /** @export */ wgpuDeviceGetQueue: _wgpuDeviceGetQueue,
 /** @export */ wgpuDeviceSetUncapturedErrorCallback: _wgpuDeviceSetUncapturedErrorCallback,
 /** @export */ wgpuInstanceCreateSurface: _wgpuInstanceCreateSurface,
 /** @export */ wgpuPipelineLayoutRelease: _wgpuPipelineLayoutRelease,
 /** @export */ wgpuQueueRelease: _wgpuQueueRelease,
 /** @export */ wgpuQueueSubmit: _wgpuQueueSubmit,
 /** @export */ wgpuQueueWriteBuffer: _wgpuQueueWriteBuffer,
 /** @export */ wgpuQueueWriteTexture: _wgpuQueueWriteTexture,
 /** @export */ wgpuRenderPassEncoderDrawIndexed: _wgpuRenderPassEncoderDrawIndexed,
 /** @export */ wgpuRenderPassEncoderEnd: _wgpuRenderPassEncoderEnd,
 /** @export */ wgpuRenderPassEncoderSetBindGroup: _wgpuRenderPassEncoderSetBindGroup,
 /** @export */ wgpuRenderPassEncoderSetBlendConstant: _wgpuRenderPassEncoderSetBlendConstant,
 /** @export */ wgpuRenderPassEncoderSetIndexBuffer: _wgpuRenderPassEncoderSetIndexBuffer,
 /** @export */ wgpuRenderPassEncoderSetPipeline: _wgpuRenderPassEncoderSetPipeline,
 /** @export */ wgpuRenderPassEncoderSetScissorRect: _wgpuRenderPassEncoderSetScissorRect,
 /** @export */ wgpuRenderPassEncoderSetVertexBuffer: _wgpuRenderPassEncoderSetVertexBuffer,
 /** @export */ wgpuRenderPassEncoderSetViewport: _wgpuRenderPassEncoderSetViewport,
 /** @export */ wgpuRenderPipelineRelease: _wgpuRenderPipelineRelease,
 /** @export */ wgpuSamplerRelease: _wgpuSamplerRelease,
 /** @export */ wgpuShaderModuleRelease: _wgpuShaderModuleRelease,
 /** @export */ wgpuSurfaceGetPreferredFormat: _wgpuSurfaceGetPreferredFormat,
 /** @export */ wgpuSurfaceRelease: _wgpuSurfaceRelease,
 /** @export */ wgpuSwapChainGetCurrentTextureView: _wgpuSwapChainGetCurrentTextureView,
 /** @export */ wgpuSwapChainRelease: _wgpuSwapChainRelease,
 /** @export */ wgpuTextureCreateView: _wgpuTextureCreateView,
 /** @export */ wgpuTextureRelease: _wgpuTextureRelease,
 /** @export */ wgpuTextureViewRelease: _wgpuTextureViewRelease
};

var wasmExports = createWasm();

var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors");

var _main = Module["_main"] = createExportWrapper("__main_argc_argv");

var _free = createExportWrapper("free");

var _malloc = createExportWrapper("malloc");

var __emscripten_tls_init = Module["__emscripten_tls_init"] = createExportWrapper("_emscripten_tls_init");

var _pthread_self = Module["_pthread_self"] = () => (_pthread_self = Module["_pthread_self"] = wasmExports["pthread_self"])();

var ___getTypeName = createExportWrapper("__getTypeName");

var __embind_initialize_bindings = Module["__embind_initialize_bindings"] = createExportWrapper("_embind_initialize_bindings");

var __emscripten_run_callback_on_thread = createExportWrapper("_emscripten_run_callback_on_thread");

var ___funcs_on_exit = createExportWrapper("__funcs_on_exit");

var __emscripten_thread_init = Module["__emscripten_thread_init"] = createExportWrapper("_emscripten_thread_init");

var __emscripten_thread_crashed = Module["__emscripten_thread_crashed"] = createExportWrapper("_emscripten_thread_crashed");

var _emscripten_main_thread_process_queued_calls = createExportWrapper("emscripten_main_thread_process_queued_calls");

var _fflush = createExportWrapper("fflush");

var _emscripten_main_runtime_thread_id = createExportWrapper("emscripten_main_runtime_thread_id");

var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"])();

var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();

var __emscripten_run_on_main_thread_js = createExportWrapper("_emscripten_run_on_main_thread_js");

var __emscripten_thread_free_data = createExportWrapper("_emscripten_thread_free_data");

var __emscripten_thread_exit = Module["__emscripten_thread_exit"] = createExportWrapper("_emscripten_thread_exit");

var __emscripten_check_mailbox = createExportWrapper("_emscripten_check_mailbox");

var _memalign = createExportWrapper("memalign");

var setTempRet0 = createExportWrapper("setTempRet0");

var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports["emscripten_stack_init"])();

var _emscripten_stack_set_limits = (a0, a1) => (_emscripten_stack_set_limits = wasmExports["emscripten_stack_set_limits"])(a0, a1);

var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports["emscripten_stack_get_free"])();

var stackSave = createExportWrapper("stackSave");

var stackRestore = createExportWrapper("stackRestore");

var stackAlloc = createExportWrapper("stackAlloc");

var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();

var ___cxa_is_pointer_type = createExportWrapper("__cxa_is_pointer_type");

var dynCall_jiji = Module["dynCall_jiji"] = createExportWrapper("dynCall_jiji");

var dynCall_viijii = Module["dynCall_viijii"] = createExportWrapper("dynCall_viijii");

var dynCall_iiiiij = Module["dynCall_iiiiij"] = createExportWrapper("dynCall_iiiiij");

var dynCall_iiiiijj = Module["dynCall_iiiiijj"] = createExportWrapper("dynCall_iiiiijj");

var dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = createExportWrapper("dynCall_iiiiiijj");

Module["wasmMemory"] = wasmMemory;

Module["keepRuntimeAlive"] = keepRuntimeAlive;

Module["ExitStatus"] = ExitStatus;

Module["PThread"] = PThread;

var missingLibrarySymbols = [ "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromU64", "convertI32PairToI53", "convertU32PairToI53", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "initRandomFill", "randomFill", "getCallstack", "emscriptenLog", "convertPCtoSourceLocation", "readEmAsmArgs", "jstoi_q", "listenOnce", "autoResumeAudioContext", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "HandleAllocator", "getNativeTypeSize", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "getCFunc", "ccall", "cwrap", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayToString", "AsciiToString", "registerKeyEventCallback", "registerMouseEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSizeCallingThread", "setCanvasElementSizeMainThread", "setCanvasElementSize", "getCanvasSizeCallingThread", "getCanvasSizeMainThread", "getCanvasElementSize", "jsStackTrace", "stackTrace", "checkWasiClock", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "getPromise", "makePromise", "idsToPromises", "makePromiseCallback", "findMatchingCatch", "Browser_asyncPrepareDataCounter", "getSocketFromFD", "getSocketAddress", "heapObjectForWebGLType", "toTypedArrayIndex", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "writeGLArray", "emscripten_webgl_destroy_context_before_on_calling_thread", "registerWebGlEventCallback", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "writeStringToMemory", "writeAsciiToMemory", "setErrNo", "demangle", "getFunctionArgsName", "requireRegisteredType", "createJsInvokerSignature", "init_embind", "getBasestPointer", "registerInheritedInstance", "unregisterInheritedInstance", "getInheritedInstance", "getInheritedInstanceCount", "getLiveInheritedInstances", "enumReadValueFromPointer", "genericPointerToWireType", "constNoSmartPtrRawPointerToWireType", "nonConstNoSmartPtrRawPointerToWireType", "init_RegisteredPointer", "RegisteredPointer", "RegisteredPointer_fromWireType", "runDestructor", "releaseClassHandle", "detachFinalizer", "attachFinalizer", "makeClassHandle", "init_ClassHandle", "ClassHandle", "throwInstanceAlreadyDeleted", "flushPendingDeletes", "setDelayFunction", "RegisteredClass", "shallowCopyInternalPointer", "downcastPointer", "upcastPointer", "validateThis", "char_0", "char_9", "makeLegalFunctionName", "getStringOrSymbol", "emval_get_global", "emval_returnValue", "emval_lookupTypes", "emval_addMethodCaller" ];

missingLibrarySymbols.forEach(missingLibrarySymbol);

var unexportedSymbols = [ "run", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "addRunDependency", "removeRunDependency", "FS_createFolder", "FS_createPath", "FS_createLazyFile", "FS_createLink", "FS_createDevice", "FS_readFile", "out", "err", "callMain", "abort", "wasmExports", "stackAlloc", "stackSave", "stackRestore", "getTempRet0", "setTempRet0", "GROWABLE_HEAP_I8", "GROWABLE_HEAP_U8", "GROWABLE_HEAP_I16", "GROWABLE_HEAP_U16", "GROWABLE_HEAP_I32", "GROWABLE_HEAP_U32", "GROWABLE_HEAP_F32", "GROWABLE_HEAP_F64", "writeStackCookie", "checkStackCookie", "readI53FromI64", "convertI32PairToI53Checked", "ptrToString", "zeroMemory", "exitJS", "getHeapMax", "growMemory", "ENV", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "isLeapYear", "ydayFromDate", "arraySum", "addDays", "ERRNO_CODES", "ERRNO_MESSAGES", "DNS", "Protocols", "Sockets", "timers", "warnOnce", "UNWIND_CACHE", "readEmAsmArgsArray", "jstoi_s", "getExecutableName", "dynCallLegacy", "getDynCaller", "dynCall", "handleException", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "wasmTable", "noExitRuntime", "freeTableIndexes", "functionsInTableMap", "setValue", "getValue", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "intArrayFromString", "stringToAscii", "UTF16Decoder", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "stringToNewUTF8", "stringToUTF8OnStack", "writeArrayToMemory", "JSEvents", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerWheelEventCallback", "registerUiEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "currentFullscreenStrategy", "restoreOldWindowedStyle", "getEnvStrings", "flush_NO_FILESYSTEM", "safeSetTimeout", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "Browser", "setMainLoop", "getPreloadedImageData__data", "wget", "SYSCALLS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "webgl_enable_ANGLE_instanced_arrays", "webgl_enable_OES_vertex_array_object", "webgl_enable_WEBGL_draw_buffers", "webgl_enable_WEBGL_multi_draw", "GL", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "SDL", "SDL_gfx", "GLFW_Window", "GLFW", "WebGPU", "JsValStore", "allocateUTF8", "allocateUTF8OnStack", "terminateWorker", "killThread", "cleanupThread", "registerTLSInit", "cancelThread", "spawnThread", "exitOnMainThread", "proxyToMainThread", "proxiedJSCallArgs", "invokeEntryPoint", "checkMailbox", "InternalError", "BindingError", "throwInternalError", "throwBindingError", "registeredTypes", "awaitingDependencies", "typeDependencies", "tupleRegistrations", "structRegistrations", "sharedRegisterType", "whenDependentTypesAreResolved", "embind_charCodes", "embind_init_charCodes", "readLatin1String", "getTypeName", "getFunctionName", "heap32VectorToArray", "usesDestructorStack", "createJsInvoker", "UnboundTypeError", "PureVirtualError", "GenericWireTypeSize", "EmValType", "throwUnboundTypeError", "ensureOverloadTable", "exposePublicSymbol", "replacePublicSymbol", "extendError", "createNamedFunction", "embindRepr", "registeredInstances", "registeredPointers", "registerType", "integerReadValueFromPointer", "floatReadValueFromPointer", "readPointer", "runDestructors", "newFunc", "craftInvokerFunction", "embind__requireFunction", "finalizationRegistry", "detachFinalizer_deps", "deletionQueue", "delayFunction", "emval_freelist", "emval_handles", "emval_symbols", "init_emval", "count_emval_handles", "Emval", "emval_methodCallers", "reflectConstruct" ];

unexportedSymbols.forEach(unexportedRuntimeSymbol);

var calledRun;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function callMain(args = []) {
 assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
 assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
 var entryFunction = _main;
 args.unshift(thisProgram);
 var argc = args.length;
 var argv = stackAlloc((argc + 1) * 4);
 var argv_ptr = argv;
 args.forEach(arg => {
  GROWABLE_HEAP_U32()[((argv_ptr) >> 2)] = stringToUTF8OnStack(arg);
  argv_ptr += 4;
 });
 GROWABLE_HEAP_U32()[((argv_ptr) >> 2)] = 0;
 try {
  var ret = entryFunction(argc, argv);
  exitJS(ret, /* implicit = */ true);
  return ret;
 } catch (e) {
  return handleException(e);
 }
}

function stackCheckInit() {
 assert(!ENVIRONMENT_IS_PTHREAD);
 _emscripten_stack_init();
 writeStackCookie();
}

function run(args = arguments_) {
 if (runDependencies > 0) {
  return;
 }
 if (!ENVIRONMENT_IS_PTHREAD) stackCheckInit();
 if (ENVIRONMENT_IS_PTHREAD) {
  readyPromiseResolve(Module);
  initRuntime();
  startWorker(Module);
  return;
 }
 preRun();
 if (runDependencies > 0) {
  return;
 }
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  preMain();
  readyPromiseResolve(Module);
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  if (shouldRunNow) callMain(args);
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
 checkStackCookie();
}

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

var shouldRunNow = true;

if (Module["noInitialRun"]) shouldRunNow = false;

run();


  return moduleArg.ready
}
);
})();
export default Module;
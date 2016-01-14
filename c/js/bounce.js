// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 4864;
  /* global initializers */  __ATINIT__.push();
  

memoryInitializer = "bounce.js.mem";





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  var _BDtoIHigh=true;

   
  Module["_i64Subtract"] = _i64Subtract;

   
  Module["_i64Add"] = _i64Add;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _abort() {
      Module['abort']();
    }

  function ___lock() {}

  function ___unlock() {}

  
  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
  
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        flags &= ~0100000 /*O_LARGEFILE*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
        var root = WORKERFS.createNode(null, '/', WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
          // return the parent node, creating subdirs as necessary
          var parts = path.split('/');
          var parent = root;
          for (var i = 0; i < parts.length-1; i++) {
            var curr = parts.slice(0, i+1).join('/');
            if (!createdParents[curr]) {
              createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0);
            }
            parent = createdParents[curr];
          }
          return parent;
        }
        function base(path) {
          var parts = path.split('/');
          return parts[parts.length-1];
        }
        // We also accept FileList here, by using Array.prototype
        Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
          WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
        });
        (mount.opts["blobs"] || []).forEach(function(obj) {
          WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
        });
        (mount.opts["packages"] || []).forEach(function(pack) {
          pack['metadata'].files.forEach(function(file) {
            var name = file.filename.substr(1); // remove initial slash
            WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack['blob'].slice(file.start, file.end));
          });
        });
        return root;
      },createNode:function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
          node.size = contents.size;
          node.contents = contents;
        } else {
          node.size = 4096;
          node.contents = {};
        }
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },node_ops:{getattr:function (node) {
          return {
            dev: 1,
            ino: undefined,
            mode: node.mode,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: undefined,
            size: node.size,
            atime: new Date(node.timestamp),
            mtime: new Date(node.timestamp),
            ctime: new Date(node.timestamp),
            blksize: 4096,
            blocks: Math.ceil(node.size / 4096),
          };
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rename:function (oldNode, newDir, newName) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },unlink:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rmdir:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readdir:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },symlink:function (parent, newName, oldPath) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readlink:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          if (position >= stream.node.size) return 0;
          var chunk = stream.node.contents.slice(position, position + length);
          var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
          buffer.set(new Uint8Array(ab), offset);
          return chunk.size;
        },write:function (stream, buffer, offset, length, position) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.size;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function () {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 0777, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          //Module.printErr(stackTrace()); // useful for debugging
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
          'NODEFS': NODEFS,
          'WORKERFS': WORKERFS,
        };
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function (dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function (func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -ERRNO_CODES.ENOTDIR;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      },doMsync:function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags);
      },doMkdir:function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -ERRNO_CODES.EINVAL;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function (path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length;
      },doAccess:function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -ERRNO_CODES.EINVAL;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -ERRNO_CODES.EACCES;
        }
        return 0;
      },doDup:function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },getStreamFromFD:function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream;
      },getSocketFromFD:function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket;
      },getSocketAddress:function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  var _floor=Math_floor;

  function _gettimeofday(ptr) {
      var now = Date.now();
      HEAP32[((ptr)>>2)]=(now/1000)|0; // seconds
      HEAP32[(((ptr)+(4))>>2)]=((now % 1000)*1000)|0; // microseconds
      return 0;
    }

  var _BItoD=true;

  var _sqrt=Math_sqrt;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
      switch (op) {
        case 21505: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0;
        }
        case 21506: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)]=0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return -ERRNO_CODES.EINVAL; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        default: abort('bad ioctl syscall ' + op);
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_ii": nullFunc_ii, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vi": nullFunc_vi, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "_pthread_cleanup_pop": _pthread_cleanup_pop, "_floor": _floor, "_pthread_self": _pthread_self, "_sqrt": _sqrt, "___lock": ___lock, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_abort": _abort, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "___syscall6": ___syscall6, "_sbrk": _sbrk, "_time": _time, "_gettimeofday": _gettimeofday, "___setErrNo": ___setErrNo, "_emscripten_memcpy_big": _emscripten_memcpy_big, "___syscall54": ___syscall54, "___unlock": ___unlock, "___syscall140": ___syscall140, "_pthread_cleanup_push": _pthread_cleanup_push, "_sysconf": _sysconf, "___syscall146": ___syscall146, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_vi=env.nullFunc_vi;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var _floor=env._floor;
  var _pthread_self=env._pthread_self;
  var _sqrt=env._sqrt;
  var ___lock=env.___lock;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _abort=env._abort;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var ___syscall6=env.___syscall6;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _gettimeofday=env._gettimeofday;
  var ___setErrNo=env.___setErrNo;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var ___syscall140=env.___syscall140;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var _sysconf=env._sysconf;
  var ___syscall146=env.___syscall146;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function _malloc($bytes) {
 $bytes = $bytes | 0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$rsize$3$i = 0, $$sum$i19$i = 0, $$sum2$i21$i = 0, $$sum3132$i$i = 0, $$sum67$i$i = 0, $100 = 0, $1000 = 0, $1002 = 0, $1005 = 0, $1010 = 0, $1016 = 0, $1019 = 0, $1020 = 0, $1027 = 0, $1039 = 0, $1044 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $106 = 0, $1060 = 0, $1062 = 0, $1063 = 0, $110 = 0, $112 = 0, $113 = 0, $115 = 0, $117 = 0, $119 = 0, $12 = 0, $121 = 0, $123 = 0, $125 = 0, $127 = 0, $13 = 0, $132 = 0, $138 = 0, $14 = 0, $141 = 0, $144 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $151 = 0, $154 = 0, $156 = 0, $159 = 0, $16 = 0, $161 = 0, $164 = 0, $167 = 0, $168 = 0, $17 = 0, $170 = 0, $171 = 0, $173 = 0, $174 = 0, $176 = 0, $177 = 0, $18 = 0, $182 = 0, $183 = 0, $192 = 0, $197 = 0, $201 = 0, $207 = 0, $214 = 0, $217 = 0, $225 = 0, $227 = 0, $228 = 0, $229 = 0, $230 = 0, $231 = 0, $232 = 0, $236 = 0, $237 = 0, $245 = 0, $246 = 0, $247 = 0, $249 = 0, $25 = 0, $250 = 0, $255 = 0, $256 = 0, $259 = 0, $261 = 0, $264 = 0, $269 = 0, $276 = 0, $28 = 0, $285 = 0, $286 = 0, $290 = 0, $300 = 0, $303 = 0, $307 = 0, $309 = 0, $31 = 0, $310 = 0, $312 = 0, $314 = 0, $316 = 0, $318 = 0, $320 = 0, $322 = 0, $324 = 0, $334 = 0, $335 = 0, $337 = 0, $34 = 0, $346 = 0, $348 = 0, $351 = 0, $353 = 0, $356 = 0, $358 = 0, $361 = 0, $364 = 0, $365 = 0, $367 = 0, $368 = 0, $370 = 0, $371 = 0, $373 = 0, $374 = 0, $379 = 0, $38 = 0, $380 = 0, $389 = 0, $394 = 0, $398 = 0, $4 = 0, $404 = 0, $41 = 0, $411 = 0, $414 = 0, $422 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $431 = 0, $432 = 0, $438 = 0, $44 = 0, $443 = 0, $444 = 0, $447 = 0, $449 = 0, $452 = 0, $457 = 0, $46 = 0, $463 = 0, $467 = 0, $468 = 0, $47 = 0, $475 = 0, $487 = 0, $49 = 0, $492 = 0, $499 = 0, $5 = 0, $500 = 0, $501 = 0, $509 = 0, $51 = 0, $511 = 0, $512 = 0, $522 = 0, $526 = 0, $528 = 0, $529 = 0, $53 = 0, $538 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $552 = 0, $554 = 0, $555 = 0, $561 = 0, $563 = 0, $565 = 0, $57 = 0, $572 = 0, $574 = 0, $575 = 0, $576 = 0, $584 = 0, $585 = 0, $588 = 0, $59 = 0, $592 = 0, $593 = 0, $596 = 0, $598 = 0, $6 = 0, $602 = 0, $604 = 0, $608 = 0, $61 = 0, $612 = 0, $621 = 0, $622 = 0, $628 = 0, $630 = 0, $632 = 0, $635 = 0, $637 = 0, $64 = 0, $641 = 0, $642 = 0, $648 = 0, $65 = 0, $653 = 0, $655 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $67 = 0, $676 = 0, $678 = 0, $68 = 0, $683 = 0, $685 = 0, $69 = 0, $690 = 0, $692 = 0, $7 = 0, $70 = 0, $702 = 0, $706 = 0, $711 = 0, $714 = 0, $719 = 0, $720 = 0, $724 = 0, $725 = 0, $730 = 0, $736 = 0, $741 = 0, $744 = 0, $745 = 0, $748 = 0, $750 = 0, $752 = 0, $755 = 0, $766 = 0, $77 = 0, $771 = 0, $773 = 0, $776 = 0, $778 = 0, $781 = 0, $784 = 0, $785 = 0, $787 = 0, $788 = 0, $790 = 0, $791 = 0, $793 = 0, $794 = 0, $799 = 0, $80 = 0, $800 = 0, $809 = 0, $81 = 0, $814 = 0, $818 = 0, $824 = 0, $832 = 0, $838 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $847 = 0, $848 = 0, $854 = 0, $859 = 0, $860 = 0, $863 = 0, $865 = 0, $868 = 0, $873 = 0, $879 = 0, $88 = 0, $883 = 0, $884 = 0, $891 = 0, $90 = 0, $903 = 0, $908 = 0, $91 = 0, $915 = 0, $916 = 0, $917 = 0, $92 = 0, $925 = 0, $928 = 0, $929 = 0, $93 = 0, $934 = 0, $94 = 0, $940 = 0, $941 = 0, $943 = 0, $944 = 0, $947 = 0, $95 = 0, $952 = 0, $954 = 0, $959 = 0, $960 = 0, $964 = 0, $970 = 0, $975 = 0, $977 = 0, $978 = 0, $979 = 0, $980 = 0, $984 = 0, $985 = 0, $99 = 0, $991 = 0, $996 = 0, $997 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0, $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, $964$looptemp = 0;
 do if ($bytes >>> 0 < 245) {
  $4 = $bytes >>> 0 < 11 ? 16 : $bytes + 11 & -8;
  $5 = $4 >>> 3;
  $6 = HEAP32[151] | 0;
  $7 = $6 >>> $5;
  if ($7 & 3) {
   $12 = ($7 & 1 ^ 1) + $5 | 0;
   $13 = $12 << 1;
   $14 = 644 + ($13 << 2) | 0;
   $15 = 644 + ($13 + 2 << 2) | 0;
   $16 = HEAP32[$15 >> 2] | 0;
   $17 = $16 + 8 | 0;
   $18 = HEAP32[$17 >> 2] | 0;
   do if (($14 | 0) == ($18 | 0)) HEAP32[151] = $6 & ~(1 << $12); else {
    if ($18 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
    $25 = $18 + 12 | 0;
    if ((HEAP32[$25 >> 2] | 0) == ($16 | 0)) {
     HEAP32[$25 >> 2] = $14;
     HEAP32[$15 >> 2] = $18;
     break;
    } else _abort();
   } while (0);
   $28 = $12 << 3;
   HEAP32[$16 + 4 >> 2] = $28 | 3;
   $31 = $16 + ($28 | 4) | 0;
   HEAP32[$31 >> 2] = HEAP32[$31 >> 2] | 1;
   $mem$0 = $17;
   return $mem$0 | 0;
  }
  $34 = HEAP32[153] | 0;
  if ($4 >>> 0 > $34 >>> 0) {
   if ($7) {
    $38 = 2 << $5;
    $41 = $7 << $5 & ($38 | 0 - $38);
    $44 = ($41 & 0 - $41) + -1 | 0;
    $46 = $44 >>> 12 & 16;
    $47 = $44 >>> $46;
    $49 = $47 >>> 5 & 8;
    $51 = $47 >>> $49;
    $53 = $51 >>> 2 & 4;
    $55 = $51 >>> $53;
    $57 = $55 >>> 1 & 2;
    $59 = $55 >>> $57;
    $61 = $59 >>> 1 & 1;
    $64 = ($49 | $46 | $53 | $57 | $61) + ($59 >>> $61) | 0;
    $65 = $64 << 1;
    $66 = 644 + ($65 << 2) | 0;
    $67 = 644 + ($65 + 2 << 2) | 0;
    $68 = HEAP32[$67 >> 2] | 0;
    $69 = $68 + 8 | 0;
    $70 = HEAP32[$69 >> 2] | 0;
    do if (($66 | 0) == ($70 | 0)) {
     HEAP32[151] = $6 & ~(1 << $64);
     $88 = $34;
    } else {
     if ($70 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
     $77 = $70 + 12 | 0;
     if ((HEAP32[$77 >> 2] | 0) == ($68 | 0)) {
      HEAP32[$77 >> 2] = $66;
      HEAP32[$67 >> 2] = $70;
      $88 = HEAP32[153] | 0;
      break;
     } else _abort();
    } while (0);
    $80 = $64 << 3;
    $81 = $80 - $4 | 0;
    HEAP32[$68 + 4 >> 2] = $4 | 3;
    $84 = $68 + $4 | 0;
    HEAP32[$68 + ($4 | 4) >> 2] = $81 | 1;
    HEAP32[$68 + $80 >> 2] = $81;
    if ($88) {
     $90 = HEAP32[156] | 0;
     $91 = $88 >>> 3;
     $92 = $91 << 1;
     $93 = 644 + ($92 << 2) | 0;
     $94 = HEAP32[151] | 0;
     $95 = 1 << $91;
     if (!($94 & $95)) {
      HEAP32[151] = $94 | $95;
      $$pre$phiZ2D = 644 + ($92 + 2 << 2) | 0;
      $F4$0 = $93;
     } else {
      $99 = 644 + ($92 + 2 << 2) | 0;
      $100 = HEAP32[$99 >> 2] | 0;
      if ($100 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
       $$pre$phiZ2D = $99;
       $F4$0 = $100;
      }
     }
     HEAP32[$$pre$phiZ2D >> 2] = $90;
     HEAP32[$F4$0 + 12 >> 2] = $90;
     HEAP32[$90 + 8 >> 2] = $F4$0;
     HEAP32[$90 + 12 >> 2] = $93;
    }
    HEAP32[153] = $81;
    HEAP32[156] = $84;
    $mem$0 = $69;
    return $mem$0 | 0;
   }
   $106 = HEAP32[152] | 0;
   if (!$106) $nb$0 = $4; else {
    $110 = ($106 & 0 - $106) + -1 | 0;
    $112 = $110 >>> 12 & 16;
    $113 = $110 >>> $112;
    $115 = $113 >>> 5 & 8;
    $117 = $113 >>> $115;
    $119 = $117 >>> 2 & 4;
    $121 = $117 >>> $119;
    $123 = $121 >>> 1 & 2;
    $125 = $121 >>> $123;
    $127 = $125 >>> 1 & 1;
    $132 = HEAP32[908 + (($115 | $112 | $119 | $123 | $127) + ($125 >>> $127) << 2) >> 2] | 0;
    $rsize$0$i = (HEAP32[$132 + 4 >> 2] & -8) - $4 | 0;
    $t$0$i = $132;
    $v$0$i = $132;
    while (1) {
     $138 = HEAP32[$t$0$i + 16 >> 2] | 0;
     if (!$138) {
      $141 = HEAP32[$t$0$i + 20 >> 2] | 0;
      if (!$141) {
       $rsize$0$i$lcssa = $rsize$0$i;
       $v$0$i$lcssa = $v$0$i;
       break;
      } else $144 = $141;
     } else $144 = $138;
     $147 = (HEAP32[$144 + 4 >> 2] & -8) - $4 | 0;
     $148 = $147 >>> 0 < $rsize$0$i >>> 0;
     $rsize$0$i = $148 ? $147 : $rsize$0$i;
     $t$0$i = $144;
     $v$0$i = $148 ? $144 : $v$0$i;
    }
    $149 = HEAP32[155] | 0;
    if ($v$0$i$lcssa >>> 0 < $149 >>> 0) _abort();
    $151 = $v$0$i$lcssa + $4 | 0;
    if ($v$0$i$lcssa >>> 0 >= $151 >>> 0) _abort();
    $154 = HEAP32[$v$0$i$lcssa + 24 >> 2] | 0;
    $156 = HEAP32[$v$0$i$lcssa + 12 >> 2] | 0;
    do if (($156 | 0) == ($v$0$i$lcssa | 0)) {
     $167 = $v$0$i$lcssa + 20 | 0;
     $168 = HEAP32[$167 >> 2] | 0;
     if (!$168) {
      $170 = $v$0$i$lcssa + 16 | 0;
      $171 = HEAP32[$170 >> 2] | 0;
      if (!$171) {
       $R$1$i = 0;
       break;
      } else {
       $R$0$i = $171;
       $RP$0$i = $170;
      }
     } else {
      $R$0$i = $168;
      $RP$0$i = $167;
     }
     while (1) {
      $173 = $R$0$i + 20 | 0;
      $174 = HEAP32[$173 >> 2] | 0;
      if ($174) {
       $R$0$i = $174;
       $RP$0$i = $173;
       continue;
      }
      $176 = $R$0$i + 16 | 0;
      $177 = HEAP32[$176 >> 2] | 0;
      if (!$177) {
       $R$0$i$lcssa = $R$0$i;
       $RP$0$i$lcssa = $RP$0$i;
       break;
      } else {
       $R$0$i = $177;
       $RP$0$i = $176;
      }
     }
     if ($RP$0$i$lcssa >>> 0 < $149 >>> 0) _abort(); else {
      HEAP32[$RP$0$i$lcssa >> 2] = 0;
      $R$1$i = $R$0$i$lcssa;
      break;
     }
    } else {
     $159 = HEAP32[$v$0$i$lcssa + 8 >> 2] | 0;
     if ($159 >>> 0 < $149 >>> 0) _abort();
     $161 = $159 + 12 | 0;
     if ((HEAP32[$161 >> 2] | 0) != ($v$0$i$lcssa | 0)) _abort();
     $164 = $156 + 8 | 0;
     if ((HEAP32[$164 >> 2] | 0) == ($v$0$i$lcssa | 0)) {
      HEAP32[$161 >> 2] = $156;
      HEAP32[$164 >> 2] = $159;
      $R$1$i = $156;
      break;
     } else _abort();
    } while (0);
    do if ($154) {
     $182 = HEAP32[$v$0$i$lcssa + 28 >> 2] | 0;
     $183 = 908 + ($182 << 2) | 0;
     if (($v$0$i$lcssa | 0) == (HEAP32[$183 >> 2] | 0)) {
      HEAP32[$183 >> 2] = $R$1$i;
      if (!$R$1$i) {
       HEAP32[152] = HEAP32[152] & ~(1 << $182);
       break;
      }
     } else {
      if ($154 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
      $192 = $154 + 16 | 0;
      if ((HEAP32[$192 >> 2] | 0) == ($v$0$i$lcssa | 0)) HEAP32[$192 >> 2] = $R$1$i; else HEAP32[$154 + 20 >> 2] = $R$1$i;
      if (!$R$1$i) break;
     }
     $197 = HEAP32[155] | 0;
     if ($R$1$i >>> 0 < $197 >>> 0) _abort();
     HEAP32[$R$1$i + 24 >> 2] = $154;
     $201 = HEAP32[$v$0$i$lcssa + 16 >> 2] | 0;
     do if ($201) if ($201 >>> 0 < $197 >>> 0) _abort(); else {
      HEAP32[$R$1$i + 16 >> 2] = $201;
      HEAP32[$201 + 24 >> 2] = $R$1$i;
      break;
     } while (0);
     $207 = HEAP32[$v$0$i$lcssa + 20 >> 2] | 0;
     if ($207) if ($207 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
      HEAP32[$R$1$i + 20 >> 2] = $207;
      HEAP32[$207 + 24 >> 2] = $R$1$i;
      break;
     }
    } while (0);
    if ($rsize$0$i$lcssa >>> 0 < 16) {
     $214 = $rsize$0$i$lcssa + $4 | 0;
     HEAP32[$v$0$i$lcssa + 4 >> 2] = $214 | 3;
     $217 = $v$0$i$lcssa + ($214 + 4) | 0;
     HEAP32[$217 >> 2] = HEAP32[$217 >> 2] | 1;
    } else {
     HEAP32[$v$0$i$lcssa + 4 >> 2] = $4 | 3;
     HEAP32[$v$0$i$lcssa + ($4 | 4) >> 2] = $rsize$0$i$lcssa | 1;
     HEAP32[$v$0$i$lcssa + ($rsize$0$i$lcssa + $4) >> 2] = $rsize$0$i$lcssa;
     $225 = HEAP32[153] | 0;
     if ($225) {
      $227 = HEAP32[156] | 0;
      $228 = $225 >>> 3;
      $229 = $228 << 1;
      $230 = 644 + ($229 << 2) | 0;
      $231 = HEAP32[151] | 0;
      $232 = 1 << $228;
      if (!($231 & $232)) {
       HEAP32[151] = $231 | $232;
       $$pre$phi$iZ2D = 644 + ($229 + 2 << 2) | 0;
       $F1$0$i = $230;
      } else {
       $236 = 644 + ($229 + 2 << 2) | 0;
       $237 = HEAP32[$236 >> 2] | 0;
       if ($237 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
        $$pre$phi$iZ2D = $236;
        $F1$0$i = $237;
       }
      }
      HEAP32[$$pre$phi$iZ2D >> 2] = $227;
      HEAP32[$F1$0$i + 12 >> 2] = $227;
      HEAP32[$227 + 8 >> 2] = $F1$0$i;
      HEAP32[$227 + 12 >> 2] = $230;
     }
     HEAP32[153] = $rsize$0$i$lcssa;
     HEAP32[156] = $151;
    }
    $mem$0 = $v$0$i$lcssa + 8 | 0;
    return $mem$0 | 0;
   }
  } else $nb$0 = $4;
 } else if ($bytes >>> 0 > 4294967231) $nb$0 = -1; else {
  $245 = $bytes + 11 | 0;
  $246 = $245 & -8;
  $247 = HEAP32[152] | 0;
  if (!$247) $nb$0 = $246; else {
   $249 = 0 - $246 | 0;
   $250 = $245 >>> 8;
   if (!$250) $idx$0$i = 0; else if ($246 >>> 0 > 16777215) $idx$0$i = 31; else {
    $255 = ($250 + 1048320 | 0) >>> 16 & 8;
    $256 = $250 << $255;
    $259 = ($256 + 520192 | 0) >>> 16 & 4;
    $261 = $256 << $259;
    $264 = ($261 + 245760 | 0) >>> 16 & 2;
    $269 = 14 - ($259 | $255 | $264) + ($261 << $264 >>> 15) | 0;
    $idx$0$i = $246 >>> ($269 + 7 | 0) & 1 | $269 << 1;
   }
   $276 = HEAP32[908 + ($idx$0$i << 2) >> 2] | 0;
   L123 : do if (!$276) {
    $rsize$2$i = $249;
    $t$1$i = 0;
    $v$2$i = 0;
    label = 86;
   } else {
    $rsize$0$i15 = $249;
    $rst$0$i = 0;
    $sizebits$0$i = $246 << (($idx$0$i | 0) == 31 ? 0 : 25 - ($idx$0$i >>> 1) | 0);
    $t$0$i14 = $276;
    $v$0$i16 = 0;
    while (1) {
     $285 = HEAP32[$t$0$i14 + 4 >> 2] & -8;
     $286 = $285 - $246 | 0;
     if ($286 >>> 0 < $rsize$0$i15 >>> 0) if (($285 | 0) == ($246 | 0)) {
      $rsize$331$i = $286;
      $t$230$i = $t$0$i14;
      $v$332$i = $t$0$i14;
      label = 90;
      break L123;
     } else {
      $rsize$1$i = $286;
      $v$1$i = $t$0$i14;
     } else {
      $rsize$1$i = $rsize$0$i15;
      $v$1$i = $v$0$i16;
     }
     $290 = HEAP32[$t$0$i14 + 20 >> 2] | 0;
     $t$0$i14 = HEAP32[$t$0$i14 + 16 + ($sizebits$0$i >>> 31 << 2) >> 2] | 0;
     $rst$1$i = ($290 | 0) == 0 | ($290 | 0) == ($t$0$i14 | 0) ? $rst$0$i : $290;
     if (!$t$0$i14) {
      $rsize$2$i = $rsize$1$i;
      $t$1$i = $rst$1$i;
      $v$2$i = $v$1$i;
      label = 86;
      break;
     } else {
      $rsize$0$i15 = $rsize$1$i;
      $rst$0$i = $rst$1$i;
      $sizebits$0$i = $sizebits$0$i << 1;
      $v$0$i16 = $v$1$i;
     }
    }
   } while (0);
   if ((label | 0) == 86) {
    if (($t$1$i | 0) == 0 & ($v$2$i | 0) == 0) {
     $300 = 2 << $idx$0$i;
     $303 = $247 & ($300 | 0 - $300);
     if (!$303) {
      $nb$0 = $246;
      break;
     }
     $307 = ($303 & 0 - $303) + -1 | 0;
     $309 = $307 >>> 12 & 16;
     $310 = $307 >>> $309;
     $312 = $310 >>> 5 & 8;
     $314 = $310 >>> $312;
     $316 = $314 >>> 2 & 4;
     $318 = $314 >>> $316;
     $320 = $318 >>> 1 & 2;
     $322 = $318 >>> $320;
     $324 = $322 >>> 1 & 1;
     $t$2$ph$i = HEAP32[908 + (($312 | $309 | $316 | $320 | $324) + ($322 >>> $324) << 2) >> 2] | 0;
     $v$3$ph$i = 0;
    } else {
     $t$2$ph$i = $t$1$i;
     $v$3$ph$i = $v$2$i;
    }
    if (!$t$2$ph$i) {
     $rsize$3$lcssa$i = $rsize$2$i;
     $v$3$lcssa$i = $v$3$ph$i;
    } else {
     $rsize$331$i = $rsize$2$i;
     $t$230$i = $t$2$ph$i;
     $v$332$i = $v$3$ph$i;
     label = 90;
    }
   }
   if ((label | 0) == 90) while (1) {
    label = 0;
    $334 = (HEAP32[$t$230$i + 4 >> 2] & -8) - $246 | 0;
    $335 = $334 >>> 0 < $rsize$331$i >>> 0;
    $$rsize$3$i = $335 ? $334 : $rsize$331$i;
    $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
    $337 = HEAP32[$t$230$i + 16 >> 2] | 0;
    if ($337) {
     $rsize$331$i = $$rsize$3$i;
     $t$230$i = $337;
     $v$332$i = $t$2$v$3$i;
     label = 90;
     continue;
    }
    $t$230$i = HEAP32[$t$230$i + 20 >> 2] | 0;
    if (!$t$230$i) {
     $rsize$3$lcssa$i = $$rsize$3$i;
     $v$3$lcssa$i = $t$2$v$3$i;
     break;
    } else {
     $rsize$331$i = $$rsize$3$i;
     $v$332$i = $t$2$v$3$i;
     label = 90;
    }
   }
   if (!$v$3$lcssa$i) $nb$0 = $246; else if ($rsize$3$lcssa$i >>> 0 < ((HEAP32[153] | 0) - $246 | 0) >>> 0) {
    $346 = HEAP32[155] | 0;
    if ($v$3$lcssa$i >>> 0 < $346 >>> 0) _abort();
    $348 = $v$3$lcssa$i + $246 | 0;
    if ($v$3$lcssa$i >>> 0 >= $348 >>> 0) _abort();
    $351 = HEAP32[$v$3$lcssa$i + 24 >> 2] | 0;
    $353 = HEAP32[$v$3$lcssa$i + 12 >> 2] | 0;
    do if (($353 | 0) == ($v$3$lcssa$i | 0)) {
     $364 = $v$3$lcssa$i + 20 | 0;
     $365 = HEAP32[$364 >> 2] | 0;
     if (!$365) {
      $367 = $v$3$lcssa$i + 16 | 0;
      $368 = HEAP32[$367 >> 2] | 0;
      if (!$368) {
       $R$1$i20 = 0;
       break;
      } else {
       $R$0$i18 = $368;
       $RP$0$i17 = $367;
      }
     } else {
      $R$0$i18 = $365;
      $RP$0$i17 = $364;
     }
     while (1) {
      $370 = $R$0$i18 + 20 | 0;
      $371 = HEAP32[$370 >> 2] | 0;
      if ($371) {
       $R$0$i18 = $371;
       $RP$0$i17 = $370;
       continue;
      }
      $373 = $R$0$i18 + 16 | 0;
      $374 = HEAP32[$373 >> 2] | 0;
      if (!$374) {
       $R$0$i18$lcssa = $R$0$i18;
       $RP$0$i17$lcssa = $RP$0$i17;
       break;
      } else {
       $R$0$i18 = $374;
       $RP$0$i17 = $373;
      }
     }
     if ($RP$0$i17$lcssa >>> 0 < $346 >>> 0) _abort(); else {
      HEAP32[$RP$0$i17$lcssa >> 2] = 0;
      $R$1$i20 = $R$0$i18$lcssa;
      break;
     }
    } else {
     $356 = HEAP32[$v$3$lcssa$i + 8 >> 2] | 0;
     if ($356 >>> 0 < $346 >>> 0) _abort();
     $358 = $356 + 12 | 0;
     if ((HEAP32[$358 >> 2] | 0) != ($v$3$lcssa$i | 0)) _abort();
     $361 = $353 + 8 | 0;
     if ((HEAP32[$361 >> 2] | 0) == ($v$3$lcssa$i | 0)) {
      HEAP32[$358 >> 2] = $353;
      HEAP32[$361 >> 2] = $356;
      $R$1$i20 = $353;
      break;
     } else _abort();
    } while (0);
    do if ($351) {
     $379 = HEAP32[$v$3$lcssa$i + 28 >> 2] | 0;
     $380 = 908 + ($379 << 2) | 0;
     if (($v$3$lcssa$i | 0) == (HEAP32[$380 >> 2] | 0)) {
      HEAP32[$380 >> 2] = $R$1$i20;
      if (!$R$1$i20) {
       HEAP32[152] = HEAP32[152] & ~(1 << $379);
       break;
      }
     } else {
      if ($351 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
      $389 = $351 + 16 | 0;
      if ((HEAP32[$389 >> 2] | 0) == ($v$3$lcssa$i | 0)) HEAP32[$389 >> 2] = $R$1$i20; else HEAP32[$351 + 20 >> 2] = $R$1$i20;
      if (!$R$1$i20) break;
     }
     $394 = HEAP32[155] | 0;
     if ($R$1$i20 >>> 0 < $394 >>> 0) _abort();
     HEAP32[$R$1$i20 + 24 >> 2] = $351;
     $398 = HEAP32[$v$3$lcssa$i + 16 >> 2] | 0;
     do if ($398) if ($398 >>> 0 < $394 >>> 0) _abort(); else {
      HEAP32[$R$1$i20 + 16 >> 2] = $398;
      HEAP32[$398 + 24 >> 2] = $R$1$i20;
      break;
     } while (0);
     $404 = HEAP32[$v$3$lcssa$i + 20 >> 2] | 0;
     if ($404) if ($404 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
      HEAP32[$R$1$i20 + 20 >> 2] = $404;
      HEAP32[$404 + 24 >> 2] = $R$1$i20;
      break;
     }
    } while (0);
    L199 : do if ($rsize$3$lcssa$i >>> 0 < 16) {
     $411 = $rsize$3$lcssa$i + $246 | 0;
     HEAP32[$v$3$lcssa$i + 4 >> 2] = $411 | 3;
     $414 = $v$3$lcssa$i + ($411 + 4) | 0;
     HEAP32[$414 >> 2] = HEAP32[$414 >> 2] | 1;
    } else {
     HEAP32[$v$3$lcssa$i + 4 >> 2] = $246 | 3;
     HEAP32[$v$3$lcssa$i + ($246 | 4) >> 2] = $rsize$3$lcssa$i | 1;
     HEAP32[$v$3$lcssa$i + ($rsize$3$lcssa$i + $246) >> 2] = $rsize$3$lcssa$i;
     $422 = $rsize$3$lcssa$i >>> 3;
     if ($rsize$3$lcssa$i >>> 0 < 256) {
      $424 = $422 << 1;
      $425 = 644 + ($424 << 2) | 0;
      $426 = HEAP32[151] | 0;
      $427 = 1 << $422;
      if (!($426 & $427)) {
       HEAP32[151] = $426 | $427;
       $$pre$phi$i26Z2D = 644 + ($424 + 2 << 2) | 0;
       $F5$0$i = $425;
      } else {
       $431 = 644 + ($424 + 2 << 2) | 0;
       $432 = HEAP32[$431 >> 2] | 0;
       if ($432 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
        $$pre$phi$i26Z2D = $431;
        $F5$0$i = $432;
       }
      }
      HEAP32[$$pre$phi$i26Z2D >> 2] = $348;
      HEAP32[$F5$0$i + 12 >> 2] = $348;
      HEAP32[$v$3$lcssa$i + ($246 + 8) >> 2] = $F5$0$i;
      HEAP32[$v$3$lcssa$i + ($246 + 12) >> 2] = $425;
      break;
     }
     $438 = $rsize$3$lcssa$i >>> 8;
     if (!$438) $I7$0$i = 0; else if ($rsize$3$lcssa$i >>> 0 > 16777215) $I7$0$i = 31; else {
      $443 = ($438 + 1048320 | 0) >>> 16 & 8;
      $444 = $438 << $443;
      $447 = ($444 + 520192 | 0) >>> 16 & 4;
      $449 = $444 << $447;
      $452 = ($449 + 245760 | 0) >>> 16 & 2;
      $457 = 14 - ($447 | $443 | $452) + ($449 << $452 >>> 15) | 0;
      $I7$0$i = $rsize$3$lcssa$i >>> ($457 + 7 | 0) & 1 | $457 << 1;
     }
     $463 = 908 + ($I7$0$i << 2) | 0;
     HEAP32[$v$3$lcssa$i + ($246 + 28) >> 2] = $I7$0$i;
     HEAP32[$v$3$lcssa$i + ($246 + 20) >> 2] = 0;
     HEAP32[$v$3$lcssa$i + ($246 + 16) >> 2] = 0;
     $467 = HEAP32[152] | 0;
     $468 = 1 << $I7$0$i;
     if (!($467 & $468)) {
      HEAP32[152] = $467 | $468;
      HEAP32[$463 >> 2] = $348;
      HEAP32[$v$3$lcssa$i + ($246 + 24) >> 2] = $463;
      HEAP32[$v$3$lcssa$i + ($246 + 12) >> 2] = $348;
      HEAP32[$v$3$lcssa$i + ($246 + 8) >> 2] = $348;
      break;
     }
     $475 = HEAP32[$463 >> 2] | 0;
     L217 : do if ((HEAP32[$475 + 4 >> 2] & -8 | 0) == ($rsize$3$lcssa$i | 0)) $T$0$lcssa$i = $475; else {
      $K12$029$i = $rsize$3$lcssa$i << (($I7$0$i | 0) == 31 ? 0 : 25 - ($I7$0$i >>> 1) | 0);
      $T$028$i = $475;
      while (1) {
       $492 = $T$028$i + 16 + ($K12$029$i >>> 31 << 2) | 0;
       $487 = HEAP32[$492 >> 2] | 0;
       if (!$487) {
        $$lcssa232 = $492;
        $T$028$i$lcssa = $T$028$i;
        break;
       }
       if ((HEAP32[$487 + 4 >> 2] & -8 | 0) == ($rsize$3$lcssa$i | 0)) {
        $T$0$lcssa$i = $487;
        break L217;
       } else {
        $K12$029$i = $K12$029$i << 1;
        $T$028$i = $487;
       }
      }
      if ($$lcssa232 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
       HEAP32[$$lcssa232 >> 2] = $348;
       HEAP32[$v$3$lcssa$i + ($246 + 24) >> 2] = $T$028$i$lcssa;
       HEAP32[$v$3$lcssa$i + ($246 + 12) >> 2] = $348;
       HEAP32[$v$3$lcssa$i + ($246 + 8) >> 2] = $348;
       break L199;
      }
     } while (0);
     $499 = $T$0$lcssa$i + 8 | 0;
     $500 = HEAP32[$499 >> 2] | 0;
     $501 = HEAP32[155] | 0;
     if ($500 >>> 0 >= $501 >>> 0 & $T$0$lcssa$i >>> 0 >= $501 >>> 0) {
      HEAP32[$500 + 12 >> 2] = $348;
      HEAP32[$499 >> 2] = $348;
      HEAP32[$v$3$lcssa$i + ($246 + 8) >> 2] = $500;
      HEAP32[$v$3$lcssa$i + ($246 + 12) >> 2] = $T$0$lcssa$i;
      HEAP32[$v$3$lcssa$i + ($246 + 24) >> 2] = 0;
      break;
     } else _abort();
    } while (0);
    $mem$0 = $v$3$lcssa$i + 8 | 0;
    return $mem$0 | 0;
   } else $nb$0 = $246;
  }
 } while (0);
 $509 = HEAP32[153] | 0;
 if ($509 >>> 0 >= $nb$0 >>> 0) {
  $511 = $509 - $nb$0 | 0;
  $512 = HEAP32[156] | 0;
  if ($511 >>> 0 > 15) {
   HEAP32[156] = $512 + $nb$0;
   HEAP32[153] = $511;
   HEAP32[$512 + ($nb$0 + 4) >> 2] = $511 | 1;
   HEAP32[$512 + $509 >> 2] = $511;
   HEAP32[$512 + 4 >> 2] = $nb$0 | 3;
  } else {
   HEAP32[153] = 0;
   HEAP32[156] = 0;
   HEAP32[$512 + 4 >> 2] = $509 | 3;
   $522 = $512 + ($509 + 4) | 0;
   HEAP32[$522 >> 2] = HEAP32[$522 >> 2] | 1;
  }
  $mem$0 = $512 + 8 | 0;
  return $mem$0 | 0;
 }
 $526 = HEAP32[154] | 0;
 if ($526 >>> 0 > $nb$0 >>> 0) {
  $528 = $526 - $nb$0 | 0;
  HEAP32[154] = $528;
  $529 = HEAP32[157] | 0;
  HEAP32[157] = $529 + $nb$0;
  HEAP32[$529 + ($nb$0 + 4) >> 2] = $528 | 1;
  HEAP32[$529 + 4 >> 2] = $nb$0 | 3;
  $mem$0 = $529 + 8 | 0;
  return $mem$0 | 0;
 }
 do if (!(HEAP32[269] | 0)) {
  $538 = _sysconf(30) | 0;
  if (!($538 + -1 & $538)) {
   HEAP32[271] = $538;
   HEAP32[270] = $538;
   HEAP32[272] = -1;
   HEAP32[273] = -1;
   HEAP32[274] = 0;
   HEAP32[262] = 0;
   HEAP32[269] = (_time(0) | 0) & -16 ^ 1431655768;
   break;
  } else _abort();
 } while (0);
 $545 = $nb$0 + 48 | 0;
 $546 = HEAP32[271] | 0;
 $547 = $nb$0 + 47 | 0;
 $548 = $546 + $547 | 0;
 $549 = 0 - $546 | 0;
 $550 = $548 & $549;
 if ($550 >>> 0 <= $nb$0 >>> 0) {
  $mem$0 = 0;
  return $mem$0 | 0;
 }
 $552 = HEAP32[261] | 0;
 if ($552) {
  $554 = HEAP32[259] | 0;
  $555 = $554 + $550 | 0;
  if ($555 >>> 0 <= $554 >>> 0 | $555 >>> 0 > $552 >>> 0) {
   $mem$0 = 0;
   return $mem$0 | 0;
  }
 }
 L258 : do if (!(HEAP32[262] & 4)) {
  $561 = HEAP32[157] | 0;
  L260 : do if (!$561) label = 174; else {
   $sp$0$i$i = 1052;
   while (1) {
    $563 = HEAP32[$sp$0$i$i >> 2] | 0;
    if ($563 >>> 0 <= $561 >>> 0) {
     $565 = $sp$0$i$i + 4 | 0;
     if (($563 + (HEAP32[$565 >> 2] | 0) | 0) >>> 0 > $561 >>> 0) {
      $$lcssa228 = $sp$0$i$i;
      $$lcssa230 = $565;
      break;
     }
    }
    $sp$0$i$i = HEAP32[$sp$0$i$i + 8 >> 2] | 0;
    if (!$sp$0$i$i) {
     label = 174;
     break L260;
    }
   }
   $596 = $548 - (HEAP32[154] | 0) & $549;
   if ($596 >>> 0 < 2147483647) {
    $598 = _sbrk($596 | 0) | 0;
    $602 = ($598 | 0) == ((HEAP32[$$lcssa228 >> 2] | 0) + (HEAP32[$$lcssa230 >> 2] | 0) | 0);
    $$3$i = $602 ? $596 : 0;
    if ($602) if (($598 | 0) == (-1 | 0)) $tsize$0323944$i = $$3$i; else {
     $tbase$255$i = $598;
     $tsize$254$i = $$3$i;
     label = 194;
     break L258;
    } else {
     $br$0$ph$i = $598;
     $ssize$1$ph$i = $596;
     $tsize$0$ph$i = $$3$i;
     label = 184;
    }
   } else $tsize$0323944$i = 0;
  } while (0);
  do if ((label | 0) == 174) {
   $572 = _sbrk(0) | 0;
   if (($572 | 0) == (-1 | 0)) $tsize$0323944$i = 0; else {
    $574 = $572;
    $575 = HEAP32[270] | 0;
    $576 = $575 + -1 | 0;
    if (!($576 & $574)) $ssize$0$i = $550; else $ssize$0$i = $550 - $574 + ($576 + $574 & 0 - $575) | 0;
    $584 = HEAP32[259] | 0;
    $585 = $584 + $ssize$0$i | 0;
    if ($ssize$0$i >>> 0 > $nb$0 >>> 0 & $ssize$0$i >>> 0 < 2147483647) {
     $588 = HEAP32[261] | 0;
     if ($588) if ($585 >>> 0 <= $584 >>> 0 | $585 >>> 0 > $588 >>> 0) {
      $tsize$0323944$i = 0;
      break;
     }
     $592 = _sbrk($ssize$0$i | 0) | 0;
     $593 = ($592 | 0) == ($572 | 0);
     $ssize$0$$i = $593 ? $ssize$0$i : 0;
     if ($593) {
      $tbase$255$i = $572;
      $tsize$254$i = $ssize$0$$i;
      label = 194;
      break L258;
     } else {
      $br$0$ph$i = $592;
      $ssize$1$ph$i = $ssize$0$i;
      $tsize$0$ph$i = $ssize$0$$i;
      label = 184;
     }
    } else $tsize$0323944$i = 0;
   }
  } while (0);
  L280 : do if ((label | 0) == 184) {
   $604 = 0 - $ssize$1$ph$i | 0;
   do if ($545 >>> 0 > $ssize$1$ph$i >>> 0 & ($ssize$1$ph$i >>> 0 < 2147483647 & ($br$0$ph$i | 0) != (-1 | 0))) {
    $608 = HEAP32[271] | 0;
    $612 = $547 - $ssize$1$ph$i + $608 & 0 - $608;
    if ($612 >>> 0 < 2147483647) if ((_sbrk($612 | 0) | 0) == (-1 | 0)) {
     _sbrk($604 | 0) | 0;
     $tsize$0323944$i = $tsize$0$ph$i;
     break L280;
    } else {
     $ssize$2$i = $612 + $ssize$1$ph$i | 0;
     break;
    } else $ssize$2$i = $ssize$1$ph$i;
   } else $ssize$2$i = $ssize$1$ph$i; while (0);
   if (($br$0$ph$i | 0) == (-1 | 0)) $tsize$0323944$i = $tsize$0$ph$i; else {
    $tbase$255$i = $br$0$ph$i;
    $tsize$254$i = $ssize$2$i;
    label = 194;
    break L258;
   }
  } while (0);
  HEAP32[262] = HEAP32[262] | 4;
  $tsize$1$i = $tsize$0323944$i;
  label = 191;
 } else {
  $tsize$1$i = 0;
  label = 191;
 } while (0);
 if ((label | 0) == 191) if ($550 >>> 0 < 2147483647) {
  $621 = _sbrk($550 | 0) | 0;
  $622 = _sbrk(0) | 0;
  if ($621 >>> 0 < $622 >>> 0 & (($621 | 0) != (-1 | 0) & ($622 | 0) != (-1 | 0))) {
   $628 = $622 - $621 | 0;
   $630 = $628 >>> 0 > ($nb$0 + 40 | 0) >>> 0;
   if ($630) {
    $tbase$255$i = $621;
    $tsize$254$i = $630 ? $628 : $tsize$1$i;
    label = 194;
   }
  }
 }
 if ((label | 0) == 194) {
  $632 = (HEAP32[259] | 0) + $tsize$254$i | 0;
  HEAP32[259] = $632;
  if ($632 >>> 0 > (HEAP32[260] | 0) >>> 0) HEAP32[260] = $632;
  $635 = HEAP32[157] | 0;
  L299 : do if (!$635) {
   $637 = HEAP32[155] | 0;
   if (($637 | 0) == 0 | $tbase$255$i >>> 0 < $637 >>> 0) HEAP32[155] = $tbase$255$i;
   HEAP32[263] = $tbase$255$i;
   HEAP32[264] = $tsize$254$i;
   HEAP32[266] = 0;
   HEAP32[160] = HEAP32[269];
   HEAP32[159] = -1;
   $i$02$i$i = 0;
   do {
    $641 = $i$02$i$i << 1;
    $642 = 644 + ($641 << 2) | 0;
    HEAP32[644 + ($641 + 3 << 2) >> 2] = $642;
    HEAP32[644 + ($641 + 2 << 2) >> 2] = $642;
    $i$02$i$i = $i$02$i$i + 1 | 0;
   } while (($i$02$i$i | 0) != 32);
   $648 = $tbase$255$i + 8 | 0;
   $653 = ($648 & 7 | 0) == 0 ? 0 : 0 - $648 & 7;
   $655 = $tsize$254$i + -40 - $653 | 0;
   HEAP32[157] = $tbase$255$i + $653;
   HEAP32[154] = $655;
   HEAP32[$tbase$255$i + ($653 + 4) >> 2] = $655 | 1;
   HEAP32[$tbase$255$i + ($tsize$254$i + -36) >> 2] = 40;
   HEAP32[158] = HEAP32[273];
  } else {
   $sp$084$i = 1052;
   do {
    $660 = HEAP32[$sp$084$i >> 2] | 0;
    $661 = $sp$084$i + 4 | 0;
    $662 = HEAP32[$661 >> 2] | 0;
    if (($tbase$255$i | 0) == ($660 + $662 | 0)) {
     $$lcssa222 = $660;
     $$lcssa224 = $661;
     $$lcssa226 = $662;
     $sp$084$i$lcssa = $sp$084$i;
     label = 204;
     break;
    }
    $sp$084$i = HEAP32[$sp$084$i + 8 >> 2] | 0;
   } while (($sp$084$i | 0) != 0);
   if ((label | 0) == 204) if (!(HEAP32[$sp$084$i$lcssa + 12 >> 2] & 8)) if ($635 >>> 0 < $tbase$255$i >>> 0 & $635 >>> 0 >= $$lcssa222 >>> 0) {
    HEAP32[$$lcssa224 >> 2] = $$lcssa226 + $tsize$254$i;
    $676 = (HEAP32[154] | 0) + $tsize$254$i | 0;
    $678 = $635 + 8 | 0;
    $683 = ($678 & 7 | 0) == 0 ? 0 : 0 - $678 & 7;
    $685 = $676 - $683 | 0;
    HEAP32[157] = $635 + $683;
    HEAP32[154] = $685;
    HEAP32[$635 + ($683 + 4) >> 2] = $685 | 1;
    HEAP32[$635 + ($676 + 4) >> 2] = 40;
    HEAP32[158] = HEAP32[273];
    break;
   }
   $690 = HEAP32[155] | 0;
   if ($tbase$255$i >>> 0 < $690 >>> 0) {
    HEAP32[155] = $tbase$255$i;
    $755 = $tbase$255$i;
   } else $755 = $690;
   $692 = $tbase$255$i + $tsize$254$i | 0;
   $sp$183$i = 1052;
   while (1) {
    if ((HEAP32[$sp$183$i >> 2] | 0) == ($692 | 0)) {
     $$lcssa219 = $sp$183$i;
     $sp$183$i$lcssa = $sp$183$i;
     label = 212;
     break;
    }
    $sp$183$i = HEAP32[$sp$183$i + 8 >> 2] | 0;
    if (!$sp$183$i) {
     $sp$0$i$i$i = 1052;
     break;
    }
   }
   if ((label | 0) == 212) if (!(HEAP32[$sp$183$i$lcssa + 12 >> 2] & 8)) {
    HEAP32[$$lcssa219 >> 2] = $tbase$255$i;
    $702 = $sp$183$i$lcssa + 4 | 0;
    HEAP32[$702 >> 2] = (HEAP32[$702 >> 2] | 0) + $tsize$254$i;
    $706 = $tbase$255$i + 8 | 0;
    $711 = ($706 & 7 | 0) == 0 ? 0 : 0 - $706 & 7;
    $714 = $tbase$255$i + ($tsize$254$i + 8) | 0;
    $719 = ($714 & 7 | 0) == 0 ? 0 : 0 - $714 & 7;
    $720 = $tbase$255$i + ($719 + $tsize$254$i) | 0;
    $$sum$i19$i = $711 + $nb$0 | 0;
    $724 = $tbase$255$i + $$sum$i19$i | 0;
    $725 = $720 - ($tbase$255$i + $711) - $nb$0 | 0;
    HEAP32[$tbase$255$i + ($711 + 4) >> 2] = $nb$0 | 3;
    L324 : do if (($720 | 0) == ($635 | 0)) {
     $730 = (HEAP32[154] | 0) + $725 | 0;
     HEAP32[154] = $730;
     HEAP32[157] = $724;
     HEAP32[$tbase$255$i + ($$sum$i19$i + 4) >> 2] = $730 | 1;
    } else {
     if (($720 | 0) == (HEAP32[156] | 0)) {
      $736 = (HEAP32[153] | 0) + $725 | 0;
      HEAP32[153] = $736;
      HEAP32[156] = $724;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 4) >> 2] = $736 | 1;
      HEAP32[$tbase$255$i + ($736 + $$sum$i19$i) >> 2] = $736;
      break;
     }
     $$sum2$i21$i = $tsize$254$i + 4 | 0;
     $741 = HEAP32[$tbase$255$i + ($$sum2$i21$i + $719) >> 2] | 0;
     if (($741 & 3 | 0) == 1) {
      $744 = $741 & -8;
      $745 = $741 >>> 3;
      L332 : do if ($741 >>> 0 < 256) {
       $748 = HEAP32[$tbase$255$i + (($719 | 8) + $tsize$254$i) >> 2] | 0;
       $750 = HEAP32[$tbase$255$i + ($tsize$254$i + 12 + $719) >> 2] | 0;
       $752 = 644 + ($745 << 1 << 2) | 0;
       do if (($748 | 0) != ($752 | 0)) {
        if ($748 >>> 0 < $755 >>> 0) _abort();
        if ((HEAP32[$748 + 12 >> 2] | 0) == ($720 | 0)) break;
        _abort();
       } while (0);
       if (($750 | 0) == ($748 | 0)) {
        HEAP32[151] = HEAP32[151] & ~(1 << $745);
        break;
       }
       do if (($750 | 0) == ($752 | 0)) $$pre$phi58$i$iZ2D = $750 + 8 | 0; else {
        if ($750 >>> 0 < $755 >>> 0) _abort();
        $766 = $750 + 8 | 0;
        if ((HEAP32[$766 >> 2] | 0) == ($720 | 0)) {
         $$pre$phi58$i$iZ2D = $766;
         break;
        }
        _abort();
       } while (0);
       HEAP32[$748 + 12 >> 2] = $750;
       HEAP32[$$pre$phi58$i$iZ2D >> 2] = $748;
      } else {
       $771 = HEAP32[$tbase$255$i + (($719 | 24) + $tsize$254$i) >> 2] | 0;
       $773 = HEAP32[$tbase$255$i + ($tsize$254$i + 12 + $719) >> 2] | 0;
       do if (($773 | 0) == ($720 | 0)) {
        $$sum67$i$i = $719 | 16;
        $784 = $tbase$255$i + ($$sum2$i21$i + $$sum67$i$i) | 0;
        $785 = HEAP32[$784 >> 2] | 0;
        if (!$785) {
         $787 = $tbase$255$i + ($$sum67$i$i + $tsize$254$i) | 0;
         $788 = HEAP32[$787 >> 2] | 0;
         if (!$788) {
          $R$1$i$i = 0;
          break;
         } else {
          $R$0$i$i = $788;
          $RP$0$i$i = $787;
         }
        } else {
         $R$0$i$i = $785;
         $RP$0$i$i = $784;
        }
        while (1) {
         $790 = $R$0$i$i + 20 | 0;
         $791 = HEAP32[$790 >> 2] | 0;
         if ($791) {
          $R$0$i$i = $791;
          $RP$0$i$i = $790;
          continue;
         }
         $793 = $R$0$i$i + 16 | 0;
         $794 = HEAP32[$793 >> 2] | 0;
         if (!$794) {
          $R$0$i$i$lcssa = $R$0$i$i;
          $RP$0$i$i$lcssa = $RP$0$i$i;
          break;
         } else {
          $R$0$i$i = $794;
          $RP$0$i$i = $793;
         }
        }
        if ($RP$0$i$i$lcssa >>> 0 < $755 >>> 0) _abort(); else {
         HEAP32[$RP$0$i$i$lcssa >> 2] = 0;
         $R$1$i$i = $R$0$i$i$lcssa;
         break;
        }
       } else {
        $776 = HEAP32[$tbase$255$i + (($719 | 8) + $tsize$254$i) >> 2] | 0;
        if ($776 >>> 0 < $755 >>> 0) _abort();
        $778 = $776 + 12 | 0;
        if ((HEAP32[$778 >> 2] | 0) != ($720 | 0)) _abort();
        $781 = $773 + 8 | 0;
        if ((HEAP32[$781 >> 2] | 0) == ($720 | 0)) {
         HEAP32[$778 >> 2] = $773;
         HEAP32[$781 >> 2] = $776;
         $R$1$i$i = $773;
         break;
        } else _abort();
       } while (0);
       if (!$771) break;
       $799 = HEAP32[$tbase$255$i + ($tsize$254$i + 28 + $719) >> 2] | 0;
       $800 = 908 + ($799 << 2) | 0;
       do if (($720 | 0) == (HEAP32[$800 >> 2] | 0)) {
        HEAP32[$800 >> 2] = $R$1$i$i;
        if ($R$1$i$i) break;
        HEAP32[152] = HEAP32[152] & ~(1 << $799);
        break L332;
       } else {
        if ($771 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
        $809 = $771 + 16 | 0;
        if ((HEAP32[$809 >> 2] | 0) == ($720 | 0)) HEAP32[$809 >> 2] = $R$1$i$i; else HEAP32[$771 + 20 >> 2] = $R$1$i$i;
        if (!$R$1$i$i) break L332;
       } while (0);
       $814 = HEAP32[155] | 0;
       if ($R$1$i$i >>> 0 < $814 >>> 0) _abort();
       HEAP32[$R$1$i$i + 24 >> 2] = $771;
       $$sum3132$i$i = $719 | 16;
       $818 = HEAP32[$tbase$255$i + ($$sum3132$i$i + $tsize$254$i) >> 2] | 0;
       do if ($818) if ($818 >>> 0 < $814 >>> 0) _abort(); else {
        HEAP32[$R$1$i$i + 16 >> 2] = $818;
        HEAP32[$818 + 24 >> 2] = $R$1$i$i;
        break;
       } while (0);
       $824 = HEAP32[$tbase$255$i + ($$sum2$i21$i + $$sum3132$i$i) >> 2] | 0;
       if (!$824) break;
       if ($824 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
        HEAP32[$R$1$i$i + 20 >> 2] = $824;
        HEAP32[$824 + 24 >> 2] = $R$1$i$i;
        break;
       }
      } while (0);
      $oldfirst$0$i$i = $tbase$255$i + (($744 | $719) + $tsize$254$i) | 0;
      $qsize$0$i$i = $744 + $725 | 0;
     } else {
      $oldfirst$0$i$i = $720;
      $qsize$0$i$i = $725;
     }
     $832 = $oldfirst$0$i$i + 4 | 0;
     HEAP32[$832 >> 2] = HEAP32[$832 >> 2] & -2;
     HEAP32[$tbase$255$i + ($$sum$i19$i + 4) >> 2] = $qsize$0$i$i | 1;
     HEAP32[$tbase$255$i + ($qsize$0$i$i + $$sum$i19$i) >> 2] = $qsize$0$i$i;
     $838 = $qsize$0$i$i >>> 3;
     if ($qsize$0$i$i >>> 0 < 256) {
      $840 = $838 << 1;
      $841 = 644 + ($840 << 2) | 0;
      $842 = HEAP32[151] | 0;
      $843 = 1 << $838;
      do if (!($842 & $843)) {
       HEAP32[151] = $842 | $843;
       $$pre$phi$i23$iZ2D = 644 + ($840 + 2 << 2) | 0;
       $F4$0$i$i = $841;
      } else {
       $847 = 644 + ($840 + 2 << 2) | 0;
       $848 = HEAP32[$847 >> 2] | 0;
       if ($848 >>> 0 >= (HEAP32[155] | 0) >>> 0) {
        $$pre$phi$i23$iZ2D = $847;
        $F4$0$i$i = $848;
        break;
       }
       _abort();
      } while (0);
      HEAP32[$$pre$phi$i23$iZ2D >> 2] = $724;
      HEAP32[$F4$0$i$i + 12 >> 2] = $724;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 8) >> 2] = $F4$0$i$i;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 12) >> 2] = $841;
      break;
     }
     $854 = $qsize$0$i$i >>> 8;
     do if (!$854) $I7$0$i$i = 0; else {
      if ($qsize$0$i$i >>> 0 > 16777215) {
       $I7$0$i$i = 31;
       break;
      }
      $859 = ($854 + 1048320 | 0) >>> 16 & 8;
      $860 = $854 << $859;
      $863 = ($860 + 520192 | 0) >>> 16 & 4;
      $865 = $860 << $863;
      $868 = ($865 + 245760 | 0) >>> 16 & 2;
      $873 = 14 - ($863 | $859 | $868) + ($865 << $868 >>> 15) | 0;
      $I7$0$i$i = $qsize$0$i$i >>> ($873 + 7 | 0) & 1 | $873 << 1;
     } while (0);
     $879 = 908 + ($I7$0$i$i << 2) | 0;
     HEAP32[$tbase$255$i + ($$sum$i19$i + 28) >> 2] = $I7$0$i$i;
     HEAP32[$tbase$255$i + ($$sum$i19$i + 20) >> 2] = 0;
     HEAP32[$tbase$255$i + ($$sum$i19$i + 16) >> 2] = 0;
     $883 = HEAP32[152] | 0;
     $884 = 1 << $I7$0$i$i;
     if (!($883 & $884)) {
      HEAP32[152] = $883 | $884;
      HEAP32[$879 >> 2] = $724;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 24) >> 2] = $879;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 12) >> 2] = $724;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 8) >> 2] = $724;
      break;
     }
     $891 = HEAP32[$879 >> 2] | 0;
     L418 : do if ((HEAP32[$891 + 4 >> 2] & -8 | 0) == ($qsize$0$i$i | 0)) $T$0$lcssa$i25$i = $891; else {
      $K8$051$i$i = $qsize$0$i$i << (($I7$0$i$i | 0) == 31 ? 0 : 25 - ($I7$0$i$i >>> 1) | 0);
      $T$050$i$i = $891;
      while (1) {
       $908 = $T$050$i$i + 16 + ($K8$051$i$i >>> 31 << 2) | 0;
       $903 = HEAP32[$908 >> 2] | 0;
       if (!$903) {
        $$lcssa = $908;
        $T$050$i$i$lcssa = $T$050$i$i;
        break;
       }
       if ((HEAP32[$903 + 4 >> 2] & -8 | 0) == ($qsize$0$i$i | 0)) {
        $T$0$lcssa$i25$i = $903;
        break L418;
       } else {
        $K8$051$i$i = $K8$051$i$i << 1;
        $T$050$i$i = $903;
       }
      }
      if ($$lcssa >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
       HEAP32[$$lcssa >> 2] = $724;
       HEAP32[$tbase$255$i + ($$sum$i19$i + 24) >> 2] = $T$050$i$i$lcssa;
       HEAP32[$tbase$255$i + ($$sum$i19$i + 12) >> 2] = $724;
       HEAP32[$tbase$255$i + ($$sum$i19$i + 8) >> 2] = $724;
       break L324;
      }
     } while (0);
     $915 = $T$0$lcssa$i25$i + 8 | 0;
     $916 = HEAP32[$915 >> 2] | 0;
     $917 = HEAP32[155] | 0;
     if ($916 >>> 0 >= $917 >>> 0 & $T$0$lcssa$i25$i >>> 0 >= $917 >>> 0) {
      HEAP32[$916 + 12 >> 2] = $724;
      HEAP32[$915 >> 2] = $724;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 8) >> 2] = $916;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 12) >> 2] = $T$0$lcssa$i25$i;
      HEAP32[$tbase$255$i + ($$sum$i19$i + 24) >> 2] = 0;
      break;
     } else _abort();
    } while (0);
    $mem$0 = $tbase$255$i + ($711 | 8) | 0;
    return $mem$0 | 0;
   } else $sp$0$i$i$i = 1052;
   while (1) {
    $925 = HEAP32[$sp$0$i$i$i >> 2] | 0;
    if ($925 >>> 0 <= $635 >>> 0) {
     $928 = HEAP32[$sp$0$i$i$i + 4 >> 2] | 0;
     $929 = $925 + $928 | 0;
     if ($929 >>> 0 > $635 >>> 0) {
      $$lcssa215 = $925;
      $$lcssa216 = $928;
      $$lcssa217 = $929;
      break;
     }
    }
    $sp$0$i$i$i = HEAP32[$sp$0$i$i$i + 8 >> 2] | 0;
   }
   $934 = $$lcssa215 + ($$lcssa216 + -39) | 0;
   $940 = $$lcssa215 + ($$lcssa216 + -47 + (($934 & 7 | 0) == 0 ? 0 : 0 - $934 & 7)) | 0;
   $941 = $635 + 16 | 0;
   $943 = $940 >>> 0 < $941 >>> 0 ? $635 : $940;
   $944 = $943 + 8 | 0;
   $947 = $tbase$255$i + 8 | 0;
   $952 = ($947 & 7 | 0) == 0 ? 0 : 0 - $947 & 7;
   $954 = $tsize$254$i + -40 - $952 | 0;
   HEAP32[157] = $tbase$255$i + $952;
   HEAP32[154] = $954;
   HEAP32[$tbase$255$i + ($952 + 4) >> 2] = $954 | 1;
   HEAP32[$tbase$255$i + ($tsize$254$i + -36) >> 2] = 40;
   HEAP32[158] = HEAP32[273];
   $959 = $943 + 4 | 0;
   HEAP32[$959 >> 2] = 27;
   HEAP32[$944 >> 2] = HEAP32[263];
   HEAP32[$944 + 4 >> 2] = HEAP32[264];
   HEAP32[$944 + 8 >> 2] = HEAP32[265];
   HEAP32[$944 + 12 >> 2] = HEAP32[266];
   HEAP32[263] = $tbase$255$i;
   HEAP32[264] = $tsize$254$i;
   HEAP32[266] = 0;
   HEAP32[265] = $944;
   $960 = $943 + 28 | 0;
   HEAP32[$960 >> 2] = 7;
   if (($943 + 32 | 0) >>> 0 < $$lcssa217 >>> 0) {
    $964 = $960;
    do {
     $964$looptemp = $964;
     $964 = $964 + 4 | 0;
     HEAP32[$964 >> 2] = 7;
    } while (($964$looptemp + 8 | 0) >>> 0 < $$lcssa217 >>> 0);
   }
   if (($943 | 0) != ($635 | 0)) {
    $970 = $943 - $635 | 0;
    HEAP32[$959 >> 2] = HEAP32[$959 >> 2] & -2;
    HEAP32[$635 + 4 >> 2] = $970 | 1;
    HEAP32[$943 >> 2] = $970;
    $975 = $970 >>> 3;
    if ($970 >>> 0 < 256) {
     $977 = $975 << 1;
     $978 = 644 + ($977 << 2) | 0;
     $979 = HEAP32[151] | 0;
     $980 = 1 << $975;
     if (!($979 & $980)) {
      HEAP32[151] = $979 | $980;
      $$pre$phi$i$iZ2D = 644 + ($977 + 2 << 2) | 0;
      $F$0$i$i = $978;
     } else {
      $984 = 644 + ($977 + 2 << 2) | 0;
      $985 = HEAP32[$984 >> 2] | 0;
      if ($985 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
       $$pre$phi$i$iZ2D = $984;
       $F$0$i$i = $985;
      }
     }
     HEAP32[$$pre$phi$i$iZ2D >> 2] = $635;
     HEAP32[$F$0$i$i + 12 >> 2] = $635;
     HEAP32[$635 + 8 >> 2] = $F$0$i$i;
     HEAP32[$635 + 12 >> 2] = $978;
     break;
    }
    $991 = $970 >>> 8;
    if (!$991) $I1$0$i$i = 0; else if ($970 >>> 0 > 16777215) $I1$0$i$i = 31; else {
     $996 = ($991 + 1048320 | 0) >>> 16 & 8;
     $997 = $991 << $996;
     $1000 = ($997 + 520192 | 0) >>> 16 & 4;
     $1002 = $997 << $1000;
     $1005 = ($1002 + 245760 | 0) >>> 16 & 2;
     $1010 = 14 - ($1000 | $996 | $1005) + ($1002 << $1005 >>> 15) | 0;
     $I1$0$i$i = $970 >>> ($1010 + 7 | 0) & 1 | $1010 << 1;
    }
    $1016 = 908 + ($I1$0$i$i << 2) | 0;
    HEAP32[$635 + 28 >> 2] = $I1$0$i$i;
    HEAP32[$635 + 20 >> 2] = 0;
    HEAP32[$941 >> 2] = 0;
    $1019 = HEAP32[152] | 0;
    $1020 = 1 << $I1$0$i$i;
    if (!($1019 & $1020)) {
     HEAP32[152] = $1019 | $1020;
     HEAP32[$1016 >> 2] = $635;
     HEAP32[$635 + 24 >> 2] = $1016;
     HEAP32[$635 + 12 >> 2] = $635;
     HEAP32[$635 + 8 >> 2] = $635;
     break;
    }
    $1027 = HEAP32[$1016 >> 2] | 0;
    L459 : do if ((HEAP32[$1027 + 4 >> 2] & -8 | 0) == ($970 | 0)) $T$0$lcssa$i$i = $1027; else {
     $K2$07$i$i = $970 << (($I1$0$i$i | 0) == 31 ? 0 : 25 - ($I1$0$i$i >>> 1) | 0);
     $T$06$i$i = $1027;
     while (1) {
      $1044 = $T$06$i$i + 16 + ($K2$07$i$i >>> 31 << 2) | 0;
      $1039 = HEAP32[$1044 >> 2] | 0;
      if (!$1039) {
       $$lcssa211 = $1044;
       $T$06$i$i$lcssa = $T$06$i$i;
       break;
      }
      if ((HEAP32[$1039 + 4 >> 2] & -8 | 0) == ($970 | 0)) {
       $T$0$lcssa$i$i = $1039;
       break L459;
      } else {
       $K2$07$i$i = $K2$07$i$i << 1;
       $T$06$i$i = $1039;
      }
     }
     if ($$lcssa211 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
      HEAP32[$$lcssa211 >> 2] = $635;
      HEAP32[$635 + 24 >> 2] = $T$06$i$i$lcssa;
      HEAP32[$635 + 12 >> 2] = $635;
      HEAP32[$635 + 8 >> 2] = $635;
      break L299;
     }
    } while (0);
    $1051 = $T$0$lcssa$i$i + 8 | 0;
    $1052 = HEAP32[$1051 >> 2] | 0;
    $1053 = HEAP32[155] | 0;
    if ($1052 >>> 0 >= $1053 >>> 0 & $T$0$lcssa$i$i >>> 0 >= $1053 >>> 0) {
     HEAP32[$1052 + 12 >> 2] = $635;
     HEAP32[$1051 >> 2] = $635;
     HEAP32[$635 + 8 >> 2] = $1052;
     HEAP32[$635 + 12 >> 2] = $T$0$lcssa$i$i;
     HEAP32[$635 + 24 >> 2] = 0;
     break;
    } else _abort();
   }
  } while (0);
  $1060 = HEAP32[154] | 0;
  if ($1060 >>> 0 > $nb$0 >>> 0) {
   $1062 = $1060 - $nb$0 | 0;
   HEAP32[154] = $1062;
   $1063 = HEAP32[157] | 0;
   HEAP32[157] = $1063 + $nb$0;
   HEAP32[$1063 + ($nb$0 + 4) >> 2] = $1062 | 1;
   HEAP32[$1063 + 4 >> 2] = $nb$0 | 3;
   $mem$0 = $1063 + 8 | 0;
   return $mem$0 | 0;
  }
 }
 HEAP32[(___errno_location() | 0) >> 2] = 12;
 $mem$0 = 0;
 return $mem$0 | 0;
}

function _printf_core($f, $fmt, $ap, $nl_arg, $nl_type) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 $nl_arg = $nl_arg | 0;
 $nl_type = $nl_type | 0;
 var $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$012$i = 0, $$013$i = 0, $$03$i33 = 0, $$07$i = 0.0, $$1$i = 0.0, $$114$i = 0, $$2$i = 0.0, $$20$i = 0.0, $$21$i = 0, $$210$i = 0, $$23$i = 0, $$3$i = 0.0, $$31$i = 0, $$311$i = 0, $$4$i = 0.0, $$412$lcssa$i = 0, $$41276$i = 0, $$43 = 0, $$5$lcssa$i = 0, $$587$i = 0, $$a$3$i = 0, $$a$3186$i = 0, $$fl$4 = 0, $$lcssa159$i = 0, $$lcssa321 = 0, $$lcssa322 = 0, $$lcssa326 = 0, $$lcssa328 = 0, $$lcssa329 = 0, $$lcssa330 = 0, $$lcssa331 = 0, $$lcssa332 = 0, $$lcssa334 = 0, $$lcssa344 = 0, $$lcssa347 = 0.0, $$lcssa349 = 0, $$lcssa52 = 0, $$p$$i = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr47$i = 0, $$pre$phi184$iZ2D = 0, $$pre182$i = 0, $$z$4$i = 0, $0 = 0, $1 = 0, $10 = 0, $101 = 0, $102 = 0, $103 = 0, $108 = 0, $11 = 0, $110 = 0, $111 = 0, $113 = 0, $12 = 0, $13 = 0, $137 = 0, $138 = 0, $14 = 0, $141 = 0, $142 = 0, $143 = 0, $147 = 0, $149 = 0, $15 = 0, $151 = 0, $153 = 0, $154 = 0, $159 = 0, $162 = 0, $167 = 0, $168 = 0, $173 = 0, $180 = 0, $181 = 0, $192 = 0, $2 = 0, $204 = 0, $21 = 0, $211 = 0, $213 = 0, $216 = 0, $217 = 0, $22 = 0, $222 = 0, $228 = 0, $229 = 0, $235 = 0, $24 = 0, $248 = 0, $25 = 0, $250 = 0, $253 = 0, $258 = 0, $26 = 0, $261 = 0, $262 = 0, $272 = 0, $274 = 0, $276 = 0, $279 = 0, $28 = 0, $281 = 0, $282 = 0, $283 = 0, $289 = 0, $291 = 0, $292 = 0, $296 = 0, $3 = 0, $304 = 0, $31 = 0, $310 = 0, $32 = 0, $322 = 0, $325 = 0, $326 = 0, $339 = 0, $341 = 0, $346 = 0, $351 = 0, $354 = 0, $364 = 0.0, $37 = 0, $371 = 0, $375 = 0, $382 = 0, $384 = 0, $386 = 0, $387 = 0, $391 = 0, $397 = 0.0, $398 = 0, $4 = 0, $401 = 0, $403 = 0, $406 = 0, $408 = 0, $412 = 0.0, $42 = 0, $422 = 0, $425 = 0, $428 = 0, $43 = 0, $437 = 0, $439 = 0, $440 = 0, $446 = 0, $464 = 0, $469 = 0, $47 = 0, $474 = 0, $484 = 0, $485 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $495 = 0, $497 = 0, $5 = 0, $50 = 0, $500 = 0, $502 = 0, $503 = 0, $504 = 0, $506 = 0, $510 = 0, $512 = 0, $516 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $526 = 0, $532 = 0, $533 = 0, $534 = 0, $538 = 0, $54 = 0, $546 = 0, $560 = 0, $561 = 0, $564 = 0, $569 = 0, $570 = 0, $572 = 0, $579 = 0, $580 = 0, $581 = 0, $584 = 0, $585 = 0, $586 = 0, $59 = 0, $593 = 0, $6 = 0, $603 = 0, $606 = 0, $608 = 0, $610 = 0, $612 = 0, $617 = 0, $618 = 0, $62 = 0, $621 = 0, $623 = 0, $625 = 0, $627 = 0, $63 = 0, $638 = 0, $64 = 0, $641 = 0, $646 = 0, $655 = 0, $656 = 0, $660 = 0, $663 = 0, $665 = 0, $667 = 0, $671 = 0, $674 = 0, $678 = 0, $68 = 0, $688 = 0, $693 = 0, $7 = 0, $70 = 0, $700 = 0, $703 = 0, $711 = 0, $721 = 0, $723 = 0, $731 = 0, $738 = 0, $740 = 0, $744 = 0, $746 = 0, $755 = 0, $761 = 0, $776 = 0, $778 = 0, $791 = 0, $8 = 0, $802 = 0, $9 = 0, $94 = 0, $95 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1147$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3134$i = 0, $a$5$lcssa$i = 0, $a$5109$i = 0, $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $arg = 0, $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0140$i = 0, $carry3$0128$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0139$i = 0, $d$0141$i = 0, $d$1127$i = 0, $d$2$lcssa$i = 0, $d$2108$i = 0, $d$3$i = 0, $d$482$i = 0, $d$575$i = 0, $d$686$i = 0, $e$0123$i = 0, $e$1$i = 0, $e$2104$i = 0, $e$3$i = 0, $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$193$i = 0, $estr$2$i = 0, $fl$0103 = 0, $fl$056 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $i$0$lcssa = 0, $i$0$lcssa197 = 0, $i$0108 = 0, $i$0122$i = 0, $i$03$i = 0, $i$03$i25 = 0, $i$1$lcssa$i = 0, $i$1116$i = 0, $i$1119 = 0, $i$2103$i = 0, $i$295 = 0, $i$295$lcssa = 0, $i$393 = 0, $i$399$i = 0, $isdigittmp = 0, $isdigittmp1$i = 0, $isdigittmp1$i22 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i24 = 0, $isdigittmp9 = 0, $j$0115$i = 0, $j$0117$i = 0, $j$1100$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1107 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notrhs$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$4195 = 0, $p$5 = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$8$i = 0, $re$169$i = 0, $round$068$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$1$i = 0, $s$1$i$lcssa = 0, $s7$079$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$070$i = 0, $s9$0$i = 0, $s9$183$i = 0, $s9$2$i = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa327 = 0, $storemerge = 0, $storemerge13 = 0, $storemerge8102 = 0, $storemerge854 = 0, $t$0 = 0, $t$1 = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $wc = 0, $ws$0109 = 0, $ws$1120 = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$096 = 0, $z$1$lcssa$i = 0, $z$1146$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0, $z$3$lcssa$i = 0, $z$3133$i = 0, $z$4$i = 0, $z$6$$i = 0, $z$6$i = 0, $z$6$i$lcssa = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 624 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $big$i = sp + 24 | 0;
 $e2$i = sp + 16 | 0;
 $buf$i = sp + 588 | 0;
 $ebuf0$i = sp + 576 | 0;
 $arg = sp;
 $buf = sp + 536 | 0;
 $wc = sp + 8 | 0;
 $mb = sp + 528 | 0;
 $0 = ($f | 0) != 0;
 $1 = $buf + 40 | 0;
 $2 = $1;
 $3 = $buf + 39 | 0;
 $4 = $wc + 4 | 0;
 $5 = $ebuf0$i + 12 | 0;
 $6 = $ebuf0$i + 11 | 0;
 $7 = $buf$i;
 $8 = $5;
 $9 = $8 - $7 | 0;
 $10 = -2 - $7 | 0;
 $11 = $8 + 2 | 0;
 $12 = $big$i + 288 | 0;
 $13 = $buf$i + 9 | 0;
 $14 = $13;
 $15 = $buf$i + 8 | 0;
 $22 = $fmt;
 $cnt$0 = 0;
 $l$0 = 0;
 $l10n$0 = 0;
 L1 : while (1) {
  do if (($cnt$0 | 0) > -1) if (($l$0 | 0) > (2147483647 - $cnt$0 | 0)) {
   HEAP32[(___errno_location() | 0) >> 2] = 75;
   $cnt$1 = -1;
   break;
  } else {
   $cnt$1 = $l$0 + $cnt$0 | 0;
   break;
  } else $cnt$1 = $cnt$0; while (0);
  $21 = HEAP8[$22 >> 0] | 0;
  if (!($21 << 24 >> 24)) {
   $cnt$1$lcssa = $cnt$1;
   $l10n$0$lcssa = $l10n$0;
   label = 245;
   break;
  } else {
   $24 = $21;
   $26 = $22;
  }
  L9 : while (1) {
   switch ($24 << 24 >> 24) {
   case 37:
    {
     $28 = $26;
     $z$096 = $26;
     label = 9;
     break L9;
     break;
    }
   case 0:
    {
     $$lcssa52 = $26;
     $z$0$lcssa = $26;
     break L9;
     break;
    }
   default:
    {}
   }
   $25 = $26 + 1 | 0;
   $24 = HEAP8[$25 >> 0] | 0;
   $26 = $25;
  }
  L12 : do if ((label | 0) == 9) while (1) {
   label = 0;
   if ((HEAP8[$28 + 1 >> 0] | 0) != 37) {
    $$lcssa52 = $28;
    $z$0$lcssa = $z$096;
    break L12;
   }
   $31 = $z$096 + 1 | 0;
   $32 = $28 + 2 | 0;
   if ((HEAP8[$32 >> 0] | 0) == 37) {
    $28 = $32;
    $z$096 = $31;
    label = 9;
   } else {
    $$lcssa52 = $32;
    $z$0$lcssa = $31;
    break;
   }
  } while (0);
  $37 = $z$0$lcssa - $22 | 0;
  if ($0) if (!(HEAP32[$f >> 2] & 32)) ___fwritex($22, $37, $f) | 0;
  if (($z$0$lcssa | 0) != ($22 | 0)) {
   $22 = $$lcssa52;
   $cnt$0 = $cnt$1;
   $l$0 = $37;
   continue;
  }
  $42 = $$lcssa52 + 1 | 0;
  $43 = HEAP8[$42 >> 0] | 0;
  $isdigittmp = ($43 << 24 >> 24) + -48 | 0;
  if ($isdigittmp >>> 0 < 10) {
   $47 = (HEAP8[$$lcssa52 + 2 >> 0] | 0) == 36;
   $$43 = $47 ? $$lcssa52 + 3 | 0 : $42;
   $50 = HEAP8[$$43 >> 0] | 0;
   $argpos$0 = $47 ? $isdigittmp : -1;
   $l10n$1 = $47 ? 1 : $l10n$0;
   $storemerge = $$43;
  } else {
   $50 = $43;
   $argpos$0 = -1;
   $l10n$1 = $l10n$0;
   $storemerge = $42;
  }
  $49 = $50 << 24 >> 24;
  L25 : do if (($49 & -32 | 0) == 32) {
   $54 = $49;
   $59 = $50;
   $fl$0103 = 0;
   $storemerge8102 = $storemerge;
   while (1) {
    if (!(1 << $54 + -32 & 75913)) {
     $68 = $59;
     $fl$056 = $fl$0103;
     $storemerge854 = $storemerge8102;
     break L25;
    }
    $62 = 1 << ($59 << 24 >> 24) + -32 | $fl$0103;
    $63 = $storemerge8102 + 1 | 0;
    $64 = HEAP8[$63 >> 0] | 0;
    $54 = $64 << 24 >> 24;
    if (($54 & -32 | 0) != 32) {
     $68 = $64;
     $fl$056 = $62;
     $storemerge854 = $63;
     break;
    } else {
     $59 = $64;
     $fl$0103 = $62;
     $storemerge8102 = $63;
    }
   }
  } else {
   $68 = $50;
   $fl$056 = 0;
   $storemerge854 = $storemerge;
  } while (0);
  do if ($68 << 24 >> 24 == 42) {
   $70 = $storemerge854 + 1 | 0;
   $isdigittmp11 = (HEAP8[$70 >> 0] | 0) + -48 | 0;
   if ($isdigittmp11 >>> 0 < 10) if ((HEAP8[$storemerge854 + 2 >> 0] | 0) == 36) {
    HEAP32[$nl_type + ($isdigittmp11 << 2) >> 2] = 10;
    $l10n$2 = 1;
    $storemerge13 = $storemerge854 + 3 | 0;
    $w$0 = HEAP32[$nl_arg + ((HEAP8[$70 >> 0] | 0) + -48 << 3) >> 2] | 0;
   } else label = 24; else label = 24;
   if ((label | 0) == 24) {
    label = 0;
    if ($l10n$1) {
     $$0 = -1;
     break L1;
    }
    if (!$0) {
     $108 = $70;
     $fl$1 = $fl$056;
     $l10n$3 = 0;
     $w$1 = 0;
     break;
    }
    $94 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
    $95 = HEAP32[$94 >> 2] | 0;
    HEAP32[$ap >> 2] = $94 + 4;
    $l10n$2 = 0;
    $storemerge13 = $70;
    $w$0 = $95;
   }
   if (($w$0 | 0) < 0) {
    $108 = $storemerge13;
    $fl$1 = $fl$056 | 8192;
    $l10n$3 = $l10n$2;
    $w$1 = 0 - $w$0 | 0;
   } else {
    $108 = $storemerge13;
    $fl$1 = $fl$056;
    $l10n$3 = $l10n$2;
    $w$1 = $w$0;
   }
  } else {
   $isdigittmp1$i = ($68 << 24 >> 24) + -48 | 0;
   if ($isdigittmp1$i >>> 0 < 10) {
    $103 = $storemerge854;
    $i$03$i = 0;
    $isdigittmp4$i = $isdigittmp1$i;
    while (1) {
     $101 = ($i$03$i * 10 | 0) + $isdigittmp4$i | 0;
     $102 = $103 + 1 | 0;
     $isdigittmp4$i = (HEAP8[$102 >> 0] | 0) + -48 | 0;
     if ($isdigittmp4$i >>> 0 >= 10) {
      $$lcssa321 = $101;
      $$lcssa322 = $102;
      break;
     } else {
      $103 = $102;
      $i$03$i = $101;
     }
    }
    if (($$lcssa321 | 0) < 0) {
     $$0 = -1;
     break L1;
    } else {
     $108 = $$lcssa322;
     $fl$1 = $fl$056;
     $l10n$3 = $l10n$1;
     $w$1 = $$lcssa321;
    }
   } else {
    $108 = $storemerge854;
    $fl$1 = $fl$056;
    $l10n$3 = $l10n$1;
    $w$1 = 0;
   }
  } while (0);
  L46 : do if ((HEAP8[$108 >> 0] | 0) == 46) {
   $110 = $108 + 1 | 0;
   $111 = HEAP8[$110 >> 0] | 0;
   if ($111 << 24 >> 24 != 42) {
    $isdigittmp1$i22 = ($111 << 24 >> 24) + -48 | 0;
    if ($isdigittmp1$i22 >>> 0 < 10) {
     $143 = $110;
     $i$03$i25 = 0;
     $isdigittmp4$i24 = $isdigittmp1$i22;
    } else {
     $802 = $110;
     $p$0 = 0;
     break;
    }
    while (1) {
     $141 = ($i$03$i25 * 10 | 0) + $isdigittmp4$i24 | 0;
     $142 = $143 + 1 | 0;
     $isdigittmp4$i24 = (HEAP8[$142 >> 0] | 0) + -48 | 0;
     if ($isdigittmp4$i24 >>> 0 >= 10) {
      $802 = $142;
      $p$0 = $141;
      break L46;
     } else {
      $143 = $142;
      $i$03$i25 = $141;
     }
    }
   }
   $113 = $108 + 2 | 0;
   $isdigittmp9 = (HEAP8[$113 >> 0] | 0) + -48 | 0;
   if ($isdigittmp9 >>> 0 < 10) if ((HEAP8[$108 + 3 >> 0] | 0) == 36) {
    HEAP32[$nl_type + ($isdigittmp9 << 2) >> 2] = 10;
    $802 = $108 + 4 | 0;
    $p$0 = HEAP32[$nl_arg + ((HEAP8[$113 >> 0] | 0) + -48 << 3) >> 2] | 0;
    break;
   }
   if ($l10n$3) {
    $$0 = -1;
    break L1;
   }
   if ($0) {
    $137 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
    $138 = HEAP32[$137 >> 2] | 0;
    HEAP32[$ap >> 2] = $137 + 4;
    $802 = $113;
    $p$0 = $138;
   } else {
    $802 = $113;
    $p$0 = 0;
   }
  } else {
   $802 = $108;
   $p$0 = -1;
  } while (0);
  $147 = $802;
  $st$0 = 0;
  while (1) {
   $149 = (HEAP8[$147 >> 0] | 0) + -65 | 0;
   if ($149 >>> 0 > 57) {
    $$0 = -1;
    break L1;
   }
   $151 = $147 + 1 | 0;
   $153 = HEAP8[4322 + ($st$0 * 58 | 0) + $149 >> 0] | 0;
   $154 = $153 & 255;
   if (($154 + -1 | 0) >>> 0 < 8) {
    $147 = $151;
    $st$0 = $154;
   } else {
    $$lcssa326 = $147;
    $$lcssa328 = $151;
    $$lcssa329 = $153;
    $$lcssa330 = $154;
    $st$0$lcssa327 = $st$0;
    break;
   }
  }
  if (!($$lcssa329 << 24 >> 24)) {
   $$0 = -1;
   break;
  }
  $159 = ($argpos$0 | 0) > -1;
  do if ($$lcssa329 << 24 >> 24 == 19) if ($159) {
   $$0 = -1;
   break L1;
  } else label = 52; else {
   if ($159) {
    HEAP32[$nl_type + ($argpos$0 << 2) >> 2] = $$lcssa330;
    $162 = $nl_arg + ($argpos$0 << 3) | 0;
    $167 = HEAP32[$162 + 4 >> 2] | 0;
    $168 = $arg;
    HEAP32[$168 >> 2] = HEAP32[$162 >> 2];
    HEAP32[$168 + 4 >> 2] = $167;
    label = 52;
    break;
   }
   if (!$0) {
    $$0 = 0;
    break L1;
   }
   _pop_arg425($arg, $$lcssa330, $ap);
  } while (0);
  if ((label | 0) == 52) {
   label = 0;
   if (!$0) {
    $22 = $$lcssa328;
    $cnt$0 = $cnt$1;
    $l$0 = $37;
    $l10n$0 = $l10n$3;
    continue;
   }
  }
  $173 = HEAP8[$$lcssa326 >> 0] | 0;
  $t$0 = ($st$0$lcssa327 | 0) != 0 & ($173 & 15 | 0) == 3 ? $173 & -33 : $173;
  $180 = $fl$1 & -65537;
  $fl$1$ = ($fl$1 & 8192 | 0) == 0 ? $fl$1 : $180;
  L75 : do switch ($t$0 | 0) {
  case 110:
   {
    switch ($st$0$lcssa327 | 0) {
    case 0:
     {
      HEAP32[HEAP32[$arg >> 2] >> 2] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 1:
     {
      HEAP32[HEAP32[$arg >> 2] >> 2] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 2:
     {
      $192 = HEAP32[$arg >> 2] | 0;
      HEAP32[$192 >> 2] = $cnt$1;
      HEAP32[$192 + 4 >> 2] = (($cnt$1 | 0) < 0) << 31 >> 31;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 3:
     {
      HEAP16[HEAP32[$arg >> 2] >> 1] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 4:
     {
      HEAP8[HEAP32[$arg >> 2] >> 0] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 6:
     {
      HEAP32[HEAP32[$arg >> 2] >> 2] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 7:
     {
      $204 = HEAP32[$arg >> 2] | 0;
      HEAP32[$204 >> 2] = $cnt$1;
      HEAP32[$204 + 4 >> 2] = (($cnt$1 | 0) < 0) << 31 >> 31;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    default:
     {
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
     }
    }
    break;
   }
  case 112:
   {
    $fl$3 = $fl$1$ | 8;
    $p$1 = $p$0 >>> 0 > 8 ? $p$0 : 8;
    $t$1 = 120;
    label = 64;
    break;
   }
  case 88:
  case 120:
   {
    $fl$3 = $fl$1$;
    $p$1 = $p$0;
    $t$1 = $t$0;
    label = 64;
    break;
   }
  case 111:
   {
    $248 = $arg;
    $250 = HEAP32[$248 >> 2] | 0;
    $253 = HEAP32[$248 + 4 >> 2] | 0;
    if (($250 | 0) == 0 & ($253 | 0) == 0) $$0$lcssa$i = $1; else {
     $$03$i33 = $1;
     $258 = $250;
     $262 = $253;
     while (1) {
      $261 = $$03$i33 + -1 | 0;
      HEAP8[$261 >> 0] = $258 & 7 | 48;
      $258 = _bitshift64Lshr($258 | 0, $262 | 0, 3) | 0;
      $262 = tempRet0;
      if (($258 | 0) == 0 & ($262 | 0) == 0) {
       $$0$lcssa$i = $261;
       break;
      } else $$03$i33 = $261;
     }
    }
    if (!($fl$1$ & 8)) {
     $a$0 = $$0$lcssa$i;
     $fl$4 = $fl$1$;
     $p$2 = $p$0;
     $pl$1 = 0;
     $prefix$1 = 4802;
     label = 77;
    } else {
     $272 = $2 - $$0$lcssa$i + 1 | 0;
     $a$0 = $$0$lcssa$i;
     $fl$4 = $fl$1$;
     $p$2 = ($p$0 | 0) < ($272 | 0) ? $272 : $p$0;
     $pl$1 = 0;
     $prefix$1 = 4802;
     label = 77;
    }
    break;
   }
  case 105:
  case 100:
   {
    $274 = $arg;
    $276 = HEAP32[$274 >> 2] | 0;
    $279 = HEAP32[$274 + 4 >> 2] | 0;
    if (($279 | 0) < 0) {
     $281 = _i64Subtract(0, 0, $276 | 0, $279 | 0) | 0;
     $282 = tempRet0;
     $283 = $arg;
     HEAP32[$283 >> 2] = $281;
     HEAP32[$283 + 4 >> 2] = $282;
     $291 = $281;
     $292 = $282;
     $pl$0 = 1;
     $prefix$0 = 4802;
     label = 76;
     break L75;
    }
    if (!($fl$1$ & 2048)) {
     $289 = $fl$1$ & 1;
     $291 = $276;
     $292 = $279;
     $pl$0 = $289;
     $prefix$0 = ($289 | 0) == 0 ? 4802 : 4804;
     label = 76;
    } else {
     $291 = $276;
     $292 = $279;
     $pl$0 = 1;
     $prefix$0 = 4803;
     label = 76;
    }
    break;
   }
  case 117:
   {
    $181 = $arg;
    $291 = HEAP32[$181 >> 2] | 0;
    $292 = HEAP32[$181 + 4 >> 2] | 0;
    $pl$0 = 0;
    $prefix$0 = 4802;
    label = 76;
    break;
   }
  case 99:
   {
    HEAP8[$3 >> 0] = HEAP32[$arg >> 2];
    $a$2 = $3;
    $fl$6 = $180;
    $p$5 = 1;
    $pl$2 = 0;
    $prefix$2 = 4802;
    $z$2 = $1;
    break;
   }
  case 109:
   {
    $a$1 = _strerror(HEAP32[(___errno_location() | 0) >> 2] | 0) | 0;
    label = 82;
    break;
   }
  case 115:
   {
    $322 = HEAP32[$arg >> 2] | 0;
    $a$1 = ($322 | 0) != 0 ? $322 : 4812;
    label = 82;
    break;
   }
  case 67:
   {
    HEAP32[$wc >> 2] = HEAP32[$arg >> 2];
    HEAP32[$4 >> 2] = 0;
    HEAP32[$arg >> 2] = $wc;
    $p$4195 = -1;
    label = 86;
    break;
   }
  case 83:
   {
    if (!$p$0) {
     _pad($f, 32, $w$1, 0, $fl$1$);
     $i$0$lcssa197 = 0;
     label = 98;
    } else {
     $p$4195 = $p$0;
     label = 86;
    }
    break;
   }
  case 65:
  case 71:
  case 70:
  case 69:
  case 97:
  case 103:
  case 102:
  case 101:
   {
    $364 = +HEAPF64[$arg >> 3];
    HEAP32[$e2$i >> 2] = 0;
    HEAPF64[tempDoublePtr >> 3] = $364;
    if ((HEAP32[tempDoublePtr + 4 >> 2] | 0) < 0) {
     $$07$i = -$364;
     $pl$0$i = 1;
     $prefix$0$i = 4819;
    } else if (!($fl$1$ & 2048)) {
     $371 = $fl$1$ & 1;
     $$07$i = $364;
     $pl$0$i = $371;
     $prefix$0$i = ($371 | 0) == 0 ? 4820 : 4825;
    } else {
     $$07$i = $364;
     $pl$0$i = 1;
     $prefix$0$i = 4822;
    }
    HEAPF64[tempDoublePtr >> 3] = $$07$i;
    $375 = HEAP32[tempDoublePtr + 4 >> 2] & 2146435072;
    do if ($375 >>> 0 < 2146435072 | ($375 | 0) == 2146435072 & 0 < 0) {
     $397 = +_frexpl($$07$i, $e2$i) * 2.0;
     $398 = $397 != 0.0;
     if ($398) HEAP32[$e2$i >> 2] = (HEAP32[$e2$i >> 2] | 0) + -1;
     $401 = $t$0 | 32;
     if (($401 | 0) == 97) {
      $403 = $t$0 & 32;
      $prefix$0$$i = ($403 | 0) == 0 ? $prefix$0$i : $prefix$0$i + 9 | 0;
      $406 = $pl$0$i | 2;
      $408 = 12 - $p$0 | 0;
      do if ($p$0 >>> 0 > 11 | ($408 | 0) == 0) $$1$i = $397; else {
       $re$169$i = $408;
       $round$068$i = 8.0;
       while (1) {
        $re$169$i = $re$169$i + -1 | 0;
        $412 = $round$068$i * 16.0;
        if (!$re$169$i) {
         $$lcssa347 = $412;
         break;
        } else $round$068$i = $412;
       }
       if ((HEAP8[$prefix$0$$i >> 0] | 0) == 45) {
        $$1$i = -($$lcssa347 + (-$397 - $$lcssa347));
        break;
       } else {
        $$1$i = $397 + $$lcssa347 - $$lcssa347;
        break;
       }
      } while (0);
      $422 = HEAP32[$e2$i >> 2] | 0;
      $425 = ($422 | 0) < 0 ? 0 - $422 | 0 : $422;
      $428 = _fmt_u($425, (($425 | 0) < 0) << 31 >> 31, $5) | 0;
      if (($428 | 0) == ($5 | 0)) {
       HEAP8[$6 >> 0] = 48;
       $estr$0$i = $6;
      } else $estr$0$i = $428;
      HEAP8[$estr$0$i + -1 >> 0] = ($422 >> 31 & 2) + 43;
      $437 = $estr$0$i + -2 | 0;
      HEAP8[$437 >> 0] = $t$0 + 15;
      $notrhs$i = ($p$0 | 0) < 1;
      $439 = ($fl$1$ & 8 | 0) == 0;
      $$2$i = $$1$i;
      $s$0$i = $buf$i;
      while (1) {
       $440 = ~~$$2$i;
       $446 = $s$0$i + 1 | 0;
       HEAP8[$s$0$i >> 0] = HEAPU8[4786 + $440 >> 0] | $403;
       $$2$i = ($$2$i - +($440 | 0)) * 16.0;
       do if (($446 - $7 | 0) == 1) {
        if ($439 & ($notrhs$i & $$2$i == 0.0)) {
         $s$1$i = $446;
         break;
        }
        HEAP8[$446 >> 0] = 46;
        $s$1$i = $s$0$i + 2 | 0;
       } else $s$1$i = $446; while (0);
       if (!($$2$i != 0.0)) {
        $s$1$i$lcssa = $s$1$i;
        break;
       } else $s$0$i = $s$1$i;
      }
      $$pre182$i = $s$1$i$lcssa;
      $l$0$i = ($p$0 | 0) != 0 & ($10 + $$pre182$i | 0) < ($p$0 | 0) ? $11 + $p$0 - $437 | 0 : $9 - $437 + $$pre182$i | 0;
      $464 = $l$0$i + $406 | 0;
      _pad($f, 32, $w$1, $464, $fl$1$);
      if (!(HEAP32[$f >> 2] & 32)) ___fwritex($prefix$0$$i, $406, $f) | 0;
      _pad($f, 48, $w$1, $464, $fl$1$ ^ 65536);
      $469 = $$pre182$i - $7 | 0;
      if (!(HEAP32[$f >> 2] & 32)) ___fwritex($buf$i, $469, $f) | 0;
      $474 = $8 - $437 | 0;
      _pad($f, 48, $l$0$i - ($469 + $474) | 0, 0, 0);
      if (!(HEAP32[$f >> 2] & 32)) ___fwritex($437, $474, $f) | 0;
      _pad($f, 32, $w$1, $464, $fl$1$ ^ 8192);
      $$0$i = ($464 | 0) < ($w$1 | 0) ? $w$1 : $464;
      break;
     }
     $$p$i = ($p$0 | 0) < 0 ? 6 : $p$0;
     if ($398) {
      $484 = (HEAP32[$e2$i >> 2] | 0) + -28 | 0;
      HEAP32[$e2$i >> 2] = $484;
      $$3$i = $397 * 268435456.0;
      $485 = $484;
     } else {
      $$3$i = $397;
      $485 = HEAP32[$e2$i >> 2] | 0;
     }
     $$31$i = ($485 | 0) < 0 ? $big$i : $12;
     $487 = $$31$i;
     $$4$i = $$3$i;
     $z$0$i = $$31$i;
     while (1) {
      $488 = ~~$$4$i >>> 0;
      HEAP32[$z$0$i >> 2] = $488;
      $489 = $z$0$i + 4 | 0;
      $$4$i = ($$4$i - +($488 >>> 0)) * 1.0e9;
      if (!($$4$i != 0.0)) {
       $$lcssa331 = $489;
       break;
      } else $z$0$i = $489;
     }
     $$pr$i = HEAP32[$e2$i >> 2] | 0;
     if (($$pr$i | 0) > 0) {
      $495 = $$pr$i;
      $a$1147$i = $$31$i;
      $z$1146$i = $$lcssa331;
      while (1) {
       $497 = ($495 | 0) > 29 ? 29 : $495;
       $d$0139$i = $z$1146$i + -4 | 0;
       do if ($d$0139$i >>> 0 < $a$1147$i >>> 0) $a$2$ph$i = $a$1147$i; else {
        $carry$0140$i = 0;
        $d$0141$i = $d$0139$i;
        while (1) {
         $500 = _bitshift64Shl(HEAP32[$d$0141$i >> 2] | 0, 0, $497 | 0) | 0;
         $502 = _i64Add($500 | 0, tempRet0 | 0, $carry$0140$i | 0, 0) | 0;
         $503 = tempRet0;
         $504 = ___uremdi3($502 | 0, $503 | 0, 1e9, 0) | 0;
         HEAP32[$d$0141$i >> 2] = $504;
         $506 = ___udivdi3($502 | 0, $503 | 0, 1e9, 0) | 0;
         $d$0141$i = $d$0141$i + -4 | 0;
         if ($d$0141$i >>> 0 < $a$1147$i >>> 0) {
          $$lcssa332 = $506;
          break;
         } else $carry$0140$i = $506;
        }
        if (!$$lcssa332) {
         $a$2$ph$i = $a$1147$i;
         break;
        }
        $510 = $a$1147$i + -4 | 0;
        HEAP32[$510 >> 2] = $$lcssa332;
        $a$2$ph$i = $510;
       } while (0);
       $z$2$i = $z$1146$i;
       while (1) {
        if ($z$2$i >>> 0 <= $a$2$ph$i >>> 0) {
         $z$2$i$lcssa = $z$2$i;
         break;
        }
        $512 = $z$2$i + -4 | 0;
        if (!(HEAP32[$512 >> 2] | 0)) $z$2$i = $512; else {
         $z$2$i$lcssa = $z$2$i;
         break;
        }
       }
       $516 = (HEAP32[$e2$i >> 2] | 0) - $497 | 0;
       HEAP32[$e2$i >> 2] = $516;
       if (($516 | 0) > 0) {
        $495 = $516;
        $a$1147$i = $a$2$ph$i;
        $z$1146$i = $z$2$i$lcssa;
       } else {
        $$pr47$i = $516;
        $a$1$lcssa$i = $a$2$ph$i;
        $z$1$lcssa$i = $z$2$i$lcssa;
        break;
       }
      }
     } else {
      $$pr47$i = $$pr$i;
      $a$1$lcssa$i = $$31$i;
      $z$1$lcssa$i = $$lcssa331;
     }
     if (($$pr47$i | 0) < 0) {
      $521 = (($$p$i + 25 | 0) / 9 | 0) + 1 | 0;
      $522 = ($401 | 0) == 102;
      $524 = $$pr47$i;
      $a$3134$i = $a$1$lcssa$i;
      $z$3133$i = $z$1$lcssa$i;
      while (1) {
       $523 = 0 - $524 | 0;
       $526 = ($523 | 0) > 9 ? 9 : $523;
       do if ($a$3134$i >>> 0 < $z$3133$i >>> 0) {
        $532 = (1 << $526) + -1 | 0;
        $533 = 1e9 >>> $526;
        $carry3$0128$i = 0;
        $d$1127$i = $a$3134$i;
        while (1) {
         $534 = HEAP32[$d$1127$i >> 2] | 0;
         HEAP32[$d$1127$i >> 2] = ($534 >>> $526) + $carry3$0128$i;
         $538 = Math_imul($534 & $532, $533) | 0;
         $d$1127$i = $d$1127$i + 4 | 0;
         if ($d$1127$i >>> 0 >= $z$3133$i >>> 0) {
          $$lcssa334 = $538;
          break;
         } else $carry3$0128$i = $538;
        }
        $$a$3$i = (HEAP32[$a$3134$i >> 2] | 0) == 0 ? $a$3134$i + 4 | 0 : $a$3134$i;
        if (!$$lcssa334) {
         $$a$3186$i = $$a$3$i;
         $z$4$i = $z$3133$i;
         break;
        }
        HEAP32[$z$3133$i >> 2] = $$lcssa334;
        $$a$3186$i = $$a$3$i;
        $z$4$i = $z$3133$i + 4 | 0;
       } else {
        $$a$3186$i = (HEAP32[$a$3134$i >> 2] | 0) == 0 ? $a$3134$i + 4 | 0 : $a$3134$i;
        $z$4$i = $z$3133$i;
       } while (0);
       $546 = $522 ? $$31$i : $$a$3186$i;
       $$z$4$i = ($z$4$i - $546 >> 2 | 0) > ($521 | 0) ? $546 + ($521 << 2) | 0 : $z$4$i;
       $524 = (HEAP32[$e2$i >> 2] | 0) + $526 | 0;
       HEAP32[$e2$i >> 2] = $524;
       if (($524 | 0) >= 0) {
        $a$3$lcssa$i = $$a$3186$i;
        $z$3$lcssa$i = $$z$4$i;
        break;
       } else {
        $a$3134$i = $$a$3186$i;
        $z$3133$i = $$z$4$i;
       }
      }
     } else {
      $a$3$lcssa$i = $a$1$lcssa$i;
      $z$3$lcssa$i = $z$1$lcssa$i;
     }
     do if ($a$3$lcssa$i >>> 0 < $z$3$lcssa$i >>> 0) {
      $560 = ($487 - $a$3$lcssa$i >> 2) * 9 | 0;
      $561 = HEAP32[$a$3$lcssa$i >> 2] | 0;
      if ($561 >>> 0 < 10) {
       $e$1$i = $560;
       break;
      } else {
       $e$0123$i = $560;
       $i$0122$i = 10;
      }
      while (1) {
       $i$0122$i = $i$0122$i * 10 | 0;
       $564 = $e$0123$i + 1 | 0;
       if ($561 >>> 0 < $i$0122$i >>> 0) {
        $e$1$i = $564;
        break;
       } else $e$0123$i = $564;
      }
     } else $e$1$i = 0; while (0);
     $569 = ($401 | 0) == 103;
     $570 = ($$p$i | 0) != 0;
     $572 = $$p$i - (($401 | 0) != 102 ? $e$1$i : 0) + (($570 & $569) << 31 >> 31) | 0;
     if (($572 | 0) < ((($z$3$lcssa$i - $487 >> 2) * 9 | 0) + -9 | 0)) {
      $579 = $572 + 9216 | 0;
      $580 = ($579 | 0) / 9 | 0;
      $581 = $$31$i + ($580 + -1023 << 2) | 0;
      $j$0115$i = (($579 | 0) % 9 | 0) + 1 | 0;
      if (($j$0115$i | 0) < 9) {
       $i$1116$i = 10;
       $j$0117$i = $j$0115$i;
       while (1) {
        $584 = $i$1116$i * 10 | 0;
        $j$0117$i = $j$0117$i + 1 | 0;
        if (($j$0117$i | 0) == 9) {
         $i$1$lcssa$i = $584;
         break;
        } else $i$1116$i = $584;
       }
      } else $i$1$lcssa$i = 10;
      $585 = HEAP32[$581 >> 2] | 0;
      $586 = ($585 >>> 0) % ($i$1$lcssa$i >>> 0) | 0;
      if (!$586) if (($$31$i + ($580 + -1022 << 2) | 0) == ($z$3$lcssa$i | 0)) {
       $a$7$i = $a$3$lcssa$i;
       $d$3$i = $581;
       $e$3$i = $e$1$i;
      } else label = 163; else label = 163;
      do if ((label | 0) == 163) {
       label = 0;
       $$20$i = ((($585 >>> 0) / ($i$1$lcssa$i >>> 0) | 0) & 1 | 0) == 0 ? 9007199254740992.0 : 9007199254740994.0;
       $593 = ($i$1$lcssa$i | 0) / 2 | 0;
       do if ($586 >>> 0 < $593 >>> 0) $small$0$i = .5; else {
        if (($586 | 0) == ($593 | 0)) if (($$31$i + ($580 + -1022 << 2) | 0) == ($z$3$lcssa$i | 0)) {
         $small$0$i = 1.0;
         break;
        }
        $small$0$i = 1.5;
       } while (0);
       do if (!$pl$0$i) {
        $round6$1$i = $$20$i;
        $small$1$i = $small$0$i;
       } else {
        if ((HEAP8[$prefix$0$i >> 0] | 0) != 45) {
         $round6$1$i = $$20$i;
         $small$1$i = $small$0$i;
         break;
        }
        $round6$1$i = -$$20$i;
        $small$1$i = -$small$0$i;
       } while (0);
       $603 = $585 - $586 | 0;
       HEAP32[$581 >> 2] = $603;
       if (!($round6$1$i + $small$1$i != $round6$1$i)) {
        $a$7$i = $a$3$lcssa$i;
        $d$3$i = $581;
        $e$3$i = $e$1$i;
        break;
       }
       $606 = $603 + $i$1$lcssa$i | 0;
       HEAP32[$581 >> 2] = $606;
       if ($606 >>> 0 > 999999999) {
        $a$5109$i = $a$3$lcssa$i;
        $d$2108$i = $581;
        while (1) {
         $608 = $d$2108$i + -4 | 0;
         HEAP32[$d$2108$i >> 2] = 0;
         if ($608 >>> 0 < $a$5109$i >>> 0) {
          $610 = $a$5109$i + -4 | 0;
          HEAP32[$610 >> 2] = 0;
          $a$6$i = $610;
         } else $a$6$i = $a$5109$i;
         $612 = (HEAP32[$608 >> 2] | 0) + 1 | 0;
         HEAP32[$608 >> 2] = $612;
         if ($612 >>> 0 > 999999999) {
          $a$5109$i = $a$6$i;
          $d$2108$i = $608;
         } else {
          $a$5$lcssa$i = $a$6$i;
          $d$2$lcssa$i = $608;
          break;
         }
        }
       } else {
        $a$5$lcssa$i = $a$3$lcssa$i;
        $d$2$lcssa$i = $581;
       }
       $617 = ($487 - $a$5$lcssa$i >> 2) * 9 | 0;
       $618 = HEAP32[$a$5$lcssa$i >> 2] | 0;
       if ($618 >>> 0 < 10) {
        $a$7$i = $a$5$lcssa$i;
        $d$3$i = $d$2$lcssa$i;
        $e$3$i = $617;
        break;
       } else {
        $e$2104$i = $617;
        $i$2103$i = 10;
       }
       while (1) {
        $i$2103$i = $i$2103$i * 10 | 0;
        $621 = $e$2104$i + 1 | 0;
        if ($618 >>> 0 < $i$2103$i >>> 0) {
         $a$7$i = $a$5$lcssa$i;
         $d$3$i = $d$2$lcssa$i;
         $e$3$i = $621;
         break;
        } else $e$2104$i = $621;
       }
      } while (0);
      $623 = $d$3$i + 4 | 0;
      $a$8$ph$i = $a$7$i;
      $e$4$ph$i = $e$3$i;
      $z$6$ph$i = $z$3$lcssa$i >>> 0 > $623 >>> 0 ? $623 : $z$3$lcssa$i;
     } else {
      $a$8$ph$i = $a$3$lcssa$i;
      $e$4$ph$i = $e$1$i;
      $z$6$ph$i = $z$3$lcssa$i;
     }
     $625 = 0 - $e$4$ph$i | 0;
     $z$6$i = $z$6$ph$i;
     while (1) {
      if ($z$6$i >>> 0 <= $a$8$ph$i >>> 0) {
       $$lcssa159$i = 0;
       $z$6$i$lcssa = $z$6$i;
       break;
      }
      $627 = $z$6$i + -4 | 0;
      if (!(HEAP32[$627 >> 2] | 0)) $z$6$i = $627; else {
       $$lcssa159$i = 1;
       $z$6$i$lcssa = $z$6$i;
       break;
      }
     }
     do if ($569) {
      $$p$$i = ($570 & 1 ^ 1) + $$p$i | 0;
      if (($$p$$i | 0) > ($e$4$ph$i | 0) & ($e$4$ph$i | 0) > -5) {
       $$013$i = $t$0 + -1 | 0;
       $$210$i = $$p$$i + -1 - $e$4$ph$i | 0;
      } else {
       $$013$i = $t$0 + -2 | 0;
       $$210$i = $$p$$i + -1 | 0;
      }
      $638 = $fl$1$ & 8;
      if ($638) {
       $$114$i = $$013$i;
       $$311$i = $$210$i;
       $$pre$phi184$iZ2D = $638;
       break;
      }
      do if ($$lcssa159$i) {
       $641 = HEAP32[$z$6$i$lcssa + -4 >> 2] | 0;
       if (!$641) {
        $j$2$i = 9;
        break;
       }
       if (!(($641 >>> 0) % 10 | 0)) {
        $i$399$i = 10;
        $j$1100$i = 0;
       } else {
        $j$2$i = 0;
        break;
       }
       while (1) {
        $i$399$i = $i$399$i * 10 | 0;
        $646 = $j$1100$i + 1 | 0;
        if (($641 >>> 0) % ($i$399$i >>> 0) | 0) {
         $j$2$i = $646;
         break;
        } else $j$1100$i = $646;
       }
      } else $j$2$i = 9; while (0);
      $655 = (($z$6$i$lcssa - $487 >> 2) * 9 | 0) + -9 | 0;
      if (($$013$i | 32 | 0) == 102) {
       $656 = $655 - $j$2$i | 0;
       $$21$i = ($656 | 0) < 0 ? 0 : $656;
       $$114$i = $$013$i;
       $$311$i = ($$210$i | 0) < ($$21$i | 0) ? $$210$i : $$21$i;
       $$pre$phi184$iZ2D = 0;
       break;
      } else {
       $660 = $655 + $e$4$ph$i - $j$2$i | 0;
       $$23$i = ($660 | 0) < 0 ? 0 : $660;
       $$114$i = $$013$i;
       $$311$i = ($$210$i | 0) < ($$23$i | 0) ? $$210$i : $$23$i;
       $$pre$phi184$iZ2D = 0;
       break;
      }
     } else {
      $$114$i = $t$0;
      $$311$i = $$p$i;
      $$pre$phi184$iZ2D = $fl$1$ & 8;
     } while (0);
     $663 = $$311$i | $$pre$phi184$iZ2D;
     $665 = ($663 | 0) != 0 & 1;
     $667 = ($$114$i | 32 | 0) == 102;
     if ($667) {
      $$pn$i = ($e$4$ph$i | 0) > 0 ? $e$4$ph$i : 0;
      $estr$2$i = 0;
     } else {
      $671 = ($e$4$ph$i | 0) < 0 ? $625 : $e$4$ph$i;
      $674 = _fmt_u($671, (($671 | 0) < 0) << 31 >> 31, $5) | 0;
      if (($8 - $674 | 0) < 2) {
       $estr$193$i = $674;
       while (1) {
        $678 = $estr$193$i + -1 | 0;
        HEAP8[$678 >> 0] = 48;
        if (($8 - $678 | 0) < 2) $estr$193$i = $678; else {
         $estr$1$lcssa$i = $678;
         break;
        }
       }
      } else $estr$1$lcssa$i = $674;
      HEAP8[$estr$1$lcssa$i + -1 >> 0] = ($e$4$ph$i >> 31 & 2) + 43;
      $688 = $estr$1$lcssa$i + -2 | 0;
      HEAP8[$688 >> 0] = $$114$i;
      $$pn$i = $8 - $688 | 0;
      $estr$2$i = $688;
     }
     $693 = $pl$0$i + 1 + $$311$i + $665 + $$pn$i | 0;
     _pad($f, 32, $w$1, $693, $fl$1$);
     if (!(HEAP32[$f >> 2] & 32)) ___fwritex($prefix$0$i, $pl$0$i, $f) | 0;
     _pad($f, 48, $w$1, $693, $fl$1$ ^ 65536);
     do if ($667) {
      $r$0$a$8$i = $a$8$ph$i >>> 0 > $$31$i >>> 0 ? $$31$i : $a$8$ph$i;
      $d$482$i = $r$0$a$8$i;
      while (1) {
       $700 = _fmt_u(HEAP32[$d$482$i >> 2] | 0, 0, $13) | 0;
       do if (($d$482$i | 0) == ($r$0$a$8$i | 0)) {
        if (($700 | 0) != ($13 | 0)) {
         $s7$1$i = $700;
         break;
        }
        HEAP8[$15 >> 0] = 48;
        $s7$1$i = $15;
       } else {
        if ($700 >>> 0 > $buf$i >>> 0) $s7$079$i = $700; else {
         $s7$1$i = $700;
         break;
        }
        while (1) {
         $703 = $s7$079$i + -1 | 0;
         HEAP8[$703 >> 0] = 48;
         if ($703 >>> 0 > $buf$i >>> 0) $s7$079$i = $703; else {
          $s7$1$i = $703;
          break;
         }
        }
       } while (0);
       if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s7$1$i, $14 - $s7$1$i | 0, $f) | 0;
       $711 = $d$482$i + 4 | 0;
       if ($711 >>> 0 > $$31$i >>> 0) {
        $$lcssa344 = $711;
        break;
       } else $d$482$i = $711;
      }
      do if ($663) {
       if (HEAP32[$f >> 2] & 32) break;
       ___fwritex(4854, 1, $f) | 0;
      } while (0);
      if (($$311$i | 0) > 0 & $$lcssa344 >>> 0 < $z$6$i$lcssa >>> 0) {
       $$41276$i = $$311$i;
       $d$575$i = $$lcssa344;
       while (1) {
        $721 = _fmt_u(HEAP32[$d$575$i >> 2] | 0, 0, $13) | 0;
        if ($721 >>> 0 > $buf$i >>> 0) {
         $s8$070$i = $721;
         while (1) {
          $723 = $s8$070$i + -1 | 0;
          HEAP8[$723 >> 0] = 48;
          if ($723 >>> 0 > $buf$i >>> 0) $s8$070$i = $723; else {
           $s8$0$lcssa$i = $723;
           break;
          }
         }
        } else $s8$0$lcssa$i = $721;
        if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s8$0$lcssa$i, ($$41276$i | 0) > 9 ? 9 : $$41276$i, $f) | 0;
        $d$575$i = $d$575$i + 4 | 0;
        $731 = $$41276$i + -9 | 0;
        if (!(($$41276$i | 0) > 9 & $d$575$i >>> 0 < $z$6$i$lcssa >>> 0)) {
         $$412$lcssa$i = $731;
         break;
        } else $$41276$i = $731;
       }
      } else $$412$lcssa$i = $$311$i;
      _pad($f, 48, $$412$lcssa$i + 9 | 0, 9, 0);
     } else {
      $z$6$$i = $$lcssa159$i ? $z$6$i$lcssa : $a$8$ph$i + 4 | 0;
      if (($$311$i | 0) > -1) {
       $738 = ($$pre$phi184$iZ2D | 0) == 0;
       $$587$i = $$311$i;
       $d$686$i = $a$8$ph$i;
       while (1) {
        $740 = _fmt_u(HEAP32[$d$686$i >> 2] | 0, 0, $13) | 0;
        if (($740 | 0) == ($13 | 0)) {
         HEAP8[$15 >> 0] = 48;
         $s9$0$i = $15;
        } else $s9$0$i = $740;
        do if (($d$686$i | 0) == ($a$8$ph$i | 0)) {
         $746 = $s9$0$i + 1 | 0;
         if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s9$0$i, 1, $f) | 0;
         if ($738 & ($$587$i | 0) < 1) {
          $s9$2$i = $746;
          break;
         }
         if (HEAP32[$f >> 2] & 32) {
          $s9$2$i = $746;
          break;
         }
         ___fwritex(4854, 1, $f) | 0;
         $s9$2$i = $746;
        } else {
         if ($s9$0$i >>> 0 > $buf$i >>> 0) $s9$183$i = $s9$0$i; else {
          $s9$2$i = $s9$0$i;
          break;
         }
         while (1) {
          $744 = $s9$183$i + -1 | 0;
          HEAP8[$744 >> 0] = 48;
          if ($744 >>> 0 > $buf$i >>> 0) $s9$183$i = $744; else {
           $s9$2$i = $744;
           break;
          }
         }
        } while (0);
        $755 = $14 - $s9$2$i | 0;
        if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s9$2$i, ($$587$i | 0) > ($755 | 0) ? $755 : $$587$i, $f) | 0;
        $761 = $$587$i - $755 | 0;
        $d$686$i = $d$686$i + 4 | 0;
        if (!($d$686$i >>> 0 < $z$6$$i >>> 0 & ($761 | 0) > -1)) {
         $$5$lcssa$i = $761;
         break;
        } else $$587$i = $761;
       }
      } else $$5$lcssa$i = $$311$i;
      _pad($f, 48, $$5$lcssa$i + 18 | 0, 18, 0);
      if (HEAP32[$f >> 2] & 32) break;
      ___fwritex($estr$2$i, $8 - $estr$2$i | 0, $f) | 0;
     } while (0);
     _pad($f, 32, $w$1, $693, $fl$1$ ^ 8192);
     $$0$i = ($693 | 0) < ($w$1 | 0) ? $w$1 : $693;
    } else {
     $382 = ($t$0 & 32 | 0) != 0;
     $384 = $$07$i != $$07$i | 0.0 != 0.0;
     $pl$1$i = $384 ? 0 : $pl$0$i;
     $386 = $pl$1$i + 3 | 0;
     _pad($f, 32, $w$1, $386, $180);
     $387 = HEAP32[$f >> 2] | 0;
     if (!($387 & 32)) {
      ___fwritex($prefix$0$i, $pl$1$i, $f) | 0;
      $391 = HEAP32[$f >> 2] | 0;
     } else $391 = $387;
     if (!($391 & 32)) ___fwritex($384 ? ($382 ? 4846 : 4850) : $382 ? 4838 : 4842, 3, $f) | 0;
     _pad($f, 32, $w$1, $386, $fl$1$ ^ 8192);
     $$0$i = ($386 | 0) < ($w$1 | 0) ? $w$1 : $386;
    } while (0);
    $22 = $$lcssa328;
    $cnt$0 = $cnt$1;
    $l$0 = $$0$i;
    $l10n$0 = $l10n$3;
    continue L1;
    break;
   }
  default:
   {
    $a$2 = $22;
    $fl$6 = $fl$1$;
    $p$5 = $p$0;
    $pl$2 = 0;
    $prefix$2 = 4802;
    $z$2 = $1;
   }
  } while (0);
  L313 : do if ((label | 0) == 64) {
   label = 0;
   $211 = $arg;
   $213 = HEAP32[$211 >> 2] | 0;
   $216 = HEAP32[$211 + 4 >> 2] | 0;
   $217 = $t$1 & 32;
   if (($213 | 0) == 0 & ($216 | 0) == 0) {
    $a$0 = $1;
    $fl$4 = $fl$3;
    $p$2 = $p$1;
    $pl$1 = 0;
    $prefix$1 = 4802;
    label = 77;
   } else {
    $$012$i = $1;
    $222 = $213;
    $229 = $216;
    while (1) {
     $228 = $$012$i + -1 | 0;
     HEAP8[$228 >> 0] = HEAPU8[4786 + ($222 & 15) >> 0] | $217;
     $222 = _bitshift64Lshr($222 | 0, $229 | 0, 4) | 0;
     $229 = tempRet0;
     if (($222 | 0) == 0 & ($229 | 0) == 0) {
      $$lcssa349 = $228;
      break;
     } else $$012$i = $228;
    }
    $235 = $arg;
    if (($fl$3 & 8 | 0) == 0 | (HEAP32[$235 >> 2] | 0) == 0 & (HEAP32[$235 + 4 >> 2] | 0) == 0) {
     $a$0 = $$lcssa349;
     $fl$4 = $fl$3;
     $p$2 = $p$1;
     $pl$1 = 0;
     $prefix$1 = 4802;
     label = 77;
    } else {
     $a$0 = $$lcssa349;
     $fl$4 = $fl$3;
     $p$2 = $p$1;
     $pl$1 = 2;
     $prefix$1 = 4802 + ($t$1 >> 4) | 0;
     label = 77;
    }
   }
  } else if ((label | 0) == 76) {
   label = 0;
   $a$0 = _fmt_u($291, $292, $1) | 0;
   $fl$4 = $fl$1$;
   $p$2 = $p$0;
   $pl$1 = $pl$0;
   $prefix$1 = $prefix$0;
   label = 77;
  } else if ((label | 0) == 82) {
   label = 0;
   $325 = _memchr($a$1, 0, $p$0) | 0;
   $326 = ($325 | 0) == 0;
   $a$2 = $a$1;
   $fl$6 = $180;
   $p$5 = $326 ? $p$0 : $325 - $a$1 | 0;
   $pl$2 = 0;
   $prefix$2 = 4802;
   $z$2 = $326 ? $a$1 + $p$0 | 0 : $325;
  } else if ((label | 0) == 86) {
   label = 0;
   $i$0108 = 0;
   $l$1107 = 0;
   $ws$0109 = HEAP32[$arg >> 2] | 0;
   while (1) {
    $339 = HEAP32[$ws$0109 >> 2] | 0;
    if (!$339) {
     $i$0$lcssa = $i$0108;
     $l$2 = $l$1107;
     break;
    }
    $341 = _wctomb($mb, $339) | 0;
    if (($341 | 0) < 0 | $341 >>> 0 > ($p$4195 - $i$0108 | 0) >>> 0) {
     $i$0$lcssa = $i$0108;
     $l$2 = $341;
     break;
    }
    $346 = $341 + $i$0108 | 0;
    if ($p$4195 >>> 0 > $346 >>> 0) {
     $i$0108 = $346;
     $l$1107 = $341;
     $ws$0109 = $ws$0109 + 4 | 0;
    } else {
     $i$0$lcssa = $346;
     $l$2 = $341;
     break;
    }
   }
   if (($l$2 | 0) < 0) {
    $$0 = -1;
    break L1;
   }
   _pad($f, 32, $w$1, $i$0$lcssa, $fl$1$);
   if (!$i$0$lcssa) {
    $i$0$lcssa197 = 0;
    label = 98;
   } else {
    $i$1119 = 0;
    $ws$1120 = HEAP32[$arg >> 2] | 0;
    while (1) {
     $351 = HEAP32[$ws$1120 >> 2] | 0;
     if (!$351) {
      $i$0$lcssa197 = $i$0$lcssa;
      label = 98;
      break L313;
     }
     $354 = _wctomb($mb, $351) | 0;
     $i$1119 = $354 + $i$1119 | 0;
     if (($i$1119 | 0) > ($i$0$lcssa | 0)) {
      $i$0$lcssa197 = $i$0$lcssa;
      label = 98;
      break L313;
     }
     if (!(HEAP32[$f >> 2] & 32)) ___fwritex($mb, $354, $f) | 0;
     if ($i$1119 >>> 0 >= $i$0$lcssa >>> 0) {
      $i$0$lcssa197 = $i$0$lcssa;
      label = 98;
      break;
     } else $ws$1120 = $ws$1120 + 4 | 0;
    }
   }
  } while (0);
  if ((label | 0) == 98) {
   label = 0;
   _pad($f, 32, $w$1, $i$0$lcssa197, $fl$1$ ^ 8192);
   $22 = $$lcssa328;
   $cnt$0 = $cnt$1;
   $l$0 = ($w$1 | 0) > ($i$0$lcssa197 | 0) ? $w$1 : $i$0$lcssa197;
   $l10n$0 = $l10n$3;
   continue;
  }
  if ((label | 0) == 77) {
   label = 0;
   $$fl$4 = ($p$2 | 0) > -1 ? $fl$4 & -65537 : $fl$4;
   $296 = $arg;
   $304 = (HEAP32[$296 >> 2] | 0) != 0 | (HEAP32[$296 + 4 >> 2] | 0) != 0;
   if (($p$2 | 0) != 0 | $304) {
    $310 = ($304 & 1 ^ 1) + ($2 - $a$0) | 0;
    $a$2 = $a$0;
    $fl$6 = $$fl$4;
    $p$5 = ($p$2 | 0) > ($310 | 0) ? $p$2 : $310;
    $pl$2 = $pl$1;
    $prefix$2 = $prefix$1;
    $z$2 = $1;
   } else {
    $a$2 = $1;
    $fl$6 = $$fl$4;
    $p$5 = 0;
    $pl$2 = $pl$1;
    $prefix$2 = $prefix$1;
    $z$2 = $1;
   }
  }
  $776 = $z$2 - $a$2 | 0;
  $$p$5 = ($p$5 | 0) < ($776 | 0) ? $776 : $p$5;
  $778 = $pl$2 + $$p$5 | 0;
  $w$2 = ($w$1 | 0) < ($778 | 0) ? $778 : $w$1;
  _pad($f, 32, $w$2, $778, $fl$6);
  if (!(HEAP32[$f >> 2] & 32)) ___fwritex($prefix$2, $pl$2, $f) | 0;
  _pad($f, 48, $w$2, $778, $fl$6 ^ 65536);
  _pad($f, 48, $$p$5, $776, 0);
  if (!(HEAP32[$f >> 2] & 32)) ___fwritex($a$2, $776, $f) | 0;
  _pad($f, 32, $w$2, $778, $fl$6 ^ 8192);
  $22 = $$lcssa328;
  $cnt$0 = $cnt$1;
  $l$0 = $w$2;
  $l10n$0 = $l10n$3;
 }
 L348 : do if ((label | 0) == 245) if (!$f) if (!$l10n$0$lcssa) $$0 = 0; else {
  $i$295 = 1;
  while (1) {
   $791 = HEAP32[$nl_type + ($i$295 << 2) >> 2] | 0;
   if (!$791) {
    $i$295$lcssa = $i$295;
    break;
   }
   _pop_arg425($nl_arg + ($i$295 << 3) | 0, $791, $ap);
   $i$295 = $i$295 + 1 | 0;
   if (($i$295 | 0) >= 10) {
    $$0 = 1;
    break L348;
   }
  }
  if (($i$295$lcssa | 0) < 10) {
   $i$393 = $i$295$lcssa;
   while (1) {
    if (HEAP32[$nl_type + ($i$393 << 2) >> 2] | 0) {
     $$0 = -1;
     break L348;
    }
    $i$393 = $i$393 + 1 | 0;
    if (($i$393 | 0) >= 10) {
     $$0 = 1;
     break;
    }
   }
  } else $$0 = 1;
 } else $$0 = $cnt$1$lcssa; while (0);
 STACKTOP = sp;
 return $$0 | 0;
}

function _free($mem) {
 $mem = $mem | 0;
 var $$lcssa = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$sum2 = 0, $1 = 0, $103 = 0, $104 = 0, $111 = 0, $112 = 0, $12 = 0, $120 = 0, $128 = 0, $133 = 0, $134 = 0, $137 = 0, $139 = 0, $14 = 0, $141 = 0, $15 = 0, $156 = 0, $161 = 0, $163 = 0, $166 = 0, $169 = 0, $172 = 0, $175 = 0, $176 = 0, $178 = 0, $179 = 0, $181 = 0, $182 = 0, $184 = 0, $185 = 0, $19 = 0, $191 = 0, $192 = 0, $2 = 0, $201 = 0, $206 = 0, $210 = 0, $216 = 0, $22 = 0, $231 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $24 = 0, $240 = 0, $241 = 0, $247 = 0, $252 = 0, $253 = 0, $256 = 0, $258 = 0, $26 = 0, $261 = 0, $266 = 0, $272 = 0, $276 = 0, $277 = 0, $284 = 0, $296 = 0, $301 = 0, $308 = 0, $309 = 0, $310 = 0, $318 = 0, $39 = 0, $44 = 0, $46 = 0, $49 = 0, $5 = 0, $51 = 0, $54 = 0, $57 = 0, $58 = 0, $6 = 0, $60 = 0, $61 = 0, $63 = 0, $64 = 0, $66 = 0, $67 = 0, $72 = 0, $73 = 0, $8 = 0, $82 = 0, $87 = 0, $9 = 0, $91 = 0, $97 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0, $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0;
 if (!$mem) return;
 $1 = $mem + -8 | 0;
 $2 = HEAP32[155] | 0;
 if ($1 >>> 0 < $2 >>> 0) _abort();
 $5 = HEAP32[$mem + -4 >> 2] | 0;
 $6 = $5 & 3;
 if (($6 | 0) == 1) _abort();
 $8 = $5 & -8;
 $9 = $mem + ($8 + -8) | 0;
 do if (!($5 & 1)) {
  $12 = HEAP32[$1 >> 2] | 0;
  if (!$6) return;
  $$sum2 = -8 - $12 | 0;
  $14 = $mem + $$sum2 | 0;
  $15 = $12 + $8 | 0;
  if ($14 >>> 0 < $2 >>> 0) _abort();
  if (($14 | 0) == (HEAP32[156] | 0)) {
   $103 = $mem + ($8 + -4) | 0;
   $104 = HEAP32[$103 >> 2] | 0;
   if (($104 & 3 | 0) != 3) {
    $p$0 = $14;
    $psize$0 = $15;
    break;
   }
   HEAP32[153] = $15;
   HEAP32[$103 >> 2] = $104 & -2;
   HEAP32[$mem + ($$sum2 + 4) >> 2] = $15 | 1;
   HEAP32[$9 >> 2] = $15;
   return;
  }
  $19 = $12 >>> 3;
  if ($12 >>> 0 < 256) {
   $22 = HEAP32[$mem + ($$sum2 + 8) >> 2] | 0;
   $24 = HEAP32[$mem + ($$sum2 + 12) >> 2] | 0;
   $26 = 644 + ($19 << 1 << 2) | 0;
   if (($22 | 0) != ($26 | 0)) {
    if ($22 >>> 0 < $2 >>> 0) _abort();
    if ((HEAP32[$22 + 12 >> 2] | 0) != ($14 | 0)) _abort();
   }
   if (($24 | 0) == ($22 | 0)) {
    HEAP32[151] = HEAP32[151] & ~(1 << $19);
    $p$0 = $14;
    $psize$0 = $15;
    break;
   }
   if (($24 | 0) == ($26 | 0)) $$pre$phi61Z2D = $24 + 8 | 0; else {
    if ($24 >>> 0 < $2 >>> 0) _abort();
    $39 = $24 + 8 | 0;
    if ((HEAP32[$39 >> 2] | 0) == ($14 | 0)) $$pre$phi61Z2D = $39; else _abort();
   }
   HEAP32[$22 + 12 >> 2] = $24;
   HEAP32[$$pre$phi61Z2D >> 2] = $22;
   $p$0 = $14;
   $psize$0 = $15;
   break;
  }
  $44 = HEAP32[$mem + ($$sum2 + 24) >> 2] | 0;
  $46 = HEAP32[$mem + ($$sum2 + 12) >> 2] | 0;
  do if (($46 | 0) == ($14 | 0)) {
   $57 = $mem + ($$sum2 + 20) | 0;
   $58 = HEAP32[$57 >> 2] | 0;
   if (!$58) {
    $60 = $mem + ($$sum2 + 16) | 0;
    $61 = HEAP32[$60 >> 2] | 0;
    if (!$61) {
     $R$1 = 0;
     break;
    } else {
     $R$0 = $61;
     $RP$0 = $60;
    }
   } else {
    $R$0 = $58;
    $RP$0 = $57;
   }
   while (1) {
    $63 = $R$0 + 20 | 0;
    $64 = HEAP32[$63 >> 2] | 0;
    if ($64) {
     $R$0 = $64;
     $RP$0 = $63;
     continue;
    }
    $66 = $R$0 + 16 | 0;
    $67 = HEAP32[$66 >> 2] | 0;
    if (!$67) {
     $R$0$lcssa = $R$0;
     $RP$0$lcssa = $RP$0;
     break;
    } else {
     $R$0 = $67;
     $RP$0 = $66;
    }
   }
   if ($RP$0$lcssa >>> 0 < $2 >>> 0) _abort(); else {
    HEAP32[$RP$0$lcssa >> 2] = 0;
    $R$1 = $R$0$lcssa;
    break;
   }
  } else {
   $49 = HEAP32[$mem + ($$sum2 + 8) >> 2] | 0;
   if ($49 >>> 0 < $2 >>> 0) _abort();
   $51 = $49 + 12 | 0;
   if ((HEAP32[$51 >> 2] | 0) != ($14 | 0)) _abort();
   $54 = $46 + 8 | 0;
   if ((HEAP32[$54 >> 2] | 0) == ($14 | 0)) {
    HEAP32[$51 >> 2] = $46;
    HEAP32[$54 >> 2] = $49;
    $R$1 = $46;
    break;
   } else _abort();
  } while (0);
  if (!$44) {
   $p$0 = $14;
   $psize$0 = $15;
  } else {
   $72 = HEAP32[$mem + ($$sum2 + 28) >> 2] | 0;
   $73 = 908 + ($72 << 2) | 0;
   if (($14 | 0) == (HEAP32[$73 >> 2] | 0)) {
    HEAP32[$73 >> 2] = $R$1;
    if (!$R$1) {
     HEAP32[152] = HEAP32[152] & ~(1 << $72);
     $p$0 = $14;
     $psize$0 = $15;
     break;
    }
   } else {
    if ($44 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
    $82 = $44 + 16 | 0;
    if ((HEAP32[$82 >> 2] | 0) == ($14 | 0)) HEAP32[$82 >> 2] = $R$1; else HEAP32[$44 + 20 >> 2] = $R$1;
    if (!$R$1) {
     $p$0 = $14;
     $psize$0 = $15;
     break;
    }
   }
   $87 = HEAP32[155] | 0;
   if ($R$1 >>> 0 < $87 >>> 0) _abort();
   HEAP32[$R$1 + 24 >> 2] = $44;
   $91 = HEAP32[$mem + ($$sum2 + 16) >> 2] | 0;
   do if ($91) if ($91 >>> 0 < $87 >>> 0) _abort(); else {
    HEAP32[$R$1 + 16 >> 2] = $91;
    HEAP32[$91 + 24 >> 2] = $R$1;
    break;
   } while (0);
   $97 = HEAP32[$mem + ($$sum2 + 20) >> 2] | 0;
   if (!$97) {
    $p$0 = $14;
    $psize$0 = $15;
   } else if ($97 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
    HEAP32[$R$1 + 20 >> 2] = $97;
    HEAP32[$97 + 24 >> 2] = $R$1;
    $p$0 = $14;
    $psize$0 = $15;
    break;
   }
  }
 } else {
  $p$0 = $1;
  $psize$0 = $8;
 } while (0);
 if ($p$0 >>> 0 >= $9 >>> 0) _abort();
 $111 = $mem + ($8 + -4) | 0;
 $112 = HEAP32[$111 >> 2] | 0;
 if (!($112 & 1)) _abort();
 if (!($112 & 2)) {
  if (($9 | 0) == (HEAP32[157] | 0)) {
   $120 = (HEAP32[154] | 0) + $psize$0 | 0;
   HEAP32[154] = $120;
   HEAP32[157] = $p$0;
   HEAP32[$p$0 + 4 >> 2] = $120 | 1;
   if (($p$0 | 0) != (HEAP32[156] | 0)) return;
   HEAP32[156] = 0;
   HEAP32[153] = 0;
   return;
  }
  if (($9 | 0) == (HEAP32[156] | 0)) {
   $128 = (HEAP32[153] | 0) + $psize$0 | 0;
   HEAP32[153] = $128;
   HEAP32[156] = $p$0;
   HEAP32[$p$0 + 4 >> 2] = $128 | 1;
   HEAP32[$p$0 + $128 >> 2] = $128;
   return;
  }
  $133 = ($112 & -8) + $psize$0 | 0;
  $134 = $112 >>> 3;
  do if ($112 >>> 0 < 256) {
   $137 = HEAP32[$mem + $8 >> 2] | 0;
   $139 = HEAP32[$mem + ($8 | 4) >> 2] | 0;
   $141 = 644 + ($134 << 1 << 2) | 0;
   if (($137 | 0) != ($141 | 0)) {
    if ($137 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
    if ((HEAP32[$137 + 12 >> 2] | 0) != ($9 | 0)) _abort();
   }
   if (($139 | 0) == ($137 | 0)) {
    HEAP32[151] = HEAP32[151] & ~(1 << $134);
    break;
   }
   if (($139 | 0) == ($141 | 0)) $$pre$phi59Z2D = $139 + 8 | 0; else {
    if ($139 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
    $156 = $139 + 8 | 0;
    if ((HEAP32[$156 >> 2] | 0) == ($9 | 0)) $$pre$phi59Z2D = $156; else _abort();
   }
   HEAP32[$137 + 12 >> 2] = $139;
   HEAP32[$$pre$phi59Z2D >> 2] = $137;
  } else {
   $161 = HEAP32[$mem + ($8 + 16) >> 2] | 0;
   $163 = HEAP32[$mem + ($8 | 4) >> 2] | 0;
   do if (($163 | 0) == ($9 | 0)) {
    $175 = $mem + ($8 + 12) | 0;
    $176 = HEAP32[$175 >> 2] | 0;
    if (!$176) {
     $178 = $mem + ($8 + 8) | 0;
     $179 = HEAP32[$178 >> 2] | 0;
     if (!$179) {
      $R7$1 = 0;
      break;
     } else {
      $R7$0 = $179;
      $RP9$0 = $178;
     }
    } else {
     $R7$0 = $176;
     $RP9$0 = $175;
    }
    while (1) {
     $181 = $R7$0 + 20 | 0;
     $182 = HEAP32[$181 >> 2] | 0;
     if ($182) {
      $R7$0 = $182;
      $RP9$0 = $181;
      continue;
     }
     $184 = $R7$0 + 16 | 0;
     $185 = HEAP32[$184 >> 2] | 0;
     if (!$185) {
      $R7$0$lcssa = $R7$0;
      $RP9$0$lcssa = $RP9$0;
      break;
     } else {
      $R7$0 = $185;
      $RP9$0 = $184;
     }
    }
    if ($RP9$0$lcssa >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
     HEAP32[$RP9$0$lcssa >> 2] = 0;
     $R7$1 = $R7$0$lcssa;
     break;
    }
   } else {
    $166 = HEAP32[$mem + $8 >> 2] | 0;
    if ($166 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
    $169 = $166 + 12 | 0;
    if ((HEAP32[$169 >> 2] | 0) != ($9 | 0)) _abort();
    $172 = $163 + 8 | 0;
    if ((HEAP32[$172 >> 2] | 0) == ($9 | 0)) {
     HEAP32[$169 >> 2] = $163;
     HEAP32[$172 >> 2] = $166;
     $R7$1 = $163;
     break;
    } else _abort();
   } while (0);
   if ($161) {
    $191 = HEAP32[$mem + ($8 + 20) >> 2] | 0;
    $192 = 908 + ($191 << 2) | 0;
    if (($9 | 0) == (HEAP32[$192 >> 2] | 0)) {
     HEAP32[$192 >> 2] = $R7$1;
     if (!$R7$1) {
      HEAP32[152] = HEAP32[152] & ~(1 << $191);
      break;
     }
    } else {
     if ($161 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort();
     $201 = $161 + 16 | 0;
     if ((HEAP32[$201 >> 2] | 0) == ($9 | 0)) HEAP32[$201 >> 2] = $R7$1; else HEAP32[$161 + 20 >> 2] = $R7$1;
     if (!$R7$1) break;
    }
    $206 = HEAP32[155] | 0;
    if ($R7$1 >>> 0 < $206 >>> 0) _abort();
    HEAP32[$R7$1 + 24 >> 2] = $161;
    $210 = HEAP32[$mem + ($8 + 8) >> 2] | 0;
    do if ($210) if ($210 >>> 0 < $206 >>> 0) _abort(); else {
     HEAP32[$R7$1 + 16 >> 2] = $210;
     HEAP32[$210 + 24 >> 2] = $R7$1;
     break;
    } while (0);
    $216 = HEAP32[$mem + ($8 + 12) >> 2] | 0;
    if ($216) if ($216 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
     HEAP32[$R7$1 + 20 >> 2] = $216;
     HEAP32[$216 + 24 >> 2] = $R7$1;
     break;
    }
   }
  } while (0);
  HEAP32[$p$0 + 4 >> 2] = $133 | 1;
  HEAP32[$p$0 + $133 >> 2] = $133;
  if (($p$0 | 0) == (HEAP32[156] | 0)) {
   HEAP32[153] = $133;
   return;
  } else $psize$1 = $133;
 } else {
  HEAP32[$111 >> 2] = $112 & -2;
  HEAP32[$p$0 + 4 >> 2] = $psize$0 | 1;
  HEAP32[$p$0 + $psize$0 >> 2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 if ($psize$1 >>> 0 < 256) {
  $233 = $231 << 1;
  $234 = 644 + ($233 << 2) | 0;
  $235 = HEAP32[151] | 0;
  $236 = 1 << $231;
  if (!($235 & $236)) {
   HEAP32[151] = $235 | $236;
   $$pre$phiZ2D = 644 + ($233 + 2 << 2) | 0;
   $F16$0 = $234;
  } else {
   $240 = 644 + ($233 + 2 << 2) | 0;
   $241 = HEAP32[$240 >> 2] | 0;
   if ($241 >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
    $$pre$phiZ2D = $240;
    $F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D >> 2] = $p$0;
  HEAP32[$F16$0 + 12 >> 2] = $p$0;
  HEAP32[$p$0 + 8 >> 2] = $F16$0;
  HEAP32[$p$0 + 12 >> 2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 if (!$247) $I18$0 = 0; else if ($psize$1 >>> 0 > 16777215) $I18$0 = 31; else {
  $252 = ($247 + 1048320 | 0) >>> 16 & 8;
  $253 = $247 << $252;
  $256 = ($253 + 520192 | 0) >>> 16 & 4;
  $258 = $253 << $256;
  $261 = ($258 + 245760 | 0) >>> 16 & 2;
  $266 = 14 - ($256 | $252 | $261) + ($258 << $261 >>> 15) | 0;
  $I18$0 = $psize$1 >>> ($266 + 7 | 0) & 1 | $266 << 1;
 }
 $272 = 908 + ($I18$0 << 2) | 0;
 HEAP32[$p$0 + 28 >> 2] = $I18$0;
 HEAP32[$p$0 + 20 >> 2] = 0;
 HEAP32[$p$0 + 16 >> 2] = 0;
 $276 = HEAP32[152] | 0;
 $277 = 1 << $I18$0;
 L199 : do if (!($276 & $277)) {
  HEAP32[152] = $276 | $277;
  HEAP32[$272 >> 2] = $p$0;
  HEAP32[$p$0 + 24 >> 2] = $272;
  HEAP32[$p$0 + 12 >> 2] = $p$0;
  HEAP32[$p$0 + 8 >> 2] = $p$0;
 } else {
  $284 = HEAP32[$272 >> 2] | 0;
  L202 : do if ((HEAP32[$284 + 4 >> 2] & -8 | 0) == ($psize$1 | 0)) $T$0$lcssa = $284; else {
   $K19$052 = $psize$1 << (($I18$0 | 0) == 31 ? 0 : 25 - ($I18$0 >>> 1) | 0);
   $T$051 = $284;
   while (1) {
    $301 = $T$051 + 16 + ($K19$052 >>> 31 << 2) | 0;
    $296 = HEAP32[$301 >> 2] | 0;
    if (!$296) {
     $$lcssa = $301;
     $T$051$lcssa = $T$051;
     break;
    }
    if ((HEAP32[$296 + 4 >> 2] & -8 | 0) == ($psize$1 | 0)) {
     $T$0$lcssa = $296;
     break L202;
    } else {
     $K19$052 = $K19$052 << 1;
     $T$051 = $296;
    }
   }
   if ($$lcssa >>> 0 < (HEAP32[155] | 0) >>> 0) _abort(); else {
    HEAP32[$$lcssa >> 2] = $p$0;
    HEAP32[$p$0 + 24 >> 2] = $T$051$lcssa;
    HEAP32[$p$0 + 12 >> 2] = $p$0;
    HEAP32[$p$0 + 8 >> 2] = $p$0;
    break L199;
   }
  } while (0);
  $308 = $T$0$lcssa + 8 | 0;
  $309 = HEAP32[$308 >> 2] | 0;
  $310 = HEAP32[155] | 0;
  if ($309 >>> 0 >= $310 >>> 0 & $T$0$lcssa >>> 0 >= $310 >>> 0) {
   HEAP32[$309 + 12 >> 2] = $p$0;
   HEAP32[$308 >> 2] = $p$0;
   HEAP32[$p$0 + 8 >> 2] = $309;
   HEAP32[$p$0 + 12 >> 2] = $T$0$lcssa;
   HEAP32[$p$0 + 24 >> 2] = 0;
   break;
  } else _abort();
 } while (0);
 $318 = (HEAP32[159] | 0) + -1 | 0;
 HEAP32[159] = $318;
 if (!$318) $sp$0$in$i = 1060; else return;
 while (1) {
  $sp$0$i = HEAP32[$sp$0$in$i >> 2] | 0;
  if (!$sp$0$i) break; else $sp$0$in$i = $sp$0$i + 8 | 0;
 }
 HEAP32[159] = -1;
 return;
}

function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 $rem = $rem | 0;
 var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $_0$0 = 0, $_0$1 = 0, $q_sroa_1_1198$looptemp = 0;
 $n_sroa_0_0_extract_trunc = $a$0;
 $n_sroa_1_4_extract_shift$0 = $a$1;
 $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
 $d_sroa_0_0_extract_trunc = $b$0;
 $d_sroa_1_4_extract_shift$0 = $b$1;
 $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
 if (!$n_sroa_1_4_extract_trunc) {
  $4 = ($rem | 0) != 0;
  if (!$d_sroa_1_4_extract_trunc) {
   if ($4) {
    HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
    HEAP32[$rem + 4 >> 2] = 0;
   }
   $_0$1 = 0;
   $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  } else {
   if (!$4) {
    $_0$1 = 0;
    $_0$0 = 0;
    return (tempRet0 = $_0$1, $_0$0) | 0;
   }
   HEAP32[$rem >> 2] = $a$0 | 0;
   HEAP32[$rem + 4 >> 2] = $a$1 & 0;
   $_0$1 = 0;
   $_0$0 = 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
 }
 $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
 do if (!$d_sroa_0_0_extract_trunc) {
  if ($17) {
   if ($rem) {
    HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
    HEAP32[$rem + 4 >> 2] = 0;
   }
   $_0$1 = 0;
   $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  if (!$n_sroa_0_0_extract_trunc) {
   if ($rem) {
    HEAP32[$rem >> 2] = 0;
    HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
   }
   $_0$1 = 0;
   $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
  if (!($37 & $d_sroa_1_4_extract_trunc)) {
   if ($rem) {
    HEAP32[$rem >> 2] = $a$0 | 0;
    HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
   }
   $_0$1 = 0;
   $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  $51 = (Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0) - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
  if ($51 >>> 0 <= 30) {
   $57 = $51 + 1 | 0;
   $58 = 31 - $51 | 0;
   $sr_1_ph = $57;
   $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
   $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
   $q_sroa_0_1_ph = 0;
   $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
   break;
  }
  if (!$rem) {
   $_0$1 = 0;
   $_0$0 = 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  HEAP32[$rem >> 2] = $a$0 | 0;
  HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
  $_0$1 = 0;
  $_0$0 = 0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
 } else {
  if (!$17) {
   $119 = (Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0) - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
   if ($119 >>> 0 <= 31) {
    $125 = $119 + 1 | 0;
    $126 = 31 - $119 | 0;
    $130 = $119 - 31 >> 31;
    $sr_1_ph = $125;
    $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
    $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
    $q_sroa_0_1_ph = 0;
    $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
    break;
   }
   if (!$rem) {
    $_0$1 = 0;
    $_0$0 = 0;
    return (tempRet0 = $_0$1, $_0$0) | 0;
   }
   HEAP32[$rem >> 2] = $a$0 | 0;
   HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
   $_0$1 = 0;
   $_0$0 = 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
  if ($66 & $d_sroa_0_0_extract_trunc) {
   $88 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
   $89 = 64 - $88 | 0;
   $91 = 32 - $88 | 0;
   $92 = $91 >> 31;
   $95 = $88 - 32 | 0;
   $105 = $95 >> 31;
   $sr_1_ph = $88;
   $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
   $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
   $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
   $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
   break;
  }
  if ($rem) {
   HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
   HEAP32[$rem + 4 >> 2] = 0;
  }
  if (($d_sroa_0_0_extract_trunc | 0) == 1) {
   $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
   $_0$0 = $a$0 | 0 | 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  } else {
   $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
   $_0$1 = $n_sroa_1_4_extract_trunc >>> ($78 >>> 0) | 0;
   $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
 } while (0);
 if (!$sr_1_ph) {
  $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
  $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
  $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
  $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
  $carry_0_lcssa$1 = 0;
  $carry_0_lcssa$0 = 0;
 } else {
  $d_sroa_0_0_insert_insert99$0 = $b$0 | 0 | 0;
  $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
  $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
  $137$1 = tempRet0;
  $q_sroa_1_1198 = $q_sroa_1_1_ph;
  $q_sroa_0_1199 = $q_sroa_0_1_ph;
  $r_sroa_1_1200 = $r_sroa_1_1_ph;
  $r_sroa_0_1201 = $r_sroa_0_1_ph;
  $sr_1202 = $sr_1_ph;
  $carry_0203 = 0;
  do {
   $q_sroa_1_1198$looptemp = $q_sroa_1_1198;
   $q_sroa_1_1198 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
   $q_sroa_0_1199 = $carry_0203 | $q_sroa_0_1199 << 1;
   $r_sroa_0_0_insert_insert42$0 = $r_sroa_0_1201 << 1 | $q_sroa_1_1198$looptemp >>> 31 | 0;
   $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
   _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
   $150$1 = tempRet0;
   $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
   $carry_0203 = $151$0 & 1;
   $r_sroa_0_1201 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
   $r_sroa_1_1200 = tempRet0;
   $sr_1202 = $sr_1202 - 1 | 0;
  } while (($sr_1202 | 0) != 0);
  $q_sroa_1_1_lcssa = $q_sroa_1_1198;
  $q_sroa_0_1_lcssa = $q_sroa_0_1199;
  $r_sroa_1_1_lcssa = $r_sroa_1_1200;
  $r_sroa_0_1_lcssa = $r_sroa_0_1201;
  $carry_0_lcssa$1 = 0;
  $carry_0_lcssa$0 = $carry_0203;
 }
 $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
 $q_sroa_0_0_insert_ext75$1 = 0;
 if ($rem) {
  HEAP32[$rem >> 2] = $r_sroa_0_1_lcssa;
  HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa;
 }
 $_0$1 = ($q_sroa_0_0_insert_ext75$0 | 0) >>> 31 | ($q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1) << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
 $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
 return (tempRet0 = $_0$1, $_0$0) | 0;
}

function _board_get_frame($self) {
 $self = $self | 0;
 var $$lcssa4 = 0, $$lcssa49 = 0, $$phi$trans$insert = 0, $$pre = 0, $$pre$phi36Z2D = 0, $$pre33 = 0, $0 = 0, $19 = 0, $21 = 0, $23 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $34 = 0, $35 = 0, $39 = 0, $4 = 0, $41 = 0, $46 = 0, $52 = 0, $58 = 0.0, $59 = 0, $64 = 0, $69 = 0, $71 = 0, $73 = 0, $74 = 0, $75 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $cell$09 = 0, $col$015 = 0, $fps_str = 0, $i$026 = 0, $i1$06 = 0, $ret_pos$025 = 0, $ret_pos$3$lcssa = 0, $ret_pos$3$ph = 0, $ret_pos$319 = 0, $ret_pos$4$lcssa = 0, $ret_pos$414 = 0, $ret_pos$5$lcssa = 0, $ret_pos$58 = 0, $ret_pos$65 = 0, $row$020 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $vararg_buffer = sp;
 $fps_str = sp + 4 | 0;
 $0 = $self + 8 | 0;
 $$phi$trans$insert = $self + 4 | 0;
 $$pre = HEAP32[$$phi$trans$insert >> 2] | 0;
 if (!(HEAP8[$0 >> 0] | 0)) {
  $23 = $$pre;
  $ret_pos$3$ph = 0;
  label = 5;
 } else if (($$pre | 0) > -1) {
  $4 = $self + 36 | 0;
  $i$026 = 0;
  $ret_pos$025 = 0;
  while (1) {
   HEAP8[(HEAP32[$4 >> 2] | 0) + $ret_pos$025 >> 0] = 13;
   HEAP8[(HEAP32[$4 >> 2] | 0) + ($ret_pos$025 + 1) >> 0] = 27;
   HEAP8[(HEAP32[$4 >> 2] | 0) + ($ret_pos$025 + 2) >> 0] = 91;
   HEAP8[(HEAP32[$4 >> 2] | 0) + ($ret_pos$025 + 3) >> 0] = 49;
   HEAP8[(HEAP32[$4 >> 2] | 0) + ($ret_pos$025 + 4) >> 0] = 70;
   $19 = $ret_pos$025 + 5 | 0;
   $21 = HEAP32[$$phi$trans$insert >> 2] | 0;
   if (($i$026 | 0) < ($21 | 0)) {
    $i$026 = $i$026 + 1 | 0;
    $ret_pos$025 = $19;
   } else {
    $23 = $21;
    $ret_pos$3$ph = $19;
    label = 5;
    break;
   }
  }
 } else $ret_pos$3$lcssa = 0;
 if ((label | 0) == 5) if (($23 | 0) > 0) {
  $25 = $self + 36 | 0;
  $26 = $self + 12 | 0;
  $27 = $self + 32 | 0;
  $ret_pos$319 = $ret_pos$3$ph;
  $row$020 = 0;
  while (1) {
   $28 = HEAP32[$self >> 2] | 0;
   if (($28 | 0) > 0) {
    $87 = $28;
    $col$015 = 0;
    $ret_pos$414 = $ret_pos$319;
    while (1) {
     $34 = HEAP32[(HEAP32[(HEAP32[$27 >> 2] | 0) + ($row$020 << 2) >> 2] | 0) + ($col$015 << 2) >> 2] | 0;
     $35 = HEAP8[$34 >> 0] | 0;
     if (!($35 << 24 >> 24)) {
      $46 = $87;
      $ret_pos$5$lcssa = $ret_pos$414;
     } else {
      $39 = $35;
      $cell$09 = $34;
      $ret_pos$58 = $ret_pos$414;
      while (1) {
       HEAP8[(HEAP32[$25 >> 2] | 0) + $ret_pos$58 >> 0] = $39;
       $cell$09 = $cell$09 + 1 | 0;
       $41 = $ret_pos$58 + 1 | 0;
       $39 = HEAP8[$cell$09 >> 0] | 0;
       if (!($39 << 24 >> 24)) {
        $$lcssa49 = $41;
        break;
       } else $ret_pos$58 = $41;
      }
      $46 = HEAP32[$self >> 2] | 0;
      $ret_pos$5$lcssa = $$lcssa49;
     }
     $col$015 = $col$015 + 1 | 0;
     if (($col$015 | 0) >= ($46 | 0)) {
      $ret_pos$4$lcssa = $ret_pos$5$lcssa;
      break;
     } else {
      $87 = $46;
      $ret_pos$414 = $ret_pos$5$lcssa;
     }
    }
   } else $ret_pos$4$lcssa = $ret_pos$319;
   HEAP8[(HEAP32[$25 >> 2] | 0) + $ret_pos$4$lcssa >> 0] = 13;
   HEAP8[(HEAP32[$25 >> 2] | 0) + ($ret_pos$4$lcssa + 1) >> 0] = 10;
   $52 = $ret_pos$4$lcssa + 2 | 0;
   HEAP32[$26 >> 2] = (HEAP32[$26 >> 2] | 0) + 1;
   $row$020 = $row$020 + 1 | 0;
   if (($row$020 | 0) >= (HEAP32[$$phi$trans$insert >> 2] | 0)) {
    $ret_pos$3$lcssa = $52;
    break;
   } else $ret_pos$319 = $52;
  }
 } else $ret_pos$3$lcssa = $ret_pos$3$ph;
 $58 = +_get_time();
 $59 = $self + 24 | 0;
 $$pre33 = $self + 16 | 0;
 if (!($58 - +HEAPF64[$59 >> 3] >= 1.0)) $$pre$phi36Z2D = $self + 20 | 0; else {
  $64 = $self + 20 | 0;
  HEAP32[$64 >> 2] = HEAP32[$$pre33 >> 2];
  HEAP32[$$pre33 >> 2] = 0;
  HEAPF64[$59 >> 3] = +_get_time();
  $$pre$phi36Z2D = $64;
 }
 HEAP32[$$pre33 >> 2] = (HEAP32[$$pre33 >> 2] | 0) + 1;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$$pre$phi36Z2D >> 2];
 _sprintf($fps_str, 1100, $vararg_buffer) | 0;
 $69 = HEAP8[$fps_str >> 0] | 0;
 $71 = $self + 36 | 0;
 $73 = (HEAP32[$71 >> 2] | 0) + $ret_pos$3$lcssa | 0;
 if (!($69 << 24 >> 24)) {
  $$lcssa4 = $73;
  HEAP8[$$lcssa4 >> 0] = 0;
  $83 = $self + 12 | 0;
  $84 = HEAP32[$83 >> 2] | 0;
  $85 = $84 + 1 | 0;
  HEAP32[$83 >> 2] = $85;
  HEAP8[$0 >> 0] = 1;
  $86 = HEAP32[$71 >> 2] | 0;
  STACKTOP = sp;
  return $86 | 0;
 } else {
  $74 = $69;
  $75 = $73;
  $i1$06 = 0;
  $ret_pos$65 = $ret_pos$3$lcssa;
 }
 while (1) {
  HEAP8[$75 >> 0] = $74;
  $ret_pos$65 = $ret_pos$65 + 1 | 0;
  $i1$06 = $i1$06 + 1 | 0;
  $74 = HEAP8[$fps_str + $i1$06 >> 0] | 0;
  $82 = (HEAP32[$71 >> 2] | 0) + $ret_pos$65 | 0;
  if (!($74 << 24 >> 24)) {
   $$lcssa4 = $82;
   break;
  } else $75 = $82;
 }
 HEAP8[$$lcssa4 >> 0] = 0;
 $83 = $self + 12 | 0;
 $84 = HEAP32[$83 >> 2] | 0;
 $85 = $84 + 1 | 0;
 HEAP32[$83 >> 2] = $85;
 HEAP8[$0 >> 0] = 1;
 $86 = HEAP32[$71 >> 2] | 0;
 STACKTOP = sp;
 return $86 | 0;
}

function ___stdio_write($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $16 = 0, $21 = 0, $26 = 0, $3 = 0, $35 = 0, $37 = 0, $39 = 0, $50 = 0, $6 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0, $iovcnt$0$lcssa12 = 0, $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $iovs = sp + 32 | 0;
 $0 = $f + 28 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 HEAP32[$iovs >> 2] = $1;
 $3 = $f + 20 | 0;
 $6 = (HEAP32[$3 >> 2] | 0) - $1 | 0;
 HEAP32[$iovs + 4 >> 2] = $6;
 HEAP32[$iovs + 8 >> 2] = $buf;
 HEAP32[$iovs + 12 >> 2] = $len;
 $10 = $f + 60 | 0;
 $11 = $f + 44 | 0;
 $iov$0 = $iovs;
 $iovcnt$0 = 2;
 $rem$0 = $6 + $len | 0;
 while (1) {
  if (!(HEAP32[17] | 0)) {
   HEAP32[$vararg_buffer3 >> 2] = HEAP32[$10 >> 2];
   HEAP32[$vararg_buffer3 + 4 >> 2] = $iov$0;
   HEAP32[$vararg_buffer3 + 8 >> 2] = $iovcnt$0;
   $cnt$0 = ___syscall_ret(___syscall146(146, $vararg_buffer3 | 0) | 0) | 0;
  } else {
   _pthread_cleanup_push(1, $f | 0);
   HEAP32[$vararg_buffer >> 2] = HEAP32[$10 >> 2];
   HEAP32[$vararg_buffer + 4 >> 2] = $iov$0;
   HEAP32[$vararg_buffer + 8 >> 2] = $iovcnt$0;
   $16 = ___syscall_ret(___syscall146(146, $vararg_buffer | 0) | 0) | 0;
   _pthread_cleanup_pop(0);
   $cnt$0 = $16;
  }
  if (($rem$0 | 0) == ($cnt$0 | 0)) {
   label = 6;
   break;
  }
  if (($cnt$0 | 0) < 0) {
   $iov$0$lcssa11 = $iov$0;
   $iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $35 = $rem$0 - $cnt$0 | 0;
  $37 = HEAP32[$iov$0 + 4 >> 2] | 0;
  if ($cnt$0 >>> 0 > $37 >>> 0) {
   $39 = HEAP32[$11 >> 2] | 0;
   HEAP32[$0 >> 2] = $39;
   HEAP32[$3 >> 2] = $39;
   $50 = HEAP32[$iov$0 + 12 >> 2] | 0;
   $cnt$1 = $cnt$0 - $37 | 0;
   $iov$1 = $iov$0 + 8 | 0;
   $iovcnt$1 = $iovcnt$0 + -1 | 0;
  } else if (($iovcnt$0 | 0) == 2) {
   HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + $cnt$0;
   $50 = $37;
   $cnt$1 = $cnt$0;
   $iov$1 = $iov$0;
   $iovcnt$1 = 2;
  } else {
   $50 = $37;
   $cnt$1 = $cnt$0;
   $iov$1 = $iov$0;
   $iovcnt$1 = $iovcnt$0;
  }
  HEAP32[$iov$1 >> 2] = (HEAP32[$iov$1 >> 2] | 0) + $cnt$1;
  HEAP32[$iov$1 + 4 >> 2] = $50 - $cnt$1;
  $iov$0 = $iov$1;
  $iovcnt$0 = $iovcnt$1;
  $rem$0 = $35;
 }
 if ((label | 0) == 6) {
  $21 = HEAP32[$11 >> 2] | 0;
  HEAP32[$f + 16 >> 2] = $21 + (HEAP32[$f + 48 >> 2] | 0);
  $26 = $21;
  HEAP32[$0 >> 2] = $26;
  HEAP32[$3 >> 2] = $26;
  $$0 = $len;
 } else if ((label | 0) == 8) {
  HEAP32[$f + 16 >> 2] = 0;
  HEAP32[$0 >> 2] = 0;
  HEAP32[$3 >> 2] = 0;
  HEAP32[$f >> 2] = HEAP32[$f >> 2] | 32;
  if (($iovcnt$0$lcssa12 | 0) == 2) $$0 = 0; else $$0 = $len - (HEAP32[$iov$0$lcssa11 + 4 >> 2] | 0) | 0;
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _pop_arg425($arg, $type, $ap) {
 $arg = $arg | 0;
 $type = $type | 0;
 $ap = $ap | 0;
 var $105 = 0, $106 = 0.0, $112 = 0, $113 = 0.0, $13 = 0, $14 = 0, $17 = 0, $26 = 0, $27 = 0, $28 = 0, $37 = 0, $38 = 0, $40 = 0, $43 = 0, $44 = 0, $53 = 0, $54 = 0, $56 = 0, $59 = 0, $6 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $79 = 0, $80 = 0, $82 = 0, $85 = 0, $94 = 0, $95 = 0, $96 = 0;
 L1 : do if ($type >>> 0 <= 20) do switch ($type | 0) {
 case 9:
  {
   $6 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $7 = HEAP32[$6 >> 2] | 0;
   HEAP32[$ap >> 2] = $6 + 4;
   HEAP32[$arg >> 2] = $7;
   break L1;
   break;
  }
 case 10:
  {
   $13 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $14 = HEAP32[$13 >> 2] | 0;
   HEAP32[$ap >> 2] = $13 + 4;
   $17 = $arg;
   HEAP32[$17 >> 2] = $14;
   HEAP32[$17 + 4 >> 2] = (($14 | 0) < 0) << 31 >> 31;
   break L1;
   break;
  }
 case 11:
  {
   $26 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $27 = HEAP32[$26 >> 2] | 0;
   HEAP32[$ap >> 2] = $26 + 4;
   $28 = $arg;
   HEAP32[$28 >> 2] = $27;
   HEAP32[$28 + 4 >> 2] = 0;
   break L1;
   break;
  }
 case 12:
  {
   $37 = (HEAP32[$ap >> 2] | 0) + (8 - 1) & ~(8 - 1);
   $38 = $37;
   $40 = HEAP32[$38 >> 2] | 0;
   $43 = HEAP32[$38 + 4 >> 2] | 0;
   HEAP32[$ap >> 2] = $37 + 8;
   $44 = $arg;
   HEAP32[$44 >> 2] = $40;
   HEAP32[$44 + 4 >> 2] = $43;
   break L1;
   break;
  }
 case 13:
  {
   $53 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $54 = HEAP32[$53 >> 2] | 0;
   HEAP32[$ap >> 2] = $53 + 4;
   $56 = ($54 & 65535) << 16 >> 16;
   $59 = $arg;
   HEAP32[$59 >> 2] = $56;
   HEAP32[$59 + 4 >> 2] = (($56 | 0) < 0) << 31 >> 31;
   break L1;
   break;
  }
 case 14:
  {
   $68 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $69 = HEAP32[$68 >> 2] | 0;
   HEAP32[$ap >> 2] = $68 + 4;
   $70 = $arg;
   HEAP32[$70 >> 2] = $69 & 65535;
   HEAP32[$70 + 4 >> 2] = 0;
   break L1;
   break;
  }
 case 15:
  {
   $79 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $80 = HEAP32[$79 >> 2] | 0;
   HEAP32[$ap >> 2] = $79 + 4;
   $82 = ($80 & 255) << 24 >> 24;
   $85 = $arg;
   HEAP32[$85 >> 2] = $82;
   HEAP32[$85 + 4 >> 2] = (($82 | 0) < 0) << 31 >> 31;
   break L1;
   break;
  }
 case 16:
  {
   $94 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $95 = HEAP32[$94 >> 2] | 0;
   HEAP32[$ap >> 2] = $94 + 4;
   $96 = $arg;
   HEAP32[$96 >> 2] = $95 & 255;
   HEAP32[$96 + 4 >> 2] = 0;
   break L1;
   break;
  }
 case 17:
  {
   $105 = (HEAP32[$ap >> 2] | 0) + (8 - 1) & ~(8 - 1);
   $106 = +HEAPF64[$105 >> 3];
   HEAP32[$ap >> 2] = $105 + 8;
   HEAPF64[$arg >> 3] = $106;
   break L1;
   break;
  }
 case 18:
  {
   $112 = (HEAP32[$ap >> 2] | 0) + (8 - 1) & ~(8 - 1);
   $113 = +HEAPF64[$112 >> 3];
   HEAP32[$ap >> 2] = $112 + 8;
   HEAPF64[$arg >> 3] = $113;
   break L1;
   break;
  }
 default:
  break L1;
 } while (0); while (0);
 return;
}

function _memchr($src, $c, $n) {
 $src = $src | 0;
 $c = $c | 0;
 $n = $n | 0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $13 = 0, $15 = 0, $17 = 0, $20 = 0, $26 = 0, $27 = 0, $32 = 0, $4 = 0, $5 = 0, $8 = 0, $9 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0;
 $0 = $c & 255;
 $4 = ($n | 0) != 0;
 L1 : do if ($4 & ($src & 3 | 0) != 0) {
  $5 = $c & 255;
  $$019 = $n;
  $s$020 = $src;
  while (1) {
   if ((HEAP8[$s$020 >> 0] | 0) == $5 << 24 >> 24) {
    $$0$lcssa44 = $$019;
    $s$0$lcssa43 = $s$020;
    label = 6;
    break L1;
   }
   $8 = $s$020 + 1 | 0;
   $9 = $$019 + -1 | 0;
   $13 = ($9 | 0) != 0;
   if ($13 & ($8 & 3 | 0) != 0) {
    $$019 = $9;
    $s$020 = $8;
   } else {
    $$0$lcssa = $9;
    $$lcssa = $13;
    $s$0$lcssa = $8;
    label = 5;
    break;
   }
  }
 } else {
  $$0$lcssa = $n;
  $$lcssa = $4;
  $s$0$lcssa = $src;
  label = 5;
 } while (0);
 if ((label | 0) == 5) if ($$lcssa) {
  $$0$lcssa44 = $$0$lcssa;
  $s$0$lcssa43 = $s$0$lcssa;
  label = 6;
 } else {
  $$3 = 0;
  $s$2 = $s$0$lcssa;
 }
 L8 : do if ((label | 0) == 6) {
  $15 = $c & 255;
  if ((HEAP8[$s$0$lcssa43 >> 0] | 0) == $15 << 24 >> 24) {
   $$3 = $$0$lcssa44;
   $s$2 = $s$0$lcssa43;
  } else {
   $17 = Math_imul($0, 16843009) | 0;
   L11 : do if ($$0$lcssa44 >>> 0 > 3) {
    $$110 = $$0$lcssa44;
    $w$011 = $s$0$lcssa43;
    while (1) {
     $20 = HEAP32[$w$011 >> 2] ^ $17;
     if (($20 & -2139062144 ^ -2139062144) & $20 + -16843009) {
      $$110$lcssa = $$110;
      $w$011$lcssa = $w$011;
      break;
     }
     $26 = $w$011 + 4 | 0;
     $27 = $$110 + -4 | 0;
     if ($27 >>> 0 > 3) {
      $$110 = $27;
      $w$011 = $26;
     } else {
      $$1$lcssa = $27;
      $w$0$lcssa = $26;
      label = 11;
      break L11;
     }
    }
    $$24 = $$110$lcssa;
    $s$15 = $w$011$lcssa;
   } else {
    $$1$lcssa = $$0$lcssa44;
    $w$0$lcssa = $s$0$lcssa43;
    label = 11;
   } while (0);
   if ((label | 0) == 11) if (!$$1$lcssa) {
    $$3 = 0;
    $s$2 = $w$0$lcssa;
    break;
   } else {
    $$24 = $$1$lcssa;
    $s$15 = $w$0$lcssa;
   }
   while (1) {
    if ((HEAP8[$s$15 >> 0] | 0) == $15 << 24 >> 24) {
     $$3 = $$24;
     $s$2 = $s$15;
     break L8;
    }
    $32 = $s$15 + 1 | 0;
    $$24 = $$24 + -1 | 0;
    if (!$$24) {
     $$3 = 0;
     $s$2 = $32;
     break;
    } else $s$15 = $32;
   }
  }
 } while (0);
 return (($$3 | 0) != 0 ? $s$2 : 0) | 0;
}

function _vfprintf($f, $fmt, $ap) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 var $$ = 0, $$0 = 0, $12 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $21 = 0, $22 = 0, $28 = 0, $32 = 0, $6 = 0, $7 = 0, $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0, $ret$1 = 0, dest = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $ap2 = sp + 80 | 0;
 $nl_type = sp + 96 | 0;
 $nl_arg = sp;
 $internal_buf = sp + 136 | 0;
 dest = $nl_type;
 stop = dest + 40 | 0;
 do {
  HEAP32[dest >> 2] = 0;
  dest = dest + 4 | 0;
 } while ((dest | 0) < (stop | 0));
 HEAP32[$ap2 >> 2] = HEAP32[$ap >> 2];
 if ((_printf_core(0, $fmt, $ap2, $nl_arg, $nl_type) | 0) < 0) $$0 = -1; else {
  if ((HEAP32[$f + 76 >> 2] | 0) > -1) $32 = ___lockfile($f) | 0; else $32 = 0;
  $6 = HEAP32[$f >> 2] | 0;
  $7 = $6 & 32;
  if ((HEAP8[$f + 74 >> 0] | 0) < 1) HEAP32[$f >> 2] = $6 & -33;
  $12 = $f + 48 | 0;
  if (!(HEAP32[$12 >> 2] | 0)) {
   $16 = $f + 44 | 0;
   $17 = HEAP32[$16 >> 2] | 0;
   HEAP32[$16 >> 2] = $internal_buf;
   $18 = $f + 28 | 0;
   HEAP32[$18 >> 2] = $internal_buf;
   $19 = $f + 20 | 0;
   HEAP32[$19 >> 2] = $internal_buf;
   HEAP32[$12 >> 2] = 80;
   $21 = $f + 16 | 0;
   HEAP32[$21 >> 2] = $internal_buf + 80;
   $22 = _printf_core($f, $fmt, $ap2, $nl_arg, $nl_type) | 0;
   if (!$17) $ret$1 = $22; else {
    FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, 0, 0) | 0;
    $$ = (HEAP32[$19 >> 2] | 0) == 0 ? -1 : $22;
    HEAP32[$16 >> 2] = $17;
    HEAP32[$12 >> 2] = 0;
    HEAP32[$21 >> 2] = 0;
    HEAP32[$18 >> 2] = 0;
    HEAP32[$19 >> 2] = 0;
    $ret$1 = $$;
   }
  } else $ret$1 = _printf_core($f, $fmt, $ap2, $nl_arg, $nl_type) | 0;
  $28 = HEAP32[$f >> 2] | 0;
  HEAP32[$f >> 2] = $28 | $7;
  if ($32) ___unlockfile($f);
  $$0 = ($28 & 32 | 0) == 0 ? $ret$1 : -1;
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function ___fwritex($s, $l, $f) {
 $s = $s | 0;
 $l = $l | 0;
 $f = $f | 0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $0 = 0, $1 = 0, $19 = 0, $29 = 0, $5 = 0, $6 = 0, $7 = 0, $i$0 = 0, $i$0$lcssa10 = 0, $i$1 = 0, label = 0;
 $0 = $f + 16 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 if (!$1) if (!(___towrite($f) | 0)) {
  $7 = HEAP32[$0 >> 2] | 0;
  label = 4;
 } else $$0 = 0; else {
  $7 = $1;
  label = 4;
 }
 L4 : do if ((label | 0) == 4) {
  $5 = $f + 20 | 0;
  $6 = HEAP32[$5 >> 2] | 0;
  if (($7 - $6 | 0) >>> 0 < $l >>> 0) {
   $$0 = FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, $s, $l) | 0;
   break;
  }
  L9 : do if ((HEAP8[$f + 75 >> 0] | 0) > -1) {
   $i$0 = $l;
   while (1) {
    if (!$i$0) {
     $$01 = $l;
     $$02 = $s;
     $29 = $6;
     $i$1 = 0;
     break L9;
    }
    $19 = $i$0 + -1 | 0;
    if ((HEAP8[$s + $19 >> 0] | 0) == 10) {
     $i$0$lcssa10 = $i$0;
     break;
    } else $i$0 = $19;
   }
   if ((FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, $s, $i$0$lcssa10) | 0) >>> 0 < $i$0$lcssa10 >>> 0) {
    $$0 = $i$0$lcssa10;
    break L4;
   }
   $$01 = $l - $i$0$lcssa10 | 0;
   $$02 = $s + $i$0$lcssa10 | 0;
   $29 = HEAP32[$5 >> 2] | 0;
   $i$1 = $i$0$lcssa10;
  } else {
   $$01 = $l;
   $$02 = $s;
   $29 = $6;
   $i$1 = 0;
  } while (0);
  _memcpy($29 | 0, $$02 | 0, $$01 | 0) | 0;
  HEAP32[$5 >> 2] = (HEAP32[$5 >> 2] | 0) + $$01;
  $$0 = $i$1 + $$01 | 0;
 } while (0);
 return $$0 | 0;
}

function _disp_get_frame($self) {
 $self = $self | 0;
 var $0 = 0, $11 = 0, $14 = 0, $15 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $22 = 0.0, $23 = 0, $3 = 0.0, $31 = 0, $39 = 0, $4 = 0, $40 = 0, $_node$01 = 0, $_node$02 = 0, $i$03 = 0;
 $0 = HEAP32[$self >> 2] | 0;
 $2 = HEAP32[$self + 8 >> 2] | 0;
 $3 = +_get_time();
 $4 = $self + 16 | 0;
 if ($3 - +HEAPF64[$4 >> 3] > +HEAPF64[$0 + 16 >> 3]) {
  HEAPF64[$4 >> 3] = +_get_time();
  $11 = $0 + 8 | 0;
  if ((HEAP32[$11 >> 2] | 0) > 0) {
   $14 = $0 + 24 | 0;
   $15 = $0 + 28 | 0;
   $i$03 = 0;
   do {
    $18 = +(HEAP32[$14 >> 2] | 0);
    $19 = +(HEAP32[$15 >> 2] | 0);
    $20 = +_rand_float_range($18, $19);
    $22 = +_skew_parabola(+_rand_float_range($18, $19), $18, $19);
    $23 = _random_color() | 0;
    if ((HEAP32[$2 >> 2] | 0) < (HEAP32[$0 >> 2] | 0)) _List_push($2, _traj_create($20, $22, $23) | 0);
    $i$03 = $i$03 + 1 | 0;
   } while (($i$03 | 0) < (HEAP32[$11 >> 2] | 0));
  }
 }
 $31 = $self + 4 | 0;
 _board_renew(HEAP32[$31 >> 2] | 0);
 $_node$01 = HEAP32[$2 + 4 >> 2] | 0;
 if (!$_node$01) {
  $39 = HEAP32[$31 >> 2] | 0;
  $40 = _board_get_frame($39) | 0;
  return $40 | 0;
 } else $_node$02 = $_node$01;
 do {
  _traj_draw(HEAP32[$_node$02 + 8 >> 2] | 0, HEAP32[$31 >> 2] | 0);
  $_node$02 = HEAP32[$_node$02 >> 2] | 0;
 } while (($_node$02 | 0) != 0);
 $39 = HEAP32[$31 >> 2] | 0;
 $40 = _board_get_frame($39) | 0;
 return $40 | 0;
}

function _vsnprintf($s, $n, $fmt, $ap) {
 $s = $s | 0;
 $n = $n | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 var $$$02 = 0, $$0 = 0, $$01 = 0, $$02 = 0, $10 = 0, $11 = 0, $13 = 0, $15 = 0, $5 = 0, $8 = 0, $b = 0, $f = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $b = sp + 112 | 0;
 $f = sp;
 dest = $f;
 src = 112;
 stop = dest + 112 | 0;
 do {
  HEAP32[dest >> 2] = HEAP32[src >> 2];
  dest = dest + 4 | 0;
  src = src + 4 | 0;
 } while ((dest | 0) < (stop | 0));
 if (($n + -1 | 0) >>> 0 > 2147483646) if (!$n) {
  $$01 = $b;
  $$02 = 1;
  label = 4;
 } else {
  HEAP32[(___errno_location() | 0) >> 2] = 75;
  $$0 = -1;
 } else {
  $$01 = $s;
  $$02 = $n;
  label = 4;
 }
 if ((label | 0) == 4) {
  $5 = -2 - $$01 | 0;
  $$$02 = $$02 >>> 0 > $5 >>> 0 ? $5 : $$02;
  HEAP32[$f + 48 >> 2] = $$$02;
  $8 = $f + 20 | 0;
  HEAP32[$8 >> 2] = $$01;
  HEAP32[$f + 44 >> 2] = $$01;
  $10 = $$01 + $$$02 | 0;
  $11 = $f + 16 | 0;
  HEAP32[$11 >> 2] = $10;
  HEAP32[$f + 28 >> 2] = $10;
  $13 = _vfprintf($f, $fmt, $ap) | 0;
  if (!$$$02) $$0 = $13; else {
   $15 = HEAP32[$8 >> 2] | 0;
   HEAP8[$15 + ((($15 | 0) == (HEAP32[$11 >> 2] | 0)) << 31 >> 31) >> 0] = 0;
   $$0 = $13;
  }
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _board_create($width, $height) {
 $width = $width | 0;
 $height = $height | 0;
 var $0 = 0, $11 = 0, $13 = 0, $15 = 0, $7 = 0, $8 = 0, $col$02$us = 0, $row$03 = 0, $row$03$us = 0;
 $0 = _calloc(1, 40) | 0;
 HEAP32[$0 >> 2] = $width;
 HEAP32[$0 + 4 >> 2] = $height;
 HEAP8[$0 + 8 >> 0] = 0;
 HEAP32[$0 + 16 >> 2] = 0;
 HEAP32[$0 + 20 >> 2] = 0;
 HEAPF64[$0 + 24 >> 3] = +_get_time();
 $7 = _calloc($height, 4) | 0;
 $8 = $0 + 32 | 0;
 HEAP32[$8 >> 2] = $7;
 L1 : do if (($height | 0) > 0) {
  if (($width | 0) <= 0) {
   $row$03 = 0;
   while (1) {
    HEAP32[$7 + ($row$03 << 2) >> 2] = _calloc($width, 4) | 0;
    $row$03 = $row$03 + 1 | 0;
    if (($row$03 | 0) == ($height | 0)) break L1;
   }
  }
  $11 = HEAP32[$8 >> 2] | 0;
  $row$03$us = 0;
  do {
   HEAP32[$7 + ($row$03$us << 2) >> 2] = _calloc($width, 4) | 0;
   $15 = $11 + ($row$03$us << 2) | 0;
   $col$02$us = 0;
   do {
    $13 = _calloc(64, 4) | 0;
    HEAP32[(HEAP32[$15 >> 2] | 0) + ($col$02$us << 2) >> 2] = $13;
    $col$02$us = $col$02$us + 1 | 0;
   } while (($col$02$us | 0) != ($width | 0));
   $row$03$us = $row$03$us + 1 | 0;
  } while (($row$03$us | 0) != ($height | 0));
 } while (0);
 HEAP32[$0 + 36 >> 2] = _calloc((Math_imul($width << 6 | 7, $height) | 0) + 22 | 0, 1) | 0;
 return $0 | 0;
}

function _fmt_u($0, $1, $s) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $s = $s | 0;
 var $$0$lcssa = 0, $$01$lcssa$off0 = 0, $$05 = 0, $$1$lcssa = 0, $$12 = 0, $$lcssa20 = 0, $13 = 0, $14 = 0, $25 = 0, $28 = 0, $7 = 0, $8 = 0, $9 = 0, $y$03 = 0;
 if ($1 >>> 0 > 0 | ($1 | 0) == 0 & $0 >>> 0 > 4294967295) {
  $$05 = $s;
  $7 = $0;
  $8 = $1;
  while (1) {
   $9 = ___uremdi3($7 | 0, $8 | 0, 10, 0) | 0;
   $13 = $$05 + -1 | 0;
   HEAP8[$13 >> 0] = $9 | 48;
   $14 = ___udivdi3($7 | 0, $8 | 0, 10, 0) | 0;
   if ($8 >>> 0 > 9 | ($8 | 0) == 9 & $7 >>> 0 > 4294967295) {
    $$05 = $13;
    $7 = $14;
    $8 = tempRet0;
   } else {
    $$lcssa20 = $13;
    $28 = $14;
    break;
   }
  }
  $$0$lcssa = $$lcssa20;
  $$01$lcssa$off0 = $28;
 } else {
  $$0$lcssa = $s;
  $$01$lcssa$off0 = $0;
 }
 if (!$$01$lcssa$off0) $$1$lcssa = $$0$lcssa; else {
  $$12 = $$0$lcssa;
  $y$03 = $$01$lcssa$off0;
  while (1) {
   $25 = $$12 + -1 | 0;
   HEAP8[$25 >> 0] = ($y$03 >>> 0) % 10 | 0 | 48;
   if ($y$03 >>> 0 < 10) {
    $$1$lcssa = $25;
    break;
   } else {
    $$12 = $25;
    $y$03 = ($y$03 >>> 0) / 10 | 0;
   }
  }
 }
 return $$1$lcssa | 0;
}

function _fflush($f) {
 $f = $f | 0;
 var $$0 = 0, $$012 = 0, $$014 = 0, $23 = 0, $27 = 0, $6 = 0, $phitmp = 0, $r$0$lcssa = 0, $r$03 = 0, $r$1 = 0;
 do if (!$f) {
  if (!(HEAP32[15] | 0)) $27 = 0; else $27 = _fflush(HEAP32[15] | 0) | 0;
  ___lock(96);
  $$012 = HEAP32[23] | 0;
  if (!$$012) $r$0$lcssa = $27; else {
   $$014 = $$012;
   $r$03 = $27;
   while (1) {
    if ((HEAP32[$$014 + 76 >> 2] | 0) > -1) $23 = ___lockfile($$014) | 0; else $23 = 0;
    if ((HEAP32[$$014 + 20 >> 2] | 0) >>> 0 > (HEAP32[$$014 + 28 >> 2] | 0) >>> 0) $r$1 = ___fflush_unlocked($$014) | 0 | $r$03; else $r$1 = $r$03;
    if ($23) ___unlockfile($$014);
    $$014 = HEAP32[$$014 + 56 >> 2] | 0;
    if (!$$014) {
     $r$0$lcssa = $r$1;
     break;
    } else $r$03 = $r$1;
   }
  }
  ___unlock(96);
  $$0 = $r$0$lcssa;
 } else {
  if ((HEAP32[$f + 76 >> 2] | 0) <= -1) {
   $$0 = ___fflush_unlocked($f) | 0;
   break;
  }
  $phitmp = (___lockfile($f) | 0) == 0;
  $6 = ___fflush_unlocked($f) | 0;
  if ($phitmp) $$0 = $6; else {
   ___unlockfile($f);
   $$0 = $6;
  }
 } while (0);
 return $$0 | 0;
}

function _board_set_cell($self, $x, $y, $val) {
 $self = $self | 0;
 $x = $x | 0;
 $y = $y | 0;
 $val = $val | 0;
 var $$0 = 0, $$1 = 0, $$lcssa = 0, $1 = 0, $13 = 0, $14 = 0, $16 = 0, $17 = 0, $24 = 0, $3 = 0, $5 = 0, $val_count$03 = 0;
 $1 = HEAP32[$self + 4 >> 2] | 0;
 $3 = $1 + ~$y | 0;
 if (($3 | 0) < 0) {
  $$0 = $3;
  while (1) {
   $5 = $1 + $$0 | 0;
   if (($5 | 0) < 0) $$0 = $5; else {
    $$1 = $5;
    break;
   }
  }
 } else $$1 = $3;
 $13 = HEAP32[(HEAP32[(HEAP32[$self + 32 >> 2] | 0) + ($$1 << 2) >> 2] | 0) + ((($x | 0) % (HEAP32[$self >> 2] | 0) | 0) << 2) >> 2] | 0;
 $14 = HEAP8[$val >> 0] | 0;
 if (!($14 << 24 >> 24)) {
  $$lcssa = $13;
  HEAP8[$$lcssa >> 0] = 0;
  return;
 } else {
  $16 = $14;
  $17 = $13;
  $val_count$03 = 0;
 }
 while (1) {
  HEAP8[$17 >> 0] = $16;
  $val_count$03 = $val_count$03 + 1 | 0;
  $16 = HEAP8[$val + $val_count$03 >> 0] | 0;
  $24 = $13 + $val_count$03 | 0;
  if (!(($val_count$03 | 0) < 64 & $16 << 24 >> 24 != 0)) {
   $$lcssa = $24;
   break;
  } else $17 = $24;
 }
 HEAP8[$$lcssa >> 0] = 0;
 return;
}

function _strlen($s) {
 $s = $s | 0;
 var $$01$lcssa = 0, $$014 = 0, $$1$lcssa = 0, $$lcssa20 = 0, $$pn = 0, $$pn15 = 0, $0 = 0, $18 = 0, $21 = 0, $5 = 0, $9 = 0, $w$0 = 0, $w$0$lcssa = 0, label = 0;
 $0 = $s;
 L1 : do if (!($0 & 3)) {
  $$01$lcssa = $s;
  label = 4;
 } else {
  $$014 = $s;
  $21 = $0;
  while (1) {
   if (!(HEAP8[$$014 >> 0] | 0)) {
    $$pn = $21;
    break L1;
   }
   $5 = $$014 + 1 | 0;
   $21 = $5;
   if (!($21 & 3)) {
    $$01$lcssa = $5;
    label = 4;
    break;
   } else $$014 = $5;
  }
 } while (0);
 if ((label | 0) == 4) {
  $w$0 = $$01$lcssa;
  while (1) {
   $9 = HEAP32[$w$0 >> 2] | 0;
   if (!(($9 & -2139062144 ^ -2139062144) & $9 + -16843009)) $w$0 = $w$0 + 4 | 0; else {
    $$lcssa20 = $9;
    $w$0$lcssa = $w$0;
    break;
   }
  }
  if (!(($$lcssa20 & 255) << 24 >> 24)) $$1$lcssa = $w$0$lcssa; else {
   $$pn15 = $w$0$lcssa;
   while (1) {
    $18 = $$pn15 + 1 | 0;
    if (!(HEAP8[$18 >> 0] | 0)) {
     $$1$lcssa = $18;
     break;
    } else $$pn15 = $18;
   }
  }
  $$pn = $$1$lcssa;
 }
 return $$pn - $0 | 0;
}

function _pad($f, $c, $w, $l, $fl) {
 $f = $f | 0;
 $c = $c | 0;
 $w = $w | 0;
 $l = $l | 0;
 $fl = $fl | 0;
 var $$0$lcssa6 = 0, $$02 = 0, $10 = 0, $14 = 0, $17 = 0, $18 = 0, $3 = 0, $7 = 0, $9 = 0, $pad = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $pad = sp;
 do if (($w | 0) > ($l | 0) & ($fl & 73728 | 0) == 0) {
  $3 = $w - $l | 0;
  _memset($pad | 0, $c | 0, ($3 >>> 0 > 256 ? 256 : $3) | 0) | 0;
  $7 = HEAP32[$f >> 2] | 0;
  $9 = ($7 & 32 | 0) == 0;
  if ($3 >>> 0 > 255) {
   $10 = $w - $l | 0;
   $$02 = $3;
   $17 = $7;
   $18 = $9;
   while (1) {
    if ($18) {
     ___fwritex($pad, 256, $f) | 0;
     $14 = HEAP32[$f >> 2] | 0;
    } else $14 = $17;
    $$02 = $$02 + -256 | 0;
    $18 = ($14 & 32 | 0) == 0;
    if ($$02 >>> 0 <= 255) break; else $17 = $14;
   }
   if ($18) $$0$lcssa6 = $10 & 255; else break;
  } else if ($9) $$0$lcssa6 = $3; else break;
  ___fwritex($pad, $$0$lcssa6, $f) | 0;
 } while (0);
 STACKTOP = sp;
 return;
}

function _List_push($list, $value) {
 $list = $list | 0;
 $value = $value | 0;
 var $0 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $7 = 0, $9 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $vararg_buffer = sp;
 $0 = _calloc(1, 12) | 0;
 if (!$0) {
  $2 = HEAP32[16] | 0;
  $3 = ___errno_location() | 0;
  $4 = HEAP32[$3 >> 2] | 0;
  if (!$4) $7 = 1324; else $7 = _strerror($4) | 0;
  HEAP32[$vararg_buffer >> 2] = 1372;
  HEAP32[$vararg_buffer + 4 >> 2] = 47;
  HEAP32[$vararg_buffer + 8 >> 2] = $7;
  _fprintf($2, 1329, $vararg_buffer) | 0;
  HEAP32[$3 >> 2] = 0;
  STACKTOP = sp;
  return;
 }
 HEAP32[$0 + 8 >> 2] = $value;
 $9 = $list + 8 | 0;
 $10 = HEAP32[$9 >> 2] | 0;
 if (!$10) {
  HEAP32[$list + 4 >> 2] = $0;
  HEAP32[$9 >> 2] = $0;
 } else {
  HEAP32[$10 >> 2] = $0;
  HEAP32[$0 + 4 >> 2] = $10;
  HEAP32[$9 >> 2] = $0;
 }
 HEAP32[$list >> 2] = (HEAP32[$list >> 2] | 0) + 1;
 STACKTOP = sp;
 return;
}

function ___remdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
 __stackBase__ = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $rem = __stackBase__ | 0;
 $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
 $4$1 = tempRet0;
 ___udivmoddi4($4$0, $4$1, _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0, tempRet0, $rem) | 0;
 $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
 $10$1 = tempRet0;
 STACKTOP = __stackBase__;
 return (tempRet0 = $10$1, $10$0) | 0;
}

function _wcrtomb($s, $wc, $st) {
 $s = $s | 0;
 $wc = $wc | 0;
 $st = $st | 0;
 var $$0 = 0;
 do if (!$s) $$0 = 1; else {
  if ($wc >>> 0 < 128) {
   HEAP8[$s >> 0] = $wc;
   $$0 = 1;
   break;
  }
  if ($wc >>> 0 < 2048) {
   HEAP8[$s >> 0] = $wc >>> 6 | 192;
   HEAP8[$s + 1 >> 0] = $wc & 63 | 128;
   $$0 = 2;
   break;
  }
  if ($wc >>> 0 < 55296 | ($wc & -8192 | 0) == 57344) {
   HEAP8[$s >> 0] = $wc >>> 12 | 224;
   HEAP8[$s + 1 >> 0] = $wc >>> 6 & 63 | 128;
   HEAP8[$s + 2 >> 0] = $wc & 63 | 128;
   $$0 = 3;
   break;
  }
  if (($wc + -65536 | 0) >>> 0 < 1048576) {
   HEAP8[$s >> 0] = $wc >>> 18 | 240;
   HEAP8[$s + 1 >> 0] = $wc >>> 12 & 63 | 128;
   HEAP8[$s + 2 >> 0] = $wc >>> 6 & 63 | 128;
   HEAP8[$s + 3 >> 0] = $wc & 63 | 128;
   $$0 = 4;
   break;
  } else {
   HEAP32[(___errno_location() | 0) >> 2] = 84;
   $$0 = -1;
   break;
  }
 } while (0);
 return $$0 | 0;
}

function _board_renew($self) {
 $self = $self | 0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $13 = 0, $17 = 0, $18 = 0, $19 = 0, $3 = 0, $4 = 0, $col$01 = 0, $row$02 = 0;
 $0 = $self + 4 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 if (($1 | 0) <= 0) return;
 $3 = $self + 32 | 0;
 $18 = $1;
 $4 = HEAP32[$self >> 2] | 0;
 $row$02 = 0;
 while (1) {
  if (($4 | 0) > 0) {
   $col$01 = 0;
   do {
    $10 = HEAP32[(HEAP32[(HEAP32[$3 >> 2] | 0) + ($row$02 << 2) >> 2] | 0) + ($col$01 << 2) >> 2] | 0;
    HEAP8[$10 >> 0] = 32;
    HEAP8[$10 + 1 >> 0] = 0;
    $col$01 = $col$01 + 1 | 0;
    $13 = HEAP32[$self >> 2] | 0;
   } while (($col$01 | 0) < ($13 | 0));
   $$lcssa = $13;
   $17 = HEAP32[$0 >> 2] | 0;
   $19 = $$lcssa;
  } else {
   $17 = $18;
   $19 = $4;
  }
  $row$02 = $row$02 + 1 | 0;
  if (($row$02 | 0) >= ($17 | 0)) break; else {
   $18 = $17;
   $4 = $19;
  }
 }
 return;
}

function _strerror($e) {
 $e = $e | 0;
 var $$lcssa = 0, $9 = 0, $i$03 = 0, $i$03$lcssa = 0, $i$12 = 0, $s$0$lcssa = 0, $s$01 = 0, $s$1 = 0, label = 0;
 $i$03 = 0;
 while (1) {
  if ((HEAPU8[1390 + $i$03 >> 0] | 0) == ($e | 0)) {
   $i$03$lcssa = $i$03;
   label = 2;
   break;
  }
  $i$03 = $i$03 + 1 | 0;
  if (($i$03 | 0) == 87) {
   $i$12 = 87;
   $s$01 = 1478;
   label = 5;
   break;
  }
 }
 if ((label | 0) == 2) if (!$i$03$lcssa) $s$0$lcssa = 1478; else {
  $i$12 = $i$03$lcssa;
  $s$01 = 1478;
  label = 5;
 }
 if ((label | 0) == 5) while (1) {
  label = 0;
  $s$1 = $s$01;
  while (1) {
   $9 = $s$1 + 1 | 0;
   if (!(HEAP8[$s$1 >> 0] | 0)) {
    $$lcssa = $9;
    break;
   } else $s$1 = $9;
  }
  $i$12 = $i$12 + -1 | 0;
  if (!$i$12) {
   $s$0$lcssa = $$lcssa;
   break;
  } else {
   $s$01 = $$lcssa;
   label = 5;
  }
 }
 return $s$0$lcssa | 0;
}

function _frexp($x, $e) {
 $x = +$x;
 $e = $e | 0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $2 = 0, $4 = 0, $7 = 0.0, $storemerge = 0;
 HEAPF64[tempDoublePtr >> 3] = $x;
 $0 = HEAP32[tempDoublePtr >> 2] | 0;
 $1 = HEAP32[tempDoublePtr + 4 >> 2] | 0;
 $2 = _bitshift64Lshr($0 | 0, $1 | 0, 52) | 0;
 $4 = $2 & 2047;
 switch ($4 | 0) {
 case 0:
  {
   if ($x != 0.0) {
    $7 = +_frexp($x * 18446744073709551616.0, $e);
    $$01 = $7;
    $storemerge = (HEAP32[$e >> 2] | 0) + -64 | 0;
   } else {
    $$01 = $x;
    $storemerge = 0;
   }
   HEAP32[$e >> 2] = $storemerge;
   $$0 = $$01;
   break;
  }
 case 2047:
  {
   $$0 = $x;
   break;
  }
 default:
  {
   HEAP32[$e >> 2] = $4 + -1022;
   HEAP32[tempDoublePtr >> 2] = $0;
   HEAP32[tempDoublePtr + 4 >> 2] = $1 & -2146435073 | 1071644672;
   $$0 = +HEAPF64[tempDoublePtr >> 3];
  }
 }
 return +$$0;
}

function _disp_create_trajectories($self) {
 $self = $self | 0;
 var $1 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $2 = 0, $7 = 0, $i$01 = 0;
 $1 = $self + 8 | 0;
 HEAP32[$1 >> 2] = _List_create() | 0;
 $2 = HEAP32[$self >> 2] | 0;
 if ((HEAP32[$2 + 4 >> 2] | 0) > 0) {
  $7 = $2;
  $i$01 = 0;
 } else return $self | 0;
 do {
  $11 = +(HEAP32[$7 + 24 >> 2] | 0);
  $12 = +(HEAP32[$7 + 28 >> 2] | 0);
  $13 = +_rand_float_range($11, $12);
  $15 = +_skew_parabola(+_rand_float_range($11, $12), $11, $12);
  $16 = _random_color() | 0;
  $17 = HEAP32[$1 >> 2] | 0;
  _List_push($17, _traj_create($13, $15, $16) | 0);
  $i$01 = $i$01 + 1 | 0;
  $7 = HEAP32[$self >> 2] | 0;
 } while (($i$01 | 0) < (HEAP32[$7 + 4 >> 2] | 0));
 return $self | 0;
}

function _random() {
 var $12 = 0, $15 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $23 = 0, $6 = 0, $8 = 0, $k$0 = 0;
 ___lock(228);
 if (!(HEAP32[59] | 0)) {
  $2 = HEAP32[62] | 0;
  $6 = (Math_imul(HEAP32[$2 >> 2] | 0, 1103515245) | 0) + 12345 & 2147483647;
  HEAP32[$2 >> 2] = $6;
  $k$0 = $6;
 } else {
  $8 = HEAP32[62] | 0;
  $12 = $8 + (HEAP32[60] << 2) | 0;
  HEAP32[$12 >> 2] = (HEAP32[$12 >> 2] | 0) + (HEAP32[$8 + (HEAP32[61] << 2) >> 2] | 0);
  $15 = HEAP32[60] | 0;
  $18 = (HEAP32[$8 + ($15 << 2) >> 2] | 0) >>> 1;
  $19 = $15 + 1 | 0;
  $20 = HEAP32[59] | 0;
  HEAP32[60] = ($19 | 0) == ($20 | 0) ? 0 : $19;
  $23 = (HEAP32[61] | 0) + 1 | 0;
  HEAP32[61] = ($23 | 0) == ($20 | 0) ? 0 : $23;
  $k$0 = $18;
 }
 ___unlock(228);
 return $k$0 | 0;
}

function ___divdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $7$0 = 0, $7$1 = 0;
 $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
 $4$1 = tempRet0;
 $7$0 = $2$0 ^ $1$0;
 $7$1 = $2$1 ^ $1$1;
 return _i64Subtract((___udivmoddi4($4$0, $4$1, _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0, tempRet0, 0) | 0) ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
}

function ___fflush_unlocked($f) {
 $f = $f | 0;
 var $$0 = 0, $0 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $9 = 0, label = 0;
 $0 = $f + 20 | 0;
 $2 = $f + 28 | 0;
 if ((HEAP32[$0 >> 2] | 0) >>> 0 > (HEAP32[$2 >> 2] | 0) >>> 0) {
  FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, 0, 0) | 0;
  if (!(HEAP32[$0 >> 2] | 0)) $$0 = -1; else label = 3;
 } else label = 3;
 if ((label | 0) == 3) {
  $9 = $f + 4 | 0;
  $10 = HEAP32[$9 >> 2] | 0;
  $11 = $f + 8 | 0;
  $12 = HEAP32[$11 >> 2] | 0;
  if ($10 >>> 0 < $12 >>> 0) FUNCTION_TABLE_iiii[HEAP32[$f + 40 >> 2] & 7]($f, $10 - $12 | 0, 1) | 0;
  HEAP32[$f + 16 >> 2] = 0;
  HEAP32[$2 >> 2] = 0;
  HEAP32[$0 >> 2] = 0;
  HEAP32[$11 >> 2] = 0;
  HEAP32[$9 >> 2] = 0;
  $$0 = 0;
 }
 return $$0 | 0;
}

function _memcpy(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 if ((num | 0) >= 4096) return _emscripten_memcpy_big(dest | 0, src | 0, num | 0) | 0;
 ret = dest | 0;
 if ((dest & 3) == (src & 3)) {
  while (dest & 3) {
   if (!num) return ret | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
   dest = dest + 1 | 0;
   src = src + 1 | 0;
   num = num - 1 | 0;
  }
  while ((num | 0) >= 4) {
   HEAP32[dest >> 2] = HEAP32[src >> 2];
   dest = dest + 4 | 0;
   src = src + 4 | 0;
   num = num - 4 | 0;
  }
 }
 while ((num | 0) > 0) {
  HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  dest = dest + 1 | 0;
  src = src + 1 | 0;
  num = num - 1 | 0;
 }
 return ret | 0;
}

function ___stdio_seek($f, $off, $whence) {
 $f = $f | 0;
 $off = $off | 0;
 $whence = $whence | 0;
 var $5 = 0, $ret = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $vararg_buffer = sp;
 $ret = sp + 20 | 0;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
 HEAP32[$vararg_buffer + 4 >> 2] = 0;
 HEAP32[$vararg_buffer + 8 >> 2] = $off;
 HEAP32[$vararg_buffer + 12 >> 2] = $ret;
 HEAP32[$vararg_buffer + 16 >> 2] = $whence;
 if ((___syscall_ret(___syscall140(140, $vararg_buffer | 0) | 0) | 0) < 0) {
  HEAP32[$ret >> 2] = -1;
  $5 = -1;
 } else $5 = HEAP32[$ret >> 2] | 0;
 STACKTOP = sp;
 return $5 | 0;
}

function _traj_draw($self, $board) {
 $self = $self | 0;
 $board = $board | 0;
 var $0 = 0.0, $1 = 0, $13 = 0.0, $17 = 0, $18 = 0.0, $25 = 0, $4 = 0.0, $y_pos$0$i = 0.0;
 $0 = +_get_time();
 $1 = $self + 8 | 0;
 $4 = ($0 - +HEAPF64[$1 >> 3]) * 2.0;
 $13 = +HEAPF64[$self + 24 >> 3] * $4 + $4 * $4 * (+HEAPF32[$self + 36 >> 2] * .5);
 if (!($13 <= 0.0)) $y_pos$0$i = $13; else {
  HEAPF64[$1 >> 3] = +_get_time();
  $y_pos$0$i = 0.0;
 }
 $17 = ~~+Math_floor(+$y_pos$0$i);
 $18 = +_get_time();
 $25 = ~~+Math_floor(+(+HEAPF64[$self + 16 >> 3] * ($18 - +HEAPF64[$self >> 3])));
 _board_set_cell($board, ($25 | 0) % (HEAP32[$board >> 2] | 0) | 0, $17, HEAP32[$self + 32 >> 2] | 0);
 return;
}

function _memset(ptr, value, num) {
 ptr = ptr | 0;
 value = value | 0;
 num = num | 0;
 var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
 stop = ptr + num | 0;
 if ((num | 0) >= 20) {
  value = value & 255;
  unaligned = ptr & 3;
  value4 = value | value << 8 | value << 16 | value << 24;
  stop4 = stop & ~3;
  if (unaligned) {
   unaligned = ptr + 4 - unaligned | 0;
   while ((ptr | 0) < (unaligned | 0)) {
    HEAP8[ptr >> 0] = value;
    ptr = ptr + 1 | 0;
   }
  }
  while ((ptr | 0) < (stop4 | 0)) {
   HEAP32[ptr >> 2] = value4;
   ptr = ptr + 4 | 0;
  }
 }
 while ((ptr | 0) < (stop | 0)) {
  HEAP8[ptr >> 0] = value;
  ptr = ptr + 1 | 0;
 }
 return ptr - num | 0;
}

function ___stdout_write($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 var $9 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $vararg_buffer = sp;
 HEAP32[$f + 36 >> 2] = 4;
 if (!(HEAP32[$f >> 2] & 64)) {
  HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
  HEAP32[$vararg_buffer + 4 >> 2] = 21505;
  HEAP32[$vararg_buffer + 8 >> 2] = sp + 12;
  if (___syscall54(54, $vararg_buffer | 0) | 0) HEAP8[$f + 75 >> 0] = -1;
 }
 $9 = ___stdio_write($f, $buf, $len) | 0;
 STACKTOP = sp;
 return $9 | 0;
}

function _traj_create($x_vel, $y_vel, $color) {
 $x_vel = +$x_vel;
 $y_vel = +$y_vel;
 $color = $color | 0;
 var $0 = 0, $14 = 0.0, $3 = 0.0, $4 = 0.0;
 $0 = _malloc(40) | 0;
 HEAP32[$0 + 32 >> 2] = ___strdup($color) | 0;
 $3 = +_get_time();
 $4 = +_rand_float();
 HEAPF64[$0 >> 3] = $3 - $4 * +_rand_float();
 HEAPF64[$0 + 8 >> 3] = +_get_time();
 HEAPF64[$0 + 16 >> 3] = $x_vel;
 HEAPF64[$0 + 24 >> 3] = $y_vel;
 $14 = +(((_random() | 0) % 3 | 0) + -1 | 0);
 HEAPF32[$0 + 36 >> 2] = +_rand_float() * $14 + -9.8;
 return $0 | 0;
}

function _calloc($n_elements, $elem_size) {
 $n_elements = $n_elements | 0;
 $elem_size = $elem_size | 0;
 var $1 = 0, $6 = 0, $req$0 = 0;
 if (!$n_elements) $req$0 = 0; else {
  $1 = Math_imul($elem_size, $n_elements) | 0;
  if (($elem_size | $n_elements) >>> 0 > 65535) $req$0 = (($1 >>> 0) / ($n_elements >>> 0) | 0 | 0) == ($elem_size | 0) ? $1 : -1; else $req$0 = $1;
 }
 $6 = _malloc($req$0) | 0;
 if (!$6) return $6 | 0;
 if (!(HEAP32[$6 + -4 >> 2] & 3)) return $6 | 0;
 _memset($6 | 0, 0, $req$0 | 0) | 0;
 return $6 | 0;
}

function ___muldi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0;
 $x_sroa_0_0_extract_trunc = $a$0;
 $y_sroa_0_0_extract_trunc = $b$0;
 $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
 $1$1 = tempRet0;
 return (tempRet0 = (Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0) + (Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $1$1 | $1$1 & 0, $1$0 | 0 | 0) | 0;
}

function ___towrite($f) {
 $f = $f | 0;
 var $$0 = 0, $0 = 0, $13 = 0, $2 = 0, $6 = 0;
 $0 = $f + 74 | 0;
 $2 = HEAP8[$0 >> 0] | 0;
 HEAP8[$0 >> 0] = $2 + 255 | $2;
 $6 = HEAP32[$f >> 2] | 0;
 if (!($6 & 8)) {
  HEAP32[$f + 8 >> 2] = 0;
  HEAP32[$f + 4 >> 2] = 0;
  $13 = HEAP32[$f + 44 >> 2] | 0;
  HEAP32[$f + 28 >> 2] = $13;
  HEAP32[$f + 20 >> 2] = $13;
  HEAP32[$f + 16 >> 2] = $13 + (HEAP32[$f + 48 >> 2] | 0);
  $$0 = 0;
 } else {
  HEAP32[$f >> 2] = $6 | 32;
  $$0 = -1;
 }
 return $$0 | 0;
}

function copyTempDouble(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr >> 0] = HEAP8[ptr >> 0];
 HEAP8[tempDoublePtr + 1 >> 0] = HEAP8[ptr + 1 >> 0];
 HEAP8[tempDoublePtr + 2 >> 0] = HEAP8[ptr + 2 >> 0];
 HEAP8[tempDoublePtr + 3 >> 0] = HEAP8[ptr + 3 >> 0];
 HEAP8[tempDoublePtr + 4 >> 0] = HEAP8[ptr + 4 >> 0];
 HEAP8[tempDoublePtr + 5 >> 0] = HEAP8[ptr + 5 >> 0];
 HEAP8[tempDoublePtr + 6 >> 0] = HEAP8[ptr + 6 >> 0];
 HEAP8[tempDoublePtr + 7 >> 0] = HEAP8[ptr + 7 >> 0];
}

function ___muldsi3($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
 $1 = $a & 65535;
 $2 = $b & 65535;
 $3 = Math_imul($2, $1) | 0;
 $6 = $a >>> 16;
 $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
 $11 = $b >>> 16;
 $12 = Math_imul($11, $1) | 0;
 return (tempRet0 = ($8 >>> 16) + (Math_imul($11, $6) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, $8 + $12 << 16 | $3 & 65535 | 0) | 0;
}

function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $rem = 0, __stackBase__ = 0;
 __stackBase__ = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $rem = __stackBase__ | 0;
 ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
 STACKTOP = __stackBase__;
 return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}

function _llvm_cttz_i32(x) {
 x = x | 0;
 var ret = 0;
 ret = HEAP8[cttz_i8 + (x & 255) >> 0] | 0;
 if ((ret | 0) < 8) return ret | 0;
 ret = HEAP8[cttz_i8 + (x >> 8 & 255) >> 0] | 0;
 if ((ret | 0) < 8) return ret + 8 | 0;
 ret = HEAP8[cttz_i8 + (x >> 16 & 255) >> 0] | 0;
 if ((ret | 0) < 8) return ret + 16 | 0;
 return (HEAP8[cttz_i8 + (x >>> 24) >> 0] | 0) + 24 | 0;
}

function _disp_create($width, $height) {
 $width = $width | 0;
 $height = $height | 0;
 var $0 = 0, $1 = 0;
 $0 = _malloc(24) | 0;
 $1 = _traj_settings_create() | 0;
 HEAP32[$0 >> 2] = $1;
 HEAPF64[$0 + 16 >> 3] = +_get_time();
 HEAP32[$0 + 4 >> 2] = _board_create($width, $height) | 0;
 HEAP32[$1 + 28 >> 2] = _default_vel($height) | 0;
 return $0 | 0;
}

function ___stdio_close($f) {
 $f = $f | 0;
 var $3 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
 $3 = ___syscall_ret(___syscall6(6, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $3 | 0;
}

function _sn_write($f, $s, $l) {
 $f = $f | 0;
 $s = $s | 0;
 $l = $l | 0;
 var $2 = 0, $3 = 0, $6 = 0, $l$ = 0;
 $2 = $f + 20 | 0;
 $3 = HEAP32[$2 >> 2] | 0;
 $6 = (HEAP32[$f + 16 >> 2] | 0) - $3 | 0;
 $l$ = $6 >>> 0 > $l >>> 0 ? $l : $6;
 _memcpy($3 | 0, $s | 0, $l$ | 0) | 0;
 HEAP32[$2 >> 2] = (HEAP32[$2 >> 2] | 0) + $l$;
 return $l | 0;
}

function _sprintf($s, $fmt, $varargs) {
 $s = $s | 0;
 $fmt = $fmt | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $ap = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $ap = sp;
 HEAP32[$ap >> 2] = $varargs;
 $0 = _vsprintf($s, $fmt, $ap) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function _fprintf($f, $fmt, $varargs) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $ap = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $ap = sp;
 HEAP32[$ap >> 2] = $varargs;
 $0 = _vfprintf($f, $fmt, $ap) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function _bitshift64Ashr(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 if ((bits | 0) < 32) {
  tempRet0 = high >> bits;
  return low >>> bits | (high & (1 << bits) - 1) << 32 - bits;
 }
 tempRet0 = (high | 0) < 0 ? -1 : 0;
 return high >> bits - 32 | 0;
}

function _get_time() {
 var $now = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 $now = sp;
 _gettimeofday($now | 0, 0) | 0;
 STACKTOP = sp;
 return +(+(HEAP32[$now >> 2] | 0) + +(HEAP32[$now + 4 >> 2] | 0) / 1.0e6);
}

function _bitshift64Shl(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 if ((bits | 0) < 32) {
  tempRet0 = high << bits | (low & (1 << bits) - 1 << 32 - bits) >>> 32 - bits;
  return low << bits;
 }
 tempRet0 = low << bits - 32;
 return 0;
}

function _bitshift64Lshr(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 if ((bits | 0) < 32) {
  tempRet0 = high >>> bits;
  return low >>> bits | (high & (1 << bits) - 1) << 32 - bits;
 }
 tempRet0 = 0;
 return high >>> bits - 32 | 0;
}

function copyTempFloat(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr >> 0] = HEAP8[ptr >> 0];
 HEAP8[tempDoublePtr + 1 >> 0] = HEAP8[ptr + 1 >> 0];
 HEAP8[tempDoublePtr + 2 >> 0] = HEAP8[ptr + 2 >> 0];
 HEAP8[tempDoublePtr + 3 >> 0] = HEAP8[ptr + 3 >> 0];
}

function _traj_settings_create() {
 var $0 = 0;
 $0 = _malloc(32) | 0;
 HEAP32[$0 >> 2] = 500;
 HEAP32[$0 + 4 >> 2] = 300;
 HEAP32[$0 + 8 >> 2] = 10;
 HEAPF64[$0 + 16 >> 3] = .5;
 HEAP32[$0 + 24 >> 2] = 8;
 HEAP32[$0 + 28 >> 2] = 24;
 return $0 | 0;
}

function runPostSets() {}
function _i64Subtract(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var h = 0;
 h = b - d >>> 0;
 h = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0;
 return (tempRet0 = h, a - c >>> 0 | 0) | 0;
}

function ___strdup($s) {
 $s = $s | 0;
 var $$0 = 0, $1 = 0, $2 = 0;
 $1 = (_strlen($s) | 0) + 1 | 0;
 $2 = _malloc($1) | 0;
 if (!$2) $$0 = 0; else {
  _memcpy($2 | 0, $s | 0, $1 | 0) | 0;
  $$0 = $2;
 }
 return $$0 | 0;
}

function _skew_parabola($num, $low, $high) {
 $num = +$num;
 $low = +$low;
 $high = +$high;
 var $0 = 0.0, $3 = 0.0;
 $0 = $high - $low;
 $3 = ($num - $low) / $0 + -1.0;
 return +($0 * (1.0 - $3 * $3) + $low);
}
function stackAlloc(size) {
 size = size | 0;
 var ret = 0;
 ret = STACKTOP;
 STACKTOP = STACKTOP + size | 0;
 STACKTOP = STACKTOP + 15 & -16;
 if ((STACKTOP | 0) >= (STACK_MAX | 0)) abort();
 return ret | 0;
}

function ___syscall_ret($r) {
 $r = $r | 0;
 var $$0 = 0;
 if ($r >>> 0 > 4294963200) {
  HEAP32[(___errno_location() | 0) >> 2] = 0 - $r;
  $$0 = -1;
 } else $$0 = $r;
 return $$0 | 0;
}

function _i64Add(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var l = 0;
 l = a + c >>> 0;
 return (tempRet0 = b + d + (l >>> 0 < a >>> 0 | 0) >>> 0, l | 0) | 0;
}

function dynCall_iiii(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 return FUNCTION_TABLE_iiii[index & 7](a1 | 0, a2 | 0, a3 | 0) | 0;
}

function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 return ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
}

function ___errno_location() {
 var $$0 = 0;
 if (!(HEAP32[17] | 0)) $$0 = 224; else $$0 = HEAP32[(_pthread_self() | 0) + 60 >> 2] | 0;
 return $$0 | 0;
}

function establishStackSpace(stackBase, stackMax) {
 stackBase = stackBase | 0;
 stackMax = stackMax | 0;
 STACKTOP = stackBase;
 STACK_MAX = stackMax;
}

function _wctomb($s, $wc) {
 $s = $s | 0;
 $wc = $wc | 0;
 var $$0 = 0;
 if (!$s) $$0 = 0; else $$0 = _wcrtomb($s, $wc, 0) | 0;
 return $$0 | 0;
}

function _rand_float_range($min, $max) {
 $min = +$min;
 $max = +$max;
 return +(($max - $min) * (+(_random() | 0) / 2147483647.0) + $min);
}

function setThrew(threw, value) {
 threw = threw | 0;
 value = value | 0;
 if (!__THREW__) {
  __THREW__ = threw;
  threwValue = value;
 }
}

function _vsprintf($s, $fmt, $ap) {
 $s = $s | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 return _vsnprintf($s, 2147483647, $fmt, $ap) | 0;
}

function _default_vel($height) {
 $height = $height | 0;
 return ~~+Math_floor(+(+Math_sqrt(+(+($height | 0) * 17.6)))) | 0;
}

function dynCall_ii(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return FUNCTION_TABLE_ii[index & 1](a1 | 0) | 0;
}

function dynCall_vi(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 FUNCTION_TABLE_vi[index & 1](a1 | 0);
}

function _cleanup372($p) {
 $p = $p | 0;
 if (!(HEAP32[$p + 68 >> 2] | 0)) ___unlockfile($p);
 return;
}

function b1(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 nullFunc_iiii(1);
 return 0;
}

function _random_color() {
 return HEAP32[8 + (((_random() | 0) % 12 | 0) << 2) >> 2] | 0;
}

function _frexpl($x, $e) {
 $x = +$x;
 $e = $e | 0;
 return +(+_frexp($x, $e));
}

function setTempRet0(value) {
 value = value | 0;
 tempRet0 = value;
}

function _rand_float() {
 return +(+(_random() | 0) / 2147483647.0);
}

function stackRestore(top) {
 top = top | 0;
 STACKTOP = top;
}

function b0(p0) {
 p0 = p0 | 0;
 nullFunc_ii(0);
 return 0;
}

function _List_create() {
 return _calloc(1, 12) | 0;
}

function ___unlockfile($f) {
 $f = $f | 0;
 return;
}

function ___lockfile($f) {
 $f = $f | 0;
 return 0;
}

function b2(p0) {
 p0 = p0 | 0;
 nullFunc_vi(2);
}

function getTempRet0() {
 return tempRet0 | 0;
}

function stackSave() {
 return STACKTOP | 0;
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,_sn_write,___stdout_write,___stdio_seek,___stdio_write,b1,b1,b1];
var FUNCTION_TABLE_vi = [b2,_cleanup372];

  return { _i64Subtract: _i64Subtract, _fflush: _fflush, _i64Add: _i64Add, _disp_create: _disp_create, _disp_get_frame: _disp_get_frame, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _disp_create_trajectories: _disp_create_trajectories, _bitshift64Lshr: _bitshift64Lshr, _free: _free, _get_time: _get_time, ___errno_location: ___errno_location, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__fflush = asm["_fflush"]; asm["_fflush"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__fflush.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__disp_create = asm["_disp_create"]; asm["_disp_create"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__disp_create.apply(null, arguments);
};

var real__disp_get_frame = asm["_disp_get_frame"]; asm["_disp_get_frame"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__disp_get_frame.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__free.apply(null, arguments);
};

var real__get_time = asm["_get_time"]; asm["_get_time"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__get_time.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};

var real____errno_location = asm["___errno_location"]; asm["___errno_location"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real____errno_location.apply(null, arguments);
};

var real__disp_create_trajectories = asm["_disp_create_trajectories"]; asm["_disp_create_trajectories"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__disp_create_trajectories.apply(null, arguments);
};
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _disp_create = Module["_disp_create"] = asm["_disp_create"];
var _disp_get_frame = Module["_disp_get_frame"] = asm["_disp_get_frame"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _free = Module["_free"] = asm["_free"];
var _get_time = Module["_get_time"] = asm["_get_time"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var _disp_create_trajectories = Module["_disp_create_trajectories"] = asm["_disp_create_trajectories"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, Runtime.GLOBAL_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[Runtime.GLOBAL_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
      removeRunDependency('memory initializer');
    }
    function doBrowserLoad() {
      Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
    var request = Module['memoryInitializerRequest'];
    if (request) {
      // a network request has already been created, just use that
      function useRequest() {
        if (request.status !== 200 && request.status !== 0) {
          // If you see this warning, the issue may be that you are using locateFile or memoryInitializerPrefixURL, and defining them in JS. That
          // means that the HTML file doesn't know about them, and when it tries to create the mem init request early, does it to the wrong place.
          // Look in your browser's devtools network console to see what's going on.
          console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
          doBrowserLoad();
          return;
        }
        applyMemoryInitializer(request.response);
      }
      if (request.response) {
        setTimeout(useRequest, 0); // it's already here; but, apply it asynchronously
      } else {
        request.addEventListener('load', useRequest); // wait for it
      }
    } else {
      // fetch it from the network ourselves
      doBrowserLoad();
    }
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}







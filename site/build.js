(function(){ var curSystem = typeof System != 'undefined' ? System : undefined;
/* */ 
"format global";
"exports $traceurRuntime";
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $keys = $Object.keys;
  var $apply = Function.prototype.call.bind(Function.prototype.apply);
  var $random = Math.random;
  var $getOwnPropertySymbols = $Object.getOwnPropertySymbols;
  var $Symbol = global.Symbol;
  var $WeakMap = global.WeakMap;
  var hasNativeSymbol = $getOwnPropertySymbols && typeof $Symbol === 'function';
  var hasNativeWeakMap = typeof $WeakMap === 'function';
  function $bind(operand, thisArg, args) {
    var argArray = [thisArg];
    for (var i = 0; i < args.length; i++) {
      argArray[i + 1] = args[i];
    }
    var func = $apply(Function.prototype.bind, operand, argArray);
    return func;
  }
  function $construct(func, argArray) {
    var object = new ($bind(func, null, argArray));
    return object;
  }
  var counter = Date.now() % 1e9;
  function newUniqueString() {
    return '__$' + ($random() * 1e9 >>> 1) + '$' + ++counter + '$__';
  }
  var createPrivateSymbol,
      deletePrivate,
      getPrivate,
      hasPrivate,
      isPrivateSymbol,
      setPrivate;
  if (hasNativeWeakMap) {
    isPrivateSymbol = function(s) {
      return false;
    };
    createPrivateSymbol = function() {
      return new $WeakMap();
    };
    hasPrivate = function(obj, sym) {
      return sym.has(obj);
    };
    deletePrivate = function(obj, sym) {
      return sym.delete(obj);
    };
    setPrivate = function(obj, sym, val) {
      sym.set(obj, val);
    };
    getPrivate = function(obj, sym) {
      return sym.get(obj);
    };
  } else {
    var privateNames = $create(null);
    isPrivateSymbol = function(s) {
      return privateNames[s];
    };
    createPrivateSymbol = function() {
      var s = hasNativeSymbol ? $Symbol() : newUniqueString();
      privateNames[s] = true;
      return s;
    };
    hasPrivate = function(obj, sym) {
      return hasOwnProperty.call(obj, sym);
    };
    deletePrivate = function(obj, sym) {
      if (!hasPrivate(obj, sym)) {
        return false;
      }
      delete obj[sym];
      return true;
    };
    setPrivate = function(obj, sym, val) {
      obj[sym] = val;
    };
    getPrivate = function(obj, sym) {
      var val = obj[sym];
      if (val === undefined)
        return undefined;
      return hasOwnProperty.call(obj, sym) ? val : undefined;
    };
  }
  (function() {
    function nonEnum(value) {
      return {
        configurable: true,
        enumerable: false,
        value: value,
        writable: true
      };
    }
    var method = nonEnum;
    var symbolInternalProperty = newUniqueString();
    var symbolDescriptionProperty = newUniqueString();
    var symbolDataProperty = newUniqueString();
    var symbolValues = $create(null);
    var SymbolImpl = function Symbol(description) {
      var value = new SymbolValue(description);
      if (!(this instanceof SymbolImpl))
        return value;
      throw new TypeError('Symbol cannot be new\'ed');
    };
    $defineProperty(SymbolImpl.prototype, 'constructor', nonEnum(SymbolImpl));
    $defineProperty(SymbolImpl.prototype, 'toString', method(function() {
      var symbolValue = this[symbolDataProperty];
      return symbolValue[symbolInternalProperty];
    }));
    $defineProperty(SymbolImpl.prototype, 'valueOf', method(function() {
      var symbolValue = this[symbolDataProperty];
      if (!symbolValue)
        throw TypeError('Conversion from symbol to string');
      return symbolValue[symbolInternalProperty];
    }));
    function SymbolValue(description) {
      var key = newUniqueString();
      $defineProperty(this, symbolDataProperty, {value: this});
      $defineProperty(this, symbolInternalProperty, {value: key});
      $defineProperty(this, symbolDescriptionProperty, {value: description});
      $freeze(this);
      symbolValues[key] = this;
    }
    $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(SymbolImpl));
    $defineProperty(SymbolValue.prototype, 'toString', {
      value: SymbolImpl.prototype.toString,
      enumerable: false
    });
    $defineProperty(SymbolValue.prototype, 'valueOf', {
      value: SymbolImpl.prototype.valueOf,
      enumerable: false
    });
    $freeze(SymbolValue.prototype);
    function isSymbolString(s) {
      return symbolValues[s] || isPrivateSymbol(s);
    }
    function removeSymbolKeys(array) {
      var rv = [];
      for (var i = 0; i < array.length; i++) {
        if (!isSymbolString(array[i])) {
          rv.push(array[i]);
        }
      }
      return rv;
    }
    function getOwnPropertyNames(object) {
      return removeSymbolKeys($getOwnPropertyNames(object));
    }
    function keys(object) {
      return removeSymbolKeys($keys(object));
    }
    var getOwnPropertySymbolsEmulate = function getOwnPropertySymbols(object) {
      var rv = [];
      var names = $getOwnPropertyNames(object);
      for (var i = 0; i < names.length; i++) {
        var symbol = symbolValues[names[i]];
        if (symbol) {
          rv.push(symbol);
        }
      }
      return rv;
    };
    var getOwnPropertySymbolsPrivate = function getOwnPropertySymbols(object) {
      var rv = [];
      var symbols = $getOwnPropertySymbols(object);
      for (var i = 0; i < symbols.length; i++) {
        var symbol = symbols[i];
        if (!isPrivateSymbol(symbol)) {
          rv.push(symbol);
        }
      }
      return rv;
    };
    function exportStar(object) {
      for (var i = 1; i < arguments.length; i++) {
        var names = $getOwnPropertyNames(arguments[i]);
        for (var j = 0; j < names.length; j++) {
          var name = names[j];
          if (name === '__esModule' || name === 'default' || isSymbolString(name))
            continue;
          (function(mod, name) {
            $defineProperty(object, name, {
              get: function() {
                return mod[name];
              },
              enumerable: true
            });
          })(arguments[i], names[j]);
        }
      }
      return object;
    }
    function isObject(x) {
      return x != null && (typeof x === 'object' || typeof x === 'function');
    }
    function toObject(x) {
      if (x == null)
        throw $TypeError();
      return $Object(x);
    }
    function checkObjectCoercible(argument) {
      if (argument == null) {
        throw new TypeError('Value cannot be converted to an Object');
      }
      return argument;
    }
    function polyfillSymbol(global) {
      if (!hasNativeSymbol) {
        global.Symbol = SymbolImpl;
        var Object = global.Object;
        Object.getOwnPropertyNames = getOwnPropertyNames;
        Object.keys = keys;
        $defineProperty(Object, 'getOwnPropertySymbols', nonEnum(getOwnPropertySymbolsEmulate));
      } else if (!hasNativeWeakMap) {
        $defineProperty(Object, 'getOwnPropertySymbols', nonEnum(getOwnPropertySymbolsPrivate));
      }
      if (!global.Symbol.iterator) {
        global.Symbol.iterator = Symbol('Symbol.iterator');
      }
      if (!global.Symbol.observer) {
        global.Symbol.observer = Symbol('Symbol.observer');
      }
    }
    function hasNativeSymbolFunc() {
      return hasNativeSymbol;
    }
    function setupGlobals(global) {
      polyfillSymbol(global);
      global.Reflect = global.Reflect || {};
      global.Reflect.global = global.Reflect.global || global;
    }
    setupGlobals(global);
    var typeOf = hasNativeSymbol ? function(x) {
      return typeof x;
    } : function(x) {
      return x instanceof SymbolValue ? 'symbol' : typeof x;
    };
    global.$traceurRuntime = {
      checkObjectCoercible: checkObjectCoercible,
      createPrivateSymbol: createPrivateSymbol,
      deletePrivate: deletePrivate,
      exportStar: exportStar,
      getPrivate: getPrivate,
      hasNativeSymbol: hasNativeSymbolFunc,
      hasPrivate: hasPrivate,
      isObject: isObject,
      options: {},
      setPrivate: setPrivate,
      setupGlobals: setupGlobals,
      toObject: toObject,
      typeof: typeOf
    };
  })();
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function(global) {
  'use strict';
  var $__3 = $traceurRuntime,
      canonicalizeUrl = $__3.canonicalizeUrl,
      resolveUrl = $__3.resolveUrl,
      isAbsolute = $__3.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  }
  function ModuleEvaluationError(erroneousModuleName, cause) {
    this.message = this.constructor.name + ': ' + this.stripCause(cause) + ' in ' + erroneousModuleName;
    if (!(cause instanceof ModuleEvaluationError) && cause.stack)
      this.stack = this.stripStack(cause.stack);
    else
      this.stack = '';
  }
  ModuleEvaluationError.prototype = Object.create(Error.prototype);
  ModuleEvaluationError.prototype.constructor = ModuleEvaluationError;
  ModuleEvaluationError.prototype.stripError = function(message) {
    return message.replace(/.*Error:/, this.constructor.name + ':');
  };
  ModuleEvaluationError.prototype.stripCause = function(cause) {
    if (!cause)
      return '';
    if (!cause.message)
      return cause + '';
    return this.stripError(cause.message);
  };
  ModuleEvaluationError.prototype.loadedBy = function(moduleName) {
    this.stack += '\n loaded by ' + moduleName;
  };
  ModuleEvaluationError.prototype.stripStack = function(causeStack) {
    var stack = [];
    causeStack.split('\n').some(function(frame) {
      if (/UncoatedModuleInstantiator/.test(frame))
        return true;
      stack.push(frame);
    });
    stack[0] = this.stripError(stack[0]);
    return stack.join('\n');
  };
  function beforeLines(lines, number) {
    var result = [];
    var first = number - 3;
    if (first < 0)
      first = 0;
    for (var i = first; i < number; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function afterLines(lines, number) {
    var last = number + 1;
    if (last > lines.length - 1)
      last = lines.length - 1;
    var result = [];
    for (var i = number; i <= last; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function columnSpacing(columns) {
    var result = '';
    for (var i = 0; i < columns - 1; i++) {
      result += '-';
    }
    return result;
  }
  function UncoatedModuleInstantiator(url, func) {
    UncoatedModuleEntry.call(this, url, null);
    this.func = func;
  }
  UncoatedModuleInstantiator.prototype = Object.create(UncoatedModuleEntry.prototype);
  UncoatedModuleInstantiator.prototype.getUncoatedModule = function() {
    var $__2 = this;
    if (this.value_)
      return this.value_;
    try {
      var relativeRequire;
      if (typeof $traceurRuntime !== undefined && $traceurRuntime.require) {
        relativeRequire = $traceurRuntime.require.bind(null, this.url);
      }
      return this.value_ = this.func.call(global, relativeRequire);
    } catch (ex) {
      if (ex instanceof ModuleEvaluationError) {
        ex.loadedBy(this.url);
        throw ex;
      }
      if (ex.stack) {
        var lines = this.func.toString().split('\n');
        var evaled = [];
        ex.stack.split('\n').some(function(frame, index) {
          if (frame.indexOf('UncoatedModuleInstantiator.getUncoatedModule') > 0)
            return true;
          var m = /(at\s[^\s]*\s).*>:(\d*):(\d*)\)/.exec(frame);
          if (m) {
            var line = parseInt(m[2], 10);
            evaled = evaled.concat(beforeLines(lines, line));
            if (index === 1) {
              evaled.push(columnSpacing(m[3]) + '^ ' + $__2.url);
            } else {
              evaled.push(columnSpacing(m[3]) + '^');
            }
            evaled = evaled.concat(afterLines(lines, line));
            evaled.push('= = = = = = = = =');
          } else {
            evaled.push(frame);
          }
        });
        ex.stack = evaled.join('\n');
      }
      throw new ModuleEvaluationError(this.url, ex);
    }
  };
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach(function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    });
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== 'string')
        throw new TypeError('module name must be a string, not ' + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, function() {
        return module;
      });
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, deps, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length && !func.length) {
        this.registerModule(name, deps, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: function() {
            var $__2 = arguments;
            var depMap = {};
            deps.forEach(function(dep, index) {
              return depMap[dep] = $__2[index];
            });
            var registryEntry = func.call(this, depMap);
            registryEntry.execute.call(this);
            return registryEntry.exports;
          }
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    setCompilerVersion: function(version) {
      ModuleStore.compilerVersion = version;
    },
    getCompilerVersion: function() {
      return ModuleStore.compilerVersion;
    }
  };
  var moduleStoreModule = new Module({ModuleStore: ModuleStore});
  ModuleStore.set('@traceur/src/runtime/ModuleStore.js', moduleStoreModule);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    registerModule: ModuleStore.registerModule.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize,
    setCompilerVersion: ModuleStore.setCompilerVersion,
    getCompilerVersion: ModuleStore.getCompilerVersion
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
System.registerModule("traceur-runtime@0.0.93/src/runtime/async.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/async.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var $__11 = $traceurRuntime,
      createPrivateSymbol = $__11.createPrivateSymbol,
      getPrivate = $__11.getPrivate,
      setPrivate = $__11.setPrivate;
  var $__12 = Object,
      create = $__12.create,
      defineProperty = $__12.defineProperty;
  var observeName = createPrivateSymbol();
  function AsyncGeneratorFunction() {}
  function AsyncGeneratorFunctionPrototype() {}
  AsyncGeneratorFunction.prototype = AsyncGeneratorFunctionPrototype;
  AsyncGeneratorFunctionPrototype.constructor = AsyncGeneratorFunction;
  defineProperty(AsyncGeneratorFunctionPrototype, 'constructor', {enumerable: false});
  var AsyncGeneratorContext = function() {
    function AsyncGeneratorContext(observer) {
      var $__2 = this;
      this.decoratedObserver = $traceurRuntime.createDecoratedGenerator(observer, function() {
        $__2.done = true;
      });
      this.done = false;
      this.inReturn = false;
    }
    return ($traceurRuntime.createClass)(AsyncGeneratorContext, {
      throw: function(error) {
        if (!this.inReturn) {
          throw error;
        }
      },
      yield: function(value) {
        if (this.done) {
          this.inReturn = true;
          throw undefined;
        }
        var result;
        try {
          result = this.decoratedObserver.next(value);
        } catch (e) {
          this.done = true;
          throw e;
        }
        if (result === undefined) {
          return;
        }
        if (result.done) {
          this.done = true;
          this.inReturn = true;
          throw undefined;
        }
        return result.value;
      },
      yieldFor: function(observable) {
        var ctx = this;
        return $traceurRuntime.observeForEach(observable[Symbol.observer].bind(observable), function(value) {
          if (ctx.done) {
            this.return();
            return;
          }
          var result;
          try {
            result = ctx.decoratedObserver.next(value);
          } catch (e) {
            ctx.done = true;
            throw e;
          }
          if (result === undefined) {
            return;
          }
          if (result.done) {
            ctx.done = true;
          }
          return result;
        });
      }
    }, {});
  }();
  AsyncGeneratorFunctionPrototype.prototype[Symbol.observer] = function(observer) {
    var observe = getPrivate(this, observeName);
    var ctx = new AsyncGeneratorContext(observer);
    $traceurRuntime.schedule(function() {
      return observe(ctx);
    }).then(function(value) {
      if (!ctx.done) {
        ctx.decoratedObserver.return(value);
      }
    }).catch(function(error) {
      if (!ctx.done) {
        ctx.decoratedObserver.throw(error);
      }
    });
    return ctx.decoratedObserver;
  };
  defineProperty(AsyncGeneratorFunctionPrototype.prototype, Symbol.observer, {enumerable: false});
  function initAsyncGeneratorFunction(functionObject) {
    functionObject.prototype = create(AsyncGeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = AsyncGeneratorFunctionPrototype;
    return functionObject;
  }
  function createAsyncGeneratorInstance(observe, functionObject) {
    for (var args = [],
        $__10 = 2; $__10 < arguments.length; $__10++)
      args[$__10 - 2] = arguments[$__10];
    var object = create(functionObject.prototype);
    setPrivate(object, observeName, observe);
    return object;
  }
  function observeForEach(observe, next) {
    return new Promise(function(resolve, reject) {
      var generator = observe({
        next: function(value) {
          return next.call(generator, value);
        },
        throw: function(error) {
          reject(error);
        },
        return: function(value) {
          resolve(value);
        }
      });
    });
  }
  function schedule(asyncF) {
    return Promise.resolve().then(asyncF);
  }
  var generator = Symbol();
  var onDone = Symbol();
  var DecoratedGenerator = function() {
    function DecoratedGenerator(_generator, _onDone) {
      this[generator] = _generator;
      this[onDone] = _onDone;
    }
    return ($traceurRuntime.createClass)(DecoratedGenerator, {
      next: function(value) {
        var result = this[generator].next(value);
        if (result !== undefined && result.done) {
          this[onDone].call(this);
        }
        return result;
      },
      throw: function(error) {
        this[onDone].call(this);
        return this[generator].throw(error);
      },
      return: function(value) {
        this[onDone].call(this);
        return this[generator].return(value);
      }
    }, {});
  }();
  function createDecoratedGenerator(generator, onDone) {
    return new DecoratedGenerator(generator, onDone);
  }
  Array.prototype[Symbol.observer] = function(observer) {
    var done = false;
    var decoratedObserver = createDecoratedGenerator(observer, function() {
      return done = true;
    });
    var $__6 = true;
    var $__7 = false;
    var $__8 = undefined;
    try {
      for (var $__4 = void 0,
          $__3 = (this)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
        var value = $__4.value;
        {
          decoratedObserver.next(value);
          if (done) {
            return;
          }
        }
      }
    } catch ($__9) {
      $__7 = true;
      $__8 = $__9;
    } finally {
      try {
        if (!$__6 && $__3.return != null) {
          $__3.return();
        }
      } finally {
        if ($__7) {
          throw $__8;
        }
      }
    }
    decoratedObserver.return();
    return decoratedObserver;
  };
  defineProperty(Array.prototype, Symbol.observer, {enumerable: false});
  $traceurRuntime.initAsyncGeneratorFunction = initAsyncGeneratorFunction;
  $traceurRuntime.createAsyncGeneratorInstance = createAsyncGeneratorInstance;
  $traceurRuntime.observeForEach = observeForEach;
  $traceurRuntime.schedule = schedule;
  $traceurRuntime.createDecoratedGenerator = createDecoratedGenerator;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/classes.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/classes.js";
  var $Object = Object;
  var $TypeError = TypeError;
  var $__1 = Object,
      create = $__1.create,
      defineProperties = $__1.defineProperties,
      defineProperty = $__1.defineProperty,
      getOwnPropertyDescriptor = $__1.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__1.getOwnPropertyNames,
      getOwnPropertySymbols = $__1.getOwnPropertySymbols,
      getPrototypeOf = $__1.getPrototypeOf;
  function superDescriptor(homeObject, name) {
    var proto = getPrototypeOf(homeObject);
    do {
      var result = getOwnPropertyDescriptor(proto, name);
      if (result)
        return result;
      proto = getPrototypeOf(proto);
    } while (proto);
    return undefined;
  }
  function superConstructor(ctor) {
    return ctor.__proto__;
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      var value = descriptor.value;
      if (value)
        return value;
      if (!descriptor.get)
        return value;
      return descriptor.get.call(self);
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError(("super has no setter '" + name + "'."));
  }
  function forEachPropertyKey(object, f) {
    getOwnPropertyNames(object).forEach(f);
    getOwnPropertySymbols(object).forEach(f);
  }
  function getDescriptors(object) {
    var descriptors = {};
    forEachPropertyKey(object, function(key) {
      descriptors[key] = getOwnPropertyDescriptor(object, key);
      descriptors[key].enumerable = false;
    });
    return descriptors;
  }
  var nonEnum = {enumerable: false};
  function makePropertiesNonEnumerable(object) {
    forEachPropertyKey(object, function(key) {
      defineProperty(object, key, nonEnum);
    });
  }
  function createClass(ctor, object, staticObject, superClass) {
    defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = create(getProtoParent(superClass), getDescriptors(object));
    } else {
      makePropertiesNonEnumerable(object);
      ctor.prototype = object;
    }
    defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
      throw new $TypeError('super prototype must be an Object or null');
    }
    if (superClass === null)
      return null;
    throw new $TypeError(("Super expression must either be null or a function, not " + typeof superClass + "."));
  }
  $traceurRuntime.createClass = createClass;
  $traceurRuntime.superConstructor = superConstructor;
  $traceurRuntime.superGet = superGet;
  $traceurRuntime.superSet = superSet;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/destructuring.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/destructuring.js";
  function iteratorToArray(iter) {
    var rv = [];
    var i = 0;
    var tmp;
    while (!(tmp = iter.next()).done) {
      rv[i++] = tmp.value;
    }
    return rv;
  }
  $traceurRuntime.iteratorToArray = iteratorToArray;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/generators.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/generators.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var $TypeError = TypeError;
  var $__1 = $traceurRuntime,
      createPrivateSymbol = $__1.createPrivateSymbol,
      getPrivate = $__1.getPrivate,
      setPrivate = $__1.setPrivate;
  var $__2 = Object,
      create = $__2.create,
      defineProperties = $__2.defineProperties,
      defineProperty = $__2.defineProperty;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  var RETURN_SENTINEL = {};
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.oldReturnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    maybeUncatchable: function() {
      if (this.storedException === RETURN_SENTINEL) {
        throw RETURN_SENTINEL;
      }
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    },
    handleException: function(ex) {
      this.GState = ST_CLOSED;
      this.state = END_STATE;
      throw ex;
    },
    wrapYieldStar: function(iterator) {
      var ctx = this;
      return {
        next: function(v) {
          return iterator.next(v);
        },
        throw: function(e) {
          var result;
          if (e === RETURN_SENTINEL) {
            if (iterator.return) {
              result = iterator.return(ctx.returnValue);
              if (!result.done) {
                ctx.returnValue = ctx.oldReturnValue;
                return result;
              }
              ctx.returnValue = result.value;
            }
            throw e;
          }
          if (iterator.throw) {
            return iterator.throw(e);
          }
          iterator.return && iterator.return();
          throw $TypeError('Inner iterator does not have a throw method');
        }
      };
    }
  };
  function nextOrThrow(ctx, moveNext, action, x) {
    switch (ctx.GState) {
      case ST_EXECUTING:
        throw new Error(("\"" + action + "\" on executing generator"));
      case ST_CLOSED:
        if (action == 'next') {
          return {
            value: undefined,
            done: true
          };
        }
        if (x === RETURN_SENTINEL) {
          return {
            value: ctx.returnValue,
            done: true
          };
        }
        throw x;
      case ST_NEWBORN:
        if (action === 'throw') {
          ctx.GState = ST_CLOSED;
          if (x === RETURN_SENTINEL) {
            return {
              value: ctx.returnValue,
              done: true
            };
          }
          throw x;
        }
        if (x !== undefined)
          throw $TypeError('Sent value to newborn generator');
      case ST_SUSPENDED:
        ctx.GState = ST_EXECUTING;
        ctx.action = action;
        ctx.sent = x;
        var value;
        try {
          value = moveNext(ctx);
        } catch (ex) {
          if (ex === RETURN_SENTINEL) {
            value = ctx;
          } else {
            throw ex;
          }
        }
        var done = value === ctx;
        if (done)
          value = ctx.returnValue;
        ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
        return {
          value: value,
          done: done
        };
    }
  }
  var ctxName = createPrivateSymbol();
  var moveNextName = createPrivateSymbol();
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  defineProperty(GeneratorFunctionPrototype, 'constructor', nonEnum(GeneratorFunction));
  GeneratorFunctionPrototype.prototype = {
    constructor: GeneratorFunctionPrototype,
    next: function(v) {
      return nextOrThrow(getPrivate(this, ctxName), getPrivate(this, moveNextName), 'next', v);
    },
    throw: function(v) {
      return nextOrThrow(getPrivate(this, ctxName), getPrivate(this, moveNextName), 'throw', v);
    },
    return: function(v) {
      var ctx = getPrivate(this, ctxName);
      ctx.oldReturnValue = ctx.returnValue;
      ctx.returnValue = v;
      return nextOrThrow(ctx, getPrivate(this, moveNextName), 'throw', RETURN_SENTINEL);
    }
  };
  defineProperties(GeneratorFunctionPrototype.prototype, {
    constructor: {enumerable: false},
    next: {enumerable: false},
    throw: {enumerable: false},
    return: {enumerable: false}
  });
  Object.defineProperty(GeneratorFunctionPrototype.prototype, Symbol.iterator, nonEnum(function() {
    return this;
  }));
  function createGeneratorInstance(innerFunction, functionObject, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    var object = create(functionObject.prototype);
    setPrivate(object, ctxName, ctx);
    setPrivate(object, moveNextName, moveNext);
    return object;
  }
  function initGeneratorFunction(functionObject) {
    functionObject.prototype = create(GeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = GeneratorFunctionPrototype;
    return functionObject;
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        this.resolve(this.returnValue);
        break;
      case RETHROW_STATE:
        this.reject(this.storedException);
        break;
      default:
        this.reject(getInternalError(this.state));
    }
  };
  AsyncFunctionContext.prototype.handleException = function() {
    this.state = RETHROW_STATE;
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.errback = function(err) {
      handleCatch(ctx, err);
      moveNext(ctx);
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          handleCatch(ctx, ex);
        }
      }
    };
  }
  function handleCatch(ctx, ex) {
    ctx.storedException = ex;
    var last = ctx.tryStack_[ctx.tryStack_.length - 1];
    if (!last) {
      ctx.handleException(ex);
      return;
    }
    ctx.state = last.catch !== undefined ? last.catch : last.finally;
    if (last.finallyFallThrough !== undefined)
      ctx.finallyFallThrough = last.finallyFallThrough;
  }
  $traceurRuntime.asyncWrap = asyncWrap;
  $traceurRuntime.initGeneratorFunction = initGeneratorFunction;
  $traceurRuntime.createGeneratorInstance = createGeneratorInstance;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/proper-tail-calls.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/proper-tail-calls.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var $apply = Function.prototype.call.bind(Function.prototype.apply);
  var $__1 = $traceurRuntime,
      getPrivate = $__1.getPrivate,
      setPrivate = $__1.setPrivate,
      createPrivateSymbol = $__1.createPrivateSymbol;
  var CONTINUATION_TYPE = Object.create(null);
  var isTailRecursiveName = null;
  function createContinuation(operand, thisArg, argsArray) {
    return [CONTINUATION_TYPE, operand, thisArg, argsArray];
  }
  function isContinuation(object) {
    return object && object[0] === CONTINUATION_TYPE;
  }
  function $bind(operand, thisArg, args) {
    var argArray = [thisArg];
    for (var i = 0; i < args.length; i++) {
      argArray[i + 1] = args[i];
    }
    var func = $apply(Function.prototype.bind, operand, argArray);
    return func;
  }
  function $construct(func, argArray) {
    var object = new ($bind(func, null, argArray));
    return object;
  }
  function isTailRecursive(func) {
    return !!getPrivate(func, isTailRecursiveName);
  }
  function tailCall(func, thisArg, argArray) {
    var continuation = argArray[0];
    if (isContinuation(continuation)) {
      continuation = $apply(func, thisArg, continuation[3]);
      return continuation;
    }
    continuation = createContinuation(func, thisArg, argArray);
    while (true) {
      if (isTailRecursive(func)) {
        continuation = $apply(func, continuation[2], [continuation]);
      } else {
        continuation = $apply(func, continuation[2], continuation[3]);
      }
      if (!isContinuation(continuation)) {
        return continuation;
      }
      func = continuation[1];
    }
  }
  function construct() {
    var object;
    if (isTailRecursive(this)) {
      object = $construct(this, [createContinuation(null, null, arguments)]);
    } else {
      object = $construct(this, arguments);
    }
    return object;
  }
  function setupProperTailCalls() {
    isTailRecursiveName = createPrivateSymbol();
    Function.prototype.call = initTailRecursiveFunction(function call(thisArg) {
      var result = tailCall(function(thisArg) {
        var argArray = [];
        for (var i = 1; i < arguments.length; ++i) {
          argArray[i - 1] = arguments[i];
        }
        var continuation = createContinuation(this, thisArg, argArray);
        return continuation;
      }, this, arguments);
      return result;
    });
    Function.prototype.apply = initTailRecursiveFunction(function apply(thisArg, argArray) {
      var result = tailCall(function(thisArg, argArray) {
        var continuation = createContinuation(this, thisArg, argArray);
        return continuation;
      }, this, arguments);
      return result;
    });
  }
  function initTailRecursiveFunction(func) {
    if (isTailRecursiveName === null) {
      setupProperTailCalls();
    }
    setPrivate(func, isTailRecursiveName, true);
    return func;
  }
  $traceurRuntime.initTailRecursiveFunction = initTailRecursiveFunction;
  $traceurRuntime.call = tailCall;
  $traceurRuntime.continuation = createContinuation;
  $traceurRuntime.construct = construct;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/relativeRequire.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/relativeRequire.js";
  var path;
  function relativeRequire(callerPath, requiredPath) {
    path = path || typeof require !== 'undefined' && require('path');
    function isDirectory(path) {
      return path.slice(-1) === '/';
    }
    function isAbsolute(path) {
      return path[0] === '/';
    }
    function isRelative(path) {
      return path[0] === '.';
    }
    if (isDirectory(requiredPath) || isAbsolute(requiredPath))
      return;
    return isRelative(requiredPath) ? require(path.resolve(path.dirname(callerPath), requiredPath)) : require(requiredPath);
  }
  $traceurRuntime.require = relativeRequire;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/spread.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/spread.js";
  function spread() {
    var rv = [],
        j = 0,
        iterResult;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = $traceurRuntime.checkObjectCoercible(arguments[i]);
      if (typeof valueToSpread[Symbol.iterator] !== 'function') {
        throw new TypeError('Cannot spread non-iterable object.');
      }
      var iter = valueToSpread[Symbol.iterator]();
      while (!(iterResult = iter.next()).done) {
        rv[j++] = iterResult.value;
      }
    }
    return rv;
  }
  $traceurRuntime.spread = spread;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/template.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/template.js";
  var $__1 = Object,
      defineProperty = $__1.defineProperty,
      freeze = $__1.freeze;
  var slice = Array.prototype.slice;
  var map = Object.create(null);
  function getTemplateObject(raw) {
    var cooked = arguments[1];
    var key = raw.join('${}');
    var templateObject = map[key];
    if (templateObject)
      return templateObject;
    if (!cooked) {
      cooked = slice.call(raw);
    }
    return map[key] = freeze(defineProperty(cooked, 'raw', {value: freeze(raw)}));
  }
  $traceurRuntime.getTemplateObject = getTemplateObject;
  return {};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/runtime-modules.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/runtime-modules.js";
  System.get("traceur-runtime@0.0.93/src/runtime/proper-tail-calls.js");
  System.get("traceur-runtime@0.0.93/src/runtime/relativeRequire.js");
  System.get("traceur-runtime@0.0.93/src/runtime/spread.js");
  System.get("traceur-runtime@0.0.93/src/runtime/destructuring.js");
  System.get("traceur-runtime@0.0.93/src/runtime/classes.js");
  System.get("traceur-runtime@0.0.93/src/runtime/async.js");
  System.get("traceur-runtime@0.0.93/src/runtime/generators.js");
  System.get("traceur-runtime@0.0.93/src/runtime/template.js");
  return {};
});
System.get("traceur-runtime@0.0.93/src/runtime/runtime-modules.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/frozen-data.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/frozen-data.js";
  function findIndex(arr, key) {
    for (var i = 0; i < arr.length; i += 2) {
      if (arr[i] === key) {
        return i;
      }
    }
    return -1;
  }
  function setFrozen(arr, key, val) {
    var i = findIndex(arr, key);
    if (i === -1) {
      arr.push(key, val);
    }
  }
  function getFrozen(arr, key) {
    var i = findIndex(arr, key);
    if (i !== -1) {
      return arr[i + 1];
    }
    return undefined;
  }
  function hasFrozen(arr, key) {
    return findIndex(arr, key) !== -1;
  }
  function deleteFrozen(arr, key) {
    var i = findIndex(arr, key);
    if (i !== -1) {
      arr.splice(i, 2);
      return true;
    }
    return false;
  }
  return {
    get setFrozen() {
      return setFrozen;
    },
    get getFrozen() {
      return getFrozen;
    },
    get hasFrozen() {
      return hasFrozen;
    },
    get deleteFrozen() {
      return deleteFrozen;
    }
  };
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/utils.js";
  var $ceil = Math.ceil;
  var $floor = Math.floor;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $pow = Math.pow;
  var $min = Math.min;
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x >>> 0;
  }
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function isCallable(x) {
    return typeof x === 'function';
  }
  function isNumber(x) {
    return typeof x === 'number';
  }
  function toInteger(x) {
    x = +x;
    if ($isNaN(x))
      return 0;
    if (x === 0 || !$isFinite(x))
      return x;
    return x > 0 ? $floor(x) : $ceil(x);
  }
  var MAX_SAFE_LENGTH = $pow(2, 53) - 1;
  function toLength(x) {
    var len = toInteger(x);
    return len < 0 ? 0 : $min(len, MAX_SAFE_LENGTH);
  }
  function checkIterable(x) {
    return !isObject(x) ? undefined : x[Symbol.iterator];
  }
  function isConstructor(x) {
    return isCallable(x);
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function maybeDefine(object, name, descr) {
    if (!(name in object)) {
      Object.defineProperty(object, name, descr);
    }
  }
  function maybeDefineMethod(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function maybeDefineConst(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function maybeAddConsts(object, consts) {
    for (var i = 0; i < consts.length; i += 2) {
      var name = consts[i];
      var value = consts[i + 1];
      maybeDefineConst(object, name, value);
    }
  }
  function maybeAddIterator(object, func, Symbol) {
    if (!Symbol || !Symbol.iterator || object[Symbol.iterator])
      return;
    if (object['@@iterator'])
      func = object['@@iterator'];
    Object.defineProperty(object, Symbol.iterator, {
      value: func,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  var polyfills = [];
  function registerPolyfill(func) {
    polyfills.push(func);
  }
  function polyfillAll(global) {
    polyfills.forEach(function(f) {
      return f(global);
    });
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    },
    get isObject() {
      return isObject;
    },
    get isCallable() {
      return isCallable;
    },
    get isNumber() {
      return isNumber;
    },
    get toInteger() {
      return toInteger;
    },
    get toLength() {
      return toLength;
    },
    get checkIterable() {
      return checkIterable;
    },
    get isConstructor() {
      return isConstructor;
    },
    get createIteratorResultObject() {
      return createIteratorResultObject;
    },
    get maybeDefine() {
      return maybeDefine;
    },
    get maybeDefineMethod() {
      return maybeDefineMethod;
    },
    get maybeDefineConst() {
      return maybeDefineConst;
    },
    get maybeAddFunctions() {
      return maybeAddFunctions;
    },
    get maybeAddConsts() {
      return maybeAddConsts;
    },
    get maybeAddIterator() {
      return maybeAddIterator;
    },
    get registerPolyfill() {
      return registerPolyfill;
    },
    get polyfillAll() {
      return polyfillAll;
    }
  };
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Map.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Map.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      registerPolyfill = $__0.registerPolyfill;
  var $__1 = System.get("traceur-runtime@0.0.93/src/runtime/frozen-data.js"),
      deleteFrozen = $__1.deleteFrozen,
      getFrozen = $__1.getFrozen,
      setFrozen = $__1.setFrozen;
  var $__11 = $traceurRuntime,
      createPrivateSymbol = $__11.createPrivateSymbol,
      getPrivate = $__11.getPrivate,
      hasNativeSymbol = $__11.hasNativeSymbol,
      setPrivate = $__11.setPrivate;
  var $__12 = Object,
      defineProperty = $__12.defineProperty,
      getOwnPropertyDescriptor = $__12.getOwnPropertyDescriptor,
      hasOwnProperty = $__12.hasOwnProperty,
      isExtensible = $__12.isExtensible;
  var deletedSentinel = {};
  var counter = 1;
  var hashCodeName = createPrivateSymbol();
  function getHashCodeForObject(obj) {
    return getPrivate(obj, hashCodeName);
  }
  function getOrSetHashCodeForObject(obj) {
    var hash = getHashCodeForObject(obj);
    if (!hash) {
      hash = counter++;
      setPrivate(obj, hashCodeName, hash);
    }
    return hash;
  }
  function lookupIndex(map, key) {
    if (typeof key === 'string') {
      return map.stringIndex_[key];
    }
    if (isObject(key)) {
      if (!isExtensible(key)) {
        return getFrozen(map.frozenData_, key);
      }
      var hc = getHashCodeForObject(key);
      if (hc === undefined) {
        return undefined;
      }
      return map.objectIndex_[hc];
    }
    return map.primitiveIndex_[key];
  }
  function initMap(map) {
    map.entries_ = [];
    map.objectIndex_ = Object.create(null);
    map.stringIndex_ = Object.create(null);
    map.primitiveIndex_ = Object.create(null);
    map.frozenData_ = [];
    map.deletedCount_ = 0;
  }
  var Map = function() {
    function Map() {
      var $__14,
          $__15;
      var iterable = arguments[0];
      if (!isObject(this))
        throw new TypeError('Map called on incompatible type');
      if (hasOwnProperty.call(this, 'entries_')) {
        throw new TypeError('Map can not be reentrantly initialised');
      }
      initMap(this);
      if (iterable !== null && iterable !== undefined) {
        var $__7 = true;
        var $__8 = false;
        var $__9 = undefined;
        try {
          for (var $__5 = void 0,
              $__4 = (iterable)[Symbol.iterator](); !($__7 = ($__5 = $__4.next()).done); $__7 = true) {
            var $__13 = $__5.value,
                key = ($__14 = $__13[Symbol.iterator](), ($__15 = $__14.next()).done ? void 0 : $__15.value),
                value = ($__15 = $__14.next()).done ? void 0 : $__15.value;
            {
              this.set(key, value);
            }
          }
        } catch ($__10) {
          $__8 = true;
          $__9 = $__10;
        } finally {
          try {
            if (!$__7 && $__4.return != null) {
              $__4.return();
            }
          } finally {
            if ($__8) {
              throw $__9;
            }
          }
        }
      }
    }
    return ($traceurRuntime.createClass)(Map, {
      get size() {
        return this.entries_.length / 2 - this.deletedCount_;
      },
      get: function(key) {
        var index = lookupIndex(this, key);
        if (index !== undefined) {
          return this.entries_[index + 1];
        }
      },
      set: function(key, value) {
        var index = lookupIndex(this, key);
        if (index !== undefined) {
          this.entries_[index + 1] = value;
        } else {
          index = this.entries_.length;
          this.entries_[index] = key;
          this.entries_[index + 1] = value;
          if (isObject(key)) {
            if (!isExtensible(key)) {
              setFrozen(this.frozenData_, key, index);
            } else {
              var hash = getOrSetHashCodeForObject(key);
              this.objectIndex_[hash] = index;
            }
          } else if (typeof key === 'string') {
            this.stringIndex_[key] = index;
          } else {
            this.primitiveIndex_[key] = index;
          }
        }
        return this;
      },
      has: function(key) {
        return lookupIndex(this, key) !== undefined;
      },
      delete: function(key) {
        var index = lookupIndex(this, key);
        if (index === undefined) {
          return false;
        }
        this.entries_[index] = deletedSentinel;
        this.entries_[index + 1] = undefined;
        this.deletedCount_++;
        if (isObject(key)) {
          if (!isExtensible(key)) {
            deleteFrozen(this.frozenData_, key);
          } else {
            var hash = getHashCodeForObject(key);
            delete this.objectIndex_[hash];
          }
        } else if (typeof key === 'string') {
          delete this.stringIndex_[key];
        } else {
          delete this.primitiveIndex_[key];
        }
        return true;
      },
      clear: function() {
        initMap(this);
      },
      forEach: function(callbackFn) {
        var thisArg = arguments[1];
        for (var i = 0; i < this.entries_.length; i += 2) {
          var key = this.entries_[i];
          var value = this.entries_[i + 1];
          if (key === deletedSentinel)
            continue;
          callbackFn.call(thisArg, value, key, this);
        }
      },
      entries: $traceurRuntime.initGeneratorFunction(function $__16() {
        var i,
            key,
            value;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                i = 0;
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = (i < this.entries_.length) ? 8 : -2;
                break;
              case 4:
                i += 2;
                $ctx.state = 12;
                break;
              case 8:
                key = this.entries_[i];
                value = this.entries_[i + 1];
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = (key === deletedSentinel) ? 4 : 6;
                break;
              case 6:
                $ctx.state = 2;
                return [key, value];
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              default:
                return $ctx.end();
            }
        }, $__16, this);
      }),
      keys: $traceurRuntime.initGeneratorFunction(function $__17() {
        var i,
            key,
            value;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                i = 0;
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = (i < this.entries_.length) ? 8 : -2;
                break;
              case 4:
                i += 2;
                $ctx.state = 12;
                break;
              case 8:
                key = this.entries_[i];
                value = this.entries_[i + 1];
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = (key === deletedSentinel) ? 4 : 6;
                break;
              case 6:
                $ctx.state = 2;
                return key;
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              default:
                return $ctx.end();
            }
        }, $__17, this);
      }),
      values: $traceurRuntime.initGeneratorFunction(function $__18() {
        var i,
            key,
            value;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                i = 0;
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = (i < this.entries_.length) ? 8 : -2;
                break;
              case 4:
                i += 2;
                $ctx.state = 12;
                break;
              case 8:
                key = this.entries_[i];
                value = this.entries_[i + 1];
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = (key === deletedSentinel) ? 4 : 6;
                break;
              case 6:
                $ctx.state = 2;
                return value;
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              default:
                return $ctx.end();
            }
        }, $__18, this);
      })
    }, {});
  }();
  defineProperty(Map.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Map.prototype.entries
  });
  function needsPolyfill(global) {
    var $__13 = global,
        Map = $__13.Map,
        Symbol = $__13.Symbol;
    if (!Map || !$traceurRuntime.hasNativeSymbol() || !Map.prototype[Symbol.iterator] || !Map.prototype.entries) {
      return true;
    }
    try {
      return new Map([[]]).size !== 1;
    } catch (e) {
      return false;
    }
  }
  function polyfillMap(global) {
    if (needsPolyfill(global)) {
      global.Map = Map;
    }
  }
  registerPolyfill(polyfillMap);
  return {
    get Map() {
      return Map;
    },
    get polyfillMap() {
      return polyfillMap;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Map.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Set.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Set.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      registerPolyfill = $__0.registerPolyfill;
  var Map = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Map.js").Map;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var Set = function() {
    function Set() {
      var iterable = arguments[0];
      if (!isObject(this))
        throw new TypeError('Set called on incompatible type');
      if (hasOwnProperty.call(this, 'map_')) {
        throw new TypeError('Set can not be reentrantly initialised');
      }
      this.map_ = new Map();
      if (iterable !== null && iterable !== undefined) {
        var $__8 = true;
        var $__9 = false;
        var $__10 = undefined;
        try {
          for (var $__6 = void 0,
              $__5 = (iterable)[Symbol.iterator](); !($__8 = ($__6 = $__5.next()).done); $__8 = true) {
            var item = $__6.value;
            {
              this.add(item);
            }
          }
        } catch ($__11) {
          $__9 = true;
          $__10 = $__11;
        } finally {
          try {
            if (!$__8 && $__5.return != null) {
              $__5.return();
            }
          } finally {
            if ($__9) {
              throw $__10;
            }
          }
        }
      }
    }
    return ($traceurRuntime.createClass)(Set, {
      get size() {
        return this.map_.size;
      },
      has: function(key) {
        return this.map_.has(key);
      },
      add: function(key) {
        this.map_.set(key, key);
        return this;
      },
      delete: function(key) {
        return this.map_.delete(key);
      },
      clear: function() {
        return this.map_.clear();
      },
      forEach: function(callbackFn) {
        var thisArg = arguments[1];
        var $__4 = this;
        return this.map_.forEach(function(value, key) {
          callbackFn.call(thisArg, key, key, $__4);
        });
      },
      values: $traceurRuntime.initGeneratorFunction(function $__14() {
        var $__15,
            $__16;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                $__15 = $ctx.wrapYieldStar(this.map_.keys()[Symbol.iterator]());
                $ctx.sent = void 0;
                $ctx.action = 'next';
                $ctx.state = 12;
                break;
              case 12:
                $__16 = $__15[$ctx.action]($ctx.sentIgnoreThrow);
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = ($__16.done) ? 3 : 2;
                break;
              case 3:
                $ctx.sent = $__16.value;
                $ctx.state = -2;
                break;
              case 2:
                $ctx.state = 12;
                return $__16.value;
              default:
                return $ctx.end();
            }
        }, $__14, this);
      }),
      entries: $traceurRuntime.initGeneratorFunction(function $__17() {
        var $__18,
            $__19;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                $__18 = $ctx.wrapYieldStar(this.map_.entries()[Symbol.iterator]());
                $ctx.sent = void 0;
                $ctx.action = 'next';
                $ctx.state = 12;
                break;
              case 12:
                $__19 = $__18[$ctx.action]($ctx.sentIgnoreThrow);
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = ($__19.done) ? 3 : 2;
                break;
              case 3:
                $ctx.sent = $__19.value;
                $ctx.state = -2;
                break;
              case 2:
                $ctx.state = 12;
                return $__19.value;
              default:
                return $ctx.end();
            }
        }, $__17, this);
      })
    }, {});
  }();
  Object.defineProperty(Set.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  Object.defineProperty(Set.prototype, 'keys', {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  function needsPolyfill(global) {
    var $__13 = global,
        Set = $__13.Set,
        Symbol = $__13.Symbol;
    if (!Set || !$traceurRuntime.hasNativeSymbol() || !Set.prototype[Symbol.iterator] || !Set.prototype.values) {
      return true;
    }
    try {
      return new Set([1]).size !== 1;
    } catch (e) {
      return false;
    }
  }
  function polyfillSet(global) {
    if (needsPolyfill(global)) {
      global.Set = Set;
    }
  }
  registerPolyfill(polyfillSet);
  return {
    get Set() {
      return Set;
    },
    get polyfillSet() {
      return polyfillSet;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Set.js" + '');
System.registerModule("traceur-runtime@0.0.93/node_modules/rsvp/lib/rsvp/asap.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/node_modules/rsvp/lib/rsvp/asap.js";
  var len = 0;
  function asap(callback, arg) {
    queue[len] = callback;
    queue[len + 1] = arg;
    len += 2;
    if (len === 2) {
      scheduleFlush();
    }
  }
  var $__default = asap;
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function() {
      channel.port2.postMessage(0);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = new Array(1000);
  function flush() {
    for (var i = 0; i < len; i += 2) {
      var callback = queue[i];
      var arg = queue[i + 1];
      callback(arg);
      queue[i] = undefined;
      queue[i + 1] = undefined;
    }
    len = 0;
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else if (isWorker) {
    scheduleFlush = useMessageChannel();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Promise.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Promise.js";
  var async = System.get("traceur-runtime@0.0.93/node_modules/rsvp/lib/rsvp/asap.js").default;
  var registerPolyfill = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js").registerPolyfill;
  var promiseRaw = {};
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function idResolveHandler(x) {
    return x;
  }
  function idRejectHandler(x) {
    throw x;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : idResolveHandler;
    var onReject = arguments[2] !== (void 0) ? arguments[2] : idRejectHandler;
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 0:
        promise.onResolve_.push(onResolve, deferred);
        promise.onReject_.push(onReject, deferred);
        break;
      case +1:
        promiseEnqueue(promise.value_, [onResolve, deferred]);
        break;
      case -1:
        promiseEnqueue(promise.value_, [onReject, deferred]);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    if (this === $Promise) {
      var promise = promiseInit(new $Promise(promiseRaw));
      return {
        promise: promise,
        resolve: function(x) {
          promiseResolve(promise, x);
        },
        reject: function(r) {
          promiseReject(promise, r);
        }
      };
    } else {
      var result = {};
      result.promise = new C(function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      });
      return result;
    }
  }
  function promiseSet(promise, status, value, onResolve, onReject) {
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = onResolve;
    promise.onReject_ = onReject;
    return promise;
  }
  function promiseInit(promise) {
    return promiseSet(promise, 0, undefined, [], []);
  }
  var Promise = function() {
    function Promise(resolver) {
      if (resolver === promiseRaw)
        return;
      if (typeof resolver !== 'function')
        throw new TypeError;
      var promise = promiseInit(this);
      try {
        resolver(function(x) {
          promiseResolve(promise, x);
        }, function(r) {
          promiseReject(promise, r);
        });
      } catch (e) {
        promiseReject(promise, e);
      }
    }
    return ($traceurRuntime.createClass)(Promise, {
      catch: function(onReject) {
        return this.then(undefined, onReject);
      },
      then: function(onResolve, onReject) {
        if (typeof onResolve !== 'function')
          onResolve = idResolveHandler;
        if (typeof onReject !== 'function')
          onReject = idRejectHandler;
        var that = this;
        var constructor = this.constructor;
        return chain(this, function(x) {
          x = promiseCoerce(constructor, x);
          return x === that ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
        }, onReject);
      }
    }, {
      resolve: function(x) {
        if (this === $Promise) {
          if (isPromise(x)) {
            return x;
          }
          return promiseSet(new $Promise(promiseRaw), +1, x);
        } else {
          return new this(function(resolve, reject) {
            resolve(x);
          });
        }
      },
      reject: function(r) {
        if (this === $Promise) {
          return promiseSet(new $Promise(promiseRaw), -1, r);
        } else {
          return new this(function(resolve, reject) {
            reject(r);
          });
        }
      },
      all: function(values) {
        var deferred = getDeferred(this);
        var resolutions = [];
        try {
          var makeCountdownFunction = function(i) {
            return function(x) {
              resolutions[i] = x;
              if (--count === 0)
                deferred.resolve(resolutions);
            };
          };
          var count = 0;
          var i = 0;
          var $__6 = true;
          var $__7 = false;
          var $__8 = undefined;
          try {
            for (var $__4 = void 0,
                $__3 = (values)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
              var value = $__4.value;
              {
                var countdownFunction = makeCountdownFunction(i);
                this.resolve(value).then(countdownFunction, function(r) {
                  deferred.reject(r);
                });
                ++i;
                ++count;
              }
            }
          } catch ($__9) {
            $__7 = true;
            $__8 = $__9;
          } finally {
            try {
              if (!$__6 && $__3.return != null) {
                $__3.return();
              }
            } finally {
              if ($__7) {
                throw $__8;
              }
            }
          }
          if (count === 0) {
            deferred.resolve(resolutions);
          }
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      },
      race: function(values) {
        var deferred = getDeferred(this);
        try {
          for (var i = 0; i < values.length; i++) {
            this.resolve(values[i]).then(function(x) {
              deferred.resolve(x);
            }, function(r) {
              deferred.reject(r);
            });
          }
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      }
    });
  }();
  var $Promise = Promise;
  var $PromiseReject = $Promise.reject;
  function promiseResolve(promise, x) {
    promiseDone(promise, +1, x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, -1, r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 0)
      return;
    promiseEnqueue(value, reactions);
    promiseSet(promise, status, value);
  }
  function promiseEnqueue(value, tasks) {
    async(function() {
      for (var i = 0; i < tasks.length; i += 2) {
        promiseHandle(value, tasks[i], tasks[i + 1]);
      }
    });
  }
  function promiseHandle(value, handler, deferred) {
    try {
      var result = handler(value);
      if (result === deferred.promise)
        throw new TypeError;
      else if (isPromise(result))
        chain(result, deferred.resolve, deferred.reject);
      else
        deferred.resolve(result);
    } catch (e) {
      try {
        deferred.reject(e);
      } catch (e) {}
    }
  }
  var thenableSymbol = '@@thenable';
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function promiseCoerce(constructor, x) {
    if (!isPromise(x) && isObject(x)) {
      var then;
      try {
        then = x.then;
      } catch (r) {
        var promise = $PromiseReject.call(constructor, r);
        x[thenableSymbol] = promise;
        return promise;
      }
      if (typeof then === 'function') {
        var p = x[thenableSymbol];
        if (p) {
          return p;
        } else {
          var deferred = getDeferred(constructor);
          x[thenableSymbol] = deferred.promise;
          try {
            then.call(x, deferred.resolve, deferred.reject);
          } catch (r) {
            deferred.reject(r);
          }
          return deferred.promise;
        }
      }
    }
    return x;
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  registerPolyfill(polyfillPromise);
  return {
    get Promise() {
      return Promise;
    },
    get polyfillPromise() {
      return polyfillPromise;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Promise.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/StringIterator.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/StringIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      createIteratorResultObject = $__0.createIteratorResultObject,
      isObject = $__0.isObject;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var iteratedString = Symbol('iteratedString');
  var stringIteratorNextIndex = Symbol('stringIteratorNextIndex');
  var StringIterator = function() {
    var $__3;
    function StringIterator() {}
    return ($traceurRuntime.createClass)(StringIterator, ($__3 = {}, Object.defineProperty($__3, "next", {
      value: function() {
        var o = this;
        if (!isObject(o) || !hasOwnProperty.call(o, iteratedString)) {
          throw new TypeError('this must be a StringIterator object');
        }
        var s = o[iteratedString];
        if (s === undefined) {
          return createIteratorResultObject(undefined, true);
        }
        var position = o[stringIteratorNextIndex];
        var len = s.length;
        if (position >= len) {
          o[iteratedString] = undefined;
          return createIteratorResultObject(undefined, true);
        }
        var first = s.charCodeAt(position);
        var resultString;
        if (first < 0xD800 || first > 0xDBFF || position + 1 === len) {
          resultString = String.fromCharCode(first);
        } else {
          var second = s.charCodeAt(position + 1);
          if (second < 0xDC00 || second > 0xDFFF) {
            resultString = String.fromCharCode(first);
          } else {
            resultString = String.fromCharCode(first) + String.fromCharCode(second);
          }
        }
        o[stringIteratorNextIndex] = position + resultString.length;
        return createIteratorResultObject(resultString, false);
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), Object.defineProperty($__3, Symbol.iterator, {
      value: function() {
        return this;
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), $__3), {});
  }();
  function createStringIterator(string) {
    var s = String(string);
    var iterator = Object.create(StringIterator.prototype);
    iterator[iteratedString] = s;
    iterator[stringIteratorNextIndex] = 0;
    return iterator;
  }
  return {get createStringIterator() {
      return createStringIterator;
    }};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/String.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/String.js";
  var createStringIterator = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/StringIterator.js").createStringIterator;
  var $__1 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill;
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function includes(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    if (search && $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (pos != pos) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    if (searchLength + start > stringLength) {
      return false;
    }
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint(_) {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  function stringPrototypeIterator() {
    var o = $traceurRuntime.checkObjectCoercible(this);
    var s = String(o);
    return createStringIterator(s);
  }
  function polyfillString(global) {
    var String = global.String;
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'endsWith', endsWith, 'includes', includes, 'repeat', repeat, 'startsWith', startsWith]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
    maybeAddIterator(String.prototype, stringPrototypeIterator, Symbol);
  }
  registerPolyfill(polyfillString);
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get includes() {
      return includes;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    },
    get stringPrototypeIterator() {
      return stringPrototypeIterator;
    },
    get polyfillString() {
      return polyfillString;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/String.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/ArrayIterator.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/ArrayIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      toObject = $__0.toObject,
      toUint32 = $__0.toUint32,
      createIteratorResultObject = $__0.createIteratorResultObject;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function() {
    var $__3;
    function ArrayIterator() {}
    return ($traceurRuntime.createClass)(ArrayIterator, ($__3 = {}, Object.defineProperty($__3, "next", {
      value: function() {
        var iterator = toObject(this);
        var array = iterator.iteratorObject_;
        if (!array) {
          throw new TypeError('Object is not an ArrayIterator');
        }
        var index = iterator.arrayIteratorNextIndex_;
        var itemKind = iterator.arrayIterationKind_;
        var length = toUint32(array.length);
        if (index >= length) {
          iterator.arrayIteratorNextIndex_ = Infinity;
          return createIteratorResultObject(undefined, true);
        }
        iterator.arrayIteratorNextIndex_ = index + 1;
        if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
          return createIteratorResultObject(array[index], false);
        if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
          return createIteratorResultObject([index, array[index]], false);
        return createIteratorResultObject(index, false);
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), Object.defineProperty($__3, Symbol.iterator, {
      value: function() {
        return this;
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), $__3), {});
  }();
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Array.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Array.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/ArrayIterator.js"),
      entries = $__0.entries,
      keys = $__0.keys,
      jsValues = $__0.values;
  var $__1 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      checkIterable = $__1.checkIterable,
      isCallable = $__1.isCallable,
      isConstructor = $__1.isConstructor,
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill,
      toInteger = $__1.toInteger,
      toLength = $__1.toLength,
      toObject = $__1.toObject;
  function from(arrLike) {
    var mapFn = arguments[1];
    var thisArg = arguments[2];
    var C = this;
    var items = toObject(arrLike);
    var mapping = mapFn !== undefined;
    var k = 0;
    var arr,
        len;
    if (mapping && !isCallable(mapFn)) {
      throw TypeError();
    }
    if (checkIterable(items)) {
      arr = isConstructor(C) ? new C() : [];
      var $__6 = true;
      var $__7 = false;
      var $__8 = undefined;
      try {
        for (var $__4 = void 0,
            $__3 = (items)[Symbol.iterator](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
          var item = $__4.value;
          {
            if (mapping) {
              arr[k] = mapFn.call(thisArg, item, k);
            } else {
              arr[k] = item;
            }
            k++;
          }
        }
      } catch ($__9) {
        $__7 = true;
        $__8 = $__9;
      } finally {
        try {
          if (!$__6 && $__3.return != null) {
            $__3.return();
          }
        } finally {
          if ($__7) {
            throw $__8;
          }
        }
      }
      arr.length = k;
      return arr;
    }
    len = toLength(items.length);
    arr = isConstructor(C) ? new C(len) : new Array(len);
    for (; k < len; k++) {
      if (mapping) {
        arr[k] = typeof thisArg === 'undefined' ? mapFn(items[k], k) : mapFn.call(thisArg, items[k], k);
      } else {
        arr[k] = items[k];
      }
    }
    arr.length = len;
    return arr;
  }
  function of() {
    for (var items = [],
        $__10 = 0; $__10 < arguments.length; $__10++)
      items[$__10] = arguments[$__10];
    var C = this;
    var len = items.length;
    var arr = isConstructor(C) ? new C(len) : new Array(len);
    for (var k = 0; k < len; k++) {
      arr[k] = items[k];
    }
    arr.length = len;
    return arr;
  }
  function fill(value) {
    var start = arguments[1] !== (void 0) ? arguments[1] : 0;
    var end = arguments[2];
    var object = toObject(this);
    var len = toLength(object.length);
    var fillStart = toInteger(start);
    var fillEnd = end !== undefined ? toInteger(end) : len;
    fillStart = fillStart < 0 ? Math.max(len + fillStart, 0) : Math.min(fillStart, len);
    fillEnd = fillEnd < 0 ? Math.max(len + fillEnd, 0) : Math.min(fillEnd, len);
    while (fillStart < fillEnd) {
      object[fillStart] = value;
      fillStart++;
    }
    return object;
  }
  function find(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg);
  }
  function findIndex(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg, true);
  }
  function findHelper(self, predicate) {
    var thisArg = arguments[2];
    var returnIndex = arguments[3] !== (void 0) ? arguments[3] : false;
    var object = toObject(self);
    var len = toLength(object.length);
    if (!isCallable(predicate)) {
      throw TypeError();
    }
    for (var i = 0; i < len; i++) {
      var value = object[i];
      if (predicate.call(thisArg, value, i, object)) {
        return returnIndex ? i : value;
      }
    }
    return returnIndex ? -1 : undefined;
  }
  function polyfillArray(global) {
    var $__11 = global,
        Array = $__11.Array,
        Object = $__11.Object,
        Symbol = $__11.Symbol;
    var values = jsValues;
    if (Symbol && Symbol.iterator && Array.prototype[Symbol.iterator]) {
      values = Array.prototype[Symbol.iterator];
    }
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values, 'fill', fill, 'find', find, 'findIndex', findIndex]);
    maybeAddFunctions(Array, ['from', from, 'of', of]);
    maybeAddIterator(Array.prototype, values, Symbol);
    maybeAddIterator(Object.getPrototypeOf([].values()), function() {
      return this;
    }, Symbol);
  }
  registerPolyfill(polyfillArray);
  return {
    get from() {
      return from;
    },
    get of() {
      return of;
    },
    get fill() {
      return fill;
    },
    get find() {
      return find;
    },
    get findIndex() {
      return findIndex;
    },
    get polyfillArray() {
      return polyfillArray;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Array.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Object.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Object.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill;
  var $__2 = Object,
      defineProperty = $__2.defineProperty,
      getOwnPropertyDescriptor = $__2.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__2.getOwnPropertyNames,
      keys = $__2.keys;
  function is(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    return left !== left && right !== right;
  }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      var props = source == null ? [] : keys(source);
      var p = void 0,
          length = props.length;
      for (p = 0; p < length; p++) {
        var name = props[p];
        target[name] = source[name];
      }
    }
    return target;
  }
  function mixin(target, source) {
    var props = getOwnPropertyNames(source);
    var p,
        descriptor,
        length = props.length;
    for (p = 0; p < length; p++) {
      var name = props[p];
      descriptor = getOwnPropertyDescriptor(source, props[p]);
      defineProperty(target, props[p], descriptor);
    }
    return target;
  }
  function polyfillObject(global) {
    var Object = global.Object;
    maybeAddFunctions(Object, ['assign', assign, 'is', is, 'mixin', mixin]);
  }
  registerPolyfill(polyfillObject);
  return {
    get is() {
      return is;
    },
    get assign() {
      return assign;
    },
    get mixin() {
      return mixin;
    },
    get polyfillObject() {
      return polyfillObject;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Object.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Number.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Number.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      isNumber = $__0.isNumber,
      maybeAddConsts = $__0.maybeAddConsts,
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill,
      toInteger = $__0.toInteger;
  var $abs = Math.abs;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -Math.pow(2, 53) + 1;
  var EPSILON = Math.pow(2, -52);
  function NumberIsFinite(number) {
    return isNumber(number) && $isFinite(number);
  }
  function isInteger(number) {
    return NumberIsFinite(number) && toInteger(number) === number;
  }
  function NumberIsNaN(number) {
    return isNumber(number) && $isNaN(number);
  }
  function isSafeInteger(number) {
    if (NumberIsFinite(number)) {
      var integral = toInteger(number);
      if (integral === number)
        return $abs(integral) <= MAX_SAFE_INTEGER;
    }
    return false;
  }
  function polyfillNumber(global) {
    var Number = global.Number;
    maybeAddConsts(Number, ['MAX_SAFE_INTEGER', MAX_SAFE_INTEGER, 'MIN_SAFE_INTEGER', MIN_SAFE_INTEGER, 'EPSILON', EPSILON]);
    maybeAddFunctions(Number, ['isFinite', NumberIsFinite, 'isInteger', isInteger, 'isNaN', NumberIsNaN, 'isSafeInteger', isSafeInteger]);
  }
  registerPolyfill(polyfillNumber);
  return {
    get MAX_SAFE_INTEGER() {
      return MAX_SAFE_INTEGER;
    },
    get MIN_SAFE_INTEGER() {
      return MIN_SAFE_INTEGER;
    },
    get EPSILON() {
      return EPSILON;
    },
    get isFinite() {
      return NumberIsFinite;
    },
    get isInteger() {
      return isInteger;
    },
    get isNaN() {
      return NumberIsNaN;
    },
    get isSafeInteger() {
      return isSafeInteger;
    },
    get polyfillNumber() {
      return polyfillNumber;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Number.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/fround.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/fround.js";
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $__1 = Math,
      LN2 = $__1.LN2,
      abs = $__1.abs,
      floor = $__1.floor,
      log = $__1.log,
      min = $__1.min,
      pow = $__1.pow;
  function packIEEE754(v, ebits, fbits) {
    var bias = (1 << (ebits - 1)) - 1,
        s,
        e,
        f,
        ln,
        i,
        bits,
        str,
        bytes;
    function roundToEven(n) {
      var w = floor(n),
          f = n - w;
      if (f < 0.5)
        return w;
      if (f > 0.5)
        return w + 1;
      return w % 2 ? w + 1 : w;
    }
    if (v !== v) {
      e = (1 << ebits) - 1;
      f = pow(2, fbits - 1);
      s = 0;
    } else if (v === Infinity || v === -Infinity) {
      e = (1 << ebits) - 1;
      f = 0;
      s = (v < 0) ? 1 : 0;
    } else if (v === 0) {
      e = 0;
      f = 0;
      s = (1 / v === -Infinity) ? 1 : 0;
    } else {
      s = v < 0;
      v = abs(v);
      if (v >= pow(2, 1 - bias)) {
        e = min(floor(log(v) / LN2), 1023);
        f = roundToEven(v / pow(2, e) * pow(2, fbits));
        if (f / pow(2, fbits) >= 2) {
          e = e + 1;
          f = 1;
        }
        if (e > bias) {
          e = (1 << ebits) - 1;
          f = 0;
        } else {
          e = e + bias;
          f = f - pow(2, fbits);
        }
      } else {
        e = 0;
        f = roundToEven(v / pow(2, 1 - bias - fbits));
      }
    }
    bits = [];
    for (i = fbits; i; i -= 1) {
      bits.push(f % 2 ? 1 : 0);
      f = floor(f / 2);
    }
    for (i = ebits; i; i -= 1) {
      bits.push(e % 2 ? 1 : 0);
      e = floor(e / 2);
    }
    bits.push(s ? 1 : 0);
    bits.reverse();
    str = bits.join('');
    bytes = [];
    while (str.length) {
      bytes.push(parseInt(str.substring(0, 8), 2));
      str = str.substring(8);
    }
    return bytes;
  }
  function unpackIEEE754(bytes, ebits, fbits) {
    var bits = [],
        i,
        j,
        b,
        str,
        bias,
        s,
        e,
        f;
    for (i = bytes.length; i; i -= 1) {
      b = bytes[i - 1];
      for (j = 8; j; j -= 1) {
        bits.push(b % 2 ? 1 : 0);
        b = b >> 1;
      }
    }
    bits.reverse();
    str = bits.join('');
    bias = (1 << (ebits - 1)) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);
    if (e === (1 << ebits) - 1) {
      return f !== 0 ? NaN : s * Infinity;
    } else if (e > 0) {
      return s * pow(2, e - bias) * (1 + f / pow(2, fbits));
    } else if (f !== 0) {
      return s * pow(2, -(bias - 1)) * (f / pow(2, fbits));
    } else {
      return s < 0 ? -0 : 0;
    }
  }
  function unpackF32(b) {
    return unpackIEEE754(b, 8, 23);
  }
  function packF32(v) {
    return packIEEE754(v, 8, 23);
  }
  function fround(x) {
    if (x === 0 || !$isFinite(x) || $isNaN(x)) {
      return x;
    }
    return unpackF32(packF32(Number(x)));
  }
  return {get fround() {
      return fround;
    }};
});
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/Math.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/Math.js";
  var jsFround = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/fround.js").fround;
  var $__1 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      registerPolyfill = $__1.registerPolyfill,
      toUint32 = $__1.toUint32;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $__3 = Math,
      abs = $__3.abs,
      ceil = $__3.ceil,
      exp = $__3.exp,
      floor = $__3.floor,
      log = $__3.log,
      pow = $__3.pow,
      sqrt = $__3.sqrt;
  function clz32(x) {
    x = toUint32(+x);
    if (x == 0)
      return 32;
    var result = 0;
    if ((x & 0xFFFF0000) === 0) {
      x <<= 16;
      result += 16;
    }
    ;
    if ((x & 0xFF000000) === 0) {
      x <<= 8;
      result += 8;
    }
    ;
    if ((x & 0xF0000000) === 0) {
      x <<= 4;
      result += 4;
    }
    ;
    if ((x & 0xC0000000) === 0) {
      x <<= 2;
      result += 2;
    }
    ;
    if ((x & 0x80000000) === 0) {
      x <<= 1;
      result += 1;
    }
    ;
    return result;
  }
  function imul(x, y) {
    x = toUint32(+x);
    y = toUint32(+y);
    var xh = (x >>> 16) & 0xffff;
    var xl = x & 0xffff;
    var yh = (y >>> 16) & 0xffff;
    var yl = y & 0xffff;
    return xl * yl + (((xh * yl + xl * yh) << 16) >>> 0) | 0;
  }
  function sign(x) {
    x = +x;
    if (x > 0)
      return 1;
    if (x < 0)
      return -1;
    return x;
  }
  function log10(x) {
    return log(x) * 0.434294481903251828;
  }
  function log2(x) {
    return log(x) * 1.442695040888963407;
  }
  function log1p(x) {
    x = +x;
    if (x < -1 || $isNaN(x)) {
      return NaN;
    }
    if (x === 0 || x === Infinity) {
      return x;
    }
    if (x === -1) {
      return -Infinity;
    }
    var result = 0;
    var n = 50;
    if (x < 0 || x > 1) {
      return log(1 + x);
    }
    for (var i = 1; i < n; i++) {
      if ((i % 2) === 0) {
        result -= pow(x, i) / i;
      } else {
        result += pow(x, i) / i;
      }
    }
    return result;
  }
  function expm1(x) {
    x = +x;
    if (x === -Infinity) {
      return -1;
    }
    if (!$isFinite(x) || x === 0) {
      return x;
    }
    return exp(x) - 1;
  }
  function cosh(x) {
    x = +x;
    if (x === 0) {
      return 1;
    }
    if ($isNaN(x)) {
      return NaN;
    }
    if (!$isFinite(x)) {
      return Infinity;
    }
    if (x < 0) {
      x = -x;
    }
    if (x > 21) {
      return exp(x) / 2;
    }
    return (exp(x) + exp(-x)) / 2;
  }
  function sinh(x) {
    x = +x;
    if (!$isFinite(x) || x === 0) {
      return x;
    }
    return (exp(x) - exp(-x)) / 2;
  }
  function tanh(x) {
    x = +x;
    if (x === 0)
      return x;
    if (!$isFinite(x))
      return sign(x);
    var exp1 = exp(x);
    var exp2 = exp(-x);
    return (exp1 - exp2) / (exp1 + exp2);
  }
  function acosh(x) {
    x = +x;
    if (x < 1)
      return NaN;
    if (!$isFinite(x))
      return x;
    return log(x + sqrt(x + 1) * sqrt(x - 1));
  }
  function asinh(x) {
    x = +x;
    if (x === 0 || !$isFinite(x))
      return x;
    if (x > 0)
      return log(x + sqrt(x * x + 1));
    return -log(-x + sqrt(x * x + 1));
  }
  function atanh(x) {
    x = +x;
    if (x === -1) {
      return -Infinity;
    }
    if (x === 1) {
      return Infinity;
    }
    if (x === 0) {
      return x;
    }
    if ($isNaN(x) || x < -1 || x > 1) {
      return NaN;
    }
    return 0.5 * log((1 + x) / (1 - x));
  }
  function hypot(x, y) {
    var length = arguments.length;
    var args = new Array(length);
    var max = 0;
    for (var i = 0; i < length; i++) {
      var n = arguments[i];
      n = +n;
      if (n === Infinity || n === -Infinity)
        return Infinity;
      n = abs(n);
      if (n > max)
        max = n;
      args[i] = n;
    }
    if (max === 0)
      max = 1;
    var sum = 0;
    var compensation = 0;
    for (var i = 0; i < length; i++) {
      var n = args[i] / max;
      var summand = n * n - compensation;
      var preliminary = sum + summand;
      compensation = (preliminary - sum) - summand;
      sum = preliminary;
    }
    return sqrt(sum) * max;
  }
  function trunc(x) {
    x = +x;
    if (x > 0)
      return floor(x);
    if (x < 0)
      return ceil(x);
    return x;
  }
  var fround,
      f32;
  if (typeof Float32Array === 'function') {
    f32 = new Float32Array(1);
    fround = function(x) {
      f32[0] = Number(x);
      return f32[0];
    };
  } else {
    fround = jsFround;
  }
  function cbrt(x) {
    x = +x;
    if (x === 0)
      return x;
    var negate = x < 0;
    if (negate)
      x = -x;
    var result = pow(x, 1 / 3);
    return negate ? -result : result;
  }
  function polyfillMath(global) {
    var Math = global.Math;
    maybeAddFunctions(Math, ['acosh', acosh, 'asinh', asinh, 'atanh', atanh, 'cbrt', cbrt, 'clz32', clz32, 'cosh', cosh, 'expm1', expm1, 'fround', fround, 'hypot', hypot, 'imul', imul, 'log10', log10, 'log1p', log1p, 'log2', log2, 'sign', sign, 'sinh', sinh, 'tanh', tanh, 'trunc', trunc]);
  }
  registerPolyfill(polyfillMath);
  return {
    get clz32() {
      return clz32;
    },
    get imul() {
      return imul;
    },
    get sign() {
      return sign;
    },
    get log10() {
      return log10;
    },
    get log2() {
      return log2;
    },
    get log1p() {
      return log1p;
    },
    get expm1() {
      return expm1;
    },
    get cosh() {
      return cosh;
    },
    get sinh() {
      return sinh;
    },
    get tanh() {
      return tanh;
    },
    get acosh() {
      return acosh;
    },
    get asinh() {
      return asinh;
    },
    get atanh() {
      return atanh;
    },
    get hypot() {
      return hypot;
    },
    get trunc() {
      return trunc;
    },
    get fround() {
      return fround;
    },
    get cbrt() {
      return cbrt;
    },
    get polyfillMath() {
      return polyfillMath;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/Math.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/WeakMap.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/WeakMap.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/frozen-data.js"),
      deleteFrozen = $__0.deleteFrozen,
      getFrozen = $__0.getFrozen,
      hasFrozen = $__0.hasFrozen,
      setFrozen = $__0.setFrozen;
  var $__1 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      isObject = $__1.isObject,
      registerPolyfill = $__1.registerPolyfill;
  var $__4 = Object,
      defineProperty = $__4.defineProperty,
      getOwnPropertyDescriptor = $__4.getOwnPropertyDescriptor,
      isExtensible = $__4.isExtensible;
  var $__5 = $traceurRuntime,
      createPrivateSymbol = $__5.createPrivateSymbol,
      deletePrivate = $__5.deletePrivate,
      getPrivate = $__5.getPrivate,
      hasNativeSymbol = $__5.hasNativeSymbol,
      hasPrivate = $__5.hasPrivate,
      setPrivate = $__5.setPrivate;
  var $TypeError = TypeError;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var sentinel = {};
  var WeakMap = function() {
    function WeakMap() {
      this.name_ = createPrivateSymbol();
      this.frozenData_ = [];
    }
    return ($traceurRuntime.createClass)(WeakMap, {
      set: function(key, value) {
        if (!isObject(key))
          throw new $TypeError('key must be an object');
        if (!isExtensible(key)) {
          setFrozen(this.frozenData_, key, value);
        } else {
          setPrivate(key, this.name_, value);
        }
        return this;
      },
      get: function(key) {
        if (!isObject(key))
          return undefined;
        if (!isExtensible(key)) {
          return getFrozen(this.frozenData_, key);
        }
        return getPrivate(key, this.name_);
      },
      delete: function(key) {
        if (!isObject(key))
          return false;
        if (!isExtensible(key)) {
          return deleteFrozen(this.frozenData_, key);
        }
        return deletePrivate(key, this.name_);
      },
      has: function(key) {
        if (!isObject(key))
          return false;
        if (!isExtensible(key)) {
          return hasFrozen(this.frozenData_, key);
        }
        return hasPrivate(key, this.name_);
      }
    }, {});
  }();
  function needsPolyfill(global) {
    var $__7 = global,
        WeakMap = $__7.WeakMap,
        Symbol = $__7.Symbol;
    if (!WeakMap || !hasNativeSymbol()) {
      return true;
    }
    try {
      var o = {};
      var wm = new WeakMap([[o, false]]);
      return wm.get(o);
    } catch (e) {
      return false;
    }
  }
  function polyfillWeakMap(global) {
    if (needsPolyfill(global)) {
      global.WeakMap = WeakMap;
    }
  }
  registerPolyfill(polyfillWeakMap);
  return {
    get WeakMap() {
      return WeakMap;
    },
    get polyfillWeakMap() {
      return polyfillWeakMap;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/WeakMap.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/WeakSet.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/WeakSet.js";
  var $__0 = System.get("traceur-runtime@0.0.93/src/runtime/frozen-data.js"),
      deleteFrozen = $__0.deleteFrozen,
      getFrozen = $__0.getFrozen,
      setFrozen = $__0.setFrozen;
  var $__1 = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js"),
      isObject = $__1.isObject,
      registerPolyfill = $__1.registerPolyfill;
  var $__4 = Object,
      defineProperty = $__4.defineProperty,
      isExtensible = $__4.isExtensible;
  var $__5 = $traceurRuntime,
      createPrivateSymbol = $__5.createPrivateSymbol,
      deletePrivate = $__5.deletePrivate,
      getPrivate = $__5.getPrivate,
      hasNativeSymbol = $__5.hasNativeSymbol,
      hasPrivate = $__5.hasPrivate,
      setPrivate = $__5.setPrivate;
  var $TypeError = TypeError;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var WeakSet = function() {
    function WeakSet() {
      this.name_ = createPrivateSymbol();
      this.frozenData_ = [];
    }
    return ($traceurRuntime.createClass)(WeakSet, {
      add: function(value) {
        if (!isObject(value))
          throw new $TypeError('value must be an object');
        if (!isExtensible(value)) {
          setFrozen(this.frozenData_, value, value);
        } else {
          setPrivate(value, this.name_, true);
        }
        return this;
      },
      delete: function(value) {
        if (!isObject(value))
          return false;
        if (!isExtensible(value)) {
          return deleteFrozen(this.frozenData_, value);
        }
        return deletePrivate(value, this.name_);
      },
      has: function(value) {
        if (!isObject(value))
          return false;
        if (!isExtensible(value)) {
          return getFrozen(this.frozenData_, value) === value;
        }
        return hasPrivate(value, this.name_);
      }
    }, {});
  }();
  function needsPolyfill(global) {
    var $__7 = global,
        WeakSet = $__7.WeakSet,
        Symbol = $__7.Symbol;
    if (!WeakSet || !hasNativeSymbol()) {
      return true;
    }
    try {
      var o = {};
      var wm = new WeakSet([[o]]);
      return !wm.has(o);
    } catch (e) {
      return false;
    }
  }
  function polyfillWeakSet(global) {
    if (needsPolyfill(global)) {
      global.WeakSet = WeakSet;
    }
  }
  registerPolyfill(polyfillWeakSet);
  return {
    get WeakSet() {
      return WeakSet;
    },
    get polyfillWeakSet() {
      return polyfillWeakSet;
    }
  };
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/WeakSet.js" + '');
System.registerModule("traceur-runtime@0.0.93/src/runtime/polyfills/polyfills.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.93/src/runtime/polyfills/polyfills.js";
  var polyfillAll = System.get("traceur-runtime@0.0.93/src/runtime/polyfills/utils.js").polyfillAll;
  polyfillAll(Reflect.global);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfillAll(global);
  };
  return {};
});
System.get("traceur-runtime@0.0.93/src/runtime/polyfills/polyfills.js" + '');

System = curSystem; })();
!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in p||(p[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==v.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=p[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(v.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=p[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return x[e]||(x[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return t.locked=!1,r},r.name);t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=p[s],v=x[s];v?l=v.exports:c&&!c.declarative?l=c.esModule:c?(d(c),v=c.module,l=v.exports):l=f(s),v&&v.importers?(v.importers.push(t),t.dependencies.push(v)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=p[e];if(t)t.declarative?c(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=f(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=p[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){if(r===e)return r;var t={};if("object"==typeof r||"function"==typeof r)if(g){var n;for(var o in r)(n=Object.getOwnPropertyDescriptor(r,o))&&h(t,o,n)}else{var a=r&&r.hasOwnProperty;for(var o in r)(!a||r.hasOwnProperty(o))&&(t[o]=r[o])}return t["default"]=r,h(t,"__useDefault",{value:!0}),t}function c(r,t){var n=p[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==v.call(t,u)&&(p[u]?c(u,t):f(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function f(e){if(D[e])return D[e];if("@node/"==e.substr(0,6))return y(e.substr(6));var r=p[e];if(!r)throw"Module "+e+" not present.";return a(e),c(e,[]),p[e]=void 0,r.declarative&&h(r.module.exports,"__esModule",{value:!0}),D[e]=r.declarative?r.module.exports:r.esModule}var p={},v=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},g=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(m){g=!1}var h;!function(){try{Object.defineProperty({},"a",{})&&(h=Object.defineProperty)}catch(e){h=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var x={},y="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,D={"@empty":{}};return function(e,n,o){return function(a){a(function(a){for(var u={_nodeRequire:y,register:r,registerDynamic:t,get:f,set:function(e,r){D[e]=r},newModule:function(e){return e}},d=0;d<n.length;d++)(function(e,r){r&&r.__esModule?D[e]=r:D[e]=s(r)})(n[d],arguments[d]);o(u);var i=f(e[0]);if(e.length>1)for(var d=1;d<e.length;d++)f(e[d]);return i.__useDefault?i["default"]:i})}}}("undefined"!=typeof self?self:global)

(["1"], [], function($__System) {

!function(){var t=$__System;if("undefined"!=typeof window&&"undefined"!=typeof document&&window.location)var s=location.protocol+"//"+location.hostname+(location.port?":"+location.port:"");t.set("@@cjs-helpers",t.newModule({getPathVars:function(t){var n,o=t.lastIndexOf("!");n=-1!=o?t.substr(0,o):t;var e=n.split("/");return e.pop(),e=e.join("/"),"file:///"==n.substr(0,8)?(n=n.substr(7),e=e.substr(7),isWindows&&(n=n.substr(1),e=e.substr(1))):s&&n.substr(0,s.length)===s&&(n=n.substr(s.length),e=e.substr(s.length)),{filename:n,dirname:e}}}))}();
!function(e){function n(e,n){e=e.replace(l,"");var r=e.match(s),i=(r[1].split(",")[n]||"require").replace(p,""),t=c[i]||(c[i]=new RegExp(u+i+a,"g"));t.lastIndex=0;for(var o,f=[];o=t.exec(e);)f.push(o[2]||o[3]);return f}function r(e,n,i,t){if("object"==typeof e&&!(e instanceof Array))return r.apply(null,Array.prototype.splice.call(arguments,1,arguments.length-1));if("string"==typeof e&&"function"==typeof n&&(e=[e]),!(e instanceof Array)){if("string"==typeof e){var f=o.get(e);return f.__useDefault?f["default"]:f}throw new TypeError("Invalid require")}for(var l=[],u=0;u<e.length;u++)l.push(o["import"](e[u],t));Promise.all(l).then(function(e){n&&n.apply(null,e)},i)}function i(i,t,l){"string"!=typeof i&&(l=t,t=i,i=null),t instanceof Array||(l=t,t=["require","exports","module"].splice(0,l.length)),"function"!=typeof l&&(l=function(e){return function(){return e}}(l)),void 0===t[t.length-1]&&t.pop();var u,a,s;-1!=(u=f.call(t,"require"))&&(t.splice(u,1),i||(t=t.concat(n(l.toString(),u)))),-1!=(a=f.call(t,"exports"))&&t.splice(a,1),-1!=(s=f.call(t,"module"))&&t.splice(s,1);var p={name:i,deps:t,execute:function(n,i,f){for(var p=[],c=0;c<t.length;c++)p.push(n(t[c]));f.uri=f.id,f.config=function(){},-1!=s&&p.splice(s,0,f),-1!=a&&p.splice(a,0,i),-1!=u&&p.splice(u,0,function(e,i,t){return"string"==typeof e&&"function"!=typeof i?n(e):r.call(o,e,i,t,f.id)});var d=l.apply(-1==a?e:i,p);return"undefined"==typeof d&&f&&(d=f.exports),"undefined"!=typeof d?d:void 0}};if(i)d.anonDefine||d.isBundle?(d.anonDefine&&d.anonDefine.name&&o.registerDynamic(d.anonDefine.name,d.anonDefine.deps,!1,d.anonDefine.execute),d.anonDefine=null):d.anonDefine=p,d.isBundle=!0,o.registerDynamic(i,p.deps,!1,p.execute);else{if(d.anonDefine)throw new TypeError("Multiple defines for anonymous module");d.anonDefine=p}}function t(n){d.anonDefine=null,d.isBundle=!1;var r=e.module,t=e.exports,o=e.define;return e.module=void 0,e.exports=void 0,e.define=i,function(){e.define=o,e.module=r,e.exports=t}}var o=$__System,f=Array.prototype.indexOf||function(e){for(var n=0,r=this.length;r>n;n++)if(this[n]===e)return n;return-1},l=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm,u="(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])",a="\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)",s=/\(([^\)]*)\)/,p=/^\s+|\s+$/g,c={};i.amd={};var d={isBundle:!1,anonDefine:null};o.set("@@amd-helpers",o.newModule({createDefine:t,require:r,define:i,lastModule:d})),o.amdDefine=i,o.amdRequire=r}("undefined"!=typeof self?self:global);
$__System.register("2", [], function() { return { setters: [], execute: function() {} } });

$__System.registerDynamic("3", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<nav class=\"#3e2723 brown darken-4\" role=\"navigation\">\n  <div class=\"nav-wrapper container\">\n    <a id=\"logo-container\" href=\"/#home\" class=\"brand-logo\">\n      <span><img class=\"responsive-img\" src=\"img/WhiteSaveMe_Logo_VF.png\"></span>\n      </a>\n    <ul class=\"right hide-on-med-and-down\">\n      <li each=\"{ opts.siteMenu }\"><a href=\"#{ slug }\">{ name }</a></li>\n    </ul>\n\n    <ul id=\"nav-mobile\" class=\"side-nav\">\n      <li each=\"{ opts.siteMenu }\"><a href=\"#{ slug }\">{ name }</a></li>\n    </ul>\n    <a href=\"#\" data-activates=\"nav-mobile\" class=\"button-collapse\"><i class=\"mdi-navigation-menu\"></i></a>\n  </div>\n</nav>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<footer class=\"page-footer #795548 brown\">\n  <div class=\"container\">\n\t<div class=\"row\">\n      <div class=\"col s10 m6 l6\">\n        <h5 class=\"white-text\">Our solution</h5>\n\n        <p class=\"grey-text text-lighten-4\">We match the privileged and the under-privileged in a sustainable and profitable way that fully achieves the coveted and elusive triple bottom line: people, profit, planet.</p>\n\t  </div>\n\t<div class=\"col s6 m3 l3\">\n    <h5 class=\"white-text\">Learn more</h5>\n    <ul>\n    <li><a class=\"white-text\" href=\"#how\">how it works</a></li>\n    <li><a class=\"white-text\" href=\"#story\">our story</a></li>\n    <li><a class=\"white-text\" href=\"#faq\">FAQs</a></li>\n    <li><a class=\"white-text\" href=\"#partners\">partners</a></li>\n    <li><a class=\"white-text\" href=\"#terms\">terms</a></li>\n    </ul>\n    </div>\n\n    <div class=\"col s6 m3 l3\">\n    <h5 class=\"white-text\">Connect</h5>\n       <ul>\n         <li><a class=\"white-text\" href=\"http://facebook.com/whitesaveme\">facebook</a></li>\n         <li><a class=\"white-text\" href=\"http://twitter.com/whitesaveme\">twitter</a></li>\n         <li><a class=\"white-text\" href=\"#contact\">contact us</a></li>\n         <li><a class=\"white-text\" href=\"#release\">press release</a></li>\n       </ul>\n    </div>\n   </div>\n\n\n   <div class=\"row\">\n   \t\t<div class=\"col l2 m2 s4\">\n\t\t<img class=\"responsive-img\" src=\"img/whitesave_awards-01.png\">\n    \t</div>\n        <div class=\"col l2 m2 s4\">\n\t\t<img class=\"responsive-img\" src=\"img/whitesave_awards-02.png\">\n     \t</div>\n   </div>\n </div>\n\n <div class=\"footer-copyright\">\n    <div class=\"container\">\n      WhiteSave.me <a class=\"#3e2723\" href=\"#statement\">Artistic Statement</a>\n    </div>\n </div>\n</footer>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"m12 title\">Check your privilege!</h2>\n      </span>\n    </div>\n  </div>\n</div>\n\n<div class=\"container\">\n  <div class=\"section no-pad-bot\" id=\"index-banner\">\n    <div class=\"col m12 s12\">\n\n      <div class=\"row\">\n        <div class=\"col m12 s12 light\">\n          <p></p><div class=\"rich-text\"><h4>How It Works</h4>\n            <hr><h5>No more feeling guilty! Our innovative solution uses tech to expand and deliver privilege where it’s needed most&mdash;and everyone wins!</h5>\n\n          </div>\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <div class=\"col s4 m4 l3\">\n          <a href=\"#call\" id=\"download-button\" class=\"btn-large waves-effect waves-#000000 black\">Try it now!</a>\n        </div>\n        <div class=\"col s8 m8 l9\">\n          <h5><strong>White</strong>Save.me beta free trial.</h5>\n          <p class=\"light\">Our beta version connects a White Savior and a Savee via video chat. It’s simple, easy, and impactful. What’s more, your first session is free if you <a href=\"http://whitesave.me/#call\"><strong>try it now!</strong></a></p>\n        </div>\n      </div>\n\n      <h6>Just follow these 6 steps and you’re on your way to delivering or accessing privilege!</h6>\n\n      <div class=\"section\">\n        <h5>STEP 1: Click on <a href=\"http://whitesave.me/#call\"><strong>Try it now!</strong></a> and get ready to chat!</h5>\n        <p class=\"light\">This will launch the <strong>White</strong>Save.me app and your web cam. Make sure your lighting is adequate so that the <strong>White</strong>Save.me algorithm can correctly determine your Whiteness (avoid backlighting and extremely dim rooms). By clicking <a href=\"http://whitesave.me/#call\">here</a> to start your session, you are agreeing with our <a href=\"#terms\">terms and conditions.</a><br>\n\n        </p>\n      </div>\n      <div class=\"divider\"></div>\n      <div class=\"section\">\n        <h5>STEP 2: Turn on your camera!</h5>\n        <p class=\"light\">Allow <strong>White</strong>Save.me to access your device’s camera. (See our <a href=\"#faq\">FAQs</a> for our privacy policy, aimed at protecting White Saviors and Premium Model customers).</p>\n      </div>\n      <div class=\"divider\"></div>\n      <div class=\"section\">\n        <h5>STEP 3: Determining Whiteness.</h5>\n        <p class=\"light\">The camera will start, and our patented “White or Not White” facial color detection software&trade; will determine your Whiteness. (Visit our <a href=\"#faq\">FAQ</a> page if you do not agree with the results).</p>\n      </div>\n      <div class=\"divider\"></div>\n      <div class=\"section\">\n        <h5>STEP 4: Get matched! Start giving or getting privilege!</h5>\n        <p class=\"light\">Based on your results, we will automatically match you via video chat with a partner to begin delivering privilege (if you are White) or accessing privilege (if you are Not White).<br><br>\n        Savees can ask for help and Saviors provide special White insight on how to resolve lack of privilege in ways that avoid uncomfortable discussions, protests, or the possibility of a revolution. <strong>White</strong>Save.me goes further than a “like” and delivers real results without disrupting the status quo.<br><br>\n        End your chat at any time. If a Savior gets bored trying to resolve a problem or realizes it's beyond his capacity or a Savee has already gotten the same advice from a different Savior, just move to the next person or end the chat session altogether.</p>\n      </div>\n      <div class=\"divider\"></div>\n      <div class=\"section\">\n        <h5>STEP 5: Rate your experience.</h5>\n        <p class=\"light\">As a Savee, you can give your Savior 1 to 5 “Savior Stars” based on the quality of advice. Saviors can reward Savees with “Savee Stars” based on the worthiness of their problems and how likely it seems that the Savee will work hard and be motivated.</p>\n      </div>\n      <div class=\"divider\"></div>\n      <div class=\"section\">\n        <h5>STEP 6: Sign up for the pricing model that’s best for you and download the app!</h5>\n        <p class=\"light\">Following your session, decide whether the <a href=\"#pricing\"> Free, Basic or Premium Model </a> is best for you, and create your account. If you are accessing from our list of Third World Countries, we will automatically sign you up for the Free model, based on your location.</p>\n      </div>\n    </div>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"m12 title\">Privilege Everyone Can Afford.</h2>\n      </span>\n    </div>\n  </div>\n</div>\n\n<div class=\"container\">\n  <div class=\"section no-pad-bot\" id=\"index-banner\">\n    <div class=\"col m12 s12\">\n\n      <div class=\"row\">\n        <div class=\"col m12 s12 light\">\n          <p></p><div class=\"rich-text\"><h4>Our pricing model</h4>\n            <hr><h5>Our different levels of service enable anyone to use the service.</h5>\n            <p class=\"light\">From the poor and underprivileged in the Third World (Freemium), to underprivileged people of color in the First World (Basic Model), to non-White people anywhere who have succeeded despite skin color (Premium Model) but who could still use a hand up.<a href=\"http://whitesave.me/#call\"> <strong> Try it now</strong></a> and your first session is on us!\n            </p>\n\n\n          </div>\n        </div>\n      </div>\n\n\n\n      <div class=\"section\">\n        <div class=\"row\">\n          <div class=\"col s12 m4\">\n            <div class=\"card\">\n              <div class=\"card-image\">\n                <img src=\"/img/services-square-4.jpg\">\n              </div>\n              <div class=\"card-content\">\n                <span class=\"card-title black-text\">FREEMIUM</span>\n                <p class=\"light\">For our least privileged users (Savees) in the Third World, we offer an SMS-based Freemium model.<br><br>\n                Many of our least privileged users cannot speak English, so our solution integrates Google Translate, enabling Saviors and Savees to easily converse via SMS to share problems and expert privileged advice despite any global language, culture or life experience barriers.<br><br>\n                Working through our Non Profit Champion, <a href=\"https://www.facebook.com/WorldAidCorps\">World Aid Corps</a>, we engage with the most excluded people in the most far off places of the Third World, reaching those with the biggest problems and the least capacity to resolve them. SMS provides us a quick and easy way to reach our beneficiaries in any language. After all, there are more mobile phones than toilets now, according to the World Bank, so reaching the poorest of the poor is no longer an issue! <br><br>\n                Our White Saviors provide their life-saving advice and deliver privilege with the touch of a button! Ending global poverty and lack of White privilege has never been so quick and easy.<br><br>\n                <strong>Free</strong></p>\n              </div>\n            </div>\n          </div>\n\n\n          <div class=\"col s12 m4\">\n            <div class=\"card\">\n              <div class=\"card-image\">\n                <img src=\"/img/services-square-5.jpg\">\n              </div>\n              <div class=\"card-content\">\n                <span class=\"card-title black-text\">BASIC</span>\n                <p class=\"light\">Our Basic Model is designed for those Savees who are not privileged themselves but are surrounded by the privilege of others. <br><br>\n                Basic users (Savees) can access a White Savior via SMS, video chat or voice. Say a non-White person is being pulled over by the police and needs some rapid advice on how to avoid being shot, beaten or choked to death. A quick click launches the app, and the non-White Savee can access any available White Savior, who will provide tips on the right attitude and the best way to leave the situation alive and unharmed. <br><br>\n                In dire situations, Basic users can quickly upgrade to the Premium Model and have a White Savior delivered to them in person to serve as an intermediary, a witness, a role model or to otherwise accompany them.<br><br>\n                The app works best on Android phones. Our Skype API allows us to provide service in multiple languages.<br><br>\n                Video chat allows the Savee to hand the phone over to an authority figure for White Savior intermediation services. <a href=\"http://whitesave.me/#call\"><strong>Try it now and your first session is free!</strong></a>\n                <br><br>\n                <strong>All for $9/month, or just $99 for a full year!<br>**SPECIAL OFFER** Click “I agree to take advice from a White woman” during registration and pay only 77% of the price. Discount code: PAYGAP.</strong></p>\n              </div>\n            </div>\n          </div>\n\n          <div class=\"col s12 m4\">\n            <div class=\"card\">\n              <div class=\"card-image\">\n                <img src=\"/img/services-square-2.jpg\">\n              </div>\n              <div class=\"card-content\">\n                <span class=\"card-title black-text\">PREMIUM</span>\n                <p class=\"light\">Even successful non-White people need a hand at some point. Our premium service is for the non-White Savee who has ‘made it,’ but still needs personal advice or White Savior intervention from time-to-time.<br><br>\n                Say a non-White Savee is up for a promotion and wonders if race will be a factor. As a Premium Model Savee, he or she can call on a White Savior to personally accompany him or her out for drinks with the boss, join a high level meeting, or simply put in a good word and offer a strong handshake and a few slaps on the back.<br><br>\n\n                A White Savior is also useful for non-White female Savees who need someone to mansplain what their superiors are saying. The Premium Model allows for White mansplaining in real-time through almost any channel, including in person (Mansplaining not available with our ‘Advice from a White Woman’ discount).<br><br>\n                In an emergency situation, Premium Model customers can request a White Savior who will arrive directly to them. Using <a href=\"http://whitesave.me/#partners\">Buber's</a> patented disruptive transportation model and based on their highly successful kitten delivery service, we’ll ensure that the White Savior who is closest to the Savee will arrive quickly. Using geolocation, the Savee can track the Savior’s location and arrival time right on the device.<a href=\"http://whitesave.me/#call\"><strong>Try it now and your first session is free!</strong></a>\n                <br><br>\n                <strong>All for $29/month or just $299 a year for a 2 year subscription!<br>**SPECIAL OFFER** Click “I agree to take advice from a White woman” during registration and pay only 77% of the price. Discount code: PAYGAP.\n                </strong>\n                </p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n\n\n    </div>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Connect with someone now!</h2>\n      </span>\n    </div>\n  </div>\n</div>\n<div class=\"section no-pad-bot\">\n  <div class=\"container\">\n    <div class=\"row\" id=\"whiteness\">\n      <div class=\"col l12 m12 s12\">\n        <div class=\"card brown darken-1\">\n          <div class=\"card-content white-text\">\n            <span class=\"card-title\">Determining Whiteness</span>\n            <p>Please allow <strong>white</strong>save.me to access your camera.</p>\n            <p>Our patented facial color recognition software&#8482; will determine your whiteness.\n            Based on your results we will link you with a White Savior or a non-White Savee via a chat session.\n            You can end the chat session at any time. By starting your video session, you are agreeing with our <a href=\"#terms\">terms and conditions.</a></p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\">\n      <div class=\"col s9 m9 l8\">\n        <div class=\"card\">\n          <div class=\"card-image\">\n            <video id=\"peerVideo\" poster=\"img/loader.gif\" style=\"width:100%; height:auto\"></video>\n            <span class=\"card-title\">Video</span>\n          </div>\n        </div>\n      </div>\n      <div class=\"col s3 m3 l4\">\n        <div class=\"card\">\n          <div class=\"card-image\">\n            <canvas id=\"inputCanvas\" class=\"responsive-img\" width=\"260\" height=\"180\" style=\"width:100%; height:auto\"></canvas>\n          </div>\n          <div class=\"card-content\" id=\"white\">\n            <p>&nbsp;</p>\n          </div>\n          <div class=\"card-action\">\n            <a class=\"waves-effect waves-light btn\" onclick=\"javascript:window.wsmStream.stop()\" href=\"#home\">Quit Video Call</a>\n          </div>\n        </div>\n      </div>\n    </div>\n    <canvas id=\"outputCanvas\" class=\"responsive-img\" width=\"280\" height=\"200\" style=\"display:none\"></canvas>\n    <video id=\"inputVideo\" autoplay muted loop style=\"display:none\"></video>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("8", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Saving one person at a time, at scale and for profit.</h2>\n      </span>\n    </div>\n  </div>\n</div>\n\n<!-- Success Stories Section -->\n\n<div class=\"container\">\n  <div class=\"section no-pad-bot\" id=\"index-banner\">\n    <div class=\"col m12 s12\">\n      <div class=\"row\">\n        <div class=\"col m12 s12 light\">\n          <p></p><div class=\"rich-text\"><h4>Success Stories</h4>\n            <hr><h5>Our fast growth has changed the lives of thousands. Below are just a few stories in which our highly qualified White Saviors have helped underprivileged Savees get ahead.</h5>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <blockquote>\"I absolutely love WhiteSave.me. I can hop on for a second, do some social good real quick, then get back to finding stuff to paraphrase in my books!\" <br><em>Malcolm Fadwell, author</em> </blockquote>\n\n\n    <div class=\"section\">\n\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable orange lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/savior_bill.jpg\" alt=\"Bill\" class=\"circle responsive-img\" >\n            </div>\n              <div class=\"col s10\">\n                <span class=\"black-text\">\n                  “It was really great delivering some privilege through <strong>White</strong>Save.me. I’ve always felt that these people just need to be more motivated and hardworking and they’ll get ahead. <br><br>When I read that only 1% of CEOs are Black, I made sure to do a little research on Mark Zuckerberg so I could talk to some of these inner city kids about him. I'm pretty sure he didn't finish college, and look at him now&mdash;he fast tracked it right to the top. So I got to thinking&mdash;if we just teach these kids to code, they’ll be starting companies in no time. Or they can go work in Silicon Valley. Heck, by the time these kids graduate from high school in a few years, those Left Coast hippies will probably be open to hiring Blacks for tech jobs. <br><br>Right now most of these kids have this fantasy that they’ll grow up to be famous rappers or ball players. It’s a lot more realistic to think about being the next Mark Zuckerberg or Bill Gates, because that requires a real skill - coding.”\n                  <br><br><em>Bill helped inner-city kids see that becoming a billionaire through coding and entrepreneurship is a lot more realistic than doing it via professional sports or rap music.</em>\n                </span>\n              </div>\n          </div>\n        </div>\n      </div>\n\n\n\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable orange lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/Saved_Profiles_0001.jpg\" alt=\"\" class=\"circle responsive-img\" >\n            </div>\n              <div class=\"col s10\">\n                <span class=\"black-text\">\n                  “I had a job in tech but was hitting an invisible ceiling as a Latina. A friend told me about <strong>White</strong>Save.me’s Premium Model where you can get a personal White savior in the flesh. I signed up and got connected with Trevor. <br><br>Once everyone saw us hanging out during my lunch break, they started including us in their happy hour invitations. He advised me to read “Lean In” and hang a poster of Sheryl Sandberg near my desk. Trevor doesn’t know anything about tech, but he really enjoyed explaining how tech works and telling me how to behave so that upper management would notice I was in the room without feeling threatened by my capacities. He advised me to look less Latina, be sure I never seemed angry, and dress more conservatively so I wouldn’t be seen as too sexy to be taken seriously. He also told me to stop speaking Spanish to my family on the phone during work hours, and let me tell you, that worked wonders in this company! <br><br>After following Trevor's advice, I moved up in the company. They even asked me to head up the “Diversity Working Group” this year, now that I don't seem quite so \"diverse.\" It's pretty amazing what a little advice from a White guy can do. I gotta say, Trevor was right, even though I didn't want to believe it.\"\n                  <br><br><em>Maria Luisa (Mary Louise), age 28, started being more White-like and got a promotion by using our Premium Model service, all because of Trevor.</em>\n                </span>\n              </div>\n          </div>\n        </div>\n      </div>\n\n\n\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable orange lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/Saved_Profiles_0002.jpg\" alt=\"\" class=\"circle responsive-img\" >\n            </div>\n              <div class=\"col s10\">\n                <span class=\"black-text\">\n                  “I got pregnant when I was 19 and really didn’t know what to do because the guy I was with left town. My mom already worked a lot and I didn’t think she could afford to help me take care of a baby. A friend told me about <strong>White</strong>Save.me. <br><br>I was able to connect with Hunter on my cellphone. As soon as I started telling him about my situation, he interrupted and said I was really overthinking things. He explained that most of his feminist friends are really into having babies on their own, and I should stop making such a big deal out of it. Hunter said his female friends would actually prefer to have their freedom and not get married. He also told me about an app that helps you to track your monthly cycle. <br><br>It doesn’t matter if the Planned Parenthood clinics are shut down now, he said, tech allows women today to manage their fertility on their own. To be honest, I’m not really buying it.”\n                  <br><br><em>Hunter explained to Shanaya, age 20, how to embrace the freedom and feminism of being a single mom.</em>\n                </span>\n              </div>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable orange lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/Saved_Profiles_0003.jpg\" alt=\"\" class=\"circle responsive-img\" >\n            </div>\n              <div class=\"col s10\">\n                <span class=\"black-text\">\n                  “I was just chilling with my friends when somebody got the idea to go get some provisions. Nobody was around to drive us, so we decided to risk it and walk over to the store. We were just crossing the street when this cop came by and started hassling us for no reason. I had my phone with the <strong>White</strong>Save.me app on it. So I just tapped it to get hold of the next available White guy. <br><br>We ended up getting Bruce. He told us to be extra polite and allow the cops to stop and search us without a struggle even though we hadn’t done anything&mdash;after all we were a pack of Black kids just walking around without a legitimate destination, aside from going to the store to get food. He said we probably looked like typical thugs up to no good. Bruce told me to just put my hands up and let the cops see my phone with his face on the video, so they knew he was with us, and that I didn’t have a gun. Then he said to just hand my phone over and let him do the talking. <br><br>The thing about <strong>White</strong>Save.me is that it was like Bruce was right there. He talked to the cops and they let us go with a warning as long as we went back to the house and kept Bruce on the phone with us till we got there! Who knows what might have happened to us if we didn't have Bruce with us.”\n\n                  <br><br><em>With Bruce’s help and our Basic Model, Jayden, age 17, avoided arrest while walking in his own neighborhood.</em>\n                </span>\n              </div>\n          </div>\n        </div>\n      </div>\n\n\n\n\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable orange lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/Saved_Profiles_0006.jpg\" alt=\"\" class=\"circle responsive-img\" >\n            </div>\n              <div class=\"col s10\">\n                <span class=\"black-text\">\n                  “We were having trouble with our cassava and maize crops this year over here in Kabete, Kenya, due to a serious drought. The organization that comes by here regularly to snap photos of us, World Aid Corps, told us about a new project called <strong>White</strong>Save.me where subsistence farmers like us can get farming advice from White men in the United States through our mobile phones. <br><br>My brother and I pooled our money to cover the airtime costs to text in some questions about how to manage when there is a severe drought. We got some advice from Topher who’s living in New York City. He told us about some kind of plants that his eco-friendly community gardening group is experimenting with and which grow on the side of tall buildings. He suggested that perhaps we could do the same. <br><br>We don’t have tall buildings here, and it’s quite expensive and difficult to find the type of equipment which Topher mentioned. But we enjoyed greeting someone living in the United States and we wish him well.\n                  <br><br><em>Nderu, age 41, learned how to avoid slow onset disaster in rural Kenya with innovative hydroponic crops through a Freemium SMS chat with Topher in Brooklyn, New York.</em>\n                </span>\n              </div>\n          </div>\n        </div>\n      </div>\n\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable orange lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/savior_john.jpg\" alt=\"\" class=\"circle responsive-img\" >\n            </div>\n              <div class=\"col s10\">\n                <span class=\"black-text\">\n                  “I talked with James, whose son kept getting suspended for being late to middle school. He was really at a loss about how to handle it. I told him that first off, he should join the PTA so he can be more involved in his son's school. I don’t have kids of my own, but my sister really appreciates my advice on raising hers, so I figure I'm pretty good at providing orientation to people on parenting. <br><br> I also told James that personal responsibility is really important for getting ahead. I feel he really needs to make James Junior responsible for getting himself to school on his own whether his parents are home or not. If you ask me, James and his wife are also avoiding personal responsibility for their kid's education by working so many jobs and not being home for him. It's a two-way street here.  <br><br>I told James it was a pretty clear cut case of lack of responsibility all around. James disagreed with me, and even though he seemed really articulate when we spoke, I guess concepts like personal responsibiity can be hard to explain to some people when they're not part of the culture. I hope he'll reflect a little on it, so he'll see I'm right.\n                  <br><br><em>Through our Basic Model, John gave James, age 32, valuable insight into the importance of personal responsibility.</em>\n                </span>\n              </div>\n          </div>\n        </div>\n      </div>\n\n    </div>\n\n\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("9", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Tech is our hammer. Social problems are the nails! </h2>\n      </span>\n    </div>\n  </div>\n</div>\n\n<div class=\"container\">\n  <div class=\"section no-pad-bot\" id=\"index-banner\">\n    <div class=\"col m12 s12\">\n      <div class=\"row\">\n        <div class=\"col m12 s12 light\">\n          <div class=\"rich-text\"><h4>Our Story</h4>\n            <hr><h5>Innovation and good intentions are the key! We are unlocking the door and ending inequality through smart, game-changing, and scalable design ideas.</h5>\n\n          </div>\n        </div>\n      </div>\n      <blockquote>\"Armed with some technology, a skewed understanding of other people's realities, and the urge to feel good while doing good and making a profit from it, anyone can make a difference!\" <br> <em>Jason Brussell, social media for social good guru </em></blockquote>\n    </div>\n  </div>\n\n\n  <p class=\"light\"><strong>White</strong>Save.me founders Dmytri, Jake, and Lulu met while backpacking the Inca trail as part of the “Unnecessary Innovating in the Mountains” gathering in 2013. We soon realized that lack of innovative thinking was a problem the world over, as were inequality and lack of privilege for non-White people. Following a weekend of post-it notes, some experimental Ayahuasca, and lots of cold brew coffee, <strong>White</strong>Save.me was born.</p>\n  <p  class=\"light\"><strong>White</strong>Save.me is the solution the world's been waiting for. A simple app that lets White guys take advantage of their down-time to deliver privilege to the underprivileged right through their devices. Our hundreds of <a href=\"#success\">Success Stories</a> from Saviors and Savees all over the world prove that it’s working.</p>\n\n\n\n\n\n\n\n\n\n\n\n  <div class=\"section\">\n\n    <div class=\"row\">\n      <div class=\"col m12 s12\">\n        <div class=\"rich-text\"><h4>Founders</h4>\n          <p class=\"light\">Our fresh and extensive experience in marketing, innovative technology solutions, backpacking around, and the social good sector make us uniquely placed to extract the value of privilege from one target demographic and deliver it to another, all the while tapping into available revenue from small pockets of cash that the underprivileged currently have but don’t invest wisely.\n          Our team’s tried and true “Innovate Now, Ask Questions Later” approach has proven both lucrative and widely scalable by successful start-ups and entrenched tech billionaires cum faux do-gooders everywhere! Get in touch today if you'd like us to create a simple, engaging, innovative, life-saving, game-changing, story-telling, award-winning, profitable, scalable, viral social good solution for <strong>your</strong> favorite complex social problem!</p></div>\n      </div>\n    </div>\n\n\n    <div class=\"row\">\n      <div class=\"col s12 m4 l4\">\n        <div class=\"icon-block\">\n          <img class=\"circle responsive-img\" src=\"img/dmytri.jpg\">\n          <h5 class=\"center\">dmytri</h5>\n\n        </div>\n      </div>\n\n      <div class=\"col s12 m4 l4\">\n        <div class=\"icon-block\">\n          <img class=\"circle responsive-img\" src=\"img/linda.jpg\">\n          <h5 class=\"center\">lulu</h5>\n\n        </div>\n      </div>\n\n      <div class=\"col s12 m4 l4\">\n        <div class=\"icon-block\">\n          <img class=\"circle responsive-img\" src=\"img/juan.jpg\">\n          <h5 class=\"center\">jake</h5>\n\n        </div>\n      </div>\n\n\n    </div>\n\n  </div>\n\n\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("a", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Silver bullet solutions with gold quality partners </h2>\n      </span>\n    </div>\n  </div>\n</div>\n\n<div class=\"container\">\n  <div class=\"section no-pad-bot\" id=\"index-banner\">\n    <div class=\"col m12 s12\">\n      <div class=\"row\">\n        <div class=\"col m12 s12 light\">\n          <div class=\"rich-text\"><h4>Our Partners</h4>\n            <hr><h5>Our Public-Private Partnerships equal scale, profit and social good.</h5>\n\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"rich-text\"><h4>Private Sector Partners</h4></div>\n\n  <div class=\"col s12 m6 l6\">\n    <div class=\"card-panel hoverable z-depth-1\">\n      <div class=\"row\">\n        <div class=\"col s4 l2\">\n          <img src=\"img/RCoK-01.png\" alt=\"Random Chats of Kindness\" class=\"responsive-img\" >\n        </div>\n          <div class=\"col s8 l10\">\n            <span class=\"black-text\">\n              Random Chats of Kindness is our partner for “Random Chats of Privilege,” as we like to call our model. This unique software model allows us to connect Saviors and Savees quickly and conveniently to deliver privilege through cutting edge video.\n\n\n\n\n            </span>\n          </div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"col s12 m6 l6\">\n    <div class=\"card-panel hoverable z-depth-1\">\n      <div class=\"row\">\n        <div class=\"col s4 l2\">\n          <img src=\"img/Buber-01.png\" alt=\"Buber\" class=\"responsive-img\" >\n        </div>\n          <div class=\"col s8 l10\">\n            <span class=\"black-text\">\n              Delivering kittens to the workplace and partnering with multilateral organizations to support women's empowerment was one thing, but Buber was looking to help out in a way that would really make a difference while also improving the company's reputation. Buber and <strong>White</strong>Save.me, have partnered up to process Savee support requests through Buber’s patented disruptive transportation system and deliver Saviors in the flesh to the underprivileged, who can track the location of their savior while they wait. (Premium Plan required. NYC pilot, pending global expansion).\n\n\n            </span>\n          </div>\n      </div>\n    </div>\n  </div>\n\n\n\n\n  <div class=\"rich-text\"><h4>Non-Profit Champions</h4></div>\n\n  <div class=\"col s12 m6 l6\">\n    <div class=\"card-panel hoverable z-depth-1\">\n      <div class=\"row\">\n        <div class=\"col s4 l2\">\n          <img src=\"img/partners_world-aid-corps.jpg\" alt=\"Evil Genius Publishing\" class=\"responsive-img\" >\n        </div>\n          <div class=\"col s8 l10\">\n            <span class=\"black-text\"> Non profit partners are eager to\n              develop public-private partnerships, use technology, and link\n              with social enterprises in order to appear innovative. Our non\n              profit champion, <a href=\"https://www.facebook.com/WorldAidCorps\">World Aid Corps,</a>\n              brings us access to the global base of the underprivileged\n              pyramid, where rapid scale at minimal cost enables quick growth\n              and revenue for our investors and shareholders.<br><br> By\n              leveraging trust that communities place in WAC we will work at\n              large scale to encourage community members to contribute small\n              amounts of their hard-earned income to access white privilege,\n              thereby enabling individuals in poverty-stricken areas to move\n              away from primitive community-based socio-economic models of\n              development towards modern, consumer-based digital development\n              and global economies.<br><br> If your non profit organization\n              would like to help us reach the base of the pyramid so that we\n              can extract small amounts of revenue at scale in parts of the\n              world where both markets and governments have historically\n              failed to ensure people’s basic human rights, please reach out\n              to us via <a href=\"http://twitter.com/whitesaveme\">Twitter</a>\n              or <a href=\"#contact\">email.</a>\n            </span>\n          </div>\n      </div>\n    </div>\n  </div>\n\n\n\n  <br><br>\n\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("b", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n\t<div class=\"col m12 s12\">\n    \t<div class=\"container\">\n        <span class=\"brown-text text-darken-4\">\n          <h2 class=\"title\">Still have questions?</h2>\n        </span>\n     </div>\n   </div>\n</div>\n\n<div class=\"container\">\n\n    \t<div class=\"row\">\n        \t<div class=\"col m12 s12 light\">\n            <p></p><div class=\"rich-text\"><h4>Frequently Asked Questions (FAQs)</h4>\n                <hr><h5>Would you like to learn more or do you have questions about our work?</h5>\n               \t<p class=\"light\">Take a look at our FAQs below, as they may provide the answers you're looking for. If you don't find what you need, please reach out to us via <a href=\"http://twitter.com/whitesaveme\">Twitter</a> or <a href=\"#contact\">email</a> and our interns will be happy to respond.</p>\n\n                </div>\n            </div>\n         </div>\n\n\n\n\n  <div class=\"section\">\n    <h5>Why do you need access to my camera?</h5>\n    <p class=\"light\">We need access to your camera in order to determine whether you are White or not. Once we’ve determined your Whiteness (or non-Whiteness) through our patented facial color recognition software&#8482; you will be connected to a Savior or a Savee to begin your life-changing video chat. We do not share any of the images that we collect.</p>\n  </div>\n\n  <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>How does the White-not White algorithm work?</h5>\n    <p class=\"light\">Our patented innovative facial color recognition software determines what color you are based on a custom skintone recognition algorithm. Our solution provides a highly accurate reading every time for enhanced security and privacy.</p>\n  </div>\n\n\n <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>Why does it say I’m not White? I’m definitely White.</h5>\n    <p class=\"light\">While you may think you are White, computers and algorithms developed by those in the field of innovative technology are likely more equipped than the average person to detect aspects of Whiteness or non-Whiteness with absolutely no bias. Our software requires an ideal setting in order for maximum performance. Sometimes mistakes happen, but this is not a problem for the majority.</p>\n  </div>\n\n\n\n   <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>Why does it say I’m White? I’m definitely not White.</h5>\n    <p class=\"light\">While you may think you are not White, computers and algorithms developed by those in the field of innovative technology are likely more equipped than the average person to detect aspects of Whiteness or non-Whiteness with absolutely no bias. Our software requires an ideal setting in order for maximum performance. Sometimes mistakes happen, but this is not a problem for the majority.</p>\n  </div>\n\n<div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>Why do you assume that White people have privilege?</h5>\n    <p class=\"light\">Buzzfeed and other media sources have reported that White privilege is a “thing.”</p>\n  </div>\n\n\n  <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>Why is there a discount for advice from White women?</h5>\n    <p class=\"light\">We all know that women are only worth 77% of men, based on the average pay gap between women and men in the US, so it’s only fair that our services offer a discounted rate for advice from White women.</p>\n  </div>\n\n  <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>What makes you think that White men can offer worthwhile advice to non-White people?</h5>\n    <p class=\"light\">White men have been running the world for centuries and have a lot of experience doing things within the system. It’s only logical that they have the inside scoop on how to succeed in that system. White men run the vast majority of US corporations, foundations, start-ups and nonprofit organizations, so clearly they know how to create socio-economic change as well as how to do projects that develop underprivileged countries and neighborhoods. They’re specially equipped to determine where investments should go to enable non-White communities to thrive. And White men want to help. Our app offers them a way to do that directly, and for people of color to access White men directly for immediate guidance and support.</p>\n  </div>\n\n   <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>What do you do with my data? Do you share it?</h5>\n    <p class=\"light\">Don’t worry - if you are White and you volunteer your advice and share your privilege, the app is free for you, and we will not share any of your data with third parties. We will also not share data from our Premium users. We do share the data of our Basic and Freemium users so that we can be sure to provide useful targeted advertisements for products and services that will best meet their needs and purchasing habits. Big data analysis of the most common problems that our Savees face will enable us to seek investors and advertisers who can help us keep our services low in cost for those who need it the most all the while allowing corporations and small local businesses to prey on them so that we can make our app sustainable and profitable.</p>\n  </div>\n\n\n <div class=\"divider\"></div>\n  <div class=\"section\">\n    <h5>Is this site for real?</h5>\n    <p class=\"light\">We hope it's clear that this site is satire. It aims to make people reflect on White privilege, digital saviorism, the danger of biased algorithms and binary approaches, the ridiculousness of simple solutions to deep-seated problems, and the folly that techno-utopian fixes can address issues like poverty, inequality and exclusion without addressing power imbalances and the entrenched historical privilege of certain individuals, institutions, and nations. Many thanks to <a href=\"http://artahack.io/\">Art-A-Hack</a> for their interest in the idea and to our (White and non-White!) testers and advisors for their orientation, comments, suggestions and input on the site! Read our <a href=\"http://whitesave.me/#statement/\">Artist Statement</a> for more information.</p>\n  </div>\n\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("c", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n\n  <div class=\"container\">\n    <br><br><br>\n    <div class=\"row card-panel valign-container brown lighten-2 white-text\">\n      <div class=\"center valign col s12\">\n        <h1 class=\"header center\">The App That Delivers Privilege</h1>\n      </div>\n      <div class=\"center valign col s12 m6 l5\">\n        <div class=\"video-container\">\n          <iframe width=\"420\" height=\"315\" src=\"https://www.youtube.com/embed/jAt9XyTOLGc\" frameborder=\"0\" allowfullscreen></iframe>\n        </div>\n      </div>\n      <div class=\"center valign col s12 m6 l7\">\n        <p class=\"col s12 light flow-text\"><strong>White</strong>Save.me enables White men to help non-Whites to succeed in life without disrupting existing systems and long-standing traditions.</p>\n        <div class=\"row\">\n          <div class=\"col s6 right-align\">\n            <a href=\"#how\" class=\"btn-large waves-effect waves-#000000 black\">Learn More</a>\n          </div>\n          <div class=\"row\">\n            <div class=\"col s6 left-align\">\n              <a href=\"#call\" class=\"btn-large waves-effect waves-#000000 black\">Try it Now*</a>\n              <p>* web cam required</p>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n\n\n    <br><br>\n\n    <div class=\"divider\"></div>\n\n    <!--   Icon Section   -->\n\n    <div class=\"section\">\n      <div class=\"row\">\n        <div class=\"col s12 m4\">\n          <div class=\"card\">\n            <div class=\"card-image\">\n              <a href=\"#how\"><img src=\"/img/white-save-1.jpg\"></a>\n            </div>\n            <div class=\"card-content\">\n              <p><strong>Lack of privilege getting you down?</strong><br>\n              The privilege you need is just a tap away.</p>\n            </div>\n          </div>\n        </div>\n\n\n        <div class=\"col s12 m4\">\n          <div class=\"card\">\n            <div class=\"card-image\">\n              <a href=\"#how\"><img src=\"/img/white-save-2.jpg\"></a>\n            </div>\n            <div class=\"card-content\">\n              <p><strong>Connect with a white guy.</strong><br>\n              Get privileged, life-saving advice.</p>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"col s12 m4\">\n          <div class=\"card\">\n            <div class=\"card-image\">\n              <a href=\"#how\"><img src=\"/img/white-save-3.jpg\"></a>\n            </div>\n            <div class=\"card-content\">\n              <p><strong>Problem solved!</strong><br>\n              Privilege delivered, and you can move on.\n\n              </p>\n            </div>\n          </div>\n        </div>\n      </div>\n\n\n\n\n    </div>\n    <br><br>\n\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("d", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Get in touch with us!</h2>\n      </span>\n    </div>\n  </div>\n</div>\n<div class=\"container\">\n  <div class=\"row\">\n    <div class=\"col s12\">\n      <div><h4>We'd love your comments and feedback.</h4>\n        <hr>\n        <h5>Let us know what you thought of the site at <a href=\"mailto:help@whitesave.me\">help@whitesave.me</a>.</h5>\n      </div>\n    </div>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("e", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col m12 s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Simple and useful</h2>\n      </span>\n    </div>\n  </div>\n</div>\n\n<div class=\"container\">\n\n  <div class=\"row\">\n    <div class=\"col m12 s12 light\">\n      <p></p><div class=\"rich-text\"><h4>Terms and conditions for <strong>White</strong>Save.Me</h4>\n        <hr><h5>By using this site you agree to the following terms and conditions.</h5>\n      </div>\n    </div>\n  </div>\n\n\n  <div class=\"section\">\n    <p> Effective Date: 07/02/2015 </p>\n    <p>Welcome to WhiteSave.me&#8482; (the “Web site”) and its affiliates (collectively,\"\"we,\" and \"us\"). WhiteSave.me provides the services on this Web site (collectively, \"Services\") to you subject to the following Terms of Use (\"Terms\"). </p>\n    <p>1) Acceptance of Terms of Use </p>\n    <p>Please carefully read the following Terms before using the Web site. By accessing and using the Web site or Services, or the content displayed on, posted to, transmitted, streamed, or distributed or otherwise made available on or through the Web site, including without limitation, User Materials and Submissions (collectively, \"Content\"), you acknowledge that you have read, understood and agree to be bound by these Terms which form an agreement that is effective as if you had signed it. If at any time you do not agree to these Terms, please do not access or use the Web site or any of its Content or Services. YOU MUST BE AT LEAST 13 YEARS OF AGE TO VIEW, ACCESS, OR USE THIS WEB SITE, CONTENT OR SERVICES. IF YOU ARE UNDER 13 YEARS OF AGE, YOU ARE NOT PERMITTED TO ACCESS THIS WEB SITE, CONTENT OR SERVICES FOR ANY REASON. YOUR ACCESS TO, USE OF, AND BROWSING OF THE WEB SITE AND ITS CONTENTS AND SERVICES ARE SUBJECT TO ALL TERMS CONTAINED HEREIN AND ALL APPLICABLE LAWS AND REGULATIONS. BY VIEWING, USING, OR ACCESSING THIS WEB SITE, YOU REPRESENT AND WARRANT THAT YOU ARE AT LEAST 18 YEARS OF AGE AND YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU ARE UNDER THE AGE OF 13 YOU MAY NOT USE, VIEW, OR ACCESS THIS WEBSITE, YOUR PERMISSION TO USE, VIEW, OR ACCESS THE WEB SITE, CONTENT OR SERVICES IS AUTOMATICALLY AND IMMEDIATELY REVOKED. <strong>YOU MUST DISCONTINUE USE OF THIS WEB SITE IMMEDIATELY. PLEASE ALSO LEAVE THE WEBSITE IF YOU DO NOT AGREE TO BE BOUND BY THESE TERMS.</strong>&nbsp;</p>\n    <p>These Terms may be revised or updated from time to time. Accordingly, you should check the Terms regularly for updates. You can determine when the Terms were last revised by referring to the \"Last Revised\" legend that will be located at the top of this page. Any changes in these Terms take effect upon posting and will only apply to use of the Web site, Content, or Services after that date. Each time you access, use or browse the Web site, Content, or Services you signify your acceptance of the then-current Terms. </p>\n    <p>2) Permitted Users of Web site The Web site, Content, or Services are solely directed to persons at least 13 years of age. If you are under the age of 13 you may not use, view, or access this Website and you must leave this Web site immediately. If you are at least 13 years of age and agree to these Terms, you are permitted to use, view, and access this Website, Content, or Services. If you do not agree to be bound by these Terms, you should not and are not permitted to use, view, and access this Website, Content, or Services and you must immediately discontinue your use of the Website. By viewing this site, you agree that such viewing and reading does not violate the laws or standards imposed by your town, city, state or country. We are not responsible or liable for any content, communication, or other use or access of the Web site, Content, or Services by users of this Web site in violation of these Terms. </p>\n    <p>WhiteSave.me and the Web site do not knowingly collect information from children under age 13. If you are under age 13, you are not permitted to use the Web site and must exit immediately. If you are under age 13, you are not permitted to submit any personally identifiable information to the Web site. If you provide information to WhiteSave.me through the Web site or any other part of the Web site, Content, or Services you represent to WhiteSave.me that you are 13 years of age or older. </p>\n    <p>3) Permitted Use of Web site The Content (other than Submissions which are governed by paragraph 3 of Section 8(d)), Web site, and Services are the sole and exclusive property of WhiteSave.me and/or its licensors. You agree not to reproduce, republish, upload, post, duplicate, modify, copy, alter, distribute, create derivative works from, sell, resell, transmit, transfer, display, perform, license, assign or publish, or exploit for any commercial purpose, any portion of the Web site, Content or Services other than as expressly authorized by WhiteSave.me in writing, including without limitation, posting or transmitting any advertising, sponsorships, or promotions on, in or through the Service, Website, or Content. Use of the Web site or the Content or Services in any way not expressly permitted by these Terms is prohibited, and may be actionable under United States or international law. You agree not to access the Website, Content or Services through any technology or means other than the video streaming pages of the Service itself or other explicitly authorized means WhiteSave.me may designate. You agree not to use or launch any automated system, including without limitation, \"robots,\" \"spiders,\" or \"offline readers,\" that accesses the Website, Content, or Service. WhiteSave.me reserves the right to remove or suspend access to the Website, Content, or Services without prior notice. </p>\n    <p>You may not duplicate, publish, display, modify, alter, distribute, perform, reproduce, copy, sell, resell, exploit, or create derivative works from any part of the Web site or the Content or Services unless expressly authorized by WhiteSave.me in writing or as expressly set forth herein. You agree that you will not remove, obscure, or modify any acknowledgements, credits or legal, intellectual property or proprietary notices, or marks, or logos contained on the Web site or in the Content or Services. You agree not to collect or harvest any personally identifiable information, from the Service, nor to use the communication systems provided by the Service (e.g., comments) for any commercial solicitation purposes. You agree not to solicit, for commercial purposes, any users of the Service or Web site. In your use of the Web site, Content or Service, you will comply with all applicable laws, regulations, rules, decrees, and ordinances. </p>\n    <p>You understand that when using the Service, you will be exposed to Content from a variety of sources, and that WhiteSave.me is not responsible for the accuracy, usefulness, safety, or intellectual property rights of or relating to such Content. You further understand and acknowledge that you may be exposed to Content that is inaccurate, offensive, indecent, objectionable, sexually explicit, or that contains nudity, and you agree to waive, and hereby do waive, any legal or equitable rights or remedies you have or may have against WhiteSave.me with respect thereto. Our community reporting system does it's best to filter out non adult users of the site. You should still be aware that you may encounter someone under the age of 18 that has not yet been filtered. If you do please report them immediately by clicking report. Exposing yourself to children is a serious crime and we are working closely with law enforcement to help them find and prosecute those responsible. Special terms may apply to some products or Services offered on the Web site, or to any sweepstakes, contests, or promotions that may be offered on the Web site. Such special terms (which may include official rules and expiration dates) may be posted in connection with the applicable product, service, sweepstakes, contest, promotion, feature or activity. By entering such sweepstakes or contests or participating in such promotions you will become subject to those terms or rules. We urge you to read the applicable terms or rules, which are linked from the particular activity, and to review our Privacy Policy which, in addition to these Terms, governs any information you submit in connection with such sweepstakes, contests and promotions. Any such special terms or rules are in addition to these Terms and, in the event of a conflict, any such terms shall prevail over these Terms. </p>\n    <p>4) Privacy Policy Please review the Privacy Policy at /privacy/ for the Web site. By using or visiting this Website or the Content or Services, you signify your agreement to the Privacy Policy. If you do not agree with the Privacy Policy at /privacy/, you are not authorized to use the Web site. The terms of the Privacy Policy are incorporated herein by this reference. </p>\n    <p>5) Account Password and Security The Web site may contain features that require registration (e.g., when you register for an account or a contest). You agree to provide accurate, current and complete information about yourself as prompted. If you provide any information that is inaccurate, not current or incomplete, or WhiteSave.me has reasonable grounds to suspect that such information is inaccurate, not current or incomplete, WhiteSave.me may remove or de-register you from this Web site or contest, at its sole discretion. WhiteSave.me reserves the right to take appropriate steps against any person or entity that intentionally provides false or misleading information to gain access to portions of the Web site that would otherwise be denied. At the time you register for online account access, you may be required to select a username and password to be used in conjunction with your account. You are responsible for maintaining the confidentiality of your password, if any, and are fully responsible for all uses of your password and transactions conducted in your account, whether by you or others. You agree to (a) log out of your account at the end of each session; (b) keep your password confidential and not share it with anyone else; and (c) immediately notify WhiteSave.me of any unauthorized use of your password or account or any other breach of security. WhiteSave.me is authorized to act on instructions received through use of your password, and is not liable for any loss or damage arising from your failure to comply with this Section. You agree not to circumvent, disable or otherwise interfere with security-related features of the Service or features that prevent or restrict use or copying of any Content or enforce limitations on use of the Service or the Content therein. </p>\n    <p>6) Proprietary Rights You acknowledge and agree that, as between WhiteSave.me and you, all right, title, and interest in and to the Web site, Content, and Services including without limitation any patents, copyrights, trademarks, trade secrets, inventions, know-how, and all other intellectual property rights are owned exclusively by WhiteSave.me or its licensors, are valid and enforceable, and are protected by United States intellectual property laws and other applicable laws. Any attempt to use, redistribute, reverse engineer, or redesign the information, code, videos, textual or visual materials, graphics, or modules contained on the Web site for any other purpose is prohibited. WhiteSave.me and its licensors reserve all rights not expressly granted in and to the Website, Service and the Content. </p>\n    <p>Copyright: As between you and WhiteSave.me, you acknowledge and agree that all Content and Services included in the Web site, such as text, graphics, logos, icons, videos, images, media, data, audio, visual, animation, software and other information and materials, is the copyright and property of WhiteSave.me or its content suppliers and protected by U.S. and international copyright laws. Permission is granted to electronically copy and print hard copy portions of the Web site or Content for the sole purpose of using the Web site as a personal internal resource or otherwise for its intended purposes, provided that all hard copies contain all copyrights and trademarks, and other applicable intellectual property and proprietary marks and notices. Any other use, including the reproduction, modification, distribution, transmission, republication, display or performance, of the Website, Content, or Services are strictly prohibited. </p>\n    <p>Trademarks: The trademarks, service marks, logos, slogans, trade names and trade dress used on the Web site are proprietary to WhiteSave.me or its licensors. Without limiting the foregoing, \"WhiteSave.me\" is the trademark of WhiteSave.me. Unauthorized use of any trademark of WhiteSave.me may be a violation of federal or state trademark laws. Any third party names or trademarks referenced in the Web site do not constitute or imply affiliation, endorsement or recommendation by WhiteSave.me, or of WhiteSave.me by the third parties. </p>\n    <p>7) Your Indemnity of WhiteSave.me YOU AGREE TO INDEMNIFY, DEFEND AND HOLD WHITESAVE.ME, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, REPRESENTATIVES, SUBSIDIARIES, AFFILIATES, LICENSORS, PARTNERS, SERVICE PROVIDERS AND OTHERS ACTING IN CONCERT WITH IT, HARMLESS FROM ANY LOSSES, LIABILITIES, CLAIMS, DAMAGES, OBLIGATIONS, DEMANDS, COSTS OR DEBTS, AND EXPENSES INCLUDING WITHOUT LIMITATION REASONABLE ATTORNEYS' FEES, MADE BY YOU OR ON YOUR BEHALF OR BY ANY THIRD PARTY DUE TO OR ARISING OUT OF (A) YOUR CONNECTION, POSTING, OR SUBMISSION TO OR USE OF THE WEB SITE OR THE CONTENT OR SERVICES OR SUBMISSION; (B) YOUR VIOLATION OF THESE TERMS, ANY APPLICABLE LAWS, OR THE RIGHTS OF WhiteSave.me OR ANY THIRD PARTY, INCLUDING WITHOUT LIMITATION ANY COPYRIGHT, PROPERTY, OR PRIVACY RIGHT; OR (C) ANY CLAIM THAT YOUR SUBMISSION CAUSED DAMAGE TO A THIRD PARTY. </p>\n    <p>8) User Generated Content </p>\n    <p>a) Communications Services: The Web site may contain areas for you to leave comments or feedback, chat areas, blogs, bulletin board services, focus groups, forums, sweepstakes, contests, games, communities, calendars, and/or other message or communication facilities designed to enable you and others to communicate with WhiteSave.me and other users of the Web site (collectively, \"Communication Services\"). The opinions expressed in the Communication Services reflect solely the opinion(s) of the participants and may not reflect the opinion(s) of WhiteSave.me. You acknowledge that your submissions to the Web site may be or become available to others. You agree only to post, send and receive messages and materials that are in accordance with these Terms and related to the particular Communication Service. </p>\n    <p>b) Prohibited Actions: You agree that the following actions are prohibited and constitute a material breach of these Terms. This list is not meant to be exhaustive, and WhiteSave.me reserves the right to determine what types of conduct it considers to be inappropriate use of the Web site. In the case of inappropriate use, WhiteSave.me or its designee may take such measures as it determines in its sole discretion. By way of example, and not as a limitation, you agree that when using the Web site, Content, Services or a Communication Service, you will not: 1) Use the Web site, Content or Services for any purpose or to take any actions in violation of local, state, national, or international laws, regulations, codes, or rules. 2) Violate any code of conduct or other guidelines which may be applicable for any particular Communication Service. 3) Take any action that imposes an unreasonable or disproportionately large load on the Web site's infrastructure or otherwise in a manner that may adversely affect performance of the Web site or restrict or inhibit any other user from using and enjoying the Communication Services or the Web site. 4) Use the Web site for unauthorized framing of or linking to, or access via automated devices, bots, agents, scraping, scripts, intelligent search or any similar means of access to the Content or Services. 5) Aggregate, copy, duplicate, publish, or make available any of the Content or Services or any other materials or information available from the Web site to third parties outside the Web site in any manner or any other materials or information available from the Web site. 6) Defame, bully, abuse, harass, stalk, demean, threaten or discriminate against others or otherwise violate the rights (such as rights of privacy and publicity) of others or reveal another user’s personal information e.g. hate speech. 7) Publish, post, upload, distribute or disseminate any defamatory, infringing, or unlawful topic, name, material, content, video, image, audio, caption, or information e.g. animal abuse, drug or substance abuse, accidents, dead bodies and similar items. You are not permitted to provide a Submission that contains graphic or gratuitous violence (on yourself or others) or shows yourself or someone else getting hurt, attacked, or humiliated. 8) Upload or download files that contain software or other material protected by intellectual property laws or other laws, unless you own or control the rights, titles, or interests thereto or have received all necessary consents or rights. 9) Upload or transmit files that contain viruses, corrupted files, or any other similar software or programs that may damage the operation of another's computer. 10) Use the Web site to make available unsolicited advertising or promotional materials, spam, pyramid schemes, chain letters, or similar forms of unauthorized advertising or solicitation or conduct or forward surveys. 11) Harvest or otherwise collect information about others, including email addresses, without their consent. 12) Download any file or material posted by another user of a Communication Service that you know, or reasonably should know, cannot be legally distributed in such manner. 13) Falsify or delete any author attributions, legal or other notices, or proprietary designations or labels of origin or source. 14) Restrict or inhibit any other user from using and enjoying the Communication Services. 15) Engage in any other action that, in the judgment of WhiteSave.me, exposes it or any third party to potential liability or detriment of any type. </p>\n    <p>If you use, view, or access this Web site in contravention of these Terms, or if you have repeatedly violated these Terms or a third party's copyright, we reserve the right to terminate the permissions or rights granted to you by WhiteSave.me and we reserve all of our rights under this Agreement, at law and in equity. </p>\n    <p>c) User Materials: Any and all content, comments, views, information, data, text, video, image, captions, music, sound, graphics, photos, software, code, audio, sound, music, audio visual combinations, interactive features, feedback, documentation, photographs, discussions, news, articles, messages, postings, listings, and other materials, viewed on, accessed through, displayed on, posted to, transmitted, streamed, or distributed or otherwise made available through the Web site, Services or the Communication Services by users or other third parties (\"User Materials\") are strictly those of the person from which such User Materials originated, who is solely responsible for its content. Use of or reliance on User Materials is entirely at your own risk and WhiteSave.me expressly disclaims any and all liability in connection with User Materials. WhiteSave.me does not validate, monitor, or endorse any User Materials of any user or other licensor, or any opinion, recommendation, or advice expressed therein nor vouch for their reliability. Under no circumstances will WhiteSave.me or its suppliers or agents be liable in any way for any User Materials. </p>\n    <p>You acknowledge and agree that WhiteSave.me may or may not pre-screen or monitor User Materials, but that it and its designees have the right (but not the obligation) in their sole discretion to pre-screen, monitor, refuse, delete, move, remove, suspend, block, and/or restrict access to the Website and any Content or User Materials that are available via the Web site. You understand that by using the Web site, you may be exposed to User Materials that you may consider offensive or objectionable or that may contain nudity or adult oriented or sexually explicit material. Some of the Content on this Web site may offend you. If you think that the Content violates these Terms, then \"tag\" or \"flag\" the video stream you're watching to submit it for review by us. You agree that you must evaluate, and bear all risks associated with, the use or exposure to any User Materials posted by others. </p>\n    <p>Without limiting the foregoing, WhiteSave.me and its designees have the right to temporarily or permanently remove, delete, block, suspend or restrict your account or access to the Website or any Content or User Materials on the Website that violate these Terms or are otherwise objectionable, or offensive in WhiteSave.me sole discretion, including without limitation removing or substituting other words for foul or inappropriate language. You agree WhiteSave.me shall have no liability for such removal, deletion, blocking, suspension, or restriction or any of the actions taken pursuant to this Section. </p>\n    <p>You further acknowledge and agree that you will not rely on this Web site or any Content or Services available on or through the Web site. We are not responsible for any errors or omissions in the User Materials or hyperlinks embedded therein or for any results obtained from the use of such information. Under no circumstances will WhiteSave.me or its suppliers or agents be liable for any loss or damage caused by your reliance on such User Materials. </p>\n    <p>Except as otherwise expressly permitted under copyright law or as otherwise expressly set forth herein, you will not copy, redistribute, retransmits, publish or commercially exploit the downloaded Content without the express permission of WhiteSave.me and the copyright owner. You may not sell, lease or rent access to or use of the Web site or its Services. You shall not use this Web site or any Content or Services at any time for any purpose that is unlawful or prohibited by these Terms and other conditions and notices on the Web site and shall comply with all applicable local, state, federal, national or international statutes, rules, regulations, ordinances, decrees, laws, codes, orders, regulations, or treaties of any government or regulatory body of any jurisdiction. You shall not use the Web site in any manner that could damage, disable, impair or interfere with any other user's use of the Web site or Services or Content. You may not attempt to gain unauthorized access to the Web site through hacking or any other unauthorized means. You may not attempt to obtain or obtain any Content or Services through any means not intentionally made available to you through the Web site. </p>\n    <p>d) Submissions: You are solely responsible for the User Materials that you post, display, share, stream, email, transmit or otherwise make available via the Web site or Services (\"Submission\"). All Submissions are subject to these Terms and you agree that you will not submit any Submission that is in violation of these Terms. You understand that WhiteSave.me does not guarantee any confidentiality with respect to any Submissions you submit. WhiteSave.me is under no obligation to post or use any Submission and may remove, delete, block, suspend, terminate, or restrict access to any Submission at any time in its sole discretion. You acknowledge and agree that WhiteSave.me is entitled to remove, delete, block, suspend, terminate, or restrict your Submission or account or your access to the Website, Content, or Services permanently or temporarily and without prior notice, if WhiteSave.me deems that you have been, or you have been identified by other users to be (either once or repeatedly), offensive in your Submission or if your use of the Website, Services, or Content violates these Terms. For the avoidance of doubt, if your Submission is \"skipped,\" \"flagged,\" \"reported\" or \"tagged\" by other users either once or repeatedly for the foregoing reasons, then we reserve the rights to perform the foregoing actions. You agree WhiteSave.me shall have no liability for such removal, deletion, blocking, suspension, termination, or restriction or any of the actions taken pursuant to this Section. Violations of the Terms of Use may result in a warning notification or termination of your account. If you violate these Terms we reserve the right to temporarily or permanently terminate your account or terminate or block your access to the Website, Content, or Services. </p>\n    <p>By making a Submission, you represent and warrant that your Submission is true, your own original work, and does not infringe any other person's or entity's rights, and that you and any other person mentioned or shown in your Submission release any and all claims concerning WhiteSave.me or its designees' use, posting, copying, modification, transmission, or distribution of the Submission or any part thereof. You represent and warrant that you own all right, title, and interest, including copyright, to your Submission, and hold all necessary licenses or releases concerning the contents of your Submission and consents and rights to use, post, copy, modify, distribute, stream, or transmit your Submission. You agree that you are solely responsible for you own Submission and the consequences of submitting and streaming, transmitting, displaying or publishing your Submission on the Service. You must evaluate and bear all risks associated with your disclosure of any Submission. </p>\n    <p>By making a Submission, you grant WhiteSave.me and its licensees, assignees and designees an irrevocable, assignable, transferable, fully sub-licensable (through multiple levels of sublicensees), perpetual, world-wide, royalty-free, fully paid-up, non-exclusive right and license, in their sole discretion, to use, distribute, stream, reproduce, post, modify, copy, combine, adapt, publish, translate, rent, lease, sell, resell, perform or display (whether publicly or otherwise), make available online or electronically transmit, and perform, and create derivative works of your Submission (in whole or in part), along with your name or any part thereof and city/town/country of residency, in WhiteSave.me’s discretion, on the Web site or elsewhere, and to use, copy, adapt, distribute, or incorporate all or any part of your Submission into other advertising, promotion, research, analysis or other materials in any format or medium or channels now known or later developed. You hereby waive any right to inspect such use and any claims based on title, privacy, confidentiality, publicity, defamation, misappropriation, intellectual property or similar claims for any use of your Submission. You also hereby grant each user of the Website, Content and Service a non-exclusive license to view, use, and access your Submission through the Website as permitted through the functionality of the Service and under these Terms. </p>\n    <p>9) Notice and Procedures for Making Claims of Copyright or Intellectual Property Infringement WhiteSave.me may, in appropriate circumstances and at its sole discretion, disable and/or terminate use of the Website, Content, or Services by users who infringe the intellectual property of others. If you believe that your work has been copied in a way that constitutes copyright infringement, or your intellectual property rights have been otherwise violated, please provide WhiteSave.me’s Copyright Agent a Notice containing the following information: 1) an electronic or physical signature of the person authorized to act on behalf of the owner of the copyright or other intellectual property interest; 2) a description of the copyrighted work or other intellectual property that you claim has been infringed; 3) a description of where the material that you claim is infringing is located on the Web site (providing URL(s) in the body of an email is the best way to help WhiteSave.me locate content quickly); 4) your name, address, telephone number, and email address; 5) a statement by you that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law; 6) a statement by you, made under penalty of perjury, that the above information in your Notice is accurate and that you are the copyright or intellectual property owner or authorized to act on the copyright or intellectual property owner's behalf. </p>\n    <p>If you believe in good faith that a notice of copyright infringement has been wrongly filed by WhiteSave.me against you, the DMCA permits you to send WhiteSave.me a counter-notice. </p>\n    <p>Notices and counter-notices must meet the then-current statutory requirements imposed by the DMCA; see http://www.copyright.gov/ for details. Notices of claims of copyright or other intellectual property infringement and counter-notices should be sent to WhiteSave.me Copyright Agent who can be reached in the following ways: </p>\n    <p>Mailing Address: help@whitesave.me </p>\n    <p>Make sure you know whether the Content that you have seen on WhiteSave.me infringes your copyright. If you are not certain what your rights are, or whether your copyright has been infringed, you should check with a legal adviser first. Be aware that there may be adverse legal consequences in your country if you make a false or bad faith allegation of copyright infringement by using this process. Please also note that the information provided in this legal notice may be forwarded to the person who provided the allegedly infringing Content. </p>\n    <p>10) Links Links to Other Websites and Search Results: The Web site may contain links to websites operated by other parties. The Web site provides these links to other websites as a convenience, and your use of these sites is at your own risk. The linked sites are not under the control of WhiteSave.me which is not responsible for the content available on third party sites. Such links do not imply endorsement of information or material on any other site and WhiteSave.me disclaims all liability with regard to your access to, use of or transactions with such linked websites. You acknowledge and agree that WhiteSave.me shall not be responsible or liable, directly or indirectly, for any damage, loss or other claim caused or alleged to be caused by or in connection with, access to, use of or reliance on the Website or any Content or Services available on or through any other site or resource. </p>\n    <p>Links to the Web site: You may link another website to the Web site subject to the following linking policy: (i) the appearance, position and other aspects of any link may not be such as to damage or dilute the reputation of WhiteSave.me or the Web site; (ii) the appearance, position and other attributes of the link may not create the false appearance that your site, business, organization or entity is sponsored by, endorsed by, affiliated with, or associated with WhiteSave.me or the Web site; (iii) when selected by a user, the link must display the Web site on full-screen and not within a \"frame\" on the linking website; and (iv) WhiteSave.me reserves the right to revoke its consent to the link at any time and in its sole discretion. </p>\n    <p>11) Modifications to Web site WhiteSave.me reserves the right at any time and from time to time to modify, suspend, block, terminate, or discontinue, temporarily or permanently, the Web site, Content, or Services, or any portion thereof, with or without notice. You agree that WhiteSave.me will not be liable to you or to any third party for any modification, suspension, blocking, termination, or discontinuance of the Web site, Content, or Services. </p>\n    <p>12) Suspension and Termination Rights WhiteSave.me reserves the right, at its sole discretion, immediately and without notice, to suspend or terminate your access to the Web site, Content, or Services or any part thereof for any reason, including without limitation any breach by you of these Terms. You agree that WhiteSave.me shall not be liable to you or any third party for any such suspension or termination. </p>\n    <p>13) Disclaimer THE WEB SITE AND CONTENT AND THE INFORMATION, SERVICES, PRODUCTS, SWEEPSTAKES, CONTESTS, DRAWINGS, OR OTHER ACTIVITIES OFFERED, CONTAINED IN OR ADVERTISED ON THE WEB SITE, INCLUDING WITHOUT LIMITATION TEXT, VIDEO, GRAPHICS AND LINKS, ARE PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, AND ITS LICENSORS, SUPPLIERS AND RELATED PARTIES DISCLAIM ALL REPRESENTATIONS AND WARRANTIES, EXPRESS OR IMPLIED, WITH RESPECT TO THE WEBSITE AND CONTENT, INFORMATION, SERVICES, PRODUCTS AND MATERIALS AVAILABLE ON OR THROUGH THE WEBSITE, INCLUDING, BUT NOT LIMITED TO, WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, FREEDOM FROM COMPUTER VIRUS AND IMPLIED WARRANTIES ARISING FROM COURSE OF DEALING OR COURSE OF PERFORMANCE. YOUR USE OF THE WEB SITE OR ANY CONTENT OR SERVICES ARE ENTIRELY AT YOUR OWN RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WhiteSave.me EXCLUDES ALL WARRANTIES, CONDITIONS, TERMS OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THIS WEB SITE'S CONTENT OR THE CONTENT OF ANY WEB SITES LINKED TO THIS WEB SITE AND ASSUMES NO LIABILITY OR RESPONSIBILITY FOR ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF OUR SERVICES, (III) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL, CONFIDENTIAL AND/OR FINANCIAL INFORMATION STORED THEREIN, (IV) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM OUR SERVICES, (IV) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH OUR SERVICES BY ANY THIRD PARTY, AND/OR (V) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR SUBMISSION OR THE USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES OR WEBSITE. WhiteSave.me DOES NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE SERVICES OR ANY HYPERLINKED SERVICES OR FEATURED IN ANY BANNER OR OTHER ADVERTISING, AND WhiteSave.me WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION OR COMMUNICATION BETWEEN YOU AND ANY OTHER USER OR THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE. </p>\n    <p>Without limiting the foregoing, you are responsible for taking all necessary precautions to insure that any Content, Services, or access to the Web site is free of viruses or other harmful code. </p>\n    <p>14) Limitation on Liability: TO THE MAXIMUM EXTENT PERMITTED BY LAW, WhiteSave.me AND ITS RELATED PARTIES DISCLAIM ALL LIABILITY, WHETHER BASED IN CONTRACT, TORT (INCLUDING WITHOUT LIMITATION NEGLIGENCE), STRICT LIABILITY OR ANY OTHER THEORY ARISING OUT OF OR IN CONNECTION WITH THE WEB SITE, USE, INABILITY TO USE OR PERFORMANCE OF THE INFORMATION, CONTENT, SERVICES, PRODUCTS AND MATERIALS AVAILABLE FROM OR THROUGH THE WEB SITE. IN NO EVENT SHALL WhiteSave.me, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS OR ANY OF ITS AFFILIATED ENTITIES OR SUPPLIERS BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL, PUNITIVE, INCIDENTAL, EXEMPLARY OR CONSEQUENTIAL LOSSES, EXPENSES, OR DAMAGES, EVEN IF THESE PERSONS AND ENTITIES HAVE BEEN PREVIOUSLY ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THESE LIMITATIONS SHALL APPLY NOTWITHSTANDING ANY FAILURE OF ESSENTIAL PURPOSE OR THE EXISTENCE OF ANY LIMITED REMEDY. WITHOUT LIMITING THE FOREGOING, THE MAXIMUM AGGREGATE LIABILITY OF WhiteSave.me ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE WEB SITE OR THE CONTENT, INFORMATION, MATERIALS, PRODUCTS OR SERVICES ON OR THROUGH THE WEBSITES SHALL NOT EXCEED FIFTY DOLLARS (U.S.) </p>\n    <p>YOU SPECIFICALLY ACKNOWLEDGE THAT WhiteSave.me SHALL NOT BE LIABLE FOR CONTENT OR THE DEFAMATORY, INDECENT, OFFENSIVE, OBSCENE, SEXUALLY EXPLICIT, PORNOGRAPHIC, NUDE, OR ILLEGAL CONDUCT OR CONTENT OF ANY THIRD PARTY AND THAT THE RISK OF HARM OR DAMAGE FROM THE FOREGOING RESTS ENTIRELY WITH YOU. </p>\n    <p>Exclusions and Limitations: Because some jurisdictions do not allow limitations on how long an implied warranty lasts, or the exclusion or limitation of liability for consequential or incidental damages, the above limitations may not apply to you. This Limitation of Liability shall be to the maximum extent permitted by applicable law. </p>\n    <p>15) Notice Required by California Law Pursuant to California Civil Code Section 1789.3, users are entitled to the following specific consumer rights notice: The name, address and telephone number of the provider of this Web site is WhiteSave.me 244 5th Ave. New York, NY 10001, 8005555555. Complaints regarding this Web site, or the Content or Services or requests to receive further information regarding use of this Web site or the Content or Services may be sent to the above address or to help@whitesave.me The Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs may be contacted in writing at 1625 North Market Boulevard, Suite S202, Sacramento, CA 95834 or by telephone at (916) 574-7950 or (800) 952-5210. </p>\n    <p>16) Governing Law and Disputes These Terms shall be governed by, and will be construed under, the laws of the State of California, U.S.A., without regard to choice of law principles. You irrevocably agree to the exclusive jurisdiction by the federal and state courts located in Santa Clara County, California, U.S.A., to settle any dispute which may arise out of, under, or in connection with these Terms, as the most convenient and appropriate for the resolution of disputes concerning these Terms. ANY CAUSE OF ACTION OR CLAIM YOU MAY HAVE WITH RESPECT TO THESE TERMS, THE WEB SITE OR THE CONTENT OR SERVICES MUST BE COMMENCED WITHIN SIX (6) MONTHS AFTER THE CLAIM OR CAUSE OF ACTION ARISES OR SUCH CLAIM OR CAUSE OF ACTION SHALL BE BARRED. The Web site is controlled within the United States of America and directed to individuals residing in the United States. Those who choose to access the Web site from locations outside of the United States do so on their own initiative, and are responsible for compliance with local laws if and to the extent local laws are applicable. WhiteSave.me does not represent that the Web site, Content, or Services are appropriate outside the United States of America. WhiteSave.me reserves the right to limit the availability of the Website to any person, geographic area or jurisdiction at any time in its sole discretion. </p>\n    <p>17) Force Majeure WhiteSave.me shall not be liable for any delay or failure to perform resulting from causes outside its reasonable control or unforeseen circumstances such as acts of nature or God, fire, flood, earthquake, accidents, strikes, war, terrorism, governmental act, failure of or interruption in common carriers (including without limitation Internet service providers and web hosting providers) or utilities, or shortages of transportation facilities, fuel, energy, labor or materials. </p>\n    <p>18) Ability To Accept Terms of Service You represent and warrant that you are either at least 18 years of age (or for jurisdictions in which 18 years old is not the age of majority to legally enter into binding contracts, at least such age of majority for your jurisdiction), or an emancipated minor, or possess legal parental or guardian consent, and are fully able and competent to enter into the terms, conditions, obligations, affirmations, representations, and warranties set forth in these Terms, and to abide by and comply with these Terms. You acknowledge that we have given you a reasonable opportunity to review these Terms and that you have agreed to them. </p>\n    <p>19) Miscellaneous These Terms and the Privacy Policy and any other legal notices published by WhiteSave.me set forth the entire understanding and agreement between you and WhiteSave.me with respect to the subject matter hereof. If any provision of the Terms or the Privacy Policy is found by a court of competent jurisdiction to be invalid, the parties nevertheless agree that the court should endeavor to give effect to the parties' intentions as reflected in the provision, and the other provisions of the Terms or the Privacy Policy shall remain in full force and effect. Headings are for reference only and in no way define, limit, construe or describe the scope or extent of such section. WhiteSave.me's failure to act with respect to any failure by you or others to comply with these Terms or the Privacy Policy does not waive its right to act with respect to subsequent or similar failures. You may not assign, transfer, sublicense or delegate these Terms or the Privacy Policy or your rights or obligations under these Terms or the Privacy Policy without the prior written consent of WhiteSave.me, but same may be assigned by WhiteSave.me without restriction. Any assignment, transfer, sublicense, or delegation in violation of this provision shall be null and void. There are no third party beneficiaries to these Terms or the Privacy Policy. </p>\n    <p>20) Questions? Please direct any questions you may have about these Terms, technical questions or problems with the Web site, or report a violation of these Terms, or comments or suggestions to our support team. </p>\n  </div>\n\n\n\n\n\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("f", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Artistic Statement</h2>\n      </span>\n    </div>\n  </div>\n</div>\n<div class=\"container\">\n  <div class=\"flow-text\">\n    <p>We were brought together as a team through the <a href=\"http://artahack.io/\">Art-A-Hack</a> initiative.</p>\n\n    <p>Our project is “Imbalances in Tech.” We want to push people to reflect on digital saviorism, the danger of biased algorithms and binary approaches, the ridiculousness of simple solutions to complex deep-seated problems, and the folly that techno-utopian fixes can address issues like poverty, inequality and exclusion without addressing power imbalances and the entrenched historical privilege of certain individuals, institutions, and nations.</p>\n\n    <p>To explore those topics, we chose to focus on a complex, historical, systemic and touchy issue – white privilege – because it is highlighted by and a strong driver of all of the above.</p>\n\n    <p>We created a real/fake tech start-up with a business model, an app, a cheesy self-centered founders' story, and everything else that a real start up aimed at “doing social good” typically has. We used the language bandied about by those in tech and social good – focusing our fake start up on ‘doing good while making a profit.’ We purposely centered our fake app on white people and their user experiences, and set it up so that non-white people would foot the bill through both cash, data mining and targeted advertising.</p>\n\n    <p>The app enables white men to ‘deliver privilege’ to the less privileged. We chose this language because ‘delivering privilege’ is just about as impossible as ‘delivering development’ or ‘delivering democracy’ through tech applications. We created a special discount for getting advice from white women - 77% of the price of a white man - to reflect the current pay gap between men and women.</p>-\n\n    <p>In order for someone to participate in the WhiteSave.me experience, they need to first prove their qualification to be a White Savior through the “whiteness detector,” which is based on a faulty algorithm. It uses a video camera to determine whether a person is white or not white. The algorithm is both simplistic and biased. It’s also often wrong. Once the algorithm determines if a person is white or not, the person is matched with a 'White Savior' or a non-white ‘Savee’. The White Savior provides privileged answers to the Savee’s lack-of-privilege-related questions through SMS, voice, video or in person (depending on how much the Savee is willing to pay).</p>\n\n    <p>We created a satire because because satire can be deep and cutting, and it often makes people think while they laugh nervously (or sometimes hysterically). We want people to look at this site and feel unsure if it’s real or not. We want people to feel uncomfortable with both imbalances in tech and with white privilege. We want some people to see themselves in the caricatures and reflect on the 'solutions' they design. People of Color are normally well aware of the issues we highlight, but often white people shy away from talking about them or they talk about them in a way that puts whiteness at the center, reconfirming white privilege. Our site purposely puts white people at the center in an over the top way, as commentary on this tendency. We also provide no real benefit to 'Savees.' We wanted to call out projects that are designed to make donors and volunteers feel good about themselves without actually making an impact on those who are supposedly benefiting from generosity and aid. The 'build it and they will come' model for Savees is also purposeful. All our outreach and the site itself is aimed at White Saviors, whereas the business model relies entirely on Savees' willingness to pay for a service that will not actually provide them with any benefit.</p>\n\n    <p>Through the project, we highlight how technological quick fix solutions are Band Aids that do nothing to resolve deep historical and institutionalized inequalities and biases. Tech often serves to distract people from these deeper issues and potential longer-term changes that will necessarily touch issues of power and require change by and in those who hold power. Through the “white or not” algorithm, we show how tech, as a binary tool, does not do a good job with nuances and complex issues. We also use the algorithm to comment on the false idea that race is binary, or that it even biologically exists.</p>\n\n    <p>From the start of the idea, we’ve consulted and shared the project with a diverse group of advisors and testers (white and not white) for orientation, criticism, commentary and other feedback. We felt this was especially important given that the three of us are white. We've taken the feedback and incorporated it into the site. We wanted to avoid offending People of Color, while we did want to call out white people of all political persuasions for overt and unconscious bias. One commenter pointed out our own white privilege in creating this site, saying that a person of color would seem too angry by creating a site like this. Others cautioned us about offending or shocking white people, or creating feelings of guilt and stress in them. One person suggested that we might be targeted and harmed by white supremacists. We hope that is not true. Through the creation of the website and the fake app, we were able to explore and comment on imbalances in tech and how they reflect the world’s wider imbalances in blatant ways as well as through subtler microaggressions. We welcome any additional feedback, especially in areas where our own overt or unconscious biases are showing in ways that we ignore.</p>\n\n    <p>We are not against technology. We are not against people helping or providing mentorship. However, we do think the use of technology in social good and social change needs to be deeply thought about with a very critical eye. The so-called ‘solutions’ need to be complex and deep, and they need to address issues of power. Tech itself needs to be more diverse and inclusive, as does \"do-gooding.\"</p>\n\n    <p>We hope the project will generate discussion and reflection and we welcome and comments or feedback.</p>\n\n      <p>We also note that we conceived and created WhiteSave.me with full autonomy. We received no funding or other type of benefit except for lunch, meeting space and moral support from the Art-a-Hack team and our fellow Art-a-Hackers during the four Mondays that we worked together. The organizations listed below have covered (or plan to provide support for) some of the costs to host and run WhiteSave.me. We take full responsibility for the project and its content. It does not represent the views of Art-A-Hack, any of Art-A-Hack's sponsors, or any of our individual employers past, present or future.</p>\n\n    <p>Juan, Dmytri and Linda<br>\n    WhiteSave.me<br>\n    The Imbalances in Tech Team at Art-A-Hack<br>\n    Contact us: <a href=\"mailto:help@whitesave.me\">help@whitesave.me</a></p>\n  </div>\n\n<div class=\"section\">\n  <div class=\"rich-text\"><h4>Sponsors</h4></div>\n\n  <div class=\"col s12 m6 l6\">\n    <div class=\"card-panel hoverable z-depth-1\">\n      <div class=\"row\">\n        <div class=\"col s4 m2 l2\">\n          <img src=\"img/sponsor_evil-genius-logo.png\" alt=\"Evil Genius Publishing\" class=\"responsive-img\" >\n        </div>\n          <div class=\"col s8 m10 l10\">\n            <span class=\"black-text\">\n              Evil Genius Publishing is a micro-publisher focused on the humanitarian aid industry. Our goal is to publish books that actual aid workers actually want to read (as opposed to the vast majority of what’s written for the aid world which is absurdly dry, dull, boring, verbose, over-written, pretentious, self-important, and otherwise inaccessible to mere mortals like most of us). We are also passionate about providing opportunity for those who otherwise lack access to “formal” publishing spaces, including local aid workers and the recipients of aid programs, commonly known as “beneficiaries.”\n\n\n            </span>\n          </div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"col s12 m6 l6\">\n    <div class=\"card-panel hoverable z-depth-1\">\n      <div class=\"row\">\n        <div class=\"col s4 m2 l2\">\n          <a href=\"http://telekommunisten.net\"><img src=\"img/sponsor_telekommunisten.jpg\" alt=\"Telekommunisten\" class=\"responsive-img\" ></a>\n        </div>\n          <div class=\"col s8 m10 l10\">\n            <span class=\"black-text\">\n              The Telekommunist Manifesto is an exploration of class conflict and property, born from a realization of the primacy of economic capacity in social struggles. Emphasis is placed on the distribution of productive assets and their output. The interpretation here is always tethered to an understanding that wealth and power are intrinsically linked, and only through the for- mer can the latter be achieved. As a collective of intellectual workers, the work of Telekommunisten is very much rooted in the free software and free culture communities. However, a central premise of this Manifesto is that engaging in software development and the production of immaterial cultural works is not enough. The communization of immaterial property alone cannot change the distribution of material productive assets, and therefore cannot eliminate exploitation; only the self-organization of production by workers can.\n\n\n            </span>\n          </div>\n      </div>\n    </div>\n  </div>\n\n</div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("10", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n  <div class=\"col s12\">\n    <div class=\"container\">\n      <span class=\"brown-text text-darken-4\">\n        <h2 class=\"title\">Press Release</h2>\n      </span>\n    </div>\n  </div>\n</div>\n<div class=\"container\">\n      <iframe class=\"right\" width=\"420\" height=\"315\" src=\"https://www.youtube.com/embed/jAt9XyTOLGc\" frameborder=\"0\" allowfullscreen></iframe>\n      <div class=\"flow-text\"><h4><a href=\"http://whitesave.me\">Announcing <strong>White</strong>Save.me</a></h4>\n<p><a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a> is a revolutionary new platform that enables White Saviors to\ndeliver privilege to non-Whites whenever and wherever they need it with the\nsimple tap of a finger.</p>\n\n<p>Today’s White guy is increasingly told “check your privilege.” He often asks\nhimself “What am I supposed to do about my privilege? It’s not my fault I was\nborn white! And really, I’m not a bad person!”</p>\n\n<p>Until now, there has been no simple way for a White guy to be proactive in\naddressing the issue of his privilege. He’s been told that he benefits from\nbiased institutions and that his privilege is related to historically\nentrenched power structures. He’s told to be an ally but advised to take a back seat and follow the lead\nfrom people of color. Unfortunately this is all complex and time\nconsuming, and addressing privilege in this way is hard work.</p>\n\n<p>We need to address the issue of White\nprivilege now however - we can't wait. Changing attitudes, institutions, policies and structures takes\na long time, and we can’t expect White men or our current systems to\ngo through deep changes in order to address privilege and inequality at the\nroots. What we can do is leapfrog over what would normally require decades of\ngrassroots social organizing, education, policy change, and behavior change and put the\nsolution to White privilege directly into White men’s hands so that everyone\ncan get back to enjoying the American dream.</p>\n\n<p><a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a> – an innovative solution that enables White men to quickly and\neasily deliver privilege to the underprivileged, requiring only a few minutes\nof downtime, at their discretion and convenience.</p>\n\n<p>Though not everyone realizes it, White privilege affects a large number of\nWhite people, regardless of their age or political persuasion. What most White people want is a simple way to share their privilege while also keeping it fully intact. Our research has confirmed that\nmost White people would be willing to spend a few minutes every now and then sharing their privilege, as long as it does not require too much effort.</p>\n\n<p><a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a> is a revolutionary and innovative way of addressing this issue.\n(<a href=\"http://whitesave.me/#story\">Read Our Story</a> here to learn more about our discovery moments!) We’ve designed\na simple web and mobile platform that enables White men to quickly and easily\ndeliver a little bit of their excess privilege to non-Whites, all through a\nsimple and streamlined digital interface. Liberal Whites can assuage\nguilt and concern about their own privilege with the tap of a finger.\nConservatives can feel satisfied that they have passed along good values to\nnon-Whites. Libertarians can prove through direct digital action that tech can\nresolve complex issues without government intervention and via the free\nmarket. And non-White people of any economic status, all over the world, will\nbenefit from immediate access to White privilege directly through their\ndevices. Everyone wins – with no messy disruption of the status quo!</p>\n\n<h3 id=\"how-it-works\">How it Works</h3>\n\n<p>Visit our “<a href=\"http://whitesave.me/#how\">how it works</a>” page for more information, or simply “<a href=\"http://whitesave.me/#call\">try it now</a>” and\nyour first privilege delivery session is on us!  Our patented Facial Color\nRecognition Algorithm (™) will determine whether you qualify as a White Savior,\nbased on your skin color. (Alternatively it will classify you as a non-White\n‘Savee’). Once we determine your Whiteness, you’ll be automatically connected\nvia live video with a Savee who is lacking in White privilege so that you can\nshare some of your good sense and privileged counsel with him or her, or\nperiodically alleviate your guilt by offering advice and a one-off session of\nhelping someone who is less privileged.</p>\n\n<p>Our smart business model guarantees <a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a> will be around for as long as\nit's needed, and that we can continue innovating with technology to iterate new\nsolutions as technology advances. <a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a> is free for White Saviors to\ndeliver privilege, and non-Whites can choose from our Third World Freemium\nModel (free), our Basic Model ($9/month), or our Premium Model ($29/month). To\ngenerate additional revenue, our scientific analysis of non-White user data\nwill enable us to place targeted advertisements that allow investors and\npartners to extract value from the Base of the Pyramid. Non-Profit partners are\nencouraged to engage <a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a> as their tech partner for funding proposals,\nthereby appearing innovative and guaranteeing successful grant revenue.</p>\n\n<p>See our <a href=\"http://whitesave.me/#faq\">FAQs</a> for additional information and check out our <a href=\"http://whitesave.me/#success\">Success Stories</a> for\nmore on how <a href=\"http://whitesave.me\"><strong>White</strong>Save.me</a>, in just its first few months, has helped hundreds to\ndeliver privilege all over the world.</p>\n\n<p><a href=\"http://whitesave.me/#call\">Try It Now</a> and you’ll be immediately on your way to delivering privilege\nthrough our quick and easy digital solution!</p>\n\n<p>Contact <a href=\"mailto:help@whitesave.me\">help@whitesave.me</a> for more information.</p>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

(function() {
var _removeDefine = $__System.get("@@amd-helpers").createDefine();
(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define("11", [], factory);
  } else {
    root.headtrackr = factory();
  }
}(this, function() {
  var headtrackr = {};
  headtrackr.rev = 2;
  headtrackr.Tracker = function(params) {
    if (!params)
      params = {};
    if (params.smoothing === undefined)
      params.smoothing = true;
    if (params.retryDetection === undefined)
      params.retryDetection = true;
    if (params.ui === undefined)
      params.ui = true;
    if (params.debug === undefined) {
      params.debug = false;
    } else {
      if (params.debug.tagName != 'CANVAS') {
        params.debug = false;
      } else {
        var debugContext = params.debug.getContext('2d');
      }
    }
    if (params.detectionInterval === undefined)
      params.detectionInterval = 20;
    if (params.fadeVideo === undefined)
      params.fadeVideo = false;
    if (params.cameraOffset === undefined)
      params.cameraOffset = 11.5;
    if (params.calcAngles === undefined)
      params.calcAngles = false;
    if (params.headPosition === undefined)
      params.headPosition = true;
    var ui,
        smoother,
        facetracker,
        headposition,
        canvasContext,
        videoElement,
        detector;
    var detectionTimer;
    var fov = 0;
    var initialized = true;
    var run = false;
    var faceFound = false;
    var firstRun = true;
    var videoFaded = false;
    var headDiagonal = [];
    this.status = "";
    this.stream = undefined;
    var statusEvent = document.createEvent("Event");
    statusEvent.initEvent("headtrackrStatus", true, true);
    var headtrackerStatus = function(message) {
      statusEvent.status = message;
      document.dispatchEvent(statusEvent);
      this.status = message;
    }.bind(this);
    var insertAltVideo = function(video) {
      if (params.altVideo !== undefined) {
        if (supports_video()) {
          if (params.altVideo.ogv && supports_ogg_theora_video()) {
            video.src = params.altVideo.ogv;
          } else if (params.altVideo.mp4 && supports_h264_baseline_video()) {
            video.src = params.altVideo.mp4;
          } else if (params.altVideo.webm && supports_webm_video()) {
            video.src = params.altVideo.webm;
          } else {
            return false;
          }
          video.play();
          return true;
        }
      } else {
        return false;
      }
    };
    this.init = function(video, canvas, setupVideo) {
      if (setupVideo === undefined || setupVideo == true) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;
        if (navigator.getUserMedia) {
          headtrackerStatus("getUserMedia");
          var videoSelector = {
            video: true,
            audio: true
          };
          if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
            var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
            if (chromeVersion < 20) {
              videoSelector = "video";
            }
          }
          ;
          if (window.opera) {
            window.URL = window.URL || {};
            if (!window.URL.createObjectURL)
              window.URL.createObjectURL = function(obj) {
                return obj;
              };
          }
          navigator.getUserMedia(videoSelector, (function(stream) {
            headtrackerStatus("camera found");
            this.stream = stream;
            if (video.mozCaptureStream) {
              video.mozSrcObject = stream;
            } else {
              video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
            }
            video.play();
          }).bind(this), function() {
            headtrackerStatus("no camera");
            insertAltVideo(video);
          });
        } else {
          headtrackerStatus("no getUserMedia");
          if (!insertAltVideo(video)) {
            return false;
          }
        }
        video.addEventListener('playing', function() {
          if (video.width > video.height) {
            video.width = 320;
          } else {
            video.height = 240;
          }
        }, false);
      }
      videoElement = video;
      canvasElement = canvas;
      canvasContext = canvas.getContext("2d");
      if (params.ui) {
        ui = new headtrackr.Ui();
      }
      smoother = new headtrackr.Smoother(0.35, params.detectionInterval + 15);
      this.initialized = true;
    };
    var track = function() {
      canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      if (facetracker === undefined) {
        facetracker = new headtrackr.facetrackr.Tracker({
          debug: params.debug,
          calcAngles: params.calcAngles
        });
        facetracker.init(canvasElement);
      }
      facetracker.track();
      var faceObj = facetracker.getTrackingObject({debug: params.debug});
      if (faceObj.detection == "WB")
        headtrackerStatus("whitebalance");
      if (firstRun && faceObj.detection == "VJ")
        headtrackerStatus("detecting");
      if (!(faceObj.confidence == 0)) {
        if (faceObj.detection == "VJ") {
          if (detectionTimer === undefined) {
            detectionTimer = (new Date).getTime();
          }
          if (((new Date).getTime() - detectionTimer) > 5000) {
            headtrackerStatus("hints");
          }
          var x = (faceObj.x + faceObj.width / 2);
          var y = (faceObj.y + faceObj.height / 2);
          if (params.debug) {
            debugContext.strokeStyle = "#0000CC";
            debugContext.strokeRect(faceObj.x, faceObj.y, faceObj.width, faceObj.height);
          }
        }
        if (faceObj.detection == "CS") {
          var x = faceObj.x;
          var y = faceObj.y;
          if (detectionTimer !== undefined)
            detectionTimer = undefined;
          if (params.debug) {
            debugContext.translate(faceObj.x, faceObj.y);
            debugContext.rotate(faceObj.angle - (Math.PI / 2));
            debugContext.strokeStyle = "#00CC00";
            debugContext.strokeRect((-(faceObj.width / 2)) >> 0, (-(faceObj.height / 2)) >> 0, faceObj.width, faceObj.height);
            debugContext.rotate((Math.PI / 2) - faceObj.angle);
            debugContext.translate(-faceObj.x, -faceObj.y);
          }
          if (!videoFaded && params.fadeVideo) {
            fadeVideo();
            videoFaded = true;
          }
          this.status = 'tracking';
          if (faceObj.width == 0 || faceObj.height == 0) {
            if (params.retryDetection) {
              headtrackerStatus("redetecting");
              facetracker = new headtrackr.facetrackr.Tracker({
                whitebalancing: false,
                debug: params.debug,
                calcAngles: params.calcAngles
              });
              facetracker.init(canvasElement);
              faceFound = false;
              headposition = undefined;
              if (videoFaded) {
                videoElement.style.opacity = 1;
                videoFaded = false;
              }
            } else {
              headtrackerStatus("lost");
              this.stop();
            }
          } else {
            if (!faceFound) {
              headtrackerStatus("found");
              faceFound = true;
            }
            if (params.smoothing) {
              if (!smoother.initialized) {
                smoother.init(faceObj);
              }
              faceObj = smoother.smooth(faceObj);
            }
            if (headposition === undefined && params.headPosition) {
              var stable = false;
              var headdiag = Math.sqrt(faceObj.width * faceObj.width + faceObj.height * faceObj.height);
              if (headDiagonal.length < 6) {
                headDiagonal.push(headdiag);
              } else {
                headDiagonal.splice(0, 1);
                headDiagonal.push(headdiag);
                if ((Math.max.apply(null, headDiagonal) - Math.min.apply(null, headDiagonal)) < 5) {
                  stable = true;
                }
              }
              if (stable) {
                if (firstRun) {
                  if (params.fov === undefined) {
                    headposition = new headtrackr.headposition.Tracker(faceObj, canvasElement.width, canvasElement.height, {distance_from_camera_to_screen: params.cameraOffset});
                  } else {
                    headposition = new headtrackr.headposition.Tracker(faceObj, canvasElement.width, canvasElement.height, {
                      fov: params.fov,
                      distance_from_camera_to_screen: params.cameraOffset
                    });
                  }
                  fov = headposition.getFOV();
                  firstRun = false;
                } else {
                  headposition = new headtrackr.headposition.Tracker(faceObj, canvasElement.width, canvasElement.height, {
                    fov: fov,
                    distance_from_camera_to_screen: params.cameraOffset
                  });
                }
                headposition.track(faceObj);
              }
            } else if (params.headPosition) {
              headposition.track(faceObj);
            }
          }
        }
      }
      if (run) {
        detector = window.setTimeout(track, params.detectionInterval);
      }
    }.bind(this);
    var starter = function() {
      try {
        canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        var canvasContent = headtrackr.getWhitebalance(canvasElement);
        if (canvasContent > 0) {
          run = true;
          track();
        } else {
          window.setTimeout(starter, 100);
        }
      } catch (err) {
        window.setTimeout(starter, 100);
      }
    };
    this.start = function() {
      if (!this.initialized)
        return false;
      if (!(videoElement.currentTime > 0 && !videoElement.paused && !videoElement.ended)) {
        run = true;
        videoElement.addEventListener('playing', starter, false);
        return true;
      } else {
        starter();
      }
      return true;
    };
    this.stop = function() {
      window.clearTimeout(detector);
      run = false;
      headtrackerStatus("stopped");
      facetracker = undefined;
      faceFound = false;
      return true;
    };
    this.stopStream = function() {
      if (this.stream !== undefined) {
        this.stream.stop();
      }
    };
    this.getStream = function() {
      if (this.stream !== undefined) {
        return this.stream;
      }
    };
    this.getFOV = function() {
      return fov;
    };
    var fadeVideo = function() {
      if (videoElement.style.opacity == "") {
        videoElement.style.opacity = 0.98;
        window.setTimeout(fadeVideo, 50);
      } else if (videoElement.style.opacity > 0.30) {
        videoElement.style.opacity -= 0.02;
        window.setTimeout(fadeVideo, 50);
      } else {
        videoElement.style.opacity = 0.3;
      }
    };
  };
  if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
      if (typeof this !== "function") {
        throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
      }
      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function() {},
          fBound = function() {
            return fToBind.apply(this instanceof fNOP ? this : oThis || window, aArgs.concat(Array.prototype.slice.call(arguments)));
          };
      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();
      return fBound;
    };
  }
  function supports_video() {
    return !!document.createElement('video').canPlayType;
  }
  function supports_h264_baseline_video() {
    if (!supports_video()) {
      return false;
    }
    var v = document.createElement("video");
    return v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
  }
  function supports_ogg_theora_video() {
    if (!supports_video()) {
      return false;
    }
    var v = document.createElement("video");
    return v.canPlayType('video/ogg; codecs="theora, vorbis"');
  }
  function supports_webm_video() {
    if (!supports_video()) {
      return false;
    }
    var v = document.createElement("video");
    return v.canPlayType('video/webm; codecs="vp8, vorbis"');
  }
  headtrackr.ccv = {};
  headtrackr.ccv.grayscale = function(canvas) {
    var ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    var pix1,
        pix2,
        pix = canvas.width * canvas.height * 4;
    while (pix > 0)
      data[pix -= 4] = data[pix1 = pix + 1] = data[pix2 = pix + 2] = (data[pix] * 0.3 + data[pix1] * 0.59 + data[pix2] * 0.11);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };
  headtrackr.ccv.array_group = function(seq, gfunc) {
    var i,
        j;
    var node = new Array(seq.length);
    for (i = 0; i < seq.length; i++)
      node[i] = {
        "parent": -1,
        "element": seq[i],
        "rank": 0
      };
    for (i = 0; i < seq.length; i++) {
      if (!node[i].element)
        continue;
      var root = i;
      while (node[root].parent != -1)
        root = node[root].parent;
      for (j = 0; j < seq.length; j++) {
        if (i != j && node[j].element && gfunc(node[i].element, node[j].element)) {
          var root2 = j;
          while (node[root2].parent != -1)
            root2 = node[root2].parent;
          if (root2 != root) {
            if (node[root].rank > node[root2].rank)
              node[root2].parent = root;
            else {
              node[root].parent = root2;
              if (node[root].rank == node[root2].rank)
                node[root2].rank++;
              root = root2;
            }
            var temp,
                node2 = j;
            while (node[node2].parent != -1) {
              temp = node2;
              node2 = node[node2].parent;
              node[temp].parent = root;
            }
            node2 = i;
            while (node[node2].parent != -1) {
              temp = node2;
              node2 = node[node2].parent;
              node[temp].parent = root;
            }
          }
        }
      }
    }
    var idx = new Array(seq.length);
    var class_idx = 0;
    for (i = 0; i < seq.length; i++) {
      j = -1;
      var node1 = i;
      if (node[node1].element) {
        while (node[node1].parent != -1)
          node1 = node[node1].parent;
        if (node[node1].rank >= 0)
          node[node1].rank = ~class_idx++;
        j = ~node[node1].rank;
      }
      idx[i] = j;
    }
    return {
      "index": idx,
      "cat": class_idx
    };
  };
  headtrackr.ccv.detect_objects = function(canvas, cascade, interval, min_neighbors) {
    var scale = Math.pow(2, 1 / (interval + 1));
    var next = interval + 1;
    var scale_upto = Math.floor(Math.log(Math.min(cascade.width, cascade.height)) / Math.log(scale));
    var pyr = new Array((scale_upto + next * 2) * 4);
    pyr[0] = canvas;
    pyr[0].data = pyr[0].getContext("2d").getImageData(0, 0, pyr[0].width, pyr[0].height).data;
    var i,
        j,
        k,
        x,
        y,
        q;
    for (i = 1; i <= interval; i++) {
      pyr[i * 4] = document.createElement("canvas");
      pyr[i * 4].width = Math.floor(pyr[0].width / Math.pow(scale, i));
      pyr[i * 4].height = Math.floor(pyr[0].height / Math.pow(scale, i));
      pyr[i * 4].getContext("2d").drawImage(pyr[0], 0, 0, pyr[0].width, pyr[0].height, 0, 0, pyr[i * 4].width, pyr[i * 4].height);
      pyr[i * 4].data = pyr[i * 4].getContext("2d").getImageData(0, 0, pyr[i * 4].width, pyr[i * 4].height).data;
    }
    for (i = next; i < scale_upto + next * 2; i++) {
      pyr[i * 4] = document.createElement("canvas");
      pyr[i * 4].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
      pyr[i * 4].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
      pyr[i * 4].getContext("2d").drawImage(pyr[i * 4 - next * 4], 0, 0, pyr[i * 4 - next * 4].width, pyr[i * 4 - next * 4].height, 0, 0, pyr[i * 4].width, pyr[i * 4].height);
      pyr[i * 4].data = pyr[i * 4].getContext("2d").getImageData(0, 0, pyr[i * 4].width, pyr[i * 4].height).data;
    }
    for (i = next * 2; i < scale_upto + next * 2; i++) {
      pyr[i * 4 + 1] = document.createElement("canvas");
      pyr[i * 4 + 1].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
      pyr[i * 4 + 1].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
      pyr[i * 4 + 1].getContext("2d").drawImage(pyr[i * 4 - next * 4], 1, 0, pyr[i * 4 - next * 4].width - 1, pyr[i * 4 - next * 4].height, 0, 0, pyr[i * 4 + 1].width - 2, pyr[i * 4 + 1].height);
      pyr[i * 4 + 1].data = pyr[i * 4 + 1].getContext("2d").getImageData(0, 0, pyr[i * 4 + 1].width, pyr[i * 4 + 1].height).data;
      pyr[i * 4 + 2] = document.createElement("canvas");
      pyr[i * 4 + 2].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
      pyr[i * 4 + 2].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
      pyr[i * 4 + 2].getContext("2d").drawImage(pyr[i * 4 - next * 4], 0, 1, pyr[i * 4 - next * 4].width, pyr[i * 4 - next * 4].height - 1, 0, 0, pyr[i * 4 + 2].width, pyr[i * 4 + 2].height - 2);
      pyr[i * 4 + 2].data = pyr[i * 4 + 2].getContext("2d").getImageData(0, 0, pyr[i * 4 + 2].width, pyr[i * 4 + 2].height).data;
      pyr[i * 4 + 3] = document.createElement("canvas");
      pyr[i * 4 + 3].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
      pyr[i * 4 + 3].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
      pyr[i * 4 + 3].getContext("2d").drawImage(pyr[i * 4 - next * 4], 1, 1, pyr[i * 4 - next * 4].width - 1, pyr[i * 4 - next * 4].height - 1, 0, 0, pyr[i * 4 + 3].width - 2, pyr[i * 4 + 3].height - 2);
      pyr[i * 4 + 3].data = pyr[i * 4 + 3].getContext("2d").getImageData(0, 0, pyr[i * 4 + 3].width, pyr[i * 4 + 3].height).data;
    }
    for (j = 0; j < cascade.stage_classifier.length; j++)
      cascade.stage_classifier[j].orig_feature = cascade.stage_classifier[j].feature;
    var scale_x = 1,
        scale_y = 1;
    var dx = [0, 1, 0, 1];
    var dy = [0, 0, 1, 1];
    var seq = [];
    for (i = 0; i < scale_upto; i++) {
      var qw = pyr[i * 4 + next * 8].width - Math.floor(cascade.width / 4);
      var qh = pyr[i * 4 + next * 8].height - Math.floor(cascade.height / 4);
      var step = [pyr[i * 4].width * 4, pyr[i * 4 + next * 4].width * 4, pyr[i * 4 + next * 8].width * 4];
      var paddings = [pyr[i * 4].width * 16 - qw * 16, pyr[i * 4 + next * 4].width * 8 - qw * 8, pyr[i * 4 + next * 8].width * 4 - qw * 4];
      for (j = 0; j < cascade.stage_classifier.length; j++) {
        var orig_feature = cascade.stage_classifier[j].orig_feature;
        var feature = cascade.stage_classifier[j].feature = new Array(cascade.stage_classifier[j].count);
        for (k = 0; k < cascade.stage_classifier[j].count; k++) {
          feature[k] = {
            "size": orig_feature[k].size,
            "px": new Array(orig_feature[k].size),
            "pz": new Array(orig_feature[k].size),
            "nx": new Array(orig_feature[k].size),
            "nz": new Array(orig_feature[k].size)
          };
          for (q = 0; q < orig_feature[k].size; q++) {
            feature[k].px[q] = orig_feature[k].px[q] * 4 + orig_feature[k].py[q] * step[orig_feature[k].pz[q]];
            feature[k].pz[q] = orig_feature[k].pz[q];
            feature[k].nx[q] = orig_feature[k].nx[q] * 4 + orig_feature[k].ny[q] * step[orig_feature[k].nz[q]];
            feature[k].nz[q] = orig_feature[k].nz[q];
          }
        }
      }
      for (q = 0; q < 4; q++) {
        var u8 = [pyr[i * 4].data, pyr[i * 4 + next * 4].data, pyr[i * 4 + next * 8 + q].data];
        var u8o = [dx[q] * 8 + dy[q] * pyr[i * 4].width * 8, dx[q] * 4 + dy[q] * pyr[i * 4 + next * 4].width * 4, 0];
        for (y = 0; y < qh; y++) {
          for (x = 0; x < qw; x++) {
            var sum = 0;
            var flag = true;
            for (j = 0; j < cascade.stage_classifier.length; j++) {
              sum = 0;
              var alpha = cascade.stage_classifier[j].alpha;
              var feature = cascade.stage_classifier[j].feature;
              for (k = 0; k < cascade.stage_classifier[j].count; k++) {
                var feature_k = feature[k];
                var p,
                    pmin = u8[feature_k.pz[0]][u8o[feature_k.pz[0]] + feature_k.px[0]];
                var n,
                    nmax = u8[feature_k.nz[0]][u8o[feature_k.nz[0]] + feature_k.nx[0]];
                if (pmin <= nmax) {
                  sum += alpha[k * 2];
                } else {
                  var f,
                      shortcut = true;
                  for (f = 0; f < feature_k.size; f++) {
                    if (feature_k.pz[f] >= 0) {
                      p = u8[feature_k.pz[f]][u8o[feature_k.pz[f]] + feature_k.px[f]];
                      if (p < pmin) {
                        if (p <= nmax) {
                          shortcut = false;
                          break;
                        }
                        pmin = p;
                      }
                    }
                    if (feature_k.nz[f] >= 0) {
                      n = u8[feature_k.nz[f]][u8o[feature_k.nz[f]] + feature_k.nx[f]];
                      if (n > nmax) {
                        if (pmin <= n) {
                          shortcut = false;
                          break;
                        }
                        nmax = n;
                      }
                    }
                  }
                  sum += (shortcut) ? alpha[k * 2 + 1] : alpha[k * 2];
                }
              }
              if (sum < cascade.stage_classifier[j].threshold) {
                flag = false;
                break;
              }
            }
            if (flag) {
              seq.push({
                "x": (x * 4 + dx[q] * 2) * scale_x,
                "y": (y * 4 + dy[q] * 2) * scale_y,
                "width": cascade.width * scale_x,
                "height": cascade.height * scale_y,
                "neighbor": 1,
                "confidence": sum
              });
            }
            u8o[0] += 16;
            u8o[1] += 8;
            u8o[2] += 4;
          }
          u8o[0] += paddings[0];
          u8o[1] += paddings[1];
          u8o[2] += paddings[2];
        }
      }
      scale_x *= scale;
      scale_y *= scale;
    }
    for (j = 0; j < cascade.stage_classifier.length; j++)
      cascade.stage_classifier[j].feature = cascade.stage_classifier[j].orig_feature;
    if (!(min_neighbors > 0))
      return seq;
    else {
      var result = headtrackr.ccv.array_group(seq, function(r1, r2) {
        var distance = Math.floor(r1.width * 0.25 + 0.5);
        return r2.x <= r1.x + distance && r2.x >= r1.x - distance && r2.y <= r1.y + distance && r2.y >= r1.y - distance && r2.width <= Math.floor(r1.width * 1.5 + 0.5) && Math.floor(r2.width * 1.5 + 0.5) >= r1.width;
      });
      var ncomp = result.cat;
      var idx_seq = result.index;
      var comps = new Array(ncomp + 1);
      for (i = 0; i < comps.length; i++)
        comps[i] = {
          "neighbors": 0,
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "confidence": 0
        };
      for (i = 0; i < seq.length; i++) {
        var r1 = seq[i];
        var idx = idx_seq[i];
        if (comps[idx].neighbors == 0)
          comps[idx].confidence = r1.confidence;
        ++comps[idx].neighbors;
        comps[idx].x += r1.x;
        comps[idx].y += r1.y;
        comps[idx].width += r1.width;
        comps[idx].height += r1.height;
        comps[idx].confidence = Math.max(comps[idx].confidence, r1.confidence);
      }
      var seq2 = [];
      for (i = 0; i < ncomp; i++) {
        var n = comps[i].neighbors;
        if (n >= min_neighbors)
          seq2.push({
            "x": (comps[i].x * 2 + n) / (2 * n),
            "y": (comps[i].y * 2 + n) / (2 * n),
            "width": (comps[i].width * 2 + n) / (2 * n),
            "height": (comps[i].height * 2 + n) / (2 * n),
            "neighbors": comps[i].neighbors,
            "confidence": comps[i].confidence
          });
      }
      var result_seq = [];
      for (i = 0; i < seq2.length; i++) {
        var r1 = seq2[i];
        var flag = true;
        for (j = 0; j < seq2.length; j++) {
          var r2 = seq2[j];
          var distance = Math.floor(r2.width * 0.25 + 0.5);
          if (i != j && r1.x >= r2.x - distance && r1.y >= r2.y - distance && r1.x + r1.width <= r2.x + r2.width + distance && r1.y + r1.height <= r2.y + r2.height + distance && (r2.neighbors > Math.max(3, r1.neighbors) || r1.neighbors < 3)) {
            flag = false;
            break;
          }
        }
        if (flag)
          result_seq.push(r1);
      }
      return result_seq;
    }
  };
  headtrackr.cascade = {
    "count": 16,
    "width": 24,
    "height": 24,
    "stage_classifier": [{
      "count": 4,
      "threshold": -4.577530e+00,
      "feature": [{
        "size": 4,
        "px": [3, 5, 8, 11],
        "py": [2, 2, 6, 3],
        "pz": [2, 1, 1, 0],
        "nx": [8, 4, 0, 0],
        "ny": [4, 4, 0, 0],
        "nz": [1, 1, -1, -1]
      }, {
        "size": 3,
        "px": [3, 6, 7],
        "py": [7, 13, 0],
        "pz": [1, 0, -1],
        "nx": [2, 3, 4],
        "ny": [5, 4, 4],
        "nz": [2, 1, 1]
      }, {
        "size": 5,
        "px": [5, 3, 10, 13, 11],
        "py": [1, 0, 3, 2, 2],
        "pz": [1, 2, 0, 0, 0],
        "nx": [0, 11, 0, 11, 11],
        "ny": [0, 2, 3, 1, 1],
        "nz": [1, 1, 0, 1, -1]
      }, {
        "size": 5,
        "px": [6, 12, 12, 9, 12],
        "py": [4, 13, 12, 7, 11],
        "pz": [1, 0, 0, 1, 0],
        "nx": [8, 0, 8, 2, 11],
        "ny": [4, 0, 8, 5, 1],
        "nz": [1, -1, -1, -1, -1]
      }],
      "alpha": [-2.879683e+00, 2.879683e+00, -1.569341e+00, 1.569341e+00, -1.286131e+00, 1.286131e+00, -1.157626e+00, 1.157626e+00]
    }, {
      "count": 4,
      "threshold": -4.339908e+00,
      "feature": [{
        "size": 5,
        "px": [13, 12, 3, 11, 17],
        "py": [3, 3, 1, 4, 13],
        "pz": [0, 0, 2, 0, 0],
        "nx": [4, 3, 8, 15, 15],
        "ny": [4, 5, 4, 8, 8],
        "nz": [1, 2, 1, 0, -1]
      }, {
        "size": 5,
        "px": [6, 7, 6, 3, 3],
        "py": [13, 13, 4, 2, 7],
        "pz": [0, 0, 1, 2, 1],
        "nx": [4, 8, 3, 0, 15],
        "ny": [4, 4, 4, 3, 8],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [2, 2, 11],
        "py": [3, 2, 5],
        "pz": [2, 2, 0],
        "nx": [3, 8, 3],
        "ny": [4, 4, 4],
        "nz": [1, -1, -1]
      }, {
        "size": 5,
        "px": [15, 13, 9, 11, 7],
        "py": [2, 1, 2, 1, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [23, 11, 23, 22, 23],
        "ny": [1, 0, 2, 0, 0],
        "nz": [0, 1, 0, 0, 0]
      }],
      "alpha": [-2.466029e+00, 2.466029e+00, -1.839510e+00, 1.839510e+00, -1.060559e+00, 1.060559e+00, -1.094927e+00, 1.094927e+00]
    }, {
      "count": 7,
      "threshold": -5.052474e+00,
      "feature": [{
        "size": 5,
        "px": [17, 13, 3, 11, 10],
        "py": [13, 2, 1, 4, 3],
        "pz": [0, 0, 2, 0, 0],
        "nx": [4, 8, 8, 3, 7],
        "ny": [2, 8, 4, 5, 4],
        "nz": [2, 0, 1, 2, 1]
      }, {
        "size": 5,
        "px": [6, 7, 3, 6, 6],
        "py": [4, 12, 2, 13, 14],
        "pz": [1, 0, 2, 0, 0],
        "nx": [8, 3, 4, 4, 3],
        "ny": [4, 4, 2, 0, 2],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [7, 4, 5, 3, 3],
        "py": [2, 1, 3, 1, 1],
        "pz": [0, 1, 0, 1, -1],
        "nx": [1, 0, 1, 1, 0],
        "ny": [1, 3, 2, 0, 4],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [11, 11, 11, 3, 2],
        "py": [11, 13, 10, 7, 2],
        "pz": [0, 0, 0, 1, 2],
        "nx": [4, 1, 8, 2, 0],
        "ny": [4, 1, 12, 0, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [9, 13, 1],
        "py": [7, 19, 4],
        "pz": [1, -1, -1],
        "nx": [4, 7, 4],
        "ny": [5, 8, 2],
        "nz": [2, 1, 2]
      }, {
        "size": 5,
        "px": [12, 8, 16, 4, 4],
        "py": [12, 1, 2, 0, 0],
        "pz": [0, 1, 0, 2, -1],
        "nx": [11, 22, 11, 23, 23],
        "ny": [2, 0, 1, 1, 5],
        "nz": [1, 0, 1, 0, 0]
      }, {
        "size": 3,
        "px": [11, 17, 17],
        "py": [6, 11, 12],
        "pz": [0, 0, 0],
        "nx": [15, 1, 11],
        "ny": [9, 1, 1],
        "nz": [0, -1, -1]
      }],
      "alpha": [-2.156890e+00, 2.156890e+00, -1.718246e+00, 1.718246e+00, -9.651329e-01, 9.651329e-01, -9.948090e-01, 9.948090e-01, -8.802466e-01, 8.802466e-01, -8.486741e-01, 8.486741e-01, -8.141777e-01, 8.141777e-01]
    }, {
      "count": 13,
      "threshold": -5.774400e+00,
      "feature": [{
        "size": 5,
        "px": [6, 10, 3, 12, 14],
        "py": [5, 3, 1, 2, 2],
        "pz": [1, 0, 2, 0, 0],
        "nx": [3, 4, 14, 8, 4],
        "ny": [5, 4, 8, 4, 2],
        "nz": [2, 1, 0, 1, 2]
      }, {
        "size": 5,
        "px": [10, 6, 11, 5, 12],
        "py": [4, 13, 4, 2, 4],
        "pz": [0, 0, 0, 1, 0],
        "nx": [1, 4, 8, 1, 1],
        "ny": [2, 4, 4, 4, 3],
        "nz": [0, 1, 1, 0, 0]
      }, {
        "size": 3,
        "px": [18, 6, 12],
        "py": [12, 4, 8],
        "pz": [0, 1, 0],
        "nx": [7, 4, 8],
        "ny": [4, 2, 4],
        "nz": [1, -1, -1]
      }, {
        "size": 5,
        "px": [7, 5, 6, 3, 17],
        "py": [13, 12, 3, 8, 13],
        "pz": [0, 0, 1, 1, 0],
        "nx": [3, 3, 0, 1, 8],
        "ny": [4, 5, 5, 10, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [16, 7, 16, 7, 7],
        "py": [1, 1, 2, 0, 0],
        "pz": [0, 1, 0, 1, -1],
        "nx": [23, 23, 23, 11, 5],
        "ny": [2, 14, 1, 2, 1],
        "nz": [0, 0, 0, 1, 2]
      }, {
        "size": 3,
        "px": [9, 18, 16],
        "py": [7, 14, 2],
        "pz": [1, 0, -1],
        "nx": [8, 4, 9],
        "ny": [10, 2, 4],
        "nz": [1, 2, 1]
      }, {
        "size": 4,
        "px": [3, 16, 1, 22],
        "py": [7, 4, 5, 11],
        "pz": [1, -1, -1, -1],
        "nx": [3, 9, 4, 2],
        "ny": [4, 9, 7, 5],
        "nz": [1, 0, 1, 2]
      }, {
        "size": 5,
        "px": [4, 7, 8, 8, 9],
        "py": [0, 2, 2, 1, 1],
        "pz": [1, 0, 0, 0, 0],
        "nx": [0, 0, 1, 0, 0],
        "ny": [15, 16, 19, 0, 14],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 5,
        "px": [4, 4, 7, 8, 12],
        "py": [2, 5, 6, 7, 10],
        "pz": [2, 2, 1, 1, 0],
        "nx": [8, 5, 10, 0, 0],
        "ny": [4, 2, 5, 3, 14],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 0],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [3, 14],
        "ny": [4, 16],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [17, 8, 18, 4, 4],
        "py": [3, 1, 3, 0, 0],
        "pz": [0, 1, 0, 2, -1],
        "nx": [21, 22, 5, 11, 22],
        "ny": [0, 1, 0, 1, 2],
        "nz": [0, 0, 2, 1, 0]
      }, {
        "size": 4,
        "px": [7, 8, 2, 11],
        "py": [13, 12, 2, 7],
        "pz": [0, 0, 2, 0],
        "nx": [4, 0, 23, 3],
        "ny": [4, 1, 1, 11],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [4, 18, 8, 9, 15],
        "py": [4, 16, 7, 7, 23],
        "pz": [2, 0, 1, 1, 0],
        "nx": [0, 1, 1, 1, 1],
        "ny": [10, 21, 23, 22, 22],
        "nz": [1, 0, 0, 0, -1]
      }],
      "alpha": [-1.956565e+00, 1.956565e+00, -1.262438e+00, 1.262438e+00, -1.056941e+00, 1.056941e+00, -9.712509e-01, 9.712509e-01, -8.261028e-01, 8.261028e-01, -8.456506e-01, 8.456506e-01, -6.652113e-01, 6.652113e-01, -6.026287e-01, 6.026287e-01, -6.915425e-01, 6.915425e-01, -5.539286e-01, 5.539286e-01, -5.515072e-01, 5.515072e-01, -6.685884e-01, 6.685884e-01, -4.656070e-01, 4.656070e-01]
    }, {
      "count": 20,
      "threshold": -5.606853e+00,
      "feature": [{
        "size": 5,
        "px": [17, 11, 6, 14, 9],
        "py": [13, 4, 4, 3, 3],
        "pz": [0, 0, 1, 0, 0],
        "nx": [14, 4, 8, 7, 8],
        "ny": [8, 4, 4, 4, 8],
        "nz": [0, 1, 1, 1, 0]
      }, {
        "size": 5,
        "px": [3, 9, 10, 11, 11],
        "py": [7, 2, 2, 3, 3],
        "pz": [1, 0, 0, 0, -1],
        "nx": [3, 8, 4, 2, 5],
        "ny": [4, 4, 10, 2, 8],
        "nz": [1, 1, 1, 2, 1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 5, 12],
        "py": [12, 9, 10, 12, 11],
        "pz": [0, 0, 0, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [2, 1, 3, 0, 0],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [9, 18, 9, 9, 12],
        "py": [7, 14, 19, 5, 11],
        "pz": [1, -1, -1, -1, -1],
        "nx": [23, 4, 23, 23, 8],
        "ny": [13, 5, 14, 16, 4],
        "nz": [0, 2, 0, 0, 1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 6, 1],
        "py": [13, 11, 12, 6, 5],
        "pz": [0, 0, 0, -1, -1],
        "nx": [4, 6, 8, 4, 9],
        "ny": [2, 8, 4, 4, 4],
        "nz": [2, 1, 1, 1, 1]
      }, {
        "size": 4,
        "px": [12, 11, 11, 6],
        "py": [5, 5, 6, 13],
        "pz": [0, 0, 0, 0],
        "nx": [8, 3, 2, 8],
        "ny": [4, 4, 17, 2],
        "nz": [1, 1, -1, -1]
      }, {
        "size": 5,
        "px": [3, 14, 12, 15, 13],
        "py": [0, 2, 2, 2, 2],
        "pz": [2, 0, 0, 0, 0],
        "nx": [22, 23, 22, 23, 7],
        "ny": [0, 3, 1, 2, 4],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [16, 15, 18, 19, 9],
        "py": [12, 11, 12, 12, 9],
        "pz": [0, 0, 0, 0, 1],
        "nx": [8, 2, 22, 23, 21],
        "ny": [4, 1, 1, 2, 20],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [4, 7, 7],
        "py": [0, 2, 2],
        "pz": [1, 0, -1],
        "nx": [1, 2, 2],
        "ny": [2, 0, 2],
        "nz": [1, 0, 0]
      }, {
        "size": 3,
        "px": [4, 11, 11],
        "py": [6, 9, 8],
        "pz": [1, 0, 0],
        "nx": [9, 2, 8],
        "ny": [9, 4, 5],
        "nz": [0, -1, -1]
      }, {
        "size": 4,
        "px": [2, 7, 6, 6],
        "py": [4, 23, 21, 22],
        "pz": [2, 0, 0, 0],
        "nx": [9, 3, 8, 17],
        "ny": [21, 2, 5, 1],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 8],
        "py": [4, 12],
        "pz": [2, 0],
        "nx": [3, 0],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [4, 5, 1, 8, 4],
        "py": [15, 12, 3, 23, 12],
        "pz": [0, 0, 2, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [23, 10, 22, 21, 11],
        "nz": [0, 1, 0, 0, -1]
      }, {
        "size": 2,
        "px": [21, 5],
        "py": [13, 4],
        "pz": [0, 2],
        "nx": [23, 4],
        "ny": [23, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [15, 17],
        "py": [2, 3],
        "pz": [0, 0],
        "nx": [19, 20],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [12, 1, 8, 17, 4],
        "py": [14, 2, 13, 6, 12],
        "pz": [0, -1, -1, -1, -1],
        "nx": [8, 13, 15, 15, 7],
        "ny": [10, 9, 15, 14, 8],
        "nz": [1, 0, 0, 0, 1]
      }, {
        "size": 2,
        "px": [8, 5],
        "py": [7, 4],
        "pz": [1, -1],
        "nx": [4, 13],
        "ny": [2, 21],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [4, 2],
        "ny": [7, 5],
        "nz": [1, 2]
      }, {
        "size": 4,
        "px": [4, 14, 3, 11],
        "py": [3, 23, 2, 5],
        "pz": [2, 0, 2, 0],
        "nx": [7, 8, 2, 16],
        "ny": [8, 0, 1, 15],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [9, 8],
        "py": [0, 0],
        "pz": [0, 0],
        "nx": [2, 2],
        "ny": [3, 5],
        "nz": [2, 2]
      }],
      "alpha": [-1.957970e+00, 1.957970e+00, -1.225984e+00, 1.225984e+00, -8.310246e-01, 8.310246e-01, -8.315741e-01, 8.315741e-01, -7.973616e-01, 7.973616e-01, -7.661959e-01, 7.661959e-01, -6.042118e-01, 6.042118e-01, -6.506833e-01, 6.506833e-01, -4.808219e-01, 4.808219e-01, -6.079504e-01, 6.079504e-01, -5.163994e-01, 5.163994e-01, -5.268142e-01, 5.268142e-01, -4.935685e-01, 4.935685e-01, -4.427544e-01, 4.427544e-01, -4.053949e-01, 4.053949e-01, -4.701274e-01, 4.701274e-01, -4.387648e-01, 4.387648e-01, -4.305499e-01, 4.305499e-01, -4.042607e-01, 4.042607e-01, -4.372088e-01, 4.372088e-01]
    }, {
      "count": 22,
      "threshold": -5.679317e+00,
      "feature": [{
        "size": 5,
        "px": [11, 3, 17, 14, 13],
        "py": [4, 0, 13, 2, 3],
        "pz": [0, 2, 0, 0, 0],
        "nx": [7, 4, 14, 23, 11],
        "ny": [8, 4, 8, 4, 0],
        "nz": [1, 1, 0, 0, 1]
      }, {
        "size": 5,
        "px": [7, 12, 6, 12, 12],
        "py": [12, 8, 3, 10, 9],
        "pz": [0, 0, 1, 0, 0],
        "nx": [4, 9, 8, 15, 15],
        "ny": [4, 8, 4, 8, 8],
        "nz": [1, 0, 1, 0, -1]
      }, {
        "size": 3,
        "px": [4, 2, 10],
        "py": [1, 4, 1],
        "pz": [1, 2, 0],
        "nx": [2, 3, 8],
        "ny": [5, 4, 4],
        "nz": [2, 1, -1]
      }, {
        "size": 5,
        "px": [3, 17, 6, 6, 16],
        "py": [2, 12, 4, 14, 12],
        "pz": [2, 0, 1, 0, 0],
        "nx": [8, 3, 7, 5, 15],
        "ny": [4, 4, 4, 4, 8],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [5, 6, 7, 4, 8],
        "py": [3, 3, 3, 1, 3],
        "pz": [0, 0, 0, 1, 0],
        "nx": [0, 0, 0, 0, 1],
        "ny": [5, 4, 3, 2, 0],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 3,
        "px": [18, 9, 0],
        "py": [14, 7, 0],
        "pz": [0, 1, -1],
        "nx": [8, 14, 8],
        "ny": [10, 9, 4],
        "nz": [1, 0, 1]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [18, 13],
        "pz": [0, 0],
        "nx": [10, 3],
        "ny": [16, 4],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [11, 11, 11, 11, 6],
        "py": [10, 12, 11, 13, 6],
        "pz": [0, 0, 0, 0, -1],
        "nx": [5, 21, 22, 22, 22],
        "ny": [4, 22, 17, 19, 18],
        "nz": [2, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [8, 9, 15, 4],
        "py": [7, 7, 23, 4],
        "pz": [1, 1, 0, 2],
        "nx": [8, 5, 0, 3],
        "ny": [4, 18, 4, 9],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [11, 10, 12, 11, 11],
        "py": [4, 4, 4, 5, 5],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 6, 8, 2, 8],
        "ny": [4, 9, 9, 2, 4],
        "nz": [1, 1, 0, 2, 1]
      }, {
        "size": 5,
        "px": [2, 2, 3, 3, 4],
        "py": [10, 9, 14, 13, 15],
        "pz": [1, 1, 0, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [5, 9, 10, 19, 18],
        "nz": [2, 1, 1, 0, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [13, 12],
        "pz": [0, 0],
        "nx": [9, 2],
        "ny": [15, 2],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [2, 4, 3, 3, 4],
        "py": [5, 11, 6, 9, 12],
        "pz": [1, 0, 1, 0, 0],
        "nx": [6, 2, 11, 11, 0],
        "ny": [9, 1, 5, 20, 18],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [18, 9, 17, 19, 16],
        "py": [2, 0, 2, 2, 1],
        "pz": [0, 1, 0, 0, 0],
        "nx": [22, 23, 11, 23, 23],
        "ny": [0, 2, 0, 1, 1],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 5,
        "px": [5, 5, 6, 7, 6],
        "py": [17, 16, 15, 23, 22],
        "pz": [0, 0, 0, 0, 0],
        "nx": [7, 6, 2, 5, 23],
        "ny": [8, 1, 2, 3, 1],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [12, 12, 11, 10, 6],
        "py": [14, 13, 18, 4, 22],
        "pz": [0, -1, -1, -1, -1],
        "nx": [3, 2, 4, 1, 2],
        "ny": [19, 4, 23, 13, 16],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [11, 16, 11, 17],
        "py": [7, 11, 8, 12],
        "pz": [0, 0, 0, 0],
        "nx": [7, 14, 10, 4],
        "ny": [4, 7, 10, 4],
        "nz": [1, 0, -1, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [4, 2],
        "ny": [10, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 9],
        "py": [0, 1],
        "pz": [1, 0],
        "nx": [4, 5],
        "ny": [1, 0],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [14, 16],
        "py": [3, 3],
        "pz": [0, 0],
        "nx": [9, 14],
        "ny": [4, 21],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [9, 1],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [8, 9],
        "ny": [7, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [8, 3],
        "pz": [0, 2],
        "nx": [20, 0],
        "ny": [3, 3],
        "nz": [0, -1]
      }],
      "alpha": [-1.581077e+00, 1.581077e+00, -1.389689e+00, 1.389689e+00, -8.733094e-01, 8.733094e-01, -8.525177e-01, 8.525177e-01, -7.416304e-01, 7.416304e-01, -6.609002e-01, 6.609002e-01, -7.119043e-01, 7.119043e-01, -6.204438e-01, 6.204438e-01, -6.638519e-01, 6.638519e-01, -5.518876e-01, 5.518876e-01, -4.898991e-01, 4.898991e-01, -5.508243e-01, 5.508243e-01, -4.635525e-01, 4.635525e-01, -5.163159e-01, 5.163159e-01, -4.495338e-01, 4.495338e-01, -4.515036e-01, 4.515036e-01, -5.130473e-01, 5.130473e-01, -4.694233e-01, 4.694233e-01, -4.022514e-01, 4.022514e-01, -4.055690e-01, 4.055690e-01, -4.151817e-01, 4.151817e-01, -3.352302e-01, 3.352302e-01]
    }, {
      "count": 32,
      "threshold": -5.363782e+00,
      "feature": [{
        "size": 5,
        "px": [12, 9, 6, 8, 14],
        "py": [4, 2, 13, 3, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [0, 15, 0, 9, 5],
        "ny": [2, 7, 3, 8, 8],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [13, 16, 3, 6, 11],
        "py": [3, 13, 1, 4, 3],
        "pz": [0, 0, 2, 1, 0],
        "nx": [7, 4, 8, 14, 14],
        "ny": [4, 4, 4, 8, 8],
        "nz": [1, 1, 1, 0, -1]
      }, {
        "size": 5,
        "px": [10, 19, 18, 19, 19],
        "py": [6, 13, 13, 12, 12],
        "pz": [1, 0, 0, 0, -1],
        "nx": [23, 5, 23, 23, 11],
        "ny": [12, 2, 13, 14, 8],
        "nz": [0, 2, 0, 0, 1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 12, 6],
        "py": [11, 13, 12, 10, 6],
        "pz": [0, 0, 0, 0, 1],
        "nx": [6, 8, 3, 9, 9],
        "ny": [8, 4, 4, 4, 4],
        "nz": [1, 1, 1, 1, -1]
      }, {
        "size": 5,
        "px": [5, 3, 5, 8, 11],
        "py": [12, 8, 3, 11, 8],
        "pz": [0, 1, 1, 0, 0],
        "nx": [4, 0, 1, 1, 9],
        "ny": [4, 3, 4, 3, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [13, 3, 12, 14, 12],
        "py": [1, 0, 1, 2, 3],
        "pz": [0, 2, 0, 0, 0],
        "nx": [7, 9, 8, 4, 4],
        "ny": [5, 4, 10, 2, 2],
        "nz": [1, 1, 1, 2, -1]
      }, {
        "size": 5,
        "px": [18, 16, 12, 15, 8],
        "py": [12, 23, 7, 11, 8],
        "pz": [0, 0, 0, 0, 1],
        "nx": [8, 6, 10, 12, 4],
        "ny": [4, 4, 10, 6, 3],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [4, 4, 5, 2, 2],
        "py": [13, 14, 14, 7, 7],
        "pz": [0, 0, 0, 1, -1],
        "nx": [0, 0, 0, 0, 1],
        "ny": [15, 4, 14, 13, 17],
        "nz": [0, 2, 0, 0, 0]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [7, 7],
        "pz": [1, -1],
        "nx": [4, 7],
        "ny": [5, 8],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [3, 4, 6, 5, 4],
        "py": [2, 2, 14, 6, 9],
        "pz": [1, 1, 0, 1, 1],
        "nx": [23, 23, 23, 23, 11],
        "ny": [0, 3, 2, 1, 0],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 3,
        "px": [10, 2, 3],
        "py": [23, 4, 7],
        "pz": [0, 2, 1],
        "nx": [10, 21, 23],
        "ny": [21, 9, 2],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [20, 21, 21, 10, 12],
        "py": [13, 12, 8, 8, 12],
        "pz": [0, 0, 0, 1, 0],
        "nx": [8, 16, 3, 3, 11],
        "ny": [4, 8, 4, 3, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 21],
        "py": [4, 12],
        "pz": [2, -1],
        "nx": [2, 3],
        "ny": [5, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [8, 5, 6, 8, 7],
        "py": [0, 2, 1, 1, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [3, 2, 2, 2, 2],
        "ny": [0, 0, 1, 2, 2],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [11, 2, 2, 11, 10],
        "py": [10, 12, 8, 11, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [3, 5, 2, 4, 2],
        "ny": [4, 1, 4, 2, 2],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [15, 16, 8, 17],
        "py": [2, 1, 0, 2],
        "pz": [0, 0, 1, 0],
        "nx": [19, 20, 0, 8],
        "ny": [1, 2, 11, 10],
        "nz": [0, 0, -1, -1]
      }, {
        "size": 2,
        "px": [17, 16],
        "py": [12, 12],
        "pz": [0, 0],
        "nx": [8, 9],
        "ny": [5, 1],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [11, 11, 0, 0],
        "py": [12, 13, 0, 0],
        "pz": [0, 0, -1, -1],
        "nx": [10, 10, 9, 10],
        "ny": [10, 12, 13, 11],
        "nz": [0, 0, 0, 0]
      }, {
        "size": 3,
        "px": [11, 10, 8],
        "py": [5, 2, 6],
        "pz": [0, -1, -1],
        "nx": [8, 12, 4],
        "ny": [4, 17, 4],
        "nz": [1, 0, 1]
      }, {
        "size": 5,
        "px": [10, 21, 10, 20, 20],
        "py": [11, 13, 7, 13, 14],
        "pz": [1, 0, 1, 0, 0],
        "nx": [23, 23, 11, 23, 17],
        "ny": [23, 22, 11, 21, 21],
        "nz": [0, 0, 1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [3, 9],
        "pz": [2, 1],
        "nx": [9, 23],
        "ny": [4, 22],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [3, 2, 2, 5],
        "py": [11, 5, 4, 20],
        "pz": [1, 2, 2, 0],
        "nx": [4, 23, 11, 23],
        "ny": [10, 22, 11, 21],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [7, 5],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [8, 6],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [2, 5],
        "py": [4, 9],
        "pz": [2, 1],
        "nx": [10, 10],
        "ny": [16, 16],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [3, 0],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [7, 3, 12, 13, 6],
        "py": [11, 5, 23, 23, 7],
        "pz": [1, 2, 0, 0, 1],
        "nx": [1, 0, 0, 0, 0],
        "ny": [23, 20, 19, 21, 21],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [10, 9, 6, 13, 13],
        "pz": [0, 0, 1, 0, -1],
        "nx": [8, 8, 4, 4, 9],
        "ny": [4, 11, 5, 4, 5],
        "nz": [1, 1, 2, 2, 1]
      }, {
        "size": 2,
        "px": [9, 18],
        "py": [8, 15],
        "pz": [1, 0],
        "nx": [15, 4],
        "ny": [15, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 13],
        "py": [6, 17],
        "pz": [1, -1],
        "nx": [1, 2],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [19, 10, 20, 18, 18],
        "py": [2, 0, 2, 2, 2],
        "pz": [0, 1, 0, 0, -1],
        "nx": [22, 23, 22, 11, 23],
        "ny": [1, 3, 0, 1, 2],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 5,
        "px": [4, 2, 2, 2, 6],
        "py": [7, 2, 5, 4, 14],
        "pz": [1, 2, 2, 2, 0],
        "nx": [16, 7, 9, 15, 23],
        "ny": [8, 0, 3, 11, 2],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [10, 10, 9, 9, 5],
        "py": [2, 0, 0, 1, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [3, 2, 3, 2, 2],
        "ny": [11, 3, 9, 5, 5],
        "nz": [1, 2, 1, 2, -1]
      }],
      "alpha": [-1.490426e+00, 1.490426e+00, -1.214280e+00, 1.214280e+00, -8.124863e-01, 8.124863e-01, -7.307594e-01, 7.307594e-01, -7.377259e-01, 7.377259e-01, -5.982859e-01, 5.982859e-01, -6.451736e-01, 6.451736e-01, -6.117417e-01, 6.117417e-01, -5.438949e-01, 5.438949e-01, -4.563701e-01, 4.563701e-01, -4.975362e-01, 4.975362e-01, -4.707373e-01, 4.707373e-01, -5.013868e-01, 5.013868e-01, -5.139018e-01, 5.139018e-01, -4.728007e-01, 4.728007e-01, -4.839748e-01, 4.839748e-01, -4.852528e-01, 4.852528e-01, -5.768956e-01, 5.768956e-01, -3.635091e-01, 3.635091e-01, -4.190090e-01, 4.190090e-01, -3.854715e-01, 3.854715e-01, -3.409591e-01, 3.409591e-01, -3.440222e-01, 3.440222e-01, -3.375895e-01, 3.375895e-01, -3.367032e-01, 3.367032e-01, -3.708106e-01, 3.708106e-01, -3.260956e-01, 3.260956e-01, -3.657681e-01, 3.657681e-01, -3.518800e-01, 3.518800e-01, -3.845758e-01, 3.845758e-01, -2.832236e-01, 2.832236e-01, -2.865156e-01, 2.865156e-01]
    }, {
      "count": 45,
      "threshold": -5.479836e+00,
      "feature": [{
        "size": 5,
        "px": [15, 6, 17, 6, 9],
        "py": [2, 13, 13, 4, 3],
        "pz": [0, 0, 0, 1, 0],
        "nx": [3, 9, 4, 8, 14],
        "ny": [5, 8, 4, 4, 8],
        "nz": [2, 0, 1, 1, 0]
      }, {
        "size": 5,
        "px": [9, 8, 11, 6, 7],
        "py": [1, 2, 3, 14, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [0, 0, 4, 0, 0],
        "ny": [4, 2, 4, 1, 0],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 5,
        "px": [2, 2, 11, 11, 11],
        "py": [2, 4, 10, 8, 6],
        "pz": [2, 2, 0, 0, 0],
        "nx": [8, 4, 3, 23, 23],
        "ny": [4, 4, 4, 16, 18],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [18, 16, 17, 15, 9],
        "py": [2, 2, 2, 2, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [22, 22, 21, 23, 23],
        "ny": [1, 2, 0, 5, 4],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [15, 3, 17, 18, 6],
        "py": [11, 2, 11, 11, 4],
        "pz": [0, 2, 0, 0, 1],
        "nx": [3, 8, 1, 4, 23],
        "ny": [4, 4, 3, 9, 4],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [4, 0],
        "pz": [2, -1],
        "nx": [7, 4],
        "ny": [8, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [12, 5],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [10, 15],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [2, 2, 7, 1],
        "py": [7, 7, 3, 4],
        "pz": [1, -1, -1, -1],
        "nx": [0, 2, 1, 2],
        "ny": [6, 20, 14, 16],
        "nz": [1, 0, 0, 0]
      }, {
        "size": 5,
        "px": [14, 12, 12, 13, 9],
        "py": [23, 5, 6, 5, 7],
        "pz": [0, 0, 0, 0, 1],
        "nx": [8, 18, 2, 8, 14],
        "ny": [4, 9, 0, 12, 7],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [3, 10, 13, 11, 9],
        "py": [0, 3, 2, 3, 2],
        "pz": [2, 0, 0, 0, 0],
        "nx": [3, 11, 22, 22, 22],
        "ny": [2, 6, 15, 2, 0],
        "nz": [2, 1, 0, 0, 0]
      }, {
        "size": 5,
        "px": [8, 7, 5, 8, 5],
        "py": [23, 12, 12, 12, 13],
        "pz": [0, 0, 0, 0, 0],
        "nx": [3, 18, 3, 1, 22],
        "ny": [4, 4, 4, 2, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [22, 22, 22, 21, 22],
        "py": [9, 11, 10, 14, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [23, 23, 11, 1, 22],
        "ny": [23, 23, 11, 2, 0],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [18, 7],
        "pz": [0, 1],
        "nx": [10, 8],
        "ny": [16, 19],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [10, 12, 11, 6, 6],
        "py": [4, 4, 4, 2, 2],
        "pz": [0, 0, 0, 1, -1],
        "nx": [3, 8, 7, 8, 4],
        "ny": [5, 4, 4, 10, 4],
        "nz": [2, 1, 1, 0, 1]
      }, {
        "size": 4,
        "px": [12, 12, 4, 15],
        "py": [13, 12, 0, 11],
        "pz": [0, 0, -1, -1],
        "nx": [13, 14, 13, 14],
        "ny": [9, 12, 10, 13],
        "nz": [0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [3, 3],
        "pz": [2, -1],
        "nx": [9, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 3,
        "px": [9, 7, 0],
        "py": [7, 5, 5],
        "pz": [1, -1, -1],
        "nx": [4, 15, 9],
        "ny": [5, 14, 9],
        "nz": [2, 0, 1]
      }, {
        "size": 5,
        "px": [15, 20, 7, 10, 16],
        "py": [17, 12, 6, 4, 23],
        "pz": [0, 0, 1, 1, 0],
        "nx": [1, 2, 2, 1, 1],
        "ny": [3, 0, 1, 2, 2],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [2, 1, 1, 11, 2],
        "py": [16, 4, 5, 12, 14],
        "pz": [0, 1, 1, 0, 0],
        "nx": [4, 6, 3, 19, 1],
        "ny": [4, 2, 5, 19, 2],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [15, 14, 14],
        "py": [1, 1, 0],
        "pz": [0, 0, 0],
        "nx": [4, 8, 4],
        "ny": [3, 4, 2],
        "nz": [2, 1, 2]
      }, {
        "size": 5,
        "px": [2, 3, 1, 2, 7],
        "py": [8, 12, 4, 9, 13],
        "pz": [1, 0, 2, 1, 0],
        "nx": [1, 1, 0, 0, 0],
        "ny": [21, 20, 18, 17, 9],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [17, 15, 17, 16, 16],
        "py": [12, 12, 22, 23, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [7, 3, 16, 1, 0],
        "ny": [8, 6, 8, 3, 9],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [9, 17, 18, 18, 18],
        "py": [6, 12, 12, 13, 13],
        "pz": [1, 0, 0, 0, -1],
        "nx": [23, 23, 20, 11, 11],
        "ny": [12, 13, 23, 7, 8],
        "nz": [0, 0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [4, 4],
        "ny": [10, 5],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [4, 22, 19, 12],
        "py": [5, 8, 14, 9],
        "pz": [2, 0, 0, 0],
        "nx": [8, 4, 4, 2],
        "ny": [4, 4, 1, 2],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [3, 21],
        "py": [7, 14],
        "pz": [1, -1],
        "nx": [4, 2],
        "ny": [7, 2],
        "nz": [1, 2]
      }, {
        "size": 3,
        "px": [7, 4, 17],
        "py": [3, 1, 6],
        "pz": [0, 1, -1],
        "nx": [3, 4, 5],
        "ny": [0, 2, 1],
        "nz": [1, 0, 0]
      }, {
        "size": 4,
        "px": [15, 7, 14, 0],
        "py": [3, 1, 3, 7],
        "pz": [0, 1, 0, -1],
        "nx": [8, 18, 17, 18],
        "ny": [0, 1, 1, 2],
        "nz": [1, 0, 0, 0]
      }, {
        "size": 5,
        "px": [12, 12, 12, 12, 6],
        "py": [10, 11, 12, 13, 6],
        "pz": [0, 0, 0, 0, -1],
        "nx": [8, 15, 15, 4, 8],
        "ny": [10, 10, 9, 2, 4],
        "nz": [0, 0, 0, 2, 1]
      }, {
        "size": 2,
        "px": [17, 12],
        "py": [13, 11],
        "pz": [0, -1],
        "nx": [9, 8],
        "ny": [4, 10],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [10, 9, 12, 11, 4],
        "pz": [0, 0, 0, 0, 1],
        "nx": [8, 9, 8, 9, 9],
        "ny": [10, 4, 4, 5, 5],
        "nz": [1, 1, 1, 1, -1]
      }, {
        "size": 3,
        "px": [7, 0, 1],
        "py": [1, 9, 8],
        "pz": [0, -1, -1],
        "nx": [4, 3, 3],
        "ny": [7, 15, 16],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [15, 23],
        "pz": [0, 0],
        "nx": [9, 18],
        "ny": [21, 3],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [17, 4, 19, 18, 8],
        "py": [12, 3, 12, 17, 6],
        "pz": [0, 2, 0, 0, 1],
        "nx": [23, 23, 11, 22, 16],
        "ny": [0, 1, 0, 21, -1],
        "nz": [0, 0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [13, 5],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [21, 20, 10, 10, 21],
        "py": [13, 14, 10, 7, 11],
        "pz": [0, 0, 1, 1, 0],
        "nx": [4, 4, 4, 5, 5],
        "ny": [18, 17, 19, 20, 20],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [11, 13],
        "pz": [1, 0],
        "nx": [12, 4],
        "ny": [17, 17],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [13, 1],
        "pz": [0, -1],
        "nx": [1, 2],
        "ny": [1, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [15, 7],
        "py": [17, 7],
        "pz": [0, 1],
        "nx": [14, 4],
        "ny": [15, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 11],
        "py": [3, 8],
        "pz": [2, 0],
        "nx": [13, 13],
        "ny": [9, 8],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 3],
        "py": [11, 2],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [9, 5],
        "nz": [0, 1]
      }, {
        "size": 3,
        "px": [12, 6, 9],
        "py": [9, 10, 11],
        "pz": [0, -1, -1],
        "nx": [2, 1, 5],
        "ny": [2, 1, 6],
        "nz": [2, 2, 1]
      }, {
        "size": 4,
        "px": [4, 5, 5, 1],
        "py": [11, 11, 11, 3],
        "pz": [1, 0, 1, 2],
        "nx": [0, 0, 5, 4],
        "ny": [23, 22, 0, 0],
        "nz": [0, 0, -1, -1]
      }, {
        "size": 5,
        "px": [15, 7, 17, 15, 16],
        "py": [1, 0, 2, 2, 0],
        "pz": [0, 1, 0, 0, 0],
        "nx": [7, 4, 7, 4, 8],
        "ny": [5, 2, 4, 3, 4],
        "nz": [1, 2, 1, 2, -1]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [11, 23],
        "pz": [1, 0],
        "nx": [12, 4],
        "ny": [21, 2],
        "nz": [0, -1]
      }],
      "alpha": [-1.535800e+00, 1.535800e+00, -8.580514e-01, 8.580514e-01, -8.625210e-01, 8.625210e-01, -7.177500e-01, 7.177500e-01, -6.832222e-01, 6.832222e-01, -5.736298e-01, 5.736298e-01, -5.028217e-01, 5.028217e-01, -5.091788e-01, 5.091788e-01, -5.791940e-01, 5.791940e-01, -4.924942e-01, 4.924942e-01, -5.489055e-01, 5.489055e-01, -4.528190e-01, 4.528190e-01, -4.748324e-01, 4.748324e-01, -4.150403e-01, 4.150403e-01, -4.820464e-01, 4.820464e-01, -4.840212e-01, 4.840212e-01, -3.941872e-01, 3.941872e-01, -3.663507e-01, 3.663507e-01, -3.814835e-01, 3.814835e-01, -3.936426e-01, 3.936426e-01, -3.049970e-01, 3.049970e-01, -3.604256e-01, 3.604256e-01, -3.974041e-01, 3.974041e-01, -4.203486e-01, 4.203486e-01, -3.174435e-01, 3.174435e-01, -3.426336e-01, 3.426336e-01, -4.492150e-01, 4.492150e-01, -3.538784e-01, 3.538784e-01, -3.679703e-01, 3.679703e-01, -3.985452e-01, 3.985452e-01, -2.884028e-01, 2.884028e-01, -2.797264e-01, 2.797264e-01, -2.664214e-01, 2.664214e-01, -2.484857e-01, 2.484857e-01, -2.581492e-01, 2.581492e-01, -2.943778e-01, 2.943778e-01, -2.315507e-01, 2.315507e-01, -2.979337e-01, 2.979337e-01, -2.976173e-01, 2.976173e-01, -2.847965e-01, 2.847965e-01, -2.814763e-01, 2.814763e-01, -2.489068e-01, 2.489068e-01, -2.632427e-01, 2.632427e-01, -3.308292e-01, 3.308292e-01, -2.790170e-01, 2.790170e-01]
    }, {
      "count": 61,
      "threshold": -5.239104e+00,
      "feature": [{
        "size": 5,
        "px": [8, 8, 11, 15, 6],
        "py": [3, 6, 5, 3, 4],
        "pz": [0, 1, 0, 0, 1],
        "nx": [3, 9, 14, 8, 4],
        "ny": [4, 8, 8, 7, 2],
        "nz": [1, 0, 0, 0, 2]
      }, {
        "size": 5,
        "px": [11, 12, 10, 6, 9],
        "py": [3, 3, 2, 13, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [0, 0, 5, 2, 2],
        "ny": [13, 1, 8, 5, 2],
        "nz": [0, 1, 1, 2, 2]
      }, {
        "size": 5,
        "px": [11, 5, 11, 11, 4],
        "py": [9, 13, 10, 11, 6],
        "pz": [0, 0, 0, 0, 1],
        "nx": [4, 15, 9, 3, 3],
        "ny": [5, 8, 9, 4, 4],
        "nz": [1, 0, 0, 1, -1]
      }, {
        "size": 5,
        "px": [15, 16, 8, 17, 17],
        "py": [1, 2, 0, 2, 2],
        "pz": [0, 0, 1, 0, -1],
        "nx": [23, 23, 23, 23, 23],
        "ny": [4, 0, 2, 3, 1],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [9, 18, 17, 18],
        "py": [7, 13, 13, 14],
        "pz": [1, 0, 0, 0],
        "nx": [9, 7, 4, 8],
        "ny": [4, 10, 2, 4],
        "nz": [1, 1, 2, 1]
      }, {
        "size": 5,
        "px": [12, 11, 12, 12, 6],
        "py": [6, 5, 14, 5, 3],
        "pz": [0, 0, 0, 0, 1],
        "nx": [13, 8, 14, 7, 7],
        "ny": [16, 4, 7, 4, 4],
        "nz": [0, 1, 0, 1, -1]
      }, {
        "size": 5,
        "px": [12, 6, 3, 7, 12],
        "py": [7, 12, 7, 11, 8],
        "pz": [0, 0, 1, 0, 0],
        "nx": [16, 4, 4, 4, 7],
        "ny": [8, 4, 4, 4, 4],
        "nz": [0, 1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [6, 4, 5, 3, 3],
        "py": [2, 3, 2, 0, 0],
        "pz": [0, 0, 0, 1, -1],
        "nx": [1, 0, 1, 0, 0],
        "ny": [0, 3, 1, 1, 2],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [15, 9],
        "py": [11, 6],
        "pz": [0, 1],
        "nx": [14, 5],
        "ny": [9, 11],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [10, 19, 19, 10, 20],
        "py": [7, 20, 14, 6, 12],
        "pz": [1, 0, 0, 1, 0],
        "nx": [23, 22, 11, 23, 23],
        "ny": [21, 23, 9, 20, 20],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 5,
        "px": [1, 1, 5, 1, 1],
        "py": [8, 6, 6, 9, 4],
        "pz": [0, 1, 1, 0, 2],
        "nx": [3, 3, 3, 2, 5],
        "ny": [4, 4, 2, 5, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [13, 12, 3, 11, 11],
        "py": [2, 2, 0, 1, 2],
        "pz": [0, 0, 2, 0, 0],
        "nx": [3, 6, 8, 4, 3],
        "ny": [2, 9, 4, 4, 5],
        "nz": [2, 1, 1, 1, -1]
      }, {
        "size": 3,
        "px": [12, 12, 6],
        "py": [11, 12, 9],
        "pz": [0, 0, -1],
        "nx": [2, 1, 9],
        "ny": [6, 1, 14],
        "nz": [0, 2, 0]
      }, {
        "size": 5,
        "px": [6, 3, 17, 16, 16],
        "py": [4, 2, 14, 23, 13],
        "pz": [1, 2, 0, 0, 0],
        "nx": [8, 10, 21, 5, 1],
        "ny": [4, 10, 11, 0, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [5, 6, 1, 3, 3],
        "py": [15, 14, 4, 7, 7],
        "pz": [0, 0, 2, 1, -1],
        "nx": [1, 0, 0, 1, 1],
        "ny": [5, 8, 7, 18, 17],
        "nz": [2, 1, 1, 0, 0]
      }, {
        "size": 4,
        "px": [6, 12, 5, 3],
        "py": [6, 12, 2, 7],
        "pz": [1, -1, -1, -1],
        "nx": [14, 13, 13, 7],
        "ny": [12, 10, 9, 8],
        "nz": [0, 0, 0, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 15],
        "pz": [1, 0],
        "nx": [3, 3],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [11, 10, 12, 2],
        "py": [18, 18, 18, 3],
        "pz": [0, 0, 0, 2],
        "nx": [11, 17, 4, 16],
        "ny": [16, 4, 4, 21],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 5,
        "px": [9, 8, 8, 5, 2],
        "py": [4, 4, 4, 2, 3],
        "pz": [0, 0, -1, -1, -1],
        "nx": [2, 2, 4, 4, 2],
        "ny": [1, 2, 10, 5, 4],
        "nz": [2, 2, 1, 1, 2]
      }, {
        "size": 4,
        "px": [8, 18, 14, 18],
        "py": [7, 16, 23, 15],
        "pz": [1, 0, 0, 0],
        "nx": [14, 3, 1, 0],
        "ny": [21, 1, 9, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [12, 3],
        "py": [9, 5],
        "pz": [0, 2],
        "nx": [8, 1],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [1, 1],
        "pz": [1, -1],
        "nx": [19, 20],
        "ny": [1, 2],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [10, 10, 10],
        "py": [6, 6, 8],
        "pz": [1, -1, -1],
        "nx": [22, 21, 22],
        "ny": [13, 18, 12],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [4, 1],
        "pz": [2, -1],
        "nx": [2, 4],
        "ny": [5, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [21, 21, 21, 21, 21],
        "py": [19, 17, 18, 15, 16],
        "pz": [0, 0, 0, 0, 0],
        "nx": [11, 21, 6, 1, 21],
        "ny": [17, 1, 10, 0, 2],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [7, 3, 4, 4, 4],
        "py": [23, 13, 14, 16, 13],
        "pz": [0, 0, 0, 0, 0],
        "nx": [21, 22, 22, 22, 22],
        "ny": [23, 21, 20, 19, 19],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [11, 8],
        "py": [6, 6],
        "pz": [0, 1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [23, 23, 11, 23, 23],
        "py": [8, 12, 6, 11, 10],
        "pz": [0, 0, 1, 0, 0],
        "nx": [4, 4, 3, 8, 8],
        "ny": [3, 8, 4, 4, 4],
        "nz": [1, 1, 1, 1, -1]
      }, {
        "size": 5,
        "px": [8, 9, 4, 7, 10],
        "py": [2, 1, 0, 2, 1],
        "pz": [0, 0, 1, 0, 0],
        "nx": [5, 5, 6, 4, 4],
        "ny": [1, 0, 0, 2, 1],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [12, 2],
        "py": [13, 6],
        "pz": [0, -1],
        "nx": [15, 9],
        "ny": [15, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [4, 9],
        "pz": [2, 1],
        "nx": [3, 13],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [3, 6, 2],
        "py": [10, 22, 4],
        "pz": [1, 0, 2],
        "nx": [4, 2, 1],
        "ny": [10, 4, 3],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [9, 7],
        "pz": [0, 1],
        "nx": [0, 0],
        "ny": [23, 22],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 7],
        "py": [0, 1],
        "pz": [0, 0],
        "nx": [4, 4],
        "ny": [8, 8],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [7, 4, 4, 6, 3],
        "py": [8, 4, 5, 5, 3],
        "pz": [1, 2, 2, 1, 2],
        "nx": [1, 0, 2, 0, 0],
        "ny": [1, 0, 0, 2, 4],
        "nz": [0, 2, 0, 1, -1]
      }, {
        "size": 3,
        "px": [10, 4, 4],
        "py": [6, 1, 5],
        "pz": [1, -1, -1],
        "nx": [5, 23, 22],
        "ny": [4, 13, 7],
        "nz": [2, 0, 0]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [6, 5],
        "pz": [1, 1],
        "nx": [6, 0],
        "ny": [9, 2],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [0, 1, 1, 0, 0],
        "py": [5, 18, 19, 16, 6],
        "pz": [2, 0, 0, 0, 1],
        "nx": [5, 9, 4, 8, 8],
        "ny": [8, 7, 3, 7, 7],
        "nz": [1, 0, 1, 0, -1]
      }, {
        "size": 2,
        "px": [13, 12],
        "py": [23, 23],
        "pz": [0, 0],
        "nx": [7, 6],
        "ny": [8, 10],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [14, 19],
        "py": [12, 8],
        "pz": [0, 0],
        "nx": [18, 5],
        "ny": [8, 11],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [2, 8, 6, 4, 4],
        "py": [3, 23, 14, 6, 9],
        "pz": [2, 0, 0, 1, 1],
        "nx": [0, 0, 0, 0, 1],
        "ny": [21, 20, 5, 19, 23],
        "nz": [0, 0, 2, 0, 0]
      }, {
        "size": 2,
        "px": [11, 22],
        "py": [4, 14],
        "pz": [0, -1],
        "nx": [3, 8],
        "ny": [1, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [1, 1, 0, 1, 1],
        "py": [6, 8, 3, 12, 7],
        "pz": [1, 1, 2, 0, 1],
        "nx": [21, 21, 19, 10, 10],
        "ny": [14, 16, 23, 9, 9],
        "nz": [0, 0, 0, 1, -1]
      }, {
        "size": 2,
        "px": [10, 3],
        "py": [23, 2],
        "pz": [0, 2],
        "nx": [10, 3],
        "ny": [21, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [9, 9],
        "ny": [11, 10],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [23, 11, 23, 23, 23],
        "py": [18, 10, 19, 20, 16],
        "pz": [0, 1, 0, 0, 0],
        "nx": [3, 3, 2, 3, 2],
        "ny": [15, 16, 10, 17, 9],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 2,
        "px": [9, 14],
        "py": [7, 18],
        "pz": [1, 0],
        "nx": [7, 10],
        "ny": [8, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [6, 4],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [17, 19],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [2, 3, 3],
        "py": [11, 17, 19],
        "pz": [1, 0, 0],
        "nx": [7, 7, 4],
        "ny": [8, 8, 5],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [6, 5],
        "pz": [1, -1],
        "nx": [2, 9],
        "ny": [4, 12],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [8, 8, 9, 2, 2],
        "py": [18, 13, 12, 3, 3],
        "pz": [0, 0, 0, 2, -1],
        "nx": [23, 11, 23, 11, 11],
        "ny": [13, 6, 14, 7, 8],
        "nz": [0, 1, 0, 1, 1]
      }, {
        "size": 2,
        "px": [9, 11],
        "py": [6, 13],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [8, 10],
        "py": [0, 6],
        "pz": [1, 1],
        "nx": [9, 4],
        "ny": [6, 7],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [3, 10, 9],
        "py": [8, 6, 0],
        "pz": [1, -1, -1],
        "nx": [2, 2, 2],
        "ny": [15, 16, 9],
        "nz": [0, 0, 1]
      }, {
        "size": 3,
        "px": [14, 15, 0],
        "py": [2, 2, 5],
        "pz": [0, 0, -1],
        "nx": [17, 17, 18],
        "ny": [0, 1, 2],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [14, 1],
        "pz": [0, -1],
        "nx": [10, 9],
        "ny": [12, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [7, 8],
        "pz": [1, 1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [19, 18, 10, 5, 20],
        "pz": [0, 0, 1, 2, 0],
        "nx": [4, 8, 2, 4, 4],
        "ny": [4, 15, 5, 10, 10],
        "nz": [1, 0, 2, 1, -1]
      }, {
        "size": 2,
        "px": [7, 0],
        "py": [13, 18],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [23, 22, 22, 11, 22],
        "py": [16, 13, 7, 6, 14],
        "pz": [0, 0, 0, 1, 0],
        "nx": [13, 7, 15, 14, 14],
        "ny": [6, 3, 7, 6, 6],
        "nz": [0, 1, 0, 0, -1]
      }],
      "alpha": [-1.428861e+00, 1.428861e+00, -8.591837e-01, 8.591837e-01, -7.734305e-01, 7.734305e-01, -6.534460e-01, 6.534460e-01, -6.262547e-01, 6.262547e-01, -5.231782e-01, 5.231782e-01, -4.984303e-01, 4.984303e-01, -4.913187e-01, 4.913187e-01, -4.852198e-01, 4.852198e-01, -4.906681e-01, 4.906681e-01, -4.126248e-01, 4.126248e-01, -4.590814e-01, 4.590814e-01, -4.653825e-01, 4.653825e-01, -4.179600e-01, 4.179600e-01, -4.357392e-01, 4.357392e-01, -4.087982e-01, 4.087982e-01, -4.594812e-01, 4.594812e-01, -4.858794e-01, 4.858794e-01, -3.713580e-01, 3.713580e-01, -3.894534e-01, 3.894534e-01, -3.127168e-01, 3.127168e-01, -4.012654e-01, 4.012654e-01, -3.370552e-01, 3.370552e-01, -3.534712e-01, 3.534712e-01, -3.843450e-01, 3.843450e-01, -2.688805e-01, 2.688805e-01, -3.500203e-01, 3.500203e-01, -2.827120e-01, 2.827120e-01, -3.742119e-01, 3.742119e-01, -3.219074e-01, 3.219074e-01, -2.544953e-01, 2.544953e-01, -3.355513e-01, 3.355513e-01, -2.672670e-01, 2.672670e-01, -2.932047e-01, 2.932047e-01, -2.404618e-01, 2.404618e-01, -2.354372e-01, 2.354372e-01, -2.657955e-01, 2.657955e-01, -2.293701e-01, 2.293701e-01, -2.708918e-01, 2.708918e-01, -2.340181e-01, 2.340181e-01, -2.464815e-01, 2.464815e-01, -2.944239e-01, 2.944239e-01, -2.407960e-01, 2.407960e-01, -3.029642e-01, 3.029642e-01, -2.684602e-01, 2.684602e-01, -2.495078e-01, 2.495078e-01, -2.539708e-01, 2.539708e-01, -2.989293e-01, 2.989293e-01, -2.391309e-01, 2.391309e-01, -2.531372e-01, 2.531372e-01, -2.500390e-01, 2.500390e-01, -2.295077e-01, 2.295077e-01, -2.526125e-01, 2.526125e-01, -2.337182e-01, 2.337182e-01, -1.984756e-01, 1.984756e-01, -3.089996e-01, 3.089996e-01, -2.589053e-01, 2.589053e-01, -2.962490e-01, 2.962490e-01, -2.458660e-01, 2.458660e-01, -2.515206e-01, 2.515206e-01, -2.637299e-01, 2.637299e-01]
    }, {
      "count": 80,
      "threshold": -5.185898e+00,
      "feature": [{
        "size": 5,
        "px": [12, 17, 13, 10, 15],
        "py": [9, 13, 3, 3, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 14, 6, 9, 4],
        "ny": [10, 9, 8, 8, 2],
        "nz": [1, 0, 1, 0, 2]
      }, {
        "size": 5,
        "px": [3, 11, 8, 10, 9],
        "py": [7, 4, 3, 3, 3],
        "pz": [1, 0, 0, 0, 0],
        "nx": [2, 1, 5, 0, 0],
        "ny": [2, 15, 8, 4, 13],
        "nz": [2, 0, 1, 0, 0]
      }, {
        "size": 5,
        "px": [11, 11, 11, 4, 17],
        "py": [7, 9, 8, 6, 11],
        "pz": [0, 0, 0, 1, 0],
        "nx": [8, 8, 8, 3, 0],
        "ny": [4, 8, 8, 8, 13],
        "nz": [1, 0, -1, -1, -1]
      }, {
        "size": 5,
        "px": [14, 15, 7, 16, 16],
        "py": [3, 3, 1, 3, 3],
        "pz": [0, 0, 1, 0, -1],
        "nx": [23, 22, 23, 22, 22],
        "ny": [6, 2, 14, 3, 4],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [6, 4, 7, 15],
        "py": [4, 2, 6, 17],
        "pz": [1, 2, 1, 0],
        "nx": [3, 8, 3, 14],
        "ny": [4, 4, 10, 22],
        "nz": [1, 1, -1, -1]
      }, {
        "size": 3,
        "px": [3, 5, 22],
        "py": [7, 7, 5],
        "pz": [1, -1, -1],
        "nx": [2, 2, 4],
        "ny": [5, 2, 7],
        "nz": [2, 2, 1]
      }, {
        "size": 5,
        "px": [7, 6, 5, 6, 3],
        "py": [0, 1, 2, 2, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [0, 1, 1, 0, 1],
        "ny": [0, 2, 1, 2, 0],
        "nz": [2, 0, 0, 1, 0]
      }, {
        "size": 5,
        "px": [11, 11, 11, 11, 5],
        "py": [11, 10, 13, 12, 6],
        "pz": [0, 0, 0, 0, -1],
        "nx": [15, 14, 5, 2, 8],
        "ny": [9, 8, 10, 2, 10],
        "nz": [0, 0, 1, 2, 0]
      }, {
        "size": 5,
        "px": [8, 5, 6, 8, 7],
        "py": [12, 12, 12, 23, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [3, 17, 5, 2, 8],
        "ny": [4, 0, 10, 2, 10],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [10, 10, 10, 19, 20],
        "py": [8, 10, 9, 15, 13],
        "pz": [1, 1, 1, 0, 0],
        "nx": [23, 11, 5, 23, 23],
        "ny": [20, 10, 5, 19, 19],
        "nz": [0, 1, 2, 0, -1]
      }, {
        "size": 5,
        "px": [9, 13, 3, 10, 12],
        "py": [2, 0, 0, 1, 1],
        "pz": [0, 0, 2, 0, 0],
        "nx": [3, 3, 6, 7, 7],
        "ny": [5, 2, 11, 4, 4],
        "nz": [2, 2, 1, 1, -1]
      }, {
        "size": 2,
        "px": [15, 7],
        "py": [17, 6],
        "pz": [0, 1],
        "nx": [14, 0],
        "ny": [16, 10],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [17, 15, 18, 12, 19],
        "py": [22, 12, 13, 7, 15],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 15, 6, 1, 7],
        "ny": [4, 8, 22, 5, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [10, 9, 18, 19, 8],
        "py": [2, 1, 3, 3, 1],
        "pz": [1, 1, 0, 0, 1],
        "nx": [23, 23, 23, 11, 11],
        "ny": [0, 1, 2, 0, 1],
        "nz": [0, 0, 0, 1, -1]
      }, {
        "size": 5,
        "px": [12, 23, 0, 1, 8],
        "py": [14, 5, 0, 17, 1],
        "pz": [0, -1, -1, -1, -1],
        "nx": [8, 14, 15, 18, 14],
        "ny": [10, 11, 14, 19, 10],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 6],
        "py": [6, 13],
        "pz": [1, 0],
        "nx": [4, 12],
        "ny": [10, 14],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [5, 23, 11, 23, 13],
        "py": [3, 10, 4, 11, 12],
        "pz": [2, 0, 1, 0, 0],
        "nx": [7, 4, 9, 8, 8],
        "ny": [4, 2, 4, 4, 4],
        "nz": [1, 2, 1, 1, -1]
      }, {
        "size": 3,
        "px": [9, 5, 11],
        "py": [4, 2, 4],
        "pz": [0, 1, -1],
        "nx": [5, 2, 4],
        "ny": [0, 1, 2],
        "nz": [0, 2, 0]
      }, {
        "size": 5,
        "px": [5, 2, 2, 5, 8],
        "py": [12, 4, 4, 6, 13],
        "pz": [0, 2, 1, 1, 0],
        "nx": [3, 9, 4, 4, 8],
        "ny": [4, 0, 2, 2, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [9, 5, 22],
        "py": [7, 4, 20],
        "pz": [1, -1, -1],
        "nx": [8, 19, 4],
        "ny": [4, 18, 5],
        "nz": [1, 0, 2]
      }, {
        "size": 5,
        "px": [2, 3, 3, 3, 3],
        "py": [10, 16, 15, 14, 13],
        "pz": [1, 0, 0, 0, 0],
        "nx": [0, 0, 0, 1, 0],
        "ny": [10, 20, 5, 23, 21],
        "nz": [1, 0, 2, 0, 0]
      }, {
        "size": 2,
        "px": [12, 11],
        "py": [4, 18],
        "pz": [0, 0],
        "nx": [11, 23],
        "ny": [17, 13],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [17, 8],
        "py": [16, 7],
        "pz": [0, 1],
        "nx": [8, 3],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [13, 5, 14, 12, 3],
        "py": [4, 7, 4, 5, 3],
        "pz": [0, 1, 0, 0, 1],
        "nx": [21, 20, 21, 21, 21],
        "ny": [2, 0, 4, 3, 3],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 4,
        "px": [20, 20, 20, 10],
        "py": [21, 19, 20, 8],
        "pz": [0, 0, 0, 1],
        "nx": [8, 11, 0, 2],
        "ny": [10, 8, 1, 3],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [6, 7, 12, 8],
        "py": [12, 12, 8, 11],
        "pz": [0, 0, 0, 0],
        "nx": [9, 5, 5, 18],
        "ny": [9, 2, 0, 20],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 3,
        "px": [11, 5, 9],
        "py": [0, 0, 0],
        "pz": [0, 1, 0],
        "nx": [2, 6, 3],
        "ny": [3, 7, 4],
        "nz": [2, 0, 1]
      }, {
        "size": 5,
        "px": [18, 18, 9, 17, 17],
        "py": [15, 14, 7, 14, 14],
        "pz": [0, 0, 1, 0, -1],
        "nx": [21, 21, 21, 22, 20],
        "ny": [15, 21, 17, 14, 23],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [9, 12, 12, 7, 4],
        "py": [4, 11, 12, 6, 5],
        "pz": [1, 0, 0, 1, 2],
        "nx": [16, 11, 9, 6, 20],
        "ny": [8, 4, 11, 10, 23],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [12, 11, 10, 11, 11],
        "py": [23, 4, 4, 5, 23],
        "pz": [0, 0, 0, 0, 0],
        "nx": [11, 11, 7, 3, 20],
        "ny": [21, 21, 11, 1, 23],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [12, 1],
        "py": [12, 3],
        "pz": [0, -1],
        "nx": [10, 10],
        "ny": [3, 2],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [9, 4, 15, 9, 9],
        "py": [8, 4, 23, 7, 7],
        "pz": [1, 2, 0, 1, -1],
        "nx": [5, 3, 3, 3, 2],
        "ny": [23, 19, 17, 18, 15],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [2, 0],
        "py": [16, 3],
        "pz": [0, 2],
        "nx": [9, 4],
        "ny": [15, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [3, 7],
        "pz": [2, 1],
        "nx": [3, 8],
        "ny": [4, 10],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [9, 4, 3],
        "py": [18, 0, 14],
        "pz": [0, -1, -1],
        "nx": [3, 5, 2],
        "ny": [5, 8, 5],
        "nz": [2, 1, 2]
      }, {
        "size": 3,
        "px": [1, 1, 10],
        "py": [2, 1, 7],
        "pz": [1, -1, -1],
        "nx": [0, 0, 0],
        "ny": [3, 5, 1],
        "nz": [0, 0, 1]
      }, {
        "size": 4,
        "px": [11, 11, 5, 2],
        "py": [12, 13, 7, 3],
        "pz": [0, 0, -1, -1],
        "nx": [5, 10, 10, 9],
        "ny": [6, 9, 10, 13],
        "nz": [1, 0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [9, 1],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [0, 0, 1, 1, 0],
        "py": [4, 10, 12, 13, 5],
        "pz": [1, 0, 0, 0, 1],
        "nx": [4, 4, 8, 7, 7],
        "ny": [3, 2, 10, 4, 4],
        "nz": [2, 2, 1, 1, -1]
      }, {
        "size": 3,
        "px": [3, 4, 3],
        "py": [1, 1, 2],
        "pz": [1, -1, -1],
        "nx": [4, 5, 3],
        "ny": [1, 0, 2],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [6, 4],
        "pz": [1, -1],
        "nx": [8, 4],
        "ny": [6, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [12, 13, 15, 16, 7],
        "py": [1, 1, 2, 2, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [4, 4, 4, 3, 7],
        "ny": [2, 2, 4, 2, 4],
        "nz": [2, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [9, 3, 2, 11, 5],
        "py": [23, 7, 4, 10, 6],
        "pz": [0, 1, 2, 0, 1],
        "nx": [21, 20, 11, 21, 21],
        "ny": [21, 23, 8, 20, 20],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 4,
        "px": [12, 6, 13, 12],
        "py": [7, 3, 5, 6],
        "pz": [0, 1, 0, 0],
        "nx": [3, 0, 5, 10],
        "ny": [4, 6, 5, 1],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [4, 0],
        "pz": [0, -1],
        "nx": [12, 11],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 4,
        "px": [2, 3, 22, 5],
        "py": [6, 1, 18, 5],
        "pz": [1, -1, -1, -1],
        "nx": [0, 0, 0, 3],
        "ny": [14, 3, 12, 18],
        "nz": [0, 2, 0, 0]
      }, {
        "size": 3,
        "px": [10, 20, 21],
        "py": [10, 18, 15],
        "pz": [1, 0, 0],
        "nx": [15, 1, 2],
        "ny": [7, 0, 8],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [4, 7, 13, 4, 6],
        "pz": [1, 1, 0, 2, 1],
        "nx": [5, 9, 8, 4, 4],
        "ny": [3, 7, 7, 3, 3],
        "nz": [1, 0, 0, 1, -1]
      }, {
        "size": 3,
        "px": [13, 12, 14],
        "py": [2, 2, 2],
        "pz": [0, 0, 0],
        "nx": [4, 4, 4],
        "ny": [2, 2, 5],
        "nz": [2, -1, -1]
      }, {
        "size": 5,
        "px": [5, 4, 6, 2, 12],
        "py": [7, 9, 7, 4, 10],
        "pz": [0, 1, 0, 2, 0],
        "nx": [6, 1, 2, 5, 2],
        "ny": [9, 2, 4, 13, 4],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [12, 5],
        "pz": [0, -1],
        "nx": [1, 0],
        "ny": [7, 2],
        "nz": [0, 2]
      }, {
        "size": 5,
        "px": [8, 8, 1, 16, 6],
        "py": [6, 6, 4, 8, 11],
        "pz": [1, -1, -1, -1, -1],
        "nx": [13, 5, 4, 4, 13],
        "ny": [12, 1, 2, 5, 11],
        "nz": [0, 2, 2, 2, 0]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [4, 14],
        "pz": [1, 0],
        "nx": [9, 5],
        "ny": [7, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 6],
        "py": [4, 14],
        "pz": [2, 0],
        "nx": [9, 2],
        "ny": [15, 1],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [10, 19, 20, 10, 9],
        "py": [1, 2, 3, 0, 0],
        "pz": [1, 0, 0, 1, -1],
        "nx": [11, 23, 23, 11, 23],
        "ny": [0, 3, 1, 1, 2],
        "nz": [1, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [2, 9],
        "py": [3, 12],
        "pz": [2, 0],
        "nx": [2, 6],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [4, 10, 11, 9, 9],
        "pz": [1, 0, 0, 0, -1],
        "nx": [16, 2, 17, 8, 4],
        "ny": [10, 2, 9, 4, 4],
        "nz": [0, 2, 0, 1, 1]
      }, {
        "size": 2,
        "px": [12, 0],
        "py": [5, 4],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [4, 8],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [21, 21],
        "py": [9, 10],
        "pz": [0, 0],
        "nx": [11, 8],
        "ny": [18, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [14, 7],
        "py": [23, 9],
        "pz": [0, 1],
        "nx": [7, 13],
        "ny": [10, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 6, 2],
        "py": [11, 13, 12, 6, 4],
        "pz": [0, 0, 0, -1, -1],
        "nx": [0, 0, 0, 0, 0],
        "ny": [14, 13, 6, 12, 11],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [8, 9],
        "py": [6, 11],
        "pz": [1, -1],
        "nx": [15, 15],
        "ny": [11, 10],
        "nz": [0, 0]
      }, {
        "size": 4,
        "px": [4, 6, 7, 2],
        "py": [8, 4, 23, 7],
        "pz": [1, -1, -1, -1],
        "nx": [4, 20, 19, 17],
        "ny": [0, 3, 1, 1],
        "nz": [2, 0, 0, 0]
      }, {
        "size": 2,
        "px": [7, 0],
        "py": [6, 0],
        "pz": [1, -1],
        "nx": [7, 4],
        "ny": [8, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [15, 15],
        "ny": [15, 14],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [6, 2, 5, 2, 4],
        "py": [23, 7, 21, 8, 16],
        "pz": [0, 1, 0, 1, 0],
        "nx": [18, 2, 10, 0, 11],
        "ny": [9, 3, 23, 5, 3],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [9, 9, 8, 10, 4],
        "py": [0, 2, 2, 1, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [4, 3, 2, 2, 5],
        "ny": [7, 3, 4, 2, 17],
        "nz": [0, 1, 2, 2, 0]
      }, {
        "size": 2,
        "px": [10, 7],
        "py": [5, 6],
        "pz": [1, -1],
        "nx": [11, 11],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [11, 11, 5, 6, 11],
        "py": [8, 10, 5, 5, 9],
        "pz": [0, 0, 1, 1, 0],
        "nx": [13, 16, 11, 14, 4],
        "ny": [9, 13, 11, 20, 23],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [7, 14],
        "py": [14, 22],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [4, 11],
        "py": [4, 5],
        "pz": [2, -1],
        "nx": [2, 4],
        "ny": [5, 7],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [0, 0],
        "pz": [0, 1],
        "nx": [0, 4],
        "ny": [0, 2],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [11, 11, 11, 4, 9],
        "py": [5, 5, 2, 9, 23],
        "pz": [0, -1, -1, -1, -1],
        "nx": [11, 12, 10, 9, 5],
        "ny": [2, 2, 2, 2, 1],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 3,
        "px": [16, 14, 15],
        "py": [1, 1, 0],
        "pz": [0, 0, 0],
        "nx": [4, 7, 4],
        "ny": [2, 4, 4],
        "nz": [2, 1, -1]
      }, {
        "size": 2,
        "px": [5, 0],
        "py": [14, 5],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [5, 17],
        "nz": [2, 0]
      }, {
        "size": 5,
        "px": [18, 7, 16, 19, 4],
        "py": [13, 6, 23, 13, 3],
        "pz": [0, 1, 0, 0, 2],
        "nx": [5, 2, 3, 4, 4],
        "ny": [1, 1, 4, 1, 3],
        "nz": [0, 1, 0, 0, 0]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [7, 6],
        "pz": [1, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [10, 4],
        "pz": [1, 2],
        "nx": [4, 4],
        "ny": [3, 3],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [19, 1],
        "pz": [0, -1],
        "nx": [4, 12],
        "ny": [10, 17],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [12, 6, 2, 4, 11],
        "py": [14, 4, 2, 1, 5],
        "pz": [0, -1, -1, -1, -1],
        "nx": [3, 4, 3, 4, 3],
        "ny": [13, 17, 14, 16, 15],
        "nz": [0, 0, 0, 0, 0]
      }],
      "alpha": [-1.368326e+00, 1.368326e+00, -7.706897e-01, 7.706897e-01, -8.378147e-01, 8.378147e-01, -6.120624e-01, 6.120624e-01, -5.139189e-01, 5.139189e-01, -4.759130e-01, 4.759130e-01, -5.161374e-01, 5.161374e-01, -5.407743e-01, 5.407743e-01, -4.216105e-01, 4.216105e-01, -4.418693e-01, 4.418693e-01, -4.435335e-01, 4.435335e-01, -4.052076e-01, 4.052076e-01, -4.293050e-01, 4.293050e-01, -3.431154e-01, 3.431154e-01, -4.231203e-01, 4.231203e-01, -3.917100e-01, 3.917100e-01, -3.623450e-01, 3.623450e-01, -3.202670e-01, 3.202670e-01, -3.331602e-01, 3.331602e-01, -3.552034e-01, 3.552034e-01, -3.784556e-01, 3.784556e-01, -3.295428e-01, 3.295428e-01, -3.587038e-01, 3.587038e-01, -2.861332e-01, 2.861332e-01, -3.403258e-01, 3.403258e-01, -3.989002e-01, 3.989002e-01, -2.631159e-01, 2.631159e-01, -3.272156e-01, 3.272156e-01, -2.816567e-01, 2.816567e-01, -3.125926e-01, 3.125926e-01, -3.146982e-01, 3.146982e-01, -2.521825e-01, 2.521825e-01, -2.434554e-01, 2.434554e-01, -3.435378e-01, 3.435378e-01, -3.161172e-01, 3.161172e-01, -2.805027e-01, 2.805027e-01, -3.303579e-01, 3.303579e-01, -2.725089e-01, 2.725089e-01, -2.575051e-01, 2.575051e-01, -3.210646e-01, 3.210646e-01, -2.986997e-01, 2.986997e-01, -2.408925e-01, 2.408925e-01, -2.456291e-01, 2.456291e-01, -2.836550e-01, 2.836550e-01, -2.469860e-01, 2.469860e-01, -2.915900e-01, 2.915900e-01, -2.513559e-01, 2.513559e-01, -2.433728e-01, 2.433728e-01, -2.377905e-01, 2.377905e-01, -2.089327e-01, 2.089327e-01, -1.978434e-01, 1.978434e-01, -3.017699e-01, 3.017699e-01, -2.339661e-01, 2.339661e-01, -1.932560e-01, 1.932560e-01, -2.278285e-01, 2.278285e-01, -2.438200e-01, 2.438200e-01, -2.216769e-01, 2.216769e-01, -1.941995e-01, 1.941995e-01, -2.129081e-01, 2.129081e-01, -2.270319e-01, 2.270319e-01, -2.393942e-01, 2.393942e-01, -2.132518e-01, 2.132518e-01, -1.867741e-01, 1.867741e-01, -2.394237e-01, 2.394237e-01, -2.005917e-01, 2.005917e-01, -2.445217e-01, 2.445217e-01, -2.229078e-01, 2.229078e-01, -2.342967e-01, 2.342967e-01, -2.481784e-01, 2.481784e-01, -2.735603e-01, 2.735603e-01, -2.187604e-01, 2.187604e-01, -1.677239e-01, 1.677239e-01, -2.248867e-01, 2.248867e-01, -2.505358e-01, 2.505358e-01, -1.867706e-01, 1.867706e-01, -1.904305e-01, 1.904305e-01, -1.939881e-01, 1.939881e-01, -2.249474e-01, 2.249474e-01, -1.762483e-01, 1.762483e-01, -2.299974e-01, 2.299974e-01]
    }, {
      "count": 115,
      "threshold": -5.151920e+00,
      "feature": [{
        "size": 5,
        "px": [7, 14, 7, 10, 6],
        "py": [3, 3, 12, 4, 4],
        "pz": [0, 0, 0, 0, 1],
        "nx": [14, 3, 14, 9, 3],
        "ny": [7, 4, 8, 8, 5],
        "nz": [0, 1, 0, 0, 2]
      }, {
        "size": 5,
        "px": [13, 18, 16, 17, 15],
        "py": [1, 13, 1, 2, 0],
        "pz": [0, 0, 0, 0, 0],
        "nx": [23, 23, 8, 11, 22],
        "ny": [3, 4, 4, 8, 0],
        "nz": [0, 0, 1, 1, 0]
      }, {
        "size": 5,
        "px": [16, 6, 6, 7, 12],
        "py": [12, 13, 4, 12, 5],
        "pz": [0, 0, 1, 0, 0],
        "nx": [0, 0, 8, 4, 0],
        "ny": [0, 2, 4, 4, 2],
        "nz": [0, 0, 1, 1, -1]
      }, {
        "size": 3,
        "px": [12, 13, 7],
        "py": [13, 18, 6],
        "pz": [0, 0, 1],
        "nx": [13, 5, 6],
        "ny": [16, 3, 8],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [10, 12, 9, 13, 11],
        "py": [3, 3, 3, 3, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [3, 4, 15, 4, 4],
        "ny": [2, 5, 10, 4, 4],
        "nz": [2, 1, 0, 1, -1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 3, 12],
        "py": [7, 9, 8, 3, 10],
        "pz": [0, 0, 0, 2, 0],
        "nx": [4, 8, 15, 9, 9],
        "ny": [4, 4, 8, 8, 8],
        "nz": [1, 1, 0, 0, -1]
      }, {
        "size": 5,
        "px": [6, 3, 4, 4, 2],
        "py": [22, 12, 13, 14, 7],
        "pz": [0, 0, 0, 0, 1],
        "nx": [2, 0, 1, 1, 1],
        "ny": [23, 5, 22, 21, 21],
        "nz": [0, 2, 0, 0, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [8, 8],
        "pz": [1, -1],
        "nx": [3, 4],
        "ny": [4, 10],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [11, 11, 11, 11, 0],
        "py": [10, 12, 11, 13, 2],
        "pz": [0, 0, 0, -1, -1],
        "nx": [8, 13, 13, 13, 13],
        "ny": [10, 8, 9, 11, 10],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [16, 16, 15, 17, 18],
        "py": [12, 23, 11, 12, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 8, 9, 3, 13],
        "ny": [4, 4, 12, 3, 10],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [17, 16, 6, 5],
        "py": [14, 13, 4, 5],
        "pz": [0, 0, -1, -1],
        "nx": [8, 15, 4, 7],
        "ny": [10, 14, 4, 8],
        "nz": [1, 0, 2, 1]
      }, {
        "size": 5,
        "px": [20, 10, 20, 21, 19],
        "py": [14, 7, 13, 12, 22],
        "pz": [0, 1, 0, 0, 0],
        "nx": [22, 23, 11, 23, 23],
        "ny": [23, 22, 11, 21, 20],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 4,
        "px": [12, 13, 1, 18],
        "py": [14, 23, 3, 5],
        "pz": [0, -1, -1, -1],
        "nx": [2, 10, 5, 9],
        "ny": [2, 9, 8, 14],
        "nz": [2, 0, 1, 0]
      }, {
        "size": 5,
        "px": [10, 4, 7, 9, 8],
        "py": [1, 0, 2, 0, 1],
        "pz": [0, 1, 0, 0, 0],
        "nx": [2, 3, 5, 3, 3],
        "ny": [2, 4, 8, 3, 3],
        "nz": [2, 1, 1, 1, -1]
      }, {
        "size": 4,
        "px": [11, 2, 2, 11],
        "py": [6, 4, 5, 7],
        "pz": [0, 2, 2, 0],
        "nx": [3, 0, 5, 3],
        "ny": [4, 9, 8, 3],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [12, 10, 9, 12, 12],
        "py": [11, 2, 1, 10, 10],
        "pz": [0, 1, 1, 0, -1],
        "nx": [22, 11, 5, 22, 23],
        "ny": [1, 1, 0, 0, 3],
        "nz": [0, 1, 2, 0, 0]
      }, {
        "size": 4,
        "px": [5, 10, 7, 11],
        "py": [14, 3, 0, 4],
        "pz": [0, -1, -1, -1],
        "nx": [4, 4, 4, 4],
        "ny": [17, 18, 15, 16],
        "nz": [0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [2, 2, 3, 2, 2],
        "py": [16, 12, 20, 15, 17],
        "pz": [0, 0, 0, 0, 0],
        "nx": [12, 8, 4, 15, 15],
        "ny": [17, 4, 4, 8, 8],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 5,
        "px": [12, 12, 1, 6, 12],
        "py": [11, 10, 3, 6, 10],
        "pz": [0, 0, -1, -1, -1],
        "nx": [0, 0, 1, 0, 2],
        "ny": [4, 0, 2, 1, 0],
        "nz": [0, 2, 0, 1, 0]
      }, {
        "size": 5,
        "px": [21, 20, 21, 21, 14],
        "py": [9, 16, 11, 8, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [17, 6, 15, 0, 2],
        "ny": [8, 23, 13, 2, 0],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [6, 9, 9, 5],
        "py": [14, 18, 23, 14],
        "pz": [0, 0, 0, 0],
        "nx": [9, 5, 5, 12],
        "ny": [21, 5, 3, 1],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [4, 3],
        "ny": [4, 1],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [7, 8, 11, 4, 10],
        "py": [3, 3, 2, 1, 2],
        "pz": [0, 0, 0, 1, 0],
        "nx": [19, 20, 19, 20, 20],
        "ny": [0, 3, 1, 2, 2],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [9, 1],
        "py": [7, 4],
        "pz": [1, -1],
        "nx": [4, 7],
        "ny": [5, 9],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [11, 10, 1, 5, 1],
        "py": [10, 12, 6, 6, 5],
        "pz": [0, 0, 1, 1, 1],
        "nx": [16, 3, 2, 4, 4],
        "ny": [10, 4, 2, 4, 4],
        "nz": [0, 1, 2, 1, -1]
      }, {
        "size": 2,
        "px": [15, 0],
        "py": [17, 0],
        "pz": [0, -1],
        "nx": [7, 4],
        "ny": [8, 5],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [8, 10, 9, 9, 9],
        "py": [2, 2, 2, 1, 1],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 2, 3, 3, 2],
        "ny": [0, 3, 2, 1, 4],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [11, 15, 17, 16],
        "py": [8, 10, 11, 11],
        "pz": [0, 0, 0, 0],
        "nx": [14, 1, 1, 2],
        "ny": [9, 5, 7, 0],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 3,
        "px": [3, 5, 9],
        "py": [8, 6, 12],
        "pz": [0, 1, 0],
        "nx": [3, 4, 18],
        "ny": [4, 2, 22],
        "nz": [1, -1, -1]
      }, {
        "size": 5,
        "px": [6, 1, 7, 3, 3],
        "py": [13, 4, 13, 7, 7],
        "pz": [0, 2, 0, 1, -1],
        "nx": [0, 0, 0, 0, 0],
        "ny": [16, 15, 8, 13, 14],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [5, 16],
        "py": [13, 10],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [4, 5],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [5, 23, 11, 23, 23],
        "py": [5, 12, 4, 16, 15],
        "pz": [2, 0, 1, 0, 0],
        "nx": [3, 2, 4, 5, 5],
        "ny": [4, 2, 4, 11, 11],
        "nz": [1, 2, 1, 1, -1]
      }, {
        "size": 4,
        "px": [10, 10, 3, 23],
        "py": [7, 7, 3, 16],
        "pz": [1, -1, -1, -1],
        "nx": [5, 23, 11, 22],
        "ny": [4, 13, 7, 16],
        "nz": [2, 0, 1, 0]
      }, {
        "size": 5,
        "px": [15, 14, 13, 15, 16],
        "py": [1, 0, 0, 0, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 9, 8, 8, 8],
        "ny": [2, 4, 9, 4, 4],
        "nz": [2, 1, 1, 1, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [5, 5],
        "pz": [0, -1],
        "nx": [3, 15],
        "ny": [1, 8],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [6, 9],
        "pz": [1, 0],
        "nx": [10, 10],
        "ny": [10, 10],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [1, 0, 0, 0, 0],
        "py": [5, 4, 11, 9, 12],
        "pz": [0, 1, 0, 0, 0],
        "nx": [9, 8, 2, 4, 7],
        "ny": [7, 7, 2, 4, 7],
        "nz": [0, 0, 2, 1, 0]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [9, 8],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [4, 1],
        "pz": [2, -1],
        "nx": [8, 6],
        "ny": [7, 3],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [8, 5, 7, 6, 11],
        "py": [12, 5, 13, 13, 22],
        "pz": [0, 1, 0, 0, 0],
        "nx": [23, 23, 23, 22, 22],
        "ny": [20, 19, 21, 23, 23],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [3, 17],
        "py": [6, 9],
        "pz": [1, -1],
        "nx": [3, 3],
        "ny": [10, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [14, 11],
        "py": [23, 5],
        "pz": [0, 0],
        "nx": [7, 3],
        "ny": [10, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [8, 8],
        "pz": [1, 1],
        "nx": [9, 4],
        "ny": [15, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [2, 4],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [23, 11],
        "py": [21, 10],
        "pz": [0, 1],
        "nx": [2, 3],
        "ny": [11, 14],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [11, 11, 11, 3],
        "py": [13, 12, 11, 4],
        "pz": [0, 0, 0, -1],
        "nx": [14, 13, 13, 6],
        "ny": [13, 11, 10, 5],
        "nz": [0, 0, 0, 1]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [9, 19],
        "ny": [4, 14],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [10, 5, 7],
        "py": [5, 0, 6],
        "pz": [1, -1, -1],
        "nx": [10, 21, 5],
        "ny": [0, 5, 3],
        "nz": [1, 0, 2]
      }, {
        "size": 2,
        "px": [16, 13],
        "py": [3, 15],
        "pz": [0, -1],
        "nx": [17, 7],
        "ny": [23, 8],
        "nz": [0, 1]
      }, {
        "size": 3,
        "px": [4, 2, 2],
        "py": [15, 7, 19],
        "pz": [0, 1, -1],
        "nx": [2, 8, 4],
        "ny": [5, 14, 9],
        "nz": [2, 0, 1]
      }, {
        "size": 3,
        "px": [8, 3, 6],
        "py": [10, 2, 4],
        "pz": [0, 2, 1],
        "nx": [3, 8, 4],
        "ny": [4, 14, 9],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [14, 3],
        "py": [18, 3],
        "pz": [0, -1],
        "nx": [12, 14],
        "ny": [17, 9],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [7, 1, 10],
        "py": [14, 10, 10],
        "pz": [0, -1, -1],
        "nx": [9, 6, 2],
        "ny": [13, 18, 2],
        "nz": [0, 0, 2]
      }, {
        "size": 2,
        "px": [11, 8],
        "py": [13, 11],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [7, 18],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [21, 17],
        "pz": [0, 0],
        "nx": [9, 3],
        "ny": [5, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [4, 0],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [2, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [1, 5],
        "pz": [0, -1],
        "nx": [0, 1],
        "ny": [1, 0],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [18, 1],
        "py": [13, 5],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 1],
        "py": [4, 3, 2, 12, 15],
        "pz": [1, 1, 2, 0, 0],
        "nx": [5, 9, 4, 8, 8],
        "ny": [3, 6, 3, 6, 6],
        "nz": [1, 0, 1, 0, -1]
      }, {
        "size": 2,
        "px": [2, 5],
        "py": [0, 2],
        "pz": [1, -1],
        "nx": [2, 1],
        "ny": [0, 1],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [7, 15, 4, 20],
        "py": [8, 23, 4, 8],
        "pz": [1, 0, 2, 0],
        "nx": [6, 0, 3, 4],
        "ny": [9, 2, 13, 6],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 4,
        "px": [11, 11, 10, 20],
        "py": [10, 9, 11, 8],
        "pz": [0, 0, 0, -1],
        "nx": [21, 20, 21, 21],
        "ny": [18, 23, 19, 17],
        "nz": [0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [3, 8],
        "py": [7, 5],
        "pz": [1, -1],
        "nx": [3, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [5, 11],
        "py": [3, 4],
        "pz": [2, 1],
        "nx": [8, 7],
        "ny": [5, 12],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [4, 1],
        "py": [1, 3],
        "pz": [1, -1],
        "nx": [3, 6],
        "ny": [0, 0],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [19, 9],
        "py": [16, 8],
        "pz": [0, 1],
        "nx": [14, 6],
        "ny": [15, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [13, 5],
        "pz": [0, -1],
        "nx": [5, 5],
        "ny": [1, 2],
        "nz": [2, 2]
      }, {
        "size": 5,
        "px": [16, 14, 4, 15, 12],
        "py": [1, 1, 1, 2, 1],
        "pz": [0, 0, 2, 0, 0],
        "nx": [6, 4, 3, 2, 10],
        "ny": [22, 8, 2, 1, 7],
        "nz": [0, 1, 1, 2, 0]
      }, {
        "size": 5,
        "px": [6, 8, 6, 5, 5],
        "py": [1, 0, 0, 1, 0],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 4, 4, 4, 8],
        "ny": [4, 3, 2, 5, 10],
        "nz": [2, 2, 2, 2, 1]
      }, {
        "size": 2,
        "px": [9, 8],
        "py": [17, 0],
        "pz": [0, -1],
        "nx": [2, 5],
        "ny": [5, 8],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [8, 0],
        "py": [7, 3],
        "pz": [1, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [10, 21],
        "py": [11, 20],
        "pz": [1, 0],
        "nx": [11, 4],
        "ny": [17, 1],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [5, 10, 4, 17, 10],
        "py": [3, 6, 3, 11, 5],
        "pz": [1, 0, 1, 0, 0],
        "nx": [21, 20, 9, 19, 10],
        "ny": [4, 3, 0, 2, 1],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 2,
        "px": [23, 23],
        "py": [10, 10],
        "pz": [0, -1],
        "nx": [23, 23],
        "ny": [21, 22],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [9, 20, 19, 20, 20],
        "py": [0, 3, 1, 2, 2],
        "pz": [1, 0, 0, 0, -1],
        "nx": [11, 23, 11, 23, 5],
        "ny": [1, 2, 0, 1, 0],
        "nz": [1, 0, 1, 0, 2]
      }, {
        "size": 3,
        "px": [6, 8, 7],
        "py": [4, 10, 11],
        "pz": [1, 0, 0],
        "nx": [8, 3, 4],
        "ny": [9, 4, 4],
        "nz": [0, -1, -1]
      }, {
        "size": 4,
        "px": [13, 13, 10, 4],
        "py": [14, 23, 1, 5],
        "pz": [0, -1, -1, -1],
        "nx": [15, 14, 8, 8],
        "ny": [13, 12, 8, 9],
        "nz": [0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [11, 9],
        "py": [5, 8],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [7, 4],
        "nz": [0, 1]
      }, {
        "size": 5,
        "px": [4, 8, 4, 7, 7],
        "py": [2, 3, 3, 11, 11],
        "pz": [2, 1, 2, 1, -1],
        "nx": [0, 0, 1, 0, 0],
        "ny": [4, 6, 15, 3, 2],
        "nz": [1, 1, 0, 2, 2]
      }, {
        "size": 2,
        "px": [6, 1],
        "py": [12, 1],
        "pz": [0, -1],
        "nx": [1, 10],
        "ny": [2, 11],
        "nz": [2, 0]
      }, {
        "size": 5,
        "px": [0, 0, 2, 3, 7],
        "py": [0, 1, 4, 3, 11],
        "pz": [0, -1, -1, -1, -1],
        "nx": [9, 11, 9, 6, 12],
        "ny": [2, 1, 1, 0, 2],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [10, 11],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [1, 1, 1, 1, 1],
        "py": [15, 10, 19, 16, 18],
        "pz": [0, 1, 0, 0, 0],
        "nx": [4, 5, 3, 5, 6],
        "ny": [4, 19, 9, 18, 19],
        "nz": [1, 0, 1, 0, -1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 12, 20],
        "py": [11, 12, 13, 13, 18],
        "pz": [0, 0, 0, -1, -1],
        "nx": [0, 0, 0, 0, 0],
        "ny": [4, 2, 7, 6, 12],
        "nz": [1, 2, 1, 1, 0]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [9, 11],
        "pz": [0, 0],
        "nx": [10, 4],
        "ny": [5, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 8],
        "py": [9, 6],
        "pz": [0, 1],
        "nx": [13, 13],
        "ny": [10, 10],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [5, 3],
        "pz": [1, 2],
        "nx": [3, 3],
        "ny": [5, 5],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [19, 9],
        "py": [10, 6],
        "pz": [0, 1],
        "nx": [4, 1],
        "ny": [2, 2],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [14, 4],
        "py": [19, 12],
        "pz": [0, -1],
        "nx": [14, 8],
        "ny": [17, 10],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [4, 2, 13, 2],
        "py": [12, 6, 9, 3],
        "pz": [0, 1, -1, -1],
        "nx": [1, 0, 1, 0],
        "ny": [16, 14, 11, 15],
        "nz": [0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [4, 4],
        "ny": [4, 8],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [9, 11, 12, 6, 10],
        "py": [2, 1, 2, 1, 2],
        "pz": [0, 0, 0, 1, 0],
        "nx": [4, 6, 4, 6, 2],
        "ny": [4, 0, 9, 1, 8],
        "nz": [0, 0, 1, 0, 1]
      }, {
        "size": 5,
        "px": [4, 4, 7, 2, 2],
        "py": [19, 20, 23, 8, 9],
        "pz": [0, 0, 0, 1, 1],
        "nx": [7, 0, 5, 6, 2],
        "ny": [10, 5, 4, 1, 8],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [18, 18, 17, 18, 18],
        "py": [15, 16, 14, 20, 17],
        "pz": [0, 0, 0, 0, 0],
        "nx": [15, 2, 2, 5, 2],
        "ny": [8, 0, 2, 9, 4],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [13, 13, 13, 18],
        "py": [11, 12, 12, 20],
        "pz": [0, 0, -1, -1],
        "nx": [1, 3, 10, 10],
        "ny": [1, 6, 12, 11],
        "nz": [2, 0, 0, 0]
      }, {
        "size": 2,
        "px": [8, 9],
        "py": [0, 1],
        "pz": [1, 1],
        "nx": [19, 4],
        "ny": [2, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [4, 2],
        "pz": [1, 2],
        "nx": [8, 4],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [23, 11, 22, 13, 13],
        "py": [8, 3, 3, 12, 12],
        "pz": [0, 1, 0, 0, -1],
        "nx": [15, 7, 14, 13, 8],
        "ny": [7, 3, 6, 6, 3],
        "nz": [0, 1, 0, 0, 1]
      }, {
        "size": 3,
        "px": [9, 11, 19],
        "py": [7, 3, 0],
        "pz": [1, -1, -1],
        "nx": [23, 23, 11],
        "ny": [16, 12, 7],
        "nz": [0, 0, 1]
      }, {
        "size": 2,
        "px": [15, 8],
        "py": [23, 7],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [5, 4],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [4, 10],
        "py": [6, 13],
        "pz": [1, -1],
        "nx": [2, 3],
        "ny": [4, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 1],
        "py": [11, 2],
        "pz": [1, 2],
        "nx": [9, 2],
        "ny": [5, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [22, 22],
        "py": [22, 21],
        "pz": [0, 0],
        "nx": [3, 0],
        "ny": [5, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [20, 10],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [20, 10],
        "ny": [23, 11],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [10, 3, 3, 4],
        "py": [5, 3, 4, 9],
        "pz": [0, -1, -1, -1],
        "nx": [14, 4, 3, 11],
        "ny": [2, 1, 1, 3],
        "nz": [0, 2, 2, 0]
      }, {
        "size": 3,
        "px": [15, 15, 3],
        "py": [1, 1, 4],
        "pz": [0, -1, -1],
        "nx": [7, 4, 4],
        "ny": [8, 2, 3],
        "nz": [1, 2, 2]
      }, {
        "size": 3,
        "px": [0, 0, 0],
        "py": [3, 4, 6],
        "pz": [2, 2, 1],
        "nx": [0, 21, 4],
        "ny": [23, 14, 3],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [4, 4, 5, 3, 4],
        "py": [9, 11, 8, 4, 8],
        "pz": [1, 1, 1, 2, 1],
        "nx": [21, 21, 10, 19, 19],
        "ny": [3, 4, 1, 0, 0],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 4,
        "px": [21, 20, 20, 21],
        "py": [18, 21, 20, 17],
        "pz": [0, 0, 0, 0],
        "nx": [8, 1, 4, 2],
        "ny": [10, 0, 2, 4],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 14],
        "pz": [1, 0],
        "nx": [3, 5],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [12, 0, 23],
        "py": [20, 2, 13],
        "pz": [0, -1, -1],
        "nx": [12, 2, 9],
        "ny": [19, 2, 7],
        "nz": [0, 2, 0]
      }, {
        "size": 2,
        "px": [0, 6],
        "py": [22, 11],
        "pz": [0, -1],
        "nx": [20, 18],
        "ny": [12, 23],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [9, 15, 15, 16, 8],
        "py": [2, 1, 2, 2, 1],
        "pz": [1, 0, 0, 0, 1],
        "nx": [1, 1, 1, 1, 1],
        "ny": [16, 10, 17, 18, 18],
        "nz": [0, 1, 0, 0, -1]
      }, {
        "size": 5,
        "px": [10, 5, 3, 5, 8],
        "py": [14, 2, 1, 4, 1],
        "pz": [0, -1, -1, -1, -1],
        "nx": [23, 23, 23, 23, 23],
        "ny": [18, 15, 16, 14, 17],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [2, 2, 2, 3, 2],
        "py": [16, 17, 15, 20, 11],
        "pz": [0, 0, 0, 0, 1],
        "nx": [8, 22, 2, 1, 23],
        "ny": [20, 11, 5, 0, 17],
        "nz": [0, -1, -1, -1, -1]
      }],
      "alpha": [-1.299972e+00, 1.299972e+00, -7.630804e-01, 7.630804e-01, -5.530378e-01, 5.530378e-01, -5.444703e-01, 5.444703e-01, -5.207701e-01, 5.207701e-01, -5.035143e-01, 5.035143e-01, -4.514416e-01, 4.514416e-01, -4.897723e-01, 4.897723e-01, -5.006264e-01, 5.006264e-01, -4.626049e-01, 4.626049e-01, -4.375402e-01, 4.375402e-01, -3.742565e-01, 3.742565e-01, -3.873996e-01, 3.873996e-01, -3.715484e-01, 3.715484e-01, -3.562480e-01, 3.562480e-01, -3.216189e-01, 3.216189e-01, -3.983409e-01, 3.983409e-01, -3.191891e-01, 3.191891e-01, -3.242173e-01, 3.242173e-01, -3.528040e-01, 3.528040e-01, -3.562318e-01, 3.562318e-01, -3.592398e-01, 3.592398e-01, -2.557584e-01, 2.557584e-01, -2.747951e-01, 2.747951e-01, -2.747554e-01, 2.747554e-01, -2.980481e-01, 2.980481e-01, -2.887670e-01, 2.887670e-01, -3.895318e-01, 3.895318e-01, -2.786896e-01, 2.786896e-01, -2.763841e-01, 2.763841e-01, -2.704816e-01, 2.704816e-01, -2.075489e-01, 2.075489e-01, -3.104773e-01, 3.104773e-01, -2.580337e-01, 2.580337e-01, -2.448334e-01, 2.448334e-01, -3.054279e-01, 3.054279e-01, -2.335804e-01, 2.335804e-01, -2.972322e-01, 2.972322e-01, -2.270521e-01, 2.270521e-01, -2.134621e-01, 2.134621e-01, -2.261655e-01, 2.261655e-01, -2.091024e-01, 2.091024e-01, -2.478928e-01, 2.478928e-01, -2.468972e-01, 2.468972e-01, -1.919746e-01, 1.919746e-01, -2.756623e-01, 2.756623e-01, -2.629717e-01, 2.629717e-01, -2.198653e-01, 2.198653e-01, -2.174434e-01, 2.174434e-01, -2.193626e-01, 2.193626e-01, -1.956262e-01, 1.956262e-01, -1.720459e-01, 1.720459e-01, -1.781067e-01, 1.781067e-01, -1.773484e-01, 1.773484e-01, -1.793871e-01, 1.793871e-01, -1.973396e-01, 1.973396e-01, -2.397262e-01, 2.397262e-01, -2.164685e-01, 2.164685e-01, -2.214348e-01, 2.214348e-01, -2.265941e-01, 2.265941e-01, -2.075436e-01, 2.075436e-01, -2.244070e-01, 2.244070e-01, -2.291992e-01, 2.291992e-01, -2.223506e-01, 2.223506e-01, -1.639398e-01, 1.639398e-01, -1.732374e-01, 1.732374e-01, -1.808631e-01, 1.808631e-01, -1.860962e-01, 1.860962e-01, -1.781604e-01, 1.781604e-01, -2.108322e-01, 2.108322e-01, -2.386390e-01, 2.386390e-01, -1.942083e-01, 1.942083e-01, -1.949161e-01, 1.949161e-01, -1.953729e-01, 1.953729e-01, -2.317591e-01, 2.317591e-01, -2.335136e-01, 2.335136e-01, -2.282835e-01, 2.282835e-01, -2.148716e-01, 2.148716e-01, -1.588127e-01, 1.588127e-01, -1.566765e-01, 1.566765e-01, -1.644839e-01, 1.644839e-01, -2.386947e-01, 2.386947e-01, -1.704126e-01, 1.704126e-01, -2.213945e-01, 2.213945e-01, -1.740398e-01, 1.740398e-01, -2.451678e-01, 2.451678e-01, -2.120524e-01, 2.120524e-01, -1.886646e-01, 1.886646e-01, -2.824447e-01, 2.824447e-01, -1.900364e-01, 1.900364e-01, -2.179183e-01, 2.179183e-01, -2.257696e-01, 2.257696e-01, -2.023404e-01, 2.023404e-01, -1.886901e-01, 1.886901e-01, -1.850663e-01, 1.850663e-01, -2.035414e-01, 2.035414e-01, -1.930174e-01, 1.930174e-01, -1.898282e-01, 1.898282e-01, -1.666640e-01, 1.666640e-01, -1.646143e-01, 1.646143e-01, -1.543475e-01, 1.543475e-01, -1.366289e-01, 1.366289e-01, -1.636837e-01, 1.636837e-01, -2.547716e-01, 2.547716e-01, -1.281869e-01, 1.281869e-01, -1.509159e-01, 1.509159e-01, -1.447827e-01, 1.447827e-01, -1.626126e-01, 1.626126e-01, -2.387014e-01, 2.387014e-01, -2.571160e-01, 2.571160e-01, -1.719175e-01, 1.719175e-01, -1.646742e-01, 1.646742e-01, -1.717041e-01, 1.717041e-01, -2.039217e-01, 2.039217e-01, -1.796907e-01, 1.796907e-01]
    }, {
      "count": 153,
      "threshold": -4.971032e+00,
      "feature": [{
        "size": 5,
        "px": [14, 13, 18, 10, 16],
        "py": [2, 2, 13, 3, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [21, 7, 14, 23, 23],
        "ny": [16, 7, 8, 3, 13],
        "nz": [0, 1, 0, 0, 0]
      }, {
        "size": 5,
        "px": [12, 12, 12, 15, 14],
        "py": [9, 10, 11, 3, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [9, 9, 8, 14, 3],
        "ny": [9, 8, 5, 9, 5],
        "nz": [0, 0, 1, 0, 2]
      }, {
        "size": 5,
        "px": [5, 11, 7, 6, 8],
        "py": [12, 8, 12, 12, 11],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 4, 3, 9, 9],
        "ny": [4, 4, 4, 9, 9],
        "nz": [1, 1, 1, 0, -1]
      }, {
        "size": 5,
        "px": [9, 8, 4, 10, 6],
        "py": [2, 2, 1, 3, 13],
        "pz": [0, 0, 1, 0, 0],
        "nx": [1, 1, 5, 1, 1],
        "ny": [2, 3, 8, 4, 16],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 5,
        "px": [3, 16, 6, 17, 15],
        "py": [2, 17, 4, 12, 12],
        "pz": [2, 0, 1, 0, 0],
        "nx": [4, 8, 15, 1, 1],
        "ny": [4, 4, 8, 16, 16],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [18, 15, 8, 17],
        "py": [12, 23, 6, 12],
        "pz": [0, 0, 1, 0],
        "nx": [15, 4, 10, 5],
        "ny": [21, 8, 14, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 5,
        "px": [18, 17, 9, 19, 19],
        "py": [3, 1, 0, 3, 3],
        "pz": [0, 0, 1, 0, -1],
        "nx": [22, 11, 23, 23, 23],
        "ny": [0, 1, 2, 3, 4],
        "nz": [0, 1, 0, 0, 0]
      }, {
        "size": 4,
        "px": [9, 5, 5, 10],
        "py": [18, 15, 14, 18],
        "pz": [0, 0, 0, 0],
        "nx": [10, 11, 2, 0],
        "ny": [16, 7, 12, 7],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 12],
        "py": [4, 6],
        "pz": [2, 0],
        "nx": [3, 12],
        "ny": [4, 19],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [3, 4, 5, 2, 2],
        "py": [3, 3, 3, 1, 1],
        "pz": [0, 0, 0, 1, -1],
        "nx": [0, 0, 1, 0, 0],
        "ny": [3, 4, 0, 1, 2],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 5,
        "px": [12, 12, 12, 8, 10],
        "py": [13, 12, 12, 1, 18],
        "pz": [0, 0, -1, -1, -1],
        "nx": [13, 8, 7, 14, 9],
        "ny": [10, 10, 7, 13, 4],
        "nz": [0, 1, 1, 0, 1]
      }, {
        "size": 5,
        "px": [15, 4, 12, 14, 12],
        "py": [12, 3, 9, 10, 8],
        "pz": [0, 2, 0, 0, 0],
        "nx": [14, 7, 11, 2, 9],
        "ny": [8, 4, 7, 5, 4],
        "nz": [0, 1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [3, 9, 7],
        "py": [7, 23, 15],
        "pz": [1, -1, -1],
        "nx": [4, 4, 2],
        "ny": [9, 7, 5],
        "nz": [1, 1, 2]
      }, {
        "size": 3,
        "px": [5, 17, 5],
        "py": [3, 23, 4],
        "pz": [2, 0, 2],
        "nx": [23, 2, 4],
        "ny": [23, 16, 4],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [4, 9, 9, 10, 8],
        "py": [1, 0, 1, 0, 2],
        "pz": [1, 0, 0, 0, 0],
        "nx": [2, 5, 4, 2, 2],
        "ny": [2, 19, 11, 4, 1],
        "nz": [2, 0, 1, 2, 2]
      }, {
        "size": 5,
        "px": [8, 3, 8, 4, 7],
        "py": [23, 9, 13, 8, 16],
        "pz": [0, 1, 0, 1, 0],
        "nx": [8, 2, 5, 3, 2],
        "ny": [8, 15, 1, 1, 1],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [14, 5],
        "pz": [0, -1],
        "nx": [1, 9],
        "ny": [3, 13],
        "nz": [2, 0]
      }, {
        "size": 5,
        "px": [5, 8, 1, 8, 6],
        "py": [12, 12, 3, 23, 12],
        "pz": [0, 0, 2, 0, 0],
        "nx": [1, 1, 2, 1, 1],
        "ny": [22, 21, 23, 20, 20],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [14, 21, 19, 21, 20],
        "py": [13, 8, 20, 10, 7],
        "pz": [0, 0, 0, 0, 0],
        "nx": [16, 0, 14, 23, 1],
        "ny": [8, 1, 23, 10, 20],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [15, 16, 13, 14, 14],
        "py": [3, 3, 3, 3, 3],
        "pz": [0, 0, 0, 0, -1],
        "nx": [18, 19, 18, 9, 17],
        "ny": [2, 2, 1, 1, 0],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [17, 9],
        "py": [14, 4],
        "pz": [0, -1],
        "nx": [9, 18],
        "ny": [4, 18],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [21, 20],
        "py": [17, 21],
        "pz": [0, 0],
        "nx": [12, 3],
        "ny": [17, 10],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [10, 4],
        "pz": [1, 2],
        "nx": [4, 1],
        "ny": [10, 5],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [7, 8, 4, 9, 9],
        "py": [2, 2, 0, 2, 2],
        "pz": [0, 0, 1, 0, -1],
        "nx": [5, 5, 4, 6, 3],
        "ny": [0, 1, 2, 0, 0],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 2,
        "px": [2, 5],
        "py": [3, 5],
        "pz": [2, -1],
        "nx": [3, 2],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [0, 1, 3, 4, 4],
        "pz": [2, 2, 1, 1, -1],
        "nx": [20, 20, 19, 20, 19],
        "ny": [21, 20, 23, 19, 22],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [9, 18],
        "py": [8, 16],
        "pz": [1, 0],
        "nx": [14, 6],
        "ny": [15, 16],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [3, 4, 7],
        "py": [3, 3, 9],
        "pz": [2, 2, 1],
        "nx": [8, 9, 7],
        "ny": [4, 11, 4],
        "nz": [1, -1, -1]
      }, {
        "size": 5,
        "px": [6, 14, 4, 7, 7],
        "py": [4, 23, 3, 6, 6],
        "pz": [1, 0, 2, 1, -1],
        "nx": [2, 0, 2, 1, 3],
        "ny": [20, 4, 21, 10, 23],
        "nz": [0, 2, 0, 1, 0]
      }, {
        "size": 5,
        "px": [2, 4, 8, 9, 10],
        "py": [3, 8, 13, 23, 23],
        "pz": [2, 1, 0, 0, 0],
        "nx": [10, 4, 0, 3, 3],
        "ny": [21, 3, 0, 3, 23],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [11, 10, 11],
        "py": [6, 5, 5],
        "pz": [0, 0, 0],
        "nx": [14, 6, 1],
        "ny": [7, 9, 5],
        "nz": [0, 1, -1]
      }, {
        "size": 5,
        "px": [11, 11, 11, 11, 6],
        "py": [11, 12, 10, 13, 6],
        "pz": [0, 0, 0, 0, 1],
        "nx": [9, 13, 13, 13, 4],
        "ny": [4, 9, 10, 11, 2],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 11],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [1, 2],
        "py": [4, 11],
        "pz": [2, 0],
        "nx": [8, 8],
        "ny": [15, 15],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [12, 12, 13, 12, 12],
        "py": [10, 11, 13, 12, 12],
        "pz": [0, 0, 0, 0, -1],
        "nx": [0, 0, 0, 1, 0],
        "ny": [13, 2, 12, 5, 14],
        "nz": [0, 2, 0, 0, 0]
      }, {
        "size": 5,
        "px": [0, 0, 0, 1, 1],
        "py": [4, 3, 11, 15, 13],
        "pz": [1, 2, 0, 0, 0],
        "nx": [2, 3, 3, 1, 0],
        "ny": [2, 4, 4, 5, 14],
        "nz": [2, 1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 11],
        "py": [12, 10],
        "pz": [0, -1],
        "nx": [1, 2],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [18, 8, 9, 9, 9],
        "py": [15, 7, 8, 10, 7],
        "pz": [0, 1, 1, 1, 1],
        "nx": [22, 23, 21, 22, 11],
        "ny": [20, 16, 23, 19, 9],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [14, 12, 13, 14, 15],
        "py": [1, 0, 0, 0, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 9, 4, 7, 7],
        "ny": [2, 3, 1, 8, 8],
        "nz": [2, 1, 2, 1, -1]
      }, {
        "size": 2,
        "px": [13, 9],
        "py": [14, 19],
        "pz": [0, -1],
        "nx": [6, 10],
        "ny": [0, 2],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [13, 12],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [3, 3],
        "ny": [1, 1],
        "nz": [2, -1]
      }, {
        "size": 3,
        "px": [14, 5, 5],
        "py": [18, 3, 4],
        "pz": [0, -1, -1],
        "nx": [8, 7, 8],
        "ny": [4, 8, 10],
        "nz": [1, 1, 1]
      }, {
        "size": 2,
        "px": [8, 18],
        "py": [6, 11],
        "pz": [1, 0],
        "nx": [9, 1],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [16, 11],
        "py": [9, 7],
        "pz": [0, 0],
        "nx": [7, 7],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [23, 11, 23, 11, 23],
        "py": [13, 4, 12, 7, 10],
        "pz": [0, 1, 0, 1, 0],
        "nx": [7, 4, 8, 15, 15],
        "ny": [9, 2, 4, 8, 8],
        "nz": [0, 2, 1, 0, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [1, 0],
        "pz": [0, 1],
        "nx": [4, 1],
        "ny": [1, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [7, 6],
        "pz": [0, 1],
        "nx": [6, 4],
        "ny": [9, 11],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [5, 6, 5, 5],
        "py": [8, 6, 11, 6],
        "pz": [1, 1, 1, 0],
        "nx": [23, 0, 4, 5],
        "ny": [0, 2, 2, 1],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [18, 4],
        "py": [13, 3],
        "pz": [0, -1],
        "nx": [15, 4],
        "ny": [11, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [4, 0],
        "py": [8, 0],
        "pz": [1, -1],
        "nx": [9, 2],
        "ny": [15, 5],
        "nz": [0, 2]
      }, {
        "size": 5,
        "px": [15, 15, 16, 14, 14],
        "py": [0, 1, 1, 0, 0],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 4, 8, 8, 15],
        "ny": [4, 5, 4, 11, 23],
        "nz": [2, 2, 1, 1, 0]
      }, {
        "size": 4,
        "px": [12, 11, 3, 14],
        "py": [14, 22, 1, 0],
        "pz": [0, -1, -1, -1],
        "nx": [8, 15, 7, 16],
        "ny": [2, 3, 1, 3],
        "nz": [1, 0, 1, 0]
      }, {
        "size": 2,
        "px": [5, 12],
        "py": [6, 17],
        "pz": [1, -1],
        "nx": [2, 1],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [13, 12, 12, 7, 7],
        "py": [5, 6, 5, 14, 14],
        "pz": [0, 0, 0, 0, -1],
        "nx": [10, 3, 10, 1, 10],
        "ny": [13, 8, 11, 3, 10],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [15, 0],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [16, 17],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [1, 4, 2, 1, 2],
        "py": [4, 0, 1, 1, 0],
        "pz": [1, 1, 1, 2, 1],
        "nx": [4, 9, 1, 5, 1],
        "ny": [3, 4, 4, 5, 5],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [10, 3],
        "py": [3, 1],
        "pz": [0, 2],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [16, 0],
        "py": [21, 0],
        "pz": [0, -1],
        "nx": [6, 8],
        "ny": [8, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [7, 11],
        "py": [4, 18],
        "pz": [0, -1],
        "nx": [5, 7],
        "ny": [0, 2],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [9, 7],
        "py": [0, 3],
        "pz": [1, -1],
        "nx": [20, 10],
        "ny": [0, 1],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [10, 4, 1, 5],
        "py": [0, 6, 8, 4],
        "pz": [1, -1, -1, -1],
        "nx": [6, 15, 4, 14],
        "ny": [3, 5, 1, 5],
        "nz": [1, 0, 2, 0]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [3, 4],
        "pz": [2, 2],
        "nx": [9, 2],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [3, 4],
        "pz": [0, -1],
        "nx": [8, 6],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 0],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [0, 7],
        "ny": [7, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [7, 3],
        "pz": [1, -1],
        "nx": [15, 4],
        "ny": [14, 4],
        "nz": [0, 2]
      }, {
        "size": 4,
        "px": [3, 1, 2, 2],
        "py": [20, 7, 18, 17],
        "pz": [0, 1, 0, 0],
        "nx": [9, 5, 5, 4],
        "ny": [5, 4, 18, 4],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [3, 1],
        "pz": [2, -1],
        "nx": [23, 23],
        "ny": [14, 13],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 4],
        "py": [6, 1],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [22, 22, 11, 11, 11],
        "py": [12, 13, 4, 6, 6],
        "pz": [0, 0, 1, 1, -1],
        "nx": [4, 4, 4, 4, 3],
        "ny": [16, 15, 18, 14, 11],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 2,
        "px": [4, 10],
        "py": [0, 1],
        "pz": [1, 0],
        "nx": [2, 2],
        "ny": [2, 2],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [15, 6],
        "py": [4, 4],
        "pz": [0, -1],
        "nx": [15, 4],
        "ny": [2, 1],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [11, 2],
        "py": [10, 20],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 19],
        "py": [3, 8],
        "pz": [2, 0],
        "nx": [8, 21],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [4, 6, 7, 6, 2],
        "py": [6, 15, 13, 14, 3],
        "pz": [1, 0, 0, 0, -1],
        "nx": [21, 22, 19, 21, 10],
        "ny": [6, 12, 0, 3, 2],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [8, 12, 15, 14, 13],
        "py": [0, 0, 0, 0, 0],
        "pz": [1, 0, 0, 0, 0],
        "nx": [4, 3, 1, 3, 4],
        "ny": [19, 16, 3, 15, 4],
        "nz": [0, 0, 2, 0, 1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [2, 3],
        "pz": [2, 2],
        "nx": [8, 4],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [0, 0, 0, 5],
        "py": [10, 9, 11, 21],
        "pz": [1, 1, -1, -1],
        "nx": [12, 4, 3, 11],
        "ny": [3, 1, 1, 3],
        "nz": [0, 2, 2, 0]
      }, {
        "size": 2,
        "px": [3, 1],
        "py": [0, 0],
        "pz": [1, 2],
        "nx": [1, 4],
        "ny": [2, 1],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [2, 5, 1, 0, 1],
        "py": [14, 23, 7, 5, 9],
        "pz": [0, 0, 1, 1, 1],
        "nx": [0, 0, 7, 9, 11],
        "ny": [23, 22, 4, 9, 3],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [8, 9],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [8, 8],
        "ny": [8, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [11, 9],
        "py": [11, 3],
        "pz": [1, -1],
        "nx": [3, 2],
        "ny": [14, 10],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [2, 4, 5, 4],
        "py": [8, 20, 22, 16],
        "pz": [1, 0, 0, 0],
        "nx": [8, 2, 11, 3],
        "ny": [7, 4, 15, 4],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 3,
        "px": [1, 2, 3],
        "py": [2, 1, 0],
        "pz": [0, 0, 0],
        "nx": [0, 0, 15],
        "ny": [1, 0, 11],
        "nz": [0, 0, -1]
      }, {
        "size": 2,
        "px": [12, 22],
        "py": [6, 7],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 3,
        "px": [13, 0, 5],
        "py": [19, 10, 2],
        "pz": [0, -1, -1],
        "nx": [3, 4, 6],
        "ny": [5, 5, 9],
        "nz": [2, 2, 1]
      }, {
        "size": 2,
        "px": [8, 15],
        "py": [8, 22],
        "pz": [1, 0],
        "nx": [7, 4],
        "ny": [10, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [7, 6],
        "pz": [1, 1],
        "nx": [10, 1],
        "ny": [9, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 11],
        "py": [4, 3],
        "pz": [0, -1],
        "nx": [5, 9],
        "ny": [0, 1],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [14, 13, 14, 12, 15],
        "py": [1, 2, 2, 2, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 8, 4, 7, 4],
        "ny": [2, 4, 3, 4, 4],
        "nz": [2, 1, 2, 1, -1]
      }, {
        "size": 3,
        "px": [13, 8, 2],
        "py": [14, 5, 8],
        "pz": [0, -1, -1],
        "nx": [6, 8, 9],
        "ny": [3, 2, 2],
        "nz": [0, 0, 0]
      }, {
        "size": 3,
        "px": [3, 6, 8],
        "py": [7, 4, 12],
        "pz": [1, 1, 0],
        "nx": [3, 8, 9],
        "ny": [5, 2, 2],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [16, 3],
        "pz": [0, 2],
        "nx": [13, 7],
        "ny": [15, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 0],
        "py": [7, 9],
        "pz": [1, -1],
        "nx": [2, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [3, 6, 8, 7, 7],
        "py": [0, 1, 0, 0, 0],
        "pz": [1, 0, 0, 0, -1],
        "nx": [7, 9, 4, 3, 4],
        "ny": [9, 7, 4, 2, 2],
        "nz": [1, 1, 1, 2, 2]
      }, {
        "size": 3,
        "px": [3, 4, 16],
        "py": [4, 4, 6],
        "pz": [1, 2, 0],
        "nx": [2, 2, 2],
        "ny": [0, 0, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [5, 5],
        "ny": [2, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [7, 20],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [8, 21],
        "py": [10, 18],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [10, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [6, 13],
        "py": [6, 23],
        "pz": [1, -1],
        "nx": [10, 10],
        "ny": [11, 12],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [10, 9, 5, 10, 10],
        "py": [9, 13, 6, 10, 10],
        "pz": [0, 0, 1, 0, -1],
        "nx": [21, 21, 21, 10, 21],
        "ny": [18, 20, 19, 11, 17],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [7, 6],
        "pz": [1, 1],
        "nx": [8, 1],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [14, 7],
        "pz": [0, -1],
        "nx": [13, 13],
        "ny": [13, 11],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [4, 5],
        "pz": [2, 2],
        "nx": [12, 5],
        "ny": [16, 2],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [1, 3, 20],
        "py": [3, 9, 2],
        "pz": [2, -1, -1],
        "nx": [0, 0, 0],
        "ny": [7, 4, 13],
        "nz": [1, 2, 0]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [4, 2],
        "pz": [1, 2],
        "nx": [1, 0],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [8, 9, 11],
        "py": [2, 1, 2],
        "pz": [0, 0, 0],
        "nx": [2, 2, 0],
        "ny": [2, 2, 13],
        "nz": [2, -1, -1]
      }, {
        "size": 2,
        "px": [1, 10],
        "py": [23, 5],
        "pz": [0, -1],
        "nx": [3, 6],
        "ny": [1, 1],
        "nz": [2, 1]
      }, {
        "size": 4,
        "px": [13, 6, 3, 4],
        "py": [8, 6, 4, 2],
        "pz": [0, -1, -1, -1],
        "nx": [1, 1, 1, 4],
        "ny": [9, 7, 8, 20],
        "nz": [1, 1, 1, 0]
      }, {
        "size": 5,
        "px": [11, 4, 4, 10, 3],
        "py": [9, 16, 13, 12, 7],
        "pz": [0, 0, 0, 0, 0],
        "nx": [7, 11, 3, 17, 4],
        "ny": [8, 11, 9, 0, 4],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [6, 8],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [1, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [7, 2],
        "pz": [0, -1],
        "nx": [4, 13],
        "ny": [5, 9],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [8, 2],
        "pz": [1, -1],
        "nx": [16, 4],
        "ny": [14, 5],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [16, 15],
        "pz": [0, 0],
        "nx": [1, 20],
        "ny": [23, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [2, 3],
        "ny": [5, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [19, 8],
        "py": [5, 4],
        "pz": [0, -1],
        "nx": [10, 10],
        "ny": [1, 3],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [21, 21],
        "py": [18, 16],
        "pz": [0, 0],
        "nx": [10, 3],
        "ny": [17, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [23, 4],
        "pz": [0, 2],
        "nx": [5, 11],
        "ny": [3, 7],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [7, 0],
        "py": [3, 2],
        "pz": [0, -1],
        "nx": [3, 6],
        "ny": [1, 1],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [5, 9, 8, 9],
        "py": [8, 12, 13, 18],
        "pz": [0, 0, 0, 0],
        "nx": [6, 5, 2, 5],
        "ny": [8, 4, 7, 11],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [0, 0],
        "pz": [0, 2],
        "nx": [5, 5],
        "ny": [3, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [12, 13],
        "pz": [0, 0],
        "nx": [9, 1],
        "ny": [14, 3],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [8, 16, 9, 4, 15],
        "py": [11, 13, 8, 4, 12],
        "pz": [1, 0, 1, 2, 0],
        "nx": [3, 3, 3, 3, 4],
        "ny": [4, 2, 1, 3, 0],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [7, 6],
        "pz": [1, -1],
        "nx": [19, 8],
        "ny": [17, 11],
        "nz": [0, 1]
      }, {
        "size": 5,
        "px": [14, 15, 12, 13, 13],
        "py": [2, 2, 2, 2, 2],
        "pz": [0, 0, 0, 0, -1],
        "nx": [20, 9, 19, 20, 4],
        "ny": [14, 2, 5, 15, 1],
        "nz": [0, 1, 0, 0, 2]
      }, {
        "size": 2,
        "px": [18, 8],
        "py": [20, 7],
        "pz": [0, 1],
        "nx": [4, 9],
        "ny": [2, 2],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [11, 5],
        "pz": [1, 2],
        "nx": [13, 19],
        "ny": [20, 20],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [12, 11, 3],
        "py": [20, 20, 5],
        "pz": [0, 0, -1],
        "nx": [11, 12, 6],
        "ny": [21, 21, 10],
        "nz": [0, 0, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 14],
        "pz": [1, 0],
        "nx": [3, 13],
        "ny": [4, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 9],
        "pz": [2, 1],
        "nx": [2, 11],
        "ny": [8, 6],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [5, 5],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [6, 3],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [11, 23],
        "py": [5, 9],
        "pz": [1, 0],
        "nx": [8, 2],
        "ny": [11, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 23],
        "py": [12, 9],
        "pz": [0, -1],
        "nx": [11, 22],
        "ny": [10, 21],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [12, 12],
        "py": [7, 7],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [7, 10],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [9, 8],
        "py": [18, 1],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [8, 10],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [16, 17],
        "py": [11, 11],
        "pz": [0, 0],
        "nx": [15, 2],
        "ny": [9, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 1],
        "py": [3, 0],
        "pz": [2, -1],
        "nx": [9, 10],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [13, 13],
        "py": [20, 21],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [20, 20, 4, 18, 19],
        "py": [17, 16, 5, 22, 20],
        "pz": [0, 0, 2, 0, 0],
        "nx": [8, 11, 5, 6, 2],
        "ny": [10, 15, 11, 10, 1],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [4, 4],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 3,
        "px": [6, 5, 6],
        "py": [8, 10, 10],
        "pz": [1, 1, 1],
        "nx": [11, 8, 22],
        "ny": [19, 2, 15],
        "nz": [0, -1, -1]
      }, {
        "size": 3,
        "px": [5, 2, 13],
        "py": [7, 10, 10],
        "pz": [1, -1, -1],
        "nx": [11, 11, 23],
        "ny": [8, 9, 14],
        "nz": [1, 1, 0]
      }, {
        "size": 5,
        "px": [3, 6, 1, 5, 10],
        "py": [7, 14, 1, 9, 2],
        "pz": [1, -1, -1, -1, -1],
        "nx": [11, 0, 1, 5, 1],
        "ny": [14, 12, 18, 5, 19],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 3,
        "px": [21, 21, 10],
        "py": [16, 17, 10],
        "pz": [0, 0, 1],
        "nx": [5, 5, 1],
        "ny": [9, 9, 18],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 21],
        "py": [6, 17],
        "pz": [1, -1],
        "nx": [20, 10],
        "ny": [7, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [10, 11],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [6, 13],
        "ny": [2, 4],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [4, 4, 7, 9],
        "py": [3, 4, 10, 3],
        "pz": [2, 2, 1, 1],
        "nx": [21, 2, 15, 5],
        "ny": [0, 0, 0, 2],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 3,
        "px": [11, 11, 11],
        "py": [7, 6, 9],
        "pz": [1, 1, 1],
        "nx": [23, 4, 9],
        "ny": [23, 5, 6],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [14, 15],
        "py": [1, 1],
        "pz": [0, 0],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [11, 23, 11, 23, 23],
        "py": [11, 22, 10, 21, 20],
        "pz": [1, 0, 1, 0, 0],
        "nx": [10, 9, 19, 10, 10],
        "ny": [10, 11, 20, 9, 9],
        "nz": [1, 1, 0, 1, -1]
      }, {
        "size": 2,
        "px": [7, 23],
        "py": [13, 22],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [12, 1],
        "py": [19, 0],
        "pz": [0, -1],
        "nx": [11, 12],
        "ny": [22, 17],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [10, 8],
        "py": [4, 3],
        "pz": [1, -1],
        "nx": [5, 23],
        "ny": [2, 7],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [9, 10],
        "py": [6, 20],
        "pz": [1, -1],
        "nx": [8, 8],
        "ny": [4, 6],
        "nz": [1, 1]
      }],
      "alpha": [-1.135386e+00, 1.135386e+00, -9.090800e-01, 9.090800e-01, -5.913780e-01, 5.913780e-01, -5.556534e-01, 5.556534e-01, -5.084150e-01, 5.084150e-01, -4.464489e-01, 4.464489e-01, -4.463241e-01, 4.463241e-01, -4.985226e-01, 4.985226e-01, -4.424638e-01, 4.424638e-01, -4.300093e-01, 4.300093e-01, -4.231341e-01, 4.231341e-01, -4.087428e-01, 4.087428e-01, -3.374480e-01, 3.374480e-01, -3.230151e-01, 3.230151e-01, -3.084427e-01, 3.084427e-01, -3.235494e-01, 3.235494e-01, -2.589281e-01, 2.589281e-01, -2.970292e-01, 2.970292e-01, -2.957065e-01, 2.957065e-01, -3.997619e-01, 3.997619e-01, -3.535901e-01, 3.535901e-01, -2.725396e-01, 2.725396e-01, -2.649725e-01, 2.649725e-01, -3.103888e-01, 3.103888e-01, -3.117775e-01, 3.117775e-01, -2.589620e-01, 2.589620e-01, -2.689202e-01, 2.689202e-01, -2.127024e-01, 2.127024e-01, -2.436322e-01, 2.436322e-01, -3.120574e-01, 3.120574e-01, -2.786010e-01, 2.786010e-01, -2.649072e-01, 2.649072e-01, -2.766509e-01, 2.766509e-01, -2.367237e-01, 2.367237e-01, -2.658049e-01, 2.658049e-01, -2.103463e-01, 2.103463e-01, -1.911522e-01, 1.911522e-01, -2.535425e-01, 2.535425e-01, -2.434696e-01, 2.434696e-01, -2.180788e-01, 2.180788e-01, -2.496873e-01, 2.496873e-01, -2.700969e-01, 2.700969e-01, -2.565479e-01, 2.565479e-01, -2.737741e-01, 2.737741e-01, -1.675507e-01, 1.675507e-01, -2.551417e-01, 2.551417e-01, -2.067648e-01, 2.067648e-01, -1.636834e-01, 1.636834e-01, -2.129306e-01, 2.129306e-01, -1.656758e-01, 1.656758e-01, -1.919369e-01, 1.919369e-01, -2.031763e-01, 2.031763e-01, -2.062327e-01, 2.062327e-01, -2.577950e-01, 2.577950e-01, -2.951823e-01, 2.951823e-01, -2.023160e-01, 2.023160e-01, -2.022234e-01, 2.022234e-01, -2.132906e-01, 2.132906e-01, -1.653278e-01, 1.653278e-01, -1.648474e-01, 1.648474e-01, -1.593352e-01, 1.593352e-01, -1.735650e-01, 1.735650e-01, -1.688778e-01, 1.688778e-01, -1.519705e-01, 1.519705e-01, -1.812202e-01, 1.812202e-01, -1.967481e-01, 1.967481e-01, -1.852954e-01, 1.852954e-01, -2.317780e-01, 2.317780e-01, -2.036251e-01, 2.036251e-01, -1.609324e-01, 1.609324e-01, -2.160205e-01, 2.160205e-01, -2.026190e-01, 2.026190e-01, -1.854761e-01, 1.854761e-01, -1.832038e-01, 1.832038e-01, -2.001141e-01, 2.001141e-01, -1.418333e-01, 1.418333e-01, -1.704773e-01, 1.704773e-01, -1.586261e-01, 1.586261e-01, -1.587582e-01, 1.587582e-01, -1.899489e-01, 1.899489e-01, -1.477160e-01, 1.477160e-01, -2.260467e-01, 2.260467e-01, -2.393598e-01, 2.393598e-01, -1.582373e-01, 1.582373e-01, -1.702498e-01, 1.702498e-01, -1.737398e-01, 1.737398e-01, -1.462529e-01, 1.462529e-01, -1.396517e-01, 1.396517e-01, -1.629625e-01, 1.629625e-01, -1.446933e-01, 1.446933e-01, -1.811657e-01, 1.811657e-01, -1.336427e-01, 1.336427e-01, -1.924813e-01, 1.924813e-01, -1.457520e-01, 1.457520e-01, -1.600259e-01, 1.600259e-01, -1.297000e-01, 1.297000e-01, -2.076199e-01, 2.076199e-01, -1.510060e-01, 1.510060e-01, -1.914568e-01, 1.914568e-01, -2.138162e-01, 2.138162e-01, -1.856916e-01, 1.856916e-01, -1.843047e-01, 1.843047e-01, -1.526846e-01, 1.526846e-01, -1.328320e-01, 1.328320e-01, -1.751311e-01, 1.751311e-01, -1.643908e-01, 1.643908e-01, -1.482706e-01, 1.482706e-01, -1.622298e-01, 1.622298e-01, -1.884979e-01, 1.884979e-01, -1.633604e-01, 1.633604e-01, -1.554166e-01, 1.554166e-01, -1.405332e-01, 1.405332e-01, -1.772398e-01, 1.772398e-01, -1.410008e-01, 1.410008e-01, -1.362301e-01, 1.362301e-01, -1.709087e-01, 1.709087e-01, -1.584613e-01, 1.584613e-01, -1.188814e-01, 1.188814e-01, -1.423888e-01, 1.423888e-01, -1.345565e-01, 1.345565e-01, -1.835986e-01, 1.835986e-01, -1.445329e-01, 1.445329e-01, -1.385826e-01, 1.385826e-01, -1.558917e-01, 1.558917e-01, -1.476053e-01, 1.476053e-01, -1.370722e-01, 1.370722e-01, -2.362666e-01, 2.362666e-01, -2.907774e-01, 2.907774e-01, -1.656360e-01, 1.656360e-01, -1.644407e-01, 1.644407e-01, -1.443394e-01, 1.443394e-01, -1.438823e-01, 1.438823e-01, -1.476964e-01, 1.476964e-01, -1.956593e-01, 1.956593e-01, -2.417519e-01, 2.417519e-01, -1.659315e-01, 1.659315e-01, -1.466254e-01, 1.466254e-01, -2.034909e-01, 2.034909e-01, -2.128771e-01, 2.128771e-01, -1.665429e-01, 1.665429e-01, -1.387131e-01, 1.387131e-01, -1.298823e-01, 1.298823e-01, -1.329495e-01, 1.329495e-01, -1.769587e-01, 1.769587e-01, -1.366530e-01, 1.366530e-01, -1.254359e-01, 1.254359e-01, -1.673022e-01, 1.673022e-01, -1.602519e-01, 1.602519e-01, -1.897245e-01, 1.897245e-01, -1.893579e-01, 1.893579e-01, -1.579350e-01, 1.579350e-01, -1.472589e-01, 1.472589e-01, -1.614193e-01, 1.614193e-01]
    }, {
      "count": 203,
      "threshold": -4.769677e+00,
      "feature": [{
        "size": 5,
        "px": [12, 5, 14, 9, 7],
        "py": [9, 13, 3, 1, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [1, 0, 5, 14, 9],
        "ny": [5, 3, 8, 8, 9],
        "nz": [2, 0, 1, 0, 0]
      }, {
        "size": 5,
        "px": [14, 13, 11, 17, 12],
        "py": [2, 2, 4, 13, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [7, 22, 8, 23, 22],
        "ny": [8, 15, 11, 12, 3],
        "nz": [1, 0, 1, 0, 0]
      }, {
        "size": 5,
        "px": [9, 11, 11, 11, 16],
        "py": [4, 8, 7, 9, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 8, 14, 9, 9],
        "ny": [4, 4, 8, 8, 8],
        "nz": [1, 1, 0, 0, -1]
      }, {
        "size": 5,
        "px": [6, 12, 12, 8, 3],
        "py": [11, 7, 8, 10, 2],
        "pz": [0, 0, 0, 0, 2],
        "nx": [8, 4, 4, 4, 0],
        "ny": [4, 4, 4, 11, 0],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [19, 17, 18, 9, 9],
        "py": [3, 2, 3, 1, 1],
        "pz": [0, 0, 0, 1, -1],
        "nx": [21, 21, 10, 22, 22],
        "ny": [1, 2, 0, 4, 3],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [4, 6],
        "pz": [2, 1],
        "nx": [8, 7],
        "ny": [4, 10],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [14, 17, 17, 13, 12],
        "py": [18, 15, 16, 18, 18],
        "pz": [0, 0, 0, 0, 0],
        "nx": [13, 19, 5, 20, 6],
        "ny": [16, 4, 1, 19, 0],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [6, 7, 4, 5, 5],
        "py": [15, 23, 6, 12, 16],
        "pz": [0, 0, 1, 0, 0],
        "nx": [3, 14, 14, 6, 6],
        "ny": [4, 11, 11, 9, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [16, 9, 6, 3, 11],
        "py": [2, 2, 5, 3, 2],
        "pz": [0, 0, 1, 2, 0],
        "nx": [3, 4, 2, 5, 5],
        "ny": [4, 11, 2, 8, 8],
        "nz": [1, 1, 2, 1, -1]
      }, {
        "size": 5,
        "px": [6, 1, 5, 3, 3],
        "py": [14, 4, 15, 7, 7],
        "pz": [0, 2, 0, 1, -1],
        "nx": [0, 0, 1, 1, 1],
        "ny": [7, 8, 18, 17, 5],
        "nz": [1, 1, 0, 0, 2]
      }, {
        "size": 5,
        "px": [12, 12, 9, 5, 3],
        "py": [14, 14, 0, 3, 7],
        "pz": [0, -1, -1, -1, -1],
        "nx": [7, 7, 14, 8, 13],
        "ny": [7, 8, 13, 10, 10],
        "nz": [1, 1, 0, 1, 0]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [7, 9],
        "pz": [1, -1],
        "nx": [2, 4],
        "ny": [5, 4],
        "nz": [2, 1]
      }, {
        "size": 3,
        "px": [10, 21, 17],
        "py": [7, 11, 23],
        "pz": [1, 0, 0],
        "nx": [21, 9, 3],
        "ny": [23, 5, 5],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [8, 11, 9, 10, 11],
        "py": [2, 0, 1, 1, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 5, 6, 4, 3],
        "ny": [8, 4, 18, 7, 4],
        "nz": [1, 1, 0, 1, -1]
      }, {
        "size": 5,
        "px": [20, 22, 3, 19, 10],
        "py": [20, 9, 4, 22, 3],
        "pz": [0, 0, 2, 0, 1],
        "nx": [8, 20, 8, 3, 2],
        "ny": [4, 3, 6, 4, 3],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [9, 2],
        "ny": [15, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 13],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [20, 21],
        "ny": [1, 4],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [1, 2, 7, 6, 8],
        "py": [0, 2, 3, 3, 3],
        "pz": [2, 1, 0, 0, 0],
        "nx": [1, 2, 1, 1, 1],
        "ny": [0, 0, 4, 3, 3],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [3, 10],
        "py": [9, 11],
        "pz": [0, 0],
        "nx": [6, 3],
        "ny": [9, 2],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 12, 6],
        "py": [10, 11, 13, 12, 6],
        "pz": [0, 0, 0, 0, -1],
        "nx": [10, 2, 1, 10, 10],
        "ny": [10, 4, 2, 11, 9],
        "nz": [0, 1, 2, 0, 0]
      }, {
        "size": 5,
        "px": [16, 18, 11, 17, 15],
        "py": [11, 12, 8, 12, 11],
        "pz": [0, 0, 0, 0, 0],
        "nx": [14, 0, 19, 0, 10],
        "ny": [9, 3, 14, 8, 9],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 4,
        "px": [5, 9, 5, 8],
        "py": [21, 18, 20, 23],
        "pz": [0, 0, 0, 0],
        "nx": [8, 4, 3, 1],
        "ny": [20, 3, 4, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [3, 2],
        "pz": [2, 2],
        "nx": [3, 12],
        "ny": [4, 23],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [0, 1, 1, 1, 1],
        "py": [2, 16, 14, 13, 12],
        "pz": [2, 0, 0, 0, 0],
        "nx": [8, 4, 9, 4, 7],
        "ny": [9, 3, 4, 2, 9],
        "nz": [1, 2, 1, 2, 1]
      }, {
        "size": 2,
        "px": [4, 9],
        "py": [3, 7],
        "pz": [2, -1],
        "nx": [4, 9],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [15, 16, 17, 15, 8],
        "py": [3, 3, 3, 18, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [1, 2, 2, 1, 3],
        "ny": [5, 3, 2, 6, 0],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 17],
        "py": [4, 14],
        "pz": [2, 0],
        "nx": [15, 7],
        "ny": [15, 10],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [14, 12, 3],
        "py": [3, 13, 3],
        "pz": [0, -1, -1],
        "nx": [4, 17, 4],
        "ny": [3, 19, 4],
        "nz": [2, 0, 2]
      }, {
        "size": 4,
        "px": [4, 5, 12, 2],
        "py": [9, 6, 19, 4],
        "pz": [1, 1, 0, 2],
        "nx": [12, 17, 4, 4],
        "ny": [18, 19, 4, 4],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 5,
        "px": [10, 19, 20, 20, 19],
        "py": [7, 14, 13, 14, 13],
        "pz": [1, 0, 0, 0, -1],
        "nx": [11, 23, 23, 23, 23],
        "ny": [9, 15, 13, 16, 14],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [0, 0, 0, 2],
        "py": [5, 6, 5, 14],
        "pz": [1, 1, 2, 0],
        "nx": [0, 3, 3, 17],
        "ny": [23, 5, 5, 9],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [15, 4],
        "py": [23, 5],
        "pz": [0, 2],
        "nx": [9, 3],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [6, 5, 10, 12],
        "py": [3, 3, 23, 23],
        "pz": [1, 1, 0, 0],
        "nx": [11, 1, 1, 4],
        "ny": [21, 3, 5, 5],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [9, 4],
        "pz": [1, 2],
        "nx": [4, 9],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [23, 23, 23, 23, 23],
        "py": [14, 9, 13, 11, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [6, 13, 7, 8, 8],
        "ny": [9, 6, 3, 3, 3],
        "nz": [1, 0, 1, 1, -1]
      }, {
        "size": 2,
        "px": [10, 3],
        "py": [4, 5],
        "pz": [0, -1],
        "nx": [3, 8],
        "ny": [1, 3],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [3, 12],
        "py": [4, 18],
        "pz": [2, 0],
        "nx": [12, 0],
        "ny": [16, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 2],
        "py": [4, 4],
        "pz": [0, -1],
        "nx": [16, 4],
        "ny": [1, 0],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [5, 3],
        "ny": [19, 9],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [20, 19, 20, 21],
        "py": [2, 0, 1, 3],
        "pz": [0, 0, 0, 0],
        "nx": [11, 5, 23, 11],
        "ny": [0, 0, 1, 1],
        "nz": [1, 2, 0, 1]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [7, 5],
        "pz": [0, 0],
        "nx": [8, 5],
        "ny": [3, 5],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [22, 21, 22, 22, 22],
        "py": [20, 22, 18, 19, 16],
        "pz": [0, 0, 0, 0, 0],
        "nx": [2, 3, 3, 15, 15],
        "ny": [4, 5, 4, 7, 7],
        "nz": [1, 2, 1, 0, -1]
      }, {
        "size": 3,
        "px": [15, 14, 14],
        "py": [1, 1, 1],
        "pz": [0, 0, -1],
        "nx": [17, 18, 16],
        "ny": [1, 2, 1],
        "nz": [0, 0, 0]
      }, {
        "size": 4,
        "px": [17, 16, 16, 15],
        "py": [2, 1, 0, 0],
        "pz": [0, 0, 0, 0],
        "nx": [7, 4, 2, 11],
        "ny": [11, 2, 1, 4],
        "nz": [1, 2, -1, -1]
      }, {
        "size": 4,
        "px": [18, 0, 0, 0],
        "py": [14, 6, 5, 4],
        "pz": [0, -1, -1, -1],
        "nx": [19, 19, 19, 19],
        "ny": [16, 19, 17, 18],
        "nz": [0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [11, 5, 5, 0],
        "py": [14, 1, 4, 4],
        "pz": [0, -1, -1, -1],
        "nx": [11, 8, 2, 15],
        "ny": [17, 14, 1, 9],
        "nz": [0, 0, 2, 0]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [19, 21],
        "pz": [0, 0],
        "nx": [10, 2],
        "ny": [15, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 4],
        "py": [4, 6],
        "pz": [1, 1],
        "nx": [3, 3],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 7],
        "py": [1, 13],
        "pz": [2, 0],
        "nx": [7, 2],
        "ny": [1, 4],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [15, 10, 4, 7],
        "py": [23, 3, 1, 7],
        "pz": [0, 1, 2, 1],
        "nx": [0, 4, 1, 1],
        "ny": [0, 2, 0, -1900147915],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [12, 11],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [2, 5],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 1, 0],
        "py": [9, 4, 3, 2, 6],
        "pz": [0, 1, 2, 1, 1],
        "nx": [9, 4, 2, 16, 16],
        "ny": [7, 4, 2, 8, 8],
        "nz": [0, 1, 2, 0, -1]
      }, {
        "size": 5,
        "px": [18, 4, 9, 4, 4],
        "py": [12, 5, 6, 3, 4],
        "pz": [0, 2, 1, 2, -1],
        "nx": [4, 3, 3, 2, 3],
        "ny": [23, 19, 21, 16, 18],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [14, 13],
        "pz": [0, 0],
        "nx": [3, 10],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [3, 4, 4, 2, 2],
        "py": [8, 11, 7, 4, 4],
        "pz": [1, 1, 1, 2, -1],
        "nx": [20, 18, 19, 20, 19],
        "ny": [4, 0, 2, 3, 1],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [17, 12, 14, 8, 16],
        "py": [2, 0, 0, 0, 0],
        "pz": [0, 0, 0, 1, 0],
        "nx": [3, 15, 3, 2, 2],
        "ny": [2, 9, 7, 2, 2],
        "nz": [2, 0, 1, 2, -1]
      }, {
        "size": 5,
        "px": [11, 10, 11, 11, 11],
        "py": [10, 12, 11, 12, 12],
        "pz": [0, 0, 0, 0, -1],
        "nx": [13, 13, 20, 10, 13],
        "ny": [9, 11, 8, 4, 10],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [8, 16],
        "py": [7, 13],
        "pz": [1, 0],
        "nx": [8, 13],
        "ny": [4, 11],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 7],
        "py": [20, 3],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [10, 10],
        "nz": [1, 1]
      }, {
        "size": 3,
        "px": [13, 10, 17],
        "py": [9, 3, 5],
        "pz": [0, -1, -1],
        "nx": [1, 3, 1],
        "ny": [5, 16, 6],
        "nz": [2, 0, 1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 5],
        "pz": [2, -1],
        "nx": [8, 3],
        "ny": [14, 10],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [11, 9, 12, 10],
        "py": [2, 2, 2, 2],
        "pz": [0, 0, 0, 0],
        "nx": [4, 4, 4, 10],
        "ny": [5, 5, 0, 16],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [7, 9, 12],
        "py": [2, 2, 2],
        "pz": [1, -1, -1],
        "nx": [4, 7, 2],
        "ny": [3, 1, 0],
        "nz": [0, 0, 2]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 12],
        "pz": [2, 0],
        "nx": [7, 4],
        "ny": [6, 5],
        "nz": [1, 2]
      }, {
        "size": 4,
        "px": [12, 12, 6, 3],
        "py": [12, 11, 21, 7],
        "pz": [0, 0, -1, -1],
        "nx": [1, 0, 0, 0],
        "ny": [13, 3, 6, 5],
        "nz": [0, 2, 1, 1]
      }, {
        "size": 3,
        "px": [3, 1, 3],
        "py": [21, 8, 18],
        "pz": [0, 1, 0],
        "nx": [11, 20, 0],
        "ny": [17, 17, 6],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [2, 8],
        "py": [3, 12],
        "pz": [2, 0],
        "nx": [2, 20],
        "ny": [4, 17],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [2, 3, 4, 3, 2],
        "py": [10, 14, 14, 15, 13],
        "pz": [1, 0, 0, 0, 0],
        "nx": [0, 0, 1, 0, 0],
        "ny": [21, 20, 23, 19, 19],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [2, 15],
        "py": [7, 4],
        "pz": [1, -1],
        "nx": [3, 8],
        "ny": [4, 14],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [19, 14, 12, 15, 4],
        "py": [8, 12, 10, 16, 2],
        "pz": [0, 0, 0, 0, 2],
        "nx": [8, 0, 12, 4, 0],
        "ny": [4, 1, 12, 2, 19],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [18, 9],
        "py": [15, 3],
        "pz": [0, -1],
        "nx": [8, 15],
        "ny": [9, 14],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [4, 2, 3, 4, 9],
        "py": [9, 4, 3, 8, 23],
        "pz": [1, 2, 1, 1, 0],
        "nx": [11, 23, 23, 11, 11],
        "ny": [0, 2, 3, 1, 1],
        "nz": [1, 0, 0, 1, -1]
      }, {
        "size": 2,
        "px": [6, 7],
        "py": [1, 1],
        "pz": [0, 0],
        "nx": [3, 4],
        "ny": [10, 5],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [11, 9, 8, 5],
        "py": [12, 15, 13, 3],
        "pz": [0, -1, -1, -1],
        "nx": [3, 12, 14, 13],
        "ny": [0, 3, 3, 3],
        "nz": [2, 0, 0, 0]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [6, 5],
        "pz": [0, 0],
        "nx": [8, 11],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [21, 20, 21, 21, 21],
        "py": [18, 21, 17, 19, 19],
        "pz": [0, 0, 0, 0, -1],
        "nx": [2, 5, 4, 4, 5],
        "ny": [5, 12, 11, 10, 10],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [1, 1, 1, 1, 1],
        "py": [10, 11, 7, 9, 8],
        "pz": [0, 0, 0, 0, 0],
        "nx": [11, 23, 23, 23, 23],
        "ny": [10, 20, 21, 19, 19],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [7, 8, 7, 3, 1],
        "py": [14, 13, 13, 2, 2],
        "pz": [0, 0, -1, -1, -1],
        "nx": [1, 10, 2, 2, 10],
        "ny": [2, 13, 4, 16, 12],
        "nz": [2, 0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [17, 18],
        "py": [12, 12],
        "pz": [0, 0],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 0],
        "py": [5, 20],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [0, 2],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [22, 22, 22, 11, 23],
        "py": [16, 15, 14, 6, 13],
        "pz": [0, 0, 0, 1, 0],
        "nx": [16, 15, 7, 9, 9],
        "ny": [15, 8, 4, 10, 10],
        "nz": [0, 0, 1, 1, -1]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [3, 1],
        "pz": [0, 2],
        "nx": [8, 3],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [4, 1],
        "pz": [1, -1],
        "nx": [6, 3],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 3,
        "px": [4, 2, 6],
        "py": [6, 3, 4],
        "pz": [1, 2, 1],
        "nx": [10, 0, 4],
        "ny": [9, 4, 3],
        "nz": [0, -1, -1]
      }, {
        "size": 4,
        "px": [2, 8, 4, 10],
        "py": [4, 23, 7, 23],
        "pz": [2, 0, 1, 0],
        "nx": [9, 4, 11, 9],
        "ny": [21, 5, 16, 0],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [13, 0],
        "pz": [0, -1],
        "nx": [8, 2],
        "ny": [11, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [1, 4],
        "pz": [1, -1],
        "nx": [3, 5],
        "ny": [0, 1],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [0, 0],
        "pz": [0, 2],
        "nx": [2, 10],
        "ny": [1, 6],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [10, 2],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [21, 5],
        "ny": [15, 4],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [10, 9],
        "pz": [0, 0],
        "nx": [0, 3],
        "ny": [13, 11],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 9],
        "py": [13, 0],
        "pz": [0, -1],
        "nx": [3, 3],
        "ny": [4, 3],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [14, 13, 13, 14, 14],
        "py": [12, 10, 11, 13, 13],
        "pz": [0, 0, 0, 0, -1],
        "nx": [9, 8, 4, 5, 7],
        "ny": [4, 4, 2, 2, 4],
        "nz": [0, 0, 1, 1, 0]
      }, {
        "size": 3,
        "px": [2, 4, 1],
        "py": [2, 0, 0],
        "pz": [0, 0, 1],
        "nx": [0, 7, 4],
        "ny": [0, 3, 2],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [5, 0],
        "pz": [0, -1],
        "nx": [8, 6],
        "ny": [4, 9],
        "nz": [1, 1]
      }, {
        "size": 3,
        "px": [0, 0, 0],
        "py": [20, 2, 4],
        "pz": [0, -1, -1],
        "nx": [12, 3, 10],
        "ny": [3, 1, 3],
        "nz": [0, 2, 0]
      }, {
        "size": 5,
        "px": [5, 11, 10, 13, 13],
        "py": [0, 0, 0, 2, 2],
        "pz": [1, 0, 0, 0, -1],
        "nx": [4, 5, 5, 4, 5],
        "ny": [14, 0, 2, 6, 1],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 11],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [14, -1715597992],
        "py": [19, 9],
        "pz": [0, -1],
        "nx": [7, 14],
        "ny": [10, 17],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [9, 0],
        "pz": [0, -1],
        "nx": [1, 12],
        "ny": [2, 10],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [17, 9],
        "py": [13, 17],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [0, 7],
        "py": [1, 9],
        "pz": [1, -1],
        "nx": [18, 4],
        "ny": [14, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [14, 7],
        "py": [23, 9],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [5, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [8, 7],
        "py": [17, 9],
        "pz": [0, -1],
        "nx": [3, 2],
        "ny": [0, 3],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [20, 1],
        "pz": [0, -1],
        "nx": [5, 3],
        "ny": [21, 17],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [0, 0, 1],
        "py": [3, 6, 15],
        "pz": [2, 1, 0],
        "nx": [10, 8, 3],
        "ny": [6, 4, 2],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [18, 8],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [8, 10],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [2, 2],
        "pz": [1, 1],
        "nx": [8, 9],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [11, 5],
        "pz": [1, 2],
        "nx": [13, 3],
        "ny": [19, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 6],
        "py": [1, 11],
        "pz": [2, -1],
        "nx": [3, 2],
        "ny": [1, 0],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [9, 4],
        "py": [10, 5],
        "pz": [1, 2],
        "nx": [8, 4],
        "ny": [10, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [12, 12],
        "py": [11, 20],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [6, 10],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [7, 12],
        "py": [2, 20],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [2, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [0, 15],
        "py": [5, 21],
        "pz": [1, -1],
        "nx": [10, 9],
        "ny": [3, 3],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [15, 9],
        "py": [1, 0],
        "pz": [0, 1],
        "nx": [19, 3],
        "ny": [0, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [21, 5],
        "py": [13, 5],
        "pz": [0, 2],
        "nx": [23, 6],
        "ny": [23, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 8],
        "py": [3, 1],
        "pz": [2, -1],
        "nx": [9, 9],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [7, 7],
        "pz": [1, -1],
        "nx": [5, 3],
        "ny": [23, 17],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [11, 3],
        "py": [6, 4],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 3,
        "px": [14, 0, 17],
        "py": [20, 3, 21],
        "pz": [0, -1, -1],
        "nx": [11, 11, 11],
        "ny": [7, 9, 10],
        "nz": [1, 1, 1]
      }, {
        "size": 5,
        "px": [11, 11, 23, 23, 12],
        "py": [10, 11, 21, 20, 12],
        "pz": [1, 1, 0, 0, 0],
        "nx": [8, 3, 6, 7, 7],
        "ny": [4, 5, 11, 11, 11],
        "nz": [1, 2, 1, 1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [11, 10],
        "pz": [0, 0],
        "nx": [9, 3],
        "ny": [2, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [12, 14],
        "py": [19, 19],
        "pz": [0, 0],
        "nx": [12, 13],
        "ny": [18, 17],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [13, 14, 12, 15, 14],
        "py": [0, 0, 1, 1, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 8, 4, 7, 7],
        "ny": [3, 4, 2, 5, 5],
        "nz": [2, 1, 2, 1, -1]
      }, {
        "size": 2,
        "px": [17, 5],
        "py": [10, 2],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [2, 3],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [18, 10],
        "py": [6, 10],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [8, 18, 8, 4, 16],
        "py": [6, 12, 9, 4, 13],
        "pz": [1, 0, 1, 2, 0],
        "nx": [3, 4, 3, 5, 5],
        "ny": [0, 2, 3, 1, 1],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [2, 4],
        "pz": [2, 1],
        "nx": [8, 0],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [4, 5],
        "pz": [2, -1],
        "nx": [4, 2],
        "ny": [14, 7],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [3, 4, 4, 3],
        "py": [11, 12, 12, 2],
        "pz": [0, 0, -1, -1],
        "nx": [1, 2, 1, 2],
        "ny": [11, 14, 12, 16],
        "nz": [0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [6, 0],
        "py": [11, 0],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [4, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [21, 11],
        "pz": [0, 1],
        "nx": [3, 2],
        "ny": [10, 0],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [10, 3, 13],
        "py": [2, 0, 2],
        "pz": [0, 2, 0],
        "nx": [7, 16, 1],
        "ny": [10, 4, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [2, 5],
        "pz": [1, 0],
        "nx": [6, 18],
        "ny": [1, 19],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 16],
        "py": [0, 16],
        "pz": [1, -1],
        "nx": [11, 2],
        "ny": [5, 1],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [13, 1],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [22, 21],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [18, 18],
        "pz": [0, 0],
        "nx": [5, 8],
        "ny": [9, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [20, 18],
        "pz": [0, 0],
        "nx": [8, 3],
        "ny": [5, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [14, 2],
        "py": [17, 1],
        "pz": [0, -1],
        "nx": [14, 13],
        "ny": [15, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [2, 3],
        "pz": [2, 2],
        "nx": [8, 3],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [8, 18, 18, 8, 7],
        "py": [6, 11, 11, 7, 9],
        "pz": [1, 0, -1, -1, -1],
        "nx": [5, 13, 5, 11, 5],
        "ny": [3, 11, 0, 8, 2],
        "nz": [2, 0, 2, 1, 2]
      }, {
        "size": 5,
        "px": [12, 0, 5, 4, 7],
        "py": [15, 0, 4, 0, 9],
        "pz": [0, -1, -1, -1, -1],
        "nx": [8, 7, 4, 16, 6],
        "ny": [17, 12, 9, 10, 12],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [6, 7],
        "py": [14, 1],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [9, 4],
        "nz": [1, 1]
      }, {
        "size": 4,
        "px": [8, 0, 22, 4],
        "py": [4, 4, 23, 0],
        "pz": [0, -1, -1, -1],
        "nx": [2, 4, 2, 5],
        "ny": [0, 1, 2, 9],
        "nz": [2, 1, 2, 1]
      }, {
        "size": 5,
        "px": [9, 9, 10, 10, 8],
        "py": [0, 1, 1, 2, 0],
        "pz": [1, 1, 1, 1, 1],
        "nx": [4, 16, 16, 16, 6],
        "ny": [2, 11, 11, 11, 12],
        "nz": [2, 0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [6, 5],
        "pz": [1, 1],
        "nx": [0, 4],
        "ny": [3, 2],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [10, 3, 4],
        "py": [5, 9, 8],
        "pz": [1, -1, -1],
        "nx": [11, 23, 23],
        "ny": [7, 12, 11],
        "nz": [1, 0, 0]
      }, {
        "size": 3,
        "px": [13, 12, 7],
        "py": [19, 19, 10],
        "pz": [0, 0, 1],
        "nx": [13, 5, 19],
        "ny": [20, 15, 22],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [12, 12],
        "py": [12, 13],
        "pz": [0, 0],
        "nx": [9, 10],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 12],
        "py": [1, 13],
        "pz": [2, -1],
        "nx": [2, 7],
        "ny": [2, 13],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [8, 9],
        "pz": [1, 1],
        "nx": [19, 7],
        "ny": [23, 13],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [8, 7, 23, 15],
        "py": [11, 12, 4, 21],
        "pz": [0, 0, -1, -1],
        "nx": [2, 5, 1, 10],
        "ny": [6, 6, 2, 13],
        "nz": [0, 1, 1, 0]
      }, {
        "size": 2,
        "px": [10, 9],
        "py": [3, 3],
        "pz": [0, 0],
        "nx": [2, 3],
        "ny": [2, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [3, 4],
        "pz": [2, -1],
        "nx": [3, 6],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [7, 11],
        "py": [20, 16],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [5, 20],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [9, 7],
        "py": [7, 5],
        "pz": [1, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [11, 3],
        "pz": [1, 2],
        "nx": [5, 5],
        "ny": [3, 5],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [11, 3],
        "py": [11, 5],
        "pz": [1, -1],
        "nx": [4, 1],
        "ny": [12, 3],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [9, 11],
        "py": [6, 4],
        "pz": [1, -1],
        "nx": [10, 20],
        "ny": [9, 18],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [2, 2, 2, 2, 1],
        "py": [15, 13, 16, 14, 7],
        "pz": [0, 0, 0, 0, 1],
        "nx": [15, 8, 9, 8, 4],
        "ny": [11, 6, 5, 5, 4],
        "nz": [0, 1, 1, 1, -1]
      }, {
        "size": 2,
        "px": [12, 2],
        "py": [5, 5],
        "pz": [0, -1],
        "nx": [3, 2],
        "ny": [7, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [5, 11],
        "py": [1, 3],
        "pz": [2, 1],
        "nx": [10, 10],
        "ny": [3, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 11],
        "py": [13, 18],
        "pz": [0, -1],
        "nx": [6, 9],
        "ny": [9, 4],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [5, 1, 2, 5, 6],
        "py": [14, 4, 9, 15, 23],
        "pz": [0, 2, 1, 0, 0],
        "nx": [4, 9, 18, 16, 17],
        "ny": [0, 1, 1, 0, 0],
        "nz": [2, 1, 0, 0, 0]
      }, {
        "size": 2,
        "px": [16, 17],
        "py": [0, 0],
        "pz": [0, 0],
        "nx": [23, 23],
        "ny": [5, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 8],
        "py": [20, 6],
        "pz": [0, -1],
        "nx": [5, 6],
        "ny": [12, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [6, 15],
        "py": [15, 0],
        "pz": [0, -1],
        "nx": [6, 3],
        "ny": [16, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [18, 20],
        "py": [7, 8],
        "pz": [0, 0],
        "nx": [18, 11],
        "ny": [9, 14],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 4],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [3, 15],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 2],
        "pz": [1, 2],
        "nx": [5, 5],
        "ny": [2, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 20],
        "py": [1, 20],
        "pz": [1, -1],
        "nx": [15, 17],
        "ny": [1, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [16, 4],
        "pz": [0, 2],
        "nx": [4, 0],
        "ny": [10, 6],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 8],
        "py": [5, 0],
        "pz": [1, -1],
        "nx": [1, 1],
        "ny": [10, 18],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [22, 0],
        "py": [3, 0],
        "pz": [0, -1],
        "nx": [23, 11],
        "ny": [4, 1],
        "nz": [0, 1]
      }, {
        "size": 3,
        "px": [19, 10, 20],
        "py": [21, 8, 18],
        "pz": [0, 1, 0],
        "nx": [3, 6, 20],
        "ny": [5, 11, 14],
        "nz": [2, -1, -1]
      }, {
        "size": 4,
        "px": [2, 1, 6, 5],
        "py": [7, 4, 23, 22],
        "pz": [1, 2, 0, 0],
        "nx": [9, 19, 20, 4],
        "ny": [8, 11, 9, 2],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [2, 11],
        "pz": [2, 1],
        "nx": [12, 10],
        "ny": [21, 9],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [6, 0, 2, 2],
        "py": [6, 1, 4, 1],
        "pz": [1, -1, -1, -1],
        "nx": [0, 0, 0, 0],
        "ny": [5, 8, 9, 4],
        "nz": [1, 0, 0, 1]
      }, {
        "size": 5,
        "px": [3, 13, 6, 11, 9],
        "py": [0, 3, 1, 1, 2],
        "pz": [2, 0, 1, 0, 0],
        "nx": [7, 20, 16, 4, 7],
        "ny": [7, 2, 19, 2, 6],
        "nz": [1, 0, 0, 2, 1]
      }, {
        "size": 4,
        "px": [7, 5, 2, 6],
        "py": [7, 7, 4, 11],
        "pz": [0, 0, 2, 1],
        "nx": [7, 1, 21, 0],
        "ny": [8, 4, 11, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [3, 2],
        "pz": [2, 2],
        "nx": [8, 9],
        "ny": [3, 11],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 13],
        "py": [3, 5],
        "pz": [1, 0],
        "nx": [4, 3],
        "ny": [2, 2],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [3, 12, 13, 11],
        "py": [0, 1, 1, 1],
        "pz": [2, 0, 0, 0],
        "nx": [8, 9, 13, 0],
        "ny": [4, 1, 16, 3],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [10, 1],
        "py": [4, 14],
        "pz": [0, -1],
        "nx": [5, 10],
        "ny": [1, 2],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [11, 12],
        "py": [21, 21],
        "pz": [0, 0],
        "nx": [10, 11],
        "ny": [19, 19],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 12],
        "py": [6, 21],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [11, 7],
        "py": [19, 0],
        "pz": [0, -1],
        "nx": [6, 5],
        "ny": [9, 11],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [11, 11, 11, 10, 10],
        "py": [10, 12, 11, 13, 13],
        "pz": [0, 0, 0, 0, -1],
        "nx": [7, 13, 6, 12, 7],
        "ny": [10, 6, 3, 6, 11],
        "nz": [0, 0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [12, 11],
        "py": [6, 12],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [16, 15, 16, 15, 17],
        "py": [1, 0, 0, 1, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [13, 7, 6, 12, 12],
        "ny": [5, 4, 3, 6, 6],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [1, 3],
        "pz": [2, 1],
        "nx": [1, 5],
        "ny": [1, 3],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [13, 6],
        "pz": [0, 1],
        "nx": [4, 9],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 3],
        "py": [4, 3],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [3, 6],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [2, 1],
        "pz": [0, 1],
        "nx": [5, 5],
        "ny": [7, 21],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [19, 17],
        "ny": [1, 0],
        "nz": [0, 0]
      }, {
        "size": 4,
        "px": [8, 11, 5, 0],
        "py": [6, 1, 1, 22],
        "pz": [1, -1, -1, -1],
        "nx": [0, 10, 10, 1],
        "ny": [6, 12, 13, 4],
        "nz": [1, 0, 0, 1]
      }, {
        "size": 2,
        "px": [8, 17],
        "py": [6, 13],
        "pz": [1, 0],
        "nx": [14, 17],
        "ny": [9, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 8],
        "py": [0, 4],
        "pz": [2, -1],
        "nx": [9, 8],
        "ny": [1, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [11, 14],
        "py": [13, 9],
        "pz": [0, -1],
        "nx": [23, 23],
        "ny": [21, 19],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [10, 9],
        "py": [9, 3],
        "pz": [0, -1],
        "nx": [6, 3],
        "ny": [2, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [4, 4],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [5, 9],
        "py": [3, 3],
        "pz": [2, -1],
        "nx": [17, 9],
        "ny": [12, 5],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [9, 7],
        "py": [18, 16],
        "pz": [0, -1],
        "nx": [5, 2],
        "ny": [9, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [0, 1],
        "pz": [1, -1],
        "nx": [4, 5],
        "ny": [1, 0],
        "nz": [0, 0]
      }],
      "alpha": [-1.149973e+00, 1.149973e+00, -6.844773e-01, 6.844773e-01, -6.635048e-01, 6.635048e-01, -4.888349e-01, 4.888349e-01, -4.267976e-01, 4.267976e-01, -4.258100e-01, 4.258100e-01, -4.815853e-01, 4.815853e-01, -4.091859e-01, 4.091859e-01, -3.137414e-01, 3.137414e-01, -3.339860e-01, 3.339860e-01, -3.891196e-01, 3.891196e-01, -4.167691e-01, 4.167691e-01, -3.186609e-01, 3.186609e-01, -2.957171e-01, 2.957171e-01, -3.210062e-01, 3.210062e-01, -2.725684e-01, 2.725684e-01, -2.452176e-01, 2.452176e-01, -2.812662e-01, 2.812662e-01, -3.029622e-01, 3.029622e-01, -3.293745e-01, 3.293745e-01, -3.441536e-01, 3.441536e-01, -2.946918e-01, 2.946918e-01, -2.890545e-01, 2.890545e-01, -1.949205e-01, 1.949205e-01, -2.176102e-01, 2.176102e-01, -2.595190e-01, 2.595190e-01, -2.690931e-01, 2.690931e-01, -2.130294e-01, 2.130294e-01, -2.316308e-01, 2.316308e-01, -2.798562e-01, 2.798562e-01, -2.146988e-01, 2.146988e-01, -2.332089e-01, 2.332089e-01, -2.470614e-01, 2.470614e-01, -2.204300e-01, 2.204300e-01, -2.272045e-01, 2.272045e-01, -2.583686e-01, 2.583686e-01, -2.072299e-01, 2.072299e-01, -1.834971e-01, 1.834971e-01, -2.332656e-01, 2.332656e-01, -3.271297e-01, 3.271297e-01, -2.401937e-01, 2.401937e-01, -2.006316e-01, 2.006316e-01, -2.401947e-01, 2.401947e-01, -2.475346e-01, 2.475346e-01, -2.579532e-01, 2.579532e-01, -2.466235e-01, 2.466235e-01, -1.787582e-01, 1.787582e-01, -2.036892e-01, 2.036892e-01, -1.665028e-01, 1.665028e-01, -1.576510e-01, 1.576510e-01, -2.036997e-01, 2.036997e-01, -2.040734e-01, 2.040734e-01, -1.792532e-01, 1.792532e-01, -2.174767e-01, 2.174767e-01, -1.876948e-01, 1.876948e-01, -1.883137e-01, 1.883137e-01, -1.923872e-01, 1.923872e-01, -2.620218e-01, 2.620218e-01, -1.659873e-01, 1.659873e-01, -1.475948e-01, 1.475948e-01, -1.731607e-01, 1.731607e-01, -2.059256e-01, 2.059256e-01, -1.586309e-01, 1.586309e-01, -1.607668e-01, 1.607668e-01, -1.975101e-01, 1.975101e-01, -2.130745e-01, 2.130745e-01, -1.898872e-01, 1.898872e-01, -2.052598e-01, 2.052598e-01, -1.599397e-01, 1.599397e-01, -1.770134e-01, 1.770134e-01, -1.888249e-01, 1.888249e-01, -1.515406e-01, 1.515406e-01, -1.907771e-01, 1.907771e-01, -1.698406e-01, 1.698406e-01, -2.079535e-01, 2.079535e-01, -1.966967e-01, 1.966967e-01, -1.631391e-01, 1.631391e-01, -2.158666e-01, 2.158666e-01, -2.891774e-01, 2.891774e-01, -1.581556e-01, 1.581556e-01, -1.475359e-01, 1.475359e-01, -1.806169e-01, 1.806169e-01, -1.782238e-01, 1.782238e-01, -1.660440e-01, 1.660440e-01, -1.576919e-01, 1.576919e-01, -1.741775e-01, 1.741775e-01, -1.427265e-01, 1.427265e-01, -1.695880e-01, 1.695880e-01, -1.486712e-01, 1.486712e-01, -1.533565e-01, 1.533565e-01, -1.601464e-01, 1.601464e-01, -1.978414e-01, 1.978414e-01, -1.746566e-01, 1.746566e-01, -1.794736e-01, 1.794736e-01, -1.896567e-01, 1.896567e-01, -1.666197e-01, 1.666197e-01, -1.969351e-01, 1.969351e-01, -2.321735e-01, 2.321735e-01, -1.592485e-01, 1.592485e-01, -1.671464e-01, 1.671464e-01, -1.688885e-01, 1.688885e-01, -1.868042e-01, 1.868042e-01, -1.301138e-01, 1.301138e-01, -1.330094e-01, 1.330094e-01, -1.268423e-01, 1.268423e-01, -1.820868e-01, 1.820868e-01, -1.881020e-01, 1.881020e-01, -1.580814e-01, 1.580814e-01, -1.302653e-01, 1.302653e-01, -1.787262e-01, 1.787262e-01, -1.658453e-01, 1.658453e-01, -1.240772e-01, 1.240772e-01, -1.315621e-01, 1.315621e-01, -1.756341e-01, 1.756341e-01, -1.429438e-01, 1.429438e-01, -1.351775e-01, 1.351775e-01, -2.035692e-01, 2.035692e-01, -1.267670e-01, 1.267670e-01, -1.288470e-01, 1.288470e-01, -1.393648e-01, 1.393648e-01, -1.755962e-01, 1.755962e-01, -1.308445e-01, 1.308445e-01, -1.703894e-01, 1.703894e-01, -1.461334e-01, 1.461334e-01, -1.368683e-01, 1.368683e-01, -1.244085e-01, 1.244085e-01, -1.718163e-01, 1.718163e-01, -1.415624e-01, 1.415624e-01, -1.752024e-01, 1.752024e-01, -1.666463e-01, 1.666463e-01, -1.407325e-01, 1.407325e-01, -1.258317e-01, 1.258317e-01, -1.416511e-01, 1.416511e-01, -1.420816e-01, 1.420816e-01, -1.562547e-01, 1.562547e-01, -1.542952e-01, 1.542952e-01, -1.158829e-01, 1.158829e-01, -1.392875e-01, 1.392875e-01, -1.610095e-01, 1.610095e-01, -1.546440e-01, 1.546440e-01, -1.416235e-01, 1.416235e-01, -2.028817e-01, 2.028817e-01, -1.106779e-01, 1.106779e-01, -9.231660e-02, 9.231660e-02, -1.164460e-01, 1.164460e-01, -1.701578e-01, 1.701578e-01, -1.277995e-01, 1.277995e-01, -1.946177e-01, 1.946177e-01, -1.394509e-01, 1.394509e-01, -1.370145e-01, 1.370145e-01, -1.446031e-01, 1.446031e-01, -1.665215e-01, 1.665215e-01, -1.435822e-01, 1.435822e-01, -1.559354e-01, 1.559354e-01, -1.591860e-01, 1.591860e-01, -1.193338e-01, 1.193338e-01, -1.236954e-01, 1.236954e-01, -1.209139e-01, 1.209139e-01, -1.267385e-01, 1.267385e-01, -1.232397e-01, 1.232397e-01, -1.299632e-01, 1.299632e-01, -1.302020e-01, 1.302020e-01, -1.202975e-01, 1.202975e-01, -1.525378e-01, 1.525378e-01, -1.123073e-01, 1.123073e-01, -1.605678e-01, 1.605678e-01, -1.406867e-01, 1.406867e-01, -1.354273e-01, 1.354273e-01, -1.393192e-01, 1.393192e-01, -1.278263e-01, 1.278263e-01, -1.172073e-01, 1.172073e-01, -1.153493e-01, 1.153493e-01, -1.356318e-01, 1.356318e-01, -1.316614e-01, 1.316614e-01, -1.374489e-01, 1.374489e-01, -1.018254e-01, 1.018254e-01, -1.473336e-01, 1.473336e-01, -1.289687e-01, 1.289687e-01, -1.299183e-01, 1.299183e-01, -1.178391e-01, 1.178391e-01, -1.619059e-01, 1.619059e-01, -1.842569e-01, 1.842569e-01, -1.829095e-01, 1.829095e-01, -1.939918e-01, 1.939918e-01, -1.395362e-01, 1.395362e-01, -1.774673e-01, 1.774673e-01, -1.688216e-01, 1.688216e-01, -1.671747e-01, 1.671747e-01, -1.850178e-01, 1.850178e-01, -1.106695e-01, 1.106695e-01, -1.258323e-01, 1.258323e-01, -1.246819e-01, 1.246819e-01, -9.892193e-02, 9.892193e-02, -1.399638e-01, 1.399638e-01, -1.228375e-01, 1.228375e-01, -1.756236e-01, 1.756236e-01, -1.360307e-01, 1.360307e-01, -1.266574e-01, 1.266574e-01, -1.372135e-01, 1.372135e-01, -1.175947e-01, 1.175947e-01, -1.330075e-01, 1.330075e-01, -1.396152e-01, 1.396152e-01, -2.088443e-01, 2.088443e-01]
    }, {
      "count": 301,
      "threshold": -4.887516e+00,
      "feature": [{
        "size": 5,
        "px": [8, 11, 8, 14, 10],
        "py": [6, 9, 3, 3, 4],
        "pz": [1, 0, 0, 0, 0],
        "nx": [8, 7, 19, 7, 13],
        "ny": [11, 8, 8, 5, 8],
        "nz": [1, 1, 0, 1, 0]
      }, {
        "size": 5,
        "px": [14, 3, 13, 12, 12],
        "py": [4, 6, 4, 4, 8],
        "pz": [0, 1, 0, 0, 0],
        "nx": [2, 5, 2, 10, 10],
        "ny": [2, 8, 5, 8, 8],
        "nz": [2, 1, 2, 0, -1]
      }, {
        "size": 5,
        "px": [6, 5, 3, 7, 7],
        "py": [2, 3, 1, 2, 2],
        "pz": [0, 0, 1, 0, -1],
        "nx": [2, 2, 1, 2, 1],
        "ny": [3, 1, 2, 2, 2],
        "nz": [0, 0, 2, 0, 1]
      }, {
        "size": 5,
        "px": [3, 3, 6, 12, 8],
        "py": [4, 2, 4, 10, 17],
        "pz": [2, 2, 1, 0, 0],
        "nx": [4, 8, 8, 2, 1],
        "ny": [4, 4, 4, 2, 2],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [18, 19, 17, 9, 16],
        "py": [1, 2, 2, 0, 2],
        "pz": [0, 0, 0, 1, 0],
        "nx": [23, 23, 22, 22, 22],
        "ny": [4, 3, 1, 0, 2],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 3,
        "px": [15, 4, 14],
        "py": [23, 4, 18],
        "pz": [0, 2, 0],
        "nx": [7, 0, 5],
        "ny": [10, 4, 9],
        "nz": [1, -1, -1]
      }, {
        "size": 5,
        "px": [11, 11, 16, 11, 17],
        "py": [8, 6, 11, 7, 11],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 4, 14, 14, 1],
        "ny": [4, 4, 8, 8, 5],
        "nz": [1, 1, 0, -1, -1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 12, 12],
        "py": [13, 10, 11, 12, 12],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 4, 1, 2, 9],
        "ny": [8, 10, 2, 4, 15],
        "nz": [0, 1, 2, 1, 0]
      }, {
        "size": 2,
        "px": [19, 0],
        "py": [14, 17],
        "pz": [0, -1],
        "nx": [20, 19],
        "ny": [15, 22],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [3, 3, 1, 3, 5],
        "py": [13, 15, 6, 14, 22],
        "pz": [0, 0, 1, 0, 0],
        "nx": [0, 0, 1, 0, 0],
        "ny": [11, 21, 23, 5, 5],
        "nz": [1, 0, 0, 2, -1]
      }, {
        "size": 5,
        "px": [4, 2, 10, 4, 3],
        "py": [19, 4, 13, 16, 13],
        "pz": [0, 1, 0, 0, 0],
        "nx": [3, 20, 7, 4, 0],
        "ny": [4, 19, 5, 1, 5],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [4, 4],
        "pz": [0, -1],
        "nx": [15, 3],
        "ny": [15, 1],
        "nz": [0, 2]
      }, {
        "size": 4,
        "px": [17, 17, 12, 11],
        "py": [14, 15, 18, 18],
        "pz": [0, 0, 0, 0],
        "nx": [11, 4, 1, 0],
        "ny": [17, 20, 8, 5],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 5,
        "px": [6, 2, 1, 2, 11],
        "py": [14, 4, 1, 1, 18],
        "pz": [0, -1, -1, -1, -1],
        "nx": [5, 5, 3, 5, 2],
        "ny": [18, 17, 7, 9, 2],
        "nz": [0, 0, 1, 1, 2]
      }, {
        "size": 5,
        "px": [20, 19, 20, 15, 20],
        "py": [17, 20, 12, 12, 8],
        "pz": [0, 0, 0, 0, 0],
        "nx": [17, 0, 5, 2, 2],
        "ny": [8, 4, 9, 2, 2],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 8],
        "py": [7, 11],
        "pz": [1, -1],
        "nx": [7, 8],
        "ny": [7, 10],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [15, 16, 14, 8, 8],
        "py": [2, 2, 2, 0, 0],
        "pz": [0, 0, 0, 1, -1],
        "nx": [20, 11, 21, 18, 19],
        "ny": [3, 6, 5, 1, 2],
        "nz": [0, 1, 0, 0, 0]
      }, {
        "size": 4,
        "px": [17, 18, 9, 8],
        "py": [23, 21, 7, 8],
        "pz": [0, 0, 1, 1],
        "nx": [8, 17, 10, 18],
        "ny": [4, 12, 2, 1],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [2, 2, 9, 4, 8],
        "py": [7, 3, 12, 12, 23],
        "pz": [1, 1, 0, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [3, 1, 2, 4, 4],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 3,
        "px": [7, 8, 5],
        "py": [22, 23, 9],
        "pz": [0, 0, 1],
        "nx": [9, 4, 2],
        "ny": [21, 4, 0],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [7, 7],
        "pz": [1, -1],
        "nx": [3, 2],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [15, 11, 10, 3, 17],
        "py": [0, 1, 2, 3, 1],
        "pz": [0, 0, 0, 2, 0],
        "nx": [5, 8, 4, 3, 3],
        "ny": [9, 4, 7, 10, 10],
        "nz": [1, 1, 1, 1, -1]
      }, {
        "size": 3,
        "px": [22, 11, 22],
        "py": [12, 5, 14],
        "pz": [0, 1, 0],
        "nx": [23, 23, 3],
        "ny": [22, 23, 8],
        "nz": [0, 0, -1]
      }, {
        "size": 2,
        "px": [3, 11],
        "py": [7, 5],
        "pz": [1, -1],
        "nx": [8, 2],
        "ny": [14, 5],
        "nz": [0, 2]
      }, {
        "size": 4,
        "px": [17, 16, 2, 4],
        "py": [14, 13, 5, 0],
        "pz": [0, 0, -1, -1],
        "nx": [8, 9, 15, 8],
        "ny": [8, 9, 14, 7],
        "nz": [1, 1, 0, 1]
      }, {
        "size": 2,
        "px": [5, 16],
        "py": [6, 13],
        "pz": [1, -1],
        "nx": [2, 1],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [1, 0, 1, 2, 1],
        "py": [15, 2, 16, 19, 12],
        "pz": [0, 2, 0, 0, 0],
        "nx": [8, 7, 4, 9, 9],
        "ny": [5, 11, 4, 5, 5],
        "nz": [1, 1, 1, 1, -1]
      }, {
        "size": 2,
        "px": [8, 7],
        "py": [11, 12],
        "pz": [0, 0],
        "nx": [9, 1],
        "ny": [10, 16],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [15, 13],
        "py": [17, 10],
        "pz": [0, -1],
        "nx": [7, 4],
        "ny": [8, 4],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [11, 10, 7, 8, 9],
        "py": [0, 0, 1, 1, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 5, 4, 5, 6],
        "ny": [1, 0, 2, 1, 0],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [4, 3],
        "pz": [2, 2],
        "nx": [3, 21],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [10, 11, 5, 2, 11],
        "py": [12, 10, 6, 11, 11],
        "pz": [0, 0, 1, 0, 0],
        "nx": [4, 15, 16, 7, 7],
        "ny": [5, 10, 11, 10, 10],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [13, 14, 1, 11, 11],
        "py": [2, 2, 3, 2, 2],
        "pz": [0, 0, 2, 0, -1],
        "nx": [3, 0, 0, 1, 0],
        "ny": [23, 15, 14, 9, 8],
        "nz": [0, 0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [17, 2],
        "py": [13, 5],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [4, 1],
        "pz": [0, -1],
        "nx": [11, 3],
        "ny": [3, 0],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [3, 3],
        "pz": [2, -1],
        "nx": [11, 23],
        "ny": [8, 14],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [22, 22, 22],
        "py": [16, 18, 9],
        "pz": [0, 0, 0],
        "nx": [13, 2, 0],
        "ny": [17, 3, 5],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [13, 10, 13, 14, 11],
        "py": [2, 2, 1, 2, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [3, 3, 8, 6, 6],
        "ny": [2, 5, 4, 11, 11],
        "nz": [2, 2, 1, 1, -1]
      }, {
        "size": 3,
        "px": [12, 1, 1],
        "py": [14, 0, 1],
        "pz": [0, -1, -1],
        "nx": [8, 15, 7],
        "ny": [1, 2, 0],
        "nz": [1, 0, 1]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [20, 23],
        "pz": [0, 0],
        "nx": [3, 3],
        "ny": [10, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [7, 2],
        "pz": [1, -1],
        "nx": [4, 3],
        "ny": [23, 16],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [3, 3, 6],
        "py": [5, 2, 4],
        "pz": [2, 2, 1],
        "nx": [3, 1, 2],
        "ny": [5, 17, 0],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [14, 8],
        "py": [17, 6],
        "pz": [0, 1],
        "nx": [13, 10],
        "ny": [16, 9],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [15, 7, 14, 13, 14],
        "py": [1, 0, 0, 0, 1],
        "pz": [0, 1, 0, 0, 0],
        "nx": [4, 4, 4, 8, 8],
        "ny": [5, 3, 2, 10, 10],
        "nz": [2, 2, 2, 1, -1]
      }, {
        "size": 5,
        "px": [8, 9, 4, 5, 4],
        "py": [13, 12, 9, 5, 7],
        "pz": [0, 0, 1, 1, 1],
        "nx": [22, 21, 22, 22, 22],
        "ny": [4, 0, 3, 2, 2],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [17, 17],
        "py": [16, 13],
        "pz": [0, 0],
        "nx": [14, 21],
        "ny": [8, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 10],
        "py": [4, 9],
        "pz": [0, -1],
        "nx": [16, 10],
        "ny": [3, 3],
        "nz": [0, 1]
      }, {
        "size": 5,
        "px": [1, 1, 0, 1, 0],
        "py": [17, 16, 7, 15, 8],
        "pz": [0, 0, 1, 0, 0],
        "nx": [4, 3, 8, 9, 7],
        "ny": [3, 3, 6, 6, 6],
        "nz": [1, 1, 0, 0, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [2, 3],
        "pz": [2, 2],
        "nx": [8, 3],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 2],
        "py": [17, 4],
        "pz": [0, 2],
        "nx": [10, 12],
        "ny": [15, 14],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [14, 12],
        "pz": [0, 0],
        "nx": [9, 10],
        "ny": [13, 11],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [5, 5],
        "pz": [0, 0],
        "nx": [3, 4],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [7, 10, 8, 11, 11],
        "py": [13, 2, 12, 2, 2],
        "pz": [0, 0, 0, 0, -1],
        "nx": [10, 1, 1, 10, 1],
        "ny": [12, 5, 3, 13, 1],
        "nz": [0, 1, 1, 0, 2]
      }, {
        "size": 2,
        "px": [6, 10],
        "py": [4, 2],
        "pz": [1, -1],
        "nx": [4, 6],
        "ny": [4, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [20, 20],
        "py": [21, 22],
        "pz": [0, 0],
        "nx": [15, 8],
        "ny": [5, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [3, 3],
        "pz": [2, 2],
        "nx": [9, 17],
        "ny": [4, 15],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [2, 2, 4],
        "py": [3, 3, 7],
        "pz": [2, -1, -1],
        "nx": [7, 4, 4],
        "ny": [6, 5, 4],
        "nz": [1, 2, 2]
      }, {
        "size": 5,
        "px": [8, 9, 16, 17, 17],
        "py": [1, 2, 1, 1, 1],
        "pz": [1, 1, 0, 0, -1],
        "nx": [2, 2, 4, 2, 4],
        "ny": [16, 14, 22, 15, 21],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [18, 0],
        "pz": [0, -1],
        "nx": [2, 5],
        "ny": [5, 8],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [7, 8],
        "py": [11, 11],
        "pz": [0, 0],
        "nx": [15, 5],
        "ny": [8, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 3],
        "py": [4, 3],
        "pz": [2, -1],
        "nx": [1, 6],
        "ny": [4, 14],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [7, 11],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [7, 12],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [3, 7],
        "py": [10, 22],
        "pz": [1, 0],
        "nx": [4, 3],
        "ny": [10, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 19],
        "py": [4, 21],
        "pz": [2, -1],
        "nx": [11, 11],
        "ny": [8, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [4, 20],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [11, 23, 23, 23, 23],
        "py": [7, 13, 19, 20, 21],
        "pz": [1, 0, 0, 0, 0],
        "nx": [4, 3, 2, 8, 8],
        "ny": [11, 5, 5, 23, 23],
        "nz": [1, 1, 2, 0, -1]
      }, {
        "size": 2,
        "px": [4, 1],
        "py": [0, 2],
        "pz": [0, 0],
        "nx": [0, 6],
        "ny": [0, 11],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 8],
        "py": [12, 1],
        "pz": [0, -1],
        "nx": [23, 23],
        "ny": [13, 12],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [23, 11, 23, 11, 11],
        "py": [13, 7, 12, 5, 6],
        "pz": [0, 1, 0, 1, 1],
        "nx": [6, 3, 8, 7, 7],
        "ny": [12, 4, 4, 11, 11],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 2,
        "px": [20, 5],
        "py": [15, 5],
        "pz": [0, -1],
        "nx": [10, 10],
        "ny": [11, 10],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [19, 8],
        "pz": [0, 1],
        "nx": [11, 19],
        "ny": [18, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [14, 6],
        "py": [3, 4],
        "pz": [0, -1],
        "nx": [8, 15],
        "ny": [1, 0],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [14, 5, 13, 12],
        "py": [23, 3, 23, 23],
        "pz": [0, 1, 0, 0],
        "nx": [12, 0, 1, 4],
        "ny": [21, 3, 2, 4],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [19, 5],
        "py": [12, 2],
        "pz": [0, -1],
        "nx": [4, 7],
        "ny": [3, 5],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [0, 8],
        "py": [5, 3],
        "pz": [2, -1],
        "nx": [5, 22],
        "ny": [3, 11],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [2, 6],
        "py": [3, 12],
        "pz": [2, 0],
        "nx": [3, 5],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [0, 6],
        "pz": [2, -1],
        "nx": [14, 6],
        "ny": [4, 2],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [16, 11],
        "py": [1, 0],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [4, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [9, 4],
        "py": [4, 3],
        "pz": [1, 1],
        "nx": [5, 8],
        "ny": [0, 10],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [16, 1],
        "py": [22, 1],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [4, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [12, 2],
        "py": [11, 2],
        "pz": [0, -1],
        "nx": [5, 5],
        "ny": [1, 0],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [4, 3],
        "pz": [1, 1],
        "nx": [7, 5],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [22, 3],
        "pz": [0, 2],
        "nx": [4, 9],
        "ny": [10, 11],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [8, 10],
        "pz": [1, -1],
        "nx": [5, 3],
        "ny": [23, 18],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [21, 9],
        "pz": [0, -1],
        "nx": [11, 23],
        "ny": [6, 10],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [18, 8],
        "ny": [18, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [19, 0],
        "pz": [0, -1],
        "nx": [6, 5],
        "ny": [9, 11],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [2, 10, 9, 7, 8],
        "py": [0, 1, 0, 1, 0],
        "pz": [2, 0, 0, 0, 0],
        "nx": [3, 4, 6, 8, 8],
        "ny": [2, 4, 9, 4, 4],
        "nz": [2, 1, 1, 1, -1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [9, 4],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 4],
        "py": [23, 3],
        "pz": [0, -1],
        "nx": [12, 9],
        "ny": [2, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [10, 3],
        "pz": [1, 2],
        "nx": [0, 2],
        "ny": [23, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 14],
        "py": [18, 0],
        "pz": [0, -1],
        "nx": [12, 8],
        "ny": [16, 10],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [10, 18, 7, 5],
        "py": [14, 8, 0, 3],
        "pz": [0, -1, -1, -1],
        "nx": [8, 6, 8, 5],
        "ny": [11, 12, 5, 5],
        "nz": [0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [2, 2],
        "pz": [1, 1],
        "nx": [8, 8],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [12, 10],
        "py": [20, 20],
        "pz": [0, 0],
        "nx": [11, 10],
        "ny": [19, 19],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [17, 10],
        "py": [16, 20],
        "pz": [0, -1],
        "nx": [8, 7],
        "ny": [4, 8],
        "nz": [1, 1]
      }, {
        "size": 3,
        "px": [2, 1, 3],
        "py": [20, 4, 21],
        "pz": [0, 2, 0],
        "nx": [3, 4, 0],
        "ny": [10, 1, 0],
        "nz": [1, -1, -1]
      }, {
        "size": 5,
        "px": [6, 7, 3, 6, 6],
        "py": [15, 14, 7, 16, 19],
        "pz": [0, 0, 1, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [18, 19, 16, 17, 17],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [8, 16],
        "py": [6, 12],
        "pz": [1, 0],
        "nx": [8, 15],
        "ny": [4, 10],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [1, 3, 2, 0, 4],
        "pz": [2, 2, 2, 2, 1],
        "nx": [13, 8, 14, 4, 7],
        "ny": [23, 6, 23, 3, 9],
        "nz": [0, 1, 0, 2, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [3, 5],
        "pz": [2, 1],
        "nx": [10, 8],
        "ny": [11, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [8, 5],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [15, 18, 9, 16, 4],
        "py": [12, 13, 6, 23, 3],
        "pz": [0, 0, 1, 0, 2],
        "nx": [6, 3, 6, 2, 7],
        "ny": [2, 3, 0, 1, 0],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [4, 18],
        "py": [12, 13],
        "pz": [0, -1],
        "nx": [2, 8],
        "ny": [3, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [10, 4],
        "pz": [1, 2],
        "nx": [3, 3],
        "ny": [5, 0],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [9, 19],
        "py": [7, 8],
        "pz": [1, 0],
        "nx": [8, 3],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 0],
        "py": [6, 0],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [7, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [17, 18],
        "ny": [0, 2],
        "nz": [0, 0]
      }, {
        "size": 4,
        "px": [13, 4, 4, 1],
        "py": [14, 7, 3, 5],
        "pz": [0, -1, -1, -1],
        "nx": [3, 16, 3, 7],
        "ny": [1, 15, 5, 13],
        "nz": [2, 0, 2, 0]
      }, {
        "size": 2,
        "px": [4, 9],
        "py": [6, 11],
        "pz": [1, 0],
        "nx": [3, 23],
        "ny": [4, 8],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [9, 17, 4, 16, 16],
        "py": [2, 3, 1, 3, 3],
        "pz": [1, 0, 2, 0, -1],
        "nx": [2, 3, 3, 2, 3],
        "ny": [1, 7, 2, 3, 3],
        "nz": [2, 1, 1, 1, 1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [22, 9],
        "pz": [0, 1],
        "nx": [10, 3],
        "ny": [21, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [6, 3],
        "pz": [0, -1],
        "nx": [8, 5],
        "ny": [4, 3],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [8, 3],
        "pz": [0, -1],
        "nx": [14, 5],
        "ny": [14, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [7, 8],
        "py": [3, 2],
        "pz": [0, -1],
        "nx": [8, 2],
        "ny": [18, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [19, 11],
        "pz": [0, 1],
        "nx": [9, 4],
        "ny": [5, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 3],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [7, 15, 13, 14, 4],
        "py": [6, 12, 9, 11, 4],
        "pz": [1, 0, 0, 0, 2],
        "nx": [7, 3, 8, 4, 5],
        "ny": [0, 3, 0, 2, 1],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [10, 13, 7, 8, 9],
        "py": [0, 1, 1, 0, 1],
        "pz": [0, 0, 0, 0, 0],
        "nx": [7, 4, 4, 4, 8],
        "ny": [8, 3, 4, 2, 4],
        "nz": [1, 2, 2, 2, 1]
      }, {
        "size": 2,
        "px": [6, 1],
        "py": [6, 0],
        "pz": [1, -1],
        "nx": [11, 7],
        "ny": [3, 2],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [13, 0],
        "py": [13, 2],
        "pz": [0, -1],
        "nx": [0, 1],
        "ny": [13, 16],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 17],
        "py": [6, 13],
        "pz": [1, 0],
        "nx": [8, 1],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [12, 11, 3, 6, 17],
        "py": [4, 4, 1, 2, 14],
        "pz": [0, 0, 2, 1, 0],
        "nx": [6, 23, 23, 6, 23],
        "ny": [5, 7, 6, 6, 14],
        "nz": [1, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [5, 22],
        "py": [4, 17],
        "pz": [2, -1],
        "nx": [4, 8],
        "ny": [5, 7],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [15, 14],
        "py": [1, 1],
        "pz": [0, 0],
        "nx": [4, 7],
        "ny": [2, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [15, 17],
        "py": [12, 7],
        "pz": [0, -1],
        "nx": [14, 10],
        "ny": [11, 4],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [10, 2, 9, 15],
        "py": [5, 11, 1, 13],
        "pz": [0, -1, -1, -1],
        "nx": [11, 3, 3, 13],
        "ny": [1, 1, 0, 1],
        "nz": [0, 2, 2, 0]
      }, {
        "size": 2,
        "px": [7, 21],
        "py": [15, 22],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [8, 14],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [21, 2],
        "pz": [0, -1],
        "nx": [3, 5],
        "ny": [11, 21],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [17, 7],
        "py": [2, 0],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [5, 11],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [11, 8],
        "py": [10, 4],
        "pz": [0, -1],
        "nx": [13, 12],
        "ny": [3, 3],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [2, 2],
        "pz": [1, 1],
        "nx": [7, 1],
        "ny": [8, 2],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [0, 0, 1, 0, 0],
        "py": [12, 4, 14, 0, 2],
        "pz": [0, 1, 0, 2, 2],
        "nx": [9, 5, 8, 4, 4],
        "ny": [6, 3, 6, 3, 3],
        "nz": [0, 1, 0, 1, -1]
      }, {
        "size": 5,
        "px": [8, 0, 0, 3, 2],
        "py": [6, 5, 0, 8, 2],
        "pz": [1, -1, -1, -1, -1],
        "nx": [23, 7, 22, 11, 4],
        "ny": [12, 6, 14, 4, 3],
        "nz": [0, 1, 0, 1, 2]
      }, {
        "size": 4,
        "px": [12, 12, 4, 8],
        "py": [12, 11, 3, 10],
        "pz": [0, 0, -1, -1],
        "nx": [0, 0, 0, 0],
        "ny": [2, 1, 0, 3],
        "nz": [1, 2, 2, 1]
      }, {
        "size": 2,
        "px": [10, 6],
        "py": [7, 6],
        "pz": [1, -1],
        "nx": [16, 4],
        "ny": [12, 2],
        "nz": [0, 2]
      }, {
        "size": 5,
        "px": [2, 1, 3, 3, 3],
        "py": [14, 8, 20, 21, 21],
        "pz": [0, 1, 0, 0, -1],
        "nx": [20, 10, 21, 21, 21],
        "ny": [23, 11, 21, 23, 20],
        "nz": [0, 1, 0, 0, 0]
      }, {
        "size": 2,
        "px": [6, 13],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [7, 21],
        "ny": [8, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 3],
        "py": [17, 4],
        "pz": [0, 2],
        "nx": [11, 10],
        "ny": [15, 7],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [11, 0, 19, 2],
        "py": [15, 2, 23, 10],
        "pz": [0, -1, -1, -1],
        "nx": [6, 8, 16, 2],
        "ny": [13, 11, 10, 2],
        "nz": [0, 0, 0, 2]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [14, 7],
        "pz": [0, 1],
        "nx": [3, 1],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [12, 17, 5, 10],
        "py": [19, 15, 14, 3],
        "pz": [0, -1, -1, -1],
        "nx": [4, 12, 6, 12],
        "ny": [4, 18, 9, 22],
        "nz": [1, 0, 1, 0]
      }, {
        "size": 2,
        "px": [8, 3],
        "py": [13, 5],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [4, 9],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [6, 5, 4, 5, 3],
        "py": [2, 1, 2, 2, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [7, 4, 9, 18, 18],
        "ny": [4, 4, 7, 14, 14],
        "nz": [1, 1, 1, 0, -1]
      }, {
        "size": 4,
        "px": [8, 3, 20, 1],
        "py": [6, 3, 18, 0],
        "pz": [1, -1, -1, -1],
        "nx": [13, 11, 5, 22],
        "ny": [12, 6, 2, 17],
        "nz": [0, 1, 2, 0]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [8, 5],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [21, 7],
        "py": [14, 7],
        "pz": [0, 1],
        "nx": [16, 11],
        "ny": [14, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [3, 1],
        "pz": [0, -1],
        "nx": [9, 5],
        "ny": [0, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [4, 10],
        "py": [5, 8],
        "pz": [2, 1],
        "nx": [5, 14],
        "ny": [9, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [23, 4],
        "pz": [0, 2],
        "nx": [2, 2],
        "ny": [5, 5],
        "nz": [2, -1]
      }, {
        "size": 5,
        "px": [10, 9, 11, 10, 10],
        "py": [2, 2, 1, 1, 1],
        "pz": [0, 0, 0, 0, -1],
        "nx": [2, 3, 2, 4, 5],
        "ny": [4, 10, 2, 4, 3],
        "nz": [2, 1, 1, 0, 0]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [17, 5],
        "py": [15, 1],
        "pz": [0, -1],
        "nx": [20, 19],
        "ny": [14, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [20, 18],
        "pz": [0, 0],
        "nx": [2, 1],
        "ny": [23, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 1],
        "py": [18, 3],
        "pz": [0, 2],
        "nx": [11, 3],
        "ny": [16, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 8],
        "py": [6, 10],
        "pz": [1, 0],
        "nx": [9, 0],
        "ny": [9, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [20, 10],
        "py": [21, 7],
        "pz": [0, 1],
        "nx": [7, 2],
        "ny": [3, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 6],
        "py": [4, 7],
        "pz": [1, -1],
        "nx": [23, 5],
        "ny": [9, 2],
        "nz": [0, 2]
      }, {
        "size": 5,
        "px": [2, 4, 5, 3, 4],
        "py": [0, 1, 1, 2, 2],
        "pz": [1, 0, 0, 0, 0],
        "nx": [1, 0, 1, 1, 1],
        "ny": [2, 1, 0, 1, 1],
        "nz": [0, 1, 0, 0, -1]
      }, {
        "size": 2,
        "px": [8, 16],
        "py": [7, 13],
        "pz": [1, 0],
        "nx": [8, 3],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 15],
        "py": [7, 19],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [11, 5],
        "pz": [1, 2],
        "nx": [7, 8],
        "ny": [9, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [23, 11],
        "py": [9, 6],
        "pz": [0, 1],
        "nx": [22, 22],
        "ny": [23, 23],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [23, 23],
        "py": [21, 20],
        "pz": [0, 0],
        "nx": [2, 2],
        "ny": [5, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 4],
        "py": [12, 2],
        "pz": [0, -1],
        "nx": [9, 8],
        "ny": [4, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 14],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [7, 18],
        "ny": [1, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [20, 22],
        "py": [1, 2],
        "pz": [0, 0],
        "nx": [23, 23],
        "ny": [1, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 1],
        "py": [9, 10],
        "pz": [1, 1],
        "nx": [8, 0],
        "ny": [15, 0],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [11, 11, 6],
        "py": [10, 11, 11],
        "pz": [0, 0, -1],
        "nx": [23, 23, 23],
        "ny": [19, 21, 20],
        "nz": [0, 0, 0]
      }, {
        "size": 5,
        "px": [23, 23, 23, 6, 6],
        "py": [21, 22, 22, 3, 6],
        "pz": [0, 0, -1, -1, -1],
        "nx": [8, 8, 8, 17, 4],
        "ny": [7, 10, 8, 16, 5],
        "nz": [1, 1, 1, 0, 2]
      }, {
        "size": 2,
        "px": [10, 23],
        "py": [1, 22],
        "pz": [0, -1],
        "nx": [7, 2],
        "ny": [11, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [7, 14],
        "py": [3, 10],
        "pz": [1, -1],
        "nx": [5, 3],
        "ny": [2, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [13, 7],
        "pz": [0, 1],
        "nx": [4, 10],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [15, 6],
        "pz": [0, -1],
        "nx": [3, 6],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [18, 17],
        "pz": [0, -1],
        "nx": [7, 6],
        "ny": [10, 7],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [12, 11],
        "py": [3, 8],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [17, 4],
        "py": [5, 7],
        "pz": [0, 1],
        "nx": [17, 10],
        "ny": [4, 0],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [16, 8, 16, 15, 15],
        "py": [0, 0, 1, 0, 1],
        "pz": [0, 1, 0, 0, 0],
        "nx": [7, 4, 7, 4, 4],
        "ny": [7, 5, 8, 1, 1],
        "nz": [1, 2, 1, 2, -1]
      }, {
        "size": 2,
        "px": [13, 11],
        "py": [5, 6],
        "pz": [0, -1],
        "nx": [4, 5],
        "ny": [2, 2],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [8, 4],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 16],
        "py": [8, 10],
        "pz": [0, 0],
        "nx": [7, 2],
        "ny": [3, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 8],
        "py": [4, 11],
        "pz": [1, 0],
        "nx": [10, 1],
        "ny": [9, 20],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 1],
        "py": [4, 2],
        "pz": [2, -1],
        "nx": [23, 23],
        "ny": [15, 16],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [9, 8, 2, 4, 9],
        "py": [1, 1, 0, 1, 2],
        "pz": [0, 0, 2, 1, 0],
        "nx": [8, 3, 8, 4, 4],
        "ny": [6, 2, 4, 2, 2],
        "nz": [1, 2, 1, 2, -1]
      }, {
        "size": 2,
        "px": [13, 6],
        "py": [10, 5],
        "pz": [0, -1],
        "nx": [13, 7],
        "ny": [6, 3],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [10, 5],
        "pz": [1, 2],
        "nx": [10, 8],
        "ny": [10, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [9, 14],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [5, 2, 15],
        "py": [3, 1, 22],
        "pz": [1, -1, -1],
        "nx": [15, 9, 4],
        "ny": [0, 1, 0],
        "nz": [0, 1, 2]
      }, {
        "size": 2,
        "px": [10, 19],
        "py": [9, 21],
        "pz": [1, 0],
        "nx": [2, 17],
        "ny": [5, 14],
        "nz": [2, -1]
      }, {
        "size": 3,
        "px": [16, 2, 1],
        "py": [2, 10, 4],
        "pz": [0, -1, -1],
        "nx": [4, 4, 9],
        "ny": [3, 2, 6],
        "nz": [2, 2, 1]
      }, {
        "size": 2,
        "px": [10, 2],
        "py": [6, 10],
        "pz": [1, -1],
        "nx": [21, 22],
        "ny": [16, 12],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [7, 16],
        "py": [4, 23],
        "pz": [0, -1],
        "nx": [7, 3],
        "ny": [3, 3],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [13, 14],
        "pz": [0, 0],
        "nx": [1, 2],
        "ny": [18, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [18, 5],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [4, 13],
        "ny": [2, 11],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [18, 17],
        "py": [3, 3],
        "pz": [0, 0],
        "nx": [19, 19],
        "ny": [1, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [0, 5],
        "pz": [1, -1],
        "nx": [12, 3],
        "ny": [5, 1],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [2, 1],
        "pz": [1, 2],
        "nx": [18, 4],
        "ny": [4, 1],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [13, 13, 2, 10, 15],
        "py": [11, 12, 13, 17, 23],
        "pz": [0, -1, -1, -1, -1],
        "nx": [12, 13, 4, 3, 8],
        "ny": [4, 4, 1, 0, 3],
        "nz": [0, 0, 2, 2, 1]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [2, 2],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [7, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [5, 1],
        "pz": [0, -1],
        "nx": [18, 4],
        "ny": [12, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [19, 4],
        "py": [11, 1],
        "pz": [0, -1],
        "nx": [4, 7],
        "ny": [2, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [3, 2],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [4, 0],
        "py": [7, 7],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [0, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 9],
        "py": [0, 2],
        "pz": [2, 1],
        "nx": [6, 4],
        "ny": [3, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [9, 4],
        "pz": [1, 2],
        "nx": [13, 5],
        "ny": [18, 2],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [5, 23, 23],
        "py": [2, 8, 7],
        "pz": [2, 0, 0],
        "nx": [10, 12, 1],
        "ny": [4, 1, 0],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [13, 0],
        "py": [3, 3],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [2, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [10, 5],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [4, 11],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [11, 2],
        "py": [14, 11],
        "pz": [0, -1],
        "nx": [10, 11],
        "ny": [4, 13],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [21, 23],
        "pz": [0, 0],
        "nx": [7, 0],
        "ny": [21, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [8, 5],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 6],
        "py": [8, 8],
        "pz": [0, 0],
        "nx": [6, 14],
        "ny": [9, 15],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 6],
        "py": [4, 8],
        "pz": [0, -1],
        "nx": [16, 8],
        "ny": [0, 1],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [3, 6, 0, 9],
        "py": [0, 8, 5, 23],
        "pz": [1, -1, -1, -1],
        "nx": [12, 2, 6, 10],
        "ny": [5, 0, 3, 5],
        "nz": [0, 2, 1, 0]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 13],
        "pz": [1, 0],
        "nx": [3, 9],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 5],
        "py": [8, 23],
        "pz": [1, 0],
        "nx": [8, 9],
        "ny": [15, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 18],
        "py": [8, 0],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [9, 8],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [2, 7],
        "py": [4, 21],
        "pz": [2, 0],
        "nx": [13, 11],
        "ny": [8, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [8, 8],
        "pz": [0, 0],
        "nx": [6, 1],
        "ny": [8, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 3],
        "py": [20, 7],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [10, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [8, 7],
        "pz": [1, -1],
        "nx": [1, 2],
        "ny": [4, 9],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [5, 10],
        "py": [5, 13],
        "pz": [1, -1],
        "nx": [3, 6],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [6, 3],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [4, 4],
        "pz": [1, -1],
        "nx": [5, 11],
        "ny": [2, 5],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [11, 23, 11, 23, 11],
        "py": [4, 9, 5, 10, 6],
        "pz": [1, 0, 1, 0, 1],
        "nx": [7, 14, 13, 7, 3],
        "ny": [9, 5, 6, 4, 4],
        "nz": [0, 0, 0, 1, -1]
      }, {
        "size": 2,
        "px": [8, 5],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [9, 20],
        "ny": [1, 4],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [19, 20],
        "py": [0, 3],
        "pz": [0, 0],
        "nx": [4, 6],
        "ny": [11, 3],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [13, 5, 20, 5],
        "py": [14, 3, 23, 4],
        "pz": [0, -1, -1, -1],
        "nx": [8, 15, 7, 16],
        "ny": [8, 14, 6, 15],
        "nz": [1, 0, 1, 0]
      }, {
        "size": 2,
        "px": [10, 20],
        "py": [5, 17],
        "pz": [0, -1],
        "nx": [7, 3],
        "ny": [10, 1],
        "nz": [0, 2]
      }, {
        "size": 3,
        "px": [1, 12, 7],
        "py": [3, 7, 10],
        "pz": [2, 0, 0],
        "nx": [2, 2, 3],
        "ny": [3, 2, 2],
        "nz": [1, -1, -1]
      }, {
        "size": 3,
        "px": [10, 5, 7],
        "py": [7, 10, 10],
        "pz": [1, -1, -1],
        "nx": [10, 10, 18],
        "ny": [10, 9, 23],
        "nz": [1, 1, 0]
      }, {
        "size": 3,
        "px": [14, 14, 4],
        "py": [3, 3, 4],
        "pz": [0, -1, -1],
        "nx": [4, 4, 8],
        "ny": [3, 2, 6],
        "nz": [2, 2, 1]
      }, {
        "size": 2,
        "px": [4, 12],
        "py": [4, 17],
        "pz": [2, 0],
        "nx": [13, 1],
        "ny": [15, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 20],
        "py": [9, 22],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [2, 0],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [11, 2],
        "py": [3, 6],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 3,
        "px": [15, 10, 1],
        "py": [12, 2, 3],
        "pz": [0, -1, -1],
        "nx": [7, 5, 10],
        "ny": [2, 1, 1],
        "nz": [0, 1, 0]
      }, {
        "size": 5,
        "px": [9, 11, 10, 12, 12],
        "py": [0, 0, 0, 0, 0],
        "pz": [0, 0, 0, 0, -1],
        "nx": [8, 4, 16, 5, 10],
        "ny": [4, 4, 10, 3, 6],
        "nz": [1, 1, 0, 1, 0]
      }, {
        "size": 2,
        "px": [0, 10],
        "py": [3, 5],
        "pz": [2, -1],
        "nx": [3, 6],
        "ny": [0, 1],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [7, 8, 7, 2, 12],
        "py": [14, 13, 13, 16, 0],
        "pz": [0, 0, -1, -1, -1],
        "nx": [10, 1, 10, 1, 1],
        "ny": [13, 2, 12, 4, 9],
        "nz": [0, 2, 0, 1, 0]
      }, {
        "size": 3,
        "px": [6, 14, 13],
        "py": [1, 2, 1],
        "pz": [1, 0, 0],
        "nx": [8, 21, 10],
        "ny": [4, 23, 12],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [19, 19],
        "py": [22, 21],
        "pz": [0, 0],
        "nx": [20, 1],
        "ny": [22, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 12],
        "py": [19, 22],
        "pz": [0, -1],
        "nx": [2, 3],
        "ny": [0, 1],
        "nz": [2, 1]
      }, {
        "size": 4,
        "px": [11, 9, 21, 4],
        "py": [13, 3, 19, 5],
        "pz": [0, -1, -1, -1],
        "nx": [9, 9, 9, 5],
        "ny": [13, 14, 12, 6],
        "nz": [0, 0, 0, 1]
      }, {
        "size": 4,
        "px": [11, 12, 13, 14],
        "py": [22, 22, 22, 22],
        "pz": [0, 0, 0, 0],
        "nx": [13, 2, 4, 5],
        "ny": [20, 0, 0, 6],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [3, 1],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [0, 1],
        "pz": [2, 2],
        "nx": [9, 4],
        "ny": [6, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 0],
        "py": [10, 1],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [3, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [3, 1],
        "pz": [1, 2],
        "nx": [12, 18],
        "ny": [17, 4],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [2, 3, 4],
        "py": [4, 3, 9],
        "pz": [2, 2, 1],
        "nx": [0, 3, 17],
        "ny": [0, 1, 18],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [7, 3],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [5, 1],
        "ny": [11, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 17],
        "py": [20, 6],
        "pz": [0, -1],
        "nx": [5, 2],
        "ny": [9, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [8, 11],
        "py": [18, 2],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [9, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [16, 15],
        "py": [2, 2],
        "pz": [0, 0],
        "nx": [17, 12],
        "ny": [2, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [18, 4],
        "py": [5, 5],
        "pz": [0, -1],
        "nx": [7, 5],
        "ny": [23, 19],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [23, 23],
        "pz": [0, 0],
        "nx": [7, 11],
        "ny": [10, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 10],
        "py": [3, 18],
        "pz": [2, -1],
        "nx": [9, 9],
        "ny": [5, 6],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [5, 10],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [4, 23],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [8, 1],
        "pz": [1, -1],
        "nx": [15, 12],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [3, 10],
        "pz": [2, 1],
        "nx": [10, 1],
        "ny": [20, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [10, 11],
        "pz": [0, 0],
        "nx": [22, 3],
        "ny": [5, 4],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [8, 17, 17, 9, 18],
        "py": [0, 1, 0, 1, 0],
        "pz": [1, 0, 0, 1, 0],
        "nx": [11, 8, 9, 4, 4],
        "ny": [23, 4, 6, 2, 2],
        "nz": [0, 1, 0, 2, -1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [4, 4],
        "pz": [1, -1],
        "nx": [13, 4],
        "ny": [9, 2],
        "nz": [0, 2]
      }, {
        "size": 5,
        "px": [9, 4, 8, 7, 7],
        "py": [3, 1, 3, 3, 3],
        "pz": [0, 1, 0, 0, -1],
        "nx": [4, 2, 5, 3, 2],
        "ny": [1, 15, 1, 4, 13],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [17, 7],
        "py": [13, 7],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [1, 2],
        "py": [1, 12],
        "pz": [2, 0],
        "nx": [9, 21],
        "ny": [5, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 0],
        "py": [14, 1],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [19, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [16, 1],
        "py": [5, 9],
        "pz": [0, -1],
        "nx": [16, 15],
        "ny": [3, 3],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [8, 4],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 6],
        "py": [17, 15],
        "pz": [0, 0],
        "nx": [11, 0],
        "ny": [16, 4],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [12, 11, 0, 3],
        "py": [16, 8, 7, 1],
        "pz": [0, -1, -1, -1],
        "nx": [10, 5, 10, 5],
        "ny": [11, 9, 10, 8],
        "nz": [0, 1, 0, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 13],
        "pz": [1, 0],
        "nx": [4, 14],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 17],
        "py": [6, 13],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [4, 9],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [15, 11],
        "py": [3, 2],
        "pz": [0, -1],
        "nx": [4, 15],
        "ny": [1, 2],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [10, 11],
        "py": [18, 4],
        "pz": [0, -1],
        "nx": [5, 5],
        "ny": [8, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [7, 4],
        "pz": [1, 2],
        "nx": [4, 3],
        "ny": [5, 7],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [12, 4],
        "py": [15, 4],
        "pz": [0, -1],
        "nx": [11, 8],
        "ny": [14, 19],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [18, 13],
        "py": [13, 20],
        "pz": [0, 0],
        "nx": [13, 4],
        "ny": [18, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 4],
        "py": [6, 3],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [21, 5, 11, 5, 10],
        "py": [1, 1, 3, 0, 0],
        "pz": [0, 2, 1, 2, 1],
        "nx": [7, 14, 15, 4, 8],
        "ny": [3, 6, 11, 3, 4],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [10, 6],
        "py": [15, 10],
        "pz": [0, -1],
        "nx": [21, 22],
        "ny": [14, 12],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [18, 0],
        "py": [20, 0],
        "pz": [0, -1],
        "nx": [2, 3],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [12, 6, 13, 11, 7],
        "py": [1, 1, 1, 2, 1],
        "pz": [0, 1, 0, 0, 1],
        "nx": [7, 6, 8, 5, 5],
        "ny": [4, 15, 4, 16, 16],
        "nz": [1, 0, 1, 0, -1]
      }, {
        "size": 3,
        "px": [22, 21, 21],
        "py": [14, 15, 17],
        "pz": [0, 0, 0],
        "nx": [5, 9, 4],
        "ny": [0, 5, 0],
        "nz": [2, -1, -1]
      }, {
        "size": 2,
        "px": [10, 2],
        "py": [14, 1],
        "pz": [0, -1],
        "nx": [23, 11],
        "ny": [16, 8],
        "nz": [0, 1]
      }, {
        "size": 4,
        "px": [21, 21, 0, 18],
        "py": [14, 15, 5, 4],
        "pz": [0, 0, -1, -1],
        "nx": [8, 8, 9, 4],
        "ny": [7, 8, 10, 5],
        "nz": [1, 1, 1, 2]
      }, {
        "size": 2,
        "px": [15, 5],
        "py": [18, 1],
        "pz": [0, -1],
        "nx": [23, 23],
        "ny": [16, 18],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [15, 14],
        "py": [1, 1],
        "pz": [0, 0],
        "nx": [4, 4],
        "ny": [2, 3],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [2, 6],
        "py": [6, 5],
        "pz": [1, -1],
        "nx": [14, 11],
        "ny": [1, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 17],
        "py": [2, 8],
        "pz": [2, 0],
        "nx": [8, 3],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 8],
        "py": [13, 10],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [8, 3],
        "pz": [0, 1],
        "nx": [1, 11],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 8],
        "py": [5, 0],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [3, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 3],
        "pz": [1, 2],
        "nx": [1, 18],
        "ny": [5, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 3],
        "py": [6, 6],
        "pz": [0, 1],
        "nx": [7, 12],
        "ny": [5, 20],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 1],
        "py": [0, 5],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [9, 3],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [10, 11],
        "pz": [0, 0],
        "nx": [0, 5],
        "ny": [5, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 1],
        "py": [23, 4],
        "pz": [0, 2],
        "nx": [0, 0],
        "ny": [13, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 1],
        "py": [6, 4],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [4, 5],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [7, 6],
        "py": [6, 5],
        "pz": [1, 1],
        "nx": [3, 9],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [9, 13],
        "pz": [0, -1],
        "nx": [4, 10],
        "ny": [3, 7],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [13, 9, 6, 10, 10],
        "py": [2, 2, 1, 2, 2],
        "pz": [0, 0, 1, 0, -1],
        "nx": [7, 5, 6, 5, 6],
        "ny": [0, 2, 2, 1, 1],
        "nz": [0, 0, 0, 0, 0]
      }],
      "alpha": [-1.119615e+00, 1.119615e+00, -8.169953e-01, 8.169953e-01, -5.291213e-01, 5.291213e-01, -4.904488e-01, 4.904488e-01, -4.930982e-01, 4.930982e-01, -4.106179e-01, 4.106179e-01, -4.246842e-01, 4.246842e-01, -3.802383e-01, 3.802383e-01, -3.364358e-01, 3.364358e-01, -3.214186e-01, 3.214186e-01, -3.210798e-01, 3.210798e-01, -2.993167e-01, 2.993167e-01, -3.426336e-01, 3.426336e-01, -3.199184e-01, 3.199184e-01, -3.061071e-01, 3.061071e-01, -2.758972e-01, 2.758972e-01, -3.075590e-01, 3.075590e-01, -3.009565e-01, 3.009565e-01, -2.015739e-01, 2.015739e-01, -2.603266e-01, 2.603266e-01, -2.772993e-01, 2.772993e-01, -2.184913e-01, 2.184913e-01, -2.306681e-01, 2.306681e-01, -1.983223e-01, 1.983223e-01, -2.194760e-01, 2.194760e-01, -2.528421e-01, 2.528421e-01, -2.436416e-01, 2.436416e-01, -3.032886e-01, 3.032886e-01, -2.556071e-01, 2.556071e-01, -2.562170e-01, 2.562170e-01, -1.930298e-01, 1.930298e-01, -2.735898e-01, 2.735898e-01, -1.814703e-01, 1.814703e-01, -2.054824e-01, 2.054824e-01, -1.986146e-01, 1.986146e-01, -1.769226e-01, 1.769226e-01, -1.775257e-01, 1.775257e-01, -2.167927e-01, 2.167927e-01, -1.823633e-01, 1.823633e-01, -1.584280e-01, 1.584280e-01, -1.778321e-01, 1.778321e-01, -1.826777e-01, 1.826777e-01, -1.979903e-01, 1.979903e-01, -1.898326e-01, 1.898326e-01, -1.835506e-01, 1.835506e-01, -1.967860e-01, 1.967860e-01, -1.871528e-01, 1.871528e-01, -1.772414e-01, 1.772414e-01, -1.985514e-01, 1.985514e-01, -2.144078e-01, 2.144078e-01, -2.742303e-01, 2.742303e-01, -2.240550e-01, 2.240550e-01, -2.132534e-01, 2.132534e-01, -1.552127e-01, 1.552127e-01, -1.568276e-01, 1.568276e-01, -1.630086e-01, 1.630086e-01, -1.458232e-01, 1.458232e-01, -1.559541e-01, 1.559541e-01, -1.720131e-01, 1.720131e-01, -1.708434e-01, 1.708434e-01, -1.624431e-01, 1.624431e-01, -1.814161e-01, 1.814161e-01, -1.552639e-01, 1.552639e-01, -1.242354e-01, 1.242354e-01, -1.552139e-01, 1.552139e-01, -1.694359e-01, 1.694359e-01, -1.801481e-01, 1.801481e-01, -1.387182e-01, 1.387182e-01, -1.409679e-01, 1.409679e-01, -1.486724e-01, 1.486724e-01, -1.779553e-01, 1.779553e-01, -1.524595e-01, 1.524595e-01, -1.788086e-01, 1.788086e-01, -1.671479e-01, 1.671479e-01, -1.376197e-01, 1.376197e-01, -1.511808e-01, 1.511808e-01, -1.524632e-01, 1.524632e-01, -1.198986e-01, 1.198986e-01, -1.382641e-01, 1.382641e-01, -1.148901e-01, 1.148901e-01, -1.131803e-01, 1.131803e-01, -1.273508e-01, 1.273508e-01, -1.405125e-01, 1.405125e-01, -1.322132e-01, 1.322132e-01, -1.386966e-01, 1.386966e-01, -1.275621e-01, 1.275621e-01, -1.180573e-01, 1.180573e-01, -1.238803e-01, 1.238803e-01, -1.428389e-01, 1.428389e-01, -1.694437e-01, 1.694437e-01, -1.290855e-01, 1.290855e-01, -1.520260e-01, 1.520260e-01, -1.398282e-01, 1.398282e-01, -1.890736e-01, 1.890736e-01, -2.280428e-01, 2.280428e-01, -1.325099e-01, 1.325099e-01, -1.342873e-01, 1.342873e-01, -1.463841e-01, 1.463841e-01, -1.983567e-01, 1.983567e-01, -1.585711e-01, 1.585711e-01, -1.260154e-01, 1.260154e-01, -1.426774e-01, 1.426774e-01, -1.554278e-01, 1.554278e-01, -1.361201e-01, 1.361201e-01, -1.181856e-01, 1.181856e-01, -1.255941e-01, 1.255941e-01, -1.113275e-01, 1.113275e-01, -1.506576e-01, 1.506576e-01, -1.202859e-01, 1.202859e-01, -2.159751e-01, 2.159751e-01, -1.443150e-01, 1.443150e-01, -1.379194e-01, 1.379194e-01, -1.805758e-01, 1.805758e-01, -1.465612e-01, 1.465612e-01, -1.328856e-01, 1.328856e-01, -1.532173e-01, 1.532173e-01, -1.590635e-01, 1.590635e-01, -1.462229e-01, 1.462229e-01, -1.350012e-01, 1.350012e-01, -1.195634e-01, 1.195634e-01, -1.173221e-01, 1.173221e-01, -1.192867e-01, 1.192867e-01, -1.595013e-01, 1.595013e-01, -1.209751e-01, 1.209751e-01, -1.571290e-01, 1.571290e-01, -1.527274e-01, 1.527274e-01, -1.373708e-01, 1.373708e-01, -1.318313e-01, 1.318313e-01, -1.273391e-01, 1.273391e-01, -1.271365e-01, 1.271365e-01, -1.528693e-01, 1.528693e-01, -1.590476e-01, 1.590476e-01, -1.581911e-01, 1.581911e-01, -1.183023e-01, 1.183023e-01, -1.559822e-01, 1.559822e-01, -1.214999e-01, 1.214999e-01, -1.283378e-01, 1.283378e-01, -1.542583e-01, 1.542583e-01, -1.336377e-01, 1.336377e-01, -1.800416e-01, 1.800416e-01, -1.710931e-01, 1.710931e-01, -1.621737e-01, 1.621737e-01, -1.239002e-01, 1.239002e-01, -1.432928e-01, 1.432928e-01, -1.392447e-01, 1.392447e-01, -1.383938e-01, 1.383938e-01, -1.357633e-01, 1.357633e-01, -1.175842e-01, 1.175842e-01, -1.085318e-01, 1.085318e-01, -1.148885e-01, 1.148885e-01, -1.320396e-01, 1.320396e-01, -1.351204e-01, 1.351204e-01, -1.581518e-01, 1.581518e-01, -1.459574e-01, 1.459574e-01, -1.180068e-01, 1.180068e-01, -1.464196e-01, 1.464196e-01, -1.179543e-01, 1.179543e-01, -1.004204e-01, 1.004204e-01, -1.294660e-01, 1.294660e-01, -1.534244e-01, 1.534244e-01, -1.378970e-01, 1.378970e-01, -1.226545e-01, 1.226545e-01, -1.281182e-01, 1.281182e-01, -1.201471e-01, 1.201471e-01, -1.448701e-01, 1.448701e-01, -1.290980e-01, 1.290980e-01, -1.388764e-01, 1.388764e-01, -9.605773e-02, 9.605773e-02, -1.411021e-01, 1.411021e-01, -1.295693e-01, 1.295693e-01, -1.371739e-01, 1.371739e-01, -1.167579e-01, 1.167579e-01, -1.400486e-01, 1.400486e-01, -1.214224e-01, 1.214224e-01, -1.287835e-01, 1.287835e-01, -1.197646e-01, 1.197646e-01, -1.192358e-01, 1.192358e-01, -1.218651e-01, 1.218651e-01, -1.564816e-01, 1.564816e-01, -1.172391e-01, 1.172391e-01, -1.342268e-01, 1.342268e-01, -1.492471e-01, 1.492471e-01, -1.157299e-01, 1.157299e-01, -1.046703e-01, 1.046703e-01, -1.255571e-01, 1.255571e-01, -1.100135e-01, 1.100135e-01, -1.501592e-01, 1.501592e-01, -1.155712e-01, 1.155712e-01, -1.145563e-01, 1.145563e-01, -1.013425e-01, 1.013425e-01, -1.145783e-01, 1.145783e-01, -1.328031e-01, 1.328031e-01, -1.077413e-01, 1.077413e-01, -1.064996e-01, 1.064996e-01, -1.191170e-01, 1.191170e-01, -1.213217e-01, 1.213217e-01, -1.260969e-01, 1.260969e-01, -1.156494e-01, 1.156494e-01, -1.268126e-01, 1.268126e-01, -1.070999e-01, 1.070999e-01, -1.112365e-01, 1.112365e-01, -1.243916e-01, 1.243916e-01, -1.283152e-01, 1.283152e-01, -1.166925e-01, 1.166925e-01, -8.997633e-02, 8.997633e-02, -1.583840e-01, 1.583840e-01, -1.211178e-01, 1.211178e-01, -1.090830e-01, 1.090830e-01, -1.030818e-01, 1.030818e-01, -1.440600e-01, 1.440600e-01, -1.458713e-01, 1.458713e-01, -1.559082e-01, 1.559082e-01, -1.058868e-01, 1.058868e-01, -1.010130e-01, 1.010130e-01, -1.642301e-01, 1.642301e-01, -1.236850e-01, 1.236850e-01, -1.467589e-01, 1.467589e-01, -1.109359e-01, 1.109359e-01, -1.673655e-01, 1.673655e-01, -1.239984e-01, 1.239984e-01, -1.039509e-01, 1.039509e-01, -1.089378e-01, 1.089378e-01, -1.545085e-01, 1.545085e-01, -1.200862e-01, 1.200862e-01, -1.105608e-01, 1.105608e-01, -1.235262e-01, 1.235262e-01, -8.496153e-02, 8.496153e-02, -1.181372e-01, 1.181372e-01, -1.139467e-01, 1.139467e-01, -1.189317e-01, 1.189317e-01, -1.266519e-01, 1.266519e-01, -9.470736e-02, 9.470736e-02, -1.336735e-01, 1.336735e-01, -8.726601e-02, 8.726601e-02, -1.304782e-01, 1.304782e-01, -1.186529e-01, 1.186529e-01, -1.355944e-01, 1.355944e-01, -9.568801e-02, 9.568801e-02, -1.282618e-01, 1.282618e-01, -1.625632e-01, 1.625632e-01, -1.167652e-01, 1.167652e-01, -1.001301e-01, 1.001301e-01, -1.292419e-01, 1.292419e-01, -1.904213e-01, 1.904213e-01, -1.511542e-01, 1.511542e-01, -9.814394e-02, 9.814394e-02, -1.171564e-01, 1.171564e-01, -9.806486e-02, 9.806486e-02, -9.217615e-02, 9.217615e-02, -8.505645e-02, 8.505645e-02, -1.573637e-01, 1.573637e-01, -1.419174e-01, 1.419174e-01, -1.298601e-01, 1.298601e-01, -1.120613e-01, 1.120613e-01, -1.158363e-01, 1.158363e-01, -1.090957e-01, 1.090957e-01, -1.204516e-01, 1.204516e-01, -1.139852e-01, 1.139852e-01, -9.642479e-02, 9.642479e-02, -1.410872e-01, 1.410872e-01, -1.142779e-01, 1.142779e-01, -1.043991e-01, 1.043991e-01, -9.736463e-02, 9.736463e-02, -1.451046e-01, 1.451046e-01, -1.205668e-01, 1.205668e-01, -9.881445e-02, 9.881445e-02, -1.612822e-01, 1.612822e-01, -1.175681e-01, 1.175681e-01, -1.522528e-01, 1.522528e-01, -1.617520e-01, 1.617520e-01, -1.582938e-01, 1.582938e-01, -1.208202e-01, 1.208202e-01, -1.016003e-01, 1.016003e-01, -1.232059e-01, 1.232059e-01, -9.583025e-02, 9.583025e-02, -1.013990e-01, 1.013990e-01, -1.178752e-01, 1.178752e-01, -1.215972e-01, 1.215972e-01, -1.294932e-01, 1.294932e-01, -1.158270e-01, 1.158270e-01, -1.008645e-01, 1.008645e-01, -9.699190e-02, 9.699190e-02, -1.022144e-01, 1.022144e-01, -9.878768e-02, 9.878768e-02, -1.339052e-01, 1.339052e-01, -9.279961e-02, 9.279961e-02, -1.047606e-01, 1.047606e-01, -1.141163e-01, 1.141163e-01, -1.267600e-01, 1.267600e-01, -1.252763e-01, 1.252763e-01, -9.775003e-02, 9.775003e-02, -9.169116e-02, 9.169116e-02, -1.006496e-01, 1.006496e-01, -9.493293e-02, 9.493293e-02, -1.213694e-01, 1.213694e-01, -1.109243e-01, 1.109243e-01, -1.115973e-01, 1.115973e-01, -7.979327e-02, 7.979327e-02, -9.220953e-02, 9.220953e-02, -1.028913e-01, 1.028913e-01, -1.253510e-01, 1.253510e-01]
    }, {
      "count": 391,
      "threshold": -4.665692e+00,
      "feature": [{
        "size": 5,
        "px": [14, 9, 11, 17, 12],
        "py": [2, 3, 9, 13, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [21, 8, 7, 20, 13],
        "ny": [16, 10, 7, 7, 9],
        "nz": [0, 1, 1, 0, 0]
      }, {
        "size": 5,
        "px": [12, 10, 6, 11, 13],
        "py": [9, 3, 13, 3, 4],
        "pz": [0, 0, 0, 0, 0],
        "nx": [10, 4, 5, 10, 2],
        "ny": [9, 10, 8, 8, 2],
        "nz": [0, 1, 1, 0, 2]
      }, {
        "size": 5,
        "px": [6, 9, 7, 8, 8],
        "py": [3, 3, 3, 3, 3],
        "pz": [0, 0, 0, 0, -1],
        "nx": [0, 0, 0, 4, 9],
        "ny": [4, 2, 3, 10, 8],
        "nz": [0, 0, 0, 1, 0]
      }, {
        "size": 5,
        "px": [6, 2, 16, 6, 8],
        "py": [16, 2, 11, 4, 11],
        "pz": [0, 2, 0, 1, 0],
        "nx": [3, 8, 4, 1, 1],
        "ny": [4, 4, 4, 5, 13],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [16, 13, 9],
        "py": [23, 18, 10],
        "pz": [0, 0, 1],
        "nx": [14, 15, 8],
        "ny": [21, 22, 3],
        "nz": [0, -1, -1]
      }, {
        "size": 5,
        "px": [9, 16, 19, 17, 17],
        "py": [1, 2, 3, 2, 2],
        "pz": [1, 0, 0, 0, -1],
        "nx": [23, 23, 23, 23, 23],
        "ny": [6, 2, 1, 3, 5],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [12, 12, 12, 12, 12],
        "py": [10, 11, 12, 13, 13],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 8, 14, 4, 6],
        "ny": [2, 4, 7, 4, 8],
        "nz": [2, 1, 0, 1, 1]
      }, {
        "size": 5,
        "px": [1, 2, 3, 6, 4],
        "py": [6, 10, 12, 23, 13],
        "pz": [1, 1, 0, 0, 0],
        "nx": [2, 0, 0, 1, 1],
        "ny": [23, 5, 10, 21, 21],
        "nz": [0, 2, 1, 0, -1]
      }, {
        "size": 5,
        "px": [12, 16, 12, 4, 12],
        "py": [6, 17, 7, 2, 8],
        "pz": [0, 0, 0, 2, 0],
        "nx": [8, 8, 12, 0, 6],
        "ny": [4, 4, 16, 0, 8],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [18, 4],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [10, 16],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [9, 9, 2, 0, 12],
        "py": [6, 6, 21, 4, 8],
        "pz": [1, -1, -1, -1, -1],
        "nx": [8, 4, 9, 7, 7],
        "ny": [10, 2, 4, 5, 8],
        "nz": [1, 2, 1, 1, 1]
      }, {
        "size": 5,
        "px": [10, 10, 10, 18, 19],
        "py": [10, 8, 7, 14, 14],
        "pz": [1, 1, 1, 0, 0],
        "nx": [21, 23, 22, 22, 11],
        "ny": [23, 19, 21, 22, 10],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [12, 3, 15, 4, 19],
        "py": [14, 0, 5, 5, 14],
        "pz": [0, -1, -1, -1, -1],
        "nx": [12, 17, 15, 3, 8],
        "ny": [18, 18, 14, 2, 10],
        "nz": [0, 0, 0, 2, 0]
      }, {
        "size": 5,
        "px": [8, 11, 3, 11, 4],
        "py": [23, 7, 9, 8, 8],
        "pz": [0, 0, 1, 0, 1],
        "nx": [8, 0, 10, 0, 8],
        "ny": [8, 2, 8, 4, 10],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [10, 11, 12, 8, 4],
        "py": [3, 0, 0, 1, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [2, 3, 4, 3, 3],
        "ny": [14, 5, 0, 1, 2],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [3, 11],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [5, 2],
        "ny": [9, 5],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [7, 1, 0, 10, 1],
        "py": [0, 0, 2, 12, 6],
        "pz": [0, 2, 2, 0, 1],
        "nx": [4, 6, 2, 8, 8],
        "ny": [4, 11, 2, 4, 4],
        "nz": [1, 1, 2, 1, -1]
      }, {
        "size": 2,
        "px": [4, 15],
        "py": [4, 12],
        "pz": [2, 0],
        "nx": [4, 6],
        "ny": [5, 11],
        "nz": [2, -1]
      }, {
        "size": 5,
        "px": [9, 4, 16, 14, 14],
        "py": [8, 4, 23, 18, 18],
        "pz": [1, 2, 0, 0, -1],
        "nx": [0, 2, 1, 1, 0],
        "ny": [2, 0, 3, 2, 3],
        "nz": [1, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [17, 7, 7, 18, 19],
        "py": [7, 11, 8, 7, 7],
        "pz": [0, 1, 1, 0, 0],
        "nx": [17, 5, 8, 2, 0],
        "ny": [8, 0, 7, 5, 3],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [5, 14],
        "py": [12, 3],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [5, 4],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [10, 8, 16, 11, 11],
        "py": [5, 6, 12, 4, 4],
        "pz": [0, 1, 0, 0, -1],
        "nx": [14, 13, 5, 9, 5],
        "ny": [13, 10, 1, 4, 2],
        "nz": [0, 0, 2, 1, 2]
      }, {
        "size": 5,
        "px": [15, 14, 16, 8, 8],
        "py": [2, 2, 2, 0, 0],
        "pz": [0, 0, 0, 1, -1],
        "nx": [9, 18, 19, 18, 17],
        "ny": [0, 0, 2, 1, 0],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [17, 15],
        "py": [12, 11],
        "pz": [0, 0],
        "nx": [14, 4],
        "ny": [9, 15],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [5, 11, 11],
        "py": [3, 4, 5],
        "pz": [2, 1, 1],
        "nx": [14, 3, 18],
        "ny": [6, 5, 0],
        "nz": [0, 1, -1]
      }, {
        "size": 5,
        "px": [16, 14, 17, 15, 9],
        "py": [2, 2, 2, 2, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [21, 20, 11, 21, 21],
        "ny": [2, 0, 7, 3, 3],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 5,
        "px": [2, 1, 1, 1, 5],
        "py": [12, 9, 7, 3, 6],
        "pz": [0, 0, 1, 1, 1],
        "nx": [4, 8, 3, 4, 17],
        "ny": [4, 4, 0, 8, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [9, 2],
        "ny": [4, 17],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 5],
        "py": [16, 9],
        "pz": [0, 1],
        "nx": [10, 17],
        "ny": [16, 8],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [11, 5, 9, 15],
        "py": [14, 9, 11, 5],
        "pz": [0, -1, -1, -1],
        "nx": [10, 1, 9, 4],
        "ny": [9, 2, 13, 7],
        "nz": [0, 2, 0, 1]
      }, {
        "size": 5,
        "px": [2, 5, 10, 7, 10],
        "py": [7, 12, 2, 13, 3],
        "pz": [1, -1, -1, -1, -1],
        "nx": [5, 2, 3, 3, 2],
        "ny": [23, 15, 17, 16, 14],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [11, 7],
        "py": [8, 10],
        "pz": [0, -1],
        "nx": [7, 14],
        "ny": [5, 8],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [9, 16],
        "py": [7, 23],
        "pz": [1, 0],
        "nx": [4, 4],
        "ny": [2, 1],
        "nz": [2, -1]
      }, {
        "size": 5,
        "px": [16, 14, 18, 4, 17],
        "py": [0, 0, 4, 0, 1],
        "pz": [0, 0, 0, 2, 0],
        "nx": [8, 8, 16, 9, 9],
        "ny": [5, 4, 11, 7, 7],
        "nz": [1, 1, 0, 0, -1]
      }, {
        "size": 5,
        "px": [12, 13, 7, 8, 4],
        "py": [9, 12, 6, 11, 5],
        "pz": [0, 0, 1, 1, 2],
        "nx": [23, 23, 16, 9, 9],
        "ny": [0, 1, 11, 7, 7],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [6, 7, 2],
        "py": [21, 23, 4],
        "pz": [0, 0, 2],
        "nx": [4, 1, 16],
        "ny": [10, 5, 11],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [3, 4],
        "pz": [2, 2],
        "nx": [3, 1],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [1, 2, 1, 0, 1],
        "py": [7, 13, 12, 4, 13],
        "pz": [0, 0, 0, 2, 0],
        "nx": [18, 9, 9, 19, 19],
        "ny": [23, 5, 11, 19, 19],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 3,
        "px": [4, 10, 12],
        "py": [6, 2, 5],
        "pz": [1, -1, -1],
        "nx": [10, 0, 0],
        "ny": [12, 1, 3],
        "nz": [0, 2, 2]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 0],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [19, 17, 10, 14, 18],
        "py": [2, 1, 7, 0, 1],
        "pz": [0, 0, 1, 0, 0],
        "nx": [3, 3, 3, 7, 5],
        "ny": [9, 10, 7, 23, 18],
        "nz": [1, 1, 1, 0, 0]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [14, 4],
        "ny": [15, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 15],
        "py": [1, 3],
        "pz": [1, 0],
        "nx": [16, 19],
        "ny": [1, 3],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [11, 11, 1, 2, 11],
        "py": [11, 12, 1, 13, 12],
        "pz": [0, 0, -1, -1, -1],
        "nx": [12, 17, 8, 16, 8],
        "ny": [7, 12, 11, 16, 6],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 5,
        "px": [13, 11, 10, 12, 5],
        "py": [0, 0, 0, 0, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [8, 4, 3, 4, 4],
        "ny": [4, 5, 2, 4, 4],
        "nz": [1, 1, 2, 1, -1]
      }, {
        "size": 5,
        "px": [6, 1, 3, 2, 3],
        "py": [13, 3, 3, 4, 10],
        "pz": [0, 2, 1, 1, 1],
        "nx": [0, 1, 0, 0, 0],
        "ny": [2, 0, 5, 4, 4],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [15, 1],
        "py": [4, 3],
        "pz": [0, -1],
        "nx": [16, 15],
        "ny": [2, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 7],
        "py": [7, 13],
        "pz": [1, 0],
        "nx": [3, 0],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [14, 15],
        "py": [18, 14],
        "pz": [0, -1],
        "nx": [4, 14],
        "ny": [4, 16],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [4, 6],
        "py": [3, 4],
        "pz": [2, 1],
        "nx": [9, 5],
        "ny": [14, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 6],
        "py": [1, 5],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [0, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [9, 0],
        "py": [4, 2],
        "pz": [0, -1],
        "nx": [5, 3],
        "ny": [1, 0],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [1, 1, 1, 0, 0],
        "py": [16, 15, 17, 6, 9],
        "pz": [0, 0, 0, 1, 0],
        "nx": [9, 5, 4, 9, 8],
        "ny": [7, 3, 3, 6, 7],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 2,
        "px": [9, 1],
        "py": [8, 15],
        "pz": [1, -1],
        "nx": [9, 8],
        "ny": [9, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [20, 19],
        "py": [19, 22],
        "pz": [0, 0],
        "nx": [7, 0],
        "ny": [3, 0],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [8, 4, 2, 5, 5],
        "py": [12, 6, 3, 5, 5],
        "pz": [0, 1, 2, 1, -1],
        "nx": [22, 21, 20, 21, 22],
        "ny": [17, 20, 22, 19, 16],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [2, 6],
        "pz": [1, 0],
        "nx": [8, 3],
        "ny": [3, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [9, 4],
        "pz": [1, 1],
        "nx": [12, 4],
        "ny": [17, 5],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [0, 1, 0],
        "py": [5, 13, 3],
        "pz": [2, 0, 2],
        "nx": [0, 4, 11],
        "ny": [23, 5, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [6, 3],
        "pz": [0, 1],
        "nx": [4, 4],
        "ny": [3, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [7, 3],
        "pz": [0, -1],
        "nx": [0, 1],
        "ny": [4, 10],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [12, 13, 12, 12, 12],
        "py": [12, 13, 11, 10, 10],
        "pz": [0, 0, 0, 0, -1],
        "nx": [10, 8, 8, 16, 15],
        "ny": [7, 4, 10, 11, 10],
        "nz": [0, 1, 0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [4, 2],
        "ny": [5, 5],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [9, 17],
        "py": [17, 7],
        "pz": [0, -1],
        "nx": [5, 2],
        "ny": [9, 4],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [3, 5],
        "pz": [2, 2],
        "nx": [12, 8],
        "ny": [16, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [2, 0],
        "pz": [1, 1],
        "nx": [0, 4],
        "ny": [0, 1],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [5, 0],
        "pz": [0, -1],
        "nx": [2, 3],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 4,
        "px": [0, 6, 4, 22],
        "py": [23, 2, 4, 12],
        "pz": [0, -1, -1, -1],
        "nx": [7, 6, 8, 5],
        "ny": [1, 1, 2, 1],
        "nz": [1, 1, 1, 1]
      }, {
        "size": 2,
        "px": [4, 10],
        "py": [0, 9],
        "pz": [1, -1],
        "nx": [2, 4],
        "ny": [3, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [11, 8],
        "py": [15, 13],
        "pz": [0, -1],
        "nx": [23, 11],
        "ny": [13, 5],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [18, 4],
        "py": [5, 4],
        "pz": [0, -1],
        "nx": [18, 20],
        "ny": [4, 7],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [21, 20, 20, 10, 20],
        "py": [17, 22, 19, 10, 21],
        "pz": [0, 0, 0, 1, 0],
        "nx": [5, 5, 3, 14, 7],
        "ny": [9, 9, 0, 8, 4],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [3, 7, 13, 7, 3],
        "py": [6, 12, 3, 0, 3],
        "pz": [1, -1, -1, -1, -1],
        "nx": [1, 5, 0, 0, 2],
        "ny": [16, 6, 13, 5, 4],
        "nz": [0, 1, 0, 1, 0]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [9, 5],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [14, 9, 13],
        "py": [19, 22, 8],
        "pz": [0, -1, -1],
        "nx": [13, 4, 4],
        "ny": [17, 2, 5],
        "nz": [0, 2, 2]
      }, {
        "size": 2,
        "px": [16, 4],
        "py": [9, 3],
        "pz": [0, 2],
        "nx": [7, 4],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [10, 2, 4, 2],
        "py": [23, 4, 8, 3],
        "pz": [0, 2, 1, 2],
        "nx": [14, 0, 4, 11],
        "ny": [19, 3, 5, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 5,
        "px": [9, 10, 8, 7, 11],
        "py": [2, 2, 2, 2, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [6, 5, 3, 4, 4],
        "ny": [0, 1, 0, 2, 2],
        "nz": [0, 0, 1, 0, -1]
      }, {
        "size": 2,
        "px": [6, 4],
        "py": [13, 6],
        "pz": [0, -1],
        "nx": [15, 4],
        "ny": [8, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [0, 8],
        "py": [1, 2],
        "pz": [2, -1],
        "nx": [5, 4],
        "ny": [2, 2],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [16, 13, 14, 15, 15],
        "py": [1, 0, 0, 0, 0],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 9, 4, 18, 8],
        "ny": [5, 9, 4, 18, 11],
        "nz": [2, 1, 2, 0, 1]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [2, 6],
        "pz": [2, 1],
        "nx": [22, 9],
        "ny": [23, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [19, 19],
        "py": [5, 5],
        "pz": [0, -1],
        "nx": [21, 22],
        "ny": [2, 4],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 5],
        "py": [8, 6],
        "pz": [0, 1],
        "nx": [3, 4],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [18, 14],
        "py": [13, 17],
        "pz": [0, 0],
        "nx": [14, 4],
        "ny": [16, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [6, 3],
        "pz": [1, -1],
        "nx": [1, 0],
        "ny": [2, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [23, 21],
        "py": [21, 14],
        "pz": [0, -1],
        "nx": [7, 5],
        "ny": [0, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [15, 10],
        "py": [23, 7],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [4, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [4, 18],
        "py": [3, 8],
        "pz": [2, 0],
        "nx": [8, 4],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 7],
        "py": [2, 11],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [2, 3, 5, 6, 1],
        "py": [7, 14, 2, 2, 4],
        "pz": [1, 0, 0, 0, 2],
        "nx": [8, 4, 4, 7, 7],
        "ny": [7, 5, 4, 9, 9],
        "nz": [1, 2, 2, 1, -1]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [6, 3],
        "pz": [1, -1],
        "nx": [1, 2],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [7, 20, 4, 10, 10],
        "py": [9, 16, 4, 10, 8],
        "pz": [1, 0, 2, 1, 1],
        "nx": [4, 2, 3, 5, 3],
        "ny": [11, 5, 6, 12, 5],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 2,
        "px": [6, 11],
        "py": [4, 18],
        "pz": [1, -1],
        "nx": [8, 6],
        "ny": [4, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [2, 8],
        "py": [5, 23],
        "pz": [2, 0],
        "nx": [9, 4],
        "ny": [0, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [3, 1, 2, 2, 2],
        "py": [12, 6, 12, 11, 11],
        "pz": [0, 1, 0, 0, -1],
        "nx": [0, 0, 0, 0, 0],
        "ny": [13, 12, 11, 14, 7],
        "nz": [0, 0, 0, 0, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [1, 2],
        "pz": [2, 1],
        "nx": [8, 4],
        "ny": [4, 14],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [11, 23, 23, 22, 22],
        "py": [8, 12, 6, 13, 14],
        "pz": [1, 0, 0, 0, 0],
        "nx": [13, 8, 7, 6, 6],
        "ny": [6, 3, 3, 9, 9],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 4,
        "px": [9, 23, 23, 22],
        "py": [7, 12, 6, 13],
        "pz": [1, -1, -1, -1],
        "nx": [11, 23, 23, 23],
        "ny": [6, 13, 17, 10],
        "nz": [1, 0, 0, 0]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [19, 5, 9, 16, 10],
        "pz": [0, 2, 1, 0, 1],
        "nx": [5, 2, 1, 2, 2],
        "ny": [18, 10, 5, 9, 9],
        "nz": [0, 1, 2, 1, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [10, 4],
        "pz": [1, 2],
        "nx": [23, 14],
        "ny": [23, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 1],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 10],
        "py": [4, 8],
        "pz": [0, -1],
        "nx": [8, 8],
        "ny": [2, 3],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [7, 10, 11],
        "py": [1, 6, 13],
        "pz": [0, -1, -1],
        "nx": [4, 4, 2],
        "ny": [3, 8, 2],
        "nz": [1, 1, 2]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [8, 2],
        "pz": [1, 2],
        "nx": [10, 5],
        "ny": [10, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 16],
        "py": [20, 21],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [5, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [3, 10],
        "py": [7, 8],
        "pz": [1, -1],
        "nx": [7, 4],
        "ny": [20, 7],
        "nz": [0, 1]
      }, {
        "size": 5,
        "px": [11, 11, 11, 11, 11],
        "py": [10, 12, 13, 11, 11],
        "pz": [0, 0, 0, 0, -1],
        "nx": [11, 12, 16, 3, 8],
        "ny": [6, 6, 10, 1, 8],
        "nz": [0, 0, 0, 2, 0]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [4, 2],
        "pz": [0, 1],
        "nx": [7, 7],
        "ny": [8, 1],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [23, 23, 23, 23, 23],
        "py": [22, 20, 21, 19, 19],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 6, 3, 4, 3],
        "ny": [19, 23, 15, 20, 16],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 3,
        "px": [8, 4, 14],
        "py": [12, 3, 8],
        "pz": [0, -1, -1],
        "nx": [4, 2, 10],
        "ny": [10, 3, 13],
        "nz": [1, 2, 0]
      }, {
        "size": 2,
        "px": [11, 18],
        "py": [13, 23],
        "pz": [0, -1],
        "nx": [5, 5],
        "ny": [1, 2],
        "nz": [2, 2]
      }, {
        "size": 3,
        "px": [11, 2, 10],
        "py": [17, 4, 17],
        "pz": [0, 2, 0],
        "nx": [11, 0, 22],
        "ny": [15, 2, 4],
        "nz": [0, -1, -1]
      }, {
        "size": 3,
        "px": [11, 3, 0],
        "py": [15, 4, 8],
        "pz": [0, -1, -1],
        "nx": [14, 11, 4],
        "ny": [9, 17, 7],
        "nz": [0, 0, 1]
      }, {
        "size": 2,
        "px": [17, 16],
        "py": [2, 1],
        "pz": [0, 0],
        "nx": [9, 11],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [21, 23],
        "pz": [0, 0],
        "nx": [4, 0],
        "ny": [3, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [18, 2],
        "py": [20, 0],
        "pz": [0, -1],
        "nx": [4, 9],
        "ny": [5, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [9, 1],
        "py": [19, 3],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [9, 21],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [19, 19],
        "py": [21, 22],
        "pz": [0, 0],
        "nx": [19, 0],
        "ny": [23, 0],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [11, 2, 3, 2],
        "py": [6, 6, 9, 4],
        "pz": [0, -1, -1, -1],
        "nx": [4, 9, 19, 19],
        "ny": [5, 10, 17, 18],
        "nz": [2, 1, 0, 0]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [4, 8],
        "pz": [2, 1],
        "nx": [4, 9],
        "ny": [10, 10],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [23, 22],
        "py": [8, 12],
        "pz": [0, -1],
        "nx": [7, 4],
        "ny": [11, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [12, 1],
        "py": [5, 2],
        "pz": [0, -1],
        "nx": [9, 11],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [2, 2],
        "pz": [0, -1],
        "nx": [3, 2],
        "ny": [1, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [17, 9],
        "py": [13, 7],
        "pz": [0, 1],
        "nx": [9, 5],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [0, 0, 9, 13],
        "py": [3, 3, 7, 3],
        "pz": [2, -1, -1, -1],
        "nx": [2, 4, 4, 11],
        "ny": [1, 2, 8, 5],
        "nz": [2, 1, 1, 0]
      }, {
        "size": 5,
        "px": [3, 6, 5, 6, 6],
        "py": [0, 0, 2, 1, 1],
        "pz": [1, 0, 0, 0, -1],
        "nx": [2, 2, 2, 1, 1],
        "ny": [21, 19, 20, 16, 17],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [22, 10],
        "pz": [0, -1],
        "nx": [7, 4],
        "ny": [10, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [7, 3],
        "pz": [1, 2],
        "nx": [8, 4],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [17, 8, 15, 7, 15],
        "py": [13, 6, 16, 5, 12],
        "pz": [0, 1, 0, 1, 0],
        "nx": [5, 4, 6, 3, 4],
        "ny": [1, 2, 1, 0, 3],
        "nz": [0, 0, 0, 1, -1]
      }, {
        "size": 5,
        "px": [12, 9, 11, 12, 10],
        "py": [0, 1, 2, 2, 0],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 16, 7, 4, 4],
        "ny": [9, 23, 9, 3, 2],
        "nz": [1, 0, 1, 2, -1]
      }, {
        "size": 2,
        "px": [4, 11],
        "py": [1, 4],
        "pz": [2, -1],
        "nx": [8, 7],
        "ny": [4, 4],
        "nz": [0, 0]
      }, {
        "size": 4,
        "px": [7, 4, 5, 8],
        "py": [13, 2, 1, 3],
        "pz": [0, -1, -1, -1],
        "nx": [9, 4, 9, 9],
        "ny": [9, 5, 10, 11],
        "nz": [0, 1, 0, 0]
      }, {
        "size": 2,
        "px": [10, 11],
        "py": [10, 11],
        "pz": [0, -1],
        "nx": [2, 6],
        "ny": [2, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [21, 3],
        "py": [11, 2],
        "pz": [0, -1],
        "nx": [22, 22],
        "ny": [20, 18],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [7, 6],
        "py": [1, 2],
        "pz": [0, 0],
        "nx": [5, 10],
        "ny": [1, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [21, 3],
        "py": [18, 1],
        "pz": [0, -1],
        "nx": [16, 15],
        "ny": [4, 4],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 7],
        "py": [4, 1],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [13, 11],
        "py": [23, 17],
        "pz": [0, 0],
        "nx": [11, 21],
        "ny": [16, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [1, 2],
        "py": [0, 6],
        "pz": [1, -1],
        "nx": [16, 16],
        "ny": [9, 11],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [20, 20],
        "pz": [0, 0],
        "nx": [11, 3],
        "ny": [21, 7],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [19, 20, 9],
        "py": [21, 18, 11],
        "pz": [0, 0, 1],
        "nx": [17, 4, 11],
        "ny": [19, 2, 0],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [5, 2],
        "pz": [0, 1],
        "nx": [7, 9],
        "ny": [7, 8],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [8, 4, 4, 8, 4],
        "py": [4, 4, 5, 10, 3],
        "pz": [1, 1, 2, 0, 2],
        "nx": [11, 22, 11, 23, 23],
        "ny": [0, 0, 1, 3, 3],
        "nz": [1, 0, 1, 0, -1]
      }, {
        "size": 2,
        "px": [8, 14],
        "py": [10, 23],
        "pz": [1, 0],
        "nx": [7, 2],
        "ny": [10, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 14],
        "py": [6, 23],
        "pz": [1, -1],
        "nx": [1, 2],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [11, 2],
        "py": [19, 3],
        "pz": [0, -1],
        "nx": [10, 12],
        "ny": [18, 18],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 3],
        "py": [4, 1],
        "pz": [0, 2],
        "nx": [6, 6],
        "ny": [11, 11],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [18, 10, 20, 19, 19],
        "pz": [0, 1, 0, 0, -1],
        "nx": [11, 10, 14, 12, 13],
        "ny": [2, 2, 2, 2, 2],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 3,
        "px": [12, 2, 9],
        "py": [14, 5, 10],
        "pz": [0, -1, -1],
        "nx": [11, 10, 5],
        "ny": [10, 13, 5],
        "nz": [0, 0, 1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [3, 7],
        "pz": [2, 1],
        "nx": [3, 10],
        "ny": [4, 13],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [21, 7],
        "pz": [0, -1],
        "nx": [10, 21],
        "ny": [7, 15],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [21, 10],
        "py": [16, 8],
        "pz": [0, 1],
        "nx": [8, 2],
        "ny": [10, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [6, 7],
        "pz": [1, -1],
        "nx": [12, 11],
        "ny": [11, 7],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [3, 11],
        "py": [4, 20],
        "pz": [2, 0],
        "nx": [11, 10],
        "ny": [19, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [17, 5],
        "py": [13, 3],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [7, 1],
        "py": [23, 3],
        "pz": [0, 2],
        "nx": [14, 6],
        "ny": [12, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [11, 2],
        "pz": [0, -1],
        "nx": [11, 7],
        "ny": [3, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [9, 6],
        "py": [2, 17],
        "pz": [0, -1],
        "nx": [4, 6],
        "ny": [4, 12],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [14, 19],
        "py": [5, 6],
        "pz": [0, -1],
        "nx": [9, 3],
        "ny": [9, 1],
        "nz": [0, 2]
      }, {
        "size": 5,
        "px": [12, 13, 13, 13, 12],
        "py": [9, 11, 12, 13, 10],
        "pz": [0, 0, 0, 0, 0],
        "nx": [2, 4, 4, 4, 4],
        "ny": [7, 18, 17, 14, 14],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [6, 6],
        "pz": [1, -1],
        "nx": [20, 18],
        "ny": [18, 23],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [4, 14],
        "pz": [1, -1],
        "nx": [9, 4],
        "ny": [2, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [11, 9],
        "py": [4, 18],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [15, 0],
        "py": [18, 4],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [5, 4],
        "nz": [2, 2]
      }, {
        "size": 4,
        "px": [7, 3, 6, 6],
        "py": [8, 4, 6, 5],
        "pz": [1, 2, 1, 1],
        "nx": [10, 4, 13, 0],
        "ny": [10, 4, 9, 22],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [10, 8],
        "py": [18, 11],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [8, 10],
        "nz": [1, 1]
      }, {
        "size": 4,
        "px": [17, 2, 10, 2],
        "py": [14, 1, 10, 3],
        "pz": [0, -1, -1, -1],
        "nx": [8, 8, 17, 8],
        "ny": [4, 5, 12, 6],
        "nz": [1, 1, 0, 1]
      }, {
        "size": 5,
        "px": [9, 11, 9, 4, 10],
        "py": [1, 1, 0, 0, 1],
        "pz": [0, 0, 0, 1, 0],
        "nx": [8, 4, 7, 15, 15],
        "ny": [7, 2, 4, 17, 17],
        "nz": [1, 2, 1, 0, -1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [11, 8],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [1, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [11, 3],
        "py": [13, 8],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [5, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [6, 2],
        "py": [8, 3],
        "pz": [0, 2],
        "nx": [3, 1],
        "ny": [5, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [10, 5, 7, 8, 6],
        "py": [9, 7, 7, 7, 7],
        "pz": [0, 0, 0, 0, 0],
        "nx": [7, 3, 0, 2, 15],
        "ny": [8, 0, 1, 18, 17],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [17, 8],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [3, 11, 8, 10, 12],
        "py": [0, 2, 10, 2, 3],
        "pz": [2, 0, 0, 0, 0],
        "nx": [3, 2, 10, 2, 2],
        "ny": [6, 4, 11, 3, 3],
        "nz": [0, 1, 0, 1, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [2, 4],
        "pz": [2, 1],
        "nx": [8, 19],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [1, 1],
        "pz": [2, -1],
        "nx": [7, 17],
        "ny": [1, 2],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [16, 15, 14, 13, 7],
        "py": [0, 0, 0, 0, 0],
        "pz": [0, 0, 0, 0, -1],
        "nx": [6, 4, 8, 3, 11],
        "ny": [3, 4, 4, 1, 6],
        "nz": [1, 1, 1, 2, 0]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [8, 5],
        "pz": [0, -1],
        "nx": [13, 4],
        "ny": [10, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [4, 9],
        "py": [0, 2],
        "pz": [2, 1],
        "nx": [4, 11],
        "ny": [0, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [15, 15],
        "py": [2, 2],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [8, 17],
        "py": [9, 22],
        "pz": [1, 0],
        "nx": [8, 20],
        "ny": [10, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [14, 22],
        "pz": [0, -1],
        "nx": [3, 11],
        "ny": [3, 3],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [1, 0],
        "pz": [1, 2],
        "nx": [5, 8],
        "ny": [3, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [4, 8],
        "pz": [2, 1],
        "nx": [9, 5],
        "ny": [15, 19],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [1, 1],
        "pz": [0, 1],
        "nx": [10, 10],
        "ny": [6, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [17, 6],
        "py": [10, 2],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 3,
        "px": [13, 7, 3],
        "py": [5, 2, 6],
        "pz": [0, 1, -1],
        "nx": [17, 16, 17],
        "ny": [1, 1, 2],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [3, 3],
        "pz": [0, 0],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [0, 8],
        "pz": [2, -1],
        "nx": [3, 4],
        "ny": [0, 0],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [9, 2, 4, 1, 2],
        "py": [13, 3, 9, 2, 5],
        "pz": [0, 2, 1, 2, 2],
        "nx": [9, 5, 10, 4, 10],
        "ny": [5, 1, 3, 0, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [5, 9],
        "pz": [1, 0],
        "nx": [0, 2],
        "ny": [23, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [22, 11],
        "py": [21, 8],
        "pz": [0, 1],
        "nx": [10, 0],
        "ny": [17, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 1],
        "py": [22, 9],
        "pz": [0, 1],
        "nx": [22, 5],
        "ny": [11, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [5, 6],
        "ny": [10, 9],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [7, 3, 17, 7],
        "py": [8, 2, 10, 11],
        "pz": [0, 2, 0, 1],
        "nx": [6, 10, 5, 23],
        "ny": [9, 21, 1, 23],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [8, 3],
        "py": [7, 2],
        "pz": [1, 2],
        "nx": [8, 9],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [14, 6],
        "pz": [0, 1],
        "nx": [8, 8],
        "ny": [13, 13],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [11, 6, 8],
        "py": [20, 3, 20],
        "pz": [0, -1, -1],
        "nx": [5, 3, 12],
        "ny": [9, 5, 18],
        "nz": [1, 2, 0]
      }, {
        "size": 2,
        "px": [3, 9],
        "py": [1, 3],
        "pz": [1, 0],
        "nx": [2, 8],
        "ny": [5, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [15, 9],
        "py": [21, 3],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [5, 5],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [2, 9],
        "py": [7, 11],
        "pz": [1, -1],
        "nx": [2, 2],
        "ny": [8, 9],
        "nz": [1, 1]
      }, {
        "size": 4,
        "px": [3, 4, 3, 1],
        "py": [14, 21, 19, 6],
        "pz": [0, 0, 0, 1],
        "nx": [10, 16, 4, 5],
        "ny": [8, 1, 7, 6],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 4,
        "px": [10, 4, 3, 1],
        "py": [5, 21, 19, 6],
        "pz": [1, -1, -1, -1],
        "nx": [21, 10, 5, 11],
        "ny": [4, 2, 3, 4],
        "nz": [0, 1, 2, 1]
      }, {
        "size": 2,
        "px": [4, 17],
        "py": [3, 8],
        "pz": [2, 0],
        "nx": [17, 2],
        "ny": [9, 22],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [17, 12],
        "py": [14, 20],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 12],
        "py": [9, 20],
        "pz": [0, -1],
        "nx": [11, 23],
        "ny": [8, 18],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [5, 11],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [8, 15],
        "ny": [7, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 15],
        "py": [13, 8],
        "pz": [0, -1],
        "nx": [11, 11],
        "ny": [6, 7],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 15],
        "py": [14, 8],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [12, 13],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [0, 1],
        "pz": [2, 2],
        "nx": [15, 4],
        "ny": [5, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 17],
        "py": [2, 2],
        "pz": [0, 0],
        "nx": [20, 8],
        "ny": [3, 7],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [6, 3, 2],
        "py": [10, 6, 1],
        "pz": [0, -1, -1],
        "nx": [4, 3, 2],
        "ny": [3, 4, 2],
        "nz": [1, 1, 2]
      }, {
        "size": 2,
        "px": [10, 6],
        "py": [4, 6],
        "pz": [0, -1],
        "nx": [6, 13],
        "ny": [0, 1],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [8, 2],
        "ny": [7, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 1],
        "py": [12, 4],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [5, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [11, 15],
        "py": [15, 14],
        "pz": [0, -1],
        "nx": [3, 11],
        "ny": [4, 13],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [13, 9, 11, 14, 12],
        "py": [0, 2, 0, 0, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [5, 4, 4, 3, 4],
        "ny": [4, 4, 18, 7, 17],
        "nz": [1, 1, 0, 1, 0]
      }, {
        "size": 3,
        "px": [13, 12, 11],
        "py": [22, 22, 22],
        "pz": [0, 0, 0],
        "nx": [11, 12, 13],
        "ny": [20, 20, 20],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [6, 13],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [7, 6],
        "ny": [8, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [23, 4],
        "pz": [0, -1],
        "nx": [5, 9],
        "ny": [1, 1],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [14, 14],
        "py": [19, 19],
        "pz": [0, -1],
        "nx": [11, 11],
        "ny": [10, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [23, 23],
        "py": [11, 9],
        "pz": [0, 0],
        "nx": [23, 23],
        "ny": [0, 11],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [23, 3],
        "py": [23, 5],
        "pz": [0, -1],
        "nx": [4, 1],
        "ny": [23, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [9, 1],
        "py": [7, 4],
        "pz": [1, -1],
        "nx": [19, 10],
        "ny": [20, 9],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [16, 1],
        "py": [9, 4],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [3, 3],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [7, 6],
        "py": [13, 13],
        "pz": [0, 0],
        "nx": [4, 5],
        "ny": [4, 11],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [19, 20, 20, 10, 10],
        "py": [0, 0, 2, 0, 1],
        "pz": [0, 0, 0, 1, 1],
        "nx": [7, 7, 15, 4, 4],
        "ny": [4, 13, 7, 4, 4],
        "nz": [1, 0, 0, 1, -1]
      }, {
        "size": 2,
        "px": [12, 23],
        "py": [6, 5],
        "pz": [0, -1],
        "nx": [18, 18],
        "ny": [17, 16],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [9, 2],
        "pz": [1, 2],
        "nx": [14, 18],
        "ny": [9, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 13],
        "py": [16, 5],
        "pz": [0, -1],
        "nx": [5, 4],
        "ny": [7, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [8, 10],
        "pz": [1, 1],
        "nx": [4, 1],
        "ny": [5, 3],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [12, 11],
        "py": [13, 4],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [14, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [20, 17],
        "pz": [0, 0],
        "nx": [12, 12],
        "ny": [22, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [6, 7],
        "pz": [1, -1],
        "nx": [21, 21],
        "ny": [13, 12],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 10],
        "py": [4, 23],
        "pz": [2, 0],
        "nx": [10, 2],
        "ny": [21, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [3, 6],
        "pz": [1, 0],
        "nx": [11, 0],
        "ny": [17, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [21, 9],
        "pz": [0, -1],
        "nx": [2, 3],
        "ny": [18, 22],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [13, 5],
        "py": [18, 9],
        "pz": [0, -1],
        "nx": [6, 7],
        "ny": [8, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [21, 4],
        "py": [16, 3],
        "pz": [0, -1],
        "nx": [23, 23],
        "ny": [16, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 0],
        "py": [7, 4],
        "pz": [1, -1],
        "nx": [3, 8],
        "ny": [7, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [15, 16],
        "py": [11, 12],
        "pz": [0, 0],
        "nx": [8, 5],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [7, 5],
        "pz": [0, 0],
        "nx": [17, 17],
        "ny": [11, 10],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [8, 13, 12, 3, 3],
        "py": [6, 23, 23, 3, 3],
        "pz": [1, 0, 0, 2, -1],
        "nx": [0, 1, 0, 0, 0],
        "ny": [2, 13, 4, 5, 6],
        "nz": [2, 0, 1, 1, 1]
      }, {
        "size": 2,
        "px": [0, 1],
        "py": [7, 8],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [1, 0],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [2, 12],
        "py": [1, 7],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [12, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 1],
        "py": [7, 4],
        "pz": [1, 2],
        "nx": [8, 0],
        "ny": [15, 14],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [14, 8],
        "pz": [0, -1],
        "nx": [2, 4],
        "ny": [1, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [3, 1],
        "pz": [2, -1],
        "nx": [9, 9],
        "ny": [5, 6],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [2, 3],
        "pz": [1, -1],
        "nx": [11, 12],
        "ny": [23, 23],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [22, 22],
        "ny": [19, 18],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [10, 2, 9],
        "py": [20, 9, 4],
        "pz": [0, -1, -1],
        "nx": [1, 10, 11],
        "ny": [2, 11, 9],
        "nz": [2, 0, 0]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [9, 3],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 6],
        "py": [7, 16],
        "pz": [0, -1],
        "nx": [17, 17],
        "ny": [9, 6],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [8, 1, 9],
        "py": [6, 3, 4],
        "pz": [1, -1, -1],
        "nx": [2, 9, 2],
        "ny": [5, 13, 3],
        "nz": [2, 0, 2]
      }, {
        "size": 4,
        "px": [10, 10, 9, 2],
        "py": [12, 11, 2, 10],
        "pz": [0, 0, -1, -1],
        "nx": [6, 11, 3, 13],
        "ny": [2, 4, 1, 4],
        "nz": [1, 0, 2, 0]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [4, 3],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [4, 8],
        "pz": [2, 1],
        "nx": [4, 4],
        "ny": [15, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 0],
        "py": [4, 8],
        "pz": [1, -1],
        "nx": [13, 13],
        "ny": [9, 10],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [2, 1],
        "pz": [1, 2],
        "nx": [8, 17],
        "ny": [4, 12],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [15, 16],
        "py": [11, 6],
        "pz": [0, 0],
        "nx": [16, 17],
        "ny": [5, 12],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 11],
        "py": [9, 7],
        "pz": [0, -1],
        "nx": [0, 1],
        "ny": [9, 20],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [16, 11, 20],
        "py": [4, 7, 23],
        "pz": [0, -1, -1],
        "nx": [8, 9, 4],
        "ny": [4, 6, 4],
        "nz": [1, 1, 2]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [18, 17],
        "pz": [0, 0],
        "nx": [9, 6],
        "ny": [7, 11],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [4, 4, 19],
        "py": [3, 2, 9],
        "pz": [2, 2, 0],
        "nx": [2, 14, 11],
        "ny": [5, 3, 9],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 19],
        "py": [13, 9],
        "pz": [0, -1],
        "nx": [11, 11],
        "ny": [4, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [13, 7],
        "py": [19, 2],
        "pz": [0, -1],
        "nx": [3, 5],
        "ny": [6, 12],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [9, 4, 4, 2],
        "py": [13, 9, 8, 4],
        "pz": [0, 1, 1, 2],
        "nx": [13, 0, 0, 14],
        "ny": [18, 11, 6, 1],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 15],
        "py": [8, 10],
        "pz": [0, 0],
        "nx": [14, 11],
        "ny": [9, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [8, 5],
        "pz": [1, 2],
        "nx": [4, 4],
        "ny": [10, 10],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [4, 6, 16, 14],
        "py": [1, 1, 1, 7],
        "pz": [2, 1, 0, 0],
        "nx": [10, 1, 1, 2],
        "ny": [8, 5, 10, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 4,
        "px": [2, 3, 1, 2],
        "py": [3, 1, 0, 2],
        "pz": [0, 0, 1, 0],
        "nx": [0, 0, 0, 0],
        "ny": [1, 1, 2, 0],
        "nz": [0, 1, 0, 1]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [6, 7],
        "pz": [1, 1],
        "nx": [8, 0],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [3, 0],
        "pz": [0, 1],
        "nx": [2, 2],
        "ny": [1, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 6],
        "py": [19, 18],
        "pz": [0, 0],
        "nx": [2, 10],
        "ny": [5, 8],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [8, 5],
        "py": [21, 11],
        "pz": [0, -1],
        "nx": [3, 2],
        "ny": [11, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [4, 9],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [8, 7],
        "ny": [10, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [4, 18, 19, 16, 19],
        "py": [3, 12, 12, 23, 13],
        "pz": [2, 0, 0, 0, 0],
        "nx": [2, 8, 3, 2, 2],
        "ny": [4, 23, 10, 5, 5],
        "nz": [2, 0, 1, 2, -1]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [6, 11],
        "pz": [1, 0],
        "nx": [8, 3],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 12],
        "py": [4, 13],
        "pz": [2, 0],
        "nx": [10, 5],
        "ny": [15, 21],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 9],
        "py": [4, 23],
        "pz": [2, 0],
        "nx": [19, 4],
        "ny": [9, 3],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [8, 15],
        "pz": [1, 0],
        "nx": [6, 1],
        "ny": [18, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 0],
        "py": [20, 3],
        "pz": [0, -1],
        "nx": [2, 10],
        "ny": [5, 17],
        "nz": [2, 0]
      }, {
        "size": 3,
        "px": [10, 6, 3],
        "py": [2, 7, 3],
        "pz": [0, -1, -1],
        "nx": [5, 4, 2],
        "ny": [9, 7, 2],
        "nz": [1, 1, 2]
      }, {
        "size": 2,
        "px": [14, 6],
        "py": [12, 7],
        "pz": [0, -1],
        "nx": [2, 10],
        "ny": [0, 1],
        "nz": [2, 0]
      }, {
        "size": 3,
        "px": [10, 5, 1],
        "py": [15, 5, 4],
        "pz": [0, -1, -1],
        "nx": [9, 4, 18],
        "ny": [2, 0, 4],
        "nz": [1, 2, 0]
      }, {
        "size": 2,
        "px": [17, 2],
        "py": [12, 6],
        "pz": [0, -1],
        "nx": [8, 16],
        "ny": [4, 11],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [7, 13, 4],
        "py": [0, 0, 1],
        "pz": [1, 0, -1],
        "nx": [18, 4, 4],
        "ny": [13, 2, 3],
        "nz": [0, 2, 2]
      }, {
        "size": 2,
        "px": [1, 11],
        "py": [10, 6],
        "pz": [0, -1],
        "nx": [0, 1],
        "ny": [15, 17],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [9, 12, 8],
        "py": [8, 17, 11],
        "pz": [1, 0, 1],
        "nx": [12, 0, 20],
        "ny": [16, 9, 13],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [5, 8],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [16, 3],
        "py": [9, 8],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [11, 5],
        "pz": [1, 2],
        "nx": [11, 5],
        "ny": [21, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 13],
        "py": [1, 1],
        "pz": [0, 0],
        "nx": [4, 4],
        "ny": [5, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [14, 4],
        "py": [4, 3],
        "pz": [0, -1],
        "nx": [12, 10],
        "ny": [2, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [2, 4],
        "pz": [2, 1],
        "nx": [9, 7],
        "ny": [9, 7],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [5, 6, 6],
        "py": [4, 4, 4],
        "pz": [1, -1, -1],
        "nx": [13, 8, 7],
        "ny": [8, 3, 4],
        "nz": [0, 1, 1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [2, 11],
        "pz": [1, 1],
        "nx": [10, 11],
        "ny": [22, 22],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [16, 9],
        "py": [13, 7],
        "pz": [0, 1],
        "nx": [8, 14],
        "ny": [4, 12],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 5],
        "py": [13, 3],
        "pz": [0, 2],
        "nx": [16, 22],
        "ny": [13, 6],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [4, 4, 3, 4],
        "py": [4, 3, 4, 5],
        "pz": [2, 2, 2, 2],
        "nx": [21, 5, 17, 7],
        "ny": [0, 2, 5, 23],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 16],
        "py": [0, 1],
        "pz": [2, 0],
        "nx": [15, 1],
        "ny": [23, 10],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 6],
        "py": [11, 2],
        "pz": [0, -1],
        "nx": [15, 6],
        "ny": [2, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [2, 1],
        "pz": [1, 2],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [13, 14, 5],
        "py": [9, 15, 2],
        "pz": [0, -1, -1],
        "nx": [11, 1, 11],
        "ny": [10, 3, 11],
        "nz": [0, 1, 0]
      }, {
        "size": 2,
        "px": [5, 1],
        "py": [6, 2],
        "pz": [1, -1],
        "nx": [1, 1],
        "ny": [2, 5],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [1, 0],
        "pz": [1, 2],
        "nx": [10, 4],
        "ny": [2, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [8, 9],
        "pz": [1, 1],
        "nx": [23, 4],
        "ny": [23, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [10, 2],
        "pz": [0, -1],
        "nx": [18, 10],
        "ny": [0, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [20, 4],
        "py": [7, 3],
        "pz": [0, 2],
        "nx": [8, 4],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [5, 4],
        "pz": [1, -1],
        "nx": [11, 11],
        "ny": [5, 6],
        "nz": [1, 1]
      }, {
        "size": 3,
        "px": [14, 15, 16],
        "py": [0, 0, 1],
        "pz": [0, 0, 0],
        "nx": [8, 5, 15],
        "ny": [7, 2, 10],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [1, 1],
        "pz": [2, -1],
        "nx": [17, 18],
        "ny": [2, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [13, 8],
        "py": [15, 7],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [5, 2],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [4, 0],
        "py": [6, 17],
        "pz": [1, -1],
        "nx": [3, 2],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [14, 8],
        "py": [17, 9],
        "pz": [0, -1],
        "nx": [7, 6],
        "ny": [8, 8],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [15, 6],
        "ny": [14, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [3, 12],
        "py": [8, 19],
        "pz": [1, 0],
        "nx": [13, 10],
        "ny": [17, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 12],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [6, 11],
        "ny": [3, 2],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [2, 1, 6, 1],
        "py": [10, 3, 23, 8],
        "pz": [1, 2, 0, 1],
        "nx": [17, 10, 23, 0],
        "ny": [9, 2, 20, 3],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [2, 8],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [4, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [3, 16],
        "py": [1, 6],
        "pz": [2, 0],
        "nx": [8, 4],
        "ny": [2, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [1, 2],
        "pz": [2, 1],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [3, 0],
        "pz": [2, -1],
        "nx": [9, 5],
        "ny": [2, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [3, 16],
        "py": [5, 23],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [6, 3],
        "nz": [1, 2]
      }, {
        "size": 4,
        "px": [0, 0, 0, 0],
        "py": [3, 2, 12, 5],
        "pz": [2, 2, 0, 1],
        "nx": [2, 3, 2, 13],
        "ny": [5, 5, 2, 19],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [10, 11],
        "pz": [0, 0],
        "nx": [5, 5],
        "ny": [1, 1],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [0, 4],
        "pz": [2, -1],
        "nx": [2, 2],
        "ny": [10, 8],
        "nz": [1, 1]
      }, {
        "size": 4,
        "px": [16, 2, 8, 4],
        "py": [14, 0, 11, 5],
        "pz": [0, -1, -1, -1],
        "nx": [18, 14, 7, 7],
        "ny": [13, 14, 8, 6],
        "nz": [0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [8, 9],
        "py": [2, 2],
        "pz": [0, 0],
        "nx": [5, 14],
        "ny": [4, 14],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 5],
        "py": [11, 20],
        "pz": [1, 0],
        "nx": [11, 4],
        "ny": [0, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [3, 4],
        "pz": [2, 2],
        "nx": [3, 4],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [10, 4, 3],
        "py": [5, 5, 3],
        "pz": [0, -1, -1],
        "nx": [11, 3, 10],
        "ny": [2, 0, 2],
        "nz": [0, 2, 0]
      }, {
        "size": 2,
        "px": [15, 15],
        "py": [1, 1],
        "pz": [0, -1],
        "nx": [7, 4],
        "ny": [5, 2],
        "nz": [1, 2]
      }, {
        "size": 4,
        "px": [9, 5, 2, 6],
        "py": [22, 8, 4, 19],
        "pz": [0, 1, 2, 0],
        "nx": [9, 5, 0, 3],
        "ny": [20, 5, 22, 4],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 3,
        "px": [1, 4, 10],
        "py": [3, 9, 12],
        "pz": [2, 1, 0],
        "nx": [0, 10, 0],
        "ny": [0, 5, 0],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [1, 6],
        "py": [0, 7],
        "pz": [0, -1],
        "nx": [20, 19],
        "ny": [14, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [14, 15],
        "pz": [0, -1],
        "nx": [2, 1],
        "ny": [5, 7],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [17, 7],
        "py": [9, 11],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [17, 9],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [15, 10],
        "ny": [9, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [0, 1],
        "pz": [2, 2],
        "nx": [9, 7],
        "ny": [6, 17],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [3, 3, 15],
        "py": [3, 4, 6],
        "pz": [2, 1, 0],
        "nx": [0, 2, 22],
        "ny": [5, 8, 9],
        "nz": [0, -1, -1]
      }, {
        "size": 4,
        "px": [15, 15, 15, 1],
        "py": [12, 6, 6, 1],
        "pz": [0, -1, -1, -1],
        "nx": [4, 7, 13, 4],
        "ny": [4, 7, 12, 2],
        "nz": [2, 1, 0, 2]
      }, {
        "size": 2,
        "px": [3, 15],
        "py": [12, 6],
        "pz": [0, -1],
        "nx": [9, 1],
        "ny": [14, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [12, 12],
        "py": [11, 12],
        "pz": [0, 0],
        "nx": [9, 5],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [23, 6, 7],
        "py": [23, 3, 4],
        "pz": [0, -1, -1],
        "nx": [19, 16, 17],
        "ny": [17, 14, 15],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [2, 7],
        "pz": [1, -1],
        "nx": [11, 23],
        "ny": [10, 18],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [0, 0, 0],
        "py": [4, 9, 2],
        "pz": [1, 0, 2],
        "nx": [2, 0, 0],
        "ny": [9, 2, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [12, 0],
        "py": [11, 9],
        "pz": [0, -1],
        "nx": [1, 0],
        "ny": [18, 5],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [10, 6],
        "pz": [0, 1],
        "nx": [10, 6],
        "ny": [10, 18],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 12],
        "py": [13, 13],
        "pz": [0, -1],
        "nx": [5, 11],
        "ny": [1, 3],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [10, 19],
        "py": [5, 22],
        "pz": [1, -1],
        "nx": [4, 12],
        "ny": [1, 5],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [8, 6],
        "py": [0, 0],
        "pz": [0, 0],
        "nx": [3, 12],
        "ny": [0, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 6],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [12, 12],
        "ny": [10, 11],
        "nz": [0, 0]
      }, {
        "size": 4,
        "px": [3, 1, 3, 2],
        "py": [20, 9, 21, 19],
        "pz": [0, 1, 0, 0],
        "nx": [20, 20, 5, 12],
        "ny": [10, 15, 2, 10],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 1],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [5, 11, 11],
        "py": [1, 3, 4],
        "pz": [2, 1, 1],
        "nx": [3, 3, 7],
        "ny": [5, 5, 0],
        "nz": [1, -1, -1]
      }, {
        "size": 3,
        "px": [8, 6, 7],
        "py": [10, 5, 6],
        "pz": [1, 1, 1],
        "nx": [23, 3, 7],
        "ny": [0, 5, 0],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [2, 7],
        "py": [2, 14],
        "pz": [1, -1],
        "nx": [7, 3],
        "ny": [12, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [13, 3],
        "ny": [12, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 18],
        "py": [11, 4],
        "pz": [0, -1],
        "nx": [23, 11],
        "ny": [19, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [12, 3],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [11, 5],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [0, 11],
        "pz": [1, -1],
        "nx": [3, 3],
        "ny": [19, 18],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [11, 11],
        "pz": [1, -1],
        "nx": [13, 15],
        "ny": [6, 5],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [9, 9],
        "pz": [0, -1],
        "nx": [5, 11],
        "ny": [1, 3],
        "nz": [2, 1]
      }, {
        "size": 4,
        "px": [6, 4, 8, 3],
        "py": [6, 2, 4, 3],
        "pz": [0, 2, 1, 2],
        "nx": [7, 0, 15, 8],
        "ny": [8, 8, 16, 7],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [22, 20],
        "pz": [0, 0],
        "nx": [2, 8],
        "ny": [5, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [11, 0],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [3, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [12, 7],
        "pz": [0, 1],
        "nx": [3, 1],
        "ny": [23, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 0],
        "py": [11, 5],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [2, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [10, 10],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [5, 4],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [2, 4],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [3, 5],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [23, 22],
        "pz": [0, 0],
        "nx": [9, 0],
        "ny": [7, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [16, 15],
        "pz": [0, 0],
        "nx": [0, 14],
        "ny": [23, 12],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 8],
        "py": [22, 0],
        "pz": [0, -1],
        "nx": [5, 3],
        "ny": [0, 1],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [13, 13],
        "py": [7, 7],
        "pz": [0, -1],
        "nx": [3, 2],
        "ny": [17, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [20, 20],
        "py": [15, 16],
        "pz": [0, 0],
        "nx": [7, 3],
        "ny": [9, 17],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [10, 12, 11, 13, 11],
        "py": [2, 2, 1, 2, 2],
        "pz": [0, 0, 0, 0, 0],
        "nx": [10, 18, 21, 21, 19],
        "ny": [3, 1, 13, 11, 2],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [16, 3],
        "py": [6, 1],
        "pz": [0, 2],
        "nx": [15, 18],
        "ny": [8, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [19, 3],
        "py": [8, 1],
        "pz": [0, -1],
        "nx": [9, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 3],
        "py": [15, 18],
        "pz": [0, -1],
        "nx": [3, 3],
        "ny": [0, 1],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [2, 3],
        "pz": [2, 2],
        "nx": [7, 3],
        "ny": [11, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [17, 9],
        "pz": [0, -1],
        "nx": [11, 10],
        "ny": [15, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 10],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 10],
        "py": [3, 4],
        "pz": [0, -1],
        "nx": [9, 10],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [23, 11],
        "py": [13, 10],
        "pz": [0, 1],
        "nx": [14, 7],
        "ny": [5, 14],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [5, 4],
        "pz": [2, 2],
        "nx": [9, 8],
        "ny": [3, 3],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [12, 4, 15],
        "py": [5, 4, 7],
        "pz": [0, -1, -1],
        "nx": [3, 4, 2],
        "ny": [7, 11, 5],
        "nz": [1, 1, 2]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [15, 4],
        "pz": [0, -1],
        "nx": [5, 9],
        "ny": [7, 15],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [9, 7],
        "py": [0, 1],
        "pz": [1, -1],
        "nx": [11, 11],
        "ny": [8, 7],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [1, 1, 1, 1, 1],
        "py": [11, 12, 10, 9, 9],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 5, 8, 16, 11],
        "ny": [4, 3, 8, 8, 6],
        "nz": [1, 1, 0, 0, 0]
      }],
      "alpha": [-1.059083e+00, 1.059083e+00, -7.846122e-01, 7.846122e-01, -4.451160e-01, 4.451160e-01, -4.483277e-01, 4.483277e-01, -3.905999e-01, 3.905999e-01, -3.789250e-01, 3.789250e-01, -3.874610e-01, 3.874610e-01, -3.110541e-01, 3.110541e-01, -3.565056e-01, 3.565056e-01, -3.812617e-01, 3.812617e-01, -3.325142e-01, 3.325142e-01, -2.787282e-01, 2.787282e-01, -3.238869e-01, 3.238869e-01, -2.993499e-01, 2.993499e-01, -2.807737e-01, 2.807737e-01, -2.855285e-01, 2.855285e-01, -2.277550e-01, 2.277550e-01, -2.031261e-01, 2.031261e-01, -2.071574e-01, 2.071574e-01, -2.534142e-01, 2.534142e-01, -2.266871e-01, 2.266871e-01, -2.229078e-01, 2.229078e-01, -2.716325e-01, 2.716325e-01, -3.046938e-01, 3.046938e-01, -2.271601e-01, 2.271601e-01, -1.987651e-01, 1.987651e-01, -1.953664e-01, 1.953664e-01, -2.178737e-01, 2.178737e-01, -2.285148e-01, 2.285148e-01, -1.891073e-01, 1.891073e-01, -2.926469e-01, 2.926469e-01, -2.094783e-01, 2.094783e-01, -1.478037e-01, 1.478037e-01, -1.707579e-01, 1.707579e-01, -1.464390e-01, 1.464390e-01, -2.462321e-01, 2.462321e-01, -2.319978e-01, 2.319978e-01, -1.781651e-01, 1.781651e-01, -1.471349e-01, 1.471349e-01, -1.953006e-01, 1.953006e-01, -2.145108e-01, 2.145108e-01, -1.567881e-01, 1.567881e-01, -2.024617e-01, 2.024617e-01, -1.883198e-01, 1.883198e-01, -1.996976e-01, 1.996976e-01, -1.292330e-01, 1.292330e-01, -2.142242e-01, 2.142242e-01, -2.473748e-01, 2.473748e-01, -1.880902e-01, 1.880902e-01, -1.874572e-01, 1.874572e-01, -1.495984e-01, 1.495984e-01, -1.608525e-01, 1.608525e-01, -1.698402e-01, 1.698402e-01, -1.898871e-01, 1.898871e-01, -1.350238e-01, 1.350238e-01, -1.727032e-01, 1.727032e-01, -1.593352e-01, 1.593352e-01, -1.476968e-01, 1.476968e-01, -1.428431e-01, 1.428431e-01, -1.766261e-01, 1.766261e-01, -1.453226e-01, 1.453226e-01, -1.929885e-01, 1.929885e-01, -1.337582e-01, 1.337582e-01, -1.629078e-01, 1.629078e-01, -9.973085e-02, 9.973085e-02, -1.172760e-01, 1.172760e-01, -1.399242e-01, 1.399242e-01, -1.613189e-01, 1.613189e-01, -1.145695e-01, 1.145695e-01, -1.191093e-01, 1.191093e-01, -1.225900e-01, 1.225900e-01, -1.641114e-01, 1.641114e-01, -1.419878e-01, 1.419878e-01, -2.183465e-01, 2.183465e-01, -1.566968e-01, 1.566968e-01, -1.288216e-01, 1.288216e-01, -1.422831e-01, 1.422831e-01, -2.000107e-01, 2.000107e-01, -1.817265e-01, 1.817265e-01, -1.793796e-01, 1.793796e-01, -1.428926e-01, 1.428926e-01, -1.182032e-01, 1.182032e-01, -1.150421e-01, 1.150421e-01, -1.336584e-01, 1.336584e-01, -1.656178e-01, 1.656178e-01, -1.386549e-01, 1.386549e-01, -1.387461e-01, 1.387461e-01, -1.313023e-01, 1.313023e-01, -1.360391e-01, 1.360391e-01, -1.305505e-01, 1.305505e-01, -1.323399e-01, 1.323399e-01, -1.502891e-01, 1.502891e-01, -1.488859e-01, 1.488859e-01, -1.126628e-01, 1.126628e-01, -1.233623e-01, 1.233623e-01, -1.702106e-01, 1.702106e-01, -1.629639e-01, 1.629639e-01, -1.337706e-01, 1.337706e-01, -1.290384e-01, 1.290384e-01, -1.165519e-01, 1.165519e-01, -1.412778e-01, 1.412778e-01, -1.470204e-01, 1.470204e-01, -2.213780e-01, 2.213780e-01, -1.472619e-01, 1.472619e-01, -1.357071e-01, 1.357071e-01, -1.416513e-01, 1.416513e-01, -1.050208e-01, 1.050208e-01, -1.480033e-01, 1.480033e-01, -1.899871e-01, 1.899871e-01, -1.466249e-01, 1.466249e-01, -1.076952e-01, 1.076952e-01, -1.035096e-01, 1.035096e-01, -1.566970e-01, 1.566970e-01, -1.364115e-01, 1.364115e-01, -1.512889e-01, 1.512889e-01, -1.252851e-01, 1.252851e-01, -1.206300e-01, 1.206300e-01, -1.059134e-01, 1.059134e-01, -1.140398e-01, 1.140398e-01, -1.359912e-01, 1.359912e-01, -1.231201e-01, 1.231201e-01, -1.231867e-01, 1.231867e-01, -9.789923e-02, 9.789923e-02, -1.590213e-01, 1.590213e-01, -1.002206e-01, 1.002206e-01, -1.518339e-01, 1.518339e-01, -1.055203e-01, 1.055203e-01, -1.012579e-01, 1.012579e-01, -1.094956e-01, 1.094956e-01, -1.429592e-01, 1.429592e-01, -1.108838e-01, 1.108838e-01, -1.116475e-01, 1.116475e-01, -1.735371e-01, 1.735371e-01, -1.067758e-01, 1.067758e-01, -1.290406e-01, 1.290406e-01, -1.156822e-01, 1.156822e-01, -9.668217e-02, 9.668217e-02, -1.170053e-01, 1.170053e-01, -1.252092e-01, 1.252092e-01, -1.135158e-01, 1.135158e-01, -1.105896e-01, 1.105896e-01, -1.038175e-01, 1.038175e-01, -1.210459e-01, 1.210459e-01, -1.078878e-01, 1.078878e-01, -1.050808e-01, 1.050808e-01, -1.428227e-01, 1.428227e-01, -1.664600e-01, 1.664600e-01, -1.013508e-01, 1.013508e-01, -1.206930e-01, 1.206930e-01, -1.088972e-01, 1.088972e-01, -1.381026e-01, 1.381026e-01, -1.109115e-01, 1.109115e-01, -7.921549e-02, 7.921549e-02, -1.057832e-01, 1.057832e-01, -9.385827e-02, 9.385827e-02, -1.486035e-01, 1.486035e-01, -1.247401e-01, 1.247401e-01, -9.451327e-02, 9.451327e-02, -1.272805e-01, 1.272805e-01, -9.616206e-02, 9.616206e-02, -9.051084e-02, 9.051084e-02, -1.138458e-01, 1.138458e-01, -1.047581e-01, 1.047581e-01, -1.382394e-01, 1.382394e-01, -1.122203e-01, 1.122203e-01, -1.052936e-01, 1.052936e-01, -1.239318e-01, 1.239318e-01, -1.241439e-01, 1.241439e-01, -1.259012e-01, 1.259012e-01, -1.211701e-01, 1.211701e-01, -1.344131e-01, 1.344131e-01, -1.127778e-01, 1.127778e-01, -1.609745e-01, 1.609745e-01, -1.901382e-01, 1.901382e-01, -1.618962e-01, 1.618962e-01, -1.230398e-01, 1.230398e-01, -1.319311e-01, 1.319311e-01, -1.431410e-01, 1.431410e-01, -1.143306e-01, 1.143306e-01, -9.390938e-02, 9.390938e-02, -1.154161e-01, 1.154161e-01, -1.141205e-01, 1.141205e-01, -1.098048e-01, 1.098048e-01, -8.870072e-02, 8.870072e-02, -1.122444e-01, 1.122444e-01, -1.114147e-01, 1.114147e-01, -1.185710e-01, 1.185710e-01, -1.107775e-01, 1.107775e-01, -1.259167e-01, 1.259167e-01, -1.105176e-01, 1.105176e-01, -1.020691e-01, 1.020691e-01, -9.607863e-02, 9.607863e-02, -9.573700e-02, 9.573700e-02, -1.054349e-01, 1.054349e-01, -1.137856e-01, 1.137856e-01, -1.192043e-01, 1.192043e-01, -1.113264e-01, 1.113264e-01, -1.093137e-01, 1.093137e-01, -1.010919e-01, 1.010919e-01, -9.625901e-02, 9.625901e-02, -9.338459e-02, 9.338459e-02, -1.142944e-01, 1.142944e-01, -1.038877e-01, 1.038877e-01, -9.772862e-02, 9.772862e-02, -1.375298e-01, 1.375298e-01, -1.394776e-01, 1.394776e-01, -9.454765e-02, 9.454765e-02, -1.203246e-01, 1.203246e-01, -8.684943e-02, 8.684943e-02, -1.135622e-01, 1.135622e-01, -1.058181e-01, 1.058181e-01, -1.082152e-01, 1.082152e-01, -1.411355e-01, 1.411355e-01, -9.978846e-02, 9.978846e-02, -1.057874e-01, 1.057874e-01, -1.415366e-01, 1.415366e-01, -9.981014e-02, 9.981014e-02, -9.261151e-02, 9.261151e-02, -1.737173e-01, 1.737173e-01, -1.580335e-01, 1.580335e-01, -9.594668e-02, 9.594668e-02, -9.336013e-02, 9.336013e-02, -1.102373e-01, 1.102373e-01, -8.546557e-02, 8.546557e-02, -9.945057e-02, 9.945057e-02, -1.146358e-01, 1.146358e-01, -1.324734e-01, 1.324734e-01, -1.422296e-01, 1.422296e-01, -9.937990e-02, 9.937990e-02, -8.381049e-02, 8.381049e-02, -1.270714e-01, 1.270714e-01, -1.091738e-01, 1.091738e-01, -1.314881e-01, 1.314881e-01, -1.085159e-01, 1.085159e-01, -9.247554e-02, 9.247554e-02, -8.121645e-02, 8.121645e-02, -1.059589e-01, 1.059589e-01, -8.307793e-02, 8.307793e-02, -1.033103e-01, 1.033103e-01, -1.056706e-01, 1.056706e-01, -1.032803e-01, 1.032803e-01, -1.266840e-01, 1.266840e-01, -9.341601e-02, 9.341601e-02, -7.683570e-02, 7.683570e-02, -1.030530e-01, 1.030530e-01, -1.051872e-01, 1.051872e-01, -9.114946e-02, 9.114946e-02, -1.329341e-01, 1.329341e-01, -9.270830e-02, 9.270830e-02, -1.141750e-01, 1.141750e-01, -9.889318e-02, 9.889318e-02, -8.856485e-02, 8.856485e-02, -1.054210e-01, 1.054210e-01, -1.092704e-01, 1.092704e-01, -8.729085e-02, 8.729085e-02, -1.141057e-01, 1.141057e-01, -1.530774e-01, 1.530774e-01, -8.129720e-02, 8.129720e-02, -1.143335e-01, 1.143335e-01, -1.175777e-01, 1.175777e-01, -1.371729e-01, 1.371729e-01, -1.394356e-01, 1.394356e-01, -1.016308e-01, 1.016308e-01, -1.125547e-01, 1.125547e-01, -9.672600e-02, 9.672600e-02, -1.036631e-01, 1.036631e-01, -8.702514e-02, 8.702514e-02, -1.264807e-01, 1.264807e-01, -1.465688e-01, 1.465688e-01, -8.781464e-02, 8.781464e-02, -8.552605e-02, 8.552605e-02, -1.145072e-01, 1.145072e-01, -1.378489e-01, 1.378489e-01, -1.013312e-01, 1.013312e-01, -1.020083e-01, 1.020083e-01, -1.015816e-01, 1.015816e-01, -8.407101e-02, 8.407101e-02, -8.296485e-02, 8.296485e-02, -8.033655e-02, 8.033655e-02, -9.003615e-02, 9.003615e-02, -7.504954e-02, 7.504954e-02, -1.224941e-01, 1.224941e-01, -9.347814e-02, 9.347814e-02, -9.555575e-02, 9.555575e-02, -9.810025e-02, 9.810025e-02, -1.237068e-01, 1.237068e-01, -1.283586e-01, 1.283586e-01, -1.082763e-01, 1.082763e-01, -1.018145e-01, 1.018145e-01, -1.175161e-01, 1.175161e-01, -1.252279e-01, 1.252279e-01, -1.370559e-01, 1.370559e-01, -9.941339e-02, 9.941339e-02, -8.506938e-02, 8.506938e-02, -1.260902e-01, 1.260902e-01, -1.014152e-01, 1.014152e-01, -9.728694e-02, 9.728694e-02, -9.374910e-02, 9.374910e-02, -9.587429e-02, 9.587429e-02, -9.516036e-02, 9.516036e-02, -7.375173e-02, 7.375173e-02, -9.332487e-02, 9.332487e-02, -9.020733e-02, 9.020733e-02, -1.133381e-01, 1.133381e-01, -1.542180e-01, 1.542180e-01, -9.692168e-02, 9.692168e-02, -7.960904e-02, 7.960904e-02, -8.947089e-02, 8.947089e-02, -7.830286e-02, 7.830286e-02, -9.900050e-02, 9.900050e-02, -1.041293e-01, 1.041293e-01, -9.572501e-02, 9.572501e-02, -8.230575e-02, 8.230575e-02, -9.194901e-02, 9.194901e-02, -1.076971e-01, 1.076971e-01, -1.027782e-01, 1.027782e-01, -1.028538e-01, 1.028538e-01, -1.013992e-01, 1.013992e-01, -9.087585e-02, 9.087585e-02, -1.100706e-01, 1.100706e-01, -1.094934e-01, 1.094934e-01, -1.107879e-01, 1.107879e-01, -1.026915e-01, 1.026915e-01, -1.017572e-01, 1.017572e-01, -7.984776e-02, 7.984776e-02, -9.015413e-02, 9.015413e-02, -1.299870e-01, 1.299870e-01, -9.164982e-02, 9.164982e-02, -1.062788e-01, 1.062788e-01, -1.160203e-01, 1.160203e-01, -8.858603e-02, 8.858603e-02, -9.762964e-02, 9.762964e-02, -1.070694e-01, 1.070694e-01, -9.549046e-02, 9.549046e-02, -1.533034e-01, 1.533034e-01, -8.663316e-02, 8.663316e-02, -9.303018e-02, 9.303018e-02, -9.853582e-02, 9.853582e-02, -9.733371e-02, 9.733371e-02, -1.048555e-01, 1.048555e-01, -9.056041e-02, 9.056041e-02, -7.552283e-02, 7.552283e-02, -8.780631e-02, 8.780631e-02, -1.123953e-01, 1.123953e-01, -1.452948e-01, 1.452948e-01, -1.156423e-01, 1.156423e-01, -8.701142e-02, 8.701142e-02, -9.713334e-02, 9.713334e-02, -9.970888e-02, 9.970888e-02, -8.614129e-02, 8.614129e-02, -7.459861e-02, 7.459861e-02, -9.253517e-02, 9.253517e-02, -9.570092e-02, 9.570092e-02, -9.485535e-02, 9.485535e-02, -1.148365e-01, 1.148365e-01, -1.063193e-01, 1.063193e-01, -9.986686e-02, 9.986686e-02, -7.523412e-02, 7.523412e-02, -1.005881e-01, 1.005881e-01, -8.249716e-02, 8.249716e-02, -1.055866e-01, 1.055866e-01, -1.343050e-01, 1.343050e-01, -1.371056e-01, 1.371056e-01, -9.604689e-02, 9.604689e-02, -1.224268e-01, 1.224268e-01, -9.211478e-02, 9.211478e-02, -1.108371e-01, 1.108371e-01, -1.100547e-01, 1.100547e-01, -8.938970e-02, 8.938970e-02, -8.655951e-02, 8.655951e-02, -7.085816e-02, 7.085816e-02, -8.101028e-02, 8.101028e-02, -8.338046e-02, 8.338046e-02, -8.309588e-02, 8.309588e-02, -9.090584e-02, 9.090584e-02, -8.124564e-02, 8.124564e-02, -9.367843e-02, 9.367843e-02, -1.011747e-01, 1.011747e-01, -9.885045e-02, 9.885045e-02, -8.944266e-02, 8.944266e-02, -8.453859e-02, 8.453859e-02, -8.308847e-02, 8.308847e-02, -1.367280e-01, 1.367280e-01, -1.295144e-01, 1.295144e-01, -1.063965e-01, 1.063965e-01, -7.752328e-02, 7.752328e-02, -9.681524e-02, 9.681524e-02, -7.862345e-02, 7.862345e-02, -8.767746e-02, 8.767746e-02, -9.198041e-02, 9.198041e-02, -9.686489e-02, 9.686489e-02]
    }, {
      "count": 564,
      "threshold": -4.517456e+00,
      "feature": [{
        "size": 5,
        "px": [15, 9, 8, 12, 11],
        "py": [3, 6, 3, 0, 8],
        "pz": [0, 1, 0, 0, 0],
        "nx": [6, 14, 9, 22, 23],
        "ny": [8, 7, 8, 17, 3],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [12, 13, 11, 14, 12],
        "py": [9, 4, 4, 4, 5],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 6, 10, 4, 15],
        "ny": [3, 8, 7, 10, 9],
        "nz": [1, 1, 0, 1, 0]
      }, {
        "size": 5,
        "px": [7, 5, 6, 8, 8],
        "py": [2, 13, 2, 1, 1],
        "pz": [0, 0, 0, 0, -1],
        "nx": [3, 0, 4, 1, 0],
        "ny": [4, 3, 10, 3, 13],
        "nz": [1, 1, 1, 0, 0]
      }, {
        "size": 5,
        "px": [11, 2, 2, 11, 16],
        "py": [9, 4, 2, 7, 11],
        "pz": [0, 2, 2, 0, 0],
        "nx": [8, 4, 1, 14, 0],
        "ny": [4, 4, 16, 5, 13],
        "nz": [1, 1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [14, 14],
        "py": [18, 18],
        "pz": [0, -1],
        "nx": [8, 13],
        "ny": [10, 16],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [15, 17, 16, 8, 18],
        "py": [1, 2, 1, 0, 2],
        "pz": [0, 0, 0, 1, 0],
        "nx": [21, 22, 22, 22, 22],
        "ny": [1, 5, 3, 4, 2],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [15, 4],
        "py": [23, 3],
        "pz": [0, 2],
        "nx": [7, 3],
        "ny": [10, 6],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [3, 6, 4, 3, 11],
        "py": [10, 11, 8, 3, 8],
        "pz": [1, 0, 1, 1, 0],
        "nx": [3, 5, 6, 3, 0],
        "ny": [4, 9, 9, 9, 0],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 3,
        "px": [11, 11, 2],
        "py": [11, 13, 16],
        "pz": [0, 0, -1],
        "nx": [10, 10, 9],
        "ny": [10, 11, 14],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [4, 5],
        "ny": [11, 11],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [10, 11, 13, 3, 12],
        "py": [3, 4, 3, 0, 1],
        "pz": [0, 0, 0, 2, 0],
        "nx": [14, 18, 20, 19, 15],
        "ny": [13, 1, 15, 2, 18],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 5,
        "px": [20, 14, 10, 12, 12],
        "py": [12, 12, 4, 10, 11],
        "pz": [0, 0, 1, 0, 0],
        "nx": [9, 2, 9, 9, 9],
        "ny": [4, 12, 5, 9, 14],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [3, 3, 3, 4, 2],
        "py": [15, 16, 14, 21, 12],
        "pz": [0, 0, 0, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [20, 10, 5, 21, 21],
        "nz": [0, 1, 2, 0, -1]
      }, {
        "size": 2,
        "px": [18, 8],
        "py": [16, 7],
        "pz": [0, 1],
        "nx": [14, 0],
        "ny": [8, 10],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [12, 4, 16, 1],
        "py": [14, 3, 8, 3],
        "pz": [0, -1, -1, -1],
        "nx": [14, 10, 20, 13],
        "ny": [13, 5, 16, 9],
        "nz": [0, 1, 0, 0]
      }, {
        "size": 5,
        "px": [3, 8, 2, 3, 3],
        "py": [7, 2, 1, 2, 4],
        "pz": [1, -1, -1, -1, -1],
        "nx": [1, 9, 2, 1, 1],
        "ny": [3, 14, 9, 7, 2],
        "nz": [1, 0, 1, 1, 1]
      }, {
        "size": 5,
        "px": [4, 1, 3, 2, 3],
        "py": [2, 1, 2, 4, 3],
        "pz": [0, 1, 0, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [3, 1, 2, 0, 0],
        "nz": [0, 1, 0, 2, -1]
      }, {
        "size": 4,
        "px": [4, 8, 7, 9],
        "py": [6, 11, 11, 10],
        "pz": [1, 0, 0, 0],
        "nx": [3, 10, 2, 20],
        "ny": [4, 4, 4, 8],
        "nz": [1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [1, 8],
        "py": [3, 11],
        "pz": [2, -1],
        "nx": [8, 2],
        "ny": [15, 5],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [17, 0],
        "py": [13, 10],
        "pz": [0, -1],
        "nx": [14, 14],
        "ny": [11, 10],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [22, 22, 22, 5, 22],
        "py": [16, 18, 17, 2, 15],
        "pz": [0, 0, 0, 2, 0],
        "nx": [8, 4, 15, 6, 6],
        "ny": [4, 2, 7, 11, 11],
        "nz": [1, 2, 0, 1, -1]
      }, {
        "size": 5,
        "px": [16, 9, 8, 17, 15],
        "py": [12, 6, 6, 22, 12],
        "pz": [0, 1, 1, 0, 0],
        "nx": [11, 23, 23, 23, 22],
        "ny": [11, 23, 22, 21, 23],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 5,
        "px": [5, 2, 4, 4, 9],
        "py": [22, 3, 15, 20, 18],
        "pz": [0, 2, 0, 0, 0],
        "nx": [9, 4, 23, 7, 22],
        "ny": [8, 4, 22, 19, 23],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 5,
        "px": [8, 6, 9, 7, 3],
        "py": [3, 3, 3, 3, 1],
        "pz": [0, 0, 0, 0, 1],
        "nx": [5, 5, 4, 4, 4],
        "ny": [0, 1, 1, 2, 0],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [3, 3],
        "pz": [2, 2],
        "nx": [3, 6],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [1, 1, 0, 1, 0],
        "py": [17, 15, 6, 16, 10],
        "pz": [0, 0, 1, 0, 0],
        "nx": [4, 4, 7, 4, 8],
        "ny": [2, 5, 9, 4, 4],
        "nz": [2, 2, 1, 2, -1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 13, 13],
        "py": [10, 9, 11, 13, 13],
        "pz": [0, 0, 0, 0, -1],
        "nx": [4, 3, 3, 5, 3],
        "ny": [21, 18, 17, 23, 16],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 4,
        "px": [5, 6, 5, 9],
        "py": [13, 7, 9, 23],
        "pz": [0, 0, 1, 0],
        "nx": [6, 15, 7, 5],
        "ny": [9, 20, 7, 23],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [4, 2],
        "pz": [1, 2],
        "nx": [8, 23],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 7],
        "py": [18, 0],
        "pz": [0, 0],
        "nx": [5, 7],
        "ny": [8, 10],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [4, 6],
        "py": [11, 16],
        "pz": [1, 0],
        "nx": [10, 9],
        "ny": [16, 7],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [11, 11, 11, 11],
        "py": [11, 10, 12, 13],
        "pz": [0, 0, 0, 0],
        "nx": [13, 13, 13, 9],
        "ny": [11, 9, 10, 4],
        "nz": [0, 0, 0, 1]
      }, {
        "size": 4,
        "px": [12, 6, 7, 6],
        "py": [7, 11, 8, 4],
        "pz": [0, 1, 1, 1],
        "nx": [10, 0, 19, 7],
        "ny": [21, 3, 12, 11],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [3, 4],
        "pz": [2, 2],
        "nx": [9, 1],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [19, 19],
        "py": [21, 20],
        "pz": [0, 0],
        "nx": [7, 7],
        "ny": [3, 13],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [12, 9, 13, 11, 5],
        "py": [0, 2, 2, 0, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [6, 4, 5, 5, 5],
        "ny": [1, 3, 5, 2, 6],
        "nz": [0, 0, 1, 0, 1]
      }, {
        "size": 5,
        "px": [4, 3, 2, 5, 7],
        "py": [11, 3, 3, 7, 17],
        "pz": [1, 2, 2, 0, 0],
        "nx": [23, 5, 11, 5, 5],
        "ny": [0, 4, 10, 2, 6],
        "nz": [0, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [20, 17],
        "py": [12, 3],
        "pz": [0, -1],
        "nx": [20, 19],
        "ny": [21, 23],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [12, 8],
        "pz": [0, 0],
        "nx": [2, 8],
        "ny": [2, 16],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [16, 5],
        "py": [4, 5],
        "pz": [0, -1],
        "nx": [7, 8],
        "ny": [9, 1],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [0, 1],
        "pz": [1, 1],
        "nx": [1, 8],
        "ny": [5, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [12, 10],
        "pz": [0, 1],
        "nx": [2, 20],
        "ny": [23, 9],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [11, 0, 0, 2],
        "py": [14, 3, 9, 22],
        "pz": [0, -1, -1, -1],
        "nx": [13, 14, 7, 3],
        "ny": [6, 7, 11, 1],
        "nz": [0, 0, 0, 2]
      }, {
        "size": 2,
        "px": [14, 0],
        "py": [2, 3],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [4, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [23, 11],
        "py": [18, 11],
        "pz": [0, 1],
        "nx": [3, 2],
        "ny": [1, 21],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [17, 14],
        "pz": [0, -1],
        "nx": [4, 5],
        "ny": [10, 8],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [9, 18],
        "py": [7, 14],
        "pz": [1, 0],
        "nx": [18, 9],
        "ny": [17, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 8],
        "py": [4, 22],
        "pz": [2, 0],
        "nx": [4, 3],
        "ny": [10, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 22],
        "py": [4, 9],
        "pz": [2, -1],
        "nx": [11, 23],
        "ny": [8, 14],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [23, 5, 5],
        "py": [8, 2, 1],
        "pz": [0, 2, 2],
        "nx": [10, 10, 2],
        "ny": [4, 4, 2],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [14, 23],
        "pz": [0, -1],
        "nx": [3, 11],
        "ny": [4, 13],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [4, 3],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [12, 1],
        "py": [19, 13],
        "pz": [0, -1],
        "nx": [9, 12],
        "ny": [10, 18],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [11, 10],
        "pz": [1, 1],
        "nx": [4, 1],
        "ny": [5, 11],
        "nz": [2, -1]
      }, {
        "size": 5,
        "px": [9, 12, 4, 8, 8],
        "py": [3, 5, 2, 9, 8],
        "pz": [1, 0, 2, 1, 1],
        "nx": [23, 23, 23, 23, 23],
        "ny": [3, 4, 6, 5, 5],
        "nz": [0, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 9],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [13, 13, 13, 7, 7],
        "py": [11, 10, 9, 6, 6],
        "pz": [0, 0, 0, 1, -1],
        "nx": [5, 5, 15, 5, 2],
        "ny": [5, 15, 9, 9, 1],
        "nz": [0, 0, 0, 1, 2]
      }, {
        "size": 2,
        "px": [19, 7],
        "py": [21, 7],
        "pz": [0, 1],
        "nx": [14, 10],
        "ny": [15, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [3, 4],
        "pz": [2, 2],
        "nx": [21, 0],
        "ny": [23, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 0],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [3, 2],
        "ny": [1, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [9, 0],
        "py": [4, 0],
        "pz": [0, -1],
        "nx": [5, 12],
        "ny": [0, 1],
        "nz": [1, 0]
      }, {
        "size": 5,
        "px": [14, 16, 12, 15, 13],
        "py": [0, 1, 0, 0, 0],
        "pz": [0, 0, 0, 0, 0],
        "nx": [4, 8, 8, 4, 9],
        "ny": [2, 3, 4, 1, 3],
        "nz": [2, 1, 1, 2, -1]
      }, {
        "size": 3,
        "px": [4, 17, 2],
        "py": [11, 14, 1],
        "pz": [1, -1, -1],
        "nx": [9, 8, 17],
        "ny": [1, 4, 0],
        "nz": [1, 1, 0]
      }, {
        "size": 2,
        "px": [18, 9],
        "py": [17, 7],
        "pz": [0, 1],
        "nx": [8, 4],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [3, 0],
        "pz": [1, 2],
        "nx": [10, 11],
        "ny": [6, 5],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [21, 21, 21, 21, 20],
        "py": [17, 16, 19, 18, 21],
        "pz": [0, 0, 0, 0, 0],
        "nx": [0, 0, 0, 0, 0],
        "ny": [4, 9, 11, 6, 6],
        "nz": [1, 0, 0, 1, -1]
      }, {
        "size": 2,
        "px": [12, 0],
        "py": [7, 1],
        "pz": [0, -1],
        "nx": [8, 11],
        "ny": [4, 17],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [13, 0, 0, 0],
        "py": [15, 0, 0, 0],
        "pz": [0, -1, -1, -1],
        "nx": [3, 7, 4, 6],
        "ny": [2, 7, 5, 9],
        "nz": [2, 1, 2, 1]
      }, {
        "size": 2,
        "px": [2, 9],
        "py": [3, 12],
        "pz": [2, 0],
        "nx": [2, 0],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 3],
        "py": [6, 1],
        "pz": [1, -1],
        "nx": [20, 21],
        "ny": [19, 14],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [5, 22, 22, 11, 22],
        "py": [1, 4, 3, 3, 2],
        "pz": [2, 0, 0, 1, -1],
        "nx": [7, 13, 14, 8, 15],
        "ny": [3, 6, 6, 3, 7],
        "nz": [1, 0, 0, 1, 0]
      }, {
        "size": 2,
        "px": [12, 19],
        "py": [5, 15],
        "pz": [0, -1],
        "nx": [16, 4],
        "ny": [8, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [11, 9],
        "pz": [1, 1],
        "nx": [5, 0],
        "ny": [3, 3],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [8, 3, 4, 2],
        "py": [6, 7, 5, 3],
        "pz": [1, -1, -1, -1],
        "nx": [13, 14, 11, 11],
        "ny": [11, 13, 3, 5],
        "nz": [0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [5, 6],
        "pz": [0, 0],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 9],
        "py": [6, 17],
        "pz": [1, 0],
        "nx": [9, 4],
        "ny": [15, 11],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [6, 3, 6],
        "py": [6, 3, 5],
        "pz": [1, 2, 1],
        "nx": [11, 10, 4],
        "ny": [8, 11, 5],
        "nz": [0, 0, -1]
      }, {
        "size": 2,
        "px": [8, 16],
        "py": [0, 1],
        "pz": [1, -1],
        "nx": [19, 17],
        "ny": [1, 0],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [21, 20],
        "py": [4, 1],
        "pz": [0, 0],
        "nx": [11, 5],
        "ny": [0, 0],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [8, 9],
        "ny": [4, 10],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 1],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [13, 12],
        "ny": [6, 5],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [3, 11],
        "pz": [1, -1],
        "nx": [3, 17],
        "ny": [1, 3],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [3, 3],
        "ny": [1, 1],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [3, 18],
        "py": [2, 7],
        "pz": [2, 0],
        "nx": [8, 1],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [16, 6],
        "py": [8, 2],
        "pz": [0, 1],
        "nx": [8, 9],
        "ny": [4, 19],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [12, 3, 14],
        "py": [13, 3, 15],
        "pz": [0, -1, -1],
        "nx": [0, 1, 0],
        "ny": [16, 18, 15],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [3, 1],
        "py": [3, 4],
        "pz": [2, -1],
        "nx": [7, 14],
        "ny": [10, 14],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [9, 16],
        "py": [6, 10],
        "pz": [1, 0],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 11],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [7, 23],
        "ny": [3, 11],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [2, 4, 3, 4, 4],
        "py": [1, 2, 0, 1, 1],
        "pz": [1, 0, 1, 0, -1],
        "nx": [11, 9, 4, 9, 5],
        "ny": [6, 5, 3, 6, 3],
        "nz": [0, 0, 1, 0, 1]
      }, {
        "size": 2,
        "px": [6, 0],
        "py": [14, 1],
        "pz": [0, -1],
        "nx": [2, 5],
        "ny": [2, 9],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [6, 7],
        "py": [7, 12],
        "pz": [0, 0],
        "nx": [3, 22],
        "ny": [3, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [1, 1],
        "pz": [0, 1],
        "nx": [2, 6],
        "ny": [2, 21],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [13, 1],
        "py": [11, 6],
        "pz": [0, -1],
        "nx": [12, 6],
        "ny": [5, 2],
        "nz": [0, 1]
      }, {
        "size": 5,
        "px": [10, 5, 11, 10, 10],
        "py": [4, 3, 4, 6, 5],
        "pz": [0, 1, 0, 0, 0],
        "nx": [4, 7, 13, 8, 4],
        "ny": [2, 8, 9, 4, 4],
        "nz": [2, 1, 0, 1, -1]
      }, {
        "size": 4,
        "px": [7, 8, 7, 8],
        "py": [11, 3, 4, 7],
        "pz": [1, 1, 1, 1],
        "nx": [0, 7, 3, 8],
        "ny": [0, 12, 2, 4],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [4, 7],
        "pz": [2, 1],
        "nx": [10, 1],
        "ny": [7, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [19, 5],
        "pz": [0, -1],
        "nx": [11, 5],
        "ny": [17, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [11, 12],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [7, 5],
        "ny": [8, 3],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [4, 8, 4],
        "py": [2, 9, 4],
        "pz": [2, 1, 2],
        "nx": [3, 19, 3],
        "ny": [1, 16, 5],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [3, 7],
        "py": [0, 1],
        "pz": [1, 0],
        "nx": [2, 3],
        "ny": [15, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 4],
        "py": [2, 0],
        "pz": [2, -1],
        "nx": [9, 16],
        "ny": [5, 11],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [14, 15],
        "py": [23, 16],
        "pz": [0, 0],
        "nx": [13, 3],
        "ny": [15, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [0, 1],
        "pz": [1, -1],
        "nx": [3, 7],
        "ny": [0, 0],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [7, 6],
        "py": [12, 12],
        "pz": [0, 0],
        "nx": [4, 8],
        "ny": [5, 4],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [4, 1, 2, 4, 5],
        "py": [1, 0, 0, 0, 6],
        "pz": [0, 2, 1, 0, 1],
        "nx": [4, 8, 7, 8, 6],
        "ny": [4, 10, 11, 4, 4],
        "nz": [1, 0, 0, 1, 1]
      }, {
        "size": 2,
        "px": [12, 12],
        "py": [15, 8],
        "pz": [0, -1],
        "nx": [7, 15],
        "ny": [16, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [4, 6],
        "ny": [2, 8],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [14, 4],
        "py": [19, 23],
        "pz": [0, -1],
        "nx": [7, 14],
        "ny": [11, 18],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [7, 4],
        "pz": [1, 2],
        "nx": [2, 22],
        "ny": [5, 19],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [8, 15],
        "py": [7, 17],
        "pz": [1, 0],
        "nx": [14, 4],
        "ny": [15, 5],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [10, 11],
        "py": [9, 8],
        "pz": [1, -1],
        "nx": [23, 5],
        "ny": [19, 4],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [11, 1],
        "py": [7, 9],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [4, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [14, 7],
        "py": [6, 9],
        "pz": [0, 0],
        "nx": [4, 11],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [0, 5],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [0, 4],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [10, 22],
        "py": [5, 20],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [1, 2],
        "nz": [2, 2]
      }, {
        "size": 3,
        "px": [23, 11, 11],
        "py": [17, 9, 8],
        "pz": [0, 1, 1],
        "nx": [13, 8, 8],
        "ny": [5, 3, 3],
        "nz": [0, 1, -1]
      }, {
        "size": 2,
        "px": [18, 9],
        "py": [0, 21],
        "pz": [0, -1],
        "nx": [10, 10],
        "ny": [2, 1],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [11, 10, 11, 11, 11],
        "py": [11, 13, 10, 12, 12],
        "pz": [0, 0, 0, 0, -1],
        "nx": [11, 13, 12, 3, 8],
        "ny": [5, 5, 5, 1, 10],
        "nz": [0, 0, 0, 2, 0]
      }, {
        "size": 2,
        "px": [7, 8],
        "py": [11, 11],
        "pz": [0, 0],
        "nx": [9, 16],
        "ny": [9, 19],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 18],
        "py": [23, 7],
        "pz": [0, -1],
        "nx": [21, 21],
        "ny": [7, 13],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [7, 8],
        "pz": [1, 1],
        "nx": [5, 21],
        "ny": [9, 13],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [17, 8],
        "py": [22, 8],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [5, 10],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [2, 5, 8, 8, 4],
        "py": [3, 9, 13, 23, 7],
        "pz": [2, 1, 0, 0, 1],
        "nx": [9, 17, 18, 19, 20],
        "ny": [0, 0, 0, 2, 3],
        "nz": [1, 0, 0, 0, 0]
      }, {
        "size": 3,
        "px": [16, 15, 2],
        "py": [3, 3, 13],
        "pz": [0, 0, -1],
        "nx": [4, 8, 4],
        "ny": [3, 6, 2],
        "nz": [2, 1, 2]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [3, 7],
        "pz": [2, 1],
        "nx": [15, 1],
        "ny": [15, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [2, 3],
        "pz": [2, 1],
        "nx": [3, 18],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [2, 4],
        "pz": [2, 1],
        "nx": [3, 0],
        "ny": [5, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [10, 0],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [2, 0],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [2, 0],
        "py": [8, 3],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [4, 14],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [13, 18],
        "py": [14, 14],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [15, 13],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [3, 2, 2],
        "py": [17, 10, 15],
        "pz": [0, 1, 0],
        "nx": [13, 2, 7],
        "ny": [19, 11, 0],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [4, 17],
        "py": [0, 2],
        "pz": [2, 0],
        "nx": [8, 5],
        "ny": [11, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [15, 21],
        "py": [5, 4],
        "pz": [0, -1],
        "nx": [15, 10],
        "ny": [3, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [7, 3],
        "py": [13, 8],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [7, 22],
        "py": [3, 4],
        "pz": [1, -1],
        "nx": [4, 2],
        "ny": [2, 3],
        "nz": [1, 1]
      }, {
        "size": 4,
        "px": [6, 2, 6, 5],
        "py": [21, 10, 22, 20],
        "pz": [0, 1, 0, 0],
        "nx": [2, 3, 4, 4],
        "ny": [11, 21, 23, 23],
        "nz": [1, 0, 0, -1]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [6, 8],
        "pz": [1, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 4,
        "px": [11, 11, 5, 11],
        "py": [6, 5, 2, 4],
        "pz": [1, 1, 2, 1],
        "nx": [13, 7, 8, 3],
        "ny": [7, 3, 5, 2],
        "nz": [0, 1, -1, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [7, 8],
        "pz": [1, 0],
        "nx": [3, 11],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [16, 1, 5],
        "py": [3, 3, 11],
        "pz": [0, -1, -1],
        "nx": [16, 4, 8],
        "ny": [2, 0, 1],
        "nz": [0, 2, 1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [8, 1],
        "pz": [0, -1],
        "nx": [19, 18],
        "ny": [20, 23],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [17, 4],
        "py": [10, 4],
        "pz": [0, -1],
        "nx": [4, 14],
        "ny": [2, 9],
        "nz": [2, 0]
      }, {
        "size": 5,
        "px": [11, 12, 9, 10, 11],
        "py": [2, 3, 2, 2, 3],
        "pz": [0, 0, 0, 0, 0],
        "nx": [6, 4, 2, 2, 2],
        "ny": [18, 9, 3, 2, 2],
        "nz": [0, 1, 2, 2, -1]
      }, {
        "size": 2,
        "px": [0, 1],
        "py": [6, 16],
        "pz": [1, 0],
        "nx": [8, 16],
        "ny": [5, 16],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [2, 3],
        "pz": [2, 2],
        "nx": [8, 17],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [2, 5, 2],
        "py": [5, 6, 4],
        "pz": [1, -1, -1],
        "nx": [0, 0, 0],
        "ny": [3, 5, 6],
        "nz": [2, 1, 1]
      }, {
        "size": 5,
        "px": [0, 0, 0, 0, 0],
        "py": [6, 15, 16, 13, 14],
        "pz": [1, 0, 0, 0, 0],
        "nx": [4, 5, 8, 6, 8],
        "ny": [4, 16, 8, 15, 4],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [3, 5],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [21, 19, 21, 21, 21],
        "py": [17, 23, 18, 19, 20],
        "pz": [0, 0, 0, 0, 0],
        "nx": [5, 2, 3, 6, 6],
        "ny": [12, 5, 5, 12, 12],
        "nz": [0, 1, 1, 0, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [11, 1],
        "pz": [1, -1],
        "nx": [5, 11],
        "ny": [3, 5],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [5, 3],
        "pz": [0, 1],
        "nx": [6, 15],
        "ny": [11, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 2],
        "py": [4, 2],
        "pz": [1, -1],
        "nx": [4, 3],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [10, 6],
        "py": [20, 6],
        "pz": [0, -1],
        "nx": [5, 10],
        "ny": [11, 17],
        "nz": [1, 0]
      }, {
        "size": 4,
        "px": [8, 4, 7, 11],
        "py": [7, 4, 5, 8],
        "pz": [1, 2, 1, 0],
        "nx": [13, 10, 5, 21],
        "ny": [9, 3, 5, 4],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [7, 13],
        "py": [10, 7],
        "pz": [0, 0],
        "nx": [10, 8],
        "ny": [9, 18],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [8, 5],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [5, 2, 5, 8, 4],
        "py": [8, 4, 14, 23, 7],
        "pz": [1, 2, 0, 0, 1],
        "nx": [18, 4, 16, 17, 17],
        "ny": [1, 0, 0, 1, 1],
        "nz": [0, 2, 0, 0, -1]
      }, {
        "size": 2,
        "px": [6, 2],
        "py": [2, 4],
        "pz": [1, -1],
        "nx": [8, 8],
        "ny": [4, 3],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 1],
        "py": [8, 15],
        "pz": [0, -1],
        "nx": [8, 3],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 1],
        "py": [7, 2],
        "pz": [1, -1],
        "nx": [6, 6],
        "ny": [9, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [4, 1],
        "py": [6, 2],
        "pz": [1, -1],
        "nx": [1, 10],
        "ny": [16, 12],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [7, 2],
        "pz": [1, -1],
        "nx": [8, 9],
        "ny": [8, 10],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [4, 8, 7, 6, 6],
        "py": [0, 0, 0, 1, 1],
        "pz": [1, 0, 0, 0, -1],
        "nx": [11, 5, 8, 4, 10],
        "ny": [5, 3, 4, 4, 5],
        "nz": [0, 1, 1, 1, 0]
      }, {
        "size": 2,
        "px": [5, 6],
        "py": [8, 5],
        "pz": [0, 0],
        "nx": [6, 6],
        "ny": [8, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [18, 5],
        "py": [19, 5],
        "pz": [0, -1],
        "nx": [4, 21],
        "ny": [5, 19],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [13, 6],
        "pz": [0, 1],
        "nx": [2, 2],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [17, 6],
        "pz": [0, 1],
        "nx": [10, 2],
        "ny": [15, 4],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [13, 13, 19],
        "py": [11, 12, 8],
        "pz": [0, 0, -1],
        "nx": [12, 3, 8],
        "ny": [4, 1, 4],
        "nz": [0, 2, 1]
      }, {
        "size": 3,
        "px": [11, 7, 4],
        "py": [5, 2, 1],
        "pz": [0, -1, -1],
        "nx": [9, 2, 4],
        "ny": [11, 3, 6],
        "nz": [0, 2, 1]
      }, {
        "size": 2,
        "px": [10, 7],
        "py": [15, 2],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [0, 1],
        "nz": [2, 2]
      }, {
        "size": 5,
        "px": [8, 9, 16, 18, 18],
        "py": [0, 1, 1, 1, 1],
        "pz": [1, 1, 0, 0, -1],
        "nx": [5, 5, 6, 4, 4],
        "ny": [21, 20, 23, 17, 18],
        "nz": [0, 0, 0, 0, 0]
      }, {
        "size": 2,
        "px": [6, 7],
        "py": [1, 1],
        "pz": [1, 1],
        "nx": [20, 19],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [10, 11],
        "pz": [1, 1],
        "nx": [3, 3],
        "ny": [10, 10],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 5],
        "py": [23, 1],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [10, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [1, 10],
        "py": [4, 7],
        "pz": [2, -1],
        "nx": [4, 3],
        "ny": [23, 21],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [10, 21],
        "py": [11, 18],
        "pz": [1, 0],
        "nx": [10, 4],
        "ny": [18, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 23],
        "py": [11, 15],
        "pz": [0, -1],
        "nx": [11, 11],
        "ny": [7, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 1],
        "py": [7, 7],
        "pz": [1, -1],
        "nx": [15, 4],
        "ny": [14, 4],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [1, 2],
        "py": [9, 20],
        "pz": [1, 0],
        "nx": [21, 3],
        "ny": [12, 20],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [0, 0],
        "pz": [1, 2],
        "nx": [4, 2],
        "ny": [0, 19],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [3, 0],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 1],
        "py": [5, 0],
        "pz": [1, -1],
        "nx": [12, 10],
        "ny": [11, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [11, 12],
        "py": [11, 14],
        "pz": [1, -1],
        "nx": [18, 16],
        "ny": [21, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 18],
        "py": [1, 5],
        "pz": [2, -1],
        "nx": [4, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [9, 10],
        "py": [18, 7],
        "pz": [0, -1],
        "nx": [3, 6],
        "ny": [0, 0],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [19, 2],
        "py": [1, 4],
        "pz": [0, -1],
        "nx": [22, 22],
        "ny": [13, 15],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [13, 15, 20],
        "py": [14, 21, 10],
        "pz": [0, -1, -1],
        "nx": [15, 7, 7],
        "ny": [13, 6, 8],
        "nz": [0, 1, 1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [6, 7],
        "pz": [1, 1],
        "nx": [8, 7],
        "ny": [4, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 3],
        "pz": [1, 2],
        "nx": [5, 10],
        "ny": [2, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [14, 11],
        "py": [7, 16],
        "pz": [0, -1],
        "nx": [1, 0],
        "ny": [17, 4],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [14, 18],
        "py": [17, 18],
        "pz": [0, -1],
        "nx": [8, 14],
        "ny": [10, 16],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [6, 11],
        "py": [13, 11],
        "pz": [0, -1],
        "nx": [8, 9],
        "ny": [12, 9],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [8, 9],
        "py": [2, 2],
        "pz": [0, 0],
        "nx": [3, 3],
        "ny": [2, 2],
        "nz": [2, -1]
      }, {
        "size": 3,
        "px": [21, 21, 21],
        "py": [14, 16, 15],
        "pz": [0, 0, 0],
        "nx": [14, 12, 0],
        "ny": [5, 12, 6],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [4, 21],
        "py": [6, 15],
        "pz": [1, -1],
        "nx": [5, 1],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [2, 1],
        "pz": [1, 2],
        "nx": [8, 0],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 2],
        "py": [9, 1],
        "pz": [0, -1],
        "nx": [3, 5],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [16, 1],
        "py": [5, 4],
        "pz": [0, -1],
        "nx": [17, 8],
        "ny": [3, 2],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [20, 20],
        "ny": [17, 16],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 7],
        "py": [3, 6],
        "pz": [2, -1],
        "nx": [9, 9],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [11, 17],
        "py": [4, 1],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [15, 2],
        "py": [11, 0],
        "pz": [0, -1],
        "nx": [5, 14],
        "ny": [1, 12],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [22, 19],
        "py": [3, 0],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [6, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [1, 22],
        "py": [3, 21],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [1, 0],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [11, 12],
        "pz": [0, 0],
        "nx": [1, 2],
        "ny": [1, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [18, 3],
        "py": [8, 1],
        "pz": [0, 2],
        "nx": [13, 1],
        "ny": [8, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 6],
        "py": [21, 3],
        "pz": [0, -1],
        "nx": [11, 11],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [15, 14],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [17, 1],
        "ny": [12, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 3],
        "py": [12, 1],
        "pz": [0, -1],
        "nx": [1, 2],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [7, 3],
        "pz": [0, 1],
        "nx": [16, 2],
        "ny": [3, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [7, 20],
        "pz": [1, -1],
        "nx": [9, 8],
        "ny": [4, 6],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [19, 2],
        "py": [10, 2],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [3, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [14, 9],
        "py": [0, 23],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [3, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [6, 9],
        "py": [4, 10],
        "pz": [1, 0],
        "nx": [10, 9],
        "ny": [9, 0],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [6, 9, 10, 8],
        "py": [20, 23, 18, 23],
        "pz": [0, 0, 0, 0],
        "nx": [9, 22, 1, 2],
        "ny": [21, 14, 2, 5],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [17, 18],
        "py": [13, 6],
        "pz": [0, -1],
        "nx": [6, 7],
        "ny": [9, 11],
        "nz": [1, 1]
      }, {
        "size": 5,
        "px": [18, 19, 20, 19, 20],
        "py": [15, 19, 16, 20, 17],
        "pz": [0, 0, 0, 0, 0],
        "nx": [11, 22, 23, 23, 23],
        "ny": [10, 22, 20, 19, 19],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [1, 0],
        "pz": [1, 1],
        "nx": [21, 11],
        "ny": [0, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 0],
        "py": [9, 3],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [2, 1],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [14, 23],
        "py": [2, 18],
        "pz": [0, -1],
        "nx": [15, 18],
        "ny": [1, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [3, 12],
        "ny": [1, 5],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [8, 8],
        "py": [7, 8],
        "pz": [1, 1],
        "nx": [8, 8],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [1, 3],
        "pz": [2, -1],
        "nx": [7, 19],
        "ny": [9, 15],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [16, 6, 4],
        "py": [21, 5, 4],
        "pz": [0, -1, -1],
        "nx": [4, 19, 8],
        "ny": [5, 21, 11],
        "nz": [2, 0, 1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [6, 6],
        "pz": [1, -1],
        "nx": [10, 10],
        "ny": [10, 12],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [6, 11],
        "py": [2, 5],
        "pz": [1, 0],
        "nx": [3, 4],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [8, 6, 2],
        "py": [4, 10, 2],
        "pz": [1, 1, 2],
        "nx": [2, 18, 5],
        "ny": [0, 11, 5],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [11, 7],
        "py": [9, 7],
        "pz": [0, -1],
        "nx": [12, 3],
        "ny": [9, 5],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [14, 13],
        "py": [20, 20],
        "pz": [0, 0],
        "nx": [13, 3],
        "ny": [21, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 7],
        "py": [5, 3],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [1, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [6, 2],
        "py": [21, 5],
        "pz": [0, -1],
        "nx": [2, 3],
        "ny": [5, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [23, 5],
        "py": [6, 0],
        "pz": [0, 2],
        "nx": [21, 4],
        "ny": [6, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [7, 6],
        "pz": [1, 1],
        "nx": [8, 2],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [22, 11],
        "py": [20, 9],
        "pz": [0, 1],
        "nx": [8, 8],
        "ny": [10, 10],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 16],
        "py": [21, 12],
        "pz": [0, -1],
        "nx": [2, 7],
        "ny": [5, 23],
        "nz": [2, 0]
      }, {
        "size": 5,
        "px": [0, 1, 1, 1, 1],
        "py": [3, 1, 9, 4, 7],
        "pz": [2, 2, 1, 1, 1],
        "nx": [11, 22, 22, 23, 23],
        "ny": [10, 21, 22, 19, 20],
        "nz": [1, 0, 0, 0, -1]
      }, {
        "size": 2,
        "px": [17, 5],
        "py": [12, 4],
        "pz": [0, -1],
        "nx": [8, 8],
        "ny": [4, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [16, 4],
        "py": [7, 10],
        "pz": [0, -1],
        "nx": [9, 15],
        "ny": [4, 6],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [3, 5],
        "pz": [2, 1],
        "nx": [11, 12],
        "ny": [11, 23],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [14, 7],
        "pz": [0, 1],
        "nx": [4, 17],
        "ny": [18, 16],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [10, 1, 1],
        "py": [12, 5, 4],
        "pz": [0, -1, -1],
        "nx": [7, 11, 5],
        "ny": [1, 2, 1],
        "nz": [1, 0, 1]
      }, {
        "size": 2,
        "px": [7, 6],
        "py": [3, 9],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [2, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [13, 6],
        "py": [22, 9],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 3],
        "nz": [1, 2]
      }, {
        "size": 5,
        "px": [12, 9, 10, 11, 11],
        "py": [0, 0, 0, 0, 0],
        "pz": [0, 0, 0, 0, -1],
        "nx": [16, 5, 10, 4, 8],
        "ny": [10, 3, 6, 4, 4],
        "nz": [0, 1, 0, 1, 1]
      }, {
        "size": 2,
        "px": [18, 19],
        "py": [23, 20],
        "pz": [0, 0],
        "nx": [8, 5],
        "ny": [11, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 3],
        "py": [7, 2],
        "pz": [1, 2],
        "nx": [8, 4],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [8, 14, 8, 7, 4],
        "py": [6, 12, 8, 6, 3],
        "pz": [1, 0, 1, 1, 2],
        "nx": [2, 6, 6, 7, 7],
        "ny": [0, 1, 2, 0, 0],
        "nz": [2, 0, 0, 0, -1]
      }, {
        "size": 3,
        "px": [1, 2, 3],
        "py": [15, 18, 21],
        "pz": [0, 0, 0],
        "nx": [19, 5, 18],
        "ny": [23, 5, 8],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [6, 2],
        "py": [6, 1],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [12, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [3, 5],
        "py": [5, 11],
        "pz": [2, 1],
        "nx": [14, 5],
        "ny": [19, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 4],
        "py": [4, 4],
        "pz": [1, -1],
        "nx": [11, 5],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [18, 4],
        "py": [6, 4],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [5, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [2, 4],
        "pz": [1, 0],
        "nx": [8, 8],
        "ny": [3, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [1, 1],
        "pz": [1, 2],
        "nx": [7, 2],
        "ny": [4, 7],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 0],
        "py": [20, 0],
        "pz": [0, -1],
        "nx": [4, 5],
        "ny": [10, 11],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 14],
        "py": [5, 2],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [0, 2],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [5, 15],
        "py": [4, 7],
        "pz": [1, -1],
        "nx": [4, 7],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [7, 5],
        "py": [2, 1],
        "pz": [0, 1],
        "nx": [3, 1],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 9],
        "py": [4, 2],
        "pz": [0, -1],
        "nx": [11, 9],
        "ny": [1, 3],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [2, 4],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [4, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [3, 7],
        "py": [3, 7],
        "pz": [2, 1],
        "nx": [6, 8],
        "ny": [14, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 0],
        "py": [21, 3],
        "pz": [0, 2],
        "nx": [20, 8],
        "ny": [10, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [5, 8],
        "pz": [0, -1],
        "nx": [4, 3],
        "ny": [4, 2],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 13],
        "pz": [1, 0],
        "nx": [3, 2],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [16, 10],
        "py": [9, 7],
        "pz": [0, 1],
        "nx": [7, 9],
        "ny": [3, 10],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 10],
        "py": [6, 7],
        "pz": [0, -1],
        "nx": [8, 17],
        "ny": [4, 12],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [5, 10],
        "py": [4, 10],
        "pz": [2, 1],
        "nx": [5, 4],
        "ny": [9, 2],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [15, 3, 5, 0],
        "py": [12, 4, 2, 3],
        "pz": [0, -1, -1, -1],
        "nx": [13, 7, 5, 7],
        "ny": [12, 6, 0, 7],
        "nz": [0, 1, 2, 1]
      }, {
        "size": 4,
        "px": [2, 3, 16, 17],
        "py": [3, 4, 6, 6],
        "pz": [2, 1, 0, 0],
        "nx": [16, 16, 8, 16],
        "ny": [8, 3, 10, 13],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [16, 8],
        "py": [1, 4],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [9, 14],
        "py": [6, 2],
        "pz": [1, -1],
        "nx": [8, 8],
        "ny": [6, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [10, 4],
        "pz": [1, 2],
        "nx": [10, 0],
        "ny": [5, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [9, 10],
        "py": [4, 4],
        "pz": [0, 0],
        "nx": [9, 7],
        "ny": [3, 5],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [11, 10, 13, 6, 12],
        "py": [2, 2, 2, 1, 2],
        "pz": [0, 0, 0, 1, 0],
        "nx": [4, 18, 18, 13, 13],
        "ny": [2, 18, 19, 7, 7],
        "nz": [2, 0, 0, 0, -1]
      }, {
        "size": 4,
        "px": [13, 13, 13, 2],
        "py": [13, 12, 11, 3],
        "pz": [0, 0, 0, -1],
        "nx": [4, 6, 8, 11],
        "ny": [2, 2, 4, 4],
        "nz": [2, 1, 1, 0]
      }, {
        "size": 2,
        "px": [4, 7],
        "py": [6, 13],
        "pz": [1, 0],
        "nx": [8, 10],
        "ny": [4, 22],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 7],
        "py": [4, 17],
        "pz": [1, -1],
        "nx": [0, 1],
        "ny": [5, 21],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [22, 22],
        "pz": [0, 0],
        "nx": [2, 2],
        "ny": [13, 13],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [4, 4, 3],
        "py": [22, 23, 19],
        "pz": [0, 0, 0],
        "nx": [8, 12, 3],
        "ny": [22, 15, 2],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [10, 12],
        "py": [3, 13],
        "pz": [0, -1],
        "nx": [15, 2],
        "ny": [10, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [3, 3],
        "pz": [2, -1],
        "nx": [8, 4],
        "ny": [0, 0],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [6, 18],
        "pz": [1, 0],
        "nx": [12, 19],
        "ny": [17, 16],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [2, 1],
        "pz": [0, 1],
        "nx": [5, 4],
        "ny": [4, 17],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [3, 12, 11],
        "py": [5, 23, 23],
        "pz": [2, 0, 0],
        "nx": [12, 4, 4],
        "ny": [21, 17, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [12, 0],
        "py": [21, 5],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [7, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [17, 17],
        "py": [12, 11],
        "pz": [0, 0],
        "nx": [8, 11],
        "ny": [4, 11],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 0],
        "py": [22, 1],
        "pz": [0, -1],
        "nx": [4, 6],
        "ny": [1, 0],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [9, 5],
        "pz": [1, 1],
        "nx": [23, 11],
        "ny": [23, 20],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [4, 12, 11, 9, 8],
        "py": [0, 1, 1, 0, 1],
        "pz": [1, 0, 0, 0, 0],
        "nx": [4, 17, 8, 7, 7],
        "ny": [2, 13, 4, 4, 4],
        "nz": [2, 0, 1, 1, -1]
      }, {
        "size": 2,
        "px": [11, 13],
        "py": [12, 12],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [23, 4],
        "py": [23, 2],
        "pz": [0, -1],
        "nx": [5, 2],
        "ny": [23, 6],
        "nz": [0, 1]
      }, {
        "size": 3,
        "px": [8, 16, 0],
        "py": [5, 15, 6],
        "pz": [1, -1, -1],
        "nx": [23, 23, 11],
        "ny": [18, 17, 8],
        "nz": [0, 0, 1]
      }, {
        "size": 2,
        "px": [1, 16],
        "py": [4, 15],
        "pz": [2, -1],
        "nx": [2, 2],
        "ny": [3, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [3, 8],
        "py": [7, 9],
        "pz": [1, -1],
        "nx": [4, 2],
        "ny": [10, 5],
        "nz": [1, 2]
      }, {
        "size": 3,
        "px": [22, 1, 9],
        "py": [23, 2, 3],
        "pz": [0, -1, -1],
        "nx": [2, 2, 5],
        "ny": [5, 4, 19],
        "nz": [2, 2, 0]
      }, {
        "size": 2,
        "px": [2, 20],
        "py": [5, 15],
        "pz": [1, -1],
        "nx": [2, 1],
        "ny": [1, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [1, 19],
        "pz": [1, -1],
        "nx": [2, 2],
        "ny": [5, 4],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [9, 10],
        "py": [21, 0],
        "pz": [0, -1],
        "nx": [6, 5],
        "ny": [1, 1],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [4, 8],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [9, 2],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [17, 3, 10],
        "py": [8, 0, 2],
        "pz": [0, 2, 0],
        "nx": [13, 2, 6],
        "ny": [15, 5, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [9, 6],
        "py": [20, 21],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [10, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [3, 7],
        "py": [0, 1],
        "pz": [2, 1],
        "nx": [7, 20],
        "ny": [1, 19],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [0, 1],
        "pz": [1, 0],
        "nx": [3, 2],
        "ny": [4, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 7],
        "py": [4, 19],
        "pz": [2, 0],
        "nx": [5, 2],
        "ny": [10, 2],
        "nz": [1, -1]
      }, {
        "size": 5,
        "px": [3, 3, 4, 7, 7],
        "py": [1, 0, 0, 0, 1],
        "pz": [1, 1, 1, 0, 0],
        "nx": [5, 4, 10, 8, 8],
        "ny": [3, 3, 5, 4, 4],
        "nz": [1, 1, 0, 1, -1]
      }, {
        "size": 2,
        "px": [1, 5],
        "py": [0, 3],
        "pz": [1, -1],
        "nx": [1, 0],
        "ny": [0, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [5, 5],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [0, 9],
        "py": [0, 4],
        "pz": [2, -1],
        "nx": [13, 10],
        "ny": [0, 0],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [14, 5],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [0, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [17, 4],
        "py": [13, 3],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [1, 0],
        "py": [6, 2],
        "pz": [1, -1],
        "nx": [1, 6],
        "ny": [2, 12],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [12, 4],
        "py": [6, 0],
        "pz": [0, -1],
        "nx": [3, 3],
        "ny": [8, 9],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [1, 5],
        "py": [1, 5],
        "pz": [1, -1],
        "nx": [17, 17],
        "ny": [13, 7],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [7, 3],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [3, 4],
        "ny": [4, 11],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 17],
        "py": [2, 8],
        "pz": [1, 0],
        "nx": [3, 3],
        "ny": [1, 2],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [13, 6, 6],
        "py": [22, 11, 10],
        "pz": [0, 1, 1],
        "nx": [13, 12, 11],
        "ny": [20, 20, 20],
        "nz": [0, 0, 0]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [3, 12],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [1, 1],
        "pz": [1, -1],
        "nx": [13, 6],
        "ny": [0, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [2, 8],
        "py": [3, 9],
        "pz": [2, 0],
        "nx": [8, 16],
        "ny": [5, 17],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 15],
        "py": [1, 1],
        "pz": [0, 0],
        "nx": [7, 11],
        "ny": [8, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 18],
        "py": [21, 23],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [4, 3],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [1, 5],
        "py": [0, 2],
        "pz": [1, -1],
        "nx": [15, 11],
        "ny": [8, 7],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 4],
        "py": [7, 8],
        "pz": [1, -1],
        "nx": [9, 10],
        "ny": [13, 11],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [10, 4],
        "pz": [1, 2],
        "nx": [22, 4],
        "ny": [0, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 3],
        "py": [3, 1],
        "pz": [0, 2],
        "nx": [8, 0],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 21],
        "py": [11, 22],
        "pz": [0, -1],
        "nx": [10, 11],
        "ny": [11, 9],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [0, 1],
        "pz": [2, 2],
        "nx": [2, 21],
        "ny": [6, 14],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [10, 10, 1],
        "py": [11, 0, 5],
        "pz": [0, -1, -1],
        "nx": [6, 12, 5],
        "ny": [2, 5, 2],
        "nz": [1, 0, 1]
      }, {
        "size": 2,
        "px": [9, 10],
        "py": [5, 6],
        "pz": [0, 0],
        "nx": [12, 19],
        "ny": [23, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [9, 6],
        "pz": [0, 1],
        "nx": [21, 0],
        "ny": [23, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 12],
        "py": [19, 15],
        "pz": [0, 0],
        "nx": [13, 0],
        "ny": [17, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [14, 0],
        "py": [17, 3],
        "pz": [0, -1],
        "nx": [7, 16],
        "ny": [8, 19],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [2, 4],
        "pz": [2, 1],
        "nx": [8, 1],
        "ny": [4, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 10],
        "py": [23, 20],
        "pz": [0, -1],
        "nx": [4, 7],
        "ny": [5, 10],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [16, 9],
        "py": [22, 5],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [10, 3],
        "nz": [1, 2]
      }, {
        "size": 4,
        "px": [3, 1, 1, 5],
        "py": [4, 2, 1, 2],
        "pz": [0, 2, 2, 1],
        "nx": [13, 5, 8, 0],
        "ny": [22, 2, 9, 2],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [0, 0],
        "pz": [1, -1],
        "nx": [19, 20],
        "ny": [1, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [7, 22],
        "py": [6, 8],
        "pz": [1, 0],
        "nx": [4, 4],
        "ny": [2, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [4, 4],
        "pz": [2, 1],
        "nx": [10, 20],
        "ny": [10, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 12],
        "py": [6, 15],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [2, 5],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [2, 7],
        "py": [4, 10],
        "pz": [2, -1],
        "nx": [3, 6],
        "ny": [4, 8],
        "nz": [2, 1]
      }, {
        "size": 3,
        "px": [11, 11, 4],
        "py": [0, 5, 7],
        "pz": [1, -1, -1],
        "nx": [6, 12, 12],
        "ny": [1, 1, 2],
        "nz": [1, 0, 0]
      }, {
        "size": 2,
        "px": [11, 17],
        "py": [4, 18],
        "pz": [0, -1],
        "nx": [8, 2],
        "ny": [10, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [17, 17],
        "py": [10, 18],
        "pz": [0, -1],
        "nx": [8, 8],
        "ny": [2, 3],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [9, 9],
        "py": [7, 7],
        "pz": [1, -1],
        "nx": [7, 4],
        "ny": [6, 3],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [18, 21],
        "py": [0, 0],
        "pz": [0, -1],
        "nx": [11, 6],
        "ny": [5, 3],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [8, 4],
        "pz": [0, 2],
        "nx": [5, 8],
        "ny": [9, 16],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 2],
        "py": [5, 4],
        "pz": [0, -1],
        "nx": [4, 15],
        "ny": [4, 8],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [4, 6],
        "pz": [1, 1],
        "nx": [11, 3],
        "ny": [7, 9],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [3, 3],
        "pz": [2, 2],
        "nx": [2, 2],
        "ny": [15, 16],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [17, 18],
        "py": [5, 5],
        "pz": [0, 0],
        "nx": [9, 21],
        "ny": [2, 10],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [14, 7],
        "pz": [0, 1],
        "nx": [3, 4],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 3],
        "py": [3, 1],
        "pz": [1, -1],
        "nx": [19, 10],
        "ny": [12, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [6, 16],
        "py": [3, 8],
        "pz": [1, 0],
        "nx": [8, 10],
        "ny": [20, 4],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [5, 5, 2],
        "py": [21, 8, 4],
        "pz": [0, 1, 2],
        "nx": [10, 6, 3],
        "ny": [15, 2, 1],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [10, 12],
        "pz": [0, 0],
        "nx": [11, 11],
        "ny": [2, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [3, 2],
        "pz": [1, 1],
        "nx": [8, 11],
        "ny": [3, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [5, 8],
        "pz": [0, -1],
        "nx": [12, 3],
        "ny": [3, 1],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [13, 7],
        "py": [2, 1],
        "pz": [0, 1],
        "nx": [5, 5],
        "ny": [1, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [10, 8],
        "pz": [0, -1],
        "nx": [14, 16],
        "ny": [10, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 10],
        "py": [7, 8],
        "pz": [1, -1],
        "nx": [2, 6],
        "ny": [5, 6],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [1, 8],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [3, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [4, 0],
        "py": [5, 2],
        "pz": [1, -1],
        "nx": [1, 2],
        "ny": [2, 3],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [1, 12],
        "py": [1, 9],
        "pz": [2, -1],
        "nx": [16, 17],
        "ny": [3, 3],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [5, 8],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [7, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [14, 3],
        "py": [11, 5],
        "pz": [0, -1],
        "nx": [11, 4],
        "ny": [0, 0],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [6, 10],
        "py": [6, 6],
        "pz": [1, -1],
        "nx": [0, 0],
        "ny": [1, 0],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [3, 7],
        "py": [0, 7],
        "pz": [1, -1],
        "nx": [15, 13],
        "ny": [8, 4],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [18, 1],
        "py": [15, 0],
        "pz": [0, -1],
        "nx": [18, 18],
        "ny": [18, 17],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [5, 2],
        "py": [4, 4],
        "pz": [0, -1],
        "nx": [4, 18],
        "ny": [4, 15],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [3, 14, 13],
        "py": [2, 7, 8],
        "pz": [2, 0, 0],
        "nx": [10, 0, 2],
        "ny": [8, 3, 2],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [16, 0],
        "py": [14, 3],
        "pz": [0, -1],
        "nx": [18, 3],
        "ny": [12, 5],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [8, 3],
        "pz": [1, 2],
        "nx": [13, 4],
        "ny": [10, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [1, 2],
        "pz": [2, 1],
        "nx": [8, 1],
        "ny": [4, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [8, 3],
        "pz": [1, -1],
        "nx": [12, 7],
        "ny": [2, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [17, 3],
        "py": [9, 2],
        "pz": [0, 2],
        "nx": [7, 6],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [12, 1],
        "py": [2, 1],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [2, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [22, 5],
        "py": [15, 3],
        "pz": [0, 2],
        "nx": [16, 17],
        "ny": [14, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 11],
        "py": [19, 13],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [8, 11],
        "py": [8, 1],
        "pz": [1, -1],
        "nx": [3, 3],
        "ny": [2, 5],
        "nz": [1, 2]
      }, {
        "size": 3,
        "px": [3, 8, 0],
        "py": [7, 7, 5],
        "pz": [1, -1, -1],
        "nx": [11, 5, 1],
        "ny": [11, 7, 5],
        "nz": [0, 1, 1]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [9, 0],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [16, 12],
        "py": [7, 1],
        "pz": [0, -1],
        "nx": [16, 7],
        "ny": [6, 4],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [13, 5],
        "py": [14, 0],
        "pz": [0, -1],
        "nx": [13, 10],
        "ny": [0, 0],
        "nz": [0, 0]
      }, {
        "size": 5,
        "px": [11, 12, 13, 12, 7],
        "py": [0, 1, 0, 0, 0],
        "pz": [0, 0, 0, 0, 1],
        "nx": [13, 16, 14, 4, 4],
        "ny": [18, 23, 18, 5, 5],
        "nz": [0, 0, 0, 2, -1]
      }, {
        "size": 2,
        "px": [14, 5],
        "py": [12, 4],
        "pz": [0, -1],
        "nx": [7, 7],
        "ny": [8, 2],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [19, 3],
        "py": [2, 5],
        "pz": [0, -1],
        "nx": [11, 23],
        "ny": [7, 13],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [19, 20],
        "pz": [0, 0],
        "nx": [9, 4],
        "ny": [5, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [15, 4],
        "py": [12, 3],
        "pz": [0, 2],
        "nx": [9, 5],
        "ny": [4, 5],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [8, 0, 1, 21],
        "py": [6, 0, 7, 16],
        "pz": [1, -1, -1, -1],
        "nx": [11, 6, 11, 5],
        "ny": [8, 6, 4, 3],
        "nz": [1, 1, 1, 2]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [7, 5],
        "pz": [0, -1],
        "nx": [9, 10],
        "ny": [6, 7],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [1, 2],
        "pz": [2, 1],
        "nx": [16, 6],
        "ny": [0, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 3],
        "pz": [1, 2],
        "nx": [1, 21],
        "ny": [23, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [7, 0],
        "pz": [0, -1],
        "nx": [4, 13],
        "ny": [4, 10],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [11, 4],
        "py": [0, 4],
        "pz": [1, -1],
        "nx": [4, 2],
        "ny": [16, 8],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [3, 3],
        "ny": [4, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [19, 11],
        "pz": [0, -1],
        "nx": [9, 5],
        "ny": [21, 9],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [17, 9],
        "pz": [0, 1],
        "nx": [0, 5],
        "ny": [0, 9],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [4, 5],
        "py": [2, 4],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [5, 6],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [1, 0],
        "pz": [1, 2],
        "nx": [4, 3],
        "ny": [3, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 0],
        "py": [7, 2],
        "pz": [1, -1],
        "nx": [5, 5],
        "ny": [1, 0],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [13, 0],
        "py": [17, 2],
        "pz": [0, -1],
        "nx": [3, 6],
        "ny": [5, 8],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [0, 5],
        "pz": [2, -1],
        "nx": [4, 9],
        "ny": [2, 7],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [13, 8],
        "pz": [0, -1],
        "nx": [23, 11],
        "ny": [13, 7],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [0, 2],
        "pz": [1, 0],
        "nx": [3, 6],
        "ny": [11, 18],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [6, 5],
        "pz": [0, -1],
        "nx": [1, 1],
        "ny": [1, 3],
        "nz": [2, 1]
      }, {
        "size": 4,
        "px": [3, 6, 3, 6],
        "py": [3, 6, 2, 5],
        "pz": [2, 1, 2, 1],
        "nx": [0, 4, 1, 1],
        "ny": [0, 22, 17, 0],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [9, 15],
        "ny": [4, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [8, 18],
        "py": [7, 8],
        "pz": [1, 0],
        "nx": [8, 5],
        "ny": [4, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [4, 5],
        "pz": [1, -1],
        "nx": [5, 6],
        "ny": [0, 0],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [13, 18],
        "py": [23, 19],
        "pz": [0, 0],
        "nx": [7, 13],
        "ny": [10, 20],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 6],
        "py": [2, 0],
        "pz": [0, 1],
        "nx": [4, 1],
        "ny": [5, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [5, 4],
        "pz": [2, 2],
        "nx": [0, 20],
        "ny": [4, 4],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [5, 5],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [12, 6],
        "ny": [18, 11],
        "nz": [0, -1]
      }, {
        "size": 5,
        "px": [2, 1, 3, 1, 5],
        "py": [3, 3, 7, 4, 9],
        "pz": [2, 2, 1, 2, 1],
        "nx": [9, 3, 8, 16, 10],
        "ny": [5, 3, 10, 6, 7],
        "nz": [1, -1, -1, -1, -1]
      }, {
        "size": 2,
        "px": [4, 1],
        "py": [12, 3],
        "pz": [0, -1],
        "nx": [10, 1],
        "ny": [11, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [19, 0],
        "py": [10, 7],
        "pz": [0, -1],
        "nx": [14, 7],
        "ny": [6, 3],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [2, 1],
        "pz": [1, 2],
        "nx": [6, 0],
        "ny": [2, 18],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [14, 8],
        "py": [3, 0],
        "pz": [0, 1],
        "nx": [17, 1],
        "ny": [1, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [18, 19],
        "py": [1, 17],
        "pz": [0, -1],
        "nx": [5, 11],
        "ny": [2, 5],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [12, 12, 12, 6, 12],
        "py": [10, 11, 12, 6, 9],
        "pz": [0, 0, 0, 1, 0],
        "nx": [13, 3, 12, 6, 6],
        "ny": [4, 1, 4, 2, 2],
        "nz": [0, 2, 0, 1, -1]
      }, {
        "size": 2,
        "px": [11, 10],
        "py": [3, 3],
        "pz": [0, 0],
        "nx": [4, 9],
        "ny": [4, 17],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 0],
        "py": [13, 5],
        "pz": [0, 2],
        "nx": [8, 18],
        "ny": [15, 15],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [6, 5],
        "pz": [1, 1],
        "nx": [0, 0],
        "ny": [9, 4],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [2, 15],
        "ny": [2, 1],
        "nz": [2, -1]
      }, {
        "size": 3,
        "px": [2, 4, 2],
        "py": [4, 9, 5],
        "pz": [2, 1, 2],
        "nx": [2, 5, 14],
        "ny": [0, 1, 4],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [11, 12],
        "py": [20, 20],
        "pz": [0, 0],
        "nx": [6, 10],
        "ny": [9, 19],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 0],
        "py": [16, 8],
        "pz": [0, -1],
        "nx": [2, 3],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 5,
        "px": [16, 17, 15, 16, 15],
        "py": [1, 1, 1, 0, 0],
        "pz": [0, 0, 0, 0, 0],
        "nx": [8, 8, 4, 12, 12],
        "ny": [8, 7, 2, 23, 23],
        "nz": [1, 1, 2, 0, -1]
      }, {
        "size": 2,
        "px": [2, 4],
        "py": [6, 12],
        "pz": [1, -1],
        "nx": [8, 13],
        "ny": [1, 1],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [9, 2],
        "py": [3, 2],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [6, 5],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 8],
        "py": [6, 1],
        "pz": [1, -1],
        "nx": [11, 8],
        "ny": [2, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [7, 0],
        "pz": [1, -1],
        "nx": [19, 19],
        "ny": [18, 16],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 2],
        "py": [1, 1],
        "pz": [2, 2],
        "nx": [22, 11],
        "ny": [4, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 10],
        "py": [9, 8],
        "pz": [1, 1],
        "nx": [4, 4],
        "ny": [10, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 1],
        "py": [0, 5],
        "pz": [0, -1],
        "nx": [10, 8],
        "ny": [2, 2],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [8, 7],
        "pz": [1, 1],
        "nx": [8, 2],
        "ny": [8, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 5],
        "py": [21, 3],
        "pz": [0, -1],
        "nx": [13, 3],
        "ny": [20, 5],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [11, 2],
        "pz": [0, -1],
        "nx": [1, 0],
        "ny": [19, 9],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [7, 10],
        "py": [9, 10],
        "pz": [1, 1],
        "nx": [8, 4],
        "ny": [10, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 9],
        "pz": [2, 1],
        "nx": [2, 11],
        "ny": [9, 19],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 5],
        "py": [1, 2],
        "pz": [2, 1],
        "nx": [8, 23],
        "ny": [4, 9],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 4],
        "py": [2, 4],
        "pz": [2, 1],
        "nx": [5, 9],
        "ny": [2, 5],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [2, 3],
        "pz": [1, 1],
        "nx": [19, 9],
        "ny": [6, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [9, 4],
        "py": [5, 10],
        "pz": [1, -1],
        "nx": [10, 22],
        "ny": [0, 16],
        "nz": [1, 0]
      }, {
        "size": 3,
        "px": [19, 9, 19],
        "py": [3, 1, 2],
        "pz": [0, 1, 0],
        "nx": [6, 3, 6],
        "ny": [10, 3, 0],
        "nz": [1, -1, -1]
      }, {
        "size": 2,
        "px": [8, 3],
        "py": [10, 3],
        "pz": [1, 2],
        "nx": [23, 14],
        "ny": [3, 18],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [19, 0],
        "pz": [0, -1],
        "nx": [4, 16],
        "ny": [4, 11],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [22, 23],
        "py": [3, 22],
        "pz": [0, -1],
        "nx": [9, 3],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [7, 2],
        "py": [12, 4],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [10, 5],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [5, 13],
        "pz": [0, -1],
        "nx": [11, 3],
        "ny": [2, 0],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [3, 17],
        "py": [0, 16],
        "pz": [1, -1],
        "nx": [12, 12],
        "ny": [5, 6],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [4, 3],
        "ny": [0, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 3],
        "py": [12, 0],
        "pz": [0, -1],
        "nx": [12, 12],
        "ny": [13, 12],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [13, 4],
        "py": [11, 14],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [4, 6],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [8, 7],
        "py": [7, 8],
        "pz": [1, 1],
        "nx": [3, 0],
        "ny": [5, 21],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [1, 3],
        "py": [4, 14],
        "pz": [2, 0],
        "nx": [8, 8],
        "ny": [7, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 11],
        "py": [20, 7],
        "pz": [0, -1],
        "nx": [21, 21],
        "ny": [20, 18],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 1],
        "py": [11, 0],
        "pz": [0, -1],
        "nx": [2, 2],
        "ny": [15, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [10, 1],
        "py": [8, 0],
        "pz": [1, -1],
        "nx": [8, 4],
        "ny": [7, 4],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [17, 6],
        "py": [13, 1],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [7, 15],
        "py": [1, 3],
        "pz": [1, 0],
        "nx": [15, 5],
        "ny": [1, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 1],
        "py": [20, 10],
        "pz": [0, -1],
        "nx": [6, 8],
        "ny": [11, 10],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [7, 14],
        "py": [0, 0],
        "pz": [1, 0],
        "nx": [7, 8],
        "ny": [7, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [17, 4],
        "pz": [0, -1],
        "nx": [12, 5],
        "ny": [16, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [15, 0],
        "pz": [0, -1],
        "nx": [12, 7],
        "ny": [17, 8],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [7, 1],
        "py": [14, 1],
        "pz": [0, -1],
        "nx": [4, 6],
        "ny": [6, 12],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [8, 7],
        "py": [0, 0],
        "pz": [0, 0],
        "nx": [6, 20],
        "ny": [5, 5],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 2],
        "py": [22, 5],
        "pz": [0, -1],
        "nx": [4, 8],
        "ny": [4, 9],
        "nz": [2, 1]
      }, {
        "size": 4,
        "px": [8, 2, 2, 9],
        "py": [6, 5, 3, 11],
        "pz": [1, -1, -1, -1],
        "nx": [2, 7, 4, 3],
        "ny": [2, 1, 0, 2],
        "nz": [2, 0, 1, 2]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [12, 6],
        "pz": [0, 1],
        "nx": [8, 2],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [13, 11],
        "py": [19, 8],
        "pz": [0, -1],
        "nx": [13, 13],
        "ny": [20, 17],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [11, 19],
        "py": [5, 14],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [8, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [10, 0],
        "py": [8, 6],
        "pz": [1, -1],
        "nx": [21, 21],
        "ny": [16, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [1, 12],
        "py": [7, 6],
        "pz": [1, -1],
        "nx": [2, 7],
        "ny": [5, 14],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [2, 9],
        "py": [7, 5],
        "pz": [1, -1],
        "nx": [2, 5],
        "ny": [5, 9],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [12, 5],
        "py": [15, 6],
        "pz": [0, -1],
        "nx": [3, 12],
        "ny": [0, 2],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [23, 22],
        "py": [23, 1],
        "pz": [0, -1],
        "nx": [0, 0],
        "ny": [2, 3],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [1, 2],
        "pz": [2, 1],
        "nx": [8, 0],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 1],
        "py": [9, 1],
        "pz": [0, -1],
        "nx": [4, 2],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [0, 1],
        "py": [0, 0],
        "pz": [2, 0],
        "nx": [2, 3],
        "ny": [9, 10],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 0],
        "py": [16, 14],
        "pz": [0, -1],
        "nx": [6, 3],
        "ny": [23, 14],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 3],
        "py": [2, 3],
        "pz": [2, 1],
        "nx": [13, 3],
        "ny": [19, 14],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [8, 18],
        "pz": [0, -1],
        "nx": [4, 7],
        "ny": [1, 2],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [4, 4],
        "py": [5, 6],
        "pz": [1, 1],
        "nx": [2, 2],
        "ny": [5, 3],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [7, 3],
        "py": [13, 7],
        "pz": [0, 1],
        "nx": [4, 3],
        "ny": [4, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [5, 6],
        "pz": [1, 0],
        "nx": [2, 1],
        "ny": [5, 1],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 14],
        "py": [3, 5],
        "pz": [1, 0],
        "nx": [5, 0],
        "ny": [16, 7],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 2],
        "py": [18, 5],
        "pz": [0, 2],
        "nx": [11, 4],
        "ny": [16, 4],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [6, 16],
        "py": [19, 20],
        "pz": [0, -1],
        "nx": [3, 2],
        "ny": [10, 5],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [5, 3],
        "py": [3, 1],
        "pz": [0, 1],
        "nx": [1, 3],
        "ny": [4, 8],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [12, 6],
        "py": [13, 6],
        "pz": [0, 1],
        "nx": [10, 1],
        "ny": [12, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 3],
        "py": [6, 2],
        "pz": [1, -1],
        "nx": [4, 8],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [9, 3],
        "py": [21, 2],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [1, 0],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [8, 4],
        "py": [1, 0],
        "pz": [1, -1],
        "nx": [8, 6],
        "ny": [4, 2],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [2, 7],
        "py": [1, 6],
        "pz": [2, -1],
        "nx": [7, 9],
        "ny": [6, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [8, 3],
        "pz": [1, 2],
        "nx": [10, 5],
        "ny": [19, 11],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [3, 4],
        "pz": [2, 2],
        "nx": [3, 6],
        "ny": [4, 6],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [3, 11],
        "py": [5, 20],
        "pz": [2, 0],
        "nx": [11, 5],
        "ny": [21, 8],
        "nz": [0, -1]
      }, {
        "size": 3,
        "px": [5, 9, 5],
        "py": [4, 7, 5],
        "pz": [2, 0, 2],
        "nx": [23, 10, 4],
        "ny": [23, 3, 22],
        "nz": [0, -1, -1]
      }, {
        "size": 4,
        "px": [11, 9, 7, 1],
        "py": [13, 8, 11, 10],
        "pz": [0, -1, -1, -1],
        "nx": [8, 2, 11, 12],
        "ny": [4, 2, 4, 4],
        "nz": [1, 2, 0, 0]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [7, 6],
        "pz": [1, 1],
        "nx": [0, 4],
        "ny": [1, 0],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [19, 20],
        "py": [0, 1],
        "pz": [0, 0],
        "nx": [21, 1],
        "ny": [0, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 5],
        "py": [11, 0],
        "pz": [0, -1],
        "nx": [11, 0],
        "ny": [12, 1],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [1, 1],
        "pz": [0, -1],
        "nx": [4, 7],
        "ny": [5, 4],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [5, 12],
        "py": [4, 23],
        "pz": [2, -1],
        "nx": [13, 15],
        "ny": [5, 4],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 20],
        "py": [4, 16],
        "pz": [0, -1],
        "nx": [9, 4],
        "ny": [2, 1],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [12, 13],
        "py": [2, 2],
        "pz": [0, 0],
        "nx": [4, 16],
        "ny": [2, 11],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [19, 14],
        "py": [10, 17],
        "pz": [0, -1],
        "nx": [3, 8],
        "ny": [0, 2],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [8, 12],
        "py": [1, 2],
        "pz": [1, 0],
        "nx": [19, 10],
        "ny": [3, 1],
        "nz": [0, -1]
      }, {
        "size": 4,
        "px": [17, 2, 3, 10],
        "py": [8, 6, 2, 12],
        "pz": [0, 1, 2, 0],
        "nx": [17, 9, 12, 2],
        "ny": [9, 22, 13, 5],
        "nz": [0, -1, -1, -1]
      }, {
        "size": 2,
        "px": [20, 10],
        "py": [15, 7],
        "pz": [0, 1],
        "nx": [13, 9],
        "ny": [7, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [0, 0],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [10, 3],
        "ny": [9, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [4, 3],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [0, 22],
        "ny": [14, 6],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 3],
        "py": [4, 0],
        "pz": [0, 2],
        "nx": [16, 3],
        "ny": [2, 0],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [8, 16],
        "py": [6, 12],
        "pz": [1, 0],
        "nx": [8, 12],
        "ny": [4, 7],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [5, 11],
        "py": [0, 5],
        "pz": [2, 1],
        "nx": [10, 1],
        "ny": [5, 5],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [7, 4],
        "py": [5, 5],
        "pz": [0, -1],
        "nx": [3, 6],
        "ny": [2, 3],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [11, 11],
        "py": [11, 12],
        "pz": [0, 0],
        "nx": [23, 7],
        "ny": [20, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [16, 8],
        "py": [12, 5],
        "pz": [0, 1],
        "nx": [8, 2],
        "ny": [2, 1],
        "nz": [1, -1]
      }, {
        "size": 3,
        "px": [6, 11, 11],
        "py": [11, 23, 20],
        "pz": [1, 0, 0],
        "nx": [11, 3, 22],
        "ny": [21, 3, 16],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [17, 15],
        "py": [3, 2],
        "pz": [0, -1],
        "nx": [4, 4],
        "ny": [3, 2],
        "nz": [2, 2]
      }, {
        "size": 2,
        "px": [21, 21],
        "py": [11, 10],
        "pz": [0, 0],
        "nx": [11, 3],
        "ny": [6, 2],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [23, 21],
        "py": [22, 10],
        "pz": [0, -1],
        "nx": [20, 10],
        "ny": [18, 10],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [4, 2],
        "py": [6, 3],
        "pz": [1, 2],
        "nx": [3, 2],
        "ny": [4, 3],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [16, 0],
        "py": [18, 11],
        "pz": [0, -1],
        "nx": [8, 7],
        "ny": [4, 4],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [6, 21],
        "py": [3, 16],
        "pz": [0, -1],
        "nx": [1, 8],
        "ny": [2, 14],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [8, 1],
        "py": [3, 0],
        "pz": [0, -1],
        "nx": [11, 11],
        "ny": [2, 1],
        "nz": [0, 0]
      }, {
        "size": 3,
        "px": [11, 11, 11],
        "py": [9, 10, 8],
        "pz": [1, 1, 1],
        "nx": [23, 1, 0],
        "ny": [23, 9, 11],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [6, 3],
        "py": [2, 1],
        "pz": [1, 2],
        "nx": [7, 1],
        "ny": [8, 2],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 17],
        "py": [17, 19],
        "pz": [0, -1],
        "nx": [10, 4],
        "ny": [16, 9],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [7, 1],
        "pz": [1, -1],
        "nx": [11, 0],
        "ny": [11, 8],
        "nz": [0, 1]
      }, {
        "size": 2,
        "px": [10, 5],
        "py": [11, 4],
        "pz": [1, 2],
        "nx": [5, 5],
        "ny": [0, 0],
        "nz": [2, -1]
      }, {
        "size": 2,
        "px": [3, 6],
        "py": [3, 6],
        "pz": [2, 1],
        "nx": [8, 0],
        "ny": [4, 16],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [14, 1],
        "py": [20, 2],
        "pz": [0, -1],
        "nx": [7, 7],
        "ny": [11, 9],
        "nz": [1, 1]
      }, {
        "size": 3,
        "px": [11, 13, 4],
        "py": [16, 21, 3],
        "pz": [0, 0, 2],
        "nx": [14, 16, 5],
        "ny": [20, 14, 9],
        "nz": [0, -1, -1]
      }, {
        "size": 2,
        "px": [7, 0],
        "py": [1, 1],
        "pz": [1, -1],
        "nx": [4, 7],
        "ny": [2, 4],
        "nz": [2, 1]
      }, {
        "size": 2,
        "px": [23, 11],
        "py": [9, 4],
        "pz": [0, 1],
        "nx": [11, 3],
        "ny": [1, 3],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 13],
        "py": [23, 23],
        "pz": [0, 0],
        "nx": [13, 13],
        "ny": [20, 20],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [10, 8],
        "py": [5, 11],
        "pz": [0, -1],
        "nx": [20, 19],
        "ny": [18, 20],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [19, 5],
        "py": [22, 4],
        "pz": [0, -1],
        "nx": [2, 9],
        "ny": [3, 17],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [15, 2],
        "py": [13, 7],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 2,
        "px": [14, 13],
        "py": [17, 2],
        "pz": [0, -1],
        "nx": [15, 13],
        "ny": [19, 15],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [12, 23],
        "py": [8, 22],
        "pz": [0, -1],
        "nx": [7, 10],
        "ny": [5, 9],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [2, 6],
        "py": [21, 10],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [3, 3],
        "nz": [1, 1]
      }, {
        "size": 2,
        "px": [15, 11],
        "py": [5, 0],
        "pz": [0, -1],
        "nx": [3, 4],
        "ny": [17, 16],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [3, 1],
        "py": [18, 8],
        "pz": [0, 1],
        "nx": [14, 4],
        "ny": [17, 7],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [15, 3],
        "py": [18, 3],
        "pz": [0, 2],
        "nx": [1, 22],
        "ny": [0, 1],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [13, 3],
        "py": [9, 3],
        "pz": [0, -1],
        "nx": [0, 1],
        "ny": [9, 20],
        "nz": [1, 0]
      }, {
        "size": 2,
        "px": [1, 1],
        "py": [1, 0],
        "pz": [2, 2],
        "nx": [9, 23],
        "ny": [10, 12],
        "nz": [1, -1]
      }, {
        "size": 4,
        "px": [9, 0, 9, 1],
        "py": [8, 0, 0, 10],
        "pz": [1, -1, -1, -1],
        "nx": [23, 7, 5, 23],
        "ny": [20, 7, 5, 19],
        "nz": [0, 1, 2, 0]
      }, {
        "size": 2,
        "px": [18, 18],
        "py": [12, 12],
        "pz": [0, -1],
        "nx": [8, 4],
        "ny": [4, 2],
        "nz": [1, 2]
      }, {
        "size": 3,
        "px": [0, 4, 1],
        "py": [3, 5, 3],
        "pz": [1, -1, -1],
        "nx": [16, 11, 8],
        "ny": [8, 5, 6],
        "nz": [0, 0, 0]
      }, {
        "size": 5,
        "px": [9, 10, 14, 11, 11],
        "py": [0, 0, 0, 0, 0],
        "pz": [0, 0, 0, 0, -1],
        "nx": [8, 3, 4, 6, 2],
        "ny": [22, 9, 5, 4, 0],
        "nz": [0, 1, 0, 0, 2]
      }, {
        "size": 2,
        "px": [6, 5],
        "py": [2, 2],
        "pz": [1, 1],
        "nx": [7, 3],
        "ny": [8, 7],
        "nz": [0, -1]
      }, {
        "size": 2,
        "px": [11, 5],
        "py": [15, 2],
        "pz": [0, -1],
        "nx": [3, 10],
        "ny": [0, 1],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [0, 11],
        "py": [11, 12],
        "pz": [1, -1],
        "nx": [22, 22],
        "ny": [14, 13],
        "nz": [0, 0]
      }, {
        "size": 2,
        "px": [2, 2],
        "py": [15, 14],
        "pz": [0, 0],
        "nx": [1, 2],
        "ny": [11, 8],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [11, 6],
        "py": [0, 7],
        "pz": [1, -1],
        "nx": [19, 5],
        "ny": [3, 0],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [2, 3],
        "py": [3, 7],
        "pz": [2, 1],
        "nx": [1, 5],
        "ny": [5, 0],
        "nz": [1, -1]
      }, {
        "size": 2,
        "px": [10, 14],
        "py": [4, 5],
        "pz": [0, -1],
        "nx": [4, 18],
        "ny": [2, 12],
        "nz": [2, 0]
      }, {
        "size": 2,
        "px": [19, 10],
        "py": [12, 2],
        "pz": [0, -1],
        "nx": [13, 4],
        "ny": [10, 2],
        "nz": [0, 2]
      }, {
        "size": 2,
        "px": [6, 1],
        "py": [21, 6],
        "pz": [0, -1],
        "nx": [6, 5],
        "ny": [0, 0],
        "nz": [1, 1]
      }],
      "alpha": [-1.044179e+00, 1.044179e+00, -6.003138e-01, 6.003138e-01, -4.091282e-01, 4.091282e-01, -4.590148e-01, 4.590148e-01, -4.294004e-01, 4.294004e-01, -3.360846e-01, 3.360846e-01, -3.054186e-01, 3.054186e-01, -2.901743e-01, 2.901743e-01, -3.522417e-01, 3.522417e-01, -3.195838e-01, 3.195838e-01, -2.957309e-01, 2.957309e-01, -2.876727e-01, 2.876727e-01, -2.637460e-01, 2.637460e-01, -2.607900e-01, 2.607900e-01, -2.455714e-01, 2.455714e-01, -2.749847e-01, 2.749847e-01, -2.314217e-01, 2.314217e-01, -2.540871e-01, 2.540871e-01, -2.143416e-01, 2.143416e-01, -2.565697e-01, 2.565697e-01, -1.901272e-01, 1.901272e-01, -2.259981e-01, 2.259981e-01, -2.012333e-01, 2.012333e-01, -2.448460e-01, 2.448460e-01, -2.192845e-01, 2.192845e-01, -2.005951e-01, 2.005951e-01, -2.259000e-01, 2.259000e-01, -1.955758e-01, 1.955758e-01, -2.235332e-01, 2.235332e-01, -1.704490e-01, 1.704490e-01, -1.584628e-01, 1.584628e-01, -2.167710e-01, 2.167710e-01, -1.592909e-01, 1.592909e-01, -1.967292e-01, 1.967292e-01, -1.432268e-01, 1.432268e-01, -2.039949e-01, 2.039949e-01, -1.404068e-01, 1.404068e-01, -1.788201e-01, 1.788201e-01, -1.498714e-01, 1.498714e-01, -1.282541e-01, 1.282541e-01, -1.630182e-01, 1.630182e-01, -1.398111e-01, 1.398111e-01, -1.464143e-01, 1.464143e-01, -1.281712e-01, 1.281712e-01, -1.417014e-01, 1.417014e-01, -1.779164e-01, 1.779164e-01, -2.067174e-01, 2.067174e-01, -1.344947e-01, 1.344947e-01, -1.357351e-01, 1.357351e-01, -1.683191e-01, 1.683191e-01, -1.821768e-01, 1.821768e-01, -2.158307e-01, 2.158307e-01, -1.812857e-01, 1.812857e-01, -1.635445e-01, 1.635445e-01, -1.474934e-01, 1.474934e-01, -1.771993e-01, 1.771993e-01, -1.517620e-01, 1.517620e-01, -1.283184e-01, 1.283184e-01, -1.862675e-01, 1.862675e-01, -1.420491e-01, 1.420491e-01, -1.232165e-01, 1.232165e-01, -1.472696e-01, 1.472696e-01, -1.192156e-01, 1.192156e-01, -1.602034e-01, 1.602034e-01, -1.321473e-01, 1.321473e-01, -1.358101e-01, 1.358101e-01, -1.295821e-01, 1.295821e-01, -1.289102e-01, 1.289102e-01, -1.232520e-01, 1.232520e-01, -1.332227e-01, 1.332227e-01, -1.358887e-01, 1.358887e-01, -1.179559e-01, 1.179559e-01, -1.263694e-01, 1.263694e-01, -1.444876e-01, 1.444876e-01, -1.933141e-01, 1.933141e-01, -1.917886e-01, 1.917886e-01, -1.199760e-01, 1.199760e-01, -1.359937e-01, 1.359937e-01, -1.690073e-01, 1.690073e-01, -1.894222e-01, 1.894222e-01, -1.699422e-01, 1.699422e-01, -1.340361e-01, 1.340361e-01, -1.840622e-01, 1.840622e-01, -1.277397e-01, 1.277397e-01, -1.381610e-01, 1.381610e-01, -1.282241e-01, 1.282241e-01, -1.211334e-01, 1.211334e-01, -1.264628e-01, 1.264628e-01, -1.373010e-01, 1.373010e-01, -1.363356e-01, 1.363356e-01, -1.562568e-01, 1.562568e-01, -1.268735e-01, 1.268735e-01, -1.037859e-01, 1.037859e-01, -1.394322e-01, 1.394322e-01, -1.449225e-01, 1.449225e-01, -1.109657e-01, 1.109657e-01, -1.086931e-01, 1.086931e-01, -1.379135e-01, 1.379135e-01, -1.881974e-01, 1.881974e-01, -1.304956e-01, 1.304956e-01, -9.921777e-02, 9.921777e-02, -1.398624e-01, 1.398624e-01, -1.216469e-01, 1.216469e-01, -1.272741e-01, 1.272741e-01, -1.878236e-01, 1.878236e-01, -1.336894e-01, 1.336894e-01, -1.256289e-01, 1.256289e-01, -1.247231e-01, 1.247231e-01, -1.853400e-01, 1.853400e-01, -1.087805e-01, 1.087805e-01, -1.205676e-01, 1.205676e-01, -1.023182e-01, 1.023182e-01, -1.268422e-01, 1.268422e-01, -1.422900e-01, 1.422900e-01, -1.098174e-01, 1.098174e-01, -1.317018e-01, 1.317018e-01, -1.378142e-01, 1.378142e-01, -1.274550e-01, 1.274550e-01, -1.142944e-01, 1.142944e-01, -1.713488e-01, 1.713488e-01, -1.103035e-01, 1.103035e-01, -1.045221e-01, 1.045221e-01, -1.293015e-01, 1.293015e-01, -9.763183e-02, 9.763183e-02, -1.387213e-01, 1.387213e-01, -9.031167e-02, 9.031167e-02, -1.283052e-01, 1.283052e-01, -1.133462e-01, 1.133462e-01, -9.370681e-02, 9.370681e-02, -1.079269e-01, 1.079269e-01, -1.331913e-01, 1.331913e-01, -8.969902e-02, 8.969902e-02, -1.044560e-01, 1.044560e-01, -9.387466e-02, 9.387466e-02, -1.208988e-01, 1.208988e-01, -1.252011e-01, 1.252011e-01, -1.401277e-01, 1.401277e-01, -1.461381e-01, 1.461381e-01, -1.323763e-01, 1.323763e-01, -9.923889e-02, 9.923889e-02, -1.142899e-01, 1.142899e-01, -9.110853e-02, 9.110853e-02, -1.106607e-01, 1.106607e-01, -1.253140e-01, 1.253140e-01, -9.657895e-02, 9.657895e-02, -1.030010e-01, 1.030010e-01, -1.348857e-01, 1.348857e-01, -1.237793e-01, 1.237793e-01, -1.296943e-01, 1.296943e-01, -1.323385e-01, 1.323385e-01, -8.331554e-02, 8.331554e-02, -8.417589e-02, 8.417589e-02, -1.104431e-01, 1.104431e-01, -1.170710e-01, 1.170710e-01, -1.391725e-01, 1.391725e-01, -1.485189e-01, 1.485189e-01, -1.840393e-01, 1.840393e-01, -1.238250e-01, 1.238250e-01, -1.095287e-01, 1.095287e-01, -1.177869e-01, 1.177869e-01, -1.036409e-01, 1.036409e-01, -9.802581e-02, 9.802581e-02, -9.364054e-02, 9.364054e-02, -9.936022e-02, 9.936022e-02, -1.117201e-01, 1.117201e-01, -1.081300e-01, 1.081300e-01, -1.331861e-01, 1.331861e-01, -1.192122e-01, 1.192122e-01, -9.889761e-02, 9.889761e-02, -1.173456e-01, 1.173456e-01, -1.032917e-01, 1.032917e-01, -9.268551e-02, 9.268551e-02, -1.178563e-01, 1.178563e-01, -1.215065e-01, 1.215065e-01, -1.060437e-01, 1.060437e-01, -1.010044e-01, 1.010044e-01, -1.021683e-01, 1.021683e-01, -9.974968e-02, 9.974968e-02, -1.161528e-01, 1.161528e-01, -8.686721e-02, 8.686721e-02, -8.145259e-02, 8.145259e-02, -9.937060e-02, 9.937060e-02, -1.170885e-01, 1.170885e-01, -7.693779e-02, 7.693779e-02, -9.047233e-02, 9.047233e-02, -9.168442e-02, 9.168442e-02, -1.054105e-01, 1.054105e-01, -9.036177e-02, 9.036177e-02, -1.251949e-01, 1.251949e-01, -9.523847e-02, 9.523847e-02, -1.038930e-01, 1.038930e-01, -1.433660e-01, 1.433660e-01, -1.489830e-01, 1.489830e-01, -8.393174e-02, 8.393174e-02, -8.888026e-02, 8.888026e-02, -9.347861e-02, 9.347861e-02, -1.044838e-01, 1.044838e-01, -1.102144e-01, 1.102144e-01, -1.383415e-01, 1.383415e-01, -1.466476e-01, 1.466476e-01, -1.129741e-01, 1.129741e-01, -1.310915e-01, 1.310915e-01, -1.070648e-01, 1.070648e-01, -7.559007e-02, 7.559007e-02, -8.812082e-02, 8.812082e-02, -1.234272e-01, 1.234272e-01, -1.088022e-01, 1.088022e-01, -8.388703e-02, 8.388703e-02, -7.179593e-02, 7.179593e-02, -1.008961e-01, 1.008961e-01, -9.030070e-02, 9.030070e-02, -8.581345e-02, 8.581345e-02, -9.023431e-02, 9.023431e-02, -9.807321e-02, 9.807321e-02, -9.621402e-02, 9.621402e-02, -1.730195e-01, 1.730195e-01, -8.984631e-02, 8.984631e-02, -9.556661e-02, 9.556661e-02, -1.047576e-01, 1.047576e-01, -7.854313e-02, 7.854313e-02, -8.682118e-02, 8.682118e-02, -1.159761e-01, 1.159761e-01, -1.339540e-01, 1.339540e-01, -1.003048e-01, 1.003048e-01, -9.747544e-02, 9.747544e-02, -9.501058e-02, 9.501058e-02, -1.321566e-01, 1.321566e-01, -9.194706e-02, 9.194706e-02, -9.359276e-02, 9.359276e-02, -1.015916e-01, 1.015916e-01, -1.174192e-01, 1.174192e-01, -1.039931e-01, 1.039931e-01, -9.746733e-02, 9.746733e-02, -1.286120e-01, 1.286120e-01, -1.044899e-01, 1.044899e-01, -1.066385e-01, 1.066385e-01, -8.368626e-02, 8.368626e-02, -1.271919e-01, 1.271919e-01, -1.055946e-01, 1.055946e-01, -8.272876e-02, 8.272876e-02, -1.370564e-01, 1.370564e-01, -8.539379e-02, 8.539379e-02, -1.100343e-01, 1.100343e-01, -8.102170e-02, 8.102170e-02, -1.028728e-01, 1.028728e-01, -1.305065e-01, 1.305065e-01, -1.059506e-01, 1.059506e-01, -1.264646e-01, 1.264646e-01, -8.383843e-02, 8.383843e-02, -9.357698e-02, 9.357698e-02, -7.474400e-02, 7.474400e-02, -7.814045e-02, 7.814045e-02, -8.600970e-02, 8.600970e-02, -1.206090e-01, 1.206090e-01, -9.986512e-02, 9.986512e-02, -8.516476e-02, 8.516476e-02, -7.198783e-02, 7.198783e-02, -7.838409e-02, 7.838409e-02, -1.005142e-01, 1.005142e-01, -9.951857e-02, 9.951857e-02, -7.253998e-02, 7.253998e-02, -9.913739e-02, 9.913739e-02, -7.500360e-02, 7.500360e-02, -9.258090e-02, 9.258090e-02, -1.400287e-01, 1.400287e-01, -1.044404e-01, 1.044404e-01, -7.404339e-02, 7.404339e-02, -7.256833e-02, 7.256833e-02, -1.006995e-01, 1.006995e-01, -1.426043e-01, 1.426043e-01, -1.036529e-01, 1.036529e-01, -1.208443e-01, 1.208443e-01, -1.074245e-01, 1.074245e-01, -1.141448e-01, 1.141448e-01, -1.015809e-01, 1.015809e-01, -1.028822e-01, 1.028822e-01, -1.055682e-01, 1.055682e-01, -9.468699e-02, 9.468699e-02, -1.010098e-01, 1.010098e-01, -1.205054e-01, 1.205054e-01, -8.392956e-02, 8.392956e-02, -8.052297e-02, 8.052297e-02, -9.576507e-02, 9.576507e-02, -9.515692e-02, 9.515692e-02, -1.564745e-01, 1.564745e-01, -7.357238e-02, 7.357238e-02, -1.129262e-01, 1.129262e-01, -1.013265e-01, 1.013265e-01, -8.760761e-02, 8.760761e-02, -8.714771e-02, 8.714771e-02, -9.605039e-02, 9.605039e-02, -9.064677e-02, 9.064677e-02, -8.243857e-02, 8.243857e-02, -8.495858e-02, 8.495858e-02, -8.350249e-02, 8.350249e-02, -7.423234e-02, 7.423234e-02, -7.930799e-02, 7.930799e-02, -6.620023e-02, 6.620023e-02, -7.311919e-02, 7.311919e-02, -1.237938e-01, 1.237938e-01, -1.086814e-01, 1.086814e-01, -6.379798e-02, 6.379798e-02, -7.526021e-02, 7.526021e-02, -8.297097e-02, 8.297097e-02, -8.186337e-02, 8.186337e-02, -7.627362e-02, 7.627362e-02, -1.061638e-01, 1.061638e-01, -8.328494e-02, 8.328494e-02, -1.040895e-01, 1.040895e-01, -7.649056e-02, 7.649056e-02, -7.299058e-02, 7.299058e-02, -9.195198e-02, 9.195198e-02, -7.990880e-02, 7.990880e-02, -7.429346e-02, 7.429346e-02, -9.991702e-02, 9.991702e-02, -9.755385e-02, 9.755385e-02, -1.344138e-01, 1.344138e-01, -1.707917e-01, 1.707917e-01, -8.325450e-02, 8.325450e-02, -8.137793e-02, 8.137793e-02, -8.308659e-02, 8.308659e-02, -7.440414e-02, 7.440414e-02, -7.012744e-02, 7.012744e-02, -8.122943e-02, 8.122943e-02, -8.845462e-02, 8.845462e-02, -8.803450e-02, 8.803450e-02, -9.653392e-02, 9.653392e-02, -8.795691e-02, 8.795691e-02, -1.119045e-01, 1.119045e-01, -1.068308e-01, 1.068308e-01, -8.406359e-02, 8.406359e-02, -1.220414e-01, 1.220414e-01, -1.024235e-01, 1.024235e-01, -1.252897e-01, 1.252897e-01, -1.121234e-01, 1.121234e-01, -9.054150e-02, 9.054150e-02, -8.974435e-02, 8.974435e-02, -1.351578e-01, 1.351578e-01, -1.106442e-01, 1.106442e-01, -8.093913e-02, 8.093913e-02, -9.800762e-02, 9.800762e-02, -7.012823e-02, 7.012823e-02, -7.434949e-02, 7.434949e-02, -8.684816e-02, 8.684816e-02, -8.916388e-02, 8.916388e-02, -8.773159e-02, 8.773159e-02, -7.709608e-02, 7.709608e-02, -7.230518e-02, 7.230518e-02, -9.662156e-02, 9.662156e-02, -7.957632e-02, 7.957632e-02, -7.628441e-02, 7.628441e-02, -8.050202e-02, 8.050202e-02, -1.290593e-01, 1.290593e-01, -9.246182e-02, 9.246182e-02, -9.703662e-02, 9.703662e-02, -7.866445e-02, 7.866445e-02, -1.064783e-01, 1.064783e-01, -1.012339e-01, 1.012339e-01, -6.828389e-02, 6.828389e-02, -1.005039e-01, 1.005039e-01, -7.559687e-02, 7.559687e-02, -6.359878e-02, 6.359878e-02, -8.387002e-02, 8.387002e-02, -7.851323e-02, 7.851323e-02, -8.878569e-02, 8.878569e-02, -7.767654e-02, 7.767654e-02, -8.033338e-02, 8.033338e-02, -9.142797e-02, 9.142797e-02, -8.590585e-02, 8.590585e-02, -1.052318e-01, 1.052318e-01, -8.760062e-02, 8.760062e-02, -9.222192e-02, 9.222192e-02, -7.548828e-02, 7.548828e-02, -8.003344e-02, 8.003344e-02, -1.177076e-01, 1.177076e-01, -1.064964e-01, 1.064964e-01, -8.655553e-02, 8.655553e-02, -9.418112e-02, 9.418112e-02, -7.248163e-02, 7.248163e-02, -7.120974e-02, 7.120974e-02, -6.393114e-02, 6.393114e-02, -7.997487e-02, 7.997487e-02, -1.220941e-01, 1.220941e-01, -9.892518e-02, 9.892518e-02, -8.270271e-02, 8.270271e-02, -1.069400e-01, 1.069400e-01, -5.860771e-02, 5.860771e-02, -9.126600e-02, 9.126600e-02, -6.212559e-02, 6.212559e-02, -9.397538e-02, 9.397538e-02, -8.070447e-02, 8.070447e-02, -8.415587e-02, 8.415587e-02, -8.564455e-02, 8.564455e-02, -7.791811e-02, 7.791811e-02, -6.642259e-02, 6.642259e-02, -8.266167e-02, 8.266167e-02, -1.134986e-01, 1.134986e-01, -1.045267e-01, 1.045267e-01, -7.122085e-02, 7.122085e-02, -7.979415e-02, 7.979415e-02, -7.922347e-02, 7.922347e-02, -9.003421e-02, 9.003421e-02, -8.796449e-02, 8.796449e-02, -7.933279e-02, 7.933279e-02, -8.307947e-02, 8.307947e-02, -8.946349e-02, 8.946349e-02, -7.643384e-02, 7.643384e-02, -7.818534e-02, 7.818534e-02, -7.990991e-02, 7.990991e-02, -9.885664e-02, 9.885664e-02, -8.071329e-02, 8.071329e-02, -6.952112e-02, 6.952112e-02, -6.429706e-02, 6.429706e-02, -6.307229e-02, 6.307229e-02, -8.100137e-02, 8.100137e-02, -7.693623e-02, 7.693623e-02, -6.906625e-02, 6.906625e-02, -7.390462e-02, 7.390462e-02, -6.487217e-02, 6.487217e-02, -1.233681e-01, 1.233681e-01, -6.979273e-02, 6.979273e-02, -8.358669e-02, 8.358669e-02, -1.095420e-01, 1.095420e-01, -8.519717e-02, 8.519717e-02, -7.599857e-02, 7.599857e-02, -6.042816e-02, 6.042816e-02, -6.546304e-02, 6.546304e-02, -1.016245e-01, 1.016245e-01, -8.308787e-02, 8.308787e-02, -7.385708e-02, 7.385708e-02, -6.751630e-02, 6.751630e-02, -9.036695e-02, 9.036695e-02, -9.371335e-02, 9.371335e-02, -1.116088e-01, 1.116088e-01, -5.693741e-02, 5.693741e-02, -6.383983e-02, 6.383983e-02, -5.389843e-02, 5.389843e-02, -8.383191e-02, 8.383191e-02, -7.820822e-02, 7.820822e-02, -7.067557e-02, 7.067557e-02, -7.971948e-02, 7.971948e-02, -7.360668e-02, 7.360668e-02, -7.008027e-02, 7.008027e-02, -8.013378e-02, 8.013378e-02, -8.331605e-02, 8.331605e-02, -7.145702e-02, 7.145702e-02, -7.863940e-02, 7.863940e-02, -6.992679e-02, 6.992679e-02, -5.716495e-02, 5.716495e-02, -5.306006e-02, 5.306006e-02, -8.855639e-02, 8.855639e-02, -7.656397e-02, 7.656397e-02, -6.939272e-02, 6.939272e-02, -7.523742e-02, 7.523742e-02, -8.472299e-02, 8.472299e-02, -8.114341e-02, 8.114341e-02, -6.795517e-02, 6.795517e-02, -7.890130e-02, 7.890130e-02, -7.488741e-02, 7.488741e-02, -9.281972e-02, 9.281972e-02, -9.325498e-02, 9.325498e-02, -1.401587e-01, 1.401587e-01, -1.176284e-01, 1.176284e-01, -8.867597e-02, 8.867597e-02, -8.124232e-02, 8.124232e-02, -9.441235e-02, 9.441235e-02, -8.029452e-02, 8.029452e-02, -8.581848e-02, 8.581848e-02, -1.029819e-01, 1.029819e-01, -9.569118e-02, 9.569118e-02, -7.690893e-02, 7.690893e-02, -9.018228e-02, 9.018228e-02, -1.049209e-01, 1.049209e-01, -8.969413e-02, 8.969413e-02, -8.651891e-02, 8.651891e-02, -8.613331e-02, 8.613331e-02, -7.120468e-02, 7.120468e-02, -8.743959e-02, 8.743959e-02, -7.607158e-02, 7.607158e-02, -1.015547e-01, 1.015547e-01, -8.090879e-02, 8.090879e-02, -7.114079e-02, 7.114079e-02, -8.744835e-02, 8.744835e-02, -6.074904e-02, 6.074904e-02, -6.919871e-02, 6.919871e-02, -7.607774e-02, 7.607774e-02, -9.444600e-02, 9.444600e-02, -7.833429e-02, 7.833429e-02, -6.817555e-02, 6.817555e-02, -8.997390e-02, 8.997390e-02, -9.845223e-02, 9.845223e-02, -7.894180e-02, 7.894180e-02, -7.921373e-02, 7.921373e-02, -7.448032e-02, 7.448032e-02, -1.178165e-01, 1.178165e-01, -8.216686e-02, 8.216686e-02, -8.103286e-02, 8.103286e-02, -6.981470e-02, 6.981470e-02, -8.709008e-02, 8.709008e-02, -8.336259e-02, 8.336259e-02, -6.213589e-02, 6.213589e-02, -7.068045e-02, 7.068045e-02, -6.915676e-02, 6.915676e-02, -7.103416e-02, 7.103416e-02, -6.523849e-02, 6.523849e-02, -7.634760e-02, 7.634760e-02, -7.263038e-02, 7.263038e-02, -7.164396e-02, 7.164396e-02, -8.745559e-02, 8.745559e-02, -6.960181e-02, 6.960181e-02, -8.500098e-02, 8.500098e-02, -6.523260e-02, 6.523260e-02, -7.319714e-02, 7.319714e-02, -6.268125e-02, 6.268125e-02, -7.083135e-02, 7.083135e-02, -7.984517e-02, 7.984517e-02, -1.256265e-01, 1.256265e-01, -1.065412e-01, 1.065412e-01, -8.524323e-02, 8.524323e-02, -9.291364e-02, 9.291364e-02, -7.936567e-02, 7.936567e-02, -8.607723e-02, 8.607723e-02, -7.583416e-02, 7.583416e-02, -7.931928e-02, 7.931928e-02, -7.408357e-02, 7.408357e-02, -1.034404e-01, 1.034404e-01, -1.012127e-01, 1.012127e-01, -7.916689e-02, 7.916689e-02, -8.753651e-02, 8.753651e-02, -6.090366e-02, 6.090366e-02, -7.500103e-02, 7.500103e-02, -1.228709e-01, 1.228709e-01, -6.318201e-02, 6.318201e-02, -7.585420e-02, 7.585420e-02, -7.089090e-02, 7.089090e-02, -1.053542e-01, 1.053542e-01, -8.549521e-02, 8.549521e-02, -7.906308e-02, 7.906308e-02, -6.338780e-02, 6.338780e-02, -8.417910e-02, 8.417910e-02, -7.115511e-02, 7.115511e-02, -7.693949e-02, 7.693949e-02, -7.446749e-02, 7.446749e-02, -1.037929e-01, 1.037929e-01, -7.991005e-02, 7.991005e-02, -7.119439e-02, 7.119439e-02, -7.071340e-02, 7.071340e-02, -8.587362e-02, 8.587362e-02, -7.001236e-02, 7.001236e-02, -7.567115e-02, 7.567115e-02, -7.118930e-02, 7.118930e-02, -6.844895e-02, 6.844895e-02, -1.035118e-01, 1.035118e-01, -8.156618e-02, 8.156618e-02, -7.449593e-02, 7.449593e-02, -8.154360e-02, 8.154360e-02, -9.110878e-02, 9.110878e-02, -6.222534e-02, 6.222534e-02, -1.033841e-01, 1.033841e-01, -6.811687e-02, 6.811687e-02, -6.828443e-02, 6.828443e-02, -5.769408e-02, 5.769408e-02, -5.917684e-02, 5.917684e-02, -8.358868e-02, 8.358868e-02]
    }]
  };
  headtrackr.getWhitebalance = function(canvas) {
    var avggray,
        avgr,
        avgb,
        avgg;
    var canvasContext = canvas.getContext('2d');
    var image = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
    var id = image.data;
    var imagesize = image.width * image.height;
    var r = g = b = 0;
    for (var i = 0; i < imagesize; i++) {
      r += id[4 * i];
      g += id[(4 * i) + 1];
      b += id[(4 * i) + 2];
    }
    avgr = r / imagesize;
    avgg = g / imagesize;
    avgb = b / imagesize;
    avggray = (avgr + avgg + avgb) / 3;
    return avggray;
  };
  headtrackr.Smoother = function(alpha, interval) {
    var sp,
        sp2,
        sl,
        newPositions,
        positions;
    var updateTime = new Date();
    this.initialized = false;
    this.interpolate = false;
    this.init = function(initPos) {
      this.initialized = true;
      sp = [initPos.x, initPos.y, initPos.z, initPos.width, initPos.height];
      sp2 = sp;
      sl = sp.length;
    };
    this.smooth = function(pos) {
      positions = [pos.x, pos.y, pos.z, pos.width, pos.height];
      if (this.initialized) {
        for (var i = 0; i < sl; i++) {
          sp[i] = alpha * positions[i] + (1 - alpha) * sp[i];
          sp2[i] = alpha * sp[i] + (1 - alpha) * sp2[i];
        }
        updateTime = new Date();
        var msDiff = (new Date()) - updateTime;
        var newPositions = predict(msDiff);
        pos.x = newPositions[0];
        pos.y = newPositions[1];
        pos.z = newPositions[2];
        pos.width = newPositions[3];
        pos.height = newPositions[4];
        return pos;
      } else {
        return false;
      }
    };
    function predict(time) {
      var retPos = [];
      if (this.interpolate) {
        var step = time / interval;
        var stepLo = step >> 0;
        var ratio = alpha / (1 - alpha);
        var a = (step - stepLo) * ratio;
        var b = (2 + stepLo * ratio);
        var c = (1 + stepLo * ratio);
        for (var i = 0; i < sl; i++) {
          retPos[i] = a * (sp[i] - sp2[i]) + b * sp[i] - c * sp2[i];
        }
      } else {
        var step = time / interval >> 0;
        var ratio = (alpha * step) / (1 - alpha);
        var a = 2 + ratio;
        var b = 1 + ratio;
        for (var i = 0; i < sl; i++) {
          retPos[i] = a * sp[i] - b * sp2[i];
        }
      }
      return retPos;
    }
  };
  headtrackr.camshift = {};
  headtrackr.camshift.Histogram = function(imgdata) {
    this.size = 4096;
    var bins = [];
    var i,
        x,
        r,
        g,
        b,
        il;
    for (i = 0; i < this.size; i++) {
      bins.push(0);
    }
    for (x = 0, il = imgdata.length; x < il; x += 4) {
      r = imgdata[x + 0] >> 4;
      g = imgdata[x + 1] >> 4;
      b = imgdata[x + 2] >> 4;
      bins[256 * r + 16 * g + b] += 1;
    }
    this.getBin = function(index) {
      return bins[index];
    };
  };
  headtrackr.camshift.Moments = function(data, x, y, w, h, second) {
    this.m00 = 0;
    this.m01 = 0;
    this.m10 = 0;
    this.m11 = 0;
    this.m02 = 0;
    this.m20 = 0;
    var i,
        j,
        val,
        vx,
        vy;
    var a = [];
    for (i = x; i < w; i++) {
      a = data[i];
      vx = i - x;
      for (j = y; j < h; j++) {
        val = a[j];
        vy = j - y;
        this.m00 += val;
        this.m01 += vy * val;
        this.m10 += vx * val;
        if (second) {
          this.m11 += vx * vy * val;
          this.m02 += vy * vy * val;
          this.m20 += vx * vx * val;
        }
      }
    }
    this.invM00 = 1 / this.m00;
    this.xc = this.m10 * this.invM00;
    this.yc = this.m01 * this.invM00;
    this.mu00 = this.m00;
    this.mu01 = 0;
    this.mu10 = 0;
    if (second) {
      this.mu20 = this.m20 - this.m10 * this.xc;
      this.mu02 = this.m02 - this.m01 * this.yc;
      this.mu11 = this.m11 - this.m01 * this.xc;
    }
  };
  headtrackr.camshift.Rectangle = function(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.clone = function() {
      var c = new headtrackr.camshift.Rectangle();
      c.height = this.height;
      c.width = this.width;
      c.x = this.x;
      c.y = this.y;
      return c;
    };
  };
  headtrackr.camshift.Tracker = function(params) {
    if (params === undefined)
      params = {};
    if (params.calcAngles === undefined)
      params.calcAngles = true;
    var _modelHist,
        _curHist,
        _pdf,
        _searchWindow,
        _trackObj,
        _canvasCtx,
        _canvasw,
        _canvash;
    this.getSearchWindow = function() {
      return _searchWindow.clone();
    };
    this.getTrackObj = function() {
      return _trackObj.clone();
    };
    this.getPdf = function() {
      return _pdf;
    };
    this.getBackProjectionImg = function() {
      var weights = _pdf;
      var w = _canvasw;
      var h = _canvash;
      var img = _canvasCtx.createImageData(w, h);
      var imgData = img.data;
      var x,
          y,
          val;
      for (x = 0; x < w; x++) {
        for (y = 0; y < h; y++) {
          val = Math.floor(255 * weights[x][y]);
          pos = ((y * w) + x) * 4;
          imgData[pos] = val;
          imgData[pos + 1] = val;
          imgData[pos + 2] = val;
          imgData[pos + 3] = 255;
        }
      }
      return img;
    };
    this.initTracker = function(canvas, trackedArea) {
      _canvasCtx = canvas.getContext("2d");
      var taw = trackedArea.width;
      var tah = trackedArea.height;
      var tax = trackedArea.x;
      var tay = trackedArea.y;
      var trackedImg = _canvasCtx.getImageData(tax, tay, taw, tah);
      _modelHist = new headtrackr.camshift.Histogram(trackedImg.data);
      _searchWindow = trackedArea.clone();
      _trackObj = new headtrackr.camshift.TrackObj();
    };
    this.track = function(canvas) {
      var canvasCtx = canvas.getContext("2d");
      _canvash = canvas.height;
      _canvasw = canvas.width;
      var imgData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
      if (imgData.width != 0 && imgData.height != 0)
        camShift(imgData);
    };
    function camShift(frame) {
      var w = frame.width;
      var h = frame.height;
      var m = meanShift(frame);
      var a = m.mu20 * m.invM00;
      var c = m.mu02 * m.invM00;
      if (params.calcAngles) {
        var b = m.mu11 * m.invM00;
        var d = a + c;
        var e = Math.sqrt((4 * b * b) + ((a - c) * (a - c)));
        _trackObj.width = Math.sqrt((d - e) * 0.5) << 2;
        _trackObj.height = Math.sqrt((d + e) * 0.5) << 2;
        _trackObj.angle = Math.atan2(2 * b, a - c + e);
        if (_trackObj.angle < 0)
          _trackObj.angle = _trackObj.angle + Math.PI;
      } else {
        _trackObj.width = Math.sqrt(a) << 2;
        _trackObj.height = Math.sqrt(c) << 2;
        _trackObj.angle = Math.PI / 2;
      }
      _trackObj.x = Math.floor(Math.max(0, Math.min(_searchWindow.x + _searchWindow.width / 2, w)));
      _trackObj.y = Math.floor(Math.max(0, Math.min(_searchWindow.y + _searchWindow.height / 2, h)));
      _searchWindow.width = Math.floor(1.1 * _trackObj.width);
      _searchWindow.height = Math.floor(1.1 * _trackObj.height);
    }
    function meanShift(frame) {
      var w = frame.width;
      var h = frame.height;
      var imgData = frame.data;
      var curHist = new headtrackr.camshift.Histogram(imgData);
      var weights = getWeights(_modelHist, curHist);
      _pdf = getBackProjectionData(imgData, frame.width, frame.height, weights);
      var m,
          x,
          y,
          i,
          wadx,
          wady,
          wadw,
          wadh;
      var meanShiftIterations = 10;
      var prevx = _searchWindow.x;
      var prevy = _searchWindow.y;
      for (i = 0; i < meanShiftIterations; i++) {
        wadx = Math.max(_searchWindow.x, 0);
        wady = Math.max(_searchWindow.y, 0);
        wadw = Math.min(wadx + _searchWindow.width, w);
        wadh = Math.min(wady + _searchWindow.height, h);
        m = new headtrackr.camshift.Moments(_pdf, wadx, wady, wadw, wadh, (i == meanShiftIterations - 1));
        x = m.xc;
        y = m.yc;
        _searchWindow.x += ((x - _searchWindow.width / 2) >> 0);
        _searchWindow.y += ((y - _searchWindow.height / 2) >> 0);
        if (_searchWindow.x == prevx && _searchWindow.y == prevy) {
          m = new headtrackr.camshift.Moments(_pdf, wadx, wady, wadw, wadh, true);
          break;
        } else {
          prevx = _searchWindow.x;
          prevy = _searchWindow.y;
        }
      }
      _searchWindow.x = Math.max(0, Math.min(_searchWindow.x, w));
      _searchWindow.y = Math.max(0, Math.min(_searchWindow.y, h));
      return m;
    }
    function getWeights(mh, ch) {
      var weights = [];
      var p;
      for (var i = 0; i < 4096; i++) {
        if (ch.getBin(i) != 0) {
          p = Math.min(mh.getBin(i) / ch.getBin(i), 1);
        } else {
          p = 0;
        }
        weights.push(p);
      }
      return weights;
    }
    function getBackProjectionData(imgData, idw, idh, weights, hsMap) {
      var data = [];
      var x,
          y,
          r,
          g,
          b,
          pos;
      var a = [];
      for (x = 0; x < idw; x++) {
        a = [];
        for (y = 0; y < idh; y++) {
          pos = ((y * idw) + x) * 4;
          r = imgData[pos] >> 4;
          g = imgData[pos + 1] >> 4;
          b = imgData[pos + 2] >> 4;
          a.push(weights[256 * r + 16 * g + b]);
        }
        data[x] = a;
      }
      return data;
    }
  };
  headtrackr.camshift.TrackObj = function() {
    this.height = 0;
    this.width = 0;
    this.angle = 0;
    this.x = 0;
    this.y = 0;
    this.clone = function() {
      var c = new headtrackr.camshift.TrackObj();
      c.height = this.height;
      c.width = this.width;
      c.angle = this.angle;
      c.x = this.x;
      c.y = this.y;
      return c;
    };
  };
  headtrackr.facetrackr = {};
  headtrackr.facetrackr.Tracker = function(params) {
    if (!params)
      params = {};
    if (params.sendEvents === undefined)
      params.sendEvents = true;
    if (params.whitebalancing === undefined)
      params.whitebalancing = true;
    if (params.debug === undefined) {
      params.debug = false;
    } else {
      if (params.debug.tagName != 'CANVAS')
        params.debug = false;
    }
    if (params.whitebalancing) {
      var _currentDetection = "WB";
    } else {
      var _currentDetection = "VJ";
    }
    if (params.calcAngles == undefined)
      params.calcAngles = false;
    var _inputcanvas,
        _curtracked,
        _cstracker;
    var _confidenceThreshold = -10;
    var previousWhitebalances = [];
    var pwbLength = 15;
    this.init = function(inputcanvas) {
      _inputcanvas = inputcanvas;
      _cstracker = new headtrackr.camshift.Tracker({calcAngles: params.calcAngles});
    };
    this.track = function() {
      var result;
      if (_currentDetection == "WB") {
        result = checkWhitebalance();
      } else if (_currentDetection == "VJ") {
        result = doVJDetection();
      } else if (_currentDetection == "CS") {
        result = doCSDetection();
      }
      if (result.detection == "WB") {
        if (previousWhitebalances.length >= pwbLength)
          previousWhitebalances.pop();
        previousWhitebalances.unshift(result.wb);
        if (previousWhitebalances.length == pwbLength) {
          var max = Math.max.apply(null, previousWhitebalances);
          var min = Math.min.apply(null, previousWhitebalances);
          if ((max - min) < 2) {
            _currentDetection = "VJ";
          }
        }
      }
      if (result.detection == "VJ" && result.confidence > _confidenceThreshold) {
        _currentDetection = "CS";
        var cRectangle = new headtrackr.camshift.Rectangle(Math.floor(result.x), Math.floor(result.y), Math.floor(result.width), Math.floor(result.height));
        _cstracker.initTracker(_inputcanvas, cRectangle);
      }
      _curtracked = result;
      if (result.detection == "CS" && params.sendEvents) {
        var evt = document.createEvent("Event");
        evt.initEvent("facetrackingEvent", true, true);
        evt.height = result.height;
        evt.width = result.width;
        evt.angle = result.angle;
        evt.x = result.x;
        evt.y = result.y;
        evt.confidence = result.confidence;
        evt.detection = result.detection;
        evt.time = result.time;
        document.dispatchEvent(evt);
      }
    };
    this.getTrackingObject = function() {
      return _curtracked.clone();
    };
    function doVJDetection() {
      var start = (new Date).getTime();
      var ccvCanvas = document.createElement('canvas');
      ccvCanvas.width = _inputcanvas.width;
      ccvCanvas.height = _inputcanvas.height;
      ccvCanvas.getContext("2d").drawImage(_inputcanvas, 0, 0, ccvCanvas.width, ccvCanvas.height);
      var comp = headtrackr.ccv.detect_objects(headtrackr.ccv.grayscale(ccvCanvas), headtrackr.cascade, 5, 1);
      var diff = (new Date).getTime() - start;
      var candidate;
      if (comp.length > 0) {
        candidate = comp[0];
      }
      for (var i = 1; i < comp.length; i++) {
        if (comp[i].confidence > candidate.confidence) {
          candidate = comp[i];
        }
      }
      var result = new headtrackr.facetrackr.TrackObj();
      if (!(candidate === undefined)) {
        result.width = candidate.width;
        result.height = candidate.height;
        result.x = candidate.x;
        result.y = candidate.y;
        result.confidence = candidate.confidence;
      }
      result.time = diff;
      result.detection = "VJ";
      return result;
    }
    function doCSDetection() {
      var start = (new Date).getTime();
      _cstracker.track(_inputcanvas);
      var csresult = _cstracker.getTrackObj();
      if (params.debug) {
        params.debug.getContext('2d').putImageData(_cstracker.getBackProjectionImg(), 0, 0);
      }
      var diff = (new Date).getTime() - start;
      var result = new headtrackr.facetrackr.TrackObj();
      result.width = csresult.width;
      result.height = csresult.height;
      result.x = csresult.x;
      result.y = csresult.y;
      result.angle = csresult.angle;
      result.confidence = 1;
      result.time = diff;
      result.detection = "CS";
      return result;
    }
    function checkWhitebalance() {
      var result = new headtrackr.facetrackr.TrackObj();
      result.wb = headtrackr.getWhitebalance(_inputcanvas);
      result.detection = "WB";
      return result;
    }
  };
  headtrackr.facetrackr.TrackObj = function() {
    this.height = 0;
    this.width = 0;
    this.angle = 0;
    this.x = 0;
    this.y = 0;
    this.confidence = -10000;
    this.detection = '';
    this.time = 0;
    this.clone = function() {
      var c = new headtrackr.facetrackr.TrackObj();
      c.height = this.height;
      c.width = this.width;
      c.angle = this.angle;
      c.x = this.x;
      c.y = this.y;
      c.confidence = this.confidence;
      c.detection = this.detection;
      c.time = this.time;
      return c;
    };
  };
  headtrackr.Ui = function() {
    var timeout;
    var d = document.createElement('div'),
        d2 = document.createElement('div'),
        p = document.createElement('p');
    d.setAttribute('id', 'headtrackerMessageDiv');
    d.style.left = "20%";
    d.style.right = "20%";
    d.style.top = "30%";
    d.style.fontSize = "90px";
    d.style.color = "#777";
    d.style.position = "absolute";
    d.style.fontFamily = "Helvetica, Arial, sans-serif";
    d.style.zIndex = '100002';
    d2.style.marginLeft = "auto";
    d2.style.marginRight = "auto";
    d2.style.width = "100%";
    d2.style.textAlign = "center";
    d2.style.color = "#fff";
    d2.style.backgroundColor = "#444";
    d2.style.opacity = "0.5";
    p.setAttribute('id', 'headtrackerMessage');
    d2.appendChild(p);
    d.appendChild(d2);
    document.body.appendChild(d);
    var supportMessages = {
      "no getUserMedia": "getUserMedia is not supported in your browser :(",
      "no camera": "no camera found :("
    };
    var statusMessages = {
      "whitebalance": "Waiting for camera whitebalancing",
      "detecting": "Please wait while camera is detecting your face...",
      "hints": "We seem to have some problems detecting your face. Please make sure that your face is well and evenly lighted, and that your camera is working.",
      "redetecting": "Lost track of face, trying to detect again..",
      "lost": "Lost track of face :(",
      "found": "Face found! Move your head!"
    };
    var override = false;
    document.addEventListener("headtrackrStatus", function(event) {
      if (event.status in statusMessages) {
        window.clearTimeout(timeout);
        if (!override) {
          var messagep = document.getElementById('headtrackerMessage');
          messagep.innerHTML = statusMessages[event.status];
          timeout = window.setTimeout(function() {
            messagep.innerHTML = '';
          }, 3000);
        }
      } else if (event.status in supportMessages) {
        override = true;
        window.clearTimeout(timeout);
        var messagep = document.getElementById('headtrackerMessage');
        messagep.innerHTML = supportMessages[event.status];
        window.setTimeout(function() {
          messagep.innerHTML = 'added fallback video for demo';
        }, 2000);
        window.setTimeout(function() {
          messagep.innerHTML = '';
          override = false;
        }, 4000);
      }
    }, true);
  };
  headtrackr.headposition = {};
  headtrackr.headposition.Tracker = function(facetrackrObj, camwidth, camheight, params) {
    if (!params)
      params = {};
    if (params.edgecorrection === undefined) {
      var edgecorrection = true;
    } else {
      var edgecorrection = params.edgecorrection;
    }
    this.camheight_cam = camheight;
    this.camwidth_cam = camwidth;
    var head_width_cm = 16;
    var head_height_cm = 19;
    var head_small_angle = Math.atan(head_width_cm / head_height_cm);
    var head_diag_cm = Math.sqrt((head_width_cm * head_width_cm) + (head_height_cm * head_height_cm));
    var sin_hsa = Math.sin(head_small_angle);
    var cos_hsa = Math.cos(head_small_angle);
    var tan_hsa = Math.tan(head_small_angle);
    var init_width_cam = facetrackrObj.width;
    var init_height_cam = facetrackrObj.height;
    var head_diag_cam = Math.sqrt((init_width_cam * init_width_cam) + (init_height_cam * init_height_cam));
    if (params.fov === undefined) {
      var head_width_cam = sin_hsa * head_diag_cam;
      var camwidth_at_default_face_cm = (this.camwidth_cam / head_width_cam) * head_width_cm;
      if (params.distance_to_screen === undefined) {
        var distance_to_screen = 60;
      } else {
        var distance_to_screen = params.distance_to_screen;
      }
      var fov_width = Math.atan((camwidth_at_default_face_cm / 2) / distance_to_screen) * 2;
    } else {
      var fov_width = params.fov * Math.PI / 180;
    }
    var tan_fov_width = 2 * Math.tan(fov_width / 2);
    var x,
        y,
        z;
    this.track = function(facetrackrObj) {
      var w = facetrackrObj.width;
      var h = facetrackrObj.height;
      var fx = facetrackrObj.x;
      var fy = facetrackrObj.y;
      if (edgecorrection) {
        var margin = 11;
        var leftDistance = fx - (w / 2);
        var rightDistance = this.camwidth_cam - (fx + (w / 2));
        var topDistance = fy - (h / 2);
        var bottomDistance = this.camheight_cam - (fy + (h / 2));
        var onVerticalEdge = (leftDistance < margin || rightDistance < margin);
        var onHorizontalEdge = (topDistance < margin || bottomDistance < margin);
        if (onHorizontalEdge) {
          if (onVerticalEdge) {
            var onLeftEdge = (leftDistance < margin);
            var onTopEdge = (topDistance < margin);
            if (onLeftEdge) {
              fx = w - (head_diag_cam * sin_hsa / 2);
            } else {
              fx = fx - (w / 2) + (head_diag_cam * sin_hsa / 2);
            }
            if (onTopEdge) {
              fy = h - (head_diag_cam * cos_hsa / 2);
            } else {
              fy = fy - (h / 2) + (head_diag_cam * cos_hsa / 2);
            }
          } else {
            if (topDistance < margin) {
              var originalWeight = topDistance / margin;
              var estimateWeight = (margin - topDistance) / margin;
              fy = h - (originalWeight * (h / 2) + estimateWeight * ((w / tan_hsa) / 2));
              head_diag_cam = estimateWeight * (w / sin_hsa) + originalWeight * (Math.sqrt((w * w) + (h * h)));
            } else {
              var originalWeight = bottomDistance / margin;
              var estimateWeight = (margin - bottomDistance) / margin;
              fy = fy - (h / 2) + (originalWeight * (h / 2) + estimateWeight * ((w / tan_hsa) / 2));
              head_diag_cam = estimateWeight * (w / sin_hsa) + originalWeight * (Math.sqrt((w * w) + (h * h)));
            }
          }
        } else if (onVerticalEdge) {
          if (leftDistance < margin) {
            var originalWeight = leftDistance / margin;
            var estimateWeight = (margin - leftDistance) / margin;
            head_diag_cam = estimateWeight * (h / cos_hsa) + originalWeight * (Math.sqrt((w * w) + (h * h)));
            fx = w - (originalWeight * (w / 2) + (estimateWeight) * (h * tan_hsa / 2));
          } else {
            var originalWeight = rightDistance / margin;
            var estimateWeight = (margin - rightDistance) / margin;
            head_diag_cam = estimateWeight * (h / cos_hsa) + originalWeight * (Math.sqrt((w * w) + (h * h)));
            fx = fx - (w / 2) + (originalWeight * (w / 2) + estimateWeight * (h * tan_hsa / 2));
          }
        } else {
          head_diag_cam = Math.sqrt((w * w) + (h * h));
        }
      } else {
        head_diag_cam = Math.sqrt((w * w) + (h * h));
      }
      z = (head_diag_cm * this.camwidth_cam) / (tan_fov_width * head_diag_cam);
      x = -((fx / this.camwidth_cam) - 0.5) * z * tan_fov_width;
      y = -((fy / this.camheight_cam) - 0.5) * z * tan_fov_width * (this.camheight_cam / this.camwidth_cam);
      if (params.distance_from_camera_to_screen === undefined) {
        y = y + 11.5;
      } else {
        y = y + params.distance_from_camera_to_screen;
      }
      var evt = document.createEvent("Event");
      evt.initEvent("headtrackingEvent", true, true);
      evt.x = x;
      evt.y = y;
      evt.z = z;
      document.dispatchEvent(evt);
      return new headtrackr.headposition.TrackObj(x, y, z);
    };
    this.getTrackerObj = function() {
      return new headtrackr.headposition.TrackObj(x, y, z);
    };
    this.getFOV = function() {
      return fov_width * 180 / Math.PI;
    };
  };
  headtrackr.headposition.TrackObj = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.clone = function() {
      var c = new headtrackr.headposition.TrackObj();
      c.x = this.x;
      c.y = this.y;
      c.z = this.z;
      return c;
    };
  };
  headtrackr.controllers = {};
  headtrackr.controllers.three = {};
  headtrackr.controllers.three.realisticAbsoluteCameraControl = function(camera, scaling, fixedPosition, lookAt, params) {
    if (params === undefined)
      params = {};
    if (params.screenHeight === undefined) {
      var screenHeight_cms = 20;
    } else {
      var screenHeight_cms = params.screenHeight;
    }
    if (params.damping === undefined) {
      params.damping = 1;
    }
    camera.position.x = fixedPosition[0];
    camera.position.y = fixedPosition[1];
    camera.position.z = fixedPosition[2];
    camera.lookAt(lookAt);
    var wh = screenHeight_cms * scaling;
    var ww = wh * camera.aspect;
    document.addEventListener('headtrackingEvent', function(event) {
      var xOffset = event.x > 0 ? 0 : -event.x * 2 * params.damping * scaling;
      var yOffset = event.y < 0 ? 0 : event.y * 2 * params.damping * scaling;
      camera.setViewOffset(ww + Math.abs(event.x * 2 * params.damping * scaling), wh + Math.abs(event.y * params.damping * 2 * scaling), xOffset, yOffset, ww, wh);
      camera.position.x = fixedPosition[0] + (event.x * scaling * params.damping);
      camera.position.y = fixedPosition[1] + (event.y * scaling * params.damping);
      camera.position.z = fixedPosition[2] + (event.z * scaling);
      camera.fov = Math.atan((wh / 2 + Math.abs(event.y * scaling * params.damping)) / (Math.abs(event.z * scaling))) * 360 / Math.PI;
      camera.updateProjectionMatrix();
    }, false);
  };
  headtrackr.controllers.three.realisticRelativeCameraControl = function(camera, scaling, relativeFixedDistance, params) {
    if (params === undefined)
      params = {};
    if (params.screenHeight === undefined) {
      var screenHeight_cms = 20;
    } else {
      var screenHeight_cms = params.screenHeight;
    }
    var scene = camera.parent;
    var init = true;
    var offset = new THREE.Object3D();
    offset.position.set(0, 0, 0);
    offset.add(camera);
    scene.add(offset);
    var wh = screenHeight_cms * scaling;
    var ww = wh * camera.aspect;
    document.addEventListener('headtrackingEvent', function(event) {
      var xOffset = event.x > 0 ? 0 : -event.x * 2 * scaling;
      var yOffset = event.y > 0 ? 0 : -event.y * 2 * scaling;
      camera.setViewOffset(ww + Math.abs(event.x * 2 * scaling), wh + Math.abs(event.y * 2 * scaling), xOffset, yOffset, ww, wh);
      offset.rotation = camera.rotation;
      offset.position.x = 0;
      offset.position.y = 0;
      offset.position.z = 0;
      offset.translateX(event.x * scaling);
      offset.translateY(event.y * scaling);
      offset.translateZ((event.z * scaling) + relativeFixedDistance);
      camera.fov = Math.atan((wh / 2 + Math.abs(event.y * scaling)) / (Math.abs(event.z * scaling))) * 360 / Math.PI;
      camera.updateProjectionMatrix();
    }, false);
  };
  return headtrackr;
}));

_removeDefine();
})();
(function() {
var _removeDefine = $__System.get("@@amd-helpers").createDefine();
(function(e) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = e();
  } else if (typeof define === "function" && define.amd) {
    define("12", [], e);
  } else {
    var t;
    if (typeof window !== "undefined") {
      t = window;
    } else if (typeof global !== "undefined") {
      t = global;
    } else if (typeof self !== "undefined") {
      t = self;
    } else {
      t = this;
    }
    t.SimplePeer = e();
  }
})(function() {
  var e,
      t,
      r;
  return function n(e, t, r) {
    function i(o, s) {
      if (!t[o]) {
        if (!e[o]) {
          var f = typeof require == "function" && require;
          if (!s && f)
            return f(o, !0);
          if (a)
            return a(o, !0);
          var u = new Error("Cannot find module '" + o + "'");
          throw u.code = "MODULE_NOT_FOUND", u;
        }
        var c = t[o] = {exports: {}};
        e[o][0].call(c.exports, function(t) {
          var r = e[o][1][t];
          return i(r ? r : t);
        }, c, c.exports, n, e, t, r);
      }
      return t[o].exports;
    }
    var a = typeof require == "function" && require;
    for (var o = 0; o < r.length; o++)
      i(r[o]);
    return i;
  }({
    1: [function(e, t, r) {
      r = t.exports = e("./debug");
      r.log = a;
      r.formatArgs = i;
      r.save = o;
      r.load = s;
      r.useColors = n;
      r.storage = "undefined" != typeof chrome && "undefined" != typeof chrome.storage ? chrome.storage.local : f();
      r.colors = ["lightseagreen", "forestgreen", "goldenrod", "dodgerblue", "darkorchid", "crimson"];
      function n() {
        return "WebkitAppearance" in document.documentElement.style || window.console && (console.firebug || console.exception && console.table) || navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31;
      }
      r.formatters.j = function(e) {
        return JSON.stringify(e);
      };
      function i() {
        var e = arguments;
        var t = this.useColors;
        e[0] = (t ? "%c" : "") + this.namespace + (t ? " %c" : " ") + e[0] + (t ? "%c " : " ") + "+" + r.humanize(this.diff);
        if (!t)
          return e;
        var n = "color: " + this.color;
        e = [e[0], n, "color: inherit"].concat(Array.prototype.slice.call(e, 1));
        var i = 0;
        var a = 0;
        e[0].replace(/%[a-z%]/g, function(e) {
          if ("%%" === e)
            return;
          i++;
          if ("%c" === e) {
            a = i;
          }
        });
        e.splice(a, 0, n);
        return e;
      }
      function a() {
        return "object" === typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments);
      }
      function o(e) {
        try {
          if (null == e) {
            r.storage.removeItem("debug");
          } else {
            r.storage.debug = e;
          }
        } catch (t) {}
      }
      function s() {
        var e;
        try {
          e = r.storage.debug;
        } catch (t) {}
        return e;
      }
      r.enable(s());
      function f() {
        try {
          return window.localStorage;
        } catch (e) {}
      }
    }, {"./debug": 2}],
    2: [function(e, t, r) {
      r = t.exports = o;
      r.coerce = c;
      r.disable = f;
      r.enable = s;
      r.enabled = u;
      r.humanize = e("ms");
      r.names = [];
      r.skips = [];
      r.formatters = {};
      var n = 0;
      var i;
      function a() {
        return r.colors[n++ % r.colors.length];
      }
      function o(e) {
        function t() {}
        t.enabled = false;
        function n() {
          var e = n;
          var t = +new Date;
          var o = t - (i || t);
          e.diff = o;
          e.prev = i;
          e.curr = t;
          i = t;
          if (null == e.useColors)
            e.useColors = r.useColors();
          if (null == e.color && e.useColors)
            e.color = a();
          var s = Array.prototype.slice.call(arguments);
          s[0] = r.coerce(s[0]);
          if ("string" !== typeof s[0]) {
            s = ["%o"].concat(s);
          }
          var f = 0;
          s[0] = s[0].replace(/%([a-z%])/g, function(t, n) {
            if (t === "%%")
              return t;
            f++;
            var i = r.formatters[n];
            if ("function" === typeof i) {
              var a = s[f];
              t = i.call(e, a);
              s.splice(f, 1);
              f--;
            }
            return t;
          });
          if ("function" === typeof r.formatArgs) {
            s = r.formatArgs.apply(e, s);
          }
          var u = n.log || r.log || console.log.bind(console);
          u.apply(e, s);
        }
        n.enabled = true;
        var o = r.enabled(e) ? n : t;
        o.namespace = e;
        return o;
      }
      function s(e) {
        r.save(e);
        var t = (e || "").split(/[\s,]+/);
        var n = t.length;
        for (var i = 0; i < n; i++) {
          if (!t[i])
            continue;
          e = t[i].replace(/\*/g, ".*?");
          if (e[0] === "-") {
            r.skips.push(new RegExp("^" + e.substr(1) + "$"));
          } else {
            r.names.push(new RegExp("^" + e + "$"));
          }
        }
      }
      function f() {
        r.enable("");
      }
      function u(e) {
        var t,
            n;
        for (t = 0, n = r.skips.length; t < n; t++) {
          if (r.skips[t].test(e)) {
            return false;
          }
        }
        for (t = 0, n = r.names.length; t < n; t++) {
          if (r.names[t].test(e)) {
            return true;
          }
        }
        return false;
      }
      function c(e) {
        if (e instanceof Error)
          return e.stack || e.message;
        return e;
      }
    }, {ms: 3}],
    3: [function(e, t, r) {
      var n = 1e3;
      var i = n * 60;
      var a = i * 60;
      var o = a * 24;
      var s = o * 365.25;
      t.exports = function(e, t) {
        t = t || {};
        if ("string" == typeof e)
          return f(e);
        return t.long ? c(e) : u(e);
      };
      function f(e) {
        e = "" + e;
        if (e.length > 1e4)
          return;
        var t = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(e);
        if (!t)
          return;
        var r = parseFloat(t[1]);
        var f = (t[2] || "ms").toLowerCase();
        switch (f) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return r * s;
          case "days":
          case "day":
          case "d":
            return r * o;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return r * a;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return r * i;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return r * n;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return r;
        }
      }
      function u(e) {
        if (e >= o)
          return Math.round(e / o) + "d";
        if (e >= a)
          return Math.round(e / a) + "h";
        if (e >= i)
          return Math.round(e / i) + "m";
        if (e >= n)
          return Math.round(e / n) + "s";
        return e + "ms";
      }
      function c(e) {
        return l(e, o, "day") || l(e, a, "hour") || l(e, i, "minute") || l(e, n, "second") || e + " ms";
      }
      function l(e, t, r) {
        if (e < t)
          return;
        if (e < t * 1.5)
          return Math.floor(e / t) + " " + r;
        return Math.ceil(e / t) + " " + r + "s";
      }
    }, {}],
    4: [function(e, t, r) {
      t.exports = function n() {
        if (typeof window === "undefined")
          return null;
        var e = {
          RTCPeerConnection: window.mozRTCPeerConnection || window.RTCPeerConnection || window.webkitRTCPeerConnection,
          RTCSessionDescription: window.mozRTCSessionDescription || window.RTCSessionDescription || window.webkitRTCSessionDescription,
          RTCIceCandidate: window.mozRTCIceCandidate || window.RTCIceCandidate || window.webkitRTCIceCandidate
        };
        if (!e.RTCPeerConnection)
          return null;
        return e;
      };
    }, {}],
    5: [function(e, t, r) {
      var n = t.exports = function(e, t) {
        if (!t)
          t = 16;
        if (e === undefined)
          e = 128;
        if (e <= 0)
          return "0";
        var r = Math.log(Math.pow(2, e)) / Math.log(t);
        for (var i = 2; r === Infinity; i *= 2) {
          r = Math.log(Math.pow(2, e / i)) / Math.log(t) * i;
        }
        var a = r - Math.floor(r);
        var o = "";
        for (var i = 0; i < Math.floor(r); i++) {
          var s = Math.floor(Math.random() * t).toString(t);
          o = s + o;
        }
        if (a) {
          var f = Math.pow(t, a);
          var s = Math.floor(Math.random() * f).toString(t);
          o = s + o;
        }
        var u = parseInt(o, t);
        if (u !== Infinity && u >= Math.pow(2, e)) {
          return n(e, t);
        } else
          return o;
      };
      n.rack = function(e, t, r) {
        var i = function(i) {
          var o = 0;
          do {
            if (o++ > 10) {
              if (r)
                e += r;
              else
                throw new Error("too many ID collisions, use more bits");
            }
            var s = n(e, t);
          } while (Object.hasOwnProperty.call(a, s));
          a[s] = i;
          return s;
        };
        var a = i.hats = {};
        i.get = function(e) {
          return i.hats[e];
        };
        i.set = function(e, t) {
          i.hats[e] = t;
          return i;
        };
        i.bits = e || 128;
        i.base = t || 16;
        return i;
      };
    }, {}],
    6: [function(e, t, r) {
      if (typeof Object.create === "function") {
        t.exports = function n(e, t) {
          e.super_ = t;
          e.prototype = Object.create(t.prototype, {constructor: {
              value: e,
              enumerable: false,
              writable: true,
              configurable: true
            }});
        };
      } else {
        t.exports = function i(e, t) {
          e.super_ = t;
          var r = function() {};
          r.prototype = t.prototype;
          e.prototype = new r;
          e.prototype.constructor = e;
        };
      }
    }, {}],
    7: [function(e, t, r) {
      t.exports = a;
      a.strict = o;
      a.loose = s;
      var n = Object.prototype.toString;
      var i = {
        "[object Int8Array]": true,
        "[object Int16Array]": true,
        "[object Int32Array]": true,
        "[object Uint8Array]": true,
        "[object Uint8ClampedArray]": true,
        "[object Uint16Array]": true,
        "[object Uint32Array]": true,
        "[object Float32Array]": true,
        "[object Float64Array]": true
      };
      function a(e) {
        return o(e) || s(e);
      }
      function o(e) {
        return e instanceof Int8Array || e instanceof Int16Array || e instanceof Int32Array || e instanceof Uint8Array || e instanceof Uint8ClampedArray || e instanceof Uint16Array || e instanceof Uint32Array || e instanceof Float32Array || e instanceof Float64Array;
      }
      function s(e) {
        return i[n.call(e)];
      }
    }, {}],
    8: [function(e, t, r) {
      t.exports = n;
      function n(e, t) {
        if (e && t)
          return n(e)(t);
        if (typeof e !== "function")
          throw new TypeError("need wrapper function");
        Object.keys(e).forEach(function(t) {
          r[t] = e[t];
        });
        return r;
        function r() {
          var t = new Array(arguments.length);
          for (var r = 0; r < t.length; r++) {
            t[r] = arguments[r];
          }
          var n = e.apply(this, t);
          var i = t[t.length - 1];
          if (typeof n === "function" && n !== i) {
            Object.keys(i).forEach(function(e) {
              n[e] = i[e];
            });
          }
          return n;
        }
      }
    }, {}],
    9: [function(e, t, r) {
      var n = e("wrappy");
      t.exports = n(i);
      i.proto = i(function() {
        Object.defineProperty(Function.prototype, "once", {
          value: function() {
            return i(this);
          },
          configurable: true
        });
      });
      function i(e) {
        var t = function() {
          if (t.called)
            return t.value;
          t.called = true;
          return t.value = e.apply(this, arguments);
        };
        t.called = false;
        return t;
      }
    }, {wrappy: 8}],
    10: [function(e, t, r) {
      (function(r) {
        var n = e("is-typedarray").strict;
        t.exports = function(e) {
          var t = r.TYPED_ARRAY_SUPPORT ? r._augment : function(e) {
            return new r(e);
          };
          if (e instanceof Uint8Array) {
            return t(e);
          } else if (e instanceof ArrayBuffer) {
            return t(new Uint8Array(e));
          } else if (n(e)) {
            return t(new Uint8Array(e.buffer, e.byteOffset, e.byteLength));
          } else {
            return new r(e);
          }
        };
      }).call(this, e("buffer").Buffer);
    }, {
      buffer: 13,
      "is-typedarray": 11
    }],
    11: [function(e, t, r) {
      arguments[4][7][0].apply(r, arguments);
    }, {dup: 7}],
    "/": [function(e, t, r) {
      (function(r) {
        t.exports = l;
        var n = e("debug")("simple-peer");
        var i = e("get-browser-rtc");
        var a = e("hat");
        var o = e("inherits");
        var s = e("is-typedarray");
        var f = e("once");
        var u = e("stream");
        var c = e("typedarray-to-buffer");
        o(l, u.Duplex);
        function l(e) {
          var t = this;
          if (!(t instanceof l))
            return new l(e);
          t._debug("new peer %o", e);
          if (!e)
            e = {};
          e.allowHalfOpen = false;
          if (e.highWaterMark == null)
            e.highWaterMark = 1024 * 1024;
          u.Duplex.call(t, e);
          t.initiator = e.initiator || false;
          t.channelConfig = e.channelConfig || l.channelConfig;
          t.channelName = e.channelName || a(160);
          if (!e.initiator)
            t.channelName = null;
          t.config = e.config || l.config;
          t.constraints = e.constraints || l.constraints;
          t.reconnectTimer = e.reconnectTimer || 0;
          t.sdpTransform = e.sdpTransform || function(e) {
            return e;
          };
          t.stream = e.stream || false;
          t.trickle = e.trickle !== undefined ? e.trickle : true;
          t.destroyed = false;
          t.connected = false;
          t.remoteAddress = undefined;
          t.remoteFamily = undefined;
          t.remotePort = undefined;
          t.localAddress = undefined;
          t.localPort = undefined;
          t._wrtc = e.wrtc || i();
          if (!t._wrtc) {
            if (typeof window === "undefined") {
              throw new Error("No WebRTC support: Specify `opts.wrtc` option in this environment");
            } else {
              throw new Error("No WebRTC support: Not a supported browser");
            }
          }
          t._maxBufferedAmount = e.highWaterMark;
          t._pcReady = false;
          t._channelReady = false;
          t._iceComplete = false;
          t._channel = null;
          t._chunk = null;
          t._cb = null;
          t._interval = null;
          t._reconnectTimeout = null;
          t._pc = new t._wrtc.RTCPeerConnection(t.config, t.constraints);
          t._pc.oniceconnectionstatechange = t._onIceConnectionStateChange.bind(t);
          t._pc.onsignalingstatechange = t._onSignalingStateChange.bind(t);
          t._pc.onicecandidate = t._onIceCandidate.bind(t);
          if (t.stream)
            t._pc.addStream(t.stream);
          t._pc.onaddstream = t._onAddStream.bind(t);
          if (t.initiator) {
            t._setupData({channel: t._pc.createDataChannel(t.channelName, t.channelConfig)});
            t._pc.onnegotiationneeded = f(t._createOffer.bind(t));
            if (typeof window === "undefined" || !window.webkitRTCPeerConnection) {
              t._pc.onnegotiationneeded();
            }
          } else {
            t._pc.ondatachannel = t._setupData.bind(t);
          }
          t.on("finish", function() {
            if (t.connected) {
              setTimeout(function() {
                t._destroy();
              }, 100);
            } else {
              t.once("connect", function() {
                setTimeout(function() {
                  t._destroy();
                }, 100);
              });
            }
          });
        }
        l.WEBRTC_SUPPORT = !!i();
        l.config = {iceServers: [{
            url: "stun:23.21.150.121",
            urls: "stun:23.21.150.121"
          }]};
        l.constraints = {};
        l.channelConfig = {};
        Object.defineProperty(l.prototype, "bufferSize", {get: function() {
            var e = this;
            return e._channel && e._channel.bufferedAmount || 0;
          }});
        l.prototype.address = function() {
          var e = this;
          return {
            port: e.localPort,
            family: "IPv4",
            address: e.localAddress
          };
        };
        l.prototype.signal = function(e) {
          var t = this;
          if (t.destroyed)
            throw new Error("cannot signal after peer is destroyed");
          if (typeof e === "string") {
            try {
              e = JSON.parse(e);
            } catch (r) {
              e = {};
            }
          }
          t._debug("signal()");
          if (e.sdp) {
            t._pc.setRemoteDescription(new t._wrtc.RTCSessionDescription(e), function() {
              if (t.destroyed)
                return;
              if (t._pc.remoteDescription.type === "offer")
                t._createAnswer();
            }, t._onError.bind(t));
          }
          if (e.candidate) {
            try {
              t._pc.addIceCandidate(new t._wrtc.RTCIceCandidate(e.candidate), h, t._onError.bind(t));
            } catch (r) {
              t._destroy(new Error("error adding candidate: " + r.message));
            }
          }
          if (!e.sdp && !e.candidate) {
            t._destroy(new Error("signal() called with invalid signal data"));
          }
        };
        l.prototype.send = function(e) {
          var t = this;
          if (!s.strict(e) && !(e instanceof ArrayBuffer) && !r.isBuffer(e) && typeof e !== "string" && (typeof Blob === "undefined" || !(e instanceof Blob))) {
            e = JSON.stringify(e);
          }
          if (r.isBuffer(e) && !s.strict(e)) {
            e = new Uint8Array(e);
          }
          var n = e.length || e.byteLength || e.size;
          t._channel.send(e);
          t._debug("write: %d bytes", n);
        };
        l.prototype.destroy = function(e) {
          var t = this;
          t._destroy(null, e);
        };
        l.prototype._destroy = function(e, t) {
          var r = this;
          if (r.destroyed)
            return;
          if (t)
            r.once("close", t);
          r._debug("destroy (error: %s)", e && e.message);
          r.readable = r.writable = false;
          if (!r._readableState.ended)
            r.push(null);
          if (!r._writableState.finished)
            r.end();
          r.destroyed = true;
          r.connected = false;
          r._pcReady = false;
          r._channelReady = false;
          r._chunk = null;
          r._cb = null;
          clearInterval(r._interval);
          clearTimeout(r._reconnectTimeout);
          if (r._pc) {
            try {
              r._pc.close();
            } catch (e) {}
            r._pc.oniceconnectionstatechange = null;
            r._pc.onsignalingstatechange = null;
            r._pc.onicecandidate = null;
          }
          if (r._channel) {
            try {
              r._channel.close();
            } catch (e) {}
            r._channel.onmessage = null;
            r._channel.onopen = null;
            r._channel.onclose = null;
          }
          r._pc = null;
          r._channel = null;
          if (e)
            r.emit("error", e);
          r.emit("close");
        };
        l.prototype._setupData = function(e) {
          var t = this;
          t._channel = e.channel;
          t.channelName = t._channel.label;
          t._channel.binaryType = "arraybuffer";
          t._channel.onmessage = t._onChannelMessage.bind(t);
          t._channel.onopen = t._onChannelOpen.bind(t);
          t._channel.onclose = t._onChannelClose.bind(t);
        };
        l.prototype._read = function() {};
        l.prototype._write = function(e, t, r) {
          var n = this;
          if (n.destroyed)
            return r(new Error("cannot write after peer is destroyed"));
          if (n.connected) {
            try {
              n.send(e);
            } catch (i) {
              return n._onError(i);
            }
            if (n._channel.bufferedAmount > n._maxBufferedAmount) {
              n._debug("start backpressure: bufferedAmount %d", n._channel.bufferedAmount);
              n._cb = r;
            } else {
              r(null);
            }
          } else {
            n._debug("write before connect");
            n._chunk = e;
            n._cb = r;
          }
        };
        l.prototype._createOffer = function() {
          var e = this;
          if (e.destroyed)
            return;
          e._pc.createOffer(function(t) {
            if (e.destroyed)
              return;
            t.sdp = e.sdpTransform(t.sdp);
            e._pc.setLocalDescription(t, h, e._onError.bind(e));
            var r = function() {
              var r = e._pc.localDescription || t;
              e._debug("signal");
              e.emit("signal", {
                type: r.type,
                sdp: r.sdp
              });
            };
            if (e.trickle || e._iceComplete)
              r();
            else
              e.once("_iceComplete", r);
          }, e._onError.bind(e), e.offerConstraints);
        };
        l.prototype._createAnswer = function() {
          var e = this;
          if (e.destroyed)
            return;
          e._pc.createAnswer(function(t) {
            if (e.destroyed)
              return;
            t.sdp = e.sdpTransform(t.sdp);
            e._pc.setLocalDescription(t, h, e._onError.bind(e));
            var r = function() {
              var r = e._pc.localDescription || t;
              e._debug("signal");
              e.emit("signal", {
                type: r.type,
                sdp: r.sdp
              });
            };
            if (e.trickle || e._iceComplete)
              r();
            else
              e.once("_iceComplete", r);
          }, e._onError.bind(e), e.answerConstraints);
        };
        l.prototype._onIceConnectionStateChange = function() {
          var e = this;
          if (e.destroyed)
            return;
          var t = e._pc.iceGatheringState;
          var r = e._pc.iceConnectionState;
          e._debug("iceConnectionStateChange %s %s", t, r);
          e.emit("iceConnectionStateChange", t, r);
          if (r === "connected" || r === "completed") {
            clearTimeout(e._reconnectTimeout);
            e._pcReady = true;
            e._maybeReady();
          }
          if (r === "disconnected") {
            if (e.reconnectTimer) {
              clearTimeout(e._reconnectTimeout);
              e._reconnectTimeout = setTimeout(function() {
                e._destroy();
              }, e.reconnectTimer);
            } else {
              e._destroy();
            }
          }
          if (r === "closed") {
            e._destroy();
          }
        };
        l.prototype._maybeReady = function() {
          var e = this;
          e._debug("maybeReady pc %s channel %s", e._pcReady, e._channelReady);
          if (e.connected || e._connecting || !e._pcReady || !e._channelReady)
            return;
          e._connecting = true;
          if (typeof window !== "undefined" && !!window.mozRTCPeerConnection) {
            e._pc.getStats(null, function(e) {
              var r = [];
              e.forEach(function(e) {
                r.push(e);
              });
              t(r);
            }, e._onError.bind(e));
          } else {
            e._pc.getStats(function(e) {
              var r = [];
              e.result().forEach(function(e) {
                var t = {};
                e.names().forEach(function(r) {
                  t[r] = e.stat(r);
                });
                t.id = e.id;
                t.type = e.type;
                t.timestamp = e.timestamp;
                r.push(t);
              });
              t(r);
            });
          }
          function t(t) {
            t.forEach(function(t) {
              if (t.type === "remotecandidate") {
                e.remoteAddress = t.ipAddress;
                e.remoteFamily = "IPv4";
                e.remotePort = Number(t.portNumber);
                e._debug("connect remote: %s:%s (%s)", e.remoteAddress, e.remotePort, e.remoteFamily);
              } else if (t.type === "localcandidate" && t.candidateType === "host") {
                e.localAddress = t.ipAddress;
                e.localPort = Number(t.portNumber);
                e._debug("connect local: %s:%s", e.localAddress, e.localPort);
              }
            });
            e._connecting = false;
            e.connected = true;
            if (e._chunk) {
              try {
                e.send(e._chunk);
              } catch (r) {
                return e._onError(r);
              }
              e._chunk = null;
              e._debug('sent chunk from "write before connect"');
              var n = e._cb;
              e._cb = null;
              n(null);
            }
            e._interval = setInterval(function() {
              if (!e._cb || !e._channel || e._channel.bufferedAmount > e._maxBufferedAmount)
                return;
              e._debug("ending backpressure: bufferedAmount %d", e._channel.bufferedAmount);
              var t = e._cb;
              e._cb = null;
              t(null);
            }, 150);
            if (e._interval.unref)
              e._interval.unref();
            e._debug("connect");
            e.emit("connect");
          }
        };
        l.prototype._onSignalingStateChange = function() {
          var e = this;
          if (e.destroyed)
            return;
          e._debug("signalingStateChange %s", e._pc.signalingState);
          e.emit("signalingStateChange", e._pc.signalingState);
        };
        l.prototype._onIceCandidate = function(e) {
          var t = this;
          if (t.destroyed)
            return;
          if (e.candidate && t.trickle) {
            t.emit("signal", {candidate: {
                candidate: e.candidate.candidate,
                sdpMLineIndex: e.candidate.sdpMLineIndex,
                sdpMid: e.candidate.sdpMid
              }});
          } else if (!e.candidate) {
            t._iceComplete = true;
            t.emit("_iceComplete");
          }
        };
        l.prototype._onChannelMessage = function(e) {
          var t = this;
          if (t.destroyed)
            return;
          var r = e.data;
          t._debug("read: %d bytes", r.byteLength || r.length);
          if (r instanceof ArrayBuffer) {
            r = c(new Uint8Array(r));
            t.push(r);
          } else {
            try {
              r = JSON.parse(r);
            } catch (n) {}
            t.emit("data", r);
          }
        };
        l.prototype._onChannelOpen = function() {
          var e = this;
          if (e.connected || e.destroyed)
            return;
          e._debug("on channel open");
          e._channelReady = true;
          e._maybeReady();
        };
        l.prototype._onChannelClose = function() {
          var e = this;
          if (e.destroyed)
            return;
          e._debug("on channel close");
          e._destroy();
        };
        l.prototype._onAddStream = function(e) {
          var t = this;
          if (t.destroyed)
            return;
          t._debug("on add stream");
          t.emit("stream", e.stream);
        };
        l.prototype._onError = function(e) {
          var t = this;
          if (t.destroyed)
            return;
          t._debug("error %s", e.message || e);
          t._destroy(e);
        };
        l.prototype._debug = function() {
          var e = this;
          var t = [].slice.call(arguments);
          var r = e.channelName && e.channelName.substring(0, 7);
          t[0] = "[" + r + "] " + t[0];
          n.apply(null, t);
        };
        function h() {}
      }).call(this, e("buffer").Buffer);
    }, {
      buffer: 13,
      debug: 1,
      "get-browser-rtc": 4,
      hat: 5,
      inherits: 6,
      "is-typedarray": 7,
      once: 9,
      stream: 32,
      "typedarray-to-buffer": 10
    }],
    12: [function(e, t, r) {}, {}],
    13: [function(e, t, r) {
      var n = e("base64-js");
      var i = e("ieee754");
      var a = e("is-array");
      r.Buffer = f;
      r.SlowBuffer = u;
      r.INSPECT_MAX_BYTES = 50;
      f.poolSize = 8192;
      var o = 1073741823;
      var s = {};
      f.TYPED_ARRAY_SUPPORT = function() {
        try {
          var e = new ArrayBuffer(0);
          var t = new Uint8Array(e);
          t.foo = function() {
            return 42;
          };
          return t.foo() === 42 && typeof t.subarray === "function" && new Uint8Array(1).subarray(1, 1).byteLength === 0;
        } catch (r) {
          return false;
        }
      }();
      function f(e, t) {
        var r = this;
        if (!(r instanceof f))
          return new f(e, t);
        var n = typeof e;
        var i;
        if (n === "number") {
          i = +e;
        } else if (n === "string") {
          i = f.byteLength(e, t);
        } else if (n === "object" && e !== null) {
          if (e.type === "Buffer" && a(e.data))
            e = e.data;
          i = +e.length;
        } else {
          throw new TypeError("must start with number, buffer, array or string");
        }
        if (i > o) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + o.toString(16) + " bytes");
        }
        if (i < 0)
          i = 0;
        else
          i >>>= 0;
        if (f.TYPED_ARRAY_SUPPORT) {
          r = f._augment(new Uint8Array(i));
        } else {
          r.length = i;
          r._isBuffer = true;
        }
        var u;
        if (f.TYPED_ARRAY_SUPPORT && typeof e.byteLength === "number") {
          r._set(e);
        } else if (x(e)) {
          if (f.isBuffer(e)) {
            for (u = 0; u < i; u++) {
              r[u] = e.readUInt8(u);
            }
          } else {
            for (u = 0; u < i; u++) {
              r[u] = (e[u] % 256 + 256) % 256;
            }
          }
        } else if (n === "string") {
          r.write(e, 0, t);
        } else if (n === "number" && !f.TYPED_ARRAY_SUPPORT) {
          for (u = 0; u < i; u++) {
            r[u] = 0;
          }
        }
        if (i > 0 && i <= f.poolSize)
          r.parent = s;
        return r;
      }
      function u(e, t) {
        if (!(this instanceof u))
          return new u(e, t);
        var r = new f(e, t);
        delete r.parent;
        return r;
      }
      f.isBuffer = function F(e) {
        return !!(e != null && e._isBuffer);
      };
      f.compare = function W(e, t) {
        if (!f.isBuffer(e) || !f.isBuffer(t)) {
          throw new TypeError("Arguments must be Buffers");
        }
        if (e === t)
          return 0;
        var r = e.length;
        var n = t.length;
        for (var i = 0,
            a = Math.min(r, n); i < a && e[i] === t[i]; i++) {}
        if (i !== a) {
          r = e[i];
          n = t[i];
        }
        if (r < n)
          return -1;
        if (n < r)
          return 1;
        return 0;
      };
      f.isEncoding = function z(e) {
        switch (String(e).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "binary":
          case "base64":
          case "raw":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      f.concat = function q(e, t) {
        if (!a(e))
          throw new TypeError("list argument must be an Array of Buffers.");
        if (e.length === 0) {
          return new f(0);
        } else if (e.length === 1) {
          return e[0];
        }
        var r;
        if (t === undefined) {
          t = 0;
          for (r = 0; r < e.length; r++) {
            t += e[r].length;
          }
        }
        var n = new f(t);
        var i = 0;
        for (r = 0; r < e.length; r++) {
          var o = e[r];
          o.copy(n, i);
          i += o.length;
        }
        return n;
      };
      f.byteLength = function J(e, t) {
        var r;
        e = e + "";
        switch (t || "utf8") {
          case "ascii":
          case "binary":
          case "raw":
            r = e.length;
            break;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            r = e.length * 2;
            break;
          case "hex":
            r = e.length >>> 1;
            break;
          case "utf8":
          case "utf-8":
            r = j(e).length;
            break;
          case "base64":
            r = O(e).length;
            break;
          default:
            r = e.length;
        }
        return r;
      };
      f.prototype.length = undefined;
      f.prototype.parent = undefined;
      f.prototype.toString = function H(e, t, r) {
        var n = false;
        t = t >>> 0;
        r = r === undefined || r === Infinity ? this.length : r >>> 0;
        if (!e)
          e = "utf8";
        if (t < 0)
          t = 0;
        if (r > this.length)
          r = this.length;
        if (r <= t)
          return "";
        while (true) {
          switch (e) {
            case "hex":
              return w(this, t, r);
            case "utf8":
            case "utf-8":
              return b(this, t, r);
            case "ascii":
              return m(this, t, r);
            case "binary":
              return y(this, t, r);
            case "base64":
              return v(this, t, r);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return _(this, t, r);
            default:
              if (n)
                throw new TypeError("Unknown encoding: " + e);
              e = (e + "").toLowerCase();
              n = true;
          }
        }
      };
      f.prototype.equals = function $(e) {
        if (!f.isBuffer(e))
          throw new TypeError("Argument must be a Buffer");
        if (this === e)
          return true;
        return f.compare(this, e) === 0;
      };
      f.prototype.inspect = function X() {
        var e = "";
        var t = r.INSPECT_MAX_BYTES;
        if (this.length > 0) {
          e = this.toString("hex", 0, t).match(/.{2}/g).join(" ");
          if (this.length > t)
            e += " ... ";
        }
        return "<Buffer " + e + ">";
      };
      f.prototype.compare = function G(e) {
        if (!f.isBuffer(e))
          throw new TypeError("Argument must be a Buffer");
        if (this === e)
          return 0;
        return f.compare(this, e);
      };
      f.prototype.indexOf = function K(e, t) {
        if (t > 2147483647)
          t = 2147483647;
        else if (t < -2147483648)
          t = -2147483648;
        t >>= 0;
        if (this.length === 0)
          return -1;
        if (t >= this.length)
          return -1;
        if (t < 0)
          t = Math.max(this.length + t, 0);
        if (typeof e === "string") {
          if (e.length === 0)
            return -1;
          return String.prototype.indexOf.call(this, e, t);
        }
        if (f.isBuffer(e)) {
          return r(this, e, t);
        }
        if (typeof e === "number") {
          if (f.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === "function") {
            return Uint8Array.prototype.indexOf.call(this, e, t);
          }
          return r(this, [e], t);
        }
        function r(e, t, r) {
          var n = -1;
          for (var i = 0; r + i < e.length; i++) {
            if (e[r + i] === t[n === -1 ? 0 : i - n]) {
              if (n === -1)
                n = i;
              if (i - n + 1 === t.length)
                return r + n;
            } else {
              n = -1;
            }
          }
          return -1;
        }
        throw new TypeError("val must be string, number or Buffer");
      };
      f.prototype.get = function Q(e) {
        console.log(".get() is deprecated. Access using array indexes instead.");
        return this.readUInt8(e);
      };
      f.prototype.set = function V(e, t) {
        console.log(".set() is deprecated. Access using array indexes instead.");
        return this.writeUInt8(e, t);
      };
      function c(e, t, r, n) {
        r = Number(r) || 0;
        var i = e.length - r;
        if (!n) {
          n = i;
        } else {
          n = Number(n);
          if (n > i) {
            n = i;
          }
        }
        var a = t.length;
        if (a % 2 !== 0)
          throw new Error("Invalid hex string");
        if (n > a / 2) {
          n = a / 2;
        }
        for (var o = 0; o < n; o++) {
          var s = parseInt(t.substr(o * 2, 2), 16);
          if (isNaN(s))
            throw new Error("Invalid hex string");
          e[r + o] = s;
        }
        return o;
      }
      function l(e, t, r, n) {
        var i = N(j(t, e.length - r), e, r, n);
        return i;
      }
      function h(e, t, r, n) {
        var i = N(P(t), e, r, n);
        return i;
      }
      function d(e, t, r, n) {
        return h(e, t, r, n);
      }
      function p(e, t, r, n) {
        var i = N(O(t), e, r, n);
        return i;
      }
      function g(e, t, r, n) {
        var i = N(D(t, e.length - r), e, r, n);
        return i;
      }
      f.prototype.write = function Z(e, t, r, n) {
        if (isFinite(t)) {
          if (!isFinite(r)) {
            n = r;
            r = undefined;
          }
        } else {
          var i = n;
          n = t;
          t = r;
          r = i;
        }
        t = Number(t) || 0;
        if (r < 0 || t < 0 || t > this.length) {
          throw new RangeError("attempt to write outside buffer bounds");
        }
        var a = this.length - t;
        if (!r) {
          r = a;
        } else {
          r = Number(r);
          if (r > a) {
            r = a;
          }
        }
        n = String(n || "utf8").toLowerCase();
        var o;
        switch (n) {
          case "hex":
            o = c(this, e, t, r);
            break;
          case "utf8":
          case "utf-8":
            o = l(this, e, t, r);
            break;
          case "ascii":
            o = h(this, e, t, r);
            break;
          case "binary":
            o = d(this, e, t, r);
            break;
          case "base64":
            o = p(this, e, t, r);
            break;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            o = g(this, e, t, r);
            break;
          default:
            throw new TypeError("Unknown encoding: " + n);
        }
        return o;
      };
      f.prototype.toJSON = function ee() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function v(e, t, r) {
        if (t === 0 && r === e.length) {
          return n.fromByteArray(e);
        } else {
          return n.fromByteArray(e.slice(t, r));
        }
      }
      function b(e, t, r) {
        var n = "";
        var i = "";
        r = Math.min(e.length, r);
        for (var a = t; a < r; a++) {
          if (e[a] <= 127) {
            n += Y(i) + String.fromCharCode(e[a]);
            i = "";
          } else {
            i += "%" + e[a].toString(16);
          }
        }
        return n + Y(i);
      }
      function m(e, t, r) {
        var n = "";
        r = Math.min(e.length, r);
        for (var i = t; i < r; i++) {
          n += String.fromCharCode(e[i] & 127);
        }
        return n;
      }
      function y(e, t, r) {
        var n = "";
        r = Math.min(e.length, r);
        for (var i = t; i < r; i++) {
          n += String.fromCharCode(e[i]);
        }
        return n;
      }
      function w(e, t, r) {
        var n = e.length;
        if (!t || t < 0)
          t = 0;
        if (!r || r < 0 || r > n)
          r = n;
        var i = "";
        for (var a = t; a < r; a++) {
          i += U(e[a]);
        }
        return i;
      }
      function _(e, t, r) {
        var n = e.slice(t, r);
        var i = "";
        for (var a = 0; a < n.length; a += 2) {
          i += String.fromCharCode(n[a] + n[a + 1] * 256);
        }
        return i;
      }
      f.prototype.slice = function te(e, t) {
        var r = this.length;
        e = ~~e;
        t = t === undefined ? r : ~~t;
        if (e < 0) {
          e += r;
          if (e < 0)
            e = 0;
        } else if (e > r) {
          e = r;
        }
        if (t < 0) {
          t += r;
          if (t < 0)
            t = 0;
        } else if (t > r) {
          t = r;
        }
        if (t < e)
          t = e;
        var n;
        if (f.TYPED_ARRAY_SUPPORT) {
          n = f._augment(this.subarray(e, t));
        } else {
          var i = t - e;
          n = new f(i, undefined);
          for (var a = 0; a < i; a++) {
            n[a] = this[a + e];
          }
        }
        if (n.length)
          n.parent = this.parent || this;
        return n;
      };
      function E(e, t, r) {
        if (e % 1 !== 0 || e < 0)
          throw new RangeError("offset is not uint");
        if (e + t > r)
          throw new RangeError("Trying to access beyond buffer length");
      }
      f.prototype.readUIntLE = function re(e, t, r) {
        e = e >>> 0;
        t = t >>> 0;
        if (!r)
          E(e, t, this.length);
        var n = this[e];
        var i = 1;
        var a = 0;
        while (++a < t && (i *= 256)) {
          n += this[e + a] * i;
        }
        return n;
      };
      f.prototype.readUIntBE = function ne(e, t, r) {
        e = e >>> 0;
        t = t >>> 0;
        if (!r) {
          E(e, t, this.length);
        }
        var n = this[e + --t];
        var i = 1;
        while (t > 0 && (i *= 256)) {
          n += this[e + --t] * i;
        }
        return n;
      };
      f.prototype.readUInt8 = function ie(e, t) {
        if (!t)
          E(e, 1, this.length);
        return this[e];
      };
      f.prototype.readUInt16LE = function ae(e, t) {
        if (!t)
          E(e, 2, this.length);
        return this[e] | this[e + 1] << 8;
      };
      f.prototype.readUInt16BE = function oe(e, t) {
        if (!t)
          E(e, 2, this.length);
        return this[e] << 8 | this[e + 1];
      };
      f.prototype.readUInt32LE = function se(e, t) {
        if (!t)
          E(e, 4, this.length);
        return (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
      };
      f.prototype.readUInt32BE = function fe(e, t) {
        if (!t)
          E(e, 4, this.length);
        return this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
      };
      f.prototype.readIntLE = function ue(e, t, r) {
        e = e >>> 0;
        t = t >>> 0;
        if (!r)
          E(e, t, this.length);
        var n = this[e];
        var i = 1;
        var a = 0;
        while (++a < t && (i *= 256)) {
          n += this[e + a] * i;
        }
        i *= 128;
        if (n >= i)
          n -= Math.pow(2, 8 * t);
        return n;
      };
      f.prototype.readIntBE = function ce(e, t, r) {
        e = e >>> 0;
        t = t >>> 0;
        if (!r)
          E(e, t, this.length);
        var n = t;
        var i = 1;
        var a = this[e + --n];
        while (n > 0 && (i *= 256)) {
          a += this[e + --n] * i;
        }
        i *= 128;
        if (a >= i)
          a -= Math.pow(2, 8 * t);
        return a;
      };
      f.prototype.readInt8 = function le(e, t) {
        if (!t)
          E(e, 1, this.length);
        if (!(this[e] & 128))
          return this[e];
        return (255 - this[e] + 1) * -1;
      };
      f.prototype.readInt16LE = function he(e, t) {
        if (!t)
          E(e, 2, this.length);
        var r = this[e] | this[e + 1] << 8;
        return r & 32768 ? r | 4294901760 : r;
      };
      f.prototype.readInt16BE = function de(e, t) {
        if (!t)
          E(e, 2, this.length);
        var r = this[e + 1] | this[e] << 8;
        return r & 32768 ? r | 4294901760 : r;
      };
      f.prototype.readInt32LE = function pe(e, t) {
        if (!t)
          E(e, 4, this.length);
        return this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
      };
      f.prototype.readInt32BE = function ge(e, t) {
        if (!t)
          E(e, 4, this.length);
        return this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
      };
      f.prototype.readFloatLE = function ve(e, t) {
        if (!t)
          E(e, 4, this.length);
        return i.read(this, e, true, 23, 4);
      };
      f.prototype.readFloatBE = function be(e, t) {
        if (!t)
          E(e, 4, this.length);
        return i.read(this, e, false, 23, 4);
      };
      f.prototype.readDoubleLE = function me(e, t) {
        if (!t)
          E(e, 8, this.length);
        return i.read(this, e, true, 52, 8);
      };
      f.prototype.readDoubleBE = function ye(e, t) {
        if (!t)
          E(e, 8, this.length);
        return i.read(this, e, false, 52, 8);
      };
      function A(e, t, r, n, i, a) {
        if (!f.isBuffer(e))
          throw new TypeError("buffer must be a Buffer instance");
        if (t > i || t < a)
          throw new RangeError("value is out of bounds");
        if (r + n > e.length)
          throw new RangeError("index out of range");
      }
      f.prototype.writeUIntLE = function we(e, t, r, n) {
        e = +e;
        t = t >>> 0;
        r = r >>> 0;
        if (!n)
          A(this, e, t, r, Math.pow(2, 8 * r), 0);
        var i = 1;
        var a = 0;
        this[t] = e & 255;
        while (++a < r && (i *= 256)) {
          this[t + a] = e / i >>> 0 & 255;
        }
        return t + r;
      };
      f.prototype.writeUIntBE = function _e(e, t, r, n) {
        e = +e;
        t = t >>> 0;
        r = r >>> 0;
        if (!n)
          A(this, e, t, r, Math.pow(2, 8 * r), 0);
        var i = r - 1;
        var a = 1;
        this[t + i] = e & 255;
        while (--i >= 0 && (a *= 256)) {
          this[t + i] = e / a >>> 0 & 255;
        }
        return t + r;
      };
      f.prototype.writeUInt8 = function Ee(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 1, 255, 0);
        if (!f.TYPED_ARRAY_SUPPORT)
          e = Math.floor(e);
        this[t] = e;
        return t + 1;
      };
      function S(e, t, r, n) {
        if (t < 0)
          t = 65535 + t + 1;
        for (var i = 0,
            a = Math.min(e.length - r, 2); i < a; i++) {
          e[r + i] = (t & 255 << 8 * (n ? i : 1 - i)) >>> (n ? i : 1 - i) * 8;
        }
      }
      f.prototype.writeUInt16LE = function Ae(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 2, 65535, 0);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e;
          this[t + 1] = e >>> 8;
        } else {
          S(this, e, t, true);
        }
        return t + 2;
      };
      f.prototype.writeUInt16BE = function Se(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 2, 65535, 0);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e >>> 8;
          this[t + 1] = e;
        } else {
          S(this, e, t, false);
        }
        return t + 2;
      };
      function R(e, t, r, n) {
        if (t < 0)
          t = 4294967295 + t + 1;
        for (var i = 0,
            a = Math.min(e.length - r, 4); i < a; i++) {
          e[r + i] = t >>> (n ? i : 3 - i) * 8 & 255;
        }
      }
      f.prototype.writeUInt32LE = function Re(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 4, 4294967295, 0);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t + 3] = e >>> 24;
          this[t + 2] = e >>> 16;
          this[t + 1] = e >>> 8;
          this[t] = e;
        } else {
          R(this, e, t, true);
        }
        return t + 4;
      };
      f.prototype.writeUInt32BE = function Le(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 4, 4294967295, 0);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e >>> 24;
          this[t + 1] = e >>> 16;
          this[t + 2] = e >>> 8;
          this[t + 3] = e;
        } else {
          R(this, e, t, false);
        }
        return t + 4;
      };
      f.prototype.writeIntLE = function Ce(e, t, r, n) {
        e = +e;
        t = t >>> 0;
        if (!n) {
          A(this, e, t, r, Math.pow(2, 8 * r - 1) - 1, -Math.pow(2, 8 * r - 1));
        }
        var i = 0;
        var a = 1;
        var o = e < 0 ? 1 : 0;
        this[t] = e & 255;
        while (++i < r && (a *= 256)) {
          this[t + i] = (e / a >> 0) - o & 255;
        }
        return t + r;
      };
      f.prototype.writeIntBE = function Ie(e, t, r, n) {
        e = +e;
        t = t >>> 0;
        if (!n) {
          A(this, e, t, r, Math.pow(2, 8 * r - 1) - 1, -Math.pow(2, 8 * r - 1));
        }
        var i = r - 1;
        var a = 1;
        var o = e < 0 ? 1 : 0;
        this[t + i] = e & 255;
        while (--i >= 0 && (a *= 256)) {
          this[t + i] = (e / a >> 0) - o & 255;
        }
        return t + r;
      };
      f.prototype.writeInt8 = function ke(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 1, 127, -128);
        if (!f.TYPED_ARRAY_SUPPORT)
          e = Math.floor(e);
        if (e < 0)
          e = 255 + e + 1;
        this[t] = e;
        return t + 1;
      };
      f.prototype.writeInt16LE = function Te(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 2, 32767, -32768);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e;
          this[t + 1] = e >>> 8;
        } else {
          S(this, e, t, true);
        }
        return t + 2;
      };
      f.prototype.writeInt16BE = function Be(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 2, 32767, -32768);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e >>> 8;
          this[t + 1] = e;
        } else {
          S(this, e, t, false);
        }
        return t + 2;
      };
      f.prototype.writeInt32LE = function Me(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 4, 2147483647, -2147483648);
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e;
          this[t + 1] = e >>> 8;
          this[t + 2] = e >>> 16;
          this[t + 3] = e >>> 24;
        } else {
          R(this, e, t, true);
        }
        return t + 4;
      };
      f.prototype.writeInt32BE = function xe(e, t, r) {
        e = +e;
        t = t >>> 0;
        if (!r)
          A(this, e, t, 4, 2147483647, -2147483648);
        if (e < 0)
          e = 4294967295 + e + 1;
        if (f.TYPED_ARRAY_SUPPORT) {
          this[t] = e >>> 24;
          this[t + 1] = e >>> 16;
          this[t + 2] = e >>> 8;
          this[t + 3] = e;
        } else {
          R(this, e, t, false);
        }
        return t + 4;
      };
      function L(e, t, r, n, i, a) {
        if (t > i || t < a)
          throw new RangeError("value is out of bounds");
        if (r + n > e.length)
          throw new RangeError("index out of range");
        if (r < 0)
          throw new RangeError("index out of range");
      }
      function C(e, t, r, n, a) {
        if (!a) {
          L(e, t, r, 4, 3.4028234663852886e38, -3.4028234663852886e38);
        }
        i.write(e, t, r, n, 23, 4);
        return r + 4;
      }
      f.prototype.writeFloatLE = function Ue(e, t, r) {
        return C(this, e, t, true, r);
      };
      f.prototype.writeFloatBE = function je(e, t, r) {
        return C(this, e, t, false, r);
      };
      function I(e, t, r, n, a) {
        if (!a) {
          L(e, t, r, 8, 1.7976931348623157e308, -1.7976931348623157e308);
        }
        i.write(e, t, r, n, 52, 8);
        return r + 8;
      }
      f.prototype.writeDoubleLE = function Pe(e, t, r) {
        return I(this, e, t, true, r);
      };
      f.prototype.writeDoubleBE = function De(e, t, r) {
        return I(this, e, t, false, r);
      };
      f.prototype.copy = function Oe(e, t, r, n) {
        var i = this;
        if (!r)
          r = 0;
        if (!n && n !== 0)
          n = this.length;
        if (t >= e.length)
          t = e.length;
        if (!t)
          t = 0;
        if (n > 0 && n < r)
          n = r;
        if (n === r)
          return 0;
        if (e.length === 0 || i.length === 0)
          return 0;
        if (t < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (r < 0 || r >= i.length)
          throw new RangeError("sourceStart out of bounds");
        if (n < 0)
          throw new RangeError("sourceEnd out of bounds");
        if (n > this.length)
          n = this.length;
        if (e.length - t < n - r) {
          n = e.length - t + r;
        }
        var a = n - r;
        if (a < 1e3 || !f.TYPED_ARRAY_SUPPORT) {
          for (var o = 0; o < a; o++) {
            e[o + t] = this[o + r];
          }
        } else {
          e._set(this.subarray(r, r + a), t);
        }
        return a;
      };
      f.prototype.fill = function Ne(e, t, r) {
        if (!e)
          e = 0;
        if (!t)
          t = 0;
        if (!r)
          r = this.length;
        if (r < t)
          throw new RangeError("end < start");
        if (r === t)
          return;
        if (this.length === 0)
          return;
        if (t < 0 || t >= this.length)
          throw new RangeError("start out of bounds");
        if (r < 0 || r > this.length)
          throw new RangeError("end out of bounds");
        var n;
        if (typeof e === "number") {
          for (n = t; n < r; n++) {
            this[n] = e;
          }
        } else {
          var i = j(e.toString());
          var a = i.length;
          for (n = t; n < r; n++) {
            this[n] = i[n % a];
          }
        }
        return this;
      };
      f.prototype.toArrayBuffer = function Ye() {
        if (typeof Uint8Array !== "undefined") {
          if (f.TYPED_ARRAY_SUPPORT) {
            return new f(this).buffer;
          } else {
            var e = new Uint8Array(this.length);
            for (var t = 0,
                r = e.length; t < r; t += 1) {
              e[t] = this[t];
            }
            return e.buffer;
          }
        } else {
          throw new TypeError("Buffer.toArrayBuffer not supported in this browser");
        }
      };
      var k = f.prototype;
      f._augment = function Fe(e) {
        e.constructor = f;
        e._isBuffer = true;
        e._get = e.get;
        e._set = e.set;
        e.get = k.get;
        e.set = k.set;
        e.write = k.write;
        e.toString = k.toString;
        e.toLocaleString = k.toString;
        e.toJSON = k.toJSON;
        e.equals = k.equals;
        e.compare = k.compare;
        e.indexOf = k.indexOf;
        e.copy = k.copy;
        e.slice = k.slice;
        e.readUIntLE = k.readUIntLE;
        e.readUIntBE = k.readUIntBE;
        e.readUInt8 = k.readUInt8;
        e.readUInt16LE = k.readUInt16LE;
        e.readUInt16BE = k.readUInt16BE;
        e.readUInt32LE = k.readUInt32LE;
        e.readUInt32BE = k.readUInt32BE;
        e.readIntLE = k.readIntLE;
        e.readIntBE = k.readIntBE;
        e.readInt8 = k.readInt8;
        e.readInt16LE = k.readInt16LE;
        e.readInt16BE = k.readInt16BE;
        e.readInt32LE = k.readInt32LE;
        e.readInt32BE = k.readInt32BE;
        e.readFloatLE = k.readFloatLE;
        e.readFloatBE = k.readFloatBE;
        e.readDoubleLE = k.readDoubleLE;
        e.readDoubleBE = k.readDoubleBE;
        e.writeUInt8 = k.writeUInt8;
        e.writeUIntLE = k.writeUIntLE;
        e.writeUIntBE = k.writeUIntBE;
        e.writeUInt16LE = k.writeUInt16LE;
        e.writeUInt16BE = k.writeUInt16BE;
        e.writeUInt32LE = k.writeUInt32LE;
        e.writeUInt32BE = k.writeUInt32BE;
        e.writeIntLE = k.writeIntLE;
        e.writeIntBE = k.writeIntBE;
        e.writeInt8 = k.writeInt8;
        e.writeInt16LE = k.writeInt16LE;
        e.writeInt16BE = k.writeInt16BE;
        e.writeInt32LE = k.writeInt32LE;
        e.writeInt32BE = k.writeInt32BE;
        e.writeFloatLE = k.writeFloatLE;
        e.writeFloatBE = k.writeFloatBE;
        e.writeDoubleLE = k.writeDoubleLE;
        e.writeDoubleBE = k.writeDoubleBE;
        e.fill = k.fill;
        e.inspect = k.inspect;
        e.toArrayBuffer = k.toArrayBuffer;
        return e;
      };
      var T = /[^+\/0-9A-z\-]/g;
      function B(e) {
        e = M(e).replace(T, "");
        if (e.length < 2)
          return "";
        while (e.length % 4 !== 0) {
          e = e + "=";
        }
        return e;
      }
      function M(e) {
        if (e.trim)
          return e.trim();
        return e.replace(/^\s+|\s+$/g, "");
      }
      function x(e) {
        return a(e) || f.isBuffer(e) || e && typeof e === "object" && typeof e.length === "number";
      }
      function U(e) {
        if (e < 16)
          return "0" + e.toString(16);
        return e.toString(16);
      }
      function j(e, t) {
        t = t || Infinity;
        var r;
        var n = e.length;
        var i = null;
        var a = [];
        var o = 0;
        for (; o < n; o++) {
          r = e.charCodeAt(o);
          if (r > 55295 && r < 57344) {
            if (i) {
              if (r < 56320) {
                if ((t -= 3) > -1)
                  a.push(239, 191, 189);
                i = r;
                continue;
              } else {
                r = i - 55296 << 10 | r - 56320 | 65536;
                i = null;
              }
            } else {
              if (r > 56319) {
                if ((t -= 3) > -1)
                  a.push(239, 191, 189);
                continue;
              } else if (o + 1 === n) {
                if ((t -= 3) > -1)
                  a.push(239, 191, 189);
                continue;
              } else {
                i = r;
                continue;
              }
            }
          } else if (i) {
            if ((t -= 3) > -1)
              a.push(239, 191, 189);
            i = null;
          }
          if (r < 128) {
            if ((t -= 1) < 0)
              break;
            a.push(r);
          } else if (r < 2048) {
            if ((t -= 2) < 0)
              break;
            a.push(r >> 6 | 192, r & 63 | 128);
          } else if (r < 65536) {
            if ((t -= 3) < 0)
              break;
            a.push(r >> 12 | 224, r >> 6 & 63 | 128, r & 63 | 128);
          } else if (r < 2097152) {
            if ((t -= 4) < 0)
              break;
            a.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, r & 63 | 128);
          } else {
            throw new Error("Invalid code point");
          }
        }
        return a;
      }
      function P(e) {
        var t = [];
        for (var r = 0; r < e.length; r++) {
          t.push(e.charCodeAt(r) & 255);
        }
        return t;
      }
      function D(e, t) {
        var r,
            n,
            i;
        var a = [];
        for (var o = 0; o < e.length; o++) {
          if ((t -= 2) < 0)
            break;
          r = e.charCodeAt(o);
          n = r >> 8;
          i = r % 256;
          a.push(i);
          a.push(n);
        }
        return a;
      }
      function O(e) {
        return n.toByteArray(B(e));
      }
      function N(e, t, r, n) {
        for (var i = 0; i < n; i++) {
          if (i + r >= t.length || i >= e.length)
            break;
          t[i + r] = e[i];
        }
        return i;
      }
      function Y(e) {
        try {
          return decodeURIComponent(e);
        } catch (t) {
          return String.fromCharCode(65533);
        }
      }
    }, {
      "base64-js": 14,
      ieee754: 15,
      "is-array": 16
    }],
    14: [function(e, t, r) {
      var n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      (function(e) {
        "use strict";
        var t = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
        var r = "+".charCodeAt(0);
        var i = "/".charCodeAt(0);
        var a = "0".charCodeAt(0);
        var o = "a".charCodeAt(0);
        var s = "A".charCodeAt(0);
        var f = "-".charCodeAt(0);
        var u = "_".charCodeAt(0);
        function c(e) {
          var t = e.charCodeAt(0);
          if (t === r || t === f)
            return 62;
          if (t === i || t === u)
            return 63;
          if (t < a)
            return -1;
          if (t < a + 10)
            return t - a + 26 + 26;
          if (t < s + 26)
            return t - s;
          if (t < o + 26)
            return t - o + 26;
        }
        function l(e) {
          var r,
              n,
              i,
              a,
              o,
              s;
          if (e.length % 4 > 0) {
            throw new Error("Invalid string. Length must be a multiple of 4");
          }
          var f = e.length;
          o = "=" === e.charAt(f - 2) ? 2 : "=" === e.charAt(f - 1) ? 1 : 0;
          s = new t(e.length * 3 / 4 - o);
          i = o > 0 ? e.length - 4 : e.length;
          var u = 0;
          function l(e) {
            s[u++] = e;
          }
          for (r = 0, n = 0; r < i; r += 4, n += 3) {
            a = c(e.charAt(r)) << 18 | c(e.charAt(r + 1)) << 12 | c(e.charAt(r + 2)) << 6 | c(e.charAt(r + 3));
            l((a & 16711680) >> 16);
            l((a & 65280) >> 8);
            l(a & 255);
          }
          if (o === 2) {
            a = c(e.charAt(r)) << 2 | c(e.charAt(r + 1)) >> 4;
            l(a & 255);
          } else if (o === 1) {
            a = c(e.charAt(r)) << 10 | c(e.charAt(r + 1)) << 4 | c(e.charAt(r + 2)) >> 2;
            l(a >> 8 & 255);
            l(a & 255);
          }
          return s;
        }
        function h(e) {
          var t,
              r = e.length % 3,
              i = "",
              a,
              o;
          function s(e) {
            return n.charAt(e);
          }
          function f(e) {
            return s(e >> 18 & 63) + s(e >> 12 & 63) + s(e >> 6 & 63) + s(e & 63);
          }
          for (t = 0, o = e.length - r; t < o; t += 3) {
            a = (e[t] << 16) + (e[t + 1] << 8) + e[t + 2];
            i += f(a);
          }
          switch (r) {
            case 1:
              a = e[e.length - 1];
              i += s(a >> 2);
              i += s(a << 4 & 63);
              i += "==";
              break;
            case 2:
              a = (e[e.length - 2] << 8) + e[e.length - 1];
              i += s(a >> 10);
              i += s(a >> 4 & 63);
              i += s(a << 2 & 63);
              i += "=";
              break;
          }
          return i;
        }
        e.toByteArray = l;
        e.fromByteArray = h;
      })(typeof r === "undefined" ? this.base64js = {} : r);
    }, {}],
    15: [function(e, t, r) {
      r.read = function(e, t, r, n, i) {
        var a,
            o,
            s = i * 8 - n - 1,
            f = (1 << s) - 1,
            u = f >> 1,
            c = -7,
            l = r ? i - 1 : 0,
            h = r ? -1 : 1,
            d = e[t + l];
        l += h;
        a = d & (1 << -c) - 1;
        d >>= -c;
        c += s;
        for (; c > 0; a = a * 256 + e[t + l], l += h, c -= 8)
          ;
        o = a & (1 << -c) - 1;
        a >>= -c;
        c += n;
        for (; c > 0; o = o * 256 + e[t + l], l += h, c -= 8)
          ;
        if (a === 0) {
          a = 1 - u;
        } else if (a === f) {
          return o ? NaN : (d ? -1 : 1) * Infinity;
        } else {
          o = o + Math.pow(2, n);
          a = a - u;
        }
        return (d ? -1 : 1) * o * Math.pow(2, a - n);
      };
      r.write = function(e, t, r, n, i, a) {
        var o,
            s,
            f,
            u = a * 8 - i - 1,
            c = (1 << u) - 1,
            l = c >> 1,
            h = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
            d = n ? 0 : a - 1,
            p = n ? 1 : -1,
            g = t < 0 || t === 0 && 1 / t < 0 ? 1 : 0;
        t = Math.abs(t);
        if (isNaN(t) || t === Infinity) {
          s = isNaN(t) ? 1 : 0;
          o = c;
        } else {
          o = Math.floor(Math.log(t) / Math.LN2);
          if (t * (f = Math.pow(2, -o)) < 1) {
            o--;
            f *= 2;
          }
          if (o + l >= 1) {
            t += h / f;
          } else {
            t += h * Math.pow(2, 1 - l);
          }
          if (t * f >= 2) {
            o++;
            f /= 2;
          }
          if (o + l >= c) {
            s = 0;
            o = c;
          } else if (o + l >= 1) {
            s = (t * f - 1) * Math.pow(2, i);
            o = o + l;
          } else {
            s = t * Math.pow(2, l - 1) * Math.pow(2, i);
            o = 0;
          }
        }
        for (; i >= 8; e[r + d] = s & 255, d += p, s /= 256, i -= 8)
          ;
        o = o << i | s;
        u += i;
        for (; u > 0; e[r + d] = o & 255, d += p, o /= 256, u -= 8)
          ;
        e[r + d - p] |= g * 128;
      };
    }, {}],
    16: [function(e, t, r) {
      var n = Array.isArray;
      var i = Object.prototype.toString;
      t.exports = n || function(e) {
        return !!e && "[object Array]" == i.call(e);
      };
    }, {}],
    17: [function(e, t, r) {
      function n() {
        this._events = this._events || {};
        this._maxListeners = this._maxListeners || undefined;
      }
      t.exports = n;
      n.EventEmitter = n;
      n.prototype._events = undefined;
      n.prototype._maxListeners = undefined;
      n.defaultMaxListeners = 10;
      n.prototype.setMaxListeners = function(e) {
        if (!a(e) || e < 0 || isNaN(e))
          throw TypeError("n must be a positive number");
        this._maxListeners = e;
        return this;
      };
      n.prototype.emit = function(e) {
        var t,
            r,
            n,
            a,
            f,
            u;
        if (!this._events)
          this._events = {};
        if (e === "error") {
          if (!this._events.error || o(this._events.error) && !this._events.error.length) {
            t = arguments[1];
            if (t instanceof Error) {
              throw t;
            }
            throw TypeError('Uncaught, unspecified "error" event.');
          }
        }
        r = this._events[e];
        if (s(r))
          return false;
        if (i(r)) {
          switch (arguments.length) {
            case 1:
              r.call(this);
              break;
            case 2:
              r.call(this, arguments[1]);
              break;
            case 3:
              r.call(this, arguments[1], arguments[2]);
              break;
            default:
              n = arguments.length;
              a = new Array(n - 1);
              for (f = 1; f < n; f++)
                a[f - 1] = arguments[f];
              r.apply(this, a);
          }
        } else if (o(r)) {
          n = arguments.length;
          a = new Array(n - 1);
          for (f = 1; f < n; f++)
            a[f - 1] = arguments[f];
          u = r.slice();
          n = u.length;
          for (f = 0; f < n; f++)
            u[f].apply(this, a);
        }
        return true;
      };
      n.prototype.addListener = function(e, t) {
        var r;
        if (!i(t))
          throw TypeError("listener must be a function");
        if (!this._events)
          this._events = {};
        if (this._events.newListener)
          this.emit("newListener", e, i(t.listener) ? t.listener : t);
        if (!this._events[e])
          this._events[e] = t;
        else if (o(this._events[e]))
          this._events[e].push(t);
        else
          this._events[e] = [this._events[e], t];
        if (o(this._events[e]) && !this._events[e].warned) {
          var r;
          if (!s(this._maxListeners)) {
            r = this._maxListeners;
          } else {
            r = n.defaultMaxListeners;
          }
          if (r && r > 0 && this._events[e].length > r) {
            this._events[e].warned = true;
            console.error("(node) warning: possible EventEmitter memory " + "leak detected. %d listeners added. " + "Use emitter.setMaxListeners() to increase limit.", this._events[e].length);
            if (typeof console.trace === "function") {
              console.trace();
            }
          }
        }
        return this;
      };
      n.prototype.on = n.prototype.addListener;
      n.prototype.once = function(e, t) {
        if (!i(t))
          throw TypeError("listener must be a function");
        var r = false;
        function n() {
          this.removeListener(e, n);
          if (!r) {
            r = true;
            t.apply(this, arguments);
          }
        }
        n.listener = t;
        this.on(e, n);
        return this;
      };
      n.prototype.removeListener = function(e, t) {
        var r,
            n,
            a,
            s;
        if (!i(t))
          throw TypeError("listener must be a function");
        if (!this._events || !this._events[e])
          return this;
        r = this._events[e];
        a = r.length;
        n = -1;
        if (r === t || i(r.listener) && r.listener === t) {
          delete this._events[e];
          if (this._events.removeListener)
            this.emit("removeListener", e, t);
        } else if (o(r)) {
          for (s = a; s-- > 0; ) {
            if (r[s] === t || r[s].listener && r[s].listener === t) {
              n = s;
              break;
            }
          }
          if (n < 0)
            return this;
          if (r.length === 1) {
            r.length = 0;
            delete this._events[e];
          } else {
            r.splice(n, 1);
          }
          if (this._events.removeListener)
            this.emit("removeListener", e, t);
        }
        return this;
      };
      n.prototype.removeAllListeners = function(e) {
        var t,
            r;
        if (!this._events)
          return this;
        if (!this._events.removeListener) {
          if (arguments.length === 0)
            this._events = {};
          else if (this._events[e])
            delete this._events[e];
          return this;
        }
        if (arguments.length === 0) {
          for (t in this._events) {
            if (t === "removeListener")
              continue;
            this.removeAllListeners(t);
          }
          this.removeAllListeners("removeListener");
          this._events = {};
          return this;
        }
        r = this._events[e];
        if (i(r)) {
          this.removeListener(e, r);
        } else {
          while (r.length)
            this.removeListener(e, r[r.length - 1]);
        }
        delete this._events[e];
        return this;
      };
      n.prototype.listeners = function(e) {
        var t;
        if (!this._events || !this._events[e])
          t = [];
        else if (i(this._events[e]))
          t = [this._events[e]];
        else
          t = this._events[e].slice();
        return t;
      };
      n.listenerCount = function(e, t) {
        var r;
        if (!e._events || !e._events[t])
          r = 0;
        else if (i(e._events[t]))
          r = 1;
        else
          r = e._events[t].length;
        return r;
      };
      function i(e) {
        return typeof e === "function";
      }
      function a(e) {
        return typeof e === "number";
      }
      function o(e) {
        return typeof e === "object" && e !== null;
      }
      function s(e) {
        return e === void 0;
      }
    }, {}],
    18: [function(e, t, r) {
      arguments[4][6][0].apply(r, arguments);
    }, {dup: 6}],
    19: [function(e, t, r) {
      t.exports = Array.isArray || function(e) {
        return Object.prototype.toString.call(e) == "[object Array]";
      };
    }, {}],
    20: [function(e, t, r) {
      var n = t.exports = {};
      var i = [];
      var a = false;
      function o() {
        if (a) {
          return;
        }
        a = true;
        var e;
        var t = i.length;
        while (t) {
          e = i;
          i = [];
          var r = -1;
          while (++r < t) {
            e[r]();
          }
          t = i.length;
        }
        a = false;
      }
      n.nextTick = function(e) {
        i.push(e);
        if (!a) {
          setTimeout(o, 0);
        }
      };
      n.title = "browser";
      n.browser = true;
      n.env = {};
      n.argv = [];
      n.version = "";
      n.versions = {};
      function s() {}
      n.on = s;
      n.addListener = s;
      n.once = s;
      n.off = s;
      n.removeListener = s;
      n.removeAllListeners = s;
      n.emit = s;
      n.binding = function(e) {
        throw new Error("process.binding is not supported");
      };
      n.cwd = function() {
        return "/";
      };
      n.chdir = function(e) {
        throw new Error("process.chdir is not supported");
      };
      n.umask = function() {
        return 0;
      };
    }, {}],
    21: [function(e, t, r) {
      t.exports = e("./lib/_stream_duplex.js");
    }, {"./lib/_stream_duplex.js": 22}],
    22: [function(e, t, r) {
      (function(r) {
        t.exports = s;
        var n = Object.keys || function(e) {
          var t = [];
          for (var r in e)
            t.push(r);
          return t;
        };
        var i = e("core-util-is");
        i.inherits = e("inherits");
        var a = e("./_stream_readable");
        var o = e("./_stream_writable");
        i.inherits(s, a);
        u(n(o.prototype), function(e) {
          if (!s.prototype[e])
            s.prototype[e] = o.prototype[e];
        });
        function s(e) {
          if (!(this instanceof s))
            return new s(e);
          a.call(this, e);
          o.call(this, e);
          if (e && e.readable === false)
            this.readable = false;
          if (e && e.writable === false)
            this.writable = false;
          this.allowHalfOpen = true;
          if (e && e.allowHalfOpen === false)
            this.allowHalfOpen = false;
          this.once("end", f);
        }
        function f() {
          if (this.allowHalfOpen || this._writableState.ended)
            return;
          r.nextTick(this.end.bind(this));
        }
        function u(e, t) {
          for (var r = 0,
              n = e.length; r < n; r++) {
            t(e[r], r);
          }
        }
      }).call(this, e("_process"));
    }, {
      "./_stream_readable": 24,
      "./_stream_writable": 26,
      _process: 20,
      "core-util-is": 27,
      inherits: 18
    }],
    23: [function(e, t, r) {
      t.exports = a;
      var n = e("./_stream_transform");
      var i = e("core-util-is");
      i.inherits = e("inherits");
      i.inherits(a, n);
      function a(e) {
        if (!(this instanceof a))
          return new a(e);
        n.call(this, e);
      }
      a.prototype._transform = function(e, t, r) {
        r(null, e);
      };
    }, {
      "./_stream_transform": 25,
      "core-util-is": 27,
      inherits: 18
    }],
    24: [function(e, t, r) {
      (function(r) {
        t.exports = l;
        var n = e("isarray");
        var i = e("buffer").Buffer;
        l.ReadableState = c;
        var a = e("events").EventEmitter;
        if (!a.listenerCount)
          a.listenerCount = function(e, t) {
            return e.listeners(t).length;
          };
        var o = e("stream");
        var s = e("core-util-is");
        s.inherits = e("inherits");
        var f;
        var u = e("util");
        if (u && u.debuglog) {
          u = u.debuglog("stream");
        } else {
          u = function() {};
        }
        s.inherits(l, o);
        function c(t, r) {
          var n = e("./_stream_duplex");
          t = t || {};
          var i = t.highWaterMark;
          var a = t.objectMode ? 16 : 16 * 1024;
          this.highWaterMark = i || i === 0 ? i : a;
          this.highWaterMark = ~~this.highWaterMark;
          this.buffer = [];
          this.length = 0;
          this.pipes = null;
          this.pipesCount = 0;
          this.flowing = null;
          this.ended = false;
          this.endEmitted = false;
          this.reading = false;
          this.sync = true;
          this.needReadable = false;
          this.emittedReadable = false;
          this.readableListening = false;
          this.objectMode = !!t.objectMode;
          if (r instanceof n)
            this.objectMode = this.objectMode || !!t.readableObjectMode;
          this.defaultEncoding = t.defaultEncoding || "utf8";
          this.ranOut = false;
          this.awaitDrain = 0;
          this.readingMore = false;
          this.decoder = null;
          this.encoding = null;
          if (t.encoding) {
            if (!f)
              f = e("string_decoder/").StringDecoder;
            this.decoder = new f(t.encoding);
            this.encoding = t.encoding;
          }
        }
        function l(t) {
          var r = e("./_stream_duplex");
          if (!(this instanceof l))
            return new l(t);
          this._readableState = new c(t, this);
          this.readable = true;
          o.call(this);
        }
        l.prototype.push = function(e, t) {
          var r = this._readableState;
          if (s.isString(e) && !r.objectMode) {
            t = t || r.defaultEncoding;
            if (t !== r.encoding) {
              e = new i(e, t);
              t = "";
            }
          }
          return h(this, r, e, t, false);
        };
        l.prototype.unshift = function(e) {
          var t = this._readableState;
          return h(this, t, e, "", true);
        };
        function h(e, t, r, n, i) {
          var a = b(t, r);
          if (a) {
            e.emit("error", a);
          } else if (s.isNullOrUndefined(r)) {
            t.reading = false;
            if (!t.ended)
              m(e, t);
          } else if (t.objectMode || r && r.length > 0) {
            if (t.ended && !i) {
              var o = new Error("stream.push() after EOF");
              e.emit("error", o);
            } else if (t.endEmitted && i) {
              var o = new Error("stream.unshift() after end event");
              e.emit("error", o);
            } else {
              if (t.decoder && !i && !n)
                r = t.decoder.write(r);
              if (!i)
                t.reading = false;
              if (t.flowing && t.length === 0 && !t.sync) {
                e.emit("data", r);
                e.read(0);
              } else {
                t.length += t.objectMode ? 1 : r.length;
                if (i)
                  t.buffer.unshift(r);
                else
                  t.buffer.push(r);
                if (t.needReadable)
                  y(e);
              }
              _(e, t);
            }
          } else if (!i) {
            t.reading = false;
          }
          return d(t);
        }
        function d(e) {
          return !e.ended && (e.needReadable || e.length < e.highWaterMark || e.length === 0);
        }
        l.prototype.setEncoding = function(t) {
          if (!f)
            f = e("string_decoder/").StringDecoder;
          this._readableState.decoder = new f(t);
          this._readableState.encoding = t;
          return this;
        };
        var p = 8388608;
        function g(e) {
          if (e >= p) {
            e = p;
          } else {
            e--;
            for (var t = 1; t < 32; t <<= 1)
              e |= e >> t;
            e++;
          }
          return e;
        }
        function v(e, t) {
          if (t.length === 0 && t.ended)
            return 0;
          if (t.objectMode)
            return e === 0 ? 0 : 1;
          if (isNaN(e) || s.isNull(e)) {
            if (t.flowing && t.buffer.length)
              return t.buffer[0].length;
            else
              return t.length;
          }
          if (e <= 0)
            return 0;
          if (e > t.highWaterMark)
            t.highWaterMark = g(e);
          if (e > t.length) {
            if (!t.ended) {
              t.needReadable = true;
              return 0;
            } else
              return t.length;
          }
          return e;
        }
        l.prototype.read = function(e) {
          u("read", e);
          var t = this._readableState;
          var r = e;
          if (!s.isNumber(e) || e > 0)
            t.emittedReadable = false;
          if (e === 0 && t.needReadable && (t.length >= t.highWaterMark || t.ended)) {
            u("read: emitReadable", t.length, t.ended);
            if (t.length === 0 && t.ended)
              I(this);
            else
              y(this);
            return null;
          }
          e = v(e, t);
          if (e === 0 && t.ended) {
            if (t.length === 0)
              I(this);
            return null;
          }
          var n = t.needReadable;
          u("need readable", n);
          if (t.length === 0 || t.length - e < t.highWaterMark) {
            n = true;
            u("length less than watermark", n);
          }
          if (t.ended || t.reading) {
            n = false;
            u("reading or ended", n);
          }
          if (n) {
            u("do read");
            t.reading = true;
            t.sync = true;
            if (t.length === 0)
              t.needReadable = true;
            this._read(t.highWaterMark);
            t.sync = false;
          }
          if (n && !t.reading)
            e = v(r, t);
          var i;
          if (e > 0)
            i = C(e, t);
          else
            i = null;
          if (s.isNull(i)) {
            t.needReadable = true;
            e = 0;
          }
          t.length -= e;
          if (t.length === 0 && !t.ended)
            t.needReadable = true;
          if (r !== e && t.ended && t.length === 0)
            I(this);
          if (!s.isNull(i))
            this.emit("data", i);
          return i;
        };
        function b(e, t) {
          var r = null;
          if (!s.isBuffer(t) && !s.isString(t) && !s.isNullOrUndefined(t) && !e.objectMode) {
            r = new TypeError("Invalid non-string/buffer chunk");
          }
          return r;
        }
        function m(e, t) {
          if (t.decoder && !t.ended) {
            var r = t.decoder.end();
            if (r && r.length) {
              t.buffer.push(r);
              t.length += t.objectMode ? 1 : r.length;
            }
          }
          t.ended = true;
          y(e);
        }
        function y(e) {
          var t = e._readableState;
          t.needReadable = false;
          if (!t.emittedReadable) {
            u("emitReadable", t.flowing);
            t.emittedReadable = true;
            if (t.sync)
              r.nextTick(function() {
                w(e);
              });
            else
              w(e);
          }
        }
        function w(e) {
          u("emit readable");
          e.emit("readable");
          L(e);
        }
        function _(e, t) {
          if (!t.readingMore) {
            t.readingMore = true;
            r.nextTick(function() {
              E(e, t);
            });
          }
        }
        function E(e, t) {
          var r = t.length;
          while (!t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark) {
            u("maybeReadMore read 0");
            e.read(0);
            if (r === t.length)
              break;
            else
              r = t.length;
          }
          t.readingMore = false;
        }
        l.prototype._read = function(e) {
          this.emit("error", new Error("not implemented"));
        };
        l.prototype.pipe = function(e, t) {
          var i = this;
          var o = this._readableState;
          switch (o.pipesCount) {
            case 0:
              o.pipes = e;
              break;
            case 1:
              o.pipes = [o.pipes, e];
              break;
            default:
              o.pipes.push(e);
              break;
          }
          o.pipesCount += 1;
          u("pipe count=%d opts=%j", o.pipesCount, t);
          var s = (!t || t.end !== false) && e !== r.stdout && e !== r.stderr;
          var f = s ? l : d;
          if (o.endEmitted)
            r.nextTick(f);
          else
            i.once("end", f);
          e.on("unpipe", c);
          function c(e) {
            u("onunpipe");
            if (e === i) {
              d();
            }
          }
          function l() {
            u("onend");
            e.end();
          }
          var h = A(i);
          e.on("drain", h);
          function d() {
            u("cleanup");
            e.removeListener("close", v);
            e.removeListener("finish", b);
            e.removeListener("drain", h);
            e.removeListener("error", g);
            e.removeListener("unpipe", c);
            i.removeListener("end", l);
            i.removeListener("end", d);
            i.removeListener("data", p);
            if (o.awaitDrain && (!e._writableState || e._writableState.needDrain))
              h();
          }
          i.on("data", p);
          function p(t) {
            u("ondata");
            var r = e.write(t);
            if (false === r) {
              u("false write response, pause", i._readableState.awaitDrain);
              i._readableState.awaitDrain++;
              i.pause();
            }
          }
          function g(t) {
            u("onerror", t);
            m();
            e.removeListener("error", g);
            if (a.listenerCount(e, "error") === 0)
              e.emit("error", t);
          }
          if (!e._events || !e._events.error)
            e.on("error", g);
          else if (n(e._events.error))
            e._events.error.unshift(g);
          else
            e._events.error = [g, e._events.error];
          function v() {
            e.removeListener("finish", b);
            m();
          }
          e.once("close", v);
          function b() {
            u("onfinish");
            e.removeListener("close", v);
            m();
          }
          e.once("finish", b);
          function m() {
            u("unpipe");
            i.unpipe(e);
          }
          e.emit("pipe", i);
          if (!o.flowing) {
            u("pipe resume");
            i.resume();
          }
          return e;
        };
        function A(e) {
          return function() {
            var t = e._readableState;
            u("pipeOnDrain", t.awaitDrain);
            if (t.awaitDrain)
              t.awaitDrain--;
            if (t.awaitDrain === 0 && a.listenerCount(e, "data")) {
              t.flowing = true;
              L(e);
            }
          };
        }
        l.prototype.unpipe = function(e) {
          var t = this._readableState;
          if (t.pipesCount === 0)
            return this;
          if (t.pipesCount === 1) {
            if (e && e !== t.pipes)
              return this;
            if (!e)
              e = t.pipes;
            t.pipes = null;
            t.pipesCount = 0;
            t.flowing = false;
            if (e)
              e.emit("unpipe", this);
            return this;
          }
          if (!e) {
            var r = t.pipes;
            var n = t.pipesCount;
            t.pipes = null;
            t.pipesCount = 0;
            t.flowing = false;
            for (var i = 0; i < n; i++)
              r[i].emit("unpipe", this);
            return this;
          }
          var i = T(t.pipes, e);
          if (i === -1)
            return this;
          t.pipes.splice(i, 1);
          t.pipesCount -= 1;
          if (t.pipesCount === 1)
            t.pipes = t.pipes[0];
          e.emit("unpipe", this);
          return this;
        };
        l.prototype.on = function(e, t) {
          var n = o.prototype.on.call(this, e, t);
          if (e === "data" && false !== this._readableState.flowing) {
            this.resume();
          }
          if (e === "readable" && this.readable) {
            var i = this._readableState;
            if (!i.readableListening) {
              i.readableListening = true;
              i.emittedReadable = false;
              i.needReadable = true;
              if (!i.reading) {
                var a = this;
                r.nextTick(function() {
                  u("readable nexttick read 0");
                  a.read(0);
                });
              } else if (i.length) {
                y(this, i);
              }
            }
          }
          return n;
        };
        l.prototype.addListener = l.prototype.on;
        l.prototype.resume = function() {
          var e = this._readableState;
          if (!e.flowing) {
            u("resume");
            e.flowing = true;
            if (!e.reading) {
              u("resume read 0");
              this.read(0);
            }
            S(this, e);
          }
          return this;
        };
        function S(e, t) {
          if (!t.resumeScheduled) {
            t.resumeScheduled = true;
            r.nextTick(function() {
              R(e, t);
            });
          }
        }
        function R(e, t) {
          t.resumeScheduled = false;
          e.emit("resume");
          L(e);
          if (t.flowing && !t.reading)
            e.read(0);
        }
        l.prototype.pause = function() {
          u("call pause flowing=%j", this._readableState.flowing);
          if (false !== this._readableState.flowing) {
            u("pause");
            this._readableState.flowing = false;
            this.emit("pause");
          }
          return this;
        };
        function L(e) {
          var t = e._readableState;
          u("flow", t.flowing);
          if (t.flowing) {
            do {
              var r = e.read();
            } while (null !== r && t.flowing);
          }
        }
        l.prototype.wrap = function(e) {
          var t = this._readableState;
          var r = false;
          var n = this;
          e.on("end", function() {
            u("wrapped end");
            if (t.decoder && !t.ended) {
              var e = t.decoder.end();
              if (e && e.length)
                n.push(e);
            }
            n.push(null);
          });
          e.on("data", function(i) {
            u("wrapped data");
            if (t.decoder)
              i = t.decoder.write(i);
            if (!i || !t.objectMode && !i.length)
              return;
            var a = n.push(i);
            if (!a) {
              r = true;
              e.pause();
            }
          });
          for (var i in e) {
            if (s.isFunction(e[i]) && s.isUndefined(this[i])) {
              this[i] = function(t) {
                return function() {
                  return e[t].apply(e, arguments);
                };
              }(i);
            }
          }
          var a = ["error", "close", "destroy", "pause", "resume"];
          k(a, function(t) {
            e.on(t, n.emit.bind(n, t));
          });
          n._read = function(t) {
            u("wrapped _read", t);
            if (r) {
              r = false;
              e.resume();
            }
          };
          return n;
        };
        l._fromList = C;
        function C(e, t) {
          var r = t.buffer;
          var n = t.length;
          var a = !!t.decoder;
          var o = !!t.objectMode;
          var s;
          if (r.length === 0)
            return null;
          if (n === 0)
            s = null;
          else if (o)
            s = r.shift();
          else if (!e || e >= n) {
            if (a)
              s = r.join("");
            else
              s = i.concat(r, n);
            r.length = 0;
          } else {
            if (e < r[0].length) {
              var f = r[0];
              s = f.slice(0, e);
              r[0] = f.slice(e);
            } else if (e === r[0].length) {
              s = r.shift();
            } else {
              if (a)
                s = "";
              else
                s = new i(e);
              var u = 0;
              for (var c = 0,
                  l = r.length; c < l && u < e; c++) {
                var f = r[0];
                var h = Math.min(e - u, f.length);
                if (a)
                  s += f.slice(0, h);
                else
                  f.copy(s, u, 0, h);
                if (h < f.length)
                  r[0] = f.slice(h);
                else
                  r.shift();
                u += h;
              }
            }
          }
          return s;
        }
        function I(e) {
          var t = e._readableState;
          if (t.length > 0)
            throw new Error("endReadable called on non-empty stream");
          if (!t.endEmitted) {
            t.ended = true;
            r.nextTick(function() {
              if (!t.endEmitted && t.length === 0) {
                t.endEmitted = true;
                e.readable = false;
                e.emit("end");
              }
            });
          }
        }
        function k(e, t) {
          for (var r = 0,
              n = e.length; r < n; r++) {
            t(e[r], r);
          }
        }
        function T(e, t) {
          for (var r = 0,
              n = e.length; r < n; r++) {
            if (e[r] === t)
              return r;
          }
          return -1;
        }
      }).call(this, e("_process"));
    }, {
      "./_stream_duplex": 22,
      _process: 20,
      buffer: 13,
      "core-util-is": 27,
      events: 17,
      inherits: 18,
      isarray: 19,
      stream: 32,
      "string_decoder/": 33,
      util: 12
    }],
    25: [function(e, t, r) {
      t.exports = s;
      var n = e("./_stream_duplex");
      var i = e("core-util-is");
      i.inherits = e("inherits");
      i.inherits(s, n);
      function a(e, t) {
        this.afterTransform = function(e, r) {
          return o(t, e, r);
        };
        this.needTransform = false;
        this.transforming = false;
        this.writecb = null;
        this.writechunk = null;
      }
      function o(e, t, r) {
        var n = e._transformState;
        n.transforming = false;
        var a = n.writecb;
        if (!a)
          return e.emit("error", new Error("no writecb in Transform class"));
        n.writechunk = null;
        n.writecb = null;
        if (!i.isNullOrUndefined(r))
          e.push(r);
        if (a)
          a(t);
        var o = e._readableState;
        o.reading = false;
        if (o.needReadable || o.length < o.highWaterMark) {
          e._read(o.highWaterMark);
        }
      }
      function s(e) {
        if (!(this instanceof s))
          return new s(e);
        n.call(this, e);
        this._transformState = new a(e, this);
        var t = this;
        this._readableState.needReadable = true;
        this._readableState.sync = false;
        this.once("prefinish", function() {
          if (i.isFunction(this._flush))
            this._flush(function(e) {
              f(t, e);
            });
          else
            f(t);
        });
      }
      s.prototype.push = function(e, t) {
        this._transformState.needTransform = false;
        return n.prototype.push.call(this, e, t);
      };
      s.prototype._transform = function(e, t, r) {
        throw new Error("not implemented");
      };
      s.prototype._write = function(e, t, r) {
        var n = this._transformState;
        n.writecb = r;
        n.writechunk = e;
        n.writeencoding = t;
        if (!n.transforming) {
          var i = this._readableState;
          if (n.needTransform || i.needReadable || i.length < i.highWaterMark)
            this._read(i.highWaterMark);
        }
      };
      s.prototype._read = function(e) {
        var t = this._transformState;
        if (!i.isNull(t.writechunk) && t.writecb && !t.transforming) {
          t.transforming = true;
          this._transform(t.writechunk, t.writeencoding, t.afterTransform);
        } else {
          t.needTransform = true;
        }
      };
      function f(e, t) {
        if (t)
          return e.emit("error", t);
        var r = e._writableState;
        var n = e._transformState;
        if (r.length)
          throw new Error("calling transform done when ws.length != 0");
        if (n.transforming)
          throw new Error("calling transform done when still transforming");
        return e.push(null);
      }
    }, {
      "./_stream_duplex": 22,
      "core-util-is": 27,
      inherits: 18
    }],
    26: [function(e, t, r) {
      (function(r) {
        t.exports = f;
        var n = e("buffer").Buffer;
        f.WritableState = s;
        var i = e("core-util-is");
        i.inherits = e("inherits");
        var a = e("stream");
        i.inherits(f, a);
        function o(e, t, r) {
          this.chunk = e;
          this.encoding = t;
          this.callback = r;
        }
        function s(t, r) {
          var n = e("./_stream_duplex");
          t = t || {};
          var i = t.highWaterMark;
          var a = t.objectMode ? 16 : 16 * 1024;
          this.highWaterMark = i || i === 0 ? i : a;
          this.objectMode = !!t.objectMode;
          if (r instanceof n)
            this.objectMode = this.objectMode || !!t.writableObjectMode;
          this.highWaterMark = ~~this.highWaterMark;
          this.needDrain = false;
          this.ending = false;
          this.ended = false;
          this.finished = false;
          var o = t.decodeStrings === false;
          this.decodeStrings = !o;
          this.defaultEncoding = t.defaultEncoding || "utf8";
          this.length = 0;
          this.writing = false;
          this.corked = 0;
          this.sync = true;
          this.bufferProcessing = false;
          this.onwrite = function(e) {
            v(r, e);
          };
          this.writecb = null;
          this.writelen = 0;
          this.buffer = [];
          this.pendingcb = 0;
          this.prefinished = false;
          this.errorEmitted = false;
        }
        function f(t) {
          var r = e("./_stream_duplex");
          if (!(this instanceof f) && !(this instanceof r))
            return new f(t);
          this._writableState = new s(t, this);
          this.writable = true;
          a.call(this);
        }
        f.prototype.pipe = function() {
          this.emit("error", new Error("Cannot pipe. Not readable."));
        };
        function u(e, t, n) {
          var i = new Error("write after end");
          e.emit("error", i);
          r.nextTick(function() {
            n(i);
          });
        }
        function c(e, t, n, a) {
          var o = true;
          if (!i.isBuffer(n) && !i.isString(n) && !i.isNullOrUndefined(n) && !t.objectMode) {
            var s = new TypeError("Invalid non-string/buffer chunk");
            e.emit("error", s);
            r.nextTick(function() {
              a(s);
            });
            o = false;
          }
          return o;
        }
        f.prototype.write = function(e, t, r) {
          var n = this._writableState;
          var a = false;
          if (i.isFunction(t)) {
            r = t;
            t = null;
          }
          if (i.isBuffer(e))
            t = "buffer";
          else if (!t)
            t = n.defaultEncoding;
          if (!i.isFunction(r))
            r = function() {};
          if (n.ended)
            u(this, n, r);
          else if (c(this, n, e, r)) {
            n.pendingcb++;
            a = h(this, n, e, t, r);
          }
          return a;
        };
        f.prototype.cork = function() {
          var e = this._writableState;
          e.corked++;
        };
        f.prototype.uncork = function() {
          var e = this._writableState;
          if (e.corked) {
            e.corked--;
            if (!e.writing && !e.corked && !e.finished && !e.bufferProcessing && e.buffer.length)
              y(this, e);
          }
        };
        function l(e, t, r) {
          if (!e.objectMode && e.decodeStrings !== false && i.isString(t)) {
            t = new n(t, r);
          }
          return t;
        }
        function h(e, t, r, n, a) {
          r = l(t, r, n);
          if (i.isBuffer(r))
            n = "buffer";
          var s = t.objectMode ? 1 : r.length;
          t.length += s;
          var f = t.length < t.highWaterMark;
          if (!f)
            t.needDrain = true;
          if (t.writing || t.corked)
            t.buffer.push(new o(r, n, a));
          else
            d(e, t, false, s, r, n, a);
          return f;
        }
        function d(e, t, r, n, i, a, o) {
          t.writelen = n;
          t.writecb = o;
          t.writing = true;
          t.sync = true;
          if (r)
            e._writev(i, t.onwrite);
          else
            e._write(i, a, t.onwrite);
          t.sync = false;
        }
        function p(e, t, n, i, a) {
          if (n)
            r.nextTick(function() {
              t.pendingcb--;
              a(i);
            });
          else {
            t.pendingcb--;
            a(i);
          }
          e._writableState.errorEmitted = true;
          e.emit("error", i);
        }
        function g(e) {
          e.writing = false;
          e.writecb = null;
          e.length -= e.writelen;
          e.writelen = 0;
        }
        function v(e, t) {
          var n = e._writableState;
          var i = n.sync;
          var a = n.writecb;
          g(n);
          if (t)
            p(e, n, i, t, a);
          else {
            var o = w(e, n);
            if (!o && !n.corked && !n.bufferProcessing && n.buffer.length) {
              y(e, n);
            }
            if (i) {
              r.nextTick(function() {
                b(e, n, o, a);
              });
            } else {
              b(e, n, o, a);
            }
          }
        }
        function b(e, t, r, n) {
          if (!r)
            m(e, t);
          t.pendingcb--;
          n();
          E(e, t);
        }
        function m(e, t) {
          if (t.length === 0 && t.needDrain) {
            t.needDrain = false;
            e.emit("drain");
          }
        }
        function y(e, t) {
          t.bufferProcessing = true;
          if (e._writev && t.buffer.length > 1) {
            var r = [];
            for (var n = 0; n < t.buffer.length; n++)
              r.push(t.buffer[n].callback);
            t.pendingcb++;
            d(e, t, true, t.length, t.buffer, "", function(e) {
              for (var n = 0; n < r.length; n++) {
                t.pendingcb--;
                r[n](e);
              }
            });
            t.buffer = [];
          } else {
            for (var n = 0; n < t.buffer.length; n++) {
              var i = t.buffer[n];
              var a = i.chunk;
              var o = i.encoding;
              var s = i.callback;
              var f = t.objectMode ? 1 : a.length;
              d(e, t, false, f, a, o, s);
              if (t.writing) {
                n++;
                break;
              }
            }
            if (n < t.buffer.length)
              t.buffer = t.buffer.slice(n);
            else
              t.buffer.length = 0;
          }
          t.bufferProcessing = false;
        }
        f.prototype._write = function(e, t, r) {
          r(new Error("not implemented"));
        };
        f.prototype._writev = null;
        f.prototype.end = function(e, t, r) {
          var n = this._writableState;
          if (i.isFunction(e)) {
            r = e;
            e = null;
            t = null;
          } else if (i.isFunction(t)) {
            r = t;
            t = null;
          }
          if (!i.isNullOrUndefined(e))
            this.write(e, t);
          if (n.corked) {
            n.corked = 1;
            this.uncork();
          }
          if (!n.ending && !n.finished)
            A(this, n, r);
        };
        function w(e, t) {
          return t.ending && t.length === 0 && !t.finished && !t.writing;
        }
        function _(e, t) {
          if (!t.prefinished) {
            t.prefinished = true;
            e.emit("prefinish");
          }
        }
        function E(e, t) {
          var r = w(e, t);
          if (r) {
            if (t.pendingcb === 0) {
              _(e, t);
              t.finished = true;
              e.emit("finish");
            } else
              _(e, t);
          }
          return r;
        }
        function A(e, t, n) {
          t.ending = true;
          E(e, t);
          if (n) {
            if (t.finished)
              r.nextTick(n);
            else
              e.once("finish", n);
          }
          t.ended = true;
        }
      }).call(this, e("_process"));
    }, {
      "./_stream_duplex": 22,
      _process: 20,
      buffer: 13,
      "core-util-is": 27,
      inherits: 18,
      stream: 32
    }],
    27: [function(e, t, r) {
      (function(e) {
        function t(e) {
          return Array.isArray(e);
        }
        r.isArray = t;
        function n(e) {
          return typeof e === "boolean";
        }
        r.isBoolean = n;
        function i(e) {
          return e === null;
        }
        r.isNull = i;
        function a(e) {
          return e == null;
        }
        r.isNullOrUndefined = a;
        function o(e) {
          return typeof e === "number";
        }
        r.isNumber = o;
        function s(e) {
          return typeof e === "string";
        }
        r.isString = s;
        function f(e) {
          return typeof e === "symbol";
        }
        r.isSymbol = f;
        function u(e) {
          return e === void 0;
        }
        r.isUndefined = u;
        function c(e) {
          return l(e) && b(e) === "[object RegExp]";
        }
        r.isRegExp = c;
        function l(e) {
          return typeof e === "object" && e !== null;
        }
        r.isObject = l;
        function h(e) {
          return l(e) && b(e) === "[object Date]";
        }
        r.isDate = h;
        function d(e) {
          return l(e) && (b(e) === "[object Error]" || e instanceof Error);
        }
        r.isError = d;
        function p(e) {
          return typeof e === "function";
        }
        r.isFunction = p;
        function g(e) {
          return e === null || typeof e === "boolean" || typeof e === "number" || typeof e === "string" || typeof e === "symbol" || typeof e === "undefined";
        }
        r.isPrimitive = g;
        function v(t) {
          return e.isBuffer(t);
        }
        r.isBuffer = v;
        function b(e) {
          return Object.prototype.toString.call(e);
        }
      }).call(this, e("buffer").Buffer);
    }, {buffer: 13}],
    28: [function(e, t, r) {
      t.exports = e("./lib/_stream_passthrough.js");
    }, {"./lib/_stream_passthrough.js": 23}],
    29: [function(e, t, r) {
      r = t.exports = e("./lib/_stream_readable.js");
      r.Stream = e("stream");
      r.Readable = r;
      r.Writable = e("./lib/_stream_writable.js");
      r.Duplex = e("./lib/_stream_duplex.js");
      r.Transform = e("./lib/_stream_transform.js");
      r.PassThrough = e("./lib/_stream_passthrough.js");
    }, {
      "./lib/_stream_duplex.js": 22,
      "./lib/_stream_passthrough.js": 23,
      "./lib/_stream_readable.js": 24,
      "./lib/_stream_transform.js": 25,
      "./lib/_stream_writable.js": 26,
      stream: 32
    }],
    30: [function(e, t, r) {
      t.exports = e("./lib/_stream_transform.js");
    }, {"./lib/_stream_transform.js": 25}],
    31: [function(e, t, r) {
      t.exports = e("./lib/_stream_writable.js");
    }, {"./lib/_stream_writable.js": 26}],
    32: [function(e, t, r) {
      t.exports = a;
      var n = e("events").EventEmitter;
      var i = e("inherits");
      i(a, n);
      a.Readable = e("readable-stream/readable.js");
      a.Writable = e("readable-stream/writable.js");
      a.Duplex = e("readable-stream/duplex.js");
      a.Transform = e("readable-stream/transform.js");
      a.PassThrough = e("readable-stream/passthrough.js");
      a.Stream = a;
      function a() {
        n.call(this);
      }
      a.prototype.pipe = function(e, t) {
        var r = this;
        function i(t) {
          if (e.writable) {
            if (false === e.write(t) && r.pause) {
              r.pause();
            }
          }
        }
        r.on("data", i);
        function a() {
          if (r.readable && r.resume) {
            r.resume();
          }
        }
        e.on("drain", a);
        if (!e._isStdio && (!t || t.end !== false)) {
          r.on("end", s);
          r.on("close", f);
        }
        var o = false;
        function s() {
          if (o)
            return;
          o = true;
          e.end();
        }
        function f() {
          if (o)
            return;
          o = true;
          if (typeof e.destroy === "function")
            e.destroy();
        }
        function u(e) {
          c();
          if (n.listenerCount(this, "error") === 0) {
            throw e;
          }
        }
        r.on("error", u);
        e.on("error", u);
        function c() {
          r.removeListener("data", i);
          e.removeListener("drain", a);
          r.removeListener("end", s);
          r.removeListener("close", f);
          r.removeListener("error", u);
          e.removeListener("error", u);
          r.removeListener("end", c);
          r.removeListener("close", c);
          e.removeListener("close", c);
        }
        r.on("end", c);
        r.on("close", c);
        e.on("close", c);
        e.emit("pipe", r);
        return e;
      };
    }, {
      events: 17,
      inherits: 18,
      "readable-stream/duplex.js": 21,
      "readable-stream/passthrough.js": 28,
      "readable-stream/readable.js": 29,
      "readable-stream/transform.js": 30,
      "readable-stream/writable.js": 31
    }],
    33: [function(e, t, r) {
      var n = e("buffer").Buffer;
      var i = n.isEncoding || function(e) {
        switch (e && e.toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
          case "raw":
            return true;
          default:
            return false;
        }
      };
      function a(e) {
        if (e && !i(e)) {
          throw new Error("Unknown encoding: " + e);
        }
      }
      var o = r.StringDecoder = function(e) {
        this.encoding = (e || "utf8").toLowerCase().replace(/[-_]/, "");
        a(e);
        switch (this.encoding) {
          case "utf8":
            this.surrogateSize = 3;
            break;
          case "ucs2":
          case "utf16le":
            this.surrogateSize = 2;
            this.detectIncompleteChar = f;
            break;
          case "base64":
            this.surrogateSize = 3;
            this.detectIncompleteChar = u;
            break;
          default:
            this.write = s;
            return;
        }
        this.charBuffer = new n(6);
        this.charReceived = 0;
        this.charLength = 0;
      };
      o.prototype.write = function(e) {
        var t = "";
        while (this.charLength) {
          var r = e.length >= this.charLength - this.charReceived ? this.charLength - this.charReceived : e.length;
          e.copy(this.charBuffer, this.charReceived, 0, r);
          this.charReceived += r;
          if (this.charReceived < this.charLength) {
            return "";
          }
          e = e.slice(r, e.length);
          t = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
          var n = t.charCodeAt(t.length - 1);
          if (n >= 55296 && n <= 56319) {
            this.charLength += this.surrogateSize;
            t = "";
            continue;
          }
          this.charReceived = this.charLength = 0;
          if (e.length === 0) {
            return t;
          }
          break;
        }
        this.detectIncompleteChar(e);
        var i = e.length;
        if (this.charLength) {
          e.copy(this.charBuffer, 0, e.length - this.charReceived, i);
          i -= this.charReceived;
        }
        t += e.toString(this.encoding, 0, i);
        var i = t.length - 1;
        var n = t.charCodeAt(i);
        if (n >= 55296 && n <= 56319) {
          var a = this.surrogateSize;
          this.charLength += a;
          this.charReceived += a;
          this.charBuffer.copy(this.charBuffer, a, 0, a);
          e.copy(this.charBuffer, 0, 0, a);
          return t.substring(0, i);
        }
        return t;
      };
      o.prototype.detectIncompleteChar = function(e) {
        var t = e.length >= 3 ? 3 : e.length;
        for (; t > 0; t--) {
          var r = e[e.length - t];
          if (t == 1 && r >> 5 == 6) {
            this.charLength = 2;
            break;
          }
          if (t <= 2 && r >> 4 == 14) {
            this.charLength = 3;
            break;
          }
          if (t <= 3 && r >> 3 == 30) {
            this.charLength = 4;
            break;
          }
        }
        this.charReceived = t;
      };
      o.prototype.end = function(e) {
        var t = "";
        if (e && e.length)
          t = this.write(e);
        if (this.charReceived) {
          var r = this.charReceived;
          var n = this.charBuffer;
          var i = this.encoding;
          t += n.slice(0, r).toString(i);
        }
        return t;
      };
      function s(e) {
        return e.toString(this.encoding);
      }
      function f(e) {
        this.charReceived = e.length % 2;
        this.charLength = this.charReceived ? 2 : 0;
      }
      function u(e) {
        this.charReceived = e.length % 3;
        this.charLength = this.charReceived ? 3 : 0;
      }
    }, {buffer: 13}]
  }, {}, [])("/");
});

_removeDefine();
})();
$__System.register("13", ["12"], function($__export) {
  "use strict";
  var SimplePeer;
  return {
    setters: [function($__m) {
      SimplePeer = $__m.default;
    }],
    execute: function() {
      $__export('default', function(stream, white) {
        var socket = io(window.socketUrl);
        socket.on('connect', function() {
          socket.emit('hello', {white: white});
          console.log('connected to server!');
          $('#whiteness').hide();
        });
        socket.on('call', function(config, initiator) {
          console.log('call recieved');
          var options = {
            initiator: initiator,
            stream: stream
          };
          if ((typeof config === 'undefined' ? 'undefined' : $traceurRuntime.typeof(config)) === 'object') {
            options['config'] = config;
          }
          var peer = new SimplePeer(options);
          peer.on('signal', function(data) {
            socket.emit('signal', JSON.stringify(data));
          });
          peer.on('stream', function(stream) {
            var video = document.querySelector('#peerVideo');
            video.src = window.URL.createObjectURL(stream);
            video.play();
          });
          socket.on('signal', function(data) {
            peer.signal(data);
          });
        });
      });
    }
  };
});

$__System.register("14", ["11", "13"], function($__export) {
  "use strict";
  var headtrackr,
      call;
  return {
    setters: [function($__m) {
      headtrackr = $__m.default;
    }, function($__m) {
      call = $__m.default;
    }],
    execute: function() {
      $__export('default', function() {
        var videoInput = document.getElementById('inputVideo');
        var canvasInput = document.getElementById('inputCanvas');
        var ctx = canvasInput.getContext('2d');
        var canvasOutput = document.getElementById('outputCanvas');
        var crop = canvasOutput.getContext('2d');
        var htracker = new headtrackr.Tracker({ui: false});
        console.log('ready');
        htracker.init(videoInput, canvasInput);
        htracker.start();
        var whitenessFromColour = function(colour) {
          var c,
              m,
              y,
              k;
          var r,
              g,
              b;
          r = colour.r / 255.0;
          g = colour.g / 255.0;
          b = colour.b / 255.0;
          k = Math.min(1 - r, 1 - g, 1 - b);
          c = (1 - r - k) / (1 - k);
          m = (1 - g - k) / (1 - k);
          y = (1 - b - k) / (1 - k);
          c = Math.round(c * 100.0);
          m = Math.round(m * 100.0);
          y = Math.round(y * 100.0);
          k = Math.round(k * 100.0);
          console.log('cmyk:' + [c, m, y, k].join(', '));
          var dark = y + m > 90 || c > 10;
          var yellow = Math.abs(y - m) > 20;
          return (!dark) && (!yellow);
        };
        var medianColourFromFace = function(event) {
          var Htrim = event.width * 0.4;
          var Vtrim = event.height * 0.5;
          var cropX = event.x - event.width * 0.5 + Htrim * 0.5;
          var cropW = event.width - Htrim;
          var cropY = event.y - event.height * 0.5 + Vtrim * 0.3;
          var cropH = event.height - Vtrim;
          crop.drawImage(canvasInput, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          crop.width = cropW;
          crop.height = cropH;
          var imageData = crop.getImageData(0, 0, cropW, cropH);
          var data = imageData.data;
          var ra = [];
          var ga = [];
          var ba = [];
          for (var i = 0,
              l = data.length; i < l; i += 4) {
            ra.push(data[i]);
            ga.push(data[i + 1]);
            ba.push(data[i + 2]);
          }
          function median(values) {
            values.sort(function(a, b) {
              return a - b;
            });
            var half = Math.floor(values.length / 2);
            if (values.length % 2) {
              return values[half];
            } else {
              return (values[half - 1] + values[half]) / 2.0;
            }
          }
          var r = median(ra);
          var g = median(ga);
          var b = median(ba);
          var maxc = Math.max(r, g, b);
          var boost = 255 - maxc;
          console.log('boost:' + boost);
          console.log('rgb:' + [r, g, b].join(', '));
          r = Math.floor(r + boost * r / maxc);
          g = Math.floor(g + boost * g / maxc);
          b = Math.floor(b + boost * b / maxc);
          ctx.fillStyle = 'rgb(' + [r, g, b].join(',') + ')';
          ctx.fillRect(0, 0, 80, 80);
          console.log('rgb:' + [r, g, b].join(', '));
          return {
            r: r,
            g: g,
            b: b
          };
        };
        var samples = 1;
        var tries = 10;
        var matches = 0;
        var running = true;
        document.addEventListener('facetrackingEvent', function(event) {
          if (running && event.width > 70 && event.height > 70) {
            var white = document.getElementById('white');
            var colour = medianColourFromFace(event);
            var isWhite = whitenessFromColour(colour);
            if (isWhite) {
              matches = matches + 1;
            }
            samples = samples + 1;
            console.log(matches);
            if (samples > tries) {
              if (matches > samples * 0.8) {
                white.innerHTML = 'Congratulations! You are white!';
              } else {
                white.innerHTML = 'Sorry, you are not white!';
              }
              running = false;
              call(htracker.getStream(), samples > tries);
            }
          }
        });
      });
    }
  };
});

$__System.register("15", ["3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "10", "14"], function($__export) {
  "use strict";
  var xHeader,
      xFooter,
      siteMap,
      siteMenu,
      addToSiteMap,
      pageAbout,
      pagePricing,
      pageCall,
      pageSuccess,
      pageStory,
      pagePartners,
      pageFAQs,
      pageHome,
      pageContact,
      pageTerms,
      pageStatement,
      pageRelease,
      siteOptions,
      start,
      router;
  return {
    setters: [function($__m) {
      xHeader = $__m.default;
    }, function($__m) {
      xFooter = $__m.default;
    }, function($__m) {
      pageAbout = $__m.default;
    }, function($__m) {
      pagePricing = $__m.default;
    }, function($__m) {
      pageCall = $__m.default;
    }, function($__m) {
      pageSuccess = $__m.default;
    }, function($__m) {
      pageStory = $__m.default;
    }, function($__m) {
      pagePartners = $__m.default;
    }, function($__m) {
      pageFAQs = $__m.default;
    }, function($__m) {
      pageHome = $__m.default;
    }, function($__m) {
      pageContact = $__m.default;
    }, function($__m) {
      pageTerms = $__m.default;
    }, function($__m) {
      pageStatement = $__m.default;
    }, function($__m) {
      pageRelease = $__m.default;
    }, function($__m) {
      start = $__m.default;
    }],
    execute: function() {
      riot.tag('x-header', xHeader);
      riot.tag('x-main', "<div id=\"main\"></div>", function(opts) {
        this.on('update', function() {
          $('#main').html(opts.pageBody);
        });
      });
      riot.tag('x-footer', xFooter);
      siteMap = {};
      siteMenu = [];
      addToSiteMap = function(name, slug, page, menu) {
        siteMap[slug] = {
          page: page,
          name: name
        };
        if (menu)
          siteMenu.push({
            slug: slug,
            name: name
          });
      };
      addToSiteMap('how it works', 'how', pageAbout, true);
      addToSiteMap('our pricing model', 'pricing', pagePricing, true);
      addToSiteMap('try it now', 'call', pageCall, true);
      addToSiteMap('success stories', 'success', pageSuccess, true);
      addToSiteMap('our story', 'story', pageStory, true);
      addToSiteMap('partners', 'partners', pagePartners, true);
      addToSiteMap('FAQs', 'faq', pageFAQs, true);
      addToSiteMap('home', 'home', pageHome, false);
      addToSiteMap('contact', 'contact', pageContact, false);
      addToSiteMap('terms', 'terms', pageTerms, false);
      addToSiteMap('statement', 'statement', pageStatement, false);
      addToSiteMap('release', 'release', pageRelease, false);
      siteOptions = {
        siteMenu: siteMenu,
        pageTitle: 'home',
        pageBody: pageHome
      };
      router = function(slug, id, action) {
        if (slug === 'call') {
          siteOptions['pageTitle'] = 'call';
          siteOptions['pageBody'] = pageCall;
          riot.update();
          start();
        } else if (siteMap[slug]) {
          siteOptions['pageSlug'] = slug;
          siteOptions['pageTitle'] = siteMap[slug]['name'];
          siteOptions['pageBody'] = siteMap[slug]['page'];
          riot.update();
        }
        if (slug) {
          $('.active').removeClass('active amber-text');
          $('a[href*="#' + slug + '"]').addClass('active amber-text');
        }
        window.scrollTo(0, 0);
      };
      $__export('default', function() {
        riot.mount('*', siteOptions);
        riot.route(router);
        riot.route.exec(router);
        riot.update();
      });
    }
  };
});

$__System.registerDynamic("16", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = "<x-header></x-header>\n<x-main></x-main>\n<div class=\"container row\">\n  <div class=\"share-button right\"></div>\n</div>\n<br><br>\n<script async=\"async\" src=\"lib/vendor/share.min.js\"></script>\n<script>\nvar share = new Share(\".share-button\", {\n  title: \"WhiteSave.me\",\n  description: \"WhiteSave.me - delivering privilege with the tap of a finger.\",\n  image: \"phttp://whitesave.me/img/wsm.jpg\"\n});\n</script>\n<x-footer></x-footer>\n";
  global.define = __define;
  return module.exports;
});

$__System.register("1", ["2", "15", "16"], function($__export) {
  "use strict";
  var layout,
      xPages;
  return {
    setters: [function($__m) {}, function($__m) {
      layout = $__m.default;
    }, function($__m) {
      xPages = $__m.default;
    }],
    execute: function() {
      $(document).ready(function() {
        $(function() {
          $('.button-collapse').sideNav();
          $('.slider').slider({full_width: true});
        });
        $('body').html(xPages);
        layout();
      });
    }
  };
});

System.register('whitesaveme.css!github:systemjs/plugin-css@0.1.13.js', [], false, function() {});
(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})
("html{overflow-y:scroll;overflow-x:hidden}x-header{position:fixed;top:0;width:100%;z-index:999}#main{padding-top:55px}.icon-block{padding:0 15px}.slider .indicators .indicator-item.active{background-color:#000}nav{height:65px;line-height:65px}a{color:#f57c00}.title{font-size:2rem;font-weight:300;font-stretch:condensed;text-transform:capitalize;text-align:center}");
})
(function(factory) {
  factory();
});
//# sourceMappingURL=build.js.map
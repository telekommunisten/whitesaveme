(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare, execute) {
    if (typeof name != 'string')
      throw "System.register provided no module name";

    var entry;

    // dynamic
    if (typeof declare == 'boolean') {
      entry = {
        declarative: false,
        deps: deps,
        execute: execute,
        executingRequire: declare
      };
    }
    else {
      // ES6 declarative
      entry = {
        declarative: true,
        deps: deps,
        declare: declare
      };
    }

    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }

  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    if (!module.setters || !module.execute)
      throw new TypeError("Invalid System.register form for " + entry.name);

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        if (depEntry.module.exports && depEntry.module.exports.__esModule)
          depExports = depEntry.module.exports;
        else
          depExports = { 'default': depEntry.module.exports, __useDefault: true };
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    var module = entry.module.exports;

    if (!module || !entry.declarative && module.__esModule !== true)
      module = { 'default': module, __useDefault: true };

    // return the defined module object
    return modules[name] = module;
  };

  return function(mains, declare) {

    var System;
    var System = {
      register: register, 
      get: load, 
      set: function(name, module) {
        modules[name] = module; 
      },
      newModule: function(module) {
        return module;
      },
      global: global 
    };
    System.set('@empty', {});

    declare(System);

    for (var i = 0; i < mains.length; i++)
      load(mains[i]);
  }

})(typeof window != 'undefined' ? window : global)
/* (['mainModule'], function(System) {
  System.register(...);
}); */

(['lib/init'], function(System) {


System.register("components/header.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<nav class=\"light-blue lighten-1\" role=\"navigation\">\n  <div class=\"nav-wrapper container\">\n    <a id=\"logo-container\" href=\"#\" class=\"brand-logo\">\n      <span class=\"hide-on-small-and-down\">whitesave.me&nbsp;|&nbsp;</span>\n      { opts.pageTitle }</a>\n    <ul class=\"right hide-on-med-and-down\">\n      <li each=\"{ name, page in opts.siteMap }\"><a href=\"#{ name }\">{ name }</a></li>\n    </ul>\n\n    <ul id=\"nav-mobile\" class=\"side-nav\">\n      <li each=\"{ name, page in opts.siteMap }\"><a href=\"#{ name }\">{ name }</a></li>\n    </ul>\n    <a href=\"#\" data-activates=\"nav-mobile\" class=\"button-collapse\"><i class=\"mdi-navigation-menu\"></i></a>\n  </div>\n</nav>\n";
  global.define = __define;
  return module.exports;
});

System.register("components/footer.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<footer class=\"page-footer orange\">\n  <div class=\"container\">\n    <div class=\"row\">\n      <div class=\"col l6 s12\">\n        <h5 class=\"white-text\">Company Bio</h5>\n        <p class=\"grey-text text-lighten-4\">We are a team of college students working on this project like it's our full time job. Any amount would help support and continue development on this project and is greatly appreciated.</p>\n\n\n      </div>\n      <div class=\"col l3 s12\">\n        <h5 class=\"white-text\">Settings</h5>\n        <ul>\n          <li><a class=\"white-text\" href=\"#!\">Link 1</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Link 2</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Link 3</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Link 4</a></li>\n        </ul>\n      </div>\n      <div class=\"col l3 s12\">\n        <h5 class=\"white-text\">Connect</h5>\n        <ul>\n          <li><a class=\"white-text\" href=\"#!\">Link 1</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Link 2</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Link 3</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Link 4</a></li>\n        </ul>\n      </div>\n    </div>\n  </div>\n  <div class=\"footer-copyright\">\n    <div class=\"container\">\n      Made by <a class=\"orange-text text-lighten-3\" href=\"http://materializecss.com\">Materialize</a>\n    </div>\n  </div>\n</footer>\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/home.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"center-align\">\n    <img class=\"responsive-img\" src=\"img/hardtimes.jpg\">\n  </div>\n  <br><br>\n  <h1 class=\"header center orange-text\"><strong>White</strong>Save Me</h1>\n  <div class=\"row center\">\n    <h5 class=\"header col s12 light\">The app that delivers privilege.</h5>\n  </div>\n  <div class=\"container\">\n  \n    <div class=\"row center\">\n      <a href=\"#\" id=\"download-button\" class=\"btn-large waves-effect waves-light orange\">Launch Beta App!</a>\n    </div>\n    <br><br>\n\n  </div>\n</div>\n\n\n<div class=\"container\">\n  <div class=\"section\">\n\n    <!--   Icon Section   -->\n    <div class=\"row\">\n      <div class=\"col s12 m4\">\n        <div class=\"icon-block\">\n          <h2 class=\"center light-blue-text\"><i class=\"mdi-social-people\"></i></h2>\n          <h5 class=\"center\">How it works</h5>\n\n          <p class=\"light\">Our innovative solution uses tech to expand and deliver privilege where it’s needed most&mdash;and everyone wins! We match the privileged and the under-privileged in a sustainable and profitable way that fully achieves the coveted and elusive triple bottom line (people, profit, planet). </p>\n        </div>\n      </div>\n\n      <div class=\"col s12 m4\">\n        <div class=\"icon-block\">\n          <h2 class=\"center light-blue-text\"><i class=\"mdi-action-get-app\"></i></h2>\n          <h5 class=\"center\">Get the App</h5>\n\n          <p class=\"light\">Start to feel good from the moment you download our app. Put your unused privilege to good use and help those in need get the help they need with just a tap. </p>\n        </div>\n      </div>\n\n      <div class=\"col s12 m4\">\n        <div class=\"icon-block\">\n          <h2 class=\"center light-blue-text\"><i class=\"mdi-social-mood\"></i></h2>\n          <h5 class=\"center\">Our Story</h5>\n\n          <p class=\"light\">We have provided detailed documentation as well as specific code examples to help new users get started. We are also always open to feedback and can answer any questions a user may have about Materialize.</p>\n        </div>\n      </div>\n    </div>\n\n  </div>\n  <br><br>\n\n  <div class=\"section\">\n\n  </div>\n</div>\n\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/story.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"container\">\n    <br><br>\n    <h1 class=\"header center orange-text\">Page</h1>\n    <p>Place Holder</p>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/contact.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"container\">\n    <br><br>\n    <h1 class=\"header center orange-text\">Page</h1>\n    <p>Place Holder</p>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/about.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"container\">\n    <br><br>\n    <h1 class=\"header center orange-text\">Page</h1>\n    <p>Place Holder</p>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

System.register("lib/layout", ["components/header.html!github:systemjs/plugin-text@0.0.2", "components/footer.html!github:systemjs/plugin-text@0.0.2", "pages/home.html!github:systemjs/plugin-text@0.0.2", "pages/story.html!github:systemjs/plugin-text@0.0.2", "pages/contact.html!github:systemjs/plugin-text@0.0.2", "pages/about.html!github:systemjs/plugin-text@0.0.2"], function($__export) {
  "use strict";
  var __moduleName = "lib/layout";
  var xHeader,
      xFooter,
      siteMap,
      addToSiteMap,
      pageHome,
      pageStory,
      pageContact,
      pageAbout,
      siteOptions;
  return {
    setters: [function($__m) {
      xHeader = $__m.default;
    }, function($__m) {
      xFooter = $__m.default;
    }, function($__m) {
      pageHome = $__m.default;
    }, function($__m) {
      pageStory = $__m.default;
    }, function($__m) {
      pageContact = $__m.default;
    }, function($__m) {
      pageAbout = $__m.default;
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
      addToSiteMap = function(name, page) {
        siteMap[name] = page;
      };
      addToSiteMap('home', pageHome);
      addToSiteMap('story', pageStory);
      addToSiteMap('contact', pageContact);
      addToSiteMap('about', pageAbout);
      siteOptions = {
        siteMap: siteMap,
        pageTitle: 'home',
        pageBody: pageHome
      };
      riot.route(function(collection, id, action) {
        console.log('clicked ' + collection);
        if (siteMap[collection]) {
          siteOptions['pageTitle'] = collection;
          siteOptions['pageBody'] = siteMap[collection];
          riot.update();
        }
      });
      $__export('default', function() {
        riot.mount('*', siteOptions);
        riot.route('home');
        riot.update();
      });
    }
  };
});

System.register("lib/init", ["whitesaveme.css!github:systemjs/plugin-css@0.1.13", "lib/layout"], function($__export) {
  "use strict";
  var __moduleName = "lib/init";
  var layout;
  return {
    setters: [function($__m) {}, function($__m) {
      layout = $__m.default;
    }],
    execute: function() {
      $(document).ready(function() {
        $(function() {
          $('.button-collapse').sideNav();
        });
        layout();
      });
    }
  };
});

System.register('whitesaveme.css!github:systemjs/plugin-css@0.1.13', [], false, function() {});
(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})
("html{overflow-y:scroll;overflow-x:hidden}x-header{position:fixed;top:0;width:100%;z-index:999}#main{padding-top:64px}.icon-block{padding:0 15px}");
});
//# sourceMappingURL=build.js.map
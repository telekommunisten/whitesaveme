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
  module.exports = "<nav class=\"#3e2723 brown darken-4\" role=\"navigation\">\n  <div class=\"nav-wrapper container\">\n    <a id=\"logo-container\" href=\"/#home\" class=\"brand-logo\">\n      <span><img class=\"responsive-img\" src=\"img/WhiteSaveMe_Logo_VF.png\"></span>\n      </a>\n    <ul class=\"right hide-on-med-and-down\">\n      <li each=\"{ name, page in opts.siteMap }\"><a href=\"#{ name }\">{ name }</a></li>\n    </ul>\n\n    <ul id=\"nav-mobile\" class=\"side-nav\">\n      <li each=\"{ name, page in opts.siteMap }\"><a href=\"#{ name }\">{ name }</a></li>\n    </ul>\n    <a href=\"#\" data-activates=\"nav-mobile\" class=\"button-collapse\"><i class=\"mdi-navigation-menu\"></i></a>\n  </div>\n</nav>\n";
  global.define = __define;
  return module.exports;
});

System.register("components/footer.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<footer class=\"page-footer #795548 brown\">\n  <div class=\"container\">\n    <div class=\"row\">\n      <div class=\"col l6 s12\">\n        <h5 class=\"white-text\">Our solution</h5>\n        <p class=\"grey-text text-lighten-4\">We match the privileged and the under-privileged in a sustainable and profitable way that fully achieves the coveted and elusive triple bottom line people, profit, planet.</p>\n\n\n      </div>\n      <div class=\"col l3 s6\">\n        <h5 class=\"white-text\">Learn more</h5>\n        <ul>\n          <li><a class=\"white-text\" href=\"#about\">About</a></li>\n          <li><a class=\"white-text\" href=\"#story\">Our Story</a></li>\n          <li><a class=\"white-text\" href=\"#faq\">FAQ's</a></li>\n          <li><a class=\"white-text\" href=\"#terms\">Terms</a></li>\n        </ul>\n      </div>\n      <div class=\"col l3 s6\">\n        <h5 class=\"white-text\">Connect</h5>\n        <ul>\n          <li><a class=\"white-text\" href=\"#!\">Facebook</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Twitter</a></li>\n          <li><a class=\"white-text\" href=\"#!\">Contact us</a></li>\n          <li><a class=\"white-text\" href=\"#!\"></a></li>\n        </ul>\n      </div>\n    </div>\n  </div>\n  <div class=\"footer-copyright\">\n    <div class=\"container\">\n      Made with <a class=\"#3e2723\" href=\"http://materializecss.com\">Materialize</a>\n    </div>\n  </div>\n</footer>\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/home.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n\n  <div class=\"container\">\n  \n  <h2 class=\"header center\">The app that delivers privilege.</strong></h2>\n  <div class=\"row center\">\n    <h5 class=\"header col s12 light\"><strong>White</strong>Save.me enables white men to help non-whites to succeed in life without disrupting existing systems and long-standing traditions.</h5>\n  </div>\n\n  \n   <table class=\"centered\">\n  \t\t<tr>\n        <td><a href=\"#about\" id=\"download-button\" class=\"btn-large waves-effect waves-#000000 black\">Learn More</a></td>\n        <td><a href=\"#start\" id=\"download-button\" class=\"btn-large waves-effect waves-#000000 black\">Launch Beta</a></td>\n        \n        </tr>\n        \n        <tr>\n        <td></td>\n        <td>*web cam required</td>\n        \n        </tr>\n\n        \n   \t\t\n   </table>\n   \n\n  <br><br>\n   \n \n\n<div class=\"divider\"></div>\n\n    <!--   Icon Section   -->\n    \n      <div class=\"section\"> \n\t  <div class=\"row\">\n      \t<div class=\"col s12 m4\">\n        \t<div class=\"card\">\n            \t<div class=\"card-image\">\n                <img src=\"/img/white-save-1.jpg\">\n                </div>\n                <div class=\"card-content\">\n\t\t\t\t<p><strong>Lack of privilege getting you down?</strong><br>\n                 The privilege you need is just a tap away.</p>\n             \t</div>\n          \t</div>\n         </div>\n         \n         \n         \t<div class=\"col s12 m4\">\n        \t<div class=\"card\">\n            \t<div class=\"card-image\">\n                <img src=\"/img/white-save-2.jpg\">\n                </div>\n                <div class=\"card-content\">\n\t\t\t\t<p><strong>Connect with a white guy.</strong><br>\n                Get privileged, life-saving advice.</p>\n             \t</div>\n          \t</div>\n         </div>\n         \n         \t<div class=\"col s12 m4\">\n        \t<div class=\"card\">\n            \t<div class=\"card-image\">\n                <img src=\"/img/white-save-3.jpg\">\n                </div>\n                <div class=\"card-content\">\n\t\t\t\t<p><strong>Problem solved!</strong><br>\n                Privilege delivered, and you can move on.\n                \n                </p>\n             \t</div>\n          \t</div>\n         </div>\n\t </div>\n  \n\n \n  \n  </div>\n    \n    \n \n  <br><br>\n\n</div>\n\n\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/story.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro brown white-text row\">\n\t<div class=\"col m12 s12\">\n    \t<div class=\"container\">\n        \t<div class=\"row\">\n            \t<div class=\"col m10 s12\">\n                <span class=\"orange-text text-lighten-5\">\n                <p></p><h2 class=\"m12\">Saving one person at a time, at scale and for a profit!</h2>\n                <h5></h5></span>\n                </div>\n             \t\t<div class=\"col header-icon-image m4\">\n                \t</div>\n             </div>\n         </div>\n     </div>\n</div>\n\n<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"col m12 s12\">\n  \t<div class=\"container\">\n    \t<div class=\"row\">\n        \t<div class=\"col m12 s12 light\">\n            <div class=\"rich-text\"><h4>We connect saviors with savees.</h4>\n            \n            <p class=\"light\">The <strong>white</strong>save.me team met while backpacking on the Inca trail following the 2013 Latin American social innovation summit. They soon realized that regardless of the continent, lack of innovative thinking was a problem the world over, as was inequality. <p>\n            <p class=\"light\"> After a weekend of post-it notes and cold brew coffee, WhiteSave.me was born. The team’s ah-ha moment came with the realization that the key to resolving inequality has nothing to do with revolution. Rather, it’s about “yes… and” thinking and re-imagining privilege as an infinite resource. \n            <p class=\"light\">Everyone can share in privilege, and those with more privilege can be a part of delivering it to the less fortunate, using the world’s new-found mobile and digital connectivity as a strategic enabler. White people want to share their privilege -- they just haven’t had an app to help them do it! WhiteSave.me - delivering privilege right through your device.</p>\n\n         \n            \n                \n                \t</div>\n                </div>\n            </div>\n            \n\t<div class=\"section\">\n\n    <div class=\"row\">\n        \t<div class=\"col m12 s12\">\n            <div class=\"rich-text\"><h4>Founders</h4>\n            <p class=\"light\">Our fresh and extensive experience in marketing, innovative technology solutions and the social good sector make us uniquely placed to extract the value of generosity, good and privilege from one target demographic, deliver it to another, all the while tapping into available revenue from small pockets of cash that the underprivileged currently have but don’t invest wisely.</p></div>\n            </div>\n            </div>\n\n   \n    <div class=\"row\">\n      <div class=\"col s12 m4 l4\">\n        <div class=\"icon-block\">\n          <img class=\"circle responsive-img\" src=\"img/dmytri.jpg\">\n          <h5 class=\"center\">dmytri</h5>\n\n         </div>\n      </div>\n\n      <div class=\"col s12 m4 l4\">\n        <div class=\"icon-block\">\n          <img class=\"circle responsive-img\" src=\"img/linda.jpg\">\n          <h5 class=\"center\">linda</h5>\n\n        </div>\n      </div>\n\n      <div class=\"col s12 m4 l4\">\n        <div class=\"icon-block\">\n          <img class=\"circle responsive-img\" src=\"img/juan.jpg\">\n          <h5 class=\"center\">juan</h5>\n\n            </div>\n      </div>\n      \n      \n    </div>\n    \n      \n  \n      \n      \n      \n      \n\n\n  </div>\n            \n            \n            \n       </div>\n   </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/contact.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "    <div class=\"page-intro orange lighten-5 white-text row\">\n\t<div class=\"col m12 s12\">\n    \t<div class=\"container\">\n        \t<div class=\"row\">\n            \t<div class=\"col m10 s12\">\n                <span class=\"brown-text text-darken-4\">\n                <h2 class=\"m12\">Questions about privilege?</h2>\n                <h5>We're here to help.</h5></span>\n                </div>\n             \t\t<div class=\"col header-icon-image m4\">\n                \t</div>\n             </div>\n         </div>\n     </div>\n</div>\n  <div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"container\">\n  \t<div class=\"row\">\n    <form class=\"col s12\">\n      <div class=\"row\">\n        <div class=\"input-field col s6\">\n          <input placeholder=\"\" id=\"first_name\" type=\"text\" class=\"validate\">\n          <label for=\"first_name\">First Name</label>\n        </div>\n        <div class=\"input-field col s6\">\n          <input id=\"last_name\" type=\"text\" class=\"validate\">\n          <label for=\"last_name\">Last Name</label>\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <div class=\"input-field col s12\">\n          <input id=\"email\" type=\"email\" class=\"validate\">\n          <label for=\"email\">Email</label>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"input-field col s12\">\n          <textarea id=\"textarea1\" class=\"materialize-textarea\"></textarea>\n          <label for=\"textarea1\">Message</label>\n        </div>\n     </div>\n\n<!-- NEED TO ADD BUTTON FUNCTIONALITY -->\n  \t<!--<div class=\"row\">\n   \t\t<button class=\"btn waves-effect waves-#000000 black\" type=\"submit\" name=\"action\">Submit\n   \t\t</button>\n   \t\t</div>-->\n    \n    </form>\n  </div>\n</div>\n</div>";
  global.define = __define;
  return module.exports;
});

System.register("pages/about.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"page-intro orange lighten-5 white-text row\">\n\t<div class=\"col m12 s12\">\n    \t<div class=\"container\">\n        \t<div class=\"row\">\n            \t<div class=\"col m10 s12\">\n                <span class=\"brown-text text-darken-4\">\n                <h2 class=\"m12\">Check your privilege!</h2>\n          \n                </div>\n             \t\t<div class=\"col header-icon-image m4\">\n                \t</div>\n             </div>\n         </div>\n     </div>\n</div>\n\n<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"col m12 s12\">\n  \t<div class=\"container\">\n    \t<div class=\"row\">\n        \t<div class=\"col m12 s12 light\">\n            <p></p><div class=\"rich-text\"><h4>How it works.</h4>\n                <hr><h5>Our app taps into whites’ desire to help people of color learn to be more hard working and motivated. \t</h5>\n               \t<p class=\"light\">Our innovative solution uses tech to expand and deliver privilege where it’s needed most&mdash;and everyone wins! White men earn “Savior Stars” for providing free expert advice and mentoring from their unique perspective as long-standing privilege holders. </p>\n          \t\t<p class=\"light\">Non-whites access white privilege and use white advice, knowledge and skills to their advantage. They earn “Savee Stars” based on the worthiness of their problems and their work and motivation to resolve them.</p>\n          \t\t                \n                </div>\n            </div>\n         </div>\n            \n            \n          \n            \n            \n             <h5>Our pricing model.</h5>\n            <p class=\"light\">Our different levels of service enable anyone to use the service&mdash;from the poor in emerging economies (freemium), to the poor in the first world (basic model) to people anywhere who have succeeded despite skin color (premium model), but who could still use a hand up and some mentoring from those generous folk who have held power since the dawn of our glorious country. We offer a special discount (77% of the cost) on our basic and premium models for advice from a white woman.</p>\n\n            \n             \n            \n         \n  \n  \n  \n  \n  <div class=\"section\"> \n\t  <div class=\"row\">\n      \t<div class=\"col s12 m4\">\n        \t<div class=\"card\">\n            \t<div class=\"card-image\">\n                <img src=\"/img/services-square-4.jpg\">\n                </div>\n                <div class=\"card-content\">\n\t\t\t\t<span class=\"card-title black-text\">FREEMIUM</span>\n                <p>For our least privileged users, we offer an SMS-based Freemium model.<br><br>\nWe know that many of our least privileged users will not speak English, but our solution integrates Google Translate, enabling Saviors and Savees to easily converse via SMS to share problems and expert privileged advice despite any global language, culture or life experience barriers.<br><br>\nWorking through our Non Profit Champion, <a href=\"https://www.facebook.com/WorldAidCorps\">World Aid Corps</a>, we will engage with the most excluded people in the most far off places. That enables us to reach those people who have with the biggest problems. SMS provides us a quick and easy way to reach these beneficiaries in any language. After all, there are more mobile phones than toilets now, according to the World Bank, so reaching the poorest of the poor is no longer an issue! <br><br>\nOur white saviors will be able to provide their life-saving advice and deliver privilege with the touch of a button! Ending global poverty and ending lack of privilege has never been so easy.<br><br>\n<strong>Free</strong></p>\n             \t</div>\n          \t</div>\n         </div>\n         \n         \n         \t<div class=\"col s12 m4\">\n        \t<div class=\"card\">\n            \t<div class=\"card-image\">\n                <img src=\"/img/services-square-5.jpg\">\n                </div>\n                <div class=\"card-content\">\n\t\t\t\t<span class=\"card-title black-text\">BASIC</span>\n                <p>Our Basic service is designed for those who are not privileged themselves yet who are surrounded by the vast privilege of others, especially white privilege.<br><br>\nBasic users pay a small fee to access white savior advice via SMS, video chat or voice. Say a non-white person being pulled over by the police and needs some quick advice on how to avoid being shot, beaten or choked to death. A quick click to start up the app and the non-white person can access any available white savior. He will provide advice on the right attitude and the best way to leave the situation alive and unharmed. <br><br>\nIn dire situations, basic users can quickly upgrade to Premium and have a white savior delivered to them in person to serve as an intermediary or witness.<br><br>\nOur Skype API means that this service is available in multiple languages.<br><br> \nVideo chat allows the user to hand the phone over to an authority figure for white savior intermediation services.<br><br>\n<strong>All for $9/month.</strong></p>\n             \t</div>\n          \t</div>\n         </div>\n         \n         \t<div class=\"col s12 m4\">\n        \t<div class=\"card\">\n            \t<div class=\"card-image\">\n                <img src=\"/img/services-square-2.jpg\">\n                </div>\n                <div class=\"card-content\">\n\t\t\t\t<span class=\"card-title black-text\">PREMIUM</span>\n                <p>The premium service is for the non-white person who has made it, but still needs a white savior who can intervene or offer one-on-one advice and mentorship.<br><br> \n                Even successful non-white people need a hand at some point.<br><br>\n                \nWhen there’s a promotion to be had, a Premium user can call on a white savior to accompany him or her to a meeting to put in a good word. <br><br>\nWomen often need someone to whitemansplain what their superiors are saying so that they can grasp the true meaning in white man terms.<br><br>\nIn an emergency situation, our Premium customers can request a white savior who will arrive directly to them. Using Uber’s patented business model and based on their kitten delivery service, we’ll ensure that the white savior that is closest to you will arrive quickly. You can track his arrival right on your phone for easy identification.<br><br>\n<strong>All for $29/month.</strong>\n                </p>\n             \t</div>\n          \t</div>\n         </div>\n\t </div>\n  \n\n \n  \n  </div>\n         \n<!-- Success Stories Section -->         \n         \n   <div class=\"section\">           \n         \n\t<div class=\"row\">\n        \t<div class=\"col m12 s12 light\">\n            <p></p><div class=\"rich-text\"><h4>Success Stories.</h4>\n                <hr><h5>Our fast growth has changed the lives of many. Below are just a few stories in which privileged white men have helped the underprivileged.</h5>\n           \t</div>\n            </div>\n         </div>\n        \n         \n     <div class=\"row\">   \n      \n      \n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable grey lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/saved-1.jpg\" alt=\"\" class=\"circle responsive-img\" > \n            </div>\n            <div class=\"col s10\">\n              <span class=\"black-text\">\n                \"I could see that my lack of access to privilege was going to be a real problem for life, but I didn't know where to turn... until WhiteSave.me! Volunteers like Parker and Maddox generously donated their time to help me get ahead.\" \n               <br><br><em>Jamal was just another 28-year-old hustler, somewhere between high school and jail. </em>\n              </span>\n            </div>\n          </div>\n        </div>\n      </div>\n      \n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable grey lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/saved-2.jpg\" alt=\"\" class=\"circle responsive-img\" > \n            </div>\n            <div class=\"col s10\">\n              <span class=\"black-text\">\n                \"I didn't believe in this when I saw it, but once I reached out to see what a white man would do in my situation I immediately realized how much I had been missing. Now I have access to privilege when and where I need it.\" \n               <br><br><em>Ethan was stuck on a minimum wage job for way too long.</em>\n              </span>\n            </div>\n          </div>\n        </div>\n      </div>\n      </div>\n      \n       <div class=\"row\">   \n      \n      \n      \n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable grey lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/saved-1.jpg\" alt=\"\" class=\"circle responsive-img\" > \n            </div>\n            <div class=\"col s10\">\n              <span class=\"black-text\">\n                \"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.\" \n               <br><br><em>Jamal was just another 28-year-old hustler, somewhere between high school and jail. </em>\n              </span>\n            </div>\n          </div>\n        </div>\n      </div>\n      \n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable grey lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/saved-2.jpg\" alt=\"\" class=\"circle responsive-img\" > \n            </div>\n            <div class=\"col s10\">\n              <span class=\"black-text\">\n                \"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.\" \n               <br><br><em>Jamal was just another 28-year-old hustler, somewhere between high school and jail. </em>\n              </span>\n            </div>\n          </div>\n        </div>\n      </div>\n      </div>\n      \n       <div class=\"row\">   \n    \n      \n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable grey lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/saved-1.jpg\" alt=\"\" class=\"circle responsive-img\" > \n            </div>\n            <div class=\"col s10\">\n              <span class=\"black-text\">\n                \"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.\" \n               <br><br><em>Jamal was just another 28-year-old hustler, somewhere between high school and jail. </em>\n              </span>\n            </div>\n          </div>\n        </div>\n      </div>\n\n\n      <div class=\"col s12 m6 l6\">\n        <div class=\"card-panel hoverable grey lighten-5 z-depth-1\">\n          <div class=\"row\">\n            <div class=\"col s2\">\n              <img src=\"img/saved-1.jpg\" alt=\"\" class=\"circle responsive-img\" > \n            </div>\n            <div class=\"col s10\">\n              <span class=\"black-text\">\n                \"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.\" \n               <br><br><em>Jamal was just another 28-year-old hustler, somewhere between high school and jail. </em>\n              </span>\n            </div>\n          </div>\n        </div>\n      </div>\n\n\t</div>      \n      \n      </div>\n      \n\n         \n         \n          \n    </div>\n\n\n\n\n\n\n\t\t</div>\n\n\t</div>\n</div>\n\n\n\n";
  global.define = __define;
  return module.exports;
});

System.register("pages/start.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<div class=\"section no-pad-bot\" id=\"index-banner\">\n  <div class=\"container\">\n    <br><br>\n    <h3 class=\"header center brown-text\" id=\"white\">Determining Whiteness</h3>\n    <div class=\"row center\">\n    <h5 class=\"header col s12 light\"> Please allow <strong>white</strong>save.me to access your camera.<br><br>\nOur patented facial color recognition software&#8482; will determine your whiteness.<br><br>\nBased on your results we will link you with a White Savior or a non-White Savee via a chat session.<br><br>\nYou can end the chat session at any time..</h5>\n    \n    <div class=\"center-align\" style=\"height: 500px\">\n      <div>\n        <canvas id=\"inputCanvas\" width=\"280\" height=\"200\" style=\"display:inline\"></canvas>\n      </div>\n      <strong class=\"brown-text\" id=\"dark\"></strong>\n      <strong class=\"yellow-text\" id=\"yellow\"></strong>\n    </div>\n    <canvas id=\"outputCanvas\" class=\"responsive-img\" width=\"280\" height=\"200\" style=\"display:none\"></canvas>\n    <video id=\"inputVideo\" autoplay loop style=\"display:none\"></video>\n    <video id=\"peerVideo\" poster=\"img/loader.gif\"></video>\n  </div>\n</div>\n";
  global.define = __define;
  return module.exports;
});

(function() {
function define(){};  define.amd = {};
(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    System.register("lib/headtrackr", [], false, function(__require, __exports, __module) {
      return (factory).call(this);
    });
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
          var videoSelector = {video: true};
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
})();
System.register("npm:ms@0.7.1/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    if ('string' == typeof val)
      return parse(val);
    return options.long ? long(val) : short(val);
  };
  function parse(str) {
    str = '' + str;
    if (str.length > 10000)
      return ;
    var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
    if (!match)
      return ;
    var n = parseFloat(match[1]);
    var type = (match[2] || 'ms').toLowerCase();
    switch (type) {
      case 'years':
      case 'year':
      case 'yrs':
      case 'yr':
      case 'y':
        return n * y;
      case 'days':
      case 'day':
      case 'd':
        return n * d;
      case 'hours':
      case 'hour':
      case 'hrs':
      case 'hr':
      case 'h':
        return n * h;
      case 'minutes':
      case 'minute':
      case 'mins':
      case 'min':
      case 'm':
        return n * m;
      case 'seconds':
      case 'second':
      case 'secs':
      case 'sec':
      case 's':
        return n * s;
      case 'milliseconds':
      case 'millisecond':
      case 'msecs':
      case 'msec':
      case 'ms':
        return n;
    }
  }
  function short(ms) {
    if (ms >= d)
      return Math.round(ms / d) + 'd';
    if (ms >= h)
      return Math.round(ms / h) + 'h';
    if (ms >= m)
      return Math.round(ms / m) + 'm';
    if (ms >= s)
      return Math.round(ms / s) + 's';
    return ms + 'ms';
  }
  function long(ms) {
    return plural(ms, d, 'day') || plural(ms, h, 'hour') || plural(ms, m, 'minute') || plural(ms, s, 'second') || ms + ' ms';
  }
  function plural(ms, n, name) {
    if (ms < n)
      return ;
    if (ms < n * 1.5)
      return Math.floor(ms / n) + ' ' + name;
    return Math.ceil(ms / n) + ' ' + name + 's';
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:get-browser-rtc@1.0.0/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = function getBrowserRTC() {
    if (typeof window === 'undefined')
      return null;
    var wrtc = {
      RTCPeerConnection: window.mozRTCPeerConnection || window.RTCPeerConnection || window.webkitRTCPeerConnection,
      RTCSessionDescription: window.mozRTCSessionDescription || window.RTCSessionDescription || window.webkitRTCSessionDescription,
      RTCIceCandidate: window.mozRTCIceCandidate || window.RTCIceCandidate || window.webkitRTCIceCandidate
    };
    if (!wrtc.RTCPeerConnection)
      return null;
    return wrtc;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:hat@0.0.3/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var hat = module.exports = function(bits, base) {
    if (!base)
      base = 16;
    if (bits === undefined)
      bits = 128;
    if (bits <= 0)
      return '0';
    var digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    for (var i = 2; digits === Infinity; i *= 2) {
      digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }
    var rem = digits - Math.floor(digits);
    var res = '';
    for (var i = 0; i < Math.floor(digits); i++) {
      var x = Math.floor(Math.random() * base).toString(base);
      res = x + res;
    }
    if (rem) {
      var b = Math.pow(base, rem);
      var x = Math.floor(Math.random() * b).toString(base);
      res = x + res;
    }
    var parsed = parseInt(res, base);
    if (parsed !== Infinity && parsed >= Math.pow(2, bits)) {
      return hat(bits, base);
    } else
      return res;
  };
  hat.rack = function(bits, base, expandBy) {
    var fn = function(data) {
      var iters = 0;
      do {
        if (iters++ > 10) {
          if (expandBy)
            bits += expandBy;
          else
            throw new Error('too many ID collisions, use more bits');
        }
        var id = hat(bits, base);
      } while (Object.hasOwnProperty.call(hats, id));
      hats[id] = data;
      return id;
    };
    var hats = fn.hats = {};
    fn.get = function(id) {
      return fn.hats[id];
    };
    fn.set = function(id, value) {
      fn.hats[id] = value;
      return fn;
    };
    fn.bits = bits || 128;
    fn.base = base || 16;
    return fn;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:inherits@2.0.1/inherits_browser", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  if (typeof Object.create === 'function') {
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }});
    };
  } else {
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function() {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:is-typedarray@1.0.0/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = isTypedArray;
  isTypedArray.strict = isStrictTypedArray;
  isTypedArray.loose = isLooseTypedArray;
  var toString = Object.prototype.toString;
  var names = {
    '[object Int8Array]': true,
    '[object Int16Array]': true,
    '[object Int32Array]': true,
    '[object Uint8Array]': true,
    '[object Uint8ClampedArray]': true,
    '[object Uint16Array]': true,
    '[object Uint32Array]': true,
    '[object Float32Array]': true,
    '[object Float64Array]': true
  };
  function isTypedArray(arr) {
    return (isStrictTypedArray(arr) || isLooseTypedArray(arr));
  }
  function isStrictTypedArray(arr) {
    return (arr instanceof Int8Array || arr instanceof Int16Array || arr instanceof Int32Array || arr instanceof Uint8Array || arr instanceof Uint8ClampedArray || arr instanceof Uint16Array || arr instanceof Uint32Array || arr instanceof Float32Array || arr instanceof Float64Array);
  }
  function isLooseTypedArray(arr) {
    return names[toString.call(arr)];
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:wrappy@1.0.1/wrappy", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = wrappy;
  function wrappy(fn, cb) {
    if (fn && cb)
      return wrappy(fn)(cb);
    if (typeof fn !== 'function')
      throw new TypeError('need wrapper function');
    Object.keys(fn).forEach(function(k) {
      wrapper[k] = fn[k];
    });
    return wrapper;
    function wrapper() {
      var args = new Array(arguments.length);
      for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i];
      }
      var ret = fn.apply(this, args);
      var cb = args[args.length - 1];
      if (typeof ret === 'function' && ret !== cb) {
        Object.keys(cb).forEach(function(k) {
          ret[k] = cb[k];
        });
      }
      return ret;
    }
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:events@1.0.2/events", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  function EventEmitter() {
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || undefined;
  }
  module.exports = EventEmitter;
  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;
  EventEmitter.defaultMaxListeners = 10;
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!isNumber(n) || n < 0 || isNaN(n))
      throw TypeError('n must be a positive number');
    this._maxListeners = n;
    return this;
  };
  EventEmitter.prototype.emit = function(type) {
    var er,
        handler,
        len,
        args,
        i,
        listeners;
    if (!this._events)
      this._events = {};
    if (type === 'error') {
      if (!this._events.error || (isObject(this._events.error) && !this._events.error.length)) {
        er = arguments[1];
        if (er instanceof Error) {
          throw er;
        }
        throw TypeError('Uncaught, unspecified "error" event.');
      }
    }
    handler = this._events[type];
    if (isUndefined(handler))
      return false;
    if (isFunction(handler)) {
      switch (arguments.length) {
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        default:
          len = arguments.length;
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
    } else if (isObject(handler)) {
      len = arguments.length;
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      listeners = handler.slice();
      len = listeners.length;
      for (i = 0; i < len; i++)
        listeners[i].apply(this, args);
    }
    return true;
  };
  EventEmitter.prototype.addListener = function(type, listener) {
    var m;
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    if (!this._events)
      this._events = {};
    if (this._events.newListener)
      this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);
    if (!this._events[type])
      this._events[type] = listener;
    else if (isObject(this._events[type]))
      this._events[type].push(listener);
    else
      this._events[type] = [this._events[type], listener];
    if (isObject(this._events[type]) && !this._events[type].warned) {
      var m;
      if (!isUndefined(this._maxListeners)) {
        m = this._maxListeners;
      } else {
        m = EventEmitter.defaultMaxListeners;
      }
      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
        if (typeof console.trace === 'function') {
          console.trace();
        }
      }
    }
    return this;
  };
  EventEmitter.prototype.on = EventEmitter.prototype.addListener;
  EventEmitter.prototype.once = function(type, listener) {
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    var fired = false;
    function g() {
      this.removeListener(type, g);
      if (!fired) {
        fired = true;
        listener.apply(this, arguments);
      }
    }
    g.listener = listener;
    this.on(type, g);
    return this;
  };
  EventEmitter.prototype.removeListener = function(type, listener) {
    var list,
        position,
        length,
        i;
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    if (!this._events || !this._events[type])
      return this;
    list = this._events[type];
    length = list.length;
    position = -1;
    if (list === listener || (isFunction(list.listener) && list.listener === listener)) {
      delete this._events[type];
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    } else if (isObject(list)) {
      for (i = length; i-- > 0; ) {
        if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
          position = i;
          break;
        }
      }
      if (position < 0)
        return this;
      if (list.length === 1) {
        list.length = 0;
        delete this._events[type];
      } else {
        list.splice(position, 1);
      }
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    }
    return this;
  };
  EventEmitter.prototype.removeAllListeners = function(type) {
    var key,
        listeners;
    if (!this._events)
      return this;
    if (!this._events.removeListener) {
      if (arguments.length === 0)
        this._events = {};
      else if (this._events[type])
        delete this._events[type];
      return this;
    }
    if (arguments.length === 0) {
      for (key in this._events) {
        if (key === 'removeListener')
          continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners('removeListener');
      this._events = {};
      return this;
    }
    listeners = this._events[type];
    if (isFunction(listeners)) {
      this.removeListener(type, listeners);
    } else {
      while (listeners.length)
        this.removeListener(type, listeners[listeners.length - 1]);
    }
    delete this._events[type];
    return this;
  };
  EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type])
      ret = [];
    else if (isFunction(this._events[type]))
      ret = [this._events[type]];
    else
      ret = this._events[type].slice();
    return ret;
  };
  EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type])
      ret = 0;
    else if (isFunction(emitter._events[type]))
      ret = 1;
    else
      ret = emitter._events[type].length;
    return ret;
  };
  function isFunction(arg) {
    return typeof arg === 'function';
  }
  function isNumber(arg) {
    return typeof arg === 'number';
  }
  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }
  function isUndefined(arg) {
    return arg === void 0;
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:isarray@0.0.1/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = Array.isArray || function(arr) {
    return Object.prototype.toString.call(arr) == '[object Array]';
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:base64-js@0.0.8/lib/b64", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  ;
  (function(exports) {
    'use strict';
    var Arr = (typeof Uint8Array !== 'undefined') ? Uint8Array : Array;
    var PLUS = '+'.charCodeAt(0);
    var SLASH = '/'.charCodeAt(0);
    var NUMBER = '0'.charCodeAt(0);
    var LOWER = 'a'.charCodeAt(0);
    var UPPER = 'A'.charCodeAt(0);
    var PLUS_URL_SAFE = '-'.charCodeAt(0);
    var SLASH_URL_SAFE = '_'.charCodeAt(0);
    function decode(elt) {
      var code = elt.charCodeAt(0);
      if (code === PLUS || code === PLUS_URL_SAFE)
        return 62;
      if (code === SLASH || code === SLASH_URL_SAFE)
        return 63;
      if (code < NUMBER)
        return -1;
      if (code < NUMBER + 10)
        return code - NUMBER + 26 + 26;
      if (code < UPPER + 26)
        return code - UPPER;
      if (code < LOWER + 26)
        return code - LOWER + 26;
    }
    function b64ToByteArray(b64) {
      var i,
          j,
          l,
          tmp,
          placeHolders,
          arr;
      if (b64.length % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4');
      }
      var len = b64.length;
      placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0;
      arr = new Arr(b64.length * 3 / 4 - placeHolders);
      l = placeHolders > 0 ? b64.length - 4 : b64.length;
      var L = 0;
      function push(v) {
        arr[L++] = v;
      }
      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3));
        push((tmp & 0xFF0000) >> 16);
        push((tmp & 0xFF00) >> 8);
        push(tmp & 0xFF);
      }
      if (placeHolders === 2) {
        tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4);
        push(tmp & 0xFF);
      } else if (placeHolders === 1) {
        tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2);
        push((tmp >> 8) & 0xFF);
        push(tmp & 0xFF);
      }
      return arr;
    }
    function uint8ToBase64(uint8) {
      var i,
          extraBytes = uint8.length % 3,
          output = "",
          temp,
          length;
      function encode(num) {
        return lookup.charAt(num);
      }
      function tripletToBase64(num) {
        return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F);
      }
      for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
        temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output += tripletToBase64(temp);
      }
      switch (extraBytes) {
        case 1:
          temp = uint8[uint8.length - 1];
          output += encode(temp >> 2);
          output += encode((temp << 4) & 0x3F);
          output += '==';
          break;
        case 2:
          temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
          output += encode(temp >> 10);
          output += encode((temp >> 4) & 0x3F);
          output += encode((temp << 2) & 0x3F);
          output += '=';
          break;
      }
      return output;
    }
    exports.toByteArray = b64ToByteArray;
    exports.fromByteArray = uint8ToBase64;
  }(typeof exports === 'undefined' ? (this.base64js = {}) : exports));
  global.define = __define;
  return module.exports;
});

System.register("npm:ieee754@1.1.6/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  exports.read = function(buffer, offset, isLE, mLen, nBytes) {
    var e,
        m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity);
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  };
  exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e,
        m,
        c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}
    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}
    buffer[offset + i - d] |= s * 128;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:is-array@1.0.1/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var isArray = Array.isArray;
  var str = Object.prototype.toString;
  module.exports = isArray || function(val) {
    return !!val && '[object Array]' == str.call(val);
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:core-util-is@1.0.1/lib/util", ["github:jspm/nodelibs-buffer@0.1.0"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(Buffer) {
    function isArray(ar) {
      return Array.isArray(ar);
    }
    exports.isArray = isArray;
    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }
    exports.isBoolean = isBoolean;
    function isNull(arg) {
      return arg === null;
    }
    exports.isNull = isNull;
    function isNullOrUndefined(arg) {
      return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    function isNumber(arg) {
      return typeof arg === 'number';
    }
    exports.isNumber = isNumber;
    function isString(arg) {
      return typeof arg === 'string';
    }
    exports.isString = isString;
    function isSymbol(arg) {
      return typeof arg === 'symbol';
    }
    exports.isSymbol = isSymbol;
    function isUndefined(arg) {
      return arg === void 0;
    }
    exports.isUndefined = isUndefined;
    function isRegExp(re) {
      return isObject(re) && objectToString(re) === '[object RegExp]';
    }
    exports.isRegExp = isRegExp;
    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }
    exports.isObject = isObject;
    function isDate(d) {
      return isObject(d) && objectToString(d) === '[object Date]';
    }
    exports.isDate = isDate;
    function isError(e) {
      return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
    }
    exports.isError = isError;
    function isFunction(arg) {
      return typeof arg === 'function';
    }
    exports.isFunction = isFunction;
    function isPrimitive(arg) {
      return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || typeof arg === 'undefined';
    }
    exports.isPrimitive = isPrimitive;
    function isBuffer(arg) {
      return Buffer.isBuffer(arg);
    }
    exports.isBuffer = isBuffer;
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  })(require("github:jspm/nodelibs-buffer@0.1.0").Buffer);
  global.define = __define;
  return module.exports;
});

System.register("npm:process@0.10.1/browser", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  function drainQueue() {
    if (draining) {
      return ;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      var i = -1;
      while (++i < len) {
        currentQueue[i]();
      }
      len = queue.length;
    }
    draining = false;
  }
  process.nextTick = function(fun) {
    queue.push(fun);
    if (!draining) {
      setTimeout(drainQueue, 0);
    }
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:string_decoder@0.10.31/index", ["github:jspm/nodelibs-buffer@0.1.0", "github:jspm/nodelibs-buffer@0.1.0"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(Buffer) {
    var Buffer = require("github:jspm/nodelibs-buffer@0.1.0").Buffer;
    var isBufferEncoding = Buffer.isEncoding || function(encoding) {
      switch (encoding && encoding.toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
        case 'raw':
          return true;
        default:
          return false;
      }
    };
    function assertEncoding(encoding) {
      if (encoding && !isBufferEncoding(encoding)) {
        throw new Error('Unknown encoding: ' + encoding);
      }
    }
    var StringDecoder = exports.StringDecoder = function(encoding) {
      this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
      assertEncoding(encoding);
      switch (this.encoding) {
        case 'utf8':
          this.surrogateSize = 3;
          break;
        case 'ucs2':
        case 'utf16le':
          this.surrogateSize = 2;
          this.detectIncompleteChar = utf16DetectIncompleteChar;
          break;
        case 'base64':
          this.surrogateSize = 3;
          this.detectIncompleteChar = base64DetectIncompleteChar;
          break;
        default:
          this.write = passThroughWrite;
          return ;
      }
      this.charBuffer = new Buffer(6);
      this.charReceived = 0;
      this.charLength = 0;
    };
    StringDecoder.prototype.write = function(buffer) {
      var charStr = '';
      while (this.charLength) {
        var available = (buffer.length >= this.charLength - this.charReceived) ? this.charLength - this.charReceived : buffer.length;
        buffer.copy(this.charBuffer, this.charReceived, 0, available);
        this.charReceived += available;
        if (this.charReceived < this.charLength) {
          return '';
        }
        buffer = buffer.slice(available, buffer.length);
        charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
        var charCode = charStr.charCodeAt(charStr.length - 1);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          this.charLength += this.surrogateSize;
          charStr = '';
          continue;
        }
        this.charReceived = this.charLength = 0;
        if (buffer.length === 0) {
          return charStr;
        }
        break;
      }
      this.detectIncompleteChar(buffer);
      var end = buffer.length;
      if (this.charLength) {
        buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
        end -= this.charReceived;
      }
      charStr += buffer.toString(this.encoding, 0, end);
      var end = charStr.length - 1;
      var charCode = charStr.charCodeAt(end);
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        var size = this.surrogateSize;
        this.charLength += size;
        this.charReceived += size;
        this.charBuffer.copy(this.charBuffer, size, 0, size);
        buffer.copy(this.charBuffer, 0, 0, size);
        return charStr.substring(0, end);
      }
      return charStr;
    };
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
      var i = (buffer.length >= 3) ? 3 : buffer.length;
      for (; i > 0; i--) {
        var c = buffer[buffer.length - i];
        if (i == 1 && c >> 5 == 0x06) {
          this.charLength = 2;
          break;
        }
        if (i <= 2 && c >> 4 == 0x0E) {
          this.charLength = 3;
          break;
        }
        if (i <= 3 && c >> 3 == 0x1E) {
          this.charLength = 4;
          break;
        }
      }
      this.charReceived = i;
    };
    StringDecoder.prototype.end = function(buffer) {
      var res = '';
      if (buffer && buffer.length)
        res = this.write(buffer);
      if (this.charReceived) {
        var cr = this.charReceived;
        var buf = this.charBuffer;
        var enc = this.encoding;
        res += buf.slice(0, cr).toString(enc);
      }
      return res;
    };
    function passThroughWrite(buffer) {
      return buffer.toString(this.encoding);
    }
    function utf16DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 2;
      this.charLength = this.charReceived ? 2 : 0;
    }
    function base64DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 3;
      this.charLength = this.charReceived ? 3 : 0;
    }
  })(require("github:jspm/nodelibs-buffer@0.1.0").Buffer);
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/lib/_stream_transform", ["npm:readable-stream@1.1.13/lib/_stream_duplex", "npm:core-util-is@1.0.1", "npm:inherits@2.0.1", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    module.exports = Transform;
    var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
    var util = require("npm:core-util-is@1.0.1");
    util.inherits = require("npm:inherits@2.0.1");
    util.inherits(Transform, Duplex);
    function TransformState(options, stream) {
      this.afterTransform = function(er, data) {
        return afterTransform(stream, er, data);
      };
      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
    }
    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;
      var cb = ts.writecb;
      if (!cb)
        return stream.emit('error', new Error('no writecb in Transform class'));
      ts.writechunk = null;
      ts.writecb = null;
      if (!util.isNullOrUndefined(data))
        stream.push(data);
      if (cb)
        cb(er);
      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform))
        return new Transform(options);
      Duplex.call(this, options);
      this._transformState = new TransformState(options, this);
      var stream = this;
      this._readableState.needReadable = true;
      this._readableState.sync = false;
      this.once('prefinish', function() {
        if (util.isFunction(this._flush))
          this._flush(function(er) {
            done(stream, er);
          });
        else
          done(stream);
      });
    }
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error('not implemented');
    };
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
          this._read(rs.highWaterMark);
      }
    };
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
      if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        ts.needTransform = true;
      }
    };
    function done(stream, er) {
      if (er)
        return stream.emit('error', er);
      var ws = stream._writableState;
      var ts = stream._transformState;
      if (ws.length)
        throw new Error('calling transform done when ws.length != 0');
      if (ts.transforming)
        throw new Error('calling transform done when still transforming');
      return stream.push(null);
    }
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/lib/_stream_passthrough", ["npm:readable-stream@1.1.13/lib/_stream_transform", "npm:core-util-is@1.0.1", "npm:inherits@2.0.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = PassThrough;
  var Transform = require("npm:readable-stream@1.1.13/lib/_stream_transform");
  var util = require("npm:core-util-is@1.0.1");
  util.inherits = require("npm:inherits@2.0.1");
  util.inherits(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough))
      return new PassThrough(options);
    Transform.call(this, options);
  }
  PassThrough.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/writable", ["npm:readable-stream@1.1.13/lib/_stream_writable"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_writable");
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/duplex", ["npm:readable-stream@1.1.13/lib/_stream_duplex"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/transform", ["npm:readable-stream@1.1.13/lib/_stream_transform"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_transform");
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/passthrough", ["npm:readable-stream@1.1.13/lib/_stream_passthrough"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_passthrough");
  global.define = __define;
  return module.exports;
});

System.register("npm:typedarray-to-buffer@3.0.3/index", ["npm:is-typedarray@1.0.0", "github:jspm/nodelibs-buffer@0.1.0"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(Buffer) {
    var isTypedArray = require("npm:is-typedarray@1.0.0").strict;
    module.exports = function(arr) {
      var constructor = Buffer.TYPED_ARRAY_SUPPORT ? Buffer._augment : function(arr) {
        return new Buffer(arr);
      };
      if (arr instanceof Uint8Array) {
        return constructor(arr);
      } else if (arr instanceof ArrayBuffer) {
        return constructor(new Uint8Array(arr));
      } else if (isTypedArray(arr)) {
        return constructor(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
      } else {
        return new Buffer(arr);
      }
    };
  })(require("github:jspm/nodelibs-buffer@0.1.0").Buffer);
  global.define = __define;
  return module.exports;
});

System.register("components/pages.html!github:systemjs/plugin-text@0.0.2", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = "<x-header></x-header>\n<x-main></x-main>\n<br><br>\n<x-footer></x-footer>\n";
  global.define = __define;
  return module.exports;
});

System.register("npm:ms@0.7.1", ["npm:ms@0.7.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:ms@0.7.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:get-browser-rtc@1.0.0", ["npm:get-browser-rtc@1.0.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:get-browser-rtc@1.0.0/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:hat@0.0.3", ["npm:hat@0.0.3/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:hat@0.0.3/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:inherits@2.0.1", ["npm:inherits@2.0.1/inherits_browser"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:inherits@2.0.1/inherits_browser");
  global.define = __define;
  return module.exports;
});

System.register("npm:is-typedarray@1.0.0", ["npm:is-typedarray@1.0.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:is-typedarray@1.0.0/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:wrappy@1.0.1", ["npm:wrappy@1.0.1/wrappy"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:wrappy@1.0.1/wrappy");
  global.define = __define;
  return module.exports;
});

System.register("npm:events@1.0.2", ["npm:events@1.0.2/events"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:events@1.0.2/events");
  global.define = __define;
  return module.exports;
});

System.register("npm:isarray@0.0.1", ["npm:isarray@0.0.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:isarray@0.0.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:base64-js@0.0.8", ["npm:base64-js@0.0.8/lib/b64"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:base64-js@0.0.8/lib/b64");
  global.define = __define;
  return module.exports;
});

System.register("npm:ieee754@1.1.6", ["npm:ieee754@1.1.6/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:ieee754@1.1.6/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:is-array@1.0.1", ["npm:is-array@1.0.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:is-array@1.0.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:core-util-is@1.0.1", ["npm:core-util-is@1.0.1/lib/util"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:core-util-is@1.0.1/lib/util");
  global.define = __define;
  return module.exports;
});

System.register("npm:process@0.10.1", ["npm:process@0.10.1/browser"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:process@0.10.1/browser");
  global.define = __define;
  return module.exports;
});

System.register("npm:string_decoder@0.10.31", ["npm:string_decoder@0.10.31/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:string_decoder@0.10.31/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:typedarray-to-buffer@3.0.3", ["npm:typedarray-to-buffer@3.0.3/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:typedarray-to-buffer@3.0.3/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:debug@2.2.0/debug", ["npm:ms@0.7.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  exports = module.exports = debug;
  exports.coerce = coerce;
  exports.disable = disable;
  exports.enable = enable;
  exports.enabled = enabled;
  exports.humanize = require("npm:ms@0.7.1");
  exports.names = [];
  exports.skips = [];
  exports.formatters = {};
  var prevColor = 0;
  var prevTime;
  function selectColor() {
    return exports.colors[prevColor++ % exports.colors.length];
  }
  function debug(namespace) {
    function disabled() {}
    disabled.enabled = false;
    function enabled() {
      var self = enabled;
      var curr = +new Date();
      var ms = curr - (prevTime || curr);
      self.diff = ms;
      self.prev = prevTime;
      self.curr = curr;
      prevTime = curr;
      if (null == self.useColors)
        self.useColors = exports.useColors();
      if (null == self.color && self.useColors)
        self.color = selectColor();
      var args = Array.prototype.slice.call(arguments);
      args[0] = exports.coerce(args[0]);
      if ('string' !== typeof args[0]) {
        args = ['%o'].concat(args);
      }
      var index = 0;
      args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
        if (match === '%%')
          return match;
        index++;
        var formatter = exports.formatters[format];
        if ('function' === typeof formatter) {
          var val = args[index];
          match = formatter.call(self, val);
          args.splice(index, 1);
          index--;
        }
        return match;
      });
      if ('function' === typeof exports.formatArgs) {
        args = exports.formatArgs.apply(self, args);
      }
      var logFn = enabled.log || exports.log || console.log.bind(console);
      logFn.apply(self, args);
    }
    enabled.enabled = true;
    var fn = exports.enabled(namespace) ? enabled : disabled;
    fn.namespace = namespace;
    return fn;
  }
  function enable(namespaces) {
    exports.save(namespaces);
    var split = (namespaces || '').split(/[\s,]+/);
    var len = split.length;
    for (var i = 0; i < len; i++) {
      if (!split[i])
        continue;
      namespaces = split[i].replace(/\*/g, '.*?');
      if (namespaces[0] === '-') {
        exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
      } else {
        exports.names.push(new RegExp('^' + namespaces + '$'));
      }
    }
  }
  function disable() {
    exports.enable('');
  }
  function enabled(name) {
    var i,
        len;
    for (i = 0, len = exports.skips.length; i < len; i++) {
      if (exports.skips[i].test(name)) {
        return false;
      }
    }
    for (i = 0, len = exports.names.length; i < len; i++) {
      if (exports.names[i].test(name)) {
        return true;
      }
    }
    return false;
  }
  function coerce(val) {
    if (val instanceof Error)
      return val.stack || val.message;
    return val;
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:once@1.3.2/once", ["npm:wrappy@1.0.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var wrappy = require("npm:wrappy@1.0.1");
  module.exports = wrappy(once);
  once.proto = once(function() {
    Object.defineProperty(Function.prototype, 'once', {
      value: function() {
        return once(this);
      },
      configurable: true
    });
  });
  function once(fn) {
    var f = function() {
      if (f.called)
        return f.value;
      f.called = true;
      return f.value = fn.apply(this, arguments);
    };
    f.called = false;
    return f;
  }
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-events@0.1.1/index", ["npm:events@1.0.2"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('events') : require("npm:events@1.0.2");
  global.define = __define;
  return module.exports;
});

System.register("npm:buffer@3.3.0/index", ["npm:base64-js@0.0.8", "npm:ieee754@1.1.6", "npm:is-array@1.0.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var base64 = require("npm:base64-js@0.0.8");
  var ieee754 = require("npm:ieee754@1.1.6");
  var isArray = require("npm:is-array@1.0.1");
  exports.Buffer = Buffer;
  exports.SlowBuffer = SlowBuffer;
  exports.INSPECT_MAX_BYTES = 50;
  Buffer.poolSize = 8192;
  var rootParent = {};
  Buffer.TYPED_ARRAY_SUPPORT = (function() {
    try {
      var buf = new ArrayBuffer(0);
      var arr = new Uint8Array(buf);
      arr.foo = function() {
        return 42;
      };
      return arr.foo() === 42 && typeof arr.subarray === 'function' && new Uint8Array(1).subarray(1, 1).byteLength === 0;
    } catch (e) {
      return false;
    }
  })();
  function kMaxLength() {
    return Buffer.TYPED_ARRAY_SUPPORT ? 0x7fffffff : 0x3fffffff;
  }
  function Buffer(arg) {
    if (!(this instanceof Buffer)) {
      if (arguments.length > 1)
        return new Buffer(arg, arguments[1]);
      return new Buffer(arg);
    }
    this.length = 0;
    this.parent = undefined;
    if (typeof arg === 'number') {
      return fromNumber(this, arg);
    }
    if (typeof arg === 'string') {
      return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8');
    }
    return fromObject(this, arg);
  }
  function fromNumber(that, length) {
    that = allocate(that, length < 0 ? 0 : checked(length) | 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < length; i++) {
        that[i] = 0;
      }
    }
    return that;
  }
  function fromString(that, string, encoding) {
    if (typeof encoding !== 'string' || encoding === '')
      encoding = 'utf8';
    var length = byteLength(string, encoding) | 0;
    that = allocate(that, length);
    that.write(string, encoding);
    return that;
  }
  function fromObject(that, object) {
    if (Buffer.isBuffer(object))
      return fromBuffer(that, object);
    if (isArray(object))
      return fromArray(that, object);
    if (object == null) {
      throw new TypeError('must start with number, buffer, array or string');
    }
    if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object);
    }
    if (object.length)
      return fromArrayLike(that, object);
    return fromJsonObject(that, object);
  }
  function fromBuffer(that, buffer) {
    var length = checked(buffer.length) | 0;
    that = allocate(that, length);
    buffer.copy(that, 0, 0, length);
    return that;
  }
  function fromArray(that, array) {
    var length = checked(array.length) | 0;
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function fromTypedArray(that, array) {
    var length = checked(array.length) | 0;
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function fromArrayLike(that, array) {
    var length = checked(array.length) | 0;
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function fromJsonObject(that, object) {
    var array;
    var length = 0;
    if (object.type === 'Buffer' && isArray(object.data)) {
      array = object.data;
      length = checked(array.length) | 0;
    }
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function allocate(that, length) {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      that = Buffer._augment(new Uint8Array(length));
    } else {
      that.length = length;
      that._isBuffer = true;
    }
    var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1;
    if (fromPool)
      that.parent = rootParent;
    return that;
  }
  function checked(length) {
    if (length >= kMaxLength()) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + kMaxLength().toString(16) + ' bytes');
    }
    return length | 0;
  }
  function SlowBuffer(subject, encoding) {
    if (!(this instanceof SlowBuffer))
      return new SlowBuffer(subject, encoding);
    var buf = new Buffer(subject, encoding);
    delete buf.parent;
    return buf;
  }
  Buffer.isBuffer = function isBuffer(b) {
    return !!(b != null && b._isBuffer);
  };
  Buffer.compare = function compare(a, b) {
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
      throw new TypeError('Arguments must be Buffers');
    }
    if (a === b)
      return 0;
    var x = a.length;
    var y = b.length;
    var i = 0;
    var len = Math.min(x, y);
    while (i < len) {
      if (a[i] !== b[i])
        break;
      ++i;
    }
    if (i !== len) {
      x = a[i];
      y = b[i];
    }
    if (x < y)
      return -1;
    if (y < x)
      return 1;
    return 0;
  };
  Buffer.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'binary':
      case 'base64':
      case 'raw':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true;
      default:
        return false;
    }
  };
  Buffer.concat = function concat(list, length) {
    if (!isArray(list))
      throw new TypeError('list argument must be an Array of Buffers.');
    if (list.length === 0) {
      return new Buffer(0);
    } else if (list.length === 1) {
      return list[0];
    }
    var i;
    if (length === undefined) {
      length = 0;
      for (i = 0; i < list.length; i++) {
        length += list[i].length;
      }
    }
    var buf = new Buffer(length);
    var pos = 0;
    for (i = 0; i < list.length; i++) {
      var item = list[i];
      item.copy(buf, pos);
      pos += item.length;
    }
    return buf;
  };
  function byteLength(string, encoding) {
    if (typeof string !== 'string')
      string = '' + string;
    var len = string.length;
    if (len === 0)
      return 0;
    var loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case 'ascii':
        case 'binary':
        case 'raw':
        case 'raws':
          return len;
        case 'utf8':
        case 'utf-8':
          return utf8ToBytes(string).length;
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2;
        case 'hex':
          return len >>> 1;
        case 'base64':
          return base64ToBytes(string).length;
        default:
          if (loweredCase)
            return utf8ToBytes(string).length;
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer.byteLength = byteLength;
  Buffer.prototype.length = undefined;
  Buffer.prototype.parent = undefined;
  function slowToString(encoding, start, end) {
    var loweredCase = false;
    start = start | 0;
    end = end === undefined || end === Infinity ? this.length : end | 0;
    if (!encoding)
      encoding = 'utf8';
    if (start < 0)
      start = 0;
    if (end > this.length)
      end = this.length;
    if (end <= start)
      return '';
    while (true) {
      switch (encoding) {
        case 'hex':
          return hexSlice(this, start, end);
        case 'utf8':
        case 'utf-8':
          return utf8Slice(this, start, end);
        case 'ascii':
          return asciiSlice(this, start, end);
        case 'binary':
          return binarySlice(this, start, end);
        case 'base64':
          return base64Slice(this, start, end);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return utf16leSlice(this, start, end);
        default:
          if (loweredCase)
            throw new TypeError('Unknown encoding: ' + encoding);
          encoding = (encoding + '').toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer.prototype.toString = function toString() {
    var length = this.length | 0;
    if (length === 0)
      return '';
    if (arguments.length === 0)
      return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };
  Buffer.prototype.equals = function equals(b) {
    if (!Buffer.isBuffer(b))
      throw new TypeError('Argument must be a Buffer');
    if (this === b)
      return true;
    return Buffer.compare(this, b) === 0;
  };
  Buffer.prototype.inspect = function inspect() {
    var str = '';
    var max = exports.INSPECT_MAX_BYTES;
    if (this.length > 0) {
      str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
      if (this.length > max)
        str += ' ... ';
    }
    return '<Buffer ' + str + '>';
  };
  Buffer.prototype.compare = function compare(b) {
    if (!Buffer.isBuffer(b))
      throw new TypeError('Argument must be a Buffer');
    if (this === b)
      return 0;
    return Buffer.compare(this, b);
  };
  Buffer.prototype.indexOf = function indexOf(val, byteOffset) {
    if (byteOffset > 0x7fffffff)
      byteOffset = 0x7fffffff;
    else if (byteOffset < -0x80000000)
      byteOffset = -0x80000000;
    byteOffset >>= 0;
    if (this.length === 0)
      return -1;
    if (byteOffset >= this.length)
      return -1;
    if (byteOffset < 0)
      byteOffset = Math.max(this.length + byteOffset, 0);
    if (typeof val === 'string') {
      if (val.length === 0)
        return -1;
      return String.prototype.indexOf.call(this, val, byteOffset);
    }
    if (Buffer.isBuffer(val)) {
      return arrayIndexOf(this, val, byteOffset);
    }
    if (typeof val === 'number') {
      if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
        return Uint8Array.prototype.indexOf.call(this, val, byteOffset);
      }
      return arrayIndexOf(this, [val], byteOffset);
    }
    function arrayIndexOf(arr, val, byteOffset) {
      var foundIndex = -1;
      for (var i = 0; byteOffset + i < arr.length; i++) {
        if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
          if (foundIndex === -1)
            foundIndex = i;
          if (i - foundIndex + 1 === val.length)
            return byteOffset + foundIndex;
        } else {
          foundIndex = -1;
        }
      }
      return -1;
    }
    throw new TypeError('val must be string, number or Buffer');
  };
  Buffer.prototype.get = function get(offset) {
    console.log('.get() is deprecated. Access using array indexes instead.');
    return this.readUInt8(offset);
  };
  Buffer.prototype.set = function set(v, offset) {
    console.log('.set() is deprecated. Access using array indexes instead.');
    return this.writeUInt8(v, offset);
  };
  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }
    var strLen = string.length;
    if (strLen % 2 !== 0)
      throw new Error('Invalid hex string');
    if (length > strLen / 2) {
      length = strLen / 2;
    }
    for (var i = 0; i < length; i++) {
      var parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed))
        throw new Error('Invalid hex string');
      buf[offset + i] = parsed;
    }
    return i;
  }
  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }
  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }
  function binaryWrite(buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length);
  }
  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }
  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }
  Buffer.prototype.write = function write(string, offset, length, encoding) {
    if (offset === undefined) {
      encoding = 'utf8';
      length = this.length;
      offset = 0;
    } else if (length === undefined && typeof offset === 'string') {
      encoding = offset;
      length = this.length;
      offset = 0;
    } else if (isFinite(offset)) {
      offset = offset | 0;
      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined)
          encoding = 'utf8';
      } else {
        encoding = length;
        length = undefined;
      }
    } else {
      var swap = encoding;
      encoding = offset;
      offset = length | 0;
      length = swap;
    }
    var remaining = this.length - offset;
    if (length === undefined || length > remaining)
      length = remaining;
    if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
      throw new RangeError('attempt to write outside buffer bounds');
    }
    if (!encoding)
      encoding = 'utf8';
    var loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case 'hex':
          return hexWrite(this, string, offset, length);
        case 'utf8':
        case 'utf-8':
          return utf8Write(this, string, offset, length);
        case 'ascii':
          return asciiWrite(this, string, offset, length);
        case 'binary':
          return binaryWrite(this, string, offset, length);
        case 'base64':
          return base64Write(this, string, offset, length);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return ucs2Write(this, string, offset, length);
        default:
          if (loweredCase)
            throw new TypeError('Unknown encoding: ' + encoding);
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };
  Buffer.prototype.toJSON = function toJSON() {
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf);
    } else {
      return base64.fromByteArray(buf.slice(start, end));
    }
  }
  function utf8Slice(buf, start, end) {
    var res = '';
    var tmp = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; i++) {
      if (buf[i] <= 0x7F) {
        res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i]);
        tmp = '';
      } else {
        tmp += '%' + buf[i].toString(16);
      }
    }
    return res + decodeUtf8Char(tmp);
  }
  function asciiSlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; i++) {
      ret += String.fromCharCode(buf[i] & 0x7F);
    }
    return ret;
  }
  function binarySlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; i++) {
      ret += String.fromCharCode(buf[i]);
    }
    return ret;
  }
  function hexSlice(buf, start, end) {
    var len = buf.length;
    if (!start || start < 0)
      start = 0;
    if (!end || end < 0 || end > len)
      end = len;
    var out = '';
    for (var i = start; i < end; i++) {
      out += toHex(buf[i]);
    }
    return out;
  }
  function utf16leSlice(buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';
    for (var i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res;
  }
  Buffer.prototype.slice = function slice(start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;
    if (start < 0) {
      start += len;
      if (start < 0)
        start = 0;
    } else if (start > len) {
      start = len;
    }
    if (end < 0) {
      end += len;
      if (end < 0)
        end = 0;
    } else if (end > len) {
      end = len;
    }
    if (end < start)
      end = start;
    var newBuf;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      newBuf = Buffer._augment(this.subarray(start, end));
    } else {
      var sliceLen = end - start;
      newBuf = new Buffer(sliceLen, undefined);
      for (var i = 0; i < sliceLen; i++) {
        newBuf[i] = this[i + start];
      }
    }
    if (newBuf.length)
      newBuf.parent = this.parent || this;
    return newBuf;
  };
  function checkOffset(offset, ext, length) {
    if ((offset % 1) !== 0 || offset < 0)
      throw new RangeError('offset is not uint');
    if (offset + ext > length)
      throw new RangeError('Trying to access beyond buffer length');
  }
  Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    return val;
  };
  Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }
    var val = this[offset + --byteLength];
    var mul = 1;
    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }
    return val;
  };
  Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 1, this.length);
    return this[offset];
  };
  Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    return this[offset] | (this[offset + 1] << 8);
  };
  Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    return (this[offset] << 8) | this[offset + 1];
  };
  Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return ((this[offset]) | (this[offset + 1] << 8) | (this[offset + 2] << 16)) + (this[offset + 3] * 0x1000000);
  };
  Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return (this[offset] * 0x1000000) + ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3]);
  };
  Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    mul *= 0x80;
    if (val >= mul)
      val -= Math.pow(2, 8 * byteLength);
    return val;
  };
  Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkOffset(offset, byteLength, this.length);
    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];
    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }
    mul *= 0x80;
    if (val >= mul)
      val -= Math.pow(2, 8 * byteLength);
    return val;
  };
  Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80))
      return (this[offset]);
    return ((0xff - this[offset] + 1) * -1);
  };
  Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    var val = this[offset] | (this[offset + 1] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val;
  };
  Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | (this[offset] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val;
  };
  Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return (this[offset]) | (this[offset + 1] << 8) | (this[offset + 2] << 16) | (this[offset + 3] << 24);
  };
  Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return (this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | (this[offset + 3]);
  };
  Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, true, 23, 4);
  };
  Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, false, 23, 4);
  };
  Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, true, 52, 8);
  };
  Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, false, 52, 8);
  };
  function checkInt(buf, value, offset, ext, max, min) {
    if (!Buffer.isBuffer(buf))
      throw new TypeError('buffer must be a Buffer instance');
    if (value > max || value < min)
      throw new RangeError('value is out of bounds');
    if (offset + ext > buf.length)
      throw new RangeError('index out of range');
  }
  Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 1, 0xff, 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT)
      value = Math.floor(value);
    this[offset] = value;
    return offset + 1;
  };
  function objectWriteUInt16(buf, value, offset, littleEndian) {
    if (value < 0)
      value = 0xffff + value + 1;
    for (var i = 0,
        j = Math.min(buf.length - offset, 2); i < j; i++) {
      buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>> (littleEndian ? i : 1 - i) * 8;
    }
  }
  Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value;
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2;
  };
  Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = value;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2;
  };
  function objectWriteUInt32(buf, value, offset, littleEndian) {
    if (value < 0)
      value = 0xffffffff + value + 1;
    for (var i = 0,
        j = Math.min(buf.length - offset, 4); i < j; i++) {
      buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
    }
  }
  Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = (value >>> 24);
      this[offset + 2] = (value >>> 16);
      this[offset + 1] = (value >>> 8);
      this[offset] = value;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4;
  };
  Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = value;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4;
  };
  Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }
    var i = 0;
    var mul = 1;
    var sub = value < 0 ? 1 : 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }
    var i = byteLength - 1;
    var mul = 1;
    var sub = value < 0 ? 1 : 0;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (!Buffer.TYPED_ARRAY_SUPPORT)
      value = Math.floor(value);
    if (value < 0)
      value = 0xff + value + 1;
    this[offset] = value;
    return offset + 1;
  };
  Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value;
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2;
  };
  Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = value;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2;
  };
  Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value;
      this[offset + 1] = (value >>> 8);
      this[offset + 2] = (value >>> 16);
      this[offset + 3] = (value >>> 24);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4;
  };
  Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (value < 0)
      value = 0xffffffff + value + 1;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = value;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4;
  };
  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (value > max || value < min)
      throw new RangeError('value is out of bounds');
    if (offset + ext > buf.length)
      throw new RangeError('index out of range');
    if (offset < 0)
      throw new RangeError('index out of range');
  }
  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
    }
    ieee754.write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }
  Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };
  Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };
  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
    }
    ieee754.write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }
  Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };
  Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  };
  Buffer.prototype.copy = function copy(target, targetStart, start, end) {
    if (!start)
      start = 0;
    if (!end && end !== 0)
      end = this.length;
    if (targetStart >= target.length)
      targetStart = target.length;
    if (!targetStart)
      targetStart = 0;
    if (end > 0 && end < start)
      end = start;
    if (end === start)
      return 0;
    if (target.length === 0 || this.length === 0)
      return 0;
    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds');
    }
    if (start < 0 || start >= this.length)
      throw new RangeError('sourceStart out of bounds');
    if (end < 0)
      throw new RangeError('sourceEnd out of bounds');
    if (end > this.length)
      end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }
    var len = end - start;
    if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < len; i++) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      target._set(this.subarray(start, start + len), targetStart);
    }
    return len;
  };
  Buffer.prototype.fill = function fill(value, start, end) {
    if (!value)
      value = 0;
    if (!start)
      start = 0;
    if (!end)
      end = this.length;
    if (end < start)
      throw new RangeError('end < start');
    if (end === start)
      return ;
    if (this.length === 0)
      return ;
    if (start < 0 || start >= this.length)
      throw new RangeError('start out of bounds');
    if (end < 0 || end > this.length)
      throw new RangeError('end out of bounds');
    var i;
    if (typeof value === 'number') {
      for (i = start; i < end; i++) {
        this[i] = value;
      }
    } else {
      var bytes = utf8ToBytes(value.toString());
      var len = bytes.length;
      for (i = start; i < end; i++) {
        this[i] = bytes[i % len];
      }
    }
    return this;
  };
  Buffer.prototype.toArrayBuffer = function toArrayBuffer() {
    if (typeof Uint8Array !== 'undefined') {
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        return (new Buffer(this)).buffer;
      } else {
        var buf = new Uint8Array(this.length);
        for (var i = 0,
            len = buf.length; i < len; i += 1) {
          buf[i] = this[i];
        }
        return buf.buffer;
      }
    } else {
      throw new TypeError('Buffer.toArrayBuffer not supported in this browser');
    }
  };
  var BP = Buffer.prototype;
  Buffer._augment = function _augment(arr) {
    arr.constructor = Buffer;
    arr._isBuffer = true;
    arr._set = arr.set;
    arr.get = BP.get;
    arr.set = BP.set;
    arr.write = BP.write;
    arr.toString = BP.toString;
    arr.toLocaleString = BP.toString;
    arr.toJSON = BP.toJSON;
    arr.equals = BP.equals;
    arr.compare = BP.compare;
    arr.indexOf = BP.indexOf;
    arr.copy = BP.copy;
    arr.slice = BP.slice;
    arr.readUIntLE = BP.readUIntLE;
    arr.readUIntBE = BP.readUIntBE;
    arr.readUInt8 = BP.readUInt8;
    arr.readUInt16LE = BP.readUInt16LE;
    arr.readUInt16BE = BP.readUInt16BE;
    arr.readUInt32LE = BP.readUInt32LE;
    arr.readUInt32BE = BP.readUInt32BE;
    arr.readIntLE = BP.readIntLE;
    arr.readIntBE = BP.readIntBE;
    arr.readInt8 = BP.readInt8;
    arr.readInt16LE = BP.readInt16LE;
    arr.readInt16BE = BP.readInt16BE;
    arr.readInt32LE = BP.readInt32LE;
    arr.readInt32BE = BP.readInt32BE;
    arr.readFloatLE = BP.readFloatLE;
    arr.readFloatBE = BP.readFloatBE;
    arr.readDoubleLE = BP.readDoubleLE;
    arr.readDoubleBE = BP.readDoubleBE;
    arr.writeUInt8 = BP.writeUInt8;
    arr.writeUIntLE = BP.writeUIntLE;
    arr.writeUIntBE = BP.writeUIntBE;
    arr.writeUInt16LE = BP.writeUInt16LE;
    arr.writeUInt16BE = BP.writeUInt16BE;
    arr.writeUInt32LE = BP.writeUInt32LE;
    arr.writeUInt32BE = BP.writeUInt32BE;
    arr.writeIntLE = BP.writeIntLE;
    arr.writeIntBE = BP.writeIntBE;
    arr.writeInt8 = BP.writeInt8;
    arr.writeInt16LE = BP.writeInt16LE;
    arr.writeInt16BE = BP.writeInt16BE;
    arr.writeInt32LE = BP.writeInt32LE;
    arr.writeInt32BE = BP.writeInt32BE;
    arr.writeFloatLE = BP.writeFloatLE;
    arr.writeFloatBE = BP.writeFloatBE;
    arr.writeDoubleLE = BP.writeDoubleLE;
    arr.writeDoubleBE = BP.writeDoubleBE;
    arr.fill = BP.fill;
    arr.inspect = BP.inspect;
    arr.toArrayBuffer = BP.toArrayBuffer;
    return arr;
  };
  var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g;
  function base64clean(str) {
    str = stringtrim(str).replace(INVALID_BASE64_RE, '');
    if (str.length < 2)
      return '';
    while (str.length % 4 !== 0) {
      str = str + '=';
    }
    return str;
  }
  function stringtrim(str) {
    if (str.trim)
      return str.trim();
    return str.replace(/^\s+|\s+$/g, '');
  }
  function toHex(n) {
    if (n < 16)
      return '0' + n.toString(16);
    return n.toString(16);
  }
  function utf8ToBytes(string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];
    var i = 0;
    for (; i < length; i++) {
      codePoint = string.charCodeAt(i);
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        if (leadSurrogate) {
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1)
              bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue;
          } else {
            codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000;
            leadSurrogate = null;
          }
        } else {
          if (codePoint > 0xDBFF) {
            if ((units -= 3) > -1)
              bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } else if (i + 1 === length) {
            if ((units -= 3) > -1)
              bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } else {
            leadSurrogate = codePoint;
            continue;
          }
        }
      } else if (leadSurrogate) {
        if ((units -= 3) > -1)
          bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = null;
      }
      if (codePoint < 0x80) {
        if ((units -= 1) < 0)
          break;
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0)
          break;
        bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0)
          break;
        bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x200000) {
        if ((units -= 4) < 0)
          break;
        bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else {
        throw new Error('Invalid code point');
      }
    }
    return bytes;
  }
  function asciiToBytes(str) {
    var byteArray = [];
    for (var i = 0; i < str.length; i++) {
      byteArray.push(str.charCodeAt(i) & 0xFF);
    }
    return byteArray;
  }
  function utf16leToBytes(str, units) {
    var c,
        hi,
        lo;
    var byteArray = [];
    for (var i = 0; i < str.length; i++) {
      if ((units -= 2) < 0)
        break;
      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }
    return byteArray;
  }
  function base64ToBytes(str) {
    return base64.toByteArray(base64clean(str));
  }
  function blitBuffer(src, dst, offset, length) {
    for (var i = 0; i < length; i++) {
      if ((i + offset >= dst.length) || (i >= src.length))
        break;
      dst[i + offset] = src[i];
    }
    return i;
  }
  function decodeUtf8Char(str) {
    try {
      return decodeURIComponent(str);
    } catch (err) {
      return String.fromCharCode(0xFFFD);
    }
  }
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-process@0.1.1/index", ["npm:process@0.10.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? process : require("npm:process@0.10.1");
  global.define = __define;
  return module.exports;
});

System.register("npm:debug@2.2.0/browser", ["npm:debug@2.2.0/debug"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  exports = module.exports = require("npm:debug@2.2.0/debug");
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = 'undefined' != typeof chrome && 'undefined' != typeof chrome.storage ? chrome.storage.local : localstorage();
  exports.colors = ['lightseagreen', 'forestgreen', 'goldenrod', 'dodgerblue', 'darkorchid', 'crimson'];
  function useColors() {
    return ('WebkitAppearance' in document.documentElement.style) || (window.console && (console.firebug || (console.exception && console.table))) || (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
  }
  exports.formatters.j = function(v) {
    return JSON.stringify(v);
  };
  function formatArgs() {
    var args = arguments;
    var useColors = this.useColors;
    args[0] = (useColors ? '%c' : '') + this.namespace + (useColors ? ' %c' : ' ') + args[0] + (useColors ? '%c ' : ' ') + '+' + exports.humanize(this.diff);
    if (!useColors)
      return args;
    var c = 'color: ' + this.color;
    args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));
    var index = 0;
    var lastC = 0;
    args[0].replace(/%[a-z%]/g, function(match) {
      if ('%%' === match)
        return ;
      index++;
      if ('%c' === match) {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
    return args;
  }
  function log() {
    return 'object' === typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments);
  }
  function save(namespaces) {
    try {
      if (null == namespaces) {
        exports.storage.removeItem('debug');
      } else {
        exports.storage.debug = namespaces;
      }
    } catch (e) {}
  }
  function load() {
    var r;
    try {
      r = exports.storage.debug;
    } catch (e) {}
    return r;
  }
  exports.enable(load());
  function localstorage() {
    try {
      return window.localStorage;
    } catch (e) {}
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:once@1.3.2", ["npm:once@1.3.2/once"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:once@1.3.2/once");
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-events@0.1.1", ["github:jspm/nodelibs-events@0.1.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-events@0.1.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:buffer@3.3.0", ["npm:buffer@3.3.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:buffer@3.3.0/index");
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-process@0.1.1", ["github:jspm/nodelibs-process@0.1.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-process@0.1.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:debug@2.2.0", ["npm:debug@2.2.0/browser"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:debug@2.2.0/browser");
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-buffer@0.1.0/index", ["npm:buffer@3.3.0"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('buffer') : require("npm:buffer@3.3.0");
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/lib/_stream_writable", ["github:jspm/nodelibs-buffer@0.1.0", "npm:core-util-is@1.0.1", "npm:inherits@2.0.1", "npm:stream-browserify@1.0.0/index", "npm:readable-stream@1.1.13/lib/_stream_duplex", "npm:readable-stream@1.1.13/lib/_stream_duplex", "github:jspm/nodelibs-buffer@0.1.0", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(Buffer, process) {
    module.exports = Writable;
    var Buffer = require("github:jspm/nodelibs-buffer@0.1.0").Buffer;
    Writable.WritableState = WritableState;
    var util = require("npm:core-util-is@1.0.1");
    util.inherits = require("npm:inherits@2.0.1");
    var Stream = require("npm:stream-browserify@1.0.0/index");
    util.inherits(Writable, Stream);
    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
    }
    function WritableState(options, stream) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
      options = options || {};
      var hwm = options.highWaterMark;
      var defaultHwm = options.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;
      this.objectMode = !!options.objectMode;
      if (stream instanceof Duplex)
        this.objectMode = this.objectMode || !!options.writableObjectMode;
      this.highWaterMark = ~~this.highWaterMark;
      this.needDrain = false;
      this.ending = false;
      this.ended = false;
      this.finished = false;
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;
      this.defaultEncoding = options.defaultEncoding || 'utf8';
      this.length = 0;
      this.writing = false;
      this.corked = 0;
      this.sync = true;
      this.bufferProcessing = false;
      this.onwrite = function(er) {
        onwrite(stream, er);
      };
      this.writecb = null;
      this.writelen = 0;
      this.buffer = [];
      this.pendingcb = 0;
      this.prefinished = false;
      this.errorEmitted = false;
    }
    function Writable(options) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
      if (!(this instanceof Writable) && !(this instanceof Duplex))
        return new Writable(options);
      this._writableState = new WritableState(options, this);
      this.writable = true;
      Stream.call(this);
    }
    Writable.prototype.pipe = function() {
      this.emit('error', new Error('Cannot pipe. Not readable.'));
    };
    function writeAfterEnd(stream, state, cb) {
      var er = new Error('write after end');
      stream.emit('error', er);
      process.nextTick(function() {
        cb(er);
      });
    }
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      if (!util.isBuffer(chunk) && !util.isString(chunk) && !util.isNullOrUndefined(chunk) && !state.objectMode) {
        var er = new TypeError('Invalid non-string/buffer chunk');
        stream.emit('error', er);
        process.nextTick(function() {
          cb(er);
        });
        valid = false;
      }
      return valid;
    }
    Writable.prototype.write = function(chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;
      if (util.isFunction(encoding)) {
        cb = encoding;
        encoding = null;
      }
      if (util.isBuffer(chunk))
        encoding = 'buffer';
      else if (!encoding)
        encoding = state.defaultEncoding;
      if (!util.isFunction(cb))
        cb = function() {};
      if (state.ended)
        writeAfterEnd(this, state, cb);
      else if (validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
      }
      return ret;
    };
    Writable.prototype.cork = function() {
      var state = this._writableState;
      state.corked++;
    };
    Writable.prototype.uncork = function() {
      var state = this._writableState;
      if (state.corked) {
        state.corked--;
        if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.buffer.length)
          clearBuffer(this, state);
      }
    };
    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && util.isString(chunk)) {
        chunk = new Buffer(chunk, encoding);
      }
      return chunk;
    }
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);
      if (util.isBuffer(chunk))
        encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;
      state.length += len;
      var ret = state.length < state.highWaterMark;
      if (!ret)
        state.needDrain = true;
      if (state.writing || state.corked)
        state.buffer.push(new WriteReq(chunk, encoding, cb));
      else
        doWrite(stream, state, false, len, chunk, encoding, cb);
      return ret;
    }
    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev)
        stream._writev(chunk, state.onwrite);
      else
        stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    function onwriteError(stream, state, sync, er, cb) {
      if (sync)
        process.nextTick(function() {
          state.pendingcb--;
          cb(er);
        });
      else {
        state.pendingcb--;
        cb(er);
      }
      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }
    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }
    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;
      onwriteStateUpdate(state);
      if (er)
        onwriteError(stream, state, sync, er, cb);
      else {
        var finished = needFinish(stream, state);
        if (!finished && !state.corked && !state.bufferProcessing && state.buffer.length) {
          clearBuffer(stream, state);
        }
        if (sync) {
          process.nextTick(function() {
            afterWrite(stream, state, finished, cb);
          });
        } else {
          afterWrite(stream, state, finished, cb);
        }
      }
    }
    function afterWrite(stream, state, finished, cb) {
      if (!finished)
        onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      if (stream._writev && state.buffer.length > 1) {
        var cbs = [];
        for (var c = 0; c < state.buffer.length; c++)
          cbs.push(state.buffer[c].callback);
        state.pendingcb++;
        doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
          for (var i = 0; i < cbs.length; i++) {
            state.pendingcb--;
            cbs[i](err);
          }
        });
        state.buffer = [];
      } else {
        for (var c = 0; c < state.buffer.length; c++) {
          var entry = state.buffer[c];
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;
          doWrite(stream, state, false, len, chunk, encoding, cb);
          if (state.writing) {
            c++;
            break;
          }
        }
        if (c < state.buffer.length)
          state.buffer = state.buffer.slice(c);
        else
          state.buffer.length = 0;
      }
      state.bufferProcessing = false;
    }
    Writable.prototype._write = function(chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };
    Writable.prototype._writev = null;
    Writable.prototype.end = function(chunk, encoding, cb) {
      var state = this._writableState;
      if (util.isFunction(chunk)) {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (util.isFunction(encoding)) {
        cb = encoding;
        encoding = null;
      }
      if (!util.isNullOrUndefined(chunk))
        this.write(chunk, encoding);
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }
      if (!state.ending && !state.finished)
        endWritable(this, state, cb);
    };
    function needFinish(stream, state) {
      return (state.ending && state.length === 0 && !state.finished && !state.writing);
    }
    function prefinish(stream, state) {
      if (!state.prefinished) {
        state.prefinished = true;
        stream.emit('prefinish');
      }
    }
    function finishMaybe(stream, state) {
      var need = needFinish(stream, state);
      if (need) {
        if (state.pendingcb === 0) {
          prefinish(stream, state);
          state.finished = true;
          stream.emit('finish');
        } else
          prefinish(stream, state);
      }
      return need;
    }
    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished)
          process.nextTick(cb);
        else
          stream.once('finish', cb);
      }
      state.ended = true;
    }
  })(require("github:jspm/nodelibs-buffer@0.1.0").Buffer, require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-buffer@0.1.0", ["github:jspm/nodelibs-buffer@0.1.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-buffer@0.1.0/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/lib/_stream_duplex", ["npm:core-util-is@1.0.1", "npm:inherits@2.0.1", "npm:readable-stream@1.1.13/lib/_stream_readable", "npm:readable-stream@1.1.13/lib/_stream_writable", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    module.exports = Duplex;
    var objectKeys = Object.keys || function(obj) {
      var keys = [];
      for (var key in obj)
        keys.push(key);
      return keys;
    };
    var util = require("npm:core-util-is@1.0.1");
    util.inherits = require("npm:inherits@2.0.1");
    var Readable = require("npm:readable-stream@1.1.13/lib/_stream_readable");
    var Writable = require("npm:readable-stream@1.1.13/lib/_stream_writable");
    util.inherits(Duplex, Readable);
    forEach(objectKeys(Writable.prototype), function(method) {
      if (!Duplex.prototype[method])
        Duplex.prototype[method] = Writable.prototype[method];
    });
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
      Readable.call(this, options);
      Writable.call(this, options);
      if (options && options.readable === false)
        this.readable = false;
      if (options && options.writable === false)
        this.writable = false;
      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false)
        this.allowHalfOpen = false;
      this.once('end', onend);
    }
    function onend() {
      if (this.allowHalfOpen || this._writableState.ended)
        return ;
      process.nextTick(this.end.bind(this));
    }
    function forEach(xs, f) {
      for (var i = 0,
          l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/lib/_stream_readable", ["npm:isarray@0.0.1", "github:jspm/nodelibs-buffer@0.1.0", "github:jspm/nodelibs-events@0.1.1", "npm:stream-browserify@1.0.0/index", "npm:core-util-is@1.0.1", "npm:inherits@2.0.1", "@empty", "npm:readable-stream@1.1.13/lib/_stream_duplex", "npm:string_decoder@0.10.31", "npm:readable-stream@1.1.13/lib/_stream_duplex", "npm:string_decoder@0.10.31", "github:jspm/nodelibs-buffer@0.1.0", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(Buffer, process) {
    module.exports = Readable;
    var isArray = require("npm:isarray@0.0.1");
    var Buffer = require("github:jspm/nodelibs-buffer@0.1.0").Buffer;
    Readable.ReadableState = ReadableState;
    var EE = require("github:jspm/nodelibs-events@0.1.1").EventEmitter;
    if (!EE.listenerCount)
      EE.listenerCount = function(emitter, type) {
        return emitter.listeners(type).length;
      };
    var Stream = require("npm:stream-browserify@1.0.0/index");
    var util = require("npm:core-util-is@1.0.1");
    util.inherits = require("npm:inherits@2.0.1");
    var StringDecoder;
    var debug = require("@empty");
    if (debug && debug.debuglog) {
      debug = debug.debuglog('stream');
    } else {
      debug = function() {};
    }
    util.inherits(Readable, Stream);
    function ReadableState(options, stream) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
      options = options || {};
      var hwm = options.highWaterMark;
      var defaultHwm = options.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;
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
      this.objectMode = !!options.objectMode;
      if (stream instanceof Duplex)
        this.objectMode = this.objectMode || !!options.readableObjectMode;
      this.defaultEncoding = options.defaultEncoding || 'utf8';
      this.ranOut = false;
      this.awaitDrain = 0;
      this.readingMore = false;
      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        if (!StringDecoder)
          StringDecoder = require("npm:string_decoder@0.10.31").StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
      if (!(this instanceof Readable))
        return new Readable(options);
      this._readableState = new ReadableState(options, this);
      this.readable = true;
      Stream.call(this);
    }
    Readable.prototype.push = function(chunk, encoding) {
      var state = this._readableState;
      if (util.isString(chunk) && !state.objectMode) {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = new Buffer(chunk, encoding);
          encoding = '';
        }
      }
      return readableAddChunk(this, state, chunk, encoding, false);
    };
    Readable.prototype.unshift = function(chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };
    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (util.isNullOrUndefined(chunk)) {
        state.reading = false;
        if (!state.ended)
          onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var e = new Error('stream.unshift() after end event');
          stream.emit('error', e);
        } else {
          if (state.decoder && !addToFront && !encoding)
            chunk = state.decoder.write(chunk);
          if (!addToFront)
            state.reading = false;
          if (state.flowing && state.length === 0 && !state.sync) {
            stream.emit('data', chunk);
            stream.read(0);
          } else {
            state.length += state.objectMode ? 1 : chunk.length;
            if (addToFront)
              state.buffer.unshift(chunk);
            else
              state.buffer.push(chunk);
            if (state.needReadable)
              emitReadable(stream);
          }
          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }
      return needMoreData(state);
    }
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }
    Readable.prototype.setEncoding = function(enc) {
      if (!StringDecoder)
        StringDecoder = require("npm:string_decoder@0.10.31").StringDecoder;
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };
    var MAX_HWM = 0x800000;
    function roundUpToNextPowerOf2(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        n--;
        for (var p = 1; p < 32; p <<= 1)
          n |= n >> p;
        n++;
      }
      return n;
    }
    function howMuchToRead(n, state) {
      if (state.length === 0 && state.ended)
        return 0;
      if (state.objectMode)
        return n === 0 ? 0 : 1;
      if (isNaN(n) || util.isNull(n)) {
        if (state.flowing && state.buffer.length)
          return state.buffer[0].length;
        else
          return state.length;
      }
      if (n <= 0)
        return 0;
      if (n > state.highWaterMark)
        state.highWaterMark = roundUpToNextPowerOf2(n);
      if (n > state.length) {
        if (!state.ended) {
          state.needReadable = true;
          return 0;
        } else
          return state.length;
      }
      return n;
    }
    Readable.prototype.read = function(n) {
      debug('read', n);
      var state = this._readableState;
      var nOrig = n;
      if (!util.isNumber(n) || n > 0)
        state.emittedReadable = false;
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug('read: emitReadable', state.length, state.ended);
        if (state.length === 0 && state.ended)
          endReadable(this);
        else
          emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state);
      if (n === 0 && state.ended) {
        if (state.length === 0)
          endReadable(this);
        return null;
      }
      var doRead = state.needReadable;
      debug('need readable', doRead);
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug('length less than watermark', doRead);
      }
      if (state.ended || state.reading) {
        doRead = false;
        debug('reading or ended', doRead);
      }
      if (doRead) {
        debug('do read');
        state.reading = true;
        state.sync = true;
        if (state.length === 0)
          state.needReadable = true;
        this._read(state.highWaterMark);
        state.sync = false;
      }
      if (doRead && !state.reading)
        n = howMuchToRead(nOrig, state);
      var ret;
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
      if (util.isNull(ret)) {
        state.needReadable = true;
        n = 0;
      }
      state.length -= n;
      if (state.length === 0 && !state.ended)
        state.needReadable = true;
      if (nOrig !== n && state.ended && state.length === 0)
        endReadable(this);
      if (!util.isNull(ret))
        this.emit('data', ret);
      return ret;
    };
    function chunkInvalid(state, chunk) {
      var er = null;
      if (!util.isBuffer(chunk) && !util.isString(chunk) && !util.isNullOrUndefined(chunk) && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }
    function onEofChunk(stream, state) {
      if (state.decoder && !state.ended) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
      emitReadable(stream);
    }
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug('emitReadable', state.flowing);
        state.emittedReadable = true;
        if (state.sync)
          process.nextTick(function() {
            emitReadable_(stream);
          });
        else
          emitReadable_(stream);
      }
    }
    function emitReadable_(stream) {
      debug('emit readable');
      stream.emit('readable');
      flow(stream);
    }
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        process.nextTick(function() {
          maybeReadMore_(stream, state);
        });
      }
    }
    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug('maybeReadMore read 0');
        stream.read(0);
        if (len === state.length)
          break;
        else
          len = state.length;
      }
      state.readingMore = false;
    }
    Readable.prototype._read = function(n) {
      this.emit('error', new Error('not implemented'));
    };
    Readable.prototype.pipe = function(dest, pipeOpts) {
      var src = this;
      var state = this._readableState;
      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
      var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted)
        process.nextTick(endFn);
      else
        src.once('end', endFn);
      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        debug('onunpipe');
        if (readable === src) {
          cleanup();
        }
      }
      function onend() {
        debug('onend');
        dest.end();
      }
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);
      function cleanup() {
        debug('cleanup');
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
        src.removeListener('data', ondata);
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
          ondrain();
      }
      src.on('data', ondata);
      function ondata(chunk) {
        debug('ondata');
        var ret = dest.write(chunk);
        if (false === ret) {
          debug('false write response, pause', src._readableState.awaitDrain);
          src._readableState.awaitDrain++;
          src.pause();
        }
      }
      function onerror(er) {
        debug('onerror', er);
        unpipe();
        dest.removeListener('error', onerror);
        if (EE.listenerCount(dest, 'error') === 0)
          dest.emit('error', er);
      }
      if (!dest._events || !dest._events.error)
        dest.on('error', onerror);
      else if (isArray(dest._events.error))
        dest._events.error.unshift(onerror);
      else
        dest._events.error = [onerror, dest._events.error];
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        debug('onfinish');
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);
      function unpipe() {
        debug('unpipe');
        src.unpipe(dest);
      }
      dest.emit('pipe', src);
      if (!state.flowing) {
        debug('pipe resume');
        src.resume();
      }
      return dest;
    };
    function pipeOnDrain(src) {
      return function() {
        var state = src._readableState;
        debug('pipeOnDrain', state.awaitDrain);
        if (state.awaitDrain)
          state.awaitDrain--;
        if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
          state.flowing = true;
          flow(src);
        }
      };
    }
    Readable.prototype.unpipe = function(dest) {
      var state = this._readableState;
      if (state.pipesCount === 0)
        return this;
      if (state.pipesCount === 1) {
        if (dest && dest !== state.pipes)
          return this;
        if (!dest)
          dest = state.pipes;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest)
          dest.emit('unpipe', this);
        return this;
      }
      if (!dest) {
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        for (var i = 0; i < len; i++)
          dests[i].emit('unpipe', this);
        return this;
      }
      var i = indexOf(state.pipes, dest);
      if (i === -1)
        return this;
      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1)
        state.pipes = state.pipes[0];
      dest.emit('unpipe', this);
      return this;
    };
    Readable.prototype.on = function(ev, fn) {
      var res = Stream.prototype.on.call(this, ev, fn);
      if (ev === 'data' && false !== this._readableState.flowing) {
        this.resume();
      }
      if (ev === 'readable' && this.readable) {
        var state = this._readableState;
        if (!state.readableListening) {
          state.readableListening = true;
          state.emittedReadable = false;
          state.needReadable = true;
          if (!state.reading) {
            var self = this;
            process.nextTick(function() {
              debug('readable nexttick read 0');
              self.read(0);
            });
          } else if (state.length) {
            emitReadable(this, state);
          }
        }
      }
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    Readable.prototype.resume = function() {
      var state = this._readableState;
      if (!state.flowing) {
        debug('resume');
        state.flowing = true;
        if (!state.reading) {
          debug('resume read 0');
          this.read(0);
        }
        resume(this, state);
      }
      return this;
    };
    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        process.nextTick(function() {
          resume_(stream, state);
        });
      }
    }
    function resume_(stream, state) {
      state.resumeScheduled = false;
      stream.emit('resume');
      flow(stream);
      if (state.flowing && !state.reading)
        stream.read(0);
    }
    Readable.prototype.pause = function() {
      debug('call pause flowing=%j', this._readableState.flowing);
      if (false !== this._readableState.flowing) {
        debug('pause');
        this._readableState.flowing = false;
        this.emit('pause');
      }
      return this;
    };
    function flow(stream) {
      var state = stream._readableState;
      debug('flow', state.flowing);
      if (state.flowing) {
        do {
          var chunk = stream.read();
        } while (null !== chunk && state.flowing);
      }
    }
    Readable.prototype.wrap = function(stream) {
      var state = this._readableState;
      var paused = false;
      var self = this;
      stream.on('end', function() {
        debug('wrapped end');
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length)
            self.push(chunk);
        }
        self.push(null);
      });
      stream.on('data', function(chunk) {
        debug('wrapped data');
        if (state.decoder)
          chunk = state.decoder.write(chunk);
        if (!chunk || !state.objectMode && !chunk.length)
          return ;
        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });
      for (var i in stream) {
        if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
          this[i] = function(method) {
            return function() {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function(ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });
      self._read = function(n) {
        debug('wrapped _read', n);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };
      return self;
    };
    Readable._fromList = fromList;
    function fromList(n, state) {
      var list = state.buffer;
      var length = state.length;
      var stringMode = !!state.decoder;
      var objectMode = !!state.objectMode;
      var ret;
      if (list.length === 0)
        return null;
      if (length === 0)
        ret = null;
      else if (objectMode)
        ret = list.shift();
      else if (!n || n >= length) {
        if (stringMode)
          ret = list.join('');
        else
          ret = Buffer.concat(list, length);
        list.length = 0;
      } else {
        if (n < list[0].length) {
          var buf = list[0];
          ret = buf.slice(0, n);
          list[0] = buf.slice(n);
        } else if (n === list[0].length) {
          ret = list.shift();
        } else {
          if (stringMode)
            ret = '';
          else
            ret = new Buffer(n);
          var c = 0;
          for (var i = 0,
              l = list.length; i < l && c < n; i++) {
            var buf = list[0];
            var cpy = Math.min(n - c, buf.length);
            if (stringMode)
              ret += buf.slice(0, cpy);
            else
              buf.copy(ret, c, 0, cpy);
            if (cpy < buf.length)
              list[0] = buf.slice(cpy);
            else
              list.shift();
            c += cpy;
          }
        }
      }
      return ret;
    }
    function endReadable(stream) {
      var state = stream._readableState;
      if (state.length > 0)
        throw new Error('endReadable called on non-empty stream');
      if (!state.endEmitted) {
        state.ended = true;
        process.nextTick(function() {
          if (!state.endEmitted && state.length === 0) {
            state.endEmitted = true;
            stream.readable = false;
            stream.emit('end');
          }
        });
      }
    }
    function forEach(xs, f) {
      for (var i = 0,
          l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
    function indexOf(xs, x) {
      for (var i = 0,
          l = xs.length; i < l; i++) {
        if (xs[i] === x)
          return i;
      }
      return -1;
    }
  })(require("github:jspm/nodelibs-buffer@0.1.0").Buffer, require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:readable-stream@1.1.13/readable", ["npm:readable-stream@1.1.13/lib/_stream_readable", "npm:stream-browserify@1.0.0/index", "npm:readable-stream@1.1.13/lib/_stream_writable", "npm:readable-stream@1.1.13/lib/_stream_duplex", "npm:readable-stream@1.1.13/lib/_stream_transform", "npm:readable-stream@1.1.13/lib/_stream_passthrough"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  exports = module.exports = require("npm:readable-stream@1.1.13/lib/_stream_readable");
  exports.Stream = require("npm:stream-browserify@1.0.0/index");
  exports.Readable = exports;
  exports.Writable = require("npm:readable-stream@1.1.13/lib/_stream_writable");
  exports.Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex");
  exports.Transform = require("npm:readable-stream@1.1.13/lib/_stream_transform");
  exports.PassThrough = require("npm:readable-stream@1.1.13/lib/_stream_passthrough");
  global.define = __define;
  return module.exports;
});

System.register("npm:stream-browserify@1.0.0/index", ["github:jspm/nodelibs-events@0.1.1", "npm:inherits@2.0.1", "npm:readable-stream@1.1.13/readable", "npm:readable-stream@1.1.13/writable", "npm:readable-stream@1.1.13/duplex", "npm:readable-stream@1.1.13/transform", "npm:readable-stream@1.1.13/passthrough"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = Stream;
  var EE = require("github:jspm/nodelibs-events@0.1.1").EventEmitter;
  var inherits = require("npm:inherits@2.0.1");
  inherits(Stream, EE);
  Stream.Readable = require("npm:readable-stream@1.1.13/readable");
  Stream.Writable = require("npm:readable-stream@1.1.13/writable");
  Stream.Duplex = require("npm:readable-stream@1.1.13/duplex");
  Stream.Transform = require("npm:readable-stream@1.1.13/transform");
  Stream.PassThrough = require("npm:readable-stream@1.1.13/passthrough");
  Stream.Stream = Stream;
  function Stream() {
    EE.call(this);
  }
  Stream.prototype.pipe = function(dest, options) {
    var source = this;
    function ondata(chunk) {
      if (dest.writable) {
        if (false === dest.write(chunk) && source.pause) {
          source.pause();
        }
      }
    }
    source.on('data', ondata);
    function ondrain() {
      if (source.readable && source.resume) {
        source.resume();
      }
    }
    dest.on('drain', ondrain);
    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on('end', onend);
      source.on('close', onclose);
    }
    var didOnEnd = false;
    function onend() {
      if (didOnEnd)
        return ;
      didOnEnd = true;
      dest.end();
    }
    function onclose() {
      if (didOnEnd)
        return ;
      didOnEnd = true;
      if (typeof dest.destroy === 'function')
        dest.destroy();
    }
    function onerror(er) {
      cleanup();
      if (EE.listenerCount(this, 'error') === 0) {
        throw er;
      }
    }
    source.on('error', onerror);
    dest.on('error', onerror);
    function cleanup() {
      source.removeListener('data', ondata);
      dest.removeListener('drain', ondrain);
      source.removeListener('end', onend);
      source.removeListener('close', onclose);
      source.removeListener('error', onerror);
      dest.removeListener('error', onerror);
      source.removeListener('end', cleanup);
      source.removeListener('close', cleanup);
      dest.removeListener('close', cleanup);
    }
    source.on('end', cleanup);
    source.on('close', cleanup);
    dest.on('close', cleanup);
    dest.emit('pipe', source);
    return dest;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:stream-browserify@1.0.0", ["npm:stream-browserify@1.0.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:stream-browserify@1.0.0/index");
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-stream@0.1.0/index", ["npm:stream-browserify@1.0.0"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('stream') : require("npm:stream-browserify@1.0.0");
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-stream@0.1.0", ["github:jspm/nodelibs-stream@0.1.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-stream@0.1.0/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:simple-peer@5.11.3/index", ["npm:debug@2.2.0", "npm:get-browser-rtc@1.0.0", "npm:hat@0.0.3", "npm:inherits@2.0.1", "npm:is-typedarray@1.0.0", "npm:once@1.3.2", "github:jspm/nodelibs-stream@0.1.0", "npm:typedarray-to-buffer@3.0.3", "github:jspm/nodelibs-buffer@0.1.0"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(Buffer) {
    module.exports = Peer;
    var debug = require("npm:debug@2.2.0")('simple-peer');
    var getBrowserRTC = require("npm:get-browser-rtc@1.0.0");
    var hat = require("npm:hat@0.0.3");
    var inherits = require("npm:inherits@2.0.1");
    var isTypedArray = require("npm:is-typedarray@1.0.0");
    var once = require("npm:once@1.3.2");
    var stream = require("github:jspm/nodelibs-stream@0.1.0");
    var toBuffer = require("npm:typedarray-to-buffer@3.0.3");
    inherits(Peer, stream.Duplex);
    function Peer(opts) {
      var self = this;
      if (!(self instanceof Peer))
        return new Peer(opts);
      self._debug('new peer %o', opts);
      if (!opts)
        opts = {};
      opts.allowHalfOpen = false;
      if (opts.highWaterMark == null)
        opts.highWaterMark = 1024 * 1024;
      stream.Duplex.call(self, opts);
      self.initiator = opts.initiator || false;
      self.channelConfig = opts.channelConfig || Peer.channelConfig;
      self.channelName = opts.channelName || hat(160);
      if (!opts.initiator)
        self.channelName = null;
      self.config = opts.config || Peer.config;
      self.constraints = opts.constraints || Peer.constraints;
      self.reconnectTimer = opts.reconnectTimer || 0;
      self.sdpTransform = opts.sdpTransform || function(sdp) {
        return sdp;
      };
      self.stream = opts.stream || false;
      self.trickle = opts.trickle !== undefined ? opts.trickle : true;
      self.destroyed = false;
      self.connected = false;
      self.remoteAddress = undefined;
      self.remoteFamily = undefined;
      self.remotePort = undefined;
      self.localAddress = undefined;
      self.localPort = undefined;
      self._wrtc = opts.wrtc || getBrowserRTC();
      if (!self._wrtc) {
        if (typeof window === 'undefined') {
          throw new Error('No WebRTC support: Specify `opts.wrtc` option in this environment');
        } else {
          throw new Error('No WebRTC support: Not a supported browser');
        }
      }
      self._maxBufferedAmount = opts.highWaterMark;
      self._pcReady = false;
      self._channelReady = false;
      self._iceComplete = false;
      self._channel = null;
      self._chunk = null;
      self._cb = null;
      self._interval = null;
      self._reconnectTimeout = null;
      self._pc = new (self._wrtc.RTCPeerConnection)(self.config, self.constraints);
      self._pc.oniceconnectionstatechange = self._onIceConnectionStateChange.bind(self);
      self._pc.onsignalingstatechange = self._onSignalingStateChange.bind(self);
      self._pc.onicecandidate = self._onIceCandidate.bind(self);
      if (self.stream)
        self._pc.addStream(self.stream);
      self._pc.onaddstream = self._onAddStream.bind(self);
      if (self.initiator) {
        self._setupData({channel: self._pc.createDataChannel(self.channelName, self.channelConfig)});
        self._pc.onnegotiationneeded = once(self._createOffer.bind(self));
        if (typeof window === 'undefined' || !window.webkitRTCPeerConnection) {
          self._pc.onnegotiationneeded();
        }
      } else {
        self._pc.ondatachannel = self._setupData.bind(self);
      }
      self.on('finish', function() {
        if (self.connected) {
          setTimeout(function() {
            self._destroy();
          }, 100);
        } else {
          self.once('connect', function() {
            setTimeout(function() {
              self._destroy();
            }, 100);
          });
        }
      });
    }
    Peer.WEBRTC_SUPPORT = !!getBrowserRTC();
    Peer.config = {iceServers: [{
        url: 'stun:23.21.150.121',
        urls: 'stun:23.21.150.121'
      }]};
    Peer.constraints = {};
    Peer.channelConfig = {};
    Object.defineProperty(Peer.prototype, 'bufferSize', {get: function() {
        var self = this;
        return (self._channel && self._channel.bufferedAmount) || 0;
      }});
    Peer.prototype.address = function() {
      var self = this;
      return {
        port: self.localPort,
        family: 'IPv4',
        address: self.localAddress
      };
    };
    Peer.prototype.signal = function(data) {
      var self = this;
      if (self.destroyed)
        throw new Error('cannot signal after peer is destroyed');
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (err) {
          data = {};
        }
      }
      self._debug('signal()');
      if (data.sdp) {
        self._pc.setRemoteDescription(new (self._wrtc.RTCSessionDescription)(data), function() {
          if (self.destroyed)
            return ;
          if (self._pc.remoteDescription.type === 'offer')
            self._createAnswer();
        }, self._onError.bind(self));
      }
      if (data.candidate) {
        try {
          self._pc.addIceCandidate(new (self._wrtc.RTCIceCandidate)(data.candidate), noop, self._onError.bind(self));
        } catch (err) {
          self._destroy(new Error('error adding candidate: ' + err.message));
        }
      }
      if (!data.sdp && !data.candidate) {
        self._destroy(new Error('signal() called with invalid signal data'));
      }
    };
    Peer.prototype.send = function(chunk) {
      var self = this;
      if (!isTypedArray.strict(chunk) && !(chunk instanceof ArrayBuffer) && !Buffer.isBuffer(chunk) && typeof chunk !== 'string' && (typeof Blob === 'undefined' || !(chunk instanceof Blob))) {
        chunk = JSON.stringify(chunk);
      }
      if (Buffer.isBuffer(chunk) && !isTypedArray.strict(chunk)) {
        chunk = new Uint8Array(chunk);
      }
      var len = chunk.length || chunk.byteLength || chunk.size;
      self._channel.send(chunk);
      self._debug('write: %d bytes', len);
    };
    Peer.prototype.destroy = function(onclose) {
      var self = this;
      self._destroy(null, onclose);
    };
    Peer.prototype._destroy = function(err, onclose) {
      var self = this;
      if (self.destroyed)
        return ;
      if (onclose)
        self.once('close', onclose);
      self._debug('destroy (error: %s)', err && err.message);
      self.readable = self.writable = false;
      if (!self._readableState.ended)
        self.push(null);
      if (!self._writableState.finished)
        self.end();
      self.destroyed = true;
      self.connected = false;
      self._pcReady = false;
      self._channelReady = false;
      self._chunk = null;
      self._cb = null;
      clearInterval(self._interval);
      clearTimeout(self._reconnectTimeout);
      if (self._pc) {
        try {
          self._pc.close();
        } catch (err) {}
        self._pc.oniceconnectionstatechange = null;
        self._pc.onsignalingstatechange = null;
        self._pc.onicecandidate = null;
      }
      if (self._channel) {
        try {
          self._channel.close();
        } catch (err) {}
        self._channel.onmessage = null;
        self._channel.onopen = null;
        self._channel.onclose = null;
      }
      self._pc = null;
      self._channel = null;
      if (err)
        self.emit('error', err);
      self.emit('close');
    };
    Peer.prototype._setupData = function(event) {
      var self = this;
      self._channel = event.channel;
      self.channelName = self._channel.label;
      self._channel.binaryType = 'arraybuffer';
      self._channel.onmessage = self._onChannelMessage.bind(self);
      self._channel.onopen = self._onChannelOpen.bind(self);
      self._channel.onclose = self._onChannelClose.bind(self);
    };
    Peer.prototype._read = function() {};
    Peer.prototype._write = function(chunk, encoding, cb) {
      var self = this;
      if (self.destroyed)
        return cb(new Error('cannot write after peer is destroyed'));
      if (self.connected) {
        try {
          self.send(chunk);
        } catch (err) {
          return self._onError(err);
        }
        if (self._channel.bufferedAmount > self._maxBufferedAmount) {
          self._debug('start backpressure: bufferedAmount %d', self._channel.bufferedAmount);
          self._cb = cb;
        } else {
          cb(null);
        }
      } else {
        self._debug('write before connect');
        self._chunk = chunk;
        self._cb = cb;
      }
    };
    Peer.prototype._createOffer = function() {
      var self = this;
      if (self.destroyed)
        return ;
      self._pc.createOffer(function(offer) {
        if (self.destroyed)
          return ;
        offer.sdp = self.sdpTransform(offer.sdp);
        self._pc.setLocalDescription(offer, noop, self._onError.bind(self));
        var sendOffer = function() {
          var signal = self._pc.localDescription || offer;
          self._debug('signal');
          self.emit('signal', {
            type: signal.type,
            sdp: signal.sdp
          });
        };
        if (self.trickle || self._iceComplete)
          sendOffer();
        else
          self.once('_iceComplete', sendOffer);
      }, self._onError.bind(self), self.offerConstraints);
    };
    Peer.prototype._createAnswer = function() {
      var self = this;
      if (self.destroyed)
        return ;
      self._pc.createAnswer(function(answer) {
        if (self.destroyed)
          return ;
        answer.sdp = self.sdpTransform(answer.sdp);
        self._pc.setLocalDescription(answer, noop, self._onError.bind(self));
        var sendAnswer = function() {
          var signal = self._pc.localDescription || answer;
          self._debug('signal');
          self.emit('signal', {
            type: signal.type,
            sdp: signal.sdp
          });
        };
        if (self.trickle || self._iceComplete)
          sendAnswer();
        else
          self.once('_iceComplete', sendAnswer);
      }, self._onError.bind(self), self.answerConstraints);
    };
    Peer.prototype._onIceConnectionStateChange = function() {
      var self = this;
      if (self.destroyed)
        return ;
      var iceGatheringState = self._pc.iceGatheringState;
      var iceConnectionState = self._pc.iceConnectionState;
      self._debug('iceConnectionStateChange %s %s', iceGatheringState, iceConnectionState);
      self.emit('iceConnectionStateChange', iceGatheringState, iceConnectionState);
      if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
        clearTimeout(self._reconnectTimeout);
        self._pcReady = true;
        self._maybeReady();
      }
      if (iceConnectionState === 'disconnected') {
        if (self.reconnectTimer) {
          clearTimeout(self._reconnectTimeout);
          self._reconnectTimeout = setTimeout(function() {
            self._destroy();
          }, self.reconnectTimer);
        } else {
          self._destroy();
        }
      }
      if (iceConnectionState === 'closed') {
        self._destroy();
      }
    };
    Peer.prototype._maybeReady = function() {
      var self = this;
      self._debug('maybeReady pc %s channel %s', self._pcReady, self._channelReady);
      if (self.connected || self._connecting || !self._pcReady || !self._channelReady)
        return ;
      self._connecting = true;
      if (typeof window !== 'undefined' && !!window.mozRTCPeerConnection) {
        self._pc.getStats(null, function(res) {
          var items = [];
          res.forEach(function(item) {
            items.push(item);
          });
          onStats(items);
        }, self._onError.bind(self));
      } else {
        self._pc.getStats(function(res) {
          var items = [];
          res.result().forEach(function(result) {
            var item = {};
            result.names().forEach(function(name) {
              item[name] = result.stat(name);
            });
            item.id = result.id;
            item.type = result.type;
            item.timestamp = result.timestamp;
            items.push(item);
          });
          onStats(items);
        });
      }
      function onStats(items) {
        items.forEach(function(item) {
          if (item.type === 'remotecandidate') {
            self.remoteAddress = item.ipAddress;
            self.remoteFamily = 'IPv4';
            self.remotePort = Number(item.portNumber);
            self._debug('connect remote: %s:%s (%s)', self.remoteAddress, self.remotePort, self.remoteFamily);
          } else if (item.type === 'localcandidate' && item.candidateType === 'host') {
            self.localAddress = item.ipAddress;
            self.localPort = Number(item.portNumber);
            self._debug('connect local: %s:%s', self.localAddress, self.localPort);
          }
        });
        self._connecting = false;
        self.connected = true;
        if (self._chunk) {
          try {
            self.send(self._chunk);
          } catch (err) {
            return self._onError(err);
          }
          self._chunk = null;
          self._debug('sent chunk from "write before connect"');
          var cb = self._cb;
          self._cb = null;
          cb(null);
        }
        self._interval = setInterval(function() {
          if (!self._cb || !self._channel || self._channel.bufferedAmount > self._maxBufferedAmount)
            return ;
          self._debug('ending backpressure: bufferedAmount %d', self._channel.bufferedAmount);
          var cb = self._cb;
          self._cb = null;
          cb(null);
        }, 150);
        if (self._interval.unref)
          self._interval.unref();
        self._debug('connect');
        self.emit('connect');
      }
    };
    Peer.prototype._onSignalingStateChange = function() {
      var self = this;
      if (self.destroyed)
        return ;
      self._debug('signalingStateChange %s', self._pc.signalingState);
      self.emit('signalingStateChange', self._pc.signalingState);
    };
    Peer.prototype._onIceCandidate = function(event) {
      var self = this;
      if (self.destroyed)
        return ;
      if (event.candidate && self.trickle) {
        self.emit('signal', {candidate: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          }});
      } else if (!event.candidate) {
        self._iceComplete = true;
        self.emit('_iceComplete');
      }
    };
    Peer.prototype._onChannelMessage = function(event) {
      var self = this;
      if (self.destroyed)
        return ;
      var data = event.data;
      self._debug('read: %d bytes', data.byteLength || data.length);
      if (data instanceof ArrayBuffer) {
        data = toBuffer(new Uint8Array(data));
        self.push(data);
      } else {
        try {
          data = JSON.parse(data);
        } catch (err) {}
        self.emit('data', data);
      }
    };
    Peer.prototype._onChannelOpen = function() {
      var self = this;
      if (self.connected || self.destroyed)
        return ;
      self._debug('on channel open');
      self._channelReady = true;
      self._maybeReady();
    };
    Peer.prototype._onChannelClose = function() {
      var self = this;
      if (self.destroyed)
        return ;
      self._debug('on channel close');
      self._destroy();
    };
    Peer.prototype._onAddStream = function(event) {
      var self = this;
      if (self.destroyed)
        return ;
      self._debug('on add stream');
      self.emit('stream', event.stream);
    };
    Peer.prototype._onError = function(err) {
      var self = this;
      if (self.destroyed)
        return ;
      self._debug('error %s', err.message || err);
      self._destroy(err);
    };
    Peer.prototype._debug = function() {
      var self = this;
      var args = [].slice.call(arguments);
      var id = self.channelName && self.channelName.substring(0, 7);
      args[0] = '[' + id + '] ' + args[0];
      debug.apply(null, args);
    };
    function noop() {}
  })(require("github:jspm/nodelibs-buffer@0.1.0").Buffer);
  global.define = __define;
  return module.exports;
});

System.register("npm:simple-peer@5.11.3", ["npm:simple-peer@5.11.3/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:simple-peer@5.11.3/index");
  global.define = __define;
  return module.exports;
});

System.register("lib/call", ["npm:simple-peer@5.11.3"], function($__export) {
  "use strict";
  var __moduleName = "lib/call";
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
          console.log('connected to server');
        });
        socket.on('call', function(initiator) {
          console.log('recieving call');
          var peer = new SimplePeer({
            initiator: initiator,
            stream: stream
          });
          peer.on('signal', function(data) {
            socket.emit('signal', JSON.stringify(data));
          });
          socket.on('signal', function(data) {
            peer.signal(data);
          });
          peer.on('stream', function(stream) {
            console.log('recieving stream');
            socket.emit('connected');
            var video = document.querySelector('#peerVideo');
            video.src = window.URL.createObjectURL(stream);
            video.play();
          });
        });
      });
    }
  };
});

System.register("lib/start", ["lib/headtrackr", "lib/call"], function($__export) {
  "use strict";
  var __moduleName = "lib/start";
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
        var htracker = new headtrackr.Tracker();
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
          var darkness;
          if (dark) {
            darkness = 'Too dark';
          } else {
            darkness = 'Not too dark!';
          }
          var yellow = Math.abs(y - m) > 20;
          var yellowness;
          if (yellow) {
            yellowness = 'Too yellow';
          } else {
            yellowness = 'Not too yellow!';
          }
          document.getElementById('dark').innerHTML = darkness;
          document.getElementById('yellow').innerHTML = yellowness;
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
          if (running && event.width > 80 && event.height > 80) {
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

System.register("lib/layout", ["components/header.html!github:systemjs/plugin-text@0.0.2", "components/footer.html!github:systemjs/plugin-text@0.0.2", "pages/home.html!github:systemjs/plugin-text@0.0.2", "pages/story.html!github:systemjs/plugin-text@0.0.2", "pages/contact.html!github:systemjs/plugin-text@0.0.2", "pages/about.html!github:systemjs/plugin-text@0.0.2", "pages/start.html!github:systemjs/plugin-text@0.0.2", "lib/start"], function($__export) {
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
      pageStart,
      siteOptions,
      start;
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
    }, function($__m) {
      pageStart = $__m.default;
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
      addToSiteMap = function(name, page) {
        siteMap[name] = page;
      };
      addToSiteMap('home', pageHome);
      addToSiteMap('story', pageStory);
      addToSiteMap('contact', pageContact);
      addToSiteMap('about', pageAbout);
      addToSiteMap('start', pageStart);
      siteOptions = {
        siteMap: siteMap,
        pageTitle: 'home',
        pageBody: pageHome
      };
      riot.route(function(page, id, action) {
        if (siteMap[page]) {
          siteOptions['pageTitle'] = page;
          siteOptions['pageBody'] = siteMap[page];
          riot.update();
          if (page === 'start') {
            start();
          }
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

System.register("lib/init", ["whitesaveme.css!github:systemjs/plugin-css@0.1.13", "lib/layout", "components/pages.html!github:systemjs/plugin-text@0.0.2"], function($__export) {
  "use strict";
  var __moduleName = "lib/init";
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

System.register('whitesaveme.css!github:systemjs/plugin-css@0.1.13', [], false, function() {});
(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})
("html{overflow-y:scroll;overflow-x:hidden}x-header{position:fixed;top:0;width:100%;z-index:999}#main{padding-top:55px}.icon-block{padding:0 15px}.slider .indicators .indicator-item.active{background-color:#000}nav{height:65px;line-height:65px}");
});
//# sourceMappingURL=build.js.map
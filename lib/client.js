window.__ModuleLoader__.load({ id: "dsh-plugin-store", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module2.exports = {};
    var re2 = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name2, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name2, index, value);
      t[name2] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a3, b) => {
      if (typeof a3 === "number" && typeof b === "number") {
        return a3 === b ? 0 : a3 < b ? -1 : 1;
      }
      const anum = numeric.test(a3);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a3 = +a3;
        b = +b;
      }
      return a3 === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a3 < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a3, b) => compareIdentifiers(b, a3);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re2, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a3 = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a3, b);
          if (a3 === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a3 === void 0) {
            return -1;
          } else if (a3 === b) {
            continue;
          } else {
            return compareIdentifiers(a3, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a3 = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a3, b);
          if (a3 === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a3 === void 0) {
            return -1;
          } else if (a3 === b) {
            continue;
          } else {
            return compareIdentifiers(a3, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v2 = parse(version, options);
      return v2 ? v2.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a3, loose) => new SemVer(a3, loose).major;
    module2.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a3, loose) => new SemVer(a3, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a3, loose) => new SemVer(a3, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a3, b, loose) => new SemVer(a3, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a3, b, loose) => compare(b, a3, loose);
    module2.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a3, b) => compare(a3, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a3, b, loose) => {
      const versionA = new SemVer(a3, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a3, b) => compareBuild(a3, b, loose));
    module2.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a3, b) => compareBuild(b, a3, loose));
    module2.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var gt2 = (a3, b, loose) => compare(a3, b, loose) > 0;
    module2.exports = gt2;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var lt2 = (a3, b, loose) => compare(a3, b, loose) < 0;
    module2.exports = lt2;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a3, b, loose) => compare(a3, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a3, b, loose) => compare(a3, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a3, b, loose) => compare(a3, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a3, b, loose) => compare(a3, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt2 = require_gt();
    var gte = require_gte();
    var lt2 = require_lt();
    var lte = require_lte();
    var cmp = (a3, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a3 === "object") {
            a3 = a3.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a3 === b;
        case "!==":
          if (typeof a3 === "object") {
            a3 = a3.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a3 !== b;
        case "":
        case "=":
        case "==":
          return eq(a3, b, loose);
        case "!=":
          return neq(a3, b, loose);
        case ">":
          return gt2(a3, b, loose);
        case ">=":
          return gte(a3, b, loose);
        case "<":
          return lt2(a3, b, loose);
        case "<=":
          return lte(a3, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re2, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/semver/functions/truncate.js
var require_truncate = __commonJS({
  "node_modules/semver/functions/truncate.js"(exports, module2) {
    "use strict";
    var parse = require_parse();
    var constants = require_constants();
    var SemVer = require_semver();
    var truncate = (version, truncation, options) => {
      if (!constants.RELEASE_TYPES.includes(truncation)) {
        return null;
      }
      const clonedVersion = cloneInputVersion(version, options);
      return clonedVersion && doTruncation(clonedVersion, truncation);
    };
    var cloneInputVersion = (version, options) => {
      const versionStringToParse = version instanceof SemVer ? version.version : version;
      return parse(versionStringToParse, options);
    };
    var doTruncation = (version, truncation) => {
      if (isPrerelease(truncation)) {
        return version.version;
      }
      version.prerelease = [];
      switch (truncation) {
        case "major":
          version.minor = 0;
          version.patch = 0;
          break;
        case "minor":
          version.patch = 0;
          break;
      }
      return version.format();
    };
    var isPrerelease = (type) => {
      return type.startsWith("pre");
    };
    module2.exports = truncate;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re2[t.HYPHENRANGELOOSE] : re2[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re2[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re2[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re2[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re2[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re2,
      src,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re2[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var invalidXRangeOrder = (M2, m, p) => isX(M2) && !isX(m) || isX(m) && p && !isX(p);
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re2[t.TILDELOOSE] : re2[t.TILDE];
      const z2 = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_2, M2, m, p, pr) => {
        debug("tilde", comp, _2, M2, m, p, pr);
        let ret;
        if (isX(M2)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M2}.0.0${z2} <${+M2 + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M2}.${m}.0${z2} <${M2}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M2}.${m}.${p}-${pr} <${M2}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M2}.${m}.${p} <${M2}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re2[t.CARETLOOSE] : re2[t.CARET];
      const z2 = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_2, M2, m, p, pr) => {
        debug("caret", comp, _2, M2, m, p, pr);
        let ret;
        if (isX(M2)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M2}.0.0${z2} <${+M2 + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M2 === "0") {
            ret = `>=${M2}.${m}.0${z2} <${M2}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M2}.${m}.0${z2} <${+M2 + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M2 === "0") {
            if (m === "0") {
              ret = `>=${M2}.${m}.${p}-${pr} <${M2}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M2}.${m}.${p}-${pr} <${M2}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M2}.${m}.${p}-${pr} <${+M2 + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M2 === "0") {
            if (m === "0") {
              ret = `>=${M2}.${m}.${p} <${M2}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M2}.${m}.${p} <${M2}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M2}.${m}.${p} <${+M2 + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re2[t.XRANGELOOSE] : re2[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M2, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M2, m, p, pr);
        if (invalidXRangeOrder(M2, m, p)) {
          return comp;
        }
        const xM = isX(M2);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M2 = +M2 + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M2 = +M2 + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M2}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M2}.0.0${pr} <${+M2 + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M2}.${m}.0${pr} <${M2}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re2[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re2[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports, module2) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re2[t.COMPARATORLOOSE] : re2[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re2, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v2) => {
        if (rangeObj.test(v2)) {
          if (!max || maxSV.compare(v2) === -1) {
            max = v2;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v2) => {
        if (rangeObj.test(v2)) {
          if (!min || minSV.compare(v2) === 1) {
            min = v2;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt2 = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt2(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt2(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt2 = require_gt();
    var lt2 = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt2;
          ltefn = lte;
          ltfn = lt2;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt2;
          ltefn = gte;
          ltfn = gt2;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v2 = versions.sort((a3, b) => compare(a3, b, options));
      for (const version of v2) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v2[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v2[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt2, lt2;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt2 = higherGT(gt2, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt2 = lowerLT(lt2, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt2 && lt2) {
        gtltComp = compare(gt2.semver, lt2.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt2.operator !== ">=" || lt2.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt2 && !satisfies(eq, String(gt2), options)) {
          return null;
        }
        if (lt2 && !satisfies(eq, String(lt2), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt2 && !options.includePrerelease && lt2.semver.prerelease.length ? lt2.semver : false;
      let needDomGTPre = gt2 && !options.includePrerelease && gt2.semver.prerelease.length ? gt2.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt2.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt2) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt2, c, options);
            if (higher === c && higher !== gt2) {
              return false;
            }
          } else if (gt2.operator === ">=" && !c.test(gt2.semver)) {
            return false;
          }
        }
        if (lt2) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt2, c, options);
            if (lower === c && lower !== lt2) {
              return false;
            }
          } else if (lt2.operator === "<=" && !c.test(lt2.semver)) {
            return false;
          }
        }
        if (!c.operator && (lt2 || gt2) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt2 && hasDomLT && !lt2 && gtltComp !== 0) {
        return false;
      }
      if (lt2 && hasDomGT && !gt2 && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a3, b, options) => {
      if (!a3) {
        return b;
      }
      const comp = compare(a3.semver, b.semver, options);
      return comp > 0 ? a3 : comp < 0 ? b : b.operator === ">" && a3.operator === ">=" ? b : a3;
    };
    var lowerLT = (a3, b, options) => {
      if (!a3) {
        return b;
      }
      const comp = compare(a3.semver, b.semver, options);
      return comp < 0 ? a3 : comp > 0 ? b : b.operator === "<" && a3.operator === "<=" ? b : a3;
    };
    module2.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt2 = require_gt();
    var lt2 = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var truncate = require_truncate();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt: gt2,
      lt: lt2,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      truncate,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/client.ts
var client_exports = {};
__export(client_exports, {
  NS: () => NS,
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react8 = require("react");

// locale/zh.json
var zh_default = {
  meta: {
    title: "\u751F\u6001\u5BB6\u56ED",
    description: "npm \u4E0A\u7684 DSH \u63D2\u4EF6\u76EE\u5F55\uFF0C\u6BCF\u5929\u81EA\u52A8\u66F4\u65B0"
  },
  ui: {
    tab: "\u751F\u6001\u5BB6\u56ED",
    search: "\u641C\u7D22\u63D2\u4EF6",
    viewDetails: "\u67E5\u770B\u8BE6\u60C5",
    seeAll: "\u5168\u90E8 \u203A",
    browseCategories: "\u6309\u5206\u7C7B\u6D4F\u89C8",
    allPlugins: "\u5168\u90E8\u63D2\u4EF6",
    back: "\u2039 \u8FD4\u56DE",
    searchResults: "\u641C\u7D22\uFF1A{query}",
    empty: "\u6CA1\u6709\u627E\u5230\u63D2\u4EF6",
    loading: "\u6B63\u5728\u52A0\u8F7D\u2026",
    loadFailed: "\u8BFB\u53D6\u751F\u6001\u5BB6\u56ED\u5931\u8D25",
    retry: "\u91CD\u8BD5",
    refresh: "\u5237\u65B0",
    selfUpdate: "\u751F\u6001\u5BB6\u56ED\u6709\u65B0\u7248\u672C v{latest}\uFF08\u5F53\u524D v{current}\uFF09",
    selfUpdateAction: "\u66F4\u65B0",
    selfUpdateTitle: "\u751F\u6001\u5BB6\u56ED",
    installedNotice: "\u300C{title}\u300D\u5DF2\u5B89\u88C5",
    installedUnknown: "\u65E0\u6CD5\u8BFB\u53D6\u5DF2\u5B89\u88C5\u7684\u63D2\u4EF6\uFF0C\u300C\u5DF2\u5B89\u88C5\u300D\u6807\u8BB0\u53EF\u80FD\u4E0D\u51C6",
    staleNotice: "\u7F51\u7EDC\u6709\u95EE\u9898\uFF0C\u663E\u793A\u7684\u662F\u4E0A\u6B21\u8BFB\u53D6\u7684\u5185\u5BB9",
    install: "\u5B89\u88C5",
    installed: "\u5DF2\u5B89\u88C5",
    update: "\u6709\u65B0\u7248\u672C",
    incompatible: "\u4E0D\u517C\u5BB9",
    incompatibleHint: "\u8FD9\u4E2A\u7248\u672C\u58F0\u660E\u652F\u6301 DSH {range}\uFF0C\u4E0E\u5F53\u524D\u7684 {version} \u4E0D\u517C\u5BB9",
    compatible: "\u517C\u5BB9\u5F53\u524D\u7248\u672C",
    compatUnknown: "\u517C\u5BB9\u6027\u672A\u77E5",
    compatNo: "\u4E0D\u517C\u5BB9\u5F53\u524D\u7248\u672C",
    stars: "\u661F\u6807",
    weeklyDownloads: "\u5468\u4E0B\u8F7D",
    published: "\u53D1\u5E03\u4E8E",
    permissions: "\u9700\u8981\u7684\u6743\u9650",
    permNetwork: "\u8054\u7F51",
    permFileSystem: "\u8BFB\u5199\u6587\u4EF6",
    permAgentTools: "\u7ED9 Agent \u6CE8\u518C\u5DE5\u5177",
    permChildProcess: "\u6267\u884C\u547D\u4EE4",
    permInstallScripts: "\u5B89\u88C5\u811A\u672C",
    yes: "\u662F",
    no: "\u5426",
    tabReadme: "\u8BE6\u7EC6\u4ECB\u7ECD",
    tabVersions: "\u7248\u672C",
    tabSource: "\u6765\u6E90",
    noReadme: "\u4F5C\u8005\u6CA1\u6709\u63D0\u4F9B\u8BF4\u660E",
    author: "\u4F5C\u8005",
    homepage: "\u4E3B\u9875",
    repository: "\u6E90\u4EE3\u7801",
    npmPackage: "npm \u5305",
    enginesDsh: "\u652F\u6301\u7684 DSH \u7248\u672C",
    anyVersion: "\u672A\u58F0\u660E\u9650\u5236",
    related: "\u540C\u7C7B\u63D2\u4EF6",
    detailFailed: "\u8BE6\u7EC6\u4FE1\u606F\u8BFB\u53D6\u5931\u8D25",
    confirmTitle: "\u5B89\u88C5\u63D2\u4EF6",
    confirmVersion: "\u7248\u672C",
    confirmSource: "\u6765\u6E90",
    confirmTrust: "\u6B64\u63D2\u4EF6\u672A\u7ECF\u5BA1\u6838\u3002\u63D2\u4EF6\u5B89\u88C5\u540E\u4EE5\u4F60\u7684\u6743\u9650\u8FD0\u884C\uFF0C\u8BF7\u53EA\u5B89\u88C5\u4F60\u4FE1\u4EFB\u7684\u63D2\u4EF6\u3002",
    cancel: "\u53D6\u6D88",
    continue: "\u7EE7\u7EED\u5B89\u88C5",
    crashTitle: "\u751F\u6001\u5BB6\u56ED\u51FA\u4E86\u70B9\u95EE\u9898",
    handoff: "\u8BF7\u70B9\u300C\u751F\u6001\u5BB6\u56ED\u300D\u6807\u7B7E\u5B8C\u6210\u5B89\u88C5\uFF1A{name}",
    dismiss: "\u5173\u95ED",
    close: "\u5173\u95ED",
    navHome: "\u9996\u9875",
    navAll: "\u5168\u90E8\u63D2\u4EF6",
    navAbout: "\u5173\u4E8E",
    homeCrumb: "\u751F\u6001\u5BB6\u56ED / \u76EE\u5F55",
    homeTitle: "\u53D1\u73B0\u9002\u5408\u4F60\u81EA\u5DF1\u7684 DSH \u63D2\u4EF6",
    homeIntro: "\u6536\u5F55 npm \u4E0A {count} \u4E2A DeepSeek Harness \u63D2\u4EF6\uFF0C\u6BCF\u5929\u81EA\u52A8\u66F4\u65B0\u3002\u63D2\u4EF6\u672A\u7ECF\u5BA1\u6838\uFF0C\u300C\u81EA\u52A8\u68C0\u6D4B\u300D\u6807\u51FA\u5B83\u4EEC\u53EF\u80FD\u4F1A\u8054\u7F51\u3001\u8BFB\u5199\u6587\u4EF6\u6216\u6267\u884C\u547D\u4EE4\u3002",
    searchPlaceholder: "\u6309\u540D\u79F0\u3001\u7528\u9014\u6216\u4F5C\u8005\u641C\u7D22\u2026",
    searchButton: "\u641C\u7D22\u63D2\u4EF6",
    linkBrowseAll: "\u6D4F\u89C8\u5168\u90E8\u63D2\u4EF6",
    linkRecommend: "\u53CD\u9988\u95EE\u9898",
    seeAllArrow: "\u67E5\u770B\u5168\u90E8 \u2192",
    listCrumb: "\u751F\u6001\u5BB6\u56ED / \u63D2\u4EF6",
    listIntro: "\u6309\u5206\u7C7B\u7B5B\u9009\uFF0C\u6216\u8005\u76F4\u63A5\u641C\u7D22\u540D\u79F0\u548C\u7528\u9014\u3002",
    sideCategories: "\u5206\u7C7B",
    countSuffix: "{count} \u4E2A",
    cardView: "\u67E5\u770B",
    panelInstall: "\u5B89\u88C5\u8FD9\u4E2A\u63D2\u4EF6",
    installHint: "\u4F1A\u6253\u5F00 DSH \u5B98\u65B9\u7684\u5B89\u88C5\u5BF9\u8BDD\u6846\uFF0C\u786E\u8BA4\u540E\u624D\u5B89\u88C5\u3002",
    orAddPlugin: "\u6216\u5728\u63D2\u4EF6\u9875\u300C\u6DFB\u52A0\u63D2\u4EF6\u300D\u586B\u5199",
    copy: "\u590D\u5236",
    copied: "\u5DF2\u590D\u5236",
    viewOnGitHub: "\u5728 GitHub \u4E0A\u67E5\u770B \u2197",
    aboutCrumb: "\u751F\u6001\u5BB6\u56ED / \u5173\u4E8E",
    aboutTitle: "\u5173\u4E8E\u751F\u6001\u5BB6\u56ED",
    aboutIntro: "\u5B83\u662F\u4EC0\u4E48\u3001\u6536\u5F55\u54EA\u4E9B\u63D2\u4EF6\u3001\u81EA\u52A8\u68C0\u6D4B\u662F\u4EC0\u4E48\u3002",
    aboutBasics: "\u57FA\u7840",
    aboutInstall: "\u5B89\u88C5\u4E0E\u53CD\u9988",
    faqWhat: "\u751F\u6001\u5BB6\u56ED\u662F\u4EC0\u4E48\uFF1F",
    faqWhatA: "npm \u4E0A DeepSeek Harness \u63D2\u4EF6\u7684\u76EE\u5F55\uFF0C\u6BCF\u5929\u81EA\u52A8\u66F4\u65B0\u3002\u63D2\u4EF6\u672A\u7ECF\u5BA1\u6838\uFF0C\u7531\u4F5C\u8005\u81EA\u5DF1\u53D1\u5E03\uFF1B\u88C5\u4E4B\u524D\u8BF7\u770B\u6E05\u5B83\u4F1A\u505A\u4EC0\u4E48\uFF0C\u53EA\u88C5\u4F60\u4FE1\u4EFB\u7684\u63D2\u4EF6\u3002",
    faqVsDiscover: "\u548C DSH \u81EA\u5E26\u7684\u300C\u53D1\u73B0\u300D\u9875\u6709\u4EC0\u4E48\u4E0D\u540C\uFF1F",
    faqVsDiscoverA: "\u6536\u7684\u63D2\u4EF6\u66F4\u591A\uFF0C\u53EF\u4EE5\u6309\u5206\u7C7B\u3001\u70ED\u5EA6\u3001\u66F4\u65B0\u65F6\u95F4\u6D4F\u89C8\uFF0C\u5E76\u663E\u793A\u81EA\u52A8\u68C0\u6D4B\u7ED3\u679C\u3002\u751F\u6001\u5BB6\u56ED\u7684\u76EE\u5F55\u4E5F\u662F\u4E00\u4EFD\u6807\u51C6\u7D22\u5F15\uFF0C\u4E0D\u88C5\u672C\u63D2\u4EF6\u4E5F\u80FD\u5728\u300C\u53D1\u73B0\u300D\u9875\u91CC\u8BFB\u5230\u3002",
    faqHowInstall: "\u600E\u4E48\u5B89\u88C5\uFF1F",
    faqHowInstallA: "\u70B9\u63D2\u4EF6\u9875\u7684\u300C\u5B89\u88C5\u300D\uFF0C\u4F1A\u6253\u5F00 DSH \u5B98\u65B9\u7684\u5B89\u88C5\u5BF9\u8BDD\u6846\uFF0C\u786E\u8BA4\u540E\u624D\u88C5\u3002\u4E5F\u53EF\u4EE5\u5728\u63D2\u4EF6\u9875\u300C\u6DFB\u52A0\u63D2\u4EF6\u300D\u91CC\u586B\u5199\u300C\u5305\u540D@\u7248\u672C\u300D\u3002",
    askTitle: "\u6709\u95EE\u9898\u6216\u5EFA\u8BAE\uFF1F",
    askBody: "\u5728 GitHub \u4E0A\u5F00\u4E00\u6761 Issue\u3002",
    askButton: "\u53BB GitHub \u53CD\u9988 \u2192",
    sectionPopular: "\u672C\u5468\u70ED\u95E8",
    sectionUpdated: "\u6700\u8FD1\u66F4\u65B0",
    sectionNew: "\u65B0\u4E0A\u67B6",
    crumbPopular: "\u6309\u5468\u4E0B\u8F7D\u91CF",
    crumbUpdated: "\u6309\u6700\u65B0\u7248\u672C\u53D1\u5E03\u65F6\u95F4",
    crumbNew: "\u6309\u9996\u6B21\u53D1\u5E03\u65F6\u95F4",
    sortLabel: "\u6392\u5E8F",
    sortPopular: "\u6700\u70ED\u95E8",
    sortUpdated: "\u6700\u8FD1\u66F4\u65B0",
    sortNew: "\u6700\u65B0\u4E0A\u67B6",
    sortStars: "\u661F\u6807\u6700\u591A",
    compatibleOnly: "\u9690\u85CF\u4E0D\u517C\u5BB9\u5F53\u524D DSH \u7684",
    pagePrev: "\u2039 \u4E0A\u4E00\u9875",
    pageNext: "\u4E0B\u4E00\u9875 \u203A",
    pageOf: "\u7B2C {page} / {pages} \u9875",
    latestVersion: "\u6700\u65B0\u7248\u672C",
    detection: "\u81EA\u52A8\u68C0\u6D4B",
    detectionNote: "\u7531\u7A0B\u5E8F\u626B\u63CF\u6E90\u7801\u81EA\u52A8\u5F97\u51FA\uFF0C\u53EF\u80FD\u4E0D\u51C6\uFF0C\u4E0D\u4EE3\u8868\u5B89\u5168\u5BA1\u67E5\u3002",
    notScanned: "\u8FD9\u4E2A\u7248\u672C\u5C1A\u672A\u68C0\u6D4B\uFF0C\u68C0\u6D4B\u4F1A\u5728\u63A5\u4E0B\u6765\u51E0\u6B21\u66F4\u65B0\u4E2D\u5B8C\u6210\u3002",
    readmeFailed: "README \u8BFB\u53D6\u5931\u8D25",
    installedHint: "\u53EF\u4EE5\u5728 DSH \u7684\u300C\u63D2\u4EF6\u300D\u9875\u91CC\u7BA1\u7406\u5B83\u3002",
    aboutListing: "\u6536\u5F55",
    aboutDetection: "\u81EA\u52A8\u68C0\u6D4B",
    faqWhatListed: "\u6536\u5F55\u54EA\u4E9B\u63D2\u4EF6\uFF1F",
    faqWhatListedA: "\u6EE1\u8DB3\u8FD9\u4E9B\u6761\u4EF6\u7684\u90FD\u6536\uFF1A\u662F DSH \u63D2\u4EF6\u5305\uFF0C\u6709\u6E90\u7801\u4ED3\u5E93\u6216\u4E3B\u9875\uFF0C\u517C\u5BB9\u5F53\u524D DSH \u7248\u672C\uFF0C\u6700\u8FD1 90 \u5929\u5185\u53D1\u5E03\u8FC7\u65B0\u7248\u672C\u3002\u4E0D\u6EE1\u8DB3\u7684\u4F1A\u81EA\u52A8\u4E0B\u67B6\uFF0C\u6EE1\u8DB3\u4E86\u4F1A\u81EA\u52A8\u56DE\u6765\u3002",
    faqHowOften: "\u591A\u4E45\u66F4\u65B0\u4E00\u6B21\uFF1F",
    faqHowOftenA: "\u6BCF\u5929\u81EA\u52A8\u91CD\u5EFA\uFF1A\u53D1\u73B0\u65B0\u63D2\u4EF6\u3001\u66F4\u65B0\u7248\u672C\u548C\u4E0B\u8F7D\u91CF\uFF0C\u5E76\u5BF9\u65B0\u7248\u672C\u505A\u81EA\u52A8\u68C0\u6D4B\u3002",
    faqDetectWhat: "\u300C\u81EA\u52A8\u68C0\u6D4B\u300D\u662F\u4EC0\u4E48\uFF1F",
    faqDetectWhatA: "\u7A0B\u5E8F\u4E0B\u8F7D\u63D2\u4EF6\u5305\u3001\u626B\u63CF\u6E90\u7801\u91CC\u7684\u7279\u5F81\uFF0C\u6807\u51FA\u5B83\u53EF\u80FD\u4F1A\u8054\u7F51\u3001\u8BFB\u5199\u6587\u4EF6\u3001\u6267\u884C\u547D\u4EE4\u3001\u7ED9 Agent \u6CE8\u518C\u5DE5\u5177\u6216\u5E26\u5B89\u88C5\u811A\u672C\u3002\u53EA\u8BFB\u4E0D\u8FD0\u884C\u3002",
    faqDetectWrong: "\u68C0\u6D4B\u7ED3\u679C\u51C6\u5417\uFF1F",
    faqDetectWrongA: "\u4E0D\u4E00\u5B9A\u3002\u5B83\u53EA\u770B\u4EE3\u7801\u7279\u5F81\uFF0C\u53EF\u80FD\u6F0F\u62A5\uFF0C\u4E5F\u53EF\u80FD\u628A\u65E0\u5BB3\u7684\u5199\u6CD5\u5F53\u6210\u547D\u4E2D\u3002\u5B83\u4E0D\u662F\u5B89\u5168\u5BA1\u67E5\uFF0C\u53EA\u5E2E\u4F60\u5927\u81F4\u4E86\u89E3\u63D2\u4EF6\u4F1A\u505A\u4EC0\u4E48\u3002",
    faqReport: "\u53D1\u73B0\u6709\u95EE\u9898\u7684\u63D2\u4EF6\u600E\u4E48\u529E\uFF1F",
    faqReportA: "\u5728 GitHub \u4E0A\u5F00\u4E00\u6761 Issue\uFF0C\u9644\u4E0A\u5305\u540D\u548C\u95EE\u9898\u3002",
    detectionOpaque: "\u8FD9\u4E2A\u5305\u542B\u6709\u9884\u7F16\u8BD1\u6587\u4EF6\u6216\u538B\u7F29\u4EE3\u7801\uFF0C\u81EA\u52A8\u68C0\u6D4B\u770B\u4E0D\u5230\u5176\u4E2D\u7684\u5185\u5BB9\uFF0C\u300C\u5426\u300D\u4E0D\u4EE3\u8868\u6CA1\u6709\u3002",
    scanFailed: "\u8FD9\u4E2A\u7248\u672C\u65E0\u6CD5\u81EA\u52A8\u68C0\u6D4B\uFF08\u5305\u592A\u5927\u6216\u65E0\u6CD5\u8BFB\u53D6\uFF09\uFF0C\u4F5C\u8005\u53D1\u5E03\u65B0\u7248\u672C\u540E\u4F1A\u518D\u8BD5\u3002"
  }
};

// locale/en.json
var en_default = {
  meta: {
    title: "Plugin Home",
    description: "DSH plugins on npm, refreshed daily"
  },
  ui: {
    tab: "Plugin Home",
    search: "Search plugins",
    viewDetails: "View details",
    seeAll: "See all \u203A",
    browseCategories: "Browse by category",
    allPlugins: "All plugins",
    back: "\u2039 Back",
    searchResults: "Search: {query}",
    empty: "No plugins found",
    loading: "Loading\u2026",
    loadFailed: "Could not load the store",
    retry: "Retry",
    refresh: "Refresh",
    selfUpdate: "Plugin Home update available: v{latest} (you have v{current})",
    selfUpdateAction: "Update",
    selfUpdateTitle: "Plugin Home",
    installedNotice: "{title} is installed",
    installedUnknown: "Couldn't read installed plugins; Installed badges may be wrong",
    staleNotice: "Network trouble: showing the last loaded catalog",
    install: "Install",
    installed: "Installed",
    update: "Update available",
    incompatible: "Incompatible",
    incompatibleHint: "This version supports DSH {range}, which excludes the running {version}",
    compatible: "Works with this DSH",
    compatUnknown: "Compatibility unknown",
    compatNo: "Not compatible with this DSH",
    stars: "Stars",
    weeklyDownloads: "Weekly downloads",
    published: "Published",
    permissions: "Permissions",
    permNetwork: "Network",
    permFileSystem: "Reads or writes files",
    permAgentTools: "Registers agent tools",
    permChildProcess: "Runs commands",
    permInstallScripts: "Install scripts",
    yes: "Yes",
    no: "No",
    tabReadme: "Overview",
    tabVersions: "Versions",
    tabSource: "Source",
    noReadme: "The author provides no description",
    author: "Author",
    homepage: "Homepage",
    repository: "Source code",
    npmPackage: "npm package",
    enginesDsh: "Supported DSH versions",
    anyVersion: "No limit declared",
    related: "Related plugins",
    detailFailed: "Could not load the details",
    confirmTitle: "Install plugin",
    confirmVersion: "Version",
    confirmSource: "Source",
    confirmTrust: "This plugin is not reviewed. Plugins run with your permissions; only install plugins you trust.",
    cancel: "Cancel",
    continue: "Continue",
    crashTitle: "Something went wrong in the store",
    handoff: "Open the Plugin Home tab to finish installing: {name}",
    dismiss: "Dismiss",
    close: "Close",
    navHome: "Home",
    navAll: "All plugins",
    navAbout: "About",
    homeCrumb: "plugin-home / directory",
    homeTitle: "Discover DSH plugins that fit you",
    homeIntro: "{count} DeepSeek Harness plugins from npm, refreshed daily. Plugins are not reviewed; automatic detection marks whether they may use the network, touch files or run commands.",
    searchPlaceholder: "Search by name, use or author\u2026",
    searchButton: "Search",
    linkBrowseAll: "Browse all plugins",
    linkRecommend: "Report a problem",
    seeAllArrow: "See all \u2192",
    listCrumb: "plugin-home / plugins",
    listIntro: "Filter by category, or search by name and use.",
    sideCategories: "Categories",
    countSuffix: "{count}",
    cardView: "View",
    panelInstall: "Install this plugin",
    installHint: "Opens DSH's own install dialog; nothing installs until you confirm.",
    orAddPlugin: "Or enter in Plugins \u2192 Add plugin",
    copy: "Copy",
    copied: "Copied",
    viewOnGitHub: "View on GitHub \u2197",
    aboutCrumb: "plugin-home / about",
    aboutTitle: "About Plugin Home",
    aboutIntro: "What it is, which plugins it lists, and what automatic detection means.",
    aboutBasics: "Basics",
    aboutInstall: "Installing and feedback",
    faqWhat: "What is Plugin Home?",
    faqWhatA: "A directory of DeepSeek Harness plugins on npm, refreshed daily. Plugins are not reviewed and are published by their authors; check what a plugin does and only install ones you trust.",
    faqVsDiscover: "How is it different from DSH's Discover page?",
    faqVsDiscoverA: "It lists more plugins, lets you browse by category, popularity and release date, and shows automatic detection. Its directory is also a standard index, readable from Discover without this plugin.",
    faqHowInstall: "How do I install a plugin?",
    faqHowInstallA: `Press Install on a plugin's page: DSH's own install dialog opens and nothing installs until you confirm. You can also enter "name@version" in Plugins \u2192 Add plugin.`,
    askTitle: "Questions or ideas?",
    askBody: "Open an issue on GitHub.",
    askButton: "Feedback on GitHub \u2192",
    sectionPopular: "Trending this week",
    sectionUpdated: "Recently updated",
    sectionNew: "New",
    crumbPopular: "by weekly downloads",
    crumbUpdated: "by latest release",
    crumbNew: "by first release",
    sortLabel: "Sort",
    sortPopular: "Most popular",
    sortUpdated: "Recently updated",
    sortNew: "Newest",
    sortStars: "Most stars",
    compatibleOnly: "Hide plugins that do not support this DSH",
    pagePrev: "\u2039 Previous",
    pageNext: "Next \u203A",
    pageOf: "Page {page} of {pages}",
    latestVersion: "Latest version",
    detection: "Automatic detection",
    detectionNote: "Found by scanning the source automatically; it can be wrong and is not a security review.",
    notScanned: "This version has not been checked yet; it will be in one of the next updates.",
    readmeFailed: "Could not load the README",
    installedHint: "Manage it in DSH's Plugins page.",
    aboutListing: "Listing",
    aboutDetection: "Automatic detection",
    faqWhatListed: "Which plugins are listed?",
    faqWhatListedA: "Every package that is a DSH plugin, has a source repository or homepage, supports the current DSH and released a version in the last 90 days. Others drop out automatically and come back when they qualify.",
    faqHowOften: "How often is it updated?",
    faqHowOftenA: "Daily: new plugins are found, versions and downloads refreshed, and new versions checked automatically.",
    faqDetectWhat: "What is automatic detection?",
    faqDetectWhatA: "A program downloads the package and scans its source for signs that it may use the network, touch files, run commands, register agent tools or carry install scripts. It reads, never runs.",
    faqDetectWrong: "Is detection accurate?",
    faqDetectWrongA: "Not always. It looks at code patterns, so it can miss things or flag harmless code. It is not a security review; it only gives you an idea of what a plugin does.",
    faqReport: "Found a problem with a plugin?",
    faqReportA: "Open an issue on GitHub with the package name and what is wrong.",
    detectionOpaque: 'This package ships prebuilt or minified code that detection cannot look into, so "no" does not mean none.',
    scanFailed: "This version could not be checked (too large or unreadable); the next version will be tried again."
  }
};

// src/client/first-run.ts
var FIRST_RUN_KEY = "dsh-plugin-store:first-run-done";
function shouldAutoOpen(getStorage) {
  try {
    const storage = getStorage();
    if (storage.getItem(FIRST_RUN_KEY) !== null) return false;
    storage.setItem(FIRST_RUN_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

// src/client/handoff.ts
var HANDOFF_TTL_MS = 10 * 60 * 1e3;
var realTimers = {
  setTimer: (fn, ms) => {
    const handle = setTimeout(fn, ms);
    handle.unref?.();
    return handle;
  },
  clearTimer: (handle) => clearTimeout(handle)
};
function createHandoff(now = Date.now, timers = realTimers) {
  let pending = null;
  let timer = null;
  const listeners = /* @__PURE__ */ new Set();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const expired = () => pending !== null && now() - pending.at > HANDOFF_TTL_MS;
  const clear = () => {
    if (timer !== null) timers.clearTimer(timer);
    timer = null;
    pending = null;
  };
  return {
    /** Record the plugin to install once the Store tab opens. */
    request(plugin) {
      clear();
      pending = { view: { name: plugin.name, title: plugin.title }, at: now() };
      timer = timers.setTimer(() => {
        if (expired()) {
          clear();
          notify();
        }
      }, HANDOFF_TTL_MS + 1);
      notify();
    },
    /** The pending plugin's name, taken once; null when none or expired. */
    take() {
      if (!pending) return null;
      const name2 = expired() ? null : pending.view.name;
      clear();
      notify();
      return name2;
    },
    /** The pending plugin without taking it (for the notice); the same object until the state changes. */
    peek() {
      return pending && !expired() ? pending.view : null;
    },
    dismiss() {
      if (!pending) return;
      clear();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
var PLUGINS_PANEL_ID = "plugins";
function openInstalledFrom(deps) {
  return (name2) => {
    const navigation = deps.navigation();
    if (navigation) navigation.openBundle(name2);
    else deps.selectPanel(PLUGINS_PANEL_ID);
  };
}
function selectTabByLabel(root, label) {
  const tab = Array.from(root.querySelectorAll('[role="tab"]')).find((el) => el.textContent?.trim() === label);
  if (!tab) return false;
  if (tab.getAttribute("aria-selected") !== "true") tab.click();
  return true;
}
async function selectTabWhenReady(root, label, { tries = 20, delayMs = 50 } = {}) {
  for (let attempt = 0; attempt < tries; attempt++) {
    if (selectTabByLabel(root(), label)) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

// src/client/model/api.ts
var INDEX_ROUTE = "/api/plugin-store/index";
var DETAIL_ROUTE = "/api/plugin-store/detail";
var README_ROUTE = "/api/plugin-store/readme";
async function call(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`HTTP ${response.status}`);
  }
  if (!response.ok || body?.ok !== true) throw new Error(body?.error ?? `HTTP ${response.status}`);
  return body;
}
function loadCatalog(refresh = false) {
  return call(refresh ? `${INDEX_ROUTE}?refresh=1` : INDEX_ROUTE);
}
async function loadDetail(name2) {
  return (await call(`${DETAIL_ROUTE}?name=${encodeURIComponent(name2)}`)).detail;
}
function loadReadme(name2) {
  return call(`${README_ROUTE}?name=${encodeURIComponent(name2)}`);
}

// src/client/model/install-state.ts
var import_semver = __toESM(require_semver2(), 1);
function installedFrom(result) {
  if (!result.ok) throw result.error;
  return new Map(result.value.filter((b) => b.installed).map((b) => [b.name, b.version !== void 0 ? { version: b.version } : {}]));
}
function installStateOf(plugin, installed) {
  const have = installed.get(plugin.name);
  if (have) {
    const older = have.version && import_semver.default.valid(have.version) && import_semver.default.valid(plugin.version) && import_semver.default.lt(have.version, plugin.version);
    return older ? "update" : "installed";
  }
  return plugin.compatibility === "incompatible" ? "incompatible" : "install";
}
var STORE_PACKAGE = "dsh-plugin-store";
var STORE_REPO = "github:yang051211/dsh-plugin-store";
function selfUpdateOf(latest, installed) {
  const current = installed?.get(STORE_PACKAGE)?.version;
  if (!current || !latest || import_semver.default.valid(current) !== current || import_semver.default.valid(latest) !== latest) return null;
  return import_semver.default.lt(current, latest) ? { current, latest, spec: `${STORE_REPO}#v${latest}` } : null;
}

// src/client/model/localize.ts
function localize(text, lang) {
  if (typeof text === "string") return text;
  if (!text || typeof text !== "object") return "";
  const base = lang.toLowerCase().split("-")[0] ?? "";
  for (const key of [lang, base, "zh", "en"]) {
    const value = text[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return Object.values(text).find((v2) => typeof v2 === "string" && v2 !== "") ?? "";
}

// src/client/ui/common.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function makeTranslate(lookup) {
  return (key, params) => {
    const text = lookup(key);
    return params ? text.replace(/\{(\w+)\}/g, (_2, name2) => params[name2] ?? `{${name2}}`) : text;
  };
}
function formatDate(value) {
  if (value === null || value === void 0 || value === "" || value === 0) return "";
  const date = typeof value === "number" ? new Date(value * 1e3) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}
function formatCount(value) {
  if (value === null) return "\u2014";
  return value >= 1e4 ? `${(value / 1e3).toFixed(0)}k` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}k` : String(value);
}
var AVATAR_TONES = [["#c9f2d8", "#8fd6ae", "#1f5c3a"], ["#f6c9d6", "#e79ab3", "#7a2445"], ["#c9e8f6", "#8fc7e6", "#1c5371"], ["#e3d4f6", "#b9a0e8", "#4b2f7f"], ["#f6dfc4", "#e7b47f", "#7a4a17"], ["#d5dae3", "#a9b2c3", "#323a49"]];
function initialsOf(name2) {
  const words = name2.replace(/^@[^/]+\//, "").replace(/^dsh-(?:plugin-)?/, "").split(/[-_.]/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}
function PluginIcon({ plugin, size = 38 }) {
  const style = { width: size, height: size, borderRadius: Math.round(size / 4.2) };
  if (plugin.icon) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { className: "ps-icon", src: plugin.icon, alt: "", style, referrerPolicy: "no-referrer", loading: "lazy" });
  let hash = 0;
  for (const ch of plugin.name) hash = hash * 31 + ch.charCodeAt(0) >>> 0;
  const [from, to, ink] = AVATAR_TONES[hash % AVATAR_TONES.length];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ps-icon ps-icon-letters", style: { ...style, background: `linear-gradient(145deg, ${from}, ${to})`, color: ink, fontSize: Math.round(size * 0.37) }, "aria-hidden": "true", children: initialsOf(plugin.name) });
}
function incompatibleReason(plugin, dshVersion, t) {
  return t("incompatibleHint", { range: plugin.enginesDsh ?? "", version: dshVersion ?? "?" });
}
function InstallButton({ plugin, installed, dshVersion, t, onClick, large, primary }) {
  const state = installed ? installStateOf(plugin, installed) : null;
  const label = t(state ?? "install");
  const hint = state === "incompatible" ? incompatibleReason(plugin, dshVersion, t) : void 0;
  const look = state === "installed" ? "ps-btn-quiet" : primary && state === "install" ? "ps-btn-primary" : "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      className: `ps-btn ${look} ${large ? "ps-btn-large" : ""}`,
      disabled: state === null || state === "incompatible",
      title: hint,
      onClick: (event) => {
        event.stopPropagation();
        if (state) onClick(plugin, state);
      },
      children: label
    }
  );
}
function keywordsOf(plugin) {
  return plugin.keywords.filter((word) => !/dsh|deepseek|harness|cordis|plugin|^agent$|^ai$/i.test(word)).slice(0, 3);
}
function PluginCard({ plugin, installed, lang, t, onOpenPlugin, categoryTitle }) {
  const isInstalled = installed?.has(plugin.name) ?? false;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "ps-card", onClick: () => onOpenPlugin(plugin.name), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ps-card-hd", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginIcon, { plugin }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ps-card-id", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: localize(plugin.title, lang) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: plugin.name })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ps-card-bd", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ps-card-tags", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "#",
          plugin.category
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          "v",
          plugin.version
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ps-chips", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ps-chip ps-chip-main", children: categoryTitle }),
        keywordsOf(plugin).map((word) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ps-chip", children: word }, word))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ps-card-pitch", children: localize(plugin.description, lang) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ps-card-ft", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { title: t("stars"), children: [
        "\u2606 ",
        formatCount(plugin.stats.stars)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { title: t("weeklyDownloads"), children: [
        "\u2193 ",
        formatCount(plugin.stats.weeklyDownloads)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `ps-card-open ${isInstalled ? "ps-card-done" : ""}`, children: [
        t(isInstalled ? "installed" : "cardView"),
        " \u2197"
      ] })
    ] })
  ] });
}
function PluginGrid({ plugins, columns = 4, catalog, ...card }) {
  const titleOf = (id) => localize(catalog.categories.find((c) => c.id === id)?.title, card.lang) || id;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `ps-grid ps-grid-${columns}`, children: plugins.map((plugin) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginCard, { plugin, categoryTitle: titleOf(plugin.category), ...card }, plugin.name)) });
}
function PageHeader({ crumb, title, intro, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: `ps-ph ${children ? "ps-ph-split" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ps-crumb", children: crumb }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "ps-ph-title", children: title }),
      intro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ps-ph-intro", children: intro })
    ] }),
    children
  ] });
}
var SEARCH_ICON = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", "aria-hidden": "true", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 20l-3.5-3.5" })
] });
function SearchField({ t, onSearch, initial = "" }) {
  const [query, setQuery] = (0, import_react.useState)(initial);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "ps-search", role: "search", onSubmit: (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }, children: [
    SEARCH_ICON,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: query, placeholder: t("searchPlaceholder"), "aria-label": t("search"), onChange: (e) => setQuery(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "ps-btn ps-btn-primary", children: t("searchButton") })
  ] });
}

// src/client/ui/ErrorBoundary.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var ErrorBoundary = class extends import_react2.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  componentDidCatch(error) {
    console.error("[dsh-plugin-store]", error);
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { t } = this.props;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ps-root ps-crash", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("crashTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "ps-muted", children: error.message }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "ps-btn ps-btn-primary", onClick: () => {
        this.setState({ error: null });
        this.props.onReset?.();
      }, children: t("retry") })
    ] });
  }
};

// src/client/ui/HandoffToast.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function HandoffToast({ handoff, t }) {
  const pending = (0, import_react3.useSyncExternalStore)(handoff.subscribe, handoff.peek, () => null);
  if (!pending) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ps-toast", role: "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("handoff", { name: pending.title }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "ps-link-btn", onClick: () => handoff.dismiss(), children: t("dismiss") })
  ] });
}

// src/client/ui/StoreApp.tsx
var import_react7 = require("react");

// src/client/model/catalog.ts
var PERMISSION_KEYS = ["network", "fileSystem", "childProcess", "agentTools", "installScripts"];
var SORT_KEYS = ["popular", "updated", "new", "stars"];
var PAGE_SIZE = 30;
var absolute = (ref, base) => {
  if (typeof ref !== "string" || ref === "") return null;
  try {
    const url = new URL(ref, base);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "data:" ? url.href : null;
  } catch {
    return null;
  }
};
function permissionsOf(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const key of PERMISSION_KEYS) {
    if (typeof raw[key] !== "boolean") return null;
    out[key] = raw[key];
  }
  return out;
}
var count = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
function toPlugin(entry, snapshot) {
  const latest = entry["dist-tags"]?.latest;
  const listed = entry.versions.find((v2) => v2.version === latest) ?? entry.versions[0];
  const store = entry.store ?? {};
  const published = listed.publishTimestamp ?? 0;
  return {
    name: entry.name,
    title: entry.title ?? entry.name,
    // Indexes from before the directory kept the pitch in store.tagline.
    description: store.tagline ?? entry.description ?? "",
    icon: absolute(entry.icon, snapshot.indexUrl),
    author: typeof entry.author === "string" ? entry.author : null,
    category: entry.metadata?.category ?? "other",
    keywords: Array.isArray(entry.metadata?.keywords) ? entry.metadata.keywords : [],
    version: listed.version,
    publishTimestamp: published,
    created: count(store.created) ?? published,
    enginesDsh: listed.engines?.dsh ?? null,
    stats: { stars: count(store.stats?.stars), weeklyDownloads: count(store.stats?.weeklyDownloads) },
    permissions: permissionsOf(store.permissions),
    opaque: store.opaque === true,
    scanFailed: store.scanFailed === true,
    compatibility: snapshot.compatibility[entry.name] ?? "unknown",
    repository: entry.repository ?? null,
    homepage: entry.homepage ?? null
  };
}
function buildCatalog(snapshot) {
  const doc = snapshot.index;
  const plugins = doc.plugins.map((entry) => toPlugin(entry, snapshot));
  const declared = doc.metadata?.categories ?? {};
  const order = Array.isArray(doc.store?.categoryOrder) ? doc.store.categoryOrder : Object.keys(declared);
  const categories = [.../* @__PURE__ */ new Set([...order, ...Object.keys(declared)])].map((id) => ({ id, title: declared[id]?.title ?? id, plugins: plugins.filter((p) => p.category === id) })).filter((c) => c.plugins.length > 0);
  return {
    plugins,
    byName: new Map(plugins.map((p) => [p.name, p])),
    categories,
    storeVersion: typeof doc.store?.self?.version === "string" ? doc.store.self.version : null,
    stale: snapshot.stale,
    dshVersion: snapshot.dshVersion
  };
}
var KEY_OF = {
  popular: (p) => p.stats.weeklyDownloads,
  updated: (p) => p.publishTimestamp || null,
  new: (p) => p.created || null,
  stars: (p) => p.stats.stars
};
function sortPlugins(plugins, key) {
  const of = KEY_OF[key];
  return [...plugins].sort((a3, b) => {
    const x2 = of(a3), y2 = of(b);
    if (x2 !== y2) return x2 === null ? 1 : y2 === null ? -1 : y2 - x2;
    return a3.name < b.name ? -1 : a3.name > b.name ? 1 : 0;
  });
}
function pageOf(list, page, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const at2 = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: list.slice((at2 - 1) * size, at2 * size), page: at2, pages };
}
function searchPlugins(catalog, query) {
  const needle = query.trim().toLowerCase();
  if (needle === "") return catalog.plugins;
  const texts = (text) => typeof text === "string" ? [text] : Object.values(text);
  return catalog.plugins.filter((p) => [p.name, ...texts(p.title), ...texts(p.description), ...p.keywords, p.author ?? ""].some((value) => typeof value === "string" && value.toLowerCase().includes(needle)));
}

// src/client/ui/ConfirmInstall.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function ConfirmInstall({ plugin, lang, t, onCancel, onConfirm }) {
  const confirmButton = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    confirmButton.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ps-modal-backdrop", onClick: onCancel, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ps-modal", role: "dialog", "aria-modal": "true", "aria-label": t("confirmTitle"), onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: t("confirmTitle") }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ps-modal-plugin", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PluginIcon, { plugin, lang, size: 48 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ps-row-title", children: localize(plugin.title, lang) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ps-muted", children: plugin.name })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("dl", { className: "ps-facts", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("confirmVersion") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("dd", { children: [
        "v",
        plugin.version
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("confirmSource") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: "npm" }),
      plugin.author && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("author") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: plugin.author })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "ps-trust", children: t("confirmTrust") }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ps-modal-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "ps-btn", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "ps-btn ps-btn-primary", ref: confirmButton, onClick: onConfirm, children: t("continue") })
    ] })
  ] }) });
}

// src/client/ui/DetailView.tsx
var import_react6 = require("react");

// src/client/safe/markdown.tsx
var import_react5 = require("react");

// node_modules/marked/lib/marked.esm.js
function B() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var y = B();
function V(a3) {
  y = a3;
}
var M = { exec: () => null };
function D(a3) {
  let e = [];
  return (t) => {
    let n = Math.max(0, Math.min(3, t - 1)), i = e[n];
    return i || (i = a3(n), e[n] = i), i;
  };
}
function h(a3, e = "") {
  let t = typeof a3 == "string" ? a3 : a3.source, n = { replace: (i, r) => {
    let o = typeof r == "string" ? r : r.source;
    return o = o.replace(x.caret, "$1"), t = t.replace(i, o), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var ze = ((a3 = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + a3);
  } catch {
    return false;
  }
})();
var x = { codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, endingSpaceTabChar: /[ \t]$/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, leadingSpaceTab: /^[ \t]+/, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/, numericCharacterReferenceOrAmpersand: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (a3) => new RegExp(`^( {0,3}${a3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: D((a3) => new RegExp(`^ {0,${a3}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: D((a3) => new RegExp(`^ {0,${a3}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)), fencesBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}(?:\`\`\`|~~~)`)), headingBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}#`)), htmlBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}(?:</?(?:${Q})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`, "i")), blockquoteBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}>`)) };
var Ee = /^(?:[ \t]*(?:\n|$))+/;
var Me = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var Ce = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var N = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Ie = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var Y = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
var fe = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var me = h(fe).replace(/bull/g, Y).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Be = h(fe).replace(/bull/g, Y).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var ee = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
var De = /^[^\n]+/;
var te = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var qe = h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", te).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Ze = h(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, Y).getRegex();
var Q = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var ne = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var ve = h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", ne).replace("tag", Q).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var xe = (a3) => h(ee).replace("hr", N).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", a3).replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", Q).getRegex();
var He = xe(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
var Ge = xe(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
var Ne = h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", Ge).getRegex();
var re = { blockquote: Ne, code: Me, def: qe, fences: Ce, heading: Ie, hr: N, html: ve, lheading: me, list: Ze, newline: Ee, paragraph: He, table: M, text: De };
var de = h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", N).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", Q).getRegex();
var Qe = { ...re, lheading: Be, table: de, paragraph: h(ee).replace("hr", N).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", de).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", Q).getRegex() };
var je = { ...re, html: h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", ne).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: M, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h(ee).replace("hr", N).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", me).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Fe = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var Ue = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var be = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;
var Ke = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var S = /[\p{P}\p{S}]/u;
var q = /[\s\p{P}\p{S}]/u;
var j = /[^\s\p{P}\p{S}]/u;
var Xe = h(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, q).getRegex();
var We = /[\p{Pi}\p{Ps}"']/u;
var Re = /(?!~)[\p{P}\p{S}]/u;
var Ve = /(?!~)[\s\p{P}\p{S}]/u;
var Je = /(?:[^\s\p{P}\p{S}]|~)/u;
var Ye = h(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", ze ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var Te = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
var et = h(Te, "u").replace(/punct/g, S).getRegex();
var tt = h(Te, "u").replace(/punct/g, Re).getRegex();
var nt = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
var rt = h(nt, "u").replace(/openQuote/g, We).replace(/punct/g, S).getRegex();
var Oe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var st = h(Oe, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var it = h(Oe, "gu").replace(/notPunctSpace/g, Je).replace(/punctSpace/g, Ve).replace(/punct/g, Re).getRegex();
var ot = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
var at = h(ot, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var lt = h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var ut = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
var pt = h(ut, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var ct = h(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, S).getRegex();
var ht = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
var dt = h(ht, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var kt = h(/\\(punct)/, "gu").replace(/punct/g, S).getRegex();
var gt = h(/(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\(punct)/, "gu").replace(/punct/g, S).getRegex();
var ft = h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var mt = h(ne).replace("(?:-->|$)", "-->").getRegex();
var xt = h("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", mt).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var we = /\[(?:\\[\s\S]|[^\[\]\\])*\]/;
var K = h(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets", we).getRegex();
var bt = h(/^!?\[(label)\]\([ \t\n]*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?[ \t\n]*\)/).replace("label", K).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var Rt = h(/^!?\[(label)\]\[(ref)\]/).replace("label", K).replace("ref", te).getRegex();
var Tt = h(/^!?\[(ref)\](?:\[\])?/).replace("ref", te).getRegex();
var ke = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/;
var Ot = h(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets", we).getRegex();
var wt = h("reflink|nolink(?!\\()", "g").replace("reflink", h(/^!?\[(label)\]\[(ref)\]/).replace("label", Ot).replace("ref", ke).getRegex()).replace("nolink", h(/^!?\[(ref)\](?:\[\])?/).replace("ref", ke).getRegex()).getRegex();
var ge = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var Pt = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
var yt = h(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g, Pt).getRegex();
var se = { _backpedal: M, anyPunctuation: kt, anyPunctuationOutsideCode: gt, autolink: ft, blockSkip: Ye, br: be, code: Ue, del: M, delLDelim: M, delRDelim: M, emStrongLDelim: et, emStrongRDelimAst: st, emStrongRDelimUnd: lt, escape: Fe, link: bt, nolink: Tt, punctuation: Xe, reflink: Rt, reflinkSearch: wt, tag: xt, text: Ke, url: M };
var St = { ...se, emStrongLDelim: rt, emStrongRDelimAst: at, emStrongRDelimUnd: pt, link: h(/^!?\[(label)\]\((.*?)\)/).replace("label", K).getRegex(), reflink: h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", K).getRegex() };
var J = { ...se, emStrongRDelimAst: it, emStrongLDelim: tt, delLDelim: ct, delRDelim: dt, url: h(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol", yt).replace("protocol", ge).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: h(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol", ge).replace(/emailProtocol/g, /(?:mailto|xmpp):/).getRegex() };
var _t = { ...J, br: h(be).replace("{2,}", "*").getRegex(), text: h(J.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var F = { normal: re, gfm: Qe, pedantic: je };
var Z = { normal: se, gfm: J, breaks: _t, pedantic: St };
var $t = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var Pe = (a3) => $t[a3];
function w(a3, e) {
  if (e) {
    if (x.escapeTest.test(a3)) return a3.replace(x.escapeReplace, Pe);
  } else if (x.escapeTestNoEncode.test(a3)) return a3.replace(x.escapeReplaceNoEncode, Pe);
  return a3;
}
function ye(a3) {
  return x.numericCharacterReference.test(a3) ? a3.replace(x.numericCharacterReferenceOrAmpersand, (e, t, n) => {
    if (t === void 0 && n === void 0) return "&amp;";
    let i = t === void 0 ? Number.parseInt(n, 16) : Number.parseInt(t, 10);
    return i === 0 || i > 1114111 || i >= 55296 && i <= 57343 ? "\uFFFD" : i === 38 ? "&amp;" : String.fromCodePoint(i);
  }) : a3;
}
function ie(a3) {
  try {
    a3 = encodeURI(a3).replace(x.percentDecode, "%");
  } catch {
    return null;
  }
  return a3;
}
function oe(a3, e) {
  let t = a3.replace(x.findPipe, (r, o, s) => {
    let l = false, u = o;
    for (; --u >= 0 && s[u] === "\\"; ) l = !l;
    return l ? "|" : " |";
  }), n = t.split(x.splitPipe), i = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; i < n.length; i++) n[i] = n[i].trim().replace(x.slashPipe, "|");
  return n;
}
function A(a3, e, t) {
  let n = a3.length;
  if (n === 0) return "";
  let i = 0;
  for (; i < n; ) {
    let r = a3.charAt(n - i - 1);
    if (r === e && !t) i++;
    else if (r !== e && t) i++;
    else break;
  }
  return a3.slice(0, n - i);
}
function ae(a3) {
  let e = a3.split(`
`), t = e.length - 1;
  for (; t >= 0 && x.blankLine.test(e[t]); ) t--;
  return e.length - t <= 2 ? a3 : e.slice(0, t + 1).join(`
`);
}
function v(a3) {
  return a3.trim().toLowerCase().toUpperCase().toLowerCase();
}
function le(a3, e) {
  if (a3.indexOf(e[0]) === -1 && a3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < a3.length; n++) if (a3[n] === "\\") n++;
  else if (a3[n] === e[0]) t++;
  else if (a3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function X(a3, e = 0) {
  let t = e, n = "";
  for (let i of a3) if (i === "	") {
    let r = 4 - t % 4;
    n += " ".repeat(r), t += r;
  } else n += i, t++;
  return n;
}
function Se(a3, e, t, n, i) {
  let r = e.href, o = e.title || null, s = a3[1].replace(i.other.outputLinkReplace, "$1"), l = a3[0].charAt(0) === "!", u = n.state.inLink, c = n.state.linkEmitted, p = n.state.inRawBlock;
  n.state.inLink = true, n.state.linkEmitted = false;
  let d = n.inlineTokens(s), g = n.state.linkEmitted;
  if (n.state.linkEmitted = c, n.state.inLink = u, !l) {
    if (g) {
      n.state.inRawBlock = p;
      return;
    }
    n.state.linkEmitted = true;
  }
  return { type: l ? "image" : "link", raw: t, href: r, title: o, text: s, tokens: d };
}
function Lt(a3, e, t) {
  let n = a3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let i = n[1];
  return e.split(`
`).map((r) => {
    let o = r.match(t.other.beginningSpace);
    if (o === null) return r;
    let [s] = o;
    return r.slice(Math.min(s.length, i.length));
  }).join(`
`);
}
function _e(a3, e, t, n) {
  if (!e.includes("<")) return false;
  for (let i = 0; i < e.length; i++) {
    if (e[i] === "\\") {
      i++;
      continue;
    }
    if (e[i] === "`") {
      let s = n.inline.code.exec(e.slice(i));
      if (s) {
        i += s[0].length - 1;
        continue;
      }
    }
    if (e[i] !== "<") continue;
    let r = a3.slice(t + i), o = n.inline.tag.exec(r) || n.inline.autolink.exec(r);
    if (o) {
      if (o[0].length > e.length - i) return true;
      i += o[0].length - 1;
    }
  }
  return false;
}
var _ = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = this.options.pedantic ? t[0] : ae(t[0]), i = n.replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: n, codeBlockStyle: "indented", text: i };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], i = Lt(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: i };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let i = A(n, "#");
        (this.options.pedantic || !i || this.rules.other.endingSpaceTabChar.test(i)) && (n = i.trim());
      }
      return { type: "heading", raw: A(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: A(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = A(t[0], `
`).split(`
`), i = "", r = "", o = [];
      for (; n.length > 0; ) {
        let s = false, l = [], u;
        for (u = 0; u < n.length; u++) if (this.rules.other.blockquoteStart.test(n[u])) l.push(n[u]), s = true;
        else if (!s) l.push(n[u]);
        else break;
        n = n.slice(u);
        let c = l.join(`
`), p = c.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        i = i ? `${i}
${c}` : c, r = r ? `${r}
${p}` : p;
        let d = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(p, o, true), this.lexer.state.top = d, n.length === 0) break;
        let g = o.at(-1);
        if (g?.type === "code" || g?.type === "heading" || g?.type === "hr" || g?.type === "html") break;
        if (g?.type === "blockquote") {
          let k = g, P = n.join(`
`), R = k.raw + `
` + P.replace(this.rules.other.blockquoteSetextReplace2, ""), m = this.blockquote(R);
          o[o.length - 1] = m;
          let E = R.substring(m.raw.length).replace(/^\n/, ""), b = E ? E.split(`
`).length : 0, H = b ? n.slice(0, -b) : n;
          H.length > 0 && (i = `${i}
${H.join(`
`)}`), r = r.substring(0, r.length - k.text.length) + m.text;
          break;
        } else if (g?.type === "list") {
          let k = g, P = k.raw + `
` + n.join(`
`), R = this.list(P);
          o[o.length - 1] = R, i = i.substring(0, i.length - g.raw.length) + R.raw, r = r.substring(0, r.length - k.raw.length) + R.raw, n = P.substring(o.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: i, tokens: o, text: r };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = e, i = () => n.length - e.length, r = t[1].trim(), o = r.length > 1, s = { type: "list", raw: "", ordered: o, start: o ? +r.slice(0, -1) : "", loose: false, items: [] };
      r = o ? `\\d{1,9}\\${r.slice(-1)}` : `\\${r}`, this.options.pedantic && (r = o ? r : "[*+-]");
      let l = this.rules.other.listItemRegex(r), u = false;
      for (; e; ) {
        let p = false, d = "";
        if (!(t = l.exec(e)) || this.rules.block.hr.test(e)) break;
        let g = i();
        e = e.substring(t[0].length);
        let k = t[2].split(`
`, 1)[0], P = t[1].length, R = this.options.pedantic ? X(k, P) : k.replace(this.rules.other.leadingSpaceTab, (W) => X(W, P)), m = e.split(`
`, 1)[0], E = !R.trim(), b = 0;
        if (this.options.pedantic ? (b = 2, d = R.trimStart()) : E ? b = P + 1 : (b = R.search(this.rules.other.nonSpaceChar), b = b > 4 ? 1 : b, d = R.slice(b), b += P), E && this.rules.other.blankLine.test(m) && (e = e.substring(m.length + 1), p = true), !p) {
          let W = this.rules.other.nextBulletRegex(b), ue = this.rules.other.hrRegex(b), pe = this.rules.other.fencesBeginRegex(b), ce = this.rules.other.headingBeginRegex(b), $e = this.rules.other.htmlBeginRegex(b), Le = this.rules.other.blockquoteBeginRegex(b);
          for (; e; ) {
            let he = e.split(`
`, 1)[0], G;
            if (m = he, this.options.pedantic ? (m = m.replace(this.rules.other.listReplaceNesting, "  "), G = m) : G = m.replace(this.rules.other.leadingSpaceTab, (Ae) => X(Ae)), pe.test(m) || ce.test(m) || $e.test(m) || Le.test(m) || W.test(m) || ue.test(m)) break;
            if (G.search(this.rules.other.nonSpaceChar) >= b || !m.trim()) d += `
` + G.slice(b);
            else {
              if (E || R.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || pe.test(R) || ce.test(R) || ue.test(R)) break;
              d += `
` + m;
            }
            E = !m.trim(), e = e.substring(he.length + 1), R = G.slice(b);
          }
        }
        let H = n.slice(g, i());
        s.loose || (u ? s.loose = true : this.rules.other.doubleBlankLine.test(H) && (u = true)), s.items.push({ type: "list_item", raw: H, task: !!this.options.gfm && this.rules.other.listIsTask.test(d), loose: false, text: d, tokens: [] });
      }
      let c = s.items.at(-1);
      if (c) c.raw = c.raw.trimEnd(), c.text = c.text.trimEnd();
      else return;
      s.raw = n.slice(0, i()).trimEnd();
      for (let p of s.items) if (this.lexer.state.top = false, p.tokens = this.lexer.blockTokens(p.text, []), !s.loose) {
        let d = p.tokens.filter((k) => k.type === "space"), g = d.length > 0 && d.some((k) => this.rules.other.anyLine.test(k.raw));
        s.loose = g;
      }
      for (let p of s.items) {
        let d = p.tokens[0];
        if (p.task && (d?.type === "text" || d?.type === "paragraph")) {
          p.text = p.text.replace(this.rules.other.listReplaceTask, ""), d.raw = d.raw.replace(this.rules.other.listReplaceTask, ""), d.text = d.text.replace(this.rules.other.listReplaceTask, "");
          for (let k = this.lexer.inlineQueue.length - 1; k >= 0; k--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[k].src)) {
            this.lexer.inlineQueue[k].src = this.lexer.inlineQueue[k].src.replace(this.rules.other.listReplaceTask, "");
            break;
          }
          let g = this.rules.other.listTaskCheckbox.exec(p.raw);
          if (g) {
            let k = { type: "checkbox", raw: g[0] + " ", checked: g[0] !== "[ ]" };
            p.checked = k.checked, s.loose ? p.tokens[0] && ["paragraph", "text"].includes(p.tokens[0].type) && "tokens" in p.tokens[0] && p.tokens[0].tokens ? (p.tokens[0].raw = k.raw + p.tokens[0].raw, p.tokens[0].text = k.raw + p.tokens[0].text, p.tokens[0].tokens.unshift(k)) : p.tokens.unshift({ type: "paragraph", raw: k.raw, text: k.raw, tokens: [k] }) : p.tokens.unshift(k);
          }
        } else p.task && (p.task = false);
      }
      if (s.loose) for (let p of s.items) {
        p.loose = true;
        for (let d of p.tokens) d.type === "text" && (d.type = "paragraph");
      }
      return s;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) {
      let n = ae(t[0]);
      return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
    }
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      if (!this.rules.other.startAngleBracket.test(t[2]) && le(t[2], "()") !== -1) return;
      let n = v(t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: A(t[0], `
`), href: i, title: r };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = oe(t[1]), i = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: A(t[0], `
`), header: [], align: [], rows: [] };
    if (n.length === i.length) {
      for (let s of i) this.rules.other.tableAlignRight.test(s) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(s) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(s) ? o.align.push("left") : o.align.push(null);
      for (let s = 0; s < n.length; s++) o.header.push({ text: n[s], tokens: this.lexer.inline(n[s]), header: true, align: o.align[s] });
      for (let s of r) o.rows.push(oe(s, o.header.length).map((l, u) => ({ text: l, tokens: this.lexer.inline(l), header: false, align: o.align[u] })));
      return o;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: A(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    if (this.lexer.state.linkParenPossible === false) return;
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && _e(e, t[1], n, this.rules)) return;
      let i = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(i)) {
        if (!this.rules.other.endAngleBracket.test(i)) return;
        let s = A(i.slice(0, -1), "\\");
        if ((i.length - s.length) % 2 === 0) return;
      } else {
        let s = le(t[2], "()");
        if (s === -2) return;
        if (s > -1) {
          let u = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
          t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, u).trim(), t[3] = "";
        }
      }
      let r = t[2], o = "";
      if (this.options.pedantic) {
        let s = this.rules.other.pedanticHrefTitle.exec(r);
        s && (r = s[1], o = s[3]);
      } else o = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(i) ? r = r.slice(1) : r = r.slice(1, -1)), Se(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: o && o.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let i = n[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && _e(e, n[1], i, this.rules)) return;
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), o = t[v(r)];
      if (!o) {
        let s = n[0].charAt(0);
        return { type: "text", raw: s, text: s };
      }
      return Se(n, o, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let i = this.rules.inline.emStrongLDelim.exec(e);
    if (!i || !i[1] && !i[2] && !i[3] && !i[4] || i[4] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(i[1] || i[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...i[0]].length - 1, s, l, u = o, c = 0, p = i[0][0], d = n === p, g = p === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (g.lastIndex = 0, t = t.slice(-1 * e.length + o); (i = g.exec(t)) !== null; ) {
        if (s = i[1] || i[2] || i[3] || i[4] || i[5] || i[6], !s) continue;
        if (l = [...s].length, i[3] || i[4]) {
          u += l;
          continue;
        } else if (i[5] || i[6]) {
          if (o % 3 && !((o + l) % 3)) {
            c += l;
            continue;
          }
          if (d) break;
        }
        if (u -= l, u > 0) continue;
        l = Math.min(l, l + u + c);
        let k = [...i[0]][0].length, P = e.slice(0, o + i.index + k + l);
        if (Math.min(o, l) % 2) {
          let m = P.slice(1, -1);
          return { type: "em", raw: P, text: m, tokens: this.lexer.inlineTokens(m) };
        }
        let R = P.slice(2, -2);
        return { type: "strong", raw: P, text: R, tokens: this.lexer.inlineTokens(R) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), i = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return i && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let i = this.rules.inline.delLDelim.exec(e);
    if (!i) return;
    if (!(i[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...i[0]].length - 1, s, l, u = o, c = this.rules.inline.delRDelim;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + o); (i = c.exec(t)) !== null; ) {
        if (s = i[1] || i[2] || i[3] || i[4] || i[5] || i[6], !s || (l = [...s].length, l !== o)) continue;
        if (i[3] || i[4]) {
          u += l;
          continue;
        }
        if (u -= l, u > 0) continue;
        l = Math.min(l, l + u);
        let p = [...i[0]][0].length, d = e.slice(0, o + i.index + p + l), g = d.slice(o, -o);
        return { type: "del", raw: d, text: g, tokens: this.lexer.inlineTokens(g) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, i;
      return t[2] === "@" ? (n = t[1], i = "mailto:" + n) : (n = t[1], i = n), { type: "link", raw: t[0], text: n, href: i, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, i;
      if (t[2] === "@") n = t[0], i = "mailto:" + n;
      else {
        let r;
        do
          r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (r !== t[0]);
        n = t[0], t[1] === "www." ? i = "http://" + t[0] : i = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: i, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: n ? t[0] : ye(t[0]), escaped: n };
    }
  }
};
var T = class a {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || y, this.options.tokenizer = this.options.tokenizer || new _(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, linkParenPossible: true, top: true };
    let t = { other: x, block: F.normal, inline: Z.normal };
    this.options.pedantic ? (t.block = F.pedantic, t.inline = Z.pedantic) : this.options.gfm && (t.block = F.gfm, this.options.breaks ? t.inline = Z.breaks : t.inline = Z.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: F, inline: Z };
  }
  static lex(e, t) {
    return new a(t).lex(e);
  }
  static lexInline(e, t) {
    return new a(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(x.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(x.tabCharGlobal, "    ").replace(x.spaceLine, ""));
    let i = 1 / 0;
    for (; e; ) {
      if (e.length < i) i = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      let r;
      if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let o = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0, l = e.slice(1), u;
        this.options.extensions.startBlock.forEach((c) => {
          u = c.call({ lexer: this }, l), typeof u == "number" && u >= 0 && (s = Math.min(s, u));
        }), s < 1 / 0 && s >= 0 && (o = e.substring(0, s + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(o))) {
        let s = t.at(-1);
        n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = o.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  linkInText(e) {
    if (!e.includes("[")) return false;
    let t = this.tokenizer.rules.inline.link;
    for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t.test(n[0]) && e.charAt(n.index - 1) !== "!") return true;
    for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
      let i = n[0], r = i.lastIndexOf("[");
      if (!(i.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, v(i.slice(r + 1, -1)))) && !(r > 1 && this.linkInText(i.slice(1, r - 1)))) return true;
    }
    return false;
  }
  inlineTokens(e, t = []) {
    this.tokenizer.lexer = this;
    let n = this.state.linkParenPossible;
    this.state.linkParenPossible = n && e.includes(")");
    try {
      return this.#e(e, t);
    } finally {
      this.state.linkParenPossible = n;
    }
  }
  #e(e, t) {
    let n = e;
    if (this.tokens.links && e.includes("[")) {
      let s = this.tokenizer.rules.inline.reflinkSearch, l = (u) => {
        let c = u.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, v(u.slice(c + 1, -1)))) return u;
        if (c > 1 && u.charAt(0) !== "!") {
          let p = u.slice(1, c - 1);
          if (this.linkInText(p)) return "[" + p.replace(s, l) + "][" + "a".repeat(u.length - c - 2) + "]";
        }
        return "[" + "a".repeat(u.length - 2) + "]";
      };
      n = n.replace(s, l);
    }
    n = n.replace(this.tokenizer.rules.inline.anyPunctuationOutsideCode, (s, l, u) => u ? "+".repeat(s.length) : l ? l + s.slice(l.length, -l.length).replace(/`/g, "+") + l : s), n = n.replace(this.tokenizer.rules.inline.blockSkip, (s, l, u) => {
      let c = u ? u.length : 0;
      return s.slice(0, c) + "[" + "a".repeat(s.length - c - 2) + "]";
    }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let i = false, r = "", o = 1 / 0;
    for (; e; ) {
      if (e.length < o) o = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      i || (r = ""), i = false;
      let s;
      if (this.options.extensions?.inline?.some((u) => (s = u.call({ lexer: this }, e, t)) ? (e = e.substring(s.raw.length), t.push(s), true) : false)) continue;
      if (s = this.tokenizer.escape(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.tag(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.link(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(s.raw.length);
        let u = t.at(-1);
        s.type === "text" && u?.type === "text" ? (u.raw += s.raw, u.text += s.text) : t.push(s);
        continue;
      }
      if (s = this.tokenizer.emStrong(e, n, r)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.codespan(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.br(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.del(e, n, r)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.autolink(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (!this.state.inLink && (s = this.tokenizer.url(e))) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      let l = e;
      if (this.options.extensions?.startInline) {
        let u = 1 / 0, c = e.slice(1), p;
        this.options.extensions.startInline.forEach((d) => {
          p = d.call({ lexer: this }, c), typeof p == "number" && p >= 0 && (u = Math.min(u, p));
        }), u < 1 / 0 && u >= 0 && (l = e.substring(0, u + 1));
      }
      if (s = this.tokenizer.inlineText(l)) {
        e = e.substring(s.raw.length), s.raw.slice(-1) !== "_" && (r = s.raw.slice(-1)), i = true;
        let u = t.at(-1);
        u?.type === "text" ? (u.raw += s.raw, u.text += s.text) : t.push(s);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return t;
  }
  infiniteLoopError(e) {
    let t = "Infinite loop on byte: " + e;
    if (this.options.silent) console.error(t);
    else throw new Error(t);
  }
};
var $ = class {
  options;
  parser;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let i = (t || "").match(x.notSpaceStart)?.[0], r = e ? e.replace(x.endingNewline, "") + `
` : "";
    return i ? '<pre><code class="language-' + w(i) + '">' + (n ? r : w(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : w(r, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, i = "";
    for (let s = 0; s < e.items.length; s++) {
      let l = e.items[s];
      i += this.listitem(l);
    }
    let r = t ? "ol" : "ul", o = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + o + `>
` + i + "</" + r + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let r = 0; r < e.header.length; r++) n += this.tablecell(e.header[r]);
    t += this.tablerow({ text: n });
    let i = "";
    for (let r = 0; r < e.rows.length; r++) {
      let o = e.rows[r];
      n = "";
      for (let s = 0; s < o.length; s++) n += this.tablecell(o[s]);
      i += this.tablerow({ text: n });
    }
    return i && (i = `<tbody>${i}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + i + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${w(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, text: n, tokens: i, autolink: r }) {
    let o = r ? w(n, true) : this.parser.parseInline(i), s = ie(e);
    if (s === null) return o;
    e = w(s, r);
    let l = '<a href="' + e + '"';
    return t && (l += ' title="' + w(t) + '"'), l += ">" + o + "</a>", l;
  }
  image({ href: e, title: t, text: n, tokens: i }) {
    i && (n = this.parser.parseInline(i, this.parser.textRenderer));
    let r = ie(e);
    if (r === null) return w(n);
    e = r;
    let o = `<img src="${w(e)}" alt="${w(n)}"`;
    return t && (o += ` title="${w(t)}"`), o += ">", o;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : w(e.text);
  }
};
var z = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var O = class a2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || y, this.options.renderer = this.options.renderer || new $(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new z();
  }
  static parse(e, t) {
    return new a2(t).parse(e);
  }
  static parseInline(e, t) {
    return new a2(t).parseInline(e);
  }
  parse(e) {
    this.renderer.parser = this;
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let i = e[n];
      if (this.options.extensions?.renderers?.[i.type]) {
        let o = i, s = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (s !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(o.type)) {
          t += s || "";
          continue;
        }
      }
      let r = i;
      switch (r.type) {
        case "space": {
          t += this.renderer.space(r);
          break;
        }
        case "hr": {
          t += this.renderer.hr(r);
          break;
        }
        case "heading": {
          t += this.renderer.heading(r);
          break;
        }
        case "code": {
          t += this.renderer.code(r);
          break;
        }
        case "table": {
          t += this.renderer.table(r);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(r);
          break;
        }
        case "list": {
          t += this.renderer.list(r);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(r);
          break;
        }
        case "html": {
          t += this.renderer.html(r);
          break;
        }
        case "def": {
          t += this.renderer.def(r);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(r);
          break;
        }
        case "text": {
          t += this.renderer.text(r);
          break;
        }
        default: {
          let o = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    this.renderer.parser = this;
    let n = "";
    for (let i = 0; i < e.length; i++) {
      let r = e[i];
      if (this.options.extensions?.renderers?.[r.type]) {
        let s = this.options.extensions.renderers[r.type].call({ parser: this }, r);
        if (s !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
          n += s || "";
          continue;
        }
      }
      let o = r;
      switch (o.type) {
        case "escape": {
          n += t.text(o);
          break;
        }
        case "html": {
          n += t.html(o);
          break;
        }
        case "link": {
          n += t.link(o);
          break;
        }
        case "image": {
          n += t.image(o);
          break;
        }
        case "checkbox": {
          n += t.checkbox(o);
          break;
        }
        case "strong": {
          n += t.strong(o);
          break;
        }
        case "em": {
          n += t.em(o);
          break;
        }
        case "codespan": {
          n += t.codespan(o);
          break;
        }
        case "br": {
          n += t.br(o);
          break;
        }
        case "del": {
          n += t.del(o);
          break;
        }
        case "text": {
          n += t.text(o);
          break;
        }
        default: {
          let s = 'Token with "' + o.type + '" type was not found.';
          if (this.options.silent) return console.error(s), "";
          throw new Error(s);
        }
      }
    }
    return n;
  }
};
var L = class {
  options;
  block;
  constructor(e) {
    this.options = e || y;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? T.lex : T.lexInline;
  }
  provideParser(e = this.block) {
    return e ? O.parse : O.parseInline;
  }
};
function C(a3, e) {
  if (Array.isArray(e)) for (let t = 0; t < e.length; t++) a3.push(e[t]);
  else a3.push(e);
}
var U = class {
  defaults = B();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = O;
  Renderer = $;
  TextRenderer = z;
  Lexer = T;
  Tokenizer = _;
  Hooks = L;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let i of e) switch (C(n, t.call(this, i)), i.type) {
      case "table": {
        let r = i;
        for (let o of r.header) C(n, this.walkTokens(o.tokens, t));
        for (let o of r.rows) for (let s of o) C(n, this.walkTokens(s.tokens, t));
        break;
      }
      case "list": {
        let r = i;
        C(n, this.walkTokens(r.items, t));
        break;
      }
      default: {
        let r = i;
        this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((o) => {
          let s = r[o].flat(1 / 0);
          C(n, this.walkTokens(s, t));
        }) : r.tokens && C(n, this.walkTokens(r.tokens, t));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let i = { ...n };
      if (i.async = this.defaults.async || i.async || false, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name) throw new Error("extension name required");
        if ("renderer" in r) {
          let o = t.renderers[r.name];
          o ? t.renderers[r.name] = function(...s) {
            let l = r.renderer.apply(this, s);
            return l === false && (l = o.apply(this, s)), l;
          } : t.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let o = t[r.level];
          o ? o.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
      }), i.extensions = t), n.renderer) {
        let r = this.defaults.renderer || new $(this.defaults);
        for (let o in n.renderer) {
          if (!(o in r)) throw new Error(`renderer '${o}' does not exist`);
          if (["options", "parser"].includes(o)) continue;
          let s = o, l = n.renderer[s], u = r[s];
          r[s] = (...c) => {
            let p = l.apply(r, c);
            return p === false && (p = u.apply(r, c)), p || "";
          };
        }
        i.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new _(this.defaults);
        for (let o in n.tokenizer) {
          if (!(o in r)) throw new Error(`tokenizer '${o}' does not exist`);
          if (["options", "rules", "lexer"].includes(o)) continue;
          let s = o, l = n.tokenizer[s], u = r[s];
          r[s] = (...c) => {
            let p = l.apply(r, c);
            return p === false && (p = u.apply(r, c)), p;
          };
        }
        i.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new L();
        for (let o in n.hooks) {
          if (!(o in r)) throw new Error(`hook '${o}' does not exist`);
          if (["options", "block"].includes(o)) continue;
          let s = o, l = n.hooks[s], u = r[s];
          L.passThroughHooks.has(o) ? r[s] = (c) => {
            if (this.defaults.async && L.passThroughHooksRespectAsync.has(o)) return (async () => {
              let d = await l.call(r, c);
              return u.call(r, d);
            })();
            let p = l.call(r, c);
            return u.call(r, p);
          } : r[s] = (...c) => {
            if (this.defaults.async) return (async () => {
              let d = await l.apply(r, c);
              return d === false && (d = await u.apply(r, c)), d;
            })();
            let p = l.apply(r, c);
            return p === false && (p = u.apply(r, c)), p;
          };
        }
        i.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, o = n.walkTokens;
        i.walkTokens = function(s) {
          let l = [];
          return l.push(o.call(this, s)), r && C(l, r.call(this, s)), l;
        };
      }
      this.defaults = { ...this.defaults, ...i };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return T.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return O.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, i) => {
      let r = { ...i }, o = { ...this.defaults, ...r }, s = this.onError(!!o.silent, !!o.async);
      if (this.defaults.async === true && r.async === false) return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return s(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return s(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (o.hooks && (o.hooks.options = o, o.hooks.block = e), o.async) return (async () => {
        let l = o.hooks ? await o.hooks.preprocess(n) : n, c = await (o.hooks ? await o.hooks.provideLexer(e) : e ? T.lex : T.lexInline)(l, o), p = o.hooks ? await o.hooks.processAllTokens(c) : c;
        o.walkTokens && await Promise.all(this.walkTokens(p, o.walkTokens));
        let g = await (o.hooks ? await o.hooks.provideParser(e) : e ? O.parse : O.parseInline)(p, o);
        return o.hooks ? await o.hooks.postprocess(g) : g;
      })().catch(s);
      try {
        o.hooks && (n = o.hooks.preprocess(n));
        let u = (o.hooks ? o.hooks.provideLexer(e) : e ? T.lex : T.lexInline)(n, o);
        o.hooks && (u = o.hooks.processAllTokens(u)), o.walkTokens && this.walkTokens(u, o.walkTokens);
        let p = (o.hooks ? o.hooks.provideParser(e) : e ? O.parse : O.parseInline)(u, o);
        return o.hooks && (p = o.hooks.postprocess(p)), p;
      } catch (l) {
        return s(l);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let i = "<p>An error occurred:</p><pre>" + w(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(i) : i;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var I = new U();
function f(a3, e) {
  return I.parse(a3, e);
}
f.options = f.setOptions = function(a3) {
  return I.setOptions(a3), f.defaults = I.defaults, V(f.defaults), f;
};
f.getDefaults = B;
f.defaults = y;
function At(...a3) {
  return I.use(...a3), f.defaults = I.defaults, V(f.defaults), f;
}
f.use = At;
f.walkTokens = function(a3, e) {
  return I.walkTokens(a3, e);
};
f.parseInline = I.parseInline;
f.Parser = O;
f.parser = O.parse;
f.Renderer = $;
f.TextRenderer = z;
f.Lexer = T;
f.lexer = T.lex;
f.Tokenizer = _;
f.Hooks = L;
f.parse = f;
var Rn = f.options;
var Tn = f.setOptions;
var On = f.walkTokens;
var wn = f.parseInline;
var yn = O.parse;
var Sn = T.lex;

// src/client/safe/urls.ts
function safeUrl(href, base) {
  const text = href.trim();
  if (text === "") return null;
  let url;
  try {
    url = /^[a-z][a-z0-9+.-]*:/i.test(text) ? new URL(text) : base ? new URL(text, base) : (() => {
      throw new Error("no base");
    })();
  } catch {
    return null;
  }
  return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
}

// src/client/safe/markdown.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function inline(tokens, ctx) {
  return (tokens ?? []).map((token, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_react5.Fragment, { children: renderInline(token, ctx) }, i));
}
function renderInline(token, ctx) {
  switch (token.type) {
    case "text": {
      const t = token;
      return t.tokens ? inline(t.tokens, ctx) : t.text;
    }
    case "escape":
      return token.text;
    case "strong":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: inline(token.tokens, ctx) });
    case "em":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("em", { children: inline(token.tokens, ctx) });
    case "del":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("del", { children: inline(token.tokens, ctx) });
    case "codespan":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("code", { className: "ps-md-code", children: token.text });
    case "br":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("br", {});
    case "link": {
      const t = token;
      const href = safeUrl(t.href, ctx.base);
      const label = inline(t.tokens, ctx);
      return href ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("a", { href, target: "_blank", rel: "noopener noreferrer", title: t.title ?? void 0, children: label }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: label });
    }
    case "image": {
      const t = token;
      const src = safeUrl(t.href, ctx.base);
      return src ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("img", { src, alt: t.text, title: t.title ?? void 0, referrerPolicy: "no-referrer", loading: "lazy", className: "ps-md-img" }) : t.text;
    }
    case "html":
      return null;
    default:
      return "text" in token && typeof token.text === "string" ? token.text : null;
  }
}
function renderBlock(token, ctx) {
  switch (token.type) {
    case "heading": {
      const t = token;
      const Tag = `h${Math.min(Math.max(t.depth, 1), 6)}`;
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { className: "ps-md-h", children: inline(t.tokens, ctx) });
    }
    case "paragraph":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: inline(token.tokens, ctx) });
    case "text":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: renderInline(token, ctx) });
    case "blockquote":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("blockquote", { children: blocks(token.tokens, ctx) });
    case "code": {
      const t = token;
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "ps-md-pre", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("code", { children: t.text }) });
    }
    case "list": {
      const t = token;
      const items = t.items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("li", { children: blocksOrInline(item.tokens, ctx) }, i));
      return t.ordered ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("ol", { start: typeof t.start === "number" && t.start !== 1 ? t.start : void 0, children: items }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("ul", { children: items });
    }
    case "table": {
      const t = token;
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ps-md-table", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tr", { children: t.header.map((cell, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { children: inline(cell.tokens, ctx) }, i)) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: t.rows.map((row, r) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tr", { children: row.map((cell, c) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { children: inline(cell.tokens, ctx) }, c)) }, r)) })
      ] }) });
    }
    case "hr":
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("hr", {});
    case "html":
    case "space":
    case "def":
      return null;
    default:
      return null;
  }
}
function blocksOrInline(tokens, ctx) {
  if (tokens.every((t) => t.type === "text")) return inline(tokens, ctx);
  return blocks(tokens, ctx);
}
function blocks(tokens, ctx) {
  return tokens.map((token, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_react5.Fragment, { children: renderBlock(token, ctx) }, i));
}
function Markdown({ source, base }) {
  return (0, import_react5.useMemo)(() => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ps-md", children: blocks(f.lexer(source ?? "", { gfm: true }), { base }) }), [source, base]);
}

// src/client/ui/DetailView.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var DETECTION = [
  ["network", "permNetwork"],
  ["fileSystem", "permFileSystem"],
  ["agentTools", "permAgentTools"],
  ["childProcess", "permChildProcess"],
  ["installScripts", "permInstallScripts"]
];
var RELATED = 3;
function ExternalLink({ href, children }) {
  const url = href ? safeUrl(href, null) : null;
  return url ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("a", { href: url, target: "_blank", rel: "noopener noreferrer", children }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_jsx_runtime6.Fragment, { children });
}
function DetailView(props) {
  const { plugin, catalog, detail, readme, installed, lang, t, onBack, onOpenPlugin, onInstallClick, onRetryDetail, onRetryReadme } = props;
  const [tab, setTab] = (0, import_react6.useState)(props.initialTab ?? "readme");
  const [copied, setCopied] = (0, import_react6.useState)(false);
  const data = detail.status === "ready" ? detail.data : null;
  const compat = plugin.compatibility === "compatible" ? "compatible" : plugin.compatibility === "incompatible" ? "compatNo" : "compatUnknown";
  const related = sortPlugins(catalog.plugins.filter((p) => p.category === plugin.category && p.name !== plugin.name), "popular").slice(0, RELATED);
  const versions = data?.versions?.length ? data.versions : [{ version: plugin.version, publishTimestamp: plugin.publishTimestamp, enginesDsh: plugin.enginesDsh }];
  const spec = `${plugin.name}@${plugin.version}`;
  const repoUrl = plugin.repository?.url ?? plugin.homepage ?? null;
  const repoHref = repoUrl ? safeUrl(repoUrl, null) : null;
  const categoryTitle = localize(catalog.categories.find((c) => c.id === plugin.category)?.title, lang) || plugin.category;
  const copySpec = () => {
    navigator.clipboard?.writeText(spec).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }, () => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-detail", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ps-back", onClick: onBack, children: t("back") }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "ps-hero", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-hero-top", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PluginIcon, { plugin, size: 64 }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-hero-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-crumb", children: [
            "#",
            plugin.category,
            " \xB7 ",
            categoryTitle,
            plugin.author ? ` \xB7 ${plugin.author}` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h1", { className: "ps-hero-title", children: localize(plugin.title, lang) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-hero-pitch", children: localize(plugin.description, lang) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ps-badges", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `ps-badge ${plugin.compatibility === "incompatible" ? "ps-badge-warn" : plugin.compatibility === "compatible" ? "ps-badge-ok" : ""}`, children: t(compat) }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-stats", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
          "\u2606 ",
          t("stars"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("b", { children: formatCount(plugin.stats.stars) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
          "\u2193 ",
          t("weeklyDownloads"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("b", { children: formatCount(plugin.stats.weeklyDownloads) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
          t("latestVersion"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("b", { children: [
            "v",
            plugin.version
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
          t("published"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("b", { children: formatDate(plugin.publishTimestamp) || "\u2014" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
          t("npmPackage"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("b", { children: plugin.name })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-detail-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-detail-main", children: [
        plugin.compatibility === "incompatible" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-reason", children: incompatibleReason(plugin, catalog.dshVersion, t) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "ps-block", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ps-tabs", role: "tablist", children: ["readme", "versions", "source"].map((id) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", role: "tab", "aria-selected": tab === id, className: `ps-tab ${tab === id ? "ps-tab-on" : ""}`, onClick: () => setTab(id), children: t({ readme: "tabReadme", versions: "tabVersions", source: "tabSource" }[id]) }, id)) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-tab-body", children: [
            tab === "readme" && (readme.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-muted", children: t("loading") }) : readme.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-error", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
                t("readmeFailed"),
                "\uFF1A",
                readme.error
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ps-btn", onClick: onRetryReadme, children: t("retry") })
            ] }) : readme.data.markdown ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Markdown, { source: readme.data.markdown, base: readme.data.base }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-muted", children: t("noReadme") })),
            tab === "versions" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
              detail.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-error", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
                  t("detailFailed"),
                  "\uFF1A",
                  detail.error
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ps-btn", onClick: onRetryDetail, children: t("retry") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("table", { className: "ps-versions", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("tbody", { children: versions.map((v2) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("tr", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("td", { children: [
                  "v",
                  v2.version
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "ps-muted", children: formatDate(v2.publishTimestamp) }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "ps-muted", children: v2.enginesDsh ?? t("anyVersion") })
              ] }, v2.version)) }) })
            ] }),
            tab === "source" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("dl", { className: "ps-facts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dt", { children: t("author") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dd", { children: plugin.author ?? "\u2014" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dt", { children: t("homepage") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dd", { children: plugin.homepage ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ExternalLink, { href: plugin.homepage, children: plugin.homepage }) : "\u2014" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dt", { children: t("repository") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dd", { children: plugin.repository ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(ExternalLink, { href: plugin.repository.url, children: [
                plugin.repository.url,
                plugin.repository.directory ? ` / ${plugin.repository.directory}` : ""
              ] }) : "\u2014" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dt", { children: t("npmPackage") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("dd", { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ExternalLink, { href: `https://www.npmjs.com/package/${plugin.name}/v/${plugin.version}`, children: spec }) })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("aside", { className: "ps-detail-side", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "ps-panel", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ps-panel-label", children: t("panelInstall") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(InstallButton, { plugin, installed, dshVersion: catalog.dshVersion, t, onClick: onInstallClick, large: true, primary: true }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-fine", children: t("installHint") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-cmd", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ps-cmd-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t("orAddPlugin") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", onClick: copySpec, children: t(copied ? "copied" : "copy") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { children: spec })
          ] }),
          repoHref && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("a", { className: "ps-btn ps-btn-block", href: repoHref, target: "_blank", rel: "noopener noreferrer", children: t("viewOnGitHub") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "ps-panel", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { children: t("detection") }),
          plugin.permissions ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("table", { className: "ps-perms", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("tbody", { children: DETECTION.map(([key, label]) => {
            const hit = plugin.permissions[key];
            const where = data?.scan?.evidence?.[key]?.[0];
            return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { children: t(label) }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: hit ? "ps-perm-yes" : "ps-perm-no", children: t(hit ? "yes" : "no") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { className: "ps-muted ps-perm-where", children: hit && where ? `${where.file}:${where.line}` : "" })
            ] }, key);
          }) }) }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-muted", children: t(plugin.scanFailed ? "scanFailed" : "notScanned") }),
          plugin.permissions && plugin.opaque && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-notice ps-detect-opaque", children: t("detectionOpaque") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ps-fine", children: t("detectionNote") })
        ] }),
        related.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "ps-related", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ps-panel-label", children: t("related") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PluginGrid, { plugins: related, columns: 3, catalog, installed, dshVersion: catalog.dshVersion, lang, t, onOpenPlugin, onInstallClick })
        ] })
      ] })
    ] })
  ] });
}

// src/client/ui/Home.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var ISSUES_URL = "https://github.com/yang051211/dsh-plugin-store/issues";
var icon = (d) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: d });
var GRID = icon(/* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("rect", { x: "4", y: "4", width: "6", height: "6", rx: "1.5" }),
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("rect", { x: "14", y: "4", width: "6", height: "6", rx: "1.5" }),
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("rect", { x: "4", y: "14", width: "6", height: "6", rx: "1.5" }),
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("rect", { x: "14", y: "14", width: "6", height: "6", rx: "1.5" })
] }));
var NOTE = icon(/* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("rect", { x: "4", y: "4", width: "16", height: "16", rx: "3" }),
  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("path", { d: "M8 9h8M8 13h5" })
] }));
var HOME_CARDS = 8;
var SECTIONS = [
  { sort: "popular", title: "sectionPopular", crumb: "crumbPopular" },
  { sort: "updated", title: "sectionUpdated", crumb: "crumbUpdated" },
  { sort: "new", title: "sectionNew", crumb: "crumbNew" }
];
function Home({ catalog, installed, lang, t, onOpenPlugin, onOpenList, onSearch, onInstallClick }) {
  const card = { installed, dshVersion: catalog.dshVersion, lang, t, onOpenPlugin, onInstallClick, catalog };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ps-home", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PageHeader, { crumb: t("homeCrumb"), title: t("homeTitle"), intro: t("homeIntro", { count: String(catalog.plugins.length) }), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SearchField, { t, onSearch }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("nav", { className: "ps-search-links", "aria-label": t("browseCategories"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { type: "button", onClick: () => onOpenList({ kind: "all" }), children: [
          GRID,
          t("linkBrowseAll")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("a", { href: ISSUES_URL, target: "_blank", rel: "noopener noreferrer", children: [
          NOTE,
          t("linkRecommend")
        ] })
      ] })
    ] }) }),
    SECTIONS.map((section) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "ps-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ps-section-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ps-crumb", children: t(section.crumb) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { children: t(section.title) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "ps-more", onClick: () => onOpenList({ kind: "all" }, section.sort), children: t("seeAllArrow") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PluginGrid, { plugins: sortPlugins(catalog.plugins, section.sort).slice(0, HOME_CARDS), ...card })
    ] }, section.sort))
  ] });
}

// src/client/ui/ListView.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var SORT_LABEL = { popular: "sortPopular", updated: "sortUpdated", new: "sortNew", stars: "sortStars" };
function ListView(props) {
  const { plugins, catalog, filter, sort, page, compatibleOnly, installed, lang, t, onOpenPlugin, onOpenList, onSearch, onInstallClick, onChange } = props;
  const active = filter.kind === "category" ? filter.id : filter.kind === "all" ? "all" : null;
  const shown = sortPlugins(compatibleOnly ? plugins.filter((p) => p.compatibility !== "incompatible") : plugins, sort);
  const current = pageOf(shown, page);
  const title = filter.kind === "search" ? t("searchResults", { query: filter.query }) : filter.kind === "category" ? localize(catalog.categories.find((c) => c.id === filter.id)?.title, lang) || filter.id : t("allPlugins");
  const to = (next) => () => onChange({ page: next });
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ps-list", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PageHeader, { crumb: t("listCrumb"), title: t("allPlugins"), intro: t("listIntro"), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SearchField, { t, onSearch, initial: filter.kind === "search" ? filter.query : "" }, filter.kind === "search" ? filter.query : "") }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ps-with-side", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("nav", { className: "ps-side", "aria-label": t("browseCategories"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ps-side-head", children: t("sideCategories") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: active === "all" ? "ps-side-on" : "", "aria-current": active === "all", onClick: () => onOpenList({ kind: "all" }, sort), children: [
          t("allPlugins"),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("i", { children: catalog.plugins.length })
        ] }),
        catalog.categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: active === category.id ? "ps-side-on" : "", "aria-current": active === category.id, onClick: () => onOpenList({ kind: "category", id: category.id }, sort), children: [
          localize(category.title, lang),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("i", { children: category.plugins.length })
        ] }, category.id))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ps-list-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ps-count-line", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("h2", { className: "ps-list-title", children: [
            title,
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("small", { children: t("countSuffix", { count: String(shown.length) }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ps-list-tools", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { className: "ps-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { type: "checkbox", checked: compatibleOnly, onChange: (e) => onChange({ compatibleOnly: e.target.checked, page: 1 }) }),
              t("compatibleOnly")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { className: "ps-sort", children: [
              t("sortLabel"),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("select", { value: sort, onChange: (e) => onChange({ sort: e.target.value, page: 1 }), children: SORT_KEYS.map((key) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("option", { value: key, children: t(SORT_LABEL[key]) }, key)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "ps-muted", children: [
              shown.length,
              " / ",
              catalog.plugins.length
            ] })
          ] })
        ] }),
        shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ps-empty", children: t("empty") }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PluginGrid, { plugins: current.items, columns: 3, catalog, installed, dshVersion: catalog.dshVersion, lang, t, onOpenPlugin, onInstallClick }),
        current.pages > 1 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ps-pager", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "ps-btn", disabled: current.page <= 1, onClick: to(current.page - 1), children: t("pagePrev") }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("pageOf", { page: String(current.page), pages: String(current.pages) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "ps-btn", disabled: current.page >= current.pages, onClick: to(current.page + 1), children: t("pageNext") })
        ] })
      ] })
    ] })
  ] });
}

// src/client/ui/About.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var GROUPS = [
  ["aboutBasics", ["faqWhat", "faqVsDiscover"]],
  ["aboutListing", ["faqWhatListed", "faqHowOften"]],
  ["aboutDetection", ["faqDetectWhat", "faqDetectWrong"]],
  ["aboutInstall", ["faqHowInstall", "faqReport"]]
];
function AboutView({ t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ps-about", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PageHeader, { crumb: t("aboutCrumb"), title: t("aboutTitle"), intro: t("aboutIntro") }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ps-faq", children: [
      GROUPS.map(([group, questions]) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { children: t(group) }),
        questions.map((q2) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: t(q2) }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: t(`${q2}A`) })
        ] }, q2))
      ] }, group)),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ps-ask", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("b", { children: t("askTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: t("askBody") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("a", { className: "ps-btn", href: ISSUES_URL, target: "_blank", rel: "noopener noreferrer", children: t("askButton") })
      ] })
    ] })
  ] });
}

// src/client/ui/StoreApp.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var TABS = ["home", "all", "about"];
function tabOf(view) {
  return view.view === "home" ? "home" : view.view === "about" ? "about" : "all";
}
var listView = (filter, sort = "popular") => ({ view: "list", filter, sort, page: 1, compatibleOnly: false });
function navigate(stack, view, currentScroll) {
  return [...stack.slice(0, -1), { ...stack[stack.length - 1], scroll: currentScroll }, { view, scroll: 0 }];
}
function goBack(stack) {
  if (stack.length <= 1) return { stack, restore: null };
  const next = stack.slice(0, -1);
  return { stack: next, restore: next[next.length - 1].scroll };
}
function scrollParentOf(element, overflowOf) {
  for (let el = element; el; el = el.parentElement) {
    if (/(auto|scroll)/.test(overflowOf(el)) && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}
var messageOf = (error) => String(error?.message ?? error);
function useLoads(load) {
  const [loads, setLoads] = (0, import_react7.useState)({});
  const seq = (0, import_react7.useRef)({});
  const start = (0, import_react7.useCallback)((name2) => {
    const id = (seq.current[name2] ?? 0) + 1;
    seq.current[name2] = id;
    setLoads((prev) => ({ ...prev, [name2]: { status: "loading" } }));
    load(name2).then(
      (data) => {
        if (seq.current[name2] === id) setLoads((prev) => ({ ...prev, [name2]: { status: "ready", data } }));
      },
      (error) => {
        if (seq.current[name2] === id) setLoads((prev) => ({ ...prev, [name2]: { status: "error", error: messageOf(error) } }));
      }
    );
  }, [load]);
  return [loads, start];
}
function StoreApp({ mode, lang, t, services, onInstall, onSelfUpdate, onOpenInstalled, takePending }) {
  const [catalog, setCatalog] = (0, import_react7.useState)({ status: "loading" });
  const [installed, setInstalled] = (0, import_react7.useState)(null);
  const [installedUnknown, setInstalledUnknown] = (0, import_react7.useState)(false);
  const [justInstalled, setJustInstalled] = (0, import_react7.useState)(null);
  const lastInstalled = (0, import_react7.useRef)(null);
  const [stack, setStack] = (0, import_react7.useState)([{ view: { view: "home" }, scroll: 0 }]);
  const [details, loadDetail2] = useLoads(services.loadDetail);
  const [readmes, loadReadme2] = useLoads(services.loadReadme);
  const [confirming, setConfirming] = (0, import_react7.useState)(null);
  const root = (0, import_react7.useRef)(null);
  const pendingScroll = (0, import_react7.useRef)(null);
  const seq = (0, import_react7.useRef)({ catalog: 0, installed: 0 });
  const current = stack[stack.length - 1].view;
  const scroller = (0, import_react7.useCallback)(() => {
    const el = root.current;
    if (!el) return null;
    if (mode === "panel") return el;
    return scrollParentOf(el.parentElement, (node) => getComputedStyle(node).overflowY) ?? document.scrollingElement;
  }, [mode]);
  const load = (0, import_react7.useCallback)((refresh = false) => {
    const id = ++seq.current.catalog;
    setCatalog((prev) => prev.status === "ready" ? prev : { status: "loading" });
    services.loadCatalog(refresh).then(
      (snapshot) => {
        if (id === seq.current.catalog) setCatalog({ status: "ready", data: buildCatalog(snapshot) });
      },
      (error) => {
        if (id !== seq.current.catalog) return;
        setCatalog((prev) => prev.status === "ready" ? { status: "ready", data: { ...prev.data, stale: true } } : { status: "error", error: messageOf(error) });
      }
    );
  }, [services]);
  (0, import_react7.useEffect)(() => {
    load();
  }, [load]);
  (0, import_react7.useEffect)(() => {
    let live = true;
    const refresh = () => {
      const id = ++seq.current.installed;
      services.loadInstalled().then(
        (map) => {
          if (!live || id !== seq.current.installed) return;
          const before = lastInstalled.current;
          const fresh = before ? [...map.keys()].filter((name2) => !before.has(name2)) : [];
          if (fresh.length > 0) setJustInstalled(fresh[fresh.length - 1]);
          lastInstalled.current = map;
          setInstalled(map);
          setInstalledUnknown(false);
        },
        () => {
          if (live && id === seq.current.installed) {
            setInstalled((prev) => prev ?? /* @__PURE__ */ new Map());
            setInstalledUnknown(true);
          }
        }
      );
    };
    refresh();
    const unsubscribe = services.subscribeInstalled(refresh);
    return () => {
      live = false;
      unsubscribe();
    };
  }, [services]);
  const go = (0, import_react7.useCallback)((view) => {
    const scroll = scroller()?.scrollTop ?? 0;
    setStack((prev) => navigate(prev, view, scroll));
    pendingScroll.current = 0;
    if (view.view === "detail") {
      if (!details[view.name]) loadDetail2(view.name);
      if (!readmes[view.name]) loadReadme2(view.name);
    }
  }, [details, readmes, loadDetail2, loadReadme2, scroller]);
  const updateList = (0, import_react7.useCallback)((patch) => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top.view.view !== "list") return prev;
      return [...prev.slice(0, -1), { ...top, view: { ...top.view, ...patch } }];
    });
    if (patch.page !== void 0) pendingScroll.current = 0;
  }, []);
  const openTab = (0, import_react7.useCallback)((tab) => {
    setStack([{ view: tab === "all" ? listView({ kind: "all" }) : { view: tab }, scroll: 0 }]);
    pendingScroll.current = 0;
  }, []);
  const back = (0, import_react7.useCallback)(() => {
    setStack((prev) => {
      const { stack: next, restore } = goBack(prev);
      pendingScroll.current = restore;
      return next;
    });
  }, []);
  (0, import_react7.useLayoutEffect)(() => {
    if (pendingScroll.current === null) return;
    const top = pendingScroll.current;
    pendingScroll.current = null;
    const el = scroller();
    if (el) el.scrollTop = top;
  }, [stack, scroller]);
  const handedOver = (0, import_react7.useRef)(false);
  (0, import_react7.useEffect)(() => {
    if (handedOver.current || mode !== "tab" || !takePending || catalog.status !== "ready" || installed === null) return;
    handedOver.current = true;
    const name2 = takePending();
    if (name2 === STORE_PACKAGE) {
      const update = selfUpdateOf(catalog.data.storeVersion, installed);
      if (update) onSelfUpdate(update);
      return;
    }
    const plugin = name2 ? catalog.data.byName.get(name2) : void 0;
    if (!plugin) return;
    go({ view: "detail", name: plugin.name });
    if (installStateOf(plugin, installed) === "install") setConfirming(plugin);
  }, [mode, takePending, catalog, installed, go, onSelfUpdate]);
  const onInstallClick = (0, import_react7.useCallback)((plugin, state) => {
    if (state === "installed" || state === "update") onOpenInstalled(plugin);
    else if (state === "install") {
      if (mode === "tab") setConfirming(plugin);
      else onInstall(plugin);
    }
  }, [mode, onInstall, onOpenInstalled]);
  const cancelConfirm = (0, import_react7.useCallback)(() => setConfirming(null), []);
  const acceptConfirm = (0, import_react7.useCallback)(() => {
    setConfirming((plugin) => {
      if (plugin) queueMicrotask(() => onInstall(plugin));
      return null;
    });
  }, [onInstall]);
  const handlers = (0, import_react7.useMemo)(() => ({
    onOpenPlugin: (name2) => go({ view: "detail", name: name2 }),
    onOpenList: (filter, sort) => go(listView(filter, sort)),
    onSearch: (query) => go(listView({ kind: "search", query })),
    onInstallClick,
    onBack: back
  }), [go, onInstallClick, back]);
  let body;
  if (catalog.status === "loading") {
    body = /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ps-pad ps-muted", children: t("loading") });
  } else if (catalog.status === "error") {
    body = /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ps-error ps-pad", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { children: [
        t("loadFailed"),
        "\uFF1A",
        catalog.error
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ps-btn", onClick: () => load(true), children: t("retry") })
    ] });
  } else {
    const data = catalog.data;
    if (current.view === "detail") {
      const plugin = data.byName.get(current.name);
      body = plugin ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DetailView, { plugin, catalog: data, detail: details[plugin.name] ?? { status: "loading" }, readme: readmes[plugin.name] ?? { status: "loading" }, installed, lang, t, onRetryDetail: () => loadDetail2(plugin.name), onRetryReadme: () => loadReadme2(plugin.name), ...handlers }, plugin.name) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ps-empty", children: t("empty") });
    } else if (current.view === "list") {
      const { filter } = current;
      const plugins = filter.kind === "search" ? searchPlugins(data, filter.query) : filter.kind === "category" ? data.categories.find((c) => c.id === filter.id)?.plugins ?? [] : data.plugins;
      body = /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ListView, { plugins, catalog: data, filter, sort: current.sort, page: current.page, compatibleOnly: current.compatibleOnly, installed, lang, t, onChange: updateList, ...handlers });
    } else if (current.view === "about") {
      body = /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(AboutView, { t });
    } else {
      body = /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Home, { catalog: data, installed, lang, t, ...handlers });
    }
  }
  const selfUpdate = catalog.status === "ready" ? selfUpdateOf(catalog.data.storeVersion, installed) : null;
  const justPlugin = justInstalled && catalog.status === "ready" ? catalog.data.byName.get(justInstalled) ?? null : null;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: `ps-root ps-mode-${mode}`, ref: root, children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("nav", { className: "ps-nav", "aria-label": t("tab"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "ps-nav-brand", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("i", { "aria-hidden": "true" }),
        t("tab")
      ] }),
      TABS.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: tabOf(current) === tab ? "ps-nav-on" : "", "aria-current": tabOf(current) === tab ? "page" : void 0, onClick: () => openTab(tab), children: t({ home: "navHome", all: "navAll", about: "navAbout" }[tab]) }, tab))
    ] }),
    catalog.status === "ready" && catalog.data.stale && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ps-notice ps-notice-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("staleNotice") }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ps-link-btn", onClick: () => load(true), children: t("refresh") })
    ] }),
    selfUpdate && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ps-notice ps-notice-bar ps-self-update", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("selfUpdate", { latest: selfUpdate.latest, current: selfUpdate.current }) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ps-link-btn", onClick: () => onSelfUpdate(selfUpdate), children: t("selfUpdateAction") })
    ] }),
    justPlugin && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ps-notice ps-notice-bar ps-installed-notice", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ps-installed-notice-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("b", { children: t("installedNotice", { title: localize(justPlugin.title, lang) || justPlugin.name }) }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("installedHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ps-link-btn", onClick: () => setJustInstalled(null), children: t("dismiss") })
    ] }),
    installedUnknown && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ps-notice ps-notice-bar ps-installed-unknown", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("installedUnknown") }) }),
    body,
    confirming && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ConfirmInstall, { plugin: confirming, lang, t, onCancel: cancelConfirm, onConfirm: acceptConfirm })
  ] });
}

// src/client/ui/styles.ts
var C2 = {
  text: "var(--dsw-alias-label-primary, #1f2328)",
  text2: "var(--dsw-alias-label-secondary, #57606a)",
  text3: "var(--dsw-alias-label-tertiary, #8b949e)",
  bg1: "var(--dsw-alias-bg-layer-1, #ffffff)",
  bg2: "var(--dsw-alias-bg-layer-2, #f6f8fa)",
  border: "var(--dsw-alias-border-l2, #d0d7de)",
  borderSoft: "var(--dsw-alias-border-l1, #e3e6eb)",
  hover: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.08))",
  brand: "var(--dsw-alias-brand-primary, #4d6bfe)",
  onBrand: "var(--dsw-alias-label-primary-foreground, #ffffff)",
  link: "var(--dsw-alias-link, #2f63d8)",
  ok: "var(--dsw-alias-state-success-primary, #1a7f37)",
  warn: "var(--dsw-alias-state-warn-primary, #b45309)",
  warnBg: "var(--dsw-alias-state-warn-tertiary, rgba(245,158,11,.12))",
  error: "var(--dsw-alias-state-error-primary, #cf222e)",
  rSm: "var(--dsw-radius-sm, 6px)",
  rMd: "var(--dsw-radius-md, 8px)",
  rLg: "var(--dsw-radius-lg, 12px)",
  rXl: "var(--dsw-radius-xl, 16px)",
  mono: 'var(--dsw-font-mono, ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, monospace)'
};
var STYLE_TEXT = `
.ps-root { color: ${C2.text}; font-size: 14px; line-height: 1.55; height: 100%; overflow: auto; box-sizing: border-box; padding: 0 28px 40px; container-type: inline-size; }
.ps-root *, .ps-root *::before, .ps-root *::after { box-sizing: border-box; }
.ps-root :where(button) { font: inherit; color: inherit; }
.ps-mode-tab { padding: 0 0 32px; height: auto; overflow: visible; }
.ps-muted { color: ${C2.text3}; }
.ps-pad { padding: 24px 0; }
.ps-fine { color: ${C2.text3}; font-size: 12.5px; margin: 0; }
.ps-root :focus-visible { outline: 2px solid ${C2.brand}; outline-offset: 2px; }

/* tab bar */
.ps-nav { position: sticky; top: 0; z-index: 3; display: flex; align-items: stretch; gap: 22px; height: 50px; margin-bottom: 4px; background: ${C2.bg1}; border-bottom: 1px solid ${C2.borderSoft}; }
.ps-nav-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; margin-right: 6px; }
.ps-nav-brand i { width: 20px; height: 20px; border-radius: 6px; background: ${C2.brand}; display: inline-block; }
.ps-nav button { border: 0; background: none; padding: 0; color: ${C2.text2}; cursor: pointer; border-bottom: 2px solid transparent; }
.ps-nav button:hover { color: ${C2.text}; }
.ps-nav .ps-nav-on { color: ${C2.text}; font-weight: 600; border-bottom-color: ${C2.text}; }

/* buttons */
.ps-btn { border: 1px solid ${C2.borderSoft}; background: ${C2.bg1}; color: ${C2.text}; border-radius: ${C2.rMd}; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
.ps-btn:hover:not(:disabled) { border-color: ${C2.border}; }
.ps-btn:disabled { opacity: .55; cursor: not-allowed; }
.ps-btn-primary { background: ${C2.brand}; border-color: ${C2.brand}; color: ${C2.onBrand}; }
.ps-btn-primary:hover:not(:disabled) { border-color: ${C2.brand}; filter: brightness(1.08); }
.ps-btn-quiet { border-color: transparent; background: none; color: ${C2.text3}; }
.ps-btn-large { width: 100%; padding: 10px 16px; font-size: 14px; }
.ps-btn-block { width: 100%; padding: 9px 16px; }
.ps-link-btn { border: 0; background: none; color: ${C2.link}; cursor: pointer; padding: 0; font-size: 13px; }
.ps-back { border: 0; background: none; padding: 0; margin: 20px 0 4px; color: ${C2.text2}; font-size: 13px; cursor: pointer; }
.ps-back:hover { color: ${C2.text}; }

/* page header */
.ps-ph { padding: 28px 0 26px; margin-bottom: 26px; border-bottom: 1px solid ${C2.borderSoft}; }
.ps-ph-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 32px; align-items: center; }
@container (max-width: 820px) { .ps-ph-split { grid-template-columns: 1fr; gap: 18px; } }
.ps-crumb { font-family: ${C2.mono}; font-size: 12px; color: ${C2.link}; letter-spacing: .02em; }
.ps-ph-title { margin: 8px 0 8px; font-size: 28px; line-height: 1.2; letter-spacing: -.01em; text-wrap: balance; }
.ps-ph-intro { margin: 0; color: ${C2.text2}; font-size: 14.5px; max-width: 54ch; }

/* search */
.ps-search { display: flex; align-items: center; gap: 12px; border: 1px solid ${C2.borderSoft}; background: ${C2.bg2}; border-radius: 14px; padding: 8px 8px 8px 18px; min-height: 58px; color: ${C2.text3}; }
.ps-search:focus-within { border-color: ${C2.brand}; }
.ps-search svg { flex: none; }
.ps-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: ${C2.text}; font: inherit; font-size: 15px; }
.ps-search .ps-btn { padding: 10px 18px; font-size: 14px; border-radius: 10px; }
.ps-search-links { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 12px; font-size: 13px; }
.ps-search-links button, .ps-search-links a { border: 0; background: none; padding: 0; color: ${C2.text3}; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; text-decoration: none; font-size: 13px; }
.ps-search-links button:hover, .ps-search-links a:hover { color: ${C2.text}; }

/* sections */
.ps-section { margin-bottom: 36px; }
.ps-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ps-section-head h2 { margin: 4px 0 0; font-size: 19px; }
.ps-more { border: 0; background: none; padding: 0; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.ps-more:hover { color: ${C2.brand}; }

/* card grid */
.ps-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
@container (min-width: 560px) { .ps-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (min-width: 980px) { .ps-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .ps-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.ps-card { display: flex; flex-direction: column; border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rLg}; background: ${C2.bg1}; overflow: hidden; min-width: 0; text-align: left; padding: 0; cursor: pointer; }
.ps-card:hover { border-color: ${C2.border}; }
.ps-card-hd { display: flex; gap: 12px; align-items: center; padding: 13px 14px; background: ${C2.bg2}; border-bottom: 1px solid ${C2.borderSoft}; min-width: 0; }
.ps-card-id { display: grid; min-width: 0; }
.ps-card-id b { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-card-id span { font-size: 12px; color: ${C2.text3}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-card-bd { padding: 12px 14px 0; flex: 1; display: grid; gap: 8px; align-content: start; }
.ps-card-tags { display: flex; gap: 10px; font-family: ${C2.mono}; font-size: 11.5px; color: ${C2.link}; }
.ps-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.ps-chip { font-size: 11.5px; color: ${C2.text2}; border: 1px solid ${C2.borderSoft}; border-radius: 999px; padding: 0 8px; }
.ps-chip-main { color: ${C2.text}; background: ${C2.bg2}; border-color: transparent; font-weight: 600; }
.ps-card-pitch { color: ${C2.text2}; font-size: 13.5px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; min-height: 4.65em; }
.ps-card-ft { display: flex; align-items: center; gap: 14px; padding: 13px 14px; font-size: 12px; color: ${C2.text2}; font-variant-numeric: tabular-nums; }
.ps-card-open { margin-left: auto; color: ${C2.text}; font-weight: 600; }
.ps-card:hover .ps-card-open { color: ${C2.brand}; }
.ps-card-done, .ps-card:hover .ps-card-done { color: ${C2.text3}; font-weight: 400; }
.ps-icon { flex: none; object-fit: contain; }
.ps-icon-letters { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; letter-spacing: .02em; }

/* list page */
.ps-with-side { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 24px; align-items: start; }
@container (max-width: 760px) { .ps-with-side { grid-template-columns: 1fr; } }
.ps-side { border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rLg}; padding: 10px; background: ${C2.bg1}; display: grid; gap: 2px; position: sticky; top: 62px; }
.ps-side-head { font-size: 12px; color: ${C2.text3}; padding: 4px 8px 8px; }
.ps-side button { display: flex; justify-content: space-between; align-items: center; border: 1px solid transparent; background: none; padding: 7px 10px; border-radius: ${C2.rMd}; color: ${C2.text2}; font-size: 13.5px; text-align: left; cursor: pointer; }
.ps-side button i { font-style: normal; color: ${C2.text3}; font-family: ${C2.mono}; font-size: 11.5px; }
.ps-side button:hover { background: ${C2.bg2}; color: ${C2.text}; }
.ps-side .ps-side-on { background: ${C2.bg2}; color: ${C2.text}; font-weight: 600; border-color: ${C2.borderSoft}; }
.ps-list-main { min-width: 0; }
.ps-count-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.ps-list-title { margin: 0; font-size: 19px; }
.ps-list-title small { color: ${C2.text3}; font-weight: 400; font-size: 13px; margin-left: 8px; }
.ps-list-tools { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: ${C2.text2}; }
.ps-list-tools .ps-muted { font-family: ${C2.mono}; font-size: 12px; }
.ps-check { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.ps-check input { accent-color: ${C2.brand}; margin: 0; }
.ps-sort { display: inline-flex; align-items: center; gap: 6px; }
.ps-sort select { font: inherit; color: ${C2.text}; background: ${C2.bg1}; border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rMd}; padding: 4px 8px; }
.ps-pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 22px; font-size: 13px; color: ${C2.text2}; }
.ps-versions { width: 100%; border-collapse: collapse; font-size: 13px; }
.ps-versions td { padding: 6px 8px 6px 0; border-top: 1px solid ${C2.borderSoft}; }
.ps-versions td:first-child { font-family: ${C2.mono}; }
.ps-perm-where { font-family: ${C2.mono}; font-size: 11.5px; word-break: break-all; }
.ps-installed-notice-body { display: grid; gap: 2px; }
.ps-count-line > span { font-family: ${C2.mono}; font-size: 12px; color: ${C2.text3}; }
.ps-empty { color: ${C2.text3}; padding: 40px 0; text-align: center; }

/* scenes */

/* detail */
.ps-hero { border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rXl}; background: ${C2.bg1}; overflow: hidden; margin: 10px 0 26px; }
.ps-hero-top { display: flex; gap: 18px; align-items: center; padding: 24px; background: ${C2.bg2}; }
.ps-hero-text { min-width: 0; display: grid; gap: 4px; }
.ps-hero-title { margin: 0; font-size: 26px; line-height: 1.2; }
.ps-hero-pitch { margin: 0; color: ${C2.text2}; font-size: 15px; }
.ps-stats { display: flex; flex-wrap: wrap; gap: 6px 22px; padding: 12px 24px; border-top: 1px solid ${C2.borderSoft}; font-family: ${C2.mono}; font-size: 12px; color: ${C2.text2}; }
.ps-stats b { color: ${C2.text}; font-weight: 500; }
.ps-stats-asof { margin-left: auto; color: ${C2.text3}; }
.ps-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 26px; align-items: start; }
@container (max-width: 900px) { .ps-detail-grid { grid-template-columns: 1fr; } }
.ps-detail-main { min-width: 0; }
.ps-detail-side { display: grid; gap: 16px; min-width: 0; }
.ps-panel { border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rLg}; background: ${C2.bg1}; padding: 16px; display: grid; gap: 10px; }
.ps-panel h3 { margin: 0; font-size: 15px; }
.ps-panel-label { font-family: ${C2.mono}; font-size: 11.5px; color: ${C2.text3}; letter-spacing: .04em; }
.ps-panel-sub { margin: 4px 0 0; font-size: 13px; color: ${C2.text2}; font-weight: 600; }
.ps-cmd { border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rMd}; background: ${C2.bg2}; padding: 10px 12px; display: grid; gap: 8px; }
.ps-cmd-head { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: ${C2.text3}; }
.ps-cmd-head button { border: 0; background: none; padding: 0; color: ${C2.link}; font-size: 12px; cursor: pointer; }
.ps-cmd code { font-family: ${C2.mono}; font-size: 12px; word-break: break-all; }
.ps-related { display: grid; gap: 10px; }
.ps-related .ps-grid { grid-template-columns: 1fr; }
.ps-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.ps-badge { font-size: 12px; border-radius: ${C2.rSm}; padding: 1px 8px; background: ${C2.bg1}; color: ${C2.text2}; }
.ps-badge-ok { color: ${C2.ok}; }
.ps-badge-warn { color: ${C2.warn}; background: ${C2.warnBg}; }
.ps-reason { color: ${C2.warn}; font-size: 13px; margin: 0 0 12px; }
.ps-block { margin-bottom: 24px; }
.ps-block h3 { font-size: 16px; margin: 0 0 10px; }
.ps-perms { width: 100%; border-collapse: collapse; font-size: 13px; }
.ps-perms th { text-align: left; color: ${C2.text3}; font-weight: 400; font-size: 12px; padding: 0 6px 4px 0; }
.ps-perms td { padding: 5px 6px 5px 0; border-top: 1px solid ${C2.borderSoft}; vertical-align: top; }
.ps-perm-yes { color: ${C2.warn}; font-weight: 600; }
.ps-perm-no { color: ${C2.ok}; }
.ps-facts { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0; font-size: 13px; }
.ps-facts dt { color: ${C2.text3}; }
.ps-facts dd { margin: 0; word-break: break-all; }
.ps-facts a, .ps-md a { color: ${C2.link}; }
.ps-tabs { display: flex; gap: 4px; border-bottom: 1px solid ${C2.borderSoft}; margin-bottom: 12px; }
.ps-tab { border: 0; background: none; color: ${C2.text2}; padding: 6px 12px; cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; }
.ps-tab-on { color: ${C2.text}; border-bottom-color: ${C2.brand}; font-weight: 600; }
.ps-md { font-size: 14px; overflow-wrap: anywhere; }
.ps-md .ps-md-h { margin: 18px 0 8px; }
.ps-md-img { max-width: 100%; }
.ps-md-code { background: ${C2.bg2}; border-radius: 4px; padding: 0 4px; font-size: 12.5px; }
.ps-md-pre { background: ${C2.bg2}; border-radius: ${C2.rMd}; padding: 10px 12px; overflow: auto; font-size: 12.5px; }
.ps-md-table { overflow-x: auto; }
.ps-md table { border-collapse: collapse; }
.ps-md th, .ps-md td { border: 1px solid ${C2.borderSoft}; padding: 4px 8px; }
.ps-md blockquote { margin: 8px 0; padding-left: 12px; border-left: 3px solid ${C2.border}; color: ${C2.text2}; }

/* about */
.ps-faq { max-width: 760px; }
.ps-faq h2 { font-size: 18px; margin: 28px 0 6px; padding-bottom: 10px; border-bottom: 1px solid ${C2.borderSoft}; }
.ps-faq section:first-child h2 { margin-top: 0; }
.ps-faq h3 { font-size: 15px; margin: 18px 0 6px; }
.ps-faq p { margin: 0; color: ${C2.text2}; }
.ps-ask { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid ${C2.borderSoft}; border-radius: ${C2.rLg}; padding: 16px 18px; margin-top: 30px; background: ${C2.bg1}; flex-wrap: wrap; }
.ps-ask b { display: block; }
.ps-ask span { color: ${C2.text2}; font-size: 13px; }

/* notices, errors, overlays */
.ps-notice { background: ${C2.warnBg}; color: ${C2.warn}; border-radius: ${C2.rMd}; padding: 8px 12px; margin: 12px 0; font-size: 13px; }
.ps-notice-bar { display: flex; justify-content: space-between; gap: 12px; }
.ps-installed-notice { align-items: flex-start; }
.ps-installed-notice-body { display: grid; gap: 6px; }
.ps-error { display: flex; align-items: center; gap: 12px; color: ${C2.error}; margin: 12px 0; flex-wrap: wrap; }
.ps-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.ps-modal { background: ${C2.bg1}; color: ${C2.text}; border-radius: ${C2.rXl}; padding: 22px 24px; width: min(440px, 92vw); box-shadow: 0 16px 48px rgba(0,0,0,.25); }
.ps-modal h3 { margin: 0 0 14px; font-size: 17px; }
.ps-modal-plugin { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.ps-row-title { font-weight: 600; }
.ps-trust { background: ${C2.warnBg}; color: ${C2.warn}; border-radius: ${C2.rMd}; padding: 8px 12px; font-size: 13px; margin: 14px 0; }
.ps-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.ps-modal-actions .ps-btn-large { width: auto; }
.ps-crash { padding: 32px; height: auto; }
.ps-toast { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); pointer-events: auto; display: flex; gap: 14px; align-items: center; background: ${C2.bg1}; color: ${C2.text}; border: 1px solid ${C2.border}; border-radius: ${C2.rLg}; padding: 10px 16px; box-shadow: 0 8px 28px rgba(0,0,0,.18); z-index: 1000; font-size: 14px; }
`;
function injectStyles(doc = document) {
  const existing = doc.querySelector('style[data-plugin="dsh-plugin-store"]');
  if (existing) return () => {
  };
  const tag = doc.createElement("style");
  tag.dataset.plugin = "dsh-plugin-store";
  tag.textContent = STYLE_TEXT;
  doc.head.appendChild(tag);
  return () => tag.remove();
}

// src/client.ts
var name = "plugin-store";
var NS = "pluginStore";
var PANEL_ID = "plugin-store";
var PLUGINS_PANEL_ID2 = "plugins";
var inject = ["slots", "locale", "layout", "remote", "remote.pluginManager"];
function useCopy(props, locale) {
  const lang = (0, import_react8.useSyncExternalStore)((listener) => locale.subscribe(listener), () => String(locale.getSnapshot().active));
  const t = makeTranslate((key) => props.t(key));
  return { lang, t };
}
function StoreIcon({ size }) {
  return (0, import_react8.createElement)(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
    (0, import_react8.createElement)("path", { d: "M5 8h14l-1 12H6L5 8z" }),
    (0, import_react8.createElement)("path", { d: "M9 8V6a3 3 0 0 1 6 0v2" })
  );
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh_default.ui, en: en_default.ui }), "plugin-store: dictionaries");
  ctx.effect(() => injectStyles(), "plugin-store: styles");
  const t = ctx.locale.bind(NS);
  const handoff = createHandoff();
  const services = {
    loadCatalog,
    loadDetail,
    loadReadme,
    loadInstalled: async () => installedFrom(await ctx.remote.pluginManager.listBundles()),
    subscribeInstalled: (onChange) => {
      const stops = [ctx.remote.$on("plugin-manager/changed", () => onChange()), ctx.on("connection/reset", () => onChange())];
      return () => {
        for (const stop of stops) stop();
      };
    }
  };
  const titleOf = (plugin, lang) => localize(plugin.title, lang) || plugin.name;
  const openInstalled = openInstalledFrom({
    navigation: () => {
      try {
        return ctx.get("pluginNavigation");
      } catch {
        return void 0;
      }
    },
    selectPanel: (id) => ctx.layout.selectPanel(id)
  });
  function handOver(pending) {
    handoff.request(pending);
    ctx.layout.selectPanel(PLUGINS_PANEL_ID2);
    void selectTabWhenReady(() => document, t("tab"));
  }
  function StoreTab(props) {
    const { lang, t: tr } = useCopy(props, ctx.locale);
    return (0, import_react8.createElement)(ErrorBoundary, { t: tr, children: (0, import_react8.createElement)(StoreApp, {
      mode: "tab",
      lang,
      t: tr,
      services,
      onInstall: (plugin) => props.install({ spec: `${plugin.name}@${plugin.version}`, title: titleOf(plugin, lang), version: plugin.version }),
      onSelfUpdate: (update) => props.install({ spec: update.spec, title: tr("selfUpdateTitle"), version: update.latest }),
      onOpenInstalled: (plugin) => props.openPackage(plugin.name),
      takePending: handoff.take
    }) });
  }
  function StorePanel(props) {
    const { lang, t: tr } = useCopy(props, ctx.locale);
    return (0, import_react8.createElement)(ErrorBoundary, { t: tr, children: (0, import_react8.createElement)(StoreApp, {
      mode: "panel",
      lang,
      t: tr,
      services,
      onInstall: (plugin) => handOver({ name: plugin.name, title: titleOf(plugin, lang) }),
      onSelfUpdate: () => handOver({ name: STORE_PACKAGE, title: tr("selfUpdateTitle") }),
      onOpenInstalled: (plugin) => openInstalled(plugin.name)
    }) });
  }
  function Notice(props) {
    const { t: tr } = useCopy(props, ctx.locale);
    return (0, import_react8.createElement)(HandoffToast, { handoff, t: tr });
  }
  ctx.slots.inject("plugins.tab", () => ctx.slots.register({ name: "plugins.tab", id: "store", label: () => t("tab"), locale: NS }, StoreTab));
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID, locale: NS }, StorePanel));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: PANEL_ID, order: 1, label: () => t("tab"), locale: NS }, StoreIcon));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "plugin-store.handoff", locale: NS }, Notice));
  if (shouldAutoOpen(() => window.localStorage)) ctx.layout.selectPanel(PANEL_ID);
}
return module.exports; } });

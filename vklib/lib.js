function ge() {
  var ea;
  for (var i = 0; i < arguments.length; i++) {
    var e = arguments[i];
    if (typeof e == 'string')
      e = document.getElementById(e);
    if (arguments.length == 1)
      return e;
    if (!ea)
      ea = new Array();
    ea.push(e);
  }
  return ea;
}

function geByClass(searchClass, node, tag) {
  var classElements = new Array();
  if (node == null)
    node = document;
  if (tag == null)
    tag = '*';
  if (node.getElementsByClassName) {
    classElements = node.getElementsByClassName(searchClass);
    if (tag != '*') {
      for (i = 0; i < classElements.length; i++) {
        if (classElements.nodeName == tag)
          classElements.splice(i, 1);
      }
    }
    return classElements;
  }
  var els = node.getElementsByTagName(tag);
  var elsLen = els.length;
  var pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");
  for (i = 0, j = 0; i < elsLen; i++) {
    if ( pattern.test(els[i].className) ) {
      classElements[j] = els[i];
      j++;
    }
  }
  return classElements;
}

function hasClass(obj, name) {
  obj=ge(obj);
  return obj && (new RegExp('(\\s|^)' + name + '(\\s|$)')).test(obj.className);
}

function addClass(obj, name) {
  obj=ge(obj);
  if (obj && !hasClass(obj, name)) obj.className = (obj.className ? obj.className + ' ' : '') + name;
}

function removeClass(obj, name) {
  obj=ge(obj);
  if (obj && hasClass(obj, name)) obj.className = obj.className.replace((new RegExp('(\\s|^)' + name + '(\\s|$)')), ' ');
}

Function.prototype.bind = function(object) {
  var __method = this;
  return function() {
    return __method.apply(object, arguments);
  }
};

var expand = "VK" + now(), vk_uuid = 0, vk_cache = {};

function data(elem, name, data) {
  var id = elem[ expand ], undefined;
  if ( !id )
    id = elem[ expand ] = ++vk_uuid;

  if (name && !vk_cache[id])
    vk_cache[id] = {};

  if (data !== undefined)
    vk_cache[id][name] = data;

  return name ?
    vk_cache[id][name] :
    id;
}

function addEvent(elem, types, handler, custom) {
  elem = ge(elem);
  if (!elem || elem.nodeType == 3 || elem.nodeType == 8 )
    return;
  if (elem.setInterval && elem != window)
    elem = window;

  var events = data(elem, "events") || data(elem, "events", []),
      handle = data(elem, "handle") || data(elem, "handle", function(){
        _eventHandle.apply(arguments.callee.elem, arguments);
      });
  handle.elem = elem;
  each(types.split(/\s+/), function(index, type) {
    var handlers = events[type];
    if (!handlers) {
      handlers = events[type] = new Array();
      if (!custom && elem.addEventListener)
        elem.addEventListener(type, handle, false);
      else if (!custom && elem.attachEvent)
        elem.attachEvent('on' + type, handle);
    }
    handlers.push(handler);
  });

  elem = null;
}

function triggerEvent(elem, type) {
  var handle = data(elem, "handle");
  if (handle) {
    setTimeout(function() {handle.call(elem, {type: type, target: elem})}, 0);
  }
}

function removeEvent(elem, type, handler) {
  elem = ge(elem);
  if (!elem) return;
  var events = data(elem, "events");
  if (events) {
    if (typeof(type) == 'string' && isArray(events[type])) {
      if (isFunction(handler)) {
        for (var i = 0; i < events[type].length; i++) {
          if (events[type][i] == handler) {
            delete events[type][i];
            break;
          }
        }
      } else {
        for (var i = 0; i < events[type].length; i++) {
          delete events[type][i];
        }
      }
    } else {
      for (var i in events) {
        removeEvent(elem, i);
      }
      return;
    }
    for (var ret in events[type]) break;
    if (!ret) {
      if (elem.removeEventListener)
        elem.removeEventListener(type, data(elem, "handle"), false);
      else if (elem.detachEvent)
        elem.detachEvent("on" + type, data(elem, "handle"));
      ret = null;
      delete events[type];
    }
  }
}

function cancelEvent(event) {
  var e = event.originalEvent || event;
  if (e.preventDefault)
      e.preventDefault();
  if (e.stopPropagation)
      e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function _eventHandle(event) {
  event = event || window.event;

  var originalEvent = event;
  event = clone(originalEvent);
  event.originalEvent = originalEvent;

  if (!event.target)
    event.target = event.srcElement || document;

  if ( event.target.nodeType == 3 )
    event.target = event.target.parentNode;

  if (!event.relatedTarget && event.fromElement)
    event.relatedTarget = event.fromElement == event.target;

  if ( event.pageX == null && event.clientX != null ) {
    var doc = document.documentElement, body = document.body;
    event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc.clientLeft || 0);
    event.pageY = event.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc.clientTop || 0);
  }

  if ( !event.which && ((event.charCode || event.charCode === 0) ? event.charCode : event.keyCode) )
    event.which = event.charCode || event.keyCode;

  if ( !event.metaKey && event.ctrlKey )
    event.metaKey = event.ctrlKey;

  if ( !event.which && event.button )
    event.which = (event.button & 1 ? 1 : ( event.button & 2 ? 3 : ( event.button & 4 ? 2 : 0 ) ));

  var handlers = data(this, "events");
  if (!handlers || typeof(event.type) != 'string' || !handlers[event.type] || !handlers[event.type].length) {
    return;
  }
  try {
  for (var i in (handlers[event.type] || [])) {
    if (event.type == 'mouseover' || event.type == 'mouseout') {
      var parent = event.relatedElement;
      while ( parent && parent != this )
        try { parent = parent.parentNode; }
        catch(e) { parent = this; }
      if (parent == this) {
        continue
      }
    }
    var ret = handlers[event.type][i].apply(this, arguments);
    if (ret === false) {
      cancelEvent(event);
    }
  }
  } catch (e) {
    alert(event.target.id+"."+event.type+": "+e.message);
  }
}

function each(object, callback) {
  var name, i = 0, length = object.length;

  if ( length === undefined ) {
    for ( name in object )
      if ( callback.call( object[ name ], name, object[ name ] ) === false )
        break;
  } else
    for ( var value = object[0];
      i < length && callback.call( value, i, value ) !== false; value = object[++i] ){}

  return object;
};
function indexOf(arr, value, from) {
  from = (from == null) ? 0 : from;
  var m = arr.length;
  for(var i = from; i < m; i++)
    if (arr[i] == value)
       return i;
   return -1;
}

function clone(obj) {
  var newObj = {};
  for (var i in obj) {
    newObj[i] = obj[i];
  }
  return newObj;
}

function extend() {
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;

  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    i = 2;
  }

  if (typeof target !== "object" && !isFunction(target))
    target = {};

  if (length == i) {
    return target;
  }

  for (; i < length; i++)
    if ((options = arguments[i]) != null)
      for (var name in options) {
        var src = target[name], copy = options[name];

        if (target === copy)
          continue;

        if (deep && copy && typeof copy === "object" && !copy.nodeType)
          target[name] = extend(deep,
            src || (copy.length != null ? [] : { })
          , copy);

        else if (copy !== undefined)
          target[name] = copy;
      }
  return target;
}

function isFunction(obj) { return Object.prototype.toString.call(obj) === "[object Function]"; }
function isArray(obj) { return Object.prototype.toString.call(obj) === "[object Array]"; }
function now() { return +new Date; }

function show(elem) {
  if (arguments.length > 1) {
    for (var i = 0; i < arguments.length; i++) {
      show(arguments[i]);
    }
    return;
  }
  elem = ge(elem);
  if (!elem) return;
  var old = data(elem, "olddisplay");
  elem.style.display = old || "";

  if (getStyle(elem, 'display') == "none" ) {
    if (elem.tagName.toLowerCase() == 'tr') {
      elem.style.display = 'table-row';
    } else if (elem.tagName.toLowerCase() == 'table') {
      elem.style.display = 'table';
    } else {
      elem.style.display = data(elem, "olddisplay", "block");
    }
  }
}

function hide(elem) {
  if (arguments.length > 1) {
    for (var i = 0; i < arguments.length; i++) {
      hide(arguments[i]);
    }
    return;
  }
  elem = ge(elem);
  if (!elem) return;
  if (getStyle(elem, 'display') != "none")
    data(elem, "olddisplay", elem.style.display);
  elem.style.display = "none";
}
function isVisible(elem) {
 elem = ge(elem);
 return getStyle(elem, 'display') != 'none' && getStyle(elem, 'visibility') != 'hidden';
}

function getStyle(elem, name, force) {
  elem = ge(elem);
  if (force === undefined) {
    force = true;
  }
  if (!force && elem.style && (elem.style[name] || name == 'height'))
    return elem.style[name];

  if (force && (name == "width" || name == "height")) {
    return getSize(elem, true)[({'width':0, 'height':1})[name]] + 'px';
  }

  var ret, defaultView = document.defaultView || window;
  if (defaultView.getComputedStyle) {
    name = name.replace( /([A-Z])/g, "-$1" ).toLowerCase();
    var computedStyle = defaultView.getComputedStyle( elem, null );
      if (computedStyle)
        ret = computedStyle.getPropertyValue(name);
  } else if (elem.currentStyle) {
    var camelCase = name.replace(/\-(\w)/g, function(all, letter){
      return letter.toUpperCase();
    });
    ret = elem.currentStyle[name] || elem.currentStyle[camelCase];
    if ( !/^\d+(px)?$/i.test( ret ) && /^\d/.test( ret ) ) {
      var left = style.left, rsLeft = elem.runtimeStyle.left;
      elem.runtimeStyle.left = elem.currentStyle.left;
      style.left = ret || 0;
      ret = style.pixelLeft + "px";
      style.left = left;
      elem.runtimeStyle.left = rsLeft;
    }
  }
  return ret;
}

function getSize(elem, withoutBounds) {
  return [elem.offsetWidth, elem.offsetHeight];
}

function setStyle(elem, name, value){
  elem = ge(elem);
  if (typeof name == 'object') return each(name, function(k,v){setStyle(elem,k,v);});
  if (name == 'opacity'){
    elem.style.opacity = value;
  } else {
    var isNum = typeof(value) == 'number' && !(/z-?index|font-?weight|opacity|zoom|line-?height/i).test(name);
    elem.style[name] = isNum ? value + 'px': value;
  }
}

function animate(el, params, speed, callback) {
  el = ge(el);
  var options = extend({}, typeof speed == 'object' ? speed : {duration: speed, onComplete: callback || function(){}});
  var fromArr = {}, toArr = {}, visible = isVisible(el), self = this, p;
  options.orig = {};
  params = clone(params);

  var tween = data(el, 'tween'), i, name, toggleAct = visible ? 'hide' : 'show';
  if (tween && tween.isTweening) {
    options.orig = extend(options.orig, tween.options.orig);
    tween.stop(false);
    if (tween.options.show) toggleAct = 'hide';
    else if (tween.options.hide) toggleAct = 'show';
  }
  for (p in params)  {
    if (!tween && (params[p] == 'show' && visible || params[p] == 'hide' && !visible))
      return options.onComplete.call(this, el);
    if ((p == "height" || p == "width") && el.style) {
      if (options.orig.overflow == undefined) {
        options.orig.overflow = getStyle(el, 'overflow');
      }
      el.style.overflow = 'hidden';
      el.style.display = 'block';
    }
    if (/show|hide|toggle/.test(params[p])) {
      if (params[p] == 'toggle')
        params[p] = toggleAct;
      if (params[p] == 'show') {
        var from = 0;
        options.show = true;
        if (options.orig[p] == undefined) {
          options.orig[p] = getStyle(el, p, false) || '';
          setStyle(el, p, 0);
        }
        var sopt = {p:options.orig[p]};
        swapStyle(el, sopt, function() {
          params[p] = parseFloat(getStyle(el, p, true));
        });
      } else {
        if (options.orig[p] == undefined) {
          options.orig[p] = getStyle(el, p, false) || '';
        }
        options.hide = true;
        params[p] = 0;
      }
    }
  }
  if (options.show && !visible)
    show(el);
  tween = new Fx.Base(el, options);
  each(params, function(name, to) {
    if (/backgroundColor|borderBottomColor|borderLeftColor|borderRightColor|borderTopColor|color|borderColor|outlineColor/.test(name)) {
      var p = (name == 'borderColor') ? 'borderTopColor' : name;
      from = getColor(el, p);
      to = getRGB(to);
    } else {
      var parts = to.toString().match(/^([+-]=)?([\d+-.]+)(.*)$/),
        start = tween.cur(name, true) || 0;
      if (parts) {
        to = parseFloat(parts[2]);
        if ( parts[1] )
          to = ((parts[1] == "-=" ? -1 : 1) * to) + to;
      }

      from = tween.cur(name, true);
      if (from == 0 && (name == "width" || name == "height"))
        from = 1;

      if (name == "opacity" && to > 0 && !visible) {
        setStyle(el, 'opacity', 0);
        from = 0;
        show(el);
      }
    }
    if (from != to || (isArray(from) && from.join(',') == to.join(','))) {
      fromArr[name] = from;
      toArr[name] = to;
    }
  });
  tween.start(fromArr, toArr);
  data(el, 'tween', tween);

  return tween;
}

function fadeTo(el, speed, to, callback) {return animate(el, {opacity: to}, speed, callback);}

var Fx = fx = {
 Transitions: {
  linear: function(t, b, c, d) { return c*t/d + b; },
  sineInOut: function(t, b, c, d) { return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b; },
  halfSine: function(t, b, c, d) { return c * Math.sin(Math.PI * (t/d) / 2) + b; },
  easeOutBack: function(t, b, c, d) { var s = 1.70158; return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b; }
 },
 Attrs: [
  [ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
  [ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ],
  [ "opacity" ]
 ],
 Timers: [],
 TimerId: null
};
Fx.Base = function(el, options, name){
  this.el = ge(el);
  this.name = name;
  this.options = extend({
    onComplete: function(){},
    transition: Fx.Transitions.sineInOut,
    duration: 500
  }, options || {});
};

function genFx(type, num){
  var obj = {};
  each( Fx.Attrs.concat.apply([], Fx.Attrs.slice(0,num)), function(){
    obj[this] = type;
  });
  return obj;
};

// Shortcuts for custom animations
each({slideDown: genFx('show', 1),
 slideUp: genFx('hide', 1),
 slideToggle: genFx('toggle', 1),
 fadeIn: {opacity: 'show'},
 fadeOut: {opacity: 'hide'},
 fadeToggle: {opacity: 'toggle'}}, function(f, val){
 window[f] = function(el, speed, callback){return animate(el, val, speed, callback);}
});

Fx.Base.prototype = {
  start: function(from, to){
    this.from = from;
    this.to = to;
    this.time = now();
    this.isTweening = true;

    var self = this;
    function t(gotoEnd) {
      return self.step(gotoEnd);
    }
    t.el = this.el;
    if (t() && Fx.Timers.push(t) && !Fx.TimerId) {
      Fx.TimerId = setInterval(function(){
        var timers = Fx.Timers;
        for (var i = 0; i < timers.length; i++)
          if (!timers[i]())
            timers.splice(i--, 1);
        if (!timers.length) {
          clearInterval(Fx.TimerId);
          Fx.TimerId = null;
        }
      }, 13);
    }
    return this;
  },

  stop: function(gotoEnd) {
    var timers = Fx.Timers;
    // go in reverse order so anything added to the queue during the loop is ignored
    for (var i = timers.length - 1; i >= 0; i--)
      if (timers[i].el == this.el ) {
        if (gotoEnd)
          // force the next step to be the last
          timers[i](true);
        timers.splice(i, 1);
      }
    this.isTweening = false;
  },

  step: function(gotoEnd){
    var time = now();
    if (!gotoEnd && time < this.time + this.options.duration){
      this.cTime = time - this.time;
      this.now = {};
      for (p in this.to) {
        // color fx
        if (isArray(this.to[p])) {
          var color = [], j;
          for (j = 0; j < 3; j++)
            color.push(Math.min(parseInt(this.compute(this.from[p][j], this.to[p][j])), 255));
          this.now[p] = color;
        } else
          this.now[p] = this.compute(this.from[p], this.to[p]);
      }
      this.update();
      return true;
    } else {
//      if (this.el.className == 'im_tab3') alert('this.time: ' + this.time + ', ' + (time - this.time) + ' > ' + this.options.duration);
      setTimeout(this.options.onComplete.bind(this, this.el), 10);
      this.now = extend(this.to, this.options.orig);
      this.update();
      if (this.options.hide) hide(this.el);
      this.isTweening = false;
      return false;
    }
  },

  compute: function(from, to){
    var change = to - from;
    return this.options.transition(this.cTime, from, change, this.options.duration);
  },

  update: function(){
    for (var p in this.now) {
      if (isArray(this.now[p])) setStyle(this.el, p, 'rgb(' + this.now[p].join(',') + ')');
      else this.el[p] != undefined ? (this.el[p] = this.now[p]) : setStyle(this.el, p, this.now[p]);
    }
  },

  cur: function(name, force){
    if (this.el[name] != null && (!this.el.style || this.el.style[name] == null))
      return this.el[name];
    return parseFloat(getStyle(this.el, name, force)) || 0;
  }
};

function stripHTML(text) { return text ? text.replace(/<(?:.|\s)*?>/g, "") : ''; }
function winToUtf(text) {
  var m, i, j, code;
  m = text.match(/&#[0-9]{2}[0-9]*;/gi);
  for (j in m) {
    var val = '' + m[j]; // buggy IE6
    code = intval(val.substr(2, val.length - 3));
    if (code >= 32 && ('&#' + code + ';' == val)) { // buggy IE6
      text = text.replace(val, String.fromCharCode(code));
    }
  }
  text = text.replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
  return text;
}

function getRGB(color) {
  var result;
  if ( color && isArray(color) && color.length == 3 )
    return color;
  if (result = /rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(\s*,\s*([0-9]{1,3}))?\s*\)/.exec(color))
    return [parseInt(result[1]), parseInt(result[2]), parseInt(result[3])];
  if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color))
    return [parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55];
  if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color))
    return [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)];
  if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color))
    return [parseInt(result[1]+result[1],16), parseInt(result[2]+result[2],16), parseInt(result[3]+result[3],16)];
}

function getColor(elem, attr) {
	var color;
	do {
		color = getStyle(elem, attr);
		if (color != '' && color != 'transparent' || elem.nodeName.toLowerCase() == "body")
			break;
		attr = "backgroundColor";
	} while (elem = elem.parentNode);
	return getRGB(color);
}
function intval(value) {
  if (value === true) return 1;
  return isNaN(parseInt(value)) ? 0 : parseInt(value);
}

var button_anim = {duration: 200, transition: Fx.Transitions.halfSine};
var button_anims = {
  button_yes: {
    ''      : {p: ['#6D8FB3', '#7E9CBC', '#5C82AB', '#5C82AB', '#5C82AB'], o: button_anim},
    '_hover': {p: ['#84A1BF', '#92ACC7', '#7293B7', '#7293B7', '#7293B7'], o: button_anim},
    '_down' : {p: ['#6688AD', '#51779F', '#51779F', '#7495B8', '#51779F'], o: 0}
  }, button_no: {
    ''      : {p: ['#EAEAEA', '#FFFFFF', '#F4F4F4', '#DFDFDF', '#F4F4F4'], o: button_anim},
    '_hover': {p: ['#F7F7F7', '#FFFFFF', '#F4F4F4', '#DFDFDF', '#F4F4F4'], o: button_anim},
    '_down' : {p: ['#E4E4E4', '#CCCCCC', '#CBCBCB', '#E8E8E8', '#CBCBCB'], o: 0}
  }
}

/* 3-state button */
function createButton(el, onClick, classPrefix) {
  el = ge(el);
  if (!el) return;
  if (classPrefix == undefined) classPrefix = 'button';
  var upd = function(state) {
    if (!button_anims[el.parentNode.className]) {
     el.className = classPrefix + state;
    } else {
     var a = button_anims[el.parentNode.className][state];
     animate(el, {backgroundColor: a.p[0], borderTopColor: a.p[1], borderRightColor: a.p[2], borderBottomColor: a.p[3], borderLeftColor: a.p[4]}, a.o);
    }
  }
  var hover = false;
  addEvent(el, 'click mousedown mouseover mouseout', function(e) {
    var bc = getXY(el), bs = [el.offsetWidth, el.offsetHeight];
    switch (e.type) {
    case 'click':
      if (!hover) return;
      upd('_hover');
      if (isFunction(onClick)) onClick();
    break;
    case 'mousedown':
      upd('_down');
    break;
    case 'mouseover':
      upd('_hover');
      hover = true;
    break;
    case 'mouseout':
      upd('');
      hover = false;
    break;
    }
  });
}

function getXY(obj) {
 if (!obj || obj == undefined) return;
 var left = 0, top = 0;
 if (obj.offsetParent) {
  do {
   left += obj.offsetLeft;
   top += obj.offsetTop;
  } while (obj = obj.offsetParent);
 }
 return [left,top];
}

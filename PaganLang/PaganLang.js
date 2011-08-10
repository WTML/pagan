(function(){
var pl = window.PaganLang = function(locale, path, callback) {
  jx.load((path || '/PaganLang/conf') + '/' + (locale || 'ru') + '.json', function(res){
    this.conf = JSON.parse(res);
    if (callback) callback(this.conf);
  });
};

pl.prototype.format = function() {
  var args = Array.prototype.slice.apply(arguments), cnt = args.length - 1;
  if (cnt < 0) return '';
  var str = args[0], len = str.length;
  var str = str.replace(/\{\{/g, "\u0001").replace(/\}\}/g, "\u0002").replace(/\{([^{}]+)\}/g, function(s, p1) {
    var token = p1.split(':', 3), tagID = p1[0], ruleName = p1[1], rule = p1[2].split(':');
    if (tagID >= cnt) return '';
    var arg = args[tagID], ruleConf = this.conf.rules[ruleName];
    switch (ruleConf.type) {
      case 'time': return arg; break;
      case 'numeric': return _parseNumeric(ruleConf, arg, rule); break;
      case 'flex': return arg; break;
      case 'switch': return arg; break;
      default: return arg; break;
    }
  }).replace(/\u0001/g, '{').replace(/\u0002/g, '}');
  return str;

  function indexOf(arr, value, from) {
    from = (from == null) ? 0 : from;
    var m = arr.length;
    for(var i = from; i < m; i++)
      if (arr[i] == value)
         return i;
     return -1;
  }
  
  function _parseNumeric(ruleConf, data, params) {
    var variant = false;
    if (params.length <= 1) {
      variant = params[0];
    } else {
      var dataInt = parseInt(data), dataPos = Math.abs(data);
      if (data != dataInt) {
        variant = ruleConf['float'];
      } else if (ruleConf.variants) {
        for (var rule in ruleConf.variants) {
          var mod = rule[0] ? dataPos % rule[0] : dataPos;
          if (indexOf(rule[1], mod) != -1) {
            variant = rule[2];
            break;
          }
        }
        if (variant === false) {
          variant = ruleConf['int'];
        }
      }
    }
    variant = (params[variant] || params[0]).replace(/%%/g, "\u0001");
    return this.sprintf(ruleConf, variant, data);
  }
};

pl.prototype.sprintf = function () {
  if (typeof arguments == "undefined") { return null; }
  if (arguments.length < 1) { return null; }
  var ruleConf, string;
  var convCount = 0;
  if (typeof arguments[0] != "string") { 
    ruleConf = arguments[0];
    string = arguments[1];
    convCount++;
  } else {
    ruleConf = {};
    string = arguments[0];
  }

  var exp = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxXn])))/g);
  var matches = new Array();
  var strings = new Array();
  var stringPosStart = 0;
  var stringPosEnd = 0;
  var matchPosEnd = 0;
  var newString = [];
  var match = null;

  while (match = exp.exec(string)) {
    if (match[9]) { convCount += 1; }

    stringPosStart = matchPosEnd;
    stringPosEnd = exp.lastIndex - match[0].length;
    strings[strings.length] = string.substring(stringPosStart, stringPosEnd);

    matchPosEnd = exp.lastIndex;
    matches[matches.length] = {
      match: match[0],
      left: match[3] ? true : false,
      sign: match[4] || '',
      pad: match[5] || ' ',
      min: match[6] || 0,
      precision: match[8],
      code: match[9] || '%',
      negative: parseInt(arguments[convCount]) < 0 ? true : false,
      argument: String(arguments[convCount])
    };
  }
  strings[strings.length] = string.substring(matchPosEnd);

  if (matches.length == 0) { return string; }
  if ((arguments.length - 1) < convCount) { return null; }

  var code = null;
  var match = null;
  var i = null;

  for (i=0; i < matches.length; i++) {

    switch (matches[i].code) {
      case 'b':
        matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(2));
        substitution = convert(matches[i], true);
        break;
      case 'c':
        matches[i].argument = String(String.fromCharCode(parseInt(Math.abs(parseInt(matches[i].argument)))));
        substitution = convert(matches[i], true);
        break;
      case 'd':
        matches[i].argument = String(Math.abs(parseInt(matches[i].argument)));
        substitution = convert(matches[i]);
        break;
      case 'f':
        matches[i].argument = String(Math.abs(parseFloat(matches[i].argument)).toFixed(matches[i].precision ? matches[i].precision : 6));
        substitution = convert(matches[i]);
        break;
      case 'o':
        matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(8));
        substitution = convert(matches[i]);
        break;
      case 's':
        matches[i].argument = matches[i].argument.substring(0, matches[i].precision ? matches[i].precision : matches[i].argument.length)
        substitution = convert(matches[i], true);
        break;
      case 'x':
        matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
        substitution = convert(matches[i]);
        break;
      case 'X':
        matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
        substitution = convert(matches[i]).toUpperCase();
        break;
      case '%':
        substitution = '%';
        break;
      case 'n':
        var arg = parseFloat(matches[i].argument);
        if (parseInt(arg) == arg && !matches[i].precision) {
          arg = numFmt(String(Math.abs(parseInt(arg))), ruleConf.delimiter || ' ');
        } else {
          arg = String(Math.abs(arg).toFixed(matches[i].precision ? matches[i].precision : 6));
          arg = arg.split('.', 2);
          arg[0] = numFmt(arg[0], ruleConf.delimiter || ' ');
          arg = arg.join(ruleConf.decimal || '.');
        }
        matches[i].argument = arg;
        substitution = convert(matches[i]);
        break;
      default: 
        substitution = matches[i].match;
        break;
    }
    newString.push(strings[i]);
    newString.push(substitution);
  }
  newString.push(strings[i]);

  return newString.join('');
  
  function numFmt(num, delim) {
    var len = num.length;
    return ((new Array(3 - (len-1)%3)).join(" ") + num).match(/.{1,3}/g).join(delim).replace(/^\s+/,"");
  }
  
  function convert(match, nosign) {
    match.sign = nosign ? '' : (match.negative ? '-' : match.sign);
    var l = match.min - match.argument.length + 1 - match.sign.length;
    var pad = new Array(l < 0 ? 0 : l).join(match.pad);
    if (!match.left) {
      return (match.pad == "0" || nosign) ? (match.sign + pad + match.argument) : (pad + match.sign + match.argument);
    } else {
      return (match.pad == "0" || nosign) ? (match.sign + match.argument + pad.replace(/0/g, ' ')) : (match.sign + match.argument + pad);
    }
  }
}

var jx={getHTTPObject:function(){var a=!1;if(typeof ActiveXObject!="undefined")try{a=new ActiveXObject("Msxml2.XMLHTTP")}catch(d){try{a=new ActiveXObject("Microsoft.XMLHTTP")}catch(e){a=!1}}else if(window.XMLHttpRequest)try{a=new XMLHttpRequest}catch(c){a=!1}return a},load:function(a,d,e,c){var b=this.init();if(b&&a){b.overrideMimeType&&b.overrideMimeType("text/xml");c||(c="text");var c=c.toLowerCase(),f=a.indexOf("http")!=0;b.open("GET",a,!0);b.onreadystatechange=function(){if(b.readyState==4)if(b.status==
200||!b.status&&f){var a=b.responseText||"";c.charAt(0)=="j"&&(a=a.replace(/[\n\r]/g,""),a=eval("("+a+")"));d&&d(a)}else e&&e(b.status)};b.send(null)}},init:function(){return this.getHTTPObject()}};
})();


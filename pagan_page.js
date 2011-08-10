(function(){
if (window.PGN) return;
window.PGN = 1;
var brdr = '', b = document.body;
/* * /
var fr = document.createElement('div');
fr.id = 'paganFrame';
fr.setAttribute('style', 'z-index:1000000;top:0;left:0;position:absolute;width:'+b.offsetWidth+'px;height:'+b.offsetHeight+'px;overflow:hidden;');
b.appendChild(fr);
fr.addEventListener('mousemove', function(e) {
  var x = e.pageX, y = e.pageY;
  //hide(fr);
  var el = document.elementFromPoint(x, y);
  //show(fr);
  //fr.innerHTML = '';
  if (!el) return;
  var text = document.createElement('div');
  var style = window.getComputedStyle(el);
  var props = ['width', 'height', 'font-size', 'color', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom'];
  var offset = getOffset(el);
  text.setAttribute('style', 'top:'+offset[0]+'px;left:'+offset[1]+'px;position:absolute;overflow:hidden;');
  text.innerHTML = el.innerHTML;
  console.log(style.getPropertyValue('font-size'));
  for (var i in props) {
    var p = props[i];
    text.style[p] = style.getPropertyValue(p);
  }
  fr.appendChild(text);
  
});
/**/
var x = 0, y = 0;
b.addEventListener('mousemove', function(e) {
  x = e.pageX - (b.scrollLeft||0), y = e.pageY - (b.scrollTop||0);
});

var extID = 'fbfbbkpnjfmjmamolmangajeomfipfip';

//var port = chrome.extension.connect('fbfbbkpnjfmjmamolmangajeomfipfip');

b.addEventListener('keyup', function(e) {
  if(e.keyCode != 17) return;
  //var sel = window.getSelection();
  //if (!sel || sel.isCollapsed) return;
  var range = document.caretRangeFromPoint(x,y);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  sel.extend(range.startContainer, range.startOffset);
  sel.collapseToEnd();
  sel.modify("move", "backward", "word");
  sel.modify("extend", "forward", "word");
  var word = sel.getRangeAt(0).toString();
  sel.collapseToStart();
  sel.modify("move", "backward", "sentence");
  sel.modify("extend", "forward", "sentence");
  var sentence = sel.getRangeAt(0).toString();
  chrome.extension.sendRequest(extID, [{action:"show_word_popup", word:word, sentence:sentence}], function(res){
    console.log(res.show_word_popup);
  });
  sel.removeAllRanges();
});

/*
function hide(el) {el.style.display = 'none';}
function show(el) {el.style.display = '';}
function getOffset(el) {
  var off = [parseInt(el.offsetTop), parseInt(el.offsetLeft)];
  while (el = el.offsetParent) {
    off[0] += parseInt(el.offsetTop);
    off[1] += parseInt(el.offsetLeft);
  }
  return off;
}
*/

var jx={gho:function(){var a=!1;try{a=new XMLHttpRequest}catch(c){}return a},load:function(a,d,e,c){var b=this.init();if(b&&a){b.overrideMimeType&&b.overrideMimeType("text/xml");c||(c="text");var c=c.toLowerCase(),f=a.indexOf("http")!=0;b.open("GET",a,!0);b.onreadystatechange=function(){if(b.readyState==4)if(b.status==
200||!b.status&&f){var a=b.responseText||"";c.charAt(0)=="j"&&(a=a.replace(/[\n\r]/g,""),a=eval("("+a+")"));d&&d(a)}else e&&e(b.status)};b.send(null)}},init:function(){return this.gho()}};

})();
document.addEventListener("DOMContentLoaded", function(){
var base = "http://kuzya.org/pagan";

var lang = new PaganLang('ru', '/PaganLang/conf');

function BadgeAnimation(logonColor, canvasID, logoID) {
  var timerId_, maxCount_ = 8, current_ = 0, maxDot_ = 4;
  var animationFrames = 36, animationSpeed = 10; // ms

  var animateInterval = 0, rotation = 0;
  var canvas = $(canvasID)[0];
  var logo = $(logoID)[0];
  var canvasContext = canvas.getContext('2d');
  
  var paintFrame = function() {
    var text = "";
    for (var i = 0; i < maxDot_; i++) {
      text += (i == current_) ? "." : " ";
    }
    if (current_ >= maxDot_) text += "";
    chrome.browserAction.setBadgeText({text:text});
    current_++;
    if (current_ == maxCount_) current_ = 0;
  }
  
  this.start = function() {
    if (timerId_) return;
    chrome.browserAction.setBadgeBackgroundColor({color:logonColor});
    timerId_ = window.setInterval(function() {
      paintFrame();
    }, 100);
  }

  this.stop = function() {
    if (!timerId_) return;
    window.clearInterval(timerId_);
    timerId_ = 0;
  }

  this.animate = function(callback) {
    rotation = 0;
    animateInterval = setInterval(function(){animateFlip(callback);}, animationSpeed);
  }

  var animationCache = {};

  var ease = function(x){return (1-Math.sin(Math.PI/2+x*Math.PI))/2;};

  function animateFlip(callback) {
    
    rotation = rotation ? rotation + 1/animationFrames : 1/animationFrames;
    
    if(rotation > 1){
      clearInterval(animateInterval);
      if ($.isFunction(callback))callback();
      return;
    }
    
    var key = rotation.toString();
    
    if(!animationCache[key]){
      canvasContext.save();
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);
      canvasContext.translate(
          Math.ceil(canvas.width/2),
          Math.ceil(canvas.height/2));
      canvasContext.rotate(2*Math.PI*ease(rotation));
      canvasContext.drawImage(logo, 
          -Math.ceil(canvas.width/2),
          -Math.ceil(canvas.height/2));
      canvasContext.restore();
      animationCache[key] = {imageData:canvasContext.getImageData(0, 0, canvas.width, canvas.height)};
    }
    chrome.browserAction.setIcon(animationCache[key]);
  }
  
  this.logOff = function() {
    chrome.browserAction.setBadgeBackgroundColor({color:logoffColor});
    chrome.browserAction.setIcon(logoffIcon);
    chrome.browserAction.setBadgeText(emptyText);
    chrome.browserAction.setTitle(emptyTitle);
  }
  
  var lastCount = 0;
  
  this.logOn = function(count) {
    if (count && count != lastCount) badgeAnim.animate();
    lastCount = count;
    chrome.browserAction.setBadgeBackgroundColor({color:logonColor});
    chrome.browserAction.setIcon(logonIcon);
    chrome.browserAction.setBadgeText({
      text: (count != "0" && count) ? count.toString() : ""
    });
  }
}

var logonIcon = {path:"images/logo.png"};
var logoffIcon = {path:"images/logo_off.png"};

var logonColor = [40,186,0,255];
var logoffColor = [190,190,190,230];

var emptyText = {text:''};
var emptyTitle = {title:''};

var badgeAnim = new BadgeAnimation(logonColor, '#badge_canvas', '#logo_img');

var pollInterval = 30;

var user = storage('user');

user.clear();

var routine = function() { $.ajax({
  url: base + '?id=' + user.data().id,
  dataType: 'json',
  success: function(json) {
    badgeAnim.stop();
    if (json.id) {
      user.data(json);
      badgeAnim.logOn(json.count);
    } else {
      badgeAnim.logOff();
      user.clear();
    }
  },
  error: function() {
    badgeAnim.stop();
    badgeAnim.logOff();
    user.clear();
  }
})};

setInterval(routine, pollInterval * 1000);

routine();

//window.PaganCallbacks = {count:0};

function listener(requests, sender, sendResponse) {
  var res = {};
  console.log(requests);
  //var lp = getLang();
  for (var r in requests) {
    var request = requests[r];
    var action = request.action;
    switch (action) {
      case 'get_user':
        res[action] = user;
        break;
      case 'show_word_popup':
        //PaganCallbacks['fn'+PaganCallbacks.count] = function(res) {
          
        //}
        
        var bingID = '1F9A1E3A0F4992F637FF425D5967AA0D63FB889D';
        $.get('http://api.microsofttranslator.com/V2/Ajax.svc/Translate?appId='+bingID+'&text='+encodeURIComponent(request.word)+'&from=it&to=ru', function(text){
          res[action] = text;
          if ($.isFunction(sendResponse)) sendResponse(res);
        });
        
        return;
        break;
    }
  }
  if ($.isFunction(sendResponse)) sendResponse(res);
}

chrome.extension.onRequest.addListener(listener);


badgeAnim.start();

//chrome.browserAction.onClicked.addListener(function(tab) {
chrome.tabs.onCreated.addListener(function(tab) {
  chrome.tabs.executeScript(tab.id, {file:"pagan_page.js"});
});

chrome.tabs.onUpdated.addListener(function(tab) {
  chrome.tabs.executeScript(tab.id, {file:"pagan_page.js"});
});

chrome.windows.getAll({populate:true}, function(wnds){
  for (var i in wnds) {
    for (var j in wnds[i].tabs) {
      var tab = wnds[i].tabs[j];
      //console.log(tab.url, tab.url.indexOf('http'));
      if (tab.url.indexOf('http') !== 0) continue;
      chrome.tabs.executeScript(tab.id, {file:"pagan_page.js"});
    }
  }
});

/* * /
function updateUnreadCount(json) {
  if(json.lang !== undefined){
    langPack = parseInt(json.lang.id);
    if(!lang[langPack]){langPack = parseInt(json.lang.p_id);}
  }
  var title = [];
  var needSound = false;
  var tweets = {count:0, items:{}};
  user = json.user;
  
  var lp = getLang();
  var firstTweet = notifications[0] ? false : true;

  for(var p in showPages) {
    var i = showPages[p];
    if(json[i] && json[i].count !== undefined){
      var count = json[i].count;
      if(lp[i]) title.push(lp.numeric(count, lp[i]));
      if (!counts[i] || counts[i].count != count) {
        if(!counts[i]) counts[i] = {};
        if (count) {
          for (var j in json[i].items) {
            if (!read[i][j] || read[i][j] < 2) {
              for(var n in notify) {
                if(notify[n] == i && !read[i][j]) { needSound = true; break; }
              }
              read[i][j] = firstTweet ? 2 : 1;
              var item = json[i].items[j];
              if (alerts) {
                if (!tweets.items[i]) {
                  tweets.items[i] = [];
                  tweets.count++;
                }
                tweets.items[i].push([j,item]);
              }
            }
          }
        }
       
        counts[i].count = count;
        animate(i);
      } else if (count) {
        for (var j in read[i]) {
          var item = json[i].items[j];
          if (read[i][j] == 1 && item) {
            if (!tweets.items[i]) {
              tweets.items[i] = [];
              tweets.count++;
            }
            tweets.items[i].push([j,item]);
          }
        }
      }
    }
  }
  
  if (tweets.count > 0) {
    var text = [], tweet_title = '';
    if (tweets.count > 1) {
      tweet_title = lp.tweet_title;
    }
    var n = 0;
    for (i in tweets.items) {
      var l = firstTweet ? counts[i].count : tweets.items[i].length, t = '', href = getURL(i);
      if (tweets.count == 1) {
        tweet_title = lp[i+'_label'];
      }
      if (l > 1) {
        t = lp.numeric(l, lp[i+'_N_tweet']);
      } else if (l == 1) {
        var item = tweets.items[i][0][1];
        var itemID = tweets.items[i][0][0];
        switch (i) {
          case 'notes':
            itemID = user.id+'_'+itemID.split('_')[0];
            break;
          case 'messages':
            itemID = item[0] + '_' + itemID;
            break;
        }
        var item_title = (item[3] && item[3].length > 30) ? item[3].substr(0, 27)+'...' : item[3];
        t = lp.sex(item[2], lp[i+'_tweet']).replace('{name}', item[1]).replace('{title}', item_title);
      }
      t = '<div class="row msg_' + i + ((n == 0) ? ' first' : '') + '" onmouseover="addClass(this, \'over\')" onmouseout="removeClass(this, \'over\')" onmousedown="if (event.button != 2) goTo(this, \'' + i + '\', \'' + (itemID || '') + '\');"><table><tr><td><div class="ico"></div></td><td><div class="txt">' + t + '</div></td></tr></table></div>';
      text.push(t);
      n++;
    }
    
    var message = text.join('');
    var notifID;
    if (!notifications[0]) {
      notifications[0] = webkitNotifications.createHTMLNotification('vk_tweet.html');
      setTimeout(function() { notifications[0].cancel(); }, alertsTO ? alertsTO * 1000 : 60000);
      notifID = 0;
    } else if (!notifications[1]) {
      notifications[1] = webkitNotifications.createHTMLNotification('vk_tweet.html');
      if (alertsTO) {
        setTimeout(function() { notifications[1].cancel(); }, alertsTO * 1000);
      }
      notifID = 1;
    } else {
      notifID = 1;
    }
    notifications[notifID].show();
    notifications[notifID].onclose = (function(n) {
      return function() {
        if (n) {
          notifications[n] = false;
          for (var i in read) {
            for (var j in read[i]) {
              read[i][j] = 2;
            }
          }
        }
      }
    })(notifID);
    var initNotif = function() {
      var views = chrome.extension.getViews({type:"notification"});
      var inited = false;
      views.forEach(function(win) {
        if (win.id === undefined) win.id = notifID;
        if (win.init && win.id == notifID) {
          win.init(tweet_title, 'images/icon32.png', message);
          inited = true;
        }
      });
      if (!inited) {
        setTimeout(initNotif, 10);
        console.log('delay')
        return;
      } 
    };
    setTimeout(initNotif, 10);
  }
  if (needSound) {
    playSound();
  }
  
  if (!json.user || !json.user.id) {
    toggleLoggedInOutState(false);
    return;
  }
  try {
    chrome.browserAction.setTitle({title:title.join("\n")});
  } catch(e) {}
  if (json.user.id != counts.user.id) {
    counts.user.id = json.user.id;
    var xhr = new XMLHttpRequest();
    var abortTimerId = window.setTimeout(function() { xhr.abort(); }, requestTimeout * 1000);

    try {
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          try {
            var json = eval('('+xhr.responseText+')');
            window.clearTimeout(abortTimerId);
            if (json.user && json.user.id > 0) {
              ge("userName").innerHTML = json.user.name;
            } else {
              //console.log('error getting name');
            }
          } catch(e) {
            
          }
        }
      }
      xhr.onerror = function(e) { 
        //console.log(e); 
      }
      xhr.open("GET", baseURL() + userURL, true);
      xhr.send(null);
    } catch(e) {
      //console.log(e);
    }
  }
}

var a = new Audio('http://vk.com/mp3/chat_sound.mp3');
function playSound() {
  a.load();
  setTimeout(function() {
    a.play();
  }, 50);
}

// ui stuff
function toggleLoggedInOutState(isLogged) {
  loadingAnimation.stop();
  var color = isLogged ? logonColor : logoffColor;
  var icon = isLogged ? logonIcon : logoffIcon;
  chrome.browserAction.setBadgeBackgroundColor(color);
  chrome.browserAction.setIcon(icon);
  if(!isLogged){
    try {
      chrome.browserAction.setBadgeText(emptyText);
      chrome.browserAction.setTitle(emptyTitle);
    } catch(e) {}
  }else{
    var unreadCount = counts['messages'] && counts['messages'].count;
    chrome.browserAction.setBadgeText({
      text: (unreadCount != "0" && unreadCount) ? unreadCount.toString() : ""
    });
  }
}

// animation
function animate(key) {
  if(key != 'messages') return;
  
  rotation = 0;
  
  animateInterval = setInterval(animateFlip, animationSpeed);
  //animateFlip(canvas, canvasContext);
}

var animationCache = {};

var ease = function(x){return (1-Math.sin(Math.PI/2+x*Math.PI))/2;};

function animateFlip() {
  
  rotation = rotation ? rotation + 1/animationFrames : 1/animationFrames;
  
  if(rotation > 1){
    toggleLoggedInOutState(true);
    clearInterval(animateInterval);
    return;
  }
  
  var key = rotation.toString();
  
  if(!animationCache[key]){
    canvasContext.save();
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.translate(
        Math.ceil(canvas.width/2),
        Math.ceil(canvas.height/2));
    canvasContext.rotate(2*Math.PI*ease(rotation));
    canvasContext.drawImage(ge('messagesBtn'), 
        -Math.ceil(canvas.width/2),
        -Math.ceil(canvas.height/2));
    canvasContext.restore();
    animationCache[key] = {imageData:canvasContext.getImageData(0, 0, canvas.width, canvas.height)};
  }
  chrome.browserAction.setIcon(animationCache[key]);
}

function getOpenedTab(pattern, type, callback) {
  chrome.windows.getAll({ populate: true }, function(windowList) {
    for (var i = 0, l_i = windowList.length; i < l_i; i++) {
      var wnd = windowList[i];
      if (type == 'normal' && !wnd.focused) continue;
      for (var j = 0, l_j = wnd.tabs.length; j < l_j; j++) {
        if(pattern.test(wnd.tabs[j].url) > 0 && wnd.type == type) {
          callback(wnd.id, wnd.tabs[j].id);
          return;
        }
      }
    }
    callback();
  });
}

function focusCurrent() {
  chrome.windows.getLastFocused(function(wnd) {
    if (!wnd.focused) {
      chrome.windows.update(wnd.id, {focused: true});
    }
  });
}

function goTo(key, id) {
  for (var i in read[key]) {
    read[key][i] = 2;
  }
  var page = baseURL() + getURL(key, id);
  if(key == 'messages' && im > 0) {
    if (im == 1) {
      getOpenedTab(/(vkontakte\.ru|vk\.com)\/im.php\?act=a_box&popup=/, 'popup', function(popup_wnd) {
        if (!popup_wnd) {
          chrome.windows.create({
            url: page,
            left: 30,
            top: 70,
            width: 610,
            height: 469,
            type: 'popup'
          });
        } else {
          chrome.windows.update(popup_wnd, {focused: true});
        }
      });
    } else if (im == 2) {
      getOpenedTab(/(vkontakte\.ru|vk\.com)\/im/, 'normal', function(wnd, tab) {
        if (!wnd) {
          chrome.tabs.create({url:page}, function(tab) {
            focusCurrent();
          });
        } else {
          chrome.tabs.update(tab, {selected: true});
        }
      });
    }
    return;
  }
  chrome.tabs.create({url:page}, function(tab) {
    focusCurrent();
  });
}

chrome.browserAction.setIcon(logonIcon);
loadingAnimation.start();

function share(info, tab) {
  var url = baseURL() + 'share.php';
  var popupName = '_blank', width = 554, height = 349, left = (screen.width - width) / 2, top = (screen.height - height) / 2;
  var popupParams = 'scrollbars=0, resizable=1, menubar=0, left=' + left + ', top=' + top + ', width=' + width + ', height=' + height + ', toolbar=0, status=0';
  var popup = window.open('', popupName, popupParams);
  var text = '<form accept-charset="UTF-8" action="' + url + '" method="POST" id="share_form">\
  <input type="hidden" name="url" value="' + tab.url + '" />\
  </form>\
  <script type="text/javascript">document.getElementById("share_form").submit()</script>';

  text = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\
  <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">\
  <head><meta http-equiv="content-type" content="text/html; charset=windows-1251" /></head>\
  <body>' + text + '</body></html>';
  popup.document.write(text);
  popup.blur();
  popup.focus();
}

function listener(requests, sender, sendResponse) {
  var res = {};
  var lp = getLang();
  for (var r in requests) {
    var request = requests[r];
    var action = request.action;
    switch (request.action) {
    
    case 'load':
      var isLogged = (counts.user && counts.user.id) > 0;
      if (!popup) setTimeout(function(){goTo('messages');}, 100);
      res[action] = {popup:(popup && isLogged)};
      break;
      
    case 'reload':
      showPages = localStorage['pages'].split(',');
      notify = localStorage['notify'].split(',');
      popup = localStorage['popup'] == "1" ? true : false;
      im = parseInt(localStorage['im']);
      shareContext = localStorage['shareContext'] == "1" ? true : false;
      sharePopup = localStorage['sharePopup'] == "1" ? true : false;
      alerts = localStorage['alerts'] == "1" ? true : false;
      alertsTO = parseInt(localStorage['alertsTO']);
      siteID = parseInt(localStorage['siteID']);
      pollInterval = localStorage['pollInterval'] ? parseInt(localStorage['pollInterval']) : 10;
      interval = pollInterval * 1000;
      selectedLang = (!localStorage['language'] && localStorage['language'] !== '0') ? -1 : parseInt(localStorage['language']);
      var color = localStorage['logonColor'].split(',');
      lp = getLang();
      logonColor = {color:[]};
      for (var i in color) {
        logonColor.color.push(parseInt(color[i]));
      }
      color = localStorage['logoffColor'].split(',');
      logoffColor = {color:[]};
      for (var i in color) {
        logoffColor.color.push(parseInt(color[i]));
      }
      if (last_json) updateUnreadCount(eval('('+last_json+')'));
      chrome.contextMenus.removeAll();
      if (shareContext) {
        chrome.contextMenus.create({
          contexts: ['page'],
          title: lp.share_context_menu_label, 
          onclick:share
        });
      }
      
      var searchItems = [];
      searchItems[0] = chrome.contextMenus.create({
        contexts: ['selection'],
        title: lp.share_context_search_label,
        onclick: search('people')
      });
      for (var i = 0, l = searchSections.length; i < l; i++) {
        var section = searchSections[i];
        searchItems.push(chrome.contextMenus.create({
          contexts: ['selection'],
          title: lp['share_context_search_'+section+'_label'],
          onclick: search(section),
          parentId: searchItems[0]
        }));
      }
      break;
      
    case 'default':
      if(!localStorage['pages']) localStorage['pages'] = 'messages,friends,events,groups,notes';
      if(!localStorage['notify']) localStorage['notify'] = 'messages';
      if(!localStorage['siteID']) localStorage['siteID'] = '0';
      if(!localStorage['popup']) localStorage['popup'] = '0';
      if(!localStorage['im']) localStorage['im'] = '0';
      if(!localStorage['shareContext']) localStorage['shareContext'] = '1';
      if(!localStorage['sharePopup']) localStorage['sharePopup'] = '1';
      if(!localStorage['alerts']) localStorage['alerts'] = '1';
      if(!localStorage['alertsTO']) localStorage['alertsTO'] = '60';
      if(!localStorage['logonColor'])localStorage['logonColor'] = '90,120,175,255';
      if(!localStorage['logoffColor'])localStorage['logoffColor'] = '190,190,190,230';
      if(!localStorage['pollInterval']) localStorage['pollInterval'] = '10';
      if(!localStorage['language'] && localStorage['language'] !== '0') localStorage['language'] = '-1';
      break;
      
    case 'lang_num':
      res[action] = [];
      for (var k in request.keys) {
        var key = request.keys[k];
        if (key.indexOf('seconds') > -1 || key.indexOf('minutes') > -1) {
          var vals = {};
          for (var j in request[key]) {
            var n = request[key][j];
            vals[n] = lp.numeric(n, lp[key]);
          }
          res[action].push({
            text:vals, 
            key:key
          });
        } else {
          res[action].push({
            text:lp.numeric((counts[key] && counts[key].count) || 0, lp[key]), 
            key:key
          });
        }
      }
      break;
      
    case 'lang':
      res[action] = [];
      for (var k in request.keys) {
        var key = request.keys[k];
        res[action].push({
          text:lp[key], 
          key:key
        });
      }
      break;
      
    case 'languages':
      res[action] = [[-1, lp.site_option_0]];
      for (var k in lang) {
        res[action].push([k, lang[k].native_name])
      }
      break;
      
    case 'goto':
      goTo(request.page, request.oid);
      if (request.hide !== undefined && notifications[request.hide]) {
        notifications[request.hide].cancel();
      }
      break;
      
    case 'share':
      chrome.windows.getCurrent(function(wnd) {
        chrome.tabs.getSelected(wnd.id, function(tab) {
          share(null, tab);
        });
      });
      break;
      
    case 'all_pages':
      res[action] = pages;
      break;
      
    case 'images':
      var img = {};
      for (var p in pages) {
        img[p] = (counts[p] && counts[p].count > 0) ? images[p+'_new'] : images[p];
      }
      res[action] = img;
      break;
    }
  }
  if (sendResponse) sendResponse(res);
};

function search(type, selection) {
  return function(info, tab) {
    var selection = info.selectionText;
    selection = selection.replace(/[\n\r\s]+/g, ' ').replace(/(^\s|\s$)/g, '');
    var url = baseURL() + 'search?c[q]='+encodeURIComponent(selection)+'&c[section]='+type;
    chrome.tabs.create({url:url}, function(tab) {
      focusCurrent();
    });
  }
}


chrome.extension.onRequest.addListener(listener);
/**/

}, false);
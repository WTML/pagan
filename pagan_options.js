document.addEventListener("DOMContentLoaded", function(){
  var images = {
    'sound_on': 'images/sound_on.png',
    'sound_off': 'images/sound_off.png',
    'sound_disabled': 'images/sound_disabled.png'
  };
  var checkBoxes = {};
  var ddSite, ddTimeout, ddLang, ddAlertsTO;
  var popupCB, shareContextCB, sharePopupCB, alertsCB;
  // Saves options to localStorage.
  window.saveOptions = function() {
    var inputs = document.getElementsByTagName("input");
    var pages = [];
    var notifies = [];
    for (var id in checkBoxes) {
      var cb = checkBoxes[id];
      var s = id.substr(8);
      var input = ge('notify_'+s);
      if (cb.checked()) {
        pages.push(s);
        if (input.value == '1') notifies.push(s);
      }
      updateNotifyImg(s, input.value, cb.checked());
    }
    localStorage["popup"] = popupCB.checked() ? "1" : "0";
    localStorage["im"] = ddMail.val();
    localStorage["shareContext"] = shareContextCB.checked() ? "1" : "0";
    localStorage["sharePopup"] = sharePopupCB.checked() ? "1" : "0";
    localStorage["alerts"] = alertsCB.checked() ? "1" : "0";
    localStorage["alertsTO"] = ddAlertsTO.val();
    localStorage["pages"] = pages.join(',');
    localStorage["notify"] = (notifies.join(',') || '-');
    localStorage["siteID"] = ddSite.val();
    localStorage["pollInterval"] = ddTimeout.val();
    localStorage["language"] = ddLang.val();
    console.log(localStorage["language"]);
    chrome.extension.sendRequest([{action:'reload'}]);
  }

  // Restores select box state to saved value from localStorage.
  var restoreOptions = function() {
    var pages = localStorage["pages"].split(',');
    var notifies = localStorage["notify"].replace('-', '').split(',');

    for (var p = 0; p < pages.length; p++) {
      var cb = checkBoxes['service_'+pages[p]];
      if(cb)cb.setOptions({checked:true});
      ge('img_notify_'+pages[p]).src = images['sound_off'];
    }
    
    for (var n = 0; n < notifies.length; n++) {
      if(!notifies[n])continue;
      ge('img_notify_'+notifies[n]).src = images['sound_on'];
      ge('notify_'+notifies[n]).value = "1";
    }
    
    popupCB.setOptions({checked: (localStorage["popup"] == "1" ? true : false)});
    ddMail.selectItem(localStorage["im"]);
    shareContextCB.setOptions({checked: (localStorage["shareContext"] == "1" ? true : false)});
    sharePopupCB.setOptions({checked: (localStorage["sharePopup"] == "1" ? true : false)});
    alertsCB.setOptions({checked: (localStorage["alerts"] == "1" ? true : false)});
    ddAlertsTO.selectItem(localStorage["alertsTO"]);
    
    ddTimeout.selectItem(localStorage["pollInterval"]);
    console.log(localStorage["language"]);
    ddLang.selectItem(localStorage["language"]);
  }
  
  var updateNotifyImg = function(id, val, checked) {
    var img = ge('img_notify_'+id);
    if (!checked) {
      img.src = images['sound_disabled'];
    } else if(val != "1"){
      img.src = images['sound_off'];
    }else{
      img.src = images['sound_on'];
    }
  }
  
  window.toggleNotify = function(id) {
    var input = ge('notify_'+id);
    var checked = checkBoxes['service_'+id].checked();
    if (checked) {
      input.value = input.value != "1" ? "1" : "0";
      saveOptions();
    }
  }

  var html = [];
  var render = function(pages) {
    for (var page in pages) {
      html.push('<div class="service"><input type="hidden" id="service_'+page+'"/></div>');
      html.push('<div class="sound"><input type="hidden" id="notify_'+page+'" value="0"/><img class="notify_img" onclick="toggleNotify(\''+page+'\');" id="img_notify_'+page+'" src="images/sound_disabled.png"/></div>');
    }
    ge('pages').innerHTML = html.join('');
    var keys = ['notify_label', 'services_title', 'popup_label', 'close_label', 'conn_title', 'site_label', 'timeout_label', 'site_option_0', 'site_option_1', 'site_option_2', 'interface_title', 'lang_label', 'mail_label', 'mail_option_0', 'mail_option_1', 'mail_option_2', 'share_context_label', 'share_popup_label', 'alerts_label', 'alerts_timeout_label', 'alerts_timeout_option_0'];
    var cbs = {};
    for (var page in pages) {
      keys.push(page+'_label');
      cbs[page+'_label'] = 'service_'+page;
    }
    
    ddSite = new Dropdown(ge('default_site'), [[0, 'Auto'], [1, 'vkontakte.ru'], [2, 'vk.com']], {width:200, onChange:function() {saveOptions(); }});
    ddMail = new Dropdown(ge('mail_options'), [[0, ''], [1, ''], [2, '']], {width:200, onChange:function() {saveOptions(); }});
    ddTimeout = new Dropdown(ge('timeout'), [
      [10, '10 seconds'], 
      [20, '20 seconds'], 
      [30, '30 seconds'], 
      [60, '1 minute'], 
      [120, '2 minutes'], 
      [300, '5 minutes'], 
      [600, '10 minutes']
      ], {width:200, onChange:function(){ saveOptions(); }});
    ddLang = new Dropdown(ge('lang'), [], {width:200, onChange:function(){ saveOptions(); }});
    ddAlertsTO = new Dropdown(ge('alerts_timeout'), [
      [0, 'Never'],
      [15, '15 seconds'], 
      [30, '30 seconds'], 
      [60, '1 minute'], 
      [300, '5 minutes'], 
      [600, '10 minutes']
      ], {width:200, onChange:function(){ saveOptions(); }});
   
    var requests = [
      {action:'default'}, 
      {action:'lang', keys:keys},
      {action:'lang_num', keys:['seconds', 'minutes', 'after_seconds', 'after_minutes'], seconds:[10, 20, 30], minutes:[1, 2, 5, 10], after_seconds:[15, 30], after_minutes:[1, 5, 10]},
      {action:'languages'} 
    ];
    chrome.extension.sendRequest(requests, function(res) {
      var ddSiteData = [], ddMailData = [], ddTimeoutData = [], ddLangData = [], ddAlertsTOData = [];
      for(var i in res['lang']) {
        var r = res['lang'][i];
        switch(r.key) {
          default: 
            var cb = ge(cbs[r.key]);
            if(cb) {
              checkBoxes[cbs[r.key]] = new Checkbox(cb, {width:200, label:r.text, onChange:function(){saveOptions();}});
            }
            break;
          case 'popup_label': 
            popupCB = new Checkbox(ge('popup'), {width:300, label:r.text, onChange:function(){saveOptions();}});
            break;
          case 'share_context_label': 
            shareContextCB = new Checkbox(ge('share_context'), {width:300, label:r.text, onChange:function(){saveOptions();}});
            break;
          case 'share_popup_label': 
            sharePopupCB = new Checkbox(ge('share_popup'), {width:300, label:r.text, onChange:function(){saveOptions();}});
            break;
          case 'alerts_label':
            alertsCB = new Checkbox(ge('alerts'), {width:300, label:r.text, onChange:function(){saveOptions();}});
            break;
          case 'services_title':
          case 'conn_title':
          case 'close_label':
          case 'site_label':
          case 'lang_label':
          case 'timeout_label':
          case 'interface_title': 
          case 'mail_label':
          case 'alerts_timeout_label':
            ge(r.key).innerHTML = r.text; 
            break;
          case 'mail_option_0': ddMailData[0] = [0, r.text]; break;
          case 'mail_option_1': ddMailData[1] = [1, r.text]; break;
          case 'mail_option_2': ddMailData[2] = [2, r.text]; break;
          case 'site_option_0': ddSiteData[0] = [0, r.text]; break;
          case 'site_option_1': ddSiteData[1] = [1, r.text]; break;
          case 'site_option_2': ddSiteData[2] = [2, r.text]; break;
          case 'notify_label':
            for (var page in pages) {
              ge('img_notify_'+page).title = r.text;
            }
            break;
          case 'alerts_timeout_option_0':
            ddAlertsTOData[0] = [0, r.text];
            break;
        }
      }
      
      for (var i in res['lang_num']) {
        var r = res['lang_num'][i];
        switch (r.key) {
          case 'seconds':
            for (var n in r.text) {
              ddTimeoutData.push([n, r.text[n]]);
            }
            break;
          case 'minutes':
            for (var n in r.text) {
              ddTimeoutData.push([n * 60, r.text[n]]);
            }
            break;
          case 'after_seconds':
            for (var n in r.text) {
              ddAlertsTOData.push([n, r.text[n]]);
            }
            break;
          case 'after_minutes':
            for (var n in r.text) {
              ddAlertsTOData.push([n * 60, r.text[n]]);
            }
            break;
        }
      }

      if (ddSiteData.length > 0) {
        ddSite.setData(ddSiteData);
      }
      if (ddMailData.length > 0) {
        ddMail.setData(ddMailData);
      }
      if (ddTimeoutData.length > 0) {
        ddTimeout.setData(ddTimeoutData);
      }
      if (ddAlertsTOData.length > 0) {
        ddAlertsTO.setData(ddAlertsTOData);
      }
      ddLang.setData(res['languages']);
      restoreOptions();
    });
    
  }

  chrome.extension.sendRequest([{action:'all_pages'}], function(res) {
    render(res['all_pages']);
  });
  
  createButton('close_label', function() { window.close(); });
});
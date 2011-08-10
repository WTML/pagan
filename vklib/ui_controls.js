var uiWindowDispatcher = {
  _ui_current_uid: 0,
  _event_listeners: [],
  _initialized: false,
  _initialize: function() {
    if (this._initialized) return;
    this._initialized = true;
    var self = this;
    var handler = function(e) {
      var handlers = self._event_listeners[e.type];
      if (!handlers) return;

      for (var i in handlers) {
        var el = handlers[i][0], callback = handlers[i][1];

        if (!el || !el.parentNode || el.id && !ge(el.id)) {
          handlers.splice(i, 1);
        }
        if (!isVisible(el)) {
          continue;
        }
        if ((e.type == 'click' || e.type == 'mousedown')) {
          e.outside = true;
          var t = e.target;
          while (t != null) {
            if (t == el) {
              e.outside = false;
              break;
            }
            t = t.parentNode;
          }
        }

        if (callback(e) === false)
          return false;
      }
    }
    addEvent(document, 'keypress keydown mousedown', handler);
  },

  getUID: function() {
    return this._ui_current_uid++;
  },
  attachListener: function(el, event, handler) {
    el = ge(el);
    if (!el || !isFunction(handler)) return false;

    this._initialize();
    if (!isArray(this._event_listeners[event]))
      this._event_listeners[event] = [];
    this._event_listeners[event].push([el, handler]);
  }
}


function Dropdown(input, data, options) {
  if (!options) options = {};
  return Selector(input, options.autocomplete ? data : [], extend(
    {introText: '', multiselect: false, autocomplete: false, selectedItems: options.selectedItem},
    options,
    {defaultItems: data}
  ));
}
// Alias
function Autocomplete(input, data, options) {
  return Selector(input, data, options);
}


function Selector(input, data, options) {
  var self = this,
      guid = uiWindowDispatcher.getUID(),
      dataURL = typeof(data) == 'string' ? data : null,
      dataItems = isArray(data) ? data : [],
      undefined;

  var timeout, requestTimeout,
      selectedItems = [],
      selectedTokenId = 0,
      activeItemValue,
      hasFocus = 0,
      cache, select,
      disabled = false,
      defaultList = false,
      receivedData,
      changeAfterBlur = false;

  if (input == null || input['autocomplete']) {
    return false;
  }

  var defaults = {
    selectedItems: [],
    defaultItems: [],
    multiselect: true,
    autocomplete: true,
    dropdown: true,
    cacheLength: 0,
    showMax: 10,
    maxItems: 50,
    maxItemsShown: function(query_length) {
      if (query_length > 6) {
        return 500;
      } else if (query_length > 4) {
        return 200;
      } else if (query_length > 2) {
        return 150;
      } else {
        return 100;
      }
    },
    selectFirst: true,
    dividingLine: 'smart',
    enableCustom: false,
    valueForCustom: -1,
    width: 300,
    height: 250,
    progressBar: false,
    highlight: function(label, term) {
      label = term.indexOf(' ') == -1 ? label.split(' ') : [label];
      var tmp = '';
      var termRus = parseLatin(term);

      if (termRus != null) {
        term = term + '|' + termRus;
      }
      var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)((\\(*)(" + term.replace('+', '\\+') + "))(?![^<>]*>)(?![^&;]+;)", "gi");
      for (var i in label) {
        tmp += (i > 0 ? ' ' : '') + label[i].replace(re, "$2<em>$3</em>");
      }
      return tmp;
    },
    resultField: input['name'] || 'selectedItems',
    customField: input['name'] ? (input['name'] + '_custom') : 'selectedItems_custom',
    placeholder: '',
    placeholderColor: '#afb8c2',
    introText: 'Start typing',
    noResult: 'Nothing found',
    noImageSrc: 'http://vkontakte.ru/images/question_s.gif',
    formatResult: function(data) {
      return data[1] + (typeof(data[2]) == "string" ? " <span>" + data[2] + "</span>" : "");
    }
  };

  function convertText_in_options(options) {
    each(['disabledText', 'placeholder'], function() {
      if (this in options) {
        options[this] = winToUtf(stripHTML(options[this]));
      }
    });
    return options;
  }
  if (!options) options = {};
  options = convertText_in_options(options);
  options = extend(defaults, options);
  if (dataItems.length) {
    sort(dataItems.length);
  }

  options.highlight = options.highlight || function(label) { return label; };

  if(!isArray(options.selectedItems) && isEmpty(options.selectedItems)){
    options.selectedItems = [];
  }
  if (input['value'] && !options.selectedItems.length) {
    options.selectedItems = input['value'];
  }

  cache = new _Cache(dataItems, options);

  var container, selector, resultList, resultListShadow, resultField, customField, dropdownButton, selectedItemsContainer, readOnly = '', scrollBarWidth = 0, mouseIsOver = false;
  var dropdown_html = options.dropdown ? '<td id="dropdown' + guid + '" class="selector_dropdown">&nbsp;</td>' : '';

  container = document.createElement("div");
  container.id = "container" + guid;
  container.className = "selector_container";

  if (!options.autocomplete) {
    readOnly = 'readonly="true"';
  }

  var customField_html = '<input type="hidden" name="' + options.customField + '" id="' + options.customField + '" value="" class="customField">';
  container.innerHTML = '<table cellspacing="0" cellpadding="0"><tr><td class="selector"><span class="selected_items"></span><input type="text" class="selector_input" ' + readOnly + ' /><input type="hidden" name="' + options.resultField + '" id="' + options.resultField + '" value="" class="resultField">' + customField_html + '</td>' + dropdown_html + '</tr></table><div class="results_container"><div class="result_list" style="display:none;"></div><div class="result_list_shadow"><div class="shadow1"></div><div class="shadow2"></div></div></div>';

  input.parentNode.replaceChild(container, input);

  selector = geByClass('selector', container)[0];
  resultList = geByClass('result_list', container)[0];

  resultList.style.opacity = 1;

  resultListShadow = geByClass('result_list_shadow', container)[0];
  input = geByClass('selector_input', container)[0];
  input.style.color = options.placeholderColor;
  selectedItemsContainer = geByClass('selected_items', container)[0];

  if (!options.autocomplete) {
    addClass(container, 'dropdown_container');
  }
  input["autocomplete"] = "1";

  if (options.dividingLine) {
    addClass(resultList, 'dividing_line')
  }

  resultField = geByClass('resultField', container)[0];
  customField = geByClass('customField', container)[0];

  options.width = parseInt(options.width) > 0 ? parseInt(options.width) : defaults.width;
  options.height = parseInt(options.height) > 0 ? parseInt(options.height) : defaults.height;
  options.resultListWidth = parseInt(options.resultListWidth) > 0 ? parseInt(options.resultListWidth) : options.width;

  container.style.width = options.width + 'px';
  resultList.style.width = resultListShadow.style.width = options.resultListWidth + 'px';

  selector['_width'] = options.width;

  function initDropdown() {
    dropdownButton = geByClass('selector_dropdown', container)[0];
    addEvent(dropdownButton, "mouseover", function() {
      addClass(this, "selector_dropdown_hover");
    });
    addClass(dropdownButton, "mouseout", function() {
      removeClass(this, "selector_dropdown_hover");
    });

    var fadeToColor, fadeToWhite;
    fadeToColor = function() {
      var state = window.is_rtl ? {backgroundColor: '#E1E8ED', borderRightColor: '#D2DBE0'} : {backgroundColor: '#E1E8ED', borderLeftColor: '#D2DBE0'};
      animate(dropdownButton, state, 200, function() {
        if (!mouseIsOver) {
          if (!select.isVisible()) {
            fadeToWhite();
          } else {
            dropdownButton.style.backgroundColor = dropdownButton.style[window.is_rtl ? 'borderRightColor' : 'borderLeftColor'] = '';
          }
        }
      });
    }
    fadeToWhite = function() {
      animate(dropdownButton, {backgroundColor: '#FFFFFF', borderLeftColor: '#FFFFFF'}, 200, function() {
        dropdownButton.style.backgroundColor = dropdownButton.style[window.is_rtl ? 'borderRightColor' : 'borderLeftColor'] = '';
        if (mouseIsOver) {
          fadeToColor();
        }
      });
    }
    addEvent(container, "mouseover", function() {
      mouseIsOver = true;
      if (disabled) return;
      fadeToColor();
    });
    addEvent(container, "mouseout", function() {
      mouseIsOver = false;
      if (disabled) return;
      setTimeout(function() {
        if (mouseIsOver) return;
        if (!select.isVisible()) {
          fadeToWhite();
        } else {
          dropdownButton.style.backgroundColor = dropdownButton.style[window.is_rtl ? 'borderRightColor' : 'borderLeftColor'] = '';
        }
      }, 0);
    });

    addEvent(dropdownButton, "mousedown", function() {
      if (!select.isVisible()) {
        showDefaultList();
      } else {
        select.toggle();
      }
    });

    var test = document.createElement("div");
    with (test.style) {
      overflowY = "scroll";
      position = "absolute";
      height = "100px";
      width = "100px";
    }
    test.innerHTML = '<div style="height:200px;">1<br/>1<br/>1<br/>1<br/></div>';
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(test);
    scrollbarWidth = test.offsetWidth - test.getElementsByTagName('div')[0].offsetWidth - 1;

    dropdownButton.style.width = scrollbarWidth + 'px';
    selector['_width'] -= scrollbarWidth;
    body.removeChild(test);
    delete test;
  }

  function destroyDropdown() {
    dropdownButton = geByClass('selector_dropdown', container)[0];
    removeEvent(dropdownButton, "mouseover");
    removeEvent(dropdownButton, "mouseout");
    removeEvent(dropdownButton, "mousedown");
    removeEvent(container, "mouseover");
    removeEvent(container, "mouseout");
    scrollbarWidth = 0;
    selector['_width'] = options.width;
  }

  if (options.dropdown) {
    initDropdown();
  }

  function updateInput() {
    if (!selectedItems.length && !hasFocus) {
      input.value = options.placeholder;
      input.style.color = options.placeholderColor;
    }
    if (!options.autocomplete && options.multiselect && selectedItems.length){
      hide(input);
    } else {
      if (!isVisible(input)) show(input);
      input.style.width = "20px";
      var w = window.is_rtl ? (input.offsetLeft + input.offsetWidth - 9) : (selector['_width'] - input.offsetLeft - 9);
      input.style.width = Math.max(20, w) + 'px';
    }
  }
  updateInput();

  select = new _Select(resultList, resultListShadow, {
    selectFirst: options.selectFirst
    , height: options.height
    , onItemActive: function(value) {
      showImage(value);
      activeItemValue = value;
    }
    , onItemSelect: selectItem
    , onShow: function() {
      highlightInput(true);
    }
    , onHide: function() {
      highlightInput(false);
    }
  });

  uiWindowDispatcher.attachListener(container, 'mousedown', function(e){
    if (e.outside) {
      select.hide();
      deselectTokens();
    }
  });

  var keyevent = 'keydown';
  uiWindowDispatcher.attachListener(container, keyevent, function(e) {
    if (disabled || input.value.length > 0 && hasFocus || !hasFocus && selectedTokenId == 0) {
      return;
    }
    switch(e.keyCode) {
      case KEY.RETURN:
        return false;
      break;
      case KEY.LEFT:
        for (var i = selectedItems.length - 1; i >= 0; i--) {
          if (!selectedTokenId || selectedItems[i][0] == selectedTokenId && i > 0) {
            if (selectedTokenId) {
              i--;
            }
            selectToken(selectedItems[i][0]);
            input.blur();
            break;
          }
        }
        return false;
        break;

      case KEY.RIGHT:
        for (var i = 0; i < selectedItems.length; i++) {
          if (selectedItems[i][0] == selectedTokenId) {
            if (i < selectedItems.length - 1) {
              selectToken(selectedItems[i+1][0]);
              input.blur();
            } else if (!readOnly) {
              deselectTokens();
              input.focus();
            }
            break;
          }
        }
        return false;
        break;

      case KEY.DEL:
        if (selectedTokenId) {
          var nextTokenId = 0;
          for (var i = selectedItems.length - 2; i >= 0; i--) {
            if (selectedItems[i][0] == selectedTokenId && selectedItems[i+1]) {
              nextTokenId = selectedItems[i+1][0];
            }
          }
          removeTagData(selectedTokenId);

          if (nextTokenId) {
            selectToken(nextTokenId);
          } else if (!readOnly && !hasFocus) {
            input.focus();
          }
        } else if (hasFocus && selectedItems.length) {
          selectToken(selectedItems[selectedItems.length - 1][0]);
        }
        return false;
        break;
    }
  });

  var keyevent =  'keydown';

  addEvent(input, 'keypress', function(e){
    if (e.which == KEY.SPACE || e.which > 40 && !e.metaKey) {
      clearTimeout(timeout);
      timeout = setTimeout(function(){ onChange(); }, 0);
    }
  });
  addEvent(input, 'keydown', function(e) {
    switch(e.keyCode) {
      case KEY.DOWN:
        if (!select.isVisible()) {
          setTimeout(showDefaultList, 0);
          return false;
        }
      break;
      case KEY.DEL:
        if (input.value.length > 0) {
          clearTimeout(timeout);
          timeout = setTimeout(function(){ onChange(); }, 0);
        }
        return;
      break;
      case KEY.RETURN:
        if (options.enableCustom && (select.selectedItem() === null)) {
          select.hide();
          input.blur();
          return false;
        }
      break;
    }
  });
  addEvent(input, 'focus', function() {
    if (!disabled && !select.isVisible()) {
      showDefaultList();
    }
    if (disabled || readOnly) {
      this.blur();
      return;
    }

    if ((selectedItems.length == 0) || options.multiselect) {
      this.value = '';
    }
    addClass(this, 'focused');
    this.style.color = '#000';
    hasFocus++;
  });
  addEvent(input, 'blur', function() {
    if (readOnly) return;
    if (!disabled) {
      if (options.enableCustom && this.value.length) {
        var custom_val = this.value;
        if (selectedItems.length == 0) {
          resultField.value = parseInt(!options.valueForCustom);
          customField.value = custom_val;
          selectItem([options.valueForCustom, custom_val]);
        }
      } else if (selectedItems.length == 0) {
        this.value = options.placeholder;
      } else if (options.multiselect) {
        this.value = '';
      }
      clearTimeout(requestTimeout);
      if (changeAfterBlur && isFunction(options.onChange)) {
        if (!options.enableCustom || !selectedItems.length) {
          options.onChange('');
        }
        changeAfterBlur = false;
      }
    }
    if (!hasClass(this, 'selected')) {
      this.style.color = options.placeholderColor;
    }
    removeClass(this, 'focused');
    hasFocus = 0;
  });

  function onInputClick(e) {
    deselectTokens();
    if (!select.isVisible()) {
      showDefaultList();
    } else {
      select.toggle();
    }
    if (!readOnly) input.focus();
    var event = e.originalEvent || e;
    if (event.preventDefault) {
      event.preventDefault();
    }
  }

  addEvent(selector, 'mousedown', function(e) {
    var click_over_token = false;
    var el = e.target;
    while (el != null) {
      if (hasClass(el, 'token')){
        click_over_token = true;
        break;
      }
      el = el.parentNode;
    }
    if (!click_over_token && !hasFocus) {
      return onInputClick(e);
    }
  });

  if (options.selectedItems !== undefined) {
    if (isArray(options.selectedItems)) {
      for (var i in options.selectedItems) {
        selectItem(options.selectedItems[i], false);
      }
    } else {
      each((options.selectedItems + '').split(','), function(i, x) {
        selectItem(x, false);
      });
    }
  }

  if (!selectedItems.length && !options.autocomplete && !options.multiselect && options.defaultItems.length) {
    selectItem(options.defaultItems[0], false);
  }

  function highlightInput(focus) {
    if (focus) {
      addClass(container, "selector_focused");
    } else {
      removeClass(container, "selector_focused");
    }
  }

  function selectToken(id) {
    if (!options.multiselect) return;
    select.hide();
    removeClass(ge('bit_' + guid + '_' + selectedTokenId), 'token_selected');
    addClass(ge('bit_' + guid + '_' +  id), 'token_selected');
    selectedTokenId = id;
    if (options.onTokenSelected) options.onTokenSelected(id);
    showImage(id);
  }
  function deselectTokens() {
    if (!selectedTokenId || !options.multiselect) return;
    removeClass(ge('bit_' + guid + '_' + selectedTokenId), 'token_selected');
    selectedTokenId = 0;
    if (options.onTokenSelected) options.onTokenSelected();
    showImage();
  }
  function showImage(itemValue, itemData) {
    if (!options.imageId) {
      return false;
    }
    var img = ge(options.imageId);
    if (!img) return false;
    if (itemData === undefined) {
      if (!itemValue) {
        itemValue = resultField.value.split(',')[0];
      }
      var data = selectedItems.concat(dataItems);
      if (data && data.length) {
        for (var i in data) {
          if (data[i][0] == itemValue) {
            itemData = data[i];
            break;
          }
        }
      }
    }
    if (itemData !== undefined && typeof(itemData[3]) == 'string' && itemData[3].length) {
      if(itemData[3] == 'none'){
        img.style.display = 'none';
      } else {
        img.style.display = '';
        img.setAttribute("src", itemData[3]);
        img.parentNode.href = '/id' + itemData[0]; // hack
        removeEvent(img.parentNode, 'click');
      }
    } else {
      img.style.display = '';
      img.setAttribute("src", options.noImageSrc);
      img.parentNode.href = '#'; // hack
      addEvent(img.parentNode, 'click', function() { return false; });
    }
  }

  function selectItem(item, fireEvent, setFocus) {
    if (item == null) {
      return false;
    }
    if (fireEvent === undefined) {
      fireEvent = true;
    }
    var data;

    if (typeof(item) == 'object') {
      data = item;
    } else {
      var all_data = new Array();
      each([dataItems, options.defaultItems, receivedData], function(i,items) {
        if (items && items.length)
          all_data = all_data.concat(items);
      });
      for (var i in all_data) {
        if (all_data[i][0] == item || all_data[i] == item) {
          data = all_data[i];
          break;
        }
      }
    }

    if (typeof data != 'object') {
      data = [item, item]; // value and text
    };

    data[0] = data[0].toString();
    data[1] = data[1].toString();

    changeAfterBlur = false;

    if (data[0] === resultField.value) {
      if (!options.multiselect) {
        input.value = winToUtf(stripHTML(data[1])); // It could have changed in setData method
        showImage();
        if (input.value.length || !options.placeholder) {
          addClass(input, 'selected');
          input.style.color = '#000';
        } else {
          input.value = options.placeholder;
          input.style.color = options.placeholderColor;
        }
      }
      return;
    }
    select.hide();
    if (selectedItems.length >= options.maxItems) {
      return;
    }

    deselectTokens();
    addTagData(data);
    showImage();

    if (options.multiselect) {
      input.value = '';
      if (dataURL) {
        select.clear();
      } else {
        select.removeItem(data[0]);
      }
    } else {
      input.value = winToUtf(stripHTML(data[1]));
      addClass(input, 'selected');
      input.style.color = '#000';
    }

    updateInput();

    if (setFocus&& !readOnly) {
      input.focus();
    } else if (!options.multiselect) {
      input.blur();
    }

    if (fireEvent) {
      if (options.multiselect && isFunction(options.onTagAdd)) {
        options.onTagAdd(data, resultField.value);
      }
      if (isFunction(options.onChange)) {
        options.onChange(resultField.value);
      }
    }
  }

  function addTagData(data) {
    if (!data || data.length < 2) return false;
    if (!options.multiselect) {
      selectedItems.splice(0, selectedItems.length, data);
      resultField.value = data[0];
      showImage(data[0], data);
      return;
    }
    for (var i in selectedItems) {
      if (selectedItems[i][0] == data[0]) {
        selectToken(selectedItems[i][0]);
        return false;
      }
    }
    selectedItems.push(data);

    var resultArr = [];
    for (i in selectedItems) {
      resultArr.push(selectedItems[i][0]);
    }
    resultField.value = resultArr.join(',');

    input.style.width = '1px';

    var token = document.createElement("div");
    token.id = "bit_" + guid + '_' + data[0];
    token.className = "token";

    var maxTokenWidth = Math.max(selector.clientWidth, getSize(token)[0]);

    token.innerHTML = '<span class="l">' + data[1] + '</span><span class="x" />';

    addEvent(token, 'click', function() {
      selectToken(data[0]);
      return false;
    });
    addEvent(token, 'dblclick', function() {
      if(data[4]){
        removeTagData(data[0]);
        each(data[4], function(i,v){
          selectItem(v, false);
        });
      }
      return false;
    });
    addEvent(token, 'mouseover', function(e) {
      addClass(token, 'token_hover');
      showImage(data[0], data);
    });
    addEvent(token, 'mouseout', function(e) {
      removeClass(token, 'token_hover');
      showImage(activeItemValue ? activeItemValue : selectedTokenId);
    });
    var close = geByClass('x', token)[0];
    addEvent(close, 'mousedown', function() {
      select.hide();
      removeTagData(data[0]);
      if (!readOnly && hasFocus) {
        input.focus();
      }
      return false;
    });
    selectedItemsContainer.appendChild(token);

    var label = token.firstChild;
    var labelStr = label.innerHTML;
    while (token.offsetWidth > maxTokenWidth && labelStr.length > 3) {
       labelStr = labelStr.substr(0, labelStr.length - 2);
       label.innerHTML = labelStr + '...';
    }
  }
  function removeTagData(id) {
    selectedTokenId = 0;
    var token = ge('bit_' + guid + '_' + id);
    token.parentNode.removeChild(token);

    var index, resultArr = [];
    for (i in selectedItems) {
      if (selectedItems[i][0] == id) {
        index = i;
        continue;
      }
      resultArr.push(selectedItems[i][0]);
    }
    if (index == undefined) return false;

    resultField.value = resultArr.join(',');

    if (options.onTagRemove) {
      options.onTagRemove(selectedItems[i], resultField.value);
    }
    if (isFunction(options.onChange)) {
      options.onChange(resultField.value);
    }
    selectedItems.splice(index, 1);
    if (options.multiselect) {
      defaultList = false;
    }
    showImage();
    updateInput();
    return false;
  }

  function onChange() {
    var term = trim(input.value.toLowerCase());
    if (!options.multiselect) {
      if (selectedItems.length) {
        changeAfterBlur = true;
      }
      clear();
    }
    clearTimeout(requestTimeout);
    if (term.length == 0) {
      showDefaultList();
      return false;
    }

    var data = cache.load(term, !dataURL);
    if (data == null && dataURL) {
        requestTimeout = setTimeout(function() {
          request(receiveData, showNoDataList);
        }, 300);
    } else if (data != null){
      if (data && data.length) {
        receiveData(term, data);
      } else {
        showNoDataList();
      }
    }
  };

  function showNoDataList() {
    if (hasFocus || readOnly) {
      _showSelectList(options.noResult);
      defaultList = false;
    }
  }
  function showDefaultList() {
    if (defaultList && select.hasItems()) {
      if (options.multiselect || !selectedItems.length)
        select.show();
      else
        select.show(selectedItems[0][0]);
    } else {
      defaultList = true;
      var text = options.autocomplete ? options.introText : null;
      _showSelectList(text, options.defaultItems);
    }
  }
  function showDataList(items, query) {
    defaultList = false;
    _showSelectList(null, items, query);
  }


  function _showSelectList(text, items, query) {
		if(window.is_rtl){
			var res_cont = geByClass('results_container', container)[0];
			var l = getXY(container)[0];
			if(l)res_cont.style.left = l + 'px';
		}

    items = isArray(items) && items.length ? items : [];
    select.clear();
    if (text) {
     select.appendItem({
       text: text,
       disabled: true
     });
    }
    if (items.length) {
      for (var i in items) {
        if (typeof items[i] != 'object') items[i] = [items[i], items[i]];
      }
      if (options.multiselect) {
        items = filterData(items);
      }

      if (options.dividingLine == 'smart') {
        removeClass(resultList, 'dividing_line');
        for (var i in items) {
          if (typeof(items[i][2]) == "string" && items[i][2].length) {
            addClass(resultList, 'dividing_line');
          }
        }
      }
      var itemsToShow = (options.autocomplete && query) ? options.maxItemsShown(query.length) : items.length;
      each(items, function() {
        if (!itemsToShow) {
          return;
        }
        var formatted = options.formatResult(this);
        if (query) {
          if (formatted = options.highlight(formatted, query)) {
            --itemsToShow;
          }
        }
        if (!formatted) {
          return;
        }
        select.appendItem({
          value: this[0],
          text: formatted
        });
      });
      if (!text && !items.length) {
        return showNoDataList();
      }
    }
    if (options.multiselect || !selectedItems.length) {
      select.show();
    } else {
      select.show(selectedItems[0][0]);
    }
  }

  function receiveData(q, data) {
    if (q != "" && data && data.length && hasFocus) {
      receivedData = data;
      showDataList(data, q);
    } else {
      select.hide();
    }
  };

  function filterData(items) {
    var result = [];
    each(items, function(i) {
      for (var j in selectedItems) {
        if (this[0] == selectedItems[j][0])
          return;
      }
      result.push(this);
    });
    return result;
  }

  function request(success, failure) {
    if(dataURL)  {
      var term = trim(input.value.toLowerCase());
      if (term.length == 0) return;
      var sep = dataURL.indexOf('?') == -1 ? '?' : '&';
      var url = dataURL + sep + "str=" + encodeURI(term);
      var ajax = new Ajax(function(ajaxObj, data){
        if (options.progressBar) {
          hide(options.progressBar);
        }
        try {
          data = eval('(' + data + ')');
        } catch (e) {}
        if (data.length) {
          cache.add(term, data);
          if (isFunction(success)) success(term, data);
        } else {
          cache.addEmpty(term);
          if (isFunction(failure)) failure(term);
        }
      });
      ajax.get(url);
      if (options.progressBar) {
        show(options.progressBar);
      }
    }
  };

  function sort(data) {
    var i, j, tmp;
    if (!data.length || data.length < 2) return data;
    for (i = 0; i < data.length - 1; i++) {
      for (j = i + 1; j < data.length; j++) {
        if (data[i][1] > data[j][1]) {
          tmp = data[i];
          data[i] = data[j];
          data[j] = tmp;
        }
      }
    }
  }

  function disable(value) {
    if (value && !disabled) {
      disabled = true;
      addClass(container, 'disabled');

      var s = getSize(container),
          h = document.createElement('div');
          h.className = "hide_mask";
      each({position: 'absolute', background: '#000', opacity: '0', filter:'alpha(opacity=0)', width: s[0] + 'px', height: s[1] + 'px', marginTop: -s[1] + 'px'}, function(k, v){
        h.style[k] = v;
      });
      if (options.disabledText) input.value = options.disabledText;
      container.appendChild(h);
      input.blur();
      input.style.color = "";
      select.hide();
    } else if (!value && disabled) {
      disabled = false;
      if (options.autocomplete) input.value = '';
      removeClass(container, 'disabled');
      container.removeChild(geByClass('hide_mask', container)[0]);
    }
  }

  function clear() {
    showImage();

    if (options.multiselect) {
      selectedTokenId = 0;
      selectedItemsContainer.innerHTML = '';
    }
    if (!options.multiselect && !options.autocomplete) {
      if (selectedItems[0] != options.defaultItems[0]) {
        selectItem(options.defaultItems[0], false);
      }
    } else {
      removeClass(input, 'selected');
      resultField.value = '';
      selectedItems.splice(0, selectedItems.length);
    }

    return false;
  }

  return {
    setURL: function(url) {
      if (typeof(url) == 'string') {
        dataURL = url;
        cache.flush();
        dataItems = [];
      }
    },
    setData: function(dataArr) {
      if (!isArray(dataArr)) return;
      if (!options.autocomplete){
        select.clear();
        options.defaultItems = dataArr;
        if (!options.multiselect) {
          if (!selectedItems.length && options.defaultItems.length) {
            selectItem(options.defaultItems[0], false);
          } else if (selectedItems.length) {
            var exists = false;
            for (var i in options.defaultItems) {
              var item = options.defaultItems[i][0] || options.defaultItems[i];
              if (item == selectedItems[0][0] || item == selectedItems[0][0]) {
                exists = true;
                break
              }
            }
            if (!exists) {
              selectItem(options.defaultItems[0], false);
            } else {
              selectItem(selectedItems[0][0], false);
            }
          }
        }
      } else {
        dataItems = dataArr;
        dataURL = null;
        cache.flush();
        cache.populate(dataItems);
      }
    },
    focus: function() {
      if (!readOnly) input.focus();
    },
    selectItem: function(item) {
      selectItem(item, false);
    },
    setOptions: function(new_options) {
      new_options = convertText_in_options(new_options);
      extend(options, new_options);
      if ("maxItems" in new_options && options.maxItems >= 0) {
        for (var i = selectedItems.length - 1; i >= options.maxItems; i--) {
          removeTagData(selectedItems[i][0]);
        }
      }

      if ("defaultItems" in new_options) {
        select.clear();
        if (select.isVisible(container)) {
          showDefaultList();
        }
      }

      if ("enableCustom" in new_options) {
        if (options.enableCustom && !options.autocomplete) {
          options.autocomplete = new_options.autocomplete = true;
        }
      }
      if ("width" in new_options) {
        container.style.width = options.width + 'px';
        resultList.style.width = resultListShadow.style.width = options.width + 'px';

        selector['_width'] = options.width - scrollbarWidth;
      }
      if ("dropdown" in new_options) {
        var dd = geByClass('selector_dropdown', container)[0];
        if (!options.dropdown && dd) {
          destroyDropdown();
          dd.parentNode.removeChild(dd);
        } else if (!dd && options.dropdown) {
          dd = container.firstChild.rows[0].insertCell(1);
          dd.id = 'dropdown' + guid;
          dd.className = 'selector_dropdown';
          dd.innerHTML = '&nbsp;';
          initDropdown();
        }
      }
      if (("width" in new_options) || ("autocomplete" in new_options) || ("dropdown" in new_options)) {
        updateInput();
      }
      if ("autocomplete" in new_options) {
        if (options.autocomplete) {
          removeClass(container, 'dropdown_container');
          input.readOnly = false;
          readOnly = '';
        } else {
          addClass(container, 'dropdown_container');
          input.readOnly = true;
          options.enableCustom = false;
          readOnly = 'readonly="true"';
        }
      }
    },
    disable: disable,
    val: function(value, fireEvent) {
      if (value !== undefined) selectItem(value, (fireEvent === undefined) ? false : fireEvent);
      return resultField.value;
    },
    val_full: function() {
      if (options.multiselect) {
        return selectedItems;
      } else {
        if (selectedItems.length) {
          return selectedItems[0];
        } else {
          return [resultField.value, input.value];
        }
      }
    },
    customVal: function(value, fireEvent) {
      if (value !== undefined) {
        customField.value = value;
        selectItem([options.valueForCustom, value], (fireEvent === undefined) ? false : fireEvent);
      }
      return customField.value;
    },
    selectedItems: function() {
      return selectedItems;
    },
    clear: function() {
      clear();
      updateInput();
    }
  };
}

function _Cache(dataItems, options) {

  var data = {};
  var length = 0;

  function matchSubset(s, sub) {
    var i, j;
    if (typeof(s) != 'string') return false;
    s = trim(stripHTML(s.toLowerCase()));
    while (1) {
      if (s.indexOf(sub) == 0) return true;
      if ((i = s.indexOf(' ')) == -1) {
        if ((i = s.indexOf('(')) == -1) return false;
      } else {
        if ((j = s.indexOf('(')) != -1) {
          i = i < j ? i : j;
        }
      }
      s = s.substr(i + 1);
    }
  };

  function add(q, add_data) {
    if (length > options.cacheLength){
      flush();
    }
    if (!data[q]){
      length++;
    }
    data[q] = add_data;
  }

  function populate(dataItems){
    if( !dataItems ) return false;

    var stMatchSets = {},
      nullData = 0;

    options.cacheLength = 1;

    stMatchSets[""] = [];

    for ( var i = 0, ol = dataItems.length; i < ol; i++ ) {
      var rawData = dataItems[i];
      rawData = (typeof rawData == "string") ? rawData.split('|') : rawData;

      var firstChar = rawData[1].charAt(0).toLowerCase();
      if( !stMatchSets[firstChar] )
        stMatchSets[firstChar] = [];

      stMatchSets[firstChar].push(rawData);

      if ( nullData++ < options.showMax ) {
        stMatchSets[""].push(rawData);
      }
    };

    each(stMatchSets, function(i, data) {
      options.cacheLength++;
      add(i, data);
    });
  }

  populate(dataItems);

  function flush(){
    data = {};
    length = 0;
  }

  return {
    flush: flush,
    add: add,
    populate: populate,
    addEmpty: function(q) {
      data[q] = [];
    },
    load: function(q, local) {
      if (!options.cacheLength || !length) {
        return null;
      }

      var csub = [];
      if (local) {
        for( var k in data ){
          if( k.length > 0 ){
            var c = data[k];
            each(c, function(i, x) {
              if (matchSubset(x[1], q)) {
                csub.push(x);
              }
            });
          }
        }
      } else {
        if (data[q] == null) {return null};
         each(data[q], function(i, x) {
          if (matchSubset(x[1], q)) {
            csub.push(x);
          }
        });
      }

      return csub;
    }
  };
};


function _Select(container, shadow, options) {
  var CLASS = {
    FIRST: "first",
    LAST: "last",
    ACTIVE: "active",
    FIRST_ACTIVE: "first_active",
    LAST_ACTIVE: "last_active",
    SCROLLABLE: "result_list_scrollable"
  };
  var active = -1,
    data = [],
    list,
    maxHeight = options.height ? options.height : 250;

list = document.createElement('ul');
container.appendChild(list);
var keyevent = 'keydown';
uiWindowDispatcher.attachListener(list, keyevent, handleKeyEvent);

function handleKeyEvent(e) {
  if (!isVisible(container)) {
    return;
  }
  switch(e.keyCode) {
    case KEY.UP:
      moveSelect(-1)
      return false;
      break;

    case KEY.DOWN:
      moveSelect(1);
      return false;
      break;

    case KEY.PAGEUP:
      return false;
      break;

    case KEY.PAGEDOWN:
      return false;
      break;
    case KEY.TAB:
      if (isFunction(options.onItemSelect) && active > -1){
        options.onItemSelect(getSelectedItem());
        return false;
      }
      hideList();
    break;
    case KEY.RETURN:
      if (isFunction(options.onItemSelect) && active > -1){
        options.onItemSelect(getSelectedItem());
      }
      return false;
      break;
    case KEY.ESC:
      hideList();
      return false;
      break;
    }
  };
/** /
pageUp: function() {
      if (active != 0 && active - 8 < 0) {
        moveSelect( -active );
      } else {
        moveSelect(-8);
      }
    },
    pageDown: function() {
      if (active != list.childNodes.length - 1 && active + 8 > list.childNodes.length) {
        moveSelect(list.childNodes.length - 1 - active);
      } else {
        moveSelect(8);
      }
    },
/**/

  function clear() {
    active = -1;
    list.innerHTML = '';
    updateContainer();
  };


  function getSelectedItem() {
    if (active >= 0 && list.childNodes[active]) {
      var item = list.childNodes[active];
      var value = item['_value'] || item.innerHTML;
      return value;
    }
    return null;
  }

  function moveSelect(step) {
    if (movePosition(step)) {
      highlight(list.childNodes[active]);
    }
  };

  function movePosition(step) {
    var selected = parseInt(active) + parseInt(step);
    if (selected < 0)
      container.scrollTop = 0;
    else if (selected + 1 > list.childNodes.length)
      container.scrollTop = list.offsetTop + list.offsetHeight - container.offsetHeight;
    while (1) {
      if (selected + 1 > list.childNodes.length || selected < 0) {
        return false;
      }
      if (!list.childNodes[selected]['_disabled']) {
        break;
      }
      selected++;
    }


    active = selected;
    return true;
  };

  function highlight(obj) {
    if (!obj) return;
    each(list.childNodes, function(i, li) {
      removeClass(li, CLASS.ACTIVE);
    });
    addClass(obj, CLASS.ACTIVE);
    removeClass(list.firstChild, CLASS.FIRST_ACTIVE);
    removeClass(list.lastChild, CLASS.LAST_ACTIVE);
    if (obj == list.firstChild) {
      addClass(obj, CLASS.FIRST_ACTIVE);
    } else if (obj == list.lastChild) {
      addClass(obj, CLASS.LAST_ACTIVE);
    }
    if (isFunction(options.onItemActive)) {
      options.onItemActive(obj['_value'] || obj.innerHTML);
    }
    if (obj.offsetTop + obj.offsetHeight + list.offsetTop > container.offsetHeight + container.scrollTop - 1) {
      container.scrollTop = obj.offsetTop + list.offsetTop + obj.offsetHeight - container.offsetHeight + 1;
    } else if (obj.offsetTop + list.offsetTop < container.scrollTop) {
      container.scrollTop = obj.offsetTop + list.offsetTop;
    }

  };

  function onMouseMove_item(e) {
    if (hasClass(this, 'active')) return false;
    active = indexOf(list.childNodes, this);
    highlight(this);
  }

  function onClick_item(e) {
    var value = this['_value'] || this.innerHTML;
    if (isFunction(options.onItemSelect)) {
      options.onItemSelect(value);
    }
    hideList();
  }

  function updateContainer() {
    if (maxHeight < list.offsetHeight) {
      container.style.height = maxHeight + 'px';
      show(shadow);
      shadow.style.marginTop = (maxHeight + 1) + 'px';
      addClass(container, CLASS.SCROLLABLE);
    } else {
      removeClass(container, CLASS.SCROLLABLE);
      container.style.height = 'auto';
      var shadow_height = intval(list.offsetHeight) + intval(list.offsetTop);
      if (shadow_height) {
        show(shadow);
        shadow.style.marginTop = shadow_height + 'px';
      } else {
        hide(shadow);
      }
    }
  }

  function appendItem(item) {
    if (typeof item != 'object') return false;
    if (list.lastChild) {
      removeClass(list.lastChild, CLASS.LAST_ACTIVE);
      removeClass(list.lastChild, CLASS.LAST);
    }
    var li = document.createElement("li");

    item.text = item.text === undefined ? '' : item.text.toString();
    item.value = item.value === undefined ? '' : item.value.toString();
    li.innerHTML = item.text || item.value;
    li['_value'] = item.value || '';
    list.appendChild(li);

    if (item.disabled) {
      li['_disabled'] = true;
      addClass(li, 'disabled');
    } else {
      addEvent(li, 'mousemove', onMouseMove_item);
      addEvent(li, 'mousedown', onClick_item);
    }
    addClass(list.lastChild, CLASS.LAST);
    if (list.childNodes.length == 1) {
      addClass(list.firstChild, CLASS.FIRST);
    }
    updateContainer();
  }

  function removeItem(value) {
    if (value === undefined) return;
    for (var i in list.childNodes) {
      var node = list.childNodes[i];
      if (node && (node['_value'] == value || node.innerHTML == value)) {
        node.parentNode.removeChild(node);
        break;
      }
    }
    updateContainer();
  }

  function performShow() {
    list.style.position = 'absolute';
    list.style.visibility = 'hidden';
    show(container);
    show(shadow);
    updateContainer();
    list.style.position = 'relative';
    list.style.visibility = 'visible';
  }

  function showList(selectedItem) {
    var wasVisible = isVisible(container);
    if (!wasVisible) {
      performShow();
    }

    var childNode;
    if (selectedItem) {
      for (var i = 0; i < list.childNodes.length; i++) {
        childNode = list.childNodes[i];
        if (childNode['_value'] == selectedItem) {
          active = i;
          highlight(childNode);
          break;
        }
      }
    } else if (options.selectFirst) {
      for (var i = 0; i < list.childNodes.length; i++) {
        childNode = list.childNodes[i];
        if (!childNode['_disabled']) {
          active = i;
          highlight(childNode);
          break;
        }
      }
    }

    if (!wasVisible && isFunction(options.onShow)) options.onShow();
  }
  function hideList() {
    if (!isVisible(container)) return;
    hide(container);
    hide(shadow);
    if (isFunction(options.onHide)) options.onHide();
    active = -1;
    if (isFunction(options.onItemActive)) options.onItemActive();
  }

  return {
    data: data,
    clear: clear,
    isVisible: function(){
      return isVisible(container);
    },
    hasItems: function() {
      return list.childNodes.length > 0;
    },
    toggle: function(){
      if (this.isVisible(container)) hideList();
      else {
        showList();
      }
    },
    handleKeyEvent: function(e) {
      if (isVisible(container))
        handleKeyEvent(e);
    },
    hide: hideList,
    show: showList,
    selectedItem: getSelectedItem,
    appendItem: appendItem,
    removeItem: removeItem
  };
};

function Checkbox(input, options) {
  var self = this,
      guid = uiWindowDispatcher.getUID(),
      undefined;

  var disabled = false;

  if (input == null) {
    return false;
  }

  var defaults = {
    checked: input['value'],
    checkedValue: 1,
    notCheckedValue: '',
    width: 300,
    label: 'checkbox',
    resultField: input['name'] || 'checkbox'
  };
  options = extend(defaults, options);

  options.checked = intval(options.checked) ? true : false;

  var container, checkbox, resultField, is_over = false;

  container = document.createElement("div");
  container.id = "container" + guid;
  container.className = "checkbox_container";

  container.innerHTML = '<table cellpadding=0 cellspacing=0><tr><td class="checkbox"><div class="checkbox_off"></div></td><td class="checkbox_label">' + options.label + '<input type="hidden" name="' + options.resultField + '" id="' + options.resultField + '" value=""></td></tr></table>';

  input.parentNode.replaceChild(container, input);

  checkbox = geByClass('checkbox_off', container)[0];
  resultField = ge(options.resultField);
  resultField.value = options.checked ? options.checkedValue : options.notCheckedValue;

  options.width = intval(options.width) > 0 ? intval(options.width) : defaults.width;

  container.style.width = options.width + 'px';

  addEvent(container, 'click', function(e){
    if (!disabled) {
      setState(!options.checked);
    }
  });

  addEvent(container, 'mouseover', function(e){
    is_over = true;
    updateClass();
  });

  addEvent(container, 'mouseout', function(e){
    is_over = false;
    updateClass();
  });

  function disable(value) {
    if (value && !disabled) {
      disabled = true;
      addClass(container, 'disabled');
    } else if (!value && disabled) {
      disabled = false;
      removeClass(container, 'disabled');
    }
  }

  function updateClass() {
    if (is_over && options.checked) {
      checkbox.className = 'checkbox_on_over';
    } else if (is_over) {
      checkbox.className = 'checkbox_off_over';
    } else if (options.checked) {
      checkbox.className = 'checkbox_on';
    } else {
      checkbox.className = 'checkbox_off';
    }
  }

  function setState(checked, fireEvent, forceUpdate) {
    if (fireEvent === undefined) fireEvent = true;
    if (forceUpdate === undefined) forceUpdate = false;

    checked = checked ? true : false;
    if (options.checked == checked && !forceUpdate) {
      return;
    }
    options.checked = checked;
    updateClass();
    resultField.value = options.checked ? options.checkedValue : options.notCheckedValue;
    if (fireEvent && isFunction(options.onChange)) {
      options.onChange(resultField.value);
    }
  }
  setState(options.checked, false, true);

   return {
    setOptions: function(new_options) {
      extend(options, new_options);
      if (("checked" in new_options) || ("checkedValue" in new_options) || ("notCheckedValue" in new_options)) {
        setState(options.checked, false, true);
      }
    },
    disable: disable,
    checked: function(value) {
      if (value !== undefined) setState(value);
      return options.checked;
    },
    val: function() {
      return resultField.value;
    }
  };
}
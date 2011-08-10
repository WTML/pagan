var storage = function(key) {
  var _defaults = {
    user: {id:0}
  };
  
  return {
    data: function(val) {
      var _data = JSON.parse(localStorage[key] || '{}');
      if (val === undefined) return _data;
      $.extend(_data, val);
      localStorage[key] = JSON.stringify(val);
    },
    clear: function() {
      this.data(_defaults[key]);
    }
  }
}
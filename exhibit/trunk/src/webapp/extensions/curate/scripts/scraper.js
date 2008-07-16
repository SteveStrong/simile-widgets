Exhibit.Scraper = function(elmt, uiContext, settings) {    
    if (!settings.scraperInput) {
        SimileAjax.Debug.warn('Scraper not given an input!');
        return;
    }
    
    var input = this._input = SimileAjax.jQuery('#' + settings.scraperInput);
    var elmt = this._elmt = SimileAjax.jQuery(elmt);
    this._uiContext = uiContext;
    this._settings = settings;
    
    elmt.attr('href', 'javascript:');
    
    var scraper = this;
    elmt.click(function(){ scraper.activate() });
}

Exhibit.Scraper._settingSpecs = {
    "scraperInput":  { type: "text" },
    "itemType":  { type: "text", defaultValue: "item" },
    "inputType": { type: "text", defaultValue: "auto" },
    "scraperService":  { type: "text", defaultValue: "http://valinor.mit.edu/sostler/scraper.cgi" }
};

Exhibit.UI.generateCreationMethods(Exhibit.Scraper);
Exhibit.UI.registerComponent('scraper', Exhibit.Scraper);

Exhibit.Scraper.prototype.activate = function() {
    var input = this._input.val();
    if (this._settings.inputType == 'auto') {
        if (input.startsWith('http://')) {
            this.scrapeURL(input);
        } else {
            this.scrapeText(input);
        }
    } else if (this._settings.inputType == 'text') {
        this.scrapeText(input);        
    } else if (this._settings.inputType.toLowerCase() == 'url') {
        this.scrapeURL(input);
    } else {
        SimileAjax.Debug.warn('Unknown scraper input type ' + this._settings.inputType);
    }
}

Exhibit.Scraper.prototype.disableUI = function() {
    this._input.attr('disabled', true);
    this._elmt.removeAttr('href');
    this._elmt.css('color', 'AAA');
    this._elmt.unbind();
}

Exhibit.Scraper.prototype.enableUI = function() {
    var scraper = this;
    this._input.attr('disabled', false);
    this._elmt.attr('href', 'javascript:');
    this._elmt.css('color', '');
    SimileAjax.jQuery(this._elmt).click(function() { scraper.activate() });
}

Exhibit.Scraper.prototype.scrapeURL = function(url) {
    this.disableUI();
    var scraper = this;
    
    var success = function(resp) {
        var status = resp.status;
        var obj = resp.obj;
        
        if (status == 'ok') {
            var item = scraper.performScraping(obj);
            scraper.makeNewItemBox(item);
            scraper.enableUI();            
        } else if (status == 'error') {
            alert("Error using scraper service!\n\n" + obj);
        } else {
            alert('Unknown response from scraper service:\n\n' + status);
        }
        scraper.enableUI();
    }

    this.disableUI();
    
    SimileAjax.jQuery.ajax({
        url: this._settings.scraperService,
        dataType: 'jsonp',
        jsonp: 'callback',
        data: { url: url },
        success: success
    });
}

Exhibit.Scraper.prototype.scrapeText = function(text) {
    var item = this.performScraping(text);
    this.makeNewItemBox(item);
}

Exhibit.Scraper.prototype.performScraping = function(text) {
    var item = { type: this._settings.itemType };
    var db = this._uiContext.getDatabase();
    
    var div = document.createElement('div');
    div.innerHTML = text.replace(/\s+/g, ' ');
    
    var dom = SimileAjax.jQuery(div);
    
    var title = dom.find('title').text();
    
    
    var typeSet = new Exhibit.Set();
    typeSet.add(this._settings.itemType);
    
    var subjects = db.getSubjectsUnion(typeSet, 'type');
    
    db.getAllProperties().forEach(function(prop) {
        var objects = db.getObjectsUnion(subjects, prop, objects).toArray();
        objects.forEach(function(o) {
            if (text.indexOf(o) != -1) {
                item[prop] = o;
            }
        });
    });
   
    return { title: title, item: item };
}

Exhibit.Scraper.prototype.makeNewItemBox = function(box) {
    var scraper = this;
    var $ = SimileAjax.jQuery;
    var div = $('<div>').addClass('scraperBox');
    var title = box.title || this._input.val();
    var item = box.item;
    
    div.append($('<h3>').text(this._settings.itemType + ' scraped from ' + title));
    
    var table = $('<table>').appendTo(div);
    var elmt = this._elmt.get(0);
    var coords = SimileAjax.DOM.getPageCoordinates(elmt);
    
    SimileAjax.jQuery.each(item, function(prop, value) {
        var row = $('<tr>').appendTo(table);
        row.append($('<td>').append($('<span>').text(prop)));
        row.append($('<td>').append($('<input>').val(value)
            .change(function() { 
                if (this.value) { item[prop] = this.value }})));
    });
    
    var submit = function() {
        Exhibit.ItemCreator.createItem(scraper._uiContext.getDatabase(), item);
        SimileAjax.WindowManager.popAllLayers();
    };
    
    div.append(
        $('<div>').addClass('buttonContainer').append(
            $('<button>').text('Create New Item').click(submit)));
    
    SimileAjax.Graphics.createBubbleForContentAndPoint(
        div.get(0), 
        coords.left + Math.round(elmt.offsetWidth / 2), 
        coords.top + Math.round(elmt.offsetHeight / 2), 
        this._uiContext.getSetting("bubbleWidth"));
    
}
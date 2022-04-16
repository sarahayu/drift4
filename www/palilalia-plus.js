/* Extension to palilalia.js that supports creating roots from existing HTML elements, as well as adds additional html tags */

(function() {

    var cur_roots = {};

    PAL.ExistingRoot = function (nodeID) {
        /* 
        delete PAL.Element from scene graph if the corresponding HTML Element has no children

        if it has no children, it might mean the HTML Element was recently removed,
        so if the PAL.Element is not deleted, palilalia will assume nothing has changed and would
        render an empty container
        (if it's an element that's meant to have no children e.g. 
        our dashboard, this will have no effect on it. This check is mostly for things that are going to be repeatedly
        coming in and out of the HTML page, like our doc items. In this case, there might be a better way to do this
        by deleting the PAL.Element from stage.js in case the default children is not 0, but meh this works for now) 
        */
        if (document.getElementById(nodeID).children.length == 0) delete cur_roots[nodeID];
        PAL.Element.call(this, document.getElementById(nodeID).tagName.toLowerCase(), { id: nodeID });
    }
    PAL.ExistingRoot.prototype = new PAL.Element;
    PAL.ExistingRoot.prototype.renderElement = function (node) {
        node = node || {};
    
        this.$el = node.$el || document.getElementById(this._attrs.id);
    
        this.$text = node.$text || document.createTextNode("");
        if (!node.$text) {
            this.$el.appendChild(this.$text);
        }
    }
    PAL.ExistingRoot.prototype.show = function () {
        this.update(cur_roots[this._attrs.id]);
        cur_roots[this._attrs.id] = this;
    }
    
    var newHTMLTags = ["table", "tr", "td", "th", "section", "label", "progress", "b", "em"];

    newHTMLTags.forEach((tagname) => {
        PAL.Element.prototype[tagname] = function (attrs) {
            attrs.parent = this;
            return new PAL.Element(tagname, attrs);
        };
        PAL.Root.prototype[tagname] = function (attrs) {
            attrs.parent = this;
            return new PAL.Element(tagname, attrs);
        };
    });
    
    var htmltags = ["div", "a",
		    "h1", "h2", "h3",
		    "i", "p", "br", "span",
		    "video", "audio", "img", "canvas",
		    "li", "ul", "ol",
		    "quote", "pre", "code",
		    "textarea", "input", "button",
		    "form", "select", "option",
		    // SVG
		    "svg", "line", "rect", "circle", "g",
		    "ellipse", "path", "polyline", "polygon",
		    "text", 
		   ];
    htmltags.push(...newHTMLTags);
    
    htmltags.forEach((tagname) => {
        PAL.ExistingRoot.prototype[tagname] = function(attrs) {
            attrs.parent = this;
            return new PAL.Element(tagname, attrs);
        };
    });
})()
/* Extension to palilalia.js that supports creating roots from existing HTML elements, as well as adds additional html tags */

(function() {

    var cur_roots = [];

    PAL.ExistingRoot = function (nodename, attrs) {
        PAL.Element.call(this, nodename, attrs);
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
    
    var newHTMLTags = ["table", "tr", "td", "th", "section","label"];

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
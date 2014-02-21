/*
 * Copyright (c) 2014 gm9
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

(function(){

    //
    // HTML Utility
    //

    function getLastScriptNode()
    {
        var n = document;
        while(n && n.nodeName.toLowerCase() != "script") { n = n.lastChild;}
        return n;
    }

    function getElementAbsPos(elem)
    {
        var x = 0;
        var y = 0;
        while(elem && elem.offsetLeft != null && elem.offsetTop != null){
            x += elem.offsetLeft;
            y += elem.offsetTop;
            elem = elem.offsetParent;
        }

        return [x, y];
    }

    function getMousePosOnElement(elem, ev)
    {
        if(!ev){ev = event;}
        if(elem.getBoundingClientRect){
            var bcr = elem.getBoundingClientRect();
            var x = ev.clientX - bcr.left;
            var y = ev.clientY - bcr.top;
            return [x, y];
        }
        else if(typeof(ev.pageX) == "number" && typeof(ev.pageY) == "number"){
            var pos = getElementAbsPos(elem);
            return [ev.pageX-pos[0], ev.pageY-pos[1]];
        }
        else{
            return [0, 0];
        }
    };

    //
    // Set(ordered container)
    //
    function Set(keyComp)
    {
        this.values = [];
        this.keyComp = keyComp;
    }
    Set.prototype = {
        size: function(){
            return this.values.length;
        },
        at: function(i){
            return this.values[i];
        },
        add: function(value){
            var i = this.lowerBound(value);
            if(i == this.values.length || this.keyComp(value, this.values[i])){
                this.insert(i, value);
                return true;
            }
            else{
                return false;
            }
        },
        addMulti: function(value){
            this.insert(this.lowerBound(value), value);
        },
        insert: function(i, value){
            this.values.splice(i, 0, value);
        },
        push: function(value){
            this.values.push(value);
        },
        pop: function(){
            return this.values.pop();
        },
        lowerBound: function(value){
            ///@todo binary search?
            var i;
            for(i = 0; i < this.values.length; ++i){
                if(!this.keyComp(this.values[i], value)){
                    break;
                }
            }
            return i;
        },
        sort: function(){
            var keyComp = this.keyComp;
            this.values.sort(
                function comp(a, b){
                    return keyComp(a, b) ? -1 :
                        keyComp(b, a) ? 1 :
                        0;
                });
            return this;
        },
        sortAndUnique: function(){
            if(this.values.length >= 1){
                this.sort();
                var newValues = [this.values[0]];
                for(var i = 1; i < this.values.length; ++i){
                    if(this.keyComp(this.values[i - 1], this.values[i])){
                        newValues.push(this.values[i]);
                    }
                }
                this.values = newValues;
            }
            return this;
        },
        clone: function(){
            var newSet = new Set();
            newSet.values = this.values.slice(0);
            newSet.keyComp = this.keyComp;
            return newSet;
        }
    };


    //
    // Grid & Node Position
    //
    // Node Indices:
    //         0
    //   5           1
    //      9      6
    //         10
    //      8      7
    //   4           2
    //         3
    //

    var RT3 = Math.sqrt(3);
    var NODE_POS = [
        [0,-1],
        [RT3/2,-1/2],
        [RT3/2,1/2],
        [0,1],
        [-RT3/2,1/2],
        [-RT3/2,-1/2],
        [RT3/4,-1/4],
        [RT3/4,1/4],
        [-RT3/4,1/4],
        [-RT3/4,-1/4],
        [0,0]];

    function getNodePosX(glyphCenterX, glyphRadius, nodeIndex)
    {
        return glyphCenterX + glyphRadius*NODE_POS[nodeIndex][0];
    }
    function getNodePosY(glyphCenterY, glyphRadius, nodeIndex)
    {
        return glyphCenterY + glyphRadius*NODE_POS[nodeIndex][1];
    }

    function getNodeIndexAtPosition(glyphCenterX, glyphCenterY, glyphRadius, nodeRadius, x, y)
    {
        var nodeRadius2 = nodeRadius*nodeRadius;
        for(var ni = 0; ni < NODE_POS.length; ++ni){
            var dx = getNodePosX(glyphCenterX, glyphRadius, ni) - x;
            var dy = getNodePosY(glyphCenterY, glyphRadius, ni) - y;
            if(dx*dx + dy*dy <= nodeRadius2){
                return ni;
            }
        }
        return -1;
    }

    //
    // Edge
    //

    function Edge(nodeIndexA, nodeIndexB)
    {
        if(nodeIndexA > nodeIndexB){
            var tmp = nodeIndexA;
            nodeIndexA = nodeIndexB;
            nodeIndexB = tmp;
        }

        this.a = nodeIndexA;
        this.b = nodeIndexB;
    }
    Edge.prototype = {
        isValid: function(){
            return this.a < this.b &&
                this.a >= 0 && this.a < NODE_POS.length &&
                this.b >= 0 && this.b < NODE_POS.length;
        }
    };
    Edge.compare = function(edgeA, edgeB){
        return edgeA.a > edgeB.a ? 1 :
            edgeA.a < edgeB.a ? -1 :
            edgeA.b > edgeB.b ? 1 :
            edgeA.b < edgeB.b ? -1 :
            0;
    };
    Edge.less = function(edgeA, edgeB){
        return Edge.compare(edgeA, edgeB) < 0;
    };
    Edge.equals = function(edgeA, edgeB){
        return Edge.compare(edgeA, edgeB) == 0;
    };

    //
    // Glyph
    //

    function Glyph() ///@todo Separate class UnnormalizedGlyph. Unnormalized glyph is not comparable. Delete addEdgeForced().
    {
        this.edges = new Set(Edge.less);
    }
    Glyph.prototype = {
        getEdge: function(i){
            return this.edges.at(i);
        },
        addEdge: function(edge){
            return edge.isValid() && this.edges.add(edge);
        },
        addEdgeForced: function(edge){
            this.edges.push(edge);
            return true;
        },
        removeLastEdge: function(){
            return this.edges.pop();
        },
        getEdgeCount: function(){
            return this.edges.size();
        },
        normalize: function(){
            this.edges.sortAndUnique();
            return this;
        },
        clone: function(){
            var newGlyph = new Glyph();
            newGlyph.edges = this.edges.clone();
            return newGlyph;
        },
        toString: function(){
            var str = "";
            for(var ei = 0; ei < this.getEdgeCount(); ++ei){
                var edge = this.getEdge(ei);
                str += edge.a.toString(NODE_POS.length) +
                       edge.b.toString(NODE_POS.length);
            }
            return str;
        }
    };
    Glyph.compare = function(glyphA, glyphB){
        for(var gi = 0; gi < glyphA.getEdgeCount() && gi < glyphB.getEdgeCount(); ++gi){
            var c = Edge.compare(glyphA.getEdge(gi), glyphB.getEdge(gi));
            if(c != 0){
                return c;
            }
        }
        return glyphA.getEdgeCount() - glyphB.getEdgeCount();
    };
    Glyph.less = function(glyphA, glyphB){
        return Glyph.compare(glyphA, glyphB) < 0;
    };
    Glyph.equals = function(glyphA, glyphB){
        return Glyph.compare(glyphA, glyphB) == 0;
    };
    Glyph.fromString = function(str){
        var glyph = new Glyph();
        for(var i = 1; i < str.length; i += 2){
            glyph.addEdge(new Edge(
                parseInt(str.charAt(i-1), NODE_POS.length),
                parseInt(str.charAt(i-0), NODE_POS.length)));
        }
        return glyph;
    };



    //
    // Drawing
    //

    function drawGrid(ctx, glyphCenterX, glyphCenterY, glyphRadius, nodeRadius)
    {
        for(var ni = 0; ni < NODE_POS.length; ++ni){
            ctx.beginPath();
            ctx.arc(
                getNodePosX(glyphCenterX, glyphRadius, ni),
                getNodePosY(glyphCenterY, glyphRadius, ni),
                nodeRadius, 0, 2*Math.PI, false);
            ctx.stroke();
        }
    }

    function drawEdge(ctx, glyphCenterX, glyphCenterY, glyphRadius, edge)
    {
        if(edge && edge.isValid()){
            ctx.beginPath();
            ctx.moveTo(
                getNodePosX(glyphCenterX, glyphRadius, edge.a),
                getNodePosY(glyphCenterY, glyphRadius, edge.a));
            ctx.lineTo(
                getNodePosX(glyphCenterX, glyphRadius, edge.b),
                getNodePosY(glyphCenterY, glyphRadius, edge.b));
            ctx.stroke();
        }
    }

    function drawGlyph(ctx, glyphCenterX, glyphCenterY, glyphRadius, glyph)
    {
        if(glyph){
            for(var gi = 0; gi < glyph.getEdgeCount(); ++gi){
                drawEdge(ctx, glyphCenterX, glyphCenterY, glyphRadius, glyph.getEdge(gi));
            }
        }
    }

    function createGlyphImage(glyphSize, glyph)
    {
        var glyphCenter = glyphSize/2;
        var glyphRadius = glyphSize*48/100;

        var canvas = document.createElement("canvas");
        canvas.setAttribute("width", glyphSize);
        canvas.setAttribute("height", glyphSize);
        drawGlyph(canvas.getContext("2d"), glyphCenter, glyphCenter, glyphRadius, glyph);
        return canvas;
    }

    //
    // Input Pad
    //

    function createInputPad(options)
    {
        if(!options){options = {};}

        // Glyph

        var glyph = new Glyph();
        function getGlyph()
        {
            return glyph.clone().normalize();
        }
        function fireGlyphChangeEvent()
        {
            var evChange = document.createEvent("HTMLEvents");
            evChange.initEvent("glyphchange", false, false);
            canvas.dispatchEvent(evChange);
        }
        function setGlyph(newGlyph)
        {
            glyph = newGlyph.clone();
            redraw();
            fireGlyphChangeEvent();
        }
        function clearGlyph()
        {
            glyph = new Glyph();
            redraw();
            fireGlyphChangeEvent();
        }
        function addEdge(nodeIndexA, nodeIndexB)
        {
            var edge = new Edge(nodeIndexA, nodeIndexB);
            if(edge.isValid() && glyph.addEdgeForced(edge)){ // able to 'undo'
                drawEdge(ctx, glyphCenter, glyphCenter, glyphRadius, edge);

                fireGlyphChangeEvent();
            }
        }
        function removeLastEdge()
        {
            if(glyph.getEdgeCount() > 0){
                var lastEdge = glyph.removeLastEdge();
                redraw();
                fireGlyphChangeEvent();
                return lastEdge;
            }
            else{
                return null;
            }
        }

        // Canvas

        var inputPadSize = options.size || 300;
        var glyphRadius = inputPadSize * 80 / 200;
        var glyphCenter = inputPadSize/2;
        var nodeRadiusGrid = 2;
        var nodeRadiusInput = inputPadSize/20;

        var canvas = document.createElement("canvas");
        canvas.setAttribute("width", inputPadSize);
        canvas.setAttribute("height", inputPadSize);
        canvas.style.border = "1px solid black";

        var ctx = canvas.getContext("2d");

        function redraw()
        {
            ctx.clearRect(0, 0, inputPadSize, inputPadSize);
            drawGrid(ctx, glyphCenter, glyphCenter, glyphRadius, nodeRadiusGrid);
            drawGrid(ctx, glyphCenter, glyphCenter, glyphRadius, nodeRadiusInput);
            drawGlyph(ctx, glyphCenter, glyphCenter, glyphRadius, glyph);
        }
        redraw();

        // Input Event

        function getNodeIndexAtMouseEvent(ev)
        {
            var pos = getMousePosOnElement(canvas, ev);
            return getNodeIndexAtPosition(glyphCenter, glyphCenter, glyphRadius, nodeRadiusInput, pos[0], pos[1]);
        }
        function fireGlyphStrokeEndEvent()
        {
            var evChange = document.createEvent("HTMLEvents");
            evChange.initEvent("glyphstrokeend", false, false);
            canvas.dispatchEvent(evChange);
        }

        var mouseDown = false;
        var lastNodeIndex = -1;
        var limitInputStroke = -1;

        function onMouseDown(ev)
        {
            if(!mouseDown && limitInputStroke != 0){
                if(limitInputStroke > 0){
                    --limitInputStroke;
                }
                mouseDown = true;
                lastNodeIndex = getNodeIndexAtMouseEvent(ev);
            }
        }
        function onMouseUp(ev)
        {
            if(mouseDown){
                mouseDown = false;
                lastNodeIndex = -1;

                fireGlyphStrokeEndEvent();
            }
        }
        function onMouseMove(ev)
        {
            if(mouseDown){
                var newNodeIndex = getNodeIndexAtMouseEvent(ev);
                if(newNodeIndex != -1 && newNodeIndex != lastNodeIndex){
                    if(lastNodeIndex != -1){
                        addEdge(lastNodeIndex, newNodeIndex);
                    }
                    lastNodeIndex = newNodeIndex;
                }
            }
        }
        function setLimitInputStroke(count)
        {
            limitInputStroke = count;
        }
        function getLimitInputStroke()
        {
            return limitInputStroke;
        }

        canvas.addEventListener("mousedown", onMouseDown, false);
        canvas.addEventListener("mouseup", onMouseUp, false);
        canvas.addEventListener("mousemove", onMouseMove, false);
        canvas.addEventListener("mouseleave", onMouseUp, false);
        canvas.addEventListener("touchstart", function(ev){
            onMouseDown(ev.touches[0]);
        }, false);
        canvas.addEventListener("touchend", onMouseUp, false);
        canvas.addEventListener("touchmove", function(ev){
            ev.preventDefault();
            onMouseMove(ev.touches[0]);
        }, false);


        // Export Functions
        canvas.getGlyph = getGlyph;
        canvas.setGlyph = setGlyph;
        canvas.clearGlyph = clearGlyph;
        canvas.removeLastEdge = removeLastEdge;
        canvas.setLimitInputStroke = setLimitInputStroke;
        canvas.getLimitInputStroke = getLimitInputStroke;
        return canvas;
    }

    function placeInputPadExample()
    {
        var div = document.createElement("div");
        getLastScriptNode().parentNode.appendChild(div);

        var pad = createInputPad();
        div.appendChild(pad);

        var output = document.createElement("textarea");
        div.appendChild(output);

        pad.addEventListener("glyphchange", function(e){
            output.value = pad.getGlyphNormalized().toString();
        }, false);
    }

    //
    // Glyph Dictionary Entry
    //
    function DictionaryEntry(keyGlyph, value)
    {
        this.keyGlyph = keyGlyph;
        this.value = value;
    }
    DictionaryEntry.compare = function(entryA, entryB){
        return Glyph.compare(entryA.keyGlyph, entryB.keyGlyph);
    };
    DictionaryEntry.less = function(entryA, entryB){
        return DictionaryEntry.compare(entryA, entryB) < 0;
    };
    DictionaryEntry.equals = function(entryA, entryB){
        return DictionaryEntry.compare(entryA, entryB) == 0;
    };

    //
    // Glyph Dictionary
    //
    function Dictionary()
    {
        this.entries = new Set(DictionaryEntry.less);
    }
    Dictionary.prototype = {
        add: function(glyph, value){
            return this.entries.add(new DictionaryEntry(glyph, value));
        },
        lowerBound: function(glyph){
            return this.entries.lowerBound(new DictionaryEntry(glyph, null)); ///@todo Avoid object creation.
        },
        get: function(glyph){
            var i = this.lowerBound(glyph);
            if(i < this.entries.size() && Glyph.equals(this.entries.at(i).keyGlyph, glyph)){
                return this.entries.at(i).value;
            }
            else{
                return null;
            }
        },
        getEntryCount: function(){
            return this.entries.size();
        }
    };


    //
    // Glyph Editor
    //
/*
    function createEditor()
    {
        var dic = new Dictionary();
        var currEntryText = [];

        var editor = document.createElement("div");
        editor.className = "glyph-editor";

        var pad = createInputPad();
        editor.appendChild(pad);

        var output = document.createElement("textarea");
        editor.appendChild(output);

        pad.addEventListener("glyphchange", function(e){
            output.value = pad.getGlyphNormalized().toString();
        }, false);

        var text = document.createElement("input");
        text.type = "text";
        editor.appendChild(text);
        var buttonAddText = document.createElement("input");
        buttonAddText.type = "button";
        buttonAddText.value = "Add text";
        buttonAddText.addEventListener("click", function(e){
            addTextToEntry(text.value);
            text.value = "";
        }, false);
        editor.appendChild(buttonAddText);
        var buttonAddEntry = document.createElement("input");
        buttonAddEntry.type = "button";
        buttonAddEntry.value = "Add entry";
        buttonAddEntry.addEventListener("click", function(e){
            addEntryToDic();
            text.value = "";
        }, false);
        editor.appendChild(buttonAddEntry);

        function addTextToEntry(str)
        {
            currEntryText.push(str);
        };
        function addEntryToDic()
        {
            dic.add(new DictionaryEntry(pad.getGlyphNormalized(), currEntryText));
            currEntryText = [];
            pad.clearGlyph();
        }

        return editor;
    }

    function placeEditor()
    {
        getLastScriptNode().parentNode.appendChild(createEditor());
    }
*/

    if(!window.gm9){ window.gm9 = {};}
    window.gm9.IngressGlyphTools = {
        // Classes
        Set: Set,
        Edge: Edge,
        Glyph: Glyph,
        DictionaryEntry: DictionaryEntry,
        Dictionary: Dictionary,

        // Functions
        getLastScriptNode: getLastScriptNode,
        getNodePosX: getNodePosX,
        getNodePosY: getNodePosY,
        getNodeIndexAtPosition: getNodeIndexAtPosition,
        drawGrid: drawGrid,
        drawEdge: drawEdge,
        drawGlyph: drawGlyph,
        createInputPad: createInputPad,
        placeInputPadExample: placeInputPadExample
    };
})();

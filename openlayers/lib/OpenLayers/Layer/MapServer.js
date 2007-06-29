/* Copyright (c) 2006 MetaCarta, Inc., published under a modified BSD license.
 * See http://svn.openlayers.org/trunk/openlayers/repository-license.txt 
 * for the full text of the license. */
// @requires OpenLayers/Layer/Grid.js
/**
 * @requires OpenLayers/Layer/Grid.js
 *
 * Class: OpenLayers.Layer.MapServer
 * Instances of OpenLayers.Layer.MapServer are used to display
 * data from a MapServer CGI instance.
 *
 * Inherits from:
 *  - <OpenLayers.Layer.Grid>
 */
OpenLayers.Layer.MapServer = OpenLayers.Class.create();
OpenLayers.Layer.MapServer.prototype =
  OpenLayers.Class.inherit( OpenLayers.Layer.Grid, {

      /**
       * Constant: DEFAULT_PARAMS
       * {Object} Hashtable of default parameter key/value pairs 
       */
    DEFAULT_PARAMS: {
                      mode: "map",
                      map_imagetype: "png"
                     },

     /**
      * Constructor: OpenLayers.Layer.MapServer
      * Create a new MapServer layer object
      *
      * Example:
      * (code)
      * layer = new OpenLayers.Layer.MapServer( "OpenLayers WMS", 
      *         "http://labs.metacarta.com/wms/vmap0", {layers: 'basic'},
      *         {gutter: 15});
      * (end)
      *
      * Parameters:
      * name - {String} A name for the layer
      * url - {String} Base url for the MapServer CGI
      *       (e.g. http://www2.dmsolutions.ca/cgi-bin/mapserv)
      * params - {Object} An object with key/value pairs representing the
      *          GetMap query string parameters and parameter values.
      * options - {Ojbect} Hashtable of extra options to tag onto the layer
      *
      * Return:
      * A new OpenLayers.Layer.MapServer instance
      */
    initialize: function(name, url, params, options) {
        var newArguments = new Array();
        newArguments.push(name, url, params, options);
        OpenLayers.Layer.Grid.prototype.initialize.apply(this, newArguments);

        if (arguments.length > 0) {
            OpenLayers.Util.applyDefaults(
                           this.params,
                           this.DEFAULT_PARAMS
                           );
        }

        // unless explicitly set in options, if the layer is transparent, 
        // it will be an overlay
        if (options == null || options.isBaseLayer == null) {
            this.isBaseLayer = ((this.params.transparent != "true") && 
                                (this.params.transparent != true));
        }
    },

    /**
     * Method: clone
     * Create a clone of this layer
     *
     * Return:
     * {<OpenLayers.Layer.MapServer>} An exact clone of this layer
     */
    clone: function (obj) {
        if (obj == null) {
            obj = new OpenLayers.Layer.MapServer(this.name,
                                           this.url,
                                           this.params,
                                           this.options);
        }
        //get all additions from superclasses
        obj = OpenLayers.Layer.Grid.prototype.clone.apply(this, [obj]);

        // copy/set any non-init, non-simple values here

        return obj;
    },

    /**
    * addTile creates a tile, initializes it, and 
    * adds it to the layer div. 
    *
    * @param {<OpenLayers.Bounds>} bounds
    *
    * @returns The added OpenLayers.Tile.Image
    * @type OpenLayers.Tile.Image
    */
    addTile:function(bounds,position) {
        var url = this.getURL(bounds);
        return new OpenLayers.Tile.Image(this, position, bounds, url, this.tileSize);
    },
    
    /**
     * Method: getURL
     * Return a query string for this layer
     *
     * Parameters:
     * bounds - {<OpenLayers.Bounds>} A bounds representing the bbox for the
     *          request
     *
     * Return:
     * {String} A string with the layer's url and parameters and also the
     * passed-in bounds and appropriate tile size specified as parameters
     */
    getURL: function (bounds) {
        bounds = this.adjustBounds(bounds);
        // Make a list, so that getFullRequestString uses literal "," 
        var extent = [bounds.left, bounds. bottom, bounds.right, bounds.top];
        
        // make lists, so that literal ','s are used 
        var url = this.getFullRequestString(
                     {mapext:   extent,
                      imgext:   extent,
                      map_size: [this.imageSize.w, this.imageSize.h],
                      imgx:     this.imageSize.w / 2,
                      imgy:     this.imageSize.h / 2,
                      imgxy:    [this.imageSize.w, this.imageSize.h]
                      });
        
        return url;
    },
    
    /** 
    * Method: getFullRequestString
    * combine the layer's url with its params and these newParams. 
    *   
    * Parameter: {Object} newParams
    * new parameters that should be added to the request string.
    * 
    * Parameter: {String} altUrl
    * optional, replace the URL in the full request string with the
    * provided URL.
    * 
    * Return: {String}
    * A string with the layer's url and parameters embedded in it.
    */
    getFullRequestString:function(newParams, altUrl) {
        // use layer's url unless altUrl passed in
        var url = (altUrl == null) ? this.url : altUrl;
        
        // if url is not a string, it should be an array of strings, 
        //  in which case we will randomly select one of them in order
        //  to evenly distribute requests to different urls.
        if (typeof url == "object") {
            url = url[Math.floor(Math.random()*url.length)];
        }   
        // requestString always starts with url
        var requestString = url;        

        // create a new params hashtable with all the layer params and the 
        // new params together. then convert to string
        var allParams = OpenLayers.Util.extend(new Object(), this.params);
        allParams = OpenLayers.Util.extend(allParams, newParams);
        // ignore parameters that are already in the url search string
        var urlParams = OpenLayers.Util.upperCaseObject(
                            OpenLayers.Util.getArgs(url));
        for(var key in allParams) {
            if(key.toUpperCase() in urlParams) {
                delete allParams[key];
            }
        }
        var paramsString = OpenLayers.Util.getParameterString(allParams);
        
        /* MapServer needs '+' seperating things like bounds/height/width.
           Since typically this is URL encoded, we use a slight hack: we
           depend on the list-like functionality of getParameterString to
           leave ',' only in the case of list items (since otherwise it is
           encoded) then do a regular expression replace on the , characters
           to '+' */
        paramsString = paramsString.replace(/,/g, "+");
        
        if (paramsString != "") {
            var lastServerChar = url.charAt(url.length - 1);
            if ((lastServerChar == "&") || (lastServerChar == "?")) {
                requestString += paramsString;
            } else {
                if (url.indexOf('?') == -1) {
                    //serverPath has no ? -- add one
                    requestString += '?' + paramsString;
                } else {
                    //serverPath contains ?, so must already have paramsString at the end
                    requestString += '&' + paramsString;
                }
            }
        }
        return requestString;
    },
    /**
     * Constant: CLASS_NAME
     * {String} OpenLayers.Layer.MapServer
     */
    CLASS_NAME: "OpenLayers.Layer.MapServer"
});

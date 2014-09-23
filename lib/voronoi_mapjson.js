
var svgPattern = function (name, url) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    var img  = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    pattern.id = name;
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("height", "100");
    pattern.setAttribute("width", "100");

    img.setAttribute("x", "0");
    img.setAttribute("y", "0");
    img.setAttribute("height", "100");
    img.setAttribute("width", "100");
    img.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
    //img.setAttribute("xlink:href", url); 
    circle.id="top";
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("fill", "url(#"+name+")");
    circle.setAttribute("r", "50");
    pattern.appendChild(img);
    defs.appendChild(pattern);
    svg.appendChild(defs);
    svg.appendChild(circle);

    return svg;

    //  return  '<defs>' +
    //          '<pattern id="'+name+'" patternUnits="userSpaceOnUse" height="100" width="100">' +
    //          '<img x="0" y="0" height="100" width="100" xmlns:xlink="http://www.w3.org/1999/xlink"  xlink:href="'+ url +'" ></img>' +
    //          '</pattern>' +
    //          '<circle id="top" cx="50" cy="50" r="50" fill="url(#'+name+')"/>' +
    //          '</defs>';
};

var flickrUrlbuidlr = function (obj) {
    return 'https://farm'+obj.farm+'.static.flickr.com/'+obj.server+'/'+obj.id+'_'+obj.secret+'.jpg';

};
var imgCache = {};
var getImgUrlFromFlickr = function (name, cb) {
    if (imgCache[name]) {
        //everything is there already
        //cb(imgCache[name]);
        return;
    }

    var cbname = 'cb'+name;
    window[cbname] = function (obj) {
        var photo = obj.query.results && obj.query.results.photo[0];
        if (photo) {
            imgCache[name] = true;
            photo = flickrUrlbuidlr(photo);
            imgCache[name]=photo;
            cb(photo);
        }
    };
    var jsonpUrl =  "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20flickr.photos.search%20where%20api_key%3D%2285782386beda7a3829f702a069ed5fdd%22%20and%20text%3D%22san%20francisco%22&format=json&diagnostics=true&callback=" + cbname;
    var jsonpEl = document.createElement('script');
    //jsonpUrl = window.encodeURI(jsonpUrl);
    jsonpEl.type = 'application/javascript';
    jsonpEl.src = jsonpUrl;

    document.body.appendChild(jsonpEl);
};

var insertSVGFlickrPattern = function (name) {
    var url = getImgUrlFromFlickr(name, function (url) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.width='100';
            svg.height ='100';
            var mrkSVG = svgPattern(name, url);
            //svg.innerHTML = mrkSVG;
            svg = mrkSVG;
            document.body.appendChild(svg);
    });
};



showHide = function(selector) {
    d3.select(selector).select('.hide').on('click', function(){
            d3.select(selector)
            .classed('visible', false)
            .classed('hidden', true);
    });

    d3.select(selector).select('.show').on('click', function(){
            d3.select(selector)
            .classed('visible', true)
            .classed('hidden', false);
    });
}

voronoiMap = function(map, url, initialSelections) {
    var pointTypes = d3.map(),
        points = [],
        lastSelectedPoint;

    var voronoi = d3.geom.voronoi()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; });

    var selectPoint = function() {
        d3.selectAll('.selected').classed('selected', false);

        var cell = d3.select(this),
            point = cell.datum();

        lastSelectedPoint = point;
        cell.classed('selected', true);

        d3.select('#selected h1')
        .html('')
        .append('a')
        .text(point.name)
        .attr('href', point.url)
        .attr('target', '_blank')
    }

    var drawPointTypeSelection = function() {
        showHide('#selections')
        labels = d3.select('#toggles').selectAll('input')
        .data(pointTypes.values())
        .enter().append("label");

        labels.append("input")
        .attr('type', 'checkbox')
        .property('checked', function(d) {
                return initialSelections === undefined || initialSelections.has(d.type)
        })
        .attr("value", function(d) { return d.type; })
        .on("change", drawWithLoading);

        labels.append("span")
        .attr('class', 'key')
        .style('background-color', function(d) { return '#' + d.color; });

        labels.append("span")
        .text(function(d) { return d.type; });
    }

    var selectedTypes = function() {
        return d3.selectAll('#toggles input[type=checkbox]')[0].filter(function(elem) {
                return elem.checked;
        }).map(function(elem) {
                return elem.value;
        })
    }

    var pointsFilteredToSelectedTypes = function() {
        var currentSelectedTypes = d3.set(selectedTypes());
        return points.filter(function(item){
                return currentSelectedTypes.has(item.properties.styleUrl);
        });
    }

    var drawWithLoading = function(e){
        d3.select('#loading').classed('visible', true);
        if (e && e.type == 'viewreset') {
            d3.select('#overlay').remove();
        }
        setTimeout(function(){
                draw();
                d3.select('#loading').classed('visible', false);
        }, 0);
    }

    var draw = function() {
        d3.select('#overlay').remove();

        var bounds = map.getBounds(),
            topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
            bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
            existing = d3.set(),
            drawLimit = bounds.pad(0.4);

        filteredPoints = pointsFilteredToSelectedTypes().filter(function(d) {
                var coord = d.geometry.coordinates;
                var latlng = new L.LatLng(coord[1], coord[0]);

                if (!drawLimit.contains(latlng)) { return false };

                var point = map.latLngToLayerPoint(latlng);

                key = point.toString();
                if (existing.has(key)) { return false };
                existing.add(key);

                d.x = point.x;
                d.y = point.y;
                d.name = d.properties.name.replace(/[^\w]/g,''); 
                return true;
        });

        voronoi(filteredPoints).forEach(function(d) { 
                d.point.cell = d; 
                d.point.area = d3.geom.polygon(d).area();
        });

        var areas = filteredPoints.map(function (d) {
                return d.area;
        });
        var min = Math.min.apply(null, areas); 
        var max = Math.max.apply(null, areas);
        max = min * 500;
        var color = d3.scale.log()
        .domain([min, max])
        .clamp(true)
        .range(["red", "yellow", "white", "green", "blue"]);

        var svg = d3.select(map.getPanes().overlayPane).append("svg")
        .attr('id', 'overlay')
        .attr("class", "leaflet-zoom-hide")
        .style("width", map.getSize().x + 'px')
        .style("height", map.getSize().y + 'px')
        .style("margin-left", topLeft.x + "px")
        .style("margin-top", topLeft.y + "px");

        var g = svg.append("g")
        .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

        var svgPoints = g.attr("class", "points")
        .selectAll("g")
        .data(filteredPoints)
        .enter().append("g")
        .attr("class", "point");

        var buildPathFromPoint = function(point) {
            return "M" + point.cell.join("L") + "Z";
        }

        var getColorFromPoint = function (point) {
            return color(point.area); 
        };

        var getFillURLFromPointName = function (point) {
            insertSVGFlickrPattern(point.name);
            return "url(#" + point.name + ")"; 
        };
        svgPoints.append("path")
        .attr("class", "point-cell")
        .attr("d", buildPathFromPoint)
        .style("fill2", getColorFromPoint)
        .style("fill", getFillURLFromPointName)
        .on('click', selectPoint)
        .classed("selected", function(d) { return lastSelectedPoint == d} );

        svgPoints.append("circle")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .style('fill', function(d) { return '#' + d.color } )
        .attr("r", 2);
    }

    var mapLayer = {
        onAdd: function(map) {
            map.on('viewreset moveend', drawWithLoading);
            drawWithLoading();
        }
    };

    showHide('#about');

    map.on('ready', function() {
            d3.json(url, function(json) {
                    points = json.features;
                    points.forEach(function(point) {
                            pointTypes.set(point.properties.styleUrl, {type: point.properties.styleUrl, color: 777777});
                    })
                    drawPointTypeSelection();
                    map.addLayer(mapLayer);
            })
    });
}

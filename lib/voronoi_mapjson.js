var api_key = "87683686e8cb88fd86c358e57446b218";
var modes = [{type:"text"}, {type:"color"}, {type:"img - flickr"}, {type:"img - sushi vs. pizza"}];

var svgPattern = function (name, url) {
    var height = 500;
    var width  = 500;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    var img  = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    pattern.id = name;
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    // pattern.setAttribute("patternContentUnits", "objectBoundingBox");
    pattern.setAttribute("height", height);
    pattern.setAttribute("width", width);

    img.setAttribute("x", "0");
    img.setAttribute("y", "0");
    img.setAttribute("height", height);
    img.setAttribute("width", width);
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
    //svg.appendChild(circle);

    return svg;
};

var flickrUrlbuidlr = function (obj) {
    return 'https://farm'+obj.farm+'.static.flickr.com/'+obj.server+'/'+obj.id+'_'+obj.secret+'_z.jpg';
};

var imgCache = {};
var getImgUrlFromFlickr = function (name, coord, cb) {
    var lon = coord[0],
        lat = coord[1];
    if (imgCache[name]) {
        //everything is there already
        //cb(imgCache[name]);
        return;
    }

    var cbname = 'cb'+name;
    window[cbname] = function (obj) {
        //var photo = obj.query.results && obj.query.results.photo[0];
        var photo = obj.photos && obj.photos.photo[0];
        if (photo) {
            imgCache[name] = true;
            photo = flickrUrlbuidlr(photo);
            imgCache[name]=photo;
            cb(photo);
        }
    };
    //var jsonpUrl =  "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20flickr.photos.search%20where%20api_key%3D%22"+api_key+"%22%20and%20text%3D%22" + encodeURIComponent(name) + "%22&format=json&diagnostics=true&sort=interestingness-desc&callback=" + cbname;

    //var jsonpUrl = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20flickr.photos.sizes%20where%20photo_id%20in%20(select%20id%20from%20flickr.photos.search%20where%20has_geo%3D%22true%22%20and%20lat%3D%22" + lat + "%22%20and%20lon%3D%22i"+lon + "%22%20and%20api_key%3D%22" + api_key + "%22%20)%20and%20api_key%3D%22API%22%20&format=json&diagnostics=true&callback=" + cbname;

    var jsonpUrl = "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key="+api_key+"&lat="+lat+"&lon="+lon+"&format=json&per_page=1&jsoncallback="+cbname;
    var jsonpEl = document.createElement('script');
    //jsonpUrl = window.encodeURI(jsonpUrl);
    jsonpEl.type = 'application/javascript';
    jsonpEl.src = jsonpUrl;

    document.body.appendChild(jsonpEl);
};

var insertSVGFlickrPattern = function (name, coord) {
    var url = getImgUrlFromFlickr(name, coord,  function (url) {
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

    var drawPointModeSelection = function() {
        showHide('#selections')
        labels = d3.select('#togglesMode').selectAll('input')
        .data(modes)
        .enter().append("label");

        labels.append("input")
        .attr('type', 'radio')
        .attr('name', 'modes')
        .property('checked', function(d) {
                return initialSelections === undefined || initialSelections.has(d.type);
        })
        .attr("value", function(d) { return d.type; })
        .on("change", drawWithLoading);

        labels.append("span")
        .attr('class', 'key')
        .style('background-color', function(d) { return '#' + d.color; });

        labels.append("span")
        .text(function(d) { return d.type; });
    }

    var selectedModes = function() {
        return d3.selectAll('#togglesMode input[type=radio]')[0].filter(function(elem) {
                return elem.checked;
        }).map(function(elem) {
                return elem.value;
        })
    }

    var drawPointTypeSelection = function() {
        showHide('#selections')
        labels = d3.select('#toggles').selectAll('input')
        .data(pointTypes.values())
        .enter().append("label");

        labels.append("input")
        .attr('type', 'checkbox')
        .property('checked', function(d) {
                return initialSelections === undefined || initialSelections.has(d.type);
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
                d.desc = d.properties.description; 

            if (Math.random()*3 > 2) {
                d.sushipizza= 'Pizza';
            }  else {
                d.sushipizza= 'Sushi';
            }
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
        .domain([min, min*30, min*75, min*125, max])
        .clamp(true)
        //.range(["#4E3539", "#CC5F6F", "#3775B3", "#DCE8FD", "white"]);
        .range(["red", "#F1D772", "#96BE64", "#DCE8FD", "white"]);

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
        };

        var getFill = function (point) {
            mode = selectedModes()[0];
            mode|| ( mode = 'color');
            var fillMethod = {
                color: getColorFromPoint,
                "img - flickr": getFillURLFromPointName,
                text: function(){return "";},
                "img - sushi vs. pizza": getSushiPizza
            };
            return fillMethod[mode](point);

        };

        var getColorFromPoint = function (point) {
            return color(point.area); 
        };

        var getFillURLFromPointName = function (point) {
            var coord = point.geometry.coordinates;
            insertSVGFlickrPattern(point.name, coord);
            return "url(#" + point.name + ")"; 
        };

        var getSushiPizza = function (point) {
            //random...
            return "url(#" + point.sushipizza+ ")"; 
        };

        svgPoints.append("path")
        .attr("class", "point-cell")
        .attr("id", function(d) { return "path" + d.name} )
        .attr("d", buildPathFromPoint)
        .style("fill", getFill)
        .on('click', selectPoint)
        .classed("selected", function(d) { return lastSelectedPoint == d} );
        
        if (selectedModes()[0] === 'text'){
        svgPoints.append("text")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .style('fill', function(d) { return '#999' } )
        .attr("font-size", "8px")
        .text(function(d) { return d.desc});
        svgPoints.append("text").attr("transform", function(d) { return "translate(" + d.x + "," + (d.y-18) + ")"; })
        .style('fill', function(d) { return '#333' } )
        .attr("font-size", "1.5em")
        .text(function(d) { return d.name});
        }

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
                    drawPointModeSelection();
                    map.addLayer(mapLayer);
            })
    });
}
